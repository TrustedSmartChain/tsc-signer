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

Scripts are namespaced by module (`lockup:`, `bank:`, `staking:`, `licenses:`,
`distro:`) so it's always clear which module a tx or query targets.

### Lock

```bash
npm run lockup:lock -- 2026-12-31T00:00:00Z 1000000000000000000
```

### Send

```bash
npm run bank:send -- tsc1recipient... 1000000000000000000
```

### Delegate

```bash
npm run staking:delegate -- tscvaloper1... 1000000000000000000
```

### Unbond

```bash
npm run staking:unbond -- tscvaloper1... 1000000000000000000
```

### Redelegate

```bash
npm run staking:redelegate -- tscvaloper1src... tscvaloper1dst... 1000000000000000000
```

### Bank queries

```bash
npm run bank:query -- balance tsc1... aTSC
npm run bank:query -- all-balances tsc1...
npm run bank:query -- total-supply
npm run bank:query -- supply-of aTSC
```

### Staking queries

```bash
npm run staking:query -- validator tscvaloper1...
npm run staking:query -- validators BOND_STATUS_BONDED
npm run staking:query -- delegation tsc1... tscvaloper1...
npm run staking:query -- delegator-delegations tsc1...
npm run staking:query -- unbonding-delegation tsc1... tscvaloper1...
npm run staking:query -- delegator-unbonding-delegations tsc1...
npm run staking:query -- params
```

## Licenses module

The signing account is used as `owner` / `issuer` / `revoker` / `updater` / `holder` depending on the message. `MsgUpdateParams` is gov-only and is not exposed here.

### Create / update a license type

```bash
npm run licenses:create-license-type -- tsc.node true 10000
npm run licenses:update-license-type -- tsc.node false 20000
```

### Admin keys

```bash
npm run licenses:set-admin-key -- tsc1admin... '[{"permission":"issue","licenseTypes":["tsc.node"]}]'
npm run licenses:remove-admin-key -- tsc1admin...
```

### Issue / revoke / update / transfer

```bash
npm run licenses:issue-license -- tsc.node tsc1holder... 2026-04-15T00:00:00Z 2027-04-15T00:00:00Z 1
# endDate is optional — omit for a license with no expiration:
npm run licenses:issue-license -- tsc.node tsc1holder... 2026-04-15T00:00:00Z 1
npm run licenses:revoke-license -- tsc.node tsc1holder... 1
npm run licenses:update-license -- tsc.node <licenseId> active
npm run licenses:transfer-license -- tsc.node <licenseId> tsc1recipient...
```

### Batch issue

```bash
npm run licenses:batch-issue-license -- tsc.node '[{"holder":"tsc1a...","startDate":"2026-04-15T00:00:00Z","endDate":"2027-04-15T00:00:00Z"}]'
```

### Queries

Read-only queries against the `licenses` module. They hit `RPC_URL` and do not
require `MNEMONIC`. Pagination is an optional JSON string:
`'{"offset":"0","limit":"100","countTotal":true,"reverse":false}'`.

```bash
npm run licenses:query -- params
npm run licenses:query -- permissions
npm run licenses:query -- license-type tsc.node
npm run licenses:query -- license-types
npm run licenses:query -- license tsc.node 1
npm run licenses:query -- licenses-by-type tsc.node
npm run licenses:query -- licenses-by-holder tsc1holder...
npm run licenses:query -- licenses-by-holder-and-type tsc1holder... tsc.node
npm run licenses:query -- admin-key tsc1admin...
npm run licenses:query -- admin-keys
npm run licenses:query -- admin-keys-by-license-type tsc.node issue
```

## Lockup module

### Extend

One or more `<fromDate> <toDate> <amount>` triples:

```bash
npm run lockup:extend -- 2026-06-01T00:00:00Z 2027-06-01T00:00:00Z 500000000000000000
```

### Queries

```bash
npm run lockup:query -- active-locks
npm run lockup:query -- total-locked-amount
npm run lockup:query -- account-locks tsc1a...,tsc1b...
npm run lockup:query -- locks tsc1holder...
```

## Distro module

```bash
npm run distro:mint -- 1000000000000000000
```

### Queries

```bash
npm run distro:query -- params
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
