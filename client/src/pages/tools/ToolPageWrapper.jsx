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
  const [parameter, setParameter] = useState('50');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Clear results on slug change
  useEffect(() => {
    setSequence('');
    setParameter('50');
    setShowResults(false);
    setIsAnalyzing(false);
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

  // Load sample sequence depending on the tool category
  const handleLoadSample = () => {
    if (slug === 'codonscope' || slug === 'seqconvert') {
      setSequence('ATGGCCAGCATGCTGCAGCTGAGCGTGTTCGCCGTGCTGGCCGTGGCCCTGGCCGTG');
    } else if (slug === 'protcharge' || slug === 'helixwheel') {
      setSequence('MADYKDDDDKLAAALAAALAAALAAAEEEDDDFFF');
    } else if (slug === 'bufferlab') {
      setSequence('1M Tris-HCl pH 8.0, 0.5M EDTA pH 8.0, 5M NaCl');
    } else if (slug === 'spectrocalc') {
      setSequence("0.0  0.08\n1.0  0.15\n2.0  0.30\n3.0  0.58\n4.0  0.88");
    } else if (slug === 'alignlite') {
      setSequence(">Ref\nATGCGATCGATCGATCGATCGATC\n>Query\nATGCGATCGAGCGATCGATCGATC");
    } else if (slug === 'primercheck') {
      setSequence("Fwd: CCTGGAGATCGTGGAGAACA\nRev: TCGTGGTACTTGGGGTTGAT");
    } else {
      // DNA samples
      setSequence('ATGCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATC');
    }
    setShowResults(false);
  };

  const handleAnalyze = () => {
    if (!sequence.trim()) return;
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setShowResults(true);
    }, 1200);
  };

  return (
    <ToolShell slug={slug}>
      {/* Styles for Mock Workspaces */}
      <style>{`
        .mock-workspace-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
        }
        @media (min-width: 1024px) {
          .mock-workspace-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        .mock-field-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .mock-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text2);
        }
        .mock-textarea {
          width: 100%;
          height: 140px;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 12px;
          font-family: var(--font-mono, monospace);
          font-size: 14px;
          background-color: var(--off);
          resize: none;
          color: var(--text1);
        }
        .mock-textarea:focus {
          border-color: var(--accent);
          background-color: var(--white);
          outline: none;
        }
        .mock-controls-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 4px;
        }
        .mock-sample-btn {
          font-size: 12px;
          color: var(--accent);
          background: none;
          border: none;
          cursor: pointer;
          font-weight: 500;
          padding: 4px 0;
          text-decoration: underline;
        }
        .mock-sample-btn:hover {
          color: var(--accent-d);
        }
        .mock-char-counter {
          font-size: 12px;
          color: var(--text4);
        }
        .mock-btn-primary {
          background-color: var(--accent);
          color: var(--white);
          border: none;
          border-radius: var(--radius-sm);
          padding: 10px 20px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.15s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
        }
        .mock-btn-primary:hover {
          background-color: var(--accent-d);
        }
        .mock-btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .mock-card-results {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .mock-shimmer-bar {
          height: 10px;
          background: linear-gradient(90deg, var(--border) 25%, var(--border2) 50%, var(--border) 75%);
          background-size: 200% 100%;
          animation: mock-loading 1.2s infinite linear;
          border-radius: 4px;
          width: 100%;
        }
        @keyframes mock-loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .mock-empty-results {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 250px;
          color: var(--text4);
          text-align: center;
          border: 2px dashed var(--border);
          border-radius: var(--radius);
          padding: 24px;
        }
        .mock-results-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border);
          padding-bottom: 10px;
          margin-bottom: 10px;
        }
        .mock-results-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--text1);
        }
        .mock-badge-success {
          background-color: var(--g50);
          color: var(--accent-d);
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 4px;
          border: 1px solid var(--border2);
        }
        .mock-results-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }
        .mock-result-box {
          background-color: var(--off);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 10px;
          text-align: center;
        }
        .mock-result-value {
          font-size: 18px;
          font-weight: 700;
          color: var(--accent-d);
          font-family: var(--font-mono, monospace);
        }
        .mock-result-label {
          font-size: 11px;
          color: var(--text3);
          margin-top: 4px;
        }
        .mock-visualizer-box {
          border: 1px solid var(--border);
          border-radius: 8px;
          background-color: var(--off);
          padding: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
          min-height: 140px;
        }
        .mock-visualizer-svg {
          width: 100%;
          max-height: 180px;
        }
        .mock-actions-row {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          border-top: 1px solid var(--border);
          padding-top: 14px;
        }
      `}</style>

      <div className="mock-workspace-grid">
        {/* Left Column: Input Panel */}
        <div className="tool-pane-card">
          <div className="tool-pane-title">
            <span>Inputs & Parameters</span>
            <button
              type="button"
              onClick={handleLoadSample}
              className="mock-sample-btn"
              aria-label="Load sample test sequence"
            >
              Load Sample Data
            </button>
          </div>

          {/* Sequence Input */}
          <div className="mock-field-group">
            <label htmlFor="tool-sequence-input" className="mock-label">
              {slug === 'bufferlab' ? 'Solution Details' : slug === 'spectrocalc' ? 'Growth Time / OD Pairs' : 'Target Sequence (DNA/RNA/Protein)'}
            </label>
            <textarea
              id="tool-sequence-input"
              className="mock-textarea"
              placeholder={
                slug === 'bufferlab' ? 'e.g. 1M Tris-HCl, pH 8.0, 500ml' : 
                slug === 'spectrocalc' ? 'Enter time and OD600 pairs, e.g.\n0.0  0.08\n1.0  0.15' : 
                'Paste FASTA or raw letters here...'
              }
              value={sequence}
              onChange={(e) => setSequence(e.target.value.toUpperCase())}
            />
            <div className="mock-controls-row">
              <span className="mock-char-counter">
                {sequence.replace(/[^A-Z]/g, '').length} {slug === 'bufferlab' || slug === 'spectrocalc' ? 'characters' : 'residues'}
              </span>
            </div>
          </div>

          {/* Parameter Slider */}
          <div className="mock-field-group">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label htmlFor="tool-param-slider" className="mock-label">
                {slug === 'protcharge' ? 'Target pH Environment' : slug === 'seqmelt' ? 'Salt Concentration (Na+)' : 'Standard Threshold'}
              </label>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--accent-d)' }}>
                {slug === 'protcharge' ? `${(parseFloat(parameter) / 10).toFixed(1)} pH` : `${parameter} mM`}
              </span>
            </div>
            <input
              id="tool-param-slider"
              type="range"
              min="0"
              max="140"
              value={parameter}
              onChange={(e) => setParameter(e.target.value)}
              style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
            />
          </div>

          {/* Action Button */}
          <button
            type="button"
            className="mock-btn-primary"
            onClick={handleAnalyze}
            disabled={!sequence.trim() || isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <svg style={{ animation: 'spin 1s infinite linear', width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12"/></svg>
                Processing...
              </>
            ) : (
              'Run Analysis & Compute'
            )}
          </button>
        </div>

        {/* Right Column: Visualization & Results */}
        <div className="tool-pane-card">
          <div className="tool-pane-title">
            <span>Analysis Outputs</span>
          </div>

          {isAnalyzing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '40px 0' }}>
              <div className="mock-shimmer-bar" />
              <div className="mock-shimmer-bar" style={{ width: '80%' }} />
              <div className="mock-shimmer-bar" style={{ width: '60%' }} />
            </div>
          ) : showResults ? (
            <div className="mock-card-results">
              {/* Results Top Header */}
              <div className="mock-results-header">
                <span className="mock-results-title">Calculated Parameters</span>
                <span className="mock-badge-success">Computation Completed</span>
              </div>

              {/* Grid of values */}
              <div className="mock-results-grid">
                <div className="mock-result-box">
                  <div className="mock-result-value">
                    {slug === 'protcharge' ? '6.85' : slug === 'seqmelt' ? '64.2°C' : slug === 'codonscope' ? '0.84' : '98.5%'}
                  </div>
                  <div className="mock-result-label">
                    {slug === 'protcharge' ? 'Isoelectric Point (pI)' : slug === 'seqmelt' ? 'Melting Temp (Tm)' : slug === 'codonscope' ? 'Adaptation Index (CAI)' : 'Confidence Score'}
                  </div>
                </div>
                <div className="mock-result-box">
                  <div className="mock-result-value">
                    {slug === 'bufferlab' ? '500 mL' : slug === 'spectrocalc' ? '45 min' : '58.3%'}
                  </div>
                  <div className="mock-result-label">
                    {slug === 'bufferlab' ? 'Final Volume' : slug === 'spectrocalc' ? 'Doubling Time' : 'GC Content'}
                  </div>
                </div>
              </div>

              {/* Custom SVG Visualizer Mock */}
              <div className="mock-visualizer-box">
                {slug === 'plasmidforge' ? (
                  <svg className="mock-visualizer-svg" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="35" fill="none" stroke="var(--border)" strokeWidth="4" />
                    <circle cx="50" cy="50" r="35" fill="none" stroke="var(--accent)" strokeWidth="4" strokeDasharray="220" strokeDashoffset="60" />
                    <path d="M 50 15 A 35 35 0 0 1 85 50" fill="none" stroke="var(--amber)" strokeWidth="6" strokeLinecap="round" />
                    <text x="50" y="52" fontSize="6" fontWeight="bold" textAnchor="middle" fill="var(--text1)">Plasmid 5.4kb</text>
                  </svg>
                ) : slug === 'protcharge' ? (
                  <svg className="mock-visualizer-svg" viewBox="0 0 100 40">
                    <path d="M 10 10 Q 50 30 90 35" fill="none" stroke="var(--accent)" strokeWidth="2.5" />
                    <line x1="10" y1="20" x2="90" y2="20" stroke="var(--border)" strokeWidth="1" strokeDasharray="2" />
                    <circle cx="50" cy="22" r="3" fill="var(--accent-d)" />
                    <text x="54" y="25" fontSize="3" fontWeight="bold" fill="var(--text1)">pI Point</text>
                  </svg>
                ) : slug === 'helixwheel' ? (
                  <svg className="mock-visualizer-svg" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="30" fill="none" stroke="var(--border)" strokeWidth="2" />
                    {Array.from({ length: 18 }).map((_, i) => {
                      const angle = (i * 100 * Math.PI) / 180;
                      const cx = 50 + 30 * Math.cos(angle);
                      const cy = 50 + 30 * Math.sin(angle);
                      const isHydrophobic = i % 3 === 0;
                      return (
                        <circle
                          key={i}
                          cx={cx}
                          cy={cy}
                          r="3.5"
                          fill={isHydrophobic ? 'var(--amber)' : 'var(--accent)'}
                          stroke="#fff"
                          strokeWidth="1"
                        />
                      );
                    })}
                    <line x1="50" y1="50" x2="70" y2="30" stroke="var(--text2)" strokeWidth="2" markerEnd="arrow" />
                  </svg>
                ) : (
                  <svg className="mock-visualizer-svg" viewBox="0 0 140 40">
                    {/* DNA strands rendering */}
                    <path d="M 10 15 C 30 15, 40 25, 60 25 C 80 25, 90 15, 110 15 C 130 15, 140 25, 140 25" fill="none" stroke="var(--accent)" strokeWidth="2" />
                    <path d="M 10 25 C 30 25, 40 15, 60 15 C 80 15, 90 25, 110 25 C 130 25, 140 15, 140 15" fill="none" stroke="var(--accent-d)" strokeWidth="2" opacity="0.6" />
                    {Array.from({ length: 14 }).map((_, i) => (
                      <line key={i} x1={10 + i * 10} y1="16" x2={10 + i * 10} y2="24" stroke="var(--border2)" strokeWidth="1" />
                    ))}
                  </svg>
                )}
              </div>

              {/* Action Rows */}
              <div className="mock-actions-row">
                <CopyButton text={`Analysis completed for sequence: ${sequence}\nResult Score: ${slug === 'seqmelt' ? '64.2°C' : '0.84'}`} />
                <ExportButton data={sequence} filename={`${tool.slug}_results.fasta`} format="fasta" />
              </div>
            </div>
          ) : (
            <div className="mock-empty-results">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '48px', height: '48px', marginBottom: '12px' }}>
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <p style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text2)', marginBottom: '4px' }}>No Results Computed</p>
              <p style={{ fontSize: '13px', lineHeight: 1.4 }}>Enter raw molecular sequence data or load a sample on the left, then click 'Run Analysis' to see predictions.</p>
            </div>
          )}
        </div>
      </div>
    </ToolShell>
  );
}
