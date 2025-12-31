"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CreditCard, CheckCircle2, XCircle, Clock, AlertCircle, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";

interface SubscriptionData {
  hasActiveSubscription: boolean;
  tenant: {
    id: string;
    church_name: string;
    subscription_status: string;
    payment_status: string | null;
    next_billing_date: string | null;
  };
  currentOffering?: {
    id: string;
    name: string;
    tier: string;
    base_price: number;
    billing_cycle: string;
  };
  latestPayment?: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    paid_at: string | null;
    invoice_url: string | null;
    payment_method: string | null;
  };
  paymentSummary?: {
    total_paid: number;
    total_pending: number;
    total_failed: number;
    payment_count: number;
    last_payment_date: string | null;
  };
}

export default function SubscriptionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/subscription/status");
      if (!response.ok) {
        throw new Error("Failed to fetch subscription data");
      }
      

      const data = await response.json();
      setSubscription(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToPayment = async () => {

    if (!subscription?.currentOffering) {
      alert("No subscription plan found. Please contact support.");
      return;
    }

    // Create invoice and redirect to payment
    try {
      const response = await fetch("/api/checkout/create-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: subscription.tenant.id,
          offeringId: subscription.currentOffering.id,
          payerEmail: "user@example.com", // TODO: Get from user profile
          payerName: subscription.tenant.church_name,
        }),
      });

      const data = await response.json();
      
      if (data.invoice_url) {
        // Redirect to Xendit payment page
        window.location.href = data.invoice_url;
      } else {
        alert("Failed to create payment invoice. Please try again.");
      }
    } catch (error) {
      console.error("Payment error:", error);
      alert("An error occurred. Please try again.");
    }
  };

  const handleRetryPayment = () => {
    if (subscription?.latestPayment?.id) {
      // Use retry endpoint
      fetch(`/api/checkout/retry-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: subscription.latestPayment.id }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.invoice_url) {
            window.location.href = data.invoice_url;
          }
        })
        .catch((err) => {
          console.error("Retry payment failed:", err);
        });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
      case "paid":
      case "settled":
        return <Badge className="bg-green-500">{status}</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500">{status}</Badge>;
      case "trial":
        return <Badge className="bg-blue-500">{status}</Badge>;
      case "suspended":
      case "failed":
      case "expired":
        return <Badge className="bg-red-500">{status}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number, currency: string = "PHP") => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading subscription details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="size-5" />
              Error Loading Subscription
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={fetchSubscriptionData}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!subscription) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manage Subscription</h1>
          <p className="text-muted-foreground mt-1">
            View and manage your subscription and billing details
          </p>
        </div>
      </div>

      {/* Subscription Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="size-5" />
            Subscription Status
          </CardTitle>
          <CardDescription>Current subscription and payment status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Organization</p>
              <p className="text-lg font-semibold">{subscription.tenant.church_name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Subscription Status</p>
              <div className="mt-1">
                {getStatusBadge(subscription.tenant.subscription_status)}
              </div>
            </div>
            {subscription.tenant.payment_status && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Payment Status</p>
                <div className="mt-1">
                  {getStatusBadge(subscription.tenant.payment_status)}
                </div>
              </div>
            )}
            {subscription.tenant.next_billing_date && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Next Billing Date</p>
                <p className="text-lg font-semibold">
                  {formatDate(subscription.tenant.next_billing_date)}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active Subscription Details */}
      {subscription.hasActiveSubscription && subscription.currentOffering && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-green-500" />
              Current Plan
            </CardTitle>
            <CardDescription>Your active subscription plan details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Plan Name</p>
                <p className="text-lg font-semibold">{subscription.currentOffering.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tier</p>
                <div className="mt-1">
                  <Badge variant="outline" className="uppercase">
                    {subscription.currentOffering.tier}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Billing Cycle</p>
                <p className="text-lg font-semibold capitalize">
                  {subscription.currentOffering.billing_cycle}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Price</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(subscription.currentOffering.base_price)} / {subscription.currentOffering.billing_cycle}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Latest Payment */}
      {subscription.latestPayment && (
        <Card>
          <CardHeader>
            <CardTitle>Latest Payment</CardTitle>
            <CardDescription>Most recent payment transaction</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Amount</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(subscription.latestPayment.amount, subscription.latestPayment.currency)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <div className="mt-1">
                  {getStatusBadge(subscription.latestPayment.status)}
                </div>
              </div>
              {subscription.latestPayment.paid_at && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Paid On</p>
                  <p className="text-lg font-semibold">
                    {formatDate(subscription.latestPayment.paid_at)}
                  </p>
                </div>
              )}
              {subscription.latestPayment.payment_method && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Payment Method</p>
                  <p className="text-lg font-semibold capitalize">
                    {subscription.latestPayment.payment_method.replace(/_/g, " ")}
                  </p>
                </div>
              )}
            </div>
            {subscription.latestPayment.invoice_url && (
              <>
                <Separator />
                <Button variant="outline" asChild>
                  <a href={subscription.latestPayment.invoice_url} target="_blank" rel="noopener noreferrer">
                    View Invoice <ExternalLink className="ml-2 size-4" />
                  </a>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment Summary */}
      {subscription.paymentSummary && subscription.paymentSummary.payment_count > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Summary</CardTitle>
            <CardDescription>Overview of all payment transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 border rounded-lg">
                <p className="text-sm font-medium text-muted-foreground">Total Paid</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(subscription.paymentSummary.total_paid)}
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {formatCurrency(subscription.paymentSummary.total_pending)}
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm font-medium text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(subscription.paymentSummary.total_failed)}
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm font-medium text-muted-foreground">Total Transactions</p>
                <p className="text-2xl font-bold">{subscription.paymentSummary.payment_count}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Active Subscription - Payment Options */}
      {(!subscription.latestPayment ||
        (subscription.latestPayment.status !== "paid" &&
         subscription.latestPayment.status !== "settled")) && (
        <Card className="border-yellow-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <AlertCircle className="size-5" />
              Payment Required
            </CardTitle>
            <CardDescription>
              Complete your payment to activate your subscription and access all features.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              You have selected a plan but haven't completed payment yet. Click below to proceed to payment.
            </p>
            <Button onClick={handleProceedToPayment} size="lg" className="w-full md:w-auto">
              Proceed to Payment
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Pending Payment - Retry Option */}
      {subscription.latestPayment?.status === "pending" && (
        <Card className="border-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-600">
              <Clock className="size-5" />
              Pending Payment
            </CardTitle>
            <CardDescription>
              You have a pending payment. Complete it to activate your subscription.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Your payment is awaiting completion. You can retry or complete the payment using the link below.
            </p>
            <div className="flex gap-2">
              {subscription.latestPayment.invoice_url && (
                <Button asChild>
                  <a href={subscription.latestPayment.invoice_url} target="_blank" rel="noopener noreferrer">
                    Complete Payment <ExternalLink className="ml-2 size-4" />
                  </a>
                </Button>
              )}
              <Button variant="outline" onClick={handleRetryPayment}>
                Retry Payment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Failed Payment - Retry Option */}
      {(subscription.latestPayment?.status === "failed" || subscription.latestPayment?.status === "expired") && (
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="size-5" />
              Payment {subscription.latestPayment.status === "failed" ? "Failed" : "Expired"}
            </CardTitle>
            <CardDescription>
              Your last payment {subscription.latestPayment.status === "failed" ? "failed" : "expired"}. Please try again.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              We couldn't process your payment. Please retry to activate your subscription.
            </p>
            <Button onClick={handleRetryPayment} size="lg">
              Retry Payment
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
