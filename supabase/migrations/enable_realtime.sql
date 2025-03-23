
-- Enable row-level changes for the serve_attempts table to improve real-time updates
ALTER TABLE serve_attempts REPLICA IDENTITY FULL;

-- Add the serve_attempts table to the realtime publication
BEGIN;
  -- Check if the supabase_realtime publication exists
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
      -- Create the publication if it doesn't exist
      CREATE PUBLICATION supabase_realtime;
    END IF;
  END
  $$;

  -- Add the table to the publication
  ALTER PUBLICATION supabase_realtime ADD TABLE serve_attempts;
COMMIT;
