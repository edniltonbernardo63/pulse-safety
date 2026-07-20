
-- 1) Tipos adicionais de treinamento
ALTER TYPE public.tipo_treinamento ADD VALUE IF NOT EXISTS 'integracao';
ALTER TYPE public.tipo_treinamento ADD VALUE IF NOT EXISTS 'workshop';
ALTER TYPE public.tipo_treinamento ADD VALUE IF NOT EXISTS 'dds';
ALTER TYPE public.tipo_treinamento ADD VALUE IF NOT EXISTS 'personalizado';

-- 2) Status ativo/inativo em treinamentos
ALTER TABLE public.treinamentos ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;

-- 3) Fornecedores: dados adicionais para certificado
ALTER TABLE public.fornecedores
  ADD COLUMN IF NOT EXISTS razao_social text,
  ADD COLUMN IF NOT EXISTS nome_fantasia text,
  ADD COLUMN IF NOT EXISTS endereco text,
  ADD COLUMN IF NOT EXISTS logo_url text;

-- 4) Configurações empresa: garante razão/fantasia
ALTER TABLE public.configuracoes_empresa
  ADD COLUMN IF NOT EXISTS razao_social text,
  ADD COLUMN IF NOT EXISTS nome_fantasia text;

-- 5) Colaboradores: coluna empresa (texto simples) opcional
ALTER TABLE public.colaboradores
  ADD COLUMN IF NOT EXISTS empresa text;

-- 6) Atualiza links oficiais das NRs para o padrão vigente do gov.br
UPDATE public.normas_nr SET link_oficial =
  'https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadora/normas-regulamentadoras-vigentes/norma-regulamentadora-no-'
  || (regexp_replace(codigo, '\D', '', 'g'))::int
  || '-nr-'
  || (regexp_replace(codigo, '\D', '', 'g'))::int
WHERE codigo ~ '^NR-';

-- NR-37 fica em outro caminho
UPDATE public.normas_nr
SET link_oficial = 'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/ctpp-nrs/norma-regulamentadora-no-37-nr-37'
WHERE codigo = 'NR-37';
