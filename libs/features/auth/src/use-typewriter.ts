import { useEffect, useState } from 'react';

export interface TypewriterOptions {
  typeSpeed?: number;
  eraseSpeed?: number;
  pauseAfterType?: number;
  pauseBeforeNext?: number;
}

export function useTypewriter(
  phrases: readonly string[],
  options: TypewriterOptions = {},
): { text: string; isTyping: boolean } {
  const {
    typeSpeed = 45,
    eraseSpeed = 22,
    pauseAfterType = 1800,
    pauseBeforeNext = 400,
  } = options;

  const [phraseIndex, setPhraseIndex] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [phase, setPhase] = useState<'typing' | 'pausing' | 'erasing' | 'idle'>('typing');

  useEffect(() => {
    if (phrases.length === 0) return;

    const phrase = phrases[phraseIndex] ?? '';

    if (phase === 'typing') {
      if (charCount < phrase.length) {
        const id = setTimeout(() => setCharCount((n) => n + 1), typeSpeed);
        return () => clearTimeout(id);
      }
      const id = setTimeout(() => setPhase('pausing'), 0);
      return () => clearTimeout(id);
    }

    if (phase === 'pausing') {
      const id = setTimeout(() => setPhase(phrases.length === 1 ? 'idle' : 'erasing'), pauseAfterType);
      return () => clearTimeout(id);
    }

    if (phase === 'erasing') {
      if (charCount > 0) {
        const id = setTimeout(() => setCharCount((n) => n - 1), eraseSpeed);
        return () => clearTimeout(id);
      }
      const id = setTimeout(() => {
        setPhraseIndex((i) => (i + 1) % phrases.length);
        setPhase('typing');
      }, pauseBeforeNext);
      return () => clearTimeout(id);
    }

    return undefined;
  }, [phrases, phraseIndex, charCount, phase, typeSpeed, eraseSpeed, pauseAfterType, pauseBeforeNext]);

  const phrase = phrases[phraseIndex] ?? '';
  return {
    text: phrase.slice(0, charCount),
    isTyping: phase === 'typing' || phase === 'erasing',
  };
}
