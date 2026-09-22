# GLPI MCP Server v2

🌐 [English version](README.en.md) · Português (Brasil)

Servidor MCP (Model Context Protocol) em TypeScript/Node para integração com GLPI. Utiliza a API GLPI v2.3 (via OAuth2) para fornecer cobertura ITIL e ferramentas integradas (tickets, problems, changes, knowledgebase, stats, assets, administration) diretamente a agentes de IA.

Este projeto consolida múltiplas ferramentas, evita repetição de requests e traz dados em formatos otimizados para consumo por LLMs.

## 🌟 Créditos e Agradecimentos

Este projeto reaproveita estrutura e cobertura de ferramentas de:
- [GMS64260/mcp-glpi](https://github.com/GMS64260/mcp-glpi) (MIT)
- [DevSkillsIT/Skills-MCP-GLPI](https://github.com/DevSkillsIT/Skills-MCP-GLPI) (MIT)

Adaptados para a nova API GLPI v2.3 (OAuth2). Agradecimento aos autores originais (GMS64260 e DevSkillsIT) pela inspiração arquitetural e lógica de negócio de mapeamento ITIL.

## 🚀 Funcionalidades (Tools)

São providas ferramentas focadas em produtividade, incluindo:
- **Assistance**: Criação, atualização, busca (com filtros RSQL) e leitura completa (incluindo timeline em 1 request) de Tickets, Problems e Changes. Estatísticas e adição de follow-ups.
- **Knowledgebase**: Busca e leitura de artigos.
- **Assets**: Listagem e leitura de Computers (com flag para inclusão de specs detalhadas).
- **Administration**: Busca de usuários, leitura de contexto de usuário, listagem de grupos e plug-ins instalados.

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

# Opcional: apenas se for utilizar as 3 tools de Base de Conhecimento (API v1)
GLPI_API_V1_APP_TOKEN=seu_app_token_v1
GLPI_API_V1_USER_TOKEN=seu_user_token_v1
```

### Base de Conhecimento (API v1 legada)
Devido a limitações em versões do GLPI onde a API High-Level v2 ainda não implementa os controllers de Base de Conhecimento (retornando 404 em `/Knowledgebase/Article`), as 3 ferramentas de Knowledgebase (`glpi_search_knowbase`, `glpi_get_knowbase_item` e `glpi_search_faq`) utilizam a **API v1 legada** (`/apirest.php/KnowbaseItem`).

Para usá-las, defina as variáveis opcionais:
- `GLPI_API_V1_APP_TOKEN` (ou `GLPI_APP_TOKEN`): gerado em **Configurar → Geral → API → Clientes API**.
- `GLPI_API_V1_USER_TOKEN` (ou `GLPI_USER_TOKEN`): gerado no perfil do usuário no GLPI (aba Chaves de API).

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

Se o cliente não suportar stdio, o servidor também expõe `StreamableHTTPServerTransport` (ver `src/httpServer.ts`). Defina `MCP_TRANSPORT=http` e, opcionalmente, `MCP_HTTP_PORT` (padrão `3000`) nas variáveis de ambiente do processo. O endpoint fica em `http://localhost:<porta>/mcp` (POST) — aponte o cliente para essa URL em vez de um comando local.

## 📄 Spec OpenAPI (referência de desenvolvimento)

O arquivo `swagger-v2.3.json` (spec OpenAPI completa da API v2.3, gerada dinamicamente pelo
GLPI) não é versionado (git-ignorado — 4.6MB, gerado). Para regenerar a partir de uma instância
GLPI rodando:

```bash
curl -s "http://SEU_GLPI/api.php/doc.json" -o swagger-v2.3.json
```

## 🌐 Modo HTTP (Express)

O servidor suporta opcionalmente comunicação via HTTP, usando o endpoint stateless recomendado (`POST /mcp`).
Para ativar este modo, defina as variáveis de ambiente:

- `MCP_TRANSPORT=http` (O padrão é `stdio`)
- `MCP_HTTP_PORT=3000` (Opcional, define a porta do servidor Express)

Exemplo de requisição para listar as ferramentas usando curl:

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}'
```

## Licença
MIT
