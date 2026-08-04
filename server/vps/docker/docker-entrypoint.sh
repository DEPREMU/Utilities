#!/bin/sh
set -e

echo "Running production database migrations..."
yarn run db-migrate:prod

echo "Generating prisma client..."
yarn run db-generate

echo "Starting server..."
exec node ./index.cjs