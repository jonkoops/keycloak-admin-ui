import SidebarPage from "../support/pages/admin_console/SidebarPage";
import LoginPage from "../support/pages/LoginPage";
import PartialImportModal from "../support/pages/admin_console/configure/realm_settings/PartialImportModal";
import RealmSettings from "../support/pages/admin_console/configure/realm_settings/RealmSettings";
import { keycloakBefore } from "../support/util/keycloak_hooks";
import adminClient from "../support/util/AdminClient";

describe("Partial import test", () => {
  const TEST_REALM = "Partial-import-test-realm";
  const TEST_REALM_2 = "Partial-import-test-realm-2";
  const loginPage = new LoginPage();
  const sidebarPage = new SidebarPage();
  const modal = new PartialImportModal();
  const realmSettings = new RealmSettings();

  beforeEach(() => {
    keycloakBefore();
    loginPage.logIn();
    sidebarPage.goToRealm(TEST_REALM);
    sidebarPage.goToRealmSettings();
    realmSettings.clickActionMenu();
  });

  before(async () => {
    await adminClient.createRealm(TEST_REALM);
    await adminClient.createRealm(TEST_REALM_2);
  });

  after(async () => {
    await adminClient.deleteRealm(TEST_REALM);
    await adminClient.deleteRealm(TEST_REALM_2);
  });

  it("Opens and closes partial import dialog", () => {
    modal.open();
    modal.importButton().should("be.disabled");
    modal.cancelButton().click();
    modal.importButton().should("not.exist");
  });

  it("Import button only enabled if JSON has something to import", () => {
    modal.open();
    cy.get(".pf-c-code-editor__code textarea").type("{}");
    modal.importButton().should("be.disabled");
    modal.cancelButton().click();
  });

  it("Displays user options after multi-realm import", () => {
    modal.open();
    modal.typeResourceFile("multi-realm.json");

    // Import button should be disabled if no checkboxes selected
    modal.importButton().should("be.disabled");
    modal.usersCheckbox().click();
    modal.importButton().should("be.enabled");
    modal.groupsCheckbox().click();
    modal.importButton().should("be.enabled");
    modal.groupsCheckbox().click();
    modal.usersCheckbox().click();
    modal.importButton().should("be.disabled");

    // verify resource counts
    modal.userCount().contains("1 Users");
    modal.groupCount().contains("1 Groups");
    modal.clientCount().contains("1 Clients");
    modal.idpCount().contains("1 Identity providers");
    modal.realmRolesCount().contains("2 Realm roles");
    modal.clientRolesCount().contains("1 Client roles");

    // import button should disable when switching realms
    modal.usersCheckbox().click();
    modal.importButton().should("be.enabled");
    modal.selectRealm("realm2");
    modal.importButton().should("be.disabled");

    modal.clientCount().contains("2 Clients");

    modal.clientsCheckbox().click();
    modal.importButton().click();

    cy.contains("2 records added");
    cy.contains("customer-portal");
    cy.contains("customer-portal2");
    modal.closeButton().click();
  });

  it("Displays user options after realmless import and does the import", () => {
    sidebarPage.goToRealm(TEST_REALM_2);
    sidebarPage.goToRealmSettings();
    realmSettings.clickActionMenu();
    modal.open();

    modal.typeResourceFile("client-only.json");

    modal.realmSelector().should("not.exist");

    modal.clientCount().contains("1 Clients");

    modal.usersCheckbox().should("not.exist");
    modal.groupsCheckbox().should("not.exist");
    modal.idpCheckbox().should("not.exist");
    modal.realmRolesCheckbox().should("not.exist");
    modal.clientRolesCheckbox().should("not.exist");

    modal.clientsCheckbox().click();
    modal.importButton().click();

    cy.contains("One record added");
    cy.contains("customer-portal");
  });

  // Unfortunately, the PatternFly FileUpload component does not create an id for the clear button.  So we can't easily test that function right now.
});
