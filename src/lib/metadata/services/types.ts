export interface ServiceDataSourceRequest {
  id: string;
  role: string;
  config: Record<string, unknown>;
}

export type ServiceDataSourceHandler = (
  request: ServiceDataSourceRequest
) => Promise<unknown>;
