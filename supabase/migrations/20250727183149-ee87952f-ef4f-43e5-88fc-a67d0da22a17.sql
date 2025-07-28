-- Configure Supabase to use custom email templates via webhook
-- This will route all auth emails through our custom send-auth-email edge function

-- Enable webhook for auth emails
UPDATE auth.config 
SET 
  webhook_url = 'https://cldyihpqmlwequmnrdsu.supabase.co/functions/v1/send-auth-email',
  webhook_secret = 'sneaker-store-auth-webhook-7k9m2p8x4c6v1q3z5b7n'
WHERE parameter = 'webhook';