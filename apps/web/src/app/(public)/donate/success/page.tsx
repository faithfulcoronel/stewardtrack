'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { DonationSuccess } from '@/components/donation/DonationSuccess';
import { Loader2 } from 'lucide-react';

function DonationSuccessContent() {
  const searchParams = useSearchParams();
  const [donationData, setDonationData] = useState<{
    donationId: string;
    churchName: string;
    amount?: number;
  } | null>(null);

  useEffect(() => {
    // Get donation info from URL params (set by Xendit redirect)
    const donationId = searchParams.get('donation_id') || searchParams.get('external_id') || 'Unknown';
    const churchName = searchParams.get('church') || 'the church';
    const amountStr = searchParams.get('amount');
    const amount = amountStr ? parseFloat(amountStr) : undefined;

    setDonationData({
      donationId,
      churchName,
      amount,
    });
  }, [searchParams]);

  if (!donationData) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-[#179a65] via-green-600 to-[#0F766E]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <DonationSuccess
      donationId={donationData.donationId}
      churchName={donationData.churchName}
      amount={donationData.amount}
    />
  );
}

export default function DonationSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-[#179a65] via-green-600 to-[#0F766E]">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      }
    >
      <DonationSuccessContent />
    </Suspense>
  );
}
