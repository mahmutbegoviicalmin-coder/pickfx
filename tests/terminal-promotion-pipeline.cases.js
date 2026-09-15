(function () {
	var startCount = passed + failed;
	var Pipeline = TerminalPromotionPipeline;
	var productionSource;
	var productionReady;
	var researchRegistry;
	var priority;
	var candidate;
	var result;
	var transaction;
	var runResult;
	var writeCalls;
	var productionWrites;
	var beginCalls;

	function researchEffect(name, matchName, parameters) {
		return {
			displayName: name,
			premiereName: name,
			matchName: matchName,
			parameters: parameters
		};
	}

	function param(name, index, extras) {
		var row = {
			index: index,
			displayName: name,
			valueType: extras && extras.valueType ? extras.valueType : "number",
			currentValue: extras && extras.currentValue !== undefined
				? extras.currentValue
				: 20,
			hasGetValue: true,
			hasSetValue: true,
			isTimeVarying: extras && extras.isTimeVarying === true
		};
		if (extras) {
			if (extras.min !== undefined) {
				row.min = extras.min;
			}
			if (extras.max !== undefined) {
				row.max = extras.max;
			}
		}
		return row;
	}

	function fixtureRegistry() {
		return {
			schemaVersion: 1,
			source: "PickFX CEP Research Registry Builder",
			apiModel: "CEP_ExtendScript",
			generatedAt: "2026-08-23T00:00:00.000Z",
			effects: [
				researchEffect("Gaussian Blur", "AE.Impact_Blur_FX", [
					param("Error occurred", 0, { valueType: "boolean", currentValue: false }),
					param("Controls", 1, { valueType: "boolean", currentValue: false }),
					param("", 2, { valueType: "boolean", currentValue: false }),
					param("Seed", 3, { currentValue: 0 }),
					param("Angle", 4, { currentValue: 0 }),
					param("Amount", 5, { currentValue: 20 }),
					param("Thickness", 6, { currentValue: 20 }),
					param("Chromatic Aberration", 8, { currentValue: 0 }),
					param("Edge Behavior", 9, { currentValue: 1 }),
					param("_ Overlay Mode", 12, { currentValue: 0 }),
					param("_ Applied Version", 15, { currentValue: 260300 })
				]),
				researchEffect("Gaussian Blur (Legacy)", "AE.ADBE Gaussian Blur 2", [
					param("Blurriness", 0, { currentValue: 25 }),
					param("Blur Dimensions", 1, { currentValue: 0 }),
					param("Repeat Edge Pixels", 2, {
						valueType: "boolean",
						currentValue: true
					})
				]),
				researchEffect("Brightness & Contrast", "AE.ADBE Brightness & Contrast 2", [
					param("Brightness", 0, { currentValue: 0 }),
					param("Contrast", 1, { currentValue: 0 })
				]),
				researchEffect("Unsharp Mask", "AE.ADBE Unsharp Mask", [
					param("Color Mode", 0, { valueType: "boolean", currentValue: false }),
					param("Amount", 1, { currentValue: 0 }),
					param("Radius", 2, { currentValue: 1 })
				]),
				researchEffect("Transform", "AE.ADBE Geometry", [
					param("Position", 1, {
						valueType: "object",
						currentValue: { stringValue: "0.5,0.5" }
					}),
					param("Scale Height", 3, { currentValue: 100 }),
					param("Rotation", 7, { currentValue: 0, isTimeVarying: true })
				]),
				researchEffect("Tint", "AE.ADBE Tint", [
					param("Map Black To", 0, { currentValue: 18374897589125431000 }),
					param("Amount to Tint", 2, { currentValue: 100 })
				])
			]
		};
	}

	function numericCandidate(overrides) {
		var row = {
			candidateId: "pair-gaussian-blur-amount-5",
			effectDisplayName: "Gaussian Blur",
			effectPremiereName: "Gaussian Blur",
			effectMatchName: "AE.Impact_Blur_FX",
			parameterIndex: 5,
			parameterDisplayName: "Amount",
			valueType: "number",
			hasGetValue: true,
			hasSetValue: true,
			isTimeVarying: false,
			classification: Pipeline.CLASS.NUMERIC,
			classificationReason: "NUMERIC_CANDIDATE",
			liveTestPlanned: true,
			duplicateDisplayName: false
		};
		var key;
		overrides = overrides || {};
		for (key in overrides) {
			if (overrides.hasOwnProperty(key)) {
				row[key] = overrides[key];
			}
		}
		return row;
	}

	function successfulTransaction(overrides) {
		var row = {
			environment: {
				ok: true,
				environment: "research",
				sequence: "PickFX Research",
				trackItemName: "PickFX Research Clip.mp4",
				productionIsResearch: false
			},
			productionFeatureFlagEnabled: false,
			productionRegistryMutated: false,
			productionWrites: 0,
			usedQE: false,
			writerPath: "CommandExecutor.run",
			matchingComponents: 1,
			componentIdentity: {
				componentIndex: 2,
				displayName: "Gaussian Blur",
				matchName: "AE.Impact_Blur_FX"
			},
			parameterResolved: true,
			parameterIndex: 5,
			writable: true,
			isTimeVarying: false,
			originalValue: 20,
			testValue: 30,
			writeOk: true,
			writeVerified: true,
			readBack: 30,
			restoreOk: true,
			restoreVerified: true,
			restoreReadBack: 20,
			fingerprint: {
				ok: true,
				fingerprintRestored: true,
				productionUntouched: true,
				unexpectedComponents: 0,
				missingComponents: 0,
				unrelatedParameterChanges: 0,
				parameterValueMismatches: 0
			}
		};
		var key;
		overrides = overrides || {};
		for (key in overrides) {
			if (overrides.hasOwnProperty(key)) {
				row[key] = overrides[key];
			}
		}
		return row;
	}

	function validEnvironment() {
		return {
			ok: true,
			available: true,
			isolated: true,
			environment: "research",
			sequence: "PickFX Research",
			clip: "PickFX Research Clip",
			trackItemName: "PickFX Research Clip.mp4",
			videoTrackItem: true,
			productionIsResearch: false
		};
	}

	function successfulCleanup() {
		return {
			ok: true,
			mutationObserved: true,
			effectIdentityMatches: true,
			addedComponent: {
				componentIndex: 2,
				displayName: "Gaussian Blur",
				matchName: "AE.Impact_Blur_FX"
			},
			fingerprintRestored: true,
			productionUntouched: true,
			cleanupResult: {
				ok: true,
				parameterValueMismatches: 0,
				unexpectedComponents: 0,
				missingComponents: 0
			}
		};
	}

	researchRegistry = fixtureRegistry();
	priority = Pipeline.buildPriorityQueue(researchRegistry, {
		generatedAt: "2026-08-23T00:00:00.000Z"
	});
	assertEq("priority artifact type is targeted validation queue", priority.artifactType, Pipeline.PRIORITY_ARTIFACT_TYPE);
	assert("priority queue is smaller than a blind 2434-parameter scan", priority.candidateCount < 100);
	assertEq("Gaussian Blur is first in the blur group", priority.candidates[0].effectDisplayName, "Gaussian Blur");
	assert("Gaussian Blur Amount is discovered from the registry", priority.candidates.some(function (row) {
		return row.effectDisplayName === "Gaussian Blur" &&
			row.parameterDisplayName === "Amount" &&
			row.parameterIndex === 5;
	}));
	assert("Gaussian Blur Seed is queued from registry evidence", priority.candidates.some(function (row) {
		return row.effectDisplayName === "Gaussian Blur" &&
			row.parameterDisplayName === "Seed";
	}));
	assert("Gaussian Blur Edge Behavior is classified as enum review, not valid by name", priority.candidates.some(function (row) {
		return row.parameterDisplayName === "Edge Behavior" &&
			row.classification === Pipeline.CLASS.ENUM &&
			row.liveTestPlanned === false;
	}));
	assert("Repeat Edge Pixels is classified boolean, not auto-promoted", priority.candidates.some(function (row) {
		return row.parameterDisplayName === "Repeat Edge Pixels" &&
			row.classification === Pipeline.CLASS.BOOLEAN &&
			row.liveTestPlanned === false;
	}));
	assert("Blur Dimensions is classified enum, not auto-promoted", priority.candidates.some(function (row) {
		return row.parameterDisplayName === "Blur Dimensions" &&
			row.classification === Pipeline.CLASS.ENUM;
	}));
	assert("internal underscore parameters are not live-tested", priority.candidates.every(function (row) {
		return row.parameterDisplayName.charAt(0) !== "_" || row.liveTestPlanned === false;
	}));
	assert("queue never enables the production feature flag", priority.productionFeatureFlagEnabled === false);
	assertEq(
		"Amount test value stays conservative",
		Pipeline.chooseNumericTestValue(param("Amount", 5), 20).value,
		30
	);
	assertEq(
		"Angle test value stays conservative",
		Pipeline.chooseNumericTestValue(param("Angle", 4), 0).value,
		15
	);
	assertEq(
		"percentage test value stays conservative",
		Pipeline.chooseNumericTestValue(param("Amount to Tint", 2), 100).value,
		80
	);

	candidate = numericCandidate();
	result = Pipeline.evaluateCandidate(candidate, successfulTransaction());
	assertEq("successful numeric promotion becomes PRODUCTION_READY", result.status, "PRODUCTION_READY");
	assert("successful numeric promotion is marked promoted", result.promoted === true);

	result = Pipeline.evaluateCandidate(candidate, successfulTransaction({
		readBack: 99,
		writeVerified: false,
		readBackMismatch: true
	}));
	assertEq("failed read-back is FAILED", result.status, "FAILED");
	assertEq("failed read-back reason", result.reason, "READBACK_MISMATCH");
	assert("failed read-back is not promoted", result.promoted === false);

	result = Pipeline.evaluateCandidate(candidate, successfulTransaction({
		restoreOk: false,
		restoreVerified: false,
		restoreReadBack: 30
	}));
	assertEq("failed restore is FAILED", result.status, "FAILED");
	assertEq("failed restore reason", result.reason, "RESTORE_FAILED");

	result = Pipeline.evaluateCandidate(candidate, successfulTransaction({
		fingerprint: {
			ok: false,
			fingerprintRestored: false,
			productionUntouched: true,
			unexpectedComponents: 1,
			missingComponents: 0,
			unrelatedParameterChanges: 1,
			parameterValueMismatches: 1
		}
	}));
	assertEq("fingerprint mismatch is FAILED", result.status, "FAILED");
	assertEq("fingerprint mismatch reason", result.reason, "FINGERPRINT_MISMATCH");

	result = Pipeline.evaluateCandidate(candidate, successfulTransaction({
		duplicateEffectInstance: true,
		matchingComponents: 2
	}));
	assertEq("duplicate effect instance is AMBIGUOUS", result.status, "AMBIGUOUS");
	assertEq("duplicate effect instance reason", result.reason, "DUPLICATE_EFFECT_INSTANCE");

	result = Pipeline.evaluateCandidate(candidate, successfulTransaction({
		parameterResolved: false,
		missingParameter: true,
		componentIdentity: null
	}));
	assertEq("missing parameter is FAILED", result.status, "FAILED");
	assertEq("missing parameter reason", result.reason, "MISSING_PARAMETER");

	result = Pipeline.evaluateCandidate(candidate, successfulTransaction({
		componentIdentity: {
			componentIndex: 5,
			displayName: "Sharpen",
			matchName: "AE.ADBE Sharpen"
		}
	}));
	assertEq("wrong component identity is AMBIGUOUS", result.status, "AMBIGUOUS");
	assertEq("wrong component identity reason", result.reason, "COMPONENT_IDENTITY_MISMATCH");

	result = Pipeline.evaluateCandidate(candidate, successfulTransaction({
		ambiguousParameter: true
	}));
	assertEq("ambiguous parameter is AMBIGUOUS", result.status, "AMBIGUOUS");
	assertEq("ambiguous parameter reason", result.reason, "AMBIGUOUS_PARAMETER");

	result = Pipeline.evaluateCandidate(numericCandidate({
		candidateId: "pair-gaussian-blur-edge-behavior-9",
		parameterDisplayName: "Edge Behavior",
		parameterIndex: 9,
		classification: Pipeline.CLASS.ENUM,
		classificationReason: "ENUM_METADATA_REQUIRED",
		liveTestPlanned: false
	}), null);
	assertEq("enum parameter is ENUM_REVIEW without live write", result.status, "ENUM_REVIEW");
	assert("enum parameter is not promoted", result.promoted === false);

	result = Pipeline.evaluateCandidate(numericCandidate({
		candidateId: "pair-gaussian-blur-legacy-repeat-edge-pixels-2",
		effectDisplayName: "Gaussian Blur (Legacy)",
		parameterDisplayName: "Repeat Edge Pixels",
		parameterIndex: 2,
		classification: Pipeline.CLASS.BOOLEAN,
		classificationReason: "BOOLEAN_PARAMETER",
		liveTestPlanned: false
	}), null);
	assertEq("boolean parameter is MANUAL_REVIEW", result.status, "MANUAL_REVIEW");
	assertEq("boolean parameter reason", result.reason, "BOOLEAN_PARAMETER");

	result = Pipeline.evaluateCandidate(numericCandidate({
		candidateId: "pair-gaussian-blur-applied-version-15",
		parameterDisplayName: "_ Applied Version",
		parameterIndex: 15,
		classification: Pipeline.CLASS.INTERNAL,
		classificationReason: "INTERNAL_PARAMETER",
		liveTestPlanned: false
	}), null);
	assertEq("internal parameter is MANUAL_REVIEW", result.status, "MANUAL_REVIEW");
	assertEq("internal parameter reason", result.reason, "INTERNAL_PARAMETER");

	result = Pipeline.evaluateCandidate(numericCandidate({
		isTimeVarying: true,
		classification: Pipeline.CLASS.TIME_VARYING,
		classificationReason: "TIME_VARYING_PARAMETER",
		liveTestPlanned: false
	}), null);
	assertEq("time-varying parameter is MANUAL_REVIEW", result.status, "MANUAL_REVIEW");
	assertEq("time-varying parameter reason", result.reason, "TIME_VARYING_PARAMETER");

	result = Pipeline.evaluateCandidate(candidate, null);
	assertEq("getValue/setValue alone never promotes", result.status, "PENDING_LIVE");
	assert("getValue/setValue alone is not promoted", result.promoted === false);

	result = Pipeline.evaluateCandidate(candidate, successfulTransaction({
		environment: {
			ok: true,
			environment: "research",
			sequence: "PickFX Research",
			trackItemName: "PickFX Research Clip.mp4",
			productionIsResearch: true
		}
	}));
	assertEq("active research sequence is a valid isolated target", result.status, "PRODUCTION_READY");

	result = Pipeline.evaluateCandidate(candidate, successfulTransaction({
		environment: {
			ok: true,
			environment: "production",
			sequence: "Main Edit",
			trackItemName: "Interview.mp4",
			productionIsResearch: false
		}
	}));
	assertEq("production sequence writes are rejected", result.status, "FAILED");
	assertEq("research sequence isolation reason", result.reason, "RESEARCH_SEQUENCE_ISOLATION");

	result = Pipeline.evaluateCandidate(candidate, successfulTransaction({
		productionWrites: 1
	}));
	assertEq("production writes are rejected", result.status, "FAILED");
	assertEq("no production writes reason", result.reason, "PRODUCTION_WRITE_ATTEMPTED");

	result = Pipeline.evaluateCandidate(candidate, successfulTransaction({
		productionRegistryMutated: true
	}));
	assertEq("production registry mutation is rejected", result.status, "FAILED");

	result = Pipeline.evaluateCandidate(candidate, successfulTransaction({
		productionFeatureFlagEnabled: true
	}));
	assertEq("customer flag being on does not invent a promotion by itself", result.status, "PRODUCTION_READY");
	assert("customer flag is not flipped by evaluation", result.automaticPromotion === false);

	result = Pipeline.evaluateCandidate(candidate, successfulTransaction({
		automaticPromotion: true
	}));
	assertEq("automatic promotion without the full rule is rejected", result.status, "FAILED");
	assertEq("automatic promotion reason", result.reason, "AUTOMATIC_PROMOTION_FORBIDDEN");

	productionSource = JSON.parse(fs.readFileSync(
		path.join(__pickfxRoot, "src/data/terminal-registry.production.json"),
		"utf8"
	));
	assertEq(
		"customer production registry remains valid before pipeline artifacts",
		TerminalProductionRegistry.validate(productionSource).ok,
		true
	);

	writeCalls = 0;
	productionWrites = 0;
	beginCalls = 0;
	runResult = null;
	Pipeline.run({
		live: true,
		registry: researchRegistry,
		productionReady: {
			artifactType: "pickfx-terminal-production-ready-allowlist",
			effects: []
		},
		csInterface: {
			evalScript: function (script, cb) {
				cb(JSON.stringify({ ok: true }));
			}
		},
		bridge: {
			researchTerminalPrepare: function (cs, cb) {
				cb(validEnvironment());
			},
			researchBaselineCleanup: function (cs, known, cb) {
				cb({
					ok: true,
					status: "READY_FOR_TARGETED_PROMOTION",
					cleanupFullyVerified: true,
					productionUntouched: true,
					componentsFound: [
						{ displayName: "Opacity", matchName: "AE.ADBE Opacity" },
						{ displayName: "Motion", matchName: "AE.ADBE Motion" }
					],
					componentsRemoved: [],
					componentsRetained: [
						{ displayName: "Opacity", matchName: "AE.ADBE Opacity" },
						{ displayName: "Motion", matchName: "AE.ADBE Motion" }
					]
				});
			},
			researchTerminalBeginTest: function (cs, id, effect, matchName, cb) {
				beginCalls += 1;
				cb({ ok: true, testId: id });
			},
			researchTerminalFinishTest: function (cs, expectMutation, cb) {
				cb(successfulCleanup());
			},
			researchTerminalComplete: function (cs, cb) {
				cb({ ok: true, completed: true, productionUntouched: true });
			},
			listEffectParameters: function (cs, effectName, cb) {
				var rows = {
					"Gaussian Blur": [
						{ displayName: "Seed", index: 3, type: "number", writable: true, value: 0 },
						{ displayName: "Angle", index: 4, type: "number", writable: true, value: 0 },
						{ displayName: "Amount", index: 5, type: "number", writable: true, value: 20 },
						{ displayName: "Thickness", index: 6, type: "number", writable: true, value: 20 },
						{ displayName: "Chromatic Aberration", index: 8, type: "number", writable: true, value: 0 }
					],
					"Gaussian Blur (Legacy)": [
						{ displayName: "Blurriness", index: 0, type: "number", writable: true, value: 25 }
					],
					"Brightness & Contrast": [
						{ displayName: "Brightness", index: 0, type: "number", writable: true, value: 0 },
						{ displayName: "Contrast", index: 1, type: "number", writable: true, value: 0 }
					],
					"Unsharp Mask": [
						{ displayName: "Amount", index: 1, type: "number", writable: true, value: 0 },
						{ displayName: "Radius", index: 2, type: "number", writable: true, value: 1 }
					],
					"Transform": [
						{ displayName: "Scale Height", index: 3, type: "number", writable: true, value: 100 }
					],
					"Tint": [
						{ displayName: "Amount to Tint", index: 2, type: "number", writable: true, value: 100 }
					]
				};
				cb({
					ok: true,
					parameters: rows[effectName] || [],
					matchingComponents: 1
				});
			}
		},
		dispatcher: TerminalCommandDispatcher,
		effectExecutor: {
			applyEffect: function (cs, effectName, cb) {
				cb({ ok: true, applied: 1, failed: 0 });
			}
		},
		commandExecutor: {
			run: function (cs, effect, value, parameterName, cb) {
				writeCalls += 1;
				cb({
					ok: true,
					verified: true,
					actualValue: value,
					readBack: value,
					usedQE: false,
					executionPath: "CommandExecutor.run"
				});
			}
		},
		productionFeatureEnabled: function () {
			return false;
		},
		now: function () {
			return "2026-08-23T00:00:00.000Z";
		},
		schedule: function (fn) {
			fn();
		},
		saveState: function (state, meta) {
			if (meta && meta.allowProductionRegistryWrite === true) {
				productionWrites += 1;
			}
		}
	}, function (payload) {
		runResult = payload;
	});

	assertEq("isolated live fixture completes", runResult.status, "complete");
	assert("live fixture writes only through CommandExecutor", writeCalls > 0);
	assertEq("live fixture never writes the production registry", productionWrites, 0);
	assert("live fixture does not enable the production flag", runResult.productionFeatureFlagEnabled === false);
	assert("live fixture does not mutate the production registry", runResult.productionRegistryMutated === false);
	assert("Gaussian Blur Amount was actually promoted from fixture evidence", runResult.results.gaussianBlur.some(function (row) {
		return row.parameterDisplayName === "Amount" && row.status === "PRODUCTION_READY";
	}));
	assert("Gaussian Blur Edge Behavior remains ENUM_REVIEW", runResult.results.gaussianBlur.some(function (row) {
		return row.parameterDisplayName === "Edge Behavior" && row.status === "ENUM_REVIEW";
	}));
	assert("next production-ready artifact is a separate allowlist", runResult.nextProductionReady.artifactType === "pickfx-terminal-production-ready-allowlist");
	assert("next production-ready artifact keeps the customer flag off", runResult.nextProductionReady.productionFeatureFlagEnabled === false);

	runResult = null;
	beginCalls = 0;
	writeCalls = 0;
	Pipeline.run({
		live: true,
		registry: researchRegistry,
		csInterface: {
			evalScript: function (script, cb) {
				cb(JSON.stringify({ ok: true }));
			}
		},
		bridge: {
			researchTerminalPrepare: function (cs, cb) {
				cb(validEnvironment());
			},
			researchBaselineCleanup: function (cs, known, cb) {
				cb({
					ok: false,
					status: "RESEARCH_BASELINE_NOT_CLEAN",
					cleanupFullyVerified: false,
					productionUntouched: true,
					reason: "OWNERSHIP_UNPROVEN",
					componentsFound: [
						{ displayName: "Opacity", matchName: "AE.ADBE Opacity" },
						{ displayName: "Motion", matchName: "AE.ADBE Motion" },
						{ displayName: "Mystery Plugin", matchName: "com.vendor.UnknownFX" }
					],
					componentsRemoved: [],
					blockedComponents: [{
						component: {
							displayName: "Mystery Plugin",
							matchName: "com.vendor.UnknownFX"
						},
						reason: "OWNERSHIP_UNPROVEN"
					}]
				});
			},
			researchTerminalBeginTest: function (cs, id, effect, matchName, cb) {
				beginCalls += 1;
				cb({ ok: true, testId: id });
			},
			researchTerminalFinishTest: function (cs, expectMutation, cb) {
				cb(successfulCleanup());
			},
			researchTerminalComplete: function (cs, cb) {
				cb({ ok: true, completed: true, productionUntouched: true });
			},
			listEffectParameters: function (cs, effectName, cb) {
				cb({ ok: true, parameters: [], matchingComponents: 1 });
			}
		},
		dispatcher: TerminalCommandDispatcher,
		effectExecutor: {
			applyEffect: function (cs, effectName, cb) {
				cb({ ok: true, applied: 1, failed: 0 });
			}
		},
		commandExecutor: {
			run: function (cs, effect, value, parameterName, cb) {
				writeCalls += 1;
				cb({
					ok: true,
					verified: true,
					actualValue: value,
					readBack: value,
					usedQE: false,
					executionPath: "CommandExecutor.run"
				});
			}
		},
		now: function () {
			return "2026-08-23T00:00:00.000Z";
		},
		schedule: function (fn) {
			fn();
		}
	}, function (payload) {
		runResult = payload;
	});
	assertEq("dirty research baseline stops promotion", runResult.status, "stopped");
	assertEq("dirty research baseline reason", runResult.stoppedReason, "RESEARCH_BASELINE_NOT_CLEAN");
	assertEq("dirty research baseline starts no parameter tests", beginCalls, 0);
	assertEq("dirty research baseline writes no parameter values", writeCalls, 0);

	runResult = null;
	Pipeline.run({
		live: false,
		registry: researchRegistry,
		productionFeatureEnabled: true,
		now: function () { return "2026-08-23T00:00:00.000Z"; }
	}, function (payload) {
		runResult = payload;
	});
	assertEq("customer flag on still classifies without live writes", runResult.status, "classified-only");
	assertEq("customer flag on does not auto-promote", runResult.results.summary.productionReady, 0);
	assert("customer flag is recorded, not cleared", runResult.productionFeatureFlagEnabled === true);

	runResult = null;
	Pipeline.run({
		live: false,
		registry: researchRegistry,
		now: function () { return "2026-08-23T00:00:00.000Z"; }
	}, function (payload) {
		runResult = payload;
	});
	assertEq("classified-only run does not invent live promotions", runResult.status, "classified-only");
	assertEq("classified-only run production-ready count", runResult.results.summary.productionReady, 0);
	assert("classified-only run still reports Gaussian Blur candidates", runResult.results.gaussianBlur.length > 0);

	productionReady = JSON.parse(fs.readFileSync(
		path.join(__pickfxRoot, "src/data/terminal-registry.production.json"),
		"utf8"
	));
	assertEq(
		"customer production registry remains valid after pipeline tests",
		TerminalProductionRegistry.validate(productionReady).ok,
		true
	);
	assertEq(
		"customer production pair count is unchanged",
		productionReady.counts.effectParameterPairs,
		36
	);

	print("terminal-promotion-pipeline: " + (passed + failed - startCount) + " assertions");
}());
