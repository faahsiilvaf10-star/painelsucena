
-- Tabela para armazenar motivos de ausência de funcionários
CREATE TABLE IF NOT EXISTS public.attendance_absence_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  reason TEXT NOT NULL,
  days_count INTEGER NOT NULL DEFAULT 1,
  cid TEXT,
  notes TEXT,
  environment TEXT NOT NULL DEFAULT public.current_environment(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE (employee_id, date, environment)
);

CREATE INDEX IF NOT EXISTS idx_absence_reasons_date ON public.attendance_absence_reasons(date);
CREATE INDEX IF NOT EXISTS idx_absence_reasons_employee ON public.attendance_absence_reasons(employee_id);
CREATE INDEX IF NOT EXISTS idx_absence_reasons_env ON public.attendance_absence_reasons(environment);

ALTER TABLE public.attendance_absence_reasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view absence reasons in their environment"
  ON public.attendance_absence_reasons FOR SELECT
  USING (public.has_environment_access(auth.uid(), environment));

CREATE POLICY "Authenticated users can create absence reasons"
  ON public.attendance_absence_reasons FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND public.has_environment_access(auth.uid(), environment));

CREATE POLICY "Authenticated users can update absence reasons"
  ON public.attendance_absence_reasons FOR UPDATE
  USING (auth.uid() IS NOT NULL AND public.has_environment_access(auth.uid(), environment));

CREATE POLICY "Authenticated users can delete absence reasons"
  ON public.attendance_absence_reasons FOR DELETE
  USING (auth.uid() IS NOT NULL AND public.has_environment_access(auth.uid(), environment));

CREATE TRIGGER set_absence_reasons_environment
  BEFORE INSERT ON public.attendance_absence_reasons
  FOR EACH ROW EXECUTE FUNCTION public.set_environment_on_insert();

CREATE TRIGGER update_absence_reasons_updated_at
  BEFORE UPDATE ON public.attendance_absence_reasons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_absence_reasons;
