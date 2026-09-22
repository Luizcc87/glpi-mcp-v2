---
name: glpi-mcp-v2
description: Manage and analyze GLPI tickets, problems, changes, knowledge base, assets, and users using the GLPI MCP server. Pick the right tool, pull full item content and timelines in one shot, leverage knowledge base via API v1, and delegate large-result-set analysis to subagents. Use when querying GLPI, checking ticket/problem/change status, searching KB/FAQ, looking up user context or hardware assets, or invoking /glpi.
---

# glpi-mcp-v2

How to query and operate the GLPI MCP server and deliver in-depth ITSM analysis without burning context or resorting to ad-hoc scripts.

## Architecture & API Protocol

The server acts as a unified gateway supporting 31 tools:
- **API v2 (High-Level REST API via OAuth2)**: Handles Tickets, Problems, Changes, Assets, Users/Groups, Plugins, and Statistics. Uses named fields, RSQL filtering, and inlined timelines.
- **API v1 (Legacy REST API via App-Token & User-Token)**: Handles Knowledge Base tools (`glpi_search_knowbase`, `glpi_get_knowbase_item`, `glpi_search_faq`) because GLPI High-Level API versions < 2.2.0 lack knowledge base controllers (returning 404).

## Tool Selection Matrix

Pick the tool that precisely matches the question:

| Domain | Question / Use Case | Tool | Notes |
|---|---|---|---|
| **Tickets** | "tickets today", "by category", "by status" | `glpi_search_tickets` | Use RSQL `filter` (e.g. `status=1`, `name=*email*`). |
| **Tickets** | Deep dive on ONE ticket | `glpi_get_ticket` | **One call**. Inlines `timeline` (followups, tasks, solutions). |
| **Tickets** | Add follow-up note to ticket | `glpi_add_ticket_followup` | Supports `is_private` boolean. |
| **Tickets** | Create new ticket | `glpi_create_ticket` | Pass `input` with `name`, `content`, `urgency`, etc. |
| **Tickets** | Update ticket fields/status | `glpi_update_ticket` | Pass `id` and `input` object. |
| **Tickets** | Ticket statistics | `glpi_get_ticket_stats` | Statistics for a specific ticket. |
| **Problems** | Search or list recurring problems | `glpi_search_problems` | Use RSQL `filter`. |
| **Problems** | Full problem context & timeline | `glpi_get_problem` | Inlines problem `timeline`. |
| **Problems** | Create / update problem | `glpi_create_problem`, `glpi_update_problem` | For major incident root-cause management. |
| **Problems** | Add follow-up to problem | `glpi_add_problem_followup` | Documents RCA steps. |
| **Changes** | Search or list RFCs / changes | `glpi_search_changes` | Tracks infrastructure change management. |
| **Changes** | Full change context & timeline | `glpi_get_change` | Inlines change `timeline`. |
| **Changes** | Create / update change | `glpi_create_change`, `glpi_update_change` | Change request lifecycle. |
| **Knowledge Base** | Search KB articles | `glpi_search_knowbase` | Uses API v1. Supports `filter`, `start`, `limit`. |
| **Knowledge Base** | Read full article content | `glpi_get_knowbase_item` | Uses API v1. Returns full HTML/text content (`answer`). |
| **Knowledge Base** | Search FAQ / Quick self-service | `glpi_search_faq` | Uses API v1 (`is_faq=1`). Query before creating a ticket. |
| **Assets** | List computers & hardware | `glpi_list_computers` | Set `include_specs=true` to include CPU/RAM/disks/software. |
| **Assets** | Full computer hardware/software | `glpi_get_computer` | Returns CPU, RAM, disks, network cards, and installed software. |
| **Assets** | Asset stats | `glpi_get_asset_stats` | Pass `itemtype: "Ticket"|"Problem"|"Change"`. |
| **Users** | User context (managed/used assets) | `glpi_get_user_context` | Inlines user's used and managed hardware. |
| **Users** | Search users | `glpi_search_user` | Filters by name or login. |
| **Groups** | List support / technician groups | `glpi_list_groups` | For routing tickets/changes to proper teams. |
| **Plugins** | List installed plugins & status | `glpi_list_plugins` | Returns plugin names, versions, active/inactive status. |

---

## Field Legend & Status Codes (ITSM)

