import { createContext, useContext, type ReactNode } from "react";

const PortalTargetContext = createContext<HTMLElement | undefined>(undefined);

interface MediaPickerPortalProviderProps {
  readonly children: ReactNode;
  readonly target?: HTMLElement;
}

/**
 * Internal portal boundary used by non-React hosts with isolated DOM roots.
 * Ordinary React consumers keep the established document.body fallback.
 */
export function MediaPickerPortalProvider({
  children,
  target,
}: MediaPickerPortalProviderProps) {
  return (
    <PortalTargetContext.Provider value={target}>
      {children}
    </PortalTargetContext.Provider>
  );
}

export function useMediaPickerPortalTarget(): HTMLElement | undefined {
  return useContext(PortalTargetContext);
}
