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

// ==================== Form Values Context ====================
// Allows AdminFormSection to share form values with sibling components

export interface FormValuesContextValue {
  subscribe: (callback: () => void) => () => void;
  getValue: <T = unknown>(name: string) => T | undefined;
  setValue: (name: string, value: unknown) => void;
  getSnapshot: () => Record<string, unknown>;
}

const FormValuesContext = React.createContext<FormValuesContextValue | null>(null);

interface FormValuesProviderProps {
  children: React.ReactNode;
}

export function FormValuesProvider({ children }: FormValuesProviderProps) {
  // Use ref to store values without causing re-renders
  const valuesRef = React.useRef<Record<string, unknown>>({});
  const subscribersRef = React.useRef<Set<() => void>>(new Set());

  const contextValue = React.useMemo<FormValuesContextValue>(() => ({
    subscribe: (callback: () => void) => {
      subscribersRef.current.add(callback);
      return () => {
        subscribersRef.current.delete(callback);
      };
    },
    getValue: <T = unknown>(name: string): T | undefined => {
      return valuesRef.current[name] as T | undefined;
    },
    setValue: (name: string, value: unknown) => {
      const currentValue = valuesRef.current[name];
      // Only update and notify if value actually changed
      if (currentValue !== value) {
        valuesRef.current = { ...valuesRef.current, [name]: value };
        // Notify subscribers
        subscribersRef.current.forEach((callback) => callback());
      }
    },
    getSnapshot: () => valuesRef.current,
  }), []);

  return (
    <FormValuesContext.Provider value={contextValue}>
      {children}
    </FormValuesContext.Provider>
  );
}

export function useFormValues(): FormValuesContextValue | null {
  return React.useContext(FormValuesContext);
}

export function useFormValue<T = unknown>(name: string): T | undefined {
  const context = React.useContext(FormValuesContext);

  // Use useSyncExternalStore for proper subscription
  const value = React.useSyncExternalStore(
    context?.subscribe ?? (() => () => {}),
    () => context?.getValue<T>(name),
    () => context?.getValue<T>(name)
  );

  return value;
}

