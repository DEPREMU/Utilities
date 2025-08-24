#!/bin/bash

sudo apt update
sudo apt upgrade -y
sudo apt install -y nodejs npm
sudo apt install git -y
sudo apt install ufw -y

mkdir Utilities
cd Utilities
git clone https://github.com/DEPREMU/Utilities .
git checkout mainVersion
git pull origin mainVersion

npm run install-all
sudo ufw allow 3000

chmod +x ./server/config-oracle/start.sh
pm2 start ./start.sh --name Utilities
pm2 save
pm2 startup