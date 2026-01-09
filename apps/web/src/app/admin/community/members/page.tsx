/**
 * Community Members List - Redirect to Members List
 *
 * Redirects to the existing members list page.
 * The card-based individual member view is at /admin/community/members/[memberId]/view
 */

import { redirect } from "next/navigation";

export default function CommunityMembersPage() {
  redirect("/admin/members/list");
}
