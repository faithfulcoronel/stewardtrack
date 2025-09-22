export interface RequestContext {
  userId?: string;
  tenantId?: string;
  roles?: string[];
}

export const defaultRequestContext: RequestContext = {};
