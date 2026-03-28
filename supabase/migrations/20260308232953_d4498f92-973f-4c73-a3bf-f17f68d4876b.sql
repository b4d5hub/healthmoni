
CREATE TABLE public.health_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  period text NOT NULL,
  report_content text NOT NULL,
  vitals_summary jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.health_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own reports"
  ON public.health_reports FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_health_reports_user_id ON public.health_reports(user_id);
CREATE INDEX idx_health_reports_created_at ON public.health_reports(created_at DESC);
