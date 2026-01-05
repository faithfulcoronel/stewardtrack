import type { MetadataActionHandler } from "../types";

import { handleMemberManageExecution, ManageMemberAction } from "./manage-member/action";
import { handleMembershipLookupQuickCreate } from "./manage-member/lookupCreate";
import { householdsActionHandlers } from "./households";
import { carePlansActionHandlers } from "./careplans";
import { discipleshipActionHandlers } from "./discipleship";
import { familiesActionHandlers } from "./families";

export const adminCommunityActionHandlers: Record<string, MetadataActionHandler> = {
  "admin-community.members.manage.saveMember": handleMemberManageExecution,
  "admin-community.members.manage.lookup.create": handleMembershipLookupQuickCreate,
  ...householdsActionHandlers,
  ...carePlansActionHandlers,
  ...discipleshipActionHandlers,
  ...familiesActionHandlers,
};

export { ManageMemberAction };
