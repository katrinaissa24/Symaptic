import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

/** Slim banner at the top of the window while the browser reports no connection. */
export function OfflineBanner() {
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' && !navigator.onLine);
  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  if (!offline) return null;
  return (
    <div className="offline-banner" role="status" aria-live="polite">
      <WifiOff /> You’re offline. Changes will be saved when the connection returns.
    </div>
  );
}
