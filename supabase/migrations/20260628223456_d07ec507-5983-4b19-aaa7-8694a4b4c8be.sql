CREATE TABLE public.print_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_ids UUID[] NOT NULL DEFAULT '{}',
  order_count INTEGER NOT NULL DEFAULT 0,
  label_count INTEGER NOT NULL DEFAULT 0,
  preset TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  filename TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.print_logs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.print_logs TO authenticated;
GRANT ALL ON public.print_logs TO service_role;

ALTER TABLE public.print_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Open read print_logs" ON public.print_logs FOR SELECT USING (true);
CREATE POLICY "Open insert print_logs" ON public.print_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Open delete print_logs" ON public.print_logs FOR DELETE USING (true);

CREATE INDEX print_logs_created_at_idx ON public.print_logs (created_at DESC);