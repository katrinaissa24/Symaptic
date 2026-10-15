import type { ReactNode } from 'react';
import type { Shape } from '../lib/types';
import { SHAPE_PATHS } from './geometry';

const I = ({ children, size = 22 }: { children: ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
);

export const Icon = {
  plus: <I><path d="M12 5v14M5 12h14" /></I>,
  sibling: <I><path d="M4 7h7M4 7v10h7" /><path d="M16 14v6M13 17h6" /></I>,
  comment: (
    <I>
      <path d="M7 15.5c-2.5 0-4-1.7-4-3.8S4.8 8 7 8c.4-2.3 2.3-4 4.8-4 2.4 0 4.3 1.6 4.8 3.8 2.6.1 4.4 1.8 4.4 4s-1.8 3.7-4.2 3.7z" />
      <circle cx="6" cy="19" r="1.3" />
      <circle cx="3.6" cy="21.6" r=".7" />
    </I>
  ),
  shape: <I><path d="M7 3h10l5 9-5 9H7l-5-9z" /></I>,
  line: <I><path d="M3 18c4 0 4-12 9-12s5 12 9 12" /></I>,
  link: <I><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></I>,
  duplicate: <I><rect x="8" y="8" width="12" height="12" rx="2.5" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></I>,
  trash: <I><path d="M6 6l12 12M18 6L6 18" /></I>,
  fit: <I><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></I>,
  undo: <I><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></I>,
  redo: <I><path d="m15 14 5-5-5-5" /><path d="M20 9H10a6 6 0 0 0 0 12h3" /></I>,
  arrow: <I><path d="M4 12h15M14 6l6 6-6 6" /></I>,
  check: <I><path d="m5 12 5 5L20 7" /></I>,
  text: <I><path d="M5 6h14M12 6v13" /></I>,
  bold: <I><path d="M7 4h6a4 4 0 0 1 0 8H7zM7 12h7a4 4 0 0 1 0 8H7z" /></I>,
  share: <I><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" /></I>,
  back: <I><path d="M15 18l-6-6 6-6" /></I>,
  tidy: <I><path d="M4 12h4M8 6v12M8 6h4M8 12h4M8 18h4M15 6h5M15 12h5M15 18h5" /></I>,
};

export function ShapeIcon({ shape, size = 26 }: { shape: Shape; size?: number }) {
  const p = SHAPE_PATHS[shape];
  const common = { fill: 'currentColor', fillOpacity: 0.25, stroke: 'currentColor', strokeWidth: 2 };
  return (
    <svg width={size} height={size * 0.75} viewBox="0 0 40 30" aria-hidden>
      {p ? (
        <g transform="translate(3,3) scale(0.34,0.24)">
          <path d={p} {...common} strokeWidth={7} />
        </g>
      ) : shape === 'pill' ? (
        <rect x="3" y="7" width="34" height="16" rx="8" {...common} />
      ) : shape === 'rounded' ? (
        <rect x="3" y="5" width="34" height="20" rx="6" {...common} />
      ) : shape === 'rect' ? (
        <rect x="3" y="5" width="34" height="20" rx="1" {...common} />
      ) : shape === 'ellipse' ? (
        <ellipse cx="20" cy="15" rx="17" ry="11" {...common} />
      ) : shape === 'circle' ? (
        <circle cx="20" cy="15" r="12" {...common} />
      ) : shape === 'underline' ? (
        <g>
          <path d="M6 13h22" stroke="currentColor" strokeWidth="2" strokeOpacity=".5" />
          <path d="M3 21h34" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
        </g>
      ) : (
        <text x="20" y="21" textAnchor="middle" fontSize="16" fontWeight="700" fill="currentColor">Aa</text>
      )}
    </svg>
  );
}
