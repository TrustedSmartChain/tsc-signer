import { HDNodeWallet, Mnemonic, getBytes } from "ethers";
import { keccak_256 } from "@noble/hashes/sha3";
import { bech32 } from "bech32";
import * as secp from "@noble/secp256k1";

export interface TscAccount {
  privateKey: Uint8Array;
  pubkeyCompressed: Uint8Array;
  address: string;
}

// Cosmos/EVM chains derive keys along the Ethereum BIP44 path (coin type 60)
// and compute the account address as the last 20 bytes of keccak256 of the
// uncompressed public key, bech32-encoded with the chain prefix.
export function accountFromMnemonic(mnemonic: string, prefix: string): TscAccount {
  const node = HDNodeWallet.fromMnemonic(
    Mnemonic.fromPhrase(mnemonic.trim()),
    "m/44'/60'/0'/0/0",
  );
  const privateKey = getBytes(node.privateKey);
  const pubUncompressed = secp.getPublicKey(privateKey, false); // 65 bytes: 0x04 || X || Y
  const pubkeyCompressed = secp.getPublicKey(privateKey, true); // 33 bytes
  const hash = keccak_256(pubUncompressed.slice(1));
  const addrBytes = hash.slice(-20);
  const address = bech32.encode(prefix, bech32.toWords(addrBytes));
  return { privateKey, pubkeyCompressed, address };
}
