-- Remove the previous invalid webhook configuration
-- Webhook configuration for auth emails must be done through Supabase dashboard
-- This migration just ensures our edge function is ready for webhook calls

-- The send-auth-email edge function is already configured
-- Users need to set up the webhook in Supabase Auth > Settings > Email templates