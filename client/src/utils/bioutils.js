// Nucleotide complement maps (DNA and RNA)
export const NUCLEOTIDE_COMPLEMENT = {
  A: 'T', T: 'A', G: 'C', C: 'G', U: 'A',
  a: 't', t: 'a', g: 'c', c: 'g', u: 'a',
  N: 'N', n: 'n', R: 'Y', Y: 'R', S: 'S', W: 'W', K: 'M', M: 'K', B: 'V', V: 'B', D: 'H', H: 'D'
};

// SantaLucia 1998 Nearest-Neighbor parameters for DNA/DNA duplexes
// Delta H (kcal/mol) and Delta S (cal/mol·K)
export const NN_THERMODYNAMICS = {
  // Dinucleotide pairs (5'->3' / 3'->5')
  AA: { dh: -7.9, ds: -22.2 }, TT: { dh: -7.9, ds: -22.2 }, // AA/TT
  AT: { dh: -7.2, ds: -20.4 },
  TA: { dh: -7.2, ds: -21.3 },
  CA: { dh: -8.5, ds: -22.7 }, TG: { dh: -8.5, ds: -22.7 }, // CA/GT
  GT: { dh: -8.4, ds: -22.4 }, AC: { dh: -8.4, ds: -22.4 }, // GT/CA
  CT: { dh: -7.8, ds: -21.0 }, AG: { dh: -7.8, ds: -21.0 }, // CT/GA
  GA: { dh: -8.2, ds: -22.2 }, TC: { dh: -8.2, ds: -22.2 }, // GA/CT
  CG: { dh: -10.6, ds: -27.2 },
  GC: { dh: -9.8, ds: -24.4 },
  GG: { dh: -8.0, ds: -19.9 }, CC: { dh: -8.0, ds: -19.9 }, // GG/CC
  // Initiation parameters
  init_GC: { dh: 0.1, ds: -2.8 },
  init_AT: { dh: 2.3, ds: 4.1 },
  // Symmetry correction (for self-complementary sequences)
  symmetry: { dh: 0, ds: -1.4 }
};

