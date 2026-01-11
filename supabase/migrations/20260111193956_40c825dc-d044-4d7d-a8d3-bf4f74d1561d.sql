-- Enable realtime for controls tables (ignoring team_notes which is already enabled)
ALTER PUBLICATION supabase_realtime ADD TABLE public.onboard_controls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.station_controls;