import { Metadata } from 'next';
import { ShieldAlert } from 'lucide-react';
import { UnauthorizedActions } from './UnauthorizedActions';

export const metadata: Metadata = {
  title: 'Access Denied | StewardTrack',
  description: 'You do not have permission to access this resource',
};

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white shadow-lg rounded-lg p-8 text-center">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="bg-red-100 rounded-full p-4">
              <ShieldAlert className="h-12 w-12 text-red-600" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Access Denied
          </h1>

          {/* Message */}
          <p className="text-gray-600 mb-2">
            You do not have permission to access this page or resource.
          </p>
          <p className="text-sm text-gray-500 mb-8">
            This page requires special privileges. If you believe you should have access,
            please contact your system administrator.
          </p>

          {/* Actions - Client Component */}
          <UnauthorizedActions />

          {/* Additional Info */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Error Code: 403 - Forbidden
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
