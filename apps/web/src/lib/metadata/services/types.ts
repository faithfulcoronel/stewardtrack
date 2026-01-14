export interface ServiceDataSourceRequest {
  id?: string;
  role?: string;
  config?: Record<string, unknown>;
  params?: Record<string, unknown>;
  context?: unknown;
}

export type ServiceDataSourceHandler = (
  request: ServiceDataSourceRequest
) => Promise<unknown>;
