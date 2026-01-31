#!/bin/bash

# ==========================================
# Robust Server Setup Script (v3)
# ==========================================

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

STATE_FILE="$HOME/.setup_state.env"
APT_HAS_RUN=false

# --- Helper: Run Apt Update Only Once ---
ensure_apt_update() {
    if [ "$APT_HAS_RUN" = false ]; then
        echo -e "${YELLOW}Updating package lists...${NC}"
        sudo apt update
        APT_HAS_RUN=true
    else
        echo -e "${GREEN}Package lists already updated. Skipping...${NC}"
    fi
}

# --- 1. RESUME CHECK LOGIC ---
if [ -f "$STATE_FILE" ]; then
    echo -e "${GREEN}=== RESUMING SCRIPT AFTER REBOOT ===${NC}"
    source "$STATE_FILE"
    
    # CLEANUP: Remove the auto-run line from .bashrc immediately
    sed -i '/# SETUP_AUTO_RESUME/d' "$HOME/.bashrc"
    
    echo "State loaded. Token: [HIDDEN], VM Mode: $IS_VM"
else
    # --- Configuration Prompts ---
    echo "--------------------------------------------------"
    echo "Please enter your NordVPN Token."
    echo "(Leave empty and press Enter to SKIP NordVPN installation)"
    read -p "Token: " NORD_TOKEN
    echo "--------------------------------------------------"

    echo ""
    echo "--------------------------------------------------"
    read -p "Are you configuring a Virtual Machine (VM)? (y/n): " IS_VM
    echo "--------------------------------------------------"
fi

# --- 2. Basic Setup & Dependencies ---
ensure_apt_update
echo -e "${YELLOW}Checking system packages...${NC}"
sudo apt upgrade -y
sudo apt install -y git ufw wget curl

# --- Node.js / NVM Setup ---
if [ -d "$HOME/.nvm" ]; then
    echo -e "${GREEN}NVM is already installed.${NC}"
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
else
    echo -e "${YELLOW}Installing NVM...${NC}"
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
fi

# Ensure Node 24
if nvm ls 24 > /dev/null 2>&1; then
    echo -e "${GREEN}Node.js v24 already installed.${NC}"
else
    nvm install 24
fi
nvm use 24
corepack enable yarn

# --- 3. PM2 Installation (VM Only) ---
if [[ "$IS_VM" =~ ^[Yy]$ ]]; then
    if ! command -v pm2 &> /dev/null; then
        echo -e "${YELLOW}VM detected. Installing PM2...${NC}"
        npm install -g pm2
    else
        echo -e "${GREEN}PM2 already installed.${NC}"
    fi
fi

# --- 4. Repository Setup ---
REPO_DIR="$HOME/Utilities"
echo -e "${YELLOW}Setting up Repository...${NC}"

if [ -d "$REPO_DIR/.git" ]; then
    echo -e "${GREEN}Repository exists. Pulling latest changes...${NC}"
    cd "$REPO_DIR"
    git checkout mainVersion
    git pull origin mainVersion
else
    echo -e "${YELLOW}Cloning repository...${NC}"
    mkdir -p Utilities
    git clone https://github.com/DEPREMU/Utilities "$REPO_DIR"
    cd "$REPO_DIR"
    git checkout mainVersion
fi

echo -e "${YELLOW}Installing project dependencies...${NC}"
yarn install

# --- 5. NordVPN Configuration (With Reboot Logic) ---

if [[ -z "$NORD_TOKEN" ]]; then
    echo -e "${YELLOW}NordVPN Token is empty. Skipping.${NC}"
