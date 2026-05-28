import { createContext, useContext, useState, useCallback, useMemo } from "react";

const ActiveCallContext = createContext(null);

export function ActiveCallProvider({ children }) {
  const [callTarget, setCallTargetState] = useState(null);

  const setCallTarget = useCallback((target) => {
    if (!target?.phone) {
      setCallTargetState(null);
      return;
    }
    setCallTargetState({
      phone: target.phone,
      label: target.label ?? "",
    });
  }, []);

  const clearCallTarget = useCallback(() => {
    setCallTargetState(null);
  }, []);

  const value = useMemo(
    () => ({ callTarget, setCallTarget, clearCallTarget }),
    [callTarget, setCallTarget, clearCallTarget]
  );

  return (
    <ActiveCallContext.Provider value={value}>
      {children}
    </ActiveCallContext.Provider>
  );
}

export function useActiveCall() {
  const ctx = useContext(ActiveCallContext);
  if (!ctx) {
    throw new Error("useActiveCall must be used within ActiveCallProvider");
  }
  return ctx;
}
