import React, { useState, useEffect } from 'react';
import ToolShell, { CopyButton, ExportButton } from '../../components/tools/ToolShell';
import { cleanSequence, reverseComplement, RESTRICTION_ENZYMES } from '../../utils/bioutils';
import useDebouncedValue from '../../hooks/useDebouncedValue';

export default function PlasmidForge() {
  const [activeTab, setActiveTab] = useState('sequence');
  const [rawSeq, setRawSeq] = useState('');
  const [plasmidName, setPlasmidName] = useState('pBioXApe_Vector');
  const [plasmidLength, setPlasmidLength] = useState(3000); // fallback or parsed length
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
  const [featColor, setFeatColor] = useState('#27a363');

  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [rotation, setRotation] = useState(0);

  const debouncedSeq = useDebouncedValue(rawSeq, 300);

  // Auto-detect features from sequence when sequence changes
  useEffect(() => {
    const clean = cleanSequence(debouncedSeq);
    if (!clean) return;

    setPlasmidLength(clean.length);

    // 1. Scan ORFs (>= 300bp = 100aa)
    const detectedOrfs = [];
    const minLen = 300;
    
    // Check Forward frames
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
                  name: `Predicted ORF (Frame +${frame + 1})`,
                  start: i + 1,
                  end: j + 3,
                  strand: '+',
                  type: 'CDS/Gene',
                  color: '#1e3a8a' // deep blue
                });
              }
              i = j;
              break;
            }
            j += 3;
          }
          if (!foundStop) break;
        }
        i += 3;
      }
    }

    // 2. Scan Restriction Enzymes (Unique Cutters)
    const cutters = [];
    RESTRICTION_ENZYMES.forEach((enzyme) => {
      // Basic regex scanner for matching recognition sequence
      const regex = new RegExp(enzyme.seq, 'g');
      let match;
      let count = 0;
      let pos = 0;
      
      while ((match = regex.exec(clean)) !== null) {
        count++;
        pos = match.index + enzyme.cut;
        if (count > 2) break; // We only care about single/unique cutters
      }

      if (count === 1) {
        cutters.push({
          name: `${enzyme.name} (Unique Site)`,
          start: pos,
          end: pos + 1,
          strand: '+',
          type: 'Other',
          color: '#ef4444' // red label
        });
      }
    });

    const parsedFeatures = [
      ...detectedOrfs.slice(0, 4), // Capped at top 4 ORFs
      ...cutters.slice(0, 5),      // Capped at top 5 cutters
      { name: 'ColE1 Origin', start: Math.round(clean.length * 0.4), end: Math.round(clean.length * 0.55), strand: '+', type: 'Origin of Replication', color: '#64748b' }
    ];

    setFeatures(parsedFeatures);
  }, [debouncedSeq]);

  const loadSampleVector = () => {
    // Standard pUC19 mock sequence string generator
    let mockDna = 'ATG';
    for (let i = 0; i < 900; i++) {
      mockDna += 'ATGCGTACGTTAGCTAGC';
    }
    mockDna += 'TAA'; // stop codon
    // Let's add some restriction sites
    mockDna = mockDna.substring(0, 1000) + 'GAATTC' + mockDna.substring(1006); // EcoRI
    mockDna = mockDna.substring(0, 2000) + 'GGATCC' + mockDna.substring(2006); // BamHI
    setRawSeq(mockDna);
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

  // Convert position to coordinates for a given radius
  const getCoords = (pos, r = 70) => {
    const angle = (pos / plasmidLength) * 2 * Math.PI - Math.PI / 2;
    return {
      x: 150 + r * Math.cos(angle),
      y: 150 + r * Math.sin(angle)
    };
  };

  // Build SVG Path for Arc Feature
  const getArcPath = (start, end, radius, type) => {
    const startPt = getCoords(start, radius);
    const endPt = getCoords(end, radius);
    const isLarge = (end - start) / plasmidLength > 0.5 ? 1 : 0;
    
    // Standard arc path
    let d = `M ${startPt.x} ${startPt.y} A ${radius} ${radius} 0 ${isLarge} 1 ${endPt.x} ${endPt.y}`;
    
    // If CDS or resistance marker, render with an arrowhead endpoint
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

  return (
    <ToolShell slug="plasmidforge">
      <div className="bx-tools-grid">
        {/* Left Side: Sequence / Form details */}
        <div className="tool-pane-card">
          <div className="tool-pane-title">Vector Information</div>

          {/* Form Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '16px' }}>
            <button
              type="button"
              className={`sort-tab ${activeTab === 'sequence' ? 'active' : ''}`}
              onClick={() => setActiveTab('sequence')}
            >
              Parse Sequence
            </button>
            <button
              type="button"
              className={`sort-tab ${activeTab === 'features' ? 'active' : ''}`}
              onClick={() => setActiveTab('features')}
            >
              Custom Features
            </button>
          </div>

          {activeTab === 'sequence' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="mock-field-group">
                <label className="mock-label" htmlFor="plasmid-name">Vector Name</label>
                <input
                  id="plasmid-name"
                  type="text"
                  className="form-control"
                  value={plasmidName}
                  onChange={(e) => setPlasmidName(e.target.value)}
                />
              </div>

              <div className="mock-field-group">
                <label className="mock-label" htmlFor="plasmid-seq">Sequence Text (DNA)</label>
                <textarea
                  id="plasmid-seq"
                  className="mock-textarea"
                  style={{ height: '180px' }}
                  placeholder="Paste FASTA plasmid vector sequence..."
                  value={rawSeq}
                  onChange={(e) => setRawSeq(e.target.value)}
                />
                <button type="button" className="mock-sample-btn" onClick={loadSampleVector}>Load Sample pUC19 Sequence</button>
              </div>
            </div>
          ) : (
            /* Manual Feature Annotator Form */
            <form onSubmit={handleAddFeature} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="mock-field-group">
                <label className="mock-label" htmlFor="feat-name">Feature Label</label>
                <input
                  id="feat-name"
                  type="text"
                  className="form-control"
                  placeholder="e.g. Origin, Prom, GFP"
                  value={featName}
                  onChange={(e) => setFeatName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="mock-field-group">
                  <label className="mock-label" htmlFor="feat-start">Start Position (bp)</label>
                  <input
                    id="feat-start"
                    type="number"
                    className="form-control"
                    value={featStart}
                    onChange={(e) => setFeatStart(e.target.value)}
                  />
                </div>
                <div className="mock-field-group">
                  <label className="mock-label" htmlFor="feat-end">End Position (bp)</label>
                  <input
                    id="feat-end"
                    type="number"
                    className="form-control"
                    value={featEnd}
                    onChange={(e) => setFeatEnd(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="mock-field-group">
                  <label className="mock-label" htmlFor="feat-strand">Strand Orientation</label>
                  <select
                    id="feat-strand"
                    className="form-control"
                    value={featStrand}
                    onChange={(e) => setFeatStrand(e.target.value)}
                  >
                    <option value="+">Sense (+)</option>
                    <option value="-">Antisense (-)</option>
                  </select>
                </div>
                <div className="mock-field-group">
                  <label className="mock-label" htmlFor="feat-type">Category Class</label>
                  <select
                    id="feat-type"
                    className="form-control"
                    value={featType}
                    onChange={(e) => {
                      setFeatType(e.target.value);
                      // Suggest default palette color
                      if (e.target.value === 'Origin of Replication') setFeatColor('#64748b');
                      else if (e.target.value === 'Promoter') setFeatColor('#3db87a');
                      else if (e.target.value === 'Resistance Marker') setFeatColor('#f59e0b');
                      else if (e.target.value === 'Terminator') setFeatColor('#8b5cf6');
                      else setFeatColor('#27a363');
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

              <div className="mock-field-group">
                <label className="mock-label" htmlFor="feat-color">Feature Fill Color</label>
                <input
                  id="feat-color"
                  type="color"
                  value={featColor}
                  onChange={(e) => setFeatColor(e.target.value)}
                  style={{ width: '100%', height: '36px', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', padding: '0' }}
                />
              </div>

              <button type="submit" className="mock-btn-primary">Add Feature to Map</button>
            </form>
          )}

          {/* Feature List Table */}
          <div style={{ marginTop: '20px' }}>
            <span className="mock-label" style={{ display: 'block', marginBottom: '8px' }}>Feature Annotation Table</span>
            <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '6px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--off)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                    <th style={{ padding: '8px' }}>Label</th>
                    <th style={{ padding: '8px' }}>Span</th>
                    <th style={{ padding: '8px' }}>Strand</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {features.map((feat, idx) => (
                    <tr
                      key={idx}
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        backgroundColor: hoveredIndex === idx ? 'var(--g50)' : 'transparent',
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      <td style={{ padding: '8px', fontWeight: 'bold' }}>
                        <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: feat.color, marginRight: '6px' }} />
                        {feat.name}
                      </td>
                      <td style={{ padding: '8px' }}>{feat.start} - {feat.end} bp</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>{feat.strand}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteFeature(idx)}
                          style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline' }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                  {features.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '12px', color: 'var(--text4)' }}>No features added to backbone.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Side: Circular Map Visualizer */}
        <div className="tool-pane-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="tool-pane-title" style={{ width: '100%' }}>Vector Plasmid Map</div>

          <div style={{ margin: '20px 0', position: 'relative', width: '300px', height: '300px' }}>
            <svg
              viewBox="0 0 300 300"
              style={{
                width: '100%',
                height: '100%',
                transform: `rotate(${rotation}deg)`,
                transition: 'transform 0.4s ease'
              }}
            >
              {/* Central Information */}
              <circle cx="150" cy="150" r="45" fill="#fff" />
              <text x="150" y="146" fontSize="9" fontWeight="bold" textAnchor="middle" fill="var(--text1)">{plasmidName}</text>
              <text x="150" y="158" fontSize="8" fill="var(--text3)" textAnchor="middle">{plasmidLength} bp</text>

              {/* Plasmid Backbone circle ring */}
              <circle cx="150" cy="150" r="70" fill="none" stroke="var(--g200)" strokeWidth="1" />

              {/* Render Features Arcs */}
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
                      // Rotate card to bring midpoint to 12 o'clock (270 degrees)
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

          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span className="mock-label">Legend</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '11px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#64748b' }} /> Origin of Replication
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#3db87a' }} /> Promoter
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#f59e0b' }} /> Resistance Marker
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#8b5cf6' }} /> Terminator
              </span>
            </div>

            {/* Actions row */}
            <div className="mock-actions-row">
              <CopyButton text={`Plasmid Vector features list:\n${features.map(f => `${f.name}: ${f.start}-${f.end}bp`).join('\n')}`} />
              <ExportButton data={getCsvData()} filename={`${plasmidName}_features.csv`} format="csv" />
            </div>
          </div>
        </div>
      </div>
    </ToolShell>
  );
}
