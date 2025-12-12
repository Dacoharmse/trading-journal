-- Add higher timeframe media URLs column to trades table
ALTER TABLE trades
ADD COLUMN IF NOT EXISTS htf_media_urls TEXT[] DEFAULT NULL;

COMMENT ON COLUMN trades.htf_media_urls IS 'Array of URLs for higher timeframe chart screenshots';
