import {
  Account,
  accountFromAny,
  DeliverTxResponse,
  StargateClient,
} from "@cosmjs/stargate";
import { BinaryReader } from "cosmjs-types/binary.js";
import { BaseAccount } from "cosmjs-types/cosmos/auth/v1beta1/auth.js";
import { Any } from "cosmjs-types/google/protobuf/any.js";

// cosmos-evm wraps BaseAccount in an EthAccount (code_hash field added).
// Both the newer cosmos-evm type URL and the legacy ethermint one are
// handled; everything else falls through to the stock cosmjs parser.
const ETH_ACCOUNT_TYPE_URLS = new Set([
  "/cosmos.evm.types.v1.EthAccount",
  "/ethermint.types.v1.EthAccount",
]);

function accountParser(input: Any): Account {
  if (ETH_ACCOUNT_TYPE_URLS.has(input.typeUrl)) {
    const reader = new BinaryReader(input.value);
    let baseAccountBytes: Uint8Array | undefined;
    while (reader.pos < reader.len) {
      const tag = reader.uint32();
      if (tag >>> 3 === 1) {
        baseAccountBytes = reader.bytes();
      } else {
        reader.skipType(tag & 7);
      }
    }
    if (!baseAccountBytes) {
      throw new Error(`EthAccount (${input.typeUrl}) missing base_account`);
    }
    const base = BaseAccount.decode(baseAccountBytes);
    return {
      address: base.address,
      pubkey: null,
      accountNumber: Number(base.accountNumber),
      sequence: Number(base.sequence),
    };
  }
  return accountFromAny(input);
}

export async function connectTsc(rpcUrl: string): Promise<StargateClient> {
  return StargateClient.connect(rpcUrl, { accountParser });
}

export interface Sequence {
  accountNumber: bigint;
  sequence: bigint;
}

export async function fetchSequence(
  client: StargateClient,
  address: string,
): Promise<Sequence> {
  const account = await client.getAccount(address);
  if (!account) {
    throw new Error(`account not found on chain: ${address} (is it funded?)`);
  }
  return {
    accountNumber: BigInt(account.accountNumber),
    sequence: BigInt(account.sequence),
  };
}

export async function broadcast(
  client: StargateClient,
  txBytes: Uint8Array,
): Promise<DeliverTxResponse> {
  return client.broadcastTx(txBytes);
}
