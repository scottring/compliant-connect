-- Migration: Add 'sent' value to pir_status enum
-- Description: This migration adds the 'sent' value to the pir_status enum.

-- Add 'sent' value to the enum
ALTER TYPE pir_status ADD VALUE IF NOT EXISTS 'sent';