import React, { useState } from 'react';
import ToolShell, { CopyButton, ExportButton } from '../../components/tools/ToolShell';
import { cleanSequence, AMINO_ACID_PKA, AMINO_ACID_MASSES } from '../../utils/bioutils';

// Helper to convert three-letter AA codes (e.g. Ala-Gly-Ser) to single letter
const convertThreeToSingle = (str) => {
  const map = {
    ALA: 'A', ARG: 'R', ASN: 'N', ASP: 'D', CYS: 'C', GLU: 'E', GLN: 'Q', GLY: 'G', HIS: 'H',
    ILE: 'I', LEU: 'L', LYS: 'K', MET: 'M', PHE: 'F', PRO: 'P', SER: 'S', THR: 'T', TRP: 'W',
    TYR: 'Y', VAL: 'V'
  };
  let normalized = str.toUpperCase().replace(/[\s-]/g, '');
  if (normalized.length >= 3 && normalized.length % 3 === 0) {
    let result = '';
    for (let i = 0; i < normalized.length; i += 3) {
      const tri = normalized.substring(i, i + 3);
      if (map[tri]) {
        result += map[tri];
      } else {
        return str;
      }
    }
    return result;
  }
  return str;
};

export default function ProtCharge() {
  const [activeStep, setActiveStep] = useState(1);
  const [rawSeq, setRawSeq] = useState('');
  const [pH, setPh] = useState(7.0);

  const [results, setResults] = useState(null);
  const [validationError, setValidationError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const steps = [
    { number: 1, title: 'Inputs & Parameters' },
    { number: 2, title: 'Titration Curve' }
  ];

  // Calculate Net Charge at a given pH
  const calculateChargeAtPh = (seq, phVal) => {
    let charge = 0;
    // N-terminus (+1 at low pH)
    charge += 1.0 / (1.0 + Math.pow(10, phVal - AMINO_ACID_PKA.N_terminus));
    // C-terminus (-1 at high pH)
    charge -= 1.0 / (1.0 + Math.pow(10, AMINO_ACID_PKA.C_terminus - phVal));

    for (let char of seq) {
      if (char === 'D') {
        charge -= 1.0 / (1.0 + Math.pow(10, AMINO_ACID_PKA.D - phVal));
      } else if (char === 'E') {
        charge -= 1.0 / (1.0 + Math.pow(10, AMINO_ACID_PKA.E - phVal));
      } else if (char === 'C') {
        charge -= 1.0 / (1.0 + Math.pow(10, AMINO_ACID_PKA.C - phVal));
      } else if (char === 'Y') {
        charge -= 1.0 / (1.0 + Math.pow(10, AMINO_ACID_PKA.Y - phVal));
      } else if (char === 'K') {
        charge += 1.0 / (1.0 + Math.pow(10, phVal - AMINO_ACID_PKA.K));
      } else if (char === 'R') {
        charge += 1.0 / (1.0 + Math.pow(10, phVal - AMINO_ACID_PKA.R));
      } else if (char === 'H') {
        charge += 1.0 / (1.0 + Math.pow(10, phVal - AMINO_ACID_PKA.H));
      }
    }
    return charge;
  };

  // Find pI where net charge is 0 using bisection method
  const findPI = (seq) => {
    let low = 0.0;
    let high = 14.0;
    let mid = 7.0;
    const epsilon = 0.0001;
    let stepsCount = 0;

    while (high - low > epsilon && stepsCount < 100) {
      mid = (low + high) / 2;
      const charge = calculateChargeAtPh(seq, mid);
      if (Math.abs(charge) < epsilon) {
        return mid;
      }
      if (charge > 0) {
        low = mid;
      } else {
        high = mid;
      }
      stepsCount++;
    }
    return mid;
  };

  const runTitrationCalculation = () => {
    const singleLetterInput = convertThreeToSingle(rawSeq);
    const clean = cleanSequence(singleLetterInput, 'ACDEFGHIKLMNPQRSTVWY');
    if (!clean) {
      setValidationError('Please enter a peptide sequence.');
      return;
    }
    const invalidChars = clean.replace(/[ACDEFGHIKLMNPQRSTVWY]/g, '');
    if (invalidChars.length > 0) {
      setValidationError(`Invalid residue(s) detected: ${invalidChars.substring(0, 10)}. Please use standard 1-letter or 3-letter AA codes.`);
      return;
    }
    setValidationError('');

    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);

      let mw = 0;
      for (let char of clean) {
        const massInfo = AMINO_ACID_MASSES[char];
        mw += massInfo ? massInfo.avg : 110;
      }
      mw += 18.02;

      let trpCount = 0, tyrCount = 0, cysCount = 0;
      for (let char of clean) {
        if (char === 'W') trpCount++;
        else if (char === 'Y') tyrCount++;
        else if (char === 'C') cysCount++;
      }
      const ext = (trpCount * 5500) + (tyrCount * 1490) + (Math.floor(cysCount / 2) * 125);

      const dataPoints = [];
      for (let p = 0; p <= 140; p += 2) {
        const phVal = p / 10;
        dataPoints.push({
          pH: phVal,
          charge: calculateChargeAtPh(clean, phVal)
        });
      }

      const pI = findPI(clean);
      const currentCharge = calculateChargeAtPh(clean, pH);

      let acidicCount = 0, basicCount = 0, polarCount = 0, nonpolarCount = 0;
      for (let char of clean) {
        if ('DE'.includes(char)) acidicCount++;
        else if ('KRH'.includes(char)) basicCount++;
        else if ('STNQYC'.includes(char)) polarCount++;
        else if ('AVLIMFWPG'.includes(char)) nonpolarCount++;
      }
      const total = clean.length;

      setResults({
        clean,
        length: clean.length,
        mw: (mw / 1000).toFixed(2), // convert to kDa
        ext,
        pI: pI.toFixed(2),
        currentCharge: currentCharge.toFixed(2),
        dataPoints,
        composition: {
          acidic: ((acidicCount / total) * 100).toFixed(1),
          basic: ((basicCount / total) * 100).toFixed(1),
          polar: ((polarCount / total) * 100).toFixed(1),
          nonpolar: ((nonpolarCount / total) * 100).toFixed(1)
        }
      });

      setActiveStep(2);
    }, 800);
  };

  const loadProteinSample = () => {
    setRawSeq('MDYKDDDDKLAAALAAALAAALAAAEEEDDDFFFKKKRRRHHH');
    setValidationError('');
  };

  const getExportCsv = () => {
    if (!results) return '';
    let csv = 'pH,NetCharge\n';
    results.dataPoints.forEach((pt) => {
      csv += `${pt.pH},${pt.charge.toFixed(3)}\n`;
    });
    return csv;
  };

  const getExportSummary = () => {
    if (!results) return '';
    return `ProtCharge Summary Report:\nIsoelectric Point (pI): ${results.pI}\nNet Charge at pH 7.0: ${calculateChargeAtPh(results.clean, 7.0).toFixed(2)}\nNet Charge at pH ${pH}: ${results.currentCharge}\nMolecular Weight: ${results.mw} kDa\nExtinction Coefficient (280nm): ${results.ext} M-1 cm-1`;
  };

  const renderCurvePath = () => {
    if (!results) return '';
    const points = results.dataPoints;
    const maxVal = Math.max(10, Math.abs(points[0].charge), Math.abs(points[points.length - 1].charge));

    return points.map((pt, idx) => {
      const x = 15 + (pt.pH / 14) * 120;
      const y = 75 - (pt.charge / maxVal) * 60;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  };

  const getPiCoordinates = () => {
    if (!results) return { x: 0, y: 0 };
    const pIVal = parseFloat(results.pI);
    const x = 15 + (pIVal / 14) * 120;
    const y = 75;
    return { x: x.toFixed(1), y: y.toFixed(1) };
  };

  const getCurrentPhCoordinates = () => {
    if (!results) return { x: 0, y: 0 };
    const points = results.dataPoints;
    const maxVal = Math.max(10, Math.abs(points[0].charge), Math.abs(points[points.length - 1].charge));
    const curCharge = parseFloat(results.currentCharge);
    const x = 15 + (pH / 14) * 120;
    const y = 75 - (curCharge / maxVal) * 60;
    return { x: x.toFixed(1), y: y.toFixed(1) };
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
    <ToolShell slug="protcharge">
      {renderStepTracker()}

      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        {/* Step 1: Inputs & Parameters */}
        {activeStep === 1 && (
          <div className="bx-step-section">
            <div className="bx-step-header">
              <span className="bx-step-badge">Step 1</span>
              <h3 className="bx-step-title">Peptide Sequence & pH Target</h3>
            </div>

            <div className="bx-field-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="prot-seq" className="bx-label">Peptide residues (e.g. Met-Ala-Pro or MAP...)</label>
                <button type="button" className="bx-btn-sample" onClick={loadProteinSample}>Load Sample Peptide</button>
              </div>
              <textarea
                id="prot-seq"
                className="bx-textarea"
                style={{ height: '140px' }}
                placeholder="Enter 1-letter FASTA sequence or 3-letter space/dash separated sequence..."
                value={rawSeq}
                onChange={(e) => {
                  setRawSeq(e.target.value);
                  setValidationError('');
                }}
              />
              {validationError && <p style={{ color: 'var(--red)', fontSize: '12px', marginTop: '4px' }}>{validationError}</p>}
            </div>

            <div className="bx-field-group" style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label htmlFor="ph-range-slider" className="bx-label">Environmental pH Target</label>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--accent-d)' }}>pH {pH.toFixed(1)}</span>
              </div>
              <input
                id="ph-range-slider"
                type="range"
                className="bx-slider"
                min="0"
                max="14"
                step="0.1"
                value={pH}
                onChange={(e) => setPh(parseFloat(e.target.value))}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                type="button"
                className="bx-btn-primary"
                onClick={runTitrationCalculation}
                disabled={isAnalyzing || !rawSeq.trim()}
              >
                {isAnalyzing ? (
                  <>
                    <svg style={{ animation: 'spin 1s infinite linear', width: '16px', height: '16px', stroke: 'currentColor', fill: 'none', marginRight: '6px' }} viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" strokeWidth="2.5" strokeDasharray="32" strokeDashoffset="12"/>
                    </svg>
                    Solving Henderson-Hasselbalch...
                  </>
                ) : (
                  'Compute Isoelectric Point'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Output Titration Graph */}
        {activeStep === 2 && results && (
          <div className="bx-step-section">
            <div className="bx-step-header">
              <span className="bx-step-badge">Step 2</span>
              <h3 className="bx-step-title">Titration Curve & pI Results</h3>
            </div>

            {/* pI Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="bx-result-box">
                <div className="bx-result-val">{results.pI}</div>
                <div className="bx-result-lbl">Isoelectric Point (pI)</div>
              </div>
              <div className="bx-result-box">
                <div className="bx-result-val">{results.currentCharge} e</div>
                <div className="bx-result-lbl">Net Charge at pH {pH.toFixed(1)}</div>
              </div>
            </div>

            {/* Titration SVG Plot */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', backgroundColor: 'var(--white)', marginTop: '12px' }}>
              <svg viewBox="0 0 150 150" style={{ width: '100%', height: '200px' }}>
                <line x1="15" y1="75" x2="135" y2="75" stroke="var(--border2)" strokeWidth="1.5" />
                <line x1="75" y1="15" x2="75" y2="135" stroke="var(--border)" strokeWidth="1" strokeDasharray="2 2" />
                
                <text x="135" y="82" fontSize="5.5" fill="var(--text3)" textAnchor="end">pH 14</text>
                <text x="15" y="82" fontSize="5.5" fill="var(--text3)">pH 0</text>
                <text x="77" y="21" fontSize="5.5" fill="var(--text3)">Net Charge (+)</text>
                <text x="77" y="132" fontSize="5.5" fill="var(--text3)">Net Charge (-)</text>

                <path d={renderCurvePath()} fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" />

                {/* pI dot */}
                {(() => {
                  const coords = getPiCoordinates();
                  return (
                    <g>
                      <circle cx={coords.x} cy={coords.y} r="3" fill="#10b981" />
                      <text x={coords.x} y={parseFloat(coords.y) - 6} fontSize="6.5" fontWeight="bold" fill="var(--accent-d)" textAnchor="middle">
                        pI {results.pI}
                      </text>
                    </g>
                  );
                })()}

                {/* pH dot */}
                {(() => {
                  const coords = getCurrentPhCoordinates();
                  return (
                    <g>
                      <circle cx={coords.x} cy={coords.y} r="3" fill="var(--amber)" />
                      <line x1={coords.x} y1="15" x2={coords.x} y2="135" stroke="var(--amber)" strokeWidth="0.8" strokeDasharray="3 3" />
                    </g>
                  );
                })()}
              </svg>
            </div>

            {/* AA composition percentages */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', backgroundColor: 'var(--off)', marginTop: '12px' }}>
              <span className="bx-label" style={{ display: 'block', marginBottom: '8px' }}>Amino Acid Composition Profile</span>
              <div style={{ display: 'flex', gap: '8px', fontSize: '11px', textAlign: 'center' }}>
                <div style={{ flex: 1, backgroundColor: 'var(--white)', padding: '6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 'bold', color: 'var(--amber-d)' }}>{results.composition.acidic}%</div>
                  <div style={{ fontSize: '9px', color: 'var(--text3)', marginTop: '2px' }}>Acidic (D,E)</div>
                </div>
                <div style={{ flex: 1, backgroundColor: 'var(--white)', padding: '6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 'bold', color: '#0ea5e9' }}>{results.composition.basic}%</div>
                  <div style={{ fontSize: '9px', color: 'var(--text3)', marginTop: '2px' }}>Basic (K,R,H)</div>
                </div>
                <div style={{ flex: 1, backgroundColor: 'var(--white)', padding: '6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 'bold', color: 'var(--purple)' }}>{results.composition.polar}%</div>
                  <div style={{ fontSize: '9px', color: 'var(--text3)', marginTop: '2px' }}>Polar (S,T,Y,C,N,Q)</div>
                </div>
                <div style={{ flex: 1, backgroundColor: 'var(--white)', padding: '6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 'bold', color: 'var(--accent)' }}>{results.composition.nonpolar}%</div>
                  <div style={{ fontSize: '9px', color: 'var(--text3)', marginTop: '2px' }}>Nonpolar</div>
                </div>
              </div>
            </div>

            {/* Extra Physical Properties */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
              <div className="bx-result-box">
                <div className="bx-result-val">{results.mw} kDa</div>
                <div className="bx-result-lbl">Molecular Weight</div>
              </div>
              <div className="bx-result-box">
                <div className="bx-result-val">{results.ext} M⁻¹cm⁻¹</div>
                <div className="bx-result-lbl">Extinction Coeff (&epsilon;280)</div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '12px' }}>
              <CopyButton text={getExportSummary()} />
              <ExportButton data={getExportCsv()} filename="protein_titration_curve.csv" format="csv" />
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
              <button
                type="button"
                className="bx-btn-primary"
                onClick={resetAnalysis}
                style={{ background: 'var(--text2)', boxShadow: 'none' }}
              >
                ← Start Over / Modify Inputs
              </button>
            </div>
          </div>
        )}
      </div>
    </ToolShell>
  );
}
