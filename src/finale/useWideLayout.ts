import { useEffect, useState } from 'react';

/** true only on short landscape screens (phones on their side): desktop keeps the portrait layout. */
const read = () => typeof window !== 'undefined' && window.innerHeight < 520;

export function useWideLayout(): boolean {
  const [wide, setWide] = useState(read);
  useEffect(() => {
    const on = () => setWide(read());
    on();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return wide;
}
