
-- 1. Novo campo email_corporativo em colaboradores
ALTER TABLE public.colaboradores 
  ADD COLUMN IF NOT EXISTS email_corporativo text;

-- 2. Tipo treinamento/palestra + validade
DO $$ BEGIN
  CREATE TYPE public.tipo_treinamento AS ENUM ('treinamento', 'palestra');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.treinamentos
  ADD COLUMN IF NOT EXISTS tipo public.tipo_treinamento NOT NULL DEFAULT 'treinamento',
  ADD COLUMN IF NOT EXISTS validade_meses integer;

-- 3. Link oficial nas normas
ALTER TABLE public.normas_nr
  ADD COLUMN IF NOT EXISTS link_oficial text;

-- Unique em codigo (necessário para ON CONFLICT)
DO $$ BEGIN
  ALTER TABLE public.normas_nr ADD CONSTRAINT normas_nr_codigo_key UNIQUE (codigo);
EXCEPTION WHEN duplicate_object THEN NULL;
WHEN duplicate_table THEN NULL; END $$;

-- 4. Vínculo opcional treinamento no evento
ALTER TABLE public.eventos_calendario
  ADD COLUMN IF NOT EXISTS treinamento_id uuid REFERENCES public.treinamentos(id) ON DELETE SET NULL;

-- 5. Trigger de vencimento automático
CREATE OR REPLACE FUNCTION public.set_treinamento_vencimento()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  meses integer;
BEGIN
  IF NEW.data_vencimento IS NULL AND NEW.data_realizacao IS NOT NULL AND NEW.treinamento_id IS NOT NULL THEN
    SELECT COALESCE(t.validade_meses, n.periodicidade_meses)
      INTO meses
    FROM public.treinamentos t
    LEFT JOIN public.normas_nr n ON n.id = t.nr_id
    WHERE t.id = NEW.treinamento_id;
    IF meses IS NOT NULL AND meses > 0 THEN
      NEW.data_vencimento := (NEW.data_realizacao + (meses || ' months')::interval)::date;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_venc ON public.treinamentos_realizados;
CREATE TRIGGER trg_set_venc
  BEFORE INSERT OR UPDATE ON public.treinamentos_realizados
  FOR EACH ROW EXECUTE FUNCTION public.set_treinamento_vencimento();

-- Backfill dos vencimentos nulos existentes
UPDATE public.treinamentos_realizados tr
SET data_vencimento = (tr.data_realizacao + (COALESCE(t.validade_meses, n.periodicidade_meses) || ' months')::interval)::date
FROM public.treinamentos t
LEFT JOIN public.normas_nr n ON n.id = t.nr_id
WHERE tr.treinamento_id = t.id
  AND tr.data_vencimento IS NULL
  AND tr.data_realizacao IS NOT NULL
  AND COALESCE(t.validade_meses, n.periodicidade_meses) IS NOT NULL;

-- 6. Tabela de configurações da empresa (singleton)
CREATE TABLE IF NOT EXISTS public.configuracoes_empresa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_empresa text NOT NULL DEFAULT 'TEC - SST',
  cnpj text,
  endereco text,
  telefone text,
  email text,
  logo_url text,
  arte_sipat_url text,
  tecnico_responsavel_nome text,
  tecnico_responsavel_registro text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuracoes_empresa TO authenticated;
GRANT ALL ON public.configuracoes_empresa TO service_role;

ALTER TABLE public.configuracoes_empresa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth read config" ON public.configuracoes_empresa;
CREATE POLICY "auth read config" ON public.configuracoes_empresa
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "admin manage config" ON public.configuracoes_empresa;
CREATE POLICY "admin manage config" ON public.configuracoes_empresa
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Registro singleton
INSERT INTO public.configuracoes_empresa (nome_empresa)
SELECT 'TEC - SST'
WHERE NOT EXISTS (SELECT 1 FROM public.configuracoes_empresa);

