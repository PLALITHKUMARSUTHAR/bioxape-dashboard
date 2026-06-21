import React, { useState } from 'react';
import ToolShell, { CopyButton, ExportButton } from '../../components/tools/ToolShell';

const SPECTRO_PRESETS = [
  { id: 'dsdna', name: 'Double-stranded DNA (dsDNA)', unit: 'ng/µL', factor: 50, standardExt: null, description: 'Using standard 50 µg/mL (50 ng/µL) per A260 unit.' },
  { id: 'ssdna', name: 'Single-stranded DNA (ssDNA)', unit: 'ng/µL', factor: 33, standardExt: null, description: 'Using standard 33 µg/mL (33 ng/µL) per A260 unit.' },
  { id: 'rna', name: 'RNA', unit: 'ng/µL', factor: 40, standardExt: null, description: 'Using standard 40 µg/mL (40 ng/µL) per A260 unit.' },
  { id: 'protein_generic', name: 'Generic Protein (A280 = 1.0)', unit: 'mg/mL', factor: 1, standardExt: null, description: 'Assumes A280 of 1.0 corresponds to 1 mg/mL (1 g/L) protein.' },
  { id: 'molar', name: 'Molar Extinction Coefficient (ε)', unit: 'M', factor: null, standardExt: 50000, description: 'Uses standard Beer-Lambert A = εcl formula.' }
];

