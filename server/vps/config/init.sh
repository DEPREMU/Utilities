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

# --- 3. Docker Installation ---
# --- 3. Docker e Instalación de Compose ---
if ! docker compose version &> /dev/null; then
    echo -e "${YELLOW}Instalando Docker y el plugin de Compose...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo apt-get install docker-compose-plugin -y
    sudo usermod -aG docker $USER
    rm get-docker.sh
else
    echo -e "${GREEN}Docker y Docker Compose ya están instalados.${NC}"
fi

sudo systemctl enable docker
sudo systemctl enable containerd

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
            
            # We proxy to the 'server' container in docker-compose network
            DEFAULT_CONFIG="proxy_pass http://nordvpn:3000; \
proxy_set_header Host \$host; \
proxy_set_header X-Real-IP \$remote_addr; \
proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for; \
proxy_set_header X-Forwarded-Proto \$scheme; \
proxy_set_header Upgrade \$http_upgrade; \
proxy_set_header Connection \"upgrade\";"

            DOCKER_DIR="$HOME/Utilities/server/vps/docker"
            mkdir -p "$DOCKER_DIR/nginx/ssl"
            
            if [[ -f "$HOME/ssl/private.key" ]]; then
                cp "$HOME/ssl/private.key" "$DOCKER_DIR/nginx/ssl/"
                cp "$HOME/ssl/fullchain.pem" "$DOCKER_DIR/nginx/ssl/fullchain.pem"
                rm -rf "$HOME/ssl"
            fi
            
            # 2. Nginx Config for Docker
            echo -e "${YELLOW}Configuring Nginx via Docker for $DOMAIN...${NC}"
            
            cat > "$DOCKER_DIR/nginx/nginx.conf" <<EOF
server {
    listen 443 ssl;
    server_name $DOMAIN;

    ssl_certificate /etc/ssl/domain/fullchain.pem;
    ssl_certificate_key /etc/ssl/domain/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    location = / {
        return 302 /updates;
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
    START_SCRIPT="$HOME/Utilities/server/vps/config/start.sh"
    if [ -f "$START_SCRIPT" ]; then
        echo -e "${YELLOW}Starting Server via Docker...${NC}"
        chmod +x "$START_SCRIPT"
        "$START_SCRIPT"
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