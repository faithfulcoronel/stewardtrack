'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Tag,
  Percent,
  DollarSign,
  Clock,
  Users,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import type { Discount, DiscountWithStats, CreateDiscountDto, UpdateDiscountDto } from '@/models/discount.model';

const TIER_OPTIONS = [
  { value: 'essential', label: 'Essential' },
  { value: 'premium', label: 'Premium' },
  { value: 'professional', label: 'Professional' },
  { value: 'enterprise', label: 'Enterprise' },
];

const BILLING_CYCLE_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'annual', label: 'Annual' },
];

const CURRENCY_OPTIONS = [
  { value: 'PHP', label: 'PHP (Philippine Peso)' },
  { value: 'USD', label: 'USD (US Dollar)' },
  { value: 'SGD', label: 'SGD (Singapore Dollar)' },
  { value: 'MYR', label: 'MYR (Malaysian Ringgit)' },
];

interface DiscountFormData {
  code: string;
  name: string;
  description: string;
  discount_type: 'coupon' | 'automatic';
  calculation_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  discount_currency: string;
  starts_at: string;
  ends_at: string;
  max_uses: number | null;
  max_uses_per_tenant: number;
  target_scope: 'global' | 'tier' | 'offering';
  target_tiers: string[];
  min_amount: number | null;
  first_purchase_only: boolean;
  new_tenant_only: boolean;
  applicable_billing_cycles: string[];
  is_active: boolean;
  show_banner: boolean;
  banner_text: string;
  badge_text: string;
}

const defaultFormData: DiscountFormData = {
  code: '',
  name: '',
  description: '',
  discount_type: 'coupon',
  calculation_type: 'percentage',
  discount_value: 10,
  discount_currency: 'PHP',
  starts_at: new Date().toISOString().slice(0, 16),
  ends_at: '',
  max_uses: null,
  max_uses_per_tenant: 1,
  target_scope: 'global',
  target_tiers: [],
  min_amount: null,
  first_purchase_only: false,
  new_tenant_only: false,
  applicable_billing_cycles: ['monthly', 'annual'],
  is_active: true,
  show_banner: false,
  banner_text: '',
  badge_text: '',
};

