var PanelEntitlement = (function () {
	var STATES = {
		FREE: "FREE",
		MONTHLY_ACTIVE: "MONTHLY_ACTIVE",
		LIFETIME: "LIFETIME",
		LOCKED: "LOCKED"
	};
	var SESSION_KEY = "pickfx.panelSession";
	var INSTALL_KEY = "pickfx.installationId";
	var APP_URL_KEY = "pickfx.appUrl";
	var PRODUCTION_APP_URL = "https://pickfx.vercel.app";
	var SESSION_TTL_MS = 12 * 60 * 60 * 1000;
	var REVALIDATE_MS = 15 * 60 * 1000;
	var STALE_GRACE_MS = 6 * 60 * 60 * 1000;
	var CODE_TTL_MS = 10 * 60 * 1000;
	var customerGateActive = false;
	var current = null;

	function productAccessAllowed(state) {
		return state === STATES.LIFETIME || state === STATES.MONTHLY_ACTIVE;
	}

	function canUseStaleCache(record, now) {
		now = now || Date.now();
		if (!record || !record.sessionToken || !record.verifiedAt) {
			return false;
		}
		if (!productAccessAllowed(record.state) || record.productAccess !== true) {
			return false;
		}
		var age = now - Number(record.verifiedAt);
		return age >= 0 && age <= STALE_GRACE_MS;
	}

	function needsRevalidation(record, now) {
		now = now || Date.now();
		if (!record || !record.verifiedAt) {
			return true;
		}
		return now - Number(record.verifiedAt) >= REVALIDATE_MS;
	}

	function sessionStillValid(record, now) {
		now = now || Date.now();
		if (!record || !record.sessionToken) {
			return false;
		}
		if (record.expiresAt && new Date(record.expiresAt).getTime() <= now) {
			return false;
		}
		return now - Number(record.verifiedAt || 0) <= SESSION_TTL_MS;
	}

	function productSessionActive(record, now) {
		var trusted = trustedRecord(record);
		if (!trusted) {
			return false;
		}
		if (!sessionStillValid(trusted, now)) {
			return false;
		}
		if (trusted.productAccess !== true) {
			return false;
		}
		if (trusted.state === STATES.LIFETIME) {
			return true;
		}
		return trusted.state === STATES.MONTHLY_ACTIVE && trusted.authorized === true;
	}

	function globalLauncherEnabled(record, now) {
		var trusted;
		if (!productSessionActive(record, now)) {
			return false;
		}
		trusted = trustedRecord(record);
		return !!(trusted && trusted.state === STATES.LIFETIME);
	}

	function paletteHelperEnabled(record, now) {
		return productSessionActive(record, now);
	}

	function trustedRecord(raw) {
		if (!raw || typeof raw !== "object") {
			return null;
		}
		if (!raw.sessionToken) {
			return null;
		}
		return {
			sessionToken: String(raw.sessionToken),
			verifiedAt: Number(raw.verifiedAt) || 0,
			state: raw.state || null,
			authorized: raw.authorized === true,
			productAccess: raw.productAccess === true,
			plan: raw.plan || null,
			email: raw.email || null,
			expiresAt: raw.expiresAt || null,
			requiresPanelAuthorization: raw.requiresPanelAuthorization === true
		};
	}

	function resolveSurface(record, options) {
		var transient = options && options.transientFailure === true;
		if (transient && canUseStaleCache(record)) {
			return record.productAccess ? "terminal" : surfaceFromRecord(record);
		}
		if (!record || !record.sessionToken) {
			if (record && record.state === STATES.MONTHLY_ACTIVE &&
					record.requiresPanelAuthorization && !record.authorized) {
				return "authorize";
			}
			return "signin";
		}
		return surfaceFromRecord(record);
	}

	function surfaceFromRecord(record) {
		if (!record) {
			return "signin";
		}
		if (record.state === STATES.LIFETIME && record.productAccess === true) {
			return "terminal";
		}
		if (record.state === STATES.MONTHLY_ACTIVE &&
				record.productAccess === true &&
				record.authorized === true) {
			return "terminal";
		}
		if (record.state === STATES.MONTHLY_ACTIVE) {
			return "authorize";
		}
		if (record.state === STATES.FREE || record.state === STATES.LOCKED) {
			return "upgrade";
		}
		return "signin";
	}

	function readStorage(storage, key) {
		try {
			if (storage && typeof storage.getItem === "function") {
				return storage.getItem(key);
			}
		} catch (ignoreRead) {}
		return null;
	}

	function writeStorage(storage, key, value) {
		try {
			if (storage && typeof storage.setItem === "function") {
				if (value === null) {
					storage.removeItem(key);
					return;
				}
				storage.setItem(key, value);
			}
		} catch (ignoreWrite) {}
	}

	function sessionFilePath(csInterface) {
		var root;
		if (!csInterface || typeof csInterface.getSystemPath !== "function") {
			return "";
		}
		try {
			root = csInterface.getSystemPath(SystemPath.USER_DATA);
			return String(root || "").replace(/\\/g, "/") + "/PickFX/panel-session.json";
		} catch (ignorePath) {
			return "";
		}
	}

	function readSessionFile(csInterface) {
		var filePath = sessionFilePath(csInterface);
		var result;
		if (!filePath || typeof window === "undefined" || !window.cep || !window.cep.fs) {
			return null;
		}
		try {
			result = window.cep.fs.readFile(filePath);
			if (result && result.data) {
				return trustedRecord(JSON.parse(result.data));
			}
		} catch (ignoreFile) {}
		return null;
	}

	function writeSessionFile(csInterface, record) {
		var filePath = sessionFilePath(csInterface);
		var dir;
		if (!filePath || typeof window === "undefined" || !window.cep || !window.cep.fs) {
			return;
		}
		dir = filePath.replace(/\/panel-session\.json$/, "");
		try {
			window.cep.fs.makedir(dir);
			if (!record) {
				window.cep.fs.deleteFile(filePath);
				return;
			}
			window.cep.fs.writeFile(filePath, JSON.stringify(record));
		} catch (ignoreWrite) {}
	}

	function loadCachedSession(storage, csInterface) {
		var fromFile = readSessionFile(csInterface);
		var raw;
		if (fromFile) {
			current = fromFile;
			writeStorage(storage || (typeof localStorage !== "undefined" ? localStorage : null), SESSION_KEY, JSON.stringify(fromFile));
			return fromFile;
		}
		raw = readStorage(storage || (typeof localStorage !== "undefined" ? localStorage : null), SESSION_KEY);
		if (!raw) {
			return null;
		}
		try {
			return trustedRecord(JSON.parse(raw));
		} catch (ignoreParse) {
			return null;
		}
	}

	function saveCachedSession(record, storage, csInterface) {
		storage = storage || (typeof localStorage !== "undefined" ? localStorage : null);
		current = trustedRecord(record);
		if (!current) {
			writeStorage(storage, SESSION_KEY, null);
			writeSessionFile(csInterface, null);
			return null;
		}
		writeStorage(storage, SESSION_KEY, JSON.stringify(current));
		writeSessionFile(csInterface, current);
		return current;
	}

	function clearCachedSession(storage, csInterface) {
		current = null;
		writeStorage(storage || (typeof localStorage !== "undefined" ? localStorage : null), SESSION_KEY, null);
		writeSessionFile(csInterface, null);
	}

	function randomInstallationId() {
		var bytes;
		var hex = "";
		var i;
		if (typeof crypto !== "undefined" && crypto.getRandomValues) {
			bytes = new Uint8Array(16);
			crypto.getRandomValues(bytes);
			for (i = 0; i < bytes.length; i++) {
				hex += (bytes[i] < 16 ? "0" : "") + bytes[i].toString(16);
			}
			return hex;
		}
		for (i = 0; i < 32; i++) {
			hex += "0123456789abcdef".charAt(Math.floor(Math.random() * 16));
		}
		return hex;
	}

	function installationFilePath(csInterface) {
		var root;
		if (!csInterface || typeof csInterface.getSystemPath !== "function") {
			return "";
		}
		try {
			root = csInterface.getSystemPath(SystemPath.USER_DATA);
			return String(root || "").replace(/\\/g, "/") + "/PickFX/installation.json";
		} catch (ignorePath) {
			return "";
		}
	}

	function readInstallationFile(csInterface) {
		var filePath = installationFilePath(csInterface);
		var result;
		if (!filePath || typeof window === "undefined" || !window.cep || !window.cep.fs) {
			return "";
		}
		try {
			result = window.cep.fs.readFile(filePath);
			if (result && result.data) {
				return String(JSON.parse(result.data).installationId || "");
			}
		} catch (ignoreFile) {}
		return "";
	}

	function writeInstallationFile(csInterface, id) {
		var filePath = installationFilePath(csInterface);
		var dir;
		if (!filePath || typeof window === "undefined" || !window.cep || !window.cep.fs) {
			return;
		}
		dir = filePath.replace(/\/installation\.json$/, "");
		try {
			window.cep.fs.makedir(dir);
			window.cep.fs.writeFile(filePath, JSON.stringify({
				installationId: id,
				createdAt: new Date().toISOString()
			}));
		} catch (ignoreWrite) {}
	}

	function getOrCreateInstallationId(csInterface, storage) {
		var stored;
		var fromFile;
		storage = storage || (typeof localStorage !== "undefined" ? localStorage : null);
		fromFile = readInstallationFile(csInterface);
		if (/^[a-f0-9]{32}$/i.test(fromFile)) {
			writeStorage(storage, INSTALL_KEY, fromFile.toLowerCase());
			return fromFile.toLowerCase();
		}
		stored = readStorage(storage, INSTALL_KEY);
		if (/^[a-f0-9]{32}$/i.test(stored)) {
			writeInstallationFile(csInterface, stored.toLowerCase());
			return stored.toLowerCase();
		}
		stored = randomInstallationId();
		writeStorage(storage, INSTALL_KEY, stored);
		writeInstallationFile(csInterface, stored);
		return stored;
	}

	function apiBase(storage) {
		var stored;
		if (typeof window !== "undefined" && window.__PICKFX_APP_URL__) {
			return String(window.__PICKFX_APP_URL__).replace(/\/+$/, "");
		}
		stored = readStorage(storage || (typeof localStorage !== "undefined" ? localStorage : null), APP_URL_KEY);
		if (stored && /^https?:\/\//i.test(stored) && stored.indexOf("://") !== -1) {
			return String(stored).replace(/\/+$/, "");
		}
		return PRODUCTION_APP_URL;
	}

	function rememberAppUrl(url, storage) {
		if (!url || !/^https?:\/\//i.test(url)) {
			return;
		}
		writeStorage(storage || (typeof localStorage !== "undefined" ? localStorage : null), APP_URL_KEY, String(url).replace(/\/+$/, ""));
	}

	function firstEmail() {
		var i;
		var value;
		for (i = 0; i < arguments.length; i++) {
			value = arguments[i];
			if (value && typeof value === "string" && value.replace(/^\s+|\s+$/g, "")) {
				return String(value).replace(/^\s+|\s+$/g, "");
			}
		}
		return null;
	}

	function recordFromServer(sessionToken, payload, email) {
		var entitlement = payload && payload.entitlement ? payload.entitlement : payload;
		if (!entitlement) {
			return null;
		}
		return trustedRecord({
			sessionToken: sessionToken,
			verifiedAt: Date.now(),
			state: entitlement.state,
			authorized: entitlement.state === STATES.LIFETIME ||
				payload.authorized === true ||
				payload.ok === true,
			productAccess: payload.productAccess === true ||
				(productAccessAllowed(entitlement.state) &&
					(entitlement.state === STATES.LIFETIME ||
						payload.authorized === true ||
						payload.ok === true)),
			plan: entitlement.plan,
			email: firstEmail(
				payload && payload.user && payload.user.email,
				payload && payload.email,
				email
			),
			expiresAt: payload.session && payload.session.expires_at
				? payload.session.expires_at
				: payload.expires_at,
			requiresPanelAuthorization: entitlement.requiresPanelAuthorization === true
		});
	}

	function activateCustomerGate() {
		customerGateActive = true;
	}

	function isCustomerGateActive() {
		return customerGateActive === true;
	}

	function currentState() {
		return current && current.state ? current.state : null;
	}

	function productAccess() {
		if (!customerGateActive) {
			return true;
		}
		return !!(current && current.productAccess === true && productAccessAllowed(current.state));
	}

	function currentRecord() {
		return current;
	}

	function setCurrent(record) {
		current = trustedRecord(record);
		return current;
	}

	return {
		STATES: STATES,
		SESSION_KEY: SESSION_KEY,
		INSTALL_KEY: INSTALL_KEY,
		SESSION_TTL_MS: SESSION_TTL_MS,
		REVALIDATE_MS: REVALIDATE_MS,
		STALE_GRACE_MS: STALE_GRACE_MS,
		CODE_TTL_MS: CODE_TTL_MS,
		PRODUCTION_APP_URL: PRODUCTION_APP_URL,
		productAccessAllowed: productAccessAllowed,
		canUseStaleCache: canUseStaleCache,
		needsRevalidation: needsRevalidation,
		sessionStillValid: sessionStillValid,
		globalLauncherEnabled: globalLauncherEnabled,
		paletteHelperEnabled: paletteHelperEnabled,
		trustedRecord: trustedRecord,
		resolveSurface: resolveSurface,
		loadCachedSession: loadCachedSession,
		saveCachedSession: saveCachedSession,
		clearCachedSession: clearCachedSession,
		randomInstallationId: randomInstallationId,
		getOrCreateInstallationId: getOrCreateInstallationId,
		apiBase: apiBase,
		rememberAppUrl: rememberAppUrl,
		recordFromServer: recordFromServer,
		activateCustomerGate: activateCustomerGate,
		isCustomerGateActive: isCustomerGateActive,
		currentState: currentState,
		productAccess: productAccess,
		currentRecord: currentRecord,
		setCurrent: setCurrent
	};
}());

if (typeof module !== "undefined" && module.exports) {
	module.exports = PanelEntitlement;
}
