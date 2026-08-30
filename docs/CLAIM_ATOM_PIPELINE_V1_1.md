# Claim Atom Pipeline v1.1

This repository now carries the human-readable intake assets for the Claim Atom Expansion Canon v1.1.

## Included assets

- `templates/CLAIM_ATOM_EXPANSION_AI_INTAKE_TEMPLATE_v1_1.md` is the full candidate-opening packet.
- `examples/CAND_IAM_001_AXIOMATIC_SELF_PROCLAMATION.md` is a worked candidate-only opening from the I AM declarations paper.

## Intake rule

Start from the whole template. After nondiscriminatory discovery and classification, retain the one applicable object extension and matching register anatomy; remove the inapplicable alternatives. Blank non-load-bearing fields are omitted on import. `OPEN`, `UNKNOWN`, and `NOT_APPLICABLE` are retained as explicit state.

## Authority boundary

Every generated object remains:

```text
CANDIDATE_DRAFT - NOT VALIDATED - NOT ADMITTED
```

The template does not create an admission event, modify a source note, establish a proof, or transfer bridge warrant across registers.

## Implementation status

The installed vault plugin is ahead of this source repository: it includes canonization-oriented categories that are not yet represented in this TypeScript source tree. The next implementation slice is to port those features into source, then add the four staged profiles:

1. blind nondiscriminatory discovery;
2. classification and burden;
3. translation and bridge review;
4. formalization boundary.

That work must write candidate sidecars and receipts, not overwrite source notes or admit records automatically.
