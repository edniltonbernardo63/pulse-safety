
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'tecnico', 'consulta');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles select auth" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles update own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles insert own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "roles select self or admin" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "roles admin manage" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Auto profile + first user becomes admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_count INT;
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1)), NEW.email);

  SELECT COUNT(*) INTO user_count FROM auth.users;
  IF user_count = 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'tecnico');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Fornecedores
CREATE TABLE public.fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT,
  contato TEXT,
  email TEXT,
  telefone TEXT,
  tipos_treinamento TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fornecedores TO authenticated;
GRANT ALL ON public.fornecedores TO service_role;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fornecedores auth all" ON public.fornecedores FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- NRs
CREATE TABLE public.normas_nr (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  titulo TEXT NOT NULL,
  resumo TEXT,
  periodicidade_meses INT,
  carga_horaria_minima INT,
  base_legal TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.normas_nr TO authenticated;
GRANT SELECT ON public.normas_nr TO anon;
GRANT ALL ON public.normas_nr TO service_role;
ALTER TABLE public.normas_nr ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nr read all" ON public.normas_nr FOR SELECT USING (true);
CREATE POLICY "nr auth write" ON public.normas_nr FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "nr auth update" ON public.normas_nr FOR UPDATE TO authenticated USING (true);
CREATE POLICY "nr auth delete" ON public.normas_nr FOR DELETE TO authenticated USING (true);

-- Colaboradores
CREATE TABLE public.colaboradores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cpf TEXT,
  rg TEXT,
  data_nascimento DATE,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  foto_url TEXT,
  funcao_atual TEXT,
  setor TEXT,
  data_admissao DATE,
  status TEXT NOT NULL DEFAULT 'ativo',
  qrcode_token TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text,'-',''),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.colaboradores TO authenticated;
GRANT SELECT ON public.colaboradores TO anon;
GRANT ALL ON public.colaboradores TO service_role;
ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "colab public read" ON public.colaboradores FOR SELECT USING (true);
CREATE POLICY "colab auth insert" ON public.colaboradores FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "colab auth update" ON public.colaboradores FOR UPDATE TO authenticated USING (true);
CREATE POLICY "colab auth delete" ON public.colaboradores FOR DELETE TO authenticated USING (true);

-- Histórico de funções
CREATE TABLE public.historico_funcoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  funcao TEXT NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.historico_funcoes TO authenticated;
GRANT SELECT ON public.historico_funcoes TO anon;
GRANT ALL ON public.historico_funcoes TO service_role;
ALTER TABLE public.historico_funcoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hist public read" ON public.historico_funcoes FOR SELECT USING (true);
CREATE POLICY "hist auth write" ON public.historico_funcoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Treinamentos (catálogo)
CREATE TABLE public.treinamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  nr_id UUID REFERENCES public.normas_nr(id) ON DELETE SET NULL,
  fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  carga_horaria INT,
  conteudo_programatico TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.treinamentos TO authenticated;
GRANT SELECT ON public.treinamentos TO anon;
GRANT ALL ON public.treinamentos TO service_role;
ALTER TABLE public.treinamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trein public read" ON public.treinamentos FOR SELECT USING (true);
CREATE POLICY "trein auth write" ON public.treinamentos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Treinamentos realizados
CREATE TABLE public.treinamentos_realizados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  treinamento_id UUID NOT NULL REFERENCES public.treinamentos(id) ON DELETE RESTRICT,
  data_realizacao DATE NOT NULL,
  data_vencimento DATE,
  instrutor TEXT,
  local TEXT,
  observacoes TEXT,
  certificado_numero TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.treinamentos_realizados TO authenticated;
GRANT SELECT ON public.treinamentos_realizados TO anon;
GRANT ALL ON public.treinamentos_realizados TO service_role;
ALTER TABLE public.treinamentos_realizados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tr public read" ON public.treinamentos_realizados FOR SELECT USING (true);
CREATE POLICY "tr auth write" ON public.treinamentos_realizados FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- EPIs
CREATE TABLE public.epis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  ca_numero TEXT,
  data_entrega DATE NOT NULL,
  vida_util_meses INT,
  data_vencimento DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.epis TO authenticated;
GRANT ALL ON public.epis TO service_role;
ALTER TABLE public.epis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "epis auth all" ON public.epis FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Eventos calendário
CREATE TABLE public.eventos_calendario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'treinamento',
  data_inicio TIMESTAMPTZ NOT NULL,
  data_fim TIMESTAMPTZ,
  descricao TEXT,
  local TEXT,
  colaboradores_convocados UUID[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eventos_calendario TO authenticated;
GRANT ALL ON public.eventos_calendario TO service_role;
ALTER TABLE public.eventos_calendario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eventos auth all" ON public.eventos_calendario FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed NRs
INSERT INTO public.normas_nr (codigo, titulo, resumo, periodicidade_meses, carga_horaria_minima) VALUES
('NR-01','Disposições Gerais','Estabelece disposições gerais sobre SST e o GRO.',12,2),
('NR-05','CIPA','Comissão Interna de Prevenção de Acidentes.',12,20),
('NR-06','EPI','Equipamento de Proteção Individual.',NULL,NULL),
('NR-10','Segurança em Instalações Elétricas','Serviços em eletricidade.',24,40),
('NR-11','Transporte e Movimentação de Materiais',NULL,12,16),
('NR-12','Máquinas e Equipamentos','Segurança em máquinas.',24,8),
('NR-17','Ergonomia','Adaptação das condições de trabalho.',NULL,NULL),
('NR-18','Construção Civil','Condições e meio ambiente de trabalho.',12,8),
('NR-20','Inflamáveis e Combustíveis','Segurança com inflamáveis.',36,4),
('NR-23','Proteção contra Incêndios',NULL,12,4),
('NR-33','Espaços Confinados','Trabalho em espaços confinados.',12,16),
('NR-35','Trabalho em Altura','Trabalho acima de 2m.',24,8);
