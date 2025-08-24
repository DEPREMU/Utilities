#!/bin/bash

sudo apt update
sudo apt upgrade -y
sudo apt install nodejs npm -y
sudo apt install git -y
sudo apt install ufw -y
sudo apt install wget curl -y
sudo npm install -g pm2
npm install -g pm2

mkdir Utilities
cd Utilities
git clone https://github.com/DEPREMU/Utilities .
git checkout mainVersion
git pull origin mainVersion

npm run install-all
sudo ufw allow 3000

# The API of Binance requires a connection from Mexico
# Install NordVPN and login
wget --no-check-certificate https://repo.nordvpn.com/deb/nordvpn/debian/pool/main/nordvpn-release_1.0.0_all.deb
sh <(curl -sSf https://downloads.nordcdn.com/apps/linux/install.sh)
sudo groupadd nordvpn
sudo usermod -aG nordvpn $USER
nordvpn login --token YOUR_NORDVPN_TOKEN
nordvpn allowlist add port 22
nordvpn allowlist add port 3000
nordvpn set tpl on
nordvpn set autoconnect enabled Mexico
nordvpn set technology nordlynx

# Start the server
chmod +x /home/ubuntu/Utilities/server/config-oracle/start.sh
pm2 start /home/ubuntu/Utilities/server/config-oracle/start.sh --name Utilities
pm2 save
pm2 startup
# Then copy and paste the output command to enable pm2 on startup