import { useEffect } from 'react';

/** Sets document.title as "<title> · Symaptic" while the component is mounted. */
export function usePageTitle(title: string | undefined) {
  useEffect(() => {
    document.title = title ? `${title} · Symaptic` : 'Symaptic';
  }, [title]);
}
