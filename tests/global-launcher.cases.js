(function () {
	var startCount = passed + failed;
	var Entitlement = PanelEntitlement;
	var Shortcut = TerminalKeyboardShortcut;
	var Launcher = PickFXGlobalLauncher;
	var Runtime = PickFXLauncherRuntime;
	var Copy = CustomerSettingsCopy;
	var Executor = TerminalProductionExecutor;
	var root = __pickfxRoot;
	var customerHtml = fs.readFileSync(path.join(root, "src/panel/index.html"), "utf8");
	var panelJs = fs.readFileSync(path.join(root, "src/panel/js/panel.js"), "utf8");
	var launcherHtml = fs.readFileSync(path.join(root, "src/panel/launcher/index.html"), "utf8");
	var launcherApp = fs.readFileSync(path.join(root, "src/panel/launcher/app.js"), "utf8");
	var launcherCss = fs.readFileSync(path.join(root, "src/panel/launcher/styles.css"), "utf8");
	var bootstrapHtml = fs.readFileSync(path.join(root, "src/panel/bootstrap/index.html"), "utf8");
	var bootstrapApp = fs.readFileSync(path.join(root, "src/panel/bootstrap/app.js"), "utf8");
	var runtimeSrc = fs.readFileSync(path.join(root, "src/panel/js/LauncherRuntime.js"), "utf8");
	var manifest = fs.readFileSync(path.join(root, "CSXS/manifest.xml"), "utf8");
	var bootstrapDispatch = Launcher.parseBootstrapDispatch(manifest);
	var lifecycle = Launcher.describeLifecycle();
	var visibleLauncher = launcherHtml
		.replace(/<script[\s\S]*?<\/script>/gi, "")
		.replace(/<link[^>]*>/gi, "")
		.toLowerCase();
	if (typeof Launcher.setReopenDelays === "function") {
		Launcher.setReopenDelays([]);
	}
	if (typeof Launcher.resetOpenState === "function") {
		Launcher.resetOpenState();
	}
	var opened = 0;
	var openedId = "";
	var focused = 0;
	var closed = 0;
	var dispatched = 0;
	var registered;
	var payload;
	var now = Date.now();
	var storedBridge = typeof PremiereBridge !== "undefined" ? PremiereBridge : undefined;

	function lifetimeRecord(extra) {
		var next = {
			sessionToken: "lifetime-session",
			verifiedAt: now,
			state: "LIFETIME",
			productAccess: true,
			authorized: true,
			plan: "lifetime",
			email: "life@example.com"
		};
		var key;
		extra = extra || {};
		for (key in extra) {
			if (extra.hasOwnProperty(key)) {
				next[key] = extra[key];
			}
		}
		return next;
	}

	function mockCs(interestSink) {
		return {
			getOSInformation: function () {
				return "Mac OS X";
			},
			getExtensionID: function () {
				return "com.pickfx.panel";
			},
			registerKeyEventsInterest: function (value) {
				registered = value;
				if (interestSink) {
					interestSink.value = value;
				}
			},
			requestOpenExtension: function (id) {
				openedId = id;
				opened += 1;
			},
			dispatchEvent: function (event) {
				focused += 1;
				if (event && event.type === Launcher.CLOSE_EVENT) {
					closed += 1;
				}
			},
			addEventListener: function () {}
		};
	}

	assertEq("phase12c bootstrap type is Custom", bootstrapDispatch.type, "Custom");
	assertEq("phase12c bootstrap AutoVisible is false", bootstrapDispatch.autoVisible, false);
	assertEq("phase12c bootstrap has no Window menu", bootstrapDispatch.hasMenu, false);
	assertEq("phase12c bootstrap starts on applicationActivate", bootstrapDispatch.startOn.applicationActivate, true);
	assertEq("phase12c bootstrap starts on Premiere ApplicationActivate", bootstrapDispatch.startOn.premiereActivate, true);
	assertEq("phase12c lifecycle is independent of the docked panel", lifecycle.panelRequired, false);
	assertEq("phase12c lifecycle owner is bootstrap", lifecycle.owner, "com.pickfx.bootstrap");
	assertEq("phase12c lifecycle is not OS global", lifecycle.osGlobal, false);
	assertEq("phase12c lifecycle type Custom", lifecycle.type, "Custom");
	assert(
		"launcher AutoVisible is true so CEP can present the Modeless window",
		/<Extension Id="com\.pickfx\.launcher">[\s\S]*<AutoVisible>true<\/AutoVisible>[\s\S]*<\/Extension>/.test(manifest) &&
		/<Extension Id="com\.pickfx\.launcher\.alt">[\s\S]*<AutoVisible>true<\/AutoVisible>[\s\S]*<\/Extension>/.test(manifest)
	);
	assert("phase12c bootstrap html does not load panel.js", bootstrapHtml.indexOf("panel.js") === -1);
	assert("phase12c bootstrap html does not load research registry", bootstrapHtml.indexOf("research-registry") === -1);
	assert("phase12c bootstrap html does not load research host", bootstrapHtml.indexOf("research-registry-host") === -1);
	assert("phase12c bootstrap html does not load admin", bootstrapHtml.indexOf("admin") === -1);
	assert("phase12c bootstrap html does not load registry builder", bootstrapHtml.indexOf("EffectRegistryBuilder") === -1);
	assert("phase12c bootstrap listens for Premiere activate", bootstrapApp.indexOf("com.adobe.csxs.events.ApplicationActivate") !== -1);
	assert("phase12c bootstrap re-reads session without the panel", bootstrapApp.indexOf("applyCached") !== -1);
	assert("phase12c bootstrap opens launcher through requestOpenExtension", bootstrapApp.indexOf("PickFXGlobalLauncher.handle") !== -1);
	assert("bootstrap listens for native PlugPlug openLauncher event",
		bootstrapApp.indexOf("com.pickfx.native.openLauncher") !== -1);
	assert("native PlugPlug event opens launcher through openOrFocus",
		bootstrapApp.indexOf("com.pickfx.native.openLauncher") !== -1 &&
		bootstrapApp.indexOf("PickFXGlobalLauncher.openOrFocus") !== -1);
	assert("panel does not open launcher from Shift+P", panelJs.indexOf("PickFXGlobalLauncher.handle") === -1);
	assert("panel palette key handler does not open launcher", (function () {
		var start = panelJs.indexOf("function dispatchPaletteKey");
		var end = panelJs.indexOf("function registerPanelKeyboard");
		var body = start !== -1 && end > start ? panelJs.slice(start, end) : "";
		return body.indexOf("openOrFocus") === -1 && body.indexOf("PickFXGlobalLauncher.handle") === -1;
	}()), true);

	assertEq("phase12c lifetime launcher enabled", Entitlement.globalLauncherEnabled(lifetimeRecord()), true);
	assertEq("phase12c monthly authorized launcher disabled", Entitlement.globalLauncherEnabled({
		sessionToken: "monthly-session",
		verifiedAt: now,
		state: "MONTHLY_ACTIVE",
		productAccess: true,
		authorized: true,
		plan: "monthly"
	}), false);
	assertEq("phase12c monthly unauthorized launcher disabled", Entitlement.globalLauncherEnabled({
		sessionToken: "monthly-session",
		verifiedAt: now,
		state: "MONTHLY_ACTIVE",
		productAccess: false,
		authorized: false,
		plan: "monthly"
	}), false);
	assertEq("phase12c free launcher disabled", Entitlement.globalLauncherEnabled({
		sessionToken: "free-session",
		verifiedAt: now,
		state: "FREE",
		productAccess: false,
		plan: null
	}), false);
	assertEq("phase12c locked launcher disabled", Entitlement.globalLauncherEnabled({
		sessionToken: "locked-session",
		verifiedAt: now,
		state: "LOCKED",
		productAccess: false,
		plan: "monthly"
	}), false);
	assertEq(
		"phase12c forged lifetime without session cannot enable launcher",
		Entitlement.globalLauncherEnabled({
			state: "LIFETIME",
			productAccess: true,
			authorized: true,
			plan: "lifetime"
		}),
		false
	);
	assertEq(
		"phase12c expired lifetime session disables launcher",
		Entitlement.globalLauncherEnabled(lifetimeRecord({
			expiresAt: new Date(now - 1000).toISOString()
		}), now),
		false
	);
	assertEq(
		"phase12c revoked current record disables launcher",
		Entitlement.globalLauncherEnabled(null),
		false
	);
	assertEq("phase12c productAccess still allows monthly", Entitlement.productAccessAllowed("MONTHLY_ACTIVE"), true);

	assertEq("phase12c mac launcher label", Shortcut.launcherShortcutLabel("MacIntel"), "⇧ P");
	assertEq("phase12c windows launcher label", Shortcut.launcherShortcutLabel("Win32"), "⇧ P");
	assertEq("phase12c launcher hint", Shortcut.launcherShortcutHint(), "Open PickFX");
	assertEq("phase12c settings hide shortcut for monthly product access", Copy.showShortcutSection({
		sessionToken: "monthly-session",
		verifiedAt: now,
		state: "MONTHLY_ACTIVE",
		productAccess: true,
		authorized: true
	}), false);
	assertEq("phase12c settings hide shortcut for free", Copy.showShortcutSection({
		sessionToken: "free-session",
		verifiedAt: now,
		state: "FREE",
		productAccess: false
	}), false);
	assertEq("phase12c settings hide shortcut for locked", Copy.showShortcutSection({
		sessionToken: "locked-session",
		verifiedAt: now,
		state: "LOCKED",
		productAccess: false
	}), false);
	assertEq("phase12c settings show shortcut for lifetime", Copy.showShortcutSection(lifetimeRecord()), true);

	assertEq("phase12c mac shortcut matches", Shortcut.isLauncherShortcut({
		key: "p",
		keyCode: 80,
		metaKey: false,
		ctrlKey: false,
		shiftKey: true,
		altKey: false
	}, "MacIntel"), true);
	assertEq("phase12c windows shortcut matches", Shortcut.isLauncherShortcut({
		key: "P",
		keyCode: 80,
		metaKey: false,
		ctrlKey: false,
		shiftKey: true,
		altKey: false
	}, "Win32"), true);
	assertEq("phase12c cmd-shift-p is not the launcher shortcut", Shortcut.isLauncherShortcut({
		key: "p",
		keyCode: 80,
		metaKey: true,
		ctrlKey: false,
		shiftKey: true,
		altKey: false
	}, "MacIntel"), false);
	assertEq("phase12c space is not the launcher shortcut", Shortcut.isLauncherShortcut({
		key: " ",
		keyCode: 32,
		metaKey: true,
		ctrlKey: false,
		shiftKey: false
	}, "MacIntel"), false);

	Entitlement.setCurrent(lifetimeRecord());
	opened = 0;
	focused = 0;
	assertEq("phase12c lifetime launcher helper is enabled", Launcher.enabled(), true);
	assertEq("phase12c lifetime open requests extension", Launcher.openOrFocus(mockCs()).ok, true);
	assertEq("phase12c lifetime open called requestOpenExtension", opened, 1);
	assertEq("requestOpenExtension raw result is the CEP return", Launcher.status().lastOpen.rawResult, "undefined");
	assertEq("shortcut opens the docked PickFX panel", Launcher.status().lastOpen.extensionId, "com.pickfx.panel");
	assertEq("shortcut does not open the floating launcher", Launcher.status().lastOpen.opensLauncher, false);
	assertEq("repeat shortcut still opens only the docked panel", Launcher.openOrFocus(mockCs()).extensionId, "com.pickfx.panel");
	assertEq("repeat shortcut still requests com.pickfx.panel", openedId, "com.pickfx.panel");
	assert(
		"panel flyout no longer opens the floating launcher",
		panelJs.indexOf("fromPanel: true") === -1 &&
		panelJs.indexOf("OPEN_FROM_PANEL_EVENT") === -1
	);

	registered = "";
	Launcher.syncBootstrap(mockCs(), lifetimeRecord());
	assert("phase12c background Shift+P registers Mac kVK_ANSI_P 35", String(registered).indexOf('"keyCode":35') !== -1);
	assert("phase12c background Shift+P sets shiftKey", String(registered).indexOf('"shiftKey":true') !== -1);
	assertEq("phase12c background registration does not require the panel", Launcher.status().panelRequired, false);
	assertEq("phase12c lifetime registration is not OS global", Launcher.status().osGlobal, false);

	registered = "";
	closed = 0;
	Launcher.syncBootstrap(mockCs(), null);
	assert("unknown bootstrap session still registers Shift+P", String(registered).indexOf('"shiftKey":true') !== -1);
	assertEq("bootstrap with unknown session does not close launcher", closed, 0);

	registered = "";
	Launcher.syncBootstrap(mockCs(), {
		sessionToken: "monthly-session",
		verifiedAt: now,
		state: "MONTHLY_ACTIVE",
		productAccess: true,
		authorized: true
	});
	assertEq("phase12c monthly bootstrap does not register Shift+P", String(registered).indexOf('"shiftKey":true') === -1, true);

	registered = "";
	Launcher.sync(mockCs(), lifetimeRecord());
	assertEq("panel sync does not register launcher Shift+P", String(registered).indexOf('"keyCode":35') === -1, true);
	assert("phase12c lifetime registers Mac arrow down 125", String(registered).indexOf('"keyCode":125') !== -1);
	assert("phase12c lifetime registers Mac Return 36", String(registered).indexOf('"keyCode":36') !== -1);
	assert("phase12c lifetime registers Mac Escape 53", String(registered).indexOf('"keyCode":53') !== -1);
	assert("phase12c lifetime does not register JS arrow down 40", String(registered).indexOf('"keyCode":40') === -1);

	registered = "";
	closed = 0;
	Launcher.sync(mockCs(), {
		sessionToken: "monthly-session",
		verifiedAt: now,
		state: "MONTHLY_ACTIVE",
		productAccess: true,
		authorized: true
	});
	assertEq("panel sync does not register launcher combo", String(registered).indexOf('"shiftKey":true') === -1, true);
	assert("phase12c monthly panel registers Mac arrow up 126", String(registered).indexOf('"keyCode":126') !== -1);
	assert("phase12c monthly close is requested when entitlement is invalid", closed >= 1);

	Entitlement.setCurrent(lifetimeRecord());
	opened = 0;
	focused = 0;
	assertEq("lifetime bootstrap shortcut opens launcher", Launcher.handle({
		key: "P",
		code: "KeyP",
		keyCode: 80,
		shiftKey: true,
		altKey: false,
		metaKey: false,
		ctrlKey: false,
		preventDefault: function () {},
		stopPropagation: function () {}
	}, "MacIntel", mockCs(), {
		focusExisting: function () {
			focused += 10;
		}
	}).action, "OPEN_OR_FOCUS_PANEL");
	assertEq("lifetime shortcut requests the docked panel", opened, 1);
	assertEq("lifetime shortcut requests com.pickfx.panel", openedId, "com.pickfx.panel");
	assertEq("lifetime shortcut does not only refocus the panel", focused < 10, true);

	Entitlement.setCurrent({
		sessionToken: "monthly-session",
		verifiedAt: now,
		state: "MONTHLY_ACTIVE",
		productAccess: true,
		authorized: true
	});
	opened = 0;
	assertEq("phase12c monthly open is disabled", Launcher.openOrFocus(mockCs()).ok, false);
	assertEq("phase12c monthly does not open launcher", opened, 0);
	opened = 0;
	openedId = "";
	focused = 0;
	assertEq("monthly focused-panel Shift+P focuses panel instead of opening", Launcher.handle({
		key: "P",
		code: "KeyP",
		keyCode: 80,
		which: 80,
		shiftKey: true,
		altKey: false,
		metaKey: false,
		ctrlKey: false,
		preventDefault: function () {},
		stopPropagation: function () {},
		stopImmediatePropagation: function () {}
	}, "MacIntel", mockCs(), {
		focusExisting: function () {
			focused += 1;
		}
	}).action, "FOCUS_PANEL");
	assertEq("monthly focused-panel Shift+P does not requestOpenExtension", opened, 0);
	assertEq("monthly focused-panel Shift+P calls focusExisting", focused, 1);

	Entitlement.setCurrent(lifetimeRecord());
	payload = null;
	dispatched = 0;
	PremiereBridge = {
		setVerifiedTerminalEffectParameter: function () {
			dispatched += 1;
		}
	};
	Runtime.execute("gaussian blur 30", {
		entitlement: Entitlement,
		registry: {
			resolve: function () {
				return {
					ok: true,
					productionVerified: true,
					type: "EFFECT",
					resolvedEffect: {
						displayName: "Gaussian Blur",
						premiereName: "Gaussian Blur",
						matchName: "AE.ADBE Gaussian Blur"
					},
					resolvedParameter: {
						displayName: "Amount",
						productionReady: true
					},
					value: 30
				};
			}
		},
		registryData: {},
		executor: Executor,
		csInterface: {},
		done: function (result) {
			payload = result;
		}
	});
	assertEq("phase12c lifetime command uses production executor", dispatched, 1);
	PremiereBridge = storedBridge;

	Entitlement.setCurrent(lifetimeRecord());
	dispatched = 0;
	payload = null;
	Runtime.execute("research only glow", {
		entitlement: Entitlement,
		registry: {
			resolve: function () {
				return {
					ok: false,
					productionVerified: false,
					reason: "COMMAND_NOT_PROMOTED",
					detail: "Command is not production-verified."
				};
			}
		},
		registryData: {},
		executor: {
			dispatch: function (cs, resolution, options, done) {
				dispatched += 1;
				done({ ok: true });
			}
		},
		csInterface: {},
		done: function (result) {
			payload = result;
		}
	});
	assertEq("phase12c research-only command is rejected", payload && payload.reason, "COMMAND_NOT_PROMOTED");
	assertEq("phase12c research-only command does not write", dispatched, 0);

	payload = null;
	dispatched = 0;
	Runtime.execute("gaussian blur unvalidated", {
		entitlement: Entitlement,
		registry: {
			resolve: function () {
				return {
					ok: true,
					productionVerified: false,
					reason: "PARAMETER_NOT_PROMOTED",
					detail: "Parameter is not production-verified."
				};
			}
		},
		registryData: {},
		executor: {
			dispatch: function (cs, resolution, options, done) {
				dispatched += 1;
				done({ ok: true });
			}
		},
		csInterface: {},
		done: function (result) {
			payload = result;
		}
	});
	assertEq("phase12c unvalidated parameter is rejected", payload && payload.reason, "PARAMETER_NOT_PROMOTED");
	assertEq("phase12c unvalidated parameter does not write", dispatched, 0);

	Entitlement.setCurrent({
		sessionToken: "monthly-session",
		verifiedAt: now,
		state: "MONTHLY_ACTIVE",
		productAccess: true,
		authorized: true
	});
	dispatched = 0;
	payload = null;
	Runtime.execute("gaussian blur 30", {
		entitlement: Entitlement,
		registry: {
			resolve: function () {
				dispatched += 1;
				return { ok: true, productionVerified: true, type: "EFFECT" };
			}
		},
		registryData: {},
		executor: {
			dispatch: function (cs, resolution, options, done) {
				dispatched += 10;
				done({ ok: true });
			}
		},
		csInterface: {},
		done: function (result) {
			payload = result;
		}
	});
	assertEq("phase12c monthly cannot execute through launcher", payload && payload.reason, "LAUNCHER_DISABLED");
	assertEq("phase12c monthly launcher does not dispatch", dispatched, 0);

	assert("phase12c runtime uses production executor", runtimeSrc.indexOf("executor.dispatch") !== -1);
	assert("phase12c runtime does not call setValue", runtimeSrc.indexOf("setValue") === -1);
	assert("phase12c runtime does not call QE", runtimeSrc.indexOf("QE") === -1);
	assert("phase12c launcher app does not call setValue", launcherApp.indexOf("setValue") === -1);
	assert("phase12c launcher app does not call QE", launcherApp.indexOf("QE") === -1);
	assert("phase12c launcher uses production v2 registry", launcherApp.indexOf("terminal-registry.production.v2.json") !== -1);
	assert("phase12c launcher uses launcher runtime", launcherApp.indexOf("PickFXLauncherRuntime.execute") !== -1);
	assert("phase12c launcher focuses search", launcherApp.indexOf("focusSearch") !== -1);
	assert("launcher html has no boot probe", launcherHtml.indexOf("launcher-boot-probe") === -1);
	assert("launcher html has no diagnostic boot banner", launcherHtml.indexOf("LAUNCHER BOOT") === -1);
	assert("cep key interest has no diagnostic launcher button",
		fs.readFileSync(path.join(root, "src/panel/js/CepKeyInterest.js"), "utf8").indexOf("OPEN LAUNCHER") === -1);
	assert("phase12c launcher closes on Escape", launcherApp.indexOf('event.key === "Escape"') !== -1);
	assert("phase12c launcher closes after successful execution", launcherApp.indexOf("closeLauncher();") !== -1);
	assert("phase12c launcher Shift+P refocuses input", launcherApp.indexOf("isLauncherShortcut") !== -1);
	assert("phase12c launcher has no effect count UI", launcherHtml.indexOf("footer-result-count") === -1);
	assert("phase12c launcher has no footer", launcherHtml.indexOf("bar-footer") === -1);
	assert("phase12c launcher has no Apply button", launcherHtml.indexOf("footer-apply-hint") === -1 && visibleLauncher.indexOf(">apply<") === -1);
	assert("phase12c launcher has no Recent", visibleLauncher.indexOf("recent") === -1);
	assert("phase12c launcher has no settings", visibleLauncher.indexOf("settings") === -1);
	assert("phase12c launcher has no account", visibleLauncher.indexOf("account") === -1);
	assert("phase12c launcher visible html has no research", visibleLauncher.indexOf("research") === -1);
	assert("phase12c launcher visible html has no registry", visibleLauncher.indexOf("registry") === -1);
	assert("phase12c launcher visible html has no debug", visibleLauncher.indexOf("debug") === -1);
	assert("phase12c launcher does not load research registry", launcherHtml.indexOf("research-registry") === -1);
	assert("phase12c launcher does not load research host", launcherHtml.indexOf("research-registry-host") === -1);
	assert("phase12c launcher does not load admin", launcherHtml.indexOf("admin.html") === -1);
	assert("phase12c launcher does not load registry builder", launcherHtml.indexOf("EffectRegistryBuilder") === -1);
	assert("phase12c launcher does not load discovery UI", launcherHtml.indexOf("TerminalEffectDiscovery") === -1);
	assert("phase12c launcher css has no capability counts", launcherCss.indexOf("capabilities") === -1);
	assert("phase12c bootstrap does not log keystrokes", bootstrapApp.indexOf("console.log") === -1);
	assert("phase12c bootstrap only registers CEP interest", bootstrapApp.indexOf("syncBootstrap") !== -1);
	assert("phase12c customer panel still exists", customerHtml.indexOf("Authorize this panel") !== -1);
	assert("phase12c customer shortcut section is gated", customerHtml.indexOf("settings-shortcut-section") !== -1);
	assert("phase12c no native helper added", !fs.existsSync(path.join(root, "native")));
	assert("phase12c manifest has no OS hook", manifest.indexOf("osGlobal") === -1);

	Entitlement.setCurrent(null);
	print("global launcher: " + ((passed + failed) - startCount) + " assertions");
}());