### Tickets, Problems & Changes
Common named fields: `id`, `name` (title), `content` (description/HTML), `status`, `urgency`, `impact`, `priority`, `date_creation`, `date_mod`, `time_to_resolve`.

**Status Codes & Presentation:**
- `1` New 🆕
- `2` Assigned / In Progress 👤
- `3` Planned 📅
- `4` Waiting / Pending ⏸️
- `5` Solved ✅
- `6` Closed 🔒

**Ticket Listing Format:**
When presenting ticket lists to the user, follow this concise single-line format:
`HH:MM [<emoji>] — <Status> — #<id> <title> · <category>`

---

## Agent Playbooks for Hermes and Claude

### Playbook 1: Ticket Triage & First-Line Response
1. When an alert or ticket inquiry arrives:
   - Call `glpi_get_ticket(id=N)` to pull the ticket and its full timeline in a single call.
2. Before answering or proposing a fix:
   - Search the knowledge base using `glpi_search_faq(query="...")` or `glpi_search_knowbase(filter="...")`.
   - If relevant procedures or known solutions exist, quote the solution and cite the article ID.
3. If proposing a follow-up:
   - Draft the followup message and call `glpi_add_ticket_followup(id=N, content="...", is_private=false)`.

### Playbook 2: Recurring Incident to Problem Escalation
1. If multiple tickets report the same symptom (e.g. switch flap, high load, service down):
   - Use `glpi_search_tickets(filter="name=*<keyword>*;status<5")` to find all active related tickets.
   - Use `glpi_search_problems(filter="name=*<keyword>*")` to check if a known Problem already exists.
2. If no Problem exists:
   - Propose creating a Problem record via `glpi_create_problem(input={ name: "...", content: "..." })`.
   - Remind the user of human approval gate before destructive or state-changing actions.

### Playbook 3: Large Result Set Analysis
When a search returns more records than fit comfortably in context:
- The harness saves the response to disk.
- **Do not** write custom Python or shell one-liners to parse the file.
- Delegate to an Explore/Subagent passing the file path, schema, and specific extraction question.

### Playbook 4: Plugin Health & Capability Verification
1. When asked about environment capabilities, inventory status, custom fields, or extensions:
   - Call `glpi_list_plugins()`.
   - Interpret the `state` attribute (real values from GLPI core's `Plugin` class constants, `src/Plugin.php` — **do not assume the "intuitive" 0/1/2 order, it does not match real GLPI**):
     - `state: 1` 🟢 **Enabled / Active** (`ACTIVATED`, operational).
     - `state: 4` 🟡 **Installed / Not Activated** (`NOTACTIVATED`, disabled).
     - `state: 2` ⚪ **Not Installed** (`NOTINSTALLED`).
     - `state: 0` — Discovered, not yet installed (`ANEW`).
     - `state: 3` — Installed, requires configuration (`TOBECONFIGURED`).
     - `state: 5` — Plugin directory missing, DB cleanup needed (`TOBECLEANED`).
     - `state: 6` — Files are for a newer version, update required (`NOTUPDATED`).
     - `state: 7` — Replaced by another plugin (`REPLACED`).
2. Recognize essential plugins:
   - `glpiinventory`: Automatic hardware/software asset discovery and agent reporting.
   - `fields`: Additional custom form fields.
   - `datainjection`: Batch import/export tool.
   - `actualtime` / `activity`: Time tracking and service effort metrics.
   - `financial`: Extended budget, contract, and asset amortization tracking.
   - `dashboard`: ST-Dashboard / Executive KPI reporting.
3. If an action or question depends on a plugin that is in `state: 4` (not activated) or not installed (`state: 2`/`0`), notify the user with the exact status.

---

## Environment Configuration

Ensure the following variables are configured:

```env
# API v2 (Required for Tickets, Problems, Changes, Assets, Admin)
GLPI_BASE_URL=http://<glpi-host>:8080
GLPI_CLIENT_ID=<oauth2_client_id>
GLPI_CLIENT_SECRET=<oauth2_client_secret>
GLPI_USERNAME=<username>
GLPI_PASSWORD=<password>

# API v1 (Required for Knowledge Base tools: glpi_search_knowbase, glpi_get_knowbase_item, glpi_search_faq)
GLPI_API_V1_APP_TOKEN=<app_token>
GLPI_API_V1_USER_TOKEN=<user_token>
```
