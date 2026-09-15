(function () {
	var startCount = passed + failed;
	var Discovery = TerminalEffectDiscovery;
	var Production = TerminalProductionRegistry;
	var Executor = TerminalProductionExecutor;
	var root = __pickfxRoot;
	var research = JSON.parse(fs.readFileSync(
		path.join(root, "src/data/terminal-registry.generated.json"),
		"utf8"
	));
	var production = JSON.parse(fs.readFileSync(
		path.join(root, "src/data/terminal-registry.production.json"),
		"utf8"
	));
	var readiness = JSON.parse(fs.readFileSync(
		path.join(root, "src/data/terminal-registry.production-readiness-audit.json"),
		"utf8"
	));
	var catalog = Discovery.build(research, production, readiness);
	var browser;
	var gaussian;
	var sharpen;
	var lumetri;
	var resolved;
	var guard;
	var dispatched = 0;
	var storedBridge = typeof PremiereBridge !== "undefined" ? PremiereBridge : undefined;
	var i;
	var executableCount = 0;
	var readonlyCount = 0;
	var productionStillValid;

	assertEq("phase8 discovery catalog builds", catalog.ok, true);
	assertEq("phase8 searchable effects", catalog.counts.searchableEffects, 134);
	assertEq("phase8 displayed parameters", catalog.counts.displayedParameters, 2434);
	assertEq("phase8 executable effect parameters", catalog.counts.executableParameters, 36);
	assertEq("phase8 read-only parameters", catalog.counts.readOnlyParameters, 2398);
	assertEq("phase8 motion capabilities unchanged", catalog.counts.motionCapabilities, 5);

	browser = Discovery.browse("gaussian blur", catalog);
	assertEq("phase8 gaussian blur is effect browser", browser.kind, "effect-browser");
	assertEq("phase8 gaussian blur effect name", browser.effect.displayName, "Gaussian Blur");
	assertEq("phase8 gaussian blur returns all registry parameters", browser.parameters.length, 20);
	assertEq("phase8 gaussian blur keeps full parameter count", browser.parameterCount, 20);

	for (i = 0; i < browser.parameters.length; i++) {
		if (browser.parameters[i].parameterDisplayName === "Amount") {
			gaussian = browser.parameters[i];
		}
		if (browser.parameters[i].executable) {
			executableCount += 1;
		} else {
			readonlyCount += 1;
		}
		assertEq(
			"phase8 gaussian current value is not fabricated " + String(i),
			browser.parameters[i].currentValue,
			null
		);
	}
	assertEq("phase8 gaussian amount is executable", gaussian.executable, true);
	assertEq("phase8 gaussian amount status", gaussian.productionStatus, "PRODUCTION_READY");
	assertEq("phase8 gaussian has one executable parameter", executableCount, 1);
	assertEq("phase8 gaussian unvalidated remain read-only", readonlyCount, 19);
	assertEq("phase8 unvalidated cannot dispatch", Discovery.canDispatch({
		executable: false,
		writable: false,
		productionStatus: "AMBIGUOUS"
	}), false);
	assertEq("phase8 production amount can dispatch", Discovery.canDispatch(gaussian), true);

	browser = Discovery.browse("gaussian blur amount", catalog);
	assertEq("phase8 amount filter stays on gaussian", browser.effect.displayName, "Gaussian Blur");
	assertEq("phase8 amount filter returns amount", browser.parameters[0].parameterDisplayName, "Amount");
	assertEq("phase8 filtered amount remains executable", browser.parameters[0].executable, true);

	browser = Discovery.browse("sharpen", catalog);
	assertEq("phase8 sharpen is effect browser", browser.kind, "effect-browser");
	assertEq("phase8 sharpen returns all registry parameters", browser.parameters.length, 1);
	sharpen = browser.parameters[0];
	assertEq("phase8 sharpen amount executable", sharpen.executable, true);
	assertEq("phase8 sharpen parameter name", sharpen.parameterDisplayName, "Sharpen Amount");

	browser = Discovery.browse("lumetri color", catalog);
	assertEq("phase8 lumetri is effect browser", browser.kind, "effect-browser");
	assertEq("phase8 lumetri returns all registry parameters", browser.parameters.length, 130);
	assertEq(
		"phase8 lumetri has no executable production pair",
		browser.parameters.some(function (parameter) {
			return parameter.executable === true;
		}),
		false
	);

	browser = Discovery.browse("gausian blur", catalog);
	assertEq("phase8 fuzzy effect search still works", browser.effect.displayName, "Gaussian Blur");

	browser = Discovery.browse("directional blr", catalog);
	assertEq("phase8 fuzzy directional stays ambiguous", browser.kind, "choices");
	assertEq(
		"phase8 fuzzy directional keeps verified options",
		browser.candidates.some(function (candidate) {
			return candidate.displayName === "Directional Blur";
		}),
		true
	);

	browser = Discovery.browse("opacity", catalog);
	assertEq("phase8 opacity shows verified motion parameter", browser.kind, "motion-browser");
	assertEq("phase8 opacity parameter executable", browser.parameters[0].executable, true);

	browser = Discovery.browse("gaussian blur 30", catalog);
	assertEq("phase8 valued query stays a command", browser.kind, "command");

	resolved = Production.resolve("gaussian blur 30", production);
	assertEq("phase8 gaussian blur 30 still resolves", resolved.ok, true);
	assertEq("phase8 gaussian blur 30 stays production verified", resolved.productionVerified, true);
	assertEq("phase8 gaussian blur 30 parameter", resolved.resolvedParameter.displayName, "Amount");

	resolved = Production.resolve("gaussian blur amount 30", production);
	assertEq("phase8 explicit amount command still resolves", resolved.ok, true);

	guard = Discovery.writeGuard(
		"gaussian blur 30",
		catalog,
		Production.resolve("gaussian blur 30", production)
	);
	assertEq("phase8 verified command remains allowed", guard.allow, true);

	guard = Discovery.writeGuard(
		"gaussian blur seed 12",
		catalog,
		Production.resolve("gaussian blur seed 12", production)
	);
	assertEq("phase8 unvalidated parameter is blocked", guard.allow, false);
	assertEq("phase8 unvalidated reason", guard.reason, "PARAMETER_NOT_VALIDATED");
	assertEq("phase8 unvalidated does not fall through", guard.fallthrough, false);
	assertEq("phase8 unvalidated cannot reach dispatcher", guard.executable, false);

	PremiereBridge = {
		setVerifiedTerminalEffectParameter: function () {
			dispatched += 1;
		}
	};
	guard = Discovery.writeGuard(
		"gaussian blur seed 12",
		catalog,
		Production.resolve("gaussian blur seed 12", production)
	);
	if (guard.allow) {
		Executor.dispatch({}, guard.resolution, { featureEnabled: true }, function () {});
	}
	assertEq("phase8 dispatcher is not called for unvalidated", dispatched, 0);
	PremiereBridge = storedBridge;

	productionStillValid = Production.validate(production);
	assertEq("phase8 production registry still has 36 pairs", production.counts.effectParameterPairs, 36);
	assertEq("phase8 production registry still has 5 motion", production.counts.motionCapabilities, 5);
	assertEq("phase8 production registry still validates", productionStillValid.ok, true);
	assertEq(
		"phase8 total verified commands unchanged",
		production.counts.totalExecutableCapabilities,
		41
	);

	resolved = Production.resolve("opacity 80", production);
	assertEq("phase8 opacity command unchanged", resolved.ok, true);
	resolved = Production.resolve("scale 120%", production);
	assertEq("phase8 scale command unchanged", resolved.ok, true);
	resolved = Production.resolve("speed 200%", production);
	assertEq("phase8 speed still rejected", resolved.ok, false);

	browser = Discovery.applyLiveValues(
		Discovery.browse("gaussian blur", catalog),
		{ ok: false, reason: "EFFECT_NOT_FOUND" }
	);
	assertEq("phase8 missing clip values stay empty", browser.applied, false);
	assertEq("phase8 missing values are not invented", browser.parameters[5].currentValue, null);
	assertEq(
		"phase8 empty display is not applied",
		Discovery.displayValue(browser.parameters[5], { applied: false }),
		"Not applied"
	);

	browser = Discovery.applyLiveValues(
		Discovery.browse("gaussian blur", catalog),
		{
			ok: true,
			parameters: [{
				index: 5,
				displayName: "Amount",
				currentValue: 18
			}]
		}
	);
	assertEq("phase8 live amount is shown only when applied", browser.applied, true);
	for (i = 0; i < browser.parameters.length; i++) {
		if (browser.parameters[i].parameterDisplayName === "Amount") {
			assertEq("phase8 live amount uses premiere value", browser.parameters[i].currentValue, 18);
		}
	}

	print("terminal effect discovery: " + ((passed + failed) - startCount) + " assertions");
}());
