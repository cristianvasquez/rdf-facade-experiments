import { useEffect, useState } from "react";
import rdf from "rdf-ext";
import { QueryEngine } from "@comunica/query-sparql-rdfjs-lite";
import { Store, Writer as N3Writer, Parser as N3Parser } from "n3";
import eyeling from "eyeling/eyeling.js";
import { markdownToRdf as remarkToRdf } from "../src/remark-facade.js";
import { markdownToRdf as facadeXToRdf } from "../src/streaming-facade-x.js";

const queryEngine = new QueryEngine();

function quadsToTurtle(quads) {
  return new Promise((resolve, reject) => {
    const w = new N3Writer();
    w.addQuads(quads);
    w.end((err, r) => (err ? reject(err) : resolve(r)));
  });
}

function turtleToDataset(turtle) {
  return new Promise((resolve, reject) => {
    const parser = new N3Parser();
    const quads = [];
    parser.parse(turtle, (err, quad) => {
      if (err) return reject(err);
      if (quad) quads.push(quad);
      else resolve(rdf.dataset(quads));
    });
  });
}

// Two-stage pipeline hook.
// Stage 1 [markdown, example] → facadeDataset
// Stage 2 [facadeDataset, n3rules, sparql, mode] → semanticDataset
// Editing the transform input only re-runs Stage 2.
export function usePipeline({ markdown, sparql, n3rules, example }) {
  const mode = example?.n3rules ? "n3rules" : "sparql";

  const [facadeDataset, setFacadeDataset] = useState(null);
  const [semanticDataset, setSemanticDataset] = useState(null);
  const [error, setError] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  // Stage 1: document → facade RDF
  useEffect(() => {
    let cancelled = false;
    async function run() {
      setIsRunning(true);
      setError(null);
      try {
        let quads;
        if (example.facade === "facade-remark") {
          quads = remarkToRdf(markdown);
        } else {
          quads = await facadeXToRdf(markdown, {
            facade: example.facade,
            useNumbered: example.preserveOrder,
            useRdfsMember: !example.preserveOrder,
          });
        }
        if (!cancelled) setFacadeDataset(rdf.dataset(quads));
      } catch (e) {
        if (!cancelled) setError(e?.message ?? String(e));
      } finally {
        if (!cancelled) setIsRunning(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [markdown, example]); // eslint-disable-line react-hooks/exhaustive-deps

  // Stage 2: facade RDF + transform → semantic RDF
  useEffect(() => {
    if (!facadeDataset) return;
    let cancelled = false;
    async function run() {
      setIsRunning(true);
      setError(null);
      try {
        const facadeQuads = [...facadeDataset];
        if (mode === "n3rules") {
          const factsN3 = await quadsToTurtle(facadeQuads);
          if (cancelled) return;
          const result = eyeling.reasonStream(factsN3 + "\n" + n3rules, {
            includeInputFactsInClosure: false,
          });
          const prefixPreamble = Object.entries(result.prefixes?.map ?? {})
            .map(([p, ns]) => `@prefix ${p}: <${ns}> .`)
            .join("\n");

          // @TODO this playground needs to be completely rebuilt.
          const morePrefixes = `@prefix log: <http://www.w3.org/2000/10/swap/log#>.
@prefix math: <http://www.w3.org/2000/10/swap/math#>.
@prefix dcat: <https://www.w3.org/ns/dcat#>.
@prefix dct: <http://purl.org/dc/terms/>.
@prefix foaf: <http://xmlns.com/foaf/0.1/>.
@prefix : <http://example.org/data#>.
@prefix remark: <http://example.org/remark#>.
@prefix facade: <http://example.org/facade-remark#>.
`;

          const dataset = await turtleToDataset(
            morePrefixes + prefixPreamble + "\n" + (result.closureN3 ?? ""),
          );
          if (!cancelled) setSemanticDataset(dataset);
        } else {
          if (!sparql) {
            if (!cancelled) setSemanticDataset(null);
            return;
          }
          const store = new Store(facadeQuads);
          const qr = await queryEngine.queryQuads(sparql, { sources: [store] });
          const qquads = await qr.toArray();
          if (!cancelled) setSemanticDataset(rdf.dataset(qquads));
        }
      } catch (e) {
        if (!cancelled) setError(e?.message ?? String(e));
      } finally {
        if (!cancelled) setIsRunning(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [facadeDataset, n3rules, sparql, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  return { facadeDataset, semanticDataset, error, isRunning, mode };
}
