import React, { useState } from 'react';
import ToolShell, { CopyButton, ExportButton } from '../../components/tools/ToolShell';
import { cleanSequence, detectSequenceType } from '../../utils/bioutils';

export default function AlignLite() {
  const [activeStep, setActiveStep] = useState(1);
  const [refInput, setRefInput] = useState('');
  const [queryInput, setQueryInput] = useState('');
  const [algo, setAlgo] = useState('needleman'); // needleman, smith
  
  // Scoring parameters
  const [matchScore, setMatchScore] = useState(2);
  const [mismatchPenalty, setMismatchPenalty] = useState(-1);
  const [gapPenalty, setGapPenalty] = useState(-2);

  const [results, setResults] = useState(null);
  const [validationError, setValidationError] = useState('');
  const [warning, setWarning] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasResults, setHasResults] = useState(false);

  const steps = [
    { number: 1, title: 'Inputs & Settings' },
    { number: 2, title: 'Alignment Output' }
  ];

  const runAlignmentCalculations = () => {
    setValidationError('');
    setWarning('');

    const cleanRef = cleanSequence(refInput);
    const cleanQuery = cleanSequence(queryInput);

    if (!cleanRef || !cleanQuery) {
      setValidationError('Please specify both a Reference and Query sequence.');
      return;
    }

    const typeRef = detectSequenceType(cleanRef);
    const typeQuery = detectSequenceType(cleanQuery);

    if (typeRef !== typeQuery) {
      setWarning(`Alphabet mismatch: Reference detected as ${typeRef}, Query as ${typeQuery}. Alignment will still run.`);
    }

    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);

      const n = cleanRef.length;
      const m = cleanQuery.length;
      const match = parseInt(matchScore);
      const mismatch = parseInt(mismatchPenalty);
      const gap = parseInt(gapPenalty);

      let alignRef = [];
      let alignQuery = [];
      let scoreMatrix = [];

      if (algo === 'needleman') {
        scoreMatrix = Array(n + 1).fill(null).map(() => Array(m + 1).fill(0));
        for (let i = 0; i <= n; i++) scoreMatrix[i][0] = i * gap;
        for (let j = 0; j <= m; j++) scoreMatrix[0][j] = j * gap;

        for (let i = 1; i <= n; i++) {
          for (let j = 1; j <= m; j++) {
            const scoreSub = cleanRef[i - 1] === cleanQuery[j - 1] ? match : mismatch;
            scoreMatrix[i][j] = Math.max(
              scoreMatrix[i - 1][j - 1] + scoreSub,
              scoreMatrix[i - 1][j] + gap,
              scoreMatrix[i][j - 1] + gap
            );
          }
        }

        let i = n, j = m;
        while (i > 0 || j > 0) {
          if (i > 0 && j > 0) {
            const scoreSub = cleanRef[i - 1] === cleanQuery[j - 1] ? match : mismatch;
            if (scoreMatrix[i][j] === scoreMatrix[i - 1][j - 1] + scoreSub) {
              alignRef.push(cleanRef[i - 1]);
              alignQuery.push(cleanQuery[j - 1]);
              i--; j--;
              continue;
            }
          }
          if (i > 0 && scoreMatrix[i][j] === scoreMatrix[i - 1][j] + gap) {
            alignRef.push(cleanRef[i - 1]);
            alignQuery.push('-');
            i--;
            continue;
          }
          if (j > 0 && scoreMatrix[i][j] === scoreMatrix[i][j - 1] + gap) {
            alignRef.push('-');
            alignQuery.push(cleanQuery[j - 1]);
            j--;
            continue;
          }
          if (i > 0) {
            alignRef.push(cleanRef[i - 1]);
            alignQuery.push('-');
            i--;
          } else {
            alignRef.push('-');
            alignQuery.push(cleanQuery[j - 1]);
            j--;
          }
        }
      } else {
        scoreMatrix = Array(n + 1).fill(null).map(() => Array(m + 1).fill(0));
        let maxScore = 0;
        let maxI = 0, maxJ = 0;

        for (let i = 1; i <= n; i++) {
          for (let j = 1; j <= m; j++) {
            const scoreSub = cleanRef[i - 1] === cleanQuery[j - 1] ? match : mismatch;
            const cellVal = Math.max(
              0,
              scoreMatrix[i - 1][j - 1] + scoreSub,
              scoreMatrix[i - 1][j] + gap,
              scoreMatrix[i][j - 1] + gap
            );
            scoreMatrix[i][j] = cellVal;
            if (cellVal > maxScore) {
              maxScore = cellVal;
              maxI = i;
              maxJ = j;
            }
          }
        }

        let i = maxI, j = maxJ;
        while (i > 0 && j > 0 && scoreMatrix[i][j] > 0) {
          const scoreSub = cleanRef[i - 1] === cleanQuery[j - 1] ? match : mismatch;
          if (scoreMatrix[i][j] === scoreMatrix[i - 1][j - 1] + scoreSub) {
            alignRef.push(cleanRef[i - 1]);
            alignQuery.push(cleanQuery[j - 1]);
            i--; j--;
          } else if (scoreMatrix[i][j] === scoreMatrix[i - 1][j] + gap) {
            alignRef.push(cleanRef[i - 1]);
            alignQuery.push('-');
            i--;
          } else if (scoreMatrix[i][j] === scoreMatrix[i][j - 1] + gap) {
            alignRef.push('-');
            alignQuery.push(cleanQuery[j - 1]);
            j--;
          } else {
            alignRef.push(cleanRef[i - 1]);
            alignQuery.push(cleanQuery[j - 1]);
            i--; j--;
          }
        }
      }

      alignRef.reverse();
      alignQuery.reverse();

      const len = alignRef.length;
      let matches = 0;
      let nonGapCols = 0;
      let mismatches = 0;
      let gaps = 0;
      const diffs = [];
      const matchTrack = [];

      for (let idx = 0; idx < len; idx++) {
        const r = alignRef[idx];
        const q = alignQuery[idx];

        if (r === '-' || q === '-') {
          gaps++;
          matchTrack.push(' ');
          diffs.push({
            position: idx + 1,
            type: r === '-' ? 'Insertion' : 'Deletion',
            refVal: r,
            queryVal: q
          });
        } else {
          nonGapCols++;
          if (r === q) {
            matches++;
            matchTrack.push('|');
          } else {
            mismatches++;
            matchTrack.push('.');
            diffs.push({
              position: idx + 1,
              type: 'Substitution',
              refVal: r,
              queryVal: q
            });
          }
        }
      }

      const pctIdentity = nonGapCols > 0 ? (matches / nonGapCols) * 100 : 0;

      setResults({
        alignRef: alignRef.join(''),
        alignQuery: alignQuery.join(''),
        matchTrack: matchTrack.join(''),
        length: len,
        matches,
        mismatches,
        gaps,
        pctIdentity: pctIdentity.toFixed(1),
        diffs
      });

      setHasResults(true);
      setActiveStep(2);
    }, 900);
  };

  const loadSample = (mode) => {
    if (mode === 'identical') {
      setRefInput('ATGCGATCGATCGATCGATCGATC');
      setQueryInput('ATGCGATCGATCGATCGATCGATC');
    } else {
      setRefInput('ATGCGATCGATCGATCGATCGATC');
      setQueryInput('ATGCGATCGAGCGATCGATCGATCTTG');
    }
    setValidationError('');
  };

  const getAlignmentText = () => {
    if (!results) return '';
    return `Alignment Method: ${algo === 'needleman' ? 'Needleman-Wunsch' : 'Smith-Waterman'}\n% Identity: ${results.pctIdentity}%\n\nRef:   ${results.alignRef}\nMatch: ${results.matchTrack}\nQuery: ${results.alignQuery}`;
  };

  const getDiffsCsv = () => {
    if (!results || results.diffs.length === 0) return '';
    let csv = 'AlignmentPosition,MutationType,ReferenceBase,QueryBase\n';
    results.diffs.forEach(d => {
      csv += `${d.position},${d.type},${d.refVal},${d.queryVal}\n`;
    });
    return csv;
  };

  const renderFormattedAlignment = () => {
    if (!results) return null;

    const chunkWidth = 60;
    const chunksCount = Math.ceil(results.length / chunkWidth);
    const htmlChunks = [];

    for (let c = 0; c < chunksCount; c++) {
      const start = c * chunkWidth;
      const end = Math.min(start + chunkWidth, results.length);

      const refSlice = results.alignRef.substring(start, end);
      const trackSlice = results.matchTrack.substring(start, end);
      const querySlice = results.alignQuery.substring(start, end);

      const positionLabelRow = [];
      for (let i = start; i < end; i++) {
        if ((i + 1) % 10 === 0 || i === start) {
          positionLabelRow.push(i + 1);
          const offset = String(i + 1).length;
          i += (offset - 1);
        } else {
          positionLabelRow.push(' ');
        }
      }

      htmlChunks.push(
        <div key={c} style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontFamily: 'var(--font-mono)', fontSize: '12.5px', whiteSpace: 'pre', overflowX: 'auto', padding: '8px 0', borderBottom: c < chunksCount - 1 ? '1px dashed var(--border)' : 'none' }}>
          <div style={{ color: 'var(--text4)', fontSize: '10px', letterSpacing: '0.15em' }}>
            {positionLabelRow.join('').padEnd(chunkWidth)}
          </div>
          <div style={{ letterSpacing: '0.15em' }}>
            {refSlice.split('').map((char, idx) => {
              const globalIdx = start + idx;
              const isMismatch = results.matchTrack[globalIdx] === '.';
              const isGap = char === '-';
              return (
                <span
                  key={idx}
                  style={{
                    backgroundColor: isMismatch ? 'rgba(245, 158, 11, 0.1)' : isGap ? 'var(--off)' : 'transparent',
                    color: isMismatch ? 'var(--amber-d)' : 'inherit',
                    fontWeight: isMismatch ? 'bold' : 'normal'
                  }}
                >
                  {char}
                </span>
              );
            })}
          </div>
          <div style={{ letterSpacing: '0.15em', color: 'var(--accent)' }}>
            {trackSlice}
          </div>
          <div style={{ letterSpacing: '0.15em' }}>
            {querySlice.split('').map((char, idx) => {
              const globalIdx = start + idx;
              const isMismatch = results.matchTrack[globalIdx] === '.';
              const isGap = char === '-';
              return (
                <span
                  key={idx}
                  style={{
                    backgroundColor: isMismatch ? 'rgba(245, 158, 11, 0.1)' : isGap ? 'var(--off)' : 'transparent',
                    color: isMismatch ? 'var(--amber-d)' : 'inherit',
                    fontWeight: isMismatch ? 'bold' : 'normal'
                  }}
                >
                  {char}
                </span>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: 'var(--white)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', width: '100%' }}>
        <span className="bx-label">Aligned Sequence Alignment Track</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {htmlChunks}
        </div>
      </div>
    );
  };

  const getIdentityColor = (pct) => {
    const num = parseFloat(pct);
    if (num >= 90) return 'var(--accent)';
    if (num >= 70) return 'var(--amber)';
    return 'var(--text3)';
  };

  const resetAnalysis = () => {
    setResults(null);
    setHasResults(false);
    setActiveStep(1);
  };

  const renderStepTracker = () => (
    <div className="bx-step-tracker">
      {steps.map((s) => {
        const isCompleted = s.number < activeStep;
        const isActive = s.number === activeStep;
        const isDisabled = s.number > activeStep && !hasResults;
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
    <ToolShell slug="alignlite">
      {renderStepTracker()}

      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        {/* Step 1: Pairwise Input Sequences & Parameters */}
        {activeStep === 1 && (
          <div className="bx-step-section">
            <div className="bx-step-header">
              <span className="bx-step-badge">Step 1</span>
              <h3 className="bx-step-title">Enter Pairwise Sequences & Parameters</h3>
            </div>

            <div className="bx-field-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="ref-input" className="bx-label">Reference Sequence (Wild-type)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="bx-btn-sample" onClick={() => loadSample('identical')}>Load Identical</button>
                  <span style={{ color: 'var(--border2)' }}>|</span>
                  <button type="button" className="bx-btn-sample" onClick={() => loadSample('mutation')}>Load Mutated</button>
                </div>
              </div>
              <textarea
                id="ref-input"
                className="bx-textarea"
                placeholder="Paste reference WT sequence..."
                value={refInput}
                onChange={(e) => {
                  setRefInput(e.target.value.toUpperCase());
                  setValidationError('');
                }}
                style={{ height: '80px' }}
              />
            </div>

            <div className="bx-field-group">
              <label htmlFor="query-input" className="bx-label">Query Sequence (Target Mutated)</label>
              <textarea
                id="query-input"
                className="bx-textarea"
                placeholder="Paste target sequence to align..."
                value={queryInput}
                onChange={(e) => {
                  setQueryInput(e.target.value.toUpperCase());
                  setValidationError('');
                }}
                style={{ height: '80px' }}
              />
              {validationError && <p style={{ color: 'var(--red)', fontSize: '12px', marginTop: '4px' }}>{validationError}</p>}
            </div>

            <div className="bx-field-group" style={{ marginTop: '16px' }}>
              <label htmlFor="algo-select" className="bx-label">Alignment Algorithm</label>
              <select
                id="algo-select"
                className="bx-select"
                value={algo}
                onChange={(e) => setAlgo(e.target.value)}
              >
                <option value="needleman">Global end-to-end (Needleman-Wunsch)</option>
                <option value="smith">Local subregion (Smith-Waterman)</option>
              </select>
              <p style={{ fontSize: '12px', color: 'var(--text3)', fontStyle: 'italic', marginTop: '4px' }}>
                {algo === 'needleman' 
                  ? 'Calculates alignment end-to-end (best for comparing highly matching chains).'
                  : 'Identifies local zones of similarity (best for scanning variable fragments).'}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '16px', marginBottom: '16px' }}>
              <div className="bx-field-group">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <label htmlFor="match-score-input" className="bx-label">Match</label>
                  <span style={{ fontSize: '11px', fontWeight: 'bold' }}>{matchScore}</span>
                </div>
                <input
                  id="match-score-input"
                  type="range"
                  className="bx-slider"
                  min="1"
                  max="5"
                  value={matchScore}
                  onChange={(e) => setMatchScore(parseInt(e.target.value))}
                />
              </div>
              <div className="bx-field-group">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <label htmlFor="mismatch-score-input" className="bx-label">Mismatch</label>
                  <span style={{ fontSize: '11px', fontWeight: 'bold' }}>{mismatchPenalty}</span>
                </div>
                <input
                  id="mismatch-score-input"
                  type="range"
                  className="bx-slider"
                  min="-5"
                  max="-1"
                  value={mismatchPenalty}
                  onChange={(e) => setMismatchPenalty(parseInt(e.target.value))}
                />
              </div>
              <div className="bx-field-group">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <label htmlFor="gap-score-input" className="bx-label">Gap</label>
                  <span style={{ fontSize: '11px', fontWeight: 'bold' }}>{gapPenalty}</span>
                </div>
                <input
                  id="gap-score-input"
                  type="range"
                  className="bx-slider"
                  min="-8"
                  max="-1"
                  value={gapPenalty}
                  onChange={(e) => setGapPenalty(parseInt(e.target.value))}
                />
              </div>
            </div>

            {warning && <p style={{ color: 'var(--amber)', fontSize: '12.5px', marginTop: '8px' }}>{warning}</p>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                type="button"
                className="bx-btn-primary"
                style={{ width: '100%', padding: '12px' }}
                onClick={runAlignmentCalculations}
                disabled={isAnalyzing || !refInput.trim() || !queryInput.trim()}
              >
                {isAnalyzing ? (
                  <>
                    <svg style={{ animation: 'spin 1.2s infinite linear', width: '16px', height: '16px', marginRight: '6px', stroke: 'currentColor', fill: 'none' }} viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" strokeWidth="2.5"/>
                    </svg>
                    Iterating Score Matrices...
                  </>
                ) : (
                  'Run Pairwise Alignment'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Results */}
        {activeStep === 2 && results && (
          <div className="bx-step-section" style={{ alignItems: 'stretch' }}>
            <div className="bx-step-header">
              <span className="bx-step-badge">Step 2</span>
              <h3 className="bx-step-title">Alignment Results</h3>
            </div>

            {/* Identity score ring */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', backgroundColor: 'var(--off)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
              <svg viewBox="0 0 40 40" style={{ width: '60px', height: '60px', flexShrink: 0 }}>
                <circle cx="20" cy="20" r="16" fill="none" stroke="var(--border)" strokeWidth="3.5" />
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  fill="none"
                  stroke={getIdentityColor(results.pctIdentity)}
                  strokeWidth="3.5"
                  strokeDasharray="100"
                  strokeDashoffset={100 - parseFloat(results.pctIdentity)}
                  transform="rotate(-90 20 20)"
                />
                <text x="20" y="23" fontSize="8" fontWeight="bold" textAnchor="middle" fill="var(--text1)">
                  {parseInt(results.pctIdentity)}%
                </text>
              </svg>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--text1)' }}>{results.pctIdentity}% Sequence Identity</span>
                <span style={{ fontSize: '12px', color: 'var(--text3)' }}>
                  {results.matches} matches, {results.mismatches} mismatches, {results.gaps} gaps over {results.length} aligned residues.
                </span>
              </div>
            </div>

            {/* Align Grid */}
            {renderFormattedAlignment()}

            {/* Mutations variant list */}
            {results.diffs.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span className="bx-label">Variant Report ({results.diffs.length} differences)</span>
                <div style={{ overflowY: 'auto', maxHeight: '140px', border: '1px solid var(--border)', borderRadius: '6px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--off)', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                        <th style={{ padding: '6px' }}>Position</th>
                        <th style={{ padding: '6px' }}>Mutation</th>
                        <th style={{ padding: '6px' }}>Ref Base</th>
                        <th style={{ padding: '6px' }}>Query Base</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.diffs.map((d, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                          <td style={{ padding: '6px' }}><b>{d.position}</b></td>
                          <td style={{ padding: '6px', color: d.type === 'Substitution' ? 'var(--amber-d)' : 'var(--text3)', fontWeight: 'bold' }}>{d.type}</td>
                          <td style={{ padding: '6px', fontFamily: 'var(--font-mono)' }}>{d.refVal}</td>
                          <td style={{ padding: '6px', fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>{d.queryVal}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div style={{ border: '1px solid var(--border2)', backgroundColor: 'var(--g50)', borderRadius: '6px', padding: '10px 14px', fontSize: '13px', color: 'var(--accent-d)', fontWeight: '600' }}>
                ✓ Absolute alignment match. No nucleotide substitutions found.
              </div>
            )}

            {/* Export and Actions */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '8px' }}>
              <CopyButton text={getAlignmentText()} />
              <ExportButton data={getDiffsCsv()} filename="alignment_mutation_report.csv" format="csv" />
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
