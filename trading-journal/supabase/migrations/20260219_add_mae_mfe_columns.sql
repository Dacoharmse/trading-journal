-- No schema changes needed (MAE/MFE columns removed per product decision)
-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
