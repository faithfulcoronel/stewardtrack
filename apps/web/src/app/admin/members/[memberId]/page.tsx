/**
 * Member Profile Page - Redirect to Card-Based View
 *
 * Redirects to the new card-based member profile view.
 * The legacy XML-driven profile can still be accessed at /admin/members/profile?memberId={id}
 *
 * SECURITY: Protected by AccessGate requiring members:view or members:edit permission.
 */

import { redirect } from "next/navigation";

type Awaitable<T> = T | Promise<T>;

interface PageParams {
  memberId: string;
}

interface PageProps {
  params: Awaitable<PageParams>;
}

// UUID v4 regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(str: string): boolean {
  return UUID_REGEX.test(str);
}

export default async function MemberProfilePage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);

  // Validate UUID format before redirect
  if (!isValidUUID(resolvedParams.memberId)) {
    redirect("/admin/members/list");
  }

  // Redirect to new card-based profile view
  redirect(`/admin/community/members/${resolvedParams.memberId}/view`);
}