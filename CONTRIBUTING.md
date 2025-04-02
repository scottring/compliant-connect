# Contributing Guide

## Importing Supabase

Always import the Supabase client from the centralized location:

```typescript
import { supabase } from "@/integrations/supabase/client";
```

❌ Don't import from:
```typescript
import { supabase } from "@/lib/supabase";  // Old path
```

This ensures we're using the correctly configured client with all necessary settings and types. 