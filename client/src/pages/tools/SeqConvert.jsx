import React, { useState, useEffect } from 'react';
import ToolShell, { CopyButton, ExportButton } from '../../components/tools/ToolShell';
import { cleanSequence, detectSequenceType, reverseComplement, transcribe, translate, STANDARD_GENETIC_CODE } from '../../utils/bioutils';
import useDebouncedValue from '../../hooks/useDebouncedValue';

export default function SeqConvert() {
  const [rawInput, setRawInput] = useState('');
  const debouncedInput = useDebouncedValue(rawInput, 250);
  
  const [seqType, setSeqType] = useState('DNA');
  const [activeMode, setActiveMode] = useState('transcribe'); // transcribe, revcomp, translate, sixframe, orf
  
  // Translation settings
  const [selectedFrame, setSelectedFrame] = useState(1); // 1, 2, 3, -1, -2, -3
  const [readThroughStop, setReadThroughStop] = useState(false);

  // ORF settings
  const [minOrfLen, setMinOrfLen] = useState(100); // in bp

  // Results
  const [cleanedSeq, setCleanedSeq] = useState('');
  const [simpleResult, setSimpleResult] = useState('');
  const [orfResults, setOrfResults] = useState([]);
  const [validationError, setValidationError] = useState('');
  const [performanceWarning, setPerformanceWarning] = useState('');

  // Process sequence whenever debounced input changes
  useEffect(() => {
    setValidationError('');
    setPerformanceWarning('');
    
    const clean = cleanSequence(debouncedInput);
    if (!clean) {
      setCleanedSeq('');
      setSimpleResult('');
      setOrfResults([]);
      return;
    }

    // Determine type
    const type = detectSequenceType(clean);
    setSeqType(type);

    // Limit checks
    if (clean.length > 5000) {
      setPerformanceWarning('Large sequence. Computations will run but visualization will be capped to prevent DOM lag.');
    }

    // Validate characters based on type
    const invalidDnaRna = clean.replace(/[ACGUTN]/g, '');
    const invalidProtein = clean.replace(/[ACDEFGHIKLMNPQRSTVWY]/g, '');

    if (type === 'PROTEIN' && invalidProtein.length > 0) {
      setValidationError(`Contains invalid amino acids: ${invalidProtein.substring(0, 5)}...`);
      return;
    } else if (type !== 'PROTEIN' && invalidDnaRna.length > 0) {
      setValidationError(`Contains invalid nucleotides: ${invalidDnaRna.substring(0, 5)}...`);
      return;
    }

    setCleanedSeq(clean);
  }, [debouncedInput]);

  // Perform active conversions
  useEffect(() => {
    if (!cleanedSeq || validationError) {
      setSimpleResult('');
      setOrfResults([]);
      return;
    }

    if (activeMode === 'transcribe') {
      // DNA -> RNA or RNA -> DNA depending on input
      if (seqType === 'RNA') {
        // Reverse transcribe
        setSimpleResult(cleanedSeq.replace(/U/g, 'T'));
      } else {
        setSimpleResult(transcribe(cleanedSeq));
      }
    } else if (activeMode === 'revcomp') {
      setSimpleResult(reverseComplement(cleanedSeq));
    } else if (activeMode === 'translate') {
      const translated = translate(cleanedSeq, selectedFrame, readThroughStop);
      const remainder = (cleanedSeq.length - (Math.abs(selectedFrame) - 1)) % 3;
      const note = remainder > 0 ? `\n\n[Note: ${remainder} incomplete trailing base(s) at 3' end ignored]` : '';
      setSimpleResult(translated + note);
    } else if (activeMode === 'orf') {
      // Find ORFs across 6 frames
      const foundOrfs = [];
      const minLengthBp = parseInt(minOrfLen) || 100;

      // Frames 1, 2, 3
      for (let f = 1; f <= 3; f++) {
        scanOrfsInFrame(cleanedSeq, f, minLengthBp, foundOrfs);
      }
      
      // Frames -1, -2, -3 (using reverse complement)
      const revComp = reverseComplement(cleanedSeq);
      for (let f = 1; f <= 3; f++) {
        scanOrfsInFrame(revComp, -f, minLengthBp, foundOrfs, true);
      }

      // Sort by length descending
      foundOrfs.sort((a, b) => b.lengthBp - a.lengthBp);
      setOrfResults(foundOrfs);
    }
  }, [cleanedSeq, activeMode, selectedFrame, readThroughStop, minOrfLen, seqType, validationError]);

  // ORF Helper scanning algorithm
  const scanOrfsInFrame = (seqStr, frame, minLengthBp, orfList, isReverse = false) => {
    const offset = Math.abs(frame) - 1;
    let inOrf = false;
    let startIdx = -1;

    for (let i = offset; i < seqStr.length - 2; i += 3) {
      const codon = seqStr.substring(i, i + 3).replace(/U/g, 'T');
      const aaInfo = STANDARD_GENETIC_CODE[codon];
      const aa = aaInfo ? aaInfo.symbol : 'X';

      if (!inOrf && aa === 'M') {
        inOrf = true;
        startIdx = i;
      } else if (inOrf && aa === '*') {
        const lengthBp = (i + 3) - startIdx;
        if (lengthBp >= minLengthBp) {
          // Translate the full ORF
          const peptide = translate(seqStr.substring(startIdx, i + 3), 1, true);
          
          // Map coordinates relative to original forward sequence
          let mappedStart, mappedEnd;
          if (isReverse) {
            mappedStart = seqStr.length - (i + 3) + 1;
            mappedEnd = seqStr.length - startIdx;
          } else {
            mappedStart = startIdx + 1;
            mappedEnd = i + 3;
          }

          orfList.push({
            frame: frame,
            start: mappedStart,
            end: mappedEnd,
            lengthBp,
            lengthAa: peptide.length,
            peptidePreview: peptide.substring(0, 10) + (peptide.length > 10 ? '...' : ''),
            peptideFull: peptide,
            sequence: seqStr.substring(startIdx, i + 3)
          });
        }
        inOrf = false;
      }
    }
  };

  // Six Frame Visualizer Grid Renderer
  const renderSixFrameGrid = () => {
    if (!cleanedSeq || seqType === 'PROTEIN') return null;

    // Limit rendering length to prevent DOM freezing
    const capLen = 600;
    const isCapped = cleanedSeq.length > capLen;
    const workingSeq = cleanedSeq.substring(0, capLen);
    const revSeq = reverseComplement(workingSeq);

    // Prepare AA lists for alignment
    const getAlignedAaRow = (seq, frame) => {
      const offset = Math.abs(frame) - 1;
      const row = Array(seq.length).fill('');
      
      for (let i = offset; i < seq.length - 2; i += 3) {
        const codon = seq.substring(i, i + 3).replace(/U/g, 'T');
        const aaInfo = STANDARD_GENETIC_CODE[codon];
        const aa = aaInfo ? aaInfo.symbol : 'X';
        
        row[i] = aa;   // Place at codon start
        row[i+1] = ''; // blank spacers
        row[i+2] = '';
      }
      return row;
    };

    const f1Row = getAlignedAaRow(workingSeq, 1);
    const f2Row = getAlignedAaRow(workingSeq, 2);
    const f3Row = getAlignedAaRow(workingSeq, 3);

    const r1Row = getAlignedAaRow(revSeq, 1);
    const r2Row = getAlignedAaRow(revSeq, 2);
    const r3Row = getAlignedAaRow(revSeq, 3);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Forward Frames Section */}
        <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', backgroundColor: 'var(--white)', overflowX: 'auto' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
            Forward Strand (5' → 3') & Reading Frames
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '8px', fontFamily: 'var(--font-mono)', fontSize: '13px', whiteSpace: 'nowrap' }}>
            {/* Headers / Labels */}
            <div style={{ fontWeight: 'bold', color: 'var(--text3)' }}>Frame +3</div>
            <div style={{ letterSpacing: '0.22em', paddingLeft: '8px' }}>
              {f3Row.map((aa, idx) => renderAaCharacter(aa, idx))}
            </div>

            <div style={{ fontWeight: 'bold', color: 'var(--text3)' }}>Frame +2</div>
            <div style={{ letterSpacing: '0.22em', paddingLeft: '4px' }}>
              {f2Row.map((aa, idx) => renderAaCharacter(aa, idx))}
            </div>

            <div style={{ fontWeight: 'bold', color: 'var(--text3)' }}>Frame +1</div>
            <div style={{ letterSpacing: '0.22em' }}>
              {f1Row.map((aa, idx) => renderAaCharacter(aa, idx))}
            </div>

            {/* Sequence */}
            <div style={{ fontWeight: 'bold', color: 'var(--accent-d)', borderTop: '1px solid var(--border)', paddingTop: '4px' }}>DNA</div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '4px', letterSpacing: '0.22em', color: 'var(--text1)' }}>
              {workingSeq}
            </div>
          </div>
        </div>

        {/* Reverse Frames Section */}
        <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', backgroundColor: 'var(--white)', overflowX: 'auto' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
            Reverse Complement Strand (5' → 3') & Reading Frames
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '8px', fontFamily: 'var(--font-mono)', fontSize: '13px', whiteSpace: 'nowrap' }}>
            {/* Sequence */}
            <div style={{ fontWeight: 'bold', color: 'var(--accent-d)' }}>Rev-Comp</div>
            <div style={{ letterSpacing: '0.22em', color: 'var(--text2)' }}>
              {revSeq}
            </div>

            {/* Reverse Reading Rows */}
            <div style={{ fontWeight: 'bold', color: 'var(--text3)', borderTop: '1px solid var(--border)', paddingTop: '4px' }}>Frame -1</div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '4px', letterSpacing: '0.22em' }}>
              {r1Row.map((aa, idx) => renderAaCharacter(aa, idx))}
            </div>

            <div style={{ fontWeight: 'bold', color: 'var(--text3)' }}>Frame -2</div>
            <div style={{ letterSpacing: '0.22em', paddingLeft: '4px' }}>
              {r2Row.map((aa, idx) => renderAaCharacter(aa, idx))}
            </div>

            <div style={{ fontWeight: 'bold', color: 'var(--text3)' }}>Frame -3</div>
            <div style={{ letterSpacing: '0.22em', paddingLeft: '8px' }}>
              {r3Row.map((aa, idx) => renderAaCharacter(aa, idx))}
            </div>
          </div>
        </div>

        {isCapped && (
          <p style={{ fontSize: '12px', color: 'var(--text3)', fontStyle: 'italic', textAlign: 'center' }}>
            *Visual representation capped at 600bp to maintain UI performance. Use full export functions for complete sequence.
          </p>
        )}
      </div>
    );
  };

  // Stylized character helper
  const renderAaCharacter = (aa, key) => {
    if (!aa) return ' ';
    if (aa === 'M') {
      return (
        <span key={key} style={{ backgroundColor: 'var(--accent-l)', color: 'var(--accent-d)', fontWeight: 'bold', padding: '1px 2px', borderRadius: '3px' }}>
          M
        </span>
      );
    }
    if (aa === '*') {
      return (
        <span key={key} style={{ backgroundColor: 'var(--amber-l)', color: 'var(--amber)', fontWeight: 'bold', padding: '1px 2px', borderRadius: '3px' }}>
          *
        </span>
      );
    }
    return <span key={key}>{aa}</span>;
  };

  const loadSample = () => {
    setRawInput('ATGGCCAGCATGCTGCAGCTGAGCGTGTTCGCCGTGCTGGCCGTGGCCCTGGCCGTGGACCAGTCGTAG');
  };

  const getFastaOutput = () => {
    if (!cleanedSeq) return '';
    const dateStr = new Date().toISOString().split('T')[0];
    return `>SeqConvert_${activeMode.toUpperCase()}_${dateStr}\n${simpleResult || cleanedSeq}`;
  };

  const getOrfCsvOutput = () => {
    if (orfResults.length === 0) return '';
    let csv = 'ID,Frame,Start,End,Length (bp),Length (aa),Peptide Sequence\n';
    orfResults.forEach((orf, idx) => {
      csv += `${idx + 1},${orf.frame},${orf.start},${orf.end},${orf.lengthBp},${orf.lengthAa},${orf.peptideFull}\n`;
    });
    return csv;
  };

  return (
    <ToolShell slug="seqconvert">
      <style>{`
        .scv-modes-bar {
          display: flex;
          border-bottom: 2px solid var(--border);
          gap: 12px;
          margin-bottom: 20px;
        }
        .scv-mode-btn {
          background: none;
          border: none;
          padding: 8px 14px;
          font-size: 14px;
          font-weight: 600;
          color: var(--text3);
          cursor: pointer;
          position: relative;
          transition: color 0.15s ease;
        }
        .scv-mode-btn:hover {
          color: var(--accent);
        }
        .scv-mode-btn.active {
          color: var(--accent-d);
        }
        .scv-mode-btn.active::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          right: 0;
          height: 2px;
          background-color: var(--accent);
        }
        .scv-layout {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
        }
        @media (min-width: 1024px) {
          .scv-layout {
            grid-template-columns: 1fr;
          }
          /* Override two columns since we want full width sequence visualizers */
          .tool-layout-grid {
            grid-template-columns: 1fr !important;
          }
        }
        .output-sequence-box {
          border: 1px solid var(--border);
          background-color: var(--off);
          border-radius: 8px;
          padding: 16px;
          font-family: var(--font-mono, monospace);
          font-size: 13.5px;
          line-height: 1.6;
          max-height: 250px;
          overflow-y: auto;
          white-space: pre-wrap;
          word-break: break-all;
        }
        .orfs-table-wrapper {
          overflow-x: auto;
          border: 1px solid var(--border);
          border-radius: 8px;
        }
        .orfs-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .orfs-table th, .orfs-table td {
          padding: 10px 12px;
          border-bottom: 1px solid var(--border);
          text-align: left;
        }
        .orfs-table th {
          background-color: var(--off);
          font-weight: 600;
        }
        .orfs-table tr:hover {
          background-color: var(--g50);
        }
        .frame-badge {
          font-size: 11px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .frame-badge.plus {
          background-color: var(--g50);
          color: var(--accent-d);
          border: 1px solid var(--border2);
        }
        .frame-badge.minus {
          background-color: var(--amber-l);
          color: var(--amber);
          border: 1px solid var(--amber);
        }
      `}</style>

      {/* Modes Navigation */}
      <div className="scv-modes-bar" role="tablist">
        <button
          type="button"
          className={`scv-mode-btn ${activeMode === 'transcribe' ? 'active' : ''}`}
          onClick={() => setActiveMode('transcribe')}
          role="tab"
          aria-selected={activeMode === 'transcribe'}
        >
          Transcribe (DNA ↔ RNA)
        </button>
        <button
          type="button"
          className={`scv-mode-btn ${activeMode === 'revcomp' ? 'active' : ''}`}
          onClick={() => setActiveMode('revcomp')}
          role="tab"
          aria-selected={activeMode === 'revcomp'}
        >
          Reverse Complement
        </button>
        <button
          type="button"
          className={`scv-mode-btn ${activeMode === 'translate' ? 'active' : ''}`}
          onClick={() => setActiveMode('translate')}
          role="tab"
          aria-selected={activeMode === 'translate'}
          disabled={seqType === 'PROTEIN'}
          style={{ opacity: seqType === 'PROTEIN' ? 0.5 : 1 }}
        >
          Translate (Single Frame)
        </button>
        <button
          type="button"
          className={`scv-mode-btn ${activeMode === 'sixframe' ? 'active' : ''}`}
          onClick={() => setActiveMode('sixframe')}
          role="tab"
          aria-selected={activeMode === 'sixframe'}
          disabled={seqType === 'PROTEIN'}
          style={{ opacity: seqType === 'PROTEIN' ? 0.5 : 1 }}
        >
          Six-Frame Alignment
        </button>
        <button
          type="button"
          className={`scv-mode-btn ${activeMode === 'orf' ? 'active' : ''}`}
          onClick={() => setActiveMode('orf')}
          role="tab"
          aria-selected={activeMode === 'orf'}
          disabled={seqType === 'PROTEIN'}
          style={{ opacity: seqType === 'PROTEIN' ? 0.5 : 1 }}
        >
          ORF Finder
        </button>
      </div>

      <div className="bx-tools-grid">
        
        {/* Input Panel */}
        <div className="tool-pane-card">
          <div className="tool-pane-title">
            <span>Sequence Input</span>
            <button type="button" className="mock-sample-btn" onClick={loadSample}>Load DNA Sample</button>
          </div>

          <div className="mock-field-group">
            <label htmlFor="seq-input" className="mock-label">
              Paste Nucleotide or Peptide Sequence (FASTA headers parsed automatically)
            </label>
            <textarea
              id="seq-input"
              className="mock-textarea"
              placeholder="Paste raw sequence e.g., ATGGCCAGC..."
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
            />
          </div>

          {/* Controls relative to mode */}
          {activeMode === 'translate' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="mock-field-group">
                <label htmlFor="frame-select" className="mock-label">Reading Frame</label>
                <select
                  id="frame-select"
                  className="mock-textarea"
                  style={{ height: '42px', padding: '8px' }}
                  value={selectedFrame}
                  onChange={(e) => setSelectedFrame(parseInt(e.target.value))}
                >
                  <option value={1}>Frame +1</option>
                  <option value={2}>Frame +2</option>
                  <option value={3}>Frame +3</option>
                  <option value={-1}>Frame -1</option>
                  <option value={-2}>Frame -2</option>
                  <option value={-3}>Frame -3</option>
                </select>
              </div>
              <div className="mock-field-group" style={{ justifyContent: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={readThroughStop}
                    onChange={(e) => setReadThroughStop(e.target.checked)}
                  />
                  Read through stop codons (*)
                </label>
              </div>
            </div>
          )}

          {activeMode === 'orf' && (
            <div className="mock-field-group">
              <label htmlFor="orf-len-input" className="mock-label">Minimum ORF Length (bp)</label>
              <input
                id="orf-len-input"
                type="number"
                className="mock-textarea"
                style={{ height: '42px', padding: '8px 12px' }}
                value={minOrfLen}
                onChange={(e) => setMinOrfLen(e.target.value)}
              />
            </div>
          )}

          {validationError && <p style={{ color: 'var(--red)', fontSize: '13px', marginTop: '10px' }}>{validationError}</p>}
          {performanceWarning && <p style={{ color: 'var(--amber)', fontSize: '12px', marginTop: '10px' }}>{performanceWarning}</p>}

          <div style={{ fontSize: '12px', color: 'var(--text3)', borderTop: '1px solid var(--border)', paddingTop: '10px', marginTop: '10px' }}>
            <strong>Detected Input Type:</strong> <span style={{ color: 'var(--accent-d)', fontWeight: 'bold' }}>{seqType}</span>
          </div>
        </div>

        {/* Results Panel */}
        <div className="tool-pane-card">
          <div className="tool-pane-title">Conversion Outputs</div>

          {cleanedSeq && !validationError ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* 1. Simple Conversions / Transcribe / Translate Output */}
              {(activeMode === 'transcribe' || activeMode === 'revcomp' || activeMode === 'translate') && (
                <>
                  <div className="output-sequence-box">
                    {simpleResult}
                  </div>
                  <div className="mock-actions-row">
                    <CopyButton text={simpleResult} />
                    <ExportButton data={getFastaOutput()} filename="sequence_conversion.fasta" format="fasta" />
                  </div>
                </>
              )}

              {/* 2. Six-Frame Translation Alignment */}
              {activeMode === 'sixframe' && renderSixFrameGrid()}

              {/* 3. ORF Finder Table */}
              {activeMode === 'orf' && (
                <>
                  {orfResults.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div className="orfs-table-wrapper">
                        <table className="orfs-table">
                          <thead>
                            <tr>
                              <th>ID</th>
                              <th>Frame</th>
                              <th>Start</th>
                              <th>End</th>
                              <th>Length (bp)</th>
                              <th>Peptide Preview</th>
                            </tr>
                          </thead>
                          <tbody>
                            {orfResults.map((orf, idx) => (
                              <tr key={idx} style={{ borderLeft: idx === 0 ? '4px solid var(--accent)' : 'none' }}>
                                <td><b>{idx + 1}</b></td>
                                <td>
                                  <span className={`frame-badge ${orf.frame > 0 ? 'plus' : 'minus'}`}>
                                    {orf.frame > 0 ? `+${orf.frame}` : orf.frame}
                                  </span>
                                </td>
                                <td>{orf.start}</td>
                                <td>{orf.end}</td>
                                <td>{orf.lengthBp} bp ({orf.lengthAa} aa)</td>
                                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                                  {orf.peptidePreview}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="mock-actions-row">
                        <CopyButton text={orfResults.map((o, idx) => `ORF ${idx+1} [Frame ${o.frame}, ${o.start}-${o.end}]: ${o.peptideFull}`).join('\n')} />
                        <ExportButton data={getOrfCsvOutput()} filename="orf_results_profile.csv" format="csv" />
                      </div>
                    </div>
                  ) : (
                    <div className="mock-empty-results">
                      <p>No open reading frames found exceeding {minOrfLen}bp.</p>
                    </div>
                  )}
                </>
              )}

            </div>
          ) : (
            <div className="mock-empty-results">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '48px', height: '48px', color: 'var(--text4)', marginBottom: '12px' }}>
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.2 8H16.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text2)', marginBottom: '4px' }}>No Sequence Processed</p>
              <p style={{ fontSize: '13px', lineHeight: 1.4 }}>Input a nucleic acid or peptide sequence to execute transcriptions, alignments, or translate open reading frames.</p>
            </div>
          )}
        </div>

      </div>
    </ToolShell>
  );
}
