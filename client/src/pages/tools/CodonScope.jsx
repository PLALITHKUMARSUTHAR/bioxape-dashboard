import React, { useState, useEffect } from 'react';
import ToolShell, { CopyButton, ExportButton } from '../../components/tools/ToolShell';
import { cleanSequence, STANDARD_GENETIC_CODE, CODON_USAGE_TABLES } from '../../utils/bioutils';
import useDebouncedValue from '../../hooks/useDebouncedValue';

export default function CodonScope() {
  const [rawSeq, setRawSeq] = useState('');
  const [hostOrganism, setHostOrganism] = useState('E. coli K12');
  const [mode, setMode] = useState('analyze'); // 'analyze' or 'optimize'

  const debouncedSeq = useDebouncedValue(rawSeq, 250);
  const [validationError, setValidationError] = useState('');
  const [results, setResults] = useState(null);

  useEffect(() => {
    const clean = cleanSequence(debouncedSeq);
    if (!clean) {
      setResults(null);
      setValidationError('');
      return;
    }

    // 1. Length validation (must be divisible by 3)
    if (clean.length % 3 !== 0) {
      setValidationError(`Sequence length (${clean.length}bp) is not divisible by 3 — please ensure this is a complete coding sequence.`);
      setResults(null);
      return;
    }
    
    // Check characters
    const invalidChars = clean.replace(/[ACGTU]/g, '');
    if (invalidChars.length > 0) {
      setValidationError(`Invalid base(s) detected: ${invalidChars.substring(0, 10)}. Please use ACGT.`);
      setResults(null);
      return;
    }
    setValidationError('');

    const hostTable = CODON_USAGE_TABLES[hostOrganism];
    if (!hostTable) return;

    // Split sequence into codons
    const codons = [];
    for (let i = 0; i < clean.length; i += 3) {
      codons.push(clean.substring(i, i + 3).replace(/U/g, 'T'));
    }

    // Precompute max frequencies for host organism amino acids
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

    // Calculations: CAI, Rare Codons, GC per position
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

      // Check premature stop
      if (symbol === '*' && idx < codons.length - 1) {
        hasPrematureStop = true;
        if (stopIndex === -1) stopIndex = idx * 3;
      }

      // GC at codon positions
      if (codon[0] === 'G' || codon[0] === 'C') gc1++;
      if (codon[1] === 'G' || codon[1] === 'C') gc2++;
      if (codon[2] === 'G' || codon[2] === 'C') gc3++;

      const freq = hostTable[codon] || 0;
      const maxFreq = maxFreqs[symbol] || 1;
      // Clamp w parameter to 0.01 to avoid ln(0) infinity
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

    // CAI = geometric mean
    const cai = codons.length > 0 ? Math.exp(sumLnW / codons.length) : 0;

    // Positional GC Content percentages
    const gc1Pct = (gc1 / codons.length) * 100;
    const gc2Pct = (gc2 / codons.length) * 100;
    const gc3Pct = (gc3 / codons.length) * 100;
    const overallGcPct = ((gc1 + gc2 + gc3) / clean.length) * 100;

    // Optimization path
    let optimizedSeq = '';
    let optimizedCodonAnalysis = [];
    let optSumLnW = 0;
    let optRareCount = 0;

    if (mode === 'optimize') {
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
    }
    const optCai = codons.length > 0 ? Math.exp(optSumLnW / codons.length) : 0;

    // Amino Acid Composition Count
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

  }, [debouncedSeq, hostOrganism, mode]);

  const loadSampleCodons = () => {
    setRawSeq('ATGGCCAGCATGCTGCAGCTGAGCGTGTTCGCCGTGCTGGCCGTGGCCCTGGCCGTGACGGAAAGGTAA');
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

  // Interpolate color from Amber (low usage) to Emerald (high usage)
  const getCodonColor = (w) => {
    // Interpolate between HSL 35 (Amber) and HSL 142 (Emerald)
    const hue = 35 + w * (142 - 35);
    const sat = 85 - w * 15;
    const light = 50 + w * 2;
    return `hsl(${hue}, ${sat}%, ${light}%)`;
  };

  return (
    <ToolShell slug="codonscope">
      <div className="bx-tools-grid">
        {/* Left column: Controls & inputs */}
        <div className="tool-pane-card">
          <div className="tool-pane-title">
            <span>Inputs & Host</span>
            <button type="button" className="mock-sample-btn" onClick={loadSampleCodons}>Load Sample CDS</button>
          </div>

          <div className="mock-field-group">
            <label className="mock-label" htmlFor="host-select">Target Expression Host</label>
            <select
              id="host-select"
              className="form-control"
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

          <div className="mock-field-group">
            <label className="mock-label">Mode Settings</label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button
                type="button"
                className={`bx-tool-btn ${mode === 'analyze' ? 'copied' : ''}`}
                onClick={() => setMode('analyze')}
                style={{ flex: 1 }}
              >
                Analyze Only
              </button>
              <button
                type="button"
                className={`bx-tool-btn ${mode === 'optimize' ? 'copied' : ''}`}
                onClick={() => setMode('optimize')}
                style={{ flex: 1 }}
              >
                Optimize Codons
              </button>
            </div>
          </div>

          <div className="mock-field-group">
            <label className="mock-label" htmlFor="codonscope-seq">Coding Sequence (CDS - length must be divisible by 3)</label>
            <textarea
              id="codonscope-seq"
              className="mock-textarea"
              style={{ height: '160px' }}
              placeholder="Paste coding DNA sequence..."
              value={rawSeq}
              onChange={(e) => setRawSeq(e.target.value)}
            />
            {validationError && <p style={{ color: 'var(--red)', fontSize: '12px', marginTop: '4px' }}>{validationError}</p>}
          </div>
        </div>

        {/* Right column: Charts & stats */}
        <div className="tool-pane-card">
          <div className="tool-pane-title">Optimization Report</div>

          {results ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* CAI Score visualization circle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', background: 'var(--off)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px' }}>
                <div style={{ width: '80px', height: '80px', position: 'relative' }}>
                  <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%' }}>
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--border)" strokeWidth="3" />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth="3.2"
                      strokeDasharray="100"
                      strokeDashoffset={100 - (parseFloat(mode === 'optimize' ? results.optCai : results.cai) * 100)}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 0.4s ease' }}
                    />
                  </svg>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '15px', fontWeight: '800' }}>
                    {mode === 'optimize' ? results.optCai : results.cai}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '15px', fontWeight: 'bold', display: 'block' }}>Codon Adaptation Index (CAI)</span>
                  <span style={{ fontSize: '12px', color: 'var(--text3)' }}>
                    {parseFloat(mode === 'optimize' ? results.optCai : results.cai) >= 0.8
                      ? '✓ Strong expression compatibility index.'
                      : '⚠ Rare codon density may reduce expression levels.'}
                  </span>
                </div>
              </div>

              {/* Rare Codons and GC Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="mock-result-box">
                  <div className="mock-result-value">
                    {mode === 'optimize' ? results.optRareCount : results.rareCodonCount}
                  </div>
                  <div className="mock-result-label">Rare Codons (&lt;10/1000)</div>
                </div>
                <div className="mock-result-box">
                  <div className="mock-result-value">{results.overallGc}%</div>
                  <div className="mock-result-label">Overall GC Content</div>
                </div>
              </div>

              {/* GC codon position breakdown */}
              <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
                <span className="mock-label" style={{ display: 'block', marginBottom: '8px' }}>GC Content by Codon Position</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
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

              {/* Premature Stop Alert */}
              {results.hasPrematureStop && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: 'var(--red-l)', border: '1px solid var(--red)', padding: '10px 12px', borderRadius: '6px', fontSize: '13px', color: 'var(--red)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '18px', height: '18px', flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span>Warning: Premature STOP codon found at position {results.stopIndex + 1}bp.</span>
                </div>
              )}

              {/* Codon Heatmap Grid */}
              <div>
                <span className="mock-label" style={{ display: 'block', marginBottom: '6px' }}>Codon Adaptation Heatmap</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', maxHeight: '110px', overflowY: 'auto', padding: '8px', border: '1px solid var(--border)', borderRadius: '6px', backgroundColor: 'var(--off)' }}>
                  {(mode === 'optimize' ? results.optimizedCodonAnalysis : results.codonAnalysis).map((cod, i) => (
                    <div
                      key={i}
                      title={`Pos ${cod.position}: ${cod.codon} (${cod.aminoAcid}) w=${cod.w.toFixed(2)}`}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '3px',
                        backgroundColor: getCodonColor(cod.w),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 'bold',
                        fontSize: '9px',
                        fontFamily: 'var(--font-mono)',
                        cursor: 'help'
                      }}
                    >
                      {cod.codon}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions row */}
              <div className="mock-actions-row">
                <CopyButton text={mode === 'optimize' ? results.optimizedSeq : cleanSequence(rawSeq)} />
                <ExportButton data={getExportFasta()} filename={`codonscope_${hostOrganism.replace(/\s+/g, '_')}_optimized.fasta`} format="fasta" />
              </div>

            </div>
          ) : (
            <div className="mock-empty-results">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '48px', height: '48px', color: 'var(--text4)', marginBottom: '12px' }}>
                <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2"/>
              </svg>
              <p style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text2)', marginBottom: '4px' }}>No Sequence Analyzed</p>
              <p style={{ fontSize: '13px', lineHeight: 1.4 }}>Enter or paste target coding DNA to map codon frequencies against host tables.</p>
            </div>
          )}
        </div>
      </div>
    </ToolShell>
  );
}
