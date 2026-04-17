"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface HomeSearchContextValue {
  searchPhrase: string;
  setSearchPhrase: (phrase: string) => void;
}

const HomeSearchContext = createContext<HomeSearchContextValue | null>(null);

export function HomeSearchProvider({ children }: { children: ReactNode }) {
  const [searchPhrase, setSearchPhraseState] = useState("");

  const setSearchPhrase = useCallback((phrase: string) => {
    setSearchPhraseState(phrase);
  }, []);

  const value = useMemo(
    () => ({ searchPhrase, setSearchPhrase }),
    [searchPhrase, setSearchPhrase]
  );

  return (
    <HomeSearchContext.Provider value={value}>
      {children}
    </HomeSearchContext.Provider>
  );
}

export function useHomeSearch(): HomeSearchContextValue {
  const ctx = useContext(HomeSearchContext);
  if (!ctx) {
    throw new Error("useHomeSearch must be used within HomeSearchProvider");
  }
  return ctx;
}
