import React, { useState, useEffect } from 'react';
import ToolShell, { CopyButton, ExportButton } from '../../components/tools/ToolShell';
import { cleanSequence, reverseComplement, RESTRICTION_ENZYMES } from '../../utils/bioutils';

export default function PlasmidForge() {
  const [activeStep, setActiveStep] = useState(1);
  const [rawSeq, setRawSeq] = useState('');
  const [plasmidName, setPlasmidName] = useState('pBioXApe_Vector');
  const [plasmidLength, setPlasmidLength] = useState(3000);
  const [features, setFeatures] = useState([
    { name: 'AmpR Resistance', start: 200, end: 1000, strand: '+', type: 'Resistance Marker', color: '#f59e0b' },
    { name: 'ColE1 Origin', start: 1200, end: 1800, strand: '+', type: 'Origin of Replication', color: '#64748b' },
    { name: 'LacZ Promoter', start: 2200, end: 2450, strand: '-', type: 'Promoter', color: '#3db87a' }
  ]);

  // Form states for manual features
  const [featName, setFeatName] = useState('');
  const [featStart, setFeatStart] = useState(1);
  const [featEnd, setFeatEnd] = useState(500);
  const [featStrand, setFeatStrand] = useState('+');
  const [featType, setFeatType] = useState('CDS/Gene');
  const [featColor, setFeatColor] = useState('#10b981');

  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compilationSuccess, setCompilationSuccess] = useState(false);
  const [validationError, setValidationError] = useState('');

  const steps = [
    { number: 1, title: 'Inputs & Parameters' },
    { number: 2, title: 'Interactive Vector' }
  ];

  const parseSequenceFeatures = (sequenceString) => {
    const clean = cleanSequence(sequenceString);
    if (!clean) return;

    setPlasmidLength(clean.length);

    const detectedOrfs = [];
    const minLen = 300;
    
    for (let frame = 0; frame < 3; frame++) {
      let i = frame;
      while (i < clean.length - 2) {
        if (clean.substring(i, i + 3) === 'ATG') {
          let j = i + 3;
          let foundStop = false;
          while (j < clean.length - 2) {
            const codon = clean.substring(j, j + 3);
            if (['TAA', 'TAG', 'TGA'].includes(codon)) {
              foundStop = true;
              const len = j + 3 - i;
              if (len >= minLen) {
                detectedOrfs.push({
                  name: `ORF Frame ${frame + 1} (${Math.round(len/3)}aa)`,
                  start: i + 1,
                  end: j + 3,
                  strand: '+',
                  type: 'CDS/Gene',
                  color: '#3b82f6'
                });
              }
              i = j + 3;
              break;
            }
            j += 3;
          }
          if (!foundStop) {
            break;
          }
        } else {
          i += 3;
        }
      }
    }

    const detectedCuts = [];
    Object.keys(RESTRICTION_ENZYMES).forEach((enzyme) => {
      const site = RESTRICTION_ENZYMES[enzyme].site;
      let pos = clean.indexOf(site);
      while (pos !== -1) {
        detectedCuts.push({
          name: `${enzyme} Site`,
          start: pos + 1,
          end: pos + site.length,
          strand: '+',
          type: 'Restriction Cut',
          color: '#ef4444'
        });
        pos = clean.indexOf(site, pos + 1);
      }
    });

    const baseFeatures = features.filter(
      (f) => f.type !== 'CDS/Gene' && f.type !== 'Restriction Cut'
    );
    setFeatures([...baseFeatures, ...detectedOrfs, ...detectedCuts]);
  };

  const loadSampleVector = () => {
    let mockDna = 'ATGCGATCGATCGATCGATCGA';
    for (let index = 0; index < 250; index++) {
      mockDna += 'ATGAAAATCGAAGAAGGTAAACTGGTAATCTGGATTAACGGCGATAAAGGCTATAACGGTCTCGCTGAAGTCGGTAAGAAATTCGAGAAAGATACCGGAATCAAAGTCACCGTTGAGCATCCG';
    }
    mockDna += 'TAA';
    mockDna = mockDna.substring(0, 1000) + 'GAATTC' + mockDna.substring(1006);
    mockDna = mockDna.substring(0, 2000) + 'GGATCC' + mockDna.substring(2006);
    setRawSeq(mockDna);
    setPlasmidName('pUC19_Biotech_Sample');
    parseSequenceFeatures(mockDna);
    setValidationError('');
  };

  const handleAddFeature = (e) => {
    e.preventDefault();
    if (!featName) return;
    const newFeat = {
      name: featName,
      start: Math.max(1, parseInt(featStart)),
      end: Math.min(plasmidLength, parseInt(featEnd)),
      strand: featStrand,
      type: featType,
      color: featColor
    };
    setFeatures([...features, newFeat]);
    setFeatName('');
  };

  const handleDeleteFeature = (idx) => {
    setFeatures(features.filter((_, i) => i !== idx));
  };

  const getCoords = (pos, r = 70) => {
    const angle = (pos / plasmidLength) * 2 * Math.PI - Math.PI / 2;
    return {
      x: 150 + r * Math.cos(angle),
      y: 150 + r * Math.sin(angle)
    };
  };

  const getArcPath = (start, end, radius, type) => {
    const startPt = getCoords(start, radius);
    const endPt = getCoords(end, radius);
    const isLarge = (end - start) / plasmidLength > 0.5 ? 1 : 0;
    
    let d = `M ${startPt.x} ${startPt.y} A ${radius} ${radius} 0 ${isLarge} 1 ${endPt.x} ${endPt.y}`;
    
    if (type === 'CDS/Gene' || type === 'Resistance Marker') {
      const tipPos = end;
      const basePos = end - Math.min(end - start, Math.round(plasmidLength * 0.02));
      const outerPt = getCoords(basePos, radius + 5);
      const innerPt = getCoords(basePos, radius - 5);
      const tipPt = getCoords(tipPos, radius);
      
      d = `M ${outerPt.x} ${outerPt.y} A ${radius + 5} ${radius + 5} 0 0 1 ${tipPt.x} ${tipPt.y} L ${innerPt.x} ${innerPt.y} A ${radius - 5} ${radius - 5} 0 0 0 ${outerPt.x} ${outerPt.y} Z`;
    }
    return d;
  };

  const getCsvData = () => {
    let csv = 'Name,Start,End,Strand,Type,Color\n';
    features.forEach((f) => {
      csv += `"${f.name}",${f.start},${f.end},"${f.strand}","${f.type}","${f.color}"\n`;
    });
    return csv;
  };

  const compileVectorMap = () => {
    const clean = cleanSequence(rawSeq);
    if (!clean) {
      setValidationError('Please enter a target DNA backbone sequence.');
      return;
    }
    setValidationError('');
    setIsCompiling(true);
    setTimeout(() => {
      setIsCompiling(false);
      setCompilationSuccess(true);
      setActiveStep(2);
    }, 900);
  };

  const resetPlasmid = () => {
    setCompilationSuccess(false);
    setActiveStep(1);
  };

  const renderStepTracker = () => (
    <div className="bx-step-tracker">
      {steps.map((s) => {
        const isCompleted = s.number < activeStep;
        const isActive = s.number === activeStep;
        const isDisabled = s.number > activeStep && !compilationSuccess;
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
    <ToolShell slug="plasmidforge">
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      {renderStepTracker()}

      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        {activeStep === 1 && (
          <div className="bx-step-section">
            <div className="bx-step-header">
              <span className="bx-step-badge">Step 1</span>
              <h3 className="bx-step-title">Vector Backbone Details</h3>
            </div>

            <div className="bx-field-group">
              <label htmlFor="plasmid-name" className="bx-label">Plasmid / Vector Name</label>
              <input
                id="plasmid-name"
                type="text"
                className="bx-input"
                value={plasmidName}
                onChange={(e) => setPlasmidName(e.target.value)}
              />
            </div>

            <div className="bx-field-group" style={{ marginTop: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="plasmid-seq" className="bx-label">DNA Sequence (Pasting auto-extracts ORFs & Restriction Cuts)</label>
                <button type="button" className="bx-btn-sample" onClick={loadSampleVector}>Load Sample pUC19 Backbone</button>
              </div>
              <textarea
                id="plasmid-seq"
                className="bx-textarea"
                style={{ height: '100px' }}
                placeholder="Enter sequence in bp or paste FASTA content here..."
                value={rawSeq}
                onChange={(e) => {
                  setRawSeq(e.target.value);
                  parseSequenceFeatures(e.target.value);
                  setValidationError('');
                }}
              />
              {validationError && <p style={{ color: 'var(--red)', fontSize: '12px', marginTop: '4px' }}>{validationError}</p>}
            </div>

            <div className="bx-field-group" style={{ marginTop: '8px' }}>
              <label htmlFor="plasmid-len" className="bx-label">Backbone Length (bp)</label>
              <input
                id="plasmid-len"
                type="number"
                className="bx-input"
                value={plasmidLength}
                onChange={(e) => setPlasmidLength(Math.max(10, parseInt(e.target.value) || 0))}
              />
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '16px' }}>
              <span className="bx-label" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>Add Custom Feature Annotations</span>
              <form onSubmit={handleAddFeature} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div className="bx-field-group">
                  <label htmlFor="feat-name" className="bx-label">Feature Label / Name</label>
                  <input
                    id="feat-name"
                    type="text"
                    className="bx-input"
                    placeholder="e.g. Origin, Promoter, GFP"
                    value={featName}
                    onChange={(e) => setFeatName(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="bx-field-group">
                    <label htmlFor="feat-start" className="bx-label">Start Point (bp)</label>
                    <input
                      id="feat-start"
                      type="number"
                      className="bx-input"
                      value={featStart}
                      onChange={(e) => setFeatStart(e.target.value)}
                    />
                  </div>
                  <div className="bx-field-group">
                    <label htmlFor="feat-end" className="bx-label">End Point (bp)</label>
                    <input
                      id="feat-end"
                      type="number"
                      className="bx-input"
                      value={featEnd}
                      onChange={(e) => setFeatEnd(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="bx-field-group">
                    <label htmlFor="feat-strand" className="bx-label">Strand direction</label>
                    <select
                      id="feat-strand"
                      className="bx-select"
                      value={featStrand}
                      onChange={(e) => setFeatStrand(e.target.value)}
                    >
                      <option value="+">Sense (+)</option>
                      <option value="-">Antisense (-)</option>
                    </select>
                  </div>
                  <div className="bx-field-group">
                    <label htmlFor="feat-type" className="bx-label">Annotation Class</label>
                    <select
                      id="feat-type"
                      className="bx-select"
                      value={featType}
                      onChange={(e) => {
                        setFeatType(e.target.value);
                        if (e.target.value === 'Origin of Replication') setFeatColor('#64748b');
                        else if (e.target.value === 'Promoter') setFeatColor('#10b981');
                        else if (e.target.value === 'Resistance Marker') setFeatColor('#f59e0b');
                        else if (e.target.value === 'Terminator') setFeatColor('#8b5cf6');
                        else setFeatColor('#3b82f6');
                      }}
                    >
                      <option value="CDS/Gene">CDS/Gene (Arrow)</option>
                      <option value="Promoter">Promoter</option>
                      <option value="Origin of Replication">Origin of Replication</option>
                      <option value="Resistance Marker">Resistance Marker</option>
                      <option value="Terminator">Terminator</option>
                      <option value="Other">Other Elements</option>
                    </select>
                  </div>
                </div>

                <div className="bx-field-group">
                  <label htmlFor="feat-color" className="bx-label">Feature Hex Color</label>
                  <input
                    id="feat-color"
                    type="color"
                    value={featColor}
                    onChange={(e) => setFeatColor(e.target.value)}
                    style={{ width: '100%', height: '38px', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', padding: '0', backgroundColor: 'transparent' }}
                  />
                </div>

                <button type="submit" className="bx-btn-primary" disabled={!featName}>Add Annotation Feature</button>
              </form>
            </div>

            <div style={{ marginTop: '16px' }}>
              <span className="bx-label" style={{ display: 'block', marginBottom: '8px' }}>Feature Annotation Table ({features.length})</span>
              <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '6px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--off)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                      <th style={{ padding: '8px' }}>Label</th>
                      <th style={{ padding: '8px' }}>Span (bp)</th>
                      <th style={{ padding: '8px' }}>Strand</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {features.map((feat, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px', fontWeight: 'bold' }}>
                          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: feat.color, marginRight: '6px' }} />
                          {feat.name}
                        </td>
                        <td style={{ padding: '8px' }}>{feat.start} - {feat.end}</td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>{feat.strand}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>
                          <button type="button" onClick={() => handleDeleteFeature(idx)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline' }}>Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                type="button"
                className="bx-btn-primary"
                onClick={compileVectorMap}
                disabled={!rawSeq.trim() || isCompiling}
              >
                {isCompiling ? (
                  <>
                    <svg style={{ animation: 'spin 1s infinite linear', width: '16px', height: '16px', stroke: 'currentColor', fill: 'none', marginRight: '6px' }} viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" strokeWidth="2.5" strokeDasharray="32" strokeDashoffset="12"/>
                    </svg>
                    Mapping Feature Rings...
                  </>
                ) : (
                  'Generate Plasmid Vector SVG'
                )}
              </button>
            </div>
          </div>
        )}

        {activeStep === 2 && compilationSuccess && (
          <div className="bx-step-section" style={{ alignItems: 'center' }}>
            <div className="bx-step-header" style={{ width: '100%' }}>
              <span className="bx-step-badge">Step 2</span>
              <h3 className="bx-step-title">Interactive Plasmid Vector</h3>
            </div>

            <div style={{ margin: '10px 0', position: 'relative', width: '280px', height: '280px' }}>
              <svg
                viewBox="0 0 300 300"
                style={{
                  width: '100%',
                  height: '100%',
                  transform: `rotate(${rotation}deg)`,
                  transition: 'transform 0.4s ease'
                }}
              >
                <circle cx="150" cy="150" r="45" fill="#fff" />
                <text x="150" y="146" fontSize="9" fontWeight="bold" textAnchor="middle" fill="var(--text1)">{plasmidName}</text>
                <text x="150" y="158" fontSize="8" fill="var(--text3)" textAnchor="middle">{plasmidLength} bp</text>
                <circle cx="150" cy="150" r="70" fill="none" stroke="var(--border)" strokeWidth="1.5" />
                {features.map((feat, idx) => {
                  const isHovered = hoveredIndex === idx;
                  const dPath = getArcPath(feat.start, feat.end, 70, feat.type);
                  return (
                    <path
                      key={idx}
                      d={dPath}
                      fill={feat.type === 'CDS/Gene' || feat.type === 'Resistance Marker' ? feat.color : 'none'}
                      stroke={feat.type === 'CDS/Gene' || feat.type === 'Resistance Marker' ? 'none' : feat.color}
                      strokeWidth={feat.type === 'CDS/Gene' || feat.type === 'Resistance Marker' ? '0' : isHovered ? '8' : '5'}
                      strokeLinecap="round"
                      cursor="pointer"
                      opacity={hoveredIndex === null || isHovered ? 1 : 0.4}
                      style={{ transition: 'stroke-width 0.15s ease, opacity 0.15s ease' }}
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      onClick={() => {
                        const mid = (feat.start + feat.end) / 2;
                        const pct = mid / plasmidLength;
                        const targetAngle = 360 - (pct * 360);
                        setRotation(targetAngle);
                      }}
                    />
                  );
                })}
              </svg>
            </div>

            <p style={{ fontSize: '11px', color: 'var(--text3)', fontStyle: 'italic', marginBottom: '10px' }}>
              💡 Hover on features to highlight. Click on a feature to rotate it to the top.
            </p>

            <div style={{ width: '100%', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
              <span className="bx-label">Feature Classes Legend</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '11px', marginTop: '6px', color: 'var(--text2)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#64748b' }} /> Origin</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#10b981' }} /> Promoter</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#f59e0b' }} /> Resistance</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#8b5cf6' }} /> Terminator</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#3b82f6' }} /> CDS/Gene</span>
              </div>
            </div>

            <div style={{ width: '100%', display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '16px' }}>
              <CopyButton text={`Plasmid Vector features list:\n${features.map(f => `${f.name}: ${f.start}-${f.end}bp`).join('\n')}`} />
              <ExportButton data={getCsvData()} filename={`${plasmidName}_features.csv`} format="csv" />
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
              <button
                type="button"
                className="bx-btn-primary"
                onClick={resetPlasmid}
                style={{ background: 'var(--text2)', boxShadow: 'none' }}
              >
                ← Design Another Plasmid
              </button>
            </div>
          </div>
        )}
      </div>
    </ToolShell>
  );
}
