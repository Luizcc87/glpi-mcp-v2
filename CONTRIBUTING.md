# Contributing

## Documentation language policy

This project maintains the README in **two languages**, kept in sync:

- [`README.md`](README.md) — Português (Brasil), primary/canonical version.
- [`README.en.md`](README.en.md) — English translation.
- [`README.pt-BR.md`](README.pt-BR.md) — explicit alias of `README.md`, kept identical, for links that need an unambiguous PT-BR path.

**Rule:** any pull request that changes `README.md` must update `README.en.md` (and `README.pt-BR.md`) in the same PR. A README change that touches only one language is incomplete and should not be merged until the other version is updated to match.

There is no automated check for this yet (ponytail: manual review only — add a CI diff-check on the three files if drift becomes a recurring problem).
