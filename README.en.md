# GLPI MCP Server v2

🌐 English · [Versão em Português (Brasil)](README.md)

MCP (Model Context Protocol) server in TypeScript/Node for GLPI integration. Uses the GLPI v2.3 API (via OAuth2) to provide ITIL coverage and integrated tools (tickets, problems, changes, knowledgebase, stats, assets, administration) directly to AI agents.

This project consolidates multiple tools, avoids repeated requests, and delivers data in formats optimized for LLM consumption.

## 🌟 Credits and Acknowledgements

This project reuses structure and tool coverage from:
- [GMS64260/mcp-glpi](https://github.com/GMS64260/mcp-glpi) (MIT)
- [DevSkillsIT/Skills-MCP-GLPI](https://github.com/DevSkillsIT/Skills-MCP-GLPI) (MIT)

Adapted for the new GLPI v2.3 API (OAuth2). Thanks to the original authors (GMS64260 and DevSkillsIT) for the architectural inspiration and ITIL mapping business logic.

## 🚀 Features (Tools)

Productivity-focused tools, including:
- **Assistance**: Creation, update, search (with RSQL filters), and full read (including timeline in 1 request) of Tickets, Problems, and Changes. Statistics and follow-up additions.
- **Knowledgebase**: Article search and reading, including FAQ-flagged articles.
- **Assets**: Listing and reading Computers (with flag to include hardware/software specs).
- **Administration**: User search, user context, and group listing.
- **Plug-ins**: Audit installed plug-ins (`glpi_list_plugins`) identifying version and status (`state`: 2=Active, 1=Installed/disabled, 0=Available).

## 🛠 Installation

1. Clone the repository or download the files.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the project:
   ```bash
   npm run build
   ```

## ⚙️ Configuration (.env)

Create a `.env` file at the project root, based on `.env.example`:

```env
GLPI_BASE_URL=http://localhost:8080
GLPI_CLIENT_ID=your_oauth2_client_id
GLPI_CLIENT_SECRET=your_oauth2_client_secret
GLPI_USERNAME=glpi_user
GLPI_PASSWORD=glpi_password

# Optional: only required when using the 3 Knowledgebase tools (API v1)
GLPI_API_V1_APP_TOKEN=your_v1_app_token
GLPI_API_V1_USER_TOKEN=your_v1_user_token
```

### Knowledgebase (Legacy API v1)
Due to limitations in GLPI versions where the High-Level v2 API does not implement Knowledgebase controllers (returning 404 on `/Knowledgebase/Article`), the 3 Knowledgebase tools (`glpi_search_knowbase`, `glpi_get_knowbase_item`, and `glpi_search_faq`) use the **legacy API v1** (`/apirest.php/KnowbaseItem`).

To use them, configure the optional environment variables:
- `GLPI_API_V1_APP_TOKEN` (or `GLPI_APP_TOKEN`): generated under **Setup → General → API → API Clients**.
- `GLPI_API_V1_USER_TOKEN` (or `GLPI_USER_TOKEN`): generated on the user profile in GLPI (API Keys tab).

### How to create the OAuth2 API Client in GLPI
1. Access GLPI (version 11 / v2.3 enabled).
2. Go to **Setup** → **OAuth Clients** (`/front/oauthclient.php`).
3. Add a new client.
4. Under **Grants**, add `Password` (password grant — recommended for scripts/agents).
5. Under **Scopes**, select at least `api` (and `user` if using user-context tools).
6. Save and copy the **Client ID** (identifier) and **Client Secret** shown on the saved item.

## 🔌 MCP Client Registration

The server runs over stdio (`node dist/index.js` + environment variables), so any MCP-compatible client can register it. Examples per client below.

### Claude Desktop / Claude Code

`claude_desktop_config.json` (Desktop) or `.mcp.json` (Claude Code, at project root):

```json
{
  "mcpServers": {
    "glpi-v2": {
      "command": "node",
      "args": [
        "absolute/path/to/glpi-mcp-v2/dist/index.js"
      ],
      "env": {
        "GLPI_BASE_URL": "http://localhost:8080",
        "GLPI_CLIENT_ID": "your_oauth2_client_id",
        "GLPI_CLIENT_SECRET": "your_oauth2_client_secret",
        "GLPI_USERNAME": "glpi_user",
        "GLPI_PASSWORD": "glpi_password"
      }
    }
  }
}
```

### Antigravity (IDE and CLI)

`~/.gemini/config/mcp_config.json` (global) or `.agents/mcp_config.json` (per workspace):

```json
{
  "mcpServers": {
    "glpi-v2": {
      "command": "node",
      "args": [
        "absolute/path/to/glpi-mcp-v2/dist/index.js"
      ],
      "env": {
        "GLPI_BASE_URL": "http://localhost:8080",
        "GLPI_CLIENT_ID": "your_oauth2_client_id",
        "GLPI_CLIENT_SECRET": "your_oauth2_client_secret",
        "GLPI_USERNAME": "glpi_user",
        "GLPI_PASSWORD": "glpi_password"
      }
    }
  }
}
```

### Codex CLI (OpenAI)

`~/.codex/config.toml` (global) or `.codex/config.toml` (per project, in a trusted environment):

```toml
[mcp_servers.glpi-v2]
command = "node"
args = ["absolute/path/to/glpi-mcp-v2/dist/index.js"]

[mcp_servers.glpi-v2.env]
GLPI_BASE_URL = "http://localhost:8080"
GLPI_CLIENT_ID = "your_oauth2_client_id"
GLPI_CLIENT_SECRET = "your_oauth2_client_secret"
GLPI_USERNAME = "glpi_user"
GLPI_PASSWORD = "glpi_password"
```

Or via `codex mcp add glpi-v2 --command node --args absolute/path/to/glpi-mcp-v2/dist/index.js` (interactive, for env vars).

### Hermes Agent

```bash
hermes mcp add glpi-v2 --command "node absolute/path/to/glpi-mcp-v2/dist/index.js"
```

Environment variables (`GLPI_BASE_URL`, `GLPI_CLIENT_ID`, etc.) must be available in the environment where Hermes runs, or configured via `.env` in the project directory (the server loads them via `dotenv`, if applicable — check `src/config.ts`).

### OpenClaw

`~/.openclaw/openclaw.json`:

```json
{
  "mcp": {
    "servers": {
      "glpi-v2": {
        "command": "node",
        "args": [
          "absolute/path/to/glpi-mcp-v2/dist/index.js"
        ],
        "transport": "stdio",
        "env": {
          "GLPI_BASE_URL": "http://localhost:8080",
          "GLPI_CLIENT_ID": "your_oauth2_client_id",
          "GLPI_CLIENT_SECRET": "your_oauth2_client_secret",
          "GLPI_USERNAME": "glpi_user",
          "GLPI_PASSWORD": "glpi_password"
        }
      }
    }
  }
}
```

> **Note:** the Hermes Agent and OpenClaw examples above follow each project's public documentation at the time of writing, but have not been tested directly against this server. Validate the connection locally (list exposed tools) before relying on it in production.

### Alternative: HTTP transport

If the client doesn't support stdio, the server also exposes a `StreamableHTTPServerTransport` (see `src/httpServer.ts`). Set `MCP_TRANSPORT=http` and, optionally, `MCP_HTTP_PORT` (default `3000`) as process environment variables. The endpoint is `http://localhost:<port>/mcp` (POST) — point the client to that URL instead of a local command.

## 📄 OpenAPI Spec (development reference)

The `swagger-v2.3.json` file (full OpenAPI spec for v2.3, dynamically generated by
GLPI) is not versioned (git-ignored — 4.6MB, generated). To regenerate it from a running
GLPI instance:

```bash
curl -s "http://YOUR_GLPI/api.php/doc.json" -o swagger-v2.3.json
```

## 🌐 HTTP Mode (Express)

The server optionally supports HTTP communication, using the recommended stateless endpoint (`POST /mcp`).
To enable this mode, set the environment variables:

- `MCP_TRANSPORT=http` (default is `stdio`)
- `MCP_HTTP_PORT=3000` (optional, sets the Express server port)

Example request to list tools using curl:

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}'
```

## License
MIT
