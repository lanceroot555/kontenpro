
CREATE POLICY "authenticated read content-files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'content-files');
CREATE POLICY "user upload own folder content-files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'content-files' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "user update own files content-files" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'content-files' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'content-files' AND owner = auth.uid());
CREATE POLICY "user delete own files content-files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'content-files' AND owner = auth.uid());
