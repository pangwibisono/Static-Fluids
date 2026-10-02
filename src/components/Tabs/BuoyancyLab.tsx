import React, { useState, useEffect, useRef } from 'react';
import { MathView } from '../MathView.tsx';
import { FLUID_PRESETS, OBJECT_PRESETS, FluidPreset, ObjectPreset } from '../../types.ts';
import { Info, Play, Pause, RotateCcw } from 'lucide-react';

interface BuoyancyLabProps {
  fluidThemeColor?: string;
}

export const BuoyancyLab: React.FC<BuoyancyLabProps> = ({ fluidThemeColor }) => {
  // Fluid selection & properties
  const [selectedFluidId, setSelectedFluidId] = useState<string>('water');
  const [fluidDensity, setFluidDensity] = useState<number>(1000); // kg/m^3

  // Object selection & properties
  const [selectedObjectId, setSelectedObjectId] = useState<string>('wood');
  const [mass, setMass] = useState<number>(2.5); // kg
  const [volumeLiters, setVolumeLiters] = useState<number>(5.0); // Liters (1 L = 0.001 m^3)

  // Simulation controls
  const [gravity] = useState<number>(9.8); // m/s^2
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [showVectors, setShowVectors] = useState<boolean>(true);
  const [showWaterDisplacement, setShowWaterDisplacement] = useState<boolean>(true);

  // Derived values
  const volumeM3 = volumeLiters * 0.001; // m^3
  const objectDensity = mass / volumeM3; // kg/m^3
  const weight = mass * gravity; // N

  // Canvas ref & physics state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const physicsState = useRef({
    objY: 150, // pixel Y of object center
    objVy: 0,  // pixel velocity Y
    isDragging: false,
    dragOffsetY: 0,
    submergedFraction: 0,
    buoyantForce: 0,
    normalForce: 0,
  });

  // Handle fluid preset change
  const handleFluidChange = (presetId: string) => {
    setSelectedFluidId(presetId);
    const preset = FLUID_PRESETS.find((f) => f.id === presetId);
    if (preset && preset.id !== 'custom') {
      setFluidDensity(preset.density);
    }
  };

  // Handle object preset change
  const handleObjectChange = (presetId: string) => {
    setSelectedObjectId(presetId);
    const preset = OBJECT_PRESETS.find((o) => o.id === presetId);
    if (preset && preset.id !== 'custom') {
      setMass(preset.defaultMass);
      setVolumeLiters(preset.defaultVolume);
    }
  };

  // Calculate equilibrium submerged fraction
  const equilibriumFraction = Math.min(1.0, objectDensity / fluidDensity);
  const willFloat = objectDensity < fluidDensity;
  const isNeutral = Math.abs(objectDensity - fluidDensity) < 10;

  // Active fluid styling
  const activeFluid = FLUID_PRESETS.find((f) => f.id === selectedFluidId) || FLUID_PRESETS[0];
  const activeObject = OBJECT_PRESETS.find((o) => o.id === selectedObjectId) || OBJECT_PRESETS[0];

  // Canvas rendering & physics loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const tankTop = 130;
    const tankHeight = 310;
    const tankBottom = tankTop + tankHeight;
    const tankLeft = 140;
    const tankWidth = 320;
    const tankRight = tankLeft + tankWidth;
    const baseWaterLevel = tankTop + 70; // unperturbed water surface

    // Pixel scaling: object dimension in pixels derived from volume
    // Volume: 1L = cube with side ~ 40px, 10L ~ side 75px
    const objSize = Math.max(45, Math.min(100, 36 + Math.cbrt(volumeLiters) * 22));

    const render = () => {
      // Handle high-DPI scaling
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.clearRect(0, 0, width, height);

      const state = physicsState.current;
      const objTop = state.objY - objSize / 2;
      const objBottom = state.objY + objSize / 2;

      // Calculate current submerged fraction based on current water level
      // Water level rises due to displaced volume
      const maxDisplacementPx = 28; // max pixel rise when 100% submerged
      const currentWaterLevel = baseWaterLevel - (showWaterDisplacement ? state.submergedFraction * (volumeLiters / 10) * maxDisplacementPx : 0);

      // Submersion calculation
      let submergedPixels = 0;
      if (objBottom <= currentWaterLevel) {
        submergedPixels = 0;
      } else if (objTop >= currentWaterLevel) {
        submergedPixels = objSize;
      } else {
        submergedPixels = objBottom - currentWaterLevel;
      }

      const submergedFraction = Math.max(0, Math.min(1, submergedPixels / objSize));
      state.submergedFraction = submergedFraction;

      // Calculate forces
      const submergedVolumeM3 = volumeM3 * submergedFraction;
      const Fb = fluidDensity * submergedVolumeM3 * gravity; // Buoyant force in N
      state.buoyantForce = Fb;

      // Normal force from tank bottom if touching
      let Fn = 0;
      if (objBottom >= tankBottom - 4) {
        state.objY = tankBottom - 4 - objSize / 2;
        if (state.objVy > 0) state.objVy = 0;
        Fn = Math.max(0, weight - Fb);
      }
      state.normalForce = Fn;

      // Physics integration (if not dragging and not paused)
      if (!state.isDragging && !isPaused) {
        // Net force in Newtons
        const Fnet = Fb + Fn - weight;
        // Acceleration in m/s^2 (convert to pixel acc: 1 m/s^2 ~ 35 px/s^2)
        const accY = (-Fnet / mass) * 35; // positive accY points downwards
        const fluidDrag = submergedFraction > 0 ? (state.objVy * 0.08 * (fluidDensity / 1000)) : 0.01;

        state.objVy += accY * (1 / 60);
        state.objVy *= (1 - fluidDrag); // damping
        state.objY += state.objVy * (1 / 60);

        // Constrain to tank limits
        if (state.objY < 40) {
          state.objY = 40;
          state.objVy = 0;
        }
      }

      // --- DRAW BACKGROUND & TANK ---
      // Tank back glass
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(tankLeft, tankTop, tankWidth, tankHeight);

      // Fluid body
      const fluidFill = activeFluid.color || '#38bdf8';
      ctx.save();
      ctx.fillStyle = fluidFill;
      ctx.globalAlpha = activeFluid.alpha || 0.55;
      ctx.fillRect(tankLeft, currentWaterLevel, tankWidth, tankBottom - currentWaterLevel);
      ctx.restore();

      // Fluid surface highlight line & meniscus
      ctx.strokeStyle = activeFluid.surfaceColor || '#0284c7';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(tankLeft, currentWaterLevel);
      ctx.bezierCurveTo(
        tankLeft + tankWidth * 0.33,
        currentWaterLevel - 2,
        tankLeft + tankWidth * 0.66,
        currentWaterLevel + 2,
        tankRight,
        currentWaterLevel
      );
      ctx.stroke();

      // Initial water level reference indicator line
      if (showWaterDisplacement && currentWaterLevel !== baseWaterLevel) {
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(tankLeft - 25, baseWaterLevel);
        ctx.lineTo(tankRight + 25, baseWaterLevel);
        ctx.stroke();

        ctx.fillStyle = '#64748b';
        ctx.font = '10px Poppins, sans-serif';
        ctx.fillText('Initial Level', tankRight + 30, baseWaterLevel + 3);
        ctx.restore();

        // Displaced height arrow
        ctx.save();
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(tankLeft - 15, baseWaterLevel);
        ctx.lineTo(tankLeft - 15, currentWaterLevel);
        ctx.stroke();
        ctx.fillStyle = '#2563eb';
        ctx.font = 'bold 9px Poppins, sans-serif';
        ctx.fillText('Δh', tankLeft - 30, (baseWaterLevel + currentWaterLevel) / 2 + 3);
        ctx.restore();
      }

      // Tank glass walls
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 4;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(tankLeft, tankTop);
      ctx.lineTo(tankLeft, tankBottom);
      ctx.lineTo(tankRight, tankBottom);
      ctx.lineTo(tankRight, tankTop);
      ctx.stroke();

      // Ruler marks on left tank wall
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#64748b';
      ctx.fillStyle = '#475569';
      ctx.font = '10px Poppins, sans-serif';
      const numMarks = 6;
      for (let i = 0; i <= numMarks; i++) {
        const y = tankTop + (tankHeight / numMarks) * i;
        ctx.beginPath();
        ctx.moveTo(tankLeft, y);
        ctx.lineTo(tankLeft + 8, y);
        ctx.stroke();
        const depthVal = ((tankHeight - (y - tankTop)) / tankHeight * 5).toFixed(1);
        ctx.fillText(`${depthVal}m`, tankLeft - 32, y + 3);
      }

      // --- DRAW SUBMERGED OBJECT ---
      const objX = tankLeft + tankWidth / 2;
      const objLeft = objX - objSize / 2;
      const currentObjTop = state.objY - objSize / 2;

      // Object shadow/grounding
      ctx.save();
      ctx.fillStyle = activeObject.color || '#b45309';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(objLeft, currentObjTop, objSize, objSize, 6);
      ctx.fill();
      ctx.stroke();

      // Texture pattern / styling inside object
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(objLeft + 4, currentObjTop + 4, objSize - 8, 4);

      // Mass & Density label on the object
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Poppins, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 4;
      ctx.fillText(`${mass.toFixed(1)} kg`, objX, state.objY - 4);
      ctx.font = '9px Poppins, sans-serif';
      ctx.fillText(`${volumeLiters.toFixed(1)} L`, objX, state.objY + 10);
      ctx.restore();

      // Submerged waterline marker across object
      if (submergedFraction > 0 && submergedFraction < 1) {
        ctx.save();
        ctx.strokeStyle = '#ffffff';
        ctx.setLineDash([2, 2]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(objLeft, currentWaterLevel);
        ctx.lineTo(objLeft + objSize, currentWaterLevel);
        ctx.stroke();
        ctx.restore();
      }

      // --- DRAW FORCE VECTORS ---
      if (showVectors) {
        const vectorScale = 1.6; // pixels per Newton (capped for visibility)

        // 1. Weight Vector (W) pointing down (Crimson)
        const weightLength = Math.min(110, Math.max(20, weight * vectorScale));
        drawVector(
          ctx,
          objX,
          state.objY,
          objX,
          state.objY + weightLength,
          '#ef4444',
          `W = ${weight.toFixed(1)} N`
        );

        // 2. Buoyant Force Vector (Fb) pointing up (Deep Sky Blue)
        if (Fb > 0.05) {
          const fbLength = Math.min(110, Math.max(15, Fb * vectorScale));
          drawVector(
            ctx,
            objX - 10,
            state.objY,
            objX - 10,
            state.objY - fbLength,
            '#0284c7',
            `Fb = ${Fb.toFixed(1)} N`
          );
        }

        // 3. Normal Force (Fn) pointing up if resting on floor
        if (Fn > 0.05) {
          const fnLength = Math.min(80, Math.max(15, Fn * vectorScale));
          drawVector(
            ctx,
            objX + 15,
            state.objY,
            objX + 15,
            state.objY - fnLength,
            '#10b981',
            `N = ${Fn.toFixed(1)} N`
          );
        }
      }

      // Drag hint if hovering or idle
      if (!state.isDragging && Math.abs(state.objVy) < 0.5) {
        ctx.fillStyle = '#64748b';
        ctx.font = '10px Poppins, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('↕ Drag block to submerge', objX, currentObjTop - 12);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [fluidDensity, mass, volumeLiters, volumeM3, weight, gravity, isPaused, showVectors, showWaterDisplacement, activeFluid, activeObject]);

  // Helper function to draw an arrow vector with clean arrowhead and label
  const drawVector = (
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    color: string,
    label: string
  ) => {
    const headLen = 9;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3;

    // Line
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    // Arrowhead
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

    // Text label
    ctx.font = 'bold 11px Poppins, sans-serif';
    ctx.textAlign = 'left';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
    ctx.shadowBlur = 3;
    if (dy > 0) {
      // Downwards vector
      ctx.fillText(label, toX + 6, toY);
    } else {
      // Upwards vector
      ctx.fillText(label, toX + 6, toY + 12);
    }
    ctx.restore();
  };

  // Pointer / Touch Handlers for dragging the object
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const state = physicsState.current;
    const objSize = Math.max(45, Math.min(100, 36 + Math.cbrt(volumeLiters) * 22));
    const objX = 140 + 320 / 2;

    if (Math.abs(x - objX) <= objSize / 2 + 10 && Math.abs(y - state.objY) <= objSize / 2 + 10) {
      state.isDragging = true;
      state.dragOffsetY = y - state.objY;
      state.objVy = 0;
      canvas.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const state = physicsState.current;
    if (!state.isDragging) return;

    const rect = canvas.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const targetY = y - state.dragOffsetY;

    // Clamped inside canvas bounds
    state.objY = Math.max(60, Math.min(410, targetY));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const state = physicsState.current;
    if (state.isDragging) {
      state.isDragging = false;
      try {
        canvas?.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  const resetPosition = () => {
    const state = physicsState.current;
    state.objY = 120;
    state.objVy = 0;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* LEFT: Interactive Canvas Viewport */}
      <div className="lg:col-span-7 flex flex-col gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs relative flex flex-col items-center">
          {/* Simulation Status Ribbon */}
          <div className="w-full flex items-center justify-between mb-3 px-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status:</span>
              {willFloat ? (
                <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  Floats ({((equilibriumFraction) * 100).toFixed(1)}% Submerged)
                </span>
              ) : isNeutral ? (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  Neutral Buoyancy (Hovers)
                </span>
              ) : (
                <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                  Sinks to Floor
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                title={isPaused ? 'Resume' : 'Pause'}
              >
                {isPaused ? <Play className="w-4 h-4 text-emerald-600" /> : <Pause className="w-4 h-4" />}
              </button>
              <button
                onClick={resetPosition}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                title="Reset block position"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
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

          {/* Quick Visual Toggles */}
          <div className="w-full flex flex-wrap items-center justify-between mt-3 px-2 text-xs text-slate-600">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showVectors}
                onChange={(e) => setShowVectors(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <span className="font-medium">Show Force Vectors (<span className="text-red-600 font-bold">W</span>, <span className="text-sky-600 font-bold">Fb</span>, <span className="text-emerald-600 font-bold">N</span>)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showWaterDisplacement}
                onChange={(e) => setShowWaterDisplacement(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <span className="font-medium">Fluid Level Displacement (Δh)</span>
            </label>
          </div>
        </div>

        {/* Live LaTeX Calculations Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <Info className="w-4 h-4 text-blue-600" /> Real-time Physics Derivations
            </h3>
            <span className="text-xs text-slate-500">Live dynamic values</span>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Object Density Calculation */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-xs font-semibold text-slate-700 mb-1">1. Object Mass Density:</div>
              <div className="text-center py-1">
                <MathView math={`\\rho = \\frac{m}{V} = \\frac{${mass.toFixed(1)}\\text{ kg}}{${volumeLiters.toFixed(1)}\\times 10^{-3}\\text{ m}^3} = ${objectDensity.toFixed(0)}\\text{ kg/m}^3`} />
              </div>
            </div>

            {/* Buoyant Force Calculation */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-xs font-semibold text-slate-700 mb-1">2. Archimedes Buoyant Force:</div>
              <div className="text-center py-1">
                <MathView math={`F_b = \\rho_f V_{\\text{sub}} g = (${fluidDensity.toFixed(0)})(V_{\\text{sub}})(9.8)`} />
              </div>
            </div>
          </div>

          {/* Submerged Equilibrium Ratio */}
          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-blue-900 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <span className="font-bold">Equilibrium Submersion Fraction: </span>
              <MathView math={`\\frac{V_{\\text{sub}}}{V} = \\frac{\\rho_{\\text{obj}}}{\\rho_{\\text{fluid}}} = \\frac{${objectDensity.toFixed(0)}}{${fluidDensity.toFixed(0)}} = ${(equilibriumFraction * 100).toFixed(1)}\\%`} />
            </div>
            <div className="font-semibold px-2.5 py-1 bg-white rounded-lg border border-blue-200 text-blue-800 shrink-0">
              Weight: {weight.toFixed(1)} N
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: Lab Controls & Parameters */}
      <div className="lg:col-span-5 flex flex-col gap-5">
        {/* Fluid Configuration Panel */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Fluid Environment</h3>
            <span className="text-xs font-mono font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              {fluidDensity} kg/m³
            </span>
          </div>

          {/* Preset Buttons */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">Preset Fluids:</label>
            <div className="grid grid-cols-2 gap-2">
              {FLUID_PRESETS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => handleFluidChange(f.id)}
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
          </div>

          {/* Fluid Density Slider */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-xs text-slate-700">
              <span>Fluid Density (<MathView math="\rho_{\text{fluid}}" />)</span>
              <span className="font-bold font-mono">{fluidDensity} kg/m³</span>
            </div>
            <input
              type="range"
              min="400"
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
              <span>400 (Gasoline)</span>
              <span>1000 (Water)</span>
              <span>2000 (Dense Brine)</span>
            </div>
          </div>
        </div>

        {/* Submerged Object Configuration */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Object Properties</h3>
            <span className="text-xs font-mono font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
              {objectDensity.toFixed(0)} kg/m³
            </span>
          </div>

          {/* Object Presets */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">Preset Materials:</label>
            <div className="grid grid-cols-3 gap-2">
              {OBJECT_PRESETS.map((o) => (
                <button
                  key={o.id}
                  onClick={() => handleObjectChange(o.id)}
                  className={`py-2 px-2.5 text-xs font-semibold rounded-xl border text-center transition-all ${
                    selectedObjectId === o.id
                      ? 'border-amber-600 bg-amber-50/80 text-amber-900 shadow-xs ring-1 ring-amber-600/30'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="truncate">{o.name.split(' ')[0]}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">{o.density}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Mass Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-700">
              <span>Object Mass (<MathView math="m" />)</span>
              <span className="font-bold font-mono">{mass.toFixed(1)} kg</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="25.0"
              step="0.1"
              value={mass}
              onChange={(e) => {
                setMass(parseFloat(e.target.value));
                setSelectedObjectId('custom');
              }}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0.2 kg</span>
              <span>12.5 kg</span>
              <span>25.0 kg</span>
            </div>
          </div>

          {/* Volume Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-700">
              <span>Object Volume (<MathView math="V" />)</span>
              <span className="font-bold font-mono">{volumeLiters.toFixed(1)} L ({volumeM3.toFixed(3)} m³)</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="15.0"
              step="0.1"
              value={volumeLiters}
              onChange={(e) => {
                setVolumeLiters(parseFloat(e.target.value));
                setSelectedObjectId('custom');
              }}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0.5 L</span>
              <span>7.5 L</span>
              <span>15.0 L</span>
            </div>
          </div>
        </div>

        {/* Pedagogical Key Insight */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs text-slate-600 leading-normal">
          <p className="font-semibold text-slate-800 mb-1">Archimedes Takeaway:</p>
          An object floats if its density is less than the fluid's density (<MathView math="\rho_{\text{obj}} < \rho_{\text{fluid}}" />). Notice how pushing it further into the water increases the upward buoyant vector (<MathView math="\vec{F}_b" />) because more fluid is being displaced!
        </div>
      </div>
    </div>
  );
};
