import LoginPage from "../support/pages/LoginPage";
import {
  Filter,
  FilterAssignedType,
} from "../support/pages/admin_console/ListingPage";
import CreateClientPage from "../support/pages/admin_console/manage/clients/CreateClientPage";
import adminClient from "../support/util/AdminClient";
import { keycloakBefore } from "../support/util/keycloak_hooks";
import RoleMappingTab from "../support/pages/admin_console/manage/RoleMappingTab";
import createRealmRolePage from "../support/pages/admin_console/manage/realm_roles/CreateRealmRolePage";
import AssociatedRolesPage from "../support/pages/admin_console/manage/realm_roles/AssociatedRolesPage";
import ClientRolesTab from "../support/pages/admin_console/manage/clients/ClientRolesTab";
import InitialAccessTokenTab from "../support/pages/admin_console/manage/clients/tabs/InitialAccessTokenTab";
import AdvancedTab from "../support/pages/admin_console/manage/clients/client_details/tabs/AdvancedTab";
import ClientDetailsPage, {
  ClientsDetailsTab,
} from "../support/pages/admin_console/manage/clients/client_details/ClientDetailsPage";
import CommonPage from "../support/pages/CommonPage";

let itemId = "client_crud";
const loginPage = new LoginPage();
const associatedRolesPage = new AssociatedRolesPage();
const createClientPage = new CreateClientPage();
const clientDetailsPage = new ClientDetailsPage();
const commonPage = new CommonPage();

