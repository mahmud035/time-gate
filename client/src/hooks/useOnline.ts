import { useEffect, useState } from 'react';

/**
 * Whether the browser believes it has a connection.
 *
 * Only a hint — a captive portal reports "online" while dropping every request
 * — so it is used to warn early, never to decide whether a punch succeeded.
 * The request itself remains the source of truth.
 */
export const useOnline = (): boolean => {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);

    window.addEventListener('online', update);
    window.addEventListener('offline', update);

    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  return online;
};