-- 7. Seed NR-1 a NR-38 com títulos e links oficiais
INSERT INTO public.normas_nr (codigo, titulo, resumo, periodicidade_meses, carga_horaria_minima, link_oficial) VALUES
('NR-1','Disposições Gerais e Gerenciamento de Riscos Ocupacionais','Diretrizes gerais e PGR.',NULL,NULL,'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/normas-regulamentadoras/nr-01-atualizada-2024.pdf'),
('NR-3','Embargo e Interdição','Procedimentos de embargo e interdição.',NULL,NULL,'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/normas-regulamentadoras/nr-03-atualizada-2022.pdf'),
('NR-4','SESMT','Serviços Especializados em Engenharia de Segurança e em Medicina do Trabalho.',NULL,NULL,'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/normas-regulamentadoras/nr-04-atualizada-2022.pdf'),
('NR-5','CIPA','Comissão Interna de Prevenção de Acidentes.',12,20,'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/normas-regulamentadoras/nr-05-atualizada-2022.pdf'),
('NR-6','Equipamento de Proteção Individual - EPI','Uso, guarda e conservação de EPIs.',NULL,NULL,'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/normas-regulamentadoras/nr-06-atualizada-2022.pdf'),
('NR-7','PCMSO','Programa de Controle Médico de Saúde Ocupacional.',12,NULL,'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/normas-regulamentadoras/nr-07-atualizada-2022.pdf'),
('NR-8','Edificações','Requisitos técnicos mínimos das edificações.',NULL,NULL,'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/normas-regulamentadoras/nr-08-atualizada-2022.pdf'),
('NR-9','Avaliação e Controle das Exposições Ocupacionais','Agentes físicos, químicos e biológicos.',12,NULL,'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/normas-regulamentadoras/nr-09-atualizada-2022.pdf'),
('NR-10','Segurança em Instalações e Serviços em Eletricidade','Trabalhos em instalações elétricas.',24,40,'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/normas-regulamentadoras/nr-10-atualizada-2019.pdf'),
('NR-11','Transporte, Movimentação, Armazenagem e Manuseio de Materiais',NULL,NULL,NULL,'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/normas-regulamentadoras/nr-11-atualizada-2019.pdf'),
('NR-12','Segurança no Trabalho em Máquinas e Equipamentos',NULL,24,NULL,'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/normas-regulamentadoras/nr-12-atualizada-2022.pdf'),
('NR-13','Caldeiras, Vasos de Pressão, Tubulações e Tanques Metálicos',NULL,NULL,NULL,'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/normas-regulamentadoras/nr-13-atualizada-2019.pdf'),
('NR-14','Fornos',NULL,NULL,NULL,'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/normas-regulamentadoras/nr-14.pdf'),
('NR-15','Atividades e Operações Insalubres',NULL,NULL,NULL,'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/normas-regulamentadoras/nr-15-atualizada-2019.pdf'),
('NR-16','Atividades e Operações Perigosas',NULL,NULL,NULL,'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/normas-regulamentadoras/nr-16-atualizada-2019.pdf'),
('NR-17','Ergonomia',NULL,NULL,NULL,'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/normas-regulamentadoras/nr-17-atualizada-2022.pdf'),
('NR-18','SST na Indústria da Construção',NULL,NULL,NULL,'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/normas-regulamentadoras/nr-18-atualizada-2022.pdf'),
('NR-19','Explosivos',NULL,NULL,NULL,'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/normas-regulamentadoras/nr-19.pdf'),
('NR-20','Segurança e Saúde no Trabalho com Inflamáveis e Combustíveis',NULL,36,NULL,'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/normas-regulamentadoras/nr-20-atualizada-2019.pdf'),
('NR-21','Trabalhos a Céu Aberto',NULL,NULL,NULL,'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/normas-regulamentadoras/nr-21.pdf'),
('NR-22','SST na Mineração',NULL,NULL,NULL,'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/normas-regulamentadoras/nr-22-atualizada-2019.pdf'),
('NR-23','Proteção Contra Incêndios',NULL,NULL,NULL,'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/normas-regulamentadoras/nr-23-atualizada-2011.pdf'),
('NR-24','Condições Sanitárias e de Conforto',NULL,NULL,NULL,'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/normas-regulamentadoras/nr-24-atualizada-2019.pdf'),
('NR-25','Resíduos Industriais',NULL,NULL,NULL,'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/normas-regulamentadoras/nr-25-atualizada-2019.pdf'),
('NR-26','Sinalização de Segurança',NULL,NULL,NULL,'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/normas-regulamentadoras/nr-26-atualizada-2015.pdf'),
('NR-28','Fiscalização e Penalidades',NULL,NULL,NULL,'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/normas-regulamentadoras/nr-28-atualizada-2019.pdf'),
('NR-29','SST Portuário',NULL,NULL,NULL,'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/normas-regulamentadoras/nr-29-atualizada-2019.pdf'),
('NR-30','SST Aquaviário',NULL,NULL,NULL,'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/normas-regulamentadoras/nr-30-atualizada-2019.pdf'),
('NR-31','SST Agricultura e Silvicultura',NULL,NULL,NULL,'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/normas-regulamentadoras/nr-31-atualizada-2020.pdf'),
('NR-32','SST em Serviços de Saúde',NULL,NULL,NULL,'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/normas-regulamentadoras/nr-32-atualizada-2019.pdf'),
('NR-33','Espaços Confinados',NULL,12,16,'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/normas-regulamentadoras/nr-33-atualizada-2020.pdf'),
('NR-34','Indústria da Construção e Reparação Naval',NULL,NULL,NULL,'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/normas-regulamentadoras/nr-34-atualizada-2019.pdf'),
('NR-35','Trabalho em Altura',NULL,24,8,'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/normas-regulamentadoras/nr-35-atualizada-2019.pdf'),
('NR-36','Abate e Processamento de Carnes',NULL,NULL,NULL,'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/normas-regulamentadoras/nr-36-atualizada-2019.pdf'),
('NR-37','Plataformas de Petróleo',NULL,NULL,NULL,'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/normas-regulamentadoras/nr-37-atualizada-2019.pdf'),
('NR-38','Limpeza Urbana e Resíduos Sólidos',NULL,NULL,NULL,'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/normas-regulamentadoras/nr-38.pdf')
ON CONFLICT (codigo) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  resumo = COALESCE(public.normas_nr.resumo, EXCLUDED.resumo),
  periodicidade_meses = COALESCE(public.normas_nr.periodicidade_meses, EXCLUDED.periodicidade_meses),
  carga_horaria_minima = COALESCE(public.normas_nr.carga_horaria_minima, EXCLUDED.carga_horaria_minima),
  link_oficial = EXCLUDED.link_oficial;