export function DiscountsManager() {
  const [discounts, setDiscounts] = useState<DiscountWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState<Discount | null>(null);
  const [formData, setFormData] = useState<DiscountFormData>(defaultFormData);
  const [saving, setSaving] = useState(false);

  const fetchDiscounts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/licensing/discounts?withStats=true&includeInactive=true');
      const data = await response.json();

      if (data.success) {
        setDiscounts(data.data);
      } else {
        setError(data.error || 'Failed to fetch discounts');
      }
    } catch {
      setError('Failed to fetch discounts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDiscounts();
  }, [fetchDiscounts]);

  const handleCreate = () => {
    setSelectedDiscount(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };

  const handleEdit = (discount: Discount) => {
    setSelectedDiscount(discount);
    setFormData({
      code: discount.code || '',
      name: discount.name,
      description: discount.description || '',
      discount_type: discount.discount_type,
      calculation_type: discount.calculation_type,
      discount_value: discount.discount_value,
      discount_currency: discount.discount_currency || 'PHP',
      starts_at: discount.starts_at ? new Date(discount.starts_at).toISOString().slice(0, 16) : '',
      ends_at: discount.ends_at ? new Date(discount.ends_at).toISOString().slice(0, 16) : '',
      max_uses: discount.max_uses ?? null,
      max_uses_per_tenant: discount.max_uses_per_tenant,
      target_scope: discount.target_scope,
      target_tiers: discount.target_tiers || [],
      min_amount: discount.min_amount ?? null,
      first_purchase_only: discount.first_purchase_only,
      new_tenant_only: discount.new_tenant_only,
      applicable_billing_cycles: discount.applicable_billing_cycles || ['monthly', 'annual'],
      is_active: discount.is_active,
      show_banner: discount.show_banner,
      banner_text: discount.banner_text || '',
      badge_text: discount.badge_text || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (discount: Discount) => {
    setSelectedDiscount(discount);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedDiscount) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/licensing/discounts/${selectedDiscount.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        await fetchDiscounts();
        setIsDeleteDialogOpen(false);
        setSelectedDiscount(null);
      } else {
        setError(data.error || 'Failed to delete discount');
      }
    } catch {
      setError('Failed to delete discount');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      setError(null);

      const payload: CreateDiscountDto | UpdateDiscountDto = {
        name: formData.name,
        description: formData.description || undefined,
        discount_type: formData.discount_type,
        calculation_type: formData.calculation_type,
        discount_value: formData.discount_value,
        starts_at: formData.starts_at ? new Date(formData.starts_at).toISOString() : new Date().toISOString(),
        is_active: formData.is_active,
        max_uses_per_tenant: formData.max_uses_per_tenant,
        target_scope: formData.target_scope,
        first_purchase_only: formData.first_purchase_only,
        new_tenant_only: formData.new_tenant_only,
        applicable_billing_cycles: formData.applicable_billing_cycles,
        show_banner: formData.show_banner,
      };

      // Coupon-specific fields
      if (formData.discount_type === 'coupon') {
        (payload as CreateDiscountDto).code = formData.code;
      }

      // Fixed amount needs currency
      if (formData.calculation_type === 'fixed_amount') {
        payload.discount_currency = formData.discount_currency;
      }

      // Optional fields
      if (formData.ends_at) {
        payload.ends_at = new Date(formData.ends_at).toISOString();
      }
      if (formData.max_uses !== null) {
        payload.max_uses = formData.max_uses;
      }
      if (formData.target_scope === 'tier' && formData.target_tiers.length > 0) {
        payload.target_tiers = formData.target_tiers;
      }
      if (formData.min_amount !== null) {
        payload.min_amount = formData.min_amount;
      }
      if (formData.banner_text) {
        payload.banner_text = formData.banner_text;
      }
      if (formData.badge_text) {
        payload.badge_text = formData.badge_text;
      }

      const url = selectedDiscount
        ? `/api/licensing/discounts/${selectedDiscount.id}`
        : '/api/licensing/discounts';

      const response = await fetch(url, {
        method: selectedDiscount ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        await fetchDiscounts();
        setIsDialogOpen(false);
        setSelectedDiscount(null);
        setFormData(defaultFormData);
      } else {
        setError(data.error || 'Failed to save discount');
      }
    } catch {
      setError('Failed to save discount');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: number, currency?: string | null) => {
    const symbols: Record<string, string> = {
      PHP: '₱',
      USD: '$',
      SGD: 'S$',
      MYR: 'RM',
    };
    return `${symbols[currency || 'PHP'] || currency}${value.toLocaleString()}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (discount: Discount) => {
    const now = new Date();
    const startsAt = new Date(discount.starts_at);
    const endsAt = discount.ends_at ? new Date(discount.ends_at) : null;

    if (!discount.is_active) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    if (startsAt > now) {
      return <Badge variant="outline">Scheduled</Badge>;
    }
    if (endsAt && endsAt < now) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    if (discount.max_uses && discount.current_uses >= discount.max_uses) {
      return <Badge variant="destructive">Exhausted</Badge>;
    }
    return <Badge className="bg-green-500">Active</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
          <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-auto">
            Dismiss
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Discounts & Promotions
              </CardTitle>
              <CardDescription>
                Manage coupon codes and automatic promotional discounts
              </CardDescription>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Discount
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {discounts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No discounts created yet</p>
              <p className="text-sm">Create your first discount to start offering promotions</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Discount</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Valid Period</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {discounts.map((discount) => (
                  <TableRow key={discount.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{discount.name}</div>
                        {discount.code && (
                          <Badge variant="outline" className="font-mono">
                            {discount.code}
                          </Badge>
                        )}
                        {discount.badge_text && (
                          <Badge className="ml-1">{discount.badge_text}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {discount.discount_type === 'coupon' ? (
                          <Tag className="h-4 w-4 text-blue-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-purple-500" />
                        )}
                        <span className="capitalize">{discount.discount_type}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {discount.calculation_type === 'percentage' ? (
                          <>
                            <Percent className="h-4 w-4 text-green-500" />
                            {discount.discount_value}%
                          </>
                        ) : (
                          <>
                            <DollarSign className="h-4 w-4 text-green-500" />
                            {formatCurrency(discount.discount_value, discount.discount_currency)}
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(discount)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-gray-400" />
                        {discount.current_uses}
                        {discount.max_uses ? ` / ${discount.max_uses}` : ''}
                      </div>
                      {discount.total_redemptions !== undefined && (
                        <div className="text-xs text-gray-500">
                          {formatCurrency(discount.total_savings || 0, discount.discount_currency)} saved
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{formatDate(discount.starts_at)}</div>
                        {discount.ends_at && (
                          <div className="text-gray-500">to {formatDate(discount.ends_at)}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(discount)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(discount)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDiscount ? 'Edit Discount' : 'Create Discount'}
            </DialogTitle>
            <DialogDescription>
              {selectedDiscount
                ? 'Update the discount details below'
                : 'Create a new discount code or automatic promotion'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-gray-700">Basic Information</h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Discount Type</Label>
                  <Select
                    value={formData.discount_type}
                    onValueChange={(value: 'coupon' | 'automatic') =>
                      setFormData({ ...formData, discount_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="coupon">Coupon Code</SelectItem>
                      <SelectItem value="automatic">Automatic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.discount_type === 'coupon' && (
                  <div className="space-y-2">
                    <Label>Coupon Code</Label>
                    <Input
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value.toUpperCase() })
                      }
                      placeholder="e.g., SUMMER20"
                      className="font-mono"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Summer Sale Discount"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the discount for internal reference"
                  rows={2}
                />
              </div>
            </div>

            {/* Discount Value */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-gray-700">Discount Value</h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Calculation Type</Label>
                  <Select
                    value={formData.calculation_type}
                    onValueChange={(value: 'percentage' | 'fixed_amount') =>
                      setFormData({ ...formData, calculation_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage Off</SelectItem>
                      <SelectItem value="fixed_amount">Fixed Amount Off</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>
                    {formData.calculation_type === 'percentage' ? 'Percentage' : 'Amount'}
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={formData.discount_value}
                      onChange={(e) =>
                        setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })
                      }
                      min={0}
                      max={formData.calculation_type === 'percentage' ? 100 : undefined}
                    />
                    {formData.calculation_type === 'percentage' && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        %
                      </span>
                    )}
                  </div>
                </div>

                {formData.calculation_type === 'fixed_amount' && (
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select
                      value={formData.discount_currency}
                      onValueChange={(value) =>
                        setFormData({ ...formData, discount_currency: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            {/* Validity Period */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-gray-700">Validity Period</h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="datetime-local"
                    value={formData.starts_at}
                    onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>End Date (Optional)</Label>
                  <Input
                    type="datetime-local"
                    value={formData.ends_at}
                    onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Usage Limits */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-gray-700">Usage Limits</h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Max Total Uses (leave empty for unlimited)</Label>
                  <Input
                    type="number"
                    value={formData.max_uses || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        max_uses: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    min={1}
                    placeholder="Unlimited"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Max Uses Per Tenant</Label>
                  <Input
                    type="number"
                    value={formData.max_uses_per_tenant}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        max_uses_per_tenant: parseInt(e.target.value) || 1,
                      })
                    }
                    min={1}
                  />
                </div>
              </div>
            </div>

            {/* Targeting */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-gray-700">Targeting</h4>

              <div className="space-y-2">
                <Label>Target Scope</Label>
                <Select
                  value={formData.target_scope}
                  onValueChange={(value: 'global' | 'tier' | 'offering') =>
                    setFormData({ ...formData, target_scope: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">All Products</SelectItem>
                    <SelectItem value="tier">Specific Tiers</SelectItem>
                    <SelectItem value="offering">Specific Offerings</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.target_scope === 'tier' && (
                <div className="space-y-2">
                  <Label>Target Tiers</Label>
                  <div className="flex flex-wrap gap-2">
                    {TIER_OPTIONS.map((tier) => (
                      <Badge
                        key={tier.value}
                        variant={
                          formData.target_tiers.includes(tier.value) ? 'default' : 'outline'
                        }
                        className="cursor-pointer"
                        onClick={() => {
                          const newTiers = formData.target_tiers.includes(tier.value)
                            ? formData.target_tiers.filter((t) => t !== tier.value)
                            : [...formData.target_tiers, tier.value];
                          setFormData({ ...formData, target_tiers: newTiers });
                        }}
                      >
                        {tier.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Applicable Billing Cycles</Label>
                <div className="flex flex-wrap gap-2">
                  {BILLING_CYCLE_OPTIONS.map((cycle) => (
                    <Badge
                      key={cycle.value}
                      variant={
                        formData.applicable_billing_cycles.includes(cycle.value)
                          ? 'default'
                          : 'outline'
                      }
                      className="cursor-pointer"
                      onClick={() => {
                        const newCycles = formData.applicable_billing_cycles.includes(cycle.value)
                          ? formData.applicable_billing_cycles.filter((c) => c !== cycle.value)
                          : [...formData.applicable_billing_cycles, cycle.value];
                        setFormData({ ...formData, applicable_billing_cycles: newCycles });
                      }}
                    >
                      {cycle.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Restrictions */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-gray-700">Restrictions</h4>

              <div className="space-y-2">
                <Label>Minimum Purchase Amount (Optional)</Label>
                <Input
                  type="number"
                  value={formData.min_amount || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      min_amount: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  min={0}
                  placeholder="No minimum"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>First Purchase Only</Label>
                  <p className="text-sm text-gray-500">Only allow for tenants making their first purchase</p>
                </div>
                <Switch
                  checked={formData.first_purchase_only}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, first_purchase_only: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>New Tenants Only</Label>
                  <p className="text-sm text-gray-500">Only allow for newly registered tenants</p>
                </div>
                <Switch
                  checked={formData.new_tenant_only}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, new_tenant_only: checked })
                  }
                />
              </div>
            </div>

            {/* Display Settings */}
            {formData.discount_type === 'automatic' && (
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-gray-700">Display Settings</h4>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show Banner</Label>
                    <p className="text-sm text-gray-500">Display promotional banner on pricing page</p>
                  </div>
                  <Switch
                    checked={formData.show_banner}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, show_banner: checked })
                    }
                  />
                </div>

                {formData.show_banner && (
                  <div className="space-y-2">
                    <Label>Banner Text</Label>
                    <Input
                      value={formData.banner_text}
                      onChange={(e) => setFormData({ ...formData, banner_text: e.target.value })}
                      placeholder="e.g., Limited Time: 20% OFF all annual plans!"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Badge Text</Label>
                  <Input
                    value={formData.badge_text}
                    onChange={(e) => setFormData({ ...formData, badge_text: e.target.value })}
                    placeholder="e.g., 20% OFF"
                  />
                </div>
              </div>
            )}

            {/* Status */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div>
                <Label>Active</Label>
                <p className="text-sm text-gray-500">Enable this discount immediately</p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {selectedDiscount ? 'Update' : 'Create'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Discount</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedDiscount?.name}&quot;? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
