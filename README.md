# 🛡️ AegisVault Commercial Bank & CyberSec Defense Hub

> A production-grade, real commercial banking platform featuring multi-currency checking & high-yield savings accounts, 3D interactive virtual debit cards, UPI 2.0 instant payment rails, client-side relational database persistence (IndexedDB), and real-time Kali Linux SIEM audit telemetry. Built with zero-trust Web Cryptography and deployable to GitHub Pages.

[![GitHub Pages](https://img.shields.io/badge/Hosted%20On-GitHub%20Pages-blue?style=for-the-badge&logo=github)](https://nadeemmhdm.github.io/aegis-vault-bank/)
[![Security Hardened](https://img.shields.io/badge/Security-WebCrypto%20AES--256--GCM-emerald?style=for-the-badge&logo=shieldsdotio)](https://nadeemmhdm.github.io/aegis-vault-bank/)
[![Database](https://img.shields.io/badge/Database-IndexedDB%20ACID-orange?style=for-the-badge&logo=sqlite)](https://nadeemmhdm.github.io/aegis-vault-bank/)
[![Payments](https://img.shields.io/badge/Payments-UPI%202.0%20%7C%20Wire%20%7C%20Bills-success?style=for-the-badge)](https://nadeemmhdm.github.io/aegis-vault-bank/)
[![Kali Linux SIEM](https://img.shields.io/badge/Kali%20SIEM-CEF%20Telemetry%20Stream-red?style=for-the-badge&logo=kalilinux)](https://nadeemmhdm.github.io/aegis-vault-bank/)

---

## 🌐 Live Application
Access the production application live on GitHub Pages:  
👉 **[https://nadeemmhdm.github.io/aegis-vault-bank/](https://nadeemmhdm.github.io/aegis-vault-bank/)**

---

## 📑 Table of Contents
1. [Core Banking Capabilities](#-core-banking-capabilities)
2. [Real Relational Database Architecture (IndexedDB)](#-real-relational-database-architecture-indexeddb)
3. [UPI 2.0 & Instant Payment Rails](#-upi-20--instant-payment-rails)
4. [Customer Authentication & Registration Lifecycle](#-customer-authentication--registration-lifecycle)
5. [Dual Security Engines & Cryptography](#-dual-security-engines--cryptography)
6. [Kali Linux Connection & Security Auditing Guide](#-kali-linux-connection--security-auditing-guide)
   - [A. Burp Suite / OWASP ZAP Proxy Setup](#a-burp-suite--owasp-zap-proxy-setup-in-kali)
   - [B. Kali SIEM Telemetry & Syslog Webhook Listener](#b-real-time-kali-siem-telemetry-listener)
   - [C. Penetration Testing & Vulnerability Assessment Scenarios](#c-penetration-testing--vulnerability-scenarios)
   - [D. CLI Probing with curl & Python Scripts](#d-cli-probing-with-curl-from-kali-linux)
7. [Default Credentials](#-default-credentials)
8. [Local Development](#-local-development)

---

## 🏦 Core Banking Capabilities

AegisVault is designed to mirror the operational rigor of commercial private banks:
- **Multi-Currency Accounts**: Premier Checking, High-Yield Savings (4.85% APY), and Cold Vault Reserves with live balance calculation and currency formatting.
- **3D Interactive Virtual Cards**: Realistic physical-feel titanium cards with 3D flip-to-CVV, dynamic PAN token regeneration, card freezing, and contactless limit sliders.
- **Credit & Lending Facilities**: Instant pre-approved credit line calculator ($25,000 baseline) and funding directly into the customer's checking account with automated monthly amortization calculation.
- **Financial Ledger & Statement Export**: Searchable and filterable transaction history with 1-click CSV statement download.
- **Multi-Customer Profile Switcher**: Switch seamlessly between pre-configured VIP customers (e.g., *Alex Vance*) and dynamically registered customers with total ledger and balance isolation.

---

## 🗄️ Real Relational Database Architecture (IndexedDB)

The application utilizes an asynchronous, native browser **IndexedDB relational storage engine** (`AegisVault_Commercial_DB`, Version 1) rather than simple ephemeral storage. Data persists permanently across browser restarts, page reloads, and network disconnections.

### Object Stores (Tables) & Schema
| Object Store | Primary Key | Key Indexes | Purpose |
| :--- | :--- | :--- | :--- |
| `customers` | `id` | `email` (unique), `phone` | Stores customer credentials, hashed PINs, customer status, and profile metadata. |
| `accounts` | `id` | `accountNumber` (unique), `customerId` | Stores account balances, account type, currency, and APY rates. |
| `cards` | `id` | `cardNumber` (unique), `customerId` | Stores virtual card metadata, CVV, expiry, spending limits, and freeze states. |
| `transactions`| `id` | `timestamp`, `accountId`, `customerId`, `type` | Stores immutable ledger records, nonces, transaction hashes, and status. |
| `beneficiaries`| `id`| `customerId`, `accountNumber` | Pre-approved wire and UPI recipients with trust scores. |
| `audit_logs` | `id` | `timestamp`, `eventType`, `severity` | Hash-chained tamper-evident compliance and security audit logs. |

---

## ⚡ UPI 2.0 & Instant Payment Rails

AegisVault includes an implementation of modern instant payment rails modeled after the Unified Payments Interface (UPI 2.0):
1. **Virtual Payment Address (VPA)**: Every customer is automatically issued a unique UPI ID upon account creation (e.g. `alex.vance@aegis`).
2. **Instant P2P Transfers**: Send money in real-time to any UPI ID or phone number with a 4-digit Transaction PIN.
3. **Dynamic QR Code Scanner**: Generates dynamic cryptographic QR codes containing payment request tokens (`upi://pay?pa=...&am=...&pn=...`).
4. **Utility Bill Settlement**: Direct settlement of essential services:
   - ⚡ Electricity Bills
   - 💧 Water & Municipal Services
   - 🌐 High-Speed Fiber Broadband
   - 📡 DTH & Cable Subscriptions
5. **Instant Digital Receipts**: Every UPI transaction generates an immutable reference number (`UPI-xxxxxxxxxxxx`) and updates the IndexedDB ledger instantly.

---

## 👤 Customer Authentication & Registration Lifecycle

AegisVault provides a real customer onboarding and authentication system:
- **New Customer Registration**:
  - Full legal name, email, phone number.
  - Account type selection (Premier Checking, High-Yield Savings, Business Gold).
  - Initial opening deposit (credited immediately to the customer's account).
  - Setup of a 4-digit secret Transaction PIN for transfers.
  - Automatic provisioning of a checking account, a virtual titanium debit card, and a UPI VPA ID.
- **Secure Customer Sign-In**:
  - Verification against IndexedDB records.
  - 100,000 iteration PBKDF2 key derivation for transaction encryption.
  - 30-second rolling 2FA/TOTP authenticator support.
  - Account lockout protection after consecutive failed attempts.

---

## 🔐 Dual Security Engines & Cryptography

AegisVault incorporates an enterprise dual-mode security architecture:

### 1. Hardened Enterprise Mode (Default Production State)
- **Zero-Trust Input Sanitization**: All transfer memos, UPI notes, and form fields pass through strict DOM-sanitization matrices before rendering to eliminate Cross-Site Scripting (XSS).
- **Cryptographic Anti-Replay Nonces**: Each wire transfer requires a one-time cryptographic nonce (`timestamp.entropy`) verified before settlement. Replayed nonces are rejected.
- **Client-Side Encryption**: Sensitive metadata encrypted using AES-256-GCM via `window.crypto.subtle`.
- **Tamper-Evident Hash Chain**: Audit events are cryptographically chained using SHA-256, verifying mathematical integrity against tampering.

### 2. Authorized Penetration Testing / Lab Mode
Activated via the **Security & Compliance** view (`#view-security`) under the **Security Posture** control. This mode allows cybersecurity professionals to observe and benchmark real-world attack vectors against banking workflows without third-party dependencies.

---

## 🐉 Kali Linux Connection & Security Auditing Guide

AegisVault is designed to interface directly with security tools running inside **Kali Linux** for training, penetration testing, and SIEM monitoring.

```
+--------------------------+              +--------------------------+
|       Kali Linux         |              |     AegisVault Bank      |
|  - Burp Suite / OWASP    | <---Proxy--  |   (Browser Session)      |
|  - Python SIEM Listener  | <--Webhook-  |   - WebCrypto Core       |
|  - Ncat / Curl Probes    |              |   - IndexedDB Relational |
+--------------------------+              +--------------------------+
```

---

### A. Burp Suite / OWASP ZAP Proxy Setup in Kali

To inspect, intercept, and modify banking transactions in transit:

1. **Configure Kali Proxy Listener**:
   - Open **Burp Suite** in Kali Linux (`burpsuite`).
   - Navigate to `Proxy` > `Options` > `Proxy Listeners`.
   - Ensure the listener is running on `127.0.0.1:8080` (or `0.0.0.0:8080` if accessing across a virtual network).

2. **Route Browser Traffic to Burp**:
   - In Firefox (or Chromium) on Kali:
     - Go to `Settings` > `Network Settings` > `Manual proxy configuration`.
     - Set HTTP Proxy to `127.0.0.1` and Port to `8080`.
     - Check **Use this proxy server for all protocols**.

3. **Install Burp Suite CA Certificate**:
   - Navigate to `http://burp` in your browser.
   - Click **CA Certificate** and save `cacert.der`.
   - Go to Browser `Settings` > `Privacy & Security` > `Certificates` > `View Certificates` > `Import...`.
   - Select `cacert.der` and check **Trust this CA to identify websites**.

4. **Audit Banking Traffic**:
   - Open `https://nadeemmhdm.github.io/aegis-vault-bank/`.
   - Observe real-time HTTP/HTTPS requests, JSON payloads, and cryptographic headers in the Burp `HTTP History` tab.

---

### B. Real-Time Kali SIEM Telemetry Listener

AegisVault can forward real-time security events, wire transfers, and authentication audit logs in **Common Event Format (CEF)** or JSON to a Kali Linux listener.

#### 1. Configure the Telemetry Endpoint in the Bank UI
- Navigate to **Security & Compliance** > **Kali Linux SIEM Integration**.
- Set the **Webhook / Syslog URL** to your Kali listener:
  ```
  http://<KALI_IP>:9090/api/siem/telemetry
  ```
  *(If testing locally within Kali, use `http://127.0.0.1:9090/api/siem/telemetry`)*.
- Click **Update Configuration**.

#### 2. Start the Telemetry Receiver on Kali Linux

Create a dedicated Python listener script `kali_siem_listener.py`:

```python
#!/usr/bin/env python3
"""
AegisVault Bank - Kali Linux SIEM Telemetry Collector
Receives real-time CEF & JSON security audit events from AegisVault.
"""
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
from datetime import datetime

class SIEMHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        # Handle CORS preflight from browser
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8')
        
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"\n[\033[92m{timestamp}\033[0m] \033[1mReceived SIEM Security Telemetry:\033[0m")
        
        try:
            payload = json.loads(body)
            print(json.dumps(payload, indent=2))
        except Exception:
            print(body)
            
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(b'{"status":"received","code":200}')

if __name__ == '__main__':
    port = 9090
    server = HTTPServer(('0.0.0.0', port), SIEMHandler)
    print(f"\033[94m[+] AegisVault SIEM Telemetry Listener active on port {port}...\033[0m")
    print("[+] Waiting for incoming audit events from AegisVault...")
    server.serve_forever()
```

Run the listener in a Kali terminal:
```bash
python3 kali_siem_listener.py
```

#### 3. Quick Alternative: Using Netcat / Ncat
```bash
# Listen for raw HTTP POST packets from the browser
ncat -lkvnp 9090
```

Trigger any wire transfer or login in AegisVault to see live audit events streamed instantly to your Kali console.

---

### C. Penetration Testing & Vulnerability Scenarios

Toggle the **Security Posture** switch to **Security Assessment / Pentest Mode** in the **Security & Compliance** view to study each vulnerability class:

#### 1. SQL Injection (SQLi) Authentication Bypass
- **Objective**: Bypass login authentication without a valid password.
- **Attack Payload**:
  - Email: `' OR '1'='1' -- ` or `admin' --`
  - Password: `any_password`
- **Result in Pentest Mode**: Simulates an unparameterized backend query (`SELECT * FROM customers WHERE email = '' OR '1'='1' --' AND pass = ...`), immediately authenticating into the first active account (*Alex Vance*).
- **Result in Hardened Mode**: Strict input validation rejects SQL meta-characters, logging a `SECURITY_VIOLATION` event to the audit trail and SIEM listener.

#### 2. Cross-Site Scripting (XSS) in Transaction Memos
- **Objective**: Execute client-side JavaScript via stored or reflected transaction fields.
- **Attack Payload**:
  - Navigate to **Wire Transfers** or **UPI 2.0**.
  - In the **Memo / Note** input, inject:
    ```html
    <img src=x onerror="alert('XSS_AUDIT_EXPLOIT_TRIGGERED')">
    ```
- **Result in Pentest Mode**: The unescaped payload renders in the recent transaction activity feed, executing the JavaScript payload.
- **Result in Hardened Mode**: Content is safely escaped and DOM-sanitized (`&lt;img src=x onerror=...&gt;`).

#### 3. Anti-Replay Nonce Bypass & Replay Attacks
- **Objective**: Re-transmit a valid wire transfer packet to duplicate withdrawal.
- **Procedure**:
  1. Capture a legitimate wire transfer POST request in **Burp Suite**.
  2. Note the `x-nonce` header (`timestamp.random_entropy`).
  3. Send the request to **Burp Repeater** (`Ctrl+R`).
  4. Resend the request after 60 seconds without altering the nonce.
- **Observation**: Hardened Mode checks the nonce against previously consumed nonces in the database and rejects the replayed packet with `409 Conflict: Nonce Expired or Already Consumed`.

#### 4. Parameter Tampering (Negative Amount Inversion)
- **Objective**: Inject negative values (`-$5,000`) into transfer forms to cause account balance reversal.
- **Procedure**:
  - Intercept the payment request in Burp Suite and change `"amount": "100.00"` to `"amount": "-5000.00"`.
- **Observation**: Hardened Mode performs mathematical range validation (`amount > 0 && isFinite(amount)`), preventing negative balance exploits.

---

### D. CLI Probing with curl from Kali Linux

You can simulate automated security scanners and microservice checks directly from your Kali shell:

```bash
# 1. Probe the live application headers
curl -I https://nadeemmhdm.github.io/aegis-vault-bank/

# 2. Test the Kali SIEM receiver locally
curl -X POST http://localhost:9090/api/siem/telemetry \
  -H "Content-Type: application/json" \
  -d '{"eventType":"CLI_AUDIT_PROBE","source":"Kali-Terminal","severity":"INFO"}'

# 3. Benchmark site asset integrity
curl -s https://nadeemmhdm.github.io/aegis-vault-bank/js/crypto.js | sha256sum
```

---

## 🔑 Default Credentials

| Field | Production Demo Account |
| :--- | :--- |
| **Customer Name** | Alex Vance (VIP Private Banking) |
| **Email** | `alex.vance@aegisvault.internal` |
| **Password** | `password123` |
| **Transaction PIN** | `1234` |
| **UPI ID** | `alex.vance@aegis` |
| **Master 2FA Code** | `777888` (or use rolling code displayed in header) |

*(You can also register brand new customers via the **Register New Account** modal; their accounts, cards, UPI IDs, and balances will be created and saved directly to IndexedDB).*

---

## 💻 Local Development

To run and test the repository locally on your workstation:

```bash
# Clone the repository
git clone https://github.com/nadeemmhdm/aegis-vault-bank.git

# Enter project directory
cd aegis-vault-bank

# Start a local web server (Python 3)
python -m http.server 8080
```

Open `http://localhost:8080` in any modern web browser (Google Chrome, Firefox, Safari, Edge).

---

## 📜 Compliance & Security Disclaimer
*AegisVault Bank is engineered exclusively for educational cybersecurity research, defense architecture demonstration, and authorized security auditing. All attack models and test scenarios are contained within client-side sandboxes and educational mock endpoints.*
