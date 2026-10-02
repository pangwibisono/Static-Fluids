import React, { useState, useEffect, useRef } from 'react';
import { MathView } from '../MathView.tsx';
import { UnitType, convertPressure, HYDRAULIC_PRESETS, HydraulicPreset } from '../../types.ts';
import { Cog, Car, Disc, Hammer, ArrowDown, ArrowUp, RefreshCw, Zap } from 'lucide-react';

interface HydraulicLiftProps {
  selectedUnit: UnitType;
}

export const HydraulicLift: React.FC<HydraulicLiftProps> = ({ selectedUnit }) => {
  // Preset selection
  const [selectedPresetId, setSelectedPresetId] = useState<string>('car_jack');

  // Piston Areas (m^2)
  const [a1, setA1] = useState<number>(0.01); // Small Piston Area (m^2)
  const [a2, setA2] = useState<number>(1.00); // Large Piston Area (m^2)

  // Input Force (N)
  const [f1, setF1] = useState<number>(150); // N

  // Piston 1 displacement (d1 in centimeters)
  const [d1Cm, setD1Cm] = useState<number>(25); // 0 to 50 cm

  // Lift animation state (when pumping)
  const [isPumping, setIsPumping] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Derived physics values
  const mechanicalAdvantage = a2 / a1; // MA
  const pressurePa = a1 > 0 ? f1 / a1 : 0; // P = F1 / A1 (Pa)
  const f2 = f1 * mechanicalAdvantage; // F2 = F1 * (A2 / A1) (N)

  // Displacement d2 = d1 * (A1 / A2)
  const d1Meters = d1Cm * 0.01;
  const d2Meters = d1Meters * (a1 / a2);
  const d2Cm = d2Meters * 100;

  // Work done (Joules): W1 = F1 * d1, W2 = F2 * d2
  const work1 = f1 * d1Meters;
  const work2 = f2 * d2Meters;

  // Maximum liftable mass (kg) at equilibrium (F2 = m * g)
  const maxMassLiftableKg = f2 / 9.80;

  const convertedPressure = convertPressure(pressurePa, selectedUnit);
  const activePreset = HYDRAULIC_PRESETS.find((p) => p.id === selectedPresetId) || HYDRAULIC_PRESETS[0];

  // Handle Preset selection
  const handleSelectPreset = (preset: HydraulicPreset) => {
    setSelectedPresetId(preset.id);
    setA1(preset.a1);
    setA2(preset.a2);
    setF1(preset.f1);
    setD1Cm(20);
  };

  // Pumping animation action
  const handlePump = () => {
    if (isPumping) return;
    setIsPumping(true);
    let startVal = d1Cm;
    let target = Math.min(50, d1Cm + 10);
    if (d1Cm >= 45) {
      target = 5;
    }

    let progress = 0;
    const interval = setInterval(() => {
      progress += 0.08;
      if (progress >= 1) {
        setD1Cm(target);
        setIsPumping(false);
        clearInterval(interval);
      } else {
        setD1Cm(startVal + (target - startVal) * progress);
      }
    }, 16);
  };

  // Canvas drawing loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.clearRect(0, 0, width, height);

      // Geometric layout for two connected cylinders (U-tube configuration)
      const baseGroundY = 410;
      const pipeBottomY = baseGroundY - 20;
      const pipeInnerBottomY = pipeBottomY - 45;

      // Small Cylinder 1 (Left)
      const cyl1CenterX = 130;
      // Cylinder width proportional to sqrt(Area)
      const cyl1Width = Math.max(45, Math.min(80, 50 * Math.sqrt(a1 / 0.01)));
      const cyl1Left = cyl1CenterX - cyl1Width / 2;
      const cyl1Right = cyl1CenterX + cyl1Width / 2;

      // Large Cylinder 2 (Right)
      const cyl2CenterX = width - 180;
      const cyl2Width = Math.max(120, Math.min(240, 120 * Math.sqrt(a2 / 0.5)));
      const cyl2Left = cyl2CenterX - cyl2Width / 2;
      const cyl2Right = cyl2CenterX + cyl2Width / 2;

      // Heights & Piston positions
      const neutralFluidY = 250;
      // Piston 1 moves down proportionally to d1Cm (0 to 50 cm mapped to 0 to 110 px)
      const p1DispPx = (d1Cm / 50) * 110;
      const p1Y = neutralFluidY + p1DispPx;

      // Piston 2 moves up proportionally to d2Cm
      // Volume conservation: dy2 = dy1 * (cyl1Width / cyl2Width)
      const p2DispPx = p1DispPx * (cyl1Width / cyl2Width);
      const p2Y = neutralFluidY - p2DispPx;

      // 1. Draw Connecting Fluid (Ruby hydraulic oil / blue fluid)
      ctx.save();
      const fluidGrad = ctx.createLinearGradient(0, neutralFluidY - 50, 0, pipeBottomY);
      fluidGrad.addColorStop(0, '#38bdf8');
      fluidGrad.addColorStop(1, '#0284c7');
      ctx.fillStyle = fluidGrad;

      ctx.beginPath();
      // Left fluid column
      ctx.moveTo(cyl1Left, p1Y);
      ctx.lineTo(cyl1Left, pipeBottomY);
      // Bottom connector pipe
      ctx.lineTo(cyl2Right, pipeBottomY);
      // Right fluid column
      ctx.lineTo(cyl2Right, p2Y);
      ctx.lineTo(cyl2Left, p2Y);
      ctx.lineTo(cyl2Left, pipeInnerBottomY);
      ctx.lineTo(cyl1Right, pipeInnerBottomY);
      ctx.lineTo(cyl1Right, p1Y);
      ctx.closePath();
      ctx.fill();

      // Fluid pressure motion particles / flow arrows
      const time = performance.now() * 0.002;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      for (let i = 0; i < 6; i++) {
        const px = cyl1Right + ((cyl2Left - cyl1Right) / 6) * i + ((time * 30) % 25);
        if (px < cyl2Left) {
          ctx.beginPath();
          ctx.arc(px, (pipeBottomY + pipeInnerBottomY) / 2, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();

      // 2. Draw Cylinder Walls & Chamber Piping
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 4;
      ctx.lineJoin = 'round';

      // Left Cylinder outer walls
      ctx.beginPath();
      ctx.moveTo(cyl1Left, 110);
      ctx.lineTo(cyl1Left, pipeBottomY);
      ctx.lineTo(cyl2Right, pipeBottomY);
      ctx.lineTo(cyl2Right, 110);
      ctx.stroke();

      // Inner connecting bend
      ctx.beginPath();
      ctx.moveTo(cyl1Right, 110);
      ctx.lineTo(cyl1Right, pipeInnerBottomY);
      ctx.lineTo(cyl2Left, pipeInnerBottomY);
      ctx.lineTo(cyl2Left, 110);
      ctx.stroke();

      // 3. Draw Small Piston 1
      const pistonHeight = 18;
      ctx.save();
      ctx.fillStyle = '#64748b';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(cyl1Left + 2, p1Y - pistonHeight, cyl1Width - 4, pistonHeight, 3);
      ctx.fill();
      ctx.stroke();

      // Piston 1 Rod / Shaft
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(cyl1CenterX - 5, 80, 10, p1Y - pistonHeight - 80);
      ctx.strokeRect(cyl1CenterX - 5, 80, 10, p1Y - pistonHeight - 80);

      // Piston 1 Input Force Arrow (F1 Downwards)
      drawPistonArrow(ctx, cyl1CenterX, 45, cyl1CenterX, 85, '#dc2626', `F₁ = ${f1.toFixed(0)} N`);
      ctx.restore();

      // 4. Draw Large Piston 2
      ctx.save();
      ctx.fillStyle = '#475569';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(cyl2Left + 2, p2Y - pistonHeight, cyl2Width - 4, pistonHeight, 4);
      ctx.fill();
      ctx.stroke();

      // Piston 2 Rod / Platform
      ctx.fillStyle = '#94a3b8';
      const rodWidth = Math.min(28, cyl2Width * 0.25);
      ctx.fillRect(cyl2CenterX - rodWidth / 2, p2Y - pistonHeight - 35, rodWidth, 35);
      ctx.strokeRect(cyl2CenterX - rodWidth / 2, p2Y - pistonHeight - 35, rodWidth, 35);

      // Lift Platform
      const platWidth = cyl2Width * 0.9;
      const platTopY = p2Y - pistonHeight - 35;
      ctx.fillStyle = '#334155';
      ctx.fillRect(cyl2CenterX - platWidth / 2, platTopY - 8, platWidth, 8);

      // Car or Load Representation on Platform
      drawLoadObject(ctx, cyl2CenterX, platTopY - 8, selectedPresetId, activePreset.loadMass);

      // Output Force Arrow (F2 Upwards)
      drawPistonArrow(
        ctx,
        cyl2CenterX + cyl2Width / 2 + 30,
        p2Y + 40,
        cyl2CenterX + cyl2Width / 2 + 30,
        p2Y - 30,
        '#0284c7',
        `F₂ = ${f2 >= 1000 ? (f2 / 1000).toFixed(1) + ' kN' : f2.toFixed(0) + ' N'}`
      );
      ctx.restore();

      // 5. Draw Pressure Gauge in the Center Connecting Pipe
      const gaugeCenterX = (cyl1Right + cyl2Left) / 2;
      const gaugeCenterY = (pipeBottomY + pipeInnerBottomY) / 2;

      ctx.save();
      // Gauge mount stem
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(gaugeCenterX, gaugeCenterY);
      ctx.lineTo(gaugeCenterX, gaugeCenterY - 45);
      ctx.stroke();

      // Gauge Dial
      ctx.beginPath();
      ctx.arc(gaugeCenterX, gaugeCenterY - 45, 24, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2.5;
      ctx.fill();
      ctx.stroke();

      // Gauge needle angled with pressure
      const maxPaRef = 50000;
      const needleAngle = -Math.PI * 0.75 + Math.min(Math.PI * 1.5, (pressurePa / maxPaRef) * Math.PI * 1.5);
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(gaugeCenterX, gaugeCenterY - 45);
      ctx.lineTo(
        gaugeCenterX + 16 * Math.cos(needleAngle),
        gaugeCenterY - 45 + 16 * Math.sin(needleAngle)
      );
      ctx.stroke();

      // Gauge readout label
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 9px Poppins, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        `${convertedPressure.value.toFixed(1)} ${convertedPressure.label}`,
        gaugeCenterX,
        gaugeCenterY - 26
      );
      ctx.font = '8px Poppins, sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText('P₁ = P₂', gaugeCenterX, gaugeCenterY - 74);
      ctx.restore();

      // Area tags under cylinders
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 11px Poppins, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`A₁ = ${a1.toFixed(3)} m²`, cyl1CenterX, baseGroundY + 16);
      ctx.fillText(`A₂ = ${a2.toFixed(2)} m²`, cyl2CenterX, baseGroundY + 16);

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [a1, a2, f1, f2, d1Cm, pressurePa, convertedPressure, selectedPresetId, activePreset.loadMass]);

  // Helper function to draw load object (Car, Brake Rotor, or Industrial Ingot)
  const drawLoadObject = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    presetId: string,
    massKg: number
  ) => {
    ctx.save();
    if (presetId === 'car_jack') {
      // Draw stylized sedan car
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      // Car chassis
      ctx.roundRect(x - 55, y - 30, 110, 24, 6);
      ctx.fill();
      // Car roof cabin
      ctx.beginPath();
      ctx.roundRect(x - 30, y - 48, 60, 20, 4);
      ctx.fillStyle = '#dc2626';
      ctx.fill();
      // Windows
      ctx.fillStyle = '#bae6fd';
      ctx.fillRect(x - 26, y - 44, 22, 14);
      ctx.fillRect(x + 4, y - 44, 22, 14);
      // Wheels
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(x - 35, y - 4, 9, 0, Math.PI * 2);
      ctx.arc(x + 35, y - 4, 9, 0, Math.PI * 2);
      ctx.fill();

      // Car Mass Label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px Poppins, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${massKg} kg Sedan`, x, y - 14);
    } else if (presetId === 'brake_system') {
      // Draw Disc Brake Caliper
      ctx.fillStyle = '#e2e8f0';
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y - 28, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Caliper Clamp
      ctx.fillStyle = '#b91c1c';
      ctx.beginPath();
      ctx.roundRect(x - 18, y - 44, 36, 24, 4);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px Poppins, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Brake Caliper', x, y - 28);
    } else {
      // Heavy Industrial Press Block
      ctx.fillStyle = '#475569';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x - 50, y - 40, 100, 40, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 11px Poppins, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Press Die (${massKg} kg)`, x, y - 16);
    }
    ctx.restore();
  };

  // Helper function to draw force arrows with labels
  const drawPistonArrow = (
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    color: string,
    label: string
  ) => {
    const headLen = 10;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3.5;

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headLen * Math.cos(angle - Math.PI / 6),
      toY - headLen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      toX - headLen * Math.cos(angle + Math.PI / 6),
      toY - headLen * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();

    ctx.font = 'bold 12px Poppins, sans-serif';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
    ctx.shadowBlur = 4;
    ctx.textAlign = 'left';
    ctx.fillText(label, toX + 8, (fromY + toY) / 2 + 4);
    ctx.restore();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* LEFT: Canvas Viewport & Mechanics */}
      <div className="lg:col-span-7 flex flex-col gap-4">
        {/* Main Canvas Card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs relative flex flex-col items-center">
          {/* Header Bar */}
          <div className="w-full flex items-center justify-between mb-3 px-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Mechanical Advantage:</span>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" /> MA = {mechanicalAdvantage.toFixed(1)}× Force Multiplier
              </span>
            </div>

            {/* Pumping Action Button */}
            <button
              onClick={handlePump}
              disabled={isPumping}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPumping ? 'animate-spin' : ''}`} />
              <span>Pump Piston 1</span>
            </button>
          </div>

          {/* Canvas */}
          <div className="w-full relative rounded-xl overflow-hidden bg-slate-50 border border-slate-200">
            <canvas
              ref={canvasRef}
              style={{ width: '100%', height: '460px', display: 'block' }}
            />
          </div>

          {/* Displacement Status Slider Bar */}
          <div className="w-full flex flex-col sm:flex-row items-center justify-between mt-3 px-2 text-xs text-slate-600 gap-3">
            <div className="w-full sm:w-2/3 space-y-1">
              <div className="flex justify-between font-medium">
                <span>Piston 1 Stroke Downward (<MathView math="d_1" />):</span>
                <span className="font-mono font-bold text-indigo-700">{d1Cm.toFixed(1)} cm</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="0.5"
                value={d1Cm}
                onChange={(e) => setD1Cm(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="text-right shrink-0 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              <span className="text-slate-500">Piston 2 Rise (<MathView math="d_2" />): </span>
              <span className="font-bold font-mono text-blue-700">{d2Cm.toFixed(2)} cm</span>
            </div>
          </div>
        </div>

        {/* Dynamic LaTeX Formula Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <Cog className="w-4 h-4 text-indigo-600" /> Pascal's Principle Calculations
            </h3>
            <span className="text-xs font-mono text-slate-500">P₁ = P₂</span>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Pressure Equality */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-xs font-semibold text-slate-700 mb-1">1. Fluid Pressure Transmitted:</div>
              <div className="text-center py-1">
                <MathView math={`P = \\frac{F_1}{A_1} = \\frac{${f1.toFixed(0)}\\text{ N}}{${a1.toFixed(3)}\\text{ m}^2} = ${convertedPressure.value.toFixed(1)}\\text{ }${convertedPressure.label}`} />
              </div>
            </div>

            {/* Output Force Amplification */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-xs font-semibold text-slate-700 mb-1">2. Output Lift Force:</div>
              <div className="text-center py-1">
                <MathView math={`F_2 = F_1 \\cdot \\left(\\frac{A_2}{A_1}\\right) = ${f1.toFixed(0)} \\cdot ${mechanicalAdvantage.toFixed(1)} = ${f2.toFixed(0)}\\text{ N}`} />
              </div>
            </div>
          </div>

          {/* Conservation of Work / Energy */}
          <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs text-indigo-950 space-y-2">
            <div className="font-semibold text-indigo-900 flex items-center justify-between">
              <span>Conservation of Work & Energy:</span>
              <span className="font-mono bg-white px-2 py-0.5 rounded border border-indigo-200 text-indigo-700">
                W₁ = W₂ = {work1.toFixed(1)} J
              </span>
            </div>
            <div className="text-center overflow-x-auto">
              <MathView
                math={`W_1 = F_1 d_1 = (${f1.toFixed(0)}\\text{ N})(${d1Meters.toFixed(3)}\\text{ m}) = ${work1.toFixed(1)}\\text{ J} \\quad=\\quad W_2 = F_2 d_2 = (${f2.toFixed(0)}\\text{ N})(${d2Meters.toFixed(4)}\\text{ m}) = ${work2.toFixed(1)}\\text{ J}`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: Presets & Controls */}
      <div className="lg:col-span-5 flex flex-col gap-5">
        {/* Real-World Application Presets */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Real-World Applications</h3>
            <span className="text-xs text-slate-500">Preset Configurations</span>
          </div>

          <div className="space-y-2.5">
            {HYDRAULIC_PRESETS.map((preset) => {
              const isSelected = selectedPresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  className={`w-full p-3 text-left rounded-xl border transition-all flex items-start gap-3 ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 shadow-xs ring-1 ring-indigo-600/30'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {preset.id === 'car_jack' && <Car className="w-4 h-4" />}
                    {preset.id === 'brake_system' && <Disc className="w-4 h-4" />}
                    {preset.id === 'industrial_press' && <Hammer className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">{preset.name}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{preset.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Cylinder Area Controls */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Piston Surface Areas</h3>
            <span className="text-xs font-mono font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
              A₂ / A₁ = {mechanicalAdvantage.toFixed(1)}
            </span>
          </div>

          {/* Small Piston Area A1 */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-700">
              <span>Small Piston Area (<MathView math="A_1" />)</span>
              <span className="font-bold font-mono">{a1.toFixed(3)} m²</span>
            </div>
            <input
              type="range"
              min="0.005"
              max="0.080"
              step="0.005"
              value={a1}
              onChange={(e) => {
                setA1(parseFloat(e.target.value));
                setSelectedPresetId('custom');
              }}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0.005 m² (Capillary)</span>
              <span>0.040 m²</span>
              <span>0.080 m²</span>
            </div>
          </div>

          {/* Large Piston Area A2 */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-xs text-slate-700">
              <span>Large Piston Area (<MathView math="A_2" />)</span>
              <span className="font-bold font-mono">{a2.toFixed(2)} m²</span>
            </div>
            <input
              type="range"
              min="0.10"
              max="2.00"
              step="0.05"
              value={a2}
              onChange={(e) => {
                setA2(parseFloat(e.target.value));
                setSelectedPresetId('custom');
              }}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0.10 m²</span>
              <span>1.00 m²</span>
              <span>2.00 m² (Wide Ram)</span>
            </div>
          </div>
        </div>

        {/* Input Force Control */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Applied Input Force</h3>
            <span className="text-xs font-mono font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
              F₁ = {f1.toFixed(0)} N
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-700">
              <span>User Force on Small Piston (<MathView math="F_1" />)</span>
              <span className="font-bold font-mono">{f1.toFixed(0)} N</span>
            </div>
            <input
              type="range"
              min="20"
              max="600"
              step="10"
              value={f1}
              onChange={(e) => setF1(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>20 N (Finger tap)</span>
              <span>300 N (Leg push)</span>
              <span>600 N (Body weight)</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex justify-between items-center">
            <span>Equilibrium Liftable Mass:</span>
            <span className="font-bold font-mono text-slate-900 text-sm">
              {maxMassLiftableKg.toFixed(0)} kg ({((maxMassLiftableKg * 9.8) / 1000).toFixed(2)} kN)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
