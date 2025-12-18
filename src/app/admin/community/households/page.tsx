import { redirect } from 'next/navigation';

/**
 * Redirect base households route to the list page
 */
export default function HouseholdsPage() {
  redirect('/admin/community/households/list');
}
