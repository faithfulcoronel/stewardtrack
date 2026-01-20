'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Heart, Loader2, Church } from 'lucide-react';
import { toast } from 'sonner';

import { decodeTenantToken } from '@/lib/tokens/shortUrlTokens';
import { DonationForm } from '@/components/donation/DonationForm';
import { DonationSuccess } from '@/components/donation/DonationSuccess';

interface TenantInfo {
  id: string;
  name: string;
  denomination?: string;
}

interface PageProps {
  params: Promise<{ tenantToken: string }>;
}

function DonationPageContent({ tenantToken }: { tenantToken: string }) {
  const router = useRouter();

  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [isLoadingTenant, setIsLoadingTenant] = useState(true);
  const [donationSuccess, setDonationSuccess] = useState<{
    donationId: string;
    paymentUrl: string | null;
  } | null>(null);

  useEffect(() => {
    async function loadTenant() {
      try {
        // Decode tenant token to get tenant ID
        const tenantId = decodeTenantToken(tenantToken);

        if (!tenantId) {
          toast.error('Invalid donation link');
          router.push('/');
          return;
        }

        // Fetch tenant info from API
        const response = await fetch(`/api/public/tenant-info?tenantId=${tenantId}`);
        const result = await response.json();

        if (result.success && result.data) {
          setTenant(result.data);
        } else {
          toast.error('Unable to load church information');
          router.push('/');
        }
      } catch (error) {
        console.error('Error loading page:', error);
        toast.error('Unable to load donation page');
        router.push('/');
      } finally {
        setIsLoadingTenant(false);
      }
    }

    loadTenant();
  }, [tenantToken, router]);

  const handleDonationSuccess = (donationId: string, paymentUrl: string | null) => {
    if (paymentUrl) {
      // Redirect to Xendit payment page
      window.location.href = paymentUrl;
    } else {
      // Show success state (for cases without redirect)
      setDonationSuccess({ donationId, paymentUrl });
    }
  };

  if (isLoadingTenant) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-[#179a65] via-green-600 to-[#0F766E]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
          <p className="text-white/80">Loading...</p>
        </div>
      </div>
    );
  }

  if (donationSuccess) {
    return (
      <DonationSuccess
        donationId={donationSuccess.donationId}
        churchName={tenant?.name || 'the church'}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#179a65] via-green-600 to-[#0F766E]">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.1),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(255,255,255,0.08),transparent_40%)]" />

      <div className="relative z-10 px-4 py-8 sm:py-12">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center justify-center rounded-full bg-white/20 p-3 mb-4">
              <Church className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              Give to {tenant?.name}
            </h1>
            <p className="text-white/80 flex items-center justify-center gap-2">
              <Heart className="h-4 w-4" />
              Your generosity makes a difference
            </p>
          </motion.div>

          {/* Donation Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <DonationForm
              tenantToken={tenantToken}
              churchName={tenant?.name || 'the church'}
              onSuccess={handleDonationSuccess}
            />
          </motion.div>

          {/* Footer Links */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center mt-6"
          >
            <p className="text-white/60 text-xs">
              Secure payment powered by Xendit
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default function DonatePage({ params }: PageProps) {
  const resolvedParams = use(params);
  return <DonationPageContent tenantToken={resolvedParams.tenantToken} />;
}
