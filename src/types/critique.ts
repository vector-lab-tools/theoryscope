import type { ProvenanceRecord } from "../lib/provenance";
import type { CorpusDocument } from "./corpus";

/* ------------------------ Embedding Dependence Probe --------------------- */

export type EmbeddingModelInfo = {
  model_id: string;
  label: string;
  dimension: number;
};

export type ProbeLoading = {
  id: string;
  author: string;
  year: number;
  title: string;
  score: number;
  pole: "positive" | "negative";
};

export type ProbeBasis = {
  model_id: string;
  dimension: number;
  variance_explained: number[];
  loadings: ProbeLoading[][]; // per-component, ranked [+pos..., -neg...]
};

export type ComponentMatch = {
  a_index: number;
  b_index: number;
  abs_cosine: number;
  signed_cosine: number;
};

export type AlignmentPayload = {
  matches: ComponentMatch[];
  per_component: number[];
  stability: number;
  per_component_rotation?: number[];
  ranked_by_rotation?: number[];
};

export type EmbeddingProbeResponse = {
  documents: CorpusDocument[];
  baseline: ProbeBasis;
  probe: ProbeBasis;
  alignment: AlignmentPayload;
  provenance: ProvenanceRecord;
};

/* ---------------------------- Perturbation Test -------------------------- */

export type PerturbationResponse = {
  documents: CorpusDocument[];
  baseline: { variance_explained: number[] };
  perturbed: { variance_explained: number[] };
  alignment: AlignmentPayload;
  probe: {
    label: string;
    char_length: number;
    projection_on_perturbed_basis: number[];
  };
  provenance: ProvenanceRecord;
};

/* --------------------------- Forgetting Curve ---------------------------- */

export type ForgettingCurveResponse = {
  documents: CorpusDocument[];
  n_components: number;
  n_iterations: number;
  drop_fraction: number;
  per_pc_mean: number[];
  per_pc_std: number[];
  per_pc_p25: number[];
  per_pc_p75: number[];
  per_pc_min: number[];
  per_iteration: number[][]; // (n_iterations, n_components)
  per_iteration_stability: number[];
  overall_stability: number;
  provenance: ProvenanceRecord;
};

/* ----------------------------- Symmetry Breaking ------------------------- */

export type SymmetryGroupEntry = {
  label: string;
  n_documents: number;
  centroid_2d: [number, number];
};

export type SymmetryDocumentEntry = CorpusDocument & {
  group: string;
  coords_2d: [number, number];
};

export type SymmetryComponentAlignment = {
  pc: number;
  variance_explained: number;
  signed_cosine: number;
  abs_cosine: number;
};

export type SymmetryBreakingResponse = {
  splitter: string;
  threshold: number | null;
  groups: SymmetryGroupEntry[];
  documents: SymmetryDocumentEntry[];
  pca2d_variance: [number, number];
  silhouette_score: number;
  f_statistic: number;
  between_variance: number;
  within_variance: number;
  best_pc: number;
  per_component: SymmetryComponentAlignment[];
  provenance: ProvenanceRecord;
};

/* -------------------------------- Phase Diagram -------------------------- */

export type PhaseDocument = {
  id: string;
  author: string;
  year: number;
  title: string;
  initial_2d: [number, number];
  terminal_2d: [number, number];
  basin: number;
};

export type PhaseBasin = {
  basin_index: number;
  n_members: number;
  fixed_point_2d: [number, number];
  hull_2d: [number, number][];
  members: number[];
};

export type PhaseDiagramResponse = {
  documents: PhaseDocument[];
  basins: PhaseBasin[];
  n_basins: number;
  schedule: number[];
  pca2d_variance: [number, number];
  provenance: ProvenanceRecord;
};

/* --------------------------- Translated Corpus Probe --------------------- */

export type TranslationLanguage = {
  code: string;
  label: string;
  model_id: string;
};

export type TranslationSample = {
  id: string;
  author: string;
  year: number;
  title: string;
  original_text: string;
  translated_text: string;
};

export type TranslationProbeResponse = {
  target_lang: string;
  language_label: string;
  translation_model_id: string;
  cache_hit: boolean;
  baseline_variance_explained: number[];
  translated_variance_explained: number[];
  alignment: AlignmentPayload;
  samples: TranslationSample[];
  provenance: ProvenanceRecord;
};
