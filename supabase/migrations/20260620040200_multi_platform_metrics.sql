ALTER TABLE contents ADD COLUMN brand_name text;
ALTER TABLE contents ADD COLUMN platform_metrics jsonb DEFAULT '{}'::jsonb;
