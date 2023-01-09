import { Links, parseLinks } from "./parse-links";
import { parseResponse } from "./parse-response";
import {
  Permission,
  Resource,
  Scope,
  UserRepresentation,
} from "./representations";
import { request } from "./request";

export type CallOptions = {
  signal?: AbortSignal;
};

export type PaginationParams = {
  first: number;
  max: number;
};

export async function getPersonalInfo({
  signal,
}: CallOptions = {}): Promise<UserRepresentation> {
  const response = await request("/", { signal });
  return parseResponse<UserRepresentation>(response);
}

export type ResourcesData = {
  resources: Resource[];
  links: Links;
};

export async function getResources(
  params: PaginationParams,
  { signal }: CallOptions = {}
): Promise<ResourcesData> {
  const response = await request("/resources", {
    signal,
    searchParams: {
      first: params.first.toString(),
      max: params.max.toString(),
    },
  });

  return {
    resources: await parseResponse<Resource[]>(response),
    links: parseLinks(response),
  };
}

export const getPermissions = async (
  resourceId: string,
  { signal }: CallOptions = {}
): Promise<Permission[]> => {
  const response = await request(`/resources/${resourceId}/permissions`, {
    signal,
  });

  return parseResponse<Permission[]>(response);
};

export const updatePermissions = async (
  resourceId: string,
  permissions: Permission[],
  { signal }: CallOptions = {}
): Promise<void> => {
  await request(`/resources/${resourceId}/permissions`, {
    signal,
    method: "PUT",
    body: permissions,
  });
};

export type UpdateRequestParams = {
  username: string;
  scopes: Scope[] | string[];
};

// TODO: This method really needs a better name.
export const updateRequest = async (
  resourceId: string,
  params: UpdateRequestParams,
  { signal }: CallOptions = {}
): Promise<void> => {
  await request(`/resources/${resourceId}/permissions`, {
    signal,
    method: "PUT",
    body: JSON.stringify([params]),
  });
};
