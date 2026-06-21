import React, { useState } from 'react';
import ToolShell, { CopyButton, ExportButton } from '../../components/tools/ToolShell';
import { cleanSequence, reverseComplement, NN_THERMODYNAMICS } from '../../utils/bioutils';

export default function PrimerCheck() {
  const [activeStep, setActiveStep] = useState(1);
  const [fwdInput, setFwdInput] = useState('');
  const [revInput, setRevInput] = useState('');
  const [probeInput, setProbeInput] = useState('');
  const [targetAnnealTemp, setTargetAnnealTemp] = useState('');

  const [results, setResults] = useState(null);
  const [validationError, setValidationError] = useState('');
  const [overallStatus, setOverallStatus] = useState('empty');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const steps = [
    { number: 1, title: 'Oligo Inputs' },
    { number: 2, title: 'Reaction settings' },
    { number: 3, title: 'Run Diagnostics' },
    { number: 4, title: 'Checklist Report' }
  ];

  const calculateTmNN = (seq) => {
    const clean = cleanSequence(seq);
    if (!clean || clean.length < 4) return 0;

    let dH = 0;
    let dS = 0;
    const length = clean.length;

    for (let i = 0; i < length - 1; i++) {
      const step = clean.substring(i, i + 2);
      const params = NN_THERMODYNAMICS[step];
      if (params) {
        dH += params.dh;
        dS += params.ds;
      }
    }

    const first = clean[0];
    const last = clean[length - 1];
    if (first === 'G' || first === 'C') {
      dH += NN_THERMODYNAMICS.init_GC.dh;
      dS += NN_THERMODYNAMICS.init_GC.ds;
    } else {
      dH += NN_THERMODYNAMICS.init_AT.dh;
      dS += NN_THERMODYNAMICS.init_AT.ds;
    }
    if (last === 'G' || last === 'C') {
      dH += NN_THERMODYNAMICS.init_GC.dh;
      dS += NN_THERMODYNAMICS.init_GC.ds;
    } else {
      dH += NN_THERMODYNAMICS.init_AT.dh;
      dS += NN_THERMODYNAMICS.init_AT.ds;
    }

    if (clean === reverseComplement(clean)) {
      dH += NN_THERMODYNAMICS.symmetry.dh;
      dS += NN_THERMODYNAMICS.symmetry.ds;
    }

    const R = 1.987;
    const Ct = 250 * 1e-9;
    const rawTm = (dH * 1000) / (dS + R * Math.log(Ct / 4)) - 273.15;

    const saltM = (50 + 120 * Math.sqrt(1.5)) / 1000;
    const lnSalt = Math.log(saltM);
    const gcFrac = clean.replace(/[^GC]/g, '').length / length;
    const Tm_kelvin = rawTm + 273.15;
    const correctedTm = 1 / (1 / Tm_kelvin + (4.29 * gcFrac - 3.95) * 1e-5 * lnSalt + 9.4e-6 * lnSalt * lnSalt) - 273.15;

    return correctedTm;
  };

  const isComplementary = (b1, b2) => {
    const pairs = { A: 'T', T: 'A', G: 'C', C: 'G', U: 'A' };
    return pairs[b1] === b2;
  };

  const findDimerization = (seq1, seq2, name1, name2) => {
    const s1 = cleanSequence(seq1);
    const s2 = cleanSequence(seq2);
    if (!s1 || !s2) return null;

    let maxContig = 0;
    let bestOffset = 0;
    let bestTotal = 0;

    for (let offset = -(s2.length - 1); offset < s1.length; offset++) {
      let currentContig = 0;
      let tempContig = 0;
      let totalMatches = 0;

      for (let j = 0; j < s2.length; j++) {
        const i = offset + j;
        if (i >= 0 && i < s1.length) {
          const base1 = s1[i];
          const base2 = s2[s2.length - 1 - j];
          if (isComplementary(base1, base2)) {
            tempContig++;
            totalMatches++;
            if (tempContig > currentContig) {
              currentContig = tempContig;
            }
          } else {
            tempContig = 0;
          }
        }
      }

      if (currentContig > maxContig || (currentContig === maxContig && totalMatches > bestTotal)) {
        maxContig = currentContig;
        bestOffset = offset;
        bestTotal = totalMatches;
      }
    }

    let is3PrimeRisk = false;
    const s1_3p_start = s1.length - 4;
    const s2_3p_start = s2.length - 4;

    for (let j = 0; j < s2.length; j++) {
      const i = bestOffset + j;
      if (i >= 0 && i < s1.length) {
        if (isComplementary(s1[i], s2[s2.length - 1 - j])) {
          if (i >= s1_3p_start || (s2.length - 1 - j) >= s2_3p_start) {
            if (maxContig >= 3) {
              is3PrimeRisk = true;
            }
          }
        }
      }
    }

    let risk = 'Low Risk';
    if (maxContig >= 4 && is3PrimeRisk) {
      risk = "High Risk (3' Dimer)";
    } else if (maxContig >= 4) {
      risk = 'Moderate Risk (Internal)';
    }

    let topStr = `5'-${s1}-3'`;
    let midStr = '   ';
    let btmStr = '';

    const padding = Math.abs(bestOffset);
    if (bestOffset >= 0) {
      btmStr = '   ' + ' '.repeat(bestOffset) + `3'-${s2.split('').reverse().join('')}-5'`;
      midStr = '   ' + ' '.repeat(bestOffset) + '   ';
      for (let j = 0; j < s2.length; j++) {
        const i = bestOffset + j;
        if (i >= 0 && i < s1.length) {
          if (isComplementary(s1[i], s2[s2.length - 1 - j])) {
            midStr += '|';
          } else {
            midStr += ' ';
          }
        }
      }
    } else {
      topStr = '   ' + ' '.repeat(padding) + `5'-${s1}-3'`;
      btmStr = `3'-${s2.split('').reverse().join('')}-5'`;
      midStr = '   ';
      for (let j = 0; j < s2.length; j++) {
        const i = bestOffset + j;
        if (i >= 0 && i < s1.length) {
          if (isComplementary(s1[i], s2[s2.length - 1 - j])) {
            midStr += '|';
          } else {
            midStr += ' ';
          }
        } else if (j < padding) {
          midStr += ' ';
        }
      }
    }

    return {
      names: `${name1} / ${name2}`,
      maxContig,
      bestTotal,
      risk,
      topStr,
      midStr,
      btmStr,
      bestOffset
    };
  };

  const findHairpin = (seq, name) => {
    const s = cleanSequence(seq);
    if (!s || s.length < 10) return { found: false };

    let bestStem = '';
    let bestLoop = '';
    let bestStemLen = 0;

    for (let i = 0; i < s.length - 8; i++) {
      for (let len = 3; len <= 8; len++) {
        if (i + len * 2 + 3 > s.length) continue;
        
        for (let loopLen = 3; loopLen <= 12; loopLen++) {
          const j = i + len + loopLen;
          if (j + len > s.length) continue;

          const stem1 = s.substring(i, i + len);
          const stem2 = s.substring(j, j + len);
          const revComp2 = reverseComplement(stem2);

          if (stem1 === revComp2) {
            if (len > bestStemLen) {
              bestStemLen = len;
              bestStem = stem1;
              bestLoop = s.substring(i + len, j);
            }
          }
        }
      }
    }

    if (bestStemLen >= 3) {
      return {
        found: true,
        risk: bestStemLen >= 4 ? 'High Risk' : 'Moderate Risk',
        stem: bestStem,
        loop: bestLoop,
        msg: `${name} hairpin stem: ${bestStem} (loop: ${bestLoop.length} nt)`
      };
    }

    return { found: false };
  };

  const handleNextFromStep1 = () => {
    const fwd = cleanSequence(fwdInput);
    const rev = cleanSequence(revInput);

    if (!fwd || !rev) {
      setValidationError('Please enter both Forward and Reverse primer sequences.');
      return;
    }

    const invalidFwd = fwd.replace(/[ACGUTN]/g, '');
    const invalidRev = rev.replace(/[ACGUTN]/g, '');
    if (invalidFwd.length > 0 || invalidRev.length > 0) {
      setValidationError('Primers contain invalid nucleotides. Use standard A/C/G/T/U.');
      return;
    }

    setValidationError('');
    setActiveStep(2);
  };

  const runDiagnostics = () => {
    const fwd = cleanSequence(fwdInput);
    const rev = cleanSequence(revInput);
    const probe = cleanSequence(probeInput);

    if (!fwd || !rev) {
      setValidationError('Please enter Forward and Reverse primer sequences.');
      setActiveStep(1);
      return;
    }

    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);

      const fwdTm = calculateTmNN(fwd);
      const revTm = calculateTmNN(rev);
      const probeTm = probe ? calculateTmNN(probe) : 0;

      const fwdGc = (fwd.replace(/[^GC]/g, '').length / fwd.length) * 100;
      const revGc = (rev.replace(/[^GC]/g, '').length / rev.length) * 100;
      const probeGc = probe ? (probe.replace(/[^GC]/g, '').length / probe.length) * 100 : 0;

      const fwdSelf = findDimerization(fwd, fwd, 'Forward', 'Forward');
      const revSelf = findDimerization(rev, rev, 'Reverse', 'Reverse');
      const probeSelf = probe ? findDimerization(probe, probe, 'Probe', 'Probe') : null;

      const fwdRevHetero = findDimerization(fwd, rev, 'Forward', 'Reverse');
      const fwdProbeHetero = probe ? findDimerization(fwd, probe, 'Forward', 'Probe') : null;
      const revProbeHetero = probe ? findDimerization(rev, probe, 'Reverse', 'Probe') : null;

      const fwdHairpin = findHairpin(fwd, 'Forward');
      const revHairpin = findHairpin(rev, 'Reverse');
      const probeHairpin = probe ? findHairpin(probe, 'Probe') : { found: false };

      const fwdLast5 = fwd.substring(fwd.length - 5);
      const fwdGcCount = fwdLast5.replace(/[^GC]/g, '').length;
      let fwdClampStatus = 'pass';
      let fwdClampMsg = `${fwdGcCount} G/C bases in last 5 bases.`;
      if (fwdGcCount === 0) {
        fwdClampStatus = 'warn';
        fwdClampMsg = 'Weak clamp: 0 G/C in last 5 bases (unstable 3\' priming).';
      } else if (fwdGcCount > 3) {
        fwdClampStatus = 'warn';
        fwdClampMsg = `Sticky clamp: ${fwdGcCount} G/C in last 5 bases (high mispriming risk).`;
      }

      const revLast5 = rev.substring(rev.length - 5);
      const revGcCount = revLast5.replace(/[^GC]/g, '').length;
      let revClampStatus = 'pass';
      let revClampMsg = `${revGcCount} G/C bases in last 5 bases.`;
      if (revGcCount === 0) {
        revClampStatus = 'warn';
        revClampMsg = 'Weak clamp: 0 G/C in last 5 bases (unstable 3\' priming).';
      } else if (revGcCount > 3) {
        revClampStatus = 'warn';
        revClampMsg = `Sticky clamp: ${revGcCount} G/C in last 5 bases (high mispriming risk).`;
      }

      const tmDelta = Math.abs(fwdTm - revTm);
      let tmDeltaStatus = 'pass';
      let tmDeltaMsg = `Tm Difference is ${tmDelta.toFixed(1)}°C (ideal <= 5°C).`;
      if (tmDelta > 5) {
        tmDeltaStatus = 'warn';
        tmDeltaMsg = `High delta Tm: ${tmDelta.toFixed(1)}°C difference can cause unbalanced amplification.`;
      }

      let annealWarning = '';
      const annealNum = parseFloat(targetAnnealTemp);
      if (!isNaN(annealNum) && annealNum > 0) {
        const idealAnneal = Math.min(fwdTm, revTm) - 5;
        if (Math.abs(annealNum - idealAnneal) > 3) {
          annealWarning = `Annealing temperature (${annealNum}°C) deviates from ideal (${idealAnneal.toFixed(1)}°C, 5°C below lowest Tm).`;
        }
      }

      const hasWarnings = 
        fwdSelf?.risk.startsWith('High') || revSelf?.risk.startsWith('High') ||
        fwdRevHetero?.risk.startsWith('High') ||
        fwdHairpin.found || revHairpin.found ||
        fwdClampStatus === 'warn' || revClampStatus === 'warn' ||
        tmDeltaStatus === 'warn' || (probe && (probeSelf?.risk.startsWith('High') || fwdProbeHetero?.risk.startsWith('High') || revProbeHetero?.risk.startsWith('High') || probeHairpin.found));

      setOverallStatus(hasWarnings ? 'warn' : 'pass');

      setResults({
        fwd: { seq: fwd, len: fwd.length, gc: fwdGc.toFixed(1), tm: fwdTm.toFixed(1) },
        rev: { seq: rev, len: rev.length, gc: revGc.toFixed(1), tm: revTm.toFixed(1) },
        probe: probe ? { seq: probe, len: probe.length, gc: probeGc.toFixed(1), tm: probeTm.toFixed(1) } : null,
        checks: {
          fwdSelf,
          revSelf,
          probeSelf,
          fwdRevHetero,
          fwdProbeHetero,
          revProbeHetero,
          fwdHairpin,
          revHairpin,
          probeHairpin,
          fwdClamp: { status: fwdClampStatus, msg: fwdClampMsg },
          revClamp: { status: revClampStatus, msg: revClampMsg },
          tmDelta: { status: tmDeltaStatus, msg: tmDeltaMsg, val: tmDelta.toFixed(1) },
          annealWarning
        }
      });

      setActiveStep(4);
    }, 850);
  };

  const loadSample = (withProbe = false) => {
    setFwdInput('CCTGGAGATCGTGGAGAACA');
    setRevInput('TCGTGGTACTTGGGGTTGAT');
    if (withProbe) {
      setProbeInput('AAGCGTGCGATCGATCGATC');
    } else {
      setProbeInput('');
    }
    setValidationError('');
  };

  const getCopyText = () => {
    if (!results) return '';
    const dateStr = new Date().toISOString().split('T')[0];
    const checks = results.checks;
    return `PrimerCheck Lab Summary - ${dateStr}
---------------------------------------------
Forward Primer: ${results.fwd.seq} (Tm: ${results.fwd.tm}°C, GC: ${results.fwd.gc}%)
Reverse Primer: ${results.rev.seq} (Tm: ${results.rev.tm}°C, GC: ${results.rev.gc}%)
${results.probe ? `Probe: ${results.probe.seq} (Tm: ${results.probe.tm}°C, GC: ${results.probe.gc}%)\n` : ''}
Tm delta: ${checks.tmDelta.val}°C

Self-Dimerize Risk: Fwd: ${checks.fwdSelf.risk}, Rev: ${checks.revSelf.risk}
Hetero-Dimerize Risk (Fwd/Rev): ${checks.fwdRevHetero.risk}
Hairpins: Fwd: ${checks.fwdHairpin.found ? 'Yes' : 'No'}, Rev: ${checks.revHairpin.found ? 'Yes' : 'No'}`;
  };

  const getCsvOutput = () => {
    if (!results) return '';
    let csv = 'CheckName,Status,Details\n';
    const c = results.checks;
    csv += `Fwd Self-Dimer,${c.fwdSelf.risk},Max complementary run: ${c.fwdSelf.maxContig}bp\n`;
    csv += `Rev Self-Dimer,${c.revSelf.risk},Max complementary run: ${c.revSelf.maxContig}bp\n`;
    csv += `Fwd/Rev Hetero-Dimer,${c.fwdRevHetero.risk},Max complementarity: ${c.fwdRevHetero.maxContig}bp\n`;
    csv += `Fwd Hairpin,${c.fwdHairpin.found ? 'Warn' : 'Pass'},${c.fwdHairpin.found ? c.fwdHairpin.msg : 'None'}\n`;
    csv += `Rev Hairpin,${c.revHairpin.found ? 'Warn' : 'Pass'},${c.revHairpin.found ? c.revHairpin.msg : 'None'}\n`;
    csv += `Fwd 3' GC Clamp,${c.fwdClamp.status},${c.fwdClamp.msg}\n`;
    csv += `Rev 3' GC Clamp,${c.revClamp.status},${c.revClamp.msg}\n`;
    csv += `Tm Compatibility,${c.tmDelta.status},${c.tmDelta.msg}\n`;
    return csv;
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
    <ToolShell slug="primercheck">
      {renderStepTracker()}

      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        {/* Step 1: Oligo Inputs */}
        {activeStep === 1 && (
          <div className="bx-step-section">
            <div className="bx-step-header">
              <span className="bx-step-badge">Step 1</span>
              <h3 className="bx-step-title">Enter Oligo Sequences</h3>
            </div>

            <div className="bx-field-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="fwd-primer-input" className="bx-label">Forward Primer (5' → 3')</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="bx-btn-sample" onClick={() => loadSample(false)}>Load Standard PCR Pair</button>
                  <span style={{ color: 'var(--border2)' }}>|</span>
                  <button type="button" className="bx-btn-sample" onClick={() => loadSample(true)}>Load qPCR Probe Set</button>
                </div>
              </div>
              <input
                id="fwd-primer-input"
                type="text"
                className="bx-input"
                placeholder="e.g. CCTGGAGATCGTGGAGAACA"
                value={fwdInput}
                onChange={(e) => {
                  setFwdInput(e.target.value.toUpperCase());
                  setValidationError('');
                }}
              />
            </div>

            <div className="bx-field-group">
              <label htmlFor="rev-primer-input" className="bx-label">Reverse Primer (5' → 3')</label>
              <input
                id="rev-primer-input"
                type="text"
                className="bx-input"
                placeholder="e.g. TCGTGGTACTTGGGGTTGAT"
                value={revInput}
                onChange={(e) => {
                  setRevInput(e.target.value.toUpperCase());
                  setValidationError('');
                }}
              />
            </div>

            <div className="bx-field-group">
              <label htmlFor="probe-primer-input" className="bx-label">qPCR Probe (Optional, 5' → 3')</label>
              <input
                id="probe-primer-input"
                type="text"
                className="bx-input"
                placeholder="e.g. AAGCGTGCGATCGATCGATC"
                value={probeInput}
                onChange={(e) => {
                  setProbeInput(e.target.value.toUpperCase());
                  setValidationError('');
                }}
              />
              {validationError && <p style={{ color: 'var(--red)', fontSize: '12px', marginTop: '4px' }}>{validationError}</p>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button
                type="button"
                className="bx-btn-primary"
                onClick={handleNextFromStep1}
                disabled={!fwdInput.trim() || !revInput.trim()}
              >
                Next: Configure Reaction Settings →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Settings */}
        {activeStep === 2 && (
          <div className="bx-step-section">
            <div className="bx-step-header">
              <span className="bx-step-badge">Step 2</span>
              <h3 className="bx-step-title">Configure Reaction Parameters</h3>
            </div>

            <div className="bx-field-group">
              <label htmlFor="anneal-temp-input" className="bx-label">Target Annealing Temperature (°C, Optional)</label>
              <input
                id="anneal-temp-input"
                type="number"
                className="bx-input"
                placeholder="e.g. 55"
                value={targetAnnealTemp}
                onChange={(e) => setTargetAnnealTemp(e.target.value)}
              />
              <p style={{ fontSize: '12px', color: 'var(--text3)', fontStyle: 'italic', marginTop: '4px' }}>
                If specified, the diagnostics report will flag any deviation from the ideal PCR annealing thermal profile.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
              <button type="button" className="bx-tool-btn" onClick={() => setActiveStep(1)}>← Back</button>
              <button type="button" className="bx-btn-primary" onClick={() => setActiveStep(3)}>Next: Run Analysis →</button>
            </div>
          </div>
        )}

        {/* Step 3: Run Diagnostics */}
        {activeStep === 3 && (
          <div className="bx-step-section" style={{ textAlign: 'center', padding: '30px 20px' }}>
            <div className="bx-step-header" style={{ justifyContent: 'center' }}>
              <span className="bx-step-badge">Step 3</span>
              <h3 className="bx-step-title">Execute Primer Diagnostics</h3>
            </div>

            <p style={{ fontSize: '14px', color: 'var(--text2)', margin: '12px 0 20px' }}>
              Scanning hybridization structures for primer-dimers, hairpins, GC clamp stability, and Tm compatibility.
            </p>

            <button
              type="button"
              className="bx-btn-primary"
              style={{ width: '100%', padding: '12px' }}
              onClick={runDiagnostics}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <svg style={{ animation: 'spin 1.2s infinite linear', width: '16px', height: '16px', marginRight: '6px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12"/></svg>
                  Simulating Hybridization Thermals...
                </>
              ) : (
                'Run Primer Diagnostics & Checks'
              )}
            </button>

            <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '20px' }}>
              <button type="button" className="bx-tool-btn" onClick={() => setActiveStep(2)} disabled={isAnalyzing}>← Back</button>
            </div>
          </div>
        )}

        {/* Step 4: Results */}
        {activeStep === 4 && results && (
          <div className="bx-step-section" style={{ alignItems: 'stretch' }}>
            <div className="bx-step-header">
              <span className="bx-step-badge">Step 4</span>
              <h3 className="bx-step-title">Primer Diagnostics Report</h3>
            </div>

            {/* Overall status */}
            {overallStatus === 'pass' ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: 'var(--g50)', border: '1px solid var(--border2)', padding: '12px', borderRadius: '6px', fontSize: '13.5px', color: 'var(--accent-d)', fontWeight: 'bold' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '18px', height: '18px', flexShrink: 0 }}><polyline points="20 6 9 17 5 12"/></svg>
                <span>PCR Primer Pair OK: No dimerization or Tm mismatches found.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid var(--amber)', padding: '12px', borderRadius: '6px', fontSize: '13.5px', color: 'var(--amber-d)', fontWeight: 'bold' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '18px', height: '18px', flexShrink: 0 }}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <span>Potential Design Warnings. Check GC clamp strengths or dimer maps below.</span>
              </div>
            )}

            {/* Individual summaries */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ borderLeft: '4px solid var(--accent)', padding: '8px 12px', background: 'var(--off)', borderRadius: '0 6px 6px 0' }}>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', color: 'var(--text3)' }}>Forward Primer</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', wordBreak: 'break-all', color: 'var(--text1)' }}>{results.fwd.seq}</div>
                <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '4px' }}>
                  <b>Tm:</b> {results.fwd.tm}°C &bull; <b>GC:</b> {results.fwd.gc}% &bull; <b>Length:</b> {results.fwd.len} nt
                </div>
              </div>

              <div style={{ borderLeft: '4px solid var(--accent-d)', padding: '8px 12px', background: 'var(--off)', borderRadius: '0 6px 6px 0' }}>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', color: 'var(--text3)' }}>Reverse Primer</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', wordBreak: 'break-all', color: 'var(--text1)' }}>{results.rev.seq}</div>
                <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '4px' }}>
                  <b>Tm:</b> {results.rev.tm}°C &bull; <b>GC:</b> {results.rev.gc}% &bull; <b>Length:</b> {results.rev.len} nt
                </div>
              </div>

              {results.probe && (
                <div style={{ borderLeft: '4px solid var(--amber)', padding: '8px 12px', background: 'var(--off)', borderRadius: '0 6px 6px 0' }}>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', color: 'var(--text3)' }}>qPCR Probe</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', wordBreak: 'break-all', color: 'var(--text1)' }}>{results.probe.seq}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '4px' }}>
                    <b>Tm:</b> {results.probe.tm}°C &bull; <b>GC:</b> {results.probe.gc}% &bull; <b>Length:</b> {results.probe.len} nt
                  </div>
                </div>
              )}
            </div>

            {/* Checklist */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Tm Compatibility */}
              <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: 'bold', color: 'var(--text1)' }}>Melting Temperature Compatibility</span>
                  <span className={`sc-badge ${results.checks.tmDelta.status}`}>
                    {results.checks.tmDelta.status === 'pass' ? 'PASS' : 'WARN'}
                  </span>
                </div>
                <p style={{ fontSize: '12.5px', color: 'var(--text3)', margin: '4px 0 0' }}>{results.checks.tmDelta.msg}</p>
                {results.checks.annealWarning && (
                  <p style={{ fontSize: '12px', color: 'var(--amber-d)', fontWeight: 'bold', margin: '4px 0 0' }}>
                    ⚠ {results.checks.annealWarning}
                  </p>
                )}
              </div>

              {/* Self Dimerization */}
              <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: 'bold', color: 'var(--text1)' }}>Self-Dimerization Scan</span>
                  <span className={`sc-badge ${results.checks.fwdSelf.risk.startsWith('High') || results.checks.revSelf.risk.startsWith('High') ? 'warn' : 'pass'}`}>
                    {results.checks.fwdSelf.risk.startsWith('High') || results.checks.revSelf.risk.startsWith('High') ? 'ALERT' : 'PASS'}
                  </span>
                </div>
                <p style={{ fontSize: '12.5px', color: 'var(--text3)', margin: '4px 0 0' }}>
                  Fwd self-complementarity: <b>{results.checks.fwdSelf.maxContig} bp</b> ({results.checks.fwdSelf.risk})<br/>
                  Rev self-complementarity: <b>{results.checks.revSelf.maxContig} bp</b> ({results.checks.revSelf.risk})
                </p>

                {(results.checks.fwdSelf.maxContig >= 4 || results.checks.revSelf.maxContig >= 4) && (
                  <div style={{ backgroundColor: 'var(--off)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px', marginTop: '8px', fontFamily: 'var(--font-mono)', fontSize: '12px', whiteSpace: 'pre', overflowX: 'auto', lineHeight: '1.5' }}>
                    {results.checks.fwdSelf.maxContig >= 4 && (
                      <>
                        <div style={{ fontWeight: 'bold', color: 'var(--text2)' }}>Forward Self-Dimer alignment:</div>
                        <div>{results.checks.fwdSelf.topStr}</div>
                        <div style={{ color: 'var(--accent)' }}>{results.checks.fwdSelf.midStr}</div>
                        <div>{results.checks.fwdSelf.btmStr}</div>
                      </>
                    )}
                    {results.checks.revSelf.maxContig >= 4 && (
                      <>
                        <div style={{ fontWeight: 'bold', color: 'var(--text2)', marginTop: '8px' }}>Reverse Self-Dimer alignment:</div>
                        <div>{results.checks.revSelf.topStr}</div>
                        <div style={{ color: 'var(--accent)' }}>{results.checks.revSelf.midStr}</div>
                        <div>{results.checks.revSelf.btmStr}</div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Cross Dimerization */}
              <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: 'bold', color: 'var(--text1)' }}>Hetero-Dimerization (Fwd vs Rev)</span>
                  <span className={`sc-badge ${results.checks.fwdRevHetero.risk.startsWith('High') ? 'warn' : 'pass'}`}>
                    {results.checks.fwdRevHetero.risk.startsWith('High') ? 'ALERT' : 'PASS'}
                  </span>
                </div>
                <p style={{ fontSize: '12.5px', color: 'var(--text3)', margin: '4px 0 0' }}>
                  Cross-complementarity run: <b>{results.checks.fwdRevHetero.maxContig} bp</b> ({results.checks.fwdRevHetero.risk})
                </p>

                {results.checks.fwdRevHetero.maxContig >= 3 && (
                  <div style={{ backgroundColor: 'var(--off)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px', marginTop: '8px', fontFamily: 'var(--font-mono)', fontSize: '12px', whiteSpace: 'pre', overflowX: 'auto', lineHeight: '1.5' }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--text2)' }}>Cross Dimer alignment:</div>
                    <div>{results.checks.fwdRevHetero.topStr}</div>
                    <div style={{ color: 'var(--accent)' }}>{results.checks.fwdRevHetero.midStr}</div>
                    <div>{results.checks.fwdRevHetero.btmStr}</div>
                  </div>
                )}
              </div>

              {/* Hairpins */}
              <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: 'bold', color: 'var(--text1)' }}>Hairpin loops scan</span>
                  <span className={`sc-badge ${results.checks.fwdHairpin.found || results.checks.revHairpin.found ? 'warn' : 'pass'}`}>
                    {results.checks.fwdHairpin.found || results.checks.revHairpin.found ? 'WARN' : 'PASS'}
                  </span>
                </div>
                <p style={{ fontSize: '12.5px', color: 'var(--text3)', margin: '4px 0 0' }}>
                  Fwd Hairpin: {results.checks.fwdHairpin.found ? <span style={{ color: 'var(--amber-d)', fontWeight: 'bold' }}>{results.checks.fwdHairpin.msg}</span> : 'None.'}<br/>
                  Rev Hairpin: {results.checks.revHairpin.found ? <span style={{ color: 'var(--amber-d)', fontWeight: 'bold' }}>{results.checks.revHairpin.msg}</span> : 'None.'}
                </p>
              </div>

              {/* GC Clamp */}
              <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: 'bold', color: 'var(--text1)' }}>3' GC Clamp stability</span>
                  <span className={`sc-badge ${results.checks.fwdClamp.status === 'warn' || results.checks.revClamp.status === 'warn' ? 'warn' : 'pass'}`}>
                    {results.checks.fwdClamp.status === 'warn' || results.checks.revClamp.status === 'warn' ? 'WARN' : 'PASS'}
                  </span>
                </div>
                <p style={{ fontSize: '12.5px', color: 'var(--text3)', margin: '4px 0 0' }}>
                  Fwd clamp: {results.checks.fwdClamp.msg}<br/>
                  Rev clamp: {results.checks.revClamp.msg}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '8px' }}>
              <CopyButton text={getCopyText()} />
              <ExportButton data={getCsvOutput()} filename="primer_pair_diagnostic_report.csv" format="csv" />
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
              <button
                type="button"
                className="bx-btn-primary"
                onClick={resetAnalysis}
                style={{ background: 'var(--text2)', boxShadow: 'none' }}
              >
                ← Diagnostic Another Primer Set
              </button>
            </div>
          </div>
        )}
      </div>
    </ToolShell>
  );
}
