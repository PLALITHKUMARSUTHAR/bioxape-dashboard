import React, { useState } from 'react';
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
  const [activeStep, setActiveStep] = useState(1);
  const [subMode, setSubMode] = useState('molarity'); // 'molarity', 'dilution', 'serial', 'buffer'

  // Mode 1: Molarity states
  const [reagentIdx, setReagentIdx] = useState(0);
  const [manualMw, setManualMw] = useState('');
  const [useManualMw, setUseManualMw] = useState(false);
  const [targetMolarity, setTargetMolarity] = useState('0.1');
  const [molarityUnit, setMolarityUnit] = useState('M');
  const [targetVolume, setTargetVolume] = useState('500');
  const [volumeUnit, setVolumeUnit] = useState('mL');
  const [pctVal, setPctVal] = useState('1');

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
  const [serialStart, setSerialStart] = useState('1');
  const [serialStartUnit, setSerialStartUnit] = useState('M');
  const [serialFactor, setSerialFactor] = useState('10');
  const [serialSteps, setSerialSteps] = useState('5');
  const [serialVol, setSerialVol] = useState('1');
  const [serialVolUnit, setSerialVolUnit] = useState('mL');

  // Mode 3: Buffer pH states
  const [presetIdx, setPresetIdx] = useState(1); // Tris
  const [customPka, setCustomPka] = useState('7.0');
  const [targetPh, setTargetPh] = useState('8.0');
  const [totalBufferConc, setTotalBufferConc] = useState('50');
  const [bufferConcUnit, setBufferConcUnit] = useState('mM');
  const [bufferVolume, setBufferVolume] = useState('1000');
  const [bufferVolumeUnit, setBufferVolumeUnit] = useState('mL');
  const [customAcidMw, setCustomAcidMw] = useState('100.0');
  const [customBaseMw, setCustomBaseMw] = useState('100.0');

  // Outputs
  const [results, setResults] = useState(null);
  const [validationError, setValidationError] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);

  const steps = [
    { number: 1, title: 'Inputs & Parameters' },
    { number: 2, title: 'Recipe Card' }
  ];

  // Unit conversion helpers
  const convertToMolar = (val, unit) => {
    const num = parseFloat(val);
    if (isNaN(num)) return 0;
    if (unit === 'M') return num;
    if (unit === 'mM') return num / 1e3;
    if (unit === 'uM') return num / 1e6;
    if (unit === '%') return num;
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

  const runCalculations = () => {
    setValidationError('');
    setIsCalculating(true);

    setTimeout(() => {
      setIsCalculating(false);

      if (subMode === 'molarity') {
        const selectedReagent = commonReagents[reagentIdx] || { name: 'Custom Reagent', mw: parseFloat(manualMw) };
        const isPercentageBased = selectedReagent.mw === null;
        
        if (isPercentageBased) {
          const pct = parseFloat(pctVal);
          const volL = convertToLiters(targetVolume, volumeUnit);
          if (isNaN(pct) || pct <= 0 || isNaN(volL) || volL <= 0) {
            setValidationError('Invalid percentage or volume entries.');
            return;
          }
          const massGrams = pct * 10 * volL;
          setResults({
            mode: 'molarity',
            isPercentage: true,
            reagentName: selectedReagent.name,
            mass: massGrams,
            volume: volL,
            recipe: `Weigh ${massGrams.toFixed(2)} g of ${selectedReagent.name}.\nDissolve in distilled water to a final volume of ${formatVolume(volL)}.`
          });
          setActiveStep(2);
          return;
        }

        let mw = useManualMw ? parseFloat(manualMw) : (selectedReagent ? selectedReagent.mw : 0);
        const molarity = convertToMolar(targetMolarity, molarityUnit);
        const volL = convertToLiters(targetVolume, volumeUnit);

        if (!mw || isNaN(molarity) || molarity <= 0 || isNaN(volL) || volL <= 0) {
          setValidationError('Please specify valid MW, concentration, and volume.');
          return;
        }

        const massGrams = molarity * volL * mw;
        const reagentName = useManualMw ? 'Custom Reagent' : selectedReagent.name;

        setResults({
          mode: 'molarity',
          isPercentage: false,
          reagentName,
          mw,
          molarity: targetMolarity + ' ' + molarityUnit,
          volume: volL,
          mass: massGrams,
          recipe: `Weigh ${formatMass(massGrams)} of ${reagentName} (MW: ${mw} g/mol).\nDissolve in ~80% of the target volume of distilled water (${formatVolume(volL * 0.8)}), adjust pH if necessary, then top off to exactly ${formatVolume(volL)}.`
        });
        setActiveStep(2);

      } else if (subMode === 'dilution') {
        const c1Val = convertToMolar(c1, c1Unit);
        const v1Val = convertToLiters(v1, v1Unit);
        const c2Val = convertToMolar(c2, c2Unit);
        const v2Val = convertToLiters(v2, v2Unit);

        if (solveFor !== 'C1' && solveFor !== 'C2') {
          const c1Num = parseFloat(c1);
          const c2Num = parseFloat(c2);
          if (!isNaN(c1Num) && !isNaN(c2Num) && c1Unit === c2Unit && c2Num >= c1Num) {
            setValidationError('Final concentration (C2) must be less than stock concentration (C1).');
            return;
          }
        }

        let calculatedVal = 0;
        let recipe = '';

        if (solveFor === 'V1') {
          if (!c1Val || isNaN(c2Val) || isNaN(v2Val)) { setValidationError('Missing required dilution variables.'); return; }
          calculatedVal = (c2Val * v2Val) / c1Val;
          recipe = `Take ${formatVolume(calculatedVal)} of your ${c1} ${c1Unit} stock solution, add it to the container, and dilute with solvent to a final volume of ${formatVolume(v2Val)} to yield a ${c2} ${c2Unit} solution.`;
          setResults({ mode: 'dilution', solveFor, val: calculatedVal, unit: 'L', recipe, volume: v2Val });
        } else if (solveFor === 'V2') {
          if (!c2Val || isNaN(c1Val) || isNaN(v1Val)) { setValidationError('Missing required dilution variables.'); return; }
          calculatedVal = (c1Val * v1Val) / c2Val;
          recipe = `Dilute your ${formatVolume(v1Val)} of ${c1} ${c1Unit} stock solution to a final volume of ${formatVolume(calculatedVal)} to reach ${c2} ${c2Unit}.`;
          setResults({ mode: 'dilution', solveFor, val: calculatedVal, unit: 'L', recipe, volume: calculatedVal });
        } else if (solveFor === 'C1') {
          if (!v1Val || isNaN(c2Val) || isNaN(v2Val)) { setValidationError('Missing required dilution variables.'); return; }
          calculatedVal = (c2Val * v2Val) / v1Val;
          recipe = `The required stock concentration (C1) is ${calculatedVal.toFixed(3)} M (or equivalent in other units) to prepare ${formatVolume(v2Val)} of ${c2} ${c2Unit} from ${formatVolume(v1Val)}.`;
          setResults({ mode: 'dilution', solveFor, val: calculatedVal, unit: c2Unit, recipe, volume: v2Val });
        } else if (solveFor === 'C2') {
          if (!v2Val || isNaN(c1Val) || isNaN(v1Val)) { setValidationError('Missing required dilution variables.'); return; }
          calculatedVal = (c1Val * v1Val) / v2Val;
          recipe = `Mixing ${formatVolume(v1Val)} of ${c1} ${c1Unit} stock solution in a final volume of ${formatVolume(v2Val)} will yield a final concentration (C2) of ${calculatedVal.toFixed(4)} M.`;
          setResults({ mode: 'dilution', solveFor, val: calculatedVal, unit: c1Unit, recipe, volume: v2Val });
        }
        setActiveStep(2);

      } else if (subMode === 'serial') {
        const start = parseFloat(serialStart);
        const factor = parseFloat(serialFactor);
        const stepsCount = parseInt(serialSteps);
        const stepVolL = convertToLiters(serialVol, serialVolUnit);

        if (isNaN(start) || start <= 0 || isNaN(factor) || factor <= 1 || isNaN(stepsCount) || stepsCount <= 0 || isNaN(stepVolL) || stepVolL <= 0) {
          setValidationError('Please configure start concentration, factors, and volume per tube.');
          return;
        }

        const table = [];
        let currentConc = start;
        
        for (let i = 1; i <= stepsCount; i++) {
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

        setResults({
          mode: 'serial',
          steps: table,
          volume: stepVolL
        });
        setActiveStep(2);

      } else if (subMode === 'buffer') {
        const preset = BUFFER_PRESETS[presetIdx];
        const pKa = presetIdx === BUFFER_PRESETS.length - 1 ? parseFloat(customPka) : preset.pKa;
        const ph = parseFloat(targetPh);
        const totalConcM = convertToMolar(totalBufferConc, bufferConcUnit);
        const volL = convertToLiters(bufferVolume, bufferVolumeUnit);

        const acidMw = presetIdx === BUFFER_PRESETS.length - 1 ? parseFloat(customAcidMw) : preset.acidMw;
        const baseMw = presetIdx === BUFFER_PRESETS.length - 1 ? parseFloat(customBaseMw) : preset.baseMw;

        if (isNaN(pKa) || isNaN(ph) || isNaN(totalConcM) || totalConcM <= 0 || isNaN(volL) || volL <= 0 || isNaN(acidMw) || isNaN(baseMw)) {
          setValidationError('Please specify pH, pKa, target volume, and chemical MWs.');
          return;
        }

        const ratio = Math.pow(10, ph - pKa);
        const acidConc = totalConcM / (1 + ratio);
        const baseConc = totalConcM - acidConc;

        const acidMass = acidConc * volL * acidMw;
        const baseMass = baseConc * volL * baseMw;

        const recipe = `To prepare ${formatVolume(volL)} of ${preset.name.split(' (')[0]} at pH ${ph} (${totalBufferConc} ${bufferConcUnit}):\n1. Weigh ${formatMass(acidMass)} of ${preset.acidName} (MW: ${acidMw}).\n2. Weigh ${formatMass(baseMass)} of ${preset.baseName} (MW: ${baseMw}).\n3. Dissolve both components in ~80% of volume (${formatVolume(volL * 0.8)}) with distilled water.\n4. Verify pH and adjust with dilute NaOH or HCl if necessary.\n5. Bring the final volume to exactly ${formatVolume(volL)} with distilled water.`;

        setResults({
          mode: 'buffer',
          presetName: preset.name,
          acidName: preset.acidName,
          baseName: preset.baseName,
          pKa,
          ratio: ratio.toFixed(3),
          acidConcM: acidConc,
          baseConcM: baseConc,
          acidMass,
          baseMass,
          recipe,
          volume: volL
        });
        setActiveStep(2);
      }
    }, 800);
  };

  const getFillPct = () => {
    if (!results || !results.volume) return 50;
    const volL = results.volume;
    return Math.min(95, Math.max(15, (volL * 1000) / 1000 * 50 + 20));
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
    <ToolShell slug="bufferlab">
      {renderStepTracker()}
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        {/* Step 1: Inputs & Parameters */}
        {activeStep === 1 && (
          <div className="bx-step-section">
            <div className="bx-step-header">
              <span className="bx-step-badge">Step 1</span>
              <h3 className="bx-step-title">Select Mode & Configure Parameters</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <button
                type="button"
                className={`bx-tool-btn ${subMode === 'molarity' ? 'copied' : ''}`}
                onClick={() => setSubMode('molarity')}
                style={{ padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', height: '90px', justifyContent: 'center' }}
              >
                <strong style={{ fontSize: '14px', marginBottom: '2px' }}>Mass for Molarity</strong>
                Prepare solution from solid mass
              </button>
              <button
                type="button"
                className={`bx-tool-btn ${subMode === 'dilution' ? 'copied' : ''}`}
                onClick={() => setSubMode('dilution')}
                style={{ padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', height: '90px', justifyContent: 'center' }}
              >
                <strong style={{ fontSize: '14px', marginBottom: '2px' }}>Dilution (C1V1)</strong>
                Dilute stock solutions
              </button>
              <button
                type="button"
                className={`bx-tool-btn ${subMode === 'serial' ? 'copied' : ''}`}
                onClick={() => setSubMode('serial')}
                style={{ padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', height: '90px', justifyContent: 'center' }}
              >
                <strong style={{ fontSize: '14px', marginBottom: '2px' }}>Serial Dilution</strong>
                Dilution series steps
              </button>
              <button
                type="button"
                className={`bx-tool-btn ${subMode === 'buffer' ? 'copied' : ''}`}
                onClick={() => setSubMode('buffer')}
                style={{ padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', height: '90px', justifyContent: 'center' }}
              >
                <strong style={{ fontSize: '14px', marginBottom: '2px' }}>Buffer pH (HH)</strong>
                Henderson-Hasselbalch system
              </button>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              {/* Molarity inputs */}
              {subMode === 'molarity' && (
                <>
                  <div className="bx-field-group">
                    <label htmlFor="reagent-select" className="bx-label">Select Reagent</label>
                    <select
                      id="reagent-select"
                      className="bx-select"
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

                  {commonReagents[reagentIdx] && (
                    <div style={{ fontSize: '12px', color: 'var(--text3)', background: 'var(--off)', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', marginBottom: '12px' }}>
                      {commonReagents[reagentIdx].note}
                    </div>
                  )}

                  {(useManualMw || parseInt(reagentIdx) === commonReagents.length) && (
                    <div className="bx-field-group">
                      <label htmlFor="manual-mw-input" className="bx-label">Molecular Weight (g/mol)</label>
                      <input
                        id="manual-mw-input"
                        type="number"
                        className="bx-input"
                        value={manualMw}
                        onChange={(e) => {
                          setManualMw(e.target.value);
                          setUseManualMw(true);
                        }}
                      />
                    </div>
                  )}

                  {commonReagents[reagentIdx] && commonReagents[reagentIdx].mw === null ? (
                    <div className="bx-field-group">
                      <label htmlFor="pct-input" className="bx-label">Target Percent Concentration (% w/v)</label>
                      <input
                        id="pct-input"
                        type="number"
                        className="bx-input"
                        value={pctVal}
                        onChange={(e) => setPctVal(e.target.value)}
                      />
                    </div>
                  ) : (
                    <div className="bx-field-group">
                      <label htmlFor="target-molarity-input" className="bx-label">Target Concentration</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          id="target-molarity-input"
                          type="number"
                          className="bx-input"
                          value={targetMolarity}
                          onChange={(e) => setTargetMolarity(e.target.value)}
                        />
                        <select
                          id="molarity-unit-select"
                          className="bx-select"
                          style={{ width: '80px' }}
                          value={molarityUnit}
                          onChange={(e) => setMolarityUnit(e.target.value)}
                        >
                          <option value="M">M</option>
                          <option value="mM">mM</option>
                          <option value="uM">µM</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="bx-field-group">
                    <label htmlFor="target-volume-input" className="bx-label">Target Volume</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        id="target-volume-input"
                        type="number"
                        className="bx-input"
                        value={targetVolume}
                        onChange={(e) => setTargetVolume(e.target.value)}
                      />
                      <select
                        id="volume-unit-select"
                        className="bx-select"
                        style={{ width: '80px' }}
                        value={volumeUnit}
                        onChange={(e) => setVolumeUnit(e.target.value)}
                      >
                        <option value="mL">mL</option>
                        <option value="L">L</option>
                        <option value="uL">µL</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Dilution inputs */}
              {subMode === 'dilution' && (
                <>
                  <div className="bx-field-group">
                    <label htmlFor="solve-for-select" className="bx-label">Unknown Variable (Solve For)</label>
                    <select
                      id="solve-for-select"
                      className="bx-select"
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
                    <div className="bx-field-group">
                      <label htmlFor="c1-input" className="bx-label">Stock Conc (C1)</label>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <input
                          id="c1-input"
                          type="number"
                          className="bx-input"
                          value={c1}
                          onChange={(e) => setC1(e.target.value)}
                          disabled={solveFor === 'C1'}
                        />
                        <select
                          id="c1-unit"
                          className="bx-select"
                          value={c1Unit}
                          onChange={(e) => setC1Unit(e.target.value)}
                        >
                          <option value="M">M</option>
                          <option value="mM">mM</option>
                          <option value="uM">µM</option>
                          <option value="%">%</option>
                        </select>
                      </div>
                    </div>

                    <div className="bx-field-group">
                      <label htmlFor="v1-input" className="bx-label">Stock Volume (V1)</label>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <input
                          id="v1-input"
                          type="number"
                          className="bx-input"
                          value={v1}
                          onChange={(e) => setV1(e.target.value)}
                          disabled={solveFor === 'V1'}
                        />
                        <select
                          id="v1-unit"
                          className="bx-select"
                          value={v1Unit}
                          onChange={(e) => setV1Unit(e.target.value)}
                        >
                          <option value="mL">mL</option>
                          <option value="L">L</option>
                          <option value="uL">µL</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="bx-field-group">
                      <label htmlFor="c2-input" className="bx-label">Final Conc (C2)</label>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <input
                          id="c2-input"
                          type="number"
                          className="bx-input"
                          value={c2}
                          onChange={(e) => setC2(e.target.value)}
                          disabled={solveFor === 'C2'}
                        />
                        <select
                          id="c2-unit"
                          className="bx-select"
                          value={c2Unit}
                          onChange={(e) => setC2Unit(e.target.value)}
                        >
                          <option value="M">M</option>
                          <option value="mM">mM</option>
                          <option value="uM">µM</option>
                          <option value="%">%</option>
                        </select>
                      </div>
                    </div>

                    <div className="bx-field-group">
                      <label htmlFor="v2-input" className="bx-label">Final Volume (V2)</label>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <input
                          id="v2-input"
                          type="number"
                          className="bx-input"
                          value={v2}
                          onChange={(e) => setV2(e.target.value)}
                          disabled={solveFor === 'V2'}
                        />
                        <select
                          id="v2-unit"
                          className="bx-select"
                          value={v2Unit}
                          onChange={(e) => setV2Unit(e.target.value)}
                        >
                          <option value="mL">mL</option>
                          <option value="L">L</option>
                          <option value="uL">µL</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Serial inputs */}
              {subMode === 'serial' && (
                <>
                  <div className="bx-field-group">
                    <label htmlFor="serial-start-input" className="bx-label">Start Stock Concentration</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        id="serial-start-input"
                        type="number"
                        className="bx-input"
                        value={serialStart}
                        onChange={(e) => setSerialStart(e.target.value)}
                      />
                      <select
                        id="serial-start-unit"
                        className="bx-select"
                        value={serialStartUnit}
                        onChange={(e) => setSerialStartUnit(e.target.value)}
                      >
                        <option value="M">M</option>
                        <option value="mM">mM</option>
                        <option value="uM">µM</option>
                        <option value="%">%</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="bx-field-group">
                      <label htmlFor="serial-factor" className="bx-label">Dilution Factor (1:X)</label>
                      <input
                        id="serial-factor"
                        type="number"
                        className="bx-input"
                        value={serialFactor}
                        onChange={(e) => setSerialFactor(e.target.value)}
                      />
                    </div>
                    <div className="bx-field-group">
                      <label htmlFor="serial-steps" className="bx-label">Tubes count (Steps)</label>
                      <input
                        id="serial-steps"
                        type="number"
                        className="bx-input"
                        value={serialSteps}
                        onChange={(e) => setSerialSteps(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="bx-field-group">
                    <label htmlFor="serial-vol" className="bx-label">Target Volume per tube</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        id="serial-vol"
                        type="number"
                        className="bx-input"
                        value={serialVol}
                        onChange={(e) => setSerialVol(e.target.value)}
                      />
                      <select
                        id="serial-vol-unit"
                        className="bx-select"
                        value={serialVolUnit}
                        onChange={(e) => setSerialVolUnit(e.target.value)}
                      >
                        <option value="mL">mL</option>
                        <option value="L">L</option>
                        <option value="uL">µL</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Buffer Presets inputs */}
              {subMode === 'buffer' && (
                <>
                  <div className="bx-field-group">
                    <label htmlFor="preset-select" className="bx-label">Buffer Presets</label>
                    <select
                      id="preset-select"
                      className="bx-select"
                      value={presetIdx}
                      onChange={(e) => setPresetIdx(parseInt(e.target.value))}
                    >
                      {BUFFER_PRESETS.map((p, idx) => (
                        <option key={idx} value={idx}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  {presetIdx === BUFFER_PRESETS.length - 1 && (
                    <>
                      <div className="bx-field-group">
                        <label htmlFor="custom-pka-input" className="bx-label">Buffer system pKa</label>
                        <input
                          id="custom-pka-input"
                          type="number"
                          step="0.01"
                          className="bx-input"
                          value={customPka}
                          onChange={(e) => setCustomPka(e.target.value)}
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="bx-field-group">
                          <label htmlFor="custom-acid-mw" className="bx-label">Acid MW (g/mol)</label>
                          <input
                            id="custom-acid-mw"
                            type="number"
                            className="bx-input"
                            value={customAcidMw}
                            onChange={(e) => setCustomAcidMw(e.target.value)}
                          />
                        </div>
                        <div className="bx-field-group">
                          <label htmlFor="custom-base-mw" className="bx-label">Base MW (g/mol)</label>
                          <input
                            id="custom-base-mw"
                            type="number"
                            className="bx-input"
                            value={customBaseMw}
                            onChange={(e) => setCustomBaseMw(e.target.value)}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="bx-field-group">
                      <label htmlFor="target-ph-input" className="bx-label">Target pH</label>
                      <input
                        id="target-ph-input"
                        type="number"
                        step="0.05"
                        className="bx-input"
                        value={targetPh}
                        onChange={(e) => setTargetPh(e.target.value)}
                      />
                    </div>
                    <div className="bx-field-group">
                      <label htmlFor="total-conc-input" className="bx-label">Total Concentration</label>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <input
                          id="total-conc-input"
                          type="number"
                          className="bx-input"
                          value={totalBufferConc}
                          onChange={(e) => setTotalBufferConc(e.target.value)}
                        />
                        <select
                          id="buffer-conc-unit"
                          className="bx-select"
                          value={bufferConcUnit}
                          onChange={(e) => setBufferConcUnit(e.target.value)}
                        >
                          <option value="mM">mM</option>
                          <option value="M">M</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="bx-field-group">
                    <label htmlFor="buffer-vol-input" className="bx-label">Preparation Volume</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        id="buffer-vol-input"
                        type="number"
                        className="bx-input"
                        value={bufferVolume}
                        onChange={(e) => setBufferVolume(e.target.value)}
                      />
                      <select
                        id="buffer-vol-unit"
                        className="bx-select"
                        value={bufferVolumeUnit}
                        onChange={(e) => setBufferVolumeUnit(e.target.value)}
                      >
                        <option value="mL">mL</option>
                        <option value="L">L</option>
                      </select>
                    </div>
                  </div>
                </>
              )}
            </div>

            {validationError && (
              <p style={{ color: 'var(--red)', fontSize: '13px', marginTop: '12px', fontWeight: '600' }}>
                ⚠ {validationError}
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                type="button"
                className="bx-btn-primary"
                onClick={runCalculations}
                disabled={isCalculating}
              >
                {isCalculating ? (
                  <>
                    <svg style={{ animation: 'spin 1s infinite linear', width: '16px', height: '16px', stroke: 'currentColor', fill: 'none', marginRight: '6px' }} viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" strokeWidth="2.5" strokeDasharray="32" strokeDashoffset="12"/>
                    </svg>
                    Solving concentrations...
                  </>
                ) : (
                  'Generate Recipe Card'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Recipe Output Card */}
        {activeStep === 2 && results && (
          <div className="bx-step-section" style={{ alignItems: 'stretch' }}>
            <div className="bx-step-header">
              <span className="bx-step-badge">Step 2</span>
              <h3 className="bx-step-title">Preparation Recipe Card</h3>
            </div>

            {/* Beaker Representation side-by-side or centering */}
            <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0', background: 'var(--off)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <svg viewBox="0 0 120 120" style={{ width: '110px', height: '110px' }}>
                <path d="M 30 20 L 30 100 A 10 10 0 0 0 40 110 L 80 110 A 10 10 0 0 0 90 100 L 90 20" fill="none" stroke="var(--text3)" strokeWidth="3" />
                <path d="M 25 20 L 35 20 M 85 20 L 95 20" stroke="var(--text3)" strokeWidth="3" strokeLinecap="round" />
                
                <line x1="30" y1="40" x2="42" y2="40" stroke="var(--text4)" strokeWidth="1.2" />
                <text x="46" y="43" fontSize="7.5" fill="var(--text3)" fontFamily="var(--font-mono)">75%</text>
                <line x1="30" y1="65" x2="42" y2="65" stroke="var(--text4)" strokeWidth="1.2" />
                <text x="46" y="68" fontSize="7.5" fill="var(--text3)" fontFamily="var(--font-mono)">50%</text>
                <line x1="30" y1="90" x2="42" y2="90" stroke="var(--text4)" strokeWidth="1.2" />
                <text x="46" y="93" fontSize="7.5" fill="var(--text3)" fontFamily="var(--font-mono)">25%</text>

                <clipPath id="beaker-clip">
                  <path d="M 31 20 L 31 100 A 9 9 0 0 0 40 109 L 80 109 A 9 9 0 0 0 89 100 L 89 20 Z" />
                </clipPath>

                <g clipPath="url(#beaker-clip)">
                  <rect
                    x="20"
                    y={110 - getFillPct()}
                    width="80"
                    height="100"
                    fill="var(--accent)"
                    opacity="0.3"
                  />
                  <path
                    d={`M 30 ${110 - getFillPct()} Q 60 ${106 - getFillPct()}, 90 ${110 - getFillPct()} L 90 ${120} L 30 ${120} Z`}
                    fill="var(--accent)"
                    opacity="0.45"
                  />
                </g>
              </svg>
            </div>

            {/* Render results depending on mode */}
            {results.mode === 'molarity' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="bx-result-grid">
                  <div className="bx-result-box">
                    <div className="bx-result-val">{formatMass(results.mass)}</div>
                    <div className="bx-result-lbl">Mass required</div>
                  </div>
                  <div className="bx-result-box">
                    <div className="bx-result-val">{formatVolume(results.volume)}</div>
                    <div className="bx-result-lbl">Final Volume</div>
                  </div>
                </div>
                <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)', fontSize: '13px', lineHeight: '1.6', background: 'var(--off)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border)', color: 'var(--text1)' }}>
                  {results.recipe}
                </div>
              </div>
            )}

            {results.mode === 'dilution' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="bx-result-box">
                  <div className="bx-result-val">
                    {results.solveFor.startsWith('V') ? formatVolume(results.val) : `${results.val.toFixed(4)} ${results.unit}`}
                  </div>
                  <div className="bx-result-lbl">Calculated {results.solveFor}</div>
                </div>
                <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)', fontSize: '13px', lineHeight: '1.6', background: 'var(--off)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border)', color: 'var(--text1)' }}>
                  {results.recipe}
                </div>
              </div>
            )}

            {results.mode === 'serial' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '6px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--off)', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '8px' }}>Step</th>
                        <th style={{ padding: '8px' }}>Target Conc</th>
                        <th style={{ padding: '8px' }}>Aliquot Vol</th>
                        <th style={{ padding: '8px' }}>Diluent Vol</th>
                        <th style={{ padding: '8px' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.steps.map((s, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '8px' }}><b>{s.step}</b></td>
                          <td style={{ padding: '8px' }}>{s.concentration}</td>
                          <td style={{ padding: '8px' }}>{formatVolume(s.aliquot)}</td>
                          <td style={{ padding: '8px' }}>{formatVolume(s.diluent)}</td>
                          <td style={{ padding: '8px' }}>{formatVolume(s.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {results.mode === 'buffer' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="bx-result-grid">
                  <div className="bx-result-box">
                    <div className="bx-result-val">{formatMass(results.acidMass)}</div>
                    <div className="bx-result-lbl">{results.acidName} (Acid)</div>
                  </div>
                  <div className="bx-result-box">
                    <div className="bx-result-val">{formatMass(results.baseMass)}</div>
                    <div className="bx-result-lbl">{results.baseName} (Base)</div>
                  </div>
                </div>
                <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)', fontSize: '13px', lineHeight: '1.6', background: 'var(--off)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border)', color: 'var(--text1)' }}>
                  {results.recipe}
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '12px' }}>
              <CopyButton text={results.recipe || results.steps?.map(s => `Step ${s.step}: Conc = ${s.concentration}, Aliquot = ${formatVolume(s.aliquot)}, Diluent = ${formatVolume(s.diluent)}`).join('\n') || ''} />
              {results.mode === 'serial' ? (
                <ExportButton
                  data={results.steps.map(s => `${s.step},${s.concentration},${s.aliquot},${s.diluent},${s.total}`).join('\n')}
                  filename="serial_dilution_table.csv"
                  format="csv"
                />
              ) : (
                <button type="button" className="bx-tool-btn" onClick={() => window.print()}>Print Recipe</button>
              )}
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
