import { keccak_256 } from "@noble/hashes/sha3";
import { hmac } from "@noble/hashes/hmac";
import { sha256 } from "@noble/hashes/sha2";
import * as secp from "@noble/secp256k1";

// @noble/secp256k1 v2 ships without a bundled HMAC; wire up the sync variant
// so secp.sign() can run deterministic-k (RFC6979) without async.
secp.etc.hmacSha256Sync = (key: Uint8Array, ...msgs: Uint8Array[]) =>
  hmac(sha256, key, secp.etc.concatBytes(...msgs));
import { Any } from "cosmjs-types/google/protobuf/any.js";
import { Coin } from "cosmjs-types/cosmos/base/v1beta1/coin.js";
import { PubKey } from "cosmjs-types/cosmos/crypto/secp256k1/keys.js";
import {
  AuthInfo,
  Fee,
  ModeInfo,
  SignDoc,
  SignerInfo,
  TxBody,
  TxRaw,
} from "cosmjs-types/cosmos/tx/v1beta1/tx.js";
import { SignMode } from "cosmjs-types/cosmos/tx/signing/v1beta1/signing.js";
import { TscAccount } from "./address.js";

export interface EncodedMsg {
  typeUrl: string;
  value: Uint8Array;
}

export interface SignArgs {
  account: TscAccount;
  messages: EncodedMsg[];
  chainId: string;
  accountNumber: bigint;
  sequence: bigint;
  fee: { amount: Coin[]; gasLimit: bigint };
  memo?: string;
  pubkeyTypeUrl: string;
}

// Builds a SIGN_MODE_DIRECT tx, signs the SignDoc with keccak256+ECDSA
// (eth_secp256k1 as used by cosmos-evm / ethermint), and returns the
// TxRaw bytes ready to broadcast.
export function signTx(args: SignArgs): Uint8Array {
  const bodyBytes = TxBody.encode(
    TxBody.fromPartial({
      messages: args.messages.map((m) =>
        Any.fromPartial({ typeUrl: m.typeUrl, value: m.value }),
      ),
      memo: args.memo ?? "",
    }),
  ).finish();

  // The ethsecp256k1 PubKey wire format is identical to cosmos secp256k1
  // ({ bytes key = 1 }); only the Any.typeUrl differs.
  const pubkeyBytes = PubKey.encode({ key: args.account.pubkeyCompressed }).finish();
  const pubkeyAny = Any.fromPartial({
    typeUrl: args.pubkeyTypeUrl,
    value: pubkeyBytes,
  });

  const authInfoBytes = AuthInfo.encode({
    signerInfos: [
      SignerInfo.fromPartial({
        publicKey: pubkeyAny,
        modeInfo: ModeInfo.fromPartial({
          single: { mode: SignMode.SIGN_MODE_DIRECT },
        }),
        sequence: args.sequence,
      }),
    ],
    fee: Fee.fromPartial({
      amount: args.fee.amount,
      gasLimit: args.fee.gasLimit,
    }),
  }).finish();

  const signDocBytes = SignDoc.encode({
    bodyBytes,
    authInfoBytes,
    chainId: args.chainId,
    accountNumber: args.accountNumber,
  }).finish();

  const hash = keccak_256(signDocBytes);
  const sig = secp.sign(hash, args.account.privateKey, { lowS: true });
  const sigBytes = sig.toCompactRawBytes(); // 64 bytes: r || s

  return TxRaw.encode({
    bodyBytes,
    authInfoBytes,
    signatures: [sigBytes],
  }).finish();
}
