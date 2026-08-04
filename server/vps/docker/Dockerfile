# ==========================
# Stage 1: Build workspace
# ==========================
FROM node:24 AS builder

WORKDIR /utilities

RUN corepack enable

# Workspace manifests
COPY package.json yarn.lock ./

# Workspace packages
COPY server/package.json ./server/package.json
COPY common/package.json ./common/package.json

# Install workspace dependencies
RUN yarn install --immutable

# Copy source
COPY . .

WORKDIR /utilities/server

# Build server
RUN NODE_ENV=production yarn tsx build.ts

# Generate production container package
RUN yarn tsx vps/docker/create-container.ts


# ==========================
# Stage 2: Production image
# ==========================
FROM node:24-slim

WORKDIR /server

# Install PostgreSQL 17 client
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ca-certificates \
    wget \
    gnupg && \
    install -d /usr/share/postgresql-common/pgdg && \
    wget -qO- https://www.postgresql.org/media/keys/ACCC4CF8.asc | \
    gpg --dearmor -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.gpg && \
    echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.gpg] https://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" \
    > /etc/apt/sources.list.d/pgdg.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends postgresql-client-17 && \
    apt-get purge -y wget gnupg && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

# Enable corepack
RUN corepack enable

# Copy generated production bundle
COPY --from=builder \
    /utilities/server/build \
    /utilities/server/prisma.config.ts \
    /utilities/server/vps/docker/docker-entrypoint.sh \
    ./

COPY --from=builder /utilities/server/prisma ./prisma
COPY --from=builder /utilities/server/routes/updates/web-page ./web-page

# Remove CRLF and make executable
RUN sed -i 's/\r$//' ./docker-entrypoint.sh && \
    chmod +x ./docker-entrypoint.sh

# Install only required production dependencies
RUN yarn install --production

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"] 

CMD ["node", "index.cjs"]