# 🛡️ AegisVault Commercial Bank & CyberSec Defense Hub

> [!WARNING]
> ### ⚠️ STRICTLY FOR EDUCATIONAL & AUTHORIZED CYBERSECURITY LAB RESEARCH ONLY
> This software is engineered exclusively for defensive cybersecurity training, red-team / blue-team assessments, and web application security auditing in controlled environments. Unauthorized access, malicious exploitation, or deployment against unapproved targets is strictly prohibited by law.

> [!IMPORTANT]
> ### ⚡ ZERO-CLONE ACCESS: NO GIT CLONING REQUIRED!
> You do **NOT** need to clone or download this repository to access or audit this banking lab from Kali Linux!  
> 🌐 **Live Target**: **[https://nadeemmhdm.github.io/aegis-vault-bank/](https://nadeemmhdm.github.io/aegis-vault-bank/)**  
> Or launch the automated Kali Connector via 1 terminal command:
> ```bash
> curl -sSL https://raw.githubusercontent.com/nadeemmhdm/aegis-vault-bank/main/connect-kali.sh | bash
> ```

[![GitHub Pages](https://img.shields.io/badge/Hosted%20On-GitHub%20Pages-blue?style=for-the-badge&logo=github)](https://nadeemmhdm.github.io/aegis-vault-bank/)
[![Security Warning](https://img.shields.io/badge/Warning-Educational%20Use%20Only-yellow?style=for-the-badge&logo=alert)](https://nadeemmhdm.github.io/aegis-vault-bank/)
[![Security Hardened](https://img.shields.io/badge/Security-WebCrypto%20AES--256--GCM-emerald?style=for-the-badge&logo=shieldsdotio)](https://nadeemmhdm.github.io/aegis-vault-bank/)
[![Database](https://img.shields.io/badge/Database-IndexedDB%20Relational%20v2-orange?style=for-the-badge&logo=sqlite)](https://nadeemmhdm.github.io/aegis-vault-bank/)
[![Payments](https://img.shields.io/badge/Payments-UPI%202.0%20%7C%20Wires%20%7C%20FDs%20%7C%20Bills-success?style=for-the-badge)](https://nadeemmhdm.github.io/aegis-vault-bank/)
[![Kali Linux SIEM](https://img.shields.io/badge/Kali%20SIEM-CEF%20Telemetry%20Stream-red?style=for-the-badge&logo=kalilinux)](https://nadeemmhdm.github.io/aegis-vault-bank/)

---

## 📑 Table of Contents
1. [Zero-Clone Kali Connection Guide](#-zero-clone-kali-connection-guide)
2. [Documentation Hub (`docs/`)](#-documentation-hub-docs)
3. [Full Commercial Banking Features](#-full-commercial-banking-features)
4. [Relational Database Engine (IndexedDB v2)](#-relational-database-engine-indexeddb-v2)
5. [UPI 2.0 & Instant Payment Rails](#-upi-20--instant-payment-rails)
6. [Fixed Deposits & Wealth Management](#-fixed-deposits--wealth-management)
7. [Customer Onboarding & Authentication Lifecycle](#-customer-onboarding--authentication-lifecycle)
8. [Auditing & Penetration Testing Modules](#-auditing--penetration-testing-modules)
9. [Default Credentials](#-default-credentials)
10. [Legal & Educational Disclaimer](#-legal--educational-disclaimer)

---

## ⚡ Zero-Clone Kali Connection Guide

You can connect your Kali Linux testing workstation to this live banking lab instantly without cloning git repositories.

### Method 1: Direct Web Access (Recommended)
Open Firefox or Chromium inside Kali Linux and navigate to:  
👉 **[https://nadeemmhdm.github.io/aegis-vault-bank/](https://nadeemmhdm.github.io/aegis-vault-bank/)**

### Method 2: 1-Click Interactive Kali Terminal Launcher & Shell (`aegis-term>`)
Open any terminal in Kali Linux and run:
```bash
curl -sSL https://raw.githubusercontent.com/nadeemmhdm/aegis-vault-bank/main/connect-kali.sh | bash
```
**Features of the terminal connector:**
- Authenticates with authorized lab credentials (`labuser` / `aegislab2026`).
- Spawns the dedicated interactive shell `aegis-term>` with guided exercises (`sqli`, `xss`, `replay`, `tamper`).
- Starts an isolated local REST API gateway on `http://127.0.0.1:8888` for direct testing via `curl`, `python`, and `Burp Suite`.
- Captures and streams live Common Event Format (CEF) / JSON security audit telemetry.

### Method 3: Burp Suite Proxying for Live Lab Endpoints
1. Start Burp Suite: `burpsuite &`.
2. Ensure Proxy listener is active on `127.0.0.1:8080`.
3. Route terminal curl commands directly through Burp:
   ```bash
   curl -x http://127.0.0.1:8080 -X POST http://127.0.0.1:8888/api/v1/auth/login ...
   ```
4. In Burp Repeater (`Ctrl+R`), craft custom payloads and inspect raw HTTP requests and responses.

---

## 📚 Documentation Hub (`docs/`)

Comprehensive technical manuals and lab notes are stored in the [`docs/`](./docs/) directory:

| Document | Description |
| :--- | :--- |
| 💻 [**docs/KALI_TERMINAL_LAB_GUIDE.md**](./docs/KALI_TERMINAL_LAB_GUIDE.md) | **Complete 9-Step Kali Terminal Pentest Guide**: Authentication, interactive shell (`aegis-term>`), curl commands, Burp Suite setup, and isolated exercises. |
| 📖 [**docs/HOW_TO_ACCESS_LAB.md**](./docs/HOW_TO_ACCESS_LAB.md) | Step-by-step guide to zero-clone access, Kali connector setup, and Burp Suite SSL certificate installation. |
| 🐉 [**docs/KALI_PENTEST_GUIDE.md**](./docs/KALI_PENTEST_GUIDE.md) | Deep-dive attack vector walkthroughs: SQLi bypass, Stored/Reflected XSS, Replay attacks, and parameter tampering. |
| 📡 [**docs/SIEM_INTEGRATION.md**](./docs/SIEM_INTEGRATION.md) | Live Common Event Format (CEF) and JSON telemetry streaming to Kali listeners and SOC tools. |
| 🛡️ [**docs/DEFENSE_ARCHITECTURE.md**](./docs/DEFENSE_ARCHITECTURE.md) | Cryptographic blueprints: AES-256-GCM, PBKDF2 (100k rounds), SHA-256 hash chains, and IndexedDB schemas. |

---

## 🏦 Full Commercial Banking Features

AegisVault is designed to model the exact UX and operational standards of modern private commercial banks:
- **Multi-Currency Engine**: Live currency switching between **USD ($)**, **EUR (€)**, **GBP (£)**, and **INR (₹)** with real-time conversion across all balance widgets.
- **Fixed Deposits (FD) & Term Certificates**: Compounded yield booking (6 to 36 months, up to 8.15% APY) with digital certificate issuance.
- **Beneficiaries & Payees Directory**: Pre-approved directory for wire recipients and UPI VPAs with 1-click **Quick Pay**.
- **Interactive 3D Virtual Cards**: Realistic physical titanium debit card with 3D flip-to-CVV, dynamic PAN token regeneration, card freezing, and contactless limit sliders.
- **Official Print / PDF Statements**: 1-click formal bank statement generator ready to print or save as PDF.
- **Credit & Lending Facilities**: Instant revolving credit facility with dynamic monthly payment calculator.
- **Session Security Watchdog**: Real-time tracker for active login sessions, IP addresses, and 1-click remote session revocation.

---

## 🗄️ Relational Database Engine (IndexedDB v2)

All banking operations use native browser **IndexedDB** (`AegisVault_Commercial_DB`, Version 2). Data is stored in ACID-like relational tables and permanently retained:
- `customers`: Profiles, hashed PINs, passwords, and security tiers.
- `accounts`: Checking, savings, and vault account balances.
- `cards`: Virtual debit cards, limits, and freeze states.
- `transactions`: Immutable transaction ledger with cryptographic nonces.
- `fixed_deposits`: Active term certificates, maturity dates, and rates.
- `beneficiaries`: Trusted wire and UPI payees directory.
- `login_sessions`: Active sessions and connected IP logs.
- `audit_logs`: SHA-256 chained tamper-evident event logs.

---

## ⚡ UPI 2.0 & Instant Payment Rails

- **Virtual Payment Address (VPA)**: Unique UPI ID per customer (e.g., `alex.vance@aegis`).
- **P2P Transfers**: Instant money transfers to any VPA or mobile number with 4-digit PIN authorization.
- **Dynamic QR Code Scanner**: Cryptographic QR payload generation (`upi://pay?pa=...`).
- **Utility Bill Settlement**: In-app settlement of Electricity, Water, Broadband, and DTH subscriptions with instant ledger updates.

---

## 📈 Fixed Deposits & Wealth Management

- **Booking Calculator**: Select principal and lock-in period (6, 12, 24, 36 months) to preview accrued returns.
- **Guaranteed Returns**: High-yield interest calculated up to 8.15% APY.
- **Instant Certificates**: Automatically credited and debited from the customer's checking account and stored in IndexedDB.

---

## 👤 Customer Onboarding & Authentication Lifecycle

- **New Customer Registration**: Open real commercial banking accounts with legal name, email, phone, account tier, opening deposit, and 4-digit secret PIN.
- **Customer Sign-In**: Authenticates against IndexedDB records with 100,000-iteration PBKDF2 derivation.
- **Multi-Customer Profile Switcher**: Switch between VIP accounts (*Alex Vance*) and dynamically registered customer profiles with isolated balances and ledgers.

---

## 🐉 Auditing & Penetration Testing Modules

Toggle the **Security Posture** switch to **Security Assessment / Pentest Mode** in the **Security & Compliance** view to audit:
1. **SQL Injection (SQLi) Auth Bypass**: Test `' OR '1'='1' -- ` against the login portal.
2. **Cross-Site Scripting (XSS)**: Inject `<img src=x onerror=...>` into transfer memos.
3. **Anti-Replay Nonce Bypass**: Capture signed wire payloads in Burp Suite and replay expired nonces.
4. **Parameter Tampering**: Inject negative amounts (`-$5,000.00`) to test debit inversion vulnerabilities.
5. **Real-Time SIEM Streaming**: Receive CEF/JSON logs in Kali Linux on `http://<KALI_IP>:9090/api/siem/telemetry`.

---

## 🔑 Default Credentials

| Field | Production Demo Account |
| :--- | :--- |
| **Customer Name** | Alex Vance (VIP Private Banking) |
| **Email** | `alex.vance@aegisvault.internal` |
| **Password** | `password123` |
| **Transaction PIN** | `1234` |
| **UPI ID** | `alex.vance@aegis` |
| **Master 2FA Code** | `777888` (or rolling code from header) |

---

## 📜 Legal & Educational Disclaimer

> [!CAUTION]
> **DISCLAIMER**: AegisVault Bank is developed exclusively for educational purposes and authorized defensive cybersecurity research. The software must not be used for malicious purposes, unauthorized penetration testing, or credential harvesting. The author and contributors assume no liability for misuse.
