# TEC - SST · SST Safe Zone

Sistema de gestão de **Segurança e Saúde no Trabalho** para técnicos de segurança: colaboradores, treinamentos, NRs, EPIs, certificados, calendário e relatórios. Roda 100% no Google (Apps Script + Planilha Google), sem servidor nem mensalidade.

**▶ Demonstração online:** https://edniltonbernardo63.github.io/pulse-safety/
Login: `demo@tecsst.com.br` · Senha: `demo123`
A demonstração já vem com dados de exemplo e guarda as alterações só no navegador de quem abrir. O botão "Restaurar dados de exemplo" volta ao estado inicial.

## Funções

- **Dashboard** — colaboradores ativos, treinamentos vencidos e a vencer em 30 dias, EPIs a vencer, certificados do mês, gráfico por setor e próximos eventos.
- **Colaboradores** — cadastro com matrícula gerada automaticamente (ano + sequência, ex.: `20260001`), busca por nome, matrícula, CPF ou setor, ficha com tempo de empresa, NRs vinculadas, treinamentos, EPIs e histórico de funções.
- **Crachá com QR Code** — ao escanear, abre uma consulta pública com matrícula, função, NRs e treinamentos e o status de cada um.
- **Treinamentos** — treinamento, palestra, integração, workshop, DDS e personalizado; validade em dias, meses ou anos (ou pela periodicidade da NR); agendamento automático no calendário; lista de presença para imprimir; conclusão em lote que atualiza as NRs de cada participante.
- **Vencimentos** — matriz com status (Vencido, Atenção, Em dia) e filtros por setor, NR e origem.
- **EPIs** — entregas com vencimento pela vida útil e EPIs obrigatórios por setor (CA e vida útil preenchidos automaticamente).
- **Certificados** — com empresa formadora, técnico responsável e QR de autenticação; imprimir ou baixar PDF.
- **Parceiros** — empresas parceiras de treinamento.
- **Normas (NRs)** — NR-01 a NR-38 com link oficial do gov.br.
- **Calendário** — eventos, SIPAT, convocação de colaboradores e convite por e-mail.
- **Relatórios** — relatório completo por colaborador com tópicos opcionais (dados, NRs, treinamentos, palestras assistidas, EPIs, histórico) e relatórios gerais com escolha de campos; imprimir, PDF (folha em pé ou deitada), Excel ou Planilha Google.
- **Perfis** — Administrador, Técnico e Consulta (somente leitura).

## Estrutura

| Caminho | Conteúdo |
|---|---|
| `apps-script/Code.js` | Servidor: login, regras de negócio, cálculo de vencimentos, gravação na planilha |
| `apps-script/Index.html` | Todas as telas, estilos e a página pública do QR Code |
| `apps-script/appsscript.json` | Configuração do projeto (fuso de São Paulo, acesso do App da Web) |
| `docs/index.html` | Demonstração online (GitHub Pages), com o mesmo código rodando no navegador |

## Instalação no Google

1. Acesse [script.google.com](https://script.google.com) e crie um **Novo projeto**.
2. Cole o conteúdo de `apps-script/Code.js` no arquivo `Código`.
3. Clique em **+ → HTML**, crie o arquivo **Index** e cole o conteúdo de `apps-script/Index.html`.
4. Salve, escolha a função **setup** e clique em **Executar** (autorize quando pedir). A planilha "SST Safe Zone - Banco de dados" é criada no seu Drive com todas as abas e NRs; o link aparece no Registro de execução.
5. **Implantar → Nova implantação → App da Web**, executar como **Eu**, acesso **Qualquer pessoa**.
6. Abra o link e clique em **Criar conta**. O primeiro usuário vira Administrador.

Para atualizar o código depois, use **Gerenciar implantações → Nova versão**: assim o link e os QR Codes impressos continuam valendo.
