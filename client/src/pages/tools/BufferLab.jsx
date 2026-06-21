import React, { useState, useEffect } from 'react';
import ToolShell, { CopyButton, ExportButton } from '../../components/tools/ToolShell';
import { commonReagents } from '../../data/commonReagents';

const BUFFER_PRESETS = [
  { name: 'Acetate Buffer (Acetic Acid / Sodium Acetate)', pKa: 4.76, acidName: 'Acetic Acid', baseName: 'Sodium Acetate', acidMw: 60.05, baseMw: 82.03 },
  { name: 'Tris Buffer (Tris-HCl / Tris Base)', pKa: 8.06, acidName: 'Tris-HCl', baseName: 'Tris Base', acidMw: 157.60, baseMw: 121.14 },
  { name: 'Phosphate Buffer (Monobasic / Dibasic Sodium Phosphate)', pKa: 7.21, acidName: 'Sodium Phosphate (monobasic)', baseName: 'Sodium Phosphate (dibasic)', acidMw: 119.98, baseMw: 141.96 },
  { name: 'HEPES Buffer', pKa: 7.55, acidName: 'HEPES Free Acid', baseName: 'HEPES Sodium Salt', acidMw: 238.30, baseMw: 260.30 },
  { name: 'Custom Buffer (Enter pKa)', pKa: 7.00, acidName: 'Acid Component', baseName: 'Base Component', acidMw: 100.0, baseMw: 100.0 }
];

