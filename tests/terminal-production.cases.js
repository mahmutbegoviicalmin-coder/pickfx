(function () {
	var startCount = passed + failed;
	var Registry = TerminalProductionRegistry;
	var Executor = TerminalProductionExecutor;
	var root = __pickfxRoot;
	var production = JSON.parse(fs.readFileSync(
		path.join(root, "src/data/terminal-registry.production.json"),
		"utf8"
	));
	var ready = JSON.parse(fs.readFileSync(
		path.join(root, "src/data/terminal-registry.production-ready.json"),
		"utf8"
	));
	var capabilityAudit = JSON.parse(fs.readFileSync(
		path.join(root, "src/data/terminal-capability-audit.json"),
		"utf8"
	));
	var validated = Registry.validate(production);
	var rebuilt = Registry.build(ready, capabilityAudit, {
		generatedAt: "test"
	});
	var resolved;
	var preview;
	var searched;
	var storedBridge = typeof PremiereBridge !== "undefined"
		? PremiereBridge : undefined;
	var storedRunClip = CommandExecutor.runClipParameter;
	var storedSetClip = storedBridge && storedBridge.setClipParameter;
	var effectCall = null;
	var effectPayload = null;
	var motionSpec = null;
	var motionPayload = null;
	var shortcutFocus = 0;
	var shortcutDismiss = 0;
	var prevented = 0;
	var stopped = 0;
	var registeredInterest = "";
	var shortcutResult;
	var panelSource = fs.readFileSync(
		path.join(root, "src/panel/js/panel.js"),
		"utf8"
	);
	var htmlSource = fs.readFileSync(
		path.join(root, "src/panel/index.html"),
		"utf8"
	);
	var hostSource = fs.readFileSync(
		path.join(root, "src/premiere/host.jsx"),
		"utf8"
	);
	var registryText = JSON.stringify(production);
	var ids = {};
	var pairKeys = {};
	var i;
	var effect;
	var parameter;

	assertEq("phase7 production registry validates", validated.ok, true);
	assertEq(
		"phase7 production registry effect pair count",
		production.counts.effectParameterPairs,
		36
	);
	assertEq(
		"phase7 production registry motion count",
		production.counts.motionCapabilities,
		5
	);
	assertEq(
		"phase7 total executable capabilities",
		production.counts.totalExecutableCapabilities,
		41
	);
	assertEq("phase7 registry enables verified terminal", production.enabled, true);
	assertEq("phase7 speed registry is empty", production.speed.length, 0);
	assertEq("phase7 transition registry is empty", production.transitions.length, 0);
	assertEq(
		"phase7 evidence records zero production fingerprint changes",
		production.sourceEvidence.productionFingerprintChanges,
		0
	);
	assertEq(
		"phase7 evidence records zero cleanup failures",
		production.sourceEvidence.cleanupFailures,
		0
	);
	assertEq(
		"phase7 generated registry defaults enabled",
		Registry.FEATURE_ENABLED_BY_DEFAULT,
		true
	);
	assertEq(
		"phase7 feature flag defaults on",
		Registry.isFeatureEnabled({
			storage: { getItem: function () { return null; } }
		}),
		true
	);
	assertEq(
		"phase7 explicit kill switch remains available",
		Registry.isFeatureEnabled({
			storage: { getItem: function () { return "false"; } }
		}),
		false
	);

	assertEq("phase7 rebuild succeeds from evidence", rebuilt.ok === false, false);
	assertEq("phase7 rebuilt effect pair count", rebuilt.effects.length, 36);
	assertEq("phase7 rebuilt motion count", rebuilt.capabilities.length, 5);

	for (i = 0; i < production.effects.length; i++) {
		effect = production.effects[i];
		parameter = effect.parameters[0];
		assertEq(
			"phase7 effect has one parameter " + String(i),
			effect.parameters.length,
			1
		);
		assertEq(
			"phase7 effect parameter production status " + String(i),
			parameter.status,
			"PRODUCTION_READY"
		);
		assertEq(
			"phase7 effect readback evidence " + String(i),
			parameter.validationEvidence.readBackVerified,
			true
		);
		assertEq(
			"phase7 effect cleanup evidence " + String(i),
			parameter.validationEvidence.cleanup.ok,
			true
		);
		pairKeys[
			Registry.normalize(effect.matchName || effect.displayName) + "|" +
			String(parameter.index)
		] = true;
	}
	assertEq(
		"phase7 effect pairs are unique",
		Object.keys(pairKeys).length,
		36
	);

	for (i = 0; i < production.capabilities.length; i++) {
		ids[production.capabilities[i].id] = true;
		assertEq(
			"phase7 motion uses confirmed writer " + String(i),
			production.capabilities[i].writerPath,
			"ConfirmedParameterWrites.write"
		);
		assertEq(
			"phase7 motion cleanup verified " + String(i),
			production.capabilities[i].validationEvidence.cleanupVerified,
			true
		);
	}
	assertEq("phase7 opacity promoted", ids["motion.opacity"], true);
	assertEq("phase7 scale promoted", ids["motion.scale"], true);
	assertEq("phase7 position promoted", ids["motion.position"], true);
	assertEq("phase7 rotation promoted", ids["motion.rotation"], true);
	assertEq("phase7 anchor point promoted", ids["motion.anchor-point"], true);
	assertEq("phase7 speed not promoted", ids["clip.speed"], undefined);

	assertEq(
		"phase7 no ambiguous customer entries",
		registryText.indexOf('"status":"AMBIGUOUS"'),
		-1
	);
	assertEq(
		"phase7 no manual review customer entries",
		registryText.indexOf('"status":"MANUAL_REVIEW"'),
		-1
	);
	assertEq(
		"phase7 no unsupported customer entries",
		registryText.indexOf('"status":"UNSUPPORTED"'),
		-1
	);
	assertEq(
		"phase7 no failed customer entries",
		registryText.indexOf('"status":"FAILED"'),
		-1
	);
	assertEq(
		"phase7 no unvalidated customer entries",
		registryText.indexOf('"status":"NOT_VALIDATED"'),
		-1
	);

	resolved = Registry.resolve("gaussian blur 30", production);
	assertEq("phase7 minimal Gaussian Blur resolves", resolved.ok, true);
	assertEq("phase7 Gaussian Blur type", resolved.type, "EFFECT");
	assertEq(
		"phase7 Gaussian Blur default parameter",
		resolved.resolvedParameter.displayName,
		"Amount"
	);
	assertEq("phase7 Gaussian Blur value", resolved.value, 30);

	resolved = Registry.resolve("gaussian blur amount 30", production);
	assertEq("phase7 explicit parameter syntax resolves", resolved.ok, true);
	assertEq(
		"phase7 explicit parameter target",
		resolved.resolvedParameter.displayName,
		"Amount"
	);

	resolved = Registry.resolve("gausian blur 30", production);
	assertEq("phase7 fuzzy verified effect resolves", resolved.ok, true);
	assertEq(
		"phase7 fuzzy resolution stays Gaussian Blur",
		resolved.resolvedEffect.displayName,
		"Gaussian Blur"
	);

	resolved = Registry.resolve("directional 45", production);
	assertEq("phase7 ambiguous effect does not resolve", resolved.ok, false);
	assertEq("phase7 ambiguity reason", resolved.reason, "AMBIGUOUS_EFFECT");
	assertEq(
		"phase7 ambiguity includes verified options",
		resolved.candidates.length > 1,
		true
	);

	resolved = Registry.resolve("opacity 80", production);
	assertEq("phase7 opacity resolves", resolved.ok, true);
	assertEq("phase7 opacity capability", resolved.capabilityId, "motion.opacity");
	assertEq(
		"phase7 opacity writer stays confirmed",
		resolved.execution.writerPath,
		"ConfirmedParameterWrites.write"
	);

	resolved = Registry.resolve("scale 120%", production);
	assertEq("phase7 scale resolves", resolved.ok, true);
	assertEq("phase7 scale value", resolved.value, 120);

	resolved = Registry.resolve("position x 100 y 50", production);
	assertEq("phase7 position resolves", resolved.ok, true);
	assertEq("phase7 position x", resolved.x, 100);
	assertEq("phase7 position y", resolved.y, 50);

	resolved = Registry.resolve("rotation 15", production);
	assertEq("phase7 rotation resolves", resolved.ok, true);

	resolved = Registry.resolve("anchor point x 0.55 y 0.5", production);
	assertEq("phase7 anchor point resolves", resolved.ok, true);

	resolved = Registry.resolve("speed 200%", production);
	assertEq("phase7 speed rejected", resolved.ok, false);
	assertEq(
		"phase7 speed rejected as unpromoted",
		resolved.reason,
		"CAPABILITY_NOT_PROMOTED"
	);

	resolved = Registry.resolve("cross dissolve 20 frames", production);
	assertEq("phase7 transition rejected", resolved.ok, false);

	resolved = Registry.resolve("random unvalidated effect 30", production);
	assertEq("phase7 unvalidated effect rejected", resolved.ok, false);
	assertEq("phase7 arbitrary effect not found", resolved.reason, "EFFECT_NOT_FOUND");

	preview = Registry.preview("gaussian blur 30", production);
	assertEq("phase7 effect preview executable", preview.executable, true);
	assertEq("phase7 effect preview title", preview.title, "Gaussian Blur");
	assertEq("phase7 effect preview detail", preview.detail, "Amount = 30");
	assertEq("phase7 effect preview kind", preview.kindLabel, "Effect");

	preview = Registry.preview("opacity 80", production);
	assertEq("phase7 opacity preview title", preview.title, "Opacity");
	assertEq("phase7 opacity preview detail", preview.detail, "Opacity = 80%");
	assertEq("phase7 opacity preview kind", preview.kindLabel, "Parameter");

	searched = Registry.search("gauss", production);
	assertEq("phase7 partial production search resolves", searched.ok, true);
	assertEq(
		"phase7 partial search result",
		searched.entry.displayName,
		"Gaussian Blur"
	);

	PremiereBridge = {
		setVerifiedTerminalEffectParameter: function (
			csInterface,
			effectName,
			effectMatchName,
			parameterName,
			value,
			done
		) {
			effectCall = {
				effectName: effectName,
				effectMatchName: effectMatchName,
				parameterName: parameterName,
				value: value
			};
			done({
				ok: true,
				verified: true,
				readBack: value,
				targetLocked: true
			});
		}
	};
	resolved = Registry.resolve("gaussian blur 30", production);
	Executor.dispatch({}, resolved, { featureEnabled: true }, function (payload) {
		effectPayload = payload;
	});
	assertEq("phase7 effect safe executor called", effectCall.effectName, "Gaussian Blur");
	assertEq("phase7 effect target parameter", effectCall.parameterName, "Amount");
	assertEq("phase7 effect target lock returned", effectPayload.targetLocked, true);
	assertEq("phase7 effect readback required", effectPayload.verified, true);

	PremiereBridge.setVerifiedTerminalEffectParameter = function (
		csInterface,
		effectName,
		effectMatchName,
		parameterName,
		value,
		done
	) {
		done({ ok: true, verified: false, targetLocked: true });
	};
	Executor.dispatch({}, resolved, { featureEnabled: true }, function (payload) {
		effectPayload = payload;
	});
	assertEq("phase7 unverified effect fails", effectPayload.ok, false);
	assertEq("phase7 unverified effect reason", effectPayload.reason, "VALUE_NOT_VERIFIED");

	PremiereBridge.setVerifiedTerminalEffectParameter = function (
		csInterface,
		effectName,
		effectMatchName,
		parameterName,
		value,
		done
	) {
		done({
			ok: true,
			targetLocked: true,
			clips: [{
				ok: true,
				verified: true,
				actualValue: value
			}]
		});
	};
	Executor.dispatch({}, resolved, { featureEnabled: true }, function (payload) {
		effectPayload = payload;
	});
	assertEq("phase7 clip-verified write is success", effectPayload.ok, true);
	assertEq("phase7 clip-verified write stays verified", effectPayload.verified, true);

	CommandExecutor.runClipParameter = function (csInterface, spec, done) {
		motionSpec = spec;
		done({
			ok: true,
			verified: true,
			readBack: spec.value,
			targetLocked: true
		});
	};
	resolved = Registry.resolve("position x 100 y 50", production);
	Executor.dispatch({}, resolved, { featureEnabled: true }, function (payload) {
		motionPayload = payload;
	});
	assertEq("phase7 motion routes through clip executor", motionSpec.parameterQuery, "Position");
	assertEq(
		"phase7 motion passes exact component match",
		motionSpec.componentMatchName,
		"AE.ADBE Motion"
	);
	assertEq("phase7 motion readback required", motionPayload.verified, true);
	assertEq("phase7 motion target lock reported", motionPayload.targetLocked, true);

	Executor.dispatch({}, resolved, { featureEnabled: false }, function (payload) {
		motionPayload = payload;
	});
	assertEq("phase7 disabled dispatcher fails closed", motionPayload.reason, "FEATURE_DISABLED");

	PremiereBridge = storedBridge;
	CommandExecutor.runClipParameter = storedRunClip;

	storedBridge.setClipParameter = function (csInterface, parameterName, input, expectedType, done) {
		done({
			ok: true,
			verified: true,
			targetLocked: true,
			clipParameter: true,
			parameter: parameterName,
			readBack: 1,
			actualValue: 1
		});
	};
	resolved = Registry.resolve("opacity 1", production);
	Executor.dispatch({}, resolved, { featureEnabled: true }, function (payload) {
		motionPayload = payload;
	});
	assertEq("phase7 opacity apply stays ok", motionPayload && motionPayload.ok, true);
	assertEq("phase7 opacity apply stays verified", motionPayload && motionPayload.verified, true);
	assertEq("phase7 opacity apply locks target", motionPayload && motionPayload.targetLocked, true);
	if (storedSetClip) {
		storedBridge.setClipParameter = storedSetClip;
	}

	shortcutResult = TerminalKeyboardShortcut.handle({
		key: " ",
		keyCode: 32,
		metaKey: true,
		ctrlKey: false,
		altKey: false,
		shiftKey: false,
		preventDefault: function () { prevented += 1; },
		stopPropagation: function () { stopped += 1; }
	}, "MacIntel", {
		focusAndSelect: function () { shortcutFocus += 1; }
	});
	assertEq("phase7 mac shortcut handled", shortcutResult.handled, true);
	assertEq("phase7 mac shortcut focuses and selects", shortcutFocus, 1);

	shortcutResult = TerminalKeyboardShortcut.handle({
		key: " ",
		keyCode: 32,
		metaKey: false,
		ctrlKey: true,
		altKey: false,
		shiftKey: false,
		preventDefault: function () { prevented += 1; },
		stopPropagation: function () { stopped += 1; }
	}, "Win32", {
		focusAndSelect: function () { shortcutFocus += 1; }
	});
	assertEq("phase7 Windows shortcut handled", shortcutResult.handled, true);
	assertEq("phase7 Windows shortcut focuses and selects", shortcutFocus, 2);

	shortcutResult = TerminalKeyboardShortcut.handle({
		key: "Escape",
		code: "Escape",
		preventDefault: function () { prevented += 1; }
	}, "MacIntel", {
		dismiss: function () { shortcutDismiss += 1; }
	});
	assertEq("phase7 Escape is not stolen by the shortcut module", shortcutResult.handled, false);
	assertEq("phase7 Escape is owned by the palette", shortcutDismiss, 0);
	assertEq("phase7 shortcut prevents browser default", prevented, 2);
	assertEq("phase7 palette Escape action", PaletteKeyboard.actionFor({
		key: "Escape",
		code: "Escape"
	}, "search"), "ESCAPE");
	assertEq("phase7 shortcut stops Space propagation", stopped, 2);

	TerminalKeyboardShortcut.register({
		getOSInformation: function () { return "Mac OS X"; },
		registerKeyEventsInterest: function (value) {
			registeredInterest = value;
		}
	}, { palette: true, panelFocus: true, launcher: false });
	assertEq(
		"phase7 CEP key interest registers palette plus Cmd+Space",
		JSON.parse(registeredInterest).length >= 8,
		true
	);
	assert("phase7 CEP key interest includes Mac arrow down 125", registeredInterest.indexOf('"keyCode":125') !== -1);
	assert("phase7 CEP key interest includes Mac Return 36", registeredInterest.indexOf('"keyCode":36') !== -1);
	assert("phase7 CEP key interest does not use JS arrow down 40", registeredInterest.indexOf('"keyCode":40') === -1);
	assertEq(
		"phase7 shortcut scope is not falsely global",
		TerminalKeyboardShortcut.SCOPE,
		"FOCUSED_CEP_PANEL_ONLY"
	);

	assertEq(
		"phase7 panel loads production registry",
		panelSource.indexOf("terminal-registry.production.json") >= 0,
		true
	);
	assertEq(
		"effect search Enter does not execute terminal syntax",
		panelSource.indexOf("if (tryTerminalCommand(searchInput.value))") >= 0,
		false
	);
	assertEq(
		"phase7 panel selects existing shortcut text",
		panelSource.indexOf("focusSearch(true)") >= 0,
		true
	);
	assertEq(
		"phase7 panel implements Escape dismissal",
		panelSource.indexOf("dismissTerminal();") >= 0,
		true
	);
	assertEq(
		"phase7 existing effect index remains loaded",
		panelSource.indexOf("EffectRegistry.loadFromNames") >= 0,
		true
	);
	assertEq(
		"phase7 panel loads production modules before app",
		htmlSource.indexOf("TerminalProductionRegistry.js") >= 0 &&
			htmlSource.indexOf("TerminalProductionExecutor.js") >= 0 &&
			htmlSource.indexOf("TerminalKeyboardShortcut.js") >= 0,
		true
	);
	assertEq(
		"phase7 panel finishes apply without reloading host",
		panelSource.indexOf("isHostEvalFailure") === -1 &&
			panelSource.indexOf("dispatchTerminalCommand(resolution, true)") === -1,
		true
	);
	assertEq(
		"phase7 host locks exact selected targets",
		hostSource.indexOf("setVerifiedTerminalEffectParameter") >= 0 &&
			hostSource.indexOf("targetLocked = true") >= 0,
		true
	);
	assertEq(
		"phase7 host confirms applied values after write",
		hostSource.indexOf("confirmVerifiedTerminalEffectParameter") >= 0 &&
			hostSource.indexOf("compactTerminalWriteResult") >= 0 &&
			hostSource.indexOf("readTerminalParameterValue") >= 0 &&
			hostSource.indexOf("readClipParameterValue") >= 0,
		true
	);
	assertEq(
		"phase7 host maps Gaussian Blur Amount to Blurriness",
		hostSource.indexOf("terminalParameterAliases") >= 0 &&
			hostSource.indexOf("Blurriness") >= 0,
		true
	);
	assertEq(
		"phase7 host rejects duplicate effect instances",
		hostSource.indexOf("AMBIGUOUS_EFFECT_INSTANCE") >= 0,
		true
	);
	assertEq(
		"phase7 host Motion forwards component identity",
		hostSource.indexOf("input && input.componentMatchName") >= 0,
		true
	);

	print("terminal production: " + ((passed + failed) - startCount) + " assertions");
}());
