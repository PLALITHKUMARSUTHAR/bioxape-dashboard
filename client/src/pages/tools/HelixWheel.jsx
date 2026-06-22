import React, { useState } from 'react';
import ToolShell, { CopyButton, ExportButton } from '../../components/tools/ToolShell';
import { cleanSequence, KYTE_DOOLITTLE_SCALE, HOPP_WOODS_SCALE, EISENBERG_SCALE } from '../../utils/bioutils';

export default function HelixWheel() {
  const [activeStep, setActiveStep] = useState(1);
  const [rawSeq, setRawSeq] = useState('');
  const [selectedScale, setSelectedScale] = useState('kyte');
  const [windowSize, setWindowSize] = useState(7);
  const [hoveredResidue, setHoveredResidue] = useState(null); // position index (1-based)

  const [results, setResults] = useState(null);
  const [validationError, setValidationError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const steps = [
    { number: 1, title: 'Inputs & Parameters' },
    { number: 2, title: 'Helical Projection' }
  ];

  const scaleMap = {
    kyte: KYTE_DOOLITTLE_SCALE,
    hopp: HOPP_WOODS_SCALE,
    eisenberg: EISENBERG_SCALE
  };

  const runHelicalProjection = () => {
    const clean = cleanSequence(rawSeq, 'ACDEFGHIKLMNPQRSTVWY');
    if (!clean) {
      setValidationError('Please enter a peptide sequence.');
      return;
    }
    const invalidChars = clean.replace(/[ACDEFGHIKLMNPQRSTVWY]/g, '');
    if (invalidChars.length > 0) {
      setValidationError(`Invalid residue(s) detected: ${invalidChars.substring(0, 10)}. Please use standard protein alphabet.`);
      return;
    }
    setValidationError('');

    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);

      const scale = scaleMap[selectedScale];
      const len = clean.length;

      let wSize = parseInt(windowSize) || 7;
      if (wSize % 2 === 0) wSize += 1;
      wSize = Math.max(3, Math.min(wSize, len));

      const wheelNodes = [];
      let sumX = 0;
      let sumY = 0;

      for (let i = 0; i < len; i++) {
        const char = clean[i];
        const hydVal = scale[char] || 0;
        const angleDeg = (i * 100) % 360;
        const angleRad = (angleDeg * Math.PI) / 180;

        sumX += hydVal * Math.cos(angleRad);
        sumY += hydVal * Math.sin(angleRad);

        let type = 'nonpolar';
        let color = '#10b981'; // default emerald
        if ('DE'.includes(char)) {
          type = 'acidic';
          color = '#8b5cf6'; // violet
        } else if ('KRH'.includes(char)) {
          type = 'basic';
          color = '#3b82f6'; // blue
        } else if ('STNQYC'.includes(char)) {
          type = 'polar';
          color = '#0ea5e9'; // sky
        } else if ('AVLIMFWPG'.includes(char)) {
          type = 'hydrophobic';
          color = '#f59e0b'; // amber
        }

        wheelNodes.push({
          index: i + 1,
          residue: char,
          angle: angleDeg,
          hydVal,
          type,
          color
        });
      }

      const momentX = sumX / len;
      const momentY = sumY / len;
      const momentMag = Math.sqrt(momentX * momentX + momentY * momentY);
      const momentAngleRad = Math.atan2(momentY, momentX);
      const momentAngleDeg = (momentAngleRad * 180) / Math.PI;

      let amphipathicLabel = 'Non-amphipathic';
      if (momentMag > 0.4) {
        amphipathicLabel = 'Strongly amphipathic';
      } else if (momentMag > 0.2) {
        amphipathicLabel = 'Weakly amphipathic';
      }

      const windowScores = [];
      const halfWindow = Math.floor(wSize / 2);

      for (let i = 0; i < len; i++) {
        const start = Math.max(0, i - halfWindow);
        const end = Math.min(len - 1, i + halfWindow);
        
        let sum = 0;
        for (let j = start; j <= end; j++) {
          sum += scale[clean[j]] || 0;
        }
        const score = sum / (end - start + 1);

        windowScores.push({
          position: i + 1,
          residue: clean[i],
          score: parseFloat(score.toFixed(3))
        });
      }

      setResults({
        clean,
        length: len,
        momentMag: momentMag.toFixed(3),
        momentAngle: momentAngleDeg,
        amphipathicLabel,
        wheelNodes,
        windowScores,
        wSize
      });

      setActiveStep(2);
    }, 850);
  };

  const loadHelicalSample = () => {
    setRawSeq('ALASVILSLAAGVILSLAL');
    setValidationError('');
  };

  const getCsvData = () => {
    if (!results) return '';
    let csv = 'ResiduePosition,Residue,HydrophobicityValue,SlidingWindowScore\n';
    for (let i = 0; i < results.clean.length; i++) {
      csv += `${i + 1},${results.clean[i]},${results.wheelNodes[i].hydVal},${results.windowScores[i].score}\n`;
    }
    return csv;
  };

  const getNodeCoords = (angleDeg, radius = 35) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: 60 + radius * Math.cos(rad),
      y: 60 + radius * Math.sin(rad)
    };
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
    <ToolShell slug="helixwheel">
      {renderStepTracker()}

      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        {/* Step 1: Inputs & Parameters */}
        {activeStep === 1 && (
          <div className="bx-step-section">
            <div className="bx-step-header">
              <span className="bx-step-badge">Step 1</span>
              <h3 className="bx-step-title">Peptide Sequence & Helical Parameters</h3>
            </div>

            <div className="bx-field-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="helix-seq" className="bx-label">Peptide Residues (1-letter code)</label>
                <button type="button" className="bx-btn-sample" onClick={loadHelicalSample}>Load Amphipathic Sample</button>
              </div>
              <textarea
                id="helix-seq"
                className="bx-textarea"
                placeholder="Paste peptide amino acids, e.g. ALAS..."
                value={rawSeq}
                onChange={(e) => {
                  setRawSeq(e.target.value.toUpperCase());
                  setValidationError('');
                }}
              />
              {validationError && <p style={{ color: 'var(--red)', fontSize: '12px', marginTop: '4px' }}>{validationError}</p>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '12px' }}>
              <div className="bx-field-group">
                <label htmlFor="scale-select" className="bx-label">Hydrophobicity Index Scale</label>
                <select
                  id="scale-select"
                  className="bx-select"
                  value={selectedScale}
                  onChange={(e) => setSelectedScale(e.target.value)}
                >
                  <option value="kyte">Kyte-Doolittle (Standard Partition)</option>
                  <option value="hopp">Hopp-Woods (Antigenic Profile)</option>
                  <option value="eisenberg">Eisenberg (Consensus Hydrophobicity)</option>
                </select>
              </div>

              <div className="bx-field-group">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <label htmlFor="window-size-input" className="bx-label">Sliding Window size</label>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--accent-d)' }}>{windowSize} residues</span>
                </div>
                <input
                  id="window-size-input"
                  type="range"
                  className="bx-slider"
                  min="3"
                  max="19"
                  step="2"
                  value={windowSize}
                  onChange={(e) => setWindowSize(parseInt(e.target.value))}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                type="button"
                className="bx-btn-primary"
                onClick={runHelicalProjection}
                disabled={isAnalyzing || !rawSeq.trim()}
              >
                {isAnalyzing ? (
                  <>
                    <svg style={{ animation: 'spin 1s infinite linear', width: '16px', height: '16px', stroke: 'currentColor', fill: 'none', marginRight: '6px' }} viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" strokeWidth="2.5" strokeDasharray="32" strokeDashoffset="12"/>
                    </svg>
                    Mapping Vector Geometry...
                  </>
                ) : (
                  'Plot Helical Topologies'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Results */}
        {activeStep === 2 && results && (
          <div className="bx-step-section">
            <div className="bx-step-header">
              <span className="bx-step-badge">Step 2</span>
              <h3 className="bx-step-title">Helical Wheel Projection Results</h3>
            </div>

            {/* Moment Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px' }}>
              <div className="bx-result-box" style={{ textAlign: 'left' }}>
                <div className="bx-result-val">{results.momentMag}</div>
                <div className="bx-result-lbl">Hydrophobic Moment (⟨μH⟩)</div>
              </div>
              <div className="bx-result-box">
                <div className="bx-result-val" style={{ fontSize: '14px' }}>{results.amphipathicLabel}</div>
                <div className="bx-result-lbl">Prediction Profile</div>
              </div>
            </div>

            {/* Projection SVG Panels */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
              {/* Helix Wheel SVG */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', backgroundColor: '#fff' }}>
                <span className="bx-label" style={{ fontSize: '12px', marginBottom: '8px' }}>Alpha-Helix Ring Projection</span>
                <svg viewBox="0 0 120 120" style={{ width: '100%', height: '200px' }}>
                  <circle cx="60" cy="60" r="35" fill="none" stroke="var(--border)" strokeWidth="1" />
                  
                  {/* Lines showing Turn connection */}
                  {results.wheelNodes.map((node, i) => {
                    if (i === results.wheelNodes.length - 1) return null;
                    const nextNode = results.wheelNodes[i + 1];
                    const start = getNodeCoords(node.angle, 35);
                    const end = getNodeCoords(nextNode.angle, 35);
                    
                    const midX = (start.x + end.x) / 2 + 3 * Math.cos(((node.angle + nextNode.angle) / 2) * Math.PI / 180);
                    const midY = (start.y + end.y) / 2 + 3 * Math.sin(((node.angle + nextNode.angle) / 2) * Math.PI / 180);

                    return (
                      <path
                        key={i}
                        d={`M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`}
                        fill="none"
                        stroke="var(--accent)"
                        strokeWidth="0.8"
                        opacity="0.5"
                      />
                    );
                  })}

                  {/* Vector Arrow */}
                  {(() => {
                    const angleRad = (results.momentAngle * Math.PI) / 180;
                    const arrowLen = Math.min(32, Math.max(5, parseFloat(results.momentMag) * 45));
                    const endX = 60 + arrowLen * Math.cos(angleRad);
                    const endY = 60 + arrowLen * Math.sin(angleRad);

                    return (
                      <g>
                        <line x1="60" y1="60" x2={endX} y2={endY} stroke="var(--amber)" strokeWidth="2" />
                        <circle cx={endX} cy={endY} r="2" fill="var(--amber)" />
                        <text x="60" y="66" fontSize="5.5" fontWeight="bold" fill="var(--amber)" textAnchor="middle">⟨μH⟩ Vector</text>
                      </g>
                    );
                  })()}

                  {/* Nodes */}
                  {results.wheelNodes.map((node) => {
                    const pt = getNodeCoords(node.angle, 35);
                    const isHovered = hoveredResidue === node.index;
                    return (
                      <g
                        key={node.index}
                        cursor="pointer"
                        onMouseEnter={() => setHoveredResidue(node.index)}
                        onMouseLeave={() => setHoveredResidue(null)}
                      >
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={isHovered ? '5.5' : '4.5'}
                          fill={node.color}
                          stroke={isHovered ? 'var(--text1)' : '#fff'}
                          strokeWidth="1.2"
                          style={{ transition: 'r 0.15s ease' }}
                        />
                        <text
                          x={pt.x}
                          y={pt.y + 1.5}
                          fontSize="5.5"
                          fontWeight="bold"
                          fill="#fff"
                          textAnchor="middle"
                        >
                          {node.residue}
                        </text>
                        <text
                          x={pt.x}
                          y={pt.y + 9}
                          fontSize="5"
                          fontWeight="bold"
                          fill="var(--text2)"
                          textAnchor="middle"
                          visibility={isHovered ? 'visible' : 'hidden'}
                        >
                          {node.index}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Line Plot SVG */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', backgroundColor: '#fff' }}>
                <span className="bx-label" style={{ fontSize: '12px', marginBottom: '8px' }}>Hydropathy Plot (Window size: {results.wSize})</span>
                <svg viewBox="0 0 160 80" style={{ width: '100%', height: '140px' }}>
                  <line x1="15" y1="40" x2="145" y2="40" stroke="var(--border2)" strokeWidth="1" />
                  
                  <text x="145" y="44" fontSize="5" fill="var(--text3)" textAnchor="end">End</text>
                  <text x="15" y="44" fontSize="5" fill="var(--text3)">Start</text>
                  <text x="148" y="15" fontSize="4.5" fill="var(--text3)" textAnchor="end">Hydrophobic</text>
                  <text x="148" y="70" fontSize="4.5" fill="var(--text3)" textAnchor="end">Hydrophilic</text>

                  {(() => {
                    const points = results.windowScores;
                    const maxAbsScore = Math.max(1.5, ...points.map(p => Math.abs(p.score)));
                    
                    const pathCoords = points.map((p, idx) => {
                      const x = 15 + (idx / (points.length - 1)) * 130;
                      const y = 40 - (p.score / maxAbsScore) * 30;
                      return { x, y, score: p.score, index: p.position };
                    });

                    const dStr = pathCoords.map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(' ');

                    return (
                      <g>
                        <path
                          d={`M 15 40 ${pathCoords.map(p => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')} L 145 40 Z`}
                          fill="var(--accent-l)"
                          opacity="0.3"
                        />
                        <path d={dStr} fill="none" stroke="var(--accent)" strokeWidth="1.5" />
                        
                        {pathCoords.map((pt) => (
                          <circle
                            key={pt.index}
                            cx={pt.x}
                            cy={pt.y}
                            r={hoveredResidue === pt.index ? '3' : '1'}
                            fill={hoveredResidue === pt.index ? 'var(--amber)' : 'var(--accent)'}
                            cursor="pointer"
                            onMouseEnter={() => setHoveredResidue(pt.index)}
                            onMouseLeave={() => setHoveredResidue(null)}
                          />
                        ))}
                      </g>
                    );
                  })()}
                </svg>
              </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: '10px', fontSize: '11px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '12px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }} /> Hydrophobic
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#0ea5e9' }} /> Polar Uncharged
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#8b5cf6' }} /> Acidic (-)
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3b82f6' }} /> Basic (+)
              </span>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '16px' }}>
              <CopyButton text={`HelixWheel Peptide Analysis:\nSequence: ${results.clean}\nHydrophobic Moment: ${results.momentMag} (${results.amphipathicLabel})`} />
              <ExportButton data={getCsvData()} filename="helixwheel_hydropathy_scores.csv" format="csv" />
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
