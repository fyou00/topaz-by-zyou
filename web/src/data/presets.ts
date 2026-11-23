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
    id: 'cc-blue-beats',
    number: '01',
    name: 'CC BLUE BEATS',
    description: 'Nuansa biru ritmis dengan aksen kontras hidup.',
    videoFile: 'CC BLUE BEATS.mp4',
    posterFile: 'cc-blue-beats.jpg',
  },
  {
    id: 'cc-blue-bloom',
    number: '02',
    name: 'CC BLUE BLOOM',
    description: 'Pendar biru bercahaya pada area highlight klip.',
    videoFile: 'CC BLUE BLOOM.mp4',
    posterFile: 'cc-blue-bloom.jpg',
  },
  {
    id: 'cc-blue-light',
    number: '03',
    name: 'CC BLUE LIGHT',
    description: 'Biru terang bersih dengan bayangan tetap ringan.',
    videoFile: 'CC BLUE LIGHT.mp4',
    posterFile: 'cc-blue-light.jpg',
  },
  {
    id: 'cc-blue-soft',
    number: '04',
    name: 'CC BLUE SOFT',
    description: 'Tone biru lembut untuk suasana visual yang tenang.',
    videoFile: 'CC BLUE SOFT.mp4',
    posterFile: 'cc-blue-soft.jpg',
  },
  {
    id: 'cc-deep-blue',
    number: '05',
    name: 'CC DEEP BLUE',
    description: 'Biru pekat dengan kedalaman shadow yang tegas.',
    videoFile: 'CC DEEP BLUE.mp4',
    posterFile: 'cc-deep-blue.jpg',
  },
  {
    id: 'cc-dream-glow',
    number: '06',
    name: 'CC DREAM GLOW',
    description: 'Efek glow dreamy yang halus di bagian terang.',
    videoFile: 'CC DREAM GLOW.mp4',
    posterFile: 'cc-dream-glow.jpg',
  },
  {
    id: 'cc-dream-haze',
    number: '07',
    name: 'CC DREAM HAZE',
    description: 'Kabut cahaya tipis untuk kesan lembut dan atmosferik.',
    videoFile: 'CC DREAM HAZE.mp4',
    posterFile: 'cc-dream-haze.jpg',
  },
  {
    id: 'cc-dream-soft',
    number: '08',
    name: 'CC DREAM SOFT',
    description: 'Pelembutan tone menyeluruh dengan kontras empuk.',
    videoFile: 'CC DREAM SOFT.mp4',
    posterFile: 'cc-dream-soft.jpg',
  },
  {
    id: 'cc-honey-glow',
    number: '09',
    name: 'CC HONEY GLOW',
    description: 'Cahaya keemasan hangat dengan glow ke bagian highlight.',
    videoFile: 'CC HONEY GLOW.mp4',
    posterFile: 'cc-honey-glow.jpg',
  },
  {
    id: 'cc-nature-glow',
    number: '10',
    name: 'CC NATURE GLOW',
    description: 'Warna segar alami untuk lanskap dan pepohonan.',
    videoFile: 'CC NATURE GLOW.mp4',
    posterFile: 'cc-nature-glow.jpg',
  },
  {
    id: 'cc-pink-bloom',
    number: '11',
    name: 'CC PINK BLOOM',
    description: 'Sentuhan merah muda lembut pada pendar cahaya.',
    videoFile: 'CC PINK BLOOM.mp4',
    posterFile: 'cc-pink-bloom.jpg',
  },
  {
    id: 'cc-soft-clean',
    number: '12',
    name: 'CC SOFT CLEAN',
    description: 'Tone bersih dan halus untuk klip natural.',
    videoFile: 'CC SOFT CLEAN.mp4',
    posterFile: 'cc-soft-clean.jpg',
  },
  {
    id: 'cc-soft-fresh',
    number: '13',
    name: 'CC SOFT FRESH',
    description: 'Warna cerah segar dengan kontras lembut.',
    videoFile: 'CC SOFT FRESH.mp4',
    posterFile: 'cc-soft-fresh.jpg',
  },
  {
    id: 'cc-soft-peach',
    number: '14',
    name: 'CC SOFT PEACH',
    description: 'Nuansa peach hangat lembut dengan kulit terlihat rapi.',
    videoFile: 'CC SOFT PEACH.mp4',
    posterFile: 'cc-soft-peach.jpg',
  },
  {
    id: 'cc-sunny-fresh',
    number: '15',
    name: 'CC SUNNY FRESH',
    description: 'Cahaya siang cerah hangat dengan langit tetap segar.',
    videoFile: 'CC SUNNY FRESH.mp4',
    posterFile: 'cc-sunny-fresh.jpg',
  },
  {
    id: 'sharpen',
    number: '16',
    name: 'SHARPEN',
    description: 'Penajaman detail ekstra untuk klip agar terlihat tegas.',
    videoFile: 'SHARPEN.mp4',
    posterFile: 'sharpen.jpg',
  },
  {
    id: 'sharpen-v2',
    number: '17',
    name: 'Sharpen V2',
    description: 'Racikan ketajaman lanjutan yang tetap halus di tepi objek.',
    videoFile: 'Sharpen V2.mp4',
    posterFile: 'sharpen-v2.jpg',
  },
  {
    id: 'topaz',
    number: '18',
    name: 'TOPAZ',
    description: 'Hasil peningkatan resolusi dan kebersihan detail Topaz Labs.',
    videoFile: 'TOPAZ.mp4',
    posterFile: 'topaz.jpg',
  },
];

export function formatOrderMessage(preset: CCPreset): string {
  return `Halo Zyou, saya mau pesan jasa Topaz / Color Correction memakai preset ${preset.name}.`;
}
