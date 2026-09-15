(function () {
	var startCount = passed + failed;
	var Copy = CustomerSettingsCopy;
	var Shortcut = TerminalKeyboardShortcut;
	var Entitlement = PanelEntitlement;
	var root = __pickfxRoot;
	var customerHtml = fs.readFileSync(path.join(root, "src/panel/index.html"), "utf8");
	var productSource = fs.readFileSync(path.join(root, "src/panel/js/product.js"), "utf8");
	var panelSource = fs.readFileSync(path.join(root, "src/panel/js/panel.js"), "utf8");
	var visibleHtml = customerHtml
		.replace(/<script[\s\S]*?<\/script>/gi, "")
		.replace(/<link[^>]*>/gi, "");
	var forbiddenVisible = [
		"production-ready",
		"research",
		"registry",
		"validation",
		"manual review",
		"ambiguous",
		"unsupported",
		"failed",
		"promotion",
		"admin",
		"debug",
		"feature flag",
		"140 production",
		"production capabilities",
		"135 parameters",
		"45 effects",
		"6 effects",
		"21 effects",
		"2,434 parameters"
	];
	var i;
	var record;
	var visibleLower = visibleHtml.toLowerCase();

	assertEq("phase11 mac shortcut label", Shortcut.shortcutLabel("MacIntel"), "⌘ Space");
	assertEq("phase11 mac shortcut hint", Shortcut.shortcutHint("MacIntel"), "⌘ Space to focus PickFX");
	assertEq("phase11 windows shortcut label", Shortcut.shortcutLabel("Win32"), "Ctrl Space");
	assertEq("phase11 windows shortcut hint", Shortcut.shortcutHint("Win32"), "Ctrl Space to focus PickFX");
	assertEq("phase11 darwin uses mac shortcut", Shortcut.shortcutLabel("darwin"), "⌘ Space");
	assertEq("phase11 shortcut is not global", Shortcut.SCOPE, "FOCUSED_CEP_PANEL_ONLY");
	assertEq("phase11 settings copy uses mac shortcut", Copy.shortcutLabel("MacIntel"), "⇧ P");
	assertEq("phase11 settings copy uses windows shortcut", Copy.shortcutLabel("Win32"), "⇧ P");

	assertEq("phase11 unauthenticated account", Copy.accountLabel(null), "Not signed in");
	assertEq("phase11 unauthenticated status", Copy.statusLabel(null), "Signed out");
	assertEq("phase11 unauthenticated auth note", Copy.authorizationNote(null), "Sign in with an active PickFX plan.");
	assertEq("phase11 unauthenticated has no auth button", Copy.showAuthorizationAction(null), false);

	record = {
		sessionToken: "tok",
		state: "MONTHLY_ACTIVE",
		plan: "monthly",
		productAccess: true,
		authorized: true,
		email: "monthly@example.com"
	};
	assertEq("phase11 monthly authorized account", Copy.accountLabel(record), "Signed in as monthly@example.com");
	assertEq("phase11 monthly authorized plan", Copy.planLabel(record), "Monthly");
	assertEq("phase11 monthly authorized status", Copy.statusLabel(record), "Active");
	assertEq("phase11 monthly authorized note", Copy.authorizationNote(record), "This panel is authorized.");
	assertEq("phase11 monthly authorized hides auth button", Copy.showAuthorizationAction(record), false);

	record = {
		sessionToken: "tok",
		state: "MONTHLY_ACTIVE",
		plan: "monthly",
		productAccess: false,
		authorized: false
	};
	assertEq("phase11 monthly unauthorized still signed in", Copy.accountLabel(record), "Signed in");
	assertEq("phase11 monthly unauthorized plan", Copy.planLabel(record), "Monthly");
	assertEq("phase11 monthly unauthorized status", Copy.statusLabel(record), "Authorization required");
	assertEq("phase11 monthly unauthorized note", Copy.authorizationNote(record), "Authorize this panel");
	assertEq("phase11 monthly unauthorized shows auth button", Copy.showAuthorizationAction(record), true);

	record = {
		sessionToken: "tok",
		state: "LIFETIME",
		plan: "lifetime",
		productAccess: true,
		authorized: true,
		email: "life@example.com"
	};
	assertEq("phase11 lifetime account", Copy.accountLabel(record), "Signed in as life@example.com");
	assertEq("phase11 lifetime plan", Copy.planLabel(record), "Lifetime");
	assertEq("phase11 lifetime status", Copy.statusLabel(record), "Active");
	assertEq("phase11 lifetime note", Copy.authorizationNote(record), "No authorization required for Lifetime.");
	assertEq("phase11 lifetime hides auth button", Copy.showAuthorizationAction(record), false);

	record = {
		sessionToken: "tok",
		state: "MONTHLY_ACTIVE",
		plan: "monthly",
		productAccess: true,
		authorized: true
	};
	assertEq("phase11 authorized without email still signed in", Copy.accountLabel(record), "Signed in");
	assert("phase11 authorized without email is not Not signed in", Copy.accountLabel(record) !== "Not signed in");

	record = Entitlement.recordFromServer("tok", {
		ok: true,
		authorized: true,
		productAccess: true,
		entitlement: { state: "MONTHLY_ACTIVE", plan: "monthly" },
		user: { email: "from-payload@example.com" }
	});
	assertEq("phase11 record keeps payload email", record.email, "from-payload@example.com");
	assertEq("phase11 payload email is signed in as", Copy.accountLabel(record), "Signed in as from-payload@example.com");

	assertEq("phase11 about title has no count", Copy.aboutTitle(), "PickFX 2.5");
	assertEq("phase11 about copy has no count", Copy.aboutCopy(), "Fast effect control for Premiere Pro.");
	assert("phase11 about copy has no capability count", Copy.aboutCopy().indexOf("140") === -1);
	assert("phase11 about copy has no capabilities word", Copy.aboutCopy().toLowerCase().indexOf("capabilities") === -1);

	assert("phase11 customer HTML has no result count node", customerHtml.indexOf("footer-result-count") === -1);
	assert("phase11 customer HTML has no 6 effects", customerHtml.indexOf("6 effects") === -1);
	assert("phase11 customer HTML has no 140 production", customerHtml.indexOf("140 production") === -1);
	assert("phase11 customer HTML uses premium about copy", customerHtml.indexOf("Fast effect control for Premiere Pro.") !== -1);
	assert("phase11 footer writes no effect counts", panelSource.indexOf('n + " effects"') === -1);
	assert("phase11 footer writes no singular effect count", panelSource.indexOf('"1 effect"') === -1);
	assert("phase11 settings use signed-in copy", productSource.indexOf("CustomerSettingsCopy.accountLabel") !== -1);
	assert("phase11 customer HTML does not claim a global shortcut", visibleHtml.indexOf("system-wide") === -1);
	assert("phase11 customer catalog source is unchanged", panelSource.indexOf("terminal-registry.production.v2.json") !== -1);

	for (i = 0; i < forbiddenVisible.length; i++) {
		assert(
			"phase11 customer HTML has no visible " + forbiddenVisible[i],
			visibleLower.indexOf(forbiddenVisible[i]) === -1
		);
	}

	print("customer ui polish: " + ((passed + failed) - startCount) + " assertions");
}());
