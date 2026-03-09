# Encryption Architecture

## Purpose

This document explains the two encryption mechanisms used by mecfs-paperwork and
their operational limits.

## 1. Local at-rest encryption

### Scope

- IndexedDB record payloads
- snapshots
- profiles
- formpack metadata entries that store user-related data

### Mechanism

- Cipher: `AES-GCM`
- Key size: `256 bit`
- IV size: `12 bytes`
- Envelope kind: `mecfs-paperwork-idb-encrypted`

### Key lifecycle

- The symmetric storage key is generated locally in the browser.
- The key is persisted in the technically required cookie
  `mecfs-paperwork.storage-key`.
- Cookie attributes:
  - `Path=/`
  - `SameSite=Strict`
  - `Secure` on HTTPS origins
- Max age: `31536000` seconds (up to 12 months)

### Important limitation

- The browser app must be able to read the key cookie in order to decrypt local
  data.
- Because of that, `HttpOnly` cannot be used for this cookie in the current SPA
  architecture.
- If the cookie is deleted while encrypted IndexedDB data remains, the local
  data can no longer be decrypted and the app will surface a recovery/reset
  path.

## 2. JSON export encryption

### Scope

- Optional password protection for exported JSON backup files

### Mechanism

- KDF: `PBKDF2`
- Hash: `SHA-256`
- Iterations: `310000`
- Cipher: `AES-GCM`
- Tag length: `128`
- Salt: `16 bytes`
- IV: `12 bytes`
- Envelope kind: `mecfs-paperwork-json-encrypted`

### Key lifecycle

- The user-provided password is used locally for key derivation during export
  and import.
- The password is not transmitted to a server and is not stored by the app.
- Without the password, a later import of an encrypted export is not possible.

## 3. Threat model assumptions

- Encryption protects against casual disclosure from local browser storage or
  exported files.
- Encryption does not protect against a fully compromised browser session,
  active malware on the device, or a malicious extension with access to page
  context.
- Device security and browser-profile hygiene remain part of the threat model.

## 4. Rotation and migrations

- There is currently no proactive key rotation for the IndexedDB at-rest key.
- Existing plaintext IndexedDB payloads are re-encrypted lazily when read and
  written again.
- JSON export encryption is per-file and naturally rotates with each new export
  because new salt and IV values are generated every time.

## 5. Operational guidance

- Users should not clear site cookies independently from site data unless they
  are willing to lose access to previously encrypted local drafts.
- Encrypted JSON exports should be stored separately from the password used to
  protect them.
- Security reviews should revisit the cookie-based key storage decision if the
  application architecture changes.
