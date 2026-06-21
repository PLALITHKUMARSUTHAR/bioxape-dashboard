import React, { useState, useEffect } from 'react';
import ToolShell, { CopyButton, ExportButton } from '../../components/tools/ToolShell';
import { cleanSequence, KYTE_DOOLITTLE_SCALE, HOPP_WOODS_SCALE, EISENBERG_SCALE } from '../../utils/bioutils';
import useDebouncedValue from '../../hooks/useDebouncedValue';

export default function HelixWheel() {
  const [rawSeq, setRawSeq] = useState('');
  const [selectedScale, setSelectedScale] = useState('kyte');
  const [windowSize, setWindowSize] = useState(7);
  const [hoveredResidue, setHoveredResidue] = useState(null); // position index (1-based)

  const debouncedSeq = useDebouncedValue(rawSeq, 250);
  const debouncedWindow = useDebouncedValue(windowSize, 150);

  const [results, setResults] = useState(null);
  const [validationError, setValidationError] = useState('');

  const scaleMap = {
    kyte: KYTE_DOOLITTLE_SCALE,
    hopp: HOPP_WOODS_SCALE,
    eisenberg: EISENBERG_SCALE
  };

  useEffect(() => {
    const clean = cleanSequence(debouncedSeq, 'ACDEFGHIKLMNPQRSTVWY');
    if (!clean) {
      setResults(null);
      setValidationError('');
      return;
    }

    const invalidChars = clean.replace(/[ACDEFGHIKLMNPQRSTVWY]/g, '');
    if (invalidChars.length > 0) {
      setValidationError(`Invalid residue(s) detected: ${invalidChars.substring(0, 10)}. Please use standard protein alphabet.`);
      setResults(null);
      return;
    }
    setValidationError('');

    const scale = scaleMap[selectedScale];
    const len = clean.length;

    // Validate window size: must be odd and <= sequence length
    let wSize = parseInt(debouncedWindow) || 7;
    if (wSize % 2 === 0) wSize += 1; // Round to nearest odd
    wSize = Math.max(3, Math.min(wSize, len)); // Bounds check

    // 1. Helical Wheel coordinates & hydrophobic vectors
    // Alpha helix: 100 degrees spacing per residue
    const wheelNodes = [];
    let sumX = 0;
    let sumY = 0;

    for (let i = 0; i < len; i++) {
      const char = clean[i];
      const hydVal = scale[char] || 0;
      const angleDeg = (i * 100) % 360;
      const angleRad = (angleDeg * Math.PI) / 180;

      // Add to vector sum for hydrophobic moment
      sumX += hydVal * Math.cos(angleRad);
      sumY += hydVal * Math.sin(angleRad);

      // Determine residue chemical class
      let type = 'nonpolar';
      let color = '#27a363'; // emerald (nonpolar default)
      if ('DE'.includes(char)) {
        type = 'acidic';
        color = '#8b5cf6'; // violet
      } else if ('KRH'.includes(char)) {
        type = 'basic';
        color = '#10b981'; // emerald-d
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

    // 2. Hydrophobic moment magnitude & categorization
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

    // 3. Sliding Window hydropathy scores
    const windowScores = [];
    const halfWindow = Math.floor(wSize / 2);

    for (let i = 0; i < len; i++) {
      // Symmetrically shrink window at edges
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

  }, [debouncedSeq, selectedScale, debouncedWindow]);

  const loadHelicalSample = () => {
    setRawSeq('ALASVILSLAAGVILSLAL');
  };

  const getCsvData = () => {
    if (!results) return '';
    let csv = 'ResiduePosition,Residue,HydrophobicityValue,SlidingWindowScore\n';
    for (let i = 0; i < results.clean.length; i++) {
      csv += `${i + 1},${results.clean[i]},${results.wheelNodes[i].hydVal},${results.windowScores[i].score}\n`;
    }
    return csv;
  };

  // Convert helical coordinates for SVG: radius = 35, center = 60,60
  const getNodeCoords = (angleDeg, radius = 35) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180; // offset by -90 so index 1 is at 12 o'clock
    return {
      x: 60 + radius * Math.cos(rad),
      y: 60 + radius * Math.sin(rad)
    };
  };

  return (
    <ToolShell slug="helixwheel">
      <div className="bx-tools-grid">
        {/* Left column: inputs & scale selector */}
        <div className="tool-pane-card">
          <div className="tool-pane-title">
            <span>Inputs & Scales</span>
            <button type="button" className="mock-sample-btn" onClick={loadHelicalSample}>Load Amphipathic Sample</button>
          </div>

          <div className="mock-field-group">
            <label className="mock-label" htmlFor="scale-select">Hydrophobicity Index Scale</label>
            <select
              id="scale-select"
              className="form-control"
              value={selectedScale}
              onChange={(e) => setSelectedScale(e.target.value)}
            >
              <option value="kyte">Kyte-Doolittle (Standard Partition)</option>
              <option value="hopp">Hopp-Woods (Antigenic Profile)</option>
              <option value="eisenberg">Eisenberg (Consensus Hydrophobicity)</option>
            </select>
          </div>

          <div className="mock-field-group">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label className="mock-label" htmlFor="window-size-input">Sliding Window size</label>
              <span className="mock-slider-val">{windowSize} residues</span>
            </div>
            <input
              id="window-size-input"
              type="range"
              min="3"
              max="19"
              step="2"
              value={windowSize}
              onChange={(e) => setWindowSize(parseInt(e.target.value))}
              style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
            />
          </div>

          <div className="mock-field-group">
            <label className="mock-label" htmlFor="helix-seq">Peptide Sequence (1-letter code)</label>
            <textarea
              id="helix-seq"
              className="mock-textarea"
              placeholder="Paste peptide amino acids, e.g. ALAS..."
              value={rawSeq}
              onChange={(e) => setRawSeq(e.target.value)}
            />
            {validationError && <p style={{ color: 'var(--red)', fontSize: '12px', marginTop: '4px' }}>{validationError}</p>}
          </div>
        </div>

        {/* Right column: Helical Wheel & Line Plot */}
        <div className="tool-pane-card">
          <div className="tool-pane-title">Helical Wheel Projection</div>

          {results ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Moment Results Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '10px' }}>
                <div className="mock-result-box" style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--accent-d)' }}>{results.momentMag}</div>
                  <div className="mock-result-label">Hydrophobic Moment (⟨μH⟩)</div>
                </div>
                <div className="mock-result-box">
                  <div className="mock-result-value" style={{ fontSize: '14px' }}>{results.amphipathicLabel}</div>
                  <div className="mock-result-label">Amphipathicity Prediction</div>
                </div>
              </div>

              {/* Panel A: Helical Wheel SVG and Panel B: Line Plot SVG side-by-side */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                
                {/* SVG Helical Wheel */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', backgroundColor: '#fff' }}>
                  <span className="mock-label" style={{ fontSize: '12px', marginBottom: '8px' }}>Alpha-Helix Projection</span>
                  <svg viewBox="0 0 120 120" style={{ width: '100%', height: '220px' }}>
                    <circle cx="60" cy="60" r="35" fill="none" stroke="var(--border)" strokeWidth="1" />
                    
                    {/* Connecting lines showing turn order */}
                    {results.wheelNodes.map((node, i) => {
                      if (i === results.wheelNodes.length - 1) return null;
                      const nextNode = results.wheelNodes[i + 1];
                      const start = getNodeCoords(node.angle, 35);
                      const end = getNodeCoords(nextNode.angle, 35);
                      
                      // Quadratic curve bowing slightly outwards
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

                    {/* Resultant Hydrophobic Moment Vector Arrow */}
                    {(() => {
                      const angleRad = (results.momentAngle * Math.PI) / 180;
                      // scale arrow length to hydrophobic moment magnitude
                      const arrowLen = Math.min(32, Math.max(5, parseFloat(results.momentMag) * 45));
                      const endX = 60 + arrowLen * Math.cos(angleRad);
                      const endY = 60 + arrowLen * Math.sin(angleRad);

                      return (
                        <g>
                          <line x1="60" y1="60" x2={endX} y2={endY} stroke="var(--amber)" strokeWidth="2.2" />
                          <circle cx={endX} cy={endY} r="2" fill="var(--amber)" />
                          <text x="60" y="66" fontSize="5" fontWeight="bold" fill="var(--amber)" textAnchor="middle">⟨μH⟩ Vector</text>
                        </g>
                      );
                    })()}

                    {/* Residue Nodes */}
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
                            fontSize="5"
                            fontWeight="bold"
                            fill="#fff"
                            textAnchor="middle"
                          >
                            {node.residue}
                          </text>
                          <text
                            x={pt.x}
                            y={pt.y + 9}
                            fontSize="4.5"
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

                {/* Hydropathy Line Plot */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', backgroundColor: '#fff' }}>
                  <span className="mock-label" style={{ fontSize: '12px', marginBottom: '8px' }}>Hydropathy Plot (Window size: {results.wSize})</span>
                  <svg viewBox="0 0 160 80" style={{ width: '100%', height: '140px' }}>
                    {/* Grid bounds */}
                    <line x1="15" y1="40" x2="145" y2="40" stroke="var(--border2)" strokeWidth="1" /> {/* midpoint line */}
                    
                    {/* Scale labels */}
                    <text x="145" y="44" fontSize="4.5" fill="var(--text3)" textAnchor="end">End</text>
                    <text x="15" y="44" fontSize="4.5" fill="var(--text3)">Start</text>
                    <text x="148" y="15" fontSize="4" fill="var(--text3)" textAnchor="end">Hydrophobic</text>
                    <text x="148" y="70" fontSize="4" fill="var(--text3)" textAnchor="end">Hydrophilic</text>

                    {/* Curve path */}
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
                          {/* Hydrophobic shading above 0 */}
                          <path
                            d={`M 15 40 ${pathCoords.map(p => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')} L 145 40 Z`}
                            fill="var(--accent-l)"
                            opacity="0.3"
                          />
                          <path d={dStr} fill="none" stroke="var(--accent)" strokeWidth="1.5" />
                          
                          {/* Highlight dot if residue is hovered */}
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

              {/* Chemical Classification Legend */}
              <div style={{ display: 'flex', gap: '10px', fontSize: '11px', flexWrap: 'wrap', justifyContent: 'center' }}>
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
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} /> Basic (+)
                </span>
              </div>

              {/* Actions row */}
              <div className="mock-actions-row">
                <CopyButton text={`HelixWheel Peptide Analysis:\nSequence: ${results.clean}\nHydrophobic Moment: ${results.momentMag} (${results.amphipathicLabel})`} />
                <ExportButton data={getCsvData()} filename="helixwheel_hydropathy_scores.csv" format="csv" />
              </div>

            </div>
          ) : (
            <div className="mock-empty-results">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '48px', height: '48px', color: 'var(--text4)', marginBottom: '12px' }}>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
              </svg>
              <p style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text2)', marginBottom: '4px' }}>No Sequence Analyzed</p>
              <p style={{ fontSize: '13px', lineHeight: 1.4 }}>Enter or paste target protein amino acids to project alpha helices and hydropathy plots.</p>
            </div>
          )}
        </div>
      </div>
    </ToolShell>
  );
}
