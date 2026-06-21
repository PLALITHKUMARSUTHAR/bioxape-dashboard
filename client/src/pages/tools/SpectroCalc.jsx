import React, { useState, useEffect } from 'react';
import ToolShell, { CopyButton, ExportButton } from '../../components/tools/ToolShell';

const SPECTRO_PRESETS = [
  { id: 'dsdna', name: 'Double-stranded DNA (dsDNA)', unit: 'ng/µL', factor: 50, standardExt: null, description: 'Using standard 50 µg/mL (50 ng/µL) per A260 unit.' },
  { id: 'ssdna', name: 'Single-stranded DNA (ssDNA)', unit: 'ng/µL', factor: 33, standardExt: null, description: 'Using standard 33 µg/mL (33 ng/µL) per A260 unit.' },
  { id: 'rna', name: 'RNA', unit: 'ng/µL', factor: 40, standardExt: null, description: 'Using standard 40 µg/mL (40 ng/µL) per A260 unit.' },
  { id: 'protein_generic', name: 'Generic Protein (A280 = 1.0)', unit: 'mg/mL', factor: 1, standardExt: null, description: 'Assumes A280 of 1.0 corresponds to 1 mg/mL (1 g/L) protein.' },
  { id: 'molar', name: 'Molar Extinction Coefficient (ε)', unit: 'M', factor: null, standardExt: 50000, description: 'Uses standard Beer-Lambert A = εcl formula.' }
];

