# UnitMetal Web Wallet

A self-custodial Ethereum web wallet that runs entirely in the browser. No backend server, no external key storage — your keys never leave your device.

---

## Overview

### What it does

UnitMetal Web Wallet lets you create, import, and manage Ethereum wallets directly in the browser. All cryptographic operations (key generation, encryption, transaction signing) happen client-side using the browser's native Web Crypto API.

**Supported operations:**
- Create new wallets from a randomly generated BIP-39 mnemonic
- Import existing wallets via mnemonic phrase, keystore file, or pasted keystore JSON
- Send ETH, ERC-20 tokens, and ERC-721 NFTs
- Sign and broadcast raw transactions
- Resolve ENS names to addresses
- Scan recipient addresses via QR code
- Manage an address book
- Track transaction activity history (IndexedDB, local only)
- Export wallets as encrypted keystore files or reveal the plaintext mnemonic (password-gated)
- Create encrypted full-device backups (all wallets + contacts + settings + activity)
- Standalone keystore utility: encrypt any mnemonic to a keystore, or decrypt any keystore to a mnemonic

### Architecture

| Layer | Technology |
|---|---|
| UI framework | React 19 + TypeScript + Vite 7 |
| Styling | Tailwind CSS 4 + shadcn/ui (base-lyra) |
| Ethereum | Wagmi 3 + Viem 2 |
| State | Jotai (atom-based, persisted to `localStorage`) |
| Async/queries | TanStack Query |
| Forms | TanStack Form |
| Activity storage | Dexie (IndexedDB) |
| Cryptography | `ox` library + Web Crypto API (`crypto.subtle`) |

The app is a static SPA. It can be served from any static host or run locally. There is no server component involved in wallet operations.

---

## Development

```bash
bun dev        # Start dev server on :5177
bun build      # TypeScript check + production build
bun lint       # ESLint
bun preview    # Preview production build
bun test       # Run tests (Vitest)
```

**Environment variables** (prefix `VITE_`):

```
VITE_MAINNET_RPC_URL=https://...
```

A custom RPC URL can also be configured at runtime via the wallet settings UI; the persisted value takes precedence over the build-time env variable.

---

## Security Assessment

### How keys are stored

