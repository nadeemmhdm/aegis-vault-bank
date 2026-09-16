# 🛡️ AegisVault Bank - Defense Architecture & Cryptographic Foundations

> Comprehensive architectural breakdown of the client-side cryptographic systems, persistent relational IndexedDB database, and zero-trust engineering behind AegisVault Bank.

---

## 🏛️ Architectural Pillars

```
+-------------------------------------------------------------------------+
|                           PRESENTATION LAYER                            |
|  - Semantic HTML5 & CSS3 Glassmorphism System                           |
|  - Responsive Flex/Grid Layouts (Mobile, Tablet, Desktop)               |
|  - 3D Interactive Virtual Cards (CSS perspective / preserve-3d)         |
+------------------------------------+------------------------------------+
                                     |
+------------------------------------v------------------------------------+
|                         APPLICATION ENGINE                              |
|  - State Manager (Reactive Event Store)                                 |
|  - Banking Core (Wires, UPI 2.0, Fixed Deposits, Bills, Credit Facility)|
|  - Dual Security Manager (Hardened Production vs Pentest Target)        |
+------------------------------------+------------------------------------+
                                     |
+------------------------------------v------------------------------------+
|                         CRYPTOGRAPHY & DEFENSE                          |
|  - Web Crypto API (window.crypto.subtle)                                |
|  - AES-256-GCM (Authenticated Encryption)                              |
|  - PBKDF2 (100,000 rounds key derivation from PIN/Password)             |
|  - SHA-256 Hash Chaining (Tamper-evident audit trail)                   |
|  - Dynamic Anti-Replay Nonces (timestamp.entropy)                       |
+------------------------------------+------------------------------------+
                                     |
+------------------------------------v------------------------------------+
|                         PERSISTENCE LAYER                               |
|  - Native IndexedDB (AegisVault_Commercial_DB v1)                       |
|  - Object Stores: customers, accounts, cards, transactions,             |
|                   beneficiaries, audit_logs                             |
+-------------------------------------------------------------------------+
```

---

## 🔐 1. Web Cryptography Specifications

### AES-256-GCM (Galois/Counter Mode)
Used for encrypting sensitive client-side payload bodies and transaction metadata:
- **Algorithm**: `AES-GCM`
- **Key Length**: 256 bits
- **IV (Initialization Vector)**: 12 bytes of cryptographically secure random values (`window.crypto.getRandomValues(new Uint8Array(12))`).
- **Tag Length**: 128 bits authentication tag ensuring confidentiality and ciphertext integrity.

### PBKDF2 Key Derivation
- **Hash Function**: `SHA-256`
- **Iterations**: `100,000`
- **Salt**: 16 bytes random salt generated per customer profile.
- **Application**: Derivation of symmetric transaction encryption keys from customer Transaction PINs.

### Anti-Replay Nonce Engine
Every wire transfer request attaches a single-use token:
```
nonce = `${Date.now()}.${hexEntropy}`
```
The banking engine enforces:
1. `Date.now() - timestamp < 60000` (60-second validity window).
2. Nonce existence check against the `transactions` table in IndexedDB.
3. If duplicate is detected, immediate rejection with anti-replay violation.

---

## 🗄️ 2. Relational Database Schema (`IndexedDB`)

The database uses native browser IndexedDB (`AegisVault_Commercial_DB`):

| Store Name | Primary Key | Indexes | Relationships |
| :--- | :--- | :--- | :--- |
| `customers` | `id` | `email` (unique), `phone` | 1-to-many with `accounts`, `cards`, `beneficiaries` |
| `accounts` | `id` | `accountNumber` (unique), `customerId` | Foreign Key: `customerId` references `customers.id` |
| `cards` | `id` | `cardNumber` (unique), `customerId` | Foreign Key: `customerId` references `customers.id` |
| `transactions` | `id` | `timestamp`, `accountId`, `customerId`, `type` | Foreign Key: `accountId` references `accounts.id` |
| `beneficiaries`| `id` | `customerId`, `accountNumber` | Pre-approved payees for customer |
| `audit_logs` | `id` | `timestamp`, `eventType`, `severity` | Append-only tamper-evident hash chain |

---

## ⛓️ 3. Tamper-Evident Hash Chaining

The audit log operates as a micro-ledger:
```
Event 1: SHA256("GENESIS" + EventData_1) = Hash_1
Event 2: SHA256(Hash_1 + EventData_2)    = Hash_2
Event 3: SHA256(Hash_2 + EventData_3)    = Hash_3
```
Any retroactive modification of stored audit logs or transaction ledgers causes verification to fail, immediately alerting the compliance dashboard and triggering a red warning indicator.