export default function SpectroCalc() {
  const [activeStep, setActiveStep] = useState(1);
  const [subMode, setSubMode] = useState('beer'); // 'beer' or 'growth'

  // Mode 1: Beer-Lambert states
  const [presetIdx, setPresetIdx] = useState(0);
  const [a260, setA260] = useState('0.5');
  const [a280, setA280] = useState('0.28');
  const [pathLength, setPathLength] = useState('1.0');
  const [customExt, setCustomExt] = useState('50000');
  const [customMw, setCustomMw] = useState('330');
  const [dilutionFactor, setDilutionFactor] = useState('1.0');

  // Mode 2: Growth Curve states
  const [timeUnit, setTimeUnit] = useState('hours');
  const [organism, setOrganism] = useState('ecoli');
  const [customOrganismFactor, setCustomOrganismFactor] = useState('800000000');
  const [curvePoints, setCurvePoints] = useState([
    { id: 1, time: '0.0', od: '0.08', active: true },
    { id: 2, time: '1.0', od: '0.15', active: true },
    { id: 3, time: '2.0', od: '0.31', active: true },
    { id: 4, time: '3.0', od: '0.62', active: true },
    { id: 5, time: '4.0', od: '1.18', active: true },
    { id: 6, time: '5.0', od: '1.85', active: false }
  ]);
  const [isLogScale, setIsLogScale] = useState(false);

  // Outputs
  const [results, setResults] = useState(null);
  const [validationError, setValidationError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const steps = [
    { number: 1, title: 'Spectrophotometry Mode' },
    { number: 2, title: 'Parameters' },
    { number: 3, title: 'Run Analysis' },
    { number: 4, title: 'Growth Plot' }
  ];

  const handlePointChange = (id, field, value) => {
    setCurvePoints(prev => prev.map(pt => pt.id === id ? { ...pt, [field]: value } : pt));
  };

  const handlePointToggle = (id) => {
    setCurvePoints(prev => prev.map(pt => pt.id === id ? { ...pt, active: !pt.active } : pt));
  };

  const addPoint = () => {
    const nextId = curvePoints.length > 0 ? Math.max(...curvePoints.map(p => p.id)) + 1 : 1;
    setCurvePoints(prev => [...prev, { id: nextId, time: '', od: '', active: true }]);
  };

  const removePoint = (id) => {
    setCurvePoints(prev => prev.filter(p => p.id !== id));
  };

  const loadSample = (type) => {
    if (type === 'beer') {
      setA260('0.75');
      setA280('0.42');
      setPathLength('1.0');
      setDilutionFactor('1.0');
    } else {
      setCurvePoints([
        { id: 1, time: '0.0', od: '0.05', active: true },
        { id: 2, time: '1.0', od: '0.11', active: true },
        { id: 3, time: '2.0', od: '0.24', active: true },
        { id: 4, time: '3.0', od: '0.49', active: true },
        { id: 5, time: '4.0', od: '1.05', active: true },
        { id: 6, time: '5.0', od: '1.60', active: false }
      ]);
    }
  };

  const runAnalysisCalculation = () => {
    setValidationError('');
    setIsAnalyzing(true);

    setTimeout(() => {
      setIsAnalyzing(false);

      if (subMode === 'beer') {
        const A = parseFloat(a260);
        const path = parseFloat(pathLength);
        const dilution = parseFloat(dilutionFactor);
        const preset = SPECTRO_PRESETS[presetIdx];

        if (isNaN(A) || A <= 0 || isNaN(path) || path <= 0 || isNaN(dilution) || dilution <= 0) {
          setValidationError('Please enter valid absorbance values, path length, and dilution factors.');
          return;
        }

        let concentration = 0;
        let concText = '';
        const correctedA = A * dilution;

        if (preset.factor !== null) {
          concentration = (A / path) * dilution * preset.factor;
          concText = `${concentration.toFixed(2)} ${preset.unit}`;
        } else {
          const ext = parseFloat(customExt);
          if (isNaN(ext) || ext <= 0) {
            setValidationError('Please specify a valid extinction coefficient.');
            return;
          }
          concentration = correctedA / (ext * path);
          
          if (concentration < 1e-6) {
            concText = `${(concentration * 1e9).toFixed(2)} nM`;
          } else if (concentration < 1e-3) {
            concText = `${(concentration * 1e6).toFixed(2)} µM`;
          } else if (concentration < 1) {
            concText = `${(concentration * 1e3).toFixed(2)} mM`;
          } else {
            concText = `${concentration.toFixed(4)} M`;
          }

          const mw = parseFloat(customMw);
          if (!isNaN(mw) && mw > 0) {
            const massConc = concentration * mw;
            if (massConc < 1e-3) {
              concText += ` / ${(massConc * 1e6).toFixed(2)} ng/µL`;
            } else {
              concText += ` / ${massConc.toFixed(3)} mg/mL`;
            }
          }
        }

        let ratio = null;
        let ratioStatus = 'neutral';
        let ratioNote = '';

        const A280_val = parseFloat(a280);
        if (!isNaN(A280_val) && A280_val > 0) {
          ratio = A / A280_val;
          if (preset.id === 'dsdna') {
            if (ratio >= 1.7 && ratio <= 1.9) {
              ratioStatus = 'pass';
              ratioNote = 'Highly pure DNA preparation.';
            } else {
              ratioStatus = 'warn';
              ratioNote = ratio < 1.7 ? 'Possible protein or phenol contamination (low ratio).' : 'High ratio, verify sample dilution.';
            }
          } else if (preset.id === 'rna') {
            if (ratio >= 1.9 && ratio <= 2.1) {
              ratioStatus = 'pass';
              ratioNote = 'Highly pure RNA preparation.';
            } else {
              ratioStatus = 'warn';
              ratioNote = ratio < 1.9 ? 'Possible protein or genomic DNA contamination (low ratio).' : 'High ratio, verify sample.';
            }
          } else if (preset.id === 'protein_generic') {
            if (ratio >= 0.55 && ratio <= 0.65) {
              ratioStatus = 'pass';
              ratioNote = 'Pure protein preparation.';
            } else {
              ratioStatus = 'warn';
              ratioNote = ratio > 0.65 ? 'Possible nucleic acid contamination (high ratio).' : 'Low ratio, check sample structure.';
            }
          }
        }

        setResults({
          mode: 'beer',
          concentration,
          concText,
          ratio: ratio !== null ? ratio.toFixed(2) : null,
          ratioStatus,
          ratioNote
        });
        setActiveStep(4);

      } else if (subMode === 'growth') {
        const activePoints = curvePoints.filter(p => p.active);
        if (activePoints.length < 2) {
          setValidationError('Please activate at least 2 coordinate points to calculate doubling time.');
          return;
        }

        const dataset = [];
        for (let p of activePoints) {
          const t = parseFloat(p.time);
          const od = parseFloat(p.od);
          if (!isNaN(t) && !isNaN(od) && od > 0) {
            dataset.push({ t, od, lnOD: Math.log(od) });
          }
        }

        if (dataset.length < 2) {
          setValidationError('Ensure that measurement time and OD600 inputs are valid positive values.');
          return;
        }

        const n = dataset.length;
        let sumT = 0, sumY = 0, sumT2 = 0, sumTY = 0;
        
        for (let pt of dataset) {
          sumT += pt.t;
          sumY += pt.lnOD;
          sumT2 += pt.t * pt.t;
          sumTY += pt.t * pt.lnOD;
        }

        const numerator = n * sumTY - sumT * sumY;
        const denominator = n * sumT2 - sumT * sumT;

        if (denominator === 0) {
          setValidationError('Time differences are zero; linear regression failed.');
          return;
        }

        const k = numerator / denominator;
        const intercept = (sumY - k * sumT) / n;
        
        let doublingTime = null;
        if (k > 0) {
          doublingTime = Math.log(2) / k;
        }

        const meanY = sumY / n;
        let ssTot = 0;
        let ssRes = 0;
        for (let pt of dataset) {
          const predY = k * pt.t + intercept;
          ssTot += Math.pow(pt.lnOD - meanY, 2);
          ssRes += Math.pow(pt.lnOD - predY, 2);
        }
        const r2 = ssTot > 0 ? 1 - (ssRes / ssTot) : 1;

        const factor = organism === 'ecoli' ? 8e8 : organism === 'yeast' ? 3e7 : parseFloat(customOrganismFactor);
        const cfuPoints = curvePoints.map(p => {
          const od = parseFloat(p.od);
          return {
            ...p,
            cfu: !isNaN(od) && od > 0 ? (od * factor).toExponential(2) : 'N/A'
          };
        });

        setResults({
          mode: 'growth',
          k: k.toFixed(4),
          doublingTime: doublingTime !== null ? doublingTime.toFixed(2) : 'N/A',
          r2: r2.toFixed(3),
          intercept,
          cfuPoints
        });
        setActiveStep(4);
      }
    }, 800);
  };

  const getSvgCoordinates = () => {
    if (!results || results.mode !== 'growth') return { points: [], fitLine: [] };

    const valid = curvePoints
      .map(p => ({
        x: parseFloat(p.time),
        y: parseFloat(p.od),
        active: p.active
      }))
      .filter(p => !isNaN(p.x) && !isNaN(p.y) && p.y > 0);

    if (valid.length === 0) return { points: [], fitLine: [] };

    const minX = Math.min(...valid.map(p => p.x));
    const maxX = Math.max(...valid.map(p => p.x));
    const minY = isLogScale ? Math.log(Math.min(...valid.map(p => p.y))) : 0;
    const maxY = isLogScale ? Math.log(Math.max(...valid.map(p => p.y))) : Math.max(...valid.map(p => p.y)) * 1.1;

    const scaleX = (x) => {
      if (maxX === minX) return 50;
      return 15 + ((x - minX) / (maxX - minX)) * 75;
    };

    const scaleY = (y) => {
      const targetVal = isLogScale ? Math.log(y) : y;
      if (maxY === minY) return 50;
      return 80 - ((targetVal - minY) / (maxY - minY)) * 70;
    };

    const points = valid.map(p => ({
      cx: scaleX(p.x),
      cy: scaleY(p.y),
      label: `(${p.x}, ${p.y})`,
      active: p.active
    }));

    const fitLine = [];
    const step = (maxX - minX) / 20;
    const k = parseFloat(results.k);
    const intercept = results.intercept;

    for (let i = 0; i <= 20; i++) {
      const x = minX + i * step;
      const y = Math.exp(k * x + intercept);
      fitLine.push({
        x: scaleX(x),
        y: scaleY(y)
      });
    }

    return { points, fitLine, minX, maxX, minY, maxY };
  };

  const { points: svgPoints, fitLine: svgFitLine } = getSvgCoordinates();

  const getFastaOutput = () => {
    if (!results || results.mode !== 'beer') return '';
    return `>SpectroCalc_Absorbance_Concentration\nAbs260=${a260}\nAbs280=${a280}\nDilution=${dilutionFactor}\nConcentration=${results.concText}\nA260/280 Ratio=${results.ratio || 'N/A'}`;
  };

  const getCsvOutput = () => {
    if (!results || results.mode !== 'growth') return '';
    let csv = `Time (${timeUnit}),OD600,Estimated CFU/mL,Included\n`;
    curvePoints.forEach(p => {
      const cfu = results.cfuPoints.find(cf => cf.id === p.id)?.cfu || 'N/A';
      csv += `${p.time},${p.od},${cfu},${p.active}\n`;
    });
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
    <ToolShell slug="spectrocalc">
      {renderStepTracker()}

      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        {/* Step 1: Mode Selection */}
        {activeStep === 1 && (
          <div className="bx-step-section">
            <div className="bx-step-header">
              <span className="bx-step-badge">Step 1</span>
              <h3 className="bx-step-title">Select Analyzer Mode</h3>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                className={`bx-tool-btn ${subMode === 'beer' ? 'copied' : ''}`}
                onClick={() => setSubMode('beer')}
                style={{ flex: 1, padding: '16px', height: '110px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}
              >
                <strong style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Beer-Lambert Concentration</strong>
                Determine nucleic acid/protein concentration from UV absorption readings
              </button>
              <button
                type="button"
                className={`bx-tool-btn ${subMode === 'growth' ? 'copied' : ''}`}
                onClick={() => setSubMode('growth')}
                style={{ flex: 1, padding: '16px', height: '110px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}
              >
                <strong style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Growth Curve fitting</strong>
                Analyze time vs OD600 to find cell doubling times & growth constants
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                type="button"
                className="bx-btn-primary"
                onClick={() => setActiveStep(2)}
              >
                Next: Enter Parameters →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Parameters */}
        {activeStep === 2 && (
          <div className="bx-step-section">
            <div className="bx-step-header">
              <span className="bx-step-badge">Step 2</span>
              <h3 className="bx-step-title">Enter Measurement Parameters</h3>
            </div>

            {/* Beer inputs */}
            {subMode === 'beer' && (
              <>
                <div className="bx-field-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label htmlFor="preset-selection" className="bx-label">Biomolecule Type</label>
                    <button type="button" className="bx-btn-sample" onClick={() => loadSample('beer')}>Load A260 Sample</button>
                  </div>
                  <select
                    id="preset-selection"
                    className="bx-select"
                    value={presetIdx}
                    onChange={(e) => setPresetIdx(parseInt(e.target.value))}
                  >
                    {SPECTRO_PRESETS.map((p, idx) => (
                      <option key={idx} value={idx}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text3)', fontStyle: 'italic', marginTop: '-10px' }}>
                  {SPECTRO_PRESETS[presetIdx].description}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="bx-field-group">
                    <label htmlFor="a260-input" className="bx-label">Absorbance Reading (A260/A280)</label>
                    <input
                      id="a260-input"
                      type="number"
                      step="any"
                      className="bx-input"
                      value={a260}
                      onChange={(e) => setA260(e.target.value)}
                    />
                  </div>
                  <div className="bx-field-group">
                    <label htmlFor="a280-input" className="bx-label">Optional A280 Purity check</label>
                    <input
                      id="a280-input"
                      type="number"
                      step="any"
                      className="bx-input"
                      placeholder="e.g. A280"
                      value={a280}
                      onChange={(e) => setA280(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="bx-field-group">
                    <label htmlFor="path-length-input" className="bx-label">Path Length (cm)</label>
                    <input
                      id="path-length-input"
                      type="number"
                      step="any"
                      className="bx-input"
                      value={pathLength}
                      onChange={(e) => setPathLength(e.target.value)}
                    />
                  </div>
                  <div className="bx-field-group">
                    <label htmlFor="dilution-factor-input" className="bx-label">Dilution Factor</label>
                    <input
                      id="dilution-factor-input"
                      type="number"
                      step="any"
                      className="bx-input"
                      value={dilutionFactor}
                      onChange={(e) => setDilutionFactor(e.target.value)}
                    />
                  </div>
                </div>

                {presetIdx === SPECTRO_PRESETS.length - 1 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="bx-field-group">
                      <label htmlFor="custom-ext-input" className="bx-label">Molar Extinction &epsilon; (M⁻¹cm⁻¹)</label>
                      <input
                        id="custom-ext-input"
                        type="number"
                        className="bx-input"
                        value={customExt}
                        onChange={(e) => setCustomExt(e.target.value)}
                      />
                    </div>
                    <div className="bx-field-group">
                      <label htmlFor="custom-mw-input" className="bx-label">Molecular Weight (g/mol)</label>
                      <input
                        id="custom-mw-input"
                        type="number"
                        className="bx-input"
                        value={customMw}
                        onChange={(e) => setCustomMw(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Growth inputs */}
            {subMode === 'growth' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="bx-field-group">
                    <label htmlFor="time-unit-select" className="bx-label">Time Unit</label>
                    <select
                      id="time-unit-select"
                      className="bx-select"
                      value={timeUnit}
                      onChange={(e) => setTimeUnit(e.target.value)}
                    >
                      <option value="hours">Hours</option>
                      <option value="minutes">Minutes</option>
                    </select>
                  </div>
                  <div className="bx-field-group">
                    <label htmlFor="organism-select" className="bx-label">Organism Conversion</label>
                    <select
                      id="organism-select"
                      className="bx-select"
                      value={organism}
                      onChange={(e) => setOrganism(e.target.value)}
                    >
                      <option value="ecoli">E. coli (~8x10⁸ cells/OD)</option>
                      <option value="yeast">S. cerevisiae (~3x10⁷ cells/OD)</option>
                      <option value="custom">Custom factor</option>
                    </select>
                  </div>
                </div>

                {organism === 'custom' && (
                  <div className="bx-field-group">
                    <label htmlFor="custom-cfu-factor" className="bx-label">Cells/mL per OD600</label>
                    <input
                      id="custom-cfu-factor"
                      type="number"
                      className="bx-input"
                      value={customOrganismFactor}
                      onChange={(e) => setCustomOrganismFactor(e.target.value)}
                    />
                  </div>
                )}

                <div className="bx-field-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="bx-label">Growth Curve Points</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="button" className="bx-btn-sample" onClick={() => loadSample('growth')}>Load Sample Series</button>
                      <span style={{ color: 'var(--border)' }}>|</span>
                      <button type="button" className="bx-btn-sample" onClick={addPoint}>+ Add Coordinate</button>
                    </div>
                  </div>
                  
                  <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--off)', borderBottom: '1px solid var(--border)' }}>
                          <th style={{ padding: '6px' }}>Time ({timeUnit === 'hours' ? 'hr' : 'min'})</th>
                          <th style={{ padding: '6px' }}>OD600</th>
                          <th style={{ padding: '6px' }}>Fit?</th>
                          <th style={{ padding: '6px' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {curvePoints.map((pt) => (
                          <tr key={pt.id} style={{ borderBottom: '1px solid var(--border)', opacity: pt.active ? 1 : 0.5 }}>
                            <td style={{ padding: '6px' }}>
                              <input
                                type="text"
                                style={{ width: '60px', padding: '4px', textAlign: 'center', border: '1px solid var(--border)', borderRadius: '4px' }}
                                value={pt.time}
                                onChange={(e) => handlePointChange(pt.id, 'time', e.target.value)}
                              />
                            </td>
                            <td style={{ padding: '6px' }}>
                              <input
                                type="text"
                                style={{ width: '60px', padding: '4px', textAlign: 'center', border: '1px solid var(--border)', borderRadius: '4px' }}
                                value={pt.od}
                                onChange={(e) => handlePointChange(pt.id, 'od', e.target.value)}
                              />
                            </td>
                            <td style={{ padding: '6px' }}>
                              <input
                                type="checkbox"
                                checked={pt.active}
                                onChange={() => handlePointToggle(pt.id)}
                              />
                            </td>
                            <td style={{ padding: '6px' }}>
                              <button
                                type="button"
                                style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline' }}
                                onClick={() => removePoint(pt.id)}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
              <button type="button" className="bx-tool-btn" onClick={() => setActiveStep(1)}>← Back</button>
              <button type="button" className="bx-btn-primary" onClick={() => setActiveStep(3)}>Next: Run Analysis →</button>
            </div>
          </div>
        )}

        {/* Step 3: Run Analysis */}
        {activeStep === 3 && (
          <div className="bx-step-section" style={{ textAlign: 'center', padding: '30px 20px' }}>
            <div className="bx-step-header" style={{ justifyContent: 'center' }}>
              <span className="bx-step-badge">Step 3</span>
              <h3 className="bx-step-title">Run Spectroscopic solver</h3>
            </div>

            <p style={{ fontSize: '14px', color: 'var(--text2)', margin: '12px 0 20px' }}>
              Solving the spectroscopic parameters or fitting linear logarithmic regressions to active growth intervals.
            </p>

            <button
              type="button"
              className="bx-btn-primary"
              style={{ width: '100%', padding: '12px' }}
              onClick={runAnalysisCalculation}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <svg style={{ animation: 'spin 1.2s infinite linear', width: '16px', height: '16px', marginRight: '6px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12"/></svg>
                  Processing Absorbance Signals & Fits...
                </>
              ) : (
                'Run Analysis & Fit Curve'
              )}
            </button>

            {validationError && (
              <p style={{ color: 'var(--red)', fontSize: '13px', marginTop: '12px', fontWeight: '600' }}>
                ⚠ {validationError}
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '20px' }}>
              <button type="button" className="bx-tool-btn" onClick={() => setActiveStep(2)} disabled={isAnalyzing}>← Back</button>
            </div>
          </div>
        )}

        {/* Step 4: Results */}
        {activeStep === 4 && results && (
          <div className="bx-step-section">
            <div className="bx-step-header">
              <span className="bx-step-badge">Step 4</span>
              <h3 className="bx-step-title">Analysis Reports</h3>
            </div>

            {results.mode === 'beer' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="bx-result-box" style={{ padding: '20px' }}>
                  <div className="bx-result-val" style={{ fontSize: '24px' }}>{results.concText}</div>
                  <div className="bx-result-lbl">Calculated Concentration</div>
                </div>

                {results.ratio && (
                  <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', background: 'var(--off)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 'bold' }}>A260 / A280 Purity ratio</span>
                      <span className={`sc-badge ${results.ratioStatus}`} style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                        {results.ratio} ({results.ratioStatus.toUpperCase()})
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text3)', margin: 0 }}>
                      {results.ratioNote}
                    </p>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'center', padding: '10px' }}>
                  <svg viewBox="0 0 100 100" style={{ width: '90px', height: '90px' }}>
                    <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border)" strokeWidth="6" />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth="6"
                      strokeDasharray="251.2"
                      strokeDashoffset={251.2 - (251.2 * Math.min(2.0, parseFloat(a260))) / 2.0}
                      transform="rotate(-90 50 50)"
                    />
                    <text x="50" y="54" fontSize="13" fontWeight="bold" textAnchor="middle" fill="var(--text1)">
                      {parseFloat(a260).toFixed(2)} Abs
                    </text>
                  </svg>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                  <CopyButton text={getFastaOutput()} />
                </div>
              </div>
            )}

            {results.mode === 'growth' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="bx-result-box">
                    <div className="bx-result-val">{results.doublingTime} {timeUnit}</div>
                    <div className="bx-result-lbl">Doubling Time (Td)</div>
                  </div>
                  <div className="bx-result-box">
                    <div className="bx-result-val">{results.k}</div>
                    <div className="bx-result-lbl">Growth Constant (k)</div>
                  </div>
                </div>

                <div style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between', border: '1px solid var(--border)', padding: '10px 12px', borderRadius: '6px', backgroundColor: 'var(--off)', color: 'var(--text2)' }}>
                  <span>Goodness of Fit (R² Coefficient)</span>
                  <span style={{ fontWeight: 'bold', color: parseFloat(results.r2) > 0.95 ? 'var(--accent-d)' : 'var(--amber)' }}>
                    {results.r2}
                  </span>
                </div>

                {/* SVG Graph */}
                <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', backgroundColor: 'var(--white)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="bx-label">Exponential Regression Fit</span>
                    <button
                      type="button"
                      className="bx-tool-btn"
                      style={{ padding: '3px 8px', fontSize: '11px' }}
                      onClick={() => setIsLogScale(!isLogScale)}
                    >
                      {isLogScale ? 'Logarithmic (ln OD)' : 'Linear OD'}
                    </button>
                  </div>

                  <svg viewBox="0 0 100 90" style={{ width: '100%', height: '170px', backgroundColor: 'var(--off)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <line x1="15" y1="10" x2="15" y2="80" stroke="var(--border)" strokeWidth="1" />
                    <line x1="15" y1="80" x2="95" y2="80" stroke="var(--border)" strokeWidth="1" />
                    <line x1="15" y1="45" x2="95" y2="45" stroke="var(--border2)" strokeWidth="0.5" strokeDasharray="2" />
                    <line x1="55" y1="10" x2="55" y2="80" stroke="var(--border2)" strokeWidth="0.5" strokeDasharray="2" />

                    {svgFitLine.length > 1 && (
                      <path
                        d={`M ${svgFitLine.map(p => `${p.x} ${p.y}`).join(' L ')}`}
                        fill="none"
                        stroke="var(--accent)"
                        strokeWidth="2.2"
                      />
                    )}

                    {svgPoints.map((p, idx) => (
                      <g key={idx}>
                        <circle
                          cx={p.cx}
                          cy={p.cy}
                          r="3"
                          fill={p.active ? '#fff' : 'var(--text3)'}
                          stroke={p.active ? 'var(--accent)' : 'var(--border)'}
                          strokeWidth="2"
                        />
                      </g>
                    ))}

                    <text x="55" y="86" fontSize="4.5" textAnchor="middle" fill="var(--text3)">Time ({timeUnit})</text>
                    <text x="8" y="45" fontSize="4.5" textAnchor="middle" fill="var(--text3)" transform="rotate(-90 8 45)">
                      {isLogScale ? 'ln(OD600)' : 'OD600'}
                    </text>
                  </svg>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                  <CopyButton text={`Exponential Growth Constant k = ${results.k}\nDoubling time = ${results.doublingTime} ${timeUnit}\nR2 fit quality = ${results.r2}`} />
                  <ExportButton data={getCsvOutput()} filename="growth_curve_regression.csv" format="csv" />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
              <button
                type="button"
                className="bx-btn-primary"
                onClick={resetAnalysis}
                style={{ background: 'var(--text2)', boxShadow: 'none' }}
              >
                ← Analyze Another Spectrophotometry
              </button>
            </div>
          </div>
        )}
      </div>
    </ToolShell>
  );
}
