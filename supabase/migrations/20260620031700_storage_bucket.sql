-- Create the content-files bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('content-files', 'content-files', false) 
ON CONFLICT (id) DO NOTHING;

-- Set up Row Level Security (RLS) for the bucket
-- Note: 'storage.objects' is the table where files are recorded

-- 1. Allow authenticated users to read files
CREATE POLICY "Authenticated users can read files" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'content-files');

-- 2. Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload files" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'content-files');

-- 3. Allow creator/authenticated users to update files
CREATE POLICY "Authenticated users can update files" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'content-files');

-- 4. Allow creator/authenticated users to delete files
CREATE POLICY "Authenticated users can delete files" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'content-files');
