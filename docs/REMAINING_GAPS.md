# Remaining gaps and audit ruling

## Blockers

1. Disposable Obsidian activation and real note/folder context-menu execution were not completed because the isolated application remained at its first-run vault chooser.
2. The browser file-picker/import/export/refresh loop has automated contract coverage but no completed manual browser run.
3. Inherited plugin settings still store PostgreSQL connection strings and send them from Obsidian to a helper service. That contradicts the required service-owned credential boundary even though sync defaults off and was not used.
4. The complete-stage command records governed stages, but production provider orchestration does not yet populate all governed fields. It must not be described as a completed semantic analysis.
5. The schema allows many open-ended objects and the browser validator is a security-focused subset, not the same compiled AJV validator used by Obsidian.

## Ruling

**Ready for disposable use only; not ready for a controlled live-vault pilot.**

The candidate/admission boundary is preserved in the new path, and automated build/round-trip checks pass. The runtime UI and credential-boundary blockers must be closed before installation into `01_WORKING`.
