'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import {
  CreditCard,
  Smartphone,
  Building2,
  Loader2,
  Heart,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  User,
  Mail,
  Phone,
  Sparkles,
  Shield,
  Gift,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { DonationTermsDialog } from '@/components/donation/DonationTermsDialog';
import { cn } from '@/lib/utils';
import type { PaymentMethodType, DonationFeeCalculation } from '@/models/donation.model';

interface DonationCategory {
  id: string;
  name: string;
  code?: string;
  description?: string;
}

interface DonationFormProps {
  tenantToken: string;
  churchName: string;
  onSuccess: (donationId: string, paymentUrl: string | null) => void;
}

const PRESET_AMOUNTS = [100, 500, 1000, 2500, 5000, 10000];

const PAYMENT_METHODS: {
  type: PaymentMethodType;
  label: string;
  icon: React.ReactNode;
  channels?: { code: string; label: string }[];
}[] = [
  {
    type: 'ewallet',
    label: 'E-Wallet',
    icon: <Smartphone className="h-5 w-5" />,
    channels: [
      { code: 'GCASH', label: 'GCash' },
      { code: 'GRABPAY', label: 'GrabPay' },
      { code: 'PAYMAYA', label: 'PayMaya' },
    ],
  },
  {
    type: 'card',
    label: 'Credit/Debit Card',
    icon: <CreditCard className="h-5 w-5" />,
  },
  {
    type: 'bank_transfer',
    label: 'Bank Transfer',
    icon: <Building2 className="h-5 w-5" />,
  },
];

