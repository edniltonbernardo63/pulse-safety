
-- Unidade de tempo
DO $$ BEGIN
  CREATE TYPE unidade_tempo AS ENUM ('dias','meses','anos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.treinamentos
  ADD COLUMN IF NOT EXISTS validade_valor integer,
  ADD COLUMN IF NOT EXISTS validade_unidade unidade_tempo;

ALTER TABLE public.epis
  ADD COLUMN IF NOT EXISTS vida_util_valor integer,
  ADD COLUMN IF NOT EXISTS vida_util_unidade unidade_tempo;

-- Backfill: se já havia validade_meses/vida_util_meses, popular novos campos como 'meses'
UPDATE public.treinamentos SET validade_valor = validade_meses, validade_unidade = 'meses'
  WHERE validade_meses IS NOT NULL AND validade_valor IS NULL;

UPDATE public.epis SET vida_util_valor = vida_util_meses, vida_util_unidade = 'meses'
  WHERE vida_util_meses IS NOT NULL AND vida_util_valor IS NULL;

-- Trigger de vencimento para treinamentos realizados: usa unidade escolhida
CREATE OR REPLACE FUNCTION public.set_treinamento_vencimento()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $fn$
DECLARE
  v_valor integer;
  v_unid  unidade_tempo;
  v_meses integer;
BEGIN
  IF NEW.data_vencimento IS NULL AND NEW.data_realizacao IS NOT NULL AND NEW.treinamento_id IS NOT NULL THEN
    SELECT t.validade_valor, t.validade_unidade, COALESCE(t.validade_meses, n.periodicidade_meses)
      INTO v_valor, v_unid, v_meses
    FROM public.treinamentos t
    LEFT JOIN public.normas_nr n ON n.id = t.nr_id
    WHERE t.id = NEW.treinamento_id;

    IF v_valor IS NOT NULL AND v_unid IS NOT NULL THEN
      IF v_unid = 'dias' THEN
        NEW.data_vencimento := (NEW.data_realizacao + (v_valor || ' days')::interval)::date;
      ELSIF v_unid = 'anos' THEN
        NEW.data_vencimento := (NEW.data_realizacao + (v_valor || ' years')::interval)::date;
      ELSE
        NEW.data_vencimento := (NEW.data_realizacao + (v_valor || ' months')::interval)::date;
      END IF;
    ELSIF v_meses IS NOT NULL AND v_meses > 0 THEN
      NEW.data_vencimento := (NEW.data_realizacao + (v_meses || ' months')::interval)::date;
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$;

-- Atualiza links das NRs para páginas canônicas
UPDATE public.normas_nr
SET link_oficial = 'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/normas-regulamentadoras/normas-regulamentadoras-vigentes/norma-regulamentadora-no-'
  || regexp_replace(codigo, '^NR-?0*', '', 'i')
  || '-nr-'
  || regexp_replace(codigo, '^NR-?0*', '', 'i');
