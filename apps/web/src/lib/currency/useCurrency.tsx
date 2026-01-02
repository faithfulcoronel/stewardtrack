'use client';

/**
 * Currency Hook and Context
 *
 * Provides currency detection and management for client components.
 * Auto-detects user's currency based on geo-location and allows manual override.
 */

import { createContext, useContext, useCallback, useEffect, useState, ReactNode } from 'react';
import {
  SupportedCurrency,
  DEFAULT_CURRENCY,
  formatCurrency as formatCurrencyUtil,
  getCurrencyInfo,
  CurrencyInfo,
} from '@/enums/currency.enums';
import {
  detectCurrency,
  DetectedCurrency,
  getStoredCurrencyPreference,
  storeCurrencyPreference,
} from './currencyDetection';

/**
 * Currency context state
 */
interface CurrencyContextState {
  /** Current currency code */
  currency: SupportedCurrency;
  /** Currency info with formatting details */
  currencyInfo: CurrencyInfo | undefined;
  /** How the currency was detected */
  detectionSource: DetectedCurrency['source'];
  /** Detection confidence level */
  confidence: DetectedCurrency['confidence'];
  /** User's detected country code */
  countryCode?: string;
  /** Whether currency detection is in progress */
  isLoading: boolean;
  /** Set currency manually (saves preference) */
  setCurrency: (currency: SupportedCurrency) => void;
  /** Format an amount in the current currency */
  formatPrice: (amount: number, options?: { showCode?: boolean; compact?: boolean }) => string;
  /** Format an amount in a specific currency */
  formatPriceInCurrency: (
    amount: number,
    currency: string,
    options?: { showCode?: boolean; compact?: boolean }
  ) => string;
}

const CurrencyContext = createContext<CurrencyContextState | undefined>(undefined);

/**
 * Currency Provider Props
 */
interface CurrencyProviderProps {
  children: ReactNode;
  /** Initial currency to use before detection completes */
  initialCurrency?: SupportedCurrency;
  /** Skip auto-detection (use for server-rendered pages) */
  skipDetection?: boolean;
}

/**
 * Currency Provider Component
 *
 * Wraps app to provide currency context with auto-detection.
 */
export function CurrencyProvider({
  children,
  initialCurrency = DEFAULT_CURRENCY,
  skipDetection = false,
}: CurrencyProviderProps) {
  const [currency, setInternalCurrency] = useState<SupportedCurrency>(initialCurrency);
  const [detectionSource, setDetectionSource] = useState<DetectedCurrency['source']>('default');
  const [confidence, setConfidence] = useState<DetectedCurrency['confidence']>('low');
  const [countryCode, setCountryCode] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(!skipDetection);

  // Auto-detect currency on mount
  useEffect(() => {
    if (skipDetection) return;

    const doDetection = async () => {
      try {
        setIsLoading(true);
        const detected = await detectCurrency();
        setInternalCurrency(detected.currency);
        setDetectionSource(detected.source);
        setConfidence(detected.confidence);
        setCountryCode(detected.countryCode);
      } catch (error) {
        console.error('[CurrencyProvider] Detection failed:', error);
        // Keep default currency
      } finally {
        setIsLoading(false);
      }
    };

    doDetection();
  }, [skipDetection]);

  // Set currency manually and save preference
  const setCurrency = useCallback((newCurrency: SupportedCurrency) => {
    setInternalCurrency(newCurrency);
    setDetectionSource('stored_preference');
    setConfidence('high');
    storeCurrencyPreference(newCurrency);
  }, []);

  // Format price in current currency
  const formatPrice = useCallback(
    (amount: number, options?: { showCode?: boolean; compact?: boolean }) => {
      return formatCurrencyUtil(amount, currency, options);
    },
    [currency]
  );

  // Format price in specific currency
  const formatPriceInCurrency = useCallback(
    (amount: number, targetCurrency: string, options?: { showCode?: boolean; compact?: boolean }) => {
      return formatCurrencyUtil(amount, targetCurrency, options);
    },
    []
  );

  const value: CurrencyContextState = {
    currency,
    currencyInfo: getCurrencyInfo(currency),
    detectionSource,
    confidence,
    countryCode,
    isLoading,
    setCurrency,
    formatPrice,
    formatPriceInCurrency,
  };

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

/**
 * Hook to access currency context
 */
export function useCurrency(): CurrencyContextState {
  const context = useContext(CurrencyContext);

  if (context === undefined) {
    // Fallback for components outside provider
    return {
      currency: DEFAULT_CURRENCY,
      currencyInfo: getCurrencyInfo(DEFAULT_CURRENCY),
      detectionSource: 'default',
      confidence: 'low',
      isLoading: false,
      setCurrency: () => {
        console.warn('[useCurrency] No CurrencyProvider found');
      },
      formatPrice: (amount) => formatCurrencyUtil(amount, DEFAULT_CURRENCY),
      formatPriceInCurrency: (amount, currency) => formatCurrencyUtil(amount, currency),
    };
  }

  return context;
}

/**
 * Hook for simple currency formatting without context
 * Use this for components that don't need the full context
 */
export function useFormatCurrency() {
  const format = useCallback(
    (amount: number, currency: string = DEFAULT_CURRENCY, options?: { showCode?: boolean; compact?: boolean }) => {
      return formatCurrencyUtil(amount, currency, options);
    },
    []
  );

  return format;
}

/**
 * Hook to get currency info
 */
export function useCurrencyInfo(currencyCode?: string) {
  const { currency, currencyInfo } = useCurrency();
  const targetCode = currencyCode || currency;
  return getCurrencyInfo(targetCode) || currencyInfo;
}
