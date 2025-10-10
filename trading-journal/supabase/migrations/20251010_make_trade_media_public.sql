-- Migration: Make trade-media bucket public for image URLs
-- Description: Updates the trade-media storage bucket to be publicly accessible

-- Update the trade-media bucket to be public
update storage.buckets
set public = true
where id = 'trade-media';
