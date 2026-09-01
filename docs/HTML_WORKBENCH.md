# HTML workbench

`web/workbench.html` imports and exports governed JSON without HTML scraping, displays the full record including unknown fields, restricts editing to review state and summary, locks protected discovery/admission fields, and provides Save local draft, Export reviewed JSON, Import governed JSON, and Reset draft. Local storage is draft-only and cannot emit Admitted state.

All six requested Nerve pages were found and preserved byte-for-byte under `web/nerve-source`. External routes converge on the governed workbench. The original 7Q page is a 44-byte placeholder, so its future contract remains unresolved.

The workbench loads its questions and classifications from `web/review-registry.generated.js`, generated from the same versioned TypeScript registry bundled into Obsidian. Run `npm run build:registry` after an intentional registry change; verification compares the generated projection byte-for-meaning against its source.
