"""
Corpus loaders.

Phase 0 uses a hard-coded philosophy-of-technology list so that end-to-end
connectivity can be proved without any Zotero dependency. Later phases will
delegate to the Zotero MCP (discovery) and to a cached ingestion step
(embedding) described in the WORKING.md.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import List


@dataclass
class Document:
    id: str
    author: str
    year: int
    title: str
    text: str                # For Phase 0, the abstract / precis standing in for the work
    tags: List[str] = field(default_factory=list)


# Phase 0: Philosophy of Technology, 20 canonical papers / chapters.
# Texts are short precis drawn from canonical summaries, used solely to prove
# end-to-end connectivity of embedding and visualisation. These are not intended
# as scholarly reproductions of the originals; the real corpus will be ingested
# from Zotero with full-text in Phase 1.
PHILOSOPHY_OF_TECHNOLOGY: List[Document] = [
    Document(
        id="heidegger-1954",
        author="Heidegger, M.",
        year=1954,
        title="The Question Concerning Technology",
        text=(
            "Technology is not a neutral means to an end. It is a mode of revealing, "
            "a way the real appears. Modern technology reveals the world as Bestand, "
            "standing-reserve, material awaiting use. The essence of technology, "
            "das Ge-stell or enframing, orders everything, including human beings, "
            "as calculable resource. The danger is not technical failure but the way "
            "enframing forecloses other modes of revealing. The saving power grows "
            "where the danger is."
        ),
        tags=["classical", "phenomenological"],
    ),
    Document(
        id="ellul-1964",
        author="Ellul, J.",
        year=1964,
        title="The Technological Society",
        text=(
            "Technique is the totality of methods rationally arrived at and having "
            "absolute efficiency in every field of human activity. It is not the sum "
            "of machines but the ensemble of ordered procedures. Technique is autonomous, "
            "self-augmenting, and universal, producing a technical society whose "
            "values, institutions, and subjects are reshaped to serve efficiency. "
            "Politics, art, and ethics are subordinated."
        ),
        tags=["classical", "critical"],
    ),
    Document(
        id="winner-1980",
        author="Winner, L.",
        year=1980,
        title="Do Artifacts Have Politics?",
        text=(
            "Artefacts embody political relations. Technical arrangements can be forms "
            "of order, either by enabling certain patterns of life (the low bridges of "
            "Long Island) or by requiring particular social structures to operate "
            "(nuclear power, large-scale agriculture). Technology is neither neutral "
            "nor autonomous. Design choices inscribe relations of power that persist "
            "through the artefact's life."
        ),
        tags=["political", "empirical"],
    ),
    Document(
        id="ihde-1990",
        author="Ihde, D.",
        year=1990,
        title="Technology and the Lifeworld",
        text=(
            "Human-technology relations take distinct forms: embodiment (the glasses "
            "through which we see), hermeneutic (the instrument we read), alterity "
            "(the technology we face as quasi-other), and background (the infrastructure "
            "that conditions experience unnoticed). Each mode transforms perception "
            "and agency. A post-phenomenology of technology must begin from these "
            "concrete mediations rather than from a metaphysics of enframing."
        ),
        tags=["phenomenological", "post-Heideggerian"],
    ),
    Document(
        id="feenberg-1999",
        author="Feenberg, A.",
        year=1999,
        title="Questioning Technology",
        text=(
            "Technology is a site of social struggle. The critical theory of technology "
            "rejects both the neutrality thesis and technological determinism. Design "
            "encodes values but the coding is contestable. Democratic rationalisation "
            "opens the technical code to subaltern publics. Technology is under-determined "
            "by technical constraint and over-determined by social interest."
        ),
        tags=["critical", "democratic"],
    ),
    Document(
        id="borgmann-1984",
        author="Borgmann, A.",
        year=1984,
        title="Technology and the Character of Contemporary Life",
        text=(
            "The device paradigm separates commodity from machinery. A device delivers "
            "its commodity (warmth, music, food) while concealing the machinery that "
            "produces it. The focal thing gathers a practice: a fireplace gathers "
            "the work of gathering wood, the presence of family, the attention to "
            "weather. Devices displace focal things and dissolve the practices that "
            "bound them. A good life requires focal practices."
        ),
        tags=["phenomenological", "ethical"],
    ),
    Document(
        id="latour-1992",
        author="Latour, B.",
        year=1992,
        title="Where Are the Missing Masses?",
        text=(
            "Non-human actors participate in the social. Door-closers, seatbelts, "
            "speed bumps carry delegated moral programs. What sociology omits when it "
            "tracks only humans is a mass of non-human agency. To describe society "
            "is to describe collectives of humans and non-humans whose competencies "
            "are redistributed. The mundane artefact is a stand-in for norms that "
            "would otherwise need human enforcement."
        ),
        tags=["STS", "empirical"],
    ),
    Document(
        id="verbeek-2005",
        author="Verbeek, P.-P.",
        year=2005,
        title="What Things Do",
        text=(
            "Things are mediators, not tools. A mediation approach extends Ihde and "
            "Latour: artefacts shape how the world is interpreted and how action unfolds. "
            "Moralising technology, designing the mediation explicitly, is a practical "
            "and ethical task. The boundary between subject and object is not the "
            "starting point; it is produced in the mediation."
        ),
        tags=["phenomenological", "ethical"],
    ),
    Document(
        id="stiegler-1998",
        author="Stiegler, B.",
        year=1998,
        title="Technics and Time 1: The Fault of Epimetheus",
        text=(
            "The human is originally technical. Tertiary retention, the externalised "
            "memory carried by tools and inscriptions, constitutes temporality. "
            "Epimetheus's forgetting leaves humanity without proper endowment, and "
            "prosthesis fills the gap. Technics is not a supplement to the human; "
            "it is the condition of the human as a being in time. Proletarianisation "
            "names the loss of knowledge through automation of the retention that "
            "constituted it."
        ),
        tags=["critical", "phenomenological"],
    ),
    Document(
        id="simondon-1958",
        author="Simondon, G.",
        year=1958,
        title="On the Mode of Existence of Technical Objects",
        text=(
            "Technical objects have a genetic existence. They evolve through "
            "concretisation: the progressive integration of functions within a single "
            "material structure. The abstract object is a patchwork; the concrete "
            "object achieves functional overdetermination. Human culture has "
            "misrecognised the technical object, treating it either as pure instrument "
            "or as alienating monster. A true humanism recognises the technical "
            "individual on its own terms."
        ),
        tags=["classical", "ontological"],
    ),
    Document(
        id="mumford-1934",
        author="Mumford, L.",
        year=1934,
        title="Technics and Civilization",
        text=(
            "Civilisations pass through technical phases: eotechnic (water, wood, wind), "
            "paleotechnic (coal, iron, steam), neotechnic (electricity, alloy, synthetic). "
            "The machine is a product of aesthetic and moral discipline as much as of "
            "mechanical ingenuity. The clock, not the steam engine, is the paradigmatic "
            "modern machine. Time-discipline and abstract measure precede and condition "
            "the industrial transformation."
        ),
        tags=["classical", "historical"],
    ),
    Document(
        id="mitcham-1994",
        author="Mitcham, C.",
        year=1994,
        title="Thinking Through Technology",
        text=(
            "Philosophy of technology splits into engineering philosophy of technology "
            "(from inside the practice) and humanities philosophy of technology "
            "(from outside). A synthesis requires attending to technology as object, "
            "as knowledge, as activity, and as volition. Only this fourfold analysis "
            "lets philosophy do justice to what engineers make and what that making "
            "does to the rest of us."
        ),
        tags=["survey", "methodological"],
    ),
    Document(
        id="dusek-2006",
        author="Dusek, V.",
        year=2006,
        title="Philosophy of Technology: An Introduction",
        text=(
            "Definitions of technology oscillate between technology as hardware, as "
            "rules, and as system. Each captures something and misses something. "
            "The field contains autonomous-technology, social-construction, and "
            "phenomenological traditions that disagree on the metaphysics of the "
            "technical but converge on the importance of the question."
        ),
        tags=["survey", "introductory"],
    ),
    Document(
        id="coeckelbergh-2020",
        author="Coeckelbergh, M.",
        year=2020,
        title="Introduction to Philosophy of Technology",
        text=(
            "Contemporary philosophy of technology ranges over AI, biotechnology, "
            "climate engineering, and digital media. Ethical, political, and "
            "existential questions sit alongside older metaphysical ones. The "
            "post-phenomenological tradition supplies concrete analyses of how "
            "specific technologies mediate specific practices. The normative task "
            "is to guide design in light of these mediations."
        ),
        tags=["survey", "contemporary"],
    ),
    Document(
        id="jonas-1979",
        author="Jonas, H.",
        year=1979,
        title="The Imperative of Responsibility",
        text=(
            "Modern technology enlarges the scope of human action to planetary and "
            "intergenerational scales. Traditional ethics, addressed to face-to-face "
            "relations, cannot reach this scope. An imperative of responsibility "
            "directed toward the future, and to the very possibility of future human "
            "life, becomes necessary. Heuristics of fear supplement heuristics of hope."
        ),
        tags=["ethical", "continental"],
    ),
    Document(
        id="kaplan-2004",
        author="Kaplan, D. M.",
        year=2004,
        title="Readings in the Philosophy of Technology (editor's introduction)",
        text=(
            "Philosophy of technology coheres around a shared set of questions: the "
            "definition of the technical, the values encoded in design, the politics "
            "of technical systems, and the ethics of technological change. The field "
            "is plural in method but convergent in questions. An anthology maps the "
            "convergence without collapsing the difference."
        ),
        tags=["survey", "pedagogical"],
    ),
    Document(
        id="berry-2011",
        author="Berry, D. M.",
        year=2011,
        title="The Philosophy of Software",
        text=(
            "Software is a philosophical object. It materialises ideas, it governs "
            "practices, and it mediates the experience of the world. Code is read, "
            "executed, and circulated; each mode has its own hermeneutics. The "
            "computational turn demands that philosophy extend its vocabulary to "
            "grammatisation, streams, real-time flows, and the mediated subject. "
            "Software studies is philosophy of technology in its present concretion."
        ),
        tags=["contemporary", "software"],
    ),
    Document(
        id="hui-2016",
        author="Hui, Y.",
        year=2016,
        title="On the Existence of Digital Objects",
        text=(
            "Digital objects have modes of existence distinct from Simondon's technical "
            "objects and from Heidegger's equipment. They are relational, discretised, "
            "and located within networks of data. Metadata is constitutive. A "
            "philosophy of digital objects must trace their individuation through "
            "schemes, schemas, and infrastructures, without reducing them to either "
            "hardware or meaning."
        ),
        tags=["contemporary", "post-phenomenological"],
    ),
    Document(
        id="chun-2011",
        author="Chun, W. H. K.",
        year=2011,
        title="Programmed Visions",
        text=(
            "Software projects the fantasy of sovereign subjects controlling objects. "
            "Source code is an afterthought, not an origin; the execution precedes "
            "the ideology of the source. Programmability and programmability's "
            "ideology structure what users imagine themselves to do. The computer "
            "is a memory machine that promises what it cannot deliver: transparent "
            "control over what has already executed."
        ),
        tags=["contemporary", "critical"],
    ),
    Document(
        id="galloway-2004",
        author="Galloway, A. R.",
        year=2004,
        title="Protocol",
        text=(
            "Control after decentralisation operates through protocol. TCP/IP and DNS "
            "distribute authority through standards rather than through sovereigns. "
            "Protocological control is not the end of control; it is its reformation. "
            "The network is not free by virtue of being distributed. Protocol is the "
            "name of the new form of power, consonant with Deleuze's societies of "
            "control but materialised in technical documents."
        ),
        tags=["contemporary", "critical"],
    ),
]


def get_phase_zero_corpus() -> List[Document]:
    """Return the Phase 0 hard-coded corpus of 20 philosophy-of-technology texts."""
    return list(PHILOSOPHY_OF_TECHNOLOGY)


def document_to_dict(doc: Document) -> dict:
    return asdict(doc)
