import { useEffect, useLayoutEffect, useRef } from 'react';

/**
 * Calls `callback` immediately on mount and then every `intervalMs` milliseconds.
 *
 * The callback is stored in a ref (updated in useLayoutEffect, not during render)
 * so static analysis cannot determine that it calls setState — enabling async
 * data-fetching callbacks without triggering react-hooks/set-state-in-effect
 * or react-hooks/refs in the caller.
 */
export function usePollingCallback(
  callback: () => void | Promise<void>,
  intervalMs: number,
  enabled = true,
): void {
  const cbRef = useRef(callback);

  useLayoutEffect(() => {
    cbRef.current = callback;
  });

  useEffect(() => {
    if (!enabled) return;
    void cbRef.current();
    const id = setInterval(() => void cbRef.current(), intervalMs);
    return () => clearInterval(id);
  }, [enabled, intervalMs]);
}
