# GLPI MCP Server v2

🌐 [English version](README.en.md) · Português (Brasil)

Servidor MCP (Model Context Protocol) em TypeScript/Node para integração com GLPI. Utiliza a API GLPI v2.3 (via OAuth2) e a API v1 legada para fornecer cobertura ITIL e ferramentas integradas (tickets, problems, changes, projects, knowledgebase, stats, assets, administration) diretamente a agentes de IA.

Este projeto consolida múltiplas ferramentas, evita repetição de requests e traz dados em formatos otimizados para consumo por LLMs.

## 🌟 Créditos e Agradecimentos

Este projeto reaproveita estrutura e cobertura de ferramentas de:
- [GMS64260/mcp-glpi](https://github.com/GMS64260/mcp-glpi) (MIT)
- [DevSkillsIT/Skills-MCP-GLPI](https://github.com/DevSkillsIT/Skills-MCP-GLPI) (MIT)

Adaptados para a nova API GLPI v2.3 (OAuth2). Agradecimento aos autores originais (GMS64260 e DevSkillsIT) pela inspiração arquitetural e lógica de negócio de mapeamento ITIL.

## 🚀 Funcionalidades (Tools)

São providas **41 ferramentas** focadas em produtividade, incluindo:
- **Assistance**: Criação, atualização, busca (com filtros RSQL) e leitura completa (incluindo timeline em 1 request) de Tickets, Problems e Changes. Estatísticas e adição de follow-ups.
- **Projects (API v1)**: Gestão de projetos, tarefas, equipe e vínculos ITIL — `glpi_search_projects`, `glpi_get_project`, `glpi_create_project`, `glpi_update_project`, `glpi_create_project_task`, `glpi_update_project_task`, `glpi_link_project_itil`, `glpi_link_task_ticket`, `glpi_add_project_team` e `glpi_list_project_states` (sem tools de exclusão).
- **Knowledgebase (API v1)**: Busca e leitura de artigos, incluindo FAQ.
- **Assets**: Listagem e leitura de Computers (com flag para inclusão de specs detalhadas e softwares instalados via API v1).
- **Administration**: Busca de usuários, leitura de contexto de usuário e listagem de grupos.
- **Plug-ins**: Auditoria de plug-ins instalados (`glpi_list_plugins`) identificando versão e status (`state`: 1=Ativo/ACTIVATED, 4=Instalado/NOTACTIVATED, 2=Não instalado).

## 🛠 Instalação

1. Clone o repositório ou baixe os arquivos.
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Compile o projeto:
   ```bash
   npm run build
   ```

## ⚙️ Configuração (.env)

Crie um arquivo `.env` na raiz do projeto, baseado no arquivo `.env.example`:

```env
GLPI_BASE_URL=http://localhost:8080
GLPI_CLIENT_ID=seu_client_id_oauth2
GLPI_CLIENT_SECRET=seu_client_secret_oauth2
GLPI_USERNAME=usuario_glpi
GLPI_PASSWORD=senha_glpi

# Opcional: necessário para Base de Conhecimento, Projetos e softwares em glpi_get_computer (API v1)
GLPI_API_V1_APP_TOKEN=seu_app_token_v1
GLPI_API_V1_USER_TOKEN=seu_user_token_v1

# Opcional: modo de operação ('write' padrão ou 'read' para somente leitura)
GLPI_MCP_MODE=write

# Obrigatório quando MCP_TRANSPORT=http (token Bearer exigido na rota POST /mcp)
MCP_HTTP_TOKEN=seu_token_secreto_http
```

### Base de Conhecimento e Projetos (API v1 legada)
Algumas áreas utilizam a **API v1 legada** (`/apirest.php`):
- **Base de Conhecimento** (`glpi_search_knowbase`, `glpi_get_knowbase_item`, `glpi_search_faq`): versões do GLPI onde a API High-Level v2 ainda não implementa os controllers de Base de Conhecimento retornam 404 em `/Knowledgebase/Article`.
- **Projetos** (`glpi_search_projects`, `glpi_get_project`, `glpi_create_project`, `glpi_update_project`, `glpi_create_project_task`, `glpi_update_project_task`, `glpi_link_project_itil`, `glpi_link_task_ticket`, `glpi_add_project_team`, `glpi_list_project_states`): **Projetos usam a API v1 porque o esquema da API v2 do GLPI 11 expõe apenas `name`, `code`, `content`, `priority` e `entity`** (sem datas planejadas/reais, estados, percentual concluído, gerentes, tarefas, equipe ou vínculos ITIL). Nenhuma tool de exclusão é exposta.
- **Softwares instalados em computadores** (`glpi_get_computer`): obtidos via `/apirest.php/Computer/{id}?with_softwares=true`.

Para usar essas tools, defina as variáveis opcionais:
- `GLPI_API_V1_APP_TOKEN` (ou `GLPI_APP_TOKEN`): gerado em **Configurar → Geral → API → Clientes API**.
- `GLPI_API_V1_USER_TOKEN` (ou `GLPI_USER_TOKEN`): gerado no perfil do usuário no GLPI (aba Chaves de API).

### Modo Somente Leitura (`GLPI_MCP_MODE`)
Controla se o servidor MCP expõe operações de escrita no GLPI:
- `GLPI_MCP_MODE=write` (**padrão**): habilita todas as 41 tools (leitura e escrita).
- `GLPI_MCP_MODE=read`: modo somente leitura. `tools/list` omite todas as tools de escrita (`glpi_create_*`, `glpi_update_*`, `glpi_add_*`, `glpi_link_*`, `glpi_delete_*`) e qualquer chamada direta via `tools/call` a uma tool de escrita retorna `isError: true` com a mensagem `servidor em modo somente leitura (GLPI_MCP_MODE=read)`.
- Qualquer outro valor em `GLPI_MCP_MODE` lança erro imediatamente na criação do servidor.

### Como criar o Cliente API OAuth2 no GLPI
1. Acesse o GLPI (versão 11 / v2.3 habilitada).
2. Vá em **Configuração** → **Clientes OAuth** (`/front/oauthclient.php`).
3. Adicione um novo cliente.
4. Em **Concessões**, adicione `Senha` (password grant — recomendado para scripts/agentes).
5. Em **Escopos**, selecione ao menos `api` (e `user` se for usar tools de contexto de usuário).
6. Salve e copie o **Client ID** (identifier) e **Client Secret** exibidos no item salvo.

## 🔌 Registro em Cliente MCP

O servidor roda via stdio (`node dist/index.js` + variáveis de ambiente), então qualquer cliente MCP compatível pode registrá-lo. Abaixo, exemplos por cliente.

### Claude Desktop / Claude Code

Arquivo `claude_desktop_config.json` (Desktop) ou `.mcp.json` (Claude Code, na raiz do projeto):

```json
{
  "mcpServers": {
    "glpi-v2": {
      "command": "node",
      "args": [
        "caminho/absoluto/para/glpi-mcp-v2/dist/index.js"
      ],
      "env": {
        "GLPI_BASE_URL": "http://localhost:8080",
        "GLPI_CLIENT_ID": "seu_client_id_oauth2",
        "GLPI_CLIENT_SECRET": "seu_client_secret_oauth2",
        "GLPI_USERNAME": "usuario_glpi",
        "GLPI_PASSWORD": "senha_glpi"
      }
    }
  }
}
```

### Antigravity (IDE e CLI)

Arquivo `~/.gemini/config/mcp_config.json` (global) ou `.agents/mcp_config.json` (por workspace):

```json
{
  "mcpServers": {
    "glpi-v2": {
      "command": "node",
      "args": [
        "caminho/absoluto/para/glpi-mcp-v2/dist/index.js"
      ],
      "env": {
        "GLPI_BASE_URL": "http://localhost:8080",
        "GLPI_CLIENT_ID": "seu_client_id_oauth2",
        "GLPI_CLIENT_SECRET": "seu_client_secret_oauth2",
        "GLPI_USERNAME": "usuario_glpi",
        "GLPI_PASSWORD": "senha_glpi"
      }
    }
  }
}
```

### Codex CLI (OpenAI)

Arquivo `~/.codex/config.toml` (global) ou `.codex/config.toml` (por projeto, em ambiente confiável):

```toml
[mcp_servers.glpi-v2]
command = "node"
args = ["caminho/absoluto/para/glpi-mcp-v2/dist/index.js"]

[mcp_servers.glpi-v2.env]
GLPI_BASE_URL = "http://localhost:8080"
GLPI_CLIENT_ID = "seu_client_id_oauth2"
GLPI_CLIENT_SECRET = "seu_client_secret_oauth2"
GLPI_USERNAME = "usuario_glpi"
GLPI_PASSWORD = "senha_glpi"
```

Ou via `codex mcp add glpi-v2 --command node --args caminho/absoluto/para/glpi-mcp-v2/dist/index.js` (interativo, para as env vars).

### Hermes Agent

```bash
hermes mcp add glpi-v2 --command "node caminho/absoluto/para/glpi-mcp-v2/dist/index.js"
```

As variáveis de ambiente (`GLPI_BASE_URL`, `GLPI_CLIENT_ID`, etc.) devem estar disponíveis no ambiente onde o Hermes é executado, ou configuradas via `.env` no diretório do projeto (o servidor as carrega via `dotenv`, se aplicável — confira `src/config.ts`).

### OpenClaw

Arquivo `~/.openclaw/openclaw.json`:

```json
{
  "mcp": {
    "servers": {
      "glpi-v2": {
        "command": "node",
        "args": [
          "caminho/absoluto/para/glpi-mcp-v2/dist/index.js"
        ],
        "transport": "stdio",
        "env": {
          "GLPI_BASE_URL": "http://localhost:8080",
          "GLPI_CLIENT_ID": "seu_client_id_oauth2",
          "GLPI_CLIENT_SECRET": "seu_client_secret_oauth2",
          "GLPI_USERNAME": "usuario_glpi",
          "GLPI_PASSWORD": "senha_glpi"
        }
      }
    }
  }
}
```

> **Nota:** os exemplos de Hermes Agent e OpenClaw acima seguem a documentação pública de cada projeto no momento da escrita, mas não foram testados diretamente contra este servidor. Valide a conexão localmente (liste as tools expostas) antes de depender em produção.

### Alternativa: transporte HTTP

Se o cliente não suportar stdio, o servidor também expõe `StreamableHTTPServerTransport` (ver `src/httpServer.ts`). Defina `MCP_TRANSPORT=http`, `MCP_HTTP_TOKEN=<seu_token>` e, opcionalmente, `MCP_HTTP_PORT` (padrão `3000`) nas variáveis de ambiente do processo. O endpoint fica em `http://localhost:<porta>/mcp` (POST, protegido por `Authorization: Bearer <MCP_HTTP_TOKEN>`) e há uma rota de verificação `GET /health` sem autenticação.

## 📄 Spec OpenAPI (referência de desenvolvimento)

O arquivo `swagger-v2.3.json` (spec OpenAPI completa da API v2.3, gerada dinamicamente pelo
GLPI) não é versionado (git-ignorado — 4.6MB, gerado). Para regenerar a partir de uma instância
GLPI rodando:

```bash
curl -s "http://SEU_GLPI/api.php/doc.json" -o swagger-v2.3.json
```

## 🌐 Modo HTTP (Express)

O servidor suporta opcionalmente comunicação via HTTP, usando o endpoint stateless recomendado (`POST /mcp`) e healthcheck (`GET /health`).
Para ativar este modo, defina as variáveis de ambiente:

- `MCP_TRANSPORT=http` (O padrão é `stdio`)
- `MCP_HTTP_PORT=3000` (Opcional, define a porta do servidor Express)
- `MCP_HTTP_TOKEN=<token>` (**Obrigatório** no modo HTTP; validado via `Authorization: Bearer <MCP_HTTP_TOKEN>` com comparação segura `crypto.timingSafeEqual`. Requisições sem token válido recebem `401 {"error":"unauthorized"}` antes da criação do servidor MCP)
- `MCP_HTTP_ALLOW_NO_AUTH=1` (Opcional; **desaconselhado em produção** — permite iniciar o modo HTTP sem `MCP_HTTP_TOKEN`, emitindo aviso no `stderr`. Sem `MCP_HTTP_TOKEN` e sem `MCP_HTTP_ALLOW_NO_AUTH=1`, o servidor recusa iniciar)

Rotas disponíveis:
- `GET /health` (sem autenticação): retorna `{"ok": true, "mode": "read"|"write"}`.
- `POST /mcp` (autenticado com Bearer token): endpoint MCP stateless.

Exemplo de requisição para listar as ferramentas usando curl:

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MCP_HTTP_TOKEN" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}'
```

## Licença
MIT
