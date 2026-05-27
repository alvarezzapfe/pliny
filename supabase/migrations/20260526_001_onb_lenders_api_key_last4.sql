-- Add api_key_last4 column for masked key display
ALTER TABLE onb_lenders ADD COLUMN IF NOT EXISTS api_key_last4 text;
COMMENT ON COLUMN onb_lenders.api_key_last4 IS 'Last 4 chars of the raw API key, for masked display in UI. Set on create/regenerate.';
