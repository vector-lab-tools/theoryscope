export type CorpusDocument = {
  id: string;
  author: string;
  year: number;
  title: string;
  tags: string[];
};

export type CorpusMapResponse = {
  documents: CorpusDocument[];
  coords_3d: [number, number, number][];
  variance_explained: number[];
  provenance: import("../lib/provenance").ProvenanceRecord;
};
