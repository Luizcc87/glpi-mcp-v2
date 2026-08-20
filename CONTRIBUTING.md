# Contributing

## Documentation language policy

General rule for free-form docs (guides, READMEs, etc.): **PT-BR is canonical, English is the required translation.**

- `ARQUIVO.md` — Português (Brasil), primary/canonical version.
- `ARQUIVO.en.md` — English translation, kept in sync.
- Cross-link both files at the top (`🌐 [English version](FILE.en.md)` / `🌐 [Versão em Português](FILE.md)`).

Applied today to the README:
- [`README.md`](README.md) — canonical PT-BR.
- [`README.en.md`](README.en.md) — English translation.
- [`README.pt-BR.md`](README.pt-BR.md) — explicit alias of `README.md`, kept identical, for links that need an unambiguous PT-BR path.

**Rule:** any pull request that changes a `.md` doc covered by this policy must update its `.en.md` counterpart (and `README.pt-BR.md`, for the README specifically) in the same PR. A doc change that touches only one language is incomplete and should not be merged until the other version is updated to match.

There is no automated check for this yet (ponytail: manual review only — add a CI diff-check on the paired files if drift becomes a recurring problem).

### Exceptions — English-only, no translation

Some files keep a **fixed name required by tooling**, or are conventionally English-only regardless of team language. Do not create a `.en.md`/translated pair for these:

- **`SKILL.md`** — name and location are fixed; harnesses discover skills by this exact filename. The frontmatter `description` also drives trigger matching — a second, possibly-drifted translation risks breaking discovery. Keep it English-only.
- **`CONTRIBUTING.md`** (this file) — standard OSS convention, English-only, not user-facing content for BR end users.
- **`LICENSE`** — standard license text, never translated.

If a new doc needs a fixed name for tooling reasons, or is purely internal/contributor-facing rather than end-user-facing, treat it as an exception and note why here.
