# Staging Deployment Guide

This guide explains how to migrate your Supabase project from development to staging and deploy your frontend application to Vercel with the staging environment variables.

## Prerequisites

- Supabase CLI installed
- Vercel CLI installed (will be installed by the deployment script if not already installed)
- Access to both development and staging Supabase projects
- Access to your Vercel account

## Migration Process

The migration process is fully automated with the `run_migration.sh` script:

```bash
# Make the script executable (if not already)
chmod +x run_migration.sh

# Run the migration process
./run_migration.sh
```

This will:
1. Export a clean schema from your development project
2. Clean up the schema file to ensure idempotency
3. Apply the cleaned schema to your staging project
4. Generate a data migration script (optional)

## Deploying Supabase Edge Functions

To deploy the Supabase Edge Functions to the staging environment:

```bash
# Make the script executable (if not already)
chmod +x deploy_edge_functions.sh

# Run the script
./deploy_edge_functions.sh
```

This will deploy the following Edge Functions to the staging environment:
- get_dependents
- invite-user
- send-email
- send-pir-notification
- test-email

These functions are essential for the application to work correctly, especially for features like user invitations and PIR notifications.

## Setting Edge Function Secrets

The Edge Functions require certain secrets to work correctly. To set these secrets:

```bash
# Make the script executable (if not already)
chmod +x set_edge_function_secrets.sh

# Run the script
./set_edge_function_secrets.sh
```

This will:
1. Prompt you for your SendGrid API Key
2. Set the SENDGRID_API_KEY secret for the Edge Functions
3. Redeploy the send-pir-notification function to ensure it picks up the new secret

**Note:** The send-pir-notification function requires a valid SendGrid API Key to send email notifications. Without this, PIR requests will fail to be created with status 'sent'.

## Fixing PIR Status Enum Values

We've discovered a schema drift between development and staging environments for the `pir_status` enum. To fix this issue:

1. Go to https://app.supabase.com/project/fubuiiecraslloezxshs/sql/new
2. Copy and paste the contents of `supabase/migrations/20250414162700_add_sent_value_to_enum.sql`
3. Run the SQL query

This will add the 'sent' value to the pir_status enum if it doesn't already exist. This simple approach ensures that the enum includes the necessary value without trying to modify the entire enum structure.

## Switching to Staging Environment Locally

To update your local configuration to use the staging environment:

```bash
# Make the script executable (if not already)
chmod +x switch_to_staging.sh

# Run the script
./switch_to_staging.sh
```

This will:
- Update your supabase/config.toml file with the staging project ID
- Copy .env.staging to .env
- Link the Supabase CLI to the staging project

## Deploying to Vercel

To deploy your frontend application to Vercel with the staging environment variables:

```bash
# Make the script executable (if not already)
chmod +x deploy_to_vercel.sh

# Run the script
./deploy_to_vercel.sh
```

This will:
- Load environment variables from .env.staging
- Deploy your application to Vercel with those environment variables

## Setting Up Test Data

Since we only migrated the schema and not the data, you'll need to set up some test data in the staging environment.

### Option 1: Create a Test User

1. Open the Supabase SQL Editor for your staging project:
   - Go to https://app.supabase.com/project/fubuiiecraslloezxshs/sql/new

2. Run the queries in `setup_test_user.sql` to create a test user and associate it with a company:
   - First, run the query to get the list of companies
   - Then, run the query to create a test user
   - Finally, run the query to associate the user with a company (replace USER_ID and COMPANY_ID with the actual values)

### Option 2: Disable RLS for Testing

If you just want to test the application without setting up users and permissions, you can temporarily disable Row Level Security (RLS):

1. Open the Supabase SQL Editor for your staging project:
   - Go to https://app.supabase.com/project/fubuiiecraslloezxshs/sql/new

2. Run the queries in `disable_rls_for_testing.sql` to disable RLS on the relevant tables:
   - This will allow you to create and update PIR requests without having to set up users and permissions
   - Remember to re-enable RLS when you're done testing (uncomment and run the queries at the bottom of the file)

**Note:** We have already disabled RLS on the following tables to help with testing:
- pir_requests
- pir_responses
- companies
- products

When you're done testing, you can re-enable RLS by running the queries in `reenable_rls.sql`.

## Verifying the Deployment

After deploying to Vercel and setting up test data, you can verify that your application is working correctly by:

1. Opening your application URL:
   - https://compliant-connect-staging.vercel.app
   - Note: You might also see a URL like https://compliant-connect-staging-54zp6yynj-scottrings-projects.vercel.app - this is the same application, just with a deployment-specific URL. The shorter URL is preferred.

2. Testing the functionality that was previously failing (e.g., submitting PIR requests)

## Troubleshooting

If you encounter any issues:

1. Check the Supabase logs in the dashboard
2. Verify that all tables and data were migrated correctly
3. Ensure your application is using the correct environment variables
4. Check for any region-specific issues (the staging project is in us-east-2, while development is in eu-central-1)

### Common Issues

1. **"Failed to submit PIR: Failed to create PIR request: invalid input value for enum pir_status: 'sent'"**
   - This error can occur for several reasons:
     1. The pir_status enum doesn't include 'sent' (which we've fixed)
     2. The RLS policies are preventing the user from creating or updating PIR requests (which we've addressed by disabling RLS)
     3. The Supabase Edge Functions haven't been deployed (which we've now done)
     4. The SENDGRID_API_KEY secret is not set for the Edge Functions (which can be fixed by running the set_edge_function_secrets.sh script)
     5. Schema drift between environments (which we've addressed with the PIR status standardization)

2. **"PIR created, but failed to send notification"**
   - This error occurs when the PIR request is created successfully, but the send-pir-notification function fails to send the email notification
   - This can be fixed by setting the SENDGRID_API_KEY secret using the set_edge_function_secrets.sh script

## Project Information

### Development Project
- **Project ID:** oecravfbvupqgzfyizsi
- **Name:** stacks-2025.03.25-DEV
- **Region:** eu-central-1
- **URL:** https://oecravfbvupqgzfyizsi.supabase.co

### Staging Project
- **Project ID:** fubuiiecraslloezxshs
- **Name:** stacks-staging
- **Region:** us-east-2
- **URL:** https://fubuiiecraslloezxshs.supabase.co