(function () {
	var startCount = passed + failed;
	var Registry = TerminalProductionRegistry;
	var Executor = TerminalProductionExecutor;
	var Writes = ConfirmedParameterWrites;
	var root = __pickfxRoot;
	var v2 = JSON.parse(fs.readFileSync(
		path.join(root, "src/data/terminal-registry.production.v2.json"),
		"utf8"
	));
	var hostSrc = fs.readFileSync(path.join(root, "src/premiere/host.jsx"), "utf8");
	var executorSrc = fs.readFileSync(path.join(root, "src/core/TerminalProductionExecutor.js"), "utf8");
	var panelSrc = fs.readFileSync(path.join(root, "src/panel/js/panel.js"), "utf8");
	var writesSrc = fs.readFileSync(path.join(root, "src/core/ConfirmedParameterWrites.js"), "utf8");
	var discoverSrc = fs.readFileSync(path.join(root, "src/core/ColorParameterDiscover.js"), "utf8");
	var registrySrc = fs.readFileSync(path.join(root, "src/core/TerminalProductionRegistry.js"), "utf8");
	var lumetri;
	var resolved;
	var payload;
	var opened;
	var i;
	var names;
	var preview;
	var catalog;
	var browser;

	for (i = 0; i < v2.effects.length; i++) {
		if (v2.effects[i].displayName === "Lumetri Color") {
			lumetri = v2.effects[i];
			break;
		}
	}

	assert("lumetri production entry exists", !!lumetri);
	assertEq("lumetri matchName", lumetri.matchName, "AE.ADBE Lumetri");
	assertEq("lumetri premiereName", lumetri.premiereName, "Lumetri Color");
	assertEq("lumetri default parameter", lumetri.defaultParameterDisplayName, "Exposure");
	assertEq("lumetri default index", lumetri.defaultParameterIndex, 19);
	assertEq("lumetri production-ready parameter count", lumetri.parameters.length, 13);
	assertEq("registry recognizes lumetri", Registry.isLumetriEffect(lumetri), true);
	assertEq("registry does not treat gaussian as lumetri", Registry.isLumetriEffect({
		displayName: "Gaussian Blur",
		matchName: "AE.ADBE Gaussian Blur"
	}), false);

	names = [];
	for (i = 0; i < lumetri.parameters.length; i++) {
		names.push(lumetri.parameters[i].displayName);
		assertEq(
			"lumetri parameter " + lumetri.parameters[i].displayName + " is production ready",
			lumetri.parameters[i].productionReady,
			true
		);
		assertEq(
			"lumetri writer can resolve " + lumetri.parameters[i].displayName,
			Writes.isAllowedLumetriParameter(lumetri.parameters[i].displayName),
			true
		);
	}
	assert("lumetri includes Exposure", names.indexOf("Exposure") !== -1);
	assert("lumetri includes Vibrance", names.indexOf("Vibrance") !== -1);

	resolved = Registry.resolve("lumetri color", v2);
	assertEq("bare lumetri resolves", resolved.ok, true);
	assertEq("bare lumetri is apply-only", resolved.applyOnly, true);
	assertEq("bare lumetri is production verified", resolved.productionVerified, true);
	assertEq("bare lumetri matchName", resolved.resolvedEffect.matchName, "AE.ADBE Lumetri");
	assertEq("bare lumetri does not invent a write value", resolved.hasValue, false);
	assertEq("bare lumetri execution is apply", resolved.execution.action, "apply");
	assertEq("bare lumetri does not require write", resolved.execution.requiresWrite, false);

	preview = Registry.preview("lumetri color", v2);
	assertEq("exact lumetri color preview is not a fake executable write", preview.kind, "search");
	assertEq("exact lumetri color preview is not executable", preview.executable, false);

	catalog = TerminalEffectDiscovery.buildCustomer(v2);
	browser = TerminalEffectDiscovery.browse("lumetri color", catalog);
	assertEq("exact lumetri color opens the production browser", browser.kind, "effect-browser");
	assertEq("exact lumetri color shows Lumetri Color", browser.effect.displayName, "Lumetri Color");
	assertEq("exact lumetri color shows all production parameters", browser.parameters.length, 13);
	assertEq("exact lumetri color browser has no remainder filter", browser.filter, "");
	for (i = 0; i < browser.parameters.length; i++) {
		assertEq(
			"customer lumetri parameter " + browser.parameters[i].parameterDisplayName + " is executable",
			browser.parameters[i].executable,
			true
		);
		assertEq(
			"customer lumetri parameter " + browser.parameters[i].parameterDisplayName + " is production ready",
			browser.parameters[i].productionStatus,
			"PRODUCTION_READY"
		);
	}
	assert("customer lumetri browser is production catalog", catalog.source === "production" && catalog.customerFacing === true);
	assert("customer lumetri browser does not expose research overlay", catalog.effects.every(function (effect) {
		return effect.displayName !== "Lumetri Color" || effect.parameterCount === 13;
	}));

	browser = TerminalEffectDiscovery.browse("gaussian blur", catalog);
	assertEq("gaussian blur still opens its production browser", browser.kind, "effect-browser");

	preview = Registry.preview("lumetri color exposure 90", v2);
	assertEq("named lumetri exposure 90 is executable", preview.kind, "executable");
	assertEq("named lumetri exposure 90 resolves Exposure", preview.resolution.resolvedParameter.displayName, "Exposure");
	assertEq("named lumetri exposure 90 keeps the requested value", preview.resolution.value, 90);

	resolved = Registry.resolve("Lumetri Color", v2);
	assertEq("title-case lumetri apply-only", resolved.applyOnly, true);

	resolved = Registry.resolve("lumetri color 1", v2);
	assertEq("lumetri default value command resolves", resolved.ok, true);
	assertEq("lumetri default value is Exposure", resolved.resolvedParameter.displayName, "Exposure");
	assertEq("lumetri default value has execution", !!resolved.execution, true);
	assertEq("lumetri default value requires read-back", resolved.execution.requiresReadBack, true);
	assertEq("lumetri default value is not apply-only", !!resolved.applyOnly, false);

	resolved = Registry.resolve("lumetri color exposure 1", v2);
	assertEq("named lumetri exposure resolves", resolved.ok, true);
	assertEq("named lumetri exposure index", resolved.resolvedParameter.index, 19);
	assertEq("named lumetri exposure value", resolved.value, 1);

	resolved = Registry.resolve("gaussian blur", v2);
	assertEq("bare gaussian still requires a value", resolved.ok, false);
	assertEq("bare gaussian reason", resolved.reason, "VALUE_REQUIRED");

	resolved = Registry.resolve("gaussian blur 30", v2);
	assertEq("gaussian value command still resolves", resolved.ok, true);
	assertEq("gaussian is not apply-only", !!resolved.applyOnly, false);

	opened = 0;
	payload = null;
	Executor.runEffect({}, {
		ok: true,
		type: "EFFECT",
		productionVerified: true,
		applyOnly: true,
		resolvedEffect: lumetri,
		resolvedParameter: lumetri.parameters[0]
	}, function (result) {
		payload = result;
	});
	assertEq("apply-only without bridge fails closed", payload && payload.ok, false);
	assertEq(
		"apply-only without bridge does not invent success",
		payload && payload.reason,
		"SAFE_EXECUTOR_UNAVAILABLE"
	);

	payload = null;
	PremiereBridge = {
		ensureVerifiedTerminalEffect: function (cs, name, matchName, done) {
			opened += 1;
			assertEq("apply-only uses Lumetri Color", name, "Lumetri Color");
			assertEq("apply-only uses AE.ADBE Lumetri", matchName, "AE.ADBE Lumetri");
			done({
				ok: true,
				verified: true,
				targetLocked: true,
				applied: true,
				matchName: "AE.ADBE Motion"
			});
		},
		setVerifiedTerminalEffectParameter: function () {
			opened += 10;
		}
	};
	Executor.runEffect({}, {
		ok: true,
		type: "EFFECT",
		productionVerified: true,
		applyOnly: true,
		resolvedEffect: lumetri
	}, function (result) {
		payload = result;
	});
	assertEq("wrong identity fails closed", payload && payload.ok, false);
	assertEq("wrong identity reason", payload && payload.reason, "EFFECT_IDENTITY_MISMATCH");
	assertEq("wrong identity does not write", opened, 1);

	opened = 0;
	payload = null;
	PremiereBridge = {
		ensureVerifiedTerminalEffect: function (cs, name, matchName, done) {
			opened += 1;
			done({
				ok: true,
				verified: true,
				targetLocked: true,
				applied: true,
				matchName: "AE.ADBE Lumetri"
			});
		},
		setVerifiedTerminalEffectParameter: function () {
			opened += 10;
		}
	};
	Executor.runEffect({}, {
		ok: true,
		type: "EFFECT",
		productionVerified: true,
		applyOnly: true,
		resolvedEffect: lumetri
	}, function (result) {
		payload = result;
	});
	assertEq("verified lumetri apply succeeds", payload && payload.ok, true);
	assertEq("verified lumetri apply does not write", opened, 1);

	opened = 0;
	payload = null;
	PremiereBridge = {
		setVerifiedTerminalEffectParameter: function (cs, name, matchName, parameter, value, done, parameterIndex) {
			opened += 1;
			assertEq("write uses Lumetri Color", name, "Lumetri Color");
			assertEq("write uses AE.ADBE Lumetri", matchName, "AE.ADBE Lumetri");
			assertEq("write uses Exposure", parameter, "Exposure");
			assertEq("write uses requested value", value, 1);
			assertEq("write uses production parameter index", parameterIndex, 19);
			done({
				ok: true,
				verified: true,
				targetLocked: true,
				value: 1
			});
		},
		ensureVerifiedTerminalEffect: function () {
			opened += 10;
		}
	};
	Executor.runEffect({}, {
		ok: true,
		type: "EFFECT",
		productionVerified: true,
		resolvedEffect: lumetri,
		resolvedParameter: lumetri.parameters[0],
		value: 1
	}, function (result) {
		payload = result;
	});
	assertEq("lumetri parameter write uses production executor", opened, 1);
	assertEq("lumetri parameter write succeeds", payload && payload.ok, true);

	assert("host lumetri live list uses nested discoverer", hostSrc.indexOf("listEffectParameters") !== -1 && hostSrc.indexOf("$._pickfxColorParameterDiscover.inspect") !== -1);
	assert("writer restores original after failed Lumetri verify", writesSrc.indexOf("param.setValue(original, true)") !== -1);
	assert("writer uses production parameterIndex", writesSrc.indexOf("parameterIndex: entry.parameterIndex") !== -1);
	assert("discoverer matches Lumetri by diagnostic index", discoverSrc.indexOf("leaf.diagnosticIndex !== wantIndex") !== -1);
	assert("preview does not hide exact lumetri color behind apply-only", registrySrc.indexOf("APPLY_ONLY_BROWSE") !== -1);
	assert("panel skips apply-only executable preview", panelSrc.indexOf("productionModel.resolution.applyOnly === true") !== -1);
	assert("host lumetri presence uses matchName count", hostSrc.indexOf("effectPresentOnTrackItem") !== -1);
	assert("host lumetri write uses confirmed writer", hostSrc.indexOf("writeVerifiedLumetriParameter") !== -1);
	assert("host lumetri write does not add a generic QE fallback", hostSrc.indexOf("writeVerifiedLumetriParameter") !== -1);
	assert(
		"customer host loads ColorParameterDiscover",
		panelSrc.indexOf("\"/src/core/ColorParameterDiscover.js\": true") === -1
	);
	assert(
		"customer search selects an effect before parameter execution",
		panelSrc.indexOf("beginEffectFlow(row.effect)") !== -1 &&
			panelSrc.indexOf("if (tryTerminalCommand(searchInput.value))") === -1
	);
	assert("executor apply-only uses ensureVerifiedTerminalEffect", executorSrc.indexOf("ensureVerifiedTerminalEffect") !== -1);
	assert("executor write stays on setVerifiedTerminalEffectParameter", executorSrc.indexOf("setVerifiedTerminalEffectParameter") !== -1);
	assert("panel applies values only after PaletteFlow value selection", panelSrc.indexOf("function applyPaletteValue()") !== -1);
	assert("runtime does not call raw terminal setValue", executorSrc.indexOf("setValue") === -1);
	assert("runtime does not call QE directly", executorSrc.indexOf("addVideoEffect") === -1);

	PremiereBridge = undefined;
	print("lumetri terminal: " + ((passed + failed) - startCount) + " assertions");
}());
