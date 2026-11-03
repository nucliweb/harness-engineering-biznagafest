import { useEffect, useState } from 'react';
import { readLocalNow } from '../clock';

const REFRESH_MS = 30_000;

export function useNow(): string {
  const [now, setNow] = useState(readLocalNow);
  useEffect(() => {
    const timer = setInterval(() => setNow(readLocalNow()), REFRESH_MS);
    return () => clearInterval(timer);
  }, []);
  return now;
}
