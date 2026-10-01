#!/bin/bash

# ==========================================
# Robust Server Setup Script (v4)
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

# --- Helper: Validate and Install .env ---
validate_env_file() {
    local SOURCE_ENV="$HOME/.env"
    local DOCKER_DIR="$HOME/Utilities/server/vps/docker"
    local TARGET_ENV="$DOCKER_DIR/.env"
    local EXAMPLE_ENV="$DOCKER_DIR/.env.example"

    echo ""
    echo -e "${YELLOW}=== ENVIRONMENT FILE CONFIGURATION ===${NC}"

    # Check that ~/.env exists
    if [ ! -f "$SOURCE_ENV" ]; then
        echo -e "${RED}ERROR: Required file not found:${NC}"
        echo "  $SOURCE_ENV"
        echo ""
        echo "Please upload your .env file to:"
        echo "  $SOURCE_ENV"
        echo ""
        exit 1
    fi

    # Check that .env.example exists
    if [ ! -f "$EXAMPLE_ENV" ]; then
        echo -e "${RED}ERROR: .env.example not found:${NC}"
        echo "  $EXAMPLE_ENV"
        echo ""
        exit 1
    fi

    # Create docker directory if necessary
    mkdir -p "$DOCKER_DIR"

    # If target .env doesn't exist, copy ~/.env directly
    if [ ! -f "$TARGET_ENV" ]; then
        echo -e "${YELLOW}Copying .env to Docker directory...${NC}"
        cp "$SOURCE_ENV" "$TARGET_ENV"

        if [ $? -ne 0 ]; then
            echo -e "${RED}ERROR: Failed to copy .env${NC}"
            exit 1
        fi

        echo -e "${GREEN}.env copied successfully.${NC}"
        return 0
    fi

    # --------------------------------------------------
    # Target .env already exists.
    # Validate all keys against .env.example
    # --------------------------------------------------

    echo -e "${YELLOW}Existing Docker .env found. Validating required keys...${NC}"

    MISSING_KEYS=()

    while IFS= read -r line || [ -n "$line" ]; do

        # Remove leading/trailing whitespace
        line="$(echo "$line" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"

        # Skip empty lines
        [ -z "$line" ] && continue

        # Skip comments
        [[ "$line" =~ ^# ]] && continue

        # Only process lines containing =
        [[ "$line" != *=* ]] && continue

        # Extract key
        KEY="${line%%=*}"

        # Remove whitespace around key
        KEY="$(echo "$KEY" | sed 's/[[:space:]]*$//')"

        # Validate that the key exists in the target .env
        if ! grep -Eq "^[[:space:]]*${KEY}[[:space:]]*=" "$TARGET_ENV"; then
            MISSING_KEYS+=("$KEY")
        fi

    done < "$EXAMPLE_ENV"

    # --------------------------------------------------
    # Show missing keys and exit
    # --------------------------------------------------

    if [ ${#MISSING_KEYS[@]} -gt 0 ]; then
        echo ""
        echo -e "${RED}ERROR: Missing required environment variables.${NC}"
        echo ""
        echo "The following keys are required by:"
        echo "  $EXAMPLE_ENV"
        echo ""
        echo "but are missing from:"
        echo "  $TARGET_ENV"
        echo ""

        for KEY in "${MISSING_KEYS[@]}"; do
            echo -e "${RED}  - $KEY${NC}"
        done

        echo ""
        echo "Please add the missing keys to:"
        echo "  $TARGET_ENV"
        echo ""
        echo -e "${RED}Setup aborted.${NC}"

        exit 1
    fi

    echo -e "${GREEN}All required .env keys are present.${NC}"
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

sudo modprobe ip_tables
sudo modprobe iptable_filter
sudo modprobe iptable_nat

# --- 3. Docker Installation ---
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

    cd "$REPO_DIR" || exit 1

    git checkout production
    git pull origin production
else
    echo -e "${YELLOW}Cloning repository...${NC}"

    git clone https://github.com/DEPREMU/Utilities "$REPO_DIR"

    cd "$REPO_DIR" || exit 1

    git checkout production
fi

# --- 5. .env Validation ---
# This runs after the repository has been cloned/updated,
# because .env.example must exist inside the repository.

validate_env_file

ensure_apt_update

# --- 6. VM Specific Logic (SSL, Nginx, Firewall) ---

if [[ "$IS_VM" =~ ^[Yy]$ ]]; then
    echo -e "\n${YELLOW}=== VM CONFIGURATION ===${NC}"

    # --- Ask to configure Nginx ---
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

            # 3. Firewall
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

# --- 7. Final Cleanup ---
rm -f "$STATE_FILE"

echo ""
echo "--------------------------------------------------"
echo -e "${GREEN}All Setup Tasks Complete.${NC}"
echo "--------------------------------------------------"
