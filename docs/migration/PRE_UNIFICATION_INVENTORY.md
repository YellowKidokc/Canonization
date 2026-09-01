# Pre-unification inventory

Captured 2026-08-31 before source replacement.

| Repository | Starting commit | Git state | Remote |
|---|---|---|---|
| `D:\GitHub\Canonization` | `827f1c9b8c951f4fdc34b06ee26f841b73e7ee7d` | clean, at origin/main | Semantic AI GitHub remote |
| `D:\GitHub\theophysics-semantic-ai` | `58f614e5bd966c427317119082217e540e42d8f4` | behind origin by one; six untracked `.fisnote` files | Semantic AI GitHub remote |
| `D:\GitHub\nerve` | `427c687af2fe01c941311614ce2687d657ecba53` | clean, one commit ahead of origin/main | Nerve GitHub remote |

Canonization and Semantic AI share Git history; merge-base is Semantic AI HEAD `58f614e`. Target is exactly one later commit (`827f1c9`, candidate canonization taxonomy presets), with 43 tracked files versus 40. Matching ancestry and content prove the target was an evolved Semantic AI copy.

Target tracked inventory comprised root build/instruction/license/package files, manifest/styles, documentation/templates/examples, and TypeScript under `src/ai`, `src/epistemic`, `src/indexing`, `src/tagging`, `src/ui`, plus `main.ts`, `settings.ts`, and `types.ts`. `node_modules` was present but ignored. No target uncommitted/untracked files existed. Source `.fisnote` sidecars were excluded.

Preservation branch: `archive/pre-unified-canonization-20260831-194956`, commit `827f1c9b8c951f4fdc34b06ee26f841b73e7ee7d`, pushed before feature work.
