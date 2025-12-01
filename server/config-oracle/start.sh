#!/bin/bash
sudo apt update -y
sudo apt upgrade -y
cd $HOME/Utilities
git pull
nordvpn connect Mexico
cd server
npm run start