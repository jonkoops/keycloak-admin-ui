import { cloneDeep } from "lodash-es";
import FileSaver from "file-saver";
import type { IFormatter, IFormatterValueType } from "@patternfly/react-table";
import { unflatten, flatten } from "flat";

import type ClientRepresentation from "@keycloak/keycloak-admin-client/lib/defs/clientRepresentation";
import type { ProviderRepresentation } from "@keycloak/keycloak-admin-client/lib/defs/serverInfoRepesentation";
import type KeycloakAdminClient from "@keycloak/keycloak-admin-client";

import {
  keyValueToArray,
  arrayToKeyValue,
  KeyValueType,
} from "./components/key-value-form/key-value-convert";

export const sortProviders = (providers: {
  [index: string]: ProviderRepresentation;
}) => {
  return [...new Map(Object.entries(providers).sort(sortProvider)).keys()];
};

const sortProvider = (
  a: [string, ProviderRepresentation],
  b: [string, ProviderRepresentation]
) => {
  let s1, s2;
  if (a[1].order !== b[1].order) {
    s1 = b[1].order;
    s2 = a[1].order;
  } else {
    s1 = a[0];
    s2 = b[0];
  }
  if (s1 < s2) {
    return -1;
  } else if (s1 > s2) {
    return 1;
  } else {
    return 0;
  }
};

export const exportClient = (client: ClientRepresentation): void => {
  const clientCopy = cloneDeep(client);
  delete clientCopy.id;

  if (clientCopy.protocolMappers) {
    for (let i = 0; i < clientCopy.protocolMappers.length; i++) {
      delete clientCopy.protocolMappers[i].id;
    }
  }

  FileSaver.saveAs(
    new Blob([prettyPrintJSON(clientCopy)], {
      type: "application/json",
    }),
    clientCopy.clientId + ".json"
  );
};

export const toUpperCase = <T extends string>(name: T) =>
  (name.charAt(0).toUpperCase() + name.slice(1)) as Capitalize<T>;

const isAttributesObject = (value: any) => {
  return (
    Object.values(value).filter(
      (value) => Array.isArray(value) && value.length === 1
    ).length !== 0
  );
};

const isAttributeArray = (value: any) => {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.some(
    (e) => Object.hasOwn(e, "key") && Object.hasOwn(e, "value")
  );
};

const isEmpty = (obj: any) => Object.keys(obj).length === 0;

export const convertToFormValues = (
  obj: any,
  setValue: (name: string, value: any) => void
) => {
  Object.entries(obj).map(([key, value]) => {
    if (key === "attributes" && isAttributesObject(value)) {
      setValue(key, arrayToKeyValue(value as Record<string, string[]>));
    } else if (key === "config" || key === "attributes") {
      if (!isEmpty(value)) {
        const flattened: any = flatten(value, { safe: true });
        const convertedValues = Object.entries(flattened).map(([key, value]) =>
          Array.isArray(value) ? [key, value[0]] : [key, value]
        );
        setValue(key, unflatten(Object.fromEntries(convertedValues)));
      } else {
        setValue(key, undefined);
      }
    } else {
      setValue(key, value);
    }
  });
};

export function convertFormValuesToObject<T, G = T>(obj: T): G {
  const result: any = {};
  Object.entries(obj).map(([key, value]) => {
    if (isAttributeArray(value)) {
      result[key] = keyValueToArray(value as KeyValueType[]);
    } else if (key === "config" || key === "attributes") {
      result[key] = flatten(value as Record<string, any>, { safe: true });
    } else {
      result[key] = value;
    }
  });
  return result;
}

export const emptyFormatter =
  (): IFormatter => (data?: IFormatterValueType) => {
    return data ? data : "—";
  };

export const upperCaseFormatter =
  (): IFormatter => (data?: IFormatterValueType) => {
    const value = data?.toString();

    return (value ? toUpperCase(value) : undefined) as string;
  };

export const getBaseUrl = (adminClient: KeycloakAdminClient) => {
  return (
    (adminClient.keycloak
      ? adminClient.keycloak.authServerUrl!
      : adminClient.baseUrl) + "/"
  );
};

export const alphaRegexPattern = /[^A-Za-z]/g;

export const emailRegexPattern =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

export const KEY_PROVIDER_TYPE = "org.keycloak.keys.KeyProvider";

export const prettyPrintJSON = (value: any) => JSON.stringify(value, null, 2);
