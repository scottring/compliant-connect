# Flyway Usage Guide for Compliant Connect

This guide explains how to use Flyway for managing database migrations in the Compliant Connect project.

## Overview

Flyway is a database migration tool that helps us maintain consistent database schemas across different environments (development, staging, production). It tracks which migrations have been applied to each database, ensuring that all environments have the same schema structure.

## Getting Started

### Prerequisites

- Java 8 or higher
- Flyway CLI (installed via `setup_flyway.sh`)

### Setup

1. Run the setup script to install Flyway and create the initial configuration:

```bash
./setup_flyway.sh
```

This script will:
- Install Flyway CLI via Homebrew
- Create the migrations directory structure
- Create the flyway.conf file
- Create the initial migration files
- Create the run_flyway_migrations.sh script

2. Update the `flyway.conf` file with your database credentials:

```properties
# Flyway Configuration
flyway.url=jdbc:postgresql://db.fubuiiecraslloezxshs.supabase.co:5432/postgres
flyway.user=postgres
flyway.password=your_password  # Update this with your actual password
```

## Running Migrations

To run the migrations, execute:

```bash
./run_flyway_migrations.sh
```

This script will:
- Prompt for your database password
- Run the Flyway migrations
- Verify the migrations

## Creating New Migrations

### Naming Convention

Flyway uses a specific naming convention for migration files:

```
V{version}__{description}.sql
```

For example:
- `V1__baseline_schema.sql`
- `V1.1__fix_pir_status_enum.sql`
- `V2__add_new_table.sql`

### Creating a New Migration

1. Create a new SQL file in the `db/migrations/V{major_version}` directory:

```bash
touch db/migrations/V1/V1.2__add_new_column.sql
```

2. Add your SQL statements to the file:

```sql
-- V1.2__add_new_column.sql
ALTER TABLE users ADD COLUMN last_login TIMESTAMP;
```

3. Run the migrations:

```bash
./run_flyway_migrations.sh
```

## Best Practices

### Idempotent Migrations

Make your migrations idempotent whenever possible. This means that running the same migration multiple times should have the same effect as running it once.

Example:

```sql
-- Add a column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'last_login'
  ) THEN
    ALTER TABLE users ADD COLUMN last_login TIMESTAMP;
  END IF;
END $$;
```

### Versioning

Use a consistent versioning scheme:
- Major version (V1, V2, etc.) for major changes
- Minor version (V1.1, V1.2, etc.) for minor changes

### Testing

Always test your migrations in a development or staging environment before applying them to production.

## CI/CD Integration

We've set up a GitHub Actions workflow to automatically run Flyway migrations when changes are pushed to the main or staging branches. The workflow is defined in `.github/workflows/flyway-migrations.yml`.

The workflow will:
- Validate migrations on pull requests
- Run migrations on push to main or staging
- Use different database credentials based on the target environment

## Troubleshooting

### Migration Failed

If a migration fails, Flyway will stop and roll back the transaction. You can check the status of your migrations with:

```bash
flyway info -url=jdbc:postgresql://db.fubuiiecraslloezxshs.supabase.co:5432/postgres -user=postgres
```

### Repairing Failed Migrations

If a migration fails and you need to repair the Flyway schema history table:

```bash
flyway repair -url=jdbc:postgresql://db.fubuiiecraslloezxshs.supabase.co:5432/postgres -user=postgres
```

### Baseline an Existing Database

If you're starting to use Flyway with an existing database:

```bash
flyway baseline -url=jdbc:postgresql://db.fubuiiecraslloezxshs.supabase.co:5432/postgres -user=postgres
```

## Additional Resources

- [Flyway Documentation](https://flywaydb.org/documentation/)
- [Flyway Command Line](https://flywaydb.org/documentation/usage/commandline/)
- [Flyway SQL Migrations](https://flywaydb.org/documentation/concepts/migrations#sql-based-migrations)