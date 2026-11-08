import manifest from './outside-photos.json';

export interface Photo {
  id: string;
  kind: 'hike' | 'travel' | 'food';
  country: string;
  area: string;
  year: number;
  caption: string;
  alt: string;
  width: number;
  height: number;
  bytes: number;
}

export const photos: Photo[] = manifest as Photo[];

export interface Country {
  name: string;
  code: string;
  years: number[];
  areas: string[];
}

export const countries: Country[] = [
  { name: 'South Korea', code: 'KOR', years: [2024], areas: ['Seoul', 'Busan', 'Incheon', 'Jeju'] },
  { name: 'Japan', code: 'JPN', years: [2023, 2024, 2026], areas: ['Tokyo', 'Osaka', 'Kyoto', 'Kamakura', 'Hakone', 'Lake Kawaguchi (Mt. Fuji)'] },
  { name: 'Vietnam', code: 'VNM', years: [2024], areas: ['Ho Chi Minh City', 'Hanoi', 'Ha Long Bay', 'Mekong Delta'] },
  { name: 'Taiwan', code: 'TWN', years: [2024], areas: ['Taipei', 'Jiufen, Shifen and Yehliu'] },
  { name: 'Thailand', code: 'THA', years: [2023, 2024], areas: ['Bangkok', 'Koh Tao', 'Koh Phangan', 'Koh Lanta', 'Chumphon'] },
  { name: 'Mexico', code: 'MEX', years: [2025], areas: ['Riviera Maya'] },
  { name: 'Singapore', code: 'SGP', years: [2023], areas: ['Singapore'] },
  { name: 'Malaysia', code: 'MYS', years: [2023], areas: ['Kuala Lumpur'] },
  { name: 'Indonesia', code: 'IDN', years: [], areas: [] },
];

export const states: string[] = ['California', 'Colorado', 'Florida', 'New York', 'Oregon', 'Washington'];

export interface Trail {
  name: string;
  place: string;
  year?: number;
}

export const trails: Trail[] = [
  { name: 'Hwangnyeongsan', place: 'Busan', year: 2024 },
  { name: 'Jeju Island trail', place: 'Jeju', year: 2024 },
  { name: 'Ha Long Bay', place: 'Vietnam', year: 2024 },
  { name: 'Rocky Mountains', place: 'Colorado', year: 2025 },
  { name: 'Point Lobos', place: 'California', year: 2025 },
  { name: 'Hawk Hill', place: 'Marin Headlands', year: 2024 },
  { name: 'Mount Tamalpais', place: 'California' },
  { name: 'Point Reyes', place: 'California' },
  { name: 'Mission Peak', place: 'California' },
  { name: 'Castle Rock State Park', place: 'California' },
  { name: 'Pinnacles National Park', place: 'California' },
  { name: 'Yosemite', place: 'California' },
];

export const headline = '9 countries · 6 states';

export const photosFor = (country: string): Photo[] =>
  photos.filter((p) => p.country === country && p.kind !== 'food');

export const foodPhotos: Photo[] = photos.filter((p) => p.kind === 'food');
export const hikePhotos: Photo[] = photos.filter((p) => p.kind === 'hike');

export function yearsLabel(years: number[]): string {
  return years.join(', ');
}
