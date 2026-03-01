---
tldr: N3 rules embedded in document frontmatter as an optional alternative to SPARQL CONSTRUCT for the semantic lifting step
---

# N3 Rules Lifting

## Target

Allow documents to use N3 Logic rules (via the `eyeling` reasoner) as an alternative to SPARQL CONSTRUCT for transforming facade RDF into a semantic graph.
Useful when the lifting logic requires backward chaining, negation-as-failure (`log:notIncludes`), or arithmetic builtins — things CONSTRUCT cannot express.

## Behaviour

- When a document's frontmatter contains an `n3rules:` key, the pipeline uses eyeling for lifting instead of Comunica
- When a document contains a `construct:` key, the existing SPARQL CONSTRUCT path is used
- When neither key is present, the pipeline returns the facade graph only (unchanged existing behaviour)
- The facade graph is serialized as N3 (Turtle) and concatenated with the inline rules; `reason({}, facts + "\n" + rules)` produces the output
- Output is Turtle — same role as CONSTRUCT output, loaded as the semantic graph
- Rules may use forward chaining (`=>`) and backward chaining (`<=`)
- `log:notIncludes` provides negation-as-failure; `math:` builtins support arithmetic

## Design

### Rule location
Rules travel in the frontmatter under the `n3rules:` key, co-located with the document — same pattern as CONSTRUCT.

### Execution
`eyeling` wraps the EYE reasoner as a synchronous CJS module.
In an ESM context, access it via `createRequire`:

```js
import { createRequire } from "node:module";
const { reason } = createRequire(import.meta.url)("eyeling");
const output = reason({}, factsN3 + "\n" + rulesN3);
```

Facts are the facade graph serialized to N3/Turtle.
Rules are the raw `n3rules:` string from frontmatter.
Output is a Turtle string representing the derived semantic graph.

### Strategy selection
The pipeline checks frontmatter in order: `n3rules:` → eyeling path; `construct:` → Comunica path; neither → facade only.

## Friction

- `log:notIncludes` (negation-as-failure) is expensive: EYE exhaustively attempts all proofs before failing, scaling poorly with fact volume (~18s for a 1.9 MB facts file)
- eyeling is CJS; ESM callers need `createRequire` — not ergonomic in an otherwise pure ESM codebase
- N3 rules are harder to author than SPARQL for simple projections; CONSTRUCT remains the preferred path for straightforward mappings
- `math:sum` only evaluates left-to-right (bound arguments only); use `math:difference` when the left operand is unknown

## Verification

- Run `reason({}, facts + rules)` against a known facts file and assert expected triples in output
- Confirm `n3rules:` frontmatter routes to eyeling and `construct:` routes to Comunica
- Confirm facade-only documents are unaffected

## Interactions

- Depends on [[spec - facade pipeline - document to structural RDF to semantic RDF via CONSTRUCT]]
- Adds a second lifting path to the same pipeline without removing the CONSTRUCT path

## Mapping

> [[src/process-example.js]]

## Notes

Validated patterns from the `testing-eye` experiment:
- Column arithmetic (`math:difference`) for positional hierarchy is more reliable than `math:sum` when left operand is unknown
- `log:notIncludes` negation scales quadratically — consider partitioning facts by group if performance is critical
- The dominant optimisation for `log:notIncludes`-heavy rules is narrowing the set of candidates early (e.g. restricting `RuleGroup` to a single group → ~7× speedup)
