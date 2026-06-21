import React, { useState, useEffect } from 'react';
import ToolShell, { CopyButton, ExportButton } from '../../components/tools/ToolShell';
import { cleanSequence, reverseComplement, NN_THERMODYNAMICS } from '../../utils/bioutils';
import useDebouncedValue from '../../hooks/useDebouncedValue';

export default function PrimerCheck() {
  const [fwdInput, setFwdInput] = useState('');
  const [revInput, setRevInput] = useState('');
  const [probeInput, setProbeInput] = useState('');
  const [targetAnnealTemp, setTargetAnnealTemp] = useState('');

  const debouncedFwd = useDebouncedValue(fwdInput, 250);
  const debouncedRev = useDebouncedValue(revInput, 250);
  const debouncedProbe = useDebouncedValue(probeInput, 250);
  const debouncedAnneal = useDebouncedValue(targetAnnealTemp, 250);

  const [results, setResults] = useState(null);
  const [validationError, setValidationError] = useState('');
  const [overallStatus, setOverallStatus] = useState('empty'); // pass, warn, empty

  // DNA Nearest-Neighbor Tm helper (standard parameters: 50mM Na+, 1.5mM Mg2+, 250nM primer)
  const calculateTmNN = (seq) => {
    const clean = cleanSequence(seq);
    if (!clean || clean.length < 4) return 0;

    let dH = 0;
    let dS = 0;
    const length = clean.length;

    // Sum dinucleotides
    for (let i = 0; i < length - 1; i++) {
      const step = clean.substring(i, i + 2);
      const params = NN_THERMODYNAMICS[step];
      if (params) {
        dH += params.dh;
        dS += params.ds;
      }
    }

    // Initiation
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

    // Symmetry correction
    if (clean === reverseComplement(clean)) {
      dH += NN_THERMODYNAMICS.symmetry.dh;
      dS += NN_THERMODYNAMICS.symmetry.ds;
    }

    const R = 1.987;
    const Ct = 250 * 1e-9; // 250 nM standard
    const rawTm = (dH * 1000) / (dS + R * Math.log(Ct / 4)) - 273.15;

    // Owczarzy Salt Correction (50mM Na+, 1.5mM Mg2+)
    const saltM = (50 + 120 * Math.sqrt(1.5)) / 1000;
    const lnSalt = Math.log(saltM);
    const gcFrac = clean.replace(/[^GC]/g, '').length / length;
    const Tm_kelvin = rawTm + 273.15;
    const correctedTm = 1 / (1 / Tm_kelvin + (4.29 * gcFrac - 3.95) * 1e-5 * lnSalt + 9.4e-6 * lnSalt * lnSalt) - 273.15;

    return correctedTm;
  };

  // Complementary Base Check helper
  const isComplementary = (b1, b2) => {
    const pairs = { A: 'T', T: 'A', G: 'C', C: 'G', U: 'A' };
    return pairs[b1] === b2;
  };

  // Complementarity slider alignment (dimer finder)
  // Returns: { maxContig, maxTotal, alignmentView, risk }
  const findDimerization = (seq1, seq2, name1, name2) => {
    const s1 = cleanSequence(seq1);
    const s2 = cleanSequence(seq2);
    if (!s1 || !s2) return null;

    let maxContig = 0;
    let bestOffset = 0;
    let bestTotal = 0;

    // Slide S2 relative to S1
    // Offset is start index of S2 relative to S1
    for (let offset = -(s2.length - 1); offset < s1.length; offset++) {
      let currentContig = 0;
      let tempContig = 0;
      let totalMatches = 0;

      for (let j = 0; j < s2.length; j++) {
        const i = offset + j;
        if (i >= 0 && i < s1.length) {
          // Compare S1[i] and S2[s2.length - 1 - j] (antiparallel binding)
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

    // Check if dimer is near 3' end (Forward: end of s1, Reverse: start of s2)
    // 3' end of S1 is index s1.length - 1. 3' end of S2 is index s2.length - 1.
    // In our antiparallel scan, S2 is reversed. So S2's 3' end aligns near S1's 5' end, and vice versa.
    // Dimerization at 3' end is dangerous.
    let is3PrimeRisk = false;
    
    // Check if the match spans near 3' end of S1 (index s1.length - 1) or S2 (which aligns with offset + s2.length - 1)
    // If the offset aligns S2's 3' end with S1's 5' region, or S1's 3' end with S2's 5' region.
    // Specifically, let's flag if a contiguous run of >= 3bp is within 3 bases of either 3' end.
    const s1_3p_start = s1.length - 4;
    const s2_3p_start = s2.length - 4;

    // Verify 3' matches
    for (let j = 0; j < s2.length; j++) {
      const i = bestOffset + j;
      if (i >= 0 && i < s1.length) {
        const base1 = s1[i];
        const base2 = s2[s2.length - 1 - j];
        if (isComplementary(base1, base2)) {
          // Check if index corresponds to 3' region
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
      risk = 'High Risk (3\' Dimer)';
    } else if (maxContig >= 4) {
      risk = 'Moderate Risk (Internal)';
    }

    // Build visual alignment text
    // Ref:   5'-ATGCGATC-3'
    //           ||||
    // Query: 3'-TACGCTAG-5'
    let topStr = `5'-${s1}-3'`;
    let midStr = '   ';
    let btmStr = '';

    const revS2 = s2.split('').reverse().map(b => {
      if (b === 'A') return 'T';
      if (b === 'T') return 'A';
      if (b === 'G') return 'C';
      if (b === 'C') return 'G';
      return b;
    }).join('');

    // Align strings padding
    const padding = Math.abs(bestOffset);
    if (bestOffset >= 0) {
      btmStr = '   ' + ' '.repeat(bestOffset) + `3'-${s2.split('').reverse().join('')}-5'`;
      midStr = '   ' + ' '.repeat(bestOffset) + '   ';
      // Fill match line
      let matchCount = 0;
      for (let j = 0; j < s2.length; j++) {
        const i = bestOffset + j;
        if (i >= 0 && i < s1.length) {
          if (isComplementary(s1[i], s2[s2.length - 1 - j])) {
            midStr += '|';
            matchCount++;
          } else {
            midStr += ' ';
          }
        }
      }
    } else {
      topStr = '   ' + ' '.repeat(padding) + `5'-${s1}-3'`;
      btmStr = `3'-${s2.split('').reverse().join('')}-5'`;
      midStr = '   ';
      // Fill match line
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

  // Hairpin Loop finder
  // Returns: { found, stem, loop, visualText }
  const findHairpin = (seq, name) => {
    const s = cleanSequence(seq);
    if (!s || s.length < 10) return { found: false };

    let bestStem = '';
    let bestLoop = '';
    let bestStemLen = 0;
    let bestI = -1;
    let bestJ = -1;

    // Scan for stems >= 3bp separated by loop >= 3nt
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
              bestI = i;
              bestJ = j;
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

  // Run validation checks
  useEffect(() => {
    setValidationError('');
    
    const fwd = cleanSequence(debouncedFwd);
    const rev = cleanSequence(debouncedRev);
    const probe = cleanSequence(debouncedProbe);

    if (!fwd || !rev) {
      setResults(null);
      setOverallStatus('empty');
      return;
    }

    // Validation checks
    const invalidFwd = fwd.replace(/[ACGUTN]/g, '');
    const invalidRev = rev.replace(/[ACGUTN]/g, '');
    if (invalidFwd.length > 0 || invalidRev.length > 0) {
      setValidationError('Primers contain invalid nucleotides. Use standard A/C/G/T/U.');
      setResults(null);
      return;
    }

    // 1. Individual metrics
    const fwdTm = calculateTmNN(fwd);
    const revTm = calculateTmNN(rev);
    const probeTm = probe ? calculateTmNN(probe) : 0;

    const fwdGc = (fwd.replace(/[^GC]/g, '').length / fwd.length) * 100;
    const revGc = (rev.replace(/[^GC]/g, '').length / rev.length) * 100;
    const probeGc = probe ? (probe.replace(/[^GC]/g, '').length / probe.length) * 100 : 0;

    // 2. Self-Dimers
    const fwdSelf = findDimerization(fwd, fwd, 'Forward', 'Forward');
    const revSelf = findDimerization(rev, rev, 'Reverse', 'Reverse');
    const probeSelf = probe ? findDimerization(probe, probe, 'Probe', 'Probe') : null;

    // 3. Hetero-Dimers
    const fwdRevHetero = findDimerization(fwd, rev, 'Forward', 'Reverse');
    const fwdProbeHetero = probe ? findDimerization(fwd, probe, 'Forward', 'Probe') : null;
    const revProbeHetero = probe ? findDimerization(rev, probe, 'Reverse', 'Probe') : null;

    // 4. Hairpins
    const fwdHairpin = findHairpin(fwd, 'Forward');
    const revHairpin = findHairpin(rev, 'Reverse');
    const probeHairpin = probe ? findHairpin(probe, 'Probe') : { found: false };

    // 5. 3' GC Clamp
    // Forward last 5 bases:
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

    // Reverse last 5 bases:
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

    // 6. Tm Matching delta check
    const tmDelta = Math.abs(fwdTm - revTm);
    let tmDeltaStatus = 'pass';
    let tmDeltaMsg = `Tm Difference is ${tmDelta.toFixed(1)}°C (ideal <= 5°C).`;
    if (tmDelta > 5) {
      tmDeltaStatus = 'warn';
      tmDeltaMsg = `High delta Tm: ${tmDelta.toFixed(1)}°C difference can cause unbalanced amplification.`;
    }

    // Target Annealing comparison
    let annealWarning = '';
    const annealNum = parseFloat(debouncedAnneal);
    if (!isNaN(annealNum) && annealNum > 0) {
      const idealAnneal = Math.min(fwdTm, revTm) - 5;
      if (Math.abs(annealNum - idealAnneal) > 3) {
        annealWarning = `Annealing temperature (${annealNum}°C) deviates from ideal (${idealAnneal.toFixed(1)}°C, 5°C below lowest Tm).`;
      }
    }

    // Check if issues found to determine status
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
  }, [debouncedFwd, debouncedRev, debouncedProbe, debouncedAnneal]);

  const loadSample = (withProbe = false) => {
    setFwdInput('CCTGGAGATCGTGGAGAACA');
    setRevInput('TCGTGGTACTTGGGGTTGAT');
    if (withProbe) {
      setProbeInput('AAGCGTGCGATCGATCGATC');
    } else {
      setProbeInput('');
    }
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

  return (
    <ToolShell slug="primercheck">
      <style>{`
        .pc-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
        }
        @media (min-width: 1024px) {
          .pc-grid {
            grid-template-columns: 1.2fr 1.8fr;
          }
        }
        .summary-banner {
          border-radius: var(--radius);
          padding: 14px 20px;
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 700;
          font-size: 15px;
          margin-bottom: 12px;
        }
        .summary-banner.pass {
          background-color: var(--g50);
          color: var(--accent-d);
          border: 1px solid var(--border2);
        }
        .summary-banner.warn {
          background-color: var(--amber-l);
          color: var(--amber);
          border: 1px solid var(--amber);
        }
        .primers-summary-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px;
          margin-bottom: 20px;
        }
        .primer-detail-card {
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 14px;
          background-color: var(--white);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .primer-card-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text3);
          font-weight: 700;
        }
        .primer-card-seq {
          font-family: var(--font-mono, monospace);
          font-size: 13.5px;
          word-break: break-all;
          color: var(--text1);
        }
        .checklist-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 12px;
          margin-bottom: 12px;
        }
        .checklist-row-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .checklist-title {
          font-size: 14px;
          font-weight: 700;
          color: var(--text1);
        }
        .checklist-details {
          font-size: 12.5px;
          color: var(--text3);
          line-height: 1.4;
        }
        .alignment-svg-container {
          background-color: var(--off);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 12px;
          font-family: var(--font-mono, monospace);
          font-size: 13px;
          line-height: 1.5;
          margin-top: 8px;
          white-space: pre;
          overflow-x: auto;
        }
      `}</style>

      <div className="pc-grid">
        
        {/* Left column: Inputs */}
        <div className="tool-pane-card">
          <div className="tool-pane-title">
            <span>Primer Sequences</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="mock-sample-btn" onClick={() => loadSample(false)}>Load Standard</button>
              <button type="button" className="mock-sample-btn" onClick={() => loadSample(true)}>Load qPCR Probe</button>
            </div>
          </div>

          {/* Forward */}
          <div className="mock-field-group">
            <label htmlFor="fwd-primer-input" className="mock-label">Forward Primer (5' → 3')</label>
            <input
              id="fwd-primer-input"
              type="text"
              className="mock-textarea"
              style={{ height: '42px', padding: '8px 12px' }}
              placeholder="e.g. CCTGGAGATCGTGGAGAACA"
              value={fwdInput}
              onChange={(e) => setFwdInput(e.target.value.toUpperCase())}
            />
          </div>

          {/* Reverse */}
          <div className="mock-field-group">
            <label htmlFor="rev-primer-input" className="mock-label">Reverse Primer (5' → 3')</label>
            <input
              id="rev-primer-input"
              type="text"
              className="mock-textarea"
              style={{ height: '42px', padding: '8px 12px' }}
              placeholder="e.g. TCGTGGTACTTGGGGTTGAT"
              value={revInput}
              onChange={(e) => setRevInput(e.target.value.toUpperCase())}
            />
          </div>

          {/* Probe */}
          <div className="mock-field-group">
            <label htmlFor="probe-primer-input" className="mock-label">qPCR Probe (Optional, 5' → 3')</label>
            <input
              id="probe-primer-input"
              type="text"
              className="mock-textarea"
              style={{ height: '42px', padding: '8px 12px' }}
              placeholder="e.g. AAGCGTGCGATCGATCGATC"
              value={probeInput}
              onChange={(e) => setProbeInput(e.target.value.toUpperCase())}
            />
          </div>

          {/* Target Annealing */}
          <div className="mock-field-group">
            <label htmlFor="anneal-temp-input" className="mock-label">Target Annealing Temp (°C, Optional)</label>
            <input
              id="anneal-temp-input"
              type="number"
              className="mock-textarea"
              style={{ height: '42px', padding: '8px 12px' }}
              placeholder="e.g. 55"
              value={targetAnnealTemp}
              onChange={(e) => setTargetAnnealTemp(e.target.value)}
            />
          </div>

          {validationError && <p style={{ color: 'var(--red)', fontSize: '13px', marginTop: '10px' }}>{validationError}</p>}
        </div>

        {/* Right column: Results & Visualizations */}
        <div className="tool-pane-card">
          <div className="tool-pane-title">Primer Diagnostics</div>

          {results ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              
              {/* Overall status banner */}
              {overallStatus === 'pass' && (
                <div className="summary-banner pass">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '20px', height: '20px' }}><polyline points="20 6 9 17 5 12"/></svg>
                  <span>Primer Pair OK: No severe dimerization or Tm issues flagged.</span>
                </div>
              )}
              {overallStatus === 'warn' && (
                <div className="summary-banner warn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '20px', height: '20px' }}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  <span>Potential design alerts found. Verify 3' clamps or dimerization risks.</span>
                </div>
              )}

              {/* Primer detail cards */}
              <div className="primers-summary-row">
                <div className="primer-detail-card" style={{ borderLeft: '4px solid var(--accent)' }}>
                  <span className="primer-card-label">Forward Primer</span>
                  <span className="primer-card-seq">{results.fwd.seq}</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '4px', color: 'var(--text3)' }}>
                    <span><b>Tm:</b> {results.fwd.tm}°C</span>
                    <span><b>GC:</b> {results.fwd.gc}%</span>
                    <span><b>Len:</b> {results.fwd.len}nt</span>
                  </div>
                </div>

                <div className="primer-detail-card" style={{ borderLeft: '4px solid var(--accent-d)' }}>
                  <span className="primer-card-label">Reverse Primer</span>
                  <span className="primer-card-seq">{results.rev.seq}</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '4px', color: 'var(--text3)' }}>
                    <span><b>Tm:</b> {results.rev.tm}°C</span>
                    <span><b>GC:</b> {results.rev.gc}%</span>
                    <span><b>Len:</b> {results.rev.len}nt</span>
                  </div>
                </div>

                {results.probe && (
                  <div className="primer-detail-card" style={{ borderLeft: '4px solid var(--amber)' }}>
                    <span className="primer-card-label">qPCR Probe</span>
                    <span className="primer-card-seq">{results.probe.seq}</span>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '4px', color: 'var(--text3)' }}>
                      <span><b>Tm:</b> {results.probe.tm}°C</span>
                      <span><b>GC:</b> {results.probe.gc}%</span>
                      <span><b>Len:</b> {results.probe.len}nt</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Checks Checklist */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                
                {/* A. Tmdelta Check */}
                <div className="checklist-item">
                  <div className="checklist-row-top">
                    <span className="checklist-title">Melting Temperature Compatibility</span>
                    <span className={`sc-badge ${results.checks.tmDelta.status}`}>
                      {results.checks.tmDelta.status === 'pass' ? 'PASS' : 'WARN'}
                    </span>
                  </div>
                  <span className="checklist-details">{results.checks.tmDelta.msg}</span>
                  {results.checks.annealWarning && (
                    <span className="checklist-details" style={{ color: 'var(--amber)', fontWeight: 'bold' }}>
                      ⚠ {results.checks.annealWarning}
                    </span>
                  )}
                </div>

                {/* B. Self Dimerization */}
                <div className="checklist-item">
                  <div className="checklist-row-top">
                    <span className="checklist-title">Self-Dimerization Scan</span>
                    <span className={`sc-badge ${results.checks.fwdSelf.risk.startsWith('High') || results.checks.revSelf.risk.startsWith('High') ? 'warn' : 'pass'}`}>
                      {results.checks.fwdSelf.risk.startsWith('High') || results.checks.revSelf.risk.startsWith('High') ? 'ALERT' : 'PASS'}
                    </span>
                  </div>
                  <span className="checklist-details">
                    Fwd self-complementarity: <b>{results.checks.fwdSelf.maxContig} bp</b> (Risk: {results.checks.fwdSelf.risk})<br/>
                    Rev self-complementarity: <b>{results.checks.revSelf.maxContig} bp</b> (Risk: {results.checks.revSelf.risk})
                  </span>
                  {(results.checks.fwdSelf.maxContig >= 4 || results.checks.revSelf.maxContig >= 4) && (
                    <div className="alignment-svg-container">
                      {results.checks.fwdSelf.maxContig >= 4 && (
                        <>
                          <div><b>Forward Self-Dimer:</b></div>
                          <div>{results.checks.fwdSelf.topStr}</div>
                          <div style={{ color: 'var(--accent)' }}>{results.checks.fwdSelf.midStr}</div>
                          <div>{results.checks.fwdSelf.btmStr}</div>
                        </>
                      )}
                      {results.checks.revSelf.maxContig >= 4 && (
                        <>
                          <div style={{ marginTop: '10px' }}><b>Reverse Self-Dimer:</b></div>
                          <div>{results.checks.revSelf.topStr}</div>
                          <div style={{ color: 'var(--accent)' }}>{results.checks.revSelf.midStr}</div>
                          <div>{results.checks.revSelf.btmStr}</div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* C. Hetero-Dimerization */}
                <div className="checklist-item">
                  <div className="checklist-row-top">
                    <span className="checklist-title">Hetero-Dimerization (Fwd vs Rev)</span>
                    <span className={`sc-badge ${results.checks.fwdRevHetero.risk.startsWith('High') ? 'warn' : 'pass'}`}>
                      {results.checks.fwdRevHetero.risk.startsWith('High') ? 'ALERT' : 'PASS'}
                    </span>
                  </div>
                  <span className="checklist-details">
                    Cross-complementarity is <b>{results.checks.fwdRevHetero.maxContig} bp</b> (Risk: {results.checks.fwdRevHetero.risk}).
                  </span>
                  {results.checks.fwdRevHetero.maxContig >= 3 && (
                    <div className="alignment-svg-container">
                      <div><b>Forward / Reverse Hetero-Dimer configuration:</b></div>
                      <div>{results.checks.fwdRevHetero.topStr}</div>
                      <div style={{ color: 'var(--accent)' }}>{results.checks.fwdRevHetero.midStr}</div>
                      <div>{results.checks.fwdRevHetero.btmStr}</div>
                    </div>
                  )}
                </div>

                {/* D. Hairpins */}
                <div className="checklist-item">
                  <div className="checklist-row-top">
                    <span className="checklist-title">Hairpin loop scan</span>
                    <span className={`sc-badge ${results.checks.fwdHairpin.found || results.checks.revHairpin.found ? 'warn' : 'pass'}`}>
                      {results.checks.fwdHairpin.found || results.checks.revHairpin.found ? 'WARN' : 'PASS'}
                    </span>
                  </div>
                  <span className="checklist-details">
                    Fwd Hairpins: {results.checks.fwdHairpin.found ? <span style={{ color: 'var(--amber)' }}>{results.checks.fwdHairpin.msg}</span> : 'None detected.'}<br/>
                    Rev Hairpins: {results.checks.revHairpin.found ? <span style={{ color: 'var(--amber)' }}>{results.checks.revHairpin.msg}</span> : 'None detected.'}
                  </span>
                </div>

                {/* E. 3' GC Clamp Check */}
                <div className="checklist-item">
                  <div className="checklist-row-top">
                    <span className="checklist-title">3' GC Clamp stability</span>
                    <span className={`sc-badge ${results.checks.fwdClamp.status === 'warn' || results.checks.revClamp.status === 'warn' ? 'warn' : 'pass'}`}>
                      {results.checks.fwdClamp.status === 'warn' || results.checks.revClamp.status === 'warn' ? 'WARN' : 'PASS'}
                    </span>
                  </div>
                  <span className="checklist-details">
                    Fwd Clamp: {results.checks.fwdClamp.msg}<br/>
                    Rev Clamp: {results.checks.revClamp.msg}
                  </span>
                </div>

              </div>

              {/* Actions */}
              <div className="mock-actions-row">
                <CopyButton text={getCopyText()} />
                <ExportButton data={getCsvOutput()} filename="primer_pair_diagnostic_report.csv" format="csv" />
              </div>

            </div>
          ) : (
            <div className="mock-empty-results">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '48px', height: '48px', color: 'var(--text4)', marginBottom: '12px' }}>
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <p style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text2)', marginBottom: '4px' }}>Awaiting Primer Inputs</p>
              <p style={{ fontSize: '13px', lineHeight: 1.4 }}>Enter Forward and Reverse primer designs on the left to slide complementary alignments, calculate clamps, and scan hairpins.</p>
            </div>
          )}
        </div>

      </div>
    </ToolShell>
  );
}
