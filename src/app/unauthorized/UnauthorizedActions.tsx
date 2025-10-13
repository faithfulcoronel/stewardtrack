'use client';

import Link from 'next/link';
import { Home, ArrowLeft } from 'lucide-react';

export function UnauthorizedActions() {
  return (
    <div className="space-y-3">
      <Link
        href="/"
        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Home className="h-4 w-4" />
        Go to Dashboard
      </Link>

      <button
        onClick={() => window.history.back()}
        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Go Back
      </button>
    </div>
  );
}
