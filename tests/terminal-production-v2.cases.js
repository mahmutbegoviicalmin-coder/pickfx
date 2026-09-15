(function () {
	var startCount = passed + failed;
	var Registry = TerminalProductionRegistry;
	var Discovery = TerminalEffectDiscovery;
	var Executor = TerminalProductionExecutor;
	var Pipeline = TerminalPromotionPipeline;
	var root = __pickfxRoot;
	var existing = JSON.parse(fs.readFileSync(
		path.join(root, "src/data/terminal-registry.production.json"),
		"utf8"
	));
	var validation = JSON.parse(fs.readFileSync(
		path.join(root, "src/data/terminal-registry.validation-results.json"),
		"utf8"
	));
	var research = JSON.parse(fs.readFileSync(
		path.join(root, "src/data/terminal-registry.generated.json"),
		"utf8"
	));
	var readiness = JSON.parse(fs.readFileSync(
		path.join(root, "src/data/terminal-registry.production-readiness-audit.json"),
		"utf8"
	));
	var v2 = JSON.parse(fs.readFileSync(
		path.join(root, "src/data/terminal-registry.production.v2.json"),
		"utf8"
	));
	var audit = JSON.parse(fs.readFileSync(
		path.join(root, "src/data/terminal-registry.production-v2-audit.json"),
		"utf8"
	));
	var built = Registry.buildV2(existing, validation, {
		generatedAt: "2026-08-23T02:35:00.000Z"
	});
	var validated = Registry.validate(v2);
	var catalog = Discovery.build(research, v2, readiness);
	var v2Text = JSON.stringify(v2);
	var existingKeys = {};
	var v2Keys = {};
	var promotedRows = [];
	var rejectedByStatus = {};
	var gaussian = [];
	var browser;
	var resolved;
	var preview;
	var effect;
	var parameter;
	var row;
	var key;
	var i;
	var j;
	var command;
	var storedBridge = typeof PremiereBridge !== "undefined" ? PremiereBridge : undefined;
	var effectCall = null;
	var effectPayload = null;
	var dispatched = 0;
	var fixture;
	var pipelineResult = null;

	assertEq("phase8 v2 build succeeds", built.ok, true);
	assertEq("phase8 v2 artifact validates", validated.ok, true);
	assertEq("phase8 v2 registry version", v2.registryVersion, 2);
	assertEq("phase8 v2 schema version", v2.schemaVersion, 1);
	assertEq("phase8 v2 artifact type", v2.artifactType, "pickfx-terminal-production-registry");
	assertEq("phase8 v2 enabled", v2.enabled, true);
	assertEq("phase8 previous production remains 36 pairs", existing.counts.effectParameterPairs, 36);
	assertEq("phase8 previous production remains 41 executable", existing.counts.totalExecutableCapabilities, 41);
	assertEq("phase8 previous production still validates as v1", Registry.validate(existing).ok, true);
	assertEq("phase8 v1 is not treated as v2", Registry.isV2Registry(existing), false);
	assertEq("phase8 v2 is treated as v2", Registry.isV2Registry(v2), true);

	for (i = 0; i < existing.effects.length; i++) {
		effect = existing.effects[i];
		for (j = 0; j < effect.parameters.length; j++) {
			parameter = effect.parameters[j];
			existingKeys[Registry.pairIdentityKey(effect.matchName, parameter.index)] = {
				effectDisplayName: effect.displayName,
				parameterDisplayName: parameter.displayName,
				parameterIndex: parameter.index
			};
		}
	}
	assertEq("phase8 previous identity count", Object.keys(existingKeys).length, 36);

	for (i = 0; i < v2.effects.length; i++) {
		effect = v2.effects[i];
		assertEq("phase8 v2 effect production ready " + effect.displayName, effect.productionReady, true);
		assert("phase8 v2 effect has parameters " + effect.displayName, effect.parameters.length > 0);
		for (j = 0; j < effect.parameters.length; j++) {
			parameter = effect.parameters[j];
			key = Registry.pairIdentityKey(effect.matchName, parameter.index);
			assertEq("phase8 v2 pair unique " + key, !!v2Keys[key], false);
			v2Keys[key] = {
				effectDisplayName: effect.displayName,
				effectMatchName: effect.matchName,
				parameterDisplayName: parameter.displayName,
				parameterIndex: parameter.index
			};
			assertEq("phase8 v2 parameter status " + key, parameter.status, "PRODUCTION_READY");
			assertEq("phase8 v2 parameter evidence " + key, Registry.evidenceIsProductionReady(parameter), true);
		}
	}

	for (i = 0; i < validation.results.length; i++) {
		row = validation.results[i];
		if (row.status === "PRODUCTION_READY") {
			promotedRows.push(row);
			if (row.promoted === true) {
				rejectedByStatus.NEWLY_PROMOTED =
					(rejectedByStatus.NEWLY_PROMOTED || 0) + 1;
			} else {
				rejectedByStatus.ALREADY_PRODUCTION_READY =
					(rejectedByStatus.ALREADY_PRODUCTION_READY || 0) + 1;
			}
		} else {
			rejectedByStatus[row.status] = (rejectedByStatus[row.status] || 0) + 1;
		}
	}

	assertEq("phase8 validation production-ready rows", promotedRows.length, 121);
	assertEq("phase8 newly promoted live rows", rejectedByStatus.NEWLY_PROMOTED, 100);
	assertEq("phase8 already-production-ready live rows", rejectedByStatus.ALREADY_PRODUCTION_READY, 21);
	assertEq("phase8 failed rows excluded from promotion set", rejectedByStatus.FAILED, 31);
	assertEq("phase8 manual-review rows excluded from promotion set", rejectedByStatus.MANUAL_REVIEW, 48);
	assertEq("phase8 enum-review rows excluded from promotion set", rejectedByStatus.ENUM_REVIEW, 24);
	assertEq("phase8 previous production count", audit.previousProductionCount, 36);
	assertEq("phase8 newly promoted count", audit.newlyPromotedCount, 99);
	assertEq("phase8 final production count", audit.finalProductionCount, 135);
	assertEq("phase8 v2 pair count", v2.counts.effectParameterPairs, 135);
	assertEq("phase8 v2 motion count", v2.counts.motionCapabilities, 5);
	assertEq("phase8 v2 total executable", v2.counts.totalExecutableCapabilities, 140);
	assertEq("phase8 retained capability count", audit.exactRetainedCapabilities.length, 36);
	assertEq("phase8 added capability count", audit.exactAddedCapabilities.length, 99);
	assertEq("phase8 duplicate canonical kept", audit.duplicateHandling.keptCanonicalFromExistingRegistry, 1);
	assertEq("phase8 identity key is match plus index", audit.duplicateHandling.key, "componentMatchName+parameterIndex");
	assertEq("phase8 display-name-only dedupe ignored", audit.duplicateHandling.displayNameOnlyIgnored, true);

	for (key in existingKeys) {
		if (existingKeys.hasOwnProperty(key)) {
			assert("phase8 retained existing identity " + key, !!v2Keys[key]);
			assertEq(
				"phase8 retained display name " + key,
				v2Keys[key].parameterDisplayName,
				existingKeys[key].parameterDisplayName
			);
		}
	}

	for (i = 0; i < promotedRows.length; i++) {
		row = promotedRows[i];
		key = Registry.pairIdentityKey(row.effectMatchName, row.parameterIndex);
		assert("phase8 promoted identity present " + key, !!v2Keys[key]);
	}

	assertEq("phase8 failed rows not in v2 text", v2Text.indexOf('"status":"FAILED"'), -1);
	assertEq("phase8 manual rows not in v2 text", v2Text.indexOf('"status":"MANUAL_REVIEW"'), -1);
	assertEq("phase8 enum rows not in v2 text", v2Text.indexOf('"status":"ENUM_REVIEW"'), -1);
	assertEq("phase8 ambiguous rows not in v2 text", v2Text.indexOf('"status":"AMBIGUOUS"'), -1);
	assertEq("phase8 unsupported rows not in v2 text", v2Text.indexOf('"status":"UNSUPPORTED"'), -1);
	assertEq("phase8 v2 speed empty", v2.speed.length, 0);
	assertEq("phase8 v2 transitions empty", v2.transitions.length, 0);

	for (i = 0; i < v2.effects.length; i++) {
		if (Registry.normalize(v2.effects[i].displayName) === "gaussian blur") {
			gaussian = v2.effects[i];
		}
	}
	assertEq("phase8 gaussian match name retained", gaussian.matchName, "AE.Impact_Blur_FX");
	assertEq("phase8 gaussian default index retained", gaussian.defaultParameterIndex, 5);
	assertEq("phase8 gaussian default name retained", gaussian.defaultParameterDisplayName, "Amount");
	assertEq("phase8 gaussian promoted parameter count", gaussian.parameters.length, 5);
	assertEq("phase8 gaussian seed index", gaussian.parameters[0].index, 3);
	assertEq("phase8 gaussian seed name", gaussian.parameters[0].displayName, "Seed");
	assertEq("phase8 gaussian angle index", gaussian.parameters[1].index, 4);
	assertEq("phase8 gaussian angle name", gaussian.parameters[1].displayName, "Angle");
	assertEq("phase8 gaussian amount index", gaussian.parameters[2].index, 5);
	assertEq("phase8 gaussian amount name", gaussian.parameters[2].displayName, "Amount");
	assertEq("phase8 gaussian thickness index", gaussian.parameters[3].index, 6);
	assertEq("phase8 gaussian thickness name", gaussian.parameters[3].displayName, "Thickness");
	assertEq("phase8 gaussian chromatic index", gaussian.parameters[4].index, 8);
	assertEq("phase8 gaussian chromatic name", gaussian.parameters[4].displayName, "Chromatic Aberration");

	resolved = Registry.resolve("gaussian blur 30", v2);
	assertEq("phase8 gaussian blur 30 resolves", resolved.ok, true);
	assertEq("phase8 gaussian blur 30 parameter", resolved.resolvedParameter.displayName, "Amount");
	assertEq("phase8 gaussian blur 30 index", resolved.resolvedParameter.index, 5);
	assertEq("phase8 gaussian blur 30 match", resolved.resolvedEffect.matchName, "AE.Impact_Blur_FX");

	resolved = Registry.resolve("gaussian blur seed 12", v2);
	assertEq("phase8 gaussian blur seed resolves", resolved.ok, true);
	assertEq("phase8 gaussian blur seed parameter", resolved.resolvedParameter.displayName, "Seed");
	assertEq("phase8 gaussian blur seed index", resolved.resolvedParameter.index, 3);
	assertEq("phase8 gaussian blur seed value", resolved.value, 12);

	resolved = Registry.resolve("gaussian blur angle 45", v2);
	assertEq("phase8 gaussian blur angle resolves", resolved.ok, true);
	assertEq("phase8 gaussian blur angle parameter", resolved.resolvedParameter.displayName, "Angle");
	assertEq("phase8 gaussian blur angle index", resolved.resolvedParameter.index, 4);

	resolved = Registry.resolve("gaussian blur thickness 20", v2);
	assertEq("phase8 gaussian blur thickness resolves", resolved.ok, true);
	assertEq("phase8 gaussian blur thickness parameter", resolved.resolvedParameter.displayName, "Thickness");
	assertEq("phase8 gaussian blur thickness index", resolved.resolvedParameter.index, 6);

	resolved = Registry.resolve("gaussian blur chromatic aberration 10", v2);
	assertEq("phase8 gaussian blur chromatic resolves", resolved.ok, true);
	assertEq("phase8 gaussian blur chromatic parameter", resolved.resolvedParameter.displayName, "Chromatic Aberration");
	assertEq("phase8 gaussian blur chromatic index", resolved.resolvedParameter.index, 8);

	resolved = Registry.resolve("gaussian blur edge behavior 1", v2);
	assertEq("phase8 gaussian blur edge behavior rejected", resolved.ok, false);
	assert(
		"phase8 gaussian blur edge behavior stays out of production execution",
		resolved.reason === "PARAMETER_NOT_PROMOTED" ||
			resolved.reason === "PARAMETER_NOT_FOUND"
	);

	resolved = Registry.resolve("speed 200%", v2);
	assertEq("phase8 speed still rejected", resolved.ok, false);
	resolved = Registry.resolve("cross dissolve 20 frames", v2);
	assertEq("phase8 transitions still rejected", resolved.ok, false);

	for (i = 0; i < existing.effects.length; i++) {
		effect = existing.effects[i];
		parameter = effect.parameters[0];
		command = Registry.normalize(effect.displayName) + " " +
			String(parameter.validationEvidence.requestedValue);
		resolved = Registry.resolve(command, v2);
		assertEq("phase8 retained command resolves " + command, resolved.ok, true);
		assertEq(
			"phase8 retained command parameter " + command,
			resolved.ok ? resolved.resolvedParameter.displayName : "",
			parameter.displayName
		);
		assertEq(
			"phase8 retained command index " + command,
			resolved.ok ? resolved.resolvedParameter.index : -1,
			parameter.index
		);
		assertEq(
			"phase8 retained command readback required " + command,
			resolved.ok ? resolved.execution.requiresReadBack : false,
			true
		);
		assertEq(
			"phase8 retained command target lock required " + command,
			resolved.ok ? resolved.execution.targetLockRequired : false,
			true
		);
	}

	resolved = Registry.resolve("opacity 80", v2);
	assertEq("phase8 opacity still resolves", resolved.ok, true);
	assertEq("phase8 opacity capability", resolved.capabilityId, "motion.opacity");
	resolved = Registry.resolve("scale 120%", v2);
	assertEq("phase8 scale still resolves", resolved.ok, true);
	resolved = Registry.resolve("position x 100 y 50", v2);
	assertEq("phase8 position still resolves", resolved.ok, true);
	resolved = Registry.resolve("rotation 15", v2);
	assertEq("phase8 rotation still resolves", resolved.ok, true);
	resolved = Registry.resolve("anchor point x 0.55 y 0.5", v2);
	assertEq("phase8 anchor point still resolves", resolved.ok, true);

	assertEq("phase8 discovery catalog builds from v2", catalog.ok, true);
	assertEq("phase8 discovery still lists all research parameters", catalog.counts.displayedParameters, 2434);
	assertEq("phase8 discovery executable count", catalog.counts.executableParameters, 135);
	assertEq("phase8 discovery motion unchanged", catalog.counts.motionCapabilities, 5);

	browser = Discovery.browse("gaussian blur", catalog);
	assertEq("phase8 discovery still shows all gaussian parameters", browser.parameters.length, 20);
	var executableGaussian = 0;
	var seed;
	var edge;
	for (i = 0; i < browser.parameters.length; i++) {
		if (browser.parameters[i].executable) {
			executableGaussian += 1;
		}
		if (browser.parameters[i].parameterDisplayName === "Seed") {
			seed = browser.parameters[i];
		}
		if (browser.parameters[i].parameterDisplayName === "Edge Behavior") {
			edge = browser.parameters[i];
		}
	}
	assertEq("phase8 discovery gaussian executable count", executableGaussian, 5);
	assertEq("phase8 discovery seed executable", seed.executable, true);
	assertEq("phase8 discovery seed kind", seed.kindLabel, "Parameter");
	assertEq("phase8 discovery edge remains locked", edge.executable, false);
	assert("phase8 discovery edge is not a production parameter", edge.kindLabel !== "Parameter");
	assertEq("phase8 discovery edge stays read-only", edge.writable, false);

	assertEq(
		"phase8 customer flag key",
		Registry.FEATURE_FLAG_KEY,
		"pickfx.terminalResolver.enabled"
	);
	assertEq("phase8 customer flag default remains explicit activation", Registry.FEATURE_ENABLED_BY_DEFAULT, true);
	assertEq(
		"phase8 customer flag true when unset",
		Registry.isFeatureEnabled({
			storage: { getItem: function () { return null; } }
		}),
		true
	);
	assertEq(
		"phase8 customer kill switch still works",
		Registry.isFeatureEnabled({
			storage: { getItem: function () { return "false"; } }
		}),
		false
	);
	assertEq(
		"phase8 validation artifact header never enables customer flag",
		validation.productionFeatureFlagEnabled,
		false
	);
	assertEq(
		"phase8 pipeline artifact header stays off",
		Pipeline.buildResultsArtifact({
			artifactType: "pickfx-terminal-registry-validation-priority",
			modelVersion: "test",
			candidateCount: 0,
			candidates: []
		}, [], {}).productionFeatureFlagEnabled,
		false
	);

	pipelineResult = null;
	Pipeline.run({
		live: false,
		registry: { effects: [] },
		productionFeatureEnabled: true,
		now: function () { return "2026-08-23T02:35:00.000Z"; }
	}, function (payload) {
		pipelineResult = payload;
	});
	assertEq("phase8 classified run records customer flag separately", pipelineResult.productionFeatureFlagEnabled, true);
	assertEq(
		"phase8 classified artifact still does not enable customer execution",
		pipelineResult.results.productionFeatureFlagEnabled,
		false
	);

	preview = Registry.preview("gaussian blur seed 12", v2);
	assertEq("phase8 seed preview executable", preview.executable, true);
	assertEq("phase8 seed preview detail", preview.detail, "Seed = 12");

	PremiereBridge = {
		setVerifiedTerminalEffectParameter: function (
			csInterface,
			effectName,
			effectMatchName,
			parameterName,
			value,
			done
		) {
			dispatched += 1;
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
	resolved = Registry.resolve("gaussian blur seed 1", v2);
	Executor.dispatch({}, resolved, { featureEnabled: true }, function (payload) {
		effectPayload = payload;
	});
	assertEq("phase8 seed executor uses exact identity", effectCall.effectMatchName, "AE.Impact_Blur_FX");
	assertEq("phase8 seed executor parameter", effectCall.parameterName, "Seed");
	assertEq("phase8 seed readback verified", effectPayload.verified, true);
	assertEq("phase8 seed target locked", effectPayload.targetLocked, true);

	Executor.dispatch({}, resolved, { featureEnabled: false }, function (payload) {
		effectPayload = payload;
	});
	assertEq("phase8 customer flag off blocks execution", effectPayload.reason, "FEATURE_DISABLED");

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
	assertEq("phase8 missing readback fails closed", effectPayload.reason, "VALUE_NOT_VERIFIED");

	PremiereBridge.setVerifiedTerminalEffectParameter = function (
		csInterface,
		effectName,
		effectMatchName,
		parameterName,
		value,
		done
	) {
		done({ ok: true, verified: true, targetLocked: false });
	};
	Executor.dispatch({}, resolved, { featureEnabled: true }, function (payload) {
		effectPayload = payload;
	});
	assertEq("phase8 missing target lock fails closed", effectPayload.reason, "TARGET_NOT_LOCKED");
	PremiereBridge = storedBridge;

	fixture = Registry.buildV2(existing, {
		artifactType: "pickfx-terminal-registry-validation-results",
		results: [
			{
				candidateId: "pair-failed",
				effectDisplayName: "Failed Effect",
				effectMatchName: "AE.FAILED",
				parameterIndex: 0,
				parameterDisplayName: "Nope",
				status: "FAILED",
				promoted: false
			},
			{
				candidateId: "pair-manual",
				effectDisplayName: "Manual Effect",
				effectMatchName: "AE.MANUAL",
				parameterIndex: 0,
				parameterDisplayName: "Nope",
				status: "MANUAL_REVIEW",
				promoted: false
			},
			{
				candidateId: "pair-enum",
				effectDisplayName: "Enum Effect",
				effectMatchName: "AE.ENUM",
				parameterIndex: 0,
				parameterDisplayName: "Nope",
				status: "ENUM_REVIEW",
				promoted: false
			},
			{
				candidateId: "pair-gaussian-blur-amount-5",
				effectDisplayName: "Gaussian Blur",
				effectMatchName: "AE.Impact_Blur_FX",
				parameterIndex: 5,
				parameterDisplayName: "Amount",
				status: "PRODUCTION_READY",
				promoted: true,
				requestedValue: 30,
				readBack: 30,
				transaction: {
					fingerprint: {
						ok: true,
						fingerprintRestored: true,
						productionUntouched: true
					}
				}
			}
		]
	}, { generatedAt: "test" });
	assertEq("phase8 fixture still keeps 36 existing pairs", fixture.audit.previousProductionCount, 36);
	assertEq("phase8 fixture adds no failed/manual/enum rows", fixture.audit.newlyPromotedCount, 0);
	assertEq("phase8 fixture treats existing Amount as canonical duplicate", fixture.audit.duplicateHandling.duplicates.length, 1);
	assertEq(
		"phase8 fixture rejected failed/manual/enum",
		fixture.audit.rejectedCapabilities.filter(function (item) {
			return item.status === "FAILED" ||
				item.status === "MANUAL_REVIEW" ||
				item.status === "ENUM_REVIEW";
		}).length,
		3
	);

	assertEq("phase8 rebuilt registry matches written artifact pair count", built.registry.counts.effectParameterPairs, v2.counts.effectParameterPairs);
	assertEq("phase8 audit source is validation results", audit.sourceValidationEvidence.artifactType, "pickfx-terminal-registry-validation-results");
	assertEq("phase8 audit production-ready evidence", audit.sourceValidationEvidence.summary.productionReady, 121);

	print("terminal production v2: " + ((passed + failed) - startCount) + " assertions");
}());
