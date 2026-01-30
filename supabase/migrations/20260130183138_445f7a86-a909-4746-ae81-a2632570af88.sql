-- Create the cron job to run every 3 days to keep Supabase project active
SELECT cron.schedule(
  'keep-alive-ping',
  '0 0 */3 * *',
  $$
  SELECT
    net.http_post(
        url:='https://hvwhhotclhakfyxbwxlk.supabase.co/functions/v1/keep-alive',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2d2hob3RjbGhha2Z5eGJ3eGxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3Nzk0ODQsImV4cCI6MjA2OTM1NTQ4NH0._iDFkyQ2oSjpY5t2nH0E8p5FAz61402hNRDZ9I7gVAs"}'::jsonb,
        body:='{"source": "cron", "timestamp": "' || now()::text || '"}'::jsonb
    ) as request_id;
  $$
);

-- Also schedule auto-approve shipments to run every hour
SELECT cron.schedule(
  'auto-approve-shipments',
  '0 * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://hvwhhotclhakfyxbwxlk.supabase.co/functions/v1/auto-approve-shipments',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2d2hob3RjbGhha2Z5eGJ3eGxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3Nzk0ODQsImV4cCI6MjA2OTM1NTQ4NH0._iDFkyQ2oSjpY5t2nH0E8p5FAz61402hNRDZ9I7gVAs"}'::jsonb,
        body:='{"source": "cron"}'::jsonb
    ) as request_id;
  $$
);