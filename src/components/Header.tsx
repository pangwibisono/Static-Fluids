import React from 'react';
import { Waves, RotateCcw, BookOpen, Compass, Palette, Download } from 'lucide-react';
import { UnitType, FLUID_PRESETS } from '../types.ts';
import { getSingleFileHtml } from '../utils/generateSingleFileHtml.ts';

interface HeaderProps {
  currentTab: string;
  selectedUnit: UnitType;
  onSelectUnit: (unit: UnitType) => void;
  fluidColorTheme: string;
  onChangeFluidTheme: (themeId: string) => void;
  onReset: () => void;
  onOpenTheory: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  selectedUnit,
  onSelectUnit,
  fluidColorTheme,
  onChangeFluidTheme,
  onReset,
  onOpenTheory,
}) => {
  const handleExportHtml = () => {
    const htmlContent = getSingleFileHtml();
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'static_fluids_simulation.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between py-3 gap-3">
          {/* Logo & Title */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
              <Waves className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">
                  Static Fluids Lab
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  PhET Style
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Buoyancy, Hydrostatic Pressure & Pascal's Hydraulics
              </p>
            </div>
          </div>

          {/* Global Controls & Tools */}
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
            {/* Unit Selector */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <span className="text-slate-500 px-2 font-medium flex items-center gap-1">
                <Compass className="w-3.5 h-3.5" /> Unit:
              </span>
              {(['kPa', 'Pa', 'bar', 'atm', 'psi'] as UnitType[]).map((unit) => (
                <button
                  key={unit}
                  onClick={() => onSelectUnit(unit)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    selectedUnit === unit
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {unit}
                </button>
              ))}
            </div>

            {/* Fluid Visual Theme Dropdown */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <span className="text-slate-500 pl-2 pr-1 font-medium flex items-center gap-1">
                <Palette className="w-3.5 h-3.5" />
              </span>
              <select
                aria-label="Fluid visual theme"
                value={fluidColorTheme}
                onChange={(e) => onChangeFluidTheme(e.target.value)}
                className="bg-transparent text-slate-700 font-medium py-1 px-1 rounded-lg focus:outline-none cursor-pointer"
              >
                <option value="water">Blue Water</option>
                <option value="olive_oil">Green Oil</option>
                <option value="honey">Amber Honey</option>
                <option value="mercury">Silver Mercury</option>
              </select>
            </div>

            {/* Theory Guide Trigger */}
            <button
              onClick={onOpenTheory}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-semibold transition-colors"
              title="Open physics formulas & derivations"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Physics</span> Theory
            </button>

            {/* Export Single-File HTML */}
            <button
              onClick={handleExportHtml}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold transition-colors"
              title="Download standalone single-file HTML"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Download</span> HTML
            </button>

            {/* Reset Current Tab */}
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors"
              title="Reset parameters to defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
