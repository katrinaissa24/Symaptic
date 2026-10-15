import { Link } from 'react-router-dom';

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <path d="M16 16C10 16 9 7 4 7" stroke="#3cc9b0" strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <path d="M16 16C22 16 22 6 28 6" stroke="#e8606e" strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <path d="M16 16C10 16 10 25 4 25" stroke="#6f96dc" strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <path d="M16 16C22 16 22 26 28 26" stroke="#f29a55" strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <circle cx="16" cy="16" r="5" fill="#c58ae0" />
    </svg>
  );
}

export function Logo({ small }: { small?: boolean }) {
  return (
    <Link to="/" className={`logo ${small ? 'small' : ''}`}>
      <LogoMark size={small ? 24 : 30} />
      {!small && <span>symaptic</span>}
    </Link>
  );
}
