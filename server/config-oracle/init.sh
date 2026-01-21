#!/bin/bash

# --- 1. Configuration Prompts ---

echo "--------------------------------------------------"
echo "Please enter your NordVPN Token."
echo "(Leave empty and press Enter to SKIP NordVPN installation)"
read -p "Token: " NORD_TOKEN
echo "--------------------------------------------------"

echo ""
echo "--------------------------------------------------"
read -p "Are you configuring a Virtual Machine (VM)? (y/n): " IS_VM
echo "--------------------------------------------------"

# --- 2. Basic Setup & Dependencies ---

sudo apt update
sudo apt upgrade -y
sudo apt install git -y
sudo apt install ufw -y
sudo apt install wget curl -y

# Install NVM and Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

nvm install 24
nvm use 24

# Enable Corepack for Yarn
corepack enable yarn
yarn -v

# --- 3. PM2 Installation (VM Only) ---
if [[ "$IS_VM" =~ ^[Yy]$ ]]; then
    echo "VM detected. Installing PM2..."
    sudo npm install -g pm2
    npm install -g pm2
else
    echo "Not a VM. Skipping PM2 installation."
fi

# --- 4. Repository Setup ---
cd $HOME
mkdir -p Utilities
cd Utilities
git clone https://github.com/DEPREMU/Utilities .
git checkout mainVersion
git pull origin mainVersion

yarn install
sudo ufw allow 3000

# --- 5. NordVPN Configuration (Conditional) ---

if [[ -z "$NORD_TOKEN" ]]; then
    echo ""
    echo "--------------------------------------------------"
    echo "NordVPN Token is empty. Skipping NordVPN installation and configuration."
    echo "--------------------------------------------------"
else
    echo ""
    echo "NordVPN Token provided. Installing NordVPN..."
    
    # The API of Binance requires a connection from Mexico
    wget --no-check-certificate https://repo.nordvpn.com/deb/nordvpn/debian/pool/main/nordvpn-release_1.0.0_all.deb
    sh <(curl -sSf https://downloads.nordcdn.com/apps/linux/install.sh)
    sudo groupadd nordvpn
    sudo usermod -aG nordvpn $USER

    # Login using the token provided
    nordvpn login --token "$NORD_TOKEN"

    nordvpn allowlist add port 22
    nordvpn allowlist add port 3000
    nordvpn set tpl on
    nordvpn set autoconnect enabled Mexico
    nordvpn set technology nordlynx
fi

# --- 6. Database Initialization ---
chmod +x $HOME/Utilities/server/config-oracle/init-db.sh
$HOME/Utilities/server/config-oracle/init-db.sh

sudo apt update -y
sudo apt upgrade -y

# --- 7. VM Specific Logic (SSL, Nginx, Start Server) ---

if [[ "$IS_VM" =~ ^[Yy]$ ]]; then
    # ==========================
    # VM CONFIGURATION BLOCK
    # ==========================
    
    # --- SSL Setup ---
    mkdir -p "$HOME/ssl"
    
    echo "Directory ~/ssl created."
    echo "Please upload the following files to this directory:"
    echo "1. private.key"
    echo "2. certificate.cer"
    echo "3. ca_bundle.crt"
    echo ""
    echo "You can use the following command from your local machine as a guide:"
    echo "scp -i PATH/TO/ssh.key PATH/TO/private.key PATH/TO/certificate.cer PATH/TO/ca_bundle.crt $USER@$(curl -s ifconfig.me):/home/$USER/ssl"
    
    read -p "Press [Enter] once you have uploaded the files to ~/ssl..."

    sudo mkdir -p /etc/ssl/domain
    sudo cp ~/ssl/private.key /etc/ssl/domain/
    sudo cp ~/ssl/certificate.cer /etc/ssl/domain/certificate.crt
    sudo cp ~/ssl/ca_bundle.crt /etc/ssl/domain/
    rm ~/ssl -rf
    sudo chmod 600 /etc/ssl/domain/private.key
    
    # --- Nginx Setup ---
    sudo apt update
    sudo apt install nginx -y
    sudo systemctl enable nginx
    sudo systemctl start nginx

    echo ""
    read -p "Enter the Domain Name to configure (e.g., example.com): " DOMAIN

    sudo bash -c "cat > /etc/nginx/sites-available/$DOMAIN" <<EOF
server {
    listen 443 ssl;
    server_name $DOMAIN;

    ssl_certificate /etc/ssl/domain/certificate.crt;
    ssl_certificate_key /etc/ssl/domain/private.key;
    ssl_trusted_certificate /etc/ssl/domain/ca_bundle.crt;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-For \$remote_addr;
        proxy_set_header X-Forwarded-Proto https;
    }
}

server {
    listen 80;
    server_name $DOMAIN;

    return 301 https://\$host\$request_uri;
}
EOF

    sudo ln -s /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl reload nginx

    sudo ufw enable
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    
    echo ""
    echo "IMPORTANT: Please ensure ports 80 and 443 are open to source 0.0.0.0/0 in your Cloud Provider's Firewall settings."

    # --- Start Server with PM2 (Only for VM) ---
    echo ""
    echo "Starting application with PM2..."
    chmod +x $HOME/Utilities/server/config-oracle/start.sh
    pm2 start $HOME/Utilities/server/config-oracle/start.sh --name Utilities
    pm2 save
    pm2 startup
    
    echo "--------------------------------------------------"
    echo "Setup Complete."
    echo "Please copy and paste the output command above (from 'pm2 startup') to enable PM2 on boot."
    echo "--------------------------------------------------"

else
    # ==========================
    # NON-VM BLOCK
    # ==========================
    echo ""
    echo "--------------------------------------------------"
    echo "Non-VM environment detected."
    echo "PM2 was NOT installed and the server was NOT started automatically."
    echo ""
    echo "Required manual steps for VM deployment:"
    echo "1. Upload SSL certificates to the VM."
    echo "2. Configure Nginx reverse proxy."
    echo "3. Open firewall ports 80 and 443."
    echo "--------------------------------------------------"
fi