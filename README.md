# GLPI MCP Server v2

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
- **Administration**: Busca de usuários, leitura de contexto de usuário e listagem de grupos.

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
```

### Como criar o Cliente API OAuth2 no GLPI
1. Acesse o GLPI (versão 11 / v2.3 habilitada).
2. Vá em **Configuração** → **Clientes OAuth** (`/front/oauthclient.php`).
3. Adicione um novo cliente.
4. Em **Concessões**, adicione `Senha` (password grant — recomendado para scripts/agentes).
5. Em **Escopos**, selecione ao menos `api` (e `user` se for usar tools de contexto de usuário).
6. Salve e copie o **Client ID** (identifier) e **Client Secret** exibidos no item salvo.

## 🔌 Registro em Cliente MCP

Para usar com o Claude Desktop, Antigravity, ou outro cliente compatível, configure-o para executar o script via Node injetando as variáveis de ambiente necessárias.

Exemplo de configuração (ex: `claude_desktop_config.json` ou arquivo `.mcp.json`):

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

## 📄 Spec OpenAPI (referência de desenvolvimento)

O arquivo `swagger-v2.3.json` (spec OpenAPI completa da API v2.3, gerada dinamicamente pelo
GLPI) não é versionado (git-ignorado — 4.6MB, gerado). Para regenerar a partir de uma instância
GLPI rodando:

```bash
curl -s "http://SEU_GLPI/api.php/doc.json" -o swagger-v2.3.json
```

## Licença
MIT
