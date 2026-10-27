---
title: Operations guide
layout: default
---

# Operations guide

Theoryscope is organised into three operational tab groups — **Inspect**, **Flow**, **Critique** — plus two cross-cutting features, **Annotations** and **Atlas**. This page gives one worked example per group so you can see what each is for. The [README](https://github.com/vector-lab-tools/theoryscope#operations-at-a-glance) has the full list.

## Before you start

Every operation runs against a loaded corpus. For a first-time run, use the built-in **Phase 0** demo (20 documents in philosophy of technology): click **Load Phase 0 Corpus** on the landing page.

For your own corpus, follow the [Zotero API key walkthrough](zotero-api-key.md) first.

## Inspect — "What does the field look like?"

### Worked example: Corpus Map + Eigendirections

1. Load a corpus (Phase 0, or your own Zotero collection).
2. Open the **Inspect** tab. The **Corpus Map** renders every document as a point in a 3D PCA projection, coloured by year and labelled by author. Rotate the cloud by dragging.
3. Open the **Eigendirections** panel below. Each principal component is annotated with the documents that load most positively and most negatively on it. Those paired lists *are* the axis.
4. Open the **Debated vs Computed** panel. Enter an opposition the field is said to be structured by (e.g. *autonomous technology* vs *socially constructed technology*). Theoryscope embeds both poles, builds a direction vector, and reports which computed principal component is most aligned with it, with a dominance score. The gap between the debated axis and the computed one is diagnostic.

![Corpus Map with Eigendirections panel open](images/op-corpus-map.png)

**Reading the result.** A debated opposition that lands cleanly on PC1 is a field whose self-description matches its geometry. A debated opposition that scatters across PC3, PC5, and PC7 is a field whose critical self-image and whose actual positional structure diverge. The second case is more common and more interesting.

## Flow — "What survives abstraction?"

### Worked example: Coarse-Graining Trajectory + Fixed Point Finder + Universality Classes

1. From a loaded corpus, open the **Flow** tab.
2. The **Coarse-Graining Trajectory** panel shows a log-spaced schedule from the full corpus down to two clusters. Click Play to animate how documents move as the aggregative operator (progressive k-means) runs through each step. Pause on any step to inspect the intermediate state.
3. The **Fixed Point Finder** panel reports the terminal basins. Each basin has a population, an exemplar document (the member closest to the centroid), and a full member list. Click a basin to highlight its members on the map.
4. The **Universality Class Finder** panel ranks classes by ascending surface mean cosine. The classes at the top are the ones whose members looked different on the surface but converged on the same basin: those are the universality-class findings worth reading.

![Flow panels with the trajectory animated at step 4](images/op-flow.png)

**Reading the result.** A fixed point whose members are all from the same decade is a historical artefact. A fixed point whose members span the full time range and whose surface vocabulary differs is a candidate for a genuine structural operator in the field.

## Critique — "Would this result survive a different embedding?"

### Worked example: Embedding Dependence Probe + Perturbation Test + Forgetting Curve

1. With a corpus loaded, open the **Critique** tab.
2. In the **Embedding Dependence Probe** panel, pick a second embedding model from the shortlist (MPNet, BGE). Theoryscope re-embeds the whole corpus under the second model, aligns the two bases via per-document projections, and reports per-component agreement. The overall stability score sits at the top of the panel.
3. In the **Perturbation Test** panel, add one out-of-field document (there are three curated probes to choose from if you have not got one to hand). Theoryscope re-embeds that one row, recomputes the eigenbasis, and reports per-component rotation.
4. In the **Forgetting Curve** panel, click Run. Theoryscope bootstraps: 20 iterations, each dropping 20% of the corpus at random, recomputing the eigenbasis, aligning to the baseline. Per-component mean, standard deviation, and interquartile range are reported.

![Critique panels with the Embedding Dependence Probe open](images/op-critique.png)

**Reading the result.** A finding that holds under re-embedding, under a one-document perturbation, and across 20 bootstrap resamples is a result you can cite. A finding that moves under any of those three is a finding about the measurement apparatus, not about the field.

## Corpus-vs-Model Probe — the reflexive operation

This is Theoryscope asking a question about itself. Compare the eigendirections of a theoretical corpus against the eigendirections of an open-weight *generative* model (SmolLM2 or GPT-2) trained on something plausibly like that corpus. Procrustes or CCA alignment separates **agreement** (axes the model preserved), **disagreement** (axes the corpus has that the model does not), and **delta directions** (axes the model added from its broader training).

The first run downloads the generative model from HuggingFace (~300 MB – 1.5 GB depending on model). Subsequent runs are offline and cached.

![The Corpus-vs-Model Probe panel after a run](images/op-corpus-vs-model.png)

## Exports and provenance

Every live operation has an **Export** button in the deep-dive panel. The exported JSON carries the full provenance record: corpus hash, document IDs, embedding model and dimension, chunking spec, operator and its parameters, ingestion timestamp. That record is what makes a Theoryscope result citable.

![An exported JSON provenance block](images/provenance-record.png)

## Where to go next

- [Troubleshooting](troubleshooting.md) for common errors.
- The [full README](https://github.com/vector-lab-tools/theoryscope#readme) for the design rationale and the complete list of 17 live operations.
