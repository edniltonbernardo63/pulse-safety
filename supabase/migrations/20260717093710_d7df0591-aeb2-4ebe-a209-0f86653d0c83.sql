
-- 1. Treinamentos: data/hora, local, instrutor, concluido
ALTER TABLE public.treinamentos ADD COLUMN IF NOT EXISTS data_hora timestamptz;
ALTER TABLE public.treinamentos ADD COLUMN IF NOT EXISTS local text;
ALTER TABLE public.treinamentos ADD COLUMN IF NOT EXISTS instrutor text;
ALTER TABLE public.treinamentos ADD COLUMN IF NOT EXISTS concluido boolean NOT NULL DEFAULT false;
ALTER TABLE public.treinamentos ADD COLUMN IF NOT EXISTS data_conclusao date;

-- 2. NRs por colaborador
CREATE TABLE IF NOT EXISTS public.colaborador_nrs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  nr_id uuid NOT NULL REFERENCES public.normas_nr(id) ON DELETE CASCADE,
  data_realizacao date,
  data_vencimento date,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (colaborador_id, nr_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.colaborador_nrs TO authenticated;
GRANT SELECT ON public.colaborador_nrs TO anon;
GRANT ALL ON public.colaborador_nrs TO service_role;
ALTER TABLE public.colaborador_nrs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage colab_nrs" ON public.colaborador_nrs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon read colab_nrs" ON public.colaborador_nrs FOR SELECT TO anon USING (true);

-- Trigger para calcular vencimento automaticamente com base na periodicidade da NR
CREATE OR REPLACE FUNCTION public.set_colab_nr_vencimento()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  meses integer;
BEGIN
  IF NEW.data_vencimento IS NULL AND NEW.data_realizacao IS NOT NULL AND NEW.nr_id IS NOT NULL THEN
    SELECT periodicidade_meses INTO meses FROM public.normas_nr WHERE id = NEW.nr_id;
    IF meses IS NOT NULL AND meses > 0 THEN
      NEW.data_vencimento := (NEW.data_realizacao + (meses || ' months')::interval)::date;
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_colab_nr_venc ON public.colaborador_nrs;
CREATE TRIGGER trg_colab_nr_venc
BEFORE INSERT OR UPDATE ON public.colaborador_nrs
FOR EACH ROW EXECUTE FUNCTION public.set_colab_nr_vencimento();

-- 3. EPIs obrigatórios por setor
CREATE TABLE IF NOT EXISTS public.epis_setor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setor text NOT NULL,
  tipo_epi text NOT NULL,
  ca_padrao text,
  vida_util_meses integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(setor, tipo_epi)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.epis_setor TO authenticated;
GRANT ALL ON public.epis_setor TO service_role;
ALTER TABLE public.epis_setor ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage epis_setor" ON public.epis_setor FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Normalização das NRs (NR-1 -> NR-01, remoção de duplicidades)
UPDATE public.normas_nr d
SET link_oficial = COALESCE(d.link_oficial, s.link_oficial),
    titulo = CASE WHEN d.link_oficial IS NULL AND s.link_oficial IS NOT NULL THEN s.titulo ELSE d.titulo END,
    periodicidade_meses = COALESCE(d.periodicidade_meses, s.periodicidade_meses)
FROM public.normas_nr s
WHERE s.codigo ~ '^NR-[1-9]$'
  AND d.codigo = 'NR-0' || substring(s.codigo from 4);

DELETE FROM public.normas_nr
WHERE codigo ~ '^NR-[1-9]$'
  AND EXISTS (SELECT 1 FROM public.normas_nr d WHERE d.codigo = 'NR-0' || substring(normas_nr.codigo from 4));

UPDATE public.normas_nr SET codigo = 'NR-0' || substring(codigo from 4)
WHERE codigo ~ '^NR-[1-9]$';

-- Adicionar NR-02 (faltante) e link padrão
INSERT INTO public.normas_nr (codigo, titulo, link_oficial) VALUES
  ('NR-02','Inspeção Prévia','https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/normas-regulamentadoras')
ON CONFLICT (codigo) DO NOTHING;

-- Preenche links faltantes com portal geral do MTE
UPDATE public.normas_nr
SET link_oficial = 'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/normas-regulamentadoras'
WHERE link_oficial IS NULL;