// Standard genetic code: 64 codons mapped to amino acids (1-letter, 3-letter, name)
export const STANDARD_GENETIC_CODE = {
  TTT: { symbol: 'F', name: 'Phe' }, TTC: { symbol: 'F', name: 'Phe' },
  TTA: { symbol: 'L', name: 'Leu' }, TTG: { symbol: 'L', name: 'Leu' },
  CTT: { symbol: 'L', name: 'Leu' }, CTC: { symbol: 'L', name: 'Leu' },
  CTA: { symbol: 'L', name: 'Leu' }, CTG: { symbol: 'L', name: 'Leu' },
  ATT: { symbol: 'I', name: 'Ile' }, ATC: { symbol: 'I', name: 'Ile' },
  ATA: { symbol: 'I', name: 'Ile' }, ATG: { symbol: 'M', name: 'Met' }, // Start
  GTT: { symbol: 'V', name: 'Val' }, GTC: { symbol: 'V', name: 'Val' },
  GTA: { symbol: 'V', name: 'Val' }, GTG: { symbol: 'V', name: 'Val' },
  TCT: { symbol: 'S', name: 'Ser' }, TCC: { symbol: 'S', name: 'Ser' },
  TCA: { symbol: 'S', name: 'Ser' }, TCG: { symbol: 'S', name: 'Ser' },
  CCT: { symbol: 'P', name: 'Pro' }, CCC: { symbol: 'P', name: 'Pro' },
  CCA: { symbol: 'P', name: 'Pro' }, CCG: { symbol: 'P', name: 'Pro' },
  ACT: { symbol: 'T', name: 'Thr' }, ACC: { symbol: 'T', name: 'Thr' },
  ACA: { symbol: 'T', name: 'Thr' }, ACG: { symbol: 'T', name: 'Thr' },
  GCT: { symbol: 'A', name: 'Ala' }, GCC: { symbol: 'A', name: 'Ala' },
  GCA: { symbol: 'A', name: 'Ala' }, GCG: { symbol: 'A', name: 'Ala' },
  TAT: { symbol: 'Y', name: 'Tyr' }, TAC: { symbol: 'Y', name: 'Tyr' },
  TAA: { symbol: '*', name: 'Stop' }, TAG: { symbol: '*', name: 'Stop' },
  CAT: { symbol: 'H', name: 'His' }, CAC: { symbol: 'H', name: 'His' },
  CAA: { symbol: 'Q', name: 'Gln' }, CAG: { symbol: 'Q', name: 'Gln' },
  AAT: { symbol: 'N', name: 'Asn' }, AAC: { symbol: 'N', name: 'Asn' },
  AAA: { symbol: 'K', name: 'Lys' }, AAG: { symbol: 'K', name: 'Lys' },
  GAT: { symbol: 'D', name: 'Asp' }, GAC: { symbol: 'D', name: 'Asp' },
  GAA: { symbol: 'E', name: 'Glu' }, GAG: { symbol: 'E', name: 'Glu' },
  TGT: { symbol: 'C', name: 'Cys' }, TGC: { symbol: 'C', name: 'Cys' },
  TGA: { symbol: '*', name: 'Stop' }, TGG: { symbol: 'W', name: 'Trp' },
  CGT: { symbol: 'R', name: 'Arg' }, CGC: { symbol: 'R', name: 'Arg' },
  CGA: { symbol: 'R', name: 'Arg' }, CGG: { symbol: 'R', name: 'Arg' },
  AGT: { symbol: 'S', name: 'Ser' }, AGC: { symbol: 'S', name: 'Ser' },
  AGA: { symbol: 'R', name: 'Arg' }, AGG: { symbol: 'R', name: 'Arg' },
  GGT: { symbol: 'G', name: 'Gly' }, GGC: { symbol: 'G', name: 'Gly' },
  GGA: { symbol: 'G', name: 'Gly' }, GGG: { symbol: 'G', name: 'Gly' }
};

// Helper for mapping RNA codons (replacing U with T)
export const rnaCodon = (codon) => {
  return codon.toUpperCase().replace(/U/g, 'T');
};

// Monoisotopic and average residue masses for the 20 standard amino acids (minus H2O)
export const AMINO_ACID_MASSES = {
  A: { mono: 71.03711, avg: 71.08 },
  R: { mono: 156.10111, avg: 156.19 },
  N: { mono: 114.04293, avg: 114.10 },
  D: { mono: 115.02694, avg: 115.09 },
  C: { mono: 103.00919, avg: 103.14 },
  E: { mono: 129.04259, avg: 129.12 },
  Q: { mono: 128.05858, avg: 128.13 },
  G: { mono: 57.02146, avg: 57.05 },
  H: { mono: 137.05891, avg: 137.14 },
  I: { mono: 113.08406, avg: 113.16 },
  L: { mono: 113.08406, avg: 113.16 },
  K: { mono: 128.09496, avg: 128.17 },
  M: { mono: 131.04049, avg: 131.20 },
  F: { mono: 147.06841, avg: 147.18 },
  P: { mono: 97.05276, avg: 97.12 },
  S: { mono: 87.03203, avg: 87.08 },
  T: { mono: 101.04768, avg: 101.11 },
  W: { mono: 186.07931, avg: 186.21 },
  Y: { mono: 163.06333, avg: 163.18 },
  V: { mono: 99.06841, avg: 99.12 }
};

// pKa values for ionizable side chains + termini
export const AMINO_ACID_PKA = {
  N_terminus: 9.6, // generic alpha-amino
  C_terminus: 2.34, // generic alpha-carboxyl
  D: 3.86, // Aspartic Acid
  E: 4.25, // Glutamic Acid
  H: 6.0,  // Histidine
  C: 8.33, // Cysteine
  Y: 10.07,// Tyrosine
  K: 10.53,// Lysine
  R: 12.48 // Arginine
};

