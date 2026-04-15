# tsc-signer

CLI for signing and broadcasting transactions to a TSC / cosmos-evm chain. Supports bank (`send`), staking (`delegate`, `unbond`, `redelegate`), `lockup` (`lock`, `extend`), `licenses` (create / update / issue / revoke / transfer / batch issue, plus admin keys), and `distro` (`mint`). Signs with `eth_secp256k1` (keccak256 + ECDSA) in `SIGN_MODE_DIRECT`.

## Prerequisites

- Node.js 20+
- A funded account mnemonic on the target chain
- An RPC endpoint (Tendermint RPC, e.g. `http://localhost:26657`)

## Install

```bash
npm install
```

## Configure

Create a `.env` file in the project root:

```bash
MNEMONIC="your twelve or twenty four word mnemonic here"
RPC_URL="http://localhost:26657"

# Optional — defaults shown
CHAIN_ID="tsc_8878788-1"
BECH32_PREFIX="tsc"
DENOM="aTSC"
ETH_PUBKEY_TYPE_URL="/cosmos.evm.crypto.v1.ethsecp256k1.PubKey"
FEE_AMOUNT="20000000000000000"
GAS_LIMIT="300000"
```

## Generate proto types (only if `proto/` changes)

```bash
npm run gen:proto
```

Requires [`buf`](https://buf.build/docs/installation) on your `PATH`. Output lands in [src/generated/](src/generated/).

## Usage

Dates are passed through as strings — use whatever format the chain expects (typically RFC3339). Amounts are integer strings in base units of `DENOM`.

### Lock

```bash
npm run lock -- 2026-12-31T00:00:00Z 1000000000000000000
```

### Send

```bash
npm run send -- tsc1recipient... 1000000000000000000
```

### Delegate

```bash
npm run delegate -- tscvaloper1... 1000000000000000000
```

### Unbond

```bash
npm run unbond -- tscvaloper1... 1000000000000000000
```

### Redelegate

```bash
npm run redelegate -- tscvaloper1src... tscvaloper1dst... 1000000000000000000
```

## Licenses module

The signing account is used as `owner` / `issuer` / `revoker` / `updater` / `holder` depending on the message. `MsgUpdateParams` is gov-only and is not exposed here.

### Create / update a license type

```bash
npm run create-license-type -- my-license true 10000
npm run update-license-type -- my-license false 20000
```

### Admin keys

```bash
npm run set-admin-key -- tsc1admin... '[{"permission":"issue","licenseTypes":["my-license"]}]'
npm run remove-admin-key -- tsc1admin...
```

### Issue / revoke / update / transfer

```bash
npm run issue-license -- my-license tsc1holder... 2026-04-15T00:00:00Z 2027-04-15T00:00:00Z 1
# endDate is optional — omit for a license with no expiration:
npm run issue-license -- my-license tsc1holder... 2026-04-15T00:00:00Z 1
npm run revoke-license -- my-license tsc1holder... 1
npm run update-license -- my-license <licenseId> active
npm run transfer-license -- my-license <licenseId> tsc1recipient...
```

### Batch issue

```bash
npm run batch-issue-license -- my-license '[{"holder":"tsc1a...","startDate":"2026-04-15T00:00:00Z","endDate":"2027-04-15T00:00:00Z"}]'
```

## Distro module

```bash
npm run mint -- 1000000000000000000
```

### Extend

One or more `<fromDate> <toDate> <amount>` triples:

```bash
npm run extend -- 2026-06-01T00:00:00Z 2027-06-01T00:00:00Z 500000000000000000
```

### Type-check

```bash
npm run build
```

## Layout

- [src/index.ts](src/index.ts) — CLI entry (`lock` / `extend`)
- [src/sign.ts](src/sign.ts) — SignDoc construction and eth_secp256k1 signing
- [src/address.ts](src/address.ts) — mnemonic → bech32 address derivation
- [src/net.ts](src/net.ts) — RPC client and account/sequence lookup
- [proto/lockup](proto/lockup) — lockup module protos
