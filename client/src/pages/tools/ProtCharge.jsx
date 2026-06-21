import React, { useState, useEffect, useRef } from 'react';
import ToolShell, { CopyButton, ExportButton } from '../../components/tools/ToolShell';
import { cleanSequence, AMINO_ACID_PKA, AMINO_ACID_MASSES } from '../../utils/bioutils';
import useDebouncedValue from '../../hooks/useDebouncedValue';

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
        return str; // Return original if not a clean three-letter sequence
      }
    }
    return result;
  }
  return str;
};

export default function ProtCharge() {
  const [rawSeq, setRawSeq] = useState('');
  const [pH, setPh] = useState(7.0);

  const debouncedSeq = useDebouncedValue(rawSeq, 250);
  const debouncedPh = useDebouncedValue(pH, 50);

  const [results, setResults] = useState(null);
  const [validationError, setValidationError] = useState('');

  const chartRef = useRef(null);

  // Calculate Net Charge at a given pH
  const calculateChargeAtPh = (seq, phVal) => {
    // Count ionizable residues
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
    let steps = 0;

    while (high - low > epsilon && steps < 100) {
      mid = (low + high) / 2;
      const charge = calculateChargeAtPh(seq, mid);
      if (Math.abs(charge) < epsilon) {
        return mid;
      }
      if (charge > 0) {
        low = mid; // Charge is positive, pI must be higher pH
      } else {
        high = mid; // Charge is negative, pI must be lower pH
      }
      steps++;
    }
    return mid;
  };

  useEffect(() => {
    // Pre-process 3-letter sequence codes
    const singleLetterInput = convertThreeToSingle(debouncedSeq);
    const clean = cleanSequence(singleLetterInput, 'ACDEFGHIKLMNPQRSTVWY');
    if (!clean) {
      setResults(null);
      setValidationError('');
      return;
    }

    // Validate amino acid letters
    const invalidChars = clean.replace(/[ACDEFGHIKLMNPQRSTVWY]/g, '');
    if (invalidChars.length > 0) {
      setValidationError(`Invalid residue(s) detected: ${invalidChars.substring(0, 10)}. Please use standard 1-letter or 3-letter AA codes.`);
      setResults(null);
      return;
    }
    setValidationError('');

    // Molecular Weight Calculation (plus terminal H2O mass 18.02 Da)
    let mw = 0;
    for (let char of clean) {
      const massInfo = AMINO_ACID_MASSES[char];
      mw += massInfo ? massInfo.avg : 110;
    }
    mw += 18.02;

    // Extinction coefficient at 280nm
    let trpCount = 0, tyrCount = 0, cysCount = 0;
    for (let char of clean) {
      if (char === 'W') trpCount++;
      else if (char === 'Y') tyrCount++;
      else if (char === 'C') cysCount++;
    }
    const ext = (trpCount * 5500) + (tyrCount * 1490) + (Math.floor(cysCount / 2) * 125);

    // Titration Curve data points (pH 0 to 14, step 0.2)
    const dataPoints = [];
    for (let p = 0; p <= 140; p += 2) {
      const phVal = p / 10;
      dataPoints.push({
        pH: phVal,
        charge: calculateChargeAtPh(clean, phVal)
      });
    }

    const pI = findPI(clean);
    const currentCharge = calculateChargeAtPh(clean, debouncedPh);

    // Group amino acid composition
    // Acidic (D, E), Basic (K, R, H), Polar Uncharged (S, T, N, Q, Y, C), Nonpolar (A, V, L, I, M, F, W, P, G)
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

  }, [debouncedSeq, debouncedPh]);

  const loadProteinSample = () => {
    setRawSeq('MDYKDDDDKLAAALAAALAAALAAAEEEDDDFFFKKKRRRHHH');
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

  // SVG Line titration plot mapping coordinates
  const renderCurvePath = () => {
    if (!results) return '';
    const points = results.dataPoints;

    // We map pH 0-14 to SVG X 15-135 (width 120)
    // We map Charge -40 to +40 to SVG Y 135-15 (height 120)
    // Find scale max based on endpoints to keep curve readable
    const maxVal = Math.max(10, Math.abs(points[0].charge), Math.abs(points[points.length - 1].charge));

    return points.map((pt, idx) => {
      const x = 15 + (pt.pH / 14) * 120;
      // y center is 75, offset is scaled relative to maxVal
      const y = 75 - (pt.charge / maxVal) * 60;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  };

  const getPiCoordinates = () => {
    if (!results) return { x: 0, y: 0 };
    const points = results.dataPoints;
    const maxVal = Math.max(10, Math.abs(points[0].charge), Math.abs(points[points.length - 1].charge));
    const pIVal = parseFloat(results.pI);

    const x = 15 + (pIVal / 14) * 120;
    const y = 75; // charge is zero at pI
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

  return (
    <ToolShell slug="protcharge">
      <div className="bx-tools-grid">
        {/* Left Side: Sequence & Slider */}
        <div className="tool-pane-card">
          <div className="tool-pane-title">
            <span>Inputs</span>
            <button type="button" className="mock-sample-btn" onClick={loadProteinSample}>Load Sample Peptide</button>
          </div>

          <div className="mock-field-group">
            <label className="mock-label" htmlFor="prot-seq">Protein Sequence (1-letter or 3-letter space/dash separated)</label>
            <textarea
              id="prot-seq"
              className="mock-textarea"
              style={{ height: '160px' }}
              placeholder="e.g. Met-Ala-Pro or MAP..."
              value={rawSeq}
              onChange={(e) => setRawSeq(e.target.value)}
            />
            {validationError && <p style={{ color: 'var(--red)', fontSize: '12px', marginTop: '4px' }}>{validationError}</p>}
          </div>

          <div className="mock-field-group">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label className="mock-label" htmlFor="ph-range-slider">Current pH Environment</label>
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--accent-d)' }}>pH {pH.toFixed(1)}</span>
            </div>
            <input
              id="ph-range-slider"
              type="range"
              min="0"
              max="14"
              step="0.1"
              value={pH}
              onChange={(e) => setPh(parseFloat(e.target.value))}
              style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
            />
          </div>
        </div>

        {/* Right Side: Titration Curve Visualizer */}
        <div className="tool-pane-card">
          <div className="tool-pane-title">Titration Curve & pI</div>

          {results ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* pI Display Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="mock-result-box">
                  <div className="mock-result-value">{results.pI}</div>
                  <div className="mock-result-label">Isoelectric Point (pI)</div>
                </div>
                <div className="mock-result-box">
                  <div className="mock-result-value">{results.currentCharge} e</div>
                  <div className="mock-result-label">Charge at pH {pH.toFixed(1)}</div>
                </div>
              </div>

              {/* Titration SVG curve */}
              <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '8px', backgroundColor: 'var(--white)' }}>
                <svg viewBox="0 0 150 150" ref={chartRef} style={{ width: '100%', height: '220px' }}>
                  {/* Grid lines */}
                  <line x1="15" y1="75" x2="135" y2="75" stroke="var(--border2)" strokeWidth="1.5" /> {/* y=0 */}
                  <line x1="75" y1="15" x2="75" y2="135" stroke="var(--border)" strokeWidth="1" strokeDasharray="2 2" /> {/* pH=7 */}
                  
                  {/* Axis labels */}
                  <text x="135" y="82" fontSize="5" fill="var(--text3)" textAnchor="end">pH 14</text>
                  <text x="15" y="82" fontSize="5" fill="var(--text3)">pH 0</text>
                  <text x="77" y="20" fontSize="5" fill="var(--text3)">Net Charge (+)</text>
                  <text x="77" y="132" fontSize="5" fill="var(--text3)">Net Charge (-)</text>

                  {/* Titration curve path */}
                  <path d={renderCurvePath()} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />

                  {/* pI Zero crossing dot */}
                  {(() => {
                    const coords = getPiCoordinates();
                    return (
                      <g>
                        <circle cx={coords.x} cy={coords.y} r="3" fill="#10b981" />
                        <text x={coords.x} y={parseFloat(coords.y) - 6} fontSize="5" fontWeight="bold" fill="var(--accent-d)" textAnchor="middle">
                          pI {results.pI}
                        </text>
                      </g>
                    );
                  })()}

                  {/* Current pH tracker dot */}
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

              {/* Composition Breakdown */}
              <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
                <span className="mock-label" style={{ display: 'block', marginBottom: '8px' }}>Peptide Amino Acid Profile</span>
                <div style={{ display: 'flex', gap: '8px', fontSize: '11px', textAlign: 'center' }}>
                  <div style={{ flex: 1, backgroundColor: 'var(--off)', padding: '6px', borderRadius: '4px' }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--amber)' }}>{results.composition.acidic}%</div>
                    <div style={{ fontSize: '9px', color: 'var(--text3)' }}>Acidic (D,E)</div>
                  </div>
                  <div style={{ flex: 1, backgroundColor: 'var(--off)', padding: '6px', borderRadius: '4px' }}>
                    <div style={{ fontWeight: 'bold', color: '#0ea5e9' }}>{results.composition.basic}%</div>
                    <div style={{ fontSize: '9px', color: 'var(--text3)' }}>Basic (K,R,H)</div>
                  </div>
                  <div style={{ flex: 1, backgroundColor: 'var(--off)', padding: '6px', borderRadius: '4px' }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--purple)' }}>{results.composition.polar}%</div>
                    <div style={{ fontSize: '9px', color: 'var(--text3)' }}>Polar (S,T,Y,C,N,Q)</div>
                  </div>
                  <div style={{ flex: 1, backgroundColor: 'var(--off)', padding: '6px', borderRadius: '4px' }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--accent)' }}>{results.composition.nonpolar}%</div>
                    <div style={{ fontSize: '9px', color: 'var(--text3)' }}>Nonpolar</div>
                  </div>
                </div>
              </div>

              {/* Physical stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="mock-result-box">
                  <div className="mock-result-value">{results.mw} kDa</div>
                  <div className="mock-result-label">Molecular Weight</div>
                </div>
                <div className="mock-result-box">
                  <div className="mock-result-value">{results.ext} M⁻¹cm⁻¹</div>
                  <div className="mock-result-label">Extinction Coeff (ε280)</div>
                </div>
              </div>

              {/* Actions row */}
              <div className="mock-actions-row">
                <CopyButton text={getExportSummary()} />
                <ExportButton data={getExportCsv()} filename="protein_titration_curve.csv" format="csv" />
              </div>

            </div>
          ) : (
            <div className="mock-empty-results">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '48px', height: '48px', color: 'var(--text4)', marginBottom: '12px' }}>
                <path d="M7 12l3-3 3 3 4-4M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/>
              </svg>
              <p style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text2)', marginBottom: '4px' }}>No Sequence Analyzed</p>
              <p style={{ fontSize: '13px', lineHeight: 1.4 }}>Enter or paste protein amino acid sequences to map charge curves and pI.</p>
            </div>
          )}
        </div>
      </div>
    </ToolShell>
  );
}
