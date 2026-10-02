export type UnitType = 'Pa' | 'kPa' | 'bar' | 'atm' | 'psi';

export interface FluidPreset {
  id: string;
  name: string;
  density: number; // kg/m^3
  color: string;
  surfaceColor: string;
  alpha: number;
}

export interface ObjectPreset {
  id: string;
  name: string;
  density: number; // kg/m^3
  defaultMass: number; // kg
  defaultVolume: number; // Liters
  color: string;
  texture?: 'wood' | 'ice' | 'metal' | 'brick' | 'gold';
}

export interface GravityPreset {
  id: string;
  name: string;
  g: number; // m/s^2
}

export interface HydraulicPreset {
  id: string;
  name: string;
  description: string;
  a1: number; // m^2
  a2: number; // m^2
  f1: number; // N
  loadMass: number; // kg
  iconName: string;
}

export const FLUID_PRESETS: FluidPreset[] = [
  { id: 'water', name: 'Fresh Water', density: 1000, color: '#38bdf8', surfaceColor: '#0284c7', alpha: 0.55 },
  { id: 'gasoline', name: 'Gasoline', density: 680, color: '#facc15', surfaceColor: '#ca8a04', alpha: 0.5 },
  { id: 'olive_oil', name: 'Olive Oil', density: 920, color: '#84cc16', surfaceColor: '#65a30d', alpha: 0.6 },
  { id: 'honey', name: 'Honey', density: 1420, color: '#f59e0b', surfaceColor: '#b45309', alpha: 0.75 },
  { id: 'mercury', name: 'Mercury', density: 13600, color: '#94a3b8', surfaceColor: '#64748b', alpha: 0.9 },
  { id: 'custom', name: 'Custom Fluid', density: 1000, color: '#06b6d4', surfaceColor: '#0891b2', alpha: 0.55 },
];

export const OBJECT_PRESETS: ObjectPreset[] = [
  { id: 'wood', name: 'Wood (Pine)', density: 500, defaultMass: 2.5, defaultVolume: 5.0, color: '#b45309', texture: 'wood' },
  { id: 'ice', name: 'Ice', density: 917, defaultMass: 4.585, defaultVolume: 5.0, color: '#bae6fd', texture: 'ice' },
  { id: 'aluminum', name: 'Aluminum', density: 2700, defaultMass: 13.5, defaultVolume: 5.0, color: '#94a3b8', texture: 'metal' },
  { id: 'brick', name: 'Brick', density: 2000, defaultMass: 10.0, defaultVolume: 5.0, color: '#b91c1c', texture: 'brick' },
  { id: 'gold', name: 'Gold', density: 19300, defaultMass: 96.5, defaultVolume: 5.0, color: '#eab308', texture: 'gold' },
  { id: 'custom', name: 'Custom Object', density: 800, defaultMass: 4.0, defaultVolume: 5.0, color: '#8b5cf6' },
];

export const GRAVITY_PRESETS: GravityPreset[] = [
  { id: 'earth', name: 'Earth (9.8 m/s²)', g: 9.80 },
  { id: 'moon', name: 'Moon (1.6 m/s²)', g: 1.62 },
  { id: 'jupiter', name: 'Jupiter (24.8 m/s²)', g: 24.79 },
  { id: 'zero_g', name: 'Zero-G (0.0 m/s²)', g: 0.00 },
];

export const HYDRAULIC_PRESETS: HydraulicPreset[] = [
  {
    id: 'car_jack',
    name: 'Hydraulic Car Jack',
    description: 'A modest human arm force of 150 N easily lifts a 1500 kg sedan thanks to a 1:100 piston area ratio!',
    a1: 0.01,
    a2: 1.00,
    f1: 150,
    loadMass: 1500,
    iconName: 'car'
  },
  {
    id: 'brake_system',
    name: 'Automotive Disc Brake',
    description: 'Driver foot brake pedal input of 200 N is hydraulically multiplied to 3000 N clamping force onto brake rotors.',
    a1: 0.02,
    a2: 0.30,
    f1: 200,
    loadMass: 300,
    iconName: 'disc'
  },
  {
    id: 'industrial_press',
    name: 'Heavy Hydraulic Press',
    description: 'High pressure transmission compressing industrial metal billets with massive force multiplication.',
    a1: 0.005,
    a2: 1.25,
    f1: 400,
    loadMass: 10000,
    iconName: 'hammer'
  }
];

// Pressure unit conversions from Pascals (Pa)
export function convertPressure(pa: number, unit: UnitType): { value: number; label: string } {
  switch (unit) {
    case 'kPa':
      return { value: pa / 1000, label: 'kPa' };
    case 'bar':
      return { value: pa / 100000, label: 'bar' };
    case 'atm':
      return { value: pa / 101325, label: 'atm' };
    case 'psi':
      return { value: pa / 6894.757, label: 'psi' };
    case 'Pa':
    default:
      return { value: pa, label: 'Pa' };
  }
}
