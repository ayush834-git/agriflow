"use client";

import { APIProvider } from "@vis.gl/react-google-maps";
import { type ReactNode, createContext, useContext } from "react";

const MapReadyContext = createContext<boolean>(false);

export function useIsMapReady() {
  return useContext(MapReadyContext);
}

export function MapProvider({ children }: { children: ReactNode }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey || apiKey.length === 0) {
    return <MapReadyContext.Provider value={false}>{children}</MapReadyContext.Provider>;
  }

  return (
    <APIProvider apiKey={apiKey}>
      <MapReadyContext.Provider value={true}>{children}</MapReadyContext.Provider>
    </APIProvider>
  );
}
