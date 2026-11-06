import { useEffect, useState } from 'react';

export default function RotatingWord({ words }: { words: string[] }) {
  const [i, setI] = useState(0);
  const [out, setOut] = useState(false);

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => {
      setOut(true);
      setTimeout(() => { setI((n) => (n + 1) % words.length); setOut(false); }, 260);
    }, 2600);
    return () => clearInterval(id);
  }, [words.length]);

  return <span id="rot" className={out ? 'out' : ''}>{words[i]}</span>;
}
