import React, { useState, useEffect } from 'react';
import ToolShell, { CopyButton, ExportButton } from '../../components/tools/ToolShell';
import { cleanSequence, detectSequenceType } from '../../utils/bioutils';
import useDebouncedValue from '../../hooks/useDebouncedValue';

export default function AlignLite() {
  const [refInput, setRefInput] = useState('');
  const [queryInput, setQueryInput] = useState('');
  const [algo, setAlgo] = useState('needleman'); // needleman, smith
  
  // Scoring parameters
  const [matchScore, setMatchScore] = useState(2);
  const [mismatchPenalty, setMismatchPenalty] = useState(-1);
  const [gapPenalty, setGapPenalty] = useState(-2);

  const debouncedRef = useDebouncedValue(refInput, 250);
  const debouncedQuery = useDebouncedValue(queryInput, 250);

  const [results, setResults] = useState(null);
  const [validationError, setValidationError] = useState('');
  const [warning, setWarning] = useState('');

  // Auto-detect alphabet and check for mismatches
  useEffect(() => {
    setValidationError('');
    setWarning('');

    const cleanRef = cleanSequence(debouncedRef);
    const cleanQuery = cleanSequence(debouncedQuery);

    if (!cleanRef || !cleanQuery) {
      setResults(null);
      return;
    }

    if (cleanRef.length + cleanQuery.length > 3000) {
      setWarning('Combined sequence length is high. Alignment computation may take a moment.');
    }

    const typeRef = detectSequenceType(cleanRef);
    const typeQuery = detectSequenceType(cleanQuery);

    if (typeRef !== typeQuery) {
      setWarning(`Alphabet mismatch: Reference detected as ${typeRef}, Query as ${typeQuery}. Alignment will still run.`);
    }

    // Run DP alignment
    runAlignment(cleanRef, cleanQuery);
  }, [debouncedRef, debouncedQuery, algo, matchScore, mismatchPenalty, gapPenalty]);

  // Dynamic Programming Core Alignment
  const runAlignment = (ref, query) => {
    const n = ref.length;
    const m = query.length;
    const match = parseInt(matchScore);
    const mismatch = parseInt(mismatchPenalty);
    const gap = parseInt(gapPenalty);

    let alignRef = [];
    let alignQuery = [];
    let scoreMatrix = [];

    if (algo === 'needleman') {
      // Needleman-Wunsch (Global)
      scoreMatrix = Array(n + 1).fill(null).map(() => Array(m + 1).fill(0));
      for (let i = 0; i <= n; i++) scoreMatrix[i][0] = i * gap;
      for (let j = 0; j <= m; j++) scoreMatrix[0][j] = j * gap;

      for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
          const scoreSub = ref[i - 1] === query[j - 1] ? match : mismatch;
          scoreMatrix[i][j] = Math.max(
            scoreMatrix[i - 1][j - 1] + scoreSub,
            scoreMatrix[i - 1][j] + gap,
            scoreMatrix[i][j - 1] + gap
          );
        }
      }

      // Traceback
      let i = n, j = m;
      while (i > 0 || j > 0) {
        if (i > 0 && j > 0) {
          const scoreSub = ref[i - 1] === query[j - 1] ? match : mismatch;
          if (scoreMatrix[i][j] === scoreMatrix[i - 1][j - 1] + scoreSub) {
            alignRef.push(ref[i - 1]);
            alignQuery.push(query[j - 1]);
            i--; j--;
            continue;
          }
        }
        if (i > 0 && scoreMatrix[i][j] === scoreMatrix[i - 1][j] + gap) {
          alignRef.push(ref[i - 1]);
          alignQuery.push('-');
          i--;
          continue;
        }
        if (j > 0 && scoreMatrix[i][j] === scoreMatrix[i][j - 1] + gap) {
          alignRef.push('-');
          alignQuery.push(query[j - 1]);
          j--;
          continue;
        }
        // Fallback
        if (i > 0) {
          alignRef.push(ref[i - 1]);
          alignQuery.push('-');
          i--;
        } else {
          alignRef.push('-');
          alignQuery.push(query[j - 1]);
          j--;
        }
      }
    } else {
      // Smith-Waterman (Local)
      scoreMatrix = Array(n + 1).fill(null).map(() => Array(m + 1).fill(0));
      let maxScore = 0;
      let maxI = 0, maxJ = 0;

      for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
          const scoreSub = ref[i - 1] === query[j - 1] ? match : mismatch;
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

      // Traceback from max score cell until we hit a score of 0
      let i = maxI, j = maxJ;
      while (i > 0 && j > 0 && scoreMatrix[i][j] > 0) {
        const scoreSub = ref[i - 1] === query[j - 1] ? match : mismatch;
        if (scoreMatrix[i][j] === scoreMatrix[i - 1][j - 1] + scoreSub) {
          alignRef.push(ref[i - 1]);
          alignQuery.push(query[j - 1]);
          i--; j--;
        } else if (scoreMatrix[i][j] === scoreMatrix[i - 1][j] + gap) {
          alignRef.push(ref[i - 1]);
          alignQuery.push('-');
          i--;
        } else if (scoreMatrix[i][j] === scoreMatrix[i][j - 1] + gap) {
          alignRef.push('-');
          alignQuery.push(query[j - 1]);
          j--;
        } else {
          alignRef.push(ref[i - 1]);
          alignQuery.push(query[j - 1]);
          i--; j--;
        }
      }
    }

    alignRef.reverse();
    alignQuery.reverse();

    // Stats calculations
    const len = alignRef.length;
    let matches = 0;
    let nonGapCols = 0;
    let mismatches = 0;
    let gaps = 0;
    const diffs = [];

    // Match track representation
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
  };

  const loadSample = (mode) => {
    if (mode === 'identical') {
      setRefInput('ATGCGATCGATCGATCGATCGATC');
      setQueryInput('ATGCGATCGATCGATCGATCGATC');
    } else {
      setRefInput('ATGCGATCGATCGATCGATCGATC');
      setQueryInput('ATGCGATCGAGCGATCGATCGATCTTG');
    }
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

  // Group columns into chunks of 60 for wrapped monospace rendering
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

      // Render position numbering above reference slice
      const positionLabelRow = [];
      for (let i = start; i < end; i++) {
        if ((i + 1) % 10 === 0 || i === start) {
          positionLabelRow.push(i + 1);
          // adjust spaces based on number length
          const offset = String(i + 1).length;
          i += (offset - 1);
        } else {
          positionLabelRow.push(' ');
        }
      }

      htmlChunks.push(
        <div key={c} style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontFamily: 'var(--font-mono)', fontSize: '13px', whiteSpace: 'pre', overflowX: 'auto', padding: '10px 0', borderBottom: c < chunksCount - 1 ? '1px dashed var(--border)' : 'none' }}>
          {/* Numbers */}
          <div style={{ color: 'var(--text4)', fontSize: '11px', letterSpacing: '0.15em' }}>
            {positionLabelRow.join('').padEnd(chunkWidth)}
          </div>
          {/* Reference */}
          <div style={{ letterSpacing: '0.15em' }}>
            {refSlice.split('').map((char, idx) => {
              const globalIdx = start + idx;
              const isMismatch = results.matchTrack[globalIdx] === '.';
              const isGap = char === '-';
              return (
                <span
                  key={idx}
                  style={{
                    backgroundColor: isMismatch ? 'var(--amber-l)' : isGap ? 'var(--neutral-100)' : 'transparent',
                    color: isMismatch ? 'var(--amber)' : 'inherit',
                    fontWeight: isMismatch ? 'bold' : 'normal'
                  }}
                >
                  {char}
                </span>
              );
            })}
          </div>
          {/* Match Track */}
          <div style={{ letterSpacing: '0.15em', color: 'var(--accent)' }}>
            {trackSlice}
          </div>
          {/* Query */}
          <div style={{ letterSpacing: '0.15em' }}>
            {querySlice.split('').map((char, idx) => {
              const globalIdx = start + idx;
              const isMismatch = results.matchTrack[globalIdx] === '.';
              const isGap = char === '-';
              return (
                <span
                  key={idx}
                  style={{
                    backgroundColor: isMismatch ? 'var(--amber-l)' : isGap ? 'var(--neutral-100)' : 'transparent',
                    color: isMismatch ? 'var(--amber)' : 'inherit',
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: 'var(--white)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: 'bold' }}>Aligned Monospace Comparison</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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

  return (
    <ToolShell slug="alignlite">
      <style>{`
        .al-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
        }
        @media (min-width: 1024px) {
          .al-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        .param-slider-container {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        .diffs-table-wrapper {
          overflow-y: auto;
          max-height: 160px;
          border: 1px solid var(--border);
          border-radius: 6px;
        }
        .diffs-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        .diffs-table th, .diffs-table td {
          padding: 6px 8px;
          border-bottom: 1px solid var(--border);
          text-align: center;
        }
        .diffs-table th {
          background-color: var(--off);
          font-weight: 600;
          position: sticky;
          top: 0;
        }
      `}</style>

      <div className="al-grid">
        
        {/* Left Column: Form inputs */}
        <div className="tool-pane-card">
          <div className="tool-pane-title">
            <span>Pairwise Inputs</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="mock-sample-btn" onClick={() => loadSample('identical')}>Identical Sample</button>
              <button type="button" className="mock-sample-btn" onClick={() => loadSample('mutation')}>Mutation Sample</button>
            </div>
          </div>

          {/* Reference Input */}
          <div className="mock-field-group">
            <label htmlFor="ref-input" className="mock-label">Reference Sequence (Wild-type)</label>
            <textarea
              id="ref-input"
              className="mock-textarea"
              placeholder="Paste reference sequence..."
              value={refInput}
              onChange={(e) => setRefInput(e.target.value)}
              style={{ height: '80px' }}
            />
          </div>

          {/* Query Input */}
          <div className="mock-field-group">
            <label htmlFor="query-input" className="mock-label">Query Sequence (Target)</label>
            <textarea
              id="query-input"
              className="mock-textarea"
              placeholder="Paste query sequence to align..."
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              style={{ height: '80px' }}
            />
          </div>

          {/* Method selector */}
          <div className="mock-field-group">
            <label htmlFor="algo-select" className="mock-label">Alignment Method</label>
            <select
              id="algo-select"
              className="mock-textarea"
              style={{ height: '42px', padding: '8px' }}
              value={algo}
              onChange={(e) => setAlgo(e.target.value)}
            >
              <option value="needleman">Global Alignment (Needleman-Wunsch)</option>
              <option value="smith">Local Alignment (Smith-Waterman)</option>
            </select>
            <p style={{ fontSize: '11px', color: 'var(--text3)', fontStyle: 'italic', marginTop: '2px' }}>
              {algo === 'needleman' 
                ? 'Aligns the full length of both sequences end-to-end (best for comparing similar lengths).'
                : 'Finds the best-matching local subregion (best for search fragments or flanking insertions).'}
            </p>
          </div>

          {/* Scoring parameters */}
          <div className="param-slider-container">
            <div className="mock-field-group">
              <label htmlFor="match-score-input" className="mock-label">Match ({matchScore})</label>
              <input
                id="match-score-input"
                type="range"
                min="1"
                max="5"
                value={matchScore}
                onChange={(e) => setMatchScore(parseInt(e.target.value))}
                style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
              />
            </div>
            <div className="mock-field-group">
              <label htmlFor="mismatch-score-input" className="mock-label">Mismatch ({mismatchPenalty})</label>
              <input
                id="mismatch-score-input"
                type="range"
                min="-5"
                max="-1"
                value={mismatchPenalty}
                onChange={(e) => setMismatchPenalty(parseInt(e.target.value))}
                style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
              />
            </div>
            <div className="mock-field-group">
              <label htmlFor="gap-score-input" className="mock-label">Gap ({gapPenalty})</label>
              <input
                id="gap-score-input"
                type="range"
                min="-8"
                max="-1"
                value={gapPenalty}
                onChange={(e) => setGapPenalty(parseInt(e.target.value))}
                style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
              />
            </div>
          </div>

          {warning && <p style={{ color: 'var(--amber)', fontSize: '12px', marginTop: '10px' }}>{warning}</p>}
          {validationError && <p style={{ color: 'var(--red)', fontSize: '13px', marginTop: '10px' }}>{validationError}</p>}
        </div>

        {/* Right Column: Visualization Metrics */}
        <div className="tool-pane-card">
          <div className="tool-pane-title">Alignment Parameters</div>

          {results ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Identity circular progress ring */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', backgroundColor: 'var(--off)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px' }}>
                <svg viewBox="0 0 40 40" style={{ width: '60px', height: '60px', flexShrink: 0 }}>
                  <circle cx="20" cy="20" r="16" fill="none" stroke="var(--border)" strokeWidth="3" />
                  <circle
                    cx="20"
                    cy="20"
                    r="16"
                    fill="none"
                    stroke={getIdentityColor(results.pctIdentity)}
                    strokeWidth="3"
                    strokeDasharray="100"
                    strokeDashoffset={100 - parseFloat(results.pctIdentity)}
                    transform="rotate(-90 20 20)"
                    style={{ transition: 'stroke-dashoffset 0.4s ease' }}
                  />
                  <text x="20" y="24" fontSize="8" fontWeight="bold" textAnchor="middle" fill="var(--text1)">
                    {parseInt(results.pctIdentity)}%
                  </text>
                </svg>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{results.pctIdentity}% Sequence Identity</span>
                  <span style={{ fontSize: '12px', color: 'var(--text3)' }}>
                    {results.matches} matches, {results.mismatches} mismatches, {results.gaps} gaps over {results.length} aligned sites.
                  </span>
                </div>
              </div>

              {/* Stacked alignment chunks */}
              {renderFormattedAlignment()}

              {/* Mutations Variant List */}
              {results.diffs.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold' }}>Variant Report ({results.diffs.length} mutations)</span>
                  <div className="diffs-table-wrapper">
                    <table className="diffs-table">
                      <thead>
                        <tr>
                          <th>Align Position</th>
                          <th>Mutation Type</th>
                          <th>Reference</th>
                          <th>Query</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.diffs.map((d, idx) => (
                          <tr key={idx}>
                            <td><b>{d.position}</b></td>
                            <td>
                              <span style={{ fontSize: '10px', fontWeight: 'bold', color: d.type === 'Substitution' ? 'var(--amber)' : 'var(--text3)' }}>
                                {d.type}
                              </span>
                            </td>
                            <td style={{ fontFamily: 'var(--font-mono)' }}>{d.refVal}</td>
                            <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>{d.queryVal}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div style={{ border: '1px solid var(--border2)', backgroundColor: 'var(--g50)', borderRadius: '6px', padding: '10px 14px', fontSize: '13px', color: 'var(--accent-d)', fontWeight: '500' }}>
                  ✓ 100% Sequence alignment match. No differences found.
                </div>
              )}

              {/* Actions */}
              <div className="mock-actions-row">
                <CopyButton text={getAlignmentText()} />
                <ExportButton data={getDiffsCsv()} filename="alignment_mutation_report.csv" format="csv" />
              </div>

            </div>
          ) : (
            <div className="mock-empty-results">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '48px', height: '48px', color: 'var(--text4)', marginBottom: '12px' }}>
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <p style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text2)', marginBottom: '4px' }}>No Alignment Performed</p>
              <p style={{ fontSize: '13px', lineHeight: 1.4 }}>Enter wild-type (reference) and query sequences on the left to align matches and calculate mutation counts.</p>
            </div>
          )}
        </div>

      </div>
    </ToolShell>
  );
}