describe("Clients test", () => {
  describe("Client details - Client scopes subtab", () => {
    const clientId = "client-scopes-subtab-test";
    const clientScopeName = "client-scope-test";
    const clientScopeNameDefaultType = "client-scope-test-default-type";
    const clientScopeNameOptionalType = "client-scope-test-optional-type";
    const clientScope = {
      name: clientScopeName,
      description: "",
      protocol: "openid-connect",
      attributes: {
        "include.in.token.scope": "true",
        "display.on.consent.screen": "true",
        "gui.order": "1",
        "consent.screen.text": "",
      },
    };
    const msgScopeMappingRemoved = "Scope mapping successfully removed";

    before(async () => {
      adminClient.createClient({
        clientId,
        protocol: "openid-connect",
        publicClient: false,
      });
      for (let i = 0; i < 5; i++) {
        clientScope.name = clientScopeName + i;
        await adminClient.createClientScope(clientScope);
        await adminClient.addDefaultClientScopeInClient(
          clientScopeName + i,
          clientId
        );
      }
      clientScope.name = clientScopeNameDefaultType;
      await adminClient.createClientScope(clientScope);
      clientScope.name = clientScopeNameOptionalType;
      await adminClient.createClientScope(clientScope);
    });

    beforeEach(() => {
      keycloakBefore();
      loginPage.logIn();
      commonPage.sidebar().goToClients();
      cy.intercept("/admin/realms/master/clients/*").as("fetchClient");
      commonPage.tableToolbarUtils().searchItem(clientId);
      commonPage.tableUtils().clickRowItemLink(clientId);
      cy.wait("@fetchClient");
      clientDetailsPage.goToClientScopesTab();
    });

    after(async () => {
      adminClient.deleteClient(clientId);
      for (let i = 0; i < 5; i++) {
        await adminClient.deleteClientScope(clientScopeName + i);
      }
      await adminClient.deleteClientScope(clientScopeNameDefaultType);
      await adminClient.deleteClientScope(clientScopeNameOptionalType);
    });

    it("Should list client scopes", () => {
      commonPage
        .tableUtils()
        .checkRowItemsGreaterThan(1)
        .checkRowItemExists(clientScopeName + 0);
    });

    it("Should search existing client scope by name", () => {
      commonPage.tableToolbarUtils().searchItem(clientScopeName + 0, false);
      commonPage
        .tableUtils()
        .checkRowItemExists(clientScopeName + 0)
        .checkRowItemsEqualTo(2);
    });

    it("Should search non-existent client scope by name", () => {
      commonPage.tableToolbarUtils().searchItem("non-existent-item", false);
      commonPage.tableUtils().checkIfExists(false);
      commonPage.emptyState().checkIfExists(true);
    });

    it("Should search existing client scope by assigned type", () => {
      commonPage
        .tableToolbarUtils()
        .selectSearchType(Filter.AssignedType)
        .selectSecondarySearchType(FilterAssignedType.Default);
      commonPage
        .tableUtils()
        .checkRowItemExists(FilterAssignedType.Default)
        .checkRowItemExists(FilterAssignedType.Optional, false);
      commonPage
        .tableToolbarUtils()
        .selectSecondarySearchType(FilterAssignedType.Optional);
      commonPage
        .tableUtils()
        .checkRowItemExists(FilterAssignedType.Default, false)
        .checkRowItemExists(FilterAssignedType.Optional);
      commonPage
        .tableToolbarUtils()
        .selectSecondarySearchType(FilterAssignedType.AllTypes);
      commonPage
        .tableUtils()
        .checkRowItemExists(FilterAssignedType.Default)
        .checkRowItemExists(FilterAssignedType.Optional);
    });

    const newItemsWithExpectedAssignedTypes = [
      [clientScopeNameOptionalType, FilterAssignedType.Optional],
      [clientScopeNameDefaultType, FilterAssignedType.Default],
    ];
    newItemsWithExpectedAssignedTypes.forEach(($type) => {
      const [itemName, assignedType] = $type;
      it(`Should add client scope ${itemName} with ${assignedType} assigned type`, () => {
        commonPage.tableToolbarUtils().addClientScope();
        commonPage
          .modalUtils()
          .checkModalTitle("Add client scopes to " + clientId);
        commonPage.tableUtils().selectRowItemCheckbox(itemName);
        commonPage.modalUtils().confirmModalWithItem(assignedType);
        commonPage
          .masthead()
          .checkNotificationMessage("Scope mapping successfully updated");
        commonPage.tableToolbarUtils().searchItem(itemName, false);
        commonPage
          .tableUtils()
          .checkRowItemExists(itemName)
          .checkRowItemExists(assignedType);
      });
    });

    const expectedItemAssignedTypes = [
      FilterAssignedType.Optional,
      FilterAssignedType.Default,
    ];
    expectedItemAssignedTypes.forEach(($assignedType) => {
      const itemName = clientScopeName + 0;
      it(`Should change item ${itemName} AssignedType to ${$assignedType} from search bar`, () => {
        commonPage.tableToolbarUtils().searchItem(itemName, false);
        commonPage.tableUtils().selectRowItemCheckbox(itemName);
        commonPage.tableToolbarUtils().changeTypeTo($assignedType);
        commonPage.masthead().checkNotificationMessage("Scope mapping updated");
        commonPage.tableToolbarUtils().searchItem(itemName, false);
        commonPage.tableUtils().checkRowItemExists($assignedType);
      });
    });

    it("Should show items on next page are more than 11", () => {
      commonPage.sidebar().waitForPageLoad();
      commonPage.tableToolbarUtils().clickNextPageButton();
      commonPage.tableUtils().checkRowItemsGreaterThan(1);
    });

    it("Should remove client scope from item bar", () => {
      const itemName = clientScopeName + 0;
      commonPage.tableToolbarUtils().searchItem(itemName, false);
      commonPage.tableUtils().selectRowItemAction(itemName, "Remove");
      commonPage.masthead().checkNotificationMessage(msgScopeMappingRemoved);
      commonPage.tableToolbarUtils().searchItem(itemName, false);
      commonPage.tableUtils().checkRowItemExists(itemName, false);
    });

    // TODO: https://github.com/keycloak/keycloak-admin-ui/issues/1854
    it("Should remove multiple client scopes from search bar", () => {
      const itemName1 = clientScopeName + 1;
      const itemName2 = clientScopeName + 2;
      commonPage.tableToolbarUtils().clickSearchButton();
      commonPage.tableToolbarUtils().checkActionItemIsEnabled("Remove", false);
      commonPage.tableToolbarUtils().searchItem(clientScopeName, false);
      commonPage
        .tableUtils()
        .selectRowItemCheckbox(itemName1)
        .selectRowItemCheckbox(itemName2);
      commonPage.tableToolbarUtils().clickSearchButton();
      commonPage.tableToolbarUtils().clickActionItem("Remove");
      commonPage.masthead().checkNotificationMessage(msgScopeMappingRemoved);
      commonPage.tableToolbarUtils().searchItem(clientScopeName, false);
      commonPage
        .tableUtils()
        .checkRowItemExists(itemName1, false)
        .checkRowItemExists(itemName2, false);
      commonPage.tableToolbarUtils().clickSearchButton();
    });

    //fails, issue https://github.com/keycloak/keycloak-admin-ui/issues/1874
    it.skip("Should show initial items after filtering", () => {
      commonPage
        .tableToolbarUtils()
        .selectSearchType(Filter.AssignedType)
        .selectSecondarySearchType(FilterAssignedType.Optional)
        .selectSearchType(Filter.Name);
      commonPage
        .tableUtils()
        .checkRowItemExists(FilterAssignedType.Default)
        .checkRowItemExists(FilterAssignedType.Optional);
    });
  });

  describe("Client creation", () => {
    before(() => {
      keycloakBefore();
      loginPage.logIn();
    });

    beforeEach(() => {
      commonPage.sidebar().goToClients();
    });

    it("Should cancel creating client", () => {
      commonPage.tableToolbarUtils().createClient();

      createClientPage.continue().checkClientIdRequiredMessage();

      createClientPage
        .fillClientData("")
        .selectClientType("openid-connect")
        .cancel();

      cy.url().should("not.include", "/add-client");
    });

    it("Should check settings elements", () => {
      commonPage.tableToolbarUtils().clickPrimaryButton();
      const clientId = "Test settings";

      createClientPage
        .fillClientData(clientId)
        .continue()
        .checkCapabilityConfigElements()
        .save();

      commonPage
        .masthead()
        .checkNotificationMessage("Client created successfully");
      commonPage.sidebar().waitForPageLoad();

      createClientPage
        .checkCapabilityConfigElements()
        .checkAccessSettingsElements()
        .checkLoginSettingsElements()
        .checkLogoutSettingsElements()
        .deleteClientFromActionDropdown();

      commonPage.modalUtils().confirmModal();
      commonPage.tableUtils().checkRowItemExists(clientId, false);
    });

    it("Should navigate to previous using 'back' button", () => {
      commonPage.tableToolbarUtils().createClient();

      createClientPage.continue().checkClientIdRequiredMessage();

      createClientPage
        .fillClientData("test_client")
        .selectClientType("openid-connect")
        .continue()
        .back()
        .checkGeneralSettingsStepActive();
    });

    it("Should fail creating client", () => {
      commonPage.tableToolbarUtils().createClient();

      createClientPage.continue().checkClientIdRequiredMessage();

      createClientPage
        .fillClientData("")
        .selectClientType("openid-connect")
        .continue()
        .checkClientIdRequiredMessage();

      createClientPage.fillClientData("account").continue().save();

      // The error should inform about duplicated name/id
      commonPage
        .masthead()
        .checkNotificationMessage(
          "Could not create client: 'Client account already exists'"
        );
    });

    it("Client CRUD test", () => {
      itemId += "_" + (Math.random() + 1).toString(36).substring(7);

      // Create
      commonPage.tableUtils().checkRowItemExists(itemId, false);
      commonPage.tableToolbarUtils().clickPrimaryButton();
      createClientPage.cancel();
      commonPage.tableUtils().checkRowItemExists(itemId, false);
      commonPage.tableToolbarUtils().clickPrimaryButton();

      createClientPage
        .selectClientType("openid-connect")
        .fillClientData(itemId)
        .continue()
        .switchClientAuthentication()
        .clickDirectAccess()
        .clickImplicitFlow()
        .clickOAuthDeviceAuthorizationGrant()
        .clickOidcCibaGrant()
        .clickServiceAccountRoles()
        .clickStandardFlow()
        .save();

      commonPage
        .masthead()
        .checkNotificationMessage("Client created successfully");

      commonPage.sidebar().goToClients();

      commonPage.tableToolbarUtils().searchItem("John Doe", false);
      commonPage.emptyState().checkIfExists(true);
      commonPage.tableToolbarUtils().searchItem("");
      commonPage.tableUtils().checkRowItemExists("account");
      commonPage.tableToolbarUtils().searchItem(itemId);
      commonPage.tableUtils().checkRowItemExists(itemId);

      // Delete
      commonPage.tableUtils().selectRowItemAction(itemId, "Delete");
      commonPage.sidebar().waitForPageLoad();
      commonPage
        .modalUtils()
        .checkModalTitle(`Delete ${itemId} ?`)
        .confirmModal();
      commonPage
        .masthead()
        .checkNotificationMessage("The client has been deleted");
      commonPage.tableUtils().checkRowItemExists(itemId, false);
    });

    it("Initial access token can't be created with 0 days and count", () => {
      const initialAccessTokenTab = new InitialAccessTokenTab();
      initialAccessTokenTab
        .goToInitialAccessTokenTab()
        .shouldBeEmpty()
        .goToCreateFromEmptyList()
        .fillNewTokenData(0, 0)
        .checkExpirationGreaterThanZeroError()
        .checkCountValue(1)
        .checkSaveButtonIsDisabled();
    });

    it("Initial access token", () => {
      const initialAccessTokenTab = new InitialAccessTokenTab();
      initialAccessTokenTab
        .goToInitialAccessTokenTab()
        .shouldBeEmpty()
        .goToCreateFromEmptyList()
        .fillNewTokenData(1, 3)
        .save();

      commonPage
        .modalUtils()
        .checkModalTitle("Initial access token details")
        .closeModal();

      commonPage
        .masthead()
        .checkNotificationMessage("New initial access token has been created");

      initialAccessTokenTab.shouldNotBeEmpty();

      commonPage.tableToolbarUtils().searchItem("John Doe", false);
      commonPage.emptyState().checkIfExists(true);
      commonPage.tableToolbarUtils().searchItem("", false);

      initialAccessTokenTab.getFirstId((id) => {
        commonPage
          .tableUtils()
          .checkRowItemValueByItemName(id, 4, "4")
          .checkRowItemValueByItemName(id, 5, "4")
          .checkRowItemExists(id);
      });

      commonPage.tableToolbarUtils().clickPrimaryButton("Create");
      initialAccessTokenTab.fillNewTokenData(1, 3).save();

      commonPage.modalUtils().closeModal();

      initialAccessTokenTab.getFirstId((id) => {
        commonPage.tableUtils().selectRowItemAction(id, "Delete");
        commonPage.sidebar().waitForPageLoad();
        commonPage
          .modalUtils()
          .checkModalTitle("Delete initial access token?")
          .confirmModal();
      });

      commonPage
        .masthead()
        .checkNotificationMessage("Initial access token deleted successfully");
      initialAccessTokenTab.shouldNotBeEmpty();

      initialAccessTokenTab.getFirstId((id) => {
        commonPage.tableUtils().selectRowItemAction(id, "Delete");
        commonPage.sidebar().waitForPageLoad();
        commonPage.modalUtils().confirmModal();
      });
      initialAccessTokenTab.shouldBeEmpty();
    });
  });

  describe.only("Roles tab test", () => {
    const rolesTab = new ClientRolesTab();
    let client: string;

    before(() => {
      keycloakBefore();
      loginPage.logIn();
      commonPage.sidebar().goToClients();

      client = "client_" + (Math.random() + 1).toString(36).substring(7);

      commonPage.tableToolbarUtils().createClient();

      createClientPage
        .selectClientType("openid-connect")
        .fillClientData(client)
        .continue()
        .save();
      commonPage
        .masthead()
        .checkNotificationMessage("Client created successfully", true);
    });

    beforeEach(() => {
      keycloakBefore();
      loginPage.logIn();
      commonPage.sidebar().goToClients();
      commonPage.tableToolbarUtils().searchItem(client);
      commonPage.tableUtils().clickRowItemLink(client);
      rolesTab.goToRolesTab();
    });

    after(() => {
      adminClient.deleteClient(client);
    });

    it("Should fail to create client role with empty name", () => {
      rolesTab.goToCreateRoleFromEmptyState();
      createRealmRolePage.fillRealmRoleData("").save();
      createRealmRolePage.checkRealmRoleNameRequiredMessage();
    });

    it("Should create client role", () => {
      rolesTab.goToCreateRoleFromEmptyState();
      createRealmRolePage.fillRealmRoleData(itemId).save();
      commonPage.masthead().checkNotificationMessage("Role created", true);
    });

    it("Should update client role description", () => {
      const updateDescription = "updated description";
      commonPage.tableToolbarUtils().searchItem(itemId, false);
      commonPage.tableUtils().clickRowItemLink(itemId);
      createRealmRolePage.updateDescription(updateDescription).save();
      commonPage
        .masthead()
        .checkNotificationMessage("The role has been saved", true);
      createRealmRolePage.checkDescription(updateDescription);
    });

    it("Should add attribute to client role", () => {
      cy.intercept("/admin/realms/master/roles-by-id/*").as("load");
      commonPage.tableUtils().clickRowItemLink(itemId);
      rolesTab.goToAttributesTab();
      cy.wait(["@load", "@load"]);
      rolesTab.addAttribute(1, "crud_attribute_key", "crud_attribute_value");
      rolesTab.checkRowItemsEqualTo(1);
      commonPage
        .masthead()
        .checkNotificationMessage("The role has been saved", true);
    });

    it("Should delete attribute from client role", () => {
      cy.intercept("/admin/realms/master/roles-by-id/*").as("load");
      commonPage.tableUtils().clickRowItemLink(itemId);
      rolesTab.goToAttributesTab();
      cy.wait(["@load", "@load"]);
      rolesTab.deleteAttribute(1);
      commonPage
        .masthead()
        .checkNotificationMessage("The role has been saved", true);
    });

    it("Should create client role to be deleted", () => {
      rolesTab.goToCreateRoleFromToolbar();
      createRealmRolePage.fillRealmRoleData("client_role_to_be_deleted").save();
      commonPage.masthead().checkNotificationMessage("Role created", true);
    });

    it("Should fail to create duplicate client role", () => {
      rolesTab.goToCreateRoleFromToolbar();
      createRealmRolePage.fillRealmRoleData(itemId).save();
      commonPage
        .masthead()
        .checkNotificationMessage(
          `Could not create role: Role with name ${itemId} already exists`,
          true
        );
    });

    it("Should search existing client role", () => {
      commonPage.tableToolbarUtils().searchItem(itemId, false);
      commonPage.tableUtils().checkRowItemExists(itemId);
    });

    it("Should search non-existing role test", () => {
      commonPage.tableToolbarUtils().searchItem("role_DNE", false);
      commonPage.emptyState().checkIfExists(true);
    });

    it("roles empty search test", () => {
      commonPage.tableToolbarUtils().searchItem("", false);
      commonPage.tableUtils().checkIfExists(true);
    });

    it("Add associated roles test", () => {
      commonPage.tableToolbarUtils().searchItem(itemId, false);
      commonPage.tableUtils().clickRowItemLink(itemId);

      // Add associated realm role
      associatedRolesPage.addAssociatedRealmRole("create-realm");
      commonPage
        .masthead()
        .checkNotificationMessage("Associated roles have been added", true);

      // Add associated client role
      associatedRolesPage.addAssociatedRoleFromSearchBar("create-client", true);
      commonPage
        .masthead()
        .checkNotificationMessage("Associated roles have been added", true);

      rolesTab.goToAssociatedRolesTab();

      // Add associated client role
      associatedRolesPage.addAssociatedRoleFromSearchBar(
        "manage-consent",
        true
      );
      commonPage
        .masthead()
        .checkNotificationMessage("Associated roles have been added", true);
    });

    it("Should hide inherited roles test", () => {
      commonPage.tableToolbarUtils().searchItem(itemId, false);
      commonPage.tableUtils().clickRowItemLink(itemId);
      rolesTab.goToAssociatedRolesTab().hideInheritedRoles();
    });

    it("Should delete associated roles test", () => {
      commonPage.tableToolbarUtils().searchItem(itemId, false);
      commonPage.tableUtils().clickRowItemLink(itemId);
      rolesTab.goToAssociatedRolesTab();
      commonPage.tableUtils().selectRowItemAction("create-realm", "Remove");
      commonPage.sidebar().waitForPageLoad();
      commonPage
        .modalUtils()
        .checkModalTitle("Remove associated role?")
        .confirmModal();
      commonPage.sidebar().waitForPageLoad();

      commonPage
        .masthead()
        .checkNotificationMessage("Associated roles have been removed", true);

      commonPage.tableUtils().selectRowItemAction("manage-consent", "Remove");
      commonPage.sidebar().waitForPageLoad();
      commonPage
        .modalUtils()
        .checkModalTitle("Remove associated role?")
        .confirmModal();
    });

    it("Should delete associated role from search bar test", () => {
      commonPage.tableToolbarUtils().searchItem(itemId, false);
      commonPage.tableUtils().clickRowItemLink(itemId);
      commonPage.sidebar().waitForPageLoad();
      rolesTab.goToAssociatedRolesTab();

      cy.get('td[data-label="Role name"]')
        .contains("create-client")
        .parent()
        .within(() => {
          cy.get("input").click();
        });

      associatedRolesPage.removeAssociatedRoles();

      commonPage.sidebar().waitForPageLoad();
      commonPage
        .modalUtils()
        .checkModalTitle("Remove associated roles?")
        .confirmModal();
      commonPage.sidebar().waitForPageLoad();

      commonPage
        .masthead()
        .checkNotificationMessage("Associated roles have been removed", true);
    });

    it("Should delete client role test", () => {
      commonPage.tableUtils().selectRowItemAction(itemId, "Delete");
      commonPage.sidebar().waitForPageLoad();
      commonPage.modalUtils().checkModalTitle("Delete role?").confirmModal();
    });

    it("Should delete client role from role details test", () => {
      commonPage
        .tableToolbarUtils()
        .searchItem("client_role_to_be_deleted", false);
      commonPage.tableUtils().clickRowItemLink("client_role_to_be_deleted");
      createRealmRolePage.clickActionMenu("Delete this role");
      commonPage.modalUtils().confirmModal();
      commonPage
        .masthead()
        .checkNotificationMessage("The role has been deleted", true);
    });
  });

  describe("Advanced tab test", () => {
    const advancedTab = new AdvancedTab();
    let client: string;

    before(() => {
      keycloakBefore();
      loginPage.logIn();
    });

    beforeEach(() => {
      commonPage.sidebar().goToClients();
      client = "client_" + (Math.random() + 1).toString(36).substring(7);
      commonPage.tableToolbarUtils().createClient();
      createClientPage
        .selectClientType("openid-connect")
        .fillClientData(client)
        .continue();

      commonPage.sidebar().waitForPageLoad();

      createClientPage.save();

      clientDetailsPage.goToAdvancedTab();
    });

    afterEach(() => {
      adminClient.deleteClient(client);
    });

    it("Clustering", () => {
      advancedTab.expandClusterNode();

      advancedTab.registerNodeManually().fillHost("localhost").saveHost();
      advancedTab.checkTestClusterAvailability(true);
    });

    it("Fine grain OpenID connect configuration", () => {
      const algorithm = "ES384";
      advancedTab
        .selectAccessTokenSignatureAlgorithm(algorithm)
        .saveFineGrain();

      advancedTab
        .selectAccessTokenSignatureAlgorithm("HS384")
        .revertFineGrain();
      advancedTab.checkAccessTokenSignatureAlgorithm(algorithm);
    });
  });

  describe("Service account tab test", () => {
    const serviceAccountTab = new RoleMappingTab("user");
    const serviceAccountName = "service-account-client";

    before(() => {
      keycloakBefore();
      loginPage.logIn();
      adminClient.createClient({
        protocol: "openid-connect",
        clientId: serviceAccountName,
        publicClient: false,
        authorizationServicesEnabled: true,
        serviceAccountsEnabled: true,
        standardFlowEnabled: true,
      });
    });

    beforeEach(() => {
      commonPage.sidebar().goToClients();
    });

    after(() => {
      adminClient.deleteClient(serviceAccountName);
    });

    it("List", () => {
      commonPage.tableToolbarUtils().searchItem(serviceAccountName);
      commonPage.tableUtils().clickRowItemLink(serviceAccountName);
      serviceAccountTab
        .goToServiceAccountTab()
        .checkRoles(["manage-account", "offline_access", "uma_authorization"]);
    });

    it.skip("Assign", () => {
      commonPage.tableUtils().clickRowItemLink(serviceAccountName);
      serviceAccountTab
        .goToServiceAccountTab()
        .assignRole(false)
        .selectRow("create-realm")
        .assign();
      commonPage.masthead().checkNotificationMessage("Role mapping updated");
      serviceAccountTab.selectRow("create-realm").unAssign();
      commonPage.sidebar().waitForPageLoad();
      commonPage.modalUtils().checkModalTitle("Remove mapping?").confirmModal();
      commonPage
        .masthead()
        .checkNotificationMessage("Scope mapping successfully removed");
    });
  });

  describe("Mapping tab", () => {
    const mappingClient = "mapping-client";
    beforeEach(() => {
      keycloakBefore();
      loginPage.logIn();
      commonPage.sidebar().goToClients();
      commonPage.tableToolbarUtils().searchItem(mappingClient);
      commonPage.tableUtils().clickRowItemLink(mappingClient);
    });

    before(() => {
      adminClient.createClient({
        protocol: "openid-connect",
        clientId: mappingClient,
        publicClient: false,
      });
    });

    after(() => {
      adminClient.deleteClient(mappingClient);
    });

    it("Add mapping to openid client", () => {
      clientDetailsPage
        .goToClientScopesTab()
        .clickDedicatedScope(mappingClient)
        .goToMappersTab()
        .addPredefinedMapper();
      clientDetailsPage.modalUtils().table().clickHeaderItem(1, "input");
      clientDetailsPage.modalUtils().add();
      clientDetailsPage
        .masthead()
        .checkNotificationMessage("Mapping successfully created");
    });
  });

  describe("Keys tab test", () => {
    const keysName = "keys-client";

    before(() => {
      keycloakBefore();
      loginPage.logIn();
      adminClient.createClient({
        protocol: "openid-connect",
        clientId: keysName,
        publicClient: false,
      });
    });

    beforeEach(() => {
      commonPage.sidebar().goToClients();
      commonPage.tableToolbarUtils().searchItem(keysName);
      commonPage.tableUtils().clickRowItemLink(keysName);
    });

    after(() => {
      adminClient.deleteClient(keysName);
    });

    it("Change use JWKS Url", () => {
      const keysTab = clientDetailsPage.goToKeysTab();
      keysTab.formUtils().checkSaveButtonIsDisabled(true);
      keysTab.toggleUseJwksUrl().formUtils().checkSaveButtonIsDisabled(false);
    });

    it("Generate new keys", () => {
      const keysTab = clientDetailsPage.goToKeysTab();
      keysTab.clickGenerate();
      keysTab.fillGenerateModal("keyname", "123", "1234").clickConfirm();

      commonPage
        .masthead()
        .checkNotificationMessage(
          "New key pair and certificate generated successfully"
        );
    });
  });

  describe("Realm client", () => {
    const clientName = "master-realm";

    before(() => {
      keycloakBefore();
      loginPage.logIn();
      commonPage.sidebar().goToClients();
      commonPage.tableToolbarUtils().searchItem(clientName);
      commonPage.tableUtils().clickRowItemLink(clientName);
    });

    it("Displays the correct tabs", () => {
      clientDetailsPage
        .goToSettingsTab()
        .tabUtils()
        .checkTabExists(ClientsDetailsTab.Settings, true)
        .checkTabExists(ClientsDetailsTab.Roles, true)
        .checkTabExists(ClientsDetailsTab.Advanced, true)
        .checkNumberOfTabsIsEqual(4);
    });

    it("Hides the delete action", () => {
      commonPage
        .actionToolbarUtils()
        .clickActionToggleButton()
        .checkActionItemExists("Delete", false);
    });
  });

  describe("Bearer only", () => {
    const clientId = "bearer-only";

    before(() => {
      keycloakBefore();
      loginPage.logIn();
      adminClient.createClient({
        clientId,
        protocol: "openid-connect",
        publicClient: false,
        bearerOnly: true,
      });
      commonPage.sidebar().goToClients();
      cy.intercept("/admin/realms/master/clients/*").as("fetchClient");
      commonPage.tableToolbarUtils().searchItem(clientId);
      commonPage.tableUtils().clickRowItemLink(clientId);
      cy.wait("@fetchClient");
    });

    after(() => {
      adminClient.deleteClient(clientId);
    });

    it("Shows an explainer text for bearer only clients", () => {
      commonPage
        .actionToolbarUtils()
        .bearerOnlyExplainerLabelElement.trigger("mouseenter");
      commonPage
        .actionToolbarUtils()
        .bearerOnlyExplainerTooltipElement.should("exist");
    });

    it("Hides the capability config section", () => {
      cy.findByTestId("capability-config-form").should("not.exist");
      cy.findByTestId("jump-link-capability-config").should("not.exist");
    });
  });
});
