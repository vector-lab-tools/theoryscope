/**
 * Frontend mirror of `backend/corpus/pipeline.py` corpus specs.
 *
 * The shape sent to the backend in the `corpus` field of every request
 * body. Exactly one of `hardcoded_name` or `zotero` is expected to be set
 * in a given request.
 */

export type ZoteroSourcePayload = {
  library_id: string;
  library_type: "user" | "group";
  api_key: string;
  collection_key: string;
  collection_name?: string;
};

export type CorpusSourcePayload = {
  hardcoded_name?: string;
  zotero?: ZoteroSourcePayload;
};

export type ZoteroCollection = {
  key: string;
  name: string;
  parent_key: string | null;
  num_items: number;
};

export const PHASE_ZERO_CORPUS_NAME = "philosophy-of-technology-v1";
