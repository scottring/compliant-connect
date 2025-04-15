# Compliant Connect

## Directory Structure

```
.
├── db/
│   ├── migrations/    # Database migration files
│   ├── backups/      # Database backups
│   └── scripts/      # Database-related scripts
├── docs/
│   ├── migrations/   # Migration documentation
│   ├── features/     # Feature documentation
│   └── deployments/  # Deployment documentation
├── scripts/
│   ├── deployment/   # Deployment scripts
│   ├── development/  # Development workflow scripts
│   ├── database/     # Database management scripts
│   └── troubleshooting/ # Troubleshooting scripts
├── src/             # Application source code
├── public/          # Public assets
├── .github/         # GitHub configuration
└── manage.sh        # Main management script
```

## Quick Start

1. Run the management tool:
   ```bash
   ./manage.sh
   ```

2. Choose from the following options:
   - Development Workflow
   - Deployment
   - Database Management
   - Troubleshooting

## Documentation

- Feature documentation: `docs/features/`
- Migration documentation: `docs/migrations/`
- Deployment documentation: `docs/deployments/`

## Scripts

All scripts are organized by category:
- Deployment scripts: `scripts/deployment/`
- Development scripts: `scripts/development/`
- Database scripts: `scripts/database/`
- Troubleshooting scripts: `scripts/troubleshooting/`

## Database

- Migrations: `db/migrations/`
- Backups: `db/backups/`
- Database scripts: `db/scripts/`

