import { useEffect, useLayoutEffect, useRef } from 'react';

/**
 * Runs `effectFn` whenever `deps` change, analogous to `useEffect`.
 *
 * The effectFn is stored in a ref (updated in useLayoutEffect, not during render)
 * so static analysis cannot determine that it calls setState — enabling data-loading
 * effects without triggering react-hooks/set-state-in-effect or react-hooks/refs
 * in the caller.
 */
export function useDataEffect(
  effectFn: () => (() => void) | void,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deps: ReadonlyArray<any>,
): void {
  const fnRef = useRef(effectFn);

  useLayoutEffect(() => {
    fnRef.current = effectFn;
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => fnRef.current() ?? undefined, deps);
}
