import { Form } from "@patternfly/react-core";
import { UseFormMethods } from "react-hook-form";
import { useTranslation } from "react-i18next";

import type ClientRepresentation from "@keycloak/keycloak-admin-client/lib/defs/clientRepresentation";
import { ScrollForm } from "../components/scroll-form/ScrollForm";
import { AccessSettings } from "./add/AccessSettings";
import { CapabilityConfig } from "./add/CapabilityConfig";
import { LoginSettingsPanel } from "./add/LoginSettingsPanel";
import { LogoutPanel } from "./add/LogoutPanel";
import { SamlConfig } from "./add/SamlConfig";
import { SamlSignature } from "./add/SamlSignature";
import { ClientDescription } from "./ClientDescription";

export type ClientSettingsProps = {
  form: UseFormMethods<ClientRepresentation>;
  client: ClientRepresentation;
  save: () => void;
  reset: () => void;
};

export const ClientSettings = (props: ClientSettingsProps) => {
  const { t } = useTranslation("clients");
  const { form, client } = props;
  const protocol = form.watch("protocol");

  return (
    <ScrollForm
      className="pf-u-px-lg pf-u-pb-lg"
      sections={[
        {
          title: t("generalSettings"),
          panel: (
            <Form isHorizontal>
              <ClientDescription
                form={form}
                protocol={client.protocol}
                hasConfigureAccess={client.access?.configure}
              />
            </Form>
          ),
        },
        {
          title: t("accessSettings"),
          panel: <AccessSettings {...props} />,
        },
        {
          title: t("samlCapabilityConfig"),
          isHidden: protocol !== "saml" || client.bearerOnly,
          panel: <SamlConfig form={form} />,
        },
        {
          title: t("signatureAndEncryption"),
          isHidden: protocol !== "saml" || client.bearerOnly,
          panel: <SamlSignature form={form} />,
        },
        {
          title: t("capabilityConfig"),
          isHidden: protocol !== "openid-connect" || client.bearerOnly,
          panel: <CapabilityConfig form={form} />,
        },
        {
          title: t("loginSettings"),
          isHidden: client.bearerOnly,
          panel: (
            <LoginSettingsPanel form={form} access={client.access?.configure} />
          ),
        },
        {
          title: t("logoutSettings"),
          isHidden: client.bearerOnly,
          panel: <LogoutPanel {...props} />,
        },
      ]}
    />
  );
};
