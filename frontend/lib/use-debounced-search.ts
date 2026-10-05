'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Debounces a search box for server-side search. Returns the trimmed term once
 * typing pauses; `onSettle` (e.g. reset to page 1) runs in the same render so
 * the list is fetched once per new term.
 */
export function useDebouncedSearch(term: string, onSettle?: () => void, delay = 500): string {
  const [settled, setSettled] = useState('');
  const onSettleRef = useRef(onSettle);
  onSettleRef.current = onSettle;

  useEffect(() => {
    const next = term.trim();
    if (next === settled) return;
    const timer = setTimeout(() => {
      setSettled(next);
      onSettleRef.current?.();
    }, delay);
    return () => clearTimeout(timer);
  }, [term, settled, delay]);

  return settled;
}

/** `&search=…` for a list URL, or '' when there is nothing to search. */
export function searchParam(term: string): string {
  return term ? `&search=${encodeURIComponent(term)}` : '';
}
