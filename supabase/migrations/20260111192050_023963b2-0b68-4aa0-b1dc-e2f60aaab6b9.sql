-- Add new feature toggles for site-wide features
INSERT INTO public.admin_feature_settings (feature_key, enabled)
VALUES 
  ('global_search', true),
  ('pdf_export_manager', true),
  ('fraud_heatmap', true),
  ('team_notes', true),
  ('bug_reports', true),
  ('onboard_controls', true),
  ('station_controls', true)
ON CONFLICT (feature_key) DO NOTHING;