// Hydrophobicity scales
export const KYTE_DOOLITTLE_SCALE = {
  A: 1.8, R: -4.5, N: -3.5, D: -3.5, C: 2.5, Q: -3.5, E: -3.5, G: -0.4, H: -3.2, I: 4.5,
  L: 3.8, K: -3.9, M: 1.9, F: 2.8, P: -1.6, S: -0.8, T: -0.7, W: -0.9, Y: -1.3, V: 4.2
};

export const HOPP_WOODS_SCALE = {
  A: -0.5, R: 3.0, N: 0.2, D: 3.0, C: -1.0, Q: 0.2, E: 3.0, G: 0.0, H: -0.5, I: -1.8,
  L: -1.8, K: 3.0, M: -1.3, F: -2.5, P: 0.0, S: 0.3, T: -0.4, W: -3.4, Y: -2.3, V: -1.5
};

export const EISENBERG_SCALE = {
  A: 0.62, R: -2.53, N: -0.78, D: -0.90, C: 0.29, Q: -0.85, E: -0.74, G: 0.48, H: -0.40, I: 1.38,
  L: 1.06, K: -1.50, M: 0.64, F: 1.19, P: 0.12, S: 0.60, T: 0.70, W: 0.81, Y: 0.26, V: 1.08
};

// Host codon usage table frequencies (per 1000)
// Extracted from standard databases like CUTG
export const CODON_USAGE_TABLES = {
  'E. coli K12': {
    TTT: 22.0, TTC: 16.5, TTA: 13.8, TTG: 13.3, CTT: 11.2, CTC: 10.7, CTA: 3.8, CTG: 52.3,
    ATT: 30.2, ATC: 24.8, ATA: 4.3, ATG: 27.6, GTT: 25.8, GTC: 15.0, GTA: 10.8, GTG: 26.0,
    TCT: 8.6, TCC: 8.8, TCA: 7.2, TCG: 8.7, CCT: 7.1, CCC: 5.3, CCA: 8.3, CCG: 23.0,
    ACT: 8.9, ACC: 23.2, ACA: 7.0, ACG: 14.2, GCT: 15.3, GCC: 25.2, GCA: 20.3, GCG: 33.1,
    TAT: 16.1, TAC: 12.2, TAA: 2.0, TAG: 0.3, CAT: 12.8, CAC: 9.6, CAA: 15.1, CAG: 28.8,
    AAT: 18.0, AAC: 21.6, AAA: 33.6, AAG: 12.1, GAT: 32.2, GAC: 19.3, GAA: 39.5, GAG: 17.8,
    TGT: 5.1, TGC: 6.4, TGA: 1.0, TGG: 15.1, CGT: 20.7, CGC: 21.6, CGA: 3.5, CGG: 5.3,
    AGT: 8.9, AGC: 15.7, AGA: 2.1, AGG: 1.2, GGT: 24.4, GGC: 28.5, GGA: 7.9, GGG: 10.8
  },
  'S. cerevisiae': {
    TTT: 26.1, TTC: 18.4, TTA: 26.2, TTG: 27.2, CTT: 12.3, CTC: 5.4, CTA: 13.4, CTG: 10.5,
    ATT: 30.1, ATC: 17.2, ATA: 17.8, ATG: 20.9, GTT: 22.1, GTC: 11.8, GTA: 10.9, GTG: 10.8,
    TCT: 23.5, TCC: 14.2, TCA: 18.7, TCG: 8.6, CCT: 13.5, CCC: 6.8, CCA: 18.3, CCG: 5.3,
    ACT: 20.3, ACC: 12.7, ACA: 17.8, ACG: 8.0, GCT: 21.2, GCC: 12.6, GCA: 16.2, GCG: 6.2,
    TAT: 18.8, TAC: 14.8, TAA: 1.1, TAG: 0.5, CAT: 13.6, CAC: 7.8, CAA: 27.3, CAG: 12.1,
    AAT: 35.7, AAC: 24.8, AAA: 41.9, AAG: 30.8, GAT: 37.6, GAC: 20.2, GAA: 45.6, GAG: 19.2,
    TGT: 8.0, TGC: 4.8, TGA: 0.7, TGG: 10.4, CGT: 6.4, CGC: 2.6, CGA: 3.0, CGG: 1.7,
    AGT: 14.2, AGC: 9.8, AGA: 21.3, AGG: 9.2, GGT: 23.9, GGC: 9.8, GGA: 10.9, GGG: 6.0
  },
  'Homo sapiens': {
    TTT: 17.6, TTC: 20.3, TTA: 7.7, TTG: 12.9, CTT: 13.2, CTC: 19.6, CTA: 7.2, CTG: 39.6,
    ATT: 16.0, ATC: 20.8, ATA: 7.5, ATG: 22.0, GTT: 11.0, GTC: 14.5, GTA: 7.1, GTG: 28.1,
    TCT: 15.2, TCC: 17.7, TCA: 12.2, TCG: 4.4, CCT: 17.5, CCC: 19.8, CCA: 16.9, CCG: 6.9,
    ACT: 13.1, ACC: 18.9, ACA: 15.1, ACG: 6.1, GCT: 18.4, GCC: 27.7, GCA: 15.8, GCG: 7.4,
    TAT: 12.2, TAC: 15.3, TAA: 1.0, TAG: 0.8, CAT: 10.9, CAC: 15.1, CAA: 12.3, CAG: 34.2,
    AAT: 17.0, AAC: 19.1, AAA: 24.4, AAG: 31.9, GAT: 21.8, GAC: 25.1, GAA: 29.0, GAG: 39.6,
    TGT: 10.6, TGC: 12.6, TGA: 1.6, TGG: 13.2, CGT: 4.5, CGC: 10.4, CGA: 6.2, CGG: 11.4,
    AGT: 12.1, AGC: 19.5, AGA: 12.2, AGG: 12.0, GGT: 10.8, GGC: 22.2, GGA: 16.5, GGG: 16.5
  },
  'CHO cells': {
    TTT: 17.5, TTC: 21.0, TTA: 7.2, TTG: 13.5, CTT: 13.0, CTC: 19.8, CTA: 7.0, CTG: 40.5,
    ATT: 15.8, ATC: 21.5, ATA: 7.0, ATG: 22.5, GTT: 10.8, GTC: 15.0, GTA: 6.8, GTG: 29.0,
    TCT: 14.8, TCC: 18.0, TCA: 11.8, TCG: 4.6, CCT: 17.2, CCC: 20.2, CCA: 16.5, CCG: 7.2,
    ACT: 12.8, ACC: 19.5, ACA: 14.8, ACG: 6.3, GCT: 18.0, GCC: 28.5, GCA: 15.2, GCG: 7.8,
    TAT: 11.8, TAC: 16.0, TAA: 0.9, TAG: 0.7, CAT: 10.5, CAC: 15.5, CAA: 11.8, CAG: 35.0,
    AAT: 16.5, AAC: 19.8, AAA: 23.5, AAG: 33.0, GAT: 21.2, GAC: 26.0, GAA: 28.2, GAG: 41.0,
    TGT: 10.2, TGC: 13.0, TGA: 1.5, TGG: 13.5, CGT: 4.3, CGC: 10.8, CGA: 6.0, CGG: 11.8,
    AGT: 11.8, AGC: 20.0, AGA: 11.8, AGG: 12.2, GGT: 10.5, GGC: 23.0, GGA: 16.0, GGG: 17.0
  },
  'Spodoptera frugiperda': {
    TTT: 15.2, TTC: 24.5, TTA: 8.5, TTG: 14.2, CTT: 12.0, CTC: 17.5, CTA: 6.8, CTG: 22.5,
    ATT: 18.5, ATC: 25.4, ATA: 9.2, ATG: 21.5, GTT: 13.5, GTC: 18.2, GTA: 8.0, GTG: 21.0,
    TCT: 12.2, TCC: 16.0, TCA: 11.5, TCG: 7.8, CCT: 14.5, CCC: 18.5, CCA: 13.8, CCG: 9.8,
    ACT: 14.2, ACC: 21.0, ACA: 13.5, ACG: 8.5, GCT: 19.5, GCC: 24.5, GCA: 16.8, GCG: 11.2,
    TAT: 14.0, TAC: 20.5, TAA: 1.2, TAG: 0.8, CAT: 11.8, CAC: 18.0, CAA: 14.5, CAG: 23.0,
    AAT: 18.2, AAC: 24.0, AAA: 26.5, AAG: 29.5, GAT: 23.5, GAC: 25.8, GAA: 28.0, GAG: 31.5,
    TGT: 9.8, TGC: 14.8, TGA: 1.4, TGG: 14.0, CGT: 5.5, CGC: 12.8, CGA: 5.8, CGG: 8.5,
    AGT: 10.5, AGC: 17.2, AGA: 11.0, AGG: 9.8, GGT: 13.5, GGC: 24.0, GGA: 14.8, GGG: 12.0
  }
};

