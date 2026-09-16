#!/usr/bin/env bash
# ==============================================================================
# AegisVault Bank - Instant Kali Linux Lab Connector (Zero-Clone Mode)
# ==============================================================================
# Run directly inside Kali Linux without cloning the repository:
#   curl -sSL https://raw.githubusercontent.com/nadeemmhdm/aegis-vault-bank/main/connect-kali.sh | bash
# ==============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

LAB_URL="https://nadeemmhdm.github.io/aegis-vault-bank/"
SIEM_PORT=9090

clear
echo -e "${CYAN}${BOLD}"
echo "======================================================================"
echo "    🛡️  AegisVault Bank - Kali Linux CyberSec Lab Connector          "
echo "    Target: $LAB_URL"
echo "======================================================================"
echo -e "${NC}"

echo -e "${YELLOW}[!] WARNING: Strictly for authorized educational cybersecurity research.${NC}\n"

# 1. Detect environment
echo -e "${BLUE}[*] Checking Kali Linux Environment...${NC}"
if [ -f /etc/os-release ]; then
    OS_NAME=$(grep -oP '(?<=^NAME=).+' /etc/os-release | tr -d '"')
    echo -e "    Detected OS: ${GREEN}$OS_NAME${NC}"
else
    echo -e "    Operating System: Generic Linux"
fi

# Detect IP for SIEM Listener
KALI_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
if [ -z "$KALI_IP" ]; then
    KALI_IP="127.0.0.1"
fi
echo -e "    Local Kali IP: ${GREEN}$KALI_IP${NC}"
echo -e "    SIEM Webhook URL: ${GREEN}http://$KALI_IP:$SIEM_PORT/api/siem/telemetry${NC}\n"

# 2. Check for optional tools
echo -e "${BLUE}[*] Checking Available Security Tools...${NC}"
for tool in burpsuite ncat python3 curl; do
    if command -v $tool &>/dev/null; then
        echo -e "    [+] $tool: ${GREEN}Installed${NC}"
    else
        echo -e "    [-] $tool: ${RED}Not found (optional)${NC}"
    fi
done
echo ""

# 3. Present connection options
echo -e "${BOLD}Choose connection method:${NC}"
echo "  1) Launch Live Lab in Browser (Firefox/Chromium)"
echo "  2) Start Kali SIEM Telemetry Listener (Port $SIEM_PORT)"
echo "  3) Launch Lab + Start Background SIEM Listener"
echo "  4) Display Burp Suite Proxy Setup Guide"
echo "  5) Exit"
echo ""
read -p "Select an option [1-5]: " OPTION

case $OPTION in
    1)
        echo -e "\n${GREEN}[+] Opening AegisVault Bank live lab in default browser...${NC}"
        xdg-open "$LAB_URL" 2>/dev/null || sensible-browser "$LAB_URL" 2>/dev/null || firefox "$LAB_URL" &
        ;;
    2)
        echo -e "\n${GREEN}[+] Starting Kali SIEM Telemetry Listener on port $SIEM_PORT...${NC}"
        echo -e "${YELLOW}Configure this URL in the bank's Security & Compliance tab:${NC}"
        echo -e "${BOLD}http://$KALI_IP:$SIEM_PORT/api/siem/telemetry${NC}\n"
        
        python3 -c "
from http.server import HTTPServer, BaseHTTPRequestHandler
import json, sys

class H(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    def do_POST(self):
        body = self.rfile.read(int(self.headers.get('Content-Length', 0))).decode('utf-8')
        print('\n\033[92m[SIEM LOG RECEIVED]\033[0m')
        try:
            print(json.dumps(json.loads(body), indent=2))
        except:
            print(body)
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(b'{\"status\":\"ok\"}')

s = HTTPServer(('0.0.0.0', $SIEM_PORT), H)
print('\033[1m[*] Listening on 0.0.0.0:$SIEM_PORT (Ctrl+C to stop)...\033[0m')
try:
    s.serve_forever()
except KeyboardInterrupt:
    print('\n[*] Listener stopped.')
"
        ;;
    3)
        echo -e "\n${GREEN}[+] Launching Background SIEM Listener & Opening Browser...${NC}"
        python3 -c "
from http.server import HTTPServer, BaseHTTPRequestHandler
import json

class H(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    def do_POST(self):
        body = self.rfile.read(int(self.headers.get('Content-Length', 0))).decode('utf-8')
        print('\n\033[92m[SIEM AUDIT EVENT]\033[0m ' + body)
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(b'{\"status\":\"ok\"}')

s = HTTPServer(('0.0.0.0', $SIEM_PORT), H)
s.serve_forever()
" &
        LISTENER_PID=$!
        echo -e "    Listener running in background (PID: $LISTENER_PID)"
        echo -e "    SIEM Webhook URL: http://$KALI_IP:$SIEM_PORT/api/siem/telemetry"
        echo -e "    Opening browser..."
        xdg-open "$LAB_URL" 2>/dev/null || sensible-browser "$LAB_URL" 2>/dev/null || firefox "$LAB_URL" &
        echo -e "\n${YELLOW}Press Enter to terminate the background listener when done.${NC}"
        read
        kill $LISTENER_PID 2>/dev/null || true
        echo -e "${GREEN}[+] Listener stopped.${NC}"
        ;;
    4)
        echo -e "\n${CYAN}======================================================================${NC}"
        echo -e "${BOLD}       BURP SUITE PROXY CONFIGURATION FOR LIVE GITHUB PAGES LAB       ${NC}"
        echo -e "${CYAN}======================================================================${NC}"
        echo "1. Start Burp Suite in Kali: burpsuite &"
        echo "2. Check Proxy > Options: Ensure listener is active on 127.0.0.1:8080"
        echo "3. In Firefox: Settings > Network > Manual proxy -> 127.0.0.1:8080"
        echo "4. Visit http://burp -> Download CA Certificate"
        echo "5. Import Certificate in Firefox (Trust this CA to identify websites)"
        echo "6. Open $LAB_URL in Firefox"
        echo "7. In Burp Proxy > HTTP History: Inspect all requests to nadeemmhdm.github.io"
        echo "8. Use Burp Repeater (Ctrl+R) to test parameter tampering and anti-replay nonces"
        echo ""
        ;;
    *)
        echo "Exiting."
        ;;
esac
