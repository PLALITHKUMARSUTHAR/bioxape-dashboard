import React, { useState } from 'react';
import ToolShell, { CopyButton, ExportButton } from '../../components/tools/ToolShell';
import { cleanSequence, detectSequenceType, reverseComplement, NN_THERMODYNAMICS } from '../../utils/bioutils';

export default function SeqMelt() {
  const [activeStep, setActiveStep] = useState(1);
  const [rawInput, setRawInput] = useState('');
  const [naConc, setNaConc] = useState(50); // mM
  const [mgConc, setMgConc] = useState(1.5); // mM
  const [primerConc, setPrimerConc] = useState(250); // nM
  const [selectedMethod, setSelectedMethod] = useState('nn');

  const [results, setResults] = useState(null);
  const [warning, setWarning] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const steps = [
    { number: 1, title: 'Input Sequence' },
    { number: 2, title: 'Reaction Ions' },
    { number: 3, title: 'Method & Run' },
    { number: 4, title: 'Melting Results' }
  ];

  const loadSample = (type) => {
    if (type === 'dna') {
      setRawInput('ATGCGATCGATCGATCGATCGATC');
    } else {
      setRawInput('AUGCGAUCGAUCGAUCGAUCGAUC');
    }
    setValidationError('');
  };

  const handleNextFromStep1 = () => {
    const clean = cleanSequence(rawInput);
    if (!clean) {
      setValidationError('Please enter a sequence.');
      return;
    }
    const invalidChars = clean.replace(/[ACGUTNRYSWKMBDHV]/g, '');
    if (invalidChars.length > 0) {
      setValidationError(`Invalid character(s) detected: ${invalidChars.substring(0, 10)}. Please use IUPAC codes.`);
      return;
    }
    setValidationError('');
    setActiveStep(2);
  };

  const handleRunAnalysis = () => {
    const clean = cleanSequence(rawInput);
    if (!clean) {
      setValidationError('Please enter a sequence.');
      setActiveStep(1);
      return;
    }

    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      
      const length = clean.length;
      let warnMsg = '';
      if (length > 500) {
        warnMsg = `Sequence length is ${length}bp. Visual rendering is capped at the first 200 bases to prevent slowdown.`;
      }
      setWarning(warnMsg);

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
        tCount = uCount;
      }
      const gcPct = length > 0 ? (gcCount / length) * 100 : 0;

      // 1. Wallace Rule
      let wallaceTm = null;
      if (length <= 14) {
        wallaceTm = 4 * gcCount + 2 * (aCount + tCount);
      }

      // 2. GC% Method
      const gcTm = length > 0 ? 64.9 + 41 * (gcCount - 16.4) / length : 0;

      // 3. Nearest-Neighbor
      let nnTm = 0;
      let dH = 0;
      let dS = 0;

      if (length > 1) {
        for (let i = 0; i < length - 1; i++) {
          const step = clean.substring(i, i + 2).replace(/U/g, 'T');
          const params = NN_THERMODYNAMICS[step];
          if (params) {
            dH += params.dh;
            dS += params.ds;
          }
        }

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

        const isSelfComp = clean === reverseComplement(clean);
        if (isSelfComp) {
          dH += NN_THERMODYNAMICS.symmetry.dh;
          dS += NN_THERMODYNAMICS.symmetry.ds;
        }

        const R = 1.987;
        const Ct = primerConc * 1e-9;
        const concTerm = isSelfComp ? Ct : Ct / 4;
        
        const rawNnTm = (dH * 1000) / (dS + R * Math.log(concTerm)) - 273.15;

        const saltM = (naConc + 120 * Math.sqrt(mgConc)) / 1000;
        if (saltM > 0) {
          const lnSalt = Math.log(saltM);
          const gcFrac = gcCount / length;
          const Tm_kelvin = rawNnTm + 273.15;
          nnTm = 1 / (1 / Tm_kelvin + (4.29 * gcFrac - 3.95) * 1e-5 * lnSalt + 9.4e-6 * lnSalt * lnSalt) - 273.15;
        } else {
          nnTm = rawNnTm;
        }
      }

      const mwBases = seqType === 'RNA' ? { A: 329.2, U: 306.2, G: 345.2, C: 305.2 } : { A: 313.2, T: 304.2, G: 329.2, C: 289.2 };
      let mw = 0;
      for (let char of clean) {
        mw += mwBases[char] || 310;
      }
      mw = Math.max(0, mw - 61.96);

      const baseExt = { A: 15400, T: 8700, U: 9900, G: 11500, C: 7400 };
      let extCoeff = 0;
      for (let char of clean) {
        extCoeff += baseExt[char] || 10000;
      }

      let hairpinFound = false;
      let hairpinDetails = '';
      const minStem = 4;
      const minLoop = 3;

      for (let i = 0; i < length - minStem * 2 - minLoop; i++) {
        for (let j = i + minStem + minLoop; j <= length - minStem; j++) {
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

      setActiveStep(4);
    }, 850);
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

  const resetAnalysis = () => {
    setResults(null);
    setActiveStep(1);
  };

  const renderStepTracker = () => (
    <div className="bx-step-tracker">
      {steps.map((s) => {
        const isCompleted = s.number < activeStep;
        const isActive = s.number === activeStep;
        const isDisabled = s.number > activeStep && !results;
        return (
          <div
            key={s.number}
            className={`bx-step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isDisabled ? 'disabled' : ''}`}
            onClick={() => !isDisabled && setActiveStep(s.number)}
          >
            <span className="bx-step-circle">{s.number}</span>
            <span>{s.title}</span>
          </div>
        );
      })}
    </div>
  );

  return (
    <ToolShell slug="seqmelt">
      {renderStepTracker()}

      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        {/* Step 1: Input Sequence */}
        {activeStep === 1 && (
          <div className="bx-step-section">
            <div className="bx-step-header">
              <span className="bx-step-badge">Step 1</span>
              <h3 className="bx-step-title">Enter DNA or RNA Sequence</h3>
            </div>
            
            <div className="bx-field-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="seqmelt-sequence" className="bx-label">Nucleotide sequence</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="bx-btn-sample" onClick={() => loadSample('dna')}>Load DNA Sample</button>
                  <span style={{ color: 'var(--border2)' }}>|</span>
                  <button type="button" className="bx-btn-sample" onClick={() => loadSample('rna')}>Load RNA Sample</button>
                </div>
              </div>
              <textarea
                id="seqmelt-sequence"
                className="bx-textarea"
                placeholder="Paste DNA/RNA sequence e.g., GAATTC..."
                value={rawInput}
                onChange={(e) => {
                  setRawInput(e.target.value);
                  setValidationError('');
                }}
              />
              {validationError && <p style={{ color: 'var(--red)', fontSize: '12px', marginTop: '4px' }}>{validationError}</p>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button
                type="button"
                className="bx-btn-primary"
                onClick={handleNextFromStep1}
                disabled={!rawInput.trim()}
              >
                Next: Configure Parameters →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Configure Parameters */}
        {activeStep === 2 && (
          <div className="bx-step-section">
            <div className="bx-step-header">
              <span className="bx-step-badge">Step 2</span>
              <h3 className="bx-step-title">Configure Reaction Parameters</h3>
            </div>

            <div className="bx-field-group">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label htmlFor="na-conc-slider" className="bx-label">Sodium Concentration (Na+)</label>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--accent-d)' }}>{naConc} mM</span>
              </div>
              <input
                id="na-conc-slider"
                type="range"
                className="bx-slider"
                min="0"
                max="1000"
                value={naConc}
                onChange={(e) => setNaConc(parseInt(e.target.value))}
              />
            </div>

            <div className="bx-field-group">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label htmlFor="mg-conc-slider" className="bx-label">Magnesium Concentration (Mg2+)</label>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--accent-d)' }}>{mgConc} mM</span>
              </div>
              <input
                id="mg-conc-slider"
                type="range"
                className="bx-slider"
                min="0"
                max="50"
                step="0.5"
                value={mgConc}
                onChange={(e) => setMgConc(parseFloat(e.target.value))}
              />
            </div>

            <div className="bx-field-group">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label htmlFor="primer-conc-input" className="bx-label">Primer Concentration (Ct)</label>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--accent-d)' }}>{primerConc} nM</span>
              </div>
              <input
                id="primer-conc-input"
                type="range"
                className="bx-slider"
                min="10"
                max="2000"
                step="10"
                value={primerConc}
                onChange={(e) => setPrimerConc(parseInt(e.target.value))}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
              <button
                type="button"
                className="bx-tool-btn"
                onClick={() => setActiveStep(1)}
              >
                ← Back
              </button>
              <button
                type="button"
                className="bx-btn-primary"
                onClick={() => setActiveStep(3)}
              >
                Next: Select Method & Run →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Run Analysis */}
        {activeStep === 3 && (
          <div className="bx-step-section">
            <div className="bx-step-header">
              <span className="bx-step-badge">Step 3</span>
              <h3 className="bx-step-title">Select Analysis Method & Run</h3>
            </div>

            <div className="bx-field-group">
              <label className="bx-label" htmlFor="seqmelt-method-select">Primary Melting Method</label>
              <select
                id="seqmelt-method-select"
                className="bx-select"
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value)}
              >
                <option value="nn">Nearest-Neighbor (SantaLucia '98) — Recommended</option>
                <option value="gc">GC% Empirical Formula</option>
                <option value="wallace">Wallace Rule (for short oligos &le; 14bp)</option>
              </select>
            </div>

            <div style={{ margin: '12px 0', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <button
                type="button"
                className="bx-btn-primary"
                style={{ width: '100%', padding: '12px' }}
                onClick={handleRunAnalysis}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <svg style={{ animation: 'spin 1.2s infinite linear', width: '16px', height: '16px', marginRight: '6px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12"/></svg>
                    Running Thermodynamics Simulation...
                  </>
                ) : (
                  'Run Melting Temperature Calculation'
                )}
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '10px' }}>
              <button
                type="button"
                className="bx-tool-btn"
                onClick={() => setActiveStep(2)}
                disabled={isAnalyzing}
              >
                ← Back
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Results */}
        {activeStep === 4 && results && (
          <div className="bx-step-section">
            <div className="bx-step-header">
              <span className="bx-step-badge">Step 4</span>
              <h3 className="bx-step-title">Thermodynamic Analysis Results</h3>
            </div>

            {/* Melting Temp Gauge */}
            <div style={{ background: 'var(--off)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text2)' }}>Melting Temperature (Tm)</span>
                <span style={{ fontSize: '24px', fontWeight: '800', color: 'var(--accent-d)' }}>
                  {selectedMethod === 'nn' ? results.nnTm : selectedMethod === 'gc' ? results.gcTm : results.wallaceTm}°C
                </span>
              </div>
              <div style={{ height: '8px', backgroundColor: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    backgroundColor: 'var(--accent)',
                    width: `${Math.min(100, Math.max(0, (parseFloat(selectedMethod === 'nn' ? results.nnTm : selectedMethod === 'gc' ? results.gcTm : results.wallaceTm) / 100) * 100))}%`,
                    transition: 'width 0.4s ease'
                  }}
                />
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '6px', textAlign: 'right' }}>
                Method: {selectedMethod.toUpperCase()} (Na+: {naConc}mM, Mg2+: {mgConc}mM)
              </div>
            </div>

            {/* Results Grid */}
            <div className="bx-result-grid">
              <div className="bx-result-box">
                <div className="bx-result-val">{results.nnTm}°C</div>
                <div className="bx-result-lbl">Nearest-Neighbor</div>
              </div>
              <div className="bx-result-box">
                <div className="bx-result-val">{results.gcTm}°C</div>
                <div className="bx-result-lbl">GC Formula</div>
              </div>
              <div className="bx-result-box">
                <div className="bx-result-val">{results.wallaceTm}°C</div>
                <div className="bx-result-lbl">Wallace Rule</div>
              </div>
            </div>

            {/* Extra Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="bx-result-box">
                <div className="bx-result-val">{results.gcPct}%</div>
                <div className="bx-result-lbl">GC Content</div>
              </div>
              <div className="bx-result-box">
                <div className="bx-result-val">{results.mw} Da</div>
                <div className="bx-result-lbl">Molecular Weight</div>
              </div>
            </div>

            {/* Hairpin Warnings */}
            {results.hairpinFound && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid var(--amber)', padding: '12px', borderRadius: '6px', fontSize: '13px', color: 'var(--amber-d)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '18px', height: '18px', flexShrink: 0 }}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <span>{results.hairpinDetails}</span>
              </div>
            )}

            {warning && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: 'rgba(245, 158, 11, 0.05)', border: '1px solid var(--border)', padding: '10px', borderRadius: '6px', fontSize: '12px', color: 'var(--text3)' }}>
                <span>{warning}</span>
              </div>
            )}

            {/* Sequence Base Tiles */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span className="bx-label">Sequence Base View (first 200 bases)</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxHeight: '110px', overflowY: 'auto', padding: '10px', border: '1px solid var(--border)', borderRadius: '6px', backgroundColor: 'var(--off)' }}>
                {results.clean.substring(0, 200).split('').map((char, idx) => {
                  let tileColor = 'var(--text4)';
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

            {/* Export and Actions */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '8px' }}>
              <CopyButton text={getFastaOutput()} />
              <ExportButton data={getCsvOutput()} filename="seqmelt_gc_profile.csv" format="csv" />
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
              <button
                type="button"
                className="bx-btn-primary"
                onClick={resetAnalysis}
                style={{ background: 'var(--text2)', boxShadow: 'none' }}
              >
                ← Analyze Another Sequence
              </button>
            </div>
          </div>
        )}
      </div>
    </ToolShell>
  );
}
