export const toolsRegistry = [
  {
    slug: "seqmelt",
    name: "SeqMelt",
    hook: "See your primers think.",
    category: "Molecular Biology & PCR",
    description: "Calculate melting temperatures (Tm) using Wallace, GC%, and SantaLucia Nearest-Neighbor algorithms. The visualizer maps GC distributions across DNA/RNA sequences dynamically and highlights secondary structure risks like hairpins.",
    icon: "dna"
  },
  {
    slug: "plasmidforge",
    name: "PlasmidForge",
    hook: "Interactive vector map builder.",
    category: "Synthetic Biology",
    description: "Build circular vector maps interactively by pasting sequence data or adding custom features. Features automatic open reading frame (ORF) extraction, restriction enzyme recognition site mapping, and dynamic circular SVG visualization.",
    icon: "circle"
  },
  {
    slug: "codonscope",
    name: "CodonScope",
    hook: "Codon usage analyzer & optimizer.",
    category: "Synthetic Biology",
    description: "Evaluate expression compatibility across multiple hosts including E. coli, human, yeast, CHO, and insect cells. Instantly maps adaptation indices (CAI), flags rare codons, and optimizes sequences for high-expression efficiency.",
    icon: "activity"
  },
  {
    slug: "crisprguide",
    name: "CRISPRGuide",
    hook: "gRNA & PAM site finder.",
    category: "Molecular Biology & PCR",
    description: "Scan genomic targets to design guide RNAs using SpCas9, SaCas9, or Cas12a PAM criteria. Estimates relative on-target efficiency, filters base complementarity, and maps guides onto a linear browser-style layout.",
    icon: "scissors",
    scopeNote: "Preliminary local screening only — does not check genome-wide off-target sites."
  },
  {
    slug: "protcharge",
    name: "ProtCharge",
    hook: "Protein charge & pI calculator.",
    category: "Proteomics & Structural Biology",
    description: "Generate net charge titration curves over pH 0–14 using Henderson-Hasselbalch equations. Calculates precise isoelectric points (pI) via root-finding algorithms, residue composition donut charts, and extinction coefficients.",
    icon: "zap"
  },
  {
    slug: "helixwheel",
    name: "HelixWheel",
    hook: "Alpha helix & hydrophobicity plotter.",
    category: "Proteomics & Structural Biology",
    description: "Map helical wheels and sliding-window hydropathy scores using Kyte-Doolittle, Hopp-Woods, or Eisenberg scales. Calculates the hydrophobic moment to predict amphipathic alpha-helices and membrane topologies.",
    icon: "sun"
  },
  {
    slug: "bufferlab",
    name: "BufferLab",
    hook: "Buffer & solution preparation calculator.",
    category: "Lab Chemistry",
    description: "Quickly compute mass requirements for target molarities, solve C1V1 dilutions, construct serial dilution tables, or evaluate Henderson-Hasselbalch buffer systems. Automatically generates printable lab recipe cards.",
    icon: "droplet"
  },
  {
    slug: "spectrocalc",
    name: "SpectroCalc",
    hook: "Beer-Lambert & growth curve analyzer.",
    category: "Lab Chemistry",
    description: "Compute concentration values from spectroscopic absorbance readings, and fit exponential growth curve regressions to cell density data to calculate doubling times and growth constants.",
    icon: "bar-chart"
  },
  {
    slug: "seqconvert",
    name: "SeqConvert",
    hook: "Universal sequence format converter.",
    category: "Bioinformatics Utilities",
    description: "Translate or transcribe sequence types dynamically. Features six-frame translation alignment and a scanning ORF finder with adjustable threshold filters to capture potential coding fragments.",
    icon: "refresh"
  },
  {
    slug: "alignlite",
    name: "AlignLite",
    hook: "Pairwise sequence aligner.",
    category: "Bioinformatics Utilities",
    description: "Execute global Needleman-Wunsch or local Smith-Waterman pairwise alignments. Generates a classic alignment match track displaying gaps, substitutions, and exact sequence identity metrics.",
    icon: "align"
  },
  {
    slug: "primercheck",
    name: "PrimerCheck",
    hook: "PCR primer analyzer & multiplex checker.",
    category: "Molecular Biology & PCR",
    description: "Evaluate primer pairs or probes for self-dimerization, hetero-dimerization, and internal hairpin loops. Checks for 3' GC clamps, calculates melting temperature disparities, and visualizes binding configurations.",
    icon: "check-circle",
    scopeNote: "Does not perform structural dimer validation or multiplex dimer modeling — check empirically."
  }
];
