#!/bin/sh
set -e

echo "Running production database migrations..."
yarn run db-migrate:prod

echo "Starting server..."
exec node ./index.cjs