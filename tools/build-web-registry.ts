import fs from "node:fs";
import path from "node:path";
import { GOVERNED_REVIEW_REGISTRY } from "../src/governance/review-registry";

const output = `/* GENERATED from src/governance/review-registry.ts. Do not edit by hand. */\n` +
  `window.CanonizationReviewRegistry=${JSON.stringify(GOVERNED_REVIEW_REGISTRY, null, 2)};\n`;

fs.writeFileSync(path.join(process.cwd(), "web", "review-registry.generated.js"), output, "utf8");

