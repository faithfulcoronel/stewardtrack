/**
 * Portal Profile Page - Redirect
 *
 * Redirects to /admin/my-profile for consistent layout.
 * Kept for backward compatibility with existing links.
 */

import { redirect } from "next/navigation";

export default function PortalProfilePage() {
  redirect("/admin/my-profile");
}
