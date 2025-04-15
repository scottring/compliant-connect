#!/bin/bash
set -e

# Configuration
MIGRATIONS_DIR="supabase/migrations"
OUTPUT_FILE="baseline_schema.sql"

echo "Consolidating migration files from $MIGRATIONS_DIR to $OUTPUT_FILE..."

# Create an empty output file
> $OUTPUT_FILE

# Add standard PostgreSQL header
cat >> $OUTPUT_FILE << EOL
--
-- PostgreSQL database dump
--

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

EOL

# Concatenate all migration files in order
for file in $(ls -v $MIGRATIONS_DIR/*.sql); do
  echo "-- Including migration: $file" >> $OUTPUT_FILE
  cat $file >> $OUTPUT_FILE
  echo -e "\n\n" >> $OUTPUT_FILE
done

echo "Schema consolidated successfully to $OUTPUT_FILE"
echo "Now run clean_schema.sh to prepare the schema for migration"