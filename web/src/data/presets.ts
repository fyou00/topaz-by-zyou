import type { SpatialFxParams } from '../engine/webgl-cc-engine';

export interface CCPreset {
  id: string;
  number: string;
  name: string;
  description: string;
  lutUrl: string;
  fx: SpatialFxParams;
  isCalibrated: boolean;
}

export interface SampleMedia {
  id: string;
  label: string;
  src: string;
  alt: string;
}

export const SAMPLE_MEDIA: SampleMedia[] = [
  {
    id: 'daylight',
    label: 'Sample Siang',
    src: '/samples/sample-daylight.jpg',
    alt: 'Eksterior kafe minimalis bernuansa putih dan biru muda di bawah langit siang cerah',
  },
  {
    id: 'night',
    label: 'Sample Malam',
    src: '/samples/sample-night-neon.jpg',
    alt: 'Sudut jalan malam sehabis hujan dengan pantulan lampu hangat dan biru pada aspal basah',
  },
];

export const CC_PRESETS: CCPreset[] = [
  {
    id: 'preset-01',
    number: '01',
    name: 'Preset 1: CC Soft Clean',
    description: 'Tone bersih dan halus untuk klip natural.',
    lutUrl: '/luts/preset_01.png',
    isCalibrated: false,
    fx: {
      glowIntensity: 0.24,
      glowThreshold: 0.76,
      glowRadius: 0.45,
      glowTint: [0.96, 0.99, 1.0],
      softFocus: 0.18,
      sharpen: 0.22,
      vignette: 0.08,
      grain: 0.03,
      chromaticAberration: 0,
    },
  },
  {
    id: 'preset-02',
    number: '02',
    name: 'Preset 2: Topaz + Sharpen',
    description: 'Penajaman detail lewat Topaz Video AI.',
    lutUrl: '/luts/preset_02.png',
    isCalibrated: false,
    fx: {
      glowIntensity: 0.1,
      glowThreshold: 0.85,
      glowRadius: 0.28,
      glowTint: [1.0, 1.0, 1.0],
      softFocus: 0,
      sharpen: 0.75,
      vignette: 0.12,
      grain: 0.02,
      chromaticAberration: 0,
    },
  },
  {
    id: 'preset-03',
    number: '03',
    name: 'Preset 3: CC Soft Fresh',
    description: 'Warna cerah segar dengan kontras lembut.',
    lutUrl: '/luts/preset_03.png',
    isCalibrated: false,
    fx: {
      glowIntensity: 0.34,
      glowThreshold: 0.7,
      glowRadius: 0.52,
      glowTint: [0.92, 0.98, 1.0],
      softFocus: 0.24,
      sharpen: 0.3,
      vignette: 0.05,
      grain: 0.02,
      chromaticAberration: 0.08,
    },
  },
  {
    id: 'preset-04',
    number: '04',
    name: 'Preset 4: Pastel Sky',
    description: 'Highlight lembut dengan nuansa biru langit pucat.',
    lutUrl: '/luts/preset_04.png',
    isCalibrated: false,
    fx: {
      glowIntensity: 0.42,
      glowThreshold: 0.65,
      glowRadius: 0.62,
      glowTint: [0.94, 0.97, 1.0],
      softFocus: 0.36,
      sharpen: 0.12,
      vignette: 0.06,
      grain: 0.04,
      chromaticAberration: 0.06,
    },
  },
  {
    id: 'preset-05',
    number: '05',
    name: 'Preset 5: Film Cool',
    description: 'Shadow sejuk bergaya film dengan grain tipis.',
    lutUrl: '/luts/preset_05.png',
    isCalibrated: false,
    fx: {
      glowIntensity: 0.22,
      glowThreshold: 0.72,
      glowRadius: 0.42,
      glowTint: [0.9, 0.96, 1.0],
      softFocus: 0.08,
      sharpen: 0.34,
      vignette: 0.26,
      grain: 0.11,
      chromaticAberration: 0.14,
    },
  },
  {
    id: 'preset-06',
    number: '06',
    name: 'Preset 6: Warm Daylight',
    description: 'Cahaya sore hangat dengan langit tetap bersih.',
    lutUrl: '/luts/preset_06.png',
    isCalibrated: false,
    fx: {
      glowIntensity: 0.38,
      glowThreshold: 0.68,
      glowRadius: 0.56,
      glowTint: [1.0, 0.93, 0.82],
      softFocus: 0.2,
      sharpen: 0.28,
      vignette: 0.14,
      grain: 0.05,
      chromaticAberration: 0.05,
    },
  },
  {
    id: 'preset-07',
    number: '07',
    name: 'Preset 7: Crisp Night',
    description: 'Kontras malam pekat dengan pendar lampu tajam.',
    lutUrl: '/luts/preset_07.png',
    isCalibrated: false,
    fx: {
      glowIntensity: 0.62,
      glowThreshold: 0.62,
      glowRadius: 0.64,
      glowTint: [0.92, 0.96, 1.0],
      softFocus: 0.06,
      sharpen: 0.52,
      vignette: 0.32,
      grain: 0.07,
      chromaticAberration: 0.22,
    },
  },
  {
    id: 'preset-08',
    number: '08',
    name: 'Preset 8: Dreamy Glow',
    description: 'Efek glow halus dan bayangan empuk.',
    lutUrl: '/luts/preset_08.png',
    isCalibrated: false,
    fx: {
      glowIntensity: 0.72,
      glowThreshold: 0.58,
      glowRadius: 0.76,
      glowTint: [1.0, 0.95, 0.92],
      softFocus: 0.48,
      sharpen: 0.14,
      vignette: 0.16,
      grain: 0.06,
      chromaticAberration: 0.12,
    },
  },
  {
    id: 'preset-09',
    number: '09',
    name: 'Preset 9: Editorial Punch',
    description: 'Kontras tegas untuk klip musik dan transisi cepat.',
    lutUrl: '/luts/preset_09.png',
    isCalibrated: false,
    fx: {
      glowIntensity: 0.18,
      glowThreshold: 0.8,
      glowRadius: 0.36,
      glowTint: [1.0, 1.0, 1.0],
      softFocus: 0,
      sharpen: 0.68,
      vignette: 0.22,
      grain: 0.04,
      chromaticAberration: 0.1,
    },
  },
];

export function formatOrderMessage(preset: CCPreset): string {
  return `Halo Zyou, saya mau pesan jasa color correction After Effects memakai ${preset.name}.`;
}
