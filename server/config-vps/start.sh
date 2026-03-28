#!/bin/bash
MAX_START_SECONDS=300

# Reboot if startup does not reach server launch on time. //! DELETE
(
    sleep "$MAX_START_SECONDS"
    echo "Startup timeout reached before server launch. Rebooting..."
    sudo reboot
) &
WATCHDOG_PID=$!

cleanup_watchdog() {
    kill "$WATCHDOG_PID" >/dev/null 2>&1
}

trap cleanup_watchdog EXIT

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

cleanup_watchdog
trap - EXIT

NODE_ENV=production yarn run server