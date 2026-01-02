'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Plus, Trash2, Globe, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import {
  SupportedCurrency,
  getCurrencySelectOptions,
  formatCurrency,
  getCurrencyInfo,
  PRIMARY_CURRENCY,
  getXenditSupportedCurrencies,
} from '@/lib/currency';

export interface CurrencyPrice {
  id?: string;
  currency: SupportedCurrency;
  price: number;
  is_active: boolean;
}

interface CurrencyPricingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offeringId?: string;
  offeringName: string;
  initialPrices?: CurrencyPrice[];
  onSave: (prices: CurrencyPrice[]) => void;
}

export function CurrencyPricingModal({
  open,
  onOpenChange,
  offeringId,
  offeringName,
  initialPrices = [],
  onSave,
}: CurrencyPricingModalProps) {
  const [prices, setPrices] = useState<CurrencyPrice[]>(initialPrices);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newCurrency, setNewCurrency] = useState<SupportedCurrency | ''>('');

  const currencyOptions = getCurrencySelectOptions();
  const xenditCurrencies = getXenditSupportedCurrencies();

  // Load prices when modal opens in edit mode
  useEffect(() => {
    if (open && offeringId && initialPrices.length === 0) {
      loadPrices();
    } else if (open) {
      setPrices(initialPrices);
    }
  }, [open, offeringId]);

  async function loadPrices() {
    if (!offeringId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/licensing/product-offerings/${offeringId}/prices`);
      const result = await response.json();

      if (response.ok && result.success) {
        setPrices(result.data ?? []);
      }
    } catch (error) {
      console.error('Error loading currency prices:', error);
    } finally {
      setIsLoading(false);
    }
  }

  // Get currencies that are already configured
  const configuredCurrencies = new Set(prices.map((p) => p.currency));

  // Available currencies to add (not already configured)
  const availableCurrencies = currencyOptions.filter(
    (opt) => !configuredCurrencies.has(opt.value as SupportedCurrency)
  );

  function handleAddCurrency() {
    if (!newCurrency) return;

    // Check if currency already exists
    if (prices.some((p) => p.currency === newCurrency)) {
      toast.error('This currency is already configured');
      return;
    }

    const currencyInfo = getCurrencyInfo(newCurrency);

    setPrices((prev) => [
      ...prev,
      {
        currency: newCurrency,
        price: 0,
        is_active: true,
      },
    ]);

    setNewCurrency('');
    toast.success(`Added ${currencyInfo?.name || newCurrency} pricing`);
  }

  function handleRemoveCurrency(currency: SupportedCurrency) {
    setPrices((prev) => prev.filter((p) => p.currency !== currency));
    toast.success('Currency pricing removed');
  }

  function handlePriceChange(currency: SupportedCurrency, price: string) {
    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice) && price !== '') return;

    setPrices((prev) =>
      prev.map((p) =>
        p.currency === currency ? { ...p, price: price === '' ? 0 : numericPrice } : p
      )
    );
  }

  function handleActiveChange(currency: SupportedCurrency, isActive: boolean) {
    setPrices((prev) =>
      prev.map((p) => (p.currency === currency ? { ...p, is_active: isActive } : p))
    );
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      // If we have an offering ID, save to backend
      if (offeringId) {
        const response = await fetch(`/api/licensing/product-offerings/${offeringId}/prices`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prices }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          toast.error(result.error || 'Failed to save currency pricing');
          return;
        }

        toast.success('Currency pricing saved successfully');
      }

      // Call parent callback
      onSave(prices);
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving currency pricing:', error);
      toast.error('Failed to save currency pricing');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Multi-Currency Pricing
          </DialogTitle>
          <DialogDescription>
            Configure pricing for {offeringName} in different currencies. Prices will be used based
            on the customer&apos;s detected location.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Currency Prices */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Currency Prices</Label>

              {prices.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
                  No currencies configured. Add currencies to set pricing for different regions.
                  Start with your primary market currency (e.g., PHP for Philippines).
                </p>
              ) : (
                <ScrollArea className="max-h-[250px] pr-4">
                  <div className="space-y-3">
                    {prices.map((priceEntry) => {
                      const currencyInfo = getCurrencyInfo(priceEntry.currency);
                      const isXenditSupported = xenditCurrencies.includes(priceEntry.currency);

                      return (
                        <div
                          key={priceEntry.currency}
                          className={`flex items-center gap-3 p-3 rounded-lg border ${
                            priceEntry.is_active ? 'bg-background' : 'bg-muted/50 opacity-75'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{priceEntry.currency}</Badge>
                              <span className="text-sm font-medium truncate">
                                {currencyInfo?.name}
                              </span>
                              {isXenditSupported && (
                                <Badge variant="secondary" className="text-xs">
                                  Xendit
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="relative w-32">
                              <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={priceEntry.price}
                                onChange={(e) =>
                                  handlePriceChange(priceEntry.currency, e.target.value)
                                }
                                className="pl-7 text-right"
                                disabled={!priceEntry.is_active}
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <Switch
                                checked={priceEntry.is_active}
                                onCheckedChange={(checked) =>
                                  handleActiveChange(priceEntry.currency, checked)
                                }
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleRemoveCurrency(priceEntry.currency)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>

            {/* Add New Currency */}
            <div className="flex items-center gap-2 pt-2 border-t">
              <Select
                value={newCurrency}
                onValueChange={(value) => setNewCurrency(value as SupportedCurrency)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a currency to add..." />
                </SelectTrigger>
                <SelectContent>
                  {availableCurrencies.length === 0 ? (
                    <SelectItem value="_none" disabled>
                      All currencies configured
                    </SelectItem>
                  ) : (
                    availableCurrencies.map((opt) => {
                      const isXendit = xenditCurrencies.includes(opt.value as SupportedCurrency);
                      return (
                        <SelectItem key={opt.value} value={opt.value}>
                          <span className="flex items-center gap-2">
                            <span className="font-medium">{opt.value}</span>
                            <span className="text-muted-foreground">- {opt.label}</span>
                            {isXendit && (
                              <Badge variant="secondary" className="text-xs ml-2">
                                Xendit
                              </Badge>
                            )}
                          </span>
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                onClick={handleAddCurrency}
                disabled={!newCurrency}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>

            {/* Info about Xendit */}
            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <p>
                <strong>Note:</strong> Currencies marked with &quot;Xendit&quot; are directly
                supported by the payment gateway. Other currencies will be converted to PHP at
                checkout.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Pricing'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
