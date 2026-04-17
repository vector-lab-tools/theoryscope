import type { ProvenanceRecord } from "../lib/provenance";
import type { CorpusDocument } from "./corpus";

export type EigenLoading = {
  id: string;
  author: string;
  year: number;
  title: string;
  score: number;
};

export type EigenComponent = {
  index: number;
  variance_explained: number;
  eigenvalue: number;
  positive_loadings: EigenLoading[];
  negative_loadings: EigenLoading[];
  /** Per-document projection on this component (n_docs long). */
  coords: number[];
};

export type EigendirectionsResponse = {
  documents: CorpusDocument[];
  components: EigenComponent[];
  total_variance_explained: number;
  provenance: ProvenanceRecord;
};

export type EigendirectionsRequest = {
  corpus_name: string;
  n_components: number;
  n_loadings: number;
};
