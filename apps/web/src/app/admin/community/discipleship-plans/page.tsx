/**
 * Discipleship Plans Index Page
 *
 * Redirects to the list page. This provides a clean URL structure where
 * /admin/community/discipleship-plans automatically goes to the list view.
 */

import { redirect } from "next/navigation";

export default function DiscipleshipPlansPage() {
  redirect("/admin/community/discipleship-plans/list");
}
