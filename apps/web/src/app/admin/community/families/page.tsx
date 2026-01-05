import { redirect } from 'next/navigation';

/**
 * Redirect base families route to the list page
 */
export default function FamiliesPage() {
  redirect('/admin/community/families/list');
}
