var PickFXProduct = (function () {
	var POLL_MS = 2000;
	var AUTHORIZED_HOLD_MS = 1200;
	var csInterface = null;
	var pollTimer = null;
	var revalidateTimer = null;
	var pendingCode = null;
	var authorizeUrl = null;
	var signinUrl = null;
	var busy = false;
	var recordingShortcut = false;

	function el(id) {
		return document.getElementById(id);
	}

	function installationId() {
		return PanelEntitlement.getOrCreateInstallationId(csInterface);
	}

	function apiUrl(path) {
		return PanelEntitlement.apiBase() + path;
	}

	function hide(node) {
		if (node) {
			node.setAttribute("hidden", "hidden");
		}
	}

	function show(node) {
		if (node) {
			node.removeAttribute("hidden");
		}
	}

	function setText(id, value) {
		var node = el(id);
		if (node) {
			node.textContent = value == null ? "" : String(value);
		}
	}

	function currentPlatform() {
		if (typeof navigator === "undefined") {
			return "";
		}
		if (navigator.userAgentData && navigator.userAgentData.platform) {
			return navigator.userAgentData.platform;
		}
		return navigator.platform || navigator.userAgent || "";
	}

	function currentShortcutCombo() {
		if (typeof ShortcutStore !== "undefined" && ShortcutStore.load) {
			return ShortcutStore.load({ csInterface: csInterface });
		}
		if (typeof TerminalKeyboardShortcut !== "undefined" &&
				TerminalKeyboardShortcut.defaultLauncherCombo) {
			return TerminalKeyboardShortcut.defaultLauncherCombo();
		}
		return null;
	}

	function persistShortcut(combo) {
		var next;
		var event;
		if (typeof ShortcutStore === "undefined") {
			return combo;
		}
		next = ShortcutStore.save(combo, { csInterface: csInterface });
		if (typeof PickFXGlobalLauncher !== "undefined" && PickFXGlobalLauncher.sync) {
			PickFXGlobalLauncher.sync(csInterface, PanelEntitlement.currentRecord());
		}
		if (csInterface && typeof csInterface.dispatchEvent === "function") {
			try {
				event = typeof CSEvent === "function"
					? new CSEvent(ShortcutStore.CHANGED_EVENT, "APPLICATION")
					: { type: ShortcutStore.CHANGED_EVENT, scope: "APPLICATION" };
				event.data = JSON.stringify(next || {});
				csInterface.dispatchEvent(event);
			} catch (ignoreDispatch) {}
		}
		return next;
	}

	function setShortcutError(message) {
		var node = el("settings-shortcut-error");
		if (!node) {
			return;
		}
		if (message) {
			node.textContent = message;
			node.removeAttribute("hidden");
		} else {
			node.textContent = "";
			node.setAttribute("hidden", "hidden");
		}
	}

	function stopRecordingShortcut() {
		var button = el("settings-shortcut-record");
		recordingShortcut = false;
		if (button) {
			button.classList.remove("is-recording");
		}
		setText("settings-shortcut-hint", "Press a key combination to change");
	}

	function fillShortcutSettings() {
		var platform = currentPlatform();
		var combo = currentShortcutCombo();
		var recordBtn = el("settings-shortcut-record");
		setText("settings-shortcut-value", CustomerSettingsCopy.shortcutLabel(platform, combo));
		if (recordingShortcut) {
			setText("settings-shortcut-hint", "Press a key combination to change");
		} else {
			setText("settings-shortcut-hint", "Press a key combination to change");
		}
		if (recordBtn) {
			recordBtn.setAttribute("aria-pressed", recordingShortcut ? "true" : "false");
		}
	}

	function fillSettings(record) {
		var authNote = el("settings-auth-note");
		var authAction = el("settings-auth-action");
		setText("settings-account-email", CustomerSettingsCopy.accountLabel(record));
		setText("settings-plan-value", CustomerSettingsCopy.planLabel(record));
		setText("settings-status-value", CustomerSettingsCopy.statusLabel(record));
		var shortcutSection = el("settings-shortcut-section");
		if (CustomerSettingsCopy.showShortcutSection(record)) {
			show(shortcutSection);
			fillShortcutSettings();
		} else {
			hide(shortcutSection);
			stopRecordingShortcut();
		}
		setText("settings-about-title", CustomerSettingsCopy.aboutTitle());
		setText("settings-about-copy", CustomerSettingsCopy.aboutCopy());
		if (authNote) {
			authNote.textContent = CustomerSettingsCopy.authorizationNote(record);
		}
		if (CustomerSettingsCopy.showAuthorizationAction(record)) {
			show(authAction);
		} else {
			hide(authAction);
		}
	}

	function showSurface(name) {
		var terminal = document.querySelector(".command-bar");
		var screens = ["product-signin", "product-authorize", "product-authorized", "product-upgrade"];
		var i;
		for (i = 0; i < screens.length; i++) {
			hide(el(screens[i]));
		}
		if (name === "terminal") {
			if (terminal) {
				terminal.classList.remove("is-product-gated");
			}
			fillSettings(PanelEntitlement.currentRecord());
			return;
		}
		if (terminal) {
			terminal.classList.add("is-product-gated");
		}
		if (name === "signin") {
			show(el("product-signin"));
		} else if (name === "authorize") {
			setText("authorize-code", pendingCode || "————");
			show(el("product-authorize"));
		} else if (name === "authorized") {
			show(el("product-authorized"));
		} else if (name === "upgrade") {
			show(el("product-upgrade"));
		}
		fillSettings(PanelEntitlement.currentRecord());
	}

	function openSettings() {
		show(el("product-settings"));
		fillSettings(PanelEntitlement.currentRecord());
	}

	function closeSettings() {
		stopRecordingShortcut();
		hide(el("product-settings"));
	}

	function applyRecord(record, options) {
		var surface;
		if (record) {
			PanelEntitlement.saveCachedSession(record, null, csInterface);
		}
		if (typeof PickFXGlobalLauncher !== "undefined") {
			PickFXGlobalLauncher.sync(csInterface, record);
			PickFXGlobalLauncher.notifyEntitlement(csInterface, record);
		}
		surface = PanelEntitlement.resolveSurface(record, options);
		if (surface === "authorize" && !pendingCode) {
			startAuthorization();
		}
		if (surface === "signin" && !pendingCode) {
			startSignIn();
		}
		showSurface(surface);
		return surface;
	}

	function acceptSession(payload) {
		var record;
		if (!payload || !payload.session_token) {
			return null;
		}
		record = PanelEntitlement.recordFromServer(
			payload.session_token,
			payload,
			(payload.user && payload.user.email) || payload.email
		);
		if (payload.entitlement && payload.entitlement.state === "LIFETIME") {
			record = PanelEntitlement.recordFromServer(payload.session_token, {
				entitlement: payload.entitlement,
				authorized: true,
				productAccess: true,
				expires_at: payload.expires_at,
				email: (payload.user && payload.user.email) || payload.email,
				user: payload.user
			}, (payload.user && payload.user.email) || payload.email);
		}
		PanelEntitlement.saveCachedSession(record, null, csInterface);
		return record;
	}

	async function request(path, options) {
		var opts = options || {};
		var headers = { "Content-Type": "application/json" };
		var record = PanelEntitlement.currentRecord();
		if (opts.session !== false && record && record.sessionToken) {
			headers.Authorization = "Bearer " + record.sessionToken;
		}
		if (opts.headers) {
			Object.keys(opts.headers).forEach(function (key) {
				headers[key] = opts.headers[key];
			});
		}
		var res = await fetch(apiUrl(path), {
			method: opts.method || "GET",
			headers: headers,
			body: opts.body ? JSON.stringify(opts.body) : undefined
		});
		var body = {};
		try {
			body = await res.json();
		} catch (ignoreJson) {}
		return { ok: res.ok, status: res.status, body: body };
	}

	async function startSignIn() {
		var result;
		try {
			result = await request("/api/panel/session/signin", {
				method: "POST",
				session: false,
				body: { installation_id: installationId() }
			});
			if (result.ok && result.body && result.body.code) {
				pendingCode = result.body.code;
				signinUrl = result.body.signin_url;
				authorizeUrl = signinUrl;
				return result.body;
			}
		} catch (ignoreStart) {}
		return null;
	}

	async function startAuthorization() {
		var current = PanelEntitlement.currentRecord();
		if (current && current.state === "LIFETIME") {
			return startSignIn();
		}
		var result;
		try {
			result = await request("/api/panel/session/start", {
				method: "POST",
				session: false,
				body: { installation_id: installationId() }
			});
			if (result.ok && result.body && result.body.code) {
				pendingCode = result.body.code;
				authorizeUrl = result.body.authorize_url;
				setText("authorize-code", pendingCode);
				return result.body;
			}
		} catch (ignoreStart) {}
		return null;
	}

	function openAuthorizePage() {
		var url = signinUrl || authorizeUrl;
		if (!url && pendingCode) {
			url = PanelEntitlement.apiBase() + "/authorize-panel?code=" + encodeURIComponent(pendingCode);
		}
		if (!url) {
			return;
		}
		if (csInterface && typeof csInterface.openURLInDefaultBrowser === "function") {
			csInterface.openURLInDefaultBrowser(url);
			return;
		}
		if (typeof cep !== "undefined" && cep.util && cep.util.openURLInDefaultBrowser) {
			cep.util.openURLInDefaultBrowser(url);
			return;
		}
		if (typeof window !== "undefined") {
			window.open(url, "_blank");
		}
	}

	async function claimPending() {
		var result;
		var record;
		if (!pendingCode || busy) {
			return;
		}
		try {
			result = await request("/api/panel/session/claim", {
				method: "POST",
				session: false,
				body: {
					code: pendingCode,
					installation_id: installationId()
				}
			});
		} catch (ignoreClaim) {
			return;
		}
		if (!result || !result.body) {
			return;
		}
		if (result.body.session_token) {
			record = acceptSession(result.body);
			stopPolling();
			pendingCode = null;
			signinUrl = null;
			if (record && record.state === "LIFETIME") {
				applyRecord(record);
				return;
			}
			showSurface("authorized");
			setTimeout(function () {
				applyRecord(record);
			}, AUTHORIZED_HOLD_MS);
			return;
		}
		if (result.body.needs_authorization) {
			stopPolling();
			pendingCode = null;
			signinUrl = null;
			showSurface("authorize");
			startAuthorization();
			startPolling();
			return;
		}
		if (result.body.pending === false && result.body.entitlement) {
			stopPolling();
			pendingCode = null;
			PanelEntitlement.setCurrent({
				state: result.body.entitlement.state,
				plan: result.body.entitlement.plan,
				productAccess: false,
				authorized: false
			});
			showSurface("upgrade");
		}
	}

	function stopPolling() {
		if (pollTimer) {
			clearInterval(pollTimer);
			pollTimer = null;
		}
	}

	function startPolling() {
		stopPolling();
		pollTimer = setInterval(function () {
			claimPending();
		}, POLL_MS);
	}

	async function revalidate() {
		var cached = PanelEntitlement.currentRecord() || PanelEntitlement.loadCachedSession(null, csInterface);
		var result;
		if (!cached || !cached.sessionToken) {
			return applyRecord(null);
		}
		try {
			result = await request(
				"/api/panel/entitlement?installation_id=" + encodeURIComponent(installationId())
			);
			if (result.ok && result.body && result.body.entitlement) {
				applyRecord(PanelEntitlement.recordFromServer(
					cached.sessionToken,
					result.body,
					(result.body.user && result.body.user.email) || result.body.email || cached.email
				));
				return;
			}
			if (result.status === 401 || result.status === 403) {
				PanelEntitlement.clearCachedSession(null, csInterface);
				pendingCode = null;
				applyRecord(null);
				return;
			}
			applyRecord(cached, { transientFailure: true });
		} catch (ignoreNet) {
			applyRecord(cached, { transientFailure: true });
		}
	}

	async function signOut() {
		var cached = PanelEntitlement.currentRecord();
		try {
			if (cached && cached.sessionToken) {
				await request("/api/panel/sign-out", { method: "POST" });
			}
		} catch (ignoreOut) {}
		PanelEntitlement.clearCachedSession(null, csInterface);
		if (typeof PickFXGlobalLauncher !== "undefined") {
			PickFXGlobalLauncher.sync(csInterface, null);
			PickFXGlobalLauncher.notifyEntitlement(csInterface, null);
		}
		pendingCode = null;
		signinUrl = null;
		closeSettings();
		await startSignIn();
		startPolling();
		showSurface("signin");
	}

	function showAccessInactive() {
		showSurface("upgrade");
	}

	function shortcutErrorMessage(reason) {
		if (reason === "MODIFIER_ONLY" || reason === "EMPTY") {
			return "That shortcut isn’t valid.";
		}
		if (reason === "NEEDS_MODIFIER") {
			return "Add a modifier key, such as Shift or ⌘.";
		}
		if (reason === "RESERVED") {
			return "That key is reserved.";
		}
		if (reason === "CONFLICT_PANEL_FOCUS") {
			return "That shortcut is already used to focus PickFX.";
		}
		return "Couldn’t save that shortcut.";
	}

	function handleShortcutRecordEvent(event) {
		var combo;
		var validated;
		if (!recordingShortcut) {
			return false;
		}
		if (event.preventDefault) {
			event.preventDefault();
		}
		if (event.stopPropagation) {
			event.stopPropagation();
		}
		if (typeof TerminalKeyboardShortcut !== "undefined" &&
				TerminalKeyboardShortcut.isEscape(event)) {
			stopRecordingShortcut();
			setShortcutError("");
			fillShortcutSettings();
			return true;
		}
		combo = TerminalKeyboardShortcut.fromEvent(event);
		validated = TerminalKeyboardShortcut.validateCombo(combo, currentPlatform());
		if (!validated.ok) {
			setShortcutError(shortcutErrorMessage(validated.reason));
			return true;
		}
		persistShortcut(validated.combo);
		stopRecordingShortcut();
		setShortcutError("");
		fillShortcutSettings();
		return true;
	}

	function bind() {
		var authorizeBtn = el("authorize-panel-btn");
		var signinBtn = el("signin-panel-btn");
		var upgradeBtn = el("upgrade-plan-btn");
		var settingsClose = el("settings-close-btn");
		var signOutBtn = el("settings-signout-btn");
		var authAction = el("settings-auth-action");
		var recordBtn = el("settings-shortcut-record");
		var resetBtn = el("settings-shortcut-reset");
		var clearBtn = el("settings-shortcut-clear");
		if (authorizeBtn) {
			authorizeBtn.addEventListener("click", function () {
				openAuthorizePage();
				startPolling();
			});
		}
		if (signinBtn) {
			signinBtn.addEventListener("click", function () {
				openAuthorizePage();
				startPolling();
			});
		}
		if (upgradeBtn) {
			upgradeBtn.addEventListener("click", function () {
				var url = PanelEntitlement.apiBase() + "/#pricing";
				if (csInterface && typeof csInterface.openURLInDefaultBrowser === "function") {
					csInterface.openURLInDefaultBrowser(url);
				} else if (typeof window !== "undefined") {
					window.open(url, "_blank");
				}
			});
		}
		if (settingsClose) {
			settingsClose.addEventListener("click", closeSettings);
		}
		if (signOutBtn) {
			signOutBtn.addEventListener("click", function () {
				signOut();
			});
		}
		if (authAction) {
			authAction.addEventListener("click", function () {
				closeSettings();
				showSurface("authorize");
				openAuthorizePage();
				startPolling();
			});
		}
		if (recordBtn) {
			recordBtn.addEventListener("click", function () {
				recordingShortcut = !recordingShortcut;
				if (recordingShortcut) {
					recordBtn.classList.add("is-recording");
					setText("settings-shortcut-hint", "Press a key combination to change");
					setShortcutError("");
				} else {
					stopRecordingShortcut();
				}
			});
		}
		if (resetBtn) {
			resetBtn.addEventListener("click", function () {
				if (typeof ShortcutStore !== "undefined") {
					persistShortcut(ShortcutStore.defaultCombo());
				}
				stopRecordingShortcut();
				setShortcutError("");
				fillShortcutSettings();
			});
		}
		if (clearBtn) {
			clearBtn.addEventListener("click", function () {
				if (typeof ShortcutStore !== "undefined") {
					persistShortcut(ShortcutStore.disabledCombo
						? ShortcutStore.disabledCombo()
						: ShortcutStore.clear({ csInterface: csInterface }));
				}
				stopRecordingShortcut();
				setShortcutError("");
				fillShortcutSettings();
			});
		}
	}

	function scheduleRevalidation() {
		if (revalidateTimer) {
			clearInterval(revalidateTimer);
		}
		revalidateTimer = setInterval(function () {
			var record = PanelEntitlement.currentRecord();
			if (record && record.sessionToken && PanelEntitlement.needsRevalidation(record)) {
				revalidate();
			}
		}, 60 * 1000);
	}

	async function boot(hostInterface) {
		var cached;
		csInterface = hostInterface || (typeof CSInterface !== "undefined" ? new CSInterface() : null);
		PanelEntitlement.activateCustomerGate();
		bind();
		installationId();
		cached = PanelEntitlement.loadCachedSession(null, csInterface);
		if (cached) {
			PanelEntitlement.setCurrent(cached);
		}
		await revalidate();
		if (PanelEntitlement.resolveSurface(PanelEntitlement.currentRecord()) !== "terminal") {
			startPolling();
		}
		scheduleRevalidation();
	}

	return {
		boot: boot,
		openSettings: openSettings,
		closeSettings: closeSettings,
		showAccessInactive: showAccessInactive,
		showSurface: showSurface,
		revalidate: revalidate,
		signOut: signOut,
		isRecordingShortcut: function () {
			return recordingShortcut === true;
		},
		handleShortcutRecordEvent: handleShortcutRecordEvent
	};
}());
