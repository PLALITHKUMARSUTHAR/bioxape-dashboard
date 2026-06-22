import React, { useState } from 'react';
import ToolShell, { CopyButton, ExportButton } from '../../components/tools/ToolShell';
import { cleanSequence, detectSequenceType, reverseComplement, transcribe, translate, STANDARD_GENETIC_CODE } from '../../utils/bioutils';

export default function SeqConvert() {
  const [activeStep, setActiveStep] = useState(1);
  const [rawInput, setRawInput] = useState('');
  
  const [seqType, setSeqType] = useState('DNA');
  const [activeMode, setActiveMode] = useState('transcribe'); // transcribe, revcomp, translate, sixframe, orf
  
  // Translation settings
  const [selectedFrame, setSelectedFrame] = useState(1);
  const [readThroughStop, setReadThroughStop] = useState(false);

  // ORF settings
  const [minOrfLen, setMinOrfLen] = useState(100);

  // Results
  const [cleanedSeq, setCleanedSeq] = useState('');
  const [simpleResult, setSimpleResult] = useState('');
  const [orfResults, setOrfResults] = useState([]);
  const [validationError, setValidationError] = useState('');
  const [performanceWarning, setPerformanceWarning] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasResults, setHasResults] = useState(false);

  const steps = [
    { number: 1, title: 'Inputs & Settings' },
    { number: 2, title: 'Conversion Outputs' }
  ];

  const runSequenceConversion = () => {
    setValidationError('');
    setPerformanceWarning('');
    
    const clean = cleanSequence(rawInput);
    if (!clean) {
      setValidationError('Please enter a sequence.');
      return;
    }

    const type = detectSequenceType(clean);
    setSeqType(type);

    if (clean.length > 5000) {
      setPerformanceWarning('Large sequence. Computations will run but visualization will be capped to prevent DOM lag.');
    }

    const invalidDnaRna = clean.replace(/[ACGUTN]/g, '');
    const invalidProtein = clean.replace(/[ACDEFGHIKLMNPQRSTVWY]/g, '');

    if (type === 'PROTEIN' && invalidProtein.length > 0) {
      setValidationError(`Contains invalid amino acids: ${invalidProtein.substring(0, 5)}...`);
      return;
    } else if (type !== 'PROTEIN' && invalidDnaRna.length > 0) {
      setValidationError(`Contains invalid nucleotides: ${invalidDnaRna.substring(0, 5)}...`);
      return;
    }

    if (activeMode !== 'transcribe' && activeMode !== 'revcomp' && type === 'PROTEIN') {
      setValidationError('Translation, ORF finder, and Six-frame are only available for DNA/RNA sequences.');
      return;
    }

    setCleanedSeq(clean);
    setIsAnalyzing(true);

    setTimeout(() => {
      setIsAnalyzing(false);

      if (activeMode === 'transcribe') {
        if (type === 'RNA') {
          setSimpleResult(clean.replace(/U/g, 'T'));
        } else {
          setSimpleResult(transcribe(clean));
        }
      } else if (activeMode === 'revcomp') {
        setSimpleResult(reverseComplement(clean));
      } else if (activeMode === 'translate') {
        const translated = translate(clean, selectedFrame, readThroughStop);
        const remainder = (clean.length - (Math.abs(selectedFrame) - 1)) % 3;
        const note = remainder > 0 ? `\n\n[Note: ${remainder} incomplete trailing base(s) at 3' end ignored]` : '';
        setSimpleResult(translated + note);
      } else if (activeMode === 'sixframe') {
        // Handled directly inside render
      } else if (activeMode === 'orf') {
        const foundOrfs = [];
        const minLengthBp = parseInt(minOrfLen) || 100;

        for (let f = 1; f <= 3; f++) {
          scanOrfsInFrame(clean, f, minLengthBp, foundOrfs);
        }
        
        const revComp = reverseComplement(clean);
        for (let f = 1; f <= 3; f++) {
          scanOrfsInFrame(revComp, -f, minLengthBp, foundOrfs, true);
        }

        foundOrfs.sort((a, b) => b.lengthBp - a.lengthBp);
        setOrfResults(foundOrfs);
      }

      setHasResults(true);
      setActiveStep(2);
    }, 800);
  };

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
          const peptide = translate(seqStr.substring(startIdx, i + 3), 1, true);
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

  const renderSixFrameGrid = () => {
    if (!cleanedSeq || seqType === 'PROTEIN') return null;

    const capLen = 600;
    const isCapped = cleanedSeq.length > capLen;
    const workingSeq = cleanedSeq.substring(0, capLen);
    const revSeq = reverseComplement(workingSeq);

    const getAlignedAaRow = (seq, frame) => {
      const offset = Math.abs(frame) - 1;
      const row = Array(seq.length).fill('');
      
      for (let i = offset; i < seq.length - 2; i += 3) {
        const codon = seq.substring(i, i + 3).replace(/U/g, 'T');
        const aaInfo = STANDARD_GENETIC_CODE[codon];
        const aa = aaInfo ? aaInfo.symbol : 'X';
        
        row[i] = aa;
        row[i+1] = '';
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
        <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', backgroundColor: 'var(--white)', overflowX: 'auto' }}>
          <div style={{ fontSize: '13.5px', fontWeight: 'bold', marginBottom: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '6px', color: 'var(--text1)' }}>
            Forward Strand (5' → 3') Frames
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: '12.5px', whiteSpace: 'nowrap' }}>
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
            <div style={{ fontWeight: 'bold', color: 'var(--accent-d)', borderTop: '1px solid var(--border)', paddingTop: '4px' }}>DNA</div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '4px', letterSpacing: '0.22em', color: 'var(--text1)' }}>
              {workingSeq}
            </div>
          </div>
        </div>

        <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', backgroundColor: 'var(--white)', overflowX: 'auto' }}>
          <div style={{ fontSize: '13.5px', fontWeight: 'bold', marginBottom: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '6px', color: 'var(--text1)' }}>
            Reverse Complement Strand (5' → 3') Frames
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: '12.5px', whiteSpace: 'nowrap' }}>
            <div style={{ fontWeight: 'bold', color: 'var(--accent-d)' }}>Rev-Comp</div>
            <div style={{ letterSpacing: '0.22em', color: 'var(--text2)' }}>
              {revSeq}
            </div>
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
          <p style={{ fontSize: '11px', color: 'var(--text3)', fontStyle: 'italic', textAlign: 'center' }}>
            *Visual alignment cap at 600bp to avoid performance issues. Use exports for full length files.
          </p>
        )}
      </div>
    );
  };

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
        <span key={key} style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--red)', fontWeight: 'bold', padding: '1px 2px', borderRadius: '3px' }}>
          *
        </span>
      );
    }
    return <span key={key}>{aa}</span>;
  };

  const loadSample = () => {
    setRawInput('ATGGCCAGCATGCTGCAGCTGAGCGTGTTCGCCGTGCTGGCCGTGGCCCTGGCCGTGGACCAGTCGTAG');
    setValidationError('');
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

  const resetAnalysis = () => {
    setSimpleResult('');
    setOrfResults([]);
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

  const cleanSeqText = cleanSequence(rawInput);
  const detectedType = cleanSeqText ? detectSequenceType(cleanSeqText) : '';

  return (
    <ToolShell slug="seqconvert">
      {renderStepTracker()}

      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        {/* Step 1: Sequence Input & Settings */}
        {activeStep === 1 && (
          <div className="bx-step-section">
            <div className="bx-step-header">
              <span className="bx-step-badge">Step 1</span>
              <h3 className="bx-step-title">Enter Sequence & Choose Options</h3>
            </div>

            <div className="bx-field-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="seq-input" className="bx-label">Raw Nucleotide or Peptide Sequence</label>
                <button type="button" className="bx-btn-sample" onClick={loadSample}>Load DNA Sample</button>
              </div>
              <textarea
                id="seq-input"
                className="bx-textarea"
                style={{ height: '140px' }}
                placeholder="Paste FASTA or raw character sequence here..."
                value={rawInput}
                onChange={(e) => {
                  setRawInput(e.target.value.toUpperCase());
                  setValidationError('');
                }}
              />
              {validationError && <p style={{ color: 'var(--red)', fontSize: '12px', marginTop: '4px' }}>{validationError}</p>}
            </div>

            {detectedType && (
              <div style={{ fontSize: '12.5px', color: 'var(--text3)', marginBottom: '16px', marginTop: '-8px' }}>
                <strong>Detected Sequence Type:</strong> <span style={{ color: 'var(--accent-d)', fontWeight: 'bold' }}>{detectedType}</span>
              </div>
            )}

            <div className="bx-field-group">
              <label htmlFor="convert-mode-select" className="bx-label">Conversion Mode</label>
              <select
                id="convert-mode-select"
                className="bx-select"
                value={activeMode}
                onChange={(e) => setActiveMode(e.target.value)}
              >
                <option value="transcribe">Transcribe (DNA ↔ RNA)</option>
                <option value="revcomp">Reverse Complement</option>
                <option value="translate" disabled={detectedType === 'PROTEIN'}>Translate (Single Frame)</option>
                <option value="sixframe" disabled={detectedType === 'PROTEIN'}>Six-Frame Alignment Visualizer</option>
                <option value="orf" disabled={detectedType === 'PROTEIN'}>ORF Finder (Open Reading Frame)</option>
              </select>
            </div>

            {activeMode === 'translate' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px', marginBottom: '10px' }}>
                <div className="bx-field-group">
                  <label htmlFor="frame-select" className="bx-label">Reading Frame</label>
                  <select
                    id="frame-select"
                    className="bx-select"
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
                <div className="bx-field-group" style={{ justifyContent: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', color: 'var(--text2)', marginTop: '24px' }}>
                    <input
                      type="checkbox"
                      checked={readThroughStop}
                      onChange={(e) => setReadThroughStop(e.target.checked)}
                    />
                    Read through stops (*)
                  </label>
                </div>
              </div>
            )}

            {activeMode === 'orf' && (
              <div className="bx-field-group" style={{ marginTop: '10px', marginBottom: '10px' }}>
                <label htmlFor="orf-len-input" className="bx-label">Minimum ORF Length (bp)</label>
                <input
                  id="orf-len-input"
                  type="number"
                  className="bx-input"
                  value={minOrfLen}
                  onChange={(e) => setMinOrfLen(parseInt(e.target.value) || 0)}
                />
              </div>
            )}

            {performanceWarning && <p style={{ color: 'var(--amber)', fontSize: '12.5px', marginTop: '8px' }}>{performanceWarning}</p>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                type="button"
                className="bx-btn-primary"
                style={{ width: '100%', padding: '12px' }}
                onClick={runSequenceConversion}
                disabled={isAnalyzing || !rawInput.trim()}
              >
                {isAnalyzing ? (
                  <>
                    <svg style={{ animation: 'spin 1.2s infinite linear', width: '16px', height: '16px', marginRight: '6px', stroke: 'currentColor', fill: 'none' }} viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" strokeWidth="2.5"/>
                    </svg>
                    Converting Sequence...
                  </>
                ) : (
                  'Run Sequence Conversion'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Outputs */}
        {activeStep === 2 && hasResults && (
          <div className="bx-step-section" style={{ alignItems: 'stretch' }}>
            <div className="bx-step-header">
              <span className="bx-step-badge">Step 2</span>
              <h3 className="bx-step-title">Conversion Outputs</h3>
            </div>

            {/* simple transcription/translations */}
            {(activeMode === 'transcribe' || activeMode === 'revcomp' || activeMode === 'translate') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ border: '1px solid var(--border)', backgroundColor: 'var(--off)', borderRadius: '8px', padding: '12px', fontFamily: 'var(--font-mono)', fontSize: '13px', lineHeight: '1.6', maxHeight: '200px', overflowY: 'auto', wordBreak: 'break-all' }}>
                  {simpleResult}
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <CopyButton text={simpleResult} />
                  <ExportButton data={getFastaOutput()} filename="sequence_conversion.fasta" format="fasta" />
                </div>
              </div>
            )}

            {/* six frame alignment */}
            {activeMode === 'sixframe' && renderSixFrameGrid()}

            {/* ORF results */}
            {activeMode === 'orf' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {orfResults.length > 0 ? (
                  <>
                    <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '6px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                        <thead>
                          <tr style={{ backgroundColor: 'var(--off)', borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '8px', textAlign: 'center' }}>ID</th>
                            <th style={{ padding: '8px', textAlign: 'center' }}>Frame</th>
                            <th style={{ padding: '8px', textAlign: 'center' }}>Span</th>
                            <th style={{ padding: '8px', textAlign: 'center' }}>Length (bp)</th>
                            <th style={{ padding: '8px' }}>Peptide Preview</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orfResults.map((orf, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '8px', textAlign: 'center' }}><b>{idx + 1}</b></td>
                              <td style={{ padding: '8px', textAlign: 'center' }}>
                                <span className={`frame-badge ${orf.frame > 0 ? 'plus' : 'minus'}`}>
                                  {orf.frame > 0 ? `+${orf.frame}` : orf.frame}
                                </span>
                              </td>
                              <td style={{ padding: '8px', textAlign: 'center' }}>{orf.start} - {orf.end}</td>
                              <td style={{ padding: '8px', textAlign: 'center' }}>{orf.lengthBp} bp ({orf.lengthAa} aa)</td>
                              <td style={{ padding: '8px', fontFamily: 'var(--font-mono)', fontSize: '11.5px' }}>{orf.peptidePreview}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                      <CopyButton text={orfResults.map((o, idx) => `ORF ${idx+1} [Frame ${o.frame}, ${o.start}-${o.end}]: ${o.peptideFull}`).join('\n')} />
                      <ExportButton data={getOrfCsvOutput()} filename="orf_results_profile.csv" format="csv" />
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '24px', border: '1.5px dashed var(--border)', borderRadius: '8px', color: 'var(--text3)' }}>
                    No open reading frames found exceeding {minOrfLen}bp.
                  </div>
                )}
              </div>
            )}

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
