---
name: glpi-mcp-v2
description: Analyze GLPI tickets at depth using the new GLPI v2 API. Pick the right MCP tool, pull full ticket content in one shot, and delegate large-result-set analysis to an Explore agent. Use when the user asks about GLPI tickets, requests patterns/themes across tickets, asks "what's happening with X", "find anything related to Y", "tickets this week/month", or invokes /glpi.
---

# glpi-mcp-v2

How to query the GLPI MCP (v2) and deliver in-depth analysis without burning the user's context or resorting to Python scripts.

## Tool selection

The GLPI MCP v2 has several tools. Pick the one that matches the question — don't default to the lowest-level one.

| Question shape | Tool | Notes |
|---|---|---|
| "tickets today" / "tickets this week" / "by category" / "by assignee" | `glpi_search_tickets` | Use RSQL `filter` parameter. |
| Deep analysis across many tickets (need the description text) | `glpi_search_tickets` | Use RSQL `filter`. The response includes named fields. |
| Full context on ONE ticket (timeline, followups, tasks, solutions, documents, logs) | `glpi_get_ticket` | One call replaces multiple. It includes the `timeline` inline. |
| Knowledge base lookup | `glpi_search_knowbase` | |
| Read full knowledge base article | `glpi_get_knowbase_item` | |
| User context (who they are, groups, managed items) | `glpi_get_user_context` | |
| Search for a user | `glpi_search_user` | |
| Assets / Hardware specs | `glpi_list_computers` | Use `include_specs=true` if hardware specs are needed. |

**Field legend for Tickets (API v2.3)**:
Unlike the legacy API, the v2.3 API uses named fields instead of numeric IDs.
Common fields: `id`, `name` (title), `content` (description), `status`, `date_creation`, `closedate`, `urgency`, `impact`, `priority`, `itilcategories_id`, `users_id_recipient`.

**Status codes** (use the emoji when presenting to the user):
- `1` New 🆕 · `2` Assigned 👤 · `3` Planned 📅 · `4` Waiting ⏸️ · `5` Solved ✅ · `6` Closed 🔒

## Rule: never write Python to mine a saved GLPI dump

When a GLPI tool returns more data than fits in context, the harness saves it to disk and returns a file path. **Do not write a Python script, `python -c` one-liner, or `jq` pipeline to analyze that file.** Spawn an Explore agent with the file path and the question.

Python-on-saved-files is unnecessary ceremony. The agent path is shorter, cleaner, and keeps raw JSON out of the main context. The only justified exception is a precise numeric aggregate across thousands of rows where determinism matters — and even then, say so explicitly first.

## Step-by-step for deep analysis across many tickets

Use this flow when the user asks "find anything related to X in GLPI" or "what's going on with Y this month" — anything that needs the ticket **descriptions**, not just titles.

### 1. Pull the data in ONE filtered call

Use `glpi_search_tickets` with RSQL filters. Filter at the MCP layer — date range, category, text — don't pull everything and filter later.

Example criteria (RSQL):
```
name=*ANA Prevention* and date_creation>2026-04-01 and date_creation<2026-05-01
```

Expect the response to exceed token limits and save to disk. That's fine — note the file path.

### 2. Spawn an Explore agent on the saved file

`Agent(subagent_type=Explore)` with a self-contained prompt that includes:
- **File path** (absolute).
- **Schema:** Array of JSON objects, each with named fields (`name`, `content`, `status`, etc.).
- **The actual question** — be specific. Not "summarize this" but "find tickets mentioning a new module called X; quote verbatim; return ids".
- **Output shape:** "under 400 words", named sections, verbatim quotes for key evidence, explicit "nothing found" when applicable.

### 3. Always go broad on the first pass — never narrow-first

Never run a narrow keyword scan and then "broaden if the user asks for more". The first Explore agent prompt must already hunt for direct keyword hits, indirect signals, adjacent systems, generic new-module / rollout signals, and regressions.

## Step-by-step for single-ticket deep dives

When the user asks about ONE ticket:
1. Call `glpi_get_ticket(id=N)`. One call. It returns expanded fields + timeline.
2. **Never** fan out into `glpi_get_ticket_timeline` unless you only need the timeline. Everything is already in the `glpi_get_ticket` response.
3. Quote verbatim from `content` and from the relevant `timeline` entries when explaining what happened.

## Presentation rules

When listing tickets to the user:
- Use the format from the MCP server instructions:
  `HH:MM [<emoji>] — <Status> — #<id> <title> · <category>`
- One ticket per line. No numbered list.
- Bold totals or category counts if the user asked for a breakdown.

When presenting analysis results from an agent:
- Quote verbatim from ticket content for key evidence. Paraphrase loses nuance.
- Include ticket ids so the user can open each in GLPI.
- Group findings by theme (module, site, user, etc.), not chronologically.
- End with a one-line risk verdict if the user asked "what's the situation" — don't volunteer it otherwise.

## Rules

- **Filter at the MCP layer.** Use RSQL filters for `glpi_search_tickets`. Don't pull 1000 tickets and filter locally.
- **Bundled over fan-out.** `glpi_get_ticket` for single tickets; `glpi_search_tickets` for filtered lists.
- **Never write Python to analyze a saved GLPI dump.** Spawn an Explore agent.
- **Never call `glpi_get_ticket_timeline` alongside `glpi_get_ticket`.** The timeline is inlined.
- **Always broad on the first pass.** Never narrow-then-broader.
- **Never paraphrase key evidence.** Verbatim quotes for anything load-bearing.
- **Never skip the emoji/status format** when listing tickets.
