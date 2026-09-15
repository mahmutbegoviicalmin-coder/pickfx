(function () {
	var startCount = passed + failed;
	var Harness = TerminalExhaustiveHarness;
	var auditFixture;
	var state;
	var result;
	var beginCalls;
	var saveCalls;
	var applyCalls;
	var writeCalls;

	function parameter(effect, name, index) {
		return {
			effectDisplayName: effect,
			effectPremiereName: effect,
			effectMatchName: "match." + effect,
			parameterIndex: index,
			parameterDisplayName: name,
			valueType: "number",
			currentValue: 0,
			terminalSafety: "safe_terminal",
			terminalReason: "UNIQUE_NUMERIC_PARAMETER",
			prevalidated: false,
			liveTestPlanned: true
		};
	}

	function makeAudit() {
		return {
			classifierVersion: "fixture-v1",
			sourceRegistry: {
				effectCount: 2,
				parameterCount: 2
			},
			summary: {
				totalEffects: 2,
				totalParameters: 2,
				liveTestsPlanned: 2
			},
			effects: [
				{
					displayName: "Zulu Effect",
					premiereName: "Zulu Effect",
					matchName: "match.Zulu",
					parameters: [parameter("Zulu Effect", "Intensity", 2)]
				},
				{
					displayName: "Alpha Effect",
					premiereName: "Alpha Effect",
					matchName: "match.Alpha",
					parameters: [parameter("Alpha Effect", "Amount", 1)]
				}
			]
		};
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
			builderAvailable: true,
			discoveryAvailable: true,
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
				displayName: "Alpha Effect",
				matchName: "match.Alpha"
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

	function mockBridge(overrides) {
		overrides = overrides || {};
		return {
			researchTerminalPrepare: function (cs, done) {
				done(overrides.environment || validEnvironment());
			},
			researchTerminalBeginTest: function (cs, id, effect, matchName, done) {
				beginCalls += 1;
				done({ ok: true, testId: id });
			},
			researchTerminalFinishTest: function (cs, expectMutation, done) {
				done(overrides.cleanup || successfulCleanup());
			},
			researchTerminalComplete: function (cs, done) {
				done({ ok: true, completed: true, productionUntouched: true });
			},
			listEffectParameters: function (cs, effectName, done) {
				done({
					ok: true,
					parameters: [{
						displayName: effectName === "Alpha Effect"
							? "Amount"
							: "Intensity",
						index: effectName === "Alpha Effect" ? 1 : 2,
						type: "number",
						writable: true,
						value: 0,
						min: 0,
						max: 100
					}]
				});
			}
		};
	}

	function rawCS() {
		return {
			evalScript: function (script, done) {
				done(JSON.stringify({ ok: true }));
			}
		};
	}

	function effectExecutor() {
		return {
			applyEffect: function (cs, effectName, done) {
				applyCalls += 1;
				done({ ok: true, applied: 1, failed: 0 });
			}
		};
	}

	function commandExecutor() {
		return {
			run: function (cs, effect, value, parameterName, done) {
				writeCalls += 1;
				done({
					ok: true,
					verified: true,
					actualValue: value,
					readBack: value,
					effect: effect.premiereName,
					parameter: parameterName
				});
			}
		};
	}

	function runOptions(overrides) {
		var options = {
			csInterface: rawCS(),
			bridge: mockBridge(),
			dispatcher: TerminalCommandDispatcher,
			effectExecutor: effectExecutor(),
			commandExecutor: commandExecutor(),
			audit: auditFixture,
			valuePicker: SafeNumericTestValue,
			productionFeatureEnabled: function () { return false; },
			now: function () { return "2026-08-22T20:39:00.000Z"; },
			schedule: function (fn) { fn(); },
			startTimer: function () { return 1; },
			cancelTimer: function () {},
			saveState: function () { saveCalls += 1; }
		};
		var key;
		for (key in overrides) {
			if (overrides.hasOwnProperty(key)) {
				options[key] = overrides[key];
			}
		}
		return options;
	}

	auditFixture = makeAudit();
	state = Harness.createState(auditFixture, {
		now: function () { return "2026-08-22T20:39:00.000Z"; }
	});
	assertEq("exhaustive plan has every safe live pair", state.plan.totalTests, 2);
	assertEq("exhaustive plan sorts effects deterministically", state.plan.tests[0].effectDisplayName, "Alpha Effect");
	assertEq("exhaustive state embeds Gaussian reference transaction", state.prevalidated.skipLiveRun, true);
	assertEq("exhaustive promotion starts with Gaussian reference", state.promotion.pairCount, 1);
	assertEq("exhaustive promotion never fabricates transitions", state.promotion.transitions.length, 0);
	assertEq(
		"exhaustive runtime identity rejects shifted parameter index",
		Harness.findRuntimeParameter(
			[{ displayName: "Amount", index: 9 }],
			{ parameterDisplayName: "Amount", parameterIndex: 1 }
		).reason,
		"PARAMETER_IDENTITY_MISMATCH"
	);

	beginCalls = 0;
	saveCalls = 0;
	applyCalls = 0;
	writeCalls = 0;
	result = null;
	Harness.run(runOptions({}), function (payload) {
		result = payload;
	});
	assertEq("exhaustive harness completes sequential fixture", result.status, "complete");
	assertEq("exhaustive harness begins exactly one test at a time", beginCalls, 2);
	assertEq("exhaustive harness applies every planned effect", applyCalls, 2);
	assertEq("exhaustive harness writes every planned parameter", writeCalls, 2);
	assertEq("exhaustive harness records both live passes", result.results.length, 2);
	assertEq("exhaustive harness promotion includes reference plus live pairs", result.promotion.pairCount, 3);
	assertEq("exhaustive harness feature flag remains false", result.promotion.productionFeatureFlagEnabled, false);
	assert("exhaustive harness saves incrementally", saveCalls >= 4);
	assertEq("exhaustive state validates", Harness.validateState(result).ok, true);

	state = Harness.createState(auditFixture, {
		now: function () { return "2026-08-22T20:39:00.000Z"; }
	});
	state.cursor = 2;
	state.results = [
		{
			testId: state.plan.tests[0].testId,
			status: "passed",
			effectDisplayName: state.plan.tests[0].effectDisplayName,
			effectPremiereName: state.plan.tests[0].effectPremiereName,
			effectMatchName: state.plan.tests[0].effectMatchName,
			parameterIndex: state.plan.tests[0].parameterIndex,
			parameterDisplayName: state.plan.tests[0].parameterDisplayName,
			requestedValue: 1,
			readBack: 1,
			verified: true,
			cleanup: successfulCleanup()
		},
		{
			testId: state.plan.tests[1].testId,
			status: "passed",
			effectDisplayName: state.plan.tests[1].effectDisplayName,
			effectPremiereName: state.plan.tests[1].effectPremiereName,
			effectMatchName: state.plan.tests[1].effectMatchName,
			parameterIndex: state.plan.tests[1].parameterIndex,
			parameterDisplayName: state.plan.tests[1].parameterDisplayName,
			requestedValue: 1,
			readBack: 1,
			verified: true,
			cleanup: successfulCleanup()
		}
	];
	result = Harness.reconcileState(state, {
		classifierVersion: "fixture-v2",
		summary: auditFixture.summary,
		parameters: [
			{
				effectDisplayName: state.results[0].effectDisplayName,
				parameterIndex: state.results[0].parameterIndex,
				parameterDisplayName: state.results[0].parameterDisplayName,
				terminalSafety: "safe_terminal",
				terminalReason: "UNIQUE_NUMERIC_PARAMETER"
			},
			{
				effectDisplayName: state.results[1].effectDisplayName,
				parameterIndex: state.results[1].parameterIndex,
				parameterDisplayName: state.results[1].parameterDisplayName,
				terminalSafety: "manual_review",
				terminalReason: "ENUM_LIKE_NAME_REQUIRES_METADATA"
			}
		]
	}, {
		now: function () { return "2026-08-22T20:40:00.000Z"; }
	});
	assertEq("reconciliation reclassifies unsafe live success", result.reclassifiedCount, 1);
	assertEq("reconciliation records manual review status", result.state.results[1].status, "manual_review");
	assertEq("reconciliation removes unsafe pair from promotion", result.state.promotion.pairCount, 2);

	state = Harness.createState(auditFixture, {
		now: function () { return "2026-08-22T20:39:00.000Z"; }
	});
	state.status = "stopped";
	state.stoppedReason = "INTERRUPTED";
	state.cursor = 1;
	state.results = [{
		testId: state.plan.tests[0].testId,
		status: "passed",
		effectDisplayName: state.plan.tests[0].effectDisplayName,
		effectPremiereName: state.plan.tests[0].effectPremiereName,
		effectMatchName: state.plan.tests[0].effectMatchName,
		parameterIndex: state.plan.tests[0].parameterIndex,
		parameterDisplayName: state.plan.tests[0].parameterDisplayName,
		requestedValue: 1,
		readBack: 1,
		verified: true,
		cleanup: successfulCleanup()
	}];
	beginCalls = 0;
	result = null;
	Harness.run(runOptions({ existingState: state }), function (payload) {
		result = payload;
	});
	assertEq("exhaustive resume starts at saved cursor", beginCalls, 1);
	assertEq("exhaustive resume preserves prior result", result.results.length, 2);
	assertEq("exhaustive resume completes", result.status, "complete");

	beginCalls = 0;
	result = null;
	Harness.run(runOptions({
		bridge: mockBridge({
			cleanup: {
				ok: false,
				reason: "CLEANUP_FAILED",
				stopRun: true
			}
		})
	}), function (payload) {
		result = payload;
	});
	assertEq("cleanup failure stops exhaustive run", result.status, "stopped");
	assertEq("cleanup failure records exact reason", result.stoppedReason, "CLEANUP_FAILED");
	assertEq("cleanup failure prevents later mutations", beginCalls, 1);

	beginCalls = 0;
	result = null;
	Harness.run(runOptions({
		bridge: mockBridge({
			environment: {
				ok: true,
				environment: "research",
				sequence: "Production",
				trackItemName: "PickFX Research Clip.mp4",
				videoTrackItem: true
			}
		})
	}), function (payload) {
		result = payload;
	});
	assertEq("wrong sequence blocks exhaustive live writes", result.stoppedReason, "RESEARCH_ENVIRONMENT_UNAVAILABLE");
	assertEq("wrong sequence begins zero tests", beginCalls, 0);

	result = null;
	Harness.run(runOptions({
		productionFeatureEnabled: function () { return true; }
	}), function (payload) {
		result = payload;
	});
	assertEq("enabled production feature blocks exhaustive harness", result.reason, "PRODUCTION_FEATURE_FLAG_ENABLED");
	assertEq("enabled production feature is reported", result.productionFeatureFlagEnabled, true);

	state = Harness.createState(auditFixture, {
		now: function () { return "2026-08-22T20:39:00.000Z"; }
	});
	state.status = "stopped";
	state.stoppedReason = "CLEANUP_FAILED";
	result = null;
	Harness.run(runOptions({ existingState: state }), function (payload) {
		result = payload;
	});
	assertEq("cleanup-failed state does not auto-resume", result.stoppedReason, "CLEANUP_FAILED");
	assertEq("cleanup-failed state begins zero tests", beginCalls, 0);

	print("terminal exhaustive harness tests " + ((passed + failed) - startCount));
}());
