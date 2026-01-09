/**
 * Member Manage Page - Redirect to Legacy Manage Form
 *
 * Redirects to the existing member management form.
 * The manage form uses query params: /admin/members/manage?memberId={id}
 */

import { redirect } from "next/navigation";

type Awaitable<T> = T | Promise<T>;

interface PageParams {
  memberId: string;
}

interface PageProps {
  params: Awaitable<PageParams>;
}

export default async function CommunityMemberManagePage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  redirect(`/admin/members/manage?memberId=${resolvedParams.memberId}`);
}
