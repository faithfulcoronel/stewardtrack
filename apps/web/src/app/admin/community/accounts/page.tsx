import { redirect } from 'next/navigation';

/**
 * Redirect base accounts route to the dashboard page
 */
export default function AccountsPage() {
  redirect('/admin/community/accounts/dashboard');
}