Wallets are persisted in `localStorage` under the key `"wallets"` as an array of encrypted keystores. The keystore format is the Ethereum web3 keystore standard as implemented by the [`ox`](https://oxlib.sh) library.

**Per-wallet encryption flow (create / import):**
1. A BIP-39 mnemonic is generated with `Mnemonic.random()` (or provided by the user).
2. The mnemonic bytes are encrypted using `Keystore.pbkdf2({ password })` from `ox`, which performs PBKDF2 key derivation followed by AES-GCM encryption.
3. Only the encrypted keystore object is written to `localStorage`. The plaintext mnemonic is never persisted.

**Key derivation on use:**  
Every operation that requires signing (sending a transaction, revealing a mnemonic) re-derives the account from the encrypted keystore using the user-supplied password at that moment. No plaintext key material is cached between operations — the derived account lives only in the call stack for the duration of the operation.

```
password + encrypted keystore → PBKDF2 → AES-GCM decrypt → mnemonic → account
                                                                           ↓
                                                                   sign transaction
                                                                    (then discard)
```

**Full backup encryption** (`src/lib/crypto.ts`):  
The local device backup feature wraps all wallet data (wallets, contacts, settings, activity) in a second encryption layer using:
- **KDF:** PBKDF2-SHA-256, 600,000 iterations (matching Bitwarden's default strength)
- **Cipher:** AES-GCM-256 (authenticated encryption — provides confidentiality + integrity)
- **Salt:** 16 bytes, randomly generated per backup (`crypto.getRandomValues`)
- **IV:** 12 bytes, randomly generated per backup (`crypto.getRandomValues`)
- All operations use the browser's native `crypto.subtle` — no JS crypto implementation

The backup file is self-describing: KDF parameters and IV are stored in plaintext alongside the ciphertext, so the file can be decrypted with any standard PBKDF2 + AES-GCM implementation outside the app.

---

### Security properties

**Strengths:**

- **No server-side key exposure.** Private key material never leaves the browser. The app makes no requests that include key material. RPC calls carry only signed transactions and balance queries.
- **Decrypt-on-demand.** The wallet password is required for every signing operation. The decrypted mnemonic is not cached in any persistent store.
- **Authenticated encryption.** AES-GCM provides both confidentiality and integrity in a single primitive. A corrupted or tampered keystore will fail to decrypt rather than silently yielding garbage.
- **Cryptographically random key material.** Mnemonics are generated with `Mnemonic.random()` (backed by CSPRNG). KDF salts and IVs use `crypto.getRandomValues`.
- **Offline mode.** The app can suspend all network requests, supporting air-gapped usage patterns for signing without RPC connectivity.
- **Native Web Crypto.** All cryptographic primitives go through `crypto.subtle`, the browser's hardware-backed crypto API — not a userland JS implementation.

---

**Limitations and risk considerations:**

| Risk | Notes |
|---|---|
| **XSS → localStorage** | Encrypted keystores sit in `localStorage`, which is readable by any JavaScript executing on the same origin. A successful XSS attack on the page could exfiltrate keystores. The ciphertext is only as safe as the strength of the user's password. |
| **No password strength enforcement** | Wallet creation and import only validate that the password field is non-empty. There is no minimum length, complexity requirement, or strength meter. A weak password substantially reduces the work factor of the PBKDF2 protection. |
| **No password confirmation field** | During wallet creation the password is entered once without confirmation. A typo will permanently lock the user out of the new wallet. |
| **Decrypted mnemonic lingers in React state** | After a successful "Export secret phrase" operation, the plaintext mnemonic is held in component state until the user explicitly clicks Reset. There is no auto-clear timer or blur-to-hide mechanism. |
| **RPC endpoint trust** | The configured RPC node can see all balance and transaction queries for the wallet address. A malicious RPC node could return manipulated data (e.g., false balances). Transaction data is signed locally and cannot be forged by the RPC, but the node sees the address and transaction details before broadcast. |
| **No hardware wallet support** | All key material resides in browser memory during signing. Hardware wallets (Ledger, Trezor) provide an isolated signing environment that is not supported. |
| **No session timeout** | The app does not lock after a period of inactivity. Anyone with access to an unlocked browser session can initiate transactions (each requiring the password, but the unlock dialog is visible). |
| **Keystore import lacks schema validation** | Importing via file or paste calls `JSON.parse` without validating the keystore schema. A malformed or unexpected JSON object is stored as-is. The current risk surface is low since the stored value is not executed, but it can cause confusing UI state or failed decryption attempts later. |
| **`localStorage` origin scope** | All data is stored under the app's origin. Any other script served from the same origin (e.g., a compromised dependency loaded via a CDN without SRI) can read the encrypted keystores. Subresource Integrity (SRI) for dependencies and a strict Content Security Policy are deployment-level controls that are not enforced by the app itself. |

---

### Threat model summary

This wallet is designed for self-custody in a trusted browser environment. The primary trust assumptions are:

1. **The device is not compromised.** Malware or a compromised browser extension with access to `localStorage` can read the encrypted keystores.
2. **The origin is not serving malicious scripts.** XSS or supply-chain compromise of a bundled dependency could exfiltrate keystores. Password-protection is the last line of defense.
3. **The user chooses a strong password.** The PBKDF2 encryption is only as strong as the entropy of the password. The app does not enforce this.
4. **The RPC node is honest for balance/fee data.** Transaction signatures are produced locally and cannot be forged, but a dishonest RPC can lie about balances and gas prices.

For high-value wallets, consider using this app in a dedicated browser profile with no extensions, on a clean device, and always use a long randomly generated password. For signing transactions on air-gapped hardware, enable offline mode and use the raw transaction signing tab.