const formSchema = z.object({
  amount: z.number().min(1, 'Please enter an amount'),
  category_id: z.string().min(1, 'Please select a category'),
  payment_method_type: z.enum(['card', 'ewallet', 'bank_transfer', 'direct_debit']),
  channel_code: z.string().optional(),
  donor_name: z.string().optional(),
  donor_email: z.string().email('Please enter a valid email'),
  donor_phone: z.string().optional(),
  anonymous: z.boolean().default(false),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export function DonationForm({ tenantToken, churchName, onSuccess }: DonationFormProps) {
  const [step, setStep] = useState(1); // 1: Amount, 2: Details, 3: Payment
  const [categories, setCategories] = useState<DonationCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [customAmount, setCustomAmount] = useState('');
  const [feeCalculation, setFeeCalculation] = useState<DonationFeeCalculation | null>(null);
  const [isCalculatingFees, setIsCalculatingFees] = useState(false);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
      category_id: '',
      payment_method_type: 'ewallet',
      channel_code: 'GCASH',
      donor_name: '',
      donor_email: '',
      donor_phone: '',
      anonymous: false,
      notes: '',
    },
  });

  const watchAmount = form.watch('amount');
  const watchPaymentMethod = form.watch('payment_method_type');

  // Load categories on mount
  useEffect(() => {
    async function loadCategories() {
      try {
        const response = await fetch(
          `/api/public/donations/categories?tenantToken=${tenantToken}`
        );
        const result = await response.json();

        if (result.success && result.data) {
          setCategories(result.data);
          // Set default category if available
          if (result.data.length > 0) {
            form.setValue('category_id', result.data[0].id);
          }
        }
      } catch (error) {
        console.error('Error loading categories:', error);
        toast.error('Failed to load donation categories');
      } finally {
        setIsLoadingCategories(false);
      }
    }

    loadCategories();
  }, [tenantToken, form]);

  // Calculate fees when amount or payment method changes
  const calculateFees = useCallback(async () => {
    if (watchAmount <= 0 || !watchPaymentMethod) return;

    setIsCalculatingFees(true);
    try {
      const response = await fetch(
        `/api/public/donations/fees?tenantToken=${tenantToken}&amount=${watchAmount}&payment_method_type=${watchPaymentMethod}`
      );
      const result = await response.json();

      if (result.success && result.data) {
        setFeeCalculation(result.data);
      }
    } catch (error) {
      console.error('Error calculating fees:', error);
    } finally {
      setIsCalculatingFees(false);
    }
  }, [tenantToken, watchAmount, watchPaymentMethod]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      calculateFees();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [calculateFees]);

  const handlePresetAmountClick = (amount: number) => {
    form.setValue('amount', amount);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    const numValue = parseFloat(value.replace(/,/g, ''));
    if (!isNaN(numValue) && numValue > 0) {
      form.setValue('amount', numValue);
    } else {
      form.setValue('amount', 0);
    }
  };

  const handleNextStep = async () => {
    if (step === 1) {
      const isValid = await form.trigger(['amount', 'category_id']);
      if (isValid && watchAmount > 0) {
        setStep(2);
      } else if (watchAmount <= 0) {
        toast.error('Please enter a donation amount');
      }
    } else if (step === 2) {
      const isValid = await form.trigger(['donor_email']);
      if (isValid) {
        setStep(3);
      }
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleDonateClick = () => {
    if (!feeCalculation) {
      toast.error('Please wait for fee calculation');
      return;
    }
    setShowTermsDialog(true);
  };

  const handleAcceptTerms = async () => {
    setIsSubmitting(true);

    try {
      const formData = form.getValues();

      const response = await fetch('/api/public/donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantToken,
          amount: formData.amount,
          category_id: formData.category_id,
          payment_method_type: formData.payment_method_type,
          channel_code: formData.channel_code,
          donor_name: formData.donor_name,
          donor_email: formData.donor_email,
          donor_phone: formData.donor_phone,
          anonymous: formData.anonymous,
          notes: formData.notes,
          terms_accepted: true,
          terms_version: 'v1.0',
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        setShowTermsDialog(false);
        toast.success('Donation initiated! Redirecting to payment...');
        onSuccess(result.data.donation_id, result.data.payment_url);
      } else {
        toast.error(result.error || 'Failed to process donation');
      }
    } catch (error) {
      console.error('Donation error:', error);
      toast.error('An error occurred while processing your donation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const selectedPaymentMethod = PAYMENT_METHODS.find(
    (m) => m.type === watchPaymentMethod
  );

  const stepLabels = ['Amount', 'Details', 'Payment'];
  const stepIcons = [Gift, User, CreditCard];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20"
    >
      <Form {...form}>
        <form>
          {/* Enhanced Progress Indicator */}
          <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 pt-6 pb-4 px-6">
            <div className="flex items-center justify-between">
              {[1, 2, 3].map((s, index) => {
                const StepIcon = stepIcons[index];
                return (
                  <div
                    key={s}
                    className={cn(
                      'flex items-center',
                      s < 3 && 'flex-1'
                    )}
                  >
                    <motion.div
                      initial={false}
                      animate={{
                        scale: step === s ? 1.1 : 1,
                        boxShadow: step === s ? '0 0 20px rgba(23, 154, 101, 0.4)' : 'none',
                      }}
                      className="relative"
                    >
                      <div
                        className={cn(
                          'w-12 h-12 rounded-full flex flex-col items-center justify-center transition-all duration-300',
                          s < step
                            ? 'bg-primary text-white'
                            : s === step
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 text-gray-400'
                        )}
                      >
                        <StepIcon className="w-4 h-4" />
                        <span className="text-[10px] mt-0.5 font-medium">{stepLabels[index]}</span>
                      </div>
                      {s <= step && s < 3 && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -right-1 -top-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center"
                        >
                          <Sparkles className="w-2.5 h-2.5 text-white" />
                        </motion.div>
                      )}
                    </motion.div>
                    {s < 3 && (
                      <div className="flex-1 mx-2 h-1 rounded-full bg-gray-200 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: s < step ? '100%' : '0%' }}
                          transition={{ duration: 0.5, ease: 'easeInOut' }}
                          className="h-full bg-gradient-to-r from-primary to-green-500 rounded-full"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Animated Step Content */}
          <AnimatePresence mode="wait">
            {/* Step 1: Amount Selection */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="px-6 pb-6 space-y-6"
              >
                <div className="text-center pt-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                    className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-green-400/20 mb-3"
                  >
                    <Heart className="w-6 h-6 text-primary" />
                  </motion.div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Choose Your Gift
                  </h2>
                  <p className="text-gray-500 text-sm mt-1">
                    Every contribution makes a difference
                  </p>
                </div>

                {/* Preset Amounts with Animation */}
                <div className="grid grid-cols-3 gap-3">
                  {PRESET_AMOUNTS.map((amount, index) => (
                    <motion.div
                      key={amount}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Button
                        type="button"
                        variant={watchAmount === amount ? 'default' : 'outline'}
                        className={cn(
                          'w-full h-14 text-lg font-semibold transition-all duration-300',
                          watchAmount === amount
                            ? 'ring-2 ring-primary ring-offset-2 shadow-lg shadow-primary/30 scale-105'
                            : 'hover:scale-102 hover:shadow-md'
                        )}
                        onClick={() => handlePresetAmountClick(amount)}
                      >
                        {formatCurrency(amount)}
                      </Button>
                    </motion.div>
                  ))}
                </div>

                {/* Custom Amount */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-2"
                >
                  <label className="text-sm font-medium text-gray-700">Or enter custom amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-xl">
                      ₱
                    </span>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={customAmount}
                      onChange={(e) => handleCustomAmountChange(e.target.value)}
                      className="h-16 pl-10 text-3xl font-bold text-center border-2 focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </motion.div>

                {/* Category Selection */}
                <FormField
                  control={form.control}
                  name="category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Gift className="h-4 w-4 text-primary" />
                        Donation Purpose
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={isLoadingCategories}
                      >
                        <FormControl>
                          <SelectTrigger className="h-12 border-2 focus:border-primary focus:ring-4 focus:ring-primary/20">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Fee Preview with Animation */}
                <AnimatePresence>
                  {watchAmount > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-green-400/5 p-4 overflow-hidden"
                    >
                      <div className="text-sm space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground flex items-center gap-2">
                            <Heart className="h-3 w-3 text-primary" />
                            Your Gift
                          </span>
                          <span className="font-semibold text-gray-900">{formatCurrency(watchAmount)}</span>
                        </div>
                        {isCalculatingFees ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span className="text-xs">Calculating fees...</span>
                          </div>
                        ) : feeCalculation ? (
                          <>
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground text-xs">Processing Fee</span>
                              <span className="font-medium text-xs">
                                +{formatCurrency(feeCalculation.total_fees)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center pt-3 mt-2 border-t border-primary/20">
                              <span className="font-semibold text-gray-900">Total to Pay</span>
                              <motion.span
                                key={feeCalculation.total_charged}
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="font-bold text-xl text-primary"
                              >
                                {formatCurrency(feeCalculation.total_charged)}
                              </motion.span>
                            </div>
                          </>
                        ) : null}
                      </div>
                      <p className="text-xs text-primary/70 mt-3 flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        {churchName} receives 100% of your {formatCurrency(watchAmount)} donation
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Step 2: Donor Information */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="px-6 pb-6 space-y-6"
              >
                <div className="text-center pt-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                    className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-blue-400/20 to-indigo-400/20 mb-3"
                  >
                    <User className="w-6 h-6 text-blue-600" />
                  </motion.div>
                  <h2 className="text-xl font-bold text-gray-900">
                    About You
                  </h2>
                  <p className="text-gray-500 text-sm mt-1">
                    Let us know who&apos;s making this gift
                  </p>
                </div>

                <div className="space-y-4">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <FormField
                      control={form.control}
                      name="donor_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            Full Name <span className="text-muted-foreground text-xs">(optional)</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="John Doe"
                              className="h-12 border-2 focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                  >
                    <FormField
                      control={form.control}
                      name="donor_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-400" />
                            Email Address <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="john@example.com"
                              className="h-12 border-2 focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <FormField
                      control={form.control}
                      name="donor_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-400" />
                            Phone Number <span className="text-muted-foreground text-xs">(optional)</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="tel"
                              placeholder="+63 912 345 6789"
                              className="h-12 border-2 focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                  >
                    <FormField
                      control={form.control}
                      name="anonymous"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-xl border-2 border-dashed border-gray-200 p-4 hover:border-primary/50 transition-colors">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="mt-0.5"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="cursor-pointer font-medium">
                              Make this donation anonymous
                            </FormLabel>
                            <p className="text-xs text-muted-foreground">
                              Your name won&apos;t be displayed publicly
                            </p>
                          </div>
                        </FormItem>
                      )}
                    />
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Payment Method */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="px-6 pb-6 space-y-6"
              >
                <div className="text-center pt-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                    className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-amber-400/20 to-orange-400/20 mb-3"
                  >
                    <CreditCard className="w-6 h-6 text-amber-600" />
                  </motion.div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Payment Method
                  </h2>
                  <p className="text-gray-500 text-sm mt-1">
                    Choose how you&apos;d like to pay
                  </p>
                </div>

                {/* Payment Method Selection */}
                <div className="space-y-3">
                  {PAYMENT_METHODS.map((method, index) => (
                    <motion.button
                      key={method.type}
                      type="button"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        'w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left',
                        watchPaymentMethod === method.type
                          ? 'border-primary bg-gradient-to-r from-primary/10 to-green-400/10 shadow-lg shadow-primary/20'
                          : 'border-border hover:border-primary/50 hover:shadow-md'
                      )}
                      onClick={() => {
                        form.setValue('payment_method_type', method.type);
                        if (method.channels && method.channels.length > 0) {
                          form.setValue('channel_code', method.channels[0].code);
                        } else {
                          form.setValue('channel_code', undefined);
                        }
                      }}
                    >
                      <div
                        className={cn(
                          'w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300',
                          watchPaymentMethod === method.type
                            ? 'bg-primary text-white shadow-lg shadow-primary/30'
                            : 'bg-gray-100 text-gray-500'
                        )}
                      >
                        {method.icon}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{method.label}</p>
                        {method.channels && (
                          <p className="text-sm text-muted-foreground">
                            {method.channels.map((c) => c.label).join(', ')}
                          </p>
                        )}
                      </div>
                      <div
                        className={cn(
                          'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300',
                          watchPaymentMethod === method.type
                            ? 'border-primary bg-primary'
                            : 'border-gray-300'
                        )}
                      >
                        {watchPaymentMethod === method.type && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-2.5 h-2.5 rounded-full bg-white"
                          />
                        )}
                      </div>
                    </motion.button>
                  ))}
                </div>

                {/* E-Wallet Channel Selection */}
                <AnimatePresence>
                  {selectedPaymentMethod?.channels && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <FormField
                        control={form.control}
                        name="channel_code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Smartphone className="h-4 w-4 text-primary" />
                              Select E-Wallet
                            </FormLabel>
                            <div className="grid grid-cols-3 gap-2">
                              {selectedPaymentMethod.channels!.map((channel) => (
                                <Button
                                  key={channel.code}
                                  type="button"
                                  variant={field.value === channel.code ? 'default' : 'outline'}
                                  className={cn(
                                    'h-12 transition-all duration-300',
                                    field.value === channel.code && 'shadow-lg shadow-primary/30'
                                  )}
                                  onClick={() => field.onChange(channel.code)}
                                >
                                  {channel.label}
                                </Button>
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Summary Card */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-green-400/5 p-5 space-y-4"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-gray-900">Donation Summary</h3>
                  </div>
                  <div className="text-sm space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Heart className="h-3 w-3 text-rose-500" />
                        Gift to {churchName}
                      </span>
                      <span className="font-semibold">{formatCurrency(watchAmount)}</span>
                    </div>
                    {feeCalculation && (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground text-xs">Processing Fee</span>
                          <span className="font-medium text-xs">
                            +{formatCurrency(feeCalculation.total_fees)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t border-primary/20">
                          <span className="font-semibold">Total to Pay</span>
                          <motion.span
                            key={feeCalculation.total_charged}
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            className="font-bold text-2xl text-primary"
                          >
                            {formatCurrency(feeCalculation.total_charged)}
                          </motion.span>
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>

                {/* Security Note */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-start gap-3 text-xs text-muted-foreground bg-blue-50 rounded-xl p-3"
                >
                  <Shield className="h-5 w-5 text-blue-500 flex-shrink-0" />
                  <p>
                    Your payment is processed securely by Xendit, a PCI-DSS certified payment provider.
                    We never store your card or bank details.
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200 flex gap-3">
            {step > 1 && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevStep}
                  className="h-12 px-6 border-2"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              </motion.div>
            )}

            {step < 3 ? (
              <motion.div
                className="flex-1"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  type="button"
                  onClick={handleNextStep}
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-green-500 hover:from-primary/90 hover:to-green-500/90 shadow-lg shadow-primary/30"
                  disabled={step === 1 && watchAmount <= 0}
                >
                  Continue
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </motion.div>
            ) : (
              <motion.div
                className="flex-1"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  type="button"
                  onClick={handleDonateClick}
                  className="w-full h-14 text-lg font-bold bg-gradient-to-r from-primary to-green-500 hover:from-primary/90 hover:to-green-500/90 shadow-xl shadow-primary/40"
                  disabled={!feeCalculation || isCalculatingFees}
                >
                  {isCalculatingFees ? (
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  ) : (
                    <Heart className="h-5 w-5 mr-2" />
                  )}
                  Give {feeCalculation ? formatCurrency(feeCalculation.total_charged) : ''}
                </Button>
              </motion.div>
            )}
          </div>
        </form>
      </Form>

      {/* Terms and Conditions Dialog */}
      {feeCalculation && (
        <DonationTermsDialog
          open={showTermsDialog}
          onOpenChange={setShowTermsDialog}
          onAccept={handleAcceptTerms}
          amount={watchAmount}
          totalCharged={feeCalculation.total_charged}
          xenditFee={feeCalculation.xendit_fee}
          platformFee={feeCalculation.platform_fee}
          currency="PHP"
          churchName={churchName}
          isProcessing={isSubmitting}
        />
      )}
    </motion.div>
  );
}
