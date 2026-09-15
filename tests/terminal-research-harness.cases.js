(function () {
	var startCount = passed + failed;
	var Harness = TerminalResearchHarness;
	var Resolver = TerminalCommandResolver;
	var Dispatcher = TerminalCommandDispatcher;
	var generated;
	var plan;
	var routed;
	var rawScripts;
	var result;
	var beginCalls;
	var dispatchCalls;
	var records;
	var artifacts;
	var source;

	function validEnvironment() {
		return {
			ok: true,
			available: true,
			isolated: true,
			environment: "research",
			sequence: "PickFX Research",
			clip: "PickFX Research Clip",
			videoTrackItem: true,
			builderAvailable: true,
			discoveryAvailable: true
		};
	}

	function successfulFinish(expectMutation) {
		return {
			ok: true,
			expectedMutation: expectMutation,
			mutationObserved: expectMutation,
			effectIdentityMatches: expectMutation,
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

	function mockBridge(options) {
		options = options || {};
		return {
			researchTerminalPrepare: function (cs, done) {
				done(options.environment || validEnvironment());
			},
			researchTerminalBeginTest: function (cs, id, effect, matchName, done) {
				beginCalls += 1;
				done(options.begin || {
					ok: true,
					sequence: "PickFX Research",
					clip: "PickFX Research Clip",
					testId: id
				});
			},
			researchTerminalFinishTest: function (cs, expectMutation, done) {
				if (options.finish) {
					done(options.finish);
					return;
				}
				done(successfulFinish(expectMutation));
			},
			researchTerminalComplete: function (cs, done) {
				done(options.complete || {
					ok: true,
					completed: true,
					productionUntouched: true
				});
			}
		};
	}

	function mockRawCS() {
		return {
			evalScript: function (script, done) {
				rawScripts.push(script);
				done(JSON.stringify({ ok: true }));
			}
		};
	}

	function mockEffectExecutor() {
		return {
			applyEffect: function (cs, name, done) {
				dispatchCalls += 1;
				cs.evalScript("$._pickfx.applyEffect(" + JSON.stringify(name) + ")", function () {
					done({ ok: true, applied: 1, failed: 0 });
				});
			}
		};
	}

	function mockCommandExecutor() {
		return {
			run: function (cs, effect, value, parameterName, done) {
				dispatchCalls += 1;
				cs.evalScript(
					"$._pickfx.setParameter(" +
						JSON.stringify(effect.premiereName) + ", " +
						JSON.stringify(parameterName) + ", " +
						JSON.stringify(value) + ")",
					function () {
						done({
							ok: true,
							verified: true,
							actualValue: value,
							readBack: value
						});
					}
				);
			}
		};
	}

	routed = Harness.routeScript("$._pickfx.applyEffect(\"Gaussian Blur\")");
	assertEq("research target routes effect application explicitly", routed.ok, true);
	assert(
		"research target apply route names research host function",
		routed.script.indexOf("$._pickfx.researchTerminalApplyEffect(") === 0
	);
	routed = Harness.routeScript("$._pickfx.listEffectParameters(\"Gaussian Blur\")");
	assert(
		"research target routes parameter listing explicitly",
		routed.script.indexOf("$._pickfx.researchTerminalListParameters(") === 0
	);
	routed = Harness.routeScript("$._pickfx.ensureEffectOnSelection(\"Gaussian Blur\")");
	assert(
		"research target routes effect ensure explicitly",
		routed.script.indexOf("$._pickfx.researchTerminalEnsureEffect(") === 0
	);
	routed = Harness.routeScript("$._pickfx.setParameter(\"Gaussian Blur\", \"Amount\", 30)");
	assert(
		"research target routes safe writer explicitly",
		routed.script.indexOf("$._pickfx.researchTerminalSetParameter(") === 0
	);
	assertEq(
		"research target denies unrelated production route",
		Harness.routeScript("$._pickfx.getSelection()").reason,
		"RESEARCH_TARGET_ROUTE_DENIED"
	);

	if (typeof fs !== "undefined" && typeof path !== "undefined" &&
			typeof __pickfxRoot === "string") {
		generated = JSON.parse(fs.readFileSync(
			path.join(__pickfxRoot, "src/data/terminal-registry.generated.json"),
			"utf8"
		));
		plan = Harness.buildPlan(generated, Resolver);
		assertEq("research promotion plan includes six real candidates", plan.records.length, 6);
		assertEq("research plan first candidate Gaussian Blur", plan.records[0].displayName, "Gaussian Blur");
		assert(
			"research plan includes Directional negative probe",
			plan.tests.some(function (test) {
				return test.query === "directional blur -45" && test.probe === true;
			})
		);
		assert(
			"research plan includes decimal Gaussian probe",
			plan.tests.some(function (test) {
				return test.query === "gaussian blur 12.5" && test.probe === true;
			})
		);
		assert(
			"research plan includes genuine ambiguous parameter test",
			plan.tests.some(function (test) {
				return test.kind === "ambiguity" &&
					test.resolution.reason === "AMBIGUOUS_PARAMETER";
			})
		);
		assertEq(
			"research plan invalid suffix rejects as invalid value",
			plan.tests[plan.tests.length - 1].resolution.reason,
			"INVALID_VALUE"
		);

		beginCalls = 0;
		dispatchCalls = 0;
		rawScripts = [];
		result = null;
		Harness.run({
			csInterface: mockRawCS(),
			bridge: mockBridge(),
			resolver: Resolver,
			dispatcher: Dispatcher,
			effectExecutor: mockEffectExecutor(),
			commandExecutor: mockCommandExecutor(),
			registry: generated,
			productionFeatureEnabled: false,
			now: function () { return "2026-08-22T20:00:00.000Z"; }
		}, function (payload) {
			result = payload;
		});
		assertEq("research harness completes valid locked run", result.ok, true);
		assertEq("research harness verifies before every test", beginCalls, plan.tests.length);
		assert("research harness dispatches apply and value tests", dispatchCalls > 0);
		assert(
			"research harness raw apply calls only research host",
			rawScripts.every(function (script) {
				return script.indexOf("$._pickfx.researchTerminal") === 0;
			})
		);
		assertEq("research harness reports zero cleanup failures", result.summary.cleanupFailures, 0);
		assertEq("research harness reports six candidate effects tested", result.summary.candidateEffectsTested, 6);
		assert("research harness records successful apply-only dispatch", result.summary.successfullyApplied > 0);
		assert("research harness records verified writes", result.summary.successfullyWrittenReadBack > 0);
		assertEq("research harness completion verifies production untouched", result.completion.productionUntouched, true);
		assertEq(
			"research promotion manifest feature flag remains false",
			result.artifacts.promotion.productionFeatureFlagEnabled,
			false
		);
		assertEq(
			"research promotion manifest validates",
			Harness.validatePromotionManifest(result.artifacts.promotion).ok,
			true
		);
		assert(
			"research manifest contains promoted entries only",
			result.artifacts.promotion.effects.every(function (entry) {
				return entry.promotionStatus === "promoted";
			})
		);
		assertEq("research promotion manifest fabricates no transitions", result.artifacts.promotion.transitions.length, 0);

		beginCalls = 0;
		dispatchCalls = 0;
		rawScripts = [];
		result = null;
		Harness.run({
			csInterface: mockRawCS(),
			bridge: mockBridge({
				environment: {
					ok: false,
					reason: "RESEARCH_ENVIRONMENT_UNAVAILABLE",
					sequence: "Production"
				}
			}),
			resolver: Resolver,
			dispatcher: Dispatcher,
			effectExecutor: mockEffectExecutor(),
			commandExecutor: mockCommandExecutor(),
			registry: generated,
			productionFeatureEnabled: false
		}, function (payload) {
			result = payload;
		});
		assertEq("research environment lock rejects production sequence", result.reason, "RESEARCH_ENVIRONMENT_UNAVAILABLE");
		assertEq("research environment rejection performs zero live tests", beginCalls, 0);
		assertEq("research environment rejection performs zero dispatches", dispatchCalls, 0);

		beginCalls = 0;
		dispatchCalls = 0;
		rawScripts = [];
		result = null;
		Harness.run({
			csInterface: mockRawCS(),
			bridge: mockBridge(),
			resolver: Resolver,
			dispatcher: Dispatcher,
			effectExecutor: mockEffectExecutor(),
			commandExecutor: mockCommandExecutor(),
			registry: generated,
			productionFeatureEnabled: true
		}, function (payload) {
			result = payload;
		});
		assertEq("research harness refuses enabled production feature", result.reason, "PRODUCTION_FEATURE_FLAG_ENABLED");
		assertEq("enabled production flag performs zero preparation", beginCalls, 0);

		beginCalls = 0;
		dispatchCalls = 0;
		rawScripts = [];
		result = null;
		Harness.run({
			csInterface: mockRawCS(),
			bridge: mockBridge({
				finish: {
					ok: false,
					reason: "CLEANUP_FAILED",
					stopRun: true
				}
			}),
			resolver: Resolver,
			dispatcher: Dispatcher,
			effectExecutor: mockEffectExecutor(),
			commandExecutor: mockCommandExecutor(),
			registry: generated,
			productionFeatureEnabled: false
		}, function (payload) {
			result = payload;
		});
		assertEq("research cleanup failure stops validation", result.reason, "CLEANUP_FAILED");
		assertEq("research cleanup failure stops after one test", beginCalls, 1);
		assertEq("research cleanup failure counted", result.summary.cleanupFailures, 1);

		records = [{
			displayName: "Promoted FX",
			matchName: "TEST.Promoted",
			promotionStatus: "promoted",
			tests: [{
				kind: "apply-only",
				passed: true
			}, {
				kind: "apply-value",
				passed: true,
				value: 30,
				evaluation: { readBack: 30 },
				resolution: {
					parameter: {
						index: 1,
						displayName: "Amount",
						valueType: "number",
						confidence: "unique"
					}
				}
			}]
		}, {
			displayName: "Ambiguous FX",
			matchName: "TEST.Ambiguous",
			promotionStatus: "needs_manual_review",
			tests: []
		}];
		artifacts = Harness.buildArtifacts({
			environment: validEnvironment(),
			summary: {},
			records: records,
			nonCandidateTests: [],
			completion: { ok: true }
		}, generated, "2026-08-22T20:00:00.000Z");
		assertEq("promotion artifact excludes ambiguous entries", artifacts.promotion.effectCount, 1);
		assertEq("promotion artifact records exact validated parameter", artifacts.promotion.effects[0].parameters[0].displayName, "Amount");
		assertEq("promotion artifact records verified readback", artifacts.promotion.effects[0].parameters[0].valuesValidated[0].readBack, 30);

		source = fs.readFileSync(
			path.join(__pickfxRoot, "src/core/TerminalResearchHarness.js"),
			"utf8"
		);
		assert("research harness contains no direct setter call", source.indexOf(".setValue(") === -1);
		source = fs.readFileSync(
			path.join(__pickfxRoot, "src/premiere/research-registry-host.jsx"),
			"utf8"
		);
		assert("research host exposes strict target locator", source.indexOf("strictResearchTarget") !== -1);
		assert("research host requires exactly one named research clip", source.indexOf("Expected exactly one video TrackItem named") !== -1);
		assert("research host writes through existing parameter writer", source.indexOf("$._pickfxParameterWriter.set(") !== -1);
		assert("research host verifies deep parameter fingerprints", source.indexOf("parameterValueMismatches") !== -1);
		source = fs.readFileSync(
			path.join(__pickfxRoot, "src/panel/js/panel.js"),
			"utf8"
		);
		assert("research panel logs explicit target before tests", source.indexOf("TARGET:\\n    PickFX Research\\n    PickFX Research Clip") !== -1);
		assert("research panel does not enable terminal feature flag", source.indexOf("__PICKFX_TERMINAL_RESOLVER_ENABLED__ = true") === -1);
	}

	print("terminal research harness tests " + ((passed + failed) - startCount));
}());
