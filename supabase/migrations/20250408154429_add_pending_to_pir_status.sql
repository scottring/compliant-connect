-- Add 'pending' status to the pir_status enum
ALTER TYPE public.pir_status ADD VALUE 'pending' BEFORE 'draft';