// Common restriction enzymes database (30+)
// Recognition sequence maps matching 5'-to-3' recognition + cut pointer caret (e.g. EcoRI: G^AATTC)
export const RESTRICTION_ENZYMES = [
  { name: 'EcoRI', seq: 'GAATTC', cut: 1 },
  { name: 'BamHI', seq: 'GGATCC', cut: 1 },
  { name: 'HindIII', seq: 'AAGCTT', cut: 1 },
  { name: 'XhoI', seq: 'CTCGAG', cut: 1 },
  { name: 'NotI', seq: 'GCGGCCGC', cut: 2 },
  { name: 'SacI', seq: 'GAGCTC', cut: 5 },
  { name: 'SalI', seq: 'GTCGAC', cut: 1 },
  { name: 'KpnI', seq: 'GGTACC', cut: 5 },
  { name: 'SmaI', seq: 'CCCGGG', cut: 3 },
  { name: 'XbaI', seq: 'TCTAGA', cut: 1 },
  { name: 'SpeI', seq: 'ACTAGT', cut: 1 },
  { name: 'PstI', seq: 'CTGCAG', cut: 5 },
  { name: 'BglII', seq: 'AGATCT', cut: 1 },
  { name: 'ClaI', seq: 'ATCGAT', cut: 2 },
  { name: 'NdeI', seq: 'CATATG', cut: 2 },
  { name: 'NcoI', seq: 'CCATGG', cut: 1 },
  { name: 'MfeI', seq: 'CAATTG', cut: 1 },
  { name: 'EcoRV', seq: 'GATATC', cut: 3 },
  { name: 'PvuII', seq: 'CAGCTG', cut: 3 },
  { name: 'ScaI', seq: 'AGTACT', cut: 3 },
  { name: 'StuI', seq: 'AGGCCT', cut: 3 },
  { name: 'NaeI', seq: 'GCCGGC', cut: 3 },
  { name: 'SphI', seq: 'GCATGC', cut: 5 },
  { name: 'MluI', seq: 'ACGCGT', cut: 1 },
  { name: 'AgeI', seq: 'ACCGGT', cut: 1 },
  { name: 'BmtI', seq: 'GCTAGC', cut: 5 },
  { name: 'AvrII', seq: 'CCTAGG', cut: 1 },
  { name: 'ApaI', seq: 'GGGCCC', cut: 5 },
  { name: 'PciI', seq: 'ACATGT', cut: 1 },
  { name: 'BstXI', seq: 'CCANNNNNNTGG', cut: 8, degenerate: true },
  { name: 'SfiI', seq: 'GGCCNNNNNGGCC', cut: 8, degenerate: true }
];

