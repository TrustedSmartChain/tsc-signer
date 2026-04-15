import "dotenv/config";
import { Coin } from "cosmjs-types/cosmos/base/v1beta1/coin.js";
import { accountFromMnemonic, TscAccount } from "./address.js";
import { MsgExtend, MsgLock } from "./generated/lockup/v1/tx.js";
import { Extension } from "./generated/lockup/v1/extension.js";
import {
  BatchIssueLicenseEntry,
  MsgBatchIssueLicense,
  MsgCreateLicenseType,
  MsgIssueLicense,
  MsgRemoveAdminKey,
  MsgRevokeLicense,
  MsgSetAdminKey,
  MsgTransferLicense,
  MsgUpdateLicense,
  MsgUpdateLicenseType,
} from "./generated/licenses/v1/tx.js";
import { AdminKeyGrant } from "./generated/licenses/v1/params.js";
import { MsgMint } from "./generated/distro/v1/tx.js";
import { MsgSend } from "cosmjs-types/cosmos/bank/v1beta1/tx.js";
import {
  MsgBeginRedelegate,
  MsgDelegate,
  MsgUndelegate,
} from "cosmjs-types/cosmos/staking/v1beta1/tx.js";

const MSG_LOCK_TYPE_URL = "/lockup.v1.MsgLock";
const MSG_EXTEND_TYPE_URL = "/lockup.v1.MsgExtend";
const MSG_SEND_TYPE_URL = "/cosmos.bank.v1beta1.MsgSend";
const MSG_DELEGATE_TYPE_URL = "/cosmos.staking.v1beta1.MsgDelegate";
const MSG_UNDELEGATE_TYPE_URL = "/cosmos.staking.v1beta1.MsgUndelegate";
const MSG_BEGIN_REDELEGATE_TYPE_URL =
  "/cosmos.staking.v1beta1.MsgBeginRedelegate";
