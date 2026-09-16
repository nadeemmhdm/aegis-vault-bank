# 🚀 How to Access AegisVault Bank Lab (Zero-Clone Mode)

> **IMPORTANT**: You do **NOT** need to clone or download this repository to start using the lab!  
> The bank is hosted 24/7 on high-availability GitHub Pages and is fully operational directly in any modern browser.

---

## ⚡ Option 1: Direct Browser Access (Simplest & Recommended)

Open your web browser (inside Kali Linux, Ubuntu, Windows, or macOS) and navigate directly to:

👉 **[https://nadeemmhdm.github.io/aegis-vault-bank/](https://nadeemmhdm.github.io/aegis-vault-bank/)**

That's it! The entire banking engine, client-side relational database (IndexedDB), WebCrypto engine, and dual security modes run 100% inside your browser session without any server requirements.

---

## 🐉 Option 2: 1-Click Kali Linux Terminal Connector

If you are working inside Kali Linux and want an interactive launcher that automatically checks tools, configures the SIEM listener, and opens your browser:

Run this single command in your Kali terminal (**no git clone required**):

```bash
curl -sSL https://raw.githubusercontent.com/nadeemmhdm/aegis-vault-bank/main/connect-kali.sh | bash
```

### What this script does:
1. Detects your Kali Linux IP address for SIEM telemetry.
2. Checks for `burpsuite`, `ncat`, `python3`, and `curl`.
3. Offers a 1-click option to start the local SIEM webhook listener on port `9090`.
4. Opens the live GitHub Pages lab in Firefox or Chromium.

---

## 🕵️ Option 3: Burp Suite Interception on Live GitHub Pages

You can intercept and audit traffic even though the lab is hosted on GitHub Pages:

### Step 1: Start Burp Suite
In your Kali terminal:
```bash
burpsuite &
```
Verify that the proxy listener is running on `127.0.0.1:8080` (**Proxy** > **Options** > **Proxy Listeners**).

### Step 2: Configure Kali Firefox Proxy
1. In Firefox, open **Settings** (`about:preferences`).
2. Scroll to the bottom and click **Settings...** under **Network Settings**.
3. Select **Manual proxy configuration**:
   - HTTP Proxy: `127.0.0.1`
   - Port: `8080`
   - Check **Also use this proxy for HTTPS**.
4. Click **OK**.

### Step 3: Install the Burp CA Certificate (for HTTPS)
1. With the proxy enabled, open `http://burp` in Firefox.
2. Click **CA Certificate** in the top right corner to download `cacert.der`.
3. In Firefox settings, search for **Certificates** and click **View Certificates...**.
4. In the **Authorities** tab, click **Import...**, select `cacert.der`, and check:
   - ✅ *Trust this CA to identify websites*
5. Click **OK**.

### Step 4: Intercept Bank Transactions
1. Navigate to `https://nadeemmhdm.github.io/aegis-vault-bank/`.
2. In Burp Suite, go to **Proxy** > **HTTP history**.
3. You will see all outbound calls, nonces, and WebCrypto payloads.
4. Perform a wire transfer or UPI payment and capture the request to test in **Repeater** (`Ctrl+R`).

---

## 📡 Option 4: Local Offline Mirror (Optional)

If you prefer running the bank locally on an isolated offline network:

```bash
# Clone the repository
git clone https://github.com/nadeemmhdm/aegis-vault-bank.git
cd aegis-vault-bank

# Launch built-in HTTP server
python3 -m http.server 8080
```

Then visit `http://localhost:8080` in your browser.

---

## 🔑 Demo Account Credentials

| Attribute | Details |
| :--- | :--- |
| **VIP Customer** | Alex Vance |
| **Email** | `alex.vance@aegisvault.internal` |
| **Password** | `password123` |
| **Transaction PIN** | `1234` |
| **UPI ID** | `alex.vance@aegis` |
| **Master 2FA Code** | `777888` (or use rolling code in header) |

*(You can also use the **Register New Account** modal to create custom customers with initial balances).*
