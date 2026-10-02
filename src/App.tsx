/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Droplets, Gauge, Cog, HelpCircle, CheckCircle2 } from 'lucide-react';
import { UnitType } from './types.ts';
import { Header } from './components/Header.tsx';
import { BuoyancyLab } from './components/Tabs/BuoyancyLab.tsx';
import { HydrostaticPressure } from './components/Tabs/HydrostaticPressure.tsx';
import { HydraulicLift } from './components/Tabs/HydraulicLift.tsx';
import { TheoryModal } from './components/TheoryModal.tsx';

type TabType = 'buoyancy' | 'pressure' | 'pascal';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('buoyancy');
  const [selectedUnit, setSelectedUnit] = useState<UnitType>('kPa');
  const [fluidColorTheme, setFluidColorTheme] = useState<string>('water');
  const [isTheoryOpen, setIsTheoryOpen] = useState<boolean>(false);
  const [resetKey, setResetKey] = useState<number>(0);

  const handleReset = () => {
    setResetKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800 selection:bg-blue-100 selection:text-blue-900">
      {/* Top Navigation Bar */}
      <Header
        currentTab={activeTab}
        selectedUnit={selectedUnit}
        onSelectUnit={setSelectedUnit}
        fluidColorTheme={fluidColorTheme}
        onChangeFluidTheme={setFluidColorTheme}
        onReset={handleReset}
        onOpenTheory={() => setIsTheoryOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
        {/* Navigation Tabs (PhET Interactive Lab Style) */}
        <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-1.5">
          <button
            onClick={() => setActiveTab('buoyancy')}
            className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-sm font-semibold transition-all min-h-[44px] ${
              activeTab === 'buoyancy'
                ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-700/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Droplets className="w-4 h-4" />
            <span>1. Density & Buoyancy Lab</span>
          </button>

          <button
            onClick={() => setActiveTab('pressure')}
            className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-sm font-semibold transition-all min-h-[44px] ${
              activeTab === 'pressure'
                ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-700/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Gauge className="w-4 h-4" />
            <span>2. Hydrostatic Pressure & Depth</span>
          </button>

          <button
            onClick={() => setActiveTab('pascal')}
            className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-sm font-semibold transition-all min-h-[44px] ${
              activeTab === 'pascal'
                ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-700/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Cog className="w-4 h-4" />
            <span>3. Pascal's Hydraulic Lift</span>
          </button>
        </div>

        {/* Tab Content Panes */}
        <div key={`${activeTab}-${resetKey}`} className="flex-1">
          {activeTab === 'buoyancy' && (
            <BuoyancyLab fluidThemeColor={fluidColorTheme} />
          )}

          {activeTab === 'pressure' && (
            <HydrostaticPressure selectedUnit={selectedUnit} fluidThemeColor={fluidColorTheme} />
          )}

          {activeTab === 'pascal' && (
            <HydraulicLift selectedUnit={selectedUnit} />
          )}
        </div>

        {/* Bottom Educational Hints Banner */}
        <footer className="mt-auto pt-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Fluid Statics Lab based on Archimedes' Principle, Stevin's Law & Pascal's Principle.</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsTheoryOpen(true)}
              className="text-blue-600 hover:text-blue-800 font-medium underline flex items-center gap-1"
            >
              <HelpCircle className="w-3.5 h-3.5" /> Physics Formulas Reference
            </button>
            <span>Touch & Mouse Friendly · 60 FPS HTML5 Canvas</span>
          </div>
        </footer>
      </main>

      {/* Physics Theory Guide Modal */}
      <TheoryModal
        isOpen={isTheoryOpen}
        onClose={() => setIsTheoryOpen(false)}
        activeTopic={activeTab}
      />
    </div>
  );
}
