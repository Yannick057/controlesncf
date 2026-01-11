-- Add hidden_pages column to user_preferences table
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS hidden_pages text[] DEFAULT '{}'::text[];