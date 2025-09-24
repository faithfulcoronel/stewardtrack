import type { MetadataActionHandler } from "../types";

import { handleMemberManageExecution, ManageMemberAction } from "./manage-member/action";

export const adminCommunityActionHandlers: Record<string, MetadataActionHandler> = {
  "admin-community.members.manage.saveMember": handleMemberManageExecution,
};

export { ManageMemberAction };
