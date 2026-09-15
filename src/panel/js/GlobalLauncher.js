var PickFXGlobalLauncher = (function () {
	var EXTENSION_ID = "com.pickfx.launcher";
	var EXTENSION_ID_ALT = "com.pickfx.launcher.alt";
	var LAUNCHER_IDS = [EXTENSION_ID, EXTENSION_ID_ALT];
	var PANEL_ID = "com.pickfx.panel";
	var BOOTSTRAP_ID = "com.pickfx.bootstrap";
	var OPEN_FROM_PANEL_EVENT = "com.pickfx.launcher.openFromPanel";
	var FOCUS_EVENT = "com.pickfx.launcher.focus";
	var CLOSE_EVENT = "com.pickfx.launcher.close";
	var CLOSED_EVENT = "com.pickfx.launcher.closed";
	var BOOT_EVENT = "com.pickfx.launcher.boot";
	var ENTITLEMENT_CHANGED = "com.pickfx.entitlement.changed";
	var lastStatus = {
		ok: false,
		registered: false,
		osGlobal: false,
		scope: "PREMIERE_FOREGROUND_CEP"
	};
	var reopenTimerIds = [];
	var reopenDelaysMs = [120, 400, 800];
	var currentLauncherId = EXTENSION_ID;
	var lastClosedId = "";
	var closedListenerAttached = false;
	var hasOpenedLauncher = false;

	function currentPlatform() {
		if (typeof navigator === "undefined") {
			return "";
		}
		if (navigator.userAgentData && navigator.userAgentData.platform) {
			return navigator.userAgentData.platform;
		}
		return navigator.platform || navigator.userAgent || "";
	}

	function enabled(record) {
		return typeof PanelEntitlement !== "undefined" &&
			typeof PanelEntitlement.globalLauncherEnabled === "function" &&
			PanelEntitlement.globalLauncherEnabled(record || PanelEntitlement.currentRecord());
	}

	function describeLifecycle() {
		return {
			bootstrapId: BOOTSTRAP_ID,
			launcherId: EXTENSION_ID,
			owner: BOOTSTRAP_ID,
			type: "Custom",
			autoVisible: false,
			startOn: [
				"applicationActivate",
				"com.adobe.csxs.events.ApplicationActivate"
			],
			independentOfPanel: true,
			panelRequired: false,
			osGlobal: false,
			scope: "PREMIERE_FOREGROUND_CEP"
		};
	}

	function parseBootstrapDispatch(xml) {
		var parts = String(xml || "").split('<Extension Id="com.pickfx.bootstrap">');
		var block = parts.length ? parts[parts.length - 1] : "";
		var end = block.indexOf("</Extension>");
		if (end !== -1) {
			block = block.slice(0, end);
		}
		return {
			type: /<Type>([^<]+)<\/Type>/.test(block) ? RegExp.$1 : "",
			autoVisible: /<AutoVisible>([^<]+)<\/AutoVisible>/.test(block)
				? RegExp.$1 === "true"
				: null,
			hasMenu: /<Menu>/.test(block),
			startOn: {
				applicationActivate: block.indexOf("<Event>applicationActivate</Event>") !== -1,
				premiereActivate: block.indexOf(
					"<Event>com.adobe.csxs.events.ApplicationActivate</Event>"
				) !== -1
			}
		};
	}

	function dispatchAppEvent(csInterface, type, data) {
		var event;
		if (!csInterface || typeof csInterface.dispatchEvent !== "function") {
			return false;
		}
		try {
			event = typeof CSEvent === "function"
				? new CSEvent(type, "APPLICATION")
				: { type: type, scope: "APPLICATION" };
			event.data = typeof data === "string" ? data : JSON.stringify(data || {});
			csInterface.dispatchEvent(event);
			return true;
		} catch (ignoreDispatch) {
			return false;
		}
	}

	function closedSlotPath(csInterface) {
		var root;
		if (!csInterface || typeof csInterface.getSystemPath !== "function" || typeof SystemPath === "undefined") {
			return "";
		}
		try {
			root = String(csInterface.getSystemPath(SystemPath.USER_DATA) || "");
		} catch (ignorePath) {
			return "";
		}
		if (root.indexOf("file://") === 0) {
			root = root.substring(7);
			try {
				root = decodeURI(root);
			} catch (ignoreDecode) {}
		}
		return root.replace(/\\/g, "/").replace(/\/+$/, "") + "/PickFX/launcher-slot.json";
	}

	function writeClosedSlot(csInterface, extensionId) {
		var filePath = closedSlotPath(csInterface);
		var dir;
		if (!filePath || typeof window === "undefined" || !window.cep || !window.cep.fs) {
			return;
		}
		dir = filePath.replace(/\/launcher-slot\.json$/, "");
		try {
			window.cep.fs.makedir(dir);
			window.cep.fs.writeFile(filePath, JSON.stringify({ extensionId: extensionId }));
		} catch (ignoreWrite) {}
	}

	function readClosedSlot(csInterface) {
		var filePath = closedSlotPath(csInterface);
		var result;
		var parsed;
		if (!filePath || typeof window === "undefined" || !window.cep || !window.cep.fs) {
			return "";
		}
		try {
			result = window.cep.fs.readFile(filePath);
			if (result && result.data) {
				parsed = typeof result.data === "string" ? JSON.parse(result.data) : result.data;
				return parsed && parsed.extensionId ? String(parsed.extensionId) : "";
			}
		} catch (ignoreRead) {}
		return "";
	}

	function clearClosedSlot(csInterface) {
		var filePath = closedSlotPath(csInterface);
		if (!filePath || typeof window === "undefined" || !window.cep || !window.cep.fs) {
			return;
		}
		try {
			window.cep.fs.deleteFile(filePath);
		} catch (ignoreDelete) {}
	}

	function notifyEntitlement(csInterface, record) {
		var allow = enabled(record);
		dispatchAppEvent(csInterface, ENTITLEMENT_CHANGED, {
			globalLauncherEnabled: allow
		});
		if (!allow) {
			requestClose(csInterface);
		}
		return allow;
	}

	function requestClose(csInterface) {
		lastStatus.lastClose = {
			ok: dispatchAppEvent(csInterface, CLOSE_EVENT, { reason: "LAUNCHER_DISABLED" }),
			reason: "LAUNCHER_DISABLED"
		};
		return lastStatus.lastClose;
	}

	function currentCombo(csInterface) {
		if (typeof ShortcutStore !== "undefined" && ShortcutStore.load) {
			return ShortcutStore.load({ csInterface: csInterface });
		}
		if (typeof TerminalKeyboardShortcut !== "undefined" &&
				TerminalKeyboardShortcut.defaultLauncherCombo) {
			return TerminalKeyboardShortcut.defaultLauncherCombo();
		}
		return null;
	}

	function sync(csInterface, record) {
		var allow = enabled(record);
		if (typeof TerminalKeyboardShortcut === "undefined" ||
				typeof TerminalKeyboardShortcut.register !== "function") {
			lastStatus = {
				ok: false,
				registered: false,
				reason: "SHORTCUT_MODULE_UNAVAILABLE",
				osGlobal: false,
				scope: "PREMIERE_FOREGROUND_CEP"
			};
			return lastStatus;
		}
		lastStatus = TerminalKeyboardShortcut.register(csInterface, {
			panelFocus: true,
			palette: true,
			launcher: false,
			combo: currentCombo(csInterface),
			source: "GlobalLauncher.sync"
		});
		lastStatus.registered = lastStatus.ok === true;
		lastStatus.launcherEnabled = allow;
		lastStatus.osGlobal = false;
		lastStatus.panelOpensLauncher = false;
		lastStatus.owner = BOOTSTRAP_ID;
		notifyEntitlement(csInterface, record);
		return lastStatus;
	}

	function describeRaw(value) {
		if (value === undefined) {
			return "undefined";
		}
		if (value === null) {
			return "null";
		}
		if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
			return String(value);
		}
		try {
			return JSON.stringify(value);
		} catch (ignoreJson) {
			return String(value);
		}
	}

	function syncBootstrap(csInterface, record) {
		var allow = enabled(record);
		var registerLauncher = allow || !record;
		attachClosedListener(csInterface);
		if (typeof TerminalKeyboardShortcut === "undefined" ||
				typeof TerminalKeyboardShortcut.register !== "function") {
			lastStatus = {
				ok: false,
				registered: false,
				reason: "SHORTCUT_MODULE_UNAVAILABLE",
				osGlobal: false,
				scope: "PREMIERE_FOREGROUND_CEP"
			};
			return lastStatus;
		}
		lastStatus = TerminalKeyboardShortcut.register(csInterface, {
			panelFocus: false,
			palette: false,
			launcher: registerLauncher,
			combo: currentCombo(csInterface),
			source: "GlobalLauncher.syncBootstrap"
		});
		lastStatus.registered = !!(lastStatus.ok && registerLauncher);
		lastStatus.osGlobal = false;
		lastStatus.panelRequired = false;
		lastStatus.panelOpensLauncher = false;
		lastStatus.bootstrapId = BOOTSTRAP_ID;
		lastStatus.owner = BOOTSTRAP_ID;
		lastStatus.recordPresent = !!record;
		lastStatus.launcherEnabled = allow;
		lastStatus.currentLauncherId = currentLauncherId;
		lastStatus.lastClosedId = lastClosedId;
		if (record && !allow) {
			requestClose(csInterface);
		}
		return lastStatus;
	}

	function dispatchFocus(csInterface) {
		return dispatchAppEvent(csInterface, FOCUS_EVENT, "focus");
	}

	function clearReopenTimers() {
		var i;
		for (i = 0; i < reopenTimerIds.length; i++) {
			clearTimeout(reopenTimerIds[i]);
		}
		reopenTimerIds = [];
	}

	function setReopenDelays(delays) {
		reopenDelaysMs = Array.isArray(delays) ? delays.slice() : [];
		return reopenDelaysMs.slice();
	}

	function parseClosedId(data) {
		if (!data) {
			return "";
		}
		if (typeof data === "string") {
			try {
				data = JSON.parse(data);
			} catch (ignoreParse) {
				return LAUNCHER_IDS.indexOf(data) !== -1 ? data : "";
			}
		}
		if (data && typeof data.extensionId === "string") {
			return data.extensionId;
		}
		return "";
	}

	function attachClosedListener(csInterface) {
		if (closedListenerAttached ||
				!csInterface ||
				typeof csInterface.addEventListener !== "function") {
			return;
		}
		closedListenerAttached = true;
		csInterface.addEventListener(CLOSED_EVENT, function (event) {
			var id = parseClosedId(event && event.data);
			if (LAUNCHER_IDS.indexOf(id) !== -1) {
				lastClosedId = id;
			}
		});
	}

	function notifyClosed(csInterface, extensionId) {
		var id = LAUNCHER_IDS.indexOf(extensionId) !== -1 ? extensionId : currentLauncherId;
		lastClosedId = id;
		writeClosedSlot(csInterface, id);
		dispatchAppEvent(csInterface, CLOSED_EVENT, { extensionId: id });
		return id;
	}

	function otherLauncherId(extensionId) {
		return extensionId === EXTENSION_ID ? EXTENSION_ID_ALT : EXTENSION_ID;
	}

	function resetOpenState() {
		currentLauncherId = EXTENSION_ID;
		lastClosedId = "";
		hasOpenedLauncher = false;
		clearReopenTimers();
		return currentLauncherId;
	}

	function chooseLauncherId(csInterface) {
		var closedId = lastClosedId || readClosedSlot(csInterface);
		lastClosedId = "";
		clearClosedSlot(csInterface);
		if (closedId && LAUNCHER_IDS.indexOf(closedId) !== -1) {
			currentLauncherId = otherLauncherId(closedId);
		} else if (hasOpenedLauncher) {
			currentLauncherId = otherLauncherId(currentLauncherId);
		}
		hasOpenedLauncher = true;
		return currentLauncherId;
	}

	function requestOpen(csInterface, extensionId) {
		return csInterface.requestOpenExtension(extensionId || currentLauncherId, "");
	}

	function scheduleReopen(csInterface, extensionId) {
		var i;
		if (typeof setTimeout !== "function" || !reopenDelaysMs.length) {
			return;
		}
		for (i = 0; i < reopenDelaysMs.length; i++) {
			reopenTimerIds.push(setTimeout(function () {
				try {
					requestOpen(csInterface, extensionId);
				} catch (ignoreRetry) {}
				dispatchFocus(csInterface);
			}, reopenDelaysMs[i]));
		}
	}

	function openOrFocus(csInterface) {
		var raw;
		var opened;
		if (!enabled()) {
			lastStatus.lastOpen = { ok: false, reason: "LAUNCHER_DISABLED" };
			return {
				ok: false,
				reason: "LAUNCHER_DISABLED",
				registered: lastStatus.registered === true
			};
		}
		if (!csInterface || typeof csInterface.requestOpenExtension !== "function") {
			lastStatus.lastOpen = { ok: false, reason: "CEP_OPEN_EXTENSION_UNAVAILABLE" };
			return {
				ok: false,
				reason: "CEP_OPEN_EXTENSION_UNAVAILABLE"
			};
		}
		requestClose(csInterface);
		try {
			raw = csInterface.requestOpenExtension(PANEL_ID, "");
		} catch (err) {
			opened = {
				ok: false,
				reason: "REQUEST_OPEN_THREW",
				detail: String(err),
				extensionId: PANEL_ID,
				rawResult: describeRaw(err)
			};
			lastStatus.lastOpen = opened;
			return opened;
		}
		opened = {
			ok: true,
			invoked: true,
			action: "OPEN_OR_FOCUS_PANEL",
			extensionId: PANEL_ID,
			rawResult: describeRaw(raw),
			panelRequired: false,
			opensLauncher: false
		};
		lastStatus.lastOpen = opened;
		return lastStatus.lastOpen;
	}

	function handle(event, platform, csInterface, localHandlers) {
		var combo = currentCombo(csInterface);
		var match = typeof TerminalKeyboardShortcut !== "undefined" &&
			TerminalKeyboardShortcut.isLauncherShortcut(
				event,
				platform || currentPlatform(),
				combo
			);
		var allow = enabled();
		if (!match) {
			return { handled: false };
		}
		lastStatus.lastEvent = {
			received: true,
			key: event && event.key,
			code: event && event.code,
			shiftKey: !!event.shiftKey,
			altKey: !!event.altKey,
			metaKey: !!event.metaKey,
			ctrlKey: !!event.ctrlKey
		};
		if (event.preventDefault) {
			event.preventDefault();
		}
		if (event.stopPropagation) {
			event.stopPropagation();
		}
		if (event.stopImmediatePropagation) {
			event.stopImmediatePropagation();
		}
		if (!allow) {
			if (localHandlers && localHandlers.focusExisting) {
				localHandlers.focusExisting();
				return {
					handled: true,
					action: "FOCUS_PANEL"
				};
			}
			return {
				handled: false,
				action: "NOT_LIFETIME"
			};
		}
		return {
			handled: true,
			action: "OPEN_OR_FOCUS_PANEL",
			result: openOrFocus(csInterface)
		};
	}

	function status() {
		return lastStatus;
	}

	return {
		EXTENSION_ID: EXTENSION_ID,
		EXTENSION_ID_ALT: EXTENSION_ID_ALT,
		LAUNCHER_IDS: LAUNCHER_IDS,
		PANEL_ID: PANEL_ID,
		BOOTSTRAP_ID: BOOTSTRAP_ID,
		OPEN_FROM_PANEL_EVENT: OPEN_FROM_PANEL_EVENT,
		FOCUS_EVENT: FOCUS_EVENT,
		CLOSE_EVENT: CLOSE_EVENT,
		CLOSED_EVENT: CLOSED_EVENT,
		BOOT_EVENT: BOOT_EVENT,
		ENTITLEMENT_CHANGED: ENTITLEMENT_CHANGED,
		enabled: enabled,
		describeLifecycle: describeLifecycle,
		parseBootstrapDispatch: parseBootstrapDispatch,
		notifyEntitlement: notifyEntitlement,
		requestClose: requestClose,
		sync: sync,
		syncBootstrap: syncBootstrap,
		openOrFocus: openOrFocus,
		notifyClosed: notifyClosed,
		resetOpenState: resetOpenState,
		setReopenDelays: setReopenDelays,
		handle: handle,
		status: status,
		currentPlatform: currentPlatform,
		currentCombo: currentCombo
	};
}());

if (typeof module !== "undefined" && module.exports) {
	module.exports = PickFXGlobalLauncher;
}