// IUPAC degenerate nucleotide codes
export const IUPAC_CODES = {
  R: ['A', 'G'],
  Y: ['C', 'T', 'U'],
  S: ['G', 'C'],
  W: ['A', 'T', 'U'],
  K: ['G', 'T', 'U'],
  M: ['A', 'C'],
  B: ['C', 'G', 'T', 'U'],
  D: ['A', 'G', 'T', 'U'],
  H: ['A', 'C', 'T', 'U'],
  V: ['A', 'C', 'G'],
  N: ['A', 'C', 'G', 'T', 'U']
};

// Clean sequences: strips spaces, numbers, FASTA headers, handles case sanitization
export function cleanSequence(input, alphabet = 'ACGTU') {
  if (!input) return '';
  let cleaned = input;
  // If FASTA format, strip headers
  if (cleaned.startsWith('>')) {
    const lines = cleaned.split('\n');
    lines.shift();
    cleaned = lines.join('');
  }
  // Strip whitespace, numbers, symbols
  cleaned = cleaned.replace(/[\s\d\-_.\/\\|()]/g, '');
  return cleaned.toUpperCase();
}

// Auto-detect sequence type
export function detectSequenceType(seq) {
  if (!seq) return 'DNA';
  const clean = cleanSequence(seq);
  if (clean.length === 0) return 'DNA';

  // Count characters
  let dnaRnaCount = 0;
  let uCount = 0;
  let tCount = 0;
  let totalValid = 0;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if ('ACGTU'.includes(char)) {
      dnaRnaCount++;
      if (char === 'U') uCount++;
      if (char === 'T') tCount++;
    }
    if ('ACDEFGHIKLMNPQRSTVWY'.includes(char)) {
      totalValid++;
    }
  }

  const dnaRnaRatio = dnaRnaCount / clean.length;
  if (dnaRnaRatio > 0.85) {
    return uCount > tCount ? 'RNA' : 'DNA';
  }
  return 'PROTEIN';
}

