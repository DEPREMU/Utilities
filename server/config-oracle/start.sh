#!/bin/bash
nordvpn connect Mexico
cd /home/ubuntu/Utilities/server
npx nodemon --exec node index.ts
