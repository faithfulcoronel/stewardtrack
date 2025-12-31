import { Metadata } from 'next';
import Link from 'next/link';
import { Lock, LogIn } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Login Required | StewardTrack',
  description: 'Please log in to access this resource',
};

export default function LoginRequiredPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white shadow-lg rounded-lg p-8 text-center">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="bg-blue-100 rounded-full p-4">
              <Lock className="h-12 w-12 text-blue-600" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Login Required
          </h1>

          {/* Message */}
          <p className="text-gray-600 mb-8">
            You need to be logged in to access this page. Please log in to continue.
          </p>

          {/* Actions */}
          <div className="space-y-3">
            <Link
              href="/login"
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <LogIn className="h-4 w-4" />
              Go to Login
            </Link>

            <Link
              href="/"
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Go to Home
            </Link>
          </div>

          {/* Additional Info */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Error Code: 401 - Authentication Required
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
