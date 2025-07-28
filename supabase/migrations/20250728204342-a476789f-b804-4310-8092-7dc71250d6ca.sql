-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a cron job to check for expired orders every minute
SELECT cron.schedule(
  'check-order-timeout',
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