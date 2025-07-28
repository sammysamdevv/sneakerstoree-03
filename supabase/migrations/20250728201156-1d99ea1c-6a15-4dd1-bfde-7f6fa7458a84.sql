-- Create a cron job to check for expired orders every minute
-- This will automatically mark orders as failed if M-Pesa payment isn't received within 1 minute

-- First enable the required extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the order timeout checker to run every minute
SELECT cron.schedule(
  'order-timeout-checker',
  '* * * * *', -- every minute
  $$
  SELECT
    net.http_post(
        url:='https://cldyihpqmlwequmnrdsu.supabase.co/functions/v1/order-timeout-checker',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsZHlpaHBxbWx3ZXF1bW5yZHN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1NTk1ODgsImV4cCI6MjA2OTEzNTU4OH0.Zy7tdCvG9ui751jCvxMIJXTHEI-3nhY6WDs-ynG0GE8"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);