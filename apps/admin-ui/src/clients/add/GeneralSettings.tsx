import ClientRepresentation from "@keycloak/keycloak-admin-client/lib/defs/clientRepresentation";
import {
  FormGroup,
  Select,
  SelectOption,
  SelectVariant,
} from "@patternfly/react-core";
import { useState } from "react";
import { Controller, UseFormMethods } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { FormAccess } from "../../components/form-access/FormAccess";
import { HelpItem } from "../../components/help-enabler/HelpItem";
import { useLoginProviders } from "../../context/server-info/ServerInfoProvider";
import { ClientDescription } from "../ClientDescription";
import { getProtocolName } from "../utils";

type GeneralSettingsProps = {
  form: UseFormMethods<ClientRepresentation>;
};

export const GeneralSettings = ({ form }: GeneralSettingsProps) => {
  const { t } = useTranslation("clients");
  const providers = useLoginProviders();
  const [open, isOpen] = useState(false);
  const {
    control,
    formState: { errors },
  } = form;

  return (
    <FormAccess isHorizontal role="manage-clients">
      <FormGroup
        label={t("clientType")}
        fieldId="kc-type"
        validated={errors.protocol ? "error" : "default"}
        labelIcon={
          <HelpItem
            helpText="clients-help:clientType"
            fieldLabelId="clients:clientType"
          />
        }
      >
        <Controller
          name="protocol"
          defaultValue=""
          control={control}
          render={({ onChange, value }) => (
            <Select
              id="kc-type"
              onToggle={isOpen}
              onSelect={(_, value) => {
                onChange(value.toString());
                isOpen(false);
              }}
              selections={value}
              variant={SelectVariant.single}
              aria-label={t("selectEncryptionType")}
              isOpen={open}
            >
              {providers.map((option) => (
                <SelectOption
                  selected={option === value}
                  key={option}
                  value={option}
                  data-testid={`option-${option}`}
                >
                  {getProtocolName(t, option)}
                </SelectOption>
              ))}
            </Select>
          )}
        />
      </FormGroup>
      <ClientDescription form={form} hasConfigureAccess />
    </FormAccess>
  );
};
