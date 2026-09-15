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
	var v1 = JSON.parse(fs.readFileSync(
		path.join(root, "src/data/terminal-registry.production.json"),
		"utf8"
	));
	var v2 = JSON.parse(fs.readFileSync(
		path.join(root, "src/data/terminal-registry.production.v2.json"),
		"utf8"
	));
	var catalog = Discovery.buildCustomer(v2);
	var overlay = Discovery.build(research, v2, { effects: [] });
	var panelSource = fs.readFileSync(
		path.join(root, "src/panel/js/panel.js"),
		"utf8"
	);
	var browser;
	var names;
	var labels;
	var lumetri;
	var lumetriReady;
	var researchOnly;
	var productionNames = {};
	var i;
	var j;
	var effect;
	var resolved;
	var guard;
	var dispatched = 0;
	var storedBridge = typeof PremiereBridge !== "undefined" ? PremiereBridge : undefined;
	var forbidden = [
		"Not validated",
		"Manual review",
		"Enum review",
		"Failed",
		"Unsupported",
		"Ambiguous",
		"Research"
	];

	assertEq("phase9 customer catalog builds from production only", catalog.ok, true);
	assertEq("phase9 customer catalog is customer-facing", catalog.customerFacing, true);
	assertEq("phase9 customer catalog source is production", catalog.source, "production");
	assertEq("phase9 customer catalog helper agrees", Discovery.isCustomerCatalog(catalog), true);
	assertEq("phase9 research overlay remains available internally", overlay.ok, true);
	assertEq("phase9 research overlay is not customer-facing", Discovery.isCustomerCatalog(overlay), false);
	assert("phase9 customer catalog does not keep the research parameter volume", catalog.counts.displayedParameters < overlay.counts.displayedParameters);
	assertEq("phase9 customer displayed equals executable", catalog.counts.displayedParameters, catalog.counts.executableParameters);
	assertEq("phase9 customer executable pair count", catalog.counts.executableParameters, 135);
	assertEq("phase9 customer searchable effects", catalog.counts.searchableEffects, v2.effects.length);
	assertEq("phase9 customer motion capabilities", catalog.counts.motionCapabilities, 5);
	assertEq("phase9 customer read-only parameters", catalog.counts.readOnlyParameters, 0);
	assertEq("phase9 customer speed list empty", catalog.speed.length, 0);
	assertEq("phase9 customer transition list empty", catalog.transitions.length, 0);
	assertEq("phase9 production registry was not rewritten", v2.counts.effectParameterPairs, 135);
	assertEq("phase9 previous production registry remains 36", v1.counts.effectParameterPairs, 36);

	for (i = 0; i < v2.effects.length; i++) {
		productionNames[Discovery.normalize(v2.effects[i].displayName)] = true;
	}

	researchOnly = null;
	for (i = 0; i < research.effects.length; i++) {
		if (Discovery.normalize(research.effects[i].displayName) === "auto reframe" ||
				Discovery.normalize(research.effects[i].displayName) === "video limiter" ||
				Discovery.normalize(research.effects[i].displayName) === "vr plane to sphere") {
			if (!productionNames[Discovery.normalize(research.effects[i].displayName)]) {
				researchOnly = research.effects[i];
				break;
			}
		}
	}
	if (!researchOnly) {
		for (i = 0; i < research.effects.length; i++) {
			if (!productionNames[Discovery.normalize(research.effects[i].displayName)] &&
					Discovery.normalize(research.effects[i].displayName).indexOf("vr ") === 0) {
				researchOnly = research.effects[i];
				break;
			}
		}
	}
	assert("phase9 found a research-only effect to hide", !!researchOnly);

	assert("phase9 customer search never calls build(research)", panelSource.indexOf("TerminalEffectDiscovery.buildCustomer(") !== -1);
	assert("phase9 customer catalog is not built from terminalRegistry", panelSource.indexOf("buildCustomer(\n\t\t\tproductionTerminalRegistry") !== -1 || panelSource.indexOf("buildCustomer(\n\t\tproductionTerminalRegistry") !== -1 || panelSource.indexOf("buildCustomer(productionTerminalRegistry)") !== -1);
	assert("phase9 panel no longer overlays research into the customer catalog", panelSource.indexOf("TerminalEffectDiscovery.build(\n\t\t\tterminalRegistry") === -1);
	assert("phase9 panel does not pass generated research registry to customer catalog", panelSource.indexOf("buildCustomer(terminalRegistry") === -1);

	browser = Discovery.browse("gaussian blur", catalog);
	assertEq("phase9 gaussian blur is effect browser", browser.kind, "effect-browser");
	assertEq("phase9 gaussian blur name", browser.effect.displayName, "Gaussian Blur");
	assertEq("phase9 gaussian blur shows only production parameters", browser.parameters.length, 5);
	names = [];
	labels = [];
	for (i = 0; i < browser.parameters.length; i++) {
		names.push(browser.parameters[i].parameterDisplayName);
		labels.push(browser.parameters[i].kindLabel);
		assertEq("phase9 gaussian param executable " + names[i], browser.parameters[i].executable, true);
		assertEq("phase9 gaussian param production " + names[i], browser.parameters[i].productionStatus, "PRODUCTION_READY");
	}
	assertEq("phase9 gaussian first parameter is default Amount", names[0], "Amount");
	assertEq("phase9 gaussian second parameter is Seed", names[1], "Seed");
	assertEq("phase9 gaussian third parameter is Angle", names[2], "Angle");
	assertEq("phase9 gaussian fourth parameter is Thickness", names[3], "Thickness");
	assertEq("phase9 gaussian fifth parameter is Chromatic Aberration", names[4], "Chromatic Aberration");
	assertEq(
		"phase9 gaussian does not show Edge Behavior",
		names.indexOf("Edge Behavior"),
		-1
	);
	for (i = 0; i < forbidden.length; i++) {
		assertEq("phase9 gaussian has no " + forbidden[i] + " label", labels.indexOf(forbidden[i]), -1);
	}

	browser = Discovery.browse("gaussian blur edge behavior", catalog);
	assertEq("phase9 edge behavior is invisible", browser.ok, false);
	assertEq("phase9 edge behavior kind", browser.kind, "not-found");
	assertEq("phase9 edge behavior reason", browser.reason, "PARAMETER_NOT_FOUND");
	assertEq("phase9 edge behavior status", browser.status, "No executable parameter found.");

	browser = Discovery.browse(researchOnly.displayName, catalog);
	assertEq("phase9 research-only effect is invisible", browser.kind, "not-found");
	assertEq("phase9 research-only effect status", browser.status, "No result.");

	browser = Discovery.browse("sharpen", catalog);
	assertEq("phase9 unique production effect still resolves", browser.kind, "effect-browser");
	assertEq("phase9 unique production stays Sharpen", browser.effect.displayName, "Sharpen");

	browser = Discovery.browse("gausian blur", catalog);
	assert("phase9 ambiguous production blurs stay production-only", browser.kind === "choices" || browser.kind === "effect-browser");
	if (browser.kind === "choices") {
		assert("phase9 ambiguous choices are production effects", browser.candidates.every(function (candidate) {
			return !!productionNames[Discovery.normalize(candidate.displayName)];
		}));
	}

	browser = Discovery.browse("auto reframe", catalog);
	assertEq("phase9 fuzzy search cannot resolve a research-only effect", browser.kind, "not-found");

	lumetri = null;
	for (i = 0; i < v2.effects.length; i++) {
		if (Discovery.normalize(v2.effects[i].displayName) === "lumetri color") {
			lumetri = v2.effects[i];
		}
	}
	lumetriReady = lumetri ? lumetri.parameters.length : 0;
	browser = Discovery.browse("lumetri color", catalog);
	if (lumetriReady) {
		assertEq("phase9 lumetri is visible only because it has production rows", browser.kind, "effect-browser");
		assertEq("phase9 lumetri shows only production-ready rows", browser.parameters.length, lumetriReady);
		assert("phase9 lumetri hides the 130 research parameters", browser.parameters.length < 130);
	} else {
		assertEq("phase9 lumetri with zero production rows is hidden", browser.kind, "not-found");
	}

	browser = Discovery.browse("opacity", catalog);
	assertEq("phase9 opacity remains visible", browser.kind, "motion-browser");
	assertEq("phase9 opacity remains executable", browser.parameters[0].executable, true);
	browser = Discovery.browse("scale", catalog);
	assertEq("phase9 scale remains visible", browser.kind, "motion-browser");
	browser = Discovery.browse("position", catalog);
	assertEq("phase9 position remains visible", browser.kind, "motion-browser");
	browser = Discovery.browse("rotation", catalog);
	assertEq("phase9 rotation remains visible", browser.kind, "motion-browser");
	browser = Discovery.browse("anchor point", catalog);
	assertEq("phase9 anchor point remains visible", browser.kind, "motion-browser");

	browser = Discovery.browse("speed", catalog);
	assert("phase9 speed is invisible", browser.kind === "not-found" || browser.kind === "unavailable");
	browser = Discovery.browse("cross dissolve", catalog);
	assert("phase9 transitions are invisible", browser.kind === "not-found" || browser.kind === "unavailable");

	for (i = 0; i < catalog.effects.length; i++) {
		effect = catalog.effects[i];
		assert("phase9 customer effect has parameters " + effect.displayName, effect.parameters.length > 0);
		for (j = 0; j < effect.parameters.length; j++) {
			assertEq(
				"phase9 every visible parameter is executable " + effect.displayName,
				effect.parameters[j].executable,
				true
			);
			assertEq(
				"phase9 every visible parameter is a Parameter/Toggle " + effect.displayName,
				effect.parameters[j].kindLabel === "Parameter" ||
					effect.parameters[j].kindLabel === "Toggle",
				true
			);
			for (var k = 0; k < forbidden.length; k++) {
				assert(
					"phase9 no forbidden customer label " + forbidden[k],
					effect.parameters[j].kindLabel !== forbidden[k]
				);
			}
		}
	}

	for (i = 0; i < v1.effects.length; i++) {
		resolved = Production.resolve(
			Production.normalize(v1.effects[i].displayName) + " " +
				String(v1.effects[i].parameters[0].validationEvidence.requestedValue),
			v2
		);
		assertEq("phase9 retained command still works " + v1.effects[i].displayName, resolved.ok, true);
	}

	resolved = Production.resolve("gaussian blur seed 10", v2);
	assertEq("phase9 newly promoted seed command works", resolved.ok, true);
	assertEq("phase9 seed command parameter", resolved.resolvedParameter.displayName, "Seed");
	resolved = Production.resolve("gaussian blur angle 15", v2);
	assertEq("phase9 newly promoted angle command works", resolved.ok, true);
	resolved = Production.resolve("opacity 80", v2);
	assertEq("phase9 motion command still works", resolved.ok, true);
	resolved = Production.resolve("speed 200%", v2);
	assertEq("phase9 speed cannot execute", resolved.ok, false);
	resolved = Production.resolve("cross dissolve 20 frames", v2);
	assertEq("phase9 transition cannot execute", resolved.ok, false);
	resolved = Production.resolve("gaussian blur edge behavior 1", v2);
	assertEq("phase9 non-production command cannot execute", resolved.ok, false);

	guard = Discovery.writeGuard(
		"gaussian blur seed 10",
		catalog,
		Production.resolve("gaussian blur seed 10", v2)
	);
	assertEq("phase9 production command remains executable", guard.allow, true);

	guard = Discovery.writeGuard(
		"gaussian blur edge behavior 1",
		catalog,
		Production.resolve("gaussian blur edge behavior 1", v2)
	);
	assertEq("phase9 non-production command is rejected", guard.allow, false);
	assertEq("phase9 non-production command does not fall through", guard.fallthrough, false);
	assert("phase9 non-production command uses customer copy", guard.status === "No executable parameter found.");

	PremiereBridge = {
		setVerifiedTerminalEffectParameter: function () {
			dispatched += 1;
		}
	};
	if (guard.allow) {
		Executor.dispatch({}, guard.resolution, { featureEnabled: true }, function () {});
	}
	assertEq("phase9 executor is not called outside production registry", dispatched, 0);
	PremiereBridge = storedBridge;

	browser = Discovery.applyLiveValues(
		Discovery.browse("gaussian blur", catalog),
		{ ok: false, reason: "EFFECT_NOT_FOUND" }
	);
	assertEq("phase9 unapplied values stay empty", browser.applied, false);
	assertEq(
		"phase9 unapplied display is Not applied",
		Discovery.displayValue(browser.parameters[0], { applied: false }),
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
	assertEq("phase9 applied amount uses live value", browser.applied, true);
	for (i = 0; i < browser.parameters.length; i++) {
		if (browser.parameters[i].parameterDisplayName === "Amount") {
			assertEq("phase9 live amount is 18", browser.parameters[i].currentValue, 18);
		}
	}

	assert("phase9 panel customer empty copy exists", panelSource.indexOf("No executable parameter found.") !== -1);
	assert("phase9 panel customer no-result copy exists", panelSource.indexOf("No result.") !== -1);
	assert("phase9 panel still keeps research registry loader for internal tools", panelSource.indexOf("terminal-registry.generated.json") !== -1 || panelSource.indexOf("loadTerminalRegistry") !== -1);

	print("terminal customer catalog: " + ((passed + failed) - startCount) + " assertions");
}());