const MSG_CREATE_LICENSE_TYPE_TYPE_URL = "/licenses.v1.MsgCreateLicenseType";
const MSG_UPDATE_LICENSE_TYPE_TYPE_URL = "/licenses.v1.MsgUpdateLicenseType";
const MSG_SET_ADMIN_KEY_TYPE_URL = "/licenses.v1.MsgSetAdminKey";
const MSG_REMOVE_ADMIN_KEY_TYPE_URL = "/licenses.v1.MsgRemoveAdminKey";
const MSG_ISSUE_LICENSE_TYPE_URL = "/licenses.v1.MsgIssueLicense";
const MSG_REVOKE_LICENSE_TYPE_URL = "/licenses.v1.MsgRevokeLicense";
const MSG_UPDATE_LICENSE_TYPE_URL = "/licenses.v1.MsgUpdateLicense";
const MSG_TRANSFER_LICENSE_TYPE_URL = "/licenses.v1.MsgTransferLicense";
const MSG_BATCH_ISSUE_LICENSE_TYPE_URL = "/licenses.v1.MsgBatchIssueLicense";
const MSG_MINT_TYPE_URL = "/distro.v1.MsgMint";
import { connectTsc, fetchSequence } from "./net.js";
import { EncodedMsg, signTx } from "./sign.js";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is required in .env`);
  return v;
}

const CHAIN_ID = process.env.CHAIN_ID ?? "tsc_8878788-1";
const BECH32_PREFIX = process.env.BECH32_PREFIX ?? "tsc";
const DENOM = process.env.DENOM ?? "aTSC";
const ETH_PUBKEY_TYPE_URL =
  process.env.ETH_PUBKEY_TYPE_URL ?? "/cosmos.evm.crypto.v1.ethsecp256k1.PubKey";
const FEE_AMOUNT = process.env.FEE_AMOUNT ?? "20000000000000000";
const GAS_LIMIT = BigInt(process.env.GAS_LIMIT ?? "300000");

async function submit(
  account: TscAccount,
  messages: EncodedMsg[],
): Promise<void> {
  const rpcUrl = requireEnv("RPC_URL");

  const client = await connectTsc(rpcUrl);
  try {
    const { accountNumber, sequence } = await fetchSequence(client, account.address);
    console.log(`accountNumber=${accountNumber} sequence=${sequence}`);

    const fee: { amount: Coin[]; gasLimit: bigint } = {
      amount: [{ denom: DENOM, amount: FEE_AMOUNT }],
      gasLimit: GAS_LIMIT,
    };

    const txBytes = signTx({
      account,
      messages,
      chainId: CHAIN_ID,
      accountNumber,
      sequence,
      fee,
      pubkeyTypeUrl: ETH_PUBKEY_TYPE_URL,
    });

    console.log(`broadcasting ${txBytes.length} bytes...`);
    const result = await client.broadcastTx(txBytes);
    console.log(
      JSON.stringify(
        {
          code: result.code,
          txhash: result.transactionHash,
          height: result.height,
          gasUsed: result.gasUsed.toString(),
          gasWanted: result.gasWanted.toString(),
        },
        null,
        2,
      ),
    );
    if (result.code !== 0) process.exit(1);
  } finally {
    client.disconnect();
  }
}

function usage(): never {
  console.log(`usage:
  npm run lock -- <unlockDate> <amount>
  npm run extend -- <fromDate> <toDate> <amount> [<fromDate> <toDate> <amount> ...]
  npm run send -- <toAddress> <amount>
  npm run delegate -- <validatorAddress> <amount>
  npm run unbond -- <validatorAddress> <amount>
  npm run redelegate -- <srcValidator> <dstValidator> <amount>
  npm run create-license-type -- <id> <transferrable:true|false> <maxSupply>
  npm run update-license-type -- <id> <transferrable:true|false> <maxSupply>
  npm run set-admin-key -- <address> <grantsJSON>
  npm run remove-admin-key -- <address>
  npm run issue-license -- <licenseTypeId> <holder> <startDate> [<endDate>] <count>
  npm run revoke-license -- <licenseTypeId> <holder> <count>
  npm run update-license -- <licenseTypeId> <id> <status>
  npm run transfer-license -- <licenseTypeId> <id> <recipient>
  npm run batch-issue-license -- <licenseTypeId> <entriesJSON>
  npm run mint -- <amount>

  unlockDate / fromDate / toDate are strings (RFC3339 or whatever the chain expects)
  amount is an integer string in ${DENOM} base units
  grantsJSON: '[{"permission":"issue","licenseTypes":["id1","id2"]}]'
  entriesJSON: '[{"holder":"tsc1...","startDate":"...","endDate":"..."}]'`);
  process.exit(1);
}

function parseBool(v: string): boolean {
  if (v === "true") return true;
  if (v === "false") return false;
  usage();
}

async function main(): Promise<void> {
  const mnemonic = requireEnv("MNEMONIC");
  const account = accountFromMnemonic(mnemonic, BECH32_PREFIX);
  console.log(`address: ${account.address}`);

  const [cmd, ...rest] = process.argv.slice(2);

  if (cmd === "lock") {
    const [unlockDate, amount] = rest;
    if (!unlockDate || !amount) usage();
    const value = MsgLock.encode({
      address: account.address,
      unlockDate,
      amount: { denom: DENOM, amount },
    }).finish();
    await submit(account, [{ typeUrl: MSG_LOCK_TYPE_URL, value }]);
    return;
  }

  if (cmd === "send") {
    const [toAddress, amount] = rest;
    if (!toAddress || !amount) usage();
    const value = MsgSend.encode({
      fromAddress: account.address,
      toAddress,
      amount: [{ denom: DENOM, amount }],
    }).finish();
    await submit(account, [{ typeUrl: MSG_SEND_TYPE_URL, value }]);
    return;
  }

  if (cmd === "delegate") {
    const [validatorAddress, amount] = rest;
    if (!validatorAddress || !amount) usage();
    const value = MsgDelegate.encode({
      delegatorAddress: account.address,
      validatorAddress,
      amount: { denom: DENOM, amount },
    }).finish();
    await submit(account, [{ typeUrl: MSG_DELEGATE_TYPE_URL, value }]);
    return;
  }

  if (cmd === "unbond") {
    const [validatorAddress, amount] = rest;
    if (!validatorAddress || !amount) usage();
    const value = MsgUndelegate.encode({
      delegatorAddress: account.address,
      validatorAddress,
      amount: { denom: DENOM, amount },
    }).finish();
    await submit(account, [{ typeUrl: MSG_UNDELEGATE_TYPE_URL, value }]);
    return;
  }

  if (cmd === "redelegate") {
    const [validatorSrcAddress, validatorDstAddress, amount] = rest;
    if (!validatorSrcAddress || !validatorDstAddress || !amount) usage();
    const value = MsgBeginRedelegate.encode({
      delegatorAddress: account.address,
      validatorSrcAddress,
      validatorDstAddress,
      amount: { denom: DENOM, amount },
    }).finish();
    await submit(account, [
      { typeUrl: MSG_BEGIN_REDELEGATE_TYPE_URL, value },
    ]);
    return;
  }

  if (cmd === "create-license-type") {
    const [id, transferrable, maxSupply] = rest;
    if (!id || !transferrable || !maxSupply) usage();
    const value = MsgCreateLicenseType.encode({
      owner: account.address,
      id,
      transferrable: parseBool(transferrable),
      maxSupply,
    }).finish();
    await submit(account, [{ typeUrl: MSG_CREATE_LICENSE_TYPE_TYPE_URL, value }]);
    return;
  }

  if (cmd === "update-license-type") {
    const [id, transferrable, maxSupply] = rest;
    if (!id || !transferrable || !maxSupply) usage();
    const value = MsgUpdateLicenseType.encode({
      owner: account.address,
      id,
      transferrable: parseBool(transferrable),
      maxSupply,
    }).finish();
    await submit(account, [{ typeUrl: MSG_UPDATE_LICENSE_TYPE_TYPE_URL, value }]);
    return;
  }

  if (cmd === "set-admin-key") {
    const [address, grantsJson] = rest;
    if (!address || !grantsJson) usage();
    const grants = JSON.parse(grantsJson) as AdminKeyGrant[];
    const value = MsgSetAdminKey.encode({
      owner: account.address,
      address,
      grants,
    }).finish();
    await submit(account, [{ typeUrl: MSG_SET_ADMIN_KEY_TYPE_URL, value }]);
    return;
  }

  if (cmd === "remove-admin-key") {
    const [address] = rest;
    if (!address) usage();
    const value = MsgRemoveAdminKey.encode({
      owner: account.address,
      address,
    }).finish();
    await submit(account, [{ typeUrl: MSG_REMOVE_ADMIN_KEY_TYPE_URL, value }]);
    return;
  }

  if (cmd === "issue-license") {
    const [licenseTypeId, holder, startDate, ...tail] = rest;
    if (!licenseTypeId || !holder || !startDate || tail.length === 0) usage();
    const count = tail[tail.length - 1];
    const endDate = tail.length === 2 ? tail[0] : "";
    if (tail.length > 2) usage();
    const value = MsgIssueLicense.encode({
      issuer: account.address,
      licenseTypeId,
      holder,
      startDate,
      endDate,
      count,
    }).finish();
    await submit(account, [{ typeUrl: MSG_ISSUE_LICENSE_TYPE_URL, value }]);
    return;
  }

  if (cmd === "revoke-license") {
    const [licenseTypeId, holder, count] = rest;
    if (!licenseTypeId || !holder || !count) usage();
    const value = MsgRevokeLicense.encode({
      revoker: account.address,
      licenseTypeId,
      holder,
      count,
    }).finish();
    await submit(account, [{ typeUrl: MSG_REVOKE_LICENSE_TYPE_URL, value }]);
    return;
  }

  if (cmd === "update-license") {
    const [licenseTypeId, id, status] = rest;
    if (!licenseTypeId || !id || !status) usage();
    const value = MsgUpdateLicense.encode({
      updater: account.address,
      licenseTypeId,
      id,
      status,
    }).finish();
    await submit(account, [{ typeUrl: MSG_UPDATE_LICENSE_TYPE_URL, value }]);
    return;
  }

  if (cmd === "transfer-license") {
    const [licenseTypeId, id, recipient] = rest;
    if (!licenseTypeId || !id || !recipient) usage();
    const value = MsgTransferLicense.encode({
      holder: account.address,
      licenseTypeId,
      id,
      recipient,
    }).finish();
    await submit(account, [{ typeUrl: MSG_TRANSFER_LICENSE_TYPE_URL, value }]);
    return;
  }

  if (cmd === "batch-issue-license") {
    const [licenseTypeId, entriesJson] = rest;
    if (!licenseTypeId || !entriesJson) usage();
    const entries = JSON.parse(entriesJson) as BatchIssueLicenseEntry[];
    const value = MsgBatchIssueLicense.encode({
      issuer: account.address,
      licenseTypeId,
      entries,
    }).finish();
    await submit(account, [{ typeUrl: MSG_BATCH_ISSUE_LICENSE_TYPE_URL, value }]);
    return;
  }

  if (cmd === "mint") {
    const [amount] = rest;
    if (!amount) usage();
    const value = MsgMint.encode({
      minter: account.address,
      amount,
    }).finish();
    await submit(account, [{ typeUrl: MSG_MINT_TYPE_URL, value }]);
    return;
  }

  if (cmd === "extend") {
    if (rest.length === 0 || rest.length % 3 !== 0) usage();
    const extensions: Extension[] = [];
    for (let i = 0; i < rest.length; i += 3) {
      extensions.push({
        fromDate: rest[i],
        toDate: rest[i + 1],
        amount: { denom: DENOM, amount: rest[i + 2] },
      });
    }
    const value = MsgExtend.encode({ address: account.address, extensions }).finish();
    await submit(account, [{ typeUrl: MSG_EXTEND_TYPE_URL, value }]);
    return;
  }

  usage();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
