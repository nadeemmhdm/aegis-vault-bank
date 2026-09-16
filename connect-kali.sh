#!/usr/bin/env bash
# ==============================================================================
# AegisVault Bank - Dedicated Kali Linux Terminal Lab Connector (v2.4)
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
CLI_SCRIPT_URL="https://raw.githubusercontent.com/nadeemmhdm/aegis-vault-bank/main/aegis-kali-cli.py"
REST_PORT=8888

clear
echo -e "${CYAN}${BOLD}"
echo "================================================================================"
echo "    🛡️  AegisVault Bank - Kali Linux Dedicated Terminal Gateway & Lab Shell    "
echo "    Target: $LAB_URL"
echo "================================================================================"
echo -e "${NC}"

echo -e "${YELLOW}[!] WARNING: Strictly for authorized educational cybersecurity research.${NC}"
echo -e "${YELLOW}[!] All attacks are strictly isolated to the authorized lab sandbox.${NC}\n"

# 1. Environment & Prerequisites Check
echo -e "${BLUE}[*] Checking Kali Linux Environment...${NC}"
if [ -f /etc/os-release ]; then
    OS_NAME=$(grep -oP '(?<=^NAME=).+' /etc/os-release | tr -d '"')
    echo -e "    Detected OS: ${GREEN}$OS_NAME${NC}"
fi

KALI_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
if [ -z "$KALI_IP" ]; then
    KALI_IP="127.0.0.1"
fi
echo -e "    Workstation IP : ${GREEN}$KALI_IP${NC}"
echo -e "    Local REST Port: ${GREEN}$REST_PORT${NC}\n"

for tool in python3 curl burpsuite ncat; do
    if command -v $tool &>/dev/null; then
        echo -e "    [+] $tool: ${GREEN}Installed${NC}"
    else
        echo -e "    [-] $tool: ${RED}Not found (optional)${NC}"
    fi
done
echo ""

# 2. Connection Mode Selection
echo -e "${BOLD}Select Kali Terminal Connection Mode:${NC}"
echo "  1) Launch Interactive Lab Terminal Shell (aegis-term>) [Recommended]"
echo "  2) Launch Terminal Shell + Open Bank Web Dashboard (Dual Mode)"
echo "  3) View Ready-to-Use curl Commands for Kali"
echo "  4) Display Burp Suite Proxy & Interception Guide"
echo "  5) Exit"
echo ""
read -p "Select an option [1-5]: " OPTION

launch_python_cli() {
    echo -e "\n${BLUE}[*] Initializing AegisVault Kali Terminal Agent...${NC}"
    # Download CLI script if running via curl pipe and file doesn't exist locally
    if [ ! -f "aegis-kali-cli.py" ]; then
        echo -e "    Fetching terminal agent from repository..."
        curl -sSL "$CLI_SCRIPT_URL" -o /tmp/aegis-kali-cli.py
        chmod +x /tmp/aegis-kali-cli.py
        python3 /tmp/aegis-kali-cli.py
    else
        python3 aegis-kali-cli.py
    fi
}

case $OPTION in
    1)
        launch_python_cli
        ;;
    2)
        echo -e "\n${GREEN}[+] Opening Bank Dashboard in browser...${NC}"
        xdg-open "$LAB_URL" 2>/dev/null || sensible-browser "$LAB_URL" 2>/dev/null || firefox "$LAB_URL" &
        launch_python_cli
        ;;
    3)
        echo -e "\n${CYAN}${BOLD}================================================================================"
        echo "               READY-TO-USE CURL COMMANDS FOR KALI TERMINAL                     "
        echo -e "================================================================================${NC}\n"
        echo -e "${YELLOW}Ensure the local gateway is running (Option 1) on port $REST_PORT before running:${NC}\n"
        
        echo -e "${BOLD}1. SQL Injection Authentication Bypass Probe:${NC}"
        echo "curl -X POST http://127.0.0.1:$REST_PORT/api/v1/auth/login \\"
        echo "  -H 'Content-Type: application/json' \\"
        echo "  -d '{\"email\":\"'\\'' OR '\\''1'\\''='\\''1'\\'' --\", \"password\":\"arbitrary\"}'"
        echo ""
        
        echo -e "${BOLD}2. Parameter Tampering (Negative Amount Injection):${NC}"
        echo "curl -X POST http://127.0.0.1:$REST_PORT/api/v1/transfer/wire \\"
        echo "  -H 'Content-Type: application/json' \\"
        echo "  -d '{\"recipient\":\"AC-4491-0021\", \"amount\":-5000.00, \"memo\":\"tamper_test\"}'"
        echo ""
        
        echo -e "${BOLD}3. Stored/Reflected XSS Injection:${NC}"
        echo "curl -X POST http://127.0.0.1:$REST_PORT/api/v1/transfer/wire \\"
        echo "  -H 'Content-Type: application/json' \\"
        echo "  -d '{\"recipient\":\"AC-4491-0021\", \"amount\":10.00, \"memo\":\"<img src=x onerror=alert(1)>\"}'"
        echo ""
        
        echo -e "${BOLD}4. Switch Posture Mode to Pentest:${NC}"
        echo "curl -X POST http://127.0.0.1:$REST_PORT/api/v1/lab/mode \\"
        echo "  -H 'Content-Type: application/json' \\"
        echo "  -d '{\"mode\":\"PENTEST\"}'"
        echo ""
        ;;
    4)
        echo -e "\n${CYAN}======================================================================${NC}"
        echo -e "${BOLD}       BURP SUITE PROXY CONFIGURATION FOR LAB TERMINAL               ${NC}"
        echo -e "${CYAN}======================================================================${NC}"
        echo "1. Start Burp Suite in Kali: burpsuite &"
        echo "2. Proxy Listener: Ensure active on 127.0.0.1:8080"
        echo "3. Route curl requests through Burp to intercept:"
        echo "   curl -x http://127.0.0.1:8080 -X POST http://127.0.0.1:$REST_PORT/api/v1/auth/login ..."
        echo "4. In Burp Repeater (Ctrl+R): Test SQLi strings and replay anti-replay nonces."
        echo ""
        ;;
    *)
        echo "Exiting."
        ;;
esac
