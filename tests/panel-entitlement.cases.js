(function () {
	var startCount = passed + failed;
	var Entitlement = PanelEntitlement;
	var Executor = TerminalProductionExecutor;
	var root = __pickfxRoot;
	var customerHtml = fs.readFileSync(path.join(root, "src/panel/index.html"), "utf8");
	var adminHtml = fs.readFileSync(path.join(root, "src/panel/admin.html"), "utf8");
	var panelSource = fs.readFileSync(path.join(root, "src/panel/js/panel.js"), "utf8");
	var productSource = fs.readFileSync(path.join(root, "src/panel/js/product.js"), "utf8");
	var storage;
	var record;
	var payload;
	var dispatched;
	var storedBridge = typeof PremiereBridge !== "undefined" ? PremiereBridge : undefined;

	function memoryStorage(seed) {
		var data = seed || {};
		return {
			getItem: function (key) {
				return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
			},
			setItem: function (key, value) {
				data[key] = String(value);
			},
			removeItem: function (key) {
				delete data[key];
			}
		};
	}

	assertEq("phase10 lifetime surface skips authorize", Entitlement.resolveSurface({
		sessionToken: "tok",
		state: "LIFETIME",
		productAccess: true,
		authorized: true
	}), "terminal");
	assertEq("phase12b lifetime without authorization flag is still terminal", Entitlement.resolveSurface({
		sessionToken: "tok",
		state: "LIFETIME",
		productAccess: true,
		authorized: false
	}), "terminal");
	assertEq("phase12b lifetime launcher enabled", Entitlement.globalLauncherEnabled({
		sessionToken: "tok",
		verifiedAt: Date.now(),
		state: "LIFETIME",
		productAccess: true
	}), true);
	assertEq("lifetime palette helper is enabled", Entitlement.paletteHelperEnabled({
		sessionToken: "tok",
		verifiedAt: Date.now(),
		state: "LIFETIME",
		productAccess: true
	}), true);
	assertEq("monthly authorized palette helper is enabled", Entitlement.paletteHelperEnabled({
		sessionToken: "tok",
		verifiedAt: Date.now(),
		state: "MONTHLY_ACTIVE",
		productAccess: true,
		authorized: true
	}), true);
	assertEq("monthly authorized launcher stays disabled", Entitlement.globalLauncherEnabled({
		sessionToken: "tok",
		verifiedAt: Date.now(),
		state: "MONTHLY_ACTIVE",
		productAccess: true,
		authorized: true
	}), false);
	assertEq("monthly unauthorized palette helper stays disabled", Entitlement.paletteHelperEnabled({
		sessionToken: "tok",
		verifiedAt: Date.now(),
		state: "MONTHLY_ACTIVE",
		productAccess: false,
		authorized: false
	}), false);
	assertEq("phase10 monthly unauthorized surface is authorize", Entitlement.resolveSurface({
		sessionToken: "tok",
		state: "MONTHLY_ACTIVE",
		productAccess: false,
		authorized: false
	}), "authorize");
	assertEq("phase10 monthly authorized surface is terminal", Entitlement.resolveSurface({
		sessionToken: "tok",
		state: "MONTHLY_ACTIVE",
		productAccess: true,
		authorized: true
	}), "terminal");
	assertEq("phase10 free surface is upgrade", Entitlement.resolveSurface({
		sessionToken: "tok",
		state: "FREE",
		productAccess: false
	}), "upgrade");
	assertEq("phase10 locked surface is upgrade", Entitlement.resolveSurface({
		sessionToken: "tok",
		state: "LOCKED",
		productAccess: false
	}), "upgrade");
	assertEq("phase10 signed-out surface is signin", Entitlement.resolveSurface(null), "signin");

	record = Entitlement.trustedRecord({
		state: "LIFETIME",
		productAccess: true,
		authorized: true
	});
	assertEq("phase10 fake lifetime without session token is rejected", record, null);
	assertEq(
		"phase10 fake lifetime localStorage cannot unlock",
		Entitlement.resolveSurface({
			state: "LIFETIME",
			productAccess: true,
			authorized: true
		}),
		"signin"
	);
	assertEq(
		"phase10 fake monthly localStorage cannot unlock",
		Entitlement.resolveSurface({
			state: "MONTHLY_ACTIVE",
			productAccess: true,
			authorized: true
		}),
		"signin"
	);

	storage = memoryStorage();
	Entitlement.saveCachedSession({
		sessionToken: "session-1",
		verifiedAt: Date.now(),
		state: "LIFETIME",
		productAccess: true,
		authorized: true,
		plan: "lifetime"
	}, storage);
	assert("phase10 cache stores session token only as UI cache", storage.getItem(Entitlement.SESSION_KEY).indexOf("session-1") !== -1);
	assertEq(
		"phase10 stale cache requires a verified session",
		Entitlement.canUseStaleCache({ state: "LIFETIME", productAccess: true, verifiedAt: Date.now() }),
		false
	);
	assertEq(
		"phase10 verified session can be used during a transient outage",
		Entitlement.canUseStaleCache({
			sessionToken: "session-1",
			state: "LIFETIME",
			productAccess: true,
			verifiedAt: Date.now() - (2 * 60 * 60 * 1000)
		}),
		true
	);
	assertEq(
		"phase10 stale cache expires after six hours",
		Entitlement.canUseStaleCache({
			sessionToken: "session-1",
			state: "LIFETIME",
			productAccess: true,
			verifiedAt: Date.now() - Entitlement.STALE_GRACE_MS - 1
		}),
		false
	);
	assertEq(
		"phase10 revalidation is due after fifteen minutes",
		Entitlement.needsRevalidation({
			sessionToken: "session-1",
			verifiedAt: Date.now() - Entitlement.REVALIDATE_MS
		}),
		true
	);
	assertEq(
		"phase10 transient failure keeps a valid lifetime session",
		Entitlement.resolveSurface({
			sessionToken: "session-1",
			state: "LIFETIME",
			productAccess: true,
			authorized: true,
			verifiedAt: Date.now()
		}, { transientFailure: true }),
		"terminal"
	);

	payload = null;
	Executor.dispatch({}, { productionVerified: true, type: "EFFECT" }, {
		featureEnabled: true,
		entitlementState: "FREE"
	}, function (result) {
		payload = result;
	});
	assertEq("phase10 free user cannot execute production commands", payload && payload.ok, false);
	assertEq("phase10 free execution reason", payload && payload.reason, "ENTITLEMENT_INACTIVE");

	payload = null;
	Executor.dispatch({}, { productionVerified: true, type: "EFFECT" }, {
		featureEnabled: true,
		entitlementState: "LOCKED"
	}, function (result) {
		payload = result;
	});
	assertEq("phase10 locked user cannot execute production commands", payload && payload.reason, "ENTITLEMENT_INACTIVE");

	dispatched = 0;
	PremiereBridge = {
		setVerifiedTerminalEffectParameter: function () {
			dispatched += 1;
		}
	};
	payload = null;
	Executor.dispatch({}, {
		ok: true,
		type: "EFFECT",
		productionVerified: true,
		resolvedEffect: { displayName: "Gaussian Blur", premiereName: "Gaussian Blur", matchName: "AE.ADBE Gaussian Blur" },
		resolvedParameter: { displayName: "Amount", productionReady: true },
		value: 10
	}, {
		featureEnabled: true,
		entitlementState: "LIFETIME"
	}, function (result) {
		payload = result;
	});
	assert("phase10 lifetime still reaches the production executor", dispatched === 1);
	PremiereBridge = storedBridge;

	assert("phase10 customer HTML has no debug panel", customerHtml.indexOf('id="debug-panel"') === -1);
	assert("phase10 customer HTML has no registry builder", customerHtml.indexOf("Start registry build") === -1);
	assert("phase10 customer HTML has no research harness script", customerHtml.indexOf("TerminalResearchHarness.js") === -1);
	assert("phase10 customer HTML has no promotion pipeline script", customerHtml.indexOf("TerminalPromotionPipeline.js") === -1);
	assert("phase10 customer HTML has no feature flag copy", customerHtml.indexOf("feature flag") === -1);
	assert("phase10 customer HTML has authorize screen", customerHtml.indexOf("Authorize this panel") !== -1);
	assert("phase10 customer HTML has upgrade screen", customerHtml.indexOf("PickFX access is inactive.") !== -1);
	assert("phase10 customer HTML keeps production registry modules", customerHtml.indexOf("TerminalProductionRegistry.js") !== -1);
	assert("phase10 customer HTML does not load admin.html", customerHtml.indexOf("admin.html") === -1);
	assert("phase10 admin surface remains isolated", adminHtml.indexOf('id="debug-panel"') !== -1);
	assert("phase10 admin is not the CEP MainPath", adminHtml.indexOf("internal research surface") !== -1);
	assert("phase10 settings no longer toggle debug from customer", panelSource.indexOf("PickFXProduct.openSettings") !== -1);
	assert("phase10 customer settings omit feature flags", productSource.indexOf("feature flag") === -1);
	assert("phase10 customer settings omit registry paths", productSource.indexOf("terminal-registry") === -1);
	assert("phase12b sign-in surface starts sign-in not authorization", productSource.indexOf("startSignIn();") !== -1);
	assert("phase12b lifetime startAuthorization is redirected to sign-in", productSource.indexOf('current.state === "LIFETIME"') !== -1);
	assert("phase10 sign out keeps the installation identity", productSource.indexOf("clearCachedSession") !== -1);
	assert("effect search does not execute production command syntax", panelSource.indexOf("if (tryTerminalCommand(searchInput.value))") === -1);
	assert("phase10 extraHost still lists the research builder for admin", panelSource.indexOf("/src/core/EffectRegistryBuilder.js") !== -1);
	assert("phase10 research host files are skipped on the customer surface", panelSource.indexOf("shouldSkipResearchHost") !== -1);

	print("panel entitlement: " + ((passed + failed) - startCount) + " assertions");
}());
