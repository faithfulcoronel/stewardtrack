export interface ServiceDataSourceRequest {
  id: string;
  role: string;
  config: Record<string, unknown>;
  params: Record<string, string | string[] | undefined>;
}

export type ServiceDataSourceHandler = (
  request: ServiceDataSourceRequest
) => Promise<unknown>;
