-- Function to add duration and expires_at columns to memories table
CREATE OR REPLACE FUNCTION add_memory_duration_columns(table_name text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  duration_exists boolean;
  expires_at_exists boolean;
BEGIN
  -- Check if duration column exists
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = add_memory_duration_columns.table_name
    AND column_name = 'duration'
  ) INTO duration_exists;
  
  -- Check if expires_at column exists
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = add_memory_duration_columns.table_name
    AND column_name = 'expires_at'
  ) INTO expires_at_exists;
  
  -- Add duration column if it doesn't exist
  IF NOT duration_exists THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN duration TEXT NOT NULL DEFAULT ''long_term''', table_name);
    EXECUTE format('CREATE INDEX idx_%I_duration ON %I(duration)', table_name, table_name);
  END IF;
  
  -- Add expires_at column if it doesn't exist
  IF NOT expires_at_exists THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN expires_at TIMESTAMPTZ', table_name);
    EXECUTE format('CREATE INDEX idx_%I_expires_at ON %I(expires_at)', table_name, table_name);
  END IF;
  
  RETURN;
END;
$$;