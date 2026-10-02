import React, { useState, useEffect, useRef } from 'react';
import { MathView } from '../MathView.tsx';
import { UnitType, convertPressure, GRAVITY_PRESETS, FLUID_PRESETS } from '../../types.ts';
import { Gauge, Eye, EyeOff, RotateCcw, Crosshair, ArrowDown } from 'lucide-react';

interface HydrostaticPressureProps {
  selectedUnit: UnitType;
  fluidThemeColor?: string;
}

export const HydrostaticPressure: React.FC<HydrostaticPressureProps> = ({ selectedUnit }) => {
  // Fluid Density & Gravity
  const [fluidDensity, setFluidDensity] = useState<number>(1000); // kg/m^3
  const [gravity, setGravity] = useState<number>(9.80); // m/s^2
  const [selectedGravityId, setSelectedGravityId] = useState<string>('earth');
  const [selectedFluidId, setSelectedFluidId] = useState<string>('water');

  // Atmospheric Pressure Toggle
  const [hasAtmosphere, setHasAtmosphere] = useState<boolean>(true);
  const pAtmPa = hasAtmosphere ? 101325 : 0; // Pa

  // Visual grid & isobar toggles
  const [showIsobars, setShowIsobars] = useState<boolean>(true);
  const [tankShape, setTankShape] = useState<'straight' | 'flared' | 'stepped'>('straight');

  // Sensor position (depth in meters 0 to 5, and horizontal position)
  // Coordinates relative to fluid surface
  const [sensorPos, setSensorPos] = useState<{ x: number; depthMeters: number }>({
    x: 250,
    depthMeters: 2.5,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<{ isDragging: boolean; startX: number; startY: number }>({
    isDragging: false,
    startX: 0,
    startY: 0,
  });

  // Calculate live pressures
  const h = Math.max(0, sensorPos.depthMeters);
  const isSubmerged = sensorPos.depthMeters > 0;
  const pGaugePa = isSubmerged ? fluidDensity * gravity * h : 0;
  const pTotalPa = pAtmPa + pGaugePa;

  const convertedTotal = convertPressure(pTotalPa, selectedUnit);
  const convertedGauge = convertPressure(pGaugePa, selectedUnit);
  const convertedAtm = convertPressure(pAtmPa, selectedUnit);

  // Handle Gravity Preset Change
  const handleGravityPreset = (id: string) => {
    setSelectedGravityId(id);
    const preset = GRAVITY_PRESETS.find((g) => g.id === id);
    if (preset) setGravity(preset.g);
  };

  // Handle Fluid Preset Change
  const handleFluidPreset = (id: string) => {
    setSelectedFluidId(id);
    const preset = FLUID_PRESETS.find((f) => f.id === id);
    if (preset && preset.id !== 'custom') {
      setFluidDensity(preset.density);
    }
  };

  // Canvas drawing
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

      const surfaceY = 120; // Y coordinate of fluid surface
      const tankBottom = 430; // Y coordinate of tank bottom
      const fluidMaxDepthMeters = 5.0;
      const pxPerMeter = (tankBottom - surfaceY) / fluidMaxDepthMeters;

      const tankLeft = 110;
      const tankRight = width - 110;
      const tankWidth = tankRight - tankLeft;

      // Draw Air / Sky Above Fluid
      if (hasAtmosphere) {
        const skyGrad = ctx.createLinearGradient(0, 0, 0, surfaceY);
        skyGrad.addColorStop(0, '#f8fafc');
        skyGrad.addColorStop(1, '#e0f2fe');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(tankLeft - 20, 20, tankWidth + 40, surfaceY - 20);

        // Atmosphere label
        ctx.fillStyle = '#0369a1';
        ctx.font = 'bold 11px Poppins, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Atmosphere: Patm = 101.3 kPa', (tankLeft + tankRight) / 2, 45);
      }

      // Draw Fluid Body with Hydrostatic Depth Pressure Gradient
      const fluidGrad = ctx.createLinearGradient(0, surfaceY, 0, tankBottom);
      // Fluid gets progressively darker/richer with depth to illustrate pressure gradient
      fluidGrad.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
      fluidGrad.addColorStop(0.5, 'rgba(14, 165, 233, 0.65)');
      fluidGrad.addColorStop(1, 'rgba(2, 132, 199, 0.85)');

      ctx.save();

      // Shape clipping based on tankShape (straight, flared, stepped)
      ctx.beginPath();
      if (tankShape === 'straight') {
        ctx.rect(tankLeft, surfaceY, tankWidth, tankBottom - surfaceY);
      } else if (tankShape === 'flared') {
        // Funnel shape
        ctx.moveTo(tankLeft, surfaceY);
        ctx.lineTo(tankLeft + 70, tankBottom);
        ctx.lineTo(tankRight - 70, tankBottom);
        ctx.lineTo(tankRight, surfaceY);
        ctx.closePath();
      } else {
        // Stepped tank
        const midY = (surfaceY + tankBottom) / 2;
        ctx.moveTo(tankLeft, surfaceY);
        ctx.lineTo(tankLeft, midY);
        ctx.lineTo(tankLeft + 60, midY);
        ctx.lineTo(tankLeft + 60, tankBottom);
        ctx.lineTo(tankRight - 60, tankBottom);
        ctx.lineTo(tankRight - 60, midY);
        ctx.lineTo(tankRight, midY);
        ctx.lineTo(tankRight, surfaceY);
        ctx.closePath();
      }
      ctx.fillStyle = fluidGrad;
      ctx.fill();

      // Isobar lines (horizontal equal-pressure lines)
      if (showIsobars) {
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        for (let m = 1; m <= 4; m++) {
          const isoY = surfaceY + m * pxPerMeter;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.beginPath();
          ctx.moveTo(tankLeft, isoY);
          ctx.lineTo(tankRight, isoY);
          ctx.stroke();

          // Isobar pressure tag
          const isoPressure = convertPressure(pAtmPa + fluidDensity * gravity * m, selectedUnit);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.font = '9px Poppins, sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText(`${isoPressure.value.toFixed(1)} ${isoPressure.label}`, tankRight - 8, isoY - 4);
        }
        ctx.setLineDash([]);
      }
      ctx.restore();

      // Tank Outline & Glass Edges
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 4;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      if (tankShape === 'straight') {
        ctx.moveTo(tankLeft, surfaceY - 15);
        ctx.lineTo(tankLeft, tankBottom);
        ctx.lineTo(tankRight, tankBottom);
        ctx.lineTo(tankRight, surfaceY - 15);
      } else if (tankShape === 'flared') {
        ctx.moveTo(tankLeft, surfaceY - 15);
        ctx.lineTo(tankLeft + 70, tankBottom);
        ctx.lineTo(tankRight - 70, tankBottom);
        ctx.lineTo(tankRight, surfaceY - 15);
      } else {
        const midY = (surfaceY + tankBottom) / 2;
        ctx.moveTo(tankLeft, surfaceY - 15);
        ctx.lineTo(tankLeft, midY);
        ctx.lineTo(tankLeft + 60, midY);
        ctx.lineTo(tankLeft + 60, tankBottom);
        ctx.lineTo(tankRight - 60, tankBottom);
        ctx.lineTo(tankRight - 60, midY);
        ctx.lineTo(tankRight, midY);
        ctx.lineTo(tankRight, surfaceY - 15);
      }
      ctx.stroke();

      // Fluid Surface Meniscus Line
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(tankLeft, surfaceY);
      ctx.lineTo(tankRight, surfaceY);
      ctx.stroke();

      // Depth Ruler on Left Side
      ctx.strokeStyle = '#64748b';
      ctx.fillStyle = '#334155';
      ctx.font = '10px Poppins, sans-serif';
      ctx.textAlign = 'right';

      for (let m = 0; m <= fluidMaxDepthMeters; m++) {
        const y = surfaceY + m * pxPerMeter;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(tankLeft - 18, y);
        ctx.lineTo(tankLeft - 6, y);
        ctx.stroke();

        ctx.fillText(`${m.toFixed(1)} m`, tankLeft - 22, y + 4);

        // Subdivisions (0.5m)
        if (m < fluidMaxDepthMeters) {
          const subY = surfaceY + (m + 0.5) * pxPerMeter;
          ctx.beginPath();
          ctx.moveTo(tankLeft - 12, subY);
          ctx.lineTo(tankLeft - 6, subY);
          ctx.stroke();
        }
      }

      // Depth Arrow indicating current depth of sensor
      if (sensorPos.depthMeters > 0) {
        const sensorPixelY = surfaceY + sensorPos.depthMeters * pxPerMeter;
        ctx.save();
        ctx.strokeStyle = '#2563eb';
        ctx.fillStyle = '#2563eb';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(tankLeft - 6, sensorPixelY);
        ctx.lineTo(sensorPos.x, sensorPixelY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      // --- DRAW DRAGGABLE PRESSURE SENSOR GAUGE ---
      const sensorPixelY = surfaceY + sensorPos.depthMeters * pxPerMeter;
      const sensorPixelX = sensorPos.x;

      // Cord connecting sensor probe to meter box mounted on top
      const meterBoxX = tankRight - 20;
      const meterBoxY = 60;
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(sensorPixelX, sensorPixelY);
      ctx.bezierCurveTo(
        sensorPixelX + 40,
        sensorPixelY - 30,
        meterBoxX - 40,
        meterBoxY + 50,
        meterBoxX,
        meterBoxY + 20
      );
      ctx.stroke();

      // Sensor Probe Node (the draggable target in fluid)
      ctx.save();
      // Outer glow / halo
      ctx.beginPath();
      ctx.arc(sensorPixelX, sensorPixelY, 20, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(37, 99, 235, 0.15)';
      ctx.fill();

      // Sensor Disc
      ctx.beginPath();
      ctx.arc(sensorPixelX, sensorPixelY, 13, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 3;
      ctx.fill();
      ctx.stroke();

      // Diaphragm needle / center point
      ctx.beginPath();
      ctx.arc(sensorPixelX, sensorPixelY, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#dc2626';
      ctx.fill();

      // Small probe readout tooltip attached to sensor
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(sensorPixelX + 18, sensorPixelY - 14, 110, 26, 6);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Poppins, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(
        `${convertedTotal.value.toFixed(1)} ${convertedTotal.label}`,
        sensorPixelX + 24,
        sensorPixelY + 3
      );
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [fluidDensity, gravity, hasAtmosphere, pAtmPa, showIsobars, tankShape, sensorPos, selectedUnit, convertedTotal]);

  // Pointer interactions to drag sensor probe
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const surfaceY = 120;
    const pxPerMeter = (430 - surfaceY) / 5.0;
    const currentSensorY = surfaceY + sensorPos.depthMeters * pxPerMeter;

    const dist = Math.hypot(x - sensorPos.x, y - currentSensorY);
    // Allow dragging if clicked within 40px of sensor probe
    if (dist < 40) {
      dragRef.current.isDragging = true;
      dragRef.current.startX = x;
      dragRef.current.startY = y;
      canvas.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !dragRef.current.isDragging) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const surfaceY = 120;
    const pxPerMeter = (430 - surfaceY) / 5.0;

    // Constrain depth: -1.0 m (in air) to 5.0 m (tank bottom)
    const newDepth = Math.max(-1.0, Math.min(5.0, (y - surfaceY) / pxPerMeter));
    // Constrain horizontal X: within tank width
    const minX = 140;
    const maxX = canvas.clientWidth - 140;
    const newX = Math.max(minX, Math.min(maxX, x));

    setSensorPos({ x: newX, depthMeters: parseFloat(newDepth.toFixed(2)) });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (dragRef.current.isDragging) {
      dragRef.current.isDragging = false;
      try {
        canvas?.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* LEFT: Canvas Viewport & Sensor Gauge */}
      <div className="lg:col-span-7 flex flex-col gap-4">
        {/* Main Canvas Card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs relative flex flex-col items-center">
          {/* Header Bar */}
          <div className="w-full flex items-center justify-between mb-3 px-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Gauge Sensor:</span>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Crosshair className="w-3.5 h-3.5" /> Depth: {h.toFixed(2)} m {sensorPos.depthMeters < 0 ? '(In Air)' : ''}
              </span>
            </div>

            {/* Atmosphere Toggle Button */}
            <button
              onClick={() => setHasAtmosphere(!hasAtmosphere)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border transition-all ${
                hasAtmosphere
                  ? 'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100'
                  : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
              }`}
            >
              {hasAtmosphere ? <Eye className="w-3.5 h-3.5 text-sky-600" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>Atmosphere: {hasAtmosphere ? 'ON (101.3 kPa)' : 'OFF (Vacuum)'}</span>
            </button>
          </div>

          {/* Canvas */}
          <div className="w-full relative rounded-xl overflow-hidden bg-slate-50 border border-slate-200">
            <canvas
              ref={canvasRef}
              style={{ width: '100%', height: '460px', display: 'block', cursor: 'grab' }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            />
          </div>

          {/* Tank Shape & Isobars Controls */}
          <div className="w-full flex flex-wrap items-center justify-between mt-3 px-2 text-xs text-slate-600 gap-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-500">Tank Shape:</span>
              {(['straight', 'flared', 'stepped'] as const).map((shape) => (
                <button
                  key={shape}
                  onClick={() => setTankShape(shape)}
                  className={`px-2.5 py-1 rounded-lg font-medium capitalize border transition-all ${
                    tankShape === shape
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {shape}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showIsobars}
                onChange={(e) => setShowIsobars(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <span className="font-medium">Show Isobar Pressure Gridlines</span>
            </label>
          </div>
        </div>

        {/* Dynamic LaTeX Formula Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-blue-600" /> Hydrostatic Equation Breakdown
            </h3>
            <span className="text-xs font-mono text-slate-500">P = P₀ + ρgh</span>
          </div>

          {/* Plugged in formula display */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="text-xs font-semibold text-slate-700">Dynamic Substitution:</div>
            <div className="text-center overflow-x-auto py-1">
              <MathView
                math={`P = ${hasAtmosphere ? '101.325\\text{ kPa}' : '0\\text{ kPa}'} + \\left(${fluidDensity}\\text{ kg/m}^3\\right)\\left(${gravity.toFixed(2)}\\text{ m/s}^2\\right)\\left(${h.toFixed(2)}\\text{ m}\\right)`}
                display
              />
            </div>
            <div className="text-center font-bold text-blue-700 text-sm pt-1">
              <MathView
                math={`P_{\\text{total}} = ${convertedTotal.value.toFixed(2)}\\text{ }${convertedTotal.label} \\quad \\left(P_{\\text{gauge}} = ${convertedGauge.value.toFixed(2)}\\text{ }${convertedGauge.label}\\right)`}
                display
              />
            </div>
          </div>

          {/* Stevin's Law Note */}
          <div className="text-xs text-slate-500 bg-sky-50/50 p-3 rounded-xl border border-sky-100 leading-normal">
            <strong>Stevin's Law Observation:</strong> Notice that dragging the sensor horizontally across the tank at a fixed depth yields the <em>exact same pressure</em>, even when using the flared or stepped tank shapes! Tank geometry does not alter static fluid pressure.
          </div>
        </div>
      </div>

      {/* RIGHT: Controls & Planetary Gravity */}
      <div className="lg:col-span-5 flex flex-col gap-5">
        {/* Planetary Gravity Selection */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Gravitational Field</h3>
            <span className="text-xs font-mono font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              g = {gravity.toFixed(2)} m/s²
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {GRAVITY_PRESETS.map((g) => (
              <button
                key={g.id}
                onClick={() => handleGravityPreset(g.id)}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border text-left flex items-center justify-between transition-all ${
                  selectedGravityId === g.id
                    ? 'border-blue-600 bg-blue-50/80 text-blue-900 shadow-xs ring-1 ring-blue-600/30'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span className="truncate">{g.name.split(' ')[0]}</span>
                <span className="text-[10px] text-slate-400 font-mono shrink-0">{g.g} m/s²</span>
              </button>
            ))}
          </div>

          {/* Custom Gravity Slider */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-xs text-slate-700">
              <span>Local Acceleration (<MathView math="g" />)</span>
              <span className="font-bold font-mono">{gravity.toFixed(2)} m/s²</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="25.0"
              step="0.1"
              value={gravity}
              onChange={(e) => {
                setGravity(parseFloat(e.target.value));
                setSelectedGravityId('custom');
              }}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0 m/s² (Zero-G)</span>
              <span>9.8 m/s² (Earth)</span>
              <span>24.8 m/s² (Jupiter)</span>
            </div>
          </div>
        </div>

        {/* Fluid Density Controls */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Fluid Density</h3>
            <span className="text-xs font-mono font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              {fluidDensity} kg/m³
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {FLUID_PRESETS.slice(0, 4).map((f) => (
              <button
                key={f.id}
                onClick={() => handleFluidPreset(f.id)}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border text-left flex items-center justify-between transition-all ${
                  selectedFluidId === f.id
                    ? 'border-blue-600 bg-blue-50/80 text-blue-900 shadow-xs ring-1 ring-blue-600/30'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span className="truncate">{f.name}</span>
                <span className="text-[10px] text-slate-400 font-mono shrink-0">{f.density}</span>
              </button>
            ))}
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-xs text-slate-700">
              <span>Fluid Density (<MathView math="\rho" />)</span>
              <span className="font-bold font-mono">{fluidDensity} kg/m³</span>
            </div>
            <input
              type="range"
              min="500"
              max="2000"
              step="10"
              value={fluidDensity}
              onChange={(e) => {
                setFluidDensity(parseFloat(e.target.value));
                setSelectedFluidId('custom');
              }}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>500 (Light oil)</span>
              <span>1000 (Water)</span>
              <span>2000 (Dense liquid)</span>
            </div>
          </div>
        </div>

        {/* Direct Sensor Depth Quick Control */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
          <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Sensor Depth Slider</h3>
            <span className="text-xs font-mono font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              h = {h.toFixed(2)} m
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-700">
              <span>Probe Depth in Fluid</span>
              <span className="font-bold font-mono">{h.toFixed(2)} m</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="5.0"
              step="0.05"
              value={h}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setSensorPos((prev) => ({ ...prev, depthMeters: val }));
              }}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0 m (Surface)</span>
              <span>2.5 m (Midpoint)</span>
              <span>5.0 m (Floor)</span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            {[0.0, 1.0, 2.5, 5.0].map((quickDepth) => (
              <button
                key={quickDepth}
                onClick={() => setSensorPos((prev) => ({ ...prev, depthMeters: quickDepth }))}
                className="flex-1 py-1.5 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
              >
                {quickDepth.toFixed(1)}m
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
