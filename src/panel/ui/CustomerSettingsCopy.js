var CustomerSettingsCopy = (function () {
	function hasSession(record) {
		return !!(record && record.sessionToken);
	}

	function isSignedIn(record) {
		if (!record) {
			return false;
		}
		if (hasSession(record)) {
			return true;
		}
		if (record.email) {
			return true;
		}
		if (record.state === "LIFETIME" && record.productAccess === true) {
			return true;
		}
		if (record.state === "MONTHLY_ACTIVE" &&
				(record.authorized === true || record.productAccess === true)) {
			return true;
		}
		return false;
	}

	function accountLabel(record) {
		var email;
		if (!isSignedIn(record)) {
			return "Not signed in";
		}
		email = record && record.email ? String(record.email).replace(/^\s+|\s+$/g, "") : "";
		if (email) {
			return "Signed in as " + email;
		}
		return "Signed in";
	}

	function planLabel(record) {
		if (!record || !record.plan) {
			if (record && record.state === "LIFETIME") {
				return "Lifetime";
			}
			if (record && record.state === "MONTHLY_ACTIVE") {
				return "Monthly";
			}
			return "None";
		}
		if (record.plan === "lifetime" || record.state === "LIFETIME") {
			return "Lifetime";
		}
		if (record.plan === "monthly" || record.state === "MONTHLY_ACTIVE") {
			return "Monthly";
		}
		return record.plan;
	}

	function statusLabel(record) {
		if (!record || !isSignedIn(record)) {
			return "Signed out";
		}
		if (record.state === "LIFETIME" && record.productAccess) {
			return "Active";
		}
		if (record.state === "MONTHLY_ACTIVE" && record.productAccess && record.authorized) {
			return "Active";
		}
		if (record.state === "MONTHLY_ACTIVE") {
			return "Authorization required";
		}
		if (record.state === "LOCKED") {
			return "Inactive";
		}
		return "Inactive";
	}

	function authorizationNote(record) {
		if (record && record.state === "LIFETIME") {
			return "No authorization required for Lifetime.";
		}
		if (record && record.state === "MONTHLY_ACTIVE" && record.authorized) {
			return "This panel is authorized.";
		}
		if (record && record.state === "MONTHLY_ACTIVE") {
			return "Authorize this panel";
		}
		return "Sign in with an active PickFX plan.";
	}

	function showAuthorizationAction(record) {
		return !!(record && record.state === "MONTHLY_ACTIVE" && !record.authorized);
	}

	function shortcutLabel(platform, combo) {
		if (typeof TerminalKeyboardShortcut !== "undefined" &&
				TerminalKeyboardShortcut.launcherShortcutLabel) {
			return TerminalKeyboardShortcut.launcherShortcutLabel(platform, combo);
		}
		return "⇧ P";
	}

	function shortcutHint() {
		if (typeof TerminalKeyboardShortcut !== "undefined" &&
				TerminalKeyboardShortcut.launcherShortcutHint) {
			return TerminalKeyboardShortcut.launcherShortcutHint();
		}
		return "Open PickFX";
	}

	function showShortcutSection(record) {
		if (!isSignedIn(record)) {
			return false;
		}
		if (typeof PanelEntitlement !== "undefined" &&
				typeof PanelEntitlement.globalLauncherEnabled === "function") {
			return PanelEntitlement.globalLauncherEnabled(record);
		}
		return !!(record && record.state === "LIFETIME" && record.productAccess === true);
	}

	function aboutTitle() {
		return "PickFX 2.5";
	}

	function aboutCopy() {
		return "Fast effect control for Premiere Pro.";
	}

	return {
		isSignedIn: isSignedIn,
		accountLabel: accountLabel,
		planLabel: planLabel,
		statusLabel: statusLabel,
		authorizationNote: authorizationNote,
		showAuthorizationAction: showAuthorizationAction,
		shortcutLabel: shortcutLabel,
		shortcutHint: shortcutHint,
		showShortcutSection: showShortcutSection,
		aboutTitle: aboutTitle,
		aboutCopy: aboutCopy
	};
}());

if (typeof module !== "undefined" && module.exports) {
	module.exports = CustomerSettingsCopy;
}