// Generate reverse complement of a DNA/RNA sequence
export function reverseComplement(seq) {
  if (!seq) return '';
  const clean = cleanSequence(seq);
  const isRna = detectSequenceType(clean) === 'RNA';
  
  return clean
    .split('')
    .reverse()
    .map((base) => {
      const comp = NUCLEOTIDE_COMPLEMENT[base] || base;
      // Keep complement structure intact (RNA uses U instead of T)
      if (isRna && comp === 'T') return 'U';
      if (!isRna && comp === 'U') return 'T';
      return comp;
    })
    .join('');
}

// Transcribe DNA sequence into RNA
export function transcribe(seq) {
  if (!seq) return '';
  return cleanSequence(seq).replace(/T/g, 'U');
}

// Translate DNA/RNA sequence into peptide sequence (frame is 1, 2, 3, -1, -2, -3)
export function translate(seq, frame = 1, readThroughStop = false) {
  if (!seq) return '';
  
  let targetSeq = cleanSequence(seq);
  const isReverse = frame < 0;
  if (isReverse) {
    targetSeq = reverseComplement(targetSeq);
  }

  const offset = Math.abs(frame) - 1;
  let peptide = '';

  for (let i = offset; i < targetSeq.length - 2; i += 3) {
    const codon = targetSeq.substring(i, i + 3).replace(/U/g, 'T'); // standardized to DNA lookup table
    const aaInfo = STANDARD_GENETIC_CODE[codon];
    const aa = aaInfo ? aaInfo.symbol : 'X';
    
    if (aa === '*' && !readThroughStop) {
      break; // Stop codon hit, stop translation
    }
    peptide += aa;
  }

  return peptide;
}