export default function SpectroCalc() {
  const [activeTab, setActiveTab] = useState('beer');

  // Mode 1: Beer-Lambert states
  const [presetIdx, setPresetIdx] = useState(0); // default dsDNA
  const [a260, setA260] = useState('0.5');
  const [a280, setA280] = useState('0.28');
  const [pathLength, setPathLength] = useState('1.0');
  const [customExt, setCustomExt] = useState('50000');
  const [customMw, setCustomMw] = useState('330'); // g/mol (average nucleotide/AA)
  const [dilutionFactor, setDilutionFactor] = useState('1.0');
  const [beerResult, setBeerResult] = useState(null);

  // Mode 2: Growth Curve states
  const [timeUnit, setTimeUnit] = useState('hours'); // hours or minutes
  const [organism, setOrganism] = useState('ecoli'); // ecoli, yeast, custom
  const [customOrganismFactor, setCustomOrganismFactor] = useState('800000000'); // cells/mL per OD600
  const [curvePoints, setCurvePoints] = useState([
    { id: 1, time: '0.0', od: '0.08', active: true },
    { id: 2, time: '1.0', od: '0.15', active: true },
    { id: 3, time: '2.0', od: '0.31', active: true },
    { id: 4, time: '3.0', od: '0.62', active: true },
    { id: 5, time: '4.0', od: '1.18', active: true },
    { id: 6, time: '5.0', od: '1.85', active: false } // stationary phase (turned off by default for regression)
  ]);
  const [isLogScale, setIsLogScale] = useState(false);
  const [growthResult, setGrowthResult] = useState(null);

  // Validation
  const [validationError, setValidationError] = useState('');

  // Mode 1: Recalculate Beer-Lambert
  useEffect(() => {
    setValidationError('');
    const A = parseFloat(a260);
    const path = parseFloat(pathLength);
    const dilution = parseFloat(dilutionFactor);
    const preset = SPECTRO_PRESETS[presetIdx];

    if (isNaN(A) || A <= 0 || isNaN(path) || path <= 0 || isNaN(dilution) || dilution <= 0) {
      setBeerResult(null);
      return;
    }

    let concentration = 0;
    let concText = '';
    const correctedA = A * dilution;

    if (preset.factor !== null) {
      // Conversion factor based (dsDNA, ssDNA, RNA, generic protein)
      concentration = (A / path) * dilution * preset.factor;
      concText = `${concentration.toFixed(2)} ${preset.unit}`;
    } else {
      // Beer-Lambert: A = εcl -> c = A / (ε * l)
      const ext = parseFloat(customExt);
      if (isNaN(ext) || ext <= 0) {
        setBeerResult(null);
        return;
      }
      concentration = correctedA / (ext * path); // Molarity (M)
      
      if (concentration < 1e-6) {
        concText = `${(concentration * 1e9).toFixed(2)} nM`;
      } else if (concentration < 1e-3) {
        concText = `${(concentration * 1e6).toFixed(2)} µM`;
      } else if (concentration < 1) {
        concText = `${(concentration * 1e3).toFixed(2)} mM`;
      } else {
        concText = `${concentration.toFixed(4)} M`;
      }

      // If MW is available, calculate weight concentration
      const mw = parseFloat(customMw);
      if (!isNaN(mw) && mw > 0) {
        const massConc = concentration * mw; // g/L or mg/mL
        if (massConc < 1e-3) {
          concText += ` / ${(massConc * 1e6).toFixed(2)} ng/µL`;
        } else {
          concText += ` / ${massConc.toFixed(3)} mg/mL`;
        }
      }
    }

    // A260/280 Ratio Check
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
          ratioNote = 'Pure protein representation.';
        } else {
          ratioStatus = 'warn';
          ratioNote = ratio > 0.65 ? 'Possible nucleic acid contamination (high ratio).' : 'Low ratio, check sample structure.';
        }
      }
    }

    setBeerResult({
      concentration,
      concText,
      ratio: ratio !== null ? ratio.toFixed(2) : null,
      ratioStatus,
      ratioNote
    });
  }, [presetIdx, a260, a280, pathLength, customExt, customMw, dilutionFactor]);

  // Mode 2: Recalculate Growth Curve and Doubling Time
  useEffect(() => {
    setValidationError('');

    const activePoints = curvePoints.filter(p => p.active);
    if (activePoints.length < 2) {
      setGrowthResult(null);
      return;
    }

    // Parse values and filter out NaN or negative times/ODs
    const dataset = [];
    for (let p of activePoints) {
      const t = parseFloat(p.time);
      const od = parseFloat(p.od);
      if (!isNaN(t) && !isNaN(od) && od > 0) {
        dataset.push({ t, od, lnOD: Math.log(od) });
      }
    }

    if (dataset.length < 2) {
      setGrowthResult(null);
      return;
    }

    // Compute Linear Regression: y = ln(OD) = k * t + intercept
    // k = growth rate constant
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
      setGrowthResult(null);
      return;
    }

    const k = numerator / denominator;
    const intercept = (sumY - k * sumT) / n;
    
    // Doubling Time Td = ln(2) / k
    let doublingTime = null;
    if (k > 0) {
      doublingTime = Math.log(2) / k;
    }

    // R-squared score (goodness of fit)
    const meanY = sumY / n;
    let ssTot = 0; // total sum of squares
    let ssRes = 0; // residual sum of squares
    for (let pt of dataset) {
      const predY = k * pt.t + intercept;
      ssTot += Math.pow(pt.lnOD - meanY, 2);
      ssRes += Math.pow(pt.lnOD - predY, 2);
    }
    const r2 = ssTot > 0 ? 1 - (ssRes / ssTot) : 1;

    // Convert OD to cell count
    const factor = organism === 'ecoli' ? 8e8 : organism === 'yeast' ? 3e7 : parseFloat(customOrganismFactor);
    const cfuPoints = curvePoints.map(p => {
      const od = parseFloat(p.od);
      return {
        ...p,
        cfu: !isNaN(od) && od > 0 ? (od * factor).toExponential(2) : 'N/A'
      };
    });

    setGrowthResult({
      k: k.toFixed(4),
      doublingTime: doublingTime !== null ? doublingTime.toFixed(2) : 'N/A',
      r2: r2.toFixed(3),
      intercept,
      cfuPoints
    });
  }, [curvePoints, organism, customOrganismFactor]);

  // Handle Growth Point Edits
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

  // Generate fitted curve coordinates for SVG
  const getSvgCoordinates = () => {
    if (!growthResult) return { points: [], fitLine: [] };
    const factor = organism === 'ecoli' ? 8e8 : organism === 'yeast' ? 3e7 : parseFloat(customOrganismFactor);

    // Filter valid active coordinates
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
      return 15 + ((x - minX) / (maxX - minX)) * 80; // percent of SVG width
    };

    const scaleY = (y) => {
      const targetVal = isLogScale ? Math.log(y) : y;
      if (maxY === minY) return 50;
      return 85 - ((targetVal - minY) / (maxY - minY)) * 75; // percent of SVG height (upside down)
    };

    const points = valid.map(p => ({
      cx: scaleX(p.x),
      cy: scaleY(p.y),
      label: `(${p.x}, ${p.y})`,
      active: p.active
    }));

    // Generate fitted line
    const fitLine = [];
    const step = (maxX - minX) / 20;
    const k = parseFloat(growthResult.k);
    const intercept = growthResult.intercept;

    for (let i = 0; i <= 20; i++) {
      const x = minX + i * step;
      // Exponential curve: y = e^(k * x + intercept)
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
    if (!beerResult) return '';
    return `>SpectroCalc_Absorbance_Concentration\nAbs260=${a260}\nAbs280=${a280}\nDilution=${dilutionFactor}\nConcentration=${beerResult.concText}\nA260/280 Ratio=${beerResult.ratio || 'N/A'}`;
  };

  const getCsvOutput = () => {
    if (!growthResult) return '';
    let csv = `Time (${timeUnit}),OD600,Estimated CFU/mL,Included\n`;
    curvePoints.forEach(p => {
      const cfu = growthResult.cfuPoints.find(cf => cf.id === p.id)?.cfu || 'N/A';
      csv += `${p.time},${p.od},${cfu},${p.active}\n`;
    });
    return csv;
  };

  return (
    <ToolShell slug="spectrocalc">
      <style>{`
        .sc-tabs {
          display: flex;
          border-bottom: 2px solid var(--border);
          gap: 16px;
          margin-bottom: 20px;
        }
        .sc-tab-btn {
          background: none;
          border: none;
          padding: 10px 16px;
          font-size: 15px;
          font-weight: 600;
          color: var(--text3);
          cursor: pointer;
          position: relative;
          transition: color 0.2s ease;
        }
        .sc-tab-btn:hover {
          color: var(--accent);
        }
        .sc-tab-btn.active {
          color: var(--accent-d);
        }
        .sc-tab-btn.active::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          right: 0;
          height: 2px;
          background-color: var(--accent);
        }
        .sc-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
        }
        @media (min-width: 1024px) {
          .sc-grid {
            grid-template-columns: 1.2fr 1.8fr;
          }
        }
        .sc-badge {
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 4px;
          display: inline-block;
        }
        .sc-badge.pass {
          background-color: var(--g50);
          color: var(--accent-d);
          border: 1px solid var(--border2);
        }
        .sc-badge.warn {
          background-color: var(--amber-l);
          color: var(--amber);
          border: 1px solid var(--amber);
        }
        .sc-badge.neutral {
          background-color: var(--off);
          color: var(--text3);
          border: 1px solid var(--border);
        }
        .growth-table-wrapper {
          overflow-x: auto;
          margin-top: 10px;
          max-height: 280px;
          overflow-y: auto;
          border: 1px solid var(--border);
          border-radius: 6px;
        }
        .growth-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .growth-table th, .growth-table td {
          padding: 6px 10px;
          border-bottom: 1px solid var(--border);
          text-align: center;
        }
        .growth-table th {
          background-color: var(--off);
          font-weight: 600;
          position: sticky;
          top: 0;
        }
        .table-input {
          width: 70px;
          border: 1px solid var(--border);
          border-radius: 4px;
          padding: 4px 6px;
          font-family: var(--font-mono, monospace);
          font-size: 12.5px;
          text-align: center;
        }
        .table-input:focus {
          border-color: var(--accent);
          outline: none;
        }
        .sc-chart-box {
          background-color: var(--white);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 16px;
        }
      `}</style>

      {/* Tabs */}
      <div className="sc-tabs" role="tablist">
        <button
          type="button"
          className={`sc-tab-btn ${activeTab === 'beer' ? 'active' : ''}`}
          onClick={() => setActiveTab('beer')}
          role="tab"
          aria-selected={activeTab === 'beer'}
        >
          Beer-Lambert (Concentration)
        </button>
        <button
          type="button"
          className={`sc-tab-btn ${activeTab === 'growth' ? 'active' : ''}`}
          onClick={() => setActiveTab('growth')}
          role="tab"
          aria-selected={activeTab === 'growth'}
        >
          Growth Curve (Doubling Time)
        </button>
      </div>

      <div className="sc-grid">
        
        {/* Left Column: Form Controls */}
        <div className="tool-pane-card">
          
          {/* Beer Lambert Mode */}
          {activeTab === 'beer' && (
            <>
              <div className="tool-pane-title">
                <span>Absorbance Parameters</span>
                <button type="button" className="mock-sample-btn" onClick={() => loadSample('beer')}>Load Sample</button>
              </div>

              {/* Preset Selector */}
              <div className="mock-field-group">
                <label htmlFor="preset-selection" className="mock-label">Biomolecule Type</label>
                <select
                  id="preset-selection"
                  className="mock-textarea"
                  style={{ height: '42px', padding: '8px' }}
                  value={presetIdx}
                  onChange={(e) => setPresetIdx(parseInt(e.target.value))}
                >
                  {SPECTRO_PRESETS.map((p, idx) => (
                    <option key={idx} value={idx}>{p.name}</option>
                  ))}
                </select>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text3)', fontStyle: 'italic', marginTop: '-10px' }}>
                {SPECTRO_PRESETS[presetIdx].description}
              </p>

              {/* Absorbance Values */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="mock-field-group">
                  <label htmlFor="a260-input" className="mock-label">Absorbance (A260 / A280)</label>
                  <input
                    id="a260-input"
                    type="number"
                    step="any"
                    className="mock-textarea"
                    style={{ height: '42px', padding: '8px 12px' }}
                    value={a260}
                    onChange={(e) => setA260(e.target.value)}
                  />
                </div>
                <div className="mock-field-group">
                  <label htmlFor="a280-input" className="mock-label">A280 Value (Optional Purity)</label>
                  <input
                    id="a280-input"
                    type="number"
                    step="any"
                    className="mock-textarea"
                    style={{ height: '42px', padding: '8px 12px' }}
                    placeholder="e.g. A280"
                    value={a280}
                    onChange={(e) => setA280(e.target.value)}
                  />
                </div>
              </div>

              {/* Path Length & Dilution Factor */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="mock-field-group">
                  <label htmlFor="path-length-input" className="mock-label">Path Length (cm)</label>
                  <input
                    id="path-length-input"
                    type="number"
                    step="any"
                    className="mock-textarea"
                    style={{ height: '42px', padding: '8px 12px' }}
                    value={pathLength}
                    onChange={(e) => setPathLength(e.target.value)}
                  />
                </div>
                <div className="mock-field-group">
                  <label htmlFor="dilution-factor-input" className="mock-label">Dilution Factor</label>
                  <input
                    id="dilution-factor-input"
                    type="number"
                    step="any"
                    className="mock-textarea"
                    style={{ height: '42px', padding: '8px 12px' }}
                    value={dilutionFactor}
                    onChange={(e) => setDilutionFactor(e.target.value)}
                  />
                </div>
              </div>

              {/* Custom Extinction / MW (Beer Lambert custom Mode) */}
              {presetIdx === SPECTRO_PRESETS.length - 1 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="mock-field-group">
                    <label htmlFor="custom-ext-input" className="mock-label">Molar Extinction ε (M⁻¹cm⁻¹)</label>
                    <input
                      id="custom-ext-input"
                      type="number"
                      className="mock-textarea"
                      style={{ height: '42px', padding: '8px 12px' }}
                      value={customExt}
                      onChange={(e) => setCustomExt(e.target.value)}
                    />
                  </div>
                  <div className="mock-field-group">
                    <label htmlFor="custom-mw-input" className="mock-label">Molecular Weight (g/mol)</label>
                    <input
                      id="custom-mw-input"
                      type="number"
                      className="mock-textarea"
                      style={{ height: '42px', padding: '8px 12px' }}
                      value={customMw}
                      onChange={(e) => setCustomMw(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Growth Curve Mode */}
          {activeTab === 'growth' && (
            <>
              <div className="tool-pane-title">
                <span>Growth Curve Parameters</span>
                <button type="button" className="mock-sample-btn" onClick={() => loadSample('growth')}>Load Sample</button>
              </div>

              {/* Time Unit & Organism Preset */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="mock-field-group">
                  <label htmlFor="time-unit-select" className="mock-label">Time Unit</label>
                  <select
                    id="time-unit-select"
                    className="mock-textarea"
                    style={{ height: '42px', padding: '8px' }}
                    value={timeUnit}
                    onChange={(e) => setTimeUnit(e.target.value)}
                  >
                    <option value="hours">Hours</option>
                    <option value="minutes">Minutes</option>
                  </select>
                </div>
                <div className="mock-field-group">
                  <label htmlFor="organism-select" className="mock-label">Organism (CFU conversion)</label>
                  <select
                    id="organism-select"
                    className="mock-textarea"
                    style={{ height: '42px', padding: '8px' }}
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
                <div className="mock-field-group">
                  <label htmlFor="custom-cfu-factor" className="mock-label">Cells/mL per OD600</label>
                  <input
                    id="custom-cfu-factor"
                    type="number"
                    className="mock-textarea"
                    style={{ height: '42px', padding: '8px 12px' }}
                    value={customOrganismFactor}
                    onChange={(e) => setCustomOrganismFactor(e.target.value)}
                  />
                </div>
              )}

              {/* Data Table */}
              <div className="mock-field-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="mock-label">Growth Curve Points</span>
                  <button type="button" className="mock-sample-btn" onClick={addPoint}>+ Add Point</button>
                </div>
                
                <div className="growth-table-wrapper">
                  <table className="growth-table">
                    <thead>
                      <tr>
                        <th>Time ({timeUnit === 'hours' ? 'hr' : 'min'})</th>
                        <th>OD600</th>
                        <th>CFU/mL</th>
                        <th>Fit?</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {curvePoints.map((pt) => {
                        const calculatedCfu = growthResult?.cfuPoints.find(cf => cf.id === pt.id)?.cfu || 'N/A';
                        return (
                          <tr key={pt.id} style={{ opacity: pt.active ? 1 : 0.5 }}>
                            <td>
                              <input
                                type="text"
                                className="table-input"
                                value={pt.time}
                                onChange={(e) => handlePointChange(pt.id, 'time', e.target.value)}
                                aria-label={`Point ${pt.id} Time`}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                className="table-input"
                                value={pt.od}
                                onChange={(e) => handlePointChange(pt.id, 'od', e.target.value)}
                                aria-label={`Point ${pt.id} OD600`}
                              />
                            </td>
                            <td style={{ fontFamily: 'var(--font-mono)' }}>{calculatedCfu}</td>
                            <td>
                              <input
                                type="checkbox"
                                checked={pt.active}
                                onChange={() => handlePointToggle(pt.id)}
                                aria-label={`Include Point ${pt.id} in fit`}
                              />
                            </td>
                            <td>
                              <button
                                type="button"
                                style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '12px' }}
                                onClick={() => removePoint(pt.id)}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {validationError && <p style={{ color: 'var(--red)', fontSize: '13px', marginTop: '10px' }}>{validationError}</p>}
        </div>

        {/* Right Column: Visualizations & Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Beer Lambert output panel */}
          {activeTab === 'beer' && (
            <div className="tool-pane-card">
              <div className="tool-pane-title">Calculated Concentration</div>
              
              {beerResult ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Concentration Block */}
                  <div className="mock-result-box" style={{ padding: '20px 10px' }}>
                    <div className="mock-result-value" style={{ fontSize: '24px' }}>
                      {beerResult.concText}
                    </div>
                    <div className="mock-result-label">Calculated Concentration</div>
                  </div>

                  {/* Ratio card */}
                  {beerResult.ratio && (
                    <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '14px', backgroundColor: 'var(--off)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 'bold' }}>A260 / A280 Purity Ratio</span>
                        <span className={`sc-badge ${beerResult.ratioStatus}`}>
                          {beerResult.ratio} ({beerResult.ratioStatus.toUpperCase()})
                        </span>
                      </div>
                      <p style={{ fontSize: '12.5px', color: 'var(--text3)', margin: 0 }}>
                        {beerResult.ratioNote}
                      </p>
                    </div>
                  )}

                  {/* Radial progress dial representing Absorption level */}
                  <div className="beaker-visualizer">
                    <svg viewBox="0 0 100 100" style={{ width: '100px', height: '100px' }}>
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
                        style={{ transition: 'stroke-dashoffset 0.4s ease' }}
                      />
                      <text x="50" y="54" fontSize="13" fontWeight="bold" textAnchor="middle" fill="var(--text1)">
                        {parseFloat(a260).toFixed(2)} Abs
                      </text>
                    </svg>
                  </div>

                  {/* Actions */}
                  <div className="mock-actions-row">
                    <CopyButton text={getFastaOutput()} />
                  </div>
                </div>
              ) : (
                <div className="mock-empty-results">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '44px', height: '44px', color: 'var(--text4)', marginBottom: '10px' }}>
                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                  <p style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text2)' }}>No Analysis Run</p>
                  <p style={{ fontSize: '12px' }}>Enter a valid absorbance reading and biomolecule type to estimate sample concentrations.</p>
                </div>
              )}
            </div>
          )}

          {/* Growth Curve output panel */}
          {activeTab === 'growth' && (
            <div className="tool-pane-card">
              <div className="tool-pane-title">Fitted Growth Parameters</div>

              {growthResult ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Doubling time and growth constants */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="mock-result-box">
                      <div className="mock-result-value">
                        {growthResult.doublingTime} {timeUnit}
                      </div>
                      <div className="mock-result-label">Doubling Time (T_d)</div>
                    </div>
                    <div className="mock-result-box">
                      <div className="mock-result-value">
                        {growthResult.k}
                      </div>
                      <div className="mock-result-label">Growth Constant (k, ln(OD)/t)</div>
                    </div>
                  </div>

                  {/* Goodness of fit (R-squared) */}
                  <div style={{ fontSize: '12.5px', display: 'flex', justifyContent: 'space-between', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: '6px', backgroundColor: 'var(--off)' }}>
                    <span>Goodness of Fit (R² Score)</span>
                    <span style={{ fontWeight: 'bold', color: parseFloat(growthResult.r2) > 0.95 ? 'var(--accent-d)' : 'var(--amber)' }}>
                      {growthResult.r2}
                    </span>
                  </div>

                  {/* SVG Chart visualization */}
                  <div className="sc-chart-box">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 'bold' }}>OD600 Growth Profile</span>
                      <button
                        type="button"
                        className={`bx-tool-btn ${isLogScale ? 'copied' : ''}`}
                        style={{ padding: '3px 8px', fontSize: '11px' }}
                        onClick={() => setIsLogScale(!isLogScale)}
                      >
                        {isLogScale ? 'Logarithmic (ln OD)' : 'Linear OD'}
                      </button>
                    </div>

                    <svg viewBox="0 0 100 90" style={{ width: '100%', height: '180px', backgroundColor: 'var(--off)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                      {/* Grid lines */}
                      <line x1="15" y1="10" x2="15" y2="85" stroke="var(--border)" strokeWidth="1" />
                      <line x1="15" y1="85" x2="95" y2="85" stroke="var(--border)" strokeWidth="1" />
                      <line x1="15" y1="47.5" x2="95" y2="47.5" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="2" />
                      <line x1="55" y1="10" x2="55" y2="85" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="2" />

                      {/* fitted exponential line */}
                      {svgFitLine.length > 1 && (
                        <path
                          d={`M ${svgFitLine.map(p => `${p.x} ${p.y}`).join(' L ')}`}
                          fill="none"
                          stroke="var(--accent)"
                          strokeWidth="2.5"
                        />
                      )}

                      {/* data points scatter */}
                      {svgPoints.map((p, idx) => (
                        <g key={idx}>
                          <circle
                            cx={p.cx}
                            cy={p.cy}
                            r="3.5"
                            fill={p.active ? 'var(--white)' : 'var(--text4)'}
                            stroke={p.active ? 'var(--accent)' : 'var(--border)'}
                            strokeWidth="2.5"
                          />
                        </g>
                      ))}

                      {/* Axis Titles */}
                      <text x="55" y="89" fontSize="3.5" textAnchor="middle" fill="var(--text3)">Time ({timeUnit})</text>
                      <text x="8" y="47" fontSize="3.5" textAnchor="middle" fill="var(--text3)" transform="rotate(-90 8 47)">
                        {isLogScale ? 'ln(OD600)' : 'OD600'}
                      </text>
                    </svg>
                    <p style={{ fontSize: '11px', color: 'var(--text3)', fontStyle: 'italic', marginTop: '6px', textAlign: 'center' }}>
                      *The fitted regression assumes measurements are within the exponential phase.
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="mock-actions-row">
                    <CopyButton text={`Exponential Growth Constant k = ${growthResult.k}\nDoubling time = ${growthResult.doublingTime} ${timeUnit}\nR2 fit quality = ${growthResult.r2}`} />
                    <ExportButton data={getCsvOutput()} filename="growth_curve_regression.csv" format="csv" />
                  </div>
                </div>
              ) : (
                <div className="mock-empty-results">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '44px', height: '44px', color: 'var(--text4)', marginBottom: '10px' }}>
                    <path d="M7 12l3-3 3 3 4-4M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                  <p style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text2)' }}>Growth Fit Unavailable</p>
                  <p style={{ fontSize: '12px' }}>Enter at least 2 time vs OD600 pairs and mark them active to calculate cell growth rate.</p>
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </ToolShell>
  );
}
