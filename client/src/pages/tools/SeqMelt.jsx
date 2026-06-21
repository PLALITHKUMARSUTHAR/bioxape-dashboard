import React, { useState, useEffect } from 'react';
import ToolShell, { CopyButton, ExportButton } from '../../components/tools/ToolShell';
import { cleanSequence, detectSequenceType, reverseComplement, NN_THERMODYNAMICS } from '../../utils/bioutils';
import useDebouncedValue from '../../hooks/useDebouncedValue';

export default function SeqMelt() {
  const [rawInput, setRawInput] = useState('');
  const [naConc, setNaConc] = useState(50); // mM
  const [mgConc, setMgConc] = useState(1.5); // mM
  const [primerConc, setPrimerConc] = useState(250); // nM
  const [selectedMethod, setSelectedMethod] = useState('nn');

  const debouncedInput = useDebouncedValue(rawInput, 200);
  const debouncedNa = useDebouncedValue(naConc, 150);
  const debouncedMg = useDebouncedValue(mgConc, 150);
  const debouncedPrimer = useDebouncedValue(primerConc, 150);

  const [results, setResults] = useState(null);
  const [warning, setWarning] = useState('');
  const [validationError, setValidationError] = useState('');

  // Run Tm and thermodynamic calculations when debounced values update
  useEffect(() => {
    const clean = cleanSequence(debouncedInput);
    if (!clean) {
      setResults(null);
      setValidationError('');
      setWarning('');
      return;
    }

    // Validation: Check alphabet (allow IUPAC ambiguity, but warn/error on others)
    const invalidChars = clean.replace(/[ACGUTNRYSWKMBDHV]/g, '');
    if (invalidChars.length > 0) {
      setValidationError(`Invalid character(s) detected: ${invalidChars.substring(0, 10)}. Please use IUPAC codes.`);
      setResults(null);
      return;
    }
    setValidationError('');

    const length = clean.length;
    if (length > 500) {
      setWarning(`Sequence length is ${length}bp. Visual rendering is capped at the first 200 bases to prevent slowdown.`);
    } else {
      setWarning('');
    }

    const seqType = detectSequenceType(clean);
    
    // Count bases
    let aCount = 0, tCount = 0, gCount = 0, cCount = 0, uCount = 0, gcCount = 0;
    for (let char of clean) {
      if (char === 'A') aCount++;
      else if (char === 'T') { tCount++; }
      else if (char === 'G') { gCount++; gcCount++; }
      else if (char === 'C') { cCount++; gcCount++; }
      else if (char === 'U') { uCount++; }
    }
    if (seqType === 'RNA') {
      tCount = uCount; // align RNA/DNA bases
    }
    const gcPct = length > 0 ? (gcCount / length) * 100 : 0;

    // 1. Wallace Rule: Tm = 4(G+C) + 2(A+T/U) (Valid only for <= 14 bp)
    let wallaceTm = null;
    if (length <= 14) {
      wallaceTm = 4 * gcCount + 2 * (aCount + tCount);
    }

    // 2. GC% Method: Tm = 64.9 + 41 * (GC - 16.4) / length
    const gcTm = length > 0 ? 64.9 + 41 * (gcCount - 16.4) / length : 0;

    // 3. Nearest-Neighbor (SantaLucia 1998)
    let nnTm = 0;
    let dH = 0;
    let dS = 0;

    if (length > 1) {
      // Sum dinucleotides
      for (let i = 0; i < length - 1; i++) {
        // Standardize U to T for database lookup
        const step = clean.substring(i, i + 2).replace(/U/g, 'T');
        const params = NN_THERMODYNAMICS[step];
        if (params) {
          dH += params.dh;
          dS += params.ds;
        }
      }

      // Initiation
      const first = clean[0].replace(/U/g, 'T');
      const last = clean[length - 1].replace(/U/g, 'T');
      if (first === 'G' || first === 'C') {
        dH += NN_THERMODYNAMICS.init_GC.dh;
        dS += NN_THERMODYNAMICS.init_GC.ds;
      } else if (first === 'A' || first === 'T') {
        dH += NN_THERMODYNAMICS.init_AT.dh;
        dS += NN_THERMODYNAMICS.init_AT.ds;
      }
      if (last === 'G' || last === 'C') {
        dH += NN_THERMODYNAMICS.init_GC.dh;
        dS += NN_THERMODYNAMICS.init_GC.ds;
      } else if (last === 'A' || last === 'T') {
        dH += NN_THERMODYNAMICS.init_AT.dh;
        dS += NN_THERMODYNAMICS.init_AT.ds;
      }

      // Symmetry correction
      const isSelfComp = clean === reverseComplement(clean);
      if (isSelfComp) {
        dH += NN_THERMODYNAMICS.symmetry.dh;
        dS += NN_THERMODYNAMICS.symmetry.ds;
      }

      // R = 1.987 cal/(mol·K)
      const R = 1.987;
      // Convert Ct (primer concentration) from nM to M. Non-self-comp term is Ct/4.
      const Ct = debouncedPrimer * 1e-9;
      const concTerm = isSelfComp ? Ct : Ct / 4;
      
      const rawNnTm = (dH * 1000) / (dS + R * Math.log(concTerm)) - 273.15;

      // Owczarzy Salt Correction (2008)
      // Effective Monovalent Concentration [Monovalent+] = [Na+] + 120 * sqrt([Mg2+])
      const saltM = (debouncedNa + 120 * Math.sqrt(debouncedMg)) / 1000;
      if (saltM > 0) {
        const lnSalt = Math.log(saltM);
        const gcFrac = gcCount / length;
        const Tm_kelvin = rawNnTm + 273.15;
        // Owczarzy formula
        nnTm = 1 / (1 / Tm_kelvin + (4.29 * gcFrac - 3.95) * 1e-5 * lnSalt + 9.4e-6 * lnSalt * lnSalt) - 273.15;
      } else {
        nnTm = rawNnTm;
      }
    }

    // Molecular Weight Calculation (monoisotopic)
    // DNA monomer = 313.2 g/mol avg, RNA monomer = 329.2 g/mol avg
    // We can compute more precisely:
    // DNA: A=313.2, T=304.2, G=329.2, C=289.2; subtract 61.96 for terminal OH/phosphate
    const mwBases = seqType === 'RNA' ? { A: 329.2, U: 306.2, G: 345.2, C: 305.2 } : { A: 313.2, T: 304.2, G: 329.2, C: 289.2 };
    let mw = 0;
    for (let char of clean) {
      mw += mwBases[char] || 310;
    }
    mw = Math.max(0, mw - 61.96);

    // Extinction coefficient at 260nm (Nearest-Neighbor method)
    // Simple sequence approximation: ε = sum(adjacent pairs) - sum(individual single bases)
    // Standard tables:
    const baseExt = { A: 15400, T: 8700, U: 9900, G: 11500, C: 7400 };
    let extCoeff = 0;
    for (let char of clean) {
      extCoeff += baseExt[char] || 10000;
    }

    // Hairpin Scanning: match >= 4bp with loop >= 3nt
    let hairpinFound = false;
    let hairpinDetails = '';
    const minStem = 4;
    const minLoop = 3;

    for (let i = 0; i < length - minStem * 2 - minLoop; i++) {
      for (let j = i + minStem + minLoop; j <= length - minStem; j++) {
        // Compare substring [i...i+minStem] with reverse complement of [j...j+minStem]
        const stem1 = clean.substring(i, i + minStem);
        const stem2 = clean.substring(j, j + minStem);
        if (stem1 === reverseComplement(stem2)) {
          hairpinFound = true;
          hairpinDetails = `Hairpin risk: complementary stem ${stem1} <-> ${reverseComplement(stem2)} with loop size ${j - (i + minStem)} nt.`;
          break;
        }
      }
      if (hairpinFound) break;
    }

    setResults({
      clean,
      length,
      type: seqType,
      gcPct: gcPct.toFixed(1),
      wallaceTm: wallaceTm !== null ? wallaceTm.toFixed(1) : 'N/A (>14 bp)',
      gcTm: gcTm.toFixed(1),
      nnTm: nnTm.toFixed(1),
      mw: mw.toFixed(1),
      extCoeff,
      hairpinFound,
      hairpinDetails
    });
  }, [debouncedInput, debouncedNa, debouncedMg, debouncedPrimer]);

  const loadSample = (type) => {
    if (type === 'dna') {
      setRawInput('ATGCGATCGATCGATCGATCGATC');
    } else {
      setRawInput('AUGCGAUCGAUCGAUCGAUCGAUC');
    }
  };

  const getFastaOutput = () => {
    if (!results) return '';
    const activeTm = selectedMethod === 'nn' ? results.nnTm : selectedMethod === 'gc' ? results.gcTm : results.wallaceTm;
    return `>SeqMelt_Result\n${results.clean}\n; Tm(${selectedMethod.toUpperCase()})=${activeTm}°C GC%=${results.gcPct} MW=${results.mw} Da`;
  };

  const getCsvOutput = () => {
    if (!results) return '';
    let csv = 'Position,Base,Running GC%\n';
    let gcCount = 0;
    for (let i = 0; i < results.clean.length; i++) {
      const char = results.clean[i];
      if (char === 'G' || char === 'C') gcCount++;
      const runningGc = ((gcCount / (i + 1)) * 100).toFixed(1);
      csv += `${i + 1},${char},${runningGc}%\n`;
    }
    return csv;
  };

  return (
    <ToolShell slug="seqmelt">
      <div className="bx-tools-grid">
        {/* Left Side: Controls & Input */}
        <div className="tool-pane-card">
          <div className="tool-pane-title">
            <span>Sequence Input</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="mock-sample-btn" onClick={() => loadSample('dna')}>DNA Sample</button>
              <button type="button" className="mock-sample-btn" onClick={() => loadSample('rna')}>RNA Sample</button>
            </div>
          </div>

          {/* Text Area */}
          <div className="mock-field-group">
            <label htmlFor="seqmelt-sequence" className="mock-label">Enter DNA or RNA Sequence (pasted FASTA headers automatically stripped)</label>
            <textarea
              id="seqmelt-sequence"
              className="mock-textarea"
              placeholder="Paste DNA/RNA sequence e.g., GAATTC..."
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
            />
            {validationError && <p style={{ color: 'var(--red)', fontSize: '12px', marginTop: '4px' }}>{validationError}</p>}
            {warning && <p style={{ color: 'var(--amber)', fontSize: '12px', marginTop: '4px' }}>{warning}</p>}
          </div>

          {/* Parameter Sliders */}
          <div className="mock-field-group">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label htmlFor="na-conc-slider" className="mock-label">Sodium Concentration (Na+)</label>
              <span className="mock-slider-val">{naConc} mM</span>
            </div>
            <input
              id="na-conc-slider"
              type="range"
              min="0"
              max="1000"
              value={naConc}
              onChange={(e) => setNaConc(parseInt(e.target.value))}
              style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
            />
          </div>

          <div className="mock-field-group">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label htmlFor="mg-conc-slider" className="mock-label">Magnesium Concentration (Mg2+)</label>
              <span className="mock-slider-val">{mgConc} mM</span>
            </div>
            <input
              id="mg-conc-slider"
              type="range"
              min="0"
              max="50"
              step="0.5"
              value={mgConc}
              onChange={(e) => setMgConc(parseFloat(e.target.value))}
              style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
            />
          </div>

          <div className="mock-field-group">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label htmlFor="primer-conc-input" className="mock-label">Primer Concentration (Ct)</label>
              <span className="mock-slider-val">{primerConc} nM</span>
            </div>
            <input
              id="primer-conc-input"
              type="range"
              min="10"
              max="2000"
              step="10"
              value={primerConc}
              onChange={(e) => setPrimerConc(parseInt(e.target.value))}
              style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
            />
          </div>

          {/* Method tabs */}
          <div className="mock-field-group">
            <label className="mock-label">Primary Export Method</label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button
                type="button"
                className={`bx-tool-btn ${selectedMethod === 'nn' ? 'copied' : ''}`}
                onClick={() => setSelectedMethod('nn')}
                style={{ flex: 1 }}
              >
                Nearest-Neighbor (NN)
              </button>
              <button
                type="button"
                className={`bx-tool-btn ${selectedMethod === 'gc' ? 'copied' : ''}`}
                onClick={() => setSelectedMethod('gc')}
                style={{ flex: 1 }}
              >
                GC% Formula
              </button>
              <button
                type="button"
                className={`bx-tool-btn ${selectedMethod === 'wallace' ? 'copied' : ''}`}
                onClick={() => setSelectedMethod('wallace')}
                style={{ flex: 1 }}
              >
                Wallace Rule
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Visualizations and Results */}
        <div className="tool-pane-card">
          <div className="tool-pane-title">Analysis Results</div>

          {results ? (
            <div style={{ display: 'flex', flex: '1', flexDirection: 'column', gap: '16px' }}>
              
              {/* Thermometer scale */}
              <div style={{ background: 'var(--off)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Nearest-Neighbor Tm</span>
                  <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--accent-d)' }}>{results.nnTm}°C</span>
                </div>
                {/* Visual meter */}
                <div style={{ height: '8px', backgroundColor: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      backgroundColor: 'var(--accent)',
                      width: `${Math.min(100, Math.max(0, (parseFloat(results.nnTm) / 100) * 100))}%`,
                      transition: 'width 0.4s ease'
                    }}
                  />
                </div>
              </div>

              {/* Three Method Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                <div style={{ padding: '10px', border: `1px solid ${selectedMethod === 'nn' ? 'var(--accent)' : 'var(--border)'}`, borderRadius: '8px', textAlign: 'center', backgroundColor: selectedMethod === 'nn' ? 'var(--emerald-50)' : 'var(--white)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Nearest-Neighbor</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text1)' }}>{results.nnTm}°C</div>
                </div>
                <div style={{ padding: '10px', border: `1px solid ${selectedMethod === 'gc' ? 'var(--accent)' : 'var(--border)'}`, borderRadius: '8px', textAlign: 'center', backgroundColor: selectedMethod === 'gc' ? 'var(--emerald-50)' : 'var(--white)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text3)' }}>GC% Method</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text1)' }}>{results.gcTm}°C</div>
                </div>
                <div style={{ padding: '10px', border: `1px solid ${selectedMethod === 'wallace' ? 'var(--accent)' : 'var(--border)'}`, borderRadius: '8px', textAlign: 'center', backgroundColor: selectedMethod === 'wallace' ? 'var(--emerald-50)' : 'var(--white)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Wallace Rule</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text1)' }}>{results.wallaceTm}°C</div>
                </div>
              </div>

              {/* Composition Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="mock-result-box">
                  <div className="mock-result-value">{results.gcPct}%</div>
                  <div className="mock-result-label">GC Content</div>
                </div>
                <div className="mock-result-box">
                  <div className="mock-result-value">{results.mw} Da</div>
                  <div className="mock-result-label">Molecular Weight</div>
                </div>
              </div>

              {/* Dimer/Hairpin Warning */}
              {results.hairpinFound && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: 'var(--amber-l)', border: '1px solid var(--amber)', padding: '10px 12px', borderRadius: '6px', fontSize: '13px', color: 'var(--amber)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '18px', height: '18px', flexShrink: 0 }}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  <span>{results.hairpinDetails}</span>
                </div>
              )}

              {/* Sequence base tiles (colored) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span className="mock-label" style={{ fontSize: '12px' }}>Sequence Visualizer (showing first 200 bases)</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxHeight: '120px', overflowY: 'auto', padding: '8px', border: '1px solid var(--border)', borderRadius: '6px', backgroundColor: 'var(--off)' }}>
                  {results.clean.substring(0, 200).split('').map((char, idx) => {
                    let tileColor = '#e2e8f0'; // default
                    if (char === 'A') tileColor = '#0ea5e9'; // sky
                    else if (char === 'T' || char === 'U') tileColor = '#f59e0b'; // amber
                    else if (char === 'G') tileColor = '#10b981'; // emerald
                    else if (char === 'C') tileColor = '#8b5cf6'; // violet

                    return (
                      <span
                        key={idx}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '20px',
                          height: '20px',
                          borderRadius: '4px',
                          backgroundColor: tileColor,
                          color: '#fff',
                          fontWeight: 'bold',
                          fontSize: '11px',
                          fontFamily: 'var(--font-mono)'
                        }}
                      >
                        {char}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Actions row */}
              <div className="mock-actions-row">
                <CopyButton text={getFastaOutput()} />
                <ExportButton data={getCsvOutput()} filename="seqmelt_gc_profile.csv" format="csv" />
              </div>

            </div>
          ) : (
            <div className="mock-empty-results">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '48px', height: '48px', color: 'var(--text4)', marginBottom: '12px' }}>
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <p style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text2)', marginBottom: '4px' }}>No Sequence Analyzed</p>
              <p style={{ fontSize: '13px', lineHeight: 1.4 }}>Enter or paste a target nucleotide sequence on the left to compute melting thresholds.</p>
            </div>
          )}
        </div>
      </div>
    </ToolShell>
  );
}
