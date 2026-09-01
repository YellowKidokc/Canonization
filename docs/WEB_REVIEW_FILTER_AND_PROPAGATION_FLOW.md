# Web review filters and propagation flow

The governed workbench now exposes five ordered review panels:

1. neutral discovery;
2. classification and burden;
3. bridge dossier;
4. contradiction and audit;
5. publication and media routing.

The faceted browser filters recovered atoms and review entries by text, object type, classification axis, status, and propagation disposition. The object catalog contains the neutral epistemic object types, the nine independent axes remain separate, and the bridge panel exposes BRQ01–BRQ20.

## Propagation disposition

Every review panel ends with one of four candidate-only dispositions:

- `DO_NOT_PROPAGATE`
- `LOCAL_ONLY`
- `CANDIDATE_REUSABLE`
- `PROPOSE_GOVERNED_PROPAGATION`

`PROPOSE_GOVERNED_PROPAGATION` requires a rationale. Verification receipt IDs may be attached, but the browser does not authenticate them or convert them into authority.

There is deliberately no selectable `CANONICAL_PROPAGATION` value. Canonical propagation is a derived system state requiring an authenticated admission event, applicable receipts, and an active canonical pointer outside this workbench. A mathematically exact definition can therefore be proposed for governed propagation without the HTML interface declaring its theological interpretation, empirical application, or canon standing established.

## Authority and round trip

Review entries are stored under `reviewWorkbench` in governed JSON and preserve unknown fields. Each entry is marked `HUMAN_REVIEW_PROPOSAL_NOT_ADMISSION`. The protected blind-discovery object remains immutable, admission references remain null, and the browser still cannot synchronize a database.

The browser validator enforces the candidate-only propagation enum and rationale requirement. Obsidian's compiled JSON Schema validator independently enforces the same contract on reimport.
