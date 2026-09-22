# AGENTS.md — Instruções para Agentes de IA (GLPI MCP Server)

Este documento instrui agentes de IA (como Claude Code, Hermes Agent, Antigravity, OpenClaw e Codex) sobre como interagir com o `glpi-mcp-v2`, executar tarefas de ITSM, selecionar as ferramentas adequadas e respeitar os limites de segurança.

---

## 1. Visão Geral e Arquitetura

O **`glpi-mcp-v2`** é um servidor Model Context Protocol que funciona como um gateway unificado entre agentes de IA e a plataforma GLPI (versões 10 e 11), expondo **31 ferramentas** padronizadas com o prefixo `glpi_`.

### Arquitetura Híbrida (v2 + v1)
- **API v2 (High-Level REST API via OAuth2)**:
  - Usada por **28 ferramentas**: Tickets, Problems, Changes, Assets (Computers), Administração (Users/Groups/Plugins) e Estatísticas.
  - Vantagens: traz dados completos com **timeline embutida em 1 requisição**, suporta filtros RSQL e autenticação JWT Bearer sem gerenciamento de sessão PHP em memória.
- **API v1 (API REST Legada via App-Token & User-Token)**:
  - Usada exclusivamente pelas **3 ferramentas de Base de Conhecimento** (`glpi_search_knowbase`, `glpi_get_knowbase_item`, `glpi_search_faq`).
  - Motivo: compatibilidade com instâncias do GLPI onde a API v2 ainda não implementa controllers de Base de Conhecimento (retornando 404 em `/Knowledgebase/Article`).

---

## 2. Regras de Ouro e Gates de Segurança

1. **Ações Destrutivas e Mudanças de Estado:**
   - Ferramentas de leitura (`glpi_search_*`, `glpi_get_*`) podem ser executadas autonomamente para obter contexto e responder a dúvidas.
   - Ferramentas de escrita (`glpi_create_*`, `glpi_update_*`, `glpi_add_*_followup`) alteram dados reais de produção. O agente deve **montar a proposta, exibir os dados pretendidos e aguardar aprovação humana explícita** antes de disparar a ação.
2. **Eficiência de Contexto (Regra de 1 Chamada):**
   - Ao analisar um ticket, problema ou mudança, chame `glpi_get_ticket(id=N)`, `glpi_get_problem(id=N)` ou `glpi_get_change(id=N)`.
   - **NUNCA** faça chamadas subsequentes para `glpi_get_*_timeline` se você já chamou `glpi_get_*`. A timeline completa (followups, tarefas, soluções) já vem embutida no campo `timeline` do retorno.
3. **Filtre Sempre no Servidor MCP:**
   - Use os parâmetros de paginação (`limit`, `start`) e filtros (`filter` em RSQL) na chamada MCP.
   - Não puxe grandes volumes de dados desnecessários para filtrar em memória.
4. **Respostas com Grandes Volumes:**
   - Se uma consulta trouxer dados que excedam a janela de contexto e forem salvos em disco pelo harness, **não crie scripts Python ou pipelines ad-hoc de `jq`**. Delegue a exploração e sumarização para um subagente de pesquisa/exploração.

---

## 3. Matriz de Seleção de Ferramentas

| Domínio | Objetivo / Pergunta do Usuário | Ferramenta Recomendada | Parâmetros Principais |
|---|---|---|---|
| **Tickets** | Listar ou buscar chamados por filtro, status ou período | `glpi_search_tickets` | `filter` (RSQL: `status=1;name=*email*`), `limit`, `start` |
| **Tickets** | Obter contexto completo de 1 chamado (com timeline) | `glpi_get_ticket` | `id` (obrigatório) |
| **Tickets** | Consultar apenas a timeline isolada de um chamado | `glpi_get_ticket_timeline` | `id` |
| **Tickets** | Criar um novo chamado | `glpi_create_ticket` | `input: { name, content, urgency, impact, ... }` |
| **Tickets** | Atualizar campos ou status de um chamado | `glpi_update_ticket` | `id`, `input: { status, ... }` |
| **Tickets** | Adicionar apontamento / acompanhamento a um chamado | `glpi_add_ticket_followup` | `id`, `content`, `is_private` (boolean) |
| **Tickets** | Estatísticas de um chamado (tempos de atendimento/solução) | `glpi_get_ticket_stats` | `id` |
| **Problems** | Buscar problemas registrados (análise de causa-raiz / RCA) | `glpi_search_problems` | `filter`, `limit`, `start` |
| **Problems** | Contexto e timeline completa de 1 problema | `glpi_get_problem` | `id` |
| **Problems** | Criar / atualizar problema | `glpi_create_problem`, `glpi_update_problem` | `input` |
| **Problems** | Adicionar follow-up a um problema | `glpi_add_problem_followup` | `id`, `content`, `is_private` |
| **Changes** | Buscar requisições de mudança (RFCs / GMUD) | `glpi_search_changes` | `filter`, `limit`, `start` |
| **Changes** | Contexto e timeline completa de 1 mudança | `glpi_get_change` | `id` |
| **Changes** | Criar / atualizar mudança | `glpi_create_change`, `glpi_update_change` | `input` |
| **Knowledgebase** | Buscar artigos na base de conhecimento | `glpi_search_knowbase` | `filter` (busca no título), `limit`, `start` |
| **Knowledgebase** | Ler conteúdo completo de um artigo | `glpi_get_knowbase_item` | `id` |
| **Knowledgebase** | Dúvidas rápidas de FAQ antes de abrir chamado | `glpi_search_faq` | `query` (termo de busca) |
| **Assets** | Listar computadores e servidores no parque | `glpi_list_computers` | `filter`, `include_specs: true` (se precisar de CPU/RAM/Disco) |
| **Assets** | Contexto completo de 1 computador (hardware + software) | `glpi_get_computer` | `id` |
| **Assets** | Estatísticas de ativos vinculados a ITSM | `glpi_get_asset_stats` | `itemtype: "Ticket"|"Problem"|"Change"` |
| **Admin** | Buscar usuários pelo nome ou login | `glpi_search_user` | `filter: "name=*termo*"` |
| **Admin** | Obter perfil e ativos vinculados a um usuário | `glpi_get_user_context` | `id` |
| **Admin** | Listar grupos técnicos e de suporte | `glpi_list_groups` | `filter` |
| **Admin** | Listar plug-ins instalados e status (ativo/inativo) | `glpi_list_plugins` | `filter` (ex: `is_active==true`) |

