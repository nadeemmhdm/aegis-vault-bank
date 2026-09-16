# 📡 Kali Linux SIEM Telemetry & Syslog Integration

> Connect AegisVault Bank's live audit trail directly into your Kali Linux Security Operations Center (SOC) monitoring stack.

---

## 🏗️ Architecture

```
+-------------------------------------------------------------+
|               AegisVault Bank (Browser Session)             |
|  - Cryptographic Hash Chain Audit Ledger                    |
|  - Real-time Fraud Anomaly Detection Engine                 |
|  - Webhook Dispatcher (POST http://<KALI_IP>:9090/...)      |
+------------------------------+------------------------------+
                               |
                        HTTP POST (CEF/JSON)
                               |
                               v
+-------------------------------------------------------------+
|                      Kali Linux Receiver                    |
|  - Python Standalone Collector                              |
|  - or Wazuh / Splunk / ELK Forwarder                        |
|  - or Netcat Raw Listener                                   |
+-------------------------------------------------------------+
```

---

## ⚙️ Step 1: Start the Receiver in Kali Linux

### Method A: Production-Grade Python SIEM Receiver
Save the following as `siem_receiver.py` in Kali Linux:

```python
#!/usr/bin/env python3
"""
AegisVault SIEM Telemetry Listener for Kali Linux
Accepts real-time CEF & JSON security audit events.
"""
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
from datetime import datetime

PORT = 9090

class TelemetryHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        # Enable CORS preflight from any browser origin
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-Aegis-Nonce')
        self.end_headers()

    def do_POST(self):
        content_len = int(self.headers.get('Content-Length', 0))
        raw_payload = self.rfile.read(content_len).decode('utf-8')
        
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        print(f"\n\033[94m[{now}] 🚨 NEW SIEM AUDIT TELEMETRY RECEIVED:\033[0m")
        try:
            data = json.loads(raw_payload)
            print(json.dumps(data, indent=2))
        except Exception:
            print(raw_payload)

        # Acknowledge to browser
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(b'{"status":"received","code":200}')

if __name__ == '__main__':
    server = HTTPServer(('0.0.0.0', PORT), TelemetryHandler)
    print(f"\033[92m[+] AegisVault SIEM Listener active on 0.0.0.0:{PORT}...\033[0m")
    server.serve_forever()
```

Run with:
```bash
python3 siem_receiver.py
```

---

### Method B: Quick Netcat / Ncat Stream
If you only need a quick raw stream without writing a script:
```bash
ncat -lkvnp 9090
```

---

## 🔗 Step 2: Configure the Bank to Stream to Kali

1. Open `https://nadeemmhdm.github.io/aegis-vault-bank/` in your browser.
2. Click **Security & Compliance** in the left sidebar.
3. Scroll down to **Kali Linux SIEM Integration**.
4. In the **Webhook / Syslog URL** field, enter your Kali IP address:
   ```
   http://192.168.1.100:9090/api/siem/telemetry
   ```
   *(Replace `192.168.1.100` with your actual Kali IP. If running browser inside Kali, use `http://127.0.0.1:9090/api/siem/telemetry`)*.
5. Click **Update Configuration**.

---

## 📊 Sample Common Event Format (CEF) Log Output

When a customer performs a wire transfer, login, or security state toggle, your Kali receiver will display logs formatted as follows:

```text
[2026-09-16 14:15:32] 🚨 NEW SIEM AUDIT TELEMETRY RECEIVED:
{
  "timestamp": "2026-09-16T14:15:32.180Z",
  "eventType": "WIRE_TRANSFER_EXECUTED",
  "severity": "INFO",
  "customer": "Alex Vance",
  "details": {
    "recipient": "AC-9812-4401",
    "amount": 12500.00,
    "currency": "USD",
    "txHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "nonce": "1726500932180.f4d92a11"
  },
  "chainProof": "prevHash:d2f10b... -> currHash:a4c871...",
  "riskScore": 14.5
}
```

If an attack is simulated in Pentest Mode, a high-severity alert is dispatched:

```text
[2026-09-16 14:18:10] 🚨 NEW SIEM AUDIT TELEMETRY RECEIVED:
{
  "timestamp": "2026-09-16T14:18:10.420Z",
  "eventType": "SECURITY_VIOLATION_ATTEMPT",
  "severity": "CRITICAL",
  "customer": "ANONYMOUS_PROBE",
  "details": {
    "vector": "SQLI_AUTH_BYPASS_ATTEMPT",
    "payload": "' OR '1'='1' --",
    "sourceIp": "127.0.0.1",
    "mitigation": "HARDENED_ENGINE_BLOCKED"
  }
}
```
