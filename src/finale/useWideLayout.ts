import { useEffect, useState } from 'react';

const QUERY = '(min-aspect-ratio: 11/10)';
const read = () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(QUERY).matches;

/** true on landscape screens (phones on their side, laptops): the finale cards lay out side by side. */
export function useWideLayout(): boolean {
  const [wide, setWide] = useState(read);
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia(QUERY);
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return wide;
}
