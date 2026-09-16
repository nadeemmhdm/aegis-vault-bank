# 🛡️ AegisVault Bank & CyberSec Defense Hub

> A modern, hyper-secure customer digital banking platform featuring multi-currency asset reserves, 3D interactive virtual cards, ML-powered behavioral fraud anomaly detection, and real-time Kali Linux SIEM audit telemetry. Built with client-side cryptography for 100% serverless hosting on GitHub Pages.

[![GitHub Pages](https://img.shields.io/badge/Hosted%20On-GitHub%20Pages-blue?style=for-the-badge&logo=github)](https://nadeemmhdm.github.io/aegis-vault-bank/)
[![Security Hardened](https://img.shields.io/badge/Security-WebCrypto%20AES--256--GCM-emerald?style=for-the-badge&logo=shieldsdotio)](https://nadeemmhdm.github.io/aegis-vault-bank/)
[![Icons](https://img.shields.io/badge/Icons-Boxicons-blueviolet?style=for-the-badge)](https://boxicons.com)
[![Kali Linux SIEM](https://img.shields.io/badge/Kali%20SIEM-CEF%20Telemetry%20Stream-red?style=for-the-badge&logo=kalilinux)](https://nadeemmhdm.github.io/aegis-vault-bank/)

---

## 🌐 Live Application
Access the live platform on GitHub Pages:
**[https://nadeemmhdm.github.io/aegis-vault-bank/](https://nadeemmhdm.github.io/aegis-vault-bank/)**

---

## ✨ Features & Architecture

### 🏦 1. Production Customer Banking Portal
- **Customer Authentication Engine**: Secure Sign-In and new Customer Account Registration with PBKDF2/SHA-256 password & PIN derivation.
- **Multi-Customer Profile Switching**: Switch seamlessly between customers (e.g. `Alex Vance` and newly registered customers) with isolated balances and ledgers.
- **Multi-Currency Asset Reserves**: Real-time liquidity tracking across Premier Checking, High-Yield Savings (4.85% APY), and Cold Vault Reserves.
- **3D Interactive Virtual Cards**: Realistic physical-feel titanium cards with 3D flip-to-CVV, dynamic PAN token regeneration, card freezing, and contactless limit sliders.
- **Zero-Trust Wire Transfers**: Cryptographic Anti-Replay Nonces (`timestamp.entropy`) verified per transaction to prevent packet replay.
- **Credit & Lending Facilities**: Instant pre-approved credit line calculator and funding directly into the customer's checking account.
- **Financial Ledger & Statement Export**: Searchable and filterable transaction history with 1-click CSV statement download.

### 🐉 2. Kali Linux SIEM Integration & ML Defense Bridge
- **Common Event Format (CEF) Telemetry Streamer**: Stream real-time financial events, nonces, and login attempts directly to your Kali Linux SIEM listener (e.g. Wazuh, Syslog, or Python HTTP listener at `http://<kali-ip>:8088/api/siem/telemetry`).
- **Trained ML Fraud Anomaly Model**: Client-side inference model that calculates real-time risk scores (0% - 100%) by evaluating transaction amount Z-score variance, hourly velocity bursts, time-of-day anomalies, and beneficiary trust baselines.
- **Security Auditor Endpoints Explorer**: Interactive OpenAPI/Burp Suite endpoint reference for security professionals conducting authorized assessments from Kali Linux.

### 🔐 3. Real Web Cryptography (`window.crypto.subtle`)
- **AES-256-GCM**: Authenticated Galois/Counter Mode encryption for sensitive client data.
- **PBKDF2**: 100,000 iteration key derivation from user PIN and passwords.
- **SHA-256 Proof Hashing**: Cryptographic hashing of state, nonces, and chained audit events.
- **Tamper-Evident Audit Trail**: Blockchain-style immutable event chaining with real-time mathematical proof verification.

---

## 🛠️ Technology Stack
- **Structure**: Semantic HTML5 (SEO & WCAG 2.1 AA accessible)
- **Styling**: Vanilla CSS3 (Custom properties, Glassmorphism `backdrop-filter`, 3D CSS transforms, responsive design)
- **Icons**: Boxicons (`boxicons`)
- **Logic**: Modular Vanilla JavaScript (ES6 Modules)
- **Hosting**: GitHub Pages (Zero build step, high availability)

---

## 💻 Local Testing & Setup
To run locally:
```bash
# Clone the repository
git clone https://github.com/nadeemmhdm/aegis-vault-bank.git

# Navigate to project directory
cd aegis-vault-bank

# Run local HTTP server
python -m http.server 8080
```
Open `http://localhost:8080` in Google Chrome or any modern browser.

---

## 🔑 Demo Credentials
- **Default Customer**: Alex Vance
- **Email**: `alex.vance@aegisvault.internal`
- **Password**: `password123`
- **Transaction PIN**: `1234`
- **Master 2FA Bypass Code**: `777888` (or use rolling code from header)
