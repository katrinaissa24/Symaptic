import { Link } from 'react-router-dom';

/** Monochrome mark: four branches from a centre, drawn in the accent colour. */
export function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <svg className="logo-mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round">
        <path d="M16 16C11 16 11 7 5 7" />
        <path d="M16 16C21 16 21 7 27 7" />
        <path d="M16 16C11 16 11 25 5 25" />
        <path d="M16 16C21 16 21 25 27 25" />
      </g>
      <circle cx="16" cy="16" r="4" fill="currentColor" />
    </svg>
  );
}

export function Logo({ small }: { small?: boolean }) {
  return (
    <Link to="/" className={`logo${small ? ' small' : ''}`} aria-label="Symaptic home">
      <LogoMark size={small ? 20 : 24} />
      {!small && <span>Symaptic</span>}
    </Link>
  );
}
