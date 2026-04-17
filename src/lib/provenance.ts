/**
 * Frontend-side provenance types. Mirror of the backend ProvenanceRecord
 * in `backend/corpus/provenance.py`. Keep the two in sync.
 */

export type CorpusSource = {
  kind: "hardcoded" | "zotero" | "file";
  identifier: string;
  filters: Record<string, unknown>;
};

export type ChunkingSpec = {
  strategy: "paragraph" | "token_window" | "none";
  max_tokens: number;
  overlap: number;
};

export type EmbeddingSpec = {
  model_id: string;
  model_revision: string;
  dimension: number;
};

export type OperatorSpec = {
  name: string;
  params: Record<string, unknown>;
};

export type ProvenanceRecord = {
  corpus_source: CorpusSource;
  document_ids: string[];
  ingestion_timestamp: string;
  embedding: EmbeddingSpec;
  chunking: ChunkingSpec;
  operation: string;
  operator: OperatorSpec;
  stability_score: number | null;
  notes: string;
  corpus_hash: string;
};
