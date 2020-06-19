#!/bin/bash
#
# This script will be run once when first creating the postgres container
# for the development environment.
# See https://docs.docker.com/samples/library/postgres/#initialization-scripts
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- For UUID functions, we need the pgcrypto extension:
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    -- Create an additional user+DB for tests:
	CREATE USER ratio_test WITH PASSWORD 'devpassword';
	CREATE DATABASE ratio_test;
	GRANT ALL PRIVILEGES ON DATABASE ratio_test TO ratio_test;
EOSQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "ratio_test" <<-EOSQL
	-- We need the pgcrypto extension on the test database too:
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
EOSQL

