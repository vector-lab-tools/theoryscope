import type { ProvenanceRecord } from "../lib/provenance";
import type { CorpusDocument } from "./corpus";

/* ------------------------------- Concept Locator ------------------------- */

export type ConceptNearestDoc = {
  id: string;
  author: string;
  year: number;
  title: string;
  similarity: number;
};

export type ConceptNearestAuthor = {
  author: string;
  similarity: number;
  n_documents: number;
};

export type ConceptEigenComponent = {
  index: number;
  variance_explained: number;
  projection: number;
  abs_cosine: number;
  signed_cosine: number;
};

export type ConceptLocatorResponse = {
  query: { label: string; char_length: number };
  nearest_documents: ConceptNearestDoc[];
  nearest_authors: ConceptNearestAuthor[];
  eigenbasis: {
    best_pc: number;
    per_component: ConceptEigenComponent[];
  };
  provenance: ProvenanceRecord;
};

/* --------------------------- Author Constellation ------------------------ */

export type AuthorMember = {
  id: string;
  year: number;
  title: string;
  coords_2d: [number, number];
};

export type AuthorEntry = {
  author: string;
  n_documents: number;
  centroid_2d: [number, number];
  intra_author_mean_cosine: number;
  mean_spread_2d: number;
  max_spread_2d: number;
  members: AuthorMember[];
};

export type AuthorConstellationResponse = {
  documents: CorpusDocument[];
  pca2d_variance: [number, number];
  all_documents_2d: [number, number][];
  authors: AuthorEntry[];
  author_pair_cosine: {
    names: string[];
    matrix: number[][];
  };
  provenance: ProvenanceRecord;
};

/* ----------------------------- Debated-vs-Computed ----------------------- */

export type DebatePair = {
  label: string;
  pole_a_text: string;
  pole_b_text: string;
  pole_a_label?: string;
  pole_b_label?: string;
};

export type DebateComponentAlignment = {
  pc: number;
  signed_cosine: number;
  abs_cosine: number;
  variance_explained: number;
};

export type DebateResult = {
  index: number;
  label: string;
  pole_a_label: string;
  pole_b_label: string;
  pole_a_text: string;
  pole_b_text: string;
  best_pc: number;
  best_abs_cosine: number;
  best_signed_cosine: number;
  best_variance_explained: number;
  dominance_score: number;
  per_component: DebateComponentAlignment[];
};

export type DebatedVsComputedResponse = {
  pca_variance_explained: number[];
  debates: DebateResult[];
  ranked_indices: number[];
  provenance: ProvenanceRecord;
};
