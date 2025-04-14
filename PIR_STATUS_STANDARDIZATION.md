# PIR Status Enum Standardization Plan

## Current Situation

We've discovered a schema drift between development and staging environments for the `pir_status` enum:

### Current Values in Staging
```
{draft, sent, in_progress, submitted, in_review, flagged, approved, rejected, resubmitted, canceled}
```

### Values Used in Development (from Constants in supabase.ts)
```
{draft, sent, in_progress, submitted, reviewed, rejected, resubmitted, canceled}
```

### Differences
- Staging has additional values: `in_review`, `flagged`, `approved`
- Development uses `reviewed` instead of potentially similar states like `in_review` or `approved`

This hybrid situation is causing confusion and errors when the application tries to use values that are valid in one environment but not recognized in another.

## Canonical Set of Values

Based on the application code and the development environment, we propose the following canonical set of values for the `pir_status` enum:

```
{draft, sent, in_progress, submitted, reviewed, rejected, resubmitted, canceled}
```

These values align with the application code and the development environment, and they cover all the necessary states for the PIR workflow.

## Standardization Plan

### 1. Update Database Schema

Create a migration to standardize the `pir_status` enum values:

```sql
-- Step 1: Map non-canonical values to canonical ones
UPDATE pir_requests SET status = 'reviewed' WHERE status = 'in_review';
UPDATE pir_requests SET status = 'reviewed' WHERE status = 'approved';
UPDATE pir_requests SET status = 'rejected' WHERE status = 'flagged';

-- Step 2: Create a new enum type with only the canonical values
CREATE TYPE pir_status_new AS ENUM (
  'draft', 'sent', 'in_progress', 'submitted', 'reviewed', 'rejected', 'resubmitted', 'canceled'
);

-- Step 3: Update the pir_requests table to use the new enum type
ALTER TABLE pir_requests 
  ALTER COLUMN status TYPE pir_status_new 
  USING status::text::pir_status_new;

-- Step 4: Drop the old enum type and rename the new one
DROP TYPE pir_status;
ALTER TYPE pir_status_new RENAME TO pir_status;
```

### 2. Update Application Code

Ensure that the application code only uses the canonical values:

1. Update the `Constants` object in `src/types/supabase.ts` to include only the canonical values
2. Add validation in the application code to ensure only canonical values are used
3. Update any UI components that display or allow selection of PIR status values

### 3. Implement Schema Validation

Add tests to verify that the enum values match the expected values:

1. Create a test that queries the database for the current enum values
2. Compare the result with the canonical set of values
3. Fail the test if there are any differences

### 4. Documentation

Document the canonical set of values and their meanings:

- `draft`: Initial state when a PIR is created but not yet sent to the supplier
- `sent`: PIR has been sent to the supplier but not yet acknowledged
- `in_progress`: Supplier has acknowledged the PIR and is working on it
- `submitted`: Supplier has submitted their response to the PIR
- `reviewed`: Customer has reviewed the PIR response
- `rejected`: Customer has rejected the PIR response
- `resubmitted`: Supplier has resubmitted the PIR response after rejection
- `canceled`: PIR has been canceled

### 5. Monitoring

Monitor the application logs for any errors related to the `pir_status` enum to ensure that the standardization has been successful.

## Implementation Timeline

1. **Immediate**: Document the current situation and the canonical set of values
2. **Short-term**: Create and apply the migration to standardize the enum values
3. **Short-term**: Update the application code to use only the canonical values
4. **Medium-term**: Implement schema validation tests
5. **Ongoing**: Monitor the application logs for any errors related to the `pir_status` enum

## Conclusion

Standardizing the `pir_status` enum values will help prevent confusion and errors in the application. By following this plan, we can ensure that all environments use the same set of values and that the application code is consistent with the database schema.