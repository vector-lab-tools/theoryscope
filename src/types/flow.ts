import type { ProvenanceRecord } from "../lib/provenance";
import type { CorpusDocument } from "./corpus";

/** One coarse-graining step, suitable for frontend animation. */
export type FlowStep = {
  step: number;
  k: number;
  labels: number[];                 // n_docs, each entry ∈ [0, k)
  doc_coords_2d: [number, number][]; // n_docs × 2
};

export type CoarseGrainingTrajectoryResponse = {
  documents: CorpusDocument[];
  schedule: number[];
  pca2d_variance: [number, number];
  steps: FlowStep[];
  provenance: ProvenanceRecord;
};

export type BasinEntry = {
  basin_index: number;
  size: number;
  exemplar: CorpusDocument | null;
  members: CorpusDocument[];
  centroid_2d: [number, number];
};

export type FixedPointsResponse = {
  documents: CorpusDocument[];
  schedule: number[];
  n_basins: number;
  basins: BasinEntry[];
  terminal_coords_2d: [number, number][];
  terminal_labels: number[];
  provenance: ProvenanceRecord;
};

export type UniversalityClass = {
  class_index: number;
  size: number;
  members: CorpusDocument[];
  /**
   * Mean cosine similarity between members at their surface (pre-flow)
   * positions. Lower values indicate universality: surface-diverse
   * positions converging on the same terminal basin.
   */
  surface_mean_cosine: number;
};

export type UniversalityClassesResponse = {
  documents: CorpusDocument[];
  schedule: number[];
  n_classes: number;
  classes: UniversalityClass[];
  initial_coords_2d: [number, number][];
  terminal_labels: number[];
  provenance: ProvenanceRecord;
};

export type FlowRequest = {
  corpus: unknown;
  n_steps: number;
  seed: number;
};

/* ------------------------- Operator Spectrum ----------------------------- */

export type ConceptProbe = {
  label: string;
  text: string;
};

export type ConceptSpectrumEntry = {
  index: number;
  label: string;
  text: string;
  baseline_variance: number;
  relevance_score: number;
  ratios_per_step: number[];
};

export type OperatorSpectrumResponse = {
  schedule: number[];
  concepts: ConceptSpectrumEntry[];
  ranked_indices: number[];
  provenance: ProvenanceRecord;
};

/* --------------------------- Temporal RG Flow ---------------------------- */

export type TemporalBinEntry = {
  label: number;
  n_documents: number;
  year_range: [number, number];
};

export type TemporalFlowStep = {
  step: number;
  width: number;
  n_bins: number;
  doc_coords_2d: [number, number][];
  doc_bin_labels: number[];
  bins: TemporalBinEntry[];
};

export type TemporalFlowResponse = {
  documents: CorpusDocument[];
  year_range: { min: number; max: number; span: number };
  schedule: number[];
  pca2d_variance: number[];
  steps: TemporalFlowStep[];
  provenance: ProvenanceRecord;
};
