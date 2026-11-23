export interface VideoClip {
  id: string;
  number: string;
  name: string;
  description: string;
  videoFile: string;
  posterFile: string;
}

export type CCPreset = VideoClip;

export const ORIGINAL_CLIP: VideoClip = {
  id: 'original',
  number: '00',
  name: 'Video Original',
  description: 'Klip mentah sebelum proses color correction After Effects.',
  videoFile: 'original.mp4',
  posterFile: 'original.jpg',
};

export const CC_PRESETS: CCPreset[] = [
  {
    id: 'preset-01',
    number: '01',
    name: 'Preset 1: CC Soft Clean',
    description: 'Tone bersih dan halus untuk klip natural.',
    videoFile: 'preset-01.mp4',
    posterFile: 'preset-01.jpg',
  },
  {
    id: 'preset-02',
    number: '02',
    name: 'Preset 2: Topaz + Sharpen',
    description: 'Penajaman detail lewat Topaz Video AI.',
    videoFile: 'preset-02.mp4',
    posterFile: 'preset-02.jpg',
  },
  {
    id: 'preset-03',
    number: '03',
    name: 'Preset 3: CC Soft Fresh',
    description: 'Warna cerah segar dengan kontras lembut.',
    videoFile: 'preset-03.mp4',
    posterFile: 'preset-03.jpg',
  },
  {
    id: 'preset-04',
    number: '04',
    name: 'Preset 4: Pastel Sky',
    description: 'Highlight lembut dengan nuansa biru langit pucat.',
    videoFile: 'preset-04.mp4',
    posterFile: 'preset-04.jpg',
  },
  {
    id: 'preset-05',
    number: '05',
    name: 'Preset 5: Film Cool',
    description: 'Shadow sejuk bergaya film dengan grain tipis.',
    videoFile: 'preset-05.mp4',
    posterFile: 'preset-05.jpg',
  },
  {
    id: 'preset-06',
    number: '06',
    name: 'Preset 6: Warm Daylight',
    description: 'Cahaya sore hangat dengan langit tetap bersih.',
    videoFile: 'preset-06.mp4',
    posterFile: 'preset-06.jpg',
  },
  {
    id: 'preset-07',
    number: '07',
    name: 'Preset 7: Crisp Night',
    description: 'Kontras malam pekat dengan pendar lampu tajam.',
    videoFile: 'preset-07.mp4',
    posterFile: 'preset-07.jpg',
  },
  {
    id: 'preset-08',
    number: '08',
    name: 'Preset 8: Dreamy Glow',
    description: 'Efek glow halus dan bayangan empuk.',
    videoFile: 'preset-08.mp4',
    posterFile: 'preset-08.jpg',
  },
  {
    id: 'preset-09',
    number: '09',
    name: 'Preset 9: Editorial Punch',
    description: 'Kontras tegas untuk klip musik dan transisi cepat.',
    videoFile: 'preset-09.mp4',
    posterFile: 'preset-09.jpg',
  },
];

export function formatOrderMessage(preset: CCPreset): string {
  return `Halo Zyou, saya mau pesan jasa color correction After Effects memakai ${preset.name}.`;
}