---

## 4. Legenda de Campos e Apresentação para o Usuário

### Status ITIL (GLPI)
Ao formatar listas de chamados para o usuário, mapeie os status numéricos para os emojis e nomes padronizados:
- `1` — **Novo** 🆕
- `2` — **Em Atendimento / Atribuído** 👤
- `3` — **Planejado** 📅
- `4` — **Pendente / Em Espera** ⏸️
- `5` — **Solucionado** ✅
- `6` — **Fechado** 🔒

### Padrão de Listagem de Tickets:
Apresente cada chamado em linha única e objetiva:
`HH:MM [<emoji>] — <Status> — #<id> <título> · <categoria>`

---

## 5. Playbooks de Ação para o Agente

### Playbook: Triagem Inteligente e Autoatendimento (Self-Service)
1. Antes de abrir um novo chamado ou atribuir uma fila técnica:
   - Consulte artigos de FAQ via `glpi_search_faq(query="...")` ou `glpi_search_knowbase(filter="...")`.
   - Se houver solução conhecida documentada, cite o ID do artigo e o passo a passo resumido.
2. Se o problema persistir:
   - Formule o chamado via `glpi_create_ticket`, preenchendo título claro, descrição em HTML/Markdown e nível de urgência/impacto adequado.
   - Solicite confirmação humana antes de submeter.

### Playbook: Escalação de Incidentes Recorrentes para Problema (Problem Management)
1. Ao identificar múltiplos chamados recentes com o mesmo sintoma:
   - Localize-os com `glpi_search_tickets(filter="name=*<termo>*;status<5")`.
   - Verifique se já existe causa-raiz registrada via `glpi_search_problems(filter="name=*<termo>*")`.
2. Caso não exista:
   - Proponha a abertura de um Problem (`glpi_create_problem`) agrupando os incidentes identificados para investigação de causa-raiz.

### Playbook: Auditoria e Diagnóstico de Plug-ins (`glpi_list_plugins`)
1. Ao ser consultado sobre capacidades da instância, integrações ou status de extensões:
   - Execute `glpi_list_plugins()`.
   - Mapeie o campo `state` para orientar o usuário:
     - `state: 2` 🟢 — **Habilitado / Ativo** (em execução normal).
     - `state: 1` 🟡 — **Instalado / Não Ativado** (código presente, mas desabilitado no GLPI).
     - `state: 0` ⚪ — **Não Instalado / Disponível**.
2. Reconhecimento de plug-ins estratégicos:
   - `glpiinventory`: Inventário automático de hardware/software via agentes de rede.
   - `fields`: Campos personalizados nos formulários de tickets e ativos.
   - `datainjection`: Importação em massa de dados via CSV.
   - `activity` / `actualtime`: Apontamento de horas e esforço técnico.
   - `financial`: Gestão avançada de contratos, orçamentos e amortizações.
   - `dashboard`: Painéis visuais (ST-Dashboard).
3. Se o usuário solicitar uma operação cujo plug-in correspondente esteja em `state: 1` ou não instalado, alerte-o explicitamente sobre o status da extensão.

---

## 6. Variáveis de Ambiente Necessárias

No arquivo `.env` da raiz do MCP Server:

```env
# API v2 (Obrigatória para 27 ferramentas ITSM, Assets e Admin)
GLPI_BASE_URL=http://<host-glpi>:8080
GLPI_CLIENT_ID=<client_id_oauth2>
GLPI_CLIENT_SECRET=<client_secret_oauth2>
GLPI_USERNAME=<usuario_glpi>
GLPI_PASSWORD=<senha_glpi>

# API v1 (Obrigatória para as 3 ferramentas de Knowledgebase)
GLPI_API_V1_APP_TOKEN=<app_token_v1>
GLPI_API_V1_USER_TOKEN=<user_token_v1>
```

---

## 7. Desenvolvimento e Contribuição

- **Compilação**: `npm run build` (gera em `dist/`).
- **Testes Automatizados**: `npm test` (roda suíte completa no Vitest). Sempre execute antes de propor commits.
- **Política de Documentação**: Conforme [`CONTRIBUTING.md`](CONTRIBUTING.md), qualquer alteração no `README.md` (PT-BR canônico) deve ser replicada para `README.pt-BR.md` e traduzida para `README.en.md`.
