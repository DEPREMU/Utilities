#!/bin/bash
sudo apt-get update -y
sudo apt-get upgrade -y
cd $HOME/Utilities
nordvpn connect Mexico
max_retries=30
retry=0
until curl -sSf --connect-timeout 5 http://www.google.com/generate_204 >/dev/null 2>&1; do
    retry=$((retry+1))
    echo "Waiting for internet... (attempt $retry/$max_retries)"
    if [ "$retry" -ge "$max_retries" ]; then
        echo "No network after $max_retries attempts, aborting." >&2
        exit 1
    fi
    sleep 2
done
git pull
yarn install
NODE_ENV=production yarn run server