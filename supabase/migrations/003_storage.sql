-- Storage bucket setup
-- Run in Supabase SQL editor OR via the Storage UI

-- Private bucket for uploaded document files (service role only)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Public bucket for extracted slide images
INSERT INTO storage.buckets (id, name, public)
VALUES ('slide-images', 'slide-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow service role full access to documents bucket (already granted by default)
-- Allow public read on slide-images bucket
CREATE POLICY "Public slide images"
ON storage.objects FOR SELECT
USING (bucket_id = 'slide-images');