export default function BufferLab() {
  const [activeTab, setActiveTab] = useState('molarity');

  // Mode 1: Molarity states
  const [reagentIdx, setReagentIdx] = useState(0); // index in commonReagents
  const [manualMw, setManualMw] = useState('');
  const [useManualMw, setUseManualMw] = useState(false);
  const [targetMolarity, setTargetMolarity] = useState('0.1');
  const [molarityUnit, setMolarityUnit] = useState('M'); // M, mM, uM
  const [targetVolume, setTargetVolume] = useState('500');
  const [volumeUnit, setVolumeUnit] = useState('mL'); // L, mL, uL
  const [pctVal, setPctVal] = useState('1'); // percentage state for null-MW items like Agarose

  // Mode 2: Dilution states
  const [solveFor, setSolveFor] = useState('V1'); // V1, V2, C1, C2
  const [c1, setC1] = useState('10');
  const [c1Unit, setC1Unit] = useState('M');
  const [v1, setV1] = useState('');
  const [v1Unit, setV1Unit] = useState('mL');
  const [c2, setC2] = useState('0.1');
  const [c2Unit, setC2Unit] = useState('M');
  const [v2, setV2] = useState('500');
  const [v2Unit, setV2Unit] = useState('mL');
  
  // Serial dilution states
  const [isSerial, setIsSerial] = useState(false);
  const [serialStart, setSerialStart] = useState('1');
  const [serialStartUnit, setSerialStartUnit] = useState('M');
  const [serialFactor, setSerialFactor] = useState('10'); // e.g. 10 for 1:10
  const [serialSteps, setSerialSteps] = useState('5');
  const [serialVol, setSerialVol] = useState('1');
  const [serialVolUnit, setSerialVolUnit] = useState('mL');

  // Mode 3: Buffer pH states
  const [presetIdx, setPresetIdx] = useState(1); // default Tris
  const [customPka, setCustomPka] = useState('7.0');
  const [targetPh, setTargetPh] = useState('8.0');
  const [totalBufferConc, setTotalBufferConc] = useState('50'); // mM
  const [bufferConcUnit, setBufferConcUnit] = useState('mM');
  const [bufferVolume, setBufferVolume] = useState('1000');
  const [bufferVolumeUnit, setBufferVolumeUnit] = useState('mL');
  const [customAcidMw, setCustomAcidMw] = useState('100.0');
  const [customBaseMw, setCustomBaseMw] = useState('100.0');

  // Outputs
  const [molarityResult, setMolarityResult] = useState(null);
  const [dilutionResult, setDilutionResult] = useState(null);
  const [bufferPhResult, setBufferPhResult] = useState(null);
  const [validationError, setValidationError] = useState('');

  // Unit conversion helper (to standard SI: Mol, L)
  const convertToMolar = (val, unit) => {
    const num = parseFloat(val);
    if (isNaN(num)) return 0;
    if (unit === 'M') return num;
    if (unit === 'mM') return num / 1e3;
    if (unit === 'uM') return num / 1e6;
    if (unit === '%') return num; // percentage treated as raw number
    return num;
  };

  const convertToLiters = (val, unit) => {
    const num = parseFloat(val);
    if (isNaN(num)) return 0;
    if (unit === 'L') return num;
    if (unit === 'mL') return num / 1e3;
    if (unit === 'uL') return num / 1e6;
    return num;
  };

  const formatMass = (grams) => {
    if (grams < 1e-3) {
      return `${(grams * 1e6).toFixed(2)} µg`;
    } else if (grams < 1) {
      return `${(grams * 1e3).toFixed(2)} mg`;
    } else {
      return `${grams.toFixed(3)} g`;
    }
  };

  const formatVolume = (liters) => {
    if (liters < 1e-3) {
      return `${(liters * 1e6).toFixed(2)} µL`;
    } else if (liters < 1) {
      return `${(liters * 1e3).toFixed(2)} mL`;
    } else {
      return `${liters.toFixed(3)} L`;
    }
  };

  // Recalculate Mode 1 (Molarity)
  useEffect(() => {
    setValidationError('');
    const selectedReagent = commonReagents[reagentIdx];
    const isPercentageBased = selectedReagent && selectedReagent.mw === null;
    
    if (isPercentageBased) {
      const pct = parseFloat(pctVal);
      const volL = convertToLiters(targetVolume, volumeUnit);
      if (isNaN(pct) || pct <= 0 || isNaN(volL) || volL <= 0) {
        setMolarityResult(null);
        return;
      }
      // % w/v is g / 100 mL, which is 10g / L
      const massGrams = pct * 10 * volL;
      setMolarityResult({
        isPercentage: true,
        reagentName: selectedReagent.name,
        mass: massGrams,
        volume: volL,
        recipe: `Weigh ${massGrams.toFixed(2)} g of ${selectedReagent.name}. Dissolve in distilled water to a final volume of ${formatVolume(volL)}.`
      });
      return;
    }

    // Standard Molarity calculation
    let mw = useManualMw ? parseFloat(manualMw) : (selectedReagent ? selectedReagent.mw : 0);
    const molarity = convertToMolar(targetMolarity, molarityUnit);
    const volL = convertToLiters(targetVolume, volumeUnit);

    if (!mw || isNaN(molarity) || molarity <= 0 || isNaN(volL) || volL <= 0) {
      setMolarityResult(null);
      return;
    }

    const massGrams = molarity * volL * mw;
    const reagentName = useManualMw ? 'Custom Reagent' : selectedReagent.name;

    setMolarityResult({
      isPercentage: false,
      reagentName,
      mw,
      molarity: targetMolarity + ' ' + molarityUnit,
      volume: volL,
      mass: massGrams,
      recipe: `Weigh ${formatMass(massGrams)} of ${reagentName} (MW: ${mw} g/mol). Dissolve in ~80% of the target volume of distilled water (${formatVolume(volL * 0.8)}), adjust concentration, then top off to exactly ${formatVolume(volL)}.`
    });
  }, [reagentIdx, manualMw, useManualMw, targetMolarity, molarityUnit, targetVolume, volumeUnit, pctVal]);

  // Recalculate Mode 2 (Dilution)
  useEffect(() => {
    setValidationError('');
    
    if (isSerial) {
      const start = parseFloat(serialStart);
      const factor = parseFloat(serialFactor);
      const steps = parseInt(serialSteps);
      const stepVolL = convertToLiters(serialVol, serialVolUnit);

      if (isNaN(start) || start <= 0 || isNaN(factor) || factor <= 1 || isNaN(steps) || steps <= 0 || isNaN(stepVolL) || stepVolL <= 0) {
        setDilutionResult(null);
        return;
      }

      const table = [];
      let currentConc = start;
      
      for (let i = 1; i <= steps; i++) {
        // Aliquot needed for next tube
        const nextAliquot = stepVolL / (factor - 1);
        const diluentVol = stepVolL - nextAliquot;

        table.push({
          step: i,
          concentration: `${currentConc.toExponential(3).replace(/e\+0/g, 'e').replace(/e\-0/g, 'e-')} ${serialStartUnit}`,
          aliquot: nextAliquot,
          diluent: diluentVol,
          total: stepVolL
        });

        currentConc = currentConc / factor;
      }

      setDilutionResult({
        isSerial: true,
        steps: table
      });
      return;
    }

    // Standard C1V1 = C2V2
    const c1Val = convertToMolar(c1, c1Unit);
    const v1Val = convertToLiters(v1, v1Unit);
    const c2Val = convertToMolar(c2, c2Unit);
    const v2Val = convertToLiters(v2, v2Unit);

    // Basic range validation
    if (solveFor !== 'C1' && solveFor !== 'C2') {
      const c1Num = parseFloat(c1);
      const c2Num = parseFloat(c2);
      if (!isNaN(c1Num) && !isNaN(c2Num) && c1Unit === c2Unit && c2Num >= c1Num) {
        setValidationError('Final concentration (C2) must be less than stock concentration (C1).');
        setDilutionResult(null);
        return;
      }
    }

    let calculatedVal = 0;
    let recipe = '';

    if (solveFor === 'V1') {
      // V1 = (C2 * V2) / C1
      if (!c1Val || isNaN(c2Val) || isNaN(v2Val)) { setDilutionResult(null); return; }
      calculatedVal = (c2Val * v2Val) / c1Val;
      recipe = `Take ${formatVolume(calculatedVal)} of your ${c1} ${c1Unit} stock solution, add it to the container, and dilute with solvent to a final volume of ${formatVolume(v2Val)} to yield a ${c2} ${c2Unit} solution.`;
      setDilutionResult({ solveFor, val: calculatedVal, unit: 'L', recipe });
    } else if (solveFor === 'V2') {
      // V2 = (C1 * V1) / C2
      if (!c2Val || isNaN(c1Val) || isNaN(v1Val)) { setDilutionResult(null); return; }
      calculatedVal = (c1Val * v1Val) / c2Val;
      recipe = `Dilute your ${formatVolume(v1Val)} of ${c1} ${c1Unit} stock solution to a final volume of ${formatVolume(calculatedVal)} to reach ${c2} ${c2Unit}.`;
      setDilutionResult({ solveFor, val: calculatedVal, unit: 'L', recipe });
    } else if (solveFor === 'C1') {
      // C1 = (C2 * V2) / V1
      if (!v1Val || isNaN(c2Val) || isNaN(v2Val)) { setDilutionResult(null); return; }
      calculatedVal = (c2Val * v2Val) / v1Val;
      recipe = `The required stock concentration (C1) is ${calculatedVal.toFixed(3)} M (or equivalent in other units) to prepare ${formatVolume(v2Val)} of ${c2} ${c2Unit} from ${formatVolume(v1Val)}.`;
      setDilutionResult({ solveFor, val: calculatedVal, unit: c2Unit, recipe });
    } else if (solveFor === 'C2') {
      // C2 = (C1 * V1) / V2
      if (!v2Val || isNaN(c1Val) || isNaN(v1Val)) { setDilutionResult(null); return; }
      calculatedVal = (c1Val * v1Val) / v2Val;
      recipe = `Mixing ${formatVolume(v1Val)} of ${c1} ${c1Unit} stock solution in a final volume of ${formatVolume(v2Val)} will yield a final concentration (C2) of ${calculatedVal.toFixed(4)} M.`;
      setDilutionResult({ solveFor, val: calculatedVal, unit: c1Unit, recipe });
    }
  }, [solveFor, c1, c1Unit, v1, v1Unit, c2, c2Unit, v2, v2Unit, isSerial, serialStart, serialStartUnit, serialFactor, serialSteps, serialVol, serialVolUnit]);

  // Recalculate Mode 3 (Buffer pH)
  useEffect(() => {
    setValidationError('');
    const preset = BUFFER_PRESETS[presetIdx];
    const pKa = presetIdx === BUFFER_PRESETS.length - 1 ? parseFloat(customPka) : preset.pKa;
    const ph = parseFloat(targetPh);
    const totalConcM = convertToMolar(totalBufferConc, bufferConcUnit);
    const volL = convertToLiters(bufferVolume, bufferVolumeUnit);

    const acidMw = presetIdx === BUFFER_PRESETS.length - 1 ? parseFloat(customAcidMw) : preset.acidMw;
    const baseMw = presetIdx === BUFFER_PRESETS.length - 1 ? parseFloat(customBaseMw) : preset.baseMw;

    if (isNaN(pKa) || isNaN(ph) || isNaN(totalConcM) || totalConcM <= 0 || isNaN(volL) || volL <= 0 || isNaN(acidMw) || isNaN(baseMw)) {
      setBufferPhResult(null);
      return;
    }

    // pH = pKa + log([A-]/[HA])
    // ratio = [A-]/[HA] = 10^(pH - pKa)
    const ratio = Math.pow(10, ph - pKa);
    
    // [HA] = C_total / (1 + ratio)
    const acidConc = totalConcM / (1 + ratio);
    const baseConc = totalConcM - acidConc;

    // Masses
    const acidMass = acidConc * volL * acidMw;
    const baseMass = baseConc * volL * baseMw;

    const recipe = `To prepare ${formatVolume(volL)} of ${preset.name.split(' (')[0]} at pH ${ph} (${totalBufferConc} ${bufferConcUnit}):
1. Weigh ${formatMass(acidMass)} of ${preset.acidName} (MW: ${acidMw}).
2. Weigh ${formatMass(baseMass)} of ${preset.baseName} (MW: ${baseMw}).
3. Dissolve both components in ~800 mL of distilled water.
4. Verify pH and adjust with dilute NaOH or HCl if necessary.
5. Bring the final volume to exactly ${formatVolume(volL)} with distilled water.`;

    setBufferPhResult({
      presetName: preset.name,
      acidName: preset.acidName,
      baseName: preset.baseName,
      pKa,
      ratio: ratio.toFixed(3),
      acidConcM: acidConc,
      baseConcM: baseConc,
      acidMass,
      baseMass,
      recipe
    });
  }, [presetIdx, customPka, targetPh, totalBufferConc, bufferConcUnit, bufferVolume, bufferVolumeUnit, customAcidMw, customBaseMw]);

  // SVG Beaker Liquid level calculator
  const getFillPct = () => {
    if (activeTab === 'molarity') {
      const vol = parseFloat(targetVolume);
      if (isNaN(vol) || vol <= 0) return 0;
      // Normalizing: 500mL as middle fill (50%)
      const normalized = volumeUnit === 'L' ? vol * 1000 : volumeUnit === 'uL' ? vol / 1000 : vol;
      return Math.min(95, Math.max(15, (normalized / 1000) * 50 + 20));
    } else if (activeTab === 'dilution') {
      if (isSerial) {
        return 60;
      }
      const v2Num = parseFloat(v2);
      if (isNaN(v2Num) || v2Num <= 0) return 0;
      const normalized = v2Unit === 'L' ? v2Num * 1000 : v2Unit === 'uL' ? v2Num / 1000 : v2Num;
      return Math.min(95, Math.max(15, (normalized / 1000) * 50 + 20));
    } else {
      const vol = parseFloat(bufferVolume);
      if (isNaN(vol) || vol <= 0) return 0;
      const normalized = bufferVolumeUnit === 'L' ? vol * 1000 : bufferVolumeUnit === 'uL' ? vol / 1000 : vol;
      return Math.min(95, Math.max(15, (normalized / 1000) * 50 + 20));
    }
  };

  const getActiveRecipe = () => {
    if (activeTab === 'molarity' && molarityResult) return molarityResult.recipe;
    if (activeTab === 'dilution' && dilutionResult && !dilutionResult.isSerial) return dilutionResult.recipe;
    if (activeTab === 'buffer' && bufferPhResult) return bufferPhResult.recipe;
    return '';
  };

  return (
    <ToolShell slug="bufferlab">
      {/* Dynamic styles for tabs and recipes */}
      <style>{`
        .bufferlab-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .bl-tabs {
          display: flex;
          border-bottom: 2px solid var(--border);
          gap: 16px;
        }
        .bl-tab-btn {
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
        .bl-tab-btn:hover {
          color: var(--accent);
        }
        .bl-tab-btn.active {
          color: var(--accent-d);
        }
        .bl-tab-btn.active::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          right: 0;
          height: 2px;
          background-color: var(--accent);
        }
        .bl-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
        }
        @media (min-width: 1024px) {
          .bl-grid {
            grid-template-columns: 1.3fr 1.7fr;
          }
        }
        .recipe-card {
          background-color: var(--white);
          border: 1px solid var(--border);
          border-top: 4px solid var(--accent);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .recipe-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--text1);
          border-bottom: 1px solid var(--border);
          padding-bottom: 8px;
        }
        .recipe-details {
          white-space: pre-wrap;
          font-family: var(--font-mono, monospace);
          font-size: 13.5px;
          line-height: 1.6;
          background-color: var(--off);
          padding: 16px;
          border-radius: 8px;
          border: 1px solid var(--border);
          color: var(--text1);
        }
        .reagent-info-box {
          font-size: 12.5px;
          color: var(--text3);
          background-color: var(--g50);
          border: 1px solid var(--border2);
          border-radius: 6px;
          padding: 10px 12px;
          line-height: 1.4;
        }
        .unit-select-group {
          display: flex;
          gap: 4px;
        }
        .unit-select-group input {
          flex: 1;
        }
        .unit-select-group select {
          width: 80px;
          flex-shrink: 0;
        }
        .serial-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12.5px;
          text-align: left;
        }
        .serial-table th, .serial-table td {
          padding: 8px 10px;
          border: 1px solid var(--border);
        }
        .serial-table th {
          background-color: var(--off);
          font-weight: 600;
        }
        .beaker-visualizer {
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: var(--off);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 24px;
          min-height: 180px;
        }
        .liquid-wave {
          transition: height 0.5s ease;
        }
        @media print {
          body * {
            visibility: hidden;
          }
          .recipe-card, .recipe-card * {
            visibility: visible;
          }
          .recipe-card {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none;
            box-shadow: none;
            padding: 0;
          }
        }
      `}</style>

      <div className="bufferlab-container">
        {/* Navigation Tabs */}
        <div className="bl-tabs" role="tablist">
          <button
            type="button"
            className={`bl-tab-btn ${activeTab === 'molarity' ? 'active' : ''}`}
            onClick={() => { setActiveTab('molarity'); setIsSerial(false); }}
            role="tab"
            aria-selected={activeTab === 'molarity'}
          >
            Mass for Molarity
          </button>
          <button
            type="button"
            className={`bl-tab-btn ${activeTab === 'dilution' ? 'active' : ''}`}
            onClick={() => setActiveTab('dilution')}
            role="tab"
            aria-selected={activeTab === 'dilution'}
          >
            Dilution (C1V1)
          </button>
          <button
            type="button"
            className={`bl-tab-btn ${activeTab === 'buffer' ? 'active' : ''}`}
            onClick={() => { setActiveTab('buffer'); setIsSerial(false); }}
            role="tab"
            aria-selected={activeTab === 'buffer'}
          >
            Buffer pH (HH)
          </button>
        </div>

        {/* Two Column Layout */}
        <div className="bl-grid">
          
          {/* Left Column: Form Controls */}
          <div className="tool-pane-card">
            
            {/* TAB 1: MASS FOR MOLARITY */}
            {activeTab === 'molarity' && (
              <>
                <div className="tool-pane-title">Molarity Parameters</div>
                
                {/* Compound Selector */}
                <div className="mock-field-group">
                  <label htmlFor="reagent-select" className="mock-label">Select Reagent</label>
                  <select
                    id="reagent-select"
                    className="mock-textarea"
                    style={{ height: '42px', padding: '8px' }}
                    value={reagentIdx}
                    onChange={(e) => {
                      setReagentIdx(parseInt(e.target.value));
                      setUseManualMw(false);
                    }}
                  >
                    {commonReagents.map((item, idx) => (
                      <option key={idx} value={idx}>{item.name} {item.mw ? `(${item.mw} g/mol)` : ''}</option>
                    ))}
                    <option value={commonReagents.length}>Custom Reagent (Manual MW)</option>
                  </select>
                </div>

                {/* Show details for chosen reagent */}
                {reagentIdx < commonReagents.length && (
                  <div className="reagent-info-box">
                    <strong>Note:</strong> {commonReagents[reagentIdx].note}
                  </div>
                )}

                {/* Manual MW Field (Conditional) */}
                {(useManualMw || parseInt(reagentIdx) === commonReagents.length) && (
                  <div className="mock-field-group">
                    <label htmlFor="manual-mw-input" className="mock-label">Molecular Weight (g/mol)</label>
                    <input
                      id="manual-mw-input"
                      type="number"
                      className="mock-textarea"
                      style={{ height: '42px', padding: '8px 12px' }}
                      placeholder="e.g. 58.44"
                      value={manualMw}
                      onChange={(e) => {
                        setManualMw(e.target.value);
                        setUseManualMw(true);
                      }}
                    />
                  </div>
                )}

                {/* Conditional Inputs depending on whether molecular weight is null (Agarose) */}
                {commonReagents[reagentIdx] && commonReagents[reagentIdx].mw === null ? (
                  // Percentage Based
                  <div className="mock-field-group">
                    <label htmlFor="pct-input" className="mock-label">Target Percentage Concentration (% w/v)</label>
                    <input
                      id="pct-input"
                      type="number"
                      className="mock-textarea"
                      style={{ height: '42px', padding: '8px 12px' }}
                      placeholder="e.g. 1.0"
                      value={pctVal}
                      onChange={(e) => setPctVal(e.target.value)}
                    />
                  </div>
                ) : (
                  // Molarity Based
                  <div className="mock-field-group">
                    <label htmlFor="target-molarity-input" className="mock-label">Target Molarity</label>
                    <div className="unit-select-group">
                      <input
                        id="target-molarity-input"
                        type="number"
                        step="any"
                        className="mock-textarea"
                        style={{ height: '42px', padding: '8px 12px' }}
                        value={targetMolarity}
                        onChange={(e) => setTargetMolarity(e.target.value)}
                      />
                      <select
                        id="molarity-unit-select"
                        className="mock-textarea"
                        style={{ height: '42px', padding: '8px' }}
                        value={molarityUnit}
                        onChange={(e) => setMolarityUnit(e.target.value)}
                        aria-label="Molarity unit"
                      >
                        <option value="M">M</option>
                        <option value="mM">mM</option>
                        <option value="uM">µM</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Target Volume */}
                <div className="mock-field-group">
                  <label htmlFor="target-volume-input" className="mock-label">Target Volume</label>
                  <div className="unit-select-group">
                    <input
                      id="target-volume-input"
                      type="number"
                      className="mock-textarea"
                      style={{ height: '42px', padding: '8px 12px' }}
                      value={targetVolume}
                      onChange={(e) => setTargetVolume(e.target.value)}
                    />
                    <select
                      id="volume-unit-select"
                      className="mock-textarea"
                      style={{ height: '42px', padding: '8px' }}
                      value={volumeUnit}
                      onChange={(e) => setVolumeUnit(e.target.value)}
                      aria-label="Volume unit"
                    >
                      <option value="L">L</option>
                      <option value="mL">mL</option>
                      <option value="uL">µL</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* TAB 2: DILUTION CALCULATOR */}
            {activeTab === 'dilution' && (
              <>
                <div className="tool-pane-title">
                  <span>Dilution Parameters</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className={`mock-sample-btn ${!isSerial ? 'active' : ''}`}
                      onClick={() => setIsSerial(false)}
                      style={{ textDecoration: !isSerial ? 'underline' : 'none' }}
                    >
                      Single (C1V1)
                    </button>
                    <button
                      type="button"
                      className={`mock-sample-btn ${isSerial ? 'active' : ''}`}
                      onClick={() => setIsSerial(true)}
                      style={{ textDecoration: isSerial ? 'underline' : 'none' }}
                    >
                      Serial Series
                    </button>
                  </div>
                </div>

                {!isSerial ? (
                  // C1V1 Solve controls
                  <>
                    <div className="mock-field-group">
                      <label htmlFor="solve-for-select" className="mock-label">Solve For (Unknown Variable)</label>
                      <select
                        id="solve-for-select"
                        className="mock-textarea"
                        style={{ height: '42px', padding: '8px' }}
                        value={solveFor}
                        onChange={(e) => setSolveFor(e.target.value)}
                      >
                        <option value="V1">Stock Volume (V1)</option>
                        <option value="V2">Final Volume (V2)</option>
                        <option value="C1">Stock Concentration (C1)</option>
                        <option value="C2">Final Concentration (C2)</option>
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="mock-field-group">
                        <label htmlFor="c1-input" className="mock-label">Stock Conc (C1)</label>
                        <div className="unit-select-group">
                          <input
                            id="c1-input"
                            type="number"
                            className="mock-textarea"
                            style={{ height: '42px', padding: '8px 12px' }}
                            value={c1}
                            onChange={(e) => setC1(e.target.value)}
                            disabled={solveFor === 'C1'}
                          />
                          <select
                            id="c1-unit"
                            className="mock-textarea"
                            style={{ height: '42px', padding: '4px' }}
                            value={c1Unit}
                            onChange={(e) => setC1Unit(e.target.value)}
                            aria-label="C1 Unit"
                          >
                            <option value="M">M</option>
                            <option value="mM">mM</option>
                            <option value="uM">µM</option>
                            <option value="%">%</option>
                          </select>
                        </div>
                      </div>

                      <div className="mock-field-group">
                        <label htmlFor="v1-input" className="mock-label">Stock Vol (V1)</label>
                        <div className="unit-select-group">
                          <input
                            id="v1-input"
                            type="number"
                            className="mock-textarea"
                            style={{ height: '42px', padding: '8px 12px' }}
                            value={v1}
                            onChange={(e) => setV1(e.target.value)}
                            disabled={solveFor === 'V1'}
                          />
                          <select
                            id="v1-unit"
                            className="mock-textarea"
                            style={{ height: '42px', padding: '4px' }}
                            value={v1Unit}
                            onChange={(e) => setV1Unit(e.target.value)}
                            aria-label="V1 Unit"
                          >
                            <option value="L">L</option>
                            <option value="mL">mL</option>
                            <option value="uL">µL</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="mock-field-group">
                        <label htmlFor="c2-input" className="mock-label">Final Conc (C2)</label>
                        <div className="unit-select-group">
                          <input
                            id="c2-input"
                            type="number"
                            className="mock-textarea"
                            style={{ height: '42px', padding: '8px 12px' }}
                            value={c2}
                            onChange={(e) => setC2(e.target.value)}
                            disabled={solveFor === 'C2'}
                          />
                          <select
                            id="c2-unit"
                            className="mock-textarea"
                            style={{ height: '42px', padding: '4px' }}
                            value={c2Unit}
                            onChange={(e) => setC2Unit(e.target.value)}
                            aria-label="C2 Unit"
                          >
                            <option value="M">M</option>
                            <option value="mM">mM</option>
                            <option value="uM">µM</option>
                            <option value="%">%</option>
                          </select>
                        </div>
                      </div>

                      <div className="mock-field-group">
                        <label htmlFor="v2-input" className="mock-label">Final Vol (V2)</label>
                        <div className="unit-select-group">
                          <input
                            id="v2-input"
                            type="number"
                            className="mock-textarea"
                            style={{ height: '42px', padding: '8px 12px' }}
                            value={v2}
                            onChange={(e) => setV2(e.target.value)}
                            disabled={solveFor === 'V2'}
                          />
                          <select
                            id="v2-unit"
                            className="mock-textarea"
                            style={{ height: '42px', padding: '4px' }}
                            value={v2Unit}
                            onChange={(e) => setV2Unit(e.target.value)}
                            aria-label="V2 Unit"
                          >
                            <option value="L">L</option>
                            <option value="mL">mL</option>
                            <option value="uL">µL</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  // Serial dilution series inputs
                  <>
                    <div className="mock-field-group">
                      <label htmlFor="serial-start-input" className="mock-label">Start Concentration</label>
                      <div className="unit-select-group">
                        <input
                          id="serial-start-input"
                          type="number"
                          className="mock-textarea"
                          style={{ height: '42px', padding: '8px 12px' }}
                          value={serialStart}
                          onChange={(e) => setSerialStart(e.target.value)}
                        />
                        <select
                          id="serial-start-unit"
                          className="mock-textarea"
                          style={{ height: '42px', padding: '8px' }}
                          value={serialStartUnit}
                          onChange={(e) => setSerialStartUnit(e.target.value)}
                          aria-label="Start Conc Unit"
                        >
                          <option value="M">M</option>
                          <option value="mM">mM</option>
                          <option value="uM">µM</option>
                          <option value="%">%</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="mock-field-group">
                        <label htmlFor="serial-factor" className="mock-label">Dilution Factor (1:X)</label>
                        <input
                          id="serial-factor"
                          type="number"
                          className="mock-textarea"
                          style={{ height: '42px', padding: '8px 12px' }}
                          placeholder="e.g. 10 for 1:10"
                          value={serialFactor}
                          onChange={(e) => setSerialFactor(e.target.value)}
                        />
                      </div>
                      <div className="mock-field-group">
                        <label htmlFor="serial-steps" className="mock-label">Number of Steps (Tubes)</label>
                        <input
                          id="serial-steps"
                          type="number"
                          min="2"
                          max="15"
                          className="mock-textarea"
                          style={{ height: '42px', padding: '8px 12px' }}
                          value={serialSteps}
                          onChange={(e) => setSerialSteps(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="mock-field-group">
                      <label htmlFor="serial-vol" className="mock-label">Target Volume per Tube</label>
                      <div className="unit-select-group">
                        <input
                          id="serial-vol"
                          type="number"
                          className="mock-textarea"
                          style={{ height: '42px', padding: '8px 12px' }}
                          value={serialVol}
                          onChange={(e) => setSerialVol(e.target.value)}
                        />
                        <select
                          id="serial-vol-unit"
                          className="mock-textarea"
                          style={{ height: '42px', padding: '8px' }}
                          value={serialVolUnit}
                          onChange={(e) => setSerialVolUnit(e.target.value)}
                          aria-label="Tube volume unit"
                        >
                          <option value="L">L</option>
                          <option value="mL">mL</option>
                          <option value="uL">µL</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {/* TAB 3: BUFFER pH CALCULATOR */}
            {activeTab === 'buffer' && (
              <>
                <div className="tool-pane-title">Buffer Systems</div>

                {/* Buffer Preset */}
                <div className="mock-field-group">
                  <label htmlFor="preset-select" className="mock-label">Select Buffer System</label>
                  <select
                    id="preset-select"
                    className="mock-textarea"
                    style={{ height: '42px', padding: '8px' }}
                    value={presetIdx}
                    onChange={(e) => setPresetIdx(parseInt(e.target.value))}
                  >
                    {BUFFER_PRESETS.map((p, idx) => (
                      <option key={idx} value={idx}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Custom pKa (Conditional) */}
                {presetIdx === BUFFER_PRESETS.length - 1 && (
                  <>
                    <div className="mock-field-group">
                      <label htmlFor="custom-pka-input" className="mock-label">Buffer pKa</label>
                      <input
                        id="custom-pka-input"
                        type="number"
                        step="0.01"
                        className="mock-textarea"
                        style={{ height: '42px', padding: '8px 12px' }}
                        value={customPka}
                        onChange={(e) => setCustomPka(e.target.value)}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="mock-field-group">
                        <label htmlFor="custom-acid-mw" className="mock-label">Acid MW (g/mol)</label>
                        <input
                          id="custom-acid-mw"
                          type="number"
                          className="mock-textarea"
                          style={{ height: '42px', padding: '8px 12px' }}
                          value={customAcidMw}
                          onChange={(e) => setCustomAcidMw(e.target.value)}
                        />
                      </div>
                      <div className="mock-field-group">
                        <label htmlFor="custom-base-mw" className="mock-label">Base MW (g/mol)</label>
                        <input
                          id="custom-base-mw"
                          type="number"
                          className="mock-textarea"
                          style={{ height: '42px', padding: '8px 12px' }}
                          value={customBaseMw}
                          onChange={(e) => setCustomBaseMw(e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="mock-field-group">
                    <label htmlFor="target-ph-input" className="mock-label">Target pH</label>
                    <input
                      id="target-ph-input"
                      type="number"
                      step="0.05"
                      min="0"
                      max="14"
                      className="mock-textarea"
                      style={{ height: '42px', padding: '8px 12px' }}
                      value={targetPh}
                      onChange={(e) => setTargetPh(e.target.value)}
                    />
                  </div>
                  <div className="mock-field-group">
                    <label htmlFor="total-conc-input" className="mock-label">Total Concentration</label>
                    <div className="unit-select-group">
                      <input
                        id="total-conc-input"
                        type="number"
                        className="mock-textarea"
                        style={{ height: '42px', padding: '8px 12px' }}
                        value={totalBufferConc}
                        onChange={(e) => setTotalBufferConc(e.target.value)}
                      />
                      <select
                        id="buffer-conc-unit"
                        className="mock-textarea"
                        style={{ height: '42px', padding: '4px' }}
                        value={bufferConcUnit}
                        onChange={(e) => setBufferConcUnit(e.target.value)}
                        aria-label="Buffer concentration unit"
                      >
                        <option value="mM">mM</option>
                        <option value="M">M</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="mock-field-group">
                  <label htmlFor="buffer-vol-input" className="mock-label">Preparation Volume</label>
                  <div className="unit-select-group">
                    <input
                      id="buffer-vol-input"
                      type="number"
                      className="mock-textarea"
                      style={{ height: '42px', padding: '8px 12px' }}
                      value={bufferVolume}
                      onChange={(e) => setBufferVolume(e.target.value)}
                    />
                    <select
                      id="buffer-vol-unit"
                      className="mock-textarea"
                      style={{ height: '42px', padding: '8px' }}
                      value={bufferVolumeUnit}
                      onChange={(e) => setBufferVolumeUnit(e.target.value)}
                      aria-label="Buffer volume unit"
                    >
                      <option value="mL">mL</option>
                      <option value="L">L</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {validationError && (
              <p style={{ color: 'var(--red)', fontSize: '13px', marginTop: '10px', fontWeight: '500' }}>
                ⚠ {validationError}
              </p>
            )}
          </div>

          {/* Right Column: Recipe Card Output / Dynamic Visualizer */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Beaker Filled representation */}
            <div className="beaker-visualizer">
              <svg viewBox="0 0 120 120" style={{ width: '130px', height: '130px' }}>
                {/* Outline */}
                <path d="M 30 20 L 30 100 A 10 10 0 0 0 40 110 L 80 110 A 10 10 0 0 0 90 100 L 90 20" fill="none" stroke="var(--text3)" strokeWidth="3.5" />
                <path d="M 25 20 L 35 20 M 85 20 L 95 20" stroke="var(--text3)" strokeWidth="3.5" strokeLinecap="round" />
                
                {/* Grid markings */}
                <line x1="30" y1="40" x2="45" y2="40" stroke="var(--text4)" strokeWidth="1.5" />
                <text x="50" y="43" fontSize="8" fill="var(--text3)" fontFamily="var(--font-sans)">75%</text>
                <line x1="30" y1="65" x2="45" y2="65" stroke="var(--text4)" strokeWidth="1.5" />
                <text x="50" y="68" fontSize="8" fill="var(--text3)" fontFamily="var(--font-sans)">50%</text>
                <line x1="30" y1="90" x2="45" y2="90" stroke="var(--text4)" strokeWidth="1.5" />
                <text x="50" y="93" fontSize="8" fill="var(--text3)" fontFamily="var(--font-sans)">25%</text>

                {/* Liquid Clip Path */}
                <clipPath id="liquid-clip">
                  <path d="M 31 20 L 31 100 A 9 9 0 0 0 40 109 L 80 109 A 9 9 0 0 0 89 100 L 89 20 Z" />
                </clipPath>

                {/* Liquid fill */}
                <g clipPath="url(#liquid-clip)">
                  <rect
                    x="20"
                    y={110 - getFillPct()}
                    width="80"
                    height="100"
                    fill="var(--accent)"
                    opacity="0.3"
                    className="liquid-wave"
                  />
                  {/* Wave top curve */}
                  <path
                    d={`M 30 ${110 - getFillPct()} Q 60 ${106 - getFillPct()}, 90 ${110 - getFillPct()} L 90 ${120} L 30 ${120} Z`}
                    fill="var(--accent)"
                    opacity="0.45"
                    className="liquid-wave"
                  />
                </g>
              </svg>

              {/* Dilution Tube flow visualizer (shows only on serial dilutions) */}
              {activeTab === 'dilution' && isSerial && dilutionResult && (
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '10px 0', width: '100%' }}>
                  {dilutionResult.steps.slice(0, 5).map((step, idx) => (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '55px', position: 'relative' }}>
                      <svg viewBox="0 0 40 80" style={{ width: '25px', height: '50px' }}>
                        <rect x="10" y="5" width="20" height="60" rx="10" fill="none" stroke="var(--text3)" strokeWidth="2" />
                        <rect x="11" y={65 - (40 / (idx + 1))} width="18" height={40 / (idx + 1)} rx="8" fill="var(--accent)" opacity="0.4" />
                      </svg>
                      <span style={{ fontSize: '9px', fontWeight: 'bold', marginTop: '4px' }}>Tube {step.step}</span>
                      <span style={{ fontSize: '7px', color: 'var(--text3)', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '50px' }}>{step.concentration.split(' ')[0]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Output Details */}
            {activeTab === 'molarity' && molarityResult && (
              <div className="recipe-card">
                <div className="recipe-title">Recipe Card: {molarityResult.reagentName}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="mock-result-box">
                    <div className="mock-result-value">{formatMass(molarityResult.mass)}</div>
                    <div className="mock-result-label">Weight Required</div>
                  </div>
                  <div className="mock-result-box">
                    <div className="mock-result-value">{formatVolume(molarityResult.volume)}</div>
                    <div className="mock-result-label">Total Volume</div>
                  </div>
                </div>
                <div className="recipe-details">{molarityResult.recipe}</div>
                <div className="mock-actions-row">
                  <CopyButton text={getActiveRecipe()} />
                  <button type="button" className="bx-tool-btn" onClick={() => window.print()}>Print Recipe</button>
                </div>
              </div>
            )}

            {activeTab === 'dilution' && dilutionResult && (
              <div className="recipe-card">
                <div className="recipe-title">Dilution Outcome</div>
                
                {isSerial ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="recipe-details" style={{ overflowX: 'auto', padding: '8px' }}>
                      <table className="serial-table">
                        <thead>
                          <tr>
                            <th>Step</th>
                            <th>Target Conc</th>
                            <th>Aliquot Vol</th>
                            <th>Diluent Vol</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dilutionResult.steps.map((s, idx) => (
                            <tr key={idx}>
                              <td><b>{s.step}</b></td>
                              <td>{s.concentration}</td>
                              <td>{formatVolume(s.aliquot)}</td>
                              <td>{formatVolume(s.diluent)}</td>
                              <td>{formatVolume(s.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mock-actions-row">
                      <CopyButton text={dilutionResult.steps.map(s => `Step ${s.step}: Conc = ${s.concentration}, Aliquot = ${formatVolume(s.aliquot)}, Diluent = ${formatVolume(s.diluent)}`).join('\n')} />
                      <ExportButton
                        data={dilutionResult.steps.map(s => `${s.step},${s.concentration},${s.aliquot},${s.diluent},${s.total}`).join('\n')}
                        filename="serial_dilution_table.csv"
                        format="csv"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                      <div className="mock-result-box">
                        <div className="mock-result-value">
                          {dilutionResult.solveFor.startsWith('V') ? formatVolume(dilutionResult.val) : `${dilutionResult.val.toFixed(4)} ${dilutionResult.unit}`}
                        </div>
                        <div className="mock-result-label">Calculated {dilutionResult.solveFor}</div>
                      </div>
                    </div>
                    <div className="recipe-details">{dilutionResult.recipe}</div>
                    <div className="mock-actions-row">
                      <CopyButton text={getActiveRecipe()} />
                      <button type="button" className="bx-tool-btn" onClick={() => window.print()}>Print Recipe</button>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'buffer' && bufferPhResult && (
              <div className="recipe-card">
                <div className="recipe-title">Buffer Recipe: pH {targetPh}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="mock-result-box">
                    <div className="mock-result-value">{formatMass(bufferPhResult.acidMass)}</div>
                    <div className="mock-result-label">{bufferPhResult.acidName}</div>
                  </div>
                  <div className="mock-result-box">
                    <div className="mock-result-value">{formatMass(bufferPhResult.baseMass)}</div>
                    <div className="mock-result-label">{bufferPhResult.baseName}</div>
                  </div>
                </div>
                <div className="recipe-details">{bufferPhResult.recipe}</div>
                <div className="mock-actions-row">
                  <CopyButton text={getActiveRecipe()} />
                  <button type="button" className="bx-tool-btn" onClick={() => window.print()}>Print Recipe</button>
                </div>
              </div>
            )}

            {!molarityResult && !dilutionResult && !bufferPhResult && (
              <div className="mock-empty-results">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '48px', height: '48px', color: 'var(--text4)', marginBottom: '12px' }}>
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
                <p style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text2)', marginBottom: '4px' }}>Fill Inputs to Calculate</p>
                <p style={{ fontSize: '13px', lineHeight: 1.4 }}>Enter standard concentrations or buffer presets on the left to see precise preparation recipes.</p>
              </div>
            )}

          </div>

        </div>
      </div>
    </ToolShell>
  );
}
