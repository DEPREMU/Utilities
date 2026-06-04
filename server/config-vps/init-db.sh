#!/bin/bash

# ==============================
# CONFIGURATION VARIABLES
# ==============================
UTILITIES_DIR="$HOME/Utilities"
if [ ! -d "$UTILITIES_DIR" ]; then
  echo "The directory $UTILITIES_DIR does not exist. Please clone the repository first."
  exit 1
fi

source "$UTILITIES_DIR/.env"

# Remove carriage return characters from environment variables
DB_USER=$(echo "$DB_USER" | tr -d '\r')
DB_PASS=$(echo "$DB_PASS" | tr -d '\r')
DB_NAME=$(echo "$DB_NAME" | tr -d '\r')

if [ -z "$DB_USER" ] || [ -z "$DB_PASS" ] || [ -z "$DB_NAME" ]; then
  echo "Please set DB_USER, DB_PASS, and DB_NAME environment variables in the .env file."
  exit 1
fi

SQL_FILE="$UTILITIES_DIR/server/database/create_tables.sql"

# ==============================
# INSTALLING POSTGRESQL
# ==============================
echo "Updating repositories and installing PostgreSQL..."
sudo apt update -y
sudo apt install -y postgresql postgresql-contrib

# ==============================
# START POSTGRESQL SERVICE
# ==============================
echo "Starting PostgreSQL service..."
sudo systemctl enable postgresql
sudo systemctl start postgresql

# ==============================
# CREATE USER, DATABASE AND TABLES
# ==============================
echo "Creating user, database and table..."

sudo -u postgres env DB_USER="$DB_USER" DB_PASS="$DB_PASS" DB_NAME="$DB_NAME" psql <<EOF
DO
\$do\$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${DB_USER}') THEN
      CREATE ROLE "${DB_USER}" LOGIN PASSWORD '${DB_PASS}';
   END IF;
END
\$do\$;

CREATE DATABASE "${DB_NAME}" OWNER "${DB_USER}";
GRANT ALL PRIVILEGES ON DATABASE "${DB_NAME}" TO "${DB_USER}";
EOF



# ==============================
# EXECUTE EXTERNAL SQL FILE
# ==============================
if [ -f "$SQL_FILE" ]; then
  echo "Executing external SQL script with temporary copy..."

  TMP_SQL="/tmp/create_tables.sql"
  sudo cp "$SQL_FILE" "$TMP_SQL"
  sudo chown postgres:postgres "$TMP_SQL"
  sudo chmod 644 "$TMP_SQL"

  sudo -i -u postgres psql -d ${DB_NAME} -f "$TMP_SQL"

  sudo rm "$TMP_SQL"
else
  echo "File $SQL_FILE not found, skipping this step."
fi

sudo -u postgres psql -d ${DB_NAME} -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO \"${DB_USER}\"; GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO \"${DB_USER}\"; GRANT ALL PRIVILEGES ON SCHEMA public TO \"${DB_USER}\";"

echo "Configuration complete."
echo "-------------------------------------------"
echo "DB Name: ${DB_NAME}"
echo "DB User: ${DB_USER}"
echo "DB Password: ${DB_PASS}"
echo "-------------------------------------------"
