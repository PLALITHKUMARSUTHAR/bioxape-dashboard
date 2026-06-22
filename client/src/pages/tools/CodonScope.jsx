import React, { useState } from 'react';
import ToolShell, { CopyButton, ExportButton } from '../../components/tools/ToolShell';
import { cleanSequence, STANDARD_GENETIC_CODE, CODON_USAGE_TABLES } from '../../utils/bioutils';

export default function CodonScope() {
  const [activeStep, setActiveStep] = useState(1);
  const [rawSeq, setRawSeq] = useState('');
  const [hostOrganism, setHostOrganism] = useState('E. coli K12');
  const [mode, setMode] = useState('analyze'); // 'analyze' or 'optimize'

  const [validationError, setValidationError] = useState('');
  const [results, setResults] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const steps = [
    { number: 1, title: 'Inputs & Parameters' },
    { number: 2, title: 'CAI Report' }
  ];

  const loadSampleCodons = () => {
    setRawSeq('ATGGCCAGCATGCTGCAGCTGAGCGTGTTCGCCGTGCTGGCCGTGGCCCTGGCCGTGACGGAAAGGTAA');
    setValidationError('');
  };

  const runCodonAnalysis = () => {
    const clean = cleanSequence(rawSeq);
    if (!clean) {
      setValidationError('Please enter a coding sequence.');
      return;
    }
    if (clean.length % 3 !== 0) {
      setValidationError(`Sequence length (${clean.length}bp) is not divisible by 3 — please ensure this is a complete coding sequence.`);
      return;
    }
    const invalidChars = clean.replace(/[ACGTU]/g, '');
    if (invalidChars.length > 0) {
      setValidationError(`Invalid base(s) detected: ${invalidChars.substring(0, 10)}. Please use ACGT.`);
      return;
    }
    setValidationError('');

    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);

      const hostTable = CODON_USAGE_TABLES[hostOrganism];
      if (!hostTable) {
        setValidationError('Invalid host table configuration.');
        return;
      }

      const codons = [];
      for (let i = 0; i < clean.length; i += 3) {
        codons.push(clean.substring(i, i + 3).replace(/U/g, 'T'));
      }

      const maxFreqs = {};
      const optimalCodons = {};
      Object.entries(STANDARD_GENETIC_CODE).forEach(([codon, aaInfo]) => {
        const freq = hostTable[codon] || 0;
        const symbol = aaInfo.symbol;
        if (!maxFreqs[symbol] || freq > maxFreqs[symbol]) {
          maxFreqs[symbol] = freq;
          optimalCodons[symbol] = codon;
        }
      });

      let sumLnW = 0;
      let rareCodonCount = 0;
      const codonAnalysis = [];
      let gc1 = 0, gc2 = 0, gc3 = 0;
      let hasPrematureStop = false;
      let stopIndex = -1;

      codons.forEach((codon, idx) => {
        const aaInfo = STANDARD_GENETIC_CODE[codon];
        const symbol = aaInfo ? aaInfo.symbol : 'X';
        const name = aaInfo ? aaInfo.name : 'Unknown';

        if (symbol === '*' && idx < codons.length - 1) {
          hasPrematureStop = true;
          if (stopIndex === -1) stopIndex = idx * 3;
        }

        if (codon[0] === 'G' || codon[0] === 'C') gc1++;
        if (codon[1] === 'G' || codon[1] === 'C') gc2++;
        if (codon[2] === 'G' || codon[2] === 'C') gc3++;

        const freq = hostTable[codon] || 0;
        const maxFreq = maxFreqs[symbol] || 1;
        const w = Math.max(0.01, freq / maxFreq);
        sumLnW += Math.log(w);

        const isRare = freq < 10.0;
        if (isRare) rareCodonCount++;

        codonAnalysis.push({
          position: idx * 3 + 1,
          codon,
          aminoAcid: `${name} (${symbol})`,
          freq,
          w,
          isRare
        });
      });

      const cai = codons.length > 0 ? Math.exp(sumLnW / codons.length) : 0;

      const gc1Pct = (gc1 / codons.length) * 100;
      const gc2Pct = (gc2 / codons.length) * 100;
      const gc3Pct = (gc3 / codons.length) * 100;
      const overallGcPct = ((gc1 + gc2 + gc3) / clean.length) * 100;

      let optimizedSeq = '';
      let optimizedCodonAnalysis = [];
      let optSumLnW = 0;
      let optRareCount = 0;

      codons.forEach((codon, idx) => {
        const aaInfo = STANDARD_GENETIC_CODE[codon];
        const symbol = aaInfo ? aaInfo.symbol : '*';
        const optCodon = optimalCodons[symbol] || codon;
        optimizedSeq += optCodon;

        const freq = hostTable[optCodon] || 0;
        const maxFreq = maxFreqs[symbol] || 1;
        const w = Math.max(0.01, freq / maxFreq);
        optSumLnW += Math.log(w);

        const isRare = freq < 10.0;
        if (isRare) optRareCount++;

        optimizedCodonAnalysis.push({
          position: idx * 3 + 1,
          codon: optCodon,
          aminoAcid: symbol,
          freq,
          w,
          isRare
        });
      });
      const optCai = codons.length > 0 ? Math.exp(optSumLnW / codons.length) : 0;

      const aaCounts = {};
      codons.forEach((codon) => {
        const aa = STANDARD_GENETIC_CODE[codon]?.symbol || 'X';
        aaCounts[aa] = (aaCounts[aa] || 0) + 1;
      });

      setResults({
        cai: cai.toFixed(3),
        optCai: optCai.toFixed(3),
        rareCodonCount,
        optRareCount,
        gc1: gc1Pct.toFixed(1),
        gc2: gc2Pct.toFixed(1),
        gc3: gc3Pct.toFixed(1),
        overallGc: overallGcPct.toFixed(1),
        codonAnalysis,
        optimizedCodonAnalysis,
        optimizedSeq,
        hasPrematureStop,
        stopIndex,
        aaCounts
      });

      setActiveStep(2);
    }, 850);
  };

  const getExportFasta = () => {
    if (!results) return '';
    const seq = mode === 'optimize' ? results.optimizedSeq : cleanSequence(rawSeq);
    return `>CodonScope_${hostOrganism.replace(/\s+/g, '_')}_${mode}\n${seq}`;
  };

  const getExportCsv = () => {
    if (!results) return '';
    let csv = 'Position,Codon,AminoAcid,HostFrequencyPer1000,AdaptivenessW,IsRare\n';
    const analysis = mode === 'optimize' ? results.optimizedCodonAnalysis : results.codonAnalysis;
    analysis.forEach((c) => {
      csv += `${c.position},${c.codon},"${c.aminoAcid}",${c.freq},${c.w.toFixed(3)},${c.isRare}\n`;
    });
    return csv;
  };

  const getCodonColor = (w) => {
    const hue = 35 + w * (142 - 35);
    const sat = 85 - w * 15;
    const light = 50 + w * 2;
    return `hsl(${hue}, ${sat}%, ${light}%)`;
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
    <ToolShell slug="codonscope">
      {renderStepTracker()}

      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        {/* Step 1: Inputs & Parameters */}
        {activeStep === 1 && (
          <div className="bx-step-section">
            <div className="bx-step-header">
              <span className="bx-step-badge">Step 1</span>
              <h3 className="bx-step-title">Coding Sequence & Host Parameters</h3>
            </div>

            <div className="bx-field-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="codonscope-seq" className="bx-label">Coding Sequence (Length must be divisible by 3)</label>
                <button type="button" className="bx-btn-sample" onClick={loadSampleCodons}>Load Sample CDS</button>
              </div>
              <textarea
                id="codonscope-seq"
                className="bx-textarea"
                style={{ height: '140px' }}
                placeholder="Paste DNA coding sequence e.g., ATGGCC..."
                value={rawSeq}
                onChange={(e) => {
                  setRawSeq(e.target.value);
                  setValidationError('');
                }}
              />
              {validationError && <p style={{ color: 'var(--red)', fontSize: '12px', marginTop: '4px' }}>{validationError}</p>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '12px' }}>
              <div className="bx-field-group">
                <label htmlFor="host-select" className="bx-label">Target Expression Host</label>
                <select
                  id="host-select"
                  className="bx-select"
                  value={hostOrganism}
                  onChange={(e) => setHostOrganism(e.target.value)}
                >
                  <option value="E. coli K12">Escherichia coli K12</option>
                  <option value="S. cerevisiae">Saccharomyces cerevisiae (Yeast)</option>
                  <option value="Homo sapiens">Homo sapiens (Human)</option>
                  <option value="CHO cells">CHO Cells (Hamster)</option>
                  <option value="Spodoptera frugiperda">Spodoptera frugiperda (Sf9 Insect)</option>
                </select>
              </div>

              <div className="bx-field-group">
                <label htmlFor="mode-select" className="bx-label">Optimization Mode</label>
                <select
                  id="mode-select"
                  className="bx-select"
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                >
                  <option value="analyze">Analyze Only (Evaluate GC & CAI)</option>
                  <option value="optimize">Optimize Codons (Synonymous Replacement)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                type="button"
                className="bx-btn-primary"
                onClick={runCodonAnalysis}
                disabled={isAnalyzing || !rawSeq.trim()}
              >
                {isAnalyzing ? (
                  <>
                    <svg style={{ animation: 'spin 1s infinite linear', width: '16px', height: '16px', stroke: 'currentColor', fill: 'none', marginRight: '6px' }} viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" strokeWidth="2.5" strokeDasharray="32" strokeDashoffset="12"/>
                    </svg>
                    Optimizing Codons...
                  </>
                ) : (
                  'Optimize Codons'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: CAI Report */}
        {activeStep === 2 && results && (
          <div className="bx-step-section">
            <div className="bx-step-header">
              <span className="bx-step-badge">Step 2</span>
              <h3 className="bx-step-title">Codon Scope Report</h3>
            </div>

            {/* Score Ring */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', background: 'var(--off)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px' }}>
              <div style={{ width: '80px', height: '80px', position: 'relative', flexShrink: 0 }}>
                <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%' }}>
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--border)" strokeWidth="3.5" />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.915"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="3.5"
                    strokeDasharray="100"
                    strokeDashoffset={100 - (parseFloat(mode === 'optimize' ? results.optCai : results.cai) * 100)}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.4s ease' }}
                  />
                </svg>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '15px', fontWeight: '800', color: 'var(--accent-d)' }}>
                  {mode === 'optimize' ? results.optCai : results.cai}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '15px', fontWeight: 'bold', display: 'block', color: 'var(--text1)' }}>Codon Adaptation Index (CAI)</span>
                <span style={{ fontSize: '12px', color: 'var(--text3)' }}>
                  {parseFloat(mode === 'optimize' ? results.optCai : results.cai) >= 0.8
                    ? '✓ High host translation compatibility score.'
                    : '⚠ Expression levels might be bottlenecked by rare codons.'}
                </span>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="bx-result-box">
                <div className="bx-result-val">{mode === 'optimize' ? results.optRareCount : results.rareCodonCount}</div>
                <div className="bx-result-lbl">Rare Codons (&lt;10/1000)</div>
              </div>
              <div className="bx-result-box">
                <div className="bx-result-val">{results.overallGc}%</div>
                <div className="bx-result-lbl">Overall GC Content</div>
              </div>
            </div>

            {/* GC Breakdowns */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', background: 'var(--white)' }}>
              <span className="bx-label" style={{ display: 'block', marginBottom: '8px' }}>GC Content by Codon Position</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12.5px', color: 'var(--text2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>1st Position GC</span>
                  <strong>{results.gc1}%</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>2nd Position GC</span>
                  <strong>{results.gc2}%</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>3rd Position GC</span>
                  <strong>{results.gc3}%</strong>
                </div>
              </div>
            </div>

            {/* Premature STOP */}
            {results.hasPrematureStop && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--red)', padding: '10px 12px', borderRadius: '6px', fontSize: '13px', color: 'var(--red)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '18px', height: '18px', flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>Warning: Premature STOP codon found at index position {results.stopIndex + 1}bp.</span>
              </div>
            )}

            {/* Codon Heatmap Grid */}
            <div>
              <span className="bx-label" style={{ display: 'block', marginBottom: '6px' }}>Codon Adaptation Heatmap</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxHeight: '110px', overflowY: 'auto', padding: '8px', border: '1px solid var(--border)', borderRadius: '6px', backgroundColor: 'var(--off)' }}>
                {(mode === 'optimize' ? results.optimizedCodonAnalysis : results.codonAnalysis).map((cod, i) => (
                  <div
                    key={i}
                    title={`Pos ${cod.position}: ${cod.codon} (${cod.aminoAcid}) w=${cod.w.toFixed(2)}`}
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '4px',
                      backgroundColor: getCodonColor(cod.w),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontWeight: 'bold',
                      fontSize: '9.5px',
                      fontFamily: 'var(--font-mono)',
                      cursor: 'help'
                    }}
                  >
                    {cod.codon}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '8px' }}>
              <CopyButton text={mode === 'optimize' ? results.optimizedSeq : cleanSequence(rawSeq)} />
              <ExportButton data={getExportFasta()} filename={`codonscope_${hostOrganism.replace(/\s+/g, '_')}_optimized.fasta`} format="fasta" />
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
