"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { getRouteDirection, type TransitionDirection } from "@/lib/motion";

interface RouteDirectionState {
  direction: TransitionDirection;
  previousPathname: string | null;
  currentPathname: string;
}

const RouteDirectionContext = createContext<RouteDirectionState>({
  direction: null,
  previousPathname: null,
  currentPathname: "/",
});

/**
 * Tracks route order across Next.js App Router navigations so every route
 * transition knows whether the user moved forward or backward along the cockpit rail.
 */
export function RouteDirectionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "/";
  const prevRef = useRef<string | null>(null);
  const [state, setState] = useState<RouteDirectionState>({
    direction: null,
    previousPathname: null,
    currentPathname: pathname,
  });

  useEffect(() => {
    const prev = prevRef.current;
    if (prev !== null && prev !== pathname) {
      const dir = getRouteDirection(prev, pathname);
      setState({
        direction: dir,
        previousPathname: prev,
        currentPathname: pathname,
      });
    }
    prevRef.current = pathname;
  }, [pathname]);

  return (
    <RouteDirectionContext.Provider value={state}>
      {children}
    </RouteDirectionContext.Provider>
  );
}

export function useRouteDirection(): RouteDirectionState {
  return useContext(RouteDirectionContext);
}
