-- تمكين امتدادات Cron و pg_net
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- إنشاء مهمة جدولة لتشغيل الموافقة التلقائية كل 5 دقائق
SELECT cron.schedule(
  'auto-approve-expired-shipments',
  '*/5 * * * *', -- كل 5 دقائق
  $$
  SELECT
    net.http_post(
        url:='https://hvwhhotclhakfyxbwxlk.supabase.co/functions/v1/auto-approve-shipments',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2d2hob3RjbGhha2Z5eGJ3eGxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3Nzk0ODQsImV4cCI6MjA2OTM1NTQ4NH0._iDFkyQ2oSjpY5t2nH0E8p5FAz61402hNRDZ9I7gVAs"}'::jsonb,
        body:=concat('{"timestamp": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);