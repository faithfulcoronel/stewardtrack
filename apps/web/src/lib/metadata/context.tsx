"use client";

import * as React from "react";

export interface MetadataClientContextValue {
  role: string | null;
  tenant: string | null;
  locale: string | null;
  featureFlags: Record<string, boolean>;
}

const defaultContext: MetadataClientContextValue = {
  role: null,
  tenant: null,
  locale: null,
  featureFlags: {},
};

const MetadataClientContext = React.createContext<MetadataClientContextValue>(defaultContext);

interface MetadataClientProviderProps {
  value?: Partial<MetadataClientContextValue> | null;
  children: React.ReactNode;
}

export function MetadataClientProvider(props: MetadataClientProviderProps) {
  const memoizedValue = React.useMemo<MetadataClientContextValue>(() => {
    return {
      role: props.value?.role ?? null,
      tenant: props.value?.tenant ?? null,
      locale: props.value?.locale ?? null,
      featureFlags: props.value?.featureFlags ?? {},
    } satisfies MetadataClientContextValue;
  }, [props.value?.role, props.value?.tenant, props.value?.locale, props.value?.featureFlags]);

  return <MetadataClientContext.Provider value={memoizedValue}>{props.children}</MetadataClientContext.Provider>;
}

export function useMetadataClientContext(): MetadataClientContextValue {
  return React.useContext(MetadataClientContext);
}

