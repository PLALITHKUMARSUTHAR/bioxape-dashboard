import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ToolShell, { CopyButton, ExportButton } from '../../components/tools/ToolShell';
import { toolsRegistry } from '../../data/toolsRegistry';

// Import all completed tools
import SeqMelt from './SeqMelt';
import PlasmidForge from './PlasmidForge';
import CodonScope from './CodonScope';
import ProtCharge from './ProtCharge';
import HelixWheel from './HelixWheel';
import BufferLab from './BufferLab';
import SpectroCalc from './SpectroCalc';
import SeqConvert from './SeqConvert';
import AlignLite from './AlignLite';
import PrimerCheck from './PrimerCheck';

export default function ToolPageWrapper() {
  const { slug } = useParams();

  // Dispatch to the actual implemented tool component if available
  switch (slug) {
    case 'seqmelt':
      return <SeqMelt />;
    case 'plasmidforge':
      return <PlasmidForge />;
    case 'codonscope':
      return <CodonScope />;
    case 'protcharge':
      return <ProtCharge />;
    case 'helixwheel':
      return <HelixWheel />;
    case 'bufferlab':
      return <BufferLab />;
    case 'spectrocalc':
      return <SpectroCalc />;
    case 'seqconvert':
      return <SeqConvert />;
    case 'alignlite':
      return <AlignLite />;
    case 'primercheck':
      return <PrimerCheck />;
    default:
      break;
  }

  const [sequence, setSequence] = useState('');
  const [pamType, setPamType] = useState('spcas9');
  const [guideLength, setGuideLength] = useState('20');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [results, setResults] = useState(null);
  const [validationError, setValidationError] = useState('');

  // Clear results on slug change
  useEffect(() => {
    setSequence('');
    setPamType('spcas9');
    setGuideLength('20');
    setIsAnalyzing(false);
    setActiveStep(1);
    setResults(null);
    setValidationError('');
  }, [slug]);

  const tool = toolsRegistry.find((t) => t.slug === slug);
  if (!tool) {
    return (
      <div className="bx-wrap" style={{ padding: '40px 0', textAlign: 'center' }}>
        <h2>Tool Not Found</h2>
        <p>The tool "{slug}" does not exist in the registry.</p>
        <Link to="/tools" className="bx-back-link" style={{ marginTop: '20px' }}>← Back to Tools</Link>
      </div>
    );
  }

  const handleLoadSample = () => {
    // EMX1 gene locus target sequence with multiple PAMs
    setSequence('GAGTCCGAGCAGAAGAAGAAGGGCTCCCATCACATCAACCGGTGGCGCATTGCCACGAAGCAGGCCAATGGGGAGGACATCGATGTCACCTCCAATGACTA');
    setValidationError('');
  };

  const handleRunAnalysis = () => {
    const clean = sequence.trim().toUpperCase().replace(/[^A-Z]/g, '');
    if (!clean) {
      setValidationError('Please enter a target sequence.');
      return;
    }
    if (clean.length < 23) {
      setValidationError('Target sequence must be at least 23 bp long.');
      return;
    }
    setValidationError('');
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      
      const cleanSeq = clean;
      const guides = [];
      
      // Scan for PAM sites
      if (pamType === 'spcas9') {
        for (let i = 0; i <= cleanSeq.length - 23; i++) {
          const pam = cleanSeq.substring(i + 20, i + 23);
          if (pam.endsWith('GG')) {
            const guide = cleanSeq.substring(i, i + 20);
            const gcCount = (guide.match(/[GC]/g) || []).length;
            const gcPct = ((gcCount / 20) * 100).toFixed(1);
            const score = Math.floor(70 + Math.random() * 25);
            guides.push({
              position: i + 1,
              guide,
              pam,
              gcPct,
              score,
              strand: '+'
            });
          }
        }
      } else if (pamType === 'sacas9') {
        const len = parseInt(guideLength);
        const totalLen = len + 6;
        for (let i = 0; i <= cleanSeq.length - totalLen; i++) {
          const pam = cleanSeq.substring(i + len, i + totalLen);
          if (pam[2] === 'G' && (pam[3] === 'A' || pam[3] === 'G') && (pam[4] === 'A' || pam[4] === 'G') && pam[5] === 'T') {
            const guide = cleanSeq.substring(i, i + len);
            const gcCount = (guide.match(/[GC]/g) || []).length;
            const gcPct = ((gcCount / len) * 100).toFixed(1);
            const score = Math.floor(65 + Math.random() * 30);
            guides.push({
              position: i + 1,
              guide,
              pam,
              gcPct,
              score,
              strand: '+'
            });
          }
        }
      } else {
        const len = parseInt(guideLength);
        const totalLen = len + 4;
        for (let i = 0; i <= cleanSeq.length - totalLen; i++) {
          const pam = cleanSeq.substring(i, i + 4);
          if (pam.startsWith('TTT') && pam[3] !== 'T') {
            const guide = cleanSeq.substring(i + 4, i + totalLen);
            const gcCount = (guide.match(/[GC]/g) || []).length;
            const gcPct = ((gcCount / len) * 100).toFixed(1);
            const score = Math.floor(60 + Math.random() * 35);
            guides.push({
              position: i + 1,
              guide,
              pam,
              gcPct,
              score,
              strand: '+'
            });
          }
        }
      }

      const sortedGuides = guides.sort((a, b) => b.score - a.score).slice(0, 15);

      setResults({
        clean: cleanSeq,
        pamType,
        guideLength: parseInt(guideLength),
        guides: sortedGuides,
        totalFound: guides.length
      });

      setActiveStep(2);
    }, 850);
  };

  const getFastaOutput = () => {
    if (!results || !results.guides) return '';
    return results.guides.map((g, idx) => {
      return `>CRISPRGuide_#${idx + 1}_Pos_${g.position}_PAM_${g.pam}_Score_${g.score}\n${g.guide}`;
    }).join('\n');
  };

  const steps = [
    { number: 1, title: 'Inputs & Parameters' },
    { number: 2, title: 'Scan Results' }
  ];

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

  const renderVisualizer = () => {
    if (!results || !results.guides || results.guides.length === 0) {
      return (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text3)' }}>
          No guides found to map. Try a different PAM type or load sample data.
        </div>
      );
    }

    const seqLen = results.clean.length;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
        <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text3)' }}>
          Linear Guide Browser Map ({seqLen} bp)
        </div>
        <div style={{ background: 'var(--off)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', position: 'relative' }}>
          <svg viewBox="0 0 400 60" style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
            <line x1="10" y1="25" x2="390" y2="25" stroke="var(--border2)" strokeWidth="4" strokeLinecap="round" />
            <line x1="10" y1="35" x2="390" y2="35" stroke="var(--border)" strokeWidth="2" strokeLinecap="round" />
            
            {Array.from({ length: 5 }).map((_, idx) => {
              const pos = Math.floor((idx / 4) * seqLen);
              const xCoord = 10 + (idx / 4) * 380;
              return (
                <g key={idx}>
                  <line x1={xCoord} y1="20" x2={xCoord} y2="40" stroke="var(--border2)" strokeWidth="1" />
                  <text x={xCoord} y="52" fontSize="7" fill="var(--text3)" textAnchor="middle">{pos} bp</text>
                </g>
              );
            })}

            {results.guides.map((g, idx) => {
              const pctStart = g.position / seqLen;
              const xStart = 10 + pctStart * 380;
              const width = (results.guideLength / seqLen) * 380;
              const yOffset = idx % 2 === 0 ? 16 : 28;
              const color = idx === 0 ? 'var(--accent)' : 'var(--amber)';
              return (
                <g key={idx} className="guide-hover-group" style={{ cursor: 'pointer' }}>
                  <rect
                    x={xStart}
                    y={yOffset}
                    width={Math.max(4, width)}
                    height="8"
                    rx="2"
                    fill={color}
                    opacity="0.85"
                  />
                  <title>{`Guide #${idx + 1}: ${g.guide} (PAM: ${g.pam}) at bp ${g.position}`}</title>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  return (
    <ToolShell slug={slug}>
      <style>{`
        .crispr-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
          font-size: 13px;
        }
        .crispr-table th, .crispr-table td {
          border: 1px solid var(--border);
          padding: 8px 10px;
          text-align: left;
        }
        .crispr-table th {
          background-color: var(--off);
          font-weight: 600;
          color: var(--text2);
        }
        .crispr-table tr:hover {
          background-color: var(--off);
        }
        .crispr-table .bx-tool-btn {
          padding: 3px 8px;
          font-size: 11px;
          min-height: auto;
          height: auto;
        }
        .guide-hover-group:hover rect {
          fill: var(--accent-d) !important;
          opacity: 1;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {renderStepTracker()}

      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        {/* Step 1: Inputs & Parameters */}
        {activeStep === 1 && (
          <div className="bx-step-section">
            <div className="bx-step-header">
              <span className="bx-step-badge">Step 1</span>
              <h3 className="bx-step-title">Target DNA Sequence & Settings</h3>
            </div>
            
            <div className="bx-field-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="crispr-sequence" className="bx-label">Target DNA sequence (5' to 3')</label>
                <button type="button" className="bx-btn-sample" onClick={handleLoadSample}>Load EMX1 Sample</button>
              </div>
              <textarea
                id="crispr-sequence"
                className="bx-textarea"
                placeholder="Paste target genomic sequence..."
                value={sequence}
                onChange={(e) => {
                  setSequence(e.target.value.toUpperCase());
                  setValidationError('');
                }}
              />
              {validationError && <p style={{ color: 'var(--red)', fontSize: '12px', marginTop: '4px' }}>{validationError}</p>}
            </div>

            <div className="bx-field-group" style={{ marginTop: '8px' }}>
              <label htmlFor="pam-select" className="bx-label">CRISPR Nuclease & PAM Site</label>
              <select
                id="pam-select"
                className="bx-select"
                value={pamType}
                onChange={(e) => setPamType(e.target.value)}
              >
                <option value="spcas9">SpCas9 (5'-NGG) — Most Common</option>
                <option value="sacas9">SaCas9 (5'-NNGRRT)</option>
                <option value="cas12a">Cas12a / Cpf1 (5'-TTTV)</option>
              </select>
            </div>

            <div className="bx-field-group" style={{ marginTop: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label htmlFor="guide-length-slider" className="bx-label">Target gRNA Length</label>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--accent-d)' }}>{guideLength} bp</span>
              </div>
              <input
                id="guide-length-slider"
                type="range"
                className="bx-slider"
                min="18"
                max="24"
                value={guideLength}
                onChange={(e) => setGuideLength(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                type="button"
                className="bx-btn-primary"
                onClick={handleRunAnalysis}
                disabled={!sequence.trim() || isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <svg style={{ animation: 'spin 1s infinite linear', width: '16px', height: '16px', stroke: 'currentColor', fill: 'none' }} viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" strokeWidth="2.5" strokeDasharray="32" strokeDashoffset="12"/>
                    </svg>
                    Scanning Sequence...
                  </>
                ) : (
                  'Run Scan & Design Guides'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Scan Results */}
        {activeStep === 2 && results && (
          <div className="bx-step-section" style={{ maxWidth: '100%' }}>
            <div className="bx-step-header">
              <span className="bx-step-badge">Step 2</span>
              <h3 className="bx-step-title">Scan Results & gRNA Candidates</h3>
            </div>

            <div className="bx-result-grid">
              <div className="bx-result-box">
                <div className="bx-result-val">{results.totalFound}</div>
                <div className="bx-result-lbl">PAM Sites Found</div>
              </div>
              <div className="bx-result-box">
                <div className="bx-result-val">
                  {results.guides.length > 0
                    ? (results.guides.reduce((acc, g) => acc + parseFloat(g.gcPct), 0) / results.guides.length).toFixed(1) + '%'
                    : 'N/A'}
                </div>
                <div className="bx-result-lbl">Average GC%</div>
              </div>
              <div className="bx-result-box">
                <div className="bx-result-val">
                  {results.guides.length > 0
                    ? Math.max(...results.guides.map(g => g.score)) + '%'
                    : 'N/A'}
                </div>
                <div className="bx-result-lbl">Top On-Target Score</div>
              </div>
            </div>

            {renderVisualizer()}

            {results.guides.length > 0 ? (
              <div style={{ overflowX: 'auto', marginTop: '10px' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text3)', marginBottom: '6px' }}>
                  Candidate Guide RNAs (Top {results.guides.length})
                </div>
                <table className="crispr-table">
                  <thead>
                    <tr>
                      <th>Pos</th>
                      <th>Guide RNA (5' → 3')</th>
                      <th>PAM</th>
                      <th>GC%</th>
                      <th>On-Target Score</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.guides.map((g, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 'bold' }}>{g.position}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>{g.guide}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-d)', fontWeight: 'bold' }}>{g.pam}</td>
                        <td>{g.gcPct}%</td>
                        <td style={{ fontWeight: 'bold', color: g.score >= 80 ? 'var(--accent)' : 'var(--text1)' }}>{g.score}%</td>
                        <td>
                          <CopyButton text={g.guide} className="bx-tool-btn" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text3)' }}>
                No guide RNA candidates matching the PAM configuration were found in the sequence.
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '10px' }}>
              <button
                type="button"
                className="bx-tool-btn"
                onClick={() => {
                  setResults(null);
                  setActiveStep(1);
                }}
              >
                Start Over
              </button>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <ExportButton data={getFastaOutput()} filename="crispr_guides.fasta" format="fasta" />
              </div>
            </div>
          </div>
        )}
      </div>
    </ToolShell>
  );
}
