/**
 * Finance Module Root Page
 *
 * Redirects to the finance dashboard.
 */

import { redirect } from 'next/navigation';

export default function FinanceRootPage() {
  redirect('/admin/finance/dashboard');
}