else
    echo ""
    # A. Install Package if missing
    if ! command -v nordvpn &> /dev/null; then
        echo -e "${YELLOW}NordVPN not found. Installing...${NC}"
        ensure_apt_update
        # Using the standard install script as requested in your snippet
        sh <(curl -sSf https://downloads.nordcdn.com/apps/linux/install.sh)
    fi

    # B. Group Membership & Reboot Logic
    if ! groups $USER | grep -q 'nordvpn'; then
        echo -e "${RED}User is NOT in nordvpn group. Configuring permissions...${NC}"
        sudo usermod -aG nordvpn $USER
        
        echo -e "${YELLOW}=== REBOOT REQUIRED ===${NC}"
        echo "The system must reboot to apply NordVPN permissions."
        echo "Saving state and setting auto-resume..."

        # 1. Save State
        echo "NORD_TOKEN=\"$NORD_TOKEN\"" > "$STATE_FILE"
        echo "IS_VM=\"$IS_VM\"" >> "$STATE_FILE"
        
        # 2. Add auto-run to .bashrc using the CURRENT script path
        SCRIPT_PATH=$(realpath "$0")
        echo "bash $SCRIPT_PATH # SETUP_AUTO_RESUME" >> "$HOME/.bashrc"
        
        echo -e "${GREEN}Rebooting now. Please log back in to finish setup.${NC}"
        sleep 3
        sudo reboot
        exit 0
    fi

    # C. Configuration
    echo -e "${YELLOW}Configuring NordVPN (User is in group)...${NC}"
    nordvpn login --token "$NORD_TOKEN"
    nordvpn allowlist add port 22
    nordvpn allowlist add port 80
    nordvpn allowlist add port 443
    nordvpn set tpl on
    nordvpn set autoconnect enabled Mexico
    nordvpn set technology nordlynx
fi

# --- 6. Database Initialization ---
DB_SCRIPT="$HOME/Utilities/server/config-oracle/init-db.sh"
if [ -f "$DB_SCRIPT" ]; then
    chmod +x "$DB_SCRIPT"
    "$DB_SCRIPT"
else 
    echo -e "${RED}Database initialization script not found at $DB_SCRIPT. Exiting...${NC}"
    exit 1
fi

ensure_apt_update

# --- 7. VM Specific Logic (SSL, Nginx, Firewall) ---

if [[ "$IS_VM" =~ ^[Yy]$ ]]; then
    echo -e "\n${YELLOW}=== VM CONFIGURATION ===${NC}"
    
    # --- New Logic: Ask to configure Nginx ---
    echo ""
    read -p "Do you want to configure Nginx and SSL now? (y/n): " SETUP_NGINX

    if [[ "$SETUP_NGINX" =~ ^[Yy]$ ]]; then
        
        read -p "Enter the Domain Name (Leave empty to SKIP Nginx setup): " DOMAIN

        if [[ -z "$DOMAIN" ]]; then
            echo -e "${YELLOW}No domain provided. Skipping Nginx, SSL, and Firewall configuration.${NC}"
        else
            # === START NGINX SETUP ===
            
            # 1. SSL Setup
            mkdir -p "$HOME/ssl"
            if [[ ! -f "$HOME/ssl/private.key" || ! -f "$HOME/ssl/fullchain.pem" ]]; then
                echo "Please upload 'private.key' and 'fullchain.pem' to ~/ssl"
                read -p "Press [Enter] once uploaded..."
            fi
            DEFAULT_CONFIG="proxy_pass http://localhost:3000; \
proxy_set_header Host \$host; \
proxy_set_header X-Real-IP \$remote_addr; \
proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for; \
proxy_set_header X-Forwarded-Proto \$scheme; \
proxy_set_header Upgrade \$http_upgrade; \
proxy_set_header Connection \"upgrade\";"

            sudo mkdir -p /etc/ssl/domain
            if [[ -f "$HOME/ssl/private.key" ]]; then
                sudo cp ~/ssl/private.key /etc/ssl/domain/
                sudo cp ~/ssl/fullchain.pem /etc/ssl/domain/fullchain.pem
                rm -rf ~/ssl
                sudo chmod 600 /etc/ssl/domain/private.key
            fi
            
            # 2. Nginx Install & Config
            echo -e "${YELLOW}Installing Nginx...${NC}"
            sudo apt install nginx -y
            sudo systemctl enable nginx
            sudo systemctl start nginx

            echo -e "${YELLOW}Configuring Nginx for $DOMAIN...${NC}"
            sudo bash -c "cat > /etc/nginx/sites-available/$DOMAIN" <<EOF
server {
    listen 443 ssl;
    server_name $DOMAIN;

    ssl_certificate /etc/ssl/domain/fullchain.pem;
    ssl_certificate_key /etc/ssl/domain/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    location = / {
        return 302 /updates/web-page;
    }
    location /updates {
        client_max_body_size 500M;
        $DEFAULT_CONFIG
    }
    location / {
        client_max_body_size 50M;
        $DEFAULT_CONFIG
    }
}
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$host\$request_uri;
}
EOF
            sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
            sudo nginx -t
            sudo systemctl reload nginx

            # 3. Firewall (Only configured if Nginx is set up)
            echo -e "${YELLOW}Configuring Firewall...${NC}"
            sudo ufw allow ssh
            sudo ufw allow 22/tcp
            sudo ufw allow 80/tcp
            sudo ufw allow 443/tcp
            echo "y" | sudo ufw enable
            
            # === END NGINX SETUP ===
        fi
    else
        echo -e "${YELLOW}Skipping Nginx/SSL configuration by user request.${NC}"
    fi
    
    # --- Start Server (Always runs for VM) ---
    START_SCRIPT="$HOME/Utilities/server/config-oracle/start.sh"
    if [ -f "$START_SCRIPT" ]; then
        if pm2 describe Utilities >/dev/null 2>&1; then
            echo -e "${YELLOW}PM2 process 'Utilities' already running.${NC}"
        else
            echo -e "${YELLOW}Starting PM2...${NC}"
            chmod +x "$START_SCRIPT"
            pm2 start "$START_SCRIPT" --name Utilities
            pm2 save
            pm2 startup
        fi
    else
        echo -e "${RED}Start script not found at $START_SCRIPT${NC}"
    fi
fi

# --- 8. Final Cleanup ---
rm -f "$STATE_FILE"

echo ""
echo "--------------------------------------------------"
echo -e "${GREEN}All Setup Tasks Complete.${NC}"
echo "--------------------------------------------------"