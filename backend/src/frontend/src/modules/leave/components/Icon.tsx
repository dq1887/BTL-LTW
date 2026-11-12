import type { CSSProperties } from 'react';
export type IconName = 'grid' | 'calendar' | 'layers' | 'plus' | 'search' | 'arrow' | 'logout' | 'moon' | 'sun' | 'close' | 'check' | 'refresh' | 'download' | 'chevron' | 'shield' | 'clock' | 'file';
const paths: Record<IconName, string> = {
  grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  calendar: 'M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2z M7 14h2 M15 14h2 M7 18h2',
  layers: 'm12 3 10 5-10 5L2 8z M2 12l10 5 10-5 M2 16l10 5 10-5',
  plus: 'M12 5v14 M5 12h14', search: 'M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  arrow: 'M4 12h16 M14 6l6 6-6 6', logout: 'M9 4H4v16h5 M10 12h11 M16 7l5 5-5 5',
  moon: 'M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11', sun: 'M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1.5 1.5 M17.5 17.5 19 19 M5 19l1.5-1.5 M17.5 6.5 19 5 M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  close: 'M6 6l12 12 M6 18 18 6', check: 'm5 12 4 4L19 6', refresh: 'M20 7V3l-3 3 M20 7a9 9 0 1 0 1 7 M20 7h-5',
  download: 'M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5', chevron: 'm9 5 7 7-7 7',
  shield: 'M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6z m-5 10 3 3 5-6',
  clock: 'M12 7v5l3 2 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0', file: 'M14 2H4v20h16V8z M14 2v6h6 M8 13h8 M8 17h5',
};
export default function Icon({ name, size = 18, style }: { name: IconName; size?: number; style?: CSSProperties }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={style}><path d={paths[name]} /></svg>;
}


