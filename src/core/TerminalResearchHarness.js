var TerminalResearchHarness = (function () {
	var ARTIFACT_SCHEMA_VERSION = 1;
	var PROMOTION_ARTIFACT_TYPE = "pickfx-terminal-registry-promotion";
	var VALIDATION_ARTIFACT_TYPE = "pickfx-terminal-registry-validation";
	var HARNESS_VERSION = "phase4-20260822";
	var RESEARCH_SEQUENCE_NAME = "PickFX Research";
	var RESEARCH_CLIP_NAME = "PickFX Research Clip";
	var CANDIDATE_NAMES = [
		"Gaussian Blur",
		"Directional Blur",
		"Sharpen",
		"Drop Shadow",
		"Transform",
		"Lumetri Color"
	];

	function trim(value) {
		return String(value || "").replace(/^\s+|\s+$/g, "");
	}

	function fold(value) {
		return trim(value).toLowerCase();
	}

	function copy(value) {
		return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
	}

	function findEffect(registry, displayName) {
		var effects = registry && registry.effects ? registry.effects : [];
		var wanted = fold(displayName);
		var i;
		for (i = 0; i < effects.length; i++) {
			if (fold(effects[i] && effects[i].displayName) === wanted) {
				return effects[i];
			}
		}
		return null;
	}

	function parameterMetadata(effect) {
		var parameters = effect && effect.parameters ? effect.parameters : [];
		var result = [];
		var i;
		for (i = 0; i < parameters.length; i++) {
			if (parameters[i] && parameters[i].valueType === "number" &&
					parameters[i].hasGetValue === true &&
					parameters[i].hasSetValue === true &&
					parameters[i].isTimeVarying !== true &&
					trim(parameters[i].displayName)) {
				result.push({
					index: parameters[i].index,
					displayName: parameters[i].displayName,
					matchName: parameters[i].matchName || null,
					valueType: parameters[i].valueType,
					currentValue: parameters[i].currentValue,
					min: parameters[i].min,
					max: parameters[i].max,
					inferredSection: parameters[i].inferredSection || null
				});
			}
		}
		return result;
	}

	function makeTest(id, kind, query, candidate, resolution, options) {
		options = options || {};
		return {
			id: id,
			kind: kind,
			query: query,
			candidateName: candidate ? candidate.displayName : "",
			effectName: candidate ? candidate.displayName : "",
			effectMatchName: candidate ? (candidate.matchName || "") : "",
			resolution: resolution,
			shouldDispatch: resolution && resolution.ok === true,
			expectMutation: resolution && resolution.ok === true,
			expectedReason: options.expectedReason || "",
			requiredForPromotion: options.requiredForPromotion === true,
			probe: options.probe === true,
			value: resolution && resolution.hasValue ? resolution.value : null
		};
	}

	function valueQueriesFor(candidate) {
		switch (candidate.displayName) {
		case "Gaussian Blur":
			return [
				{ query: "gaussian blur 30", required: true },
				{ query: "gaussian blur 12.5", required: true, probe: true }
			];
		case "Directional Blur":
			return [
				{ query: "directional blur 45", required: true },
				{ query: "directional blur -45", required: false, probe: true }
			];
		default:
			return [{
				query: fold(candidate.displayName) + " 30",
				required: true
			}];
		}
	}

	function buildPlan(registry, resolver) {
		var candidates = [];
		var records = [];
		var tests = [];
		var candidate;
		var resolution;
		var valueQueries;
		var i;
		var q;
		for (i = 0; i < CANDIDATE_NAMES.length; i++) {
			candidate = findEffect(registry, CANDIDATE_NAMES[i]);
			if (!candidate) {
				continue;
			}
			candidates.push(candidate);
			records.push({
				displayName: candidate.displayName,
				matchName: candidate.matchName || null,
				parameterMetadata: parameterMetadata(candidate),
				promotionStatus: "candidate",
				tests: []
			});
			resolution = resolver.resolve(fold(candidate.displayName), registry);
			tests.push(makeTest(
				"apply-" + fold(candidate.displayName).replace(/\s+/g, "-"),
				"apply-only",
				fold(candidate.displayName),
				candidate,
				resolution,
				{ requiredForPromotion: true }
			));
			valueQueries = valueQueriesFor(candidate);
			for (q = 0; q < valueQueries.length; q++) {
				resolution = resolver.resolve(valueQueries[q].query, registry);
				tests.push(makeTest(
					"value-" + fold(candidate.displayName).replace(/\s+/g, "-") + "-" + q,
					resolution && resolution.reason === "AMBIGUOUS_PARAMETER"
						? "ambiguity"
						: "apply-value",
					valueQueries[q].query,
					candidate,
					resolution,
					{
						expectedReason: resolution && resolution.ok !== true
							? resolution.reason
							: "",
						requiredForPromotion: valueQueries[q].required,
						probe: valueQueries[q].probe
					}
				));
			}
		}
		resolution = resolver.resolve("completely nonexistent effect", registry);
		tests.push(makeTest(
			"unknown-effect",
			"unknown-effect",
			"completely nonexistent effect",
			null,
			resolution,
			{ expectedReason: "EFFECT_NOT_FOUND" }
		));
		resolution = resolver.resolve("gaussian blur abc", registry);
		tests.push(makeTest(
			"invalid-value",
			"invalid-value",
			"gaussian blur abc",
			null,
			resolution,
			{ expectedReason: "INVALID_VALUE" }
		));
		return {
			candidates: candidates,
			records: records,
			tests: tests
		};
	}

	function routeScript(script) {
		var routes = [
			{
				from: "$._pickfx.applyEffect(",
				to: "$._pickfx.researchTerminalApplyEffect("
			},
			{
				from: "$._pickfx.ensureEffectOnSelection(",
				to: "$._pickfx.researchTerminalEnsureEffect("
			},
			{
				from: "$._pickfx.listEffectParameters(",
				to: "$._pickfx.researchTerminalListParameters("
			},
			{
				from: "$._pickfx.setParameter(",
				to: "$._pickfx.researchTerminalSetParameter("
			}
		];
		var i;
		for (i = 0; i < routes.length; i++) {
			if (String(script || "").indexOf(routes[i].from) === 0) {
				return {
					ok: true,
					script: routes[i].to + String(script).substring(routes[i].from.length),
					from: routes[i].from,
					to: routes[i].to
				};
			}
		}
		return {
			ok: false,
			reason: "RESEARCH_TARGET_ROUTE_DENIED",
			script: String(script || "")
		};
	}

	function createTargetedCSInterface(raw) {
		return {
			__pickfxResearchTarget: true,
			evalScript: function (script, done) {
				var routed = routeScript(script);
				if (!routed.ok) {
					done(JSON.stringify({
						ok: false,
						reason: routed.reason,
						detail: "Controlled validation denied a non-research host route."
					}));
					return;
				}
				raw.evalScript(routed.script, done);
			}
		};
	}

	function numbersEqual(a, b) {
		return typeof a === "number" &&
			typeof b === "number" &&
			isFinite(a) &&
			isFinite(b) &&
			Math.abs(a - b) <= 0.000001;
	}

	function evaluateTest(test, execution, finish) {
		var readBack;
		var passed = false;
		var reason = "";
		if (!finish || finish.ok !== true) {
			return {
				ok: false,
				reason: (finish && finish.reason) || "CLEANUP_FAILED",
				stopRun: true
			};
		}
		if (!test.shouldDispatch) {
			passed = !!(
				test.resolution &&
				test.resolution.ok !== true &&
				test.resolution.reason === test.expectedReason &&
				finish.mutationObserved !== true &&
				finish.fingerprintRestored === true &&
				finish.productionUntouched === true
			);
			reason = passed ? "" : (test.resolution && test.resolution.reason) || "UNEXPECTED_RESULT";
		} else if (test.kind === "apply-only") {
			passed = !!(
				execution &&
				execution.ok === true &&
				execution.applied >= 1 &&
				finish.mutationObserved === true &&
				finish.effectIdentityMatches === true &&
				finish.fingerprintRestored === true &&
				finish.productionUntouched === true
			);
			reason = passed ? "" : (execution && execution.reason) || "APPLY_FAILED";
		} else {
			readBack = execution && execution.actualValue;
			if (readBack === undefined && execution) {
				readBack = execution.readBack;
			}
			passed = !!(
				execution &&
				execution.ok === true &&
				execution.verified === true &&
				numbersEqual(readBack, test.value) &&
				finish.mutationObserved === true &&
				finish.effectIdentityMatches === true &&
				finish.fingerprintRestored === true &&
				finish.productionUntouched === true
			);
			reason = passed ? "" : (execution && execution.reason) || "WRITE_FAILED";
		}
		return {
			ok: passed,
			reason: reason,
			stopRun: false,
			readBack: readBack
		};
	}

	function recordFor(records, candidateName) {
		var i;
		for (i = 0; i < records.length; i++) {
			if (records[i].displayName === candidateName) {
				return records[i];
			}
		}
		return null;
	}

	function finishPromotionStatuses(records) {
		var record;
		var applyPassed;
		var requiredWriteSeen;
		var requiredWritePassed;
		var ambiguous;
		var failed;
		var i;
		var t;
		for (i = 0; i < records.length; i++) {
			record = records[i];
			applyPassed = false;
			requiredWriteSeen = false;
			requiredWritePassed = true;
			ambiguous = false;
			failed = false;
			for (t = 0; t < record.tests.length; t++) {
				if (record.tests[t].kind === "apply-only") {
					applyPassed = record.tests[t].passed === true;
				}
				if (record.tests[t].resolution &&
						record.tests[t].resolution.reason === "AMBIGUOUS_PARAMETER") {
					ambiguous = true;
				}
				if (record.tests[t].kind === "apply-value" &&
						record.tests[t].requiredForPromotion) {
					requiredWriteSeen = true;
					if (record.tests[t].passed !== true) {
						requiredWritePassed = false;
					}
				}
				if (record.tests[t].cleanupResult &&
						record.tests[t].cleanupResult.ok !== true) {
					failed = true;
				}
			}
			if (failed || !applyPassed) {
				record.promotionStatus = "rejected";
			} else if (ambiguous || !requiredWriteSeen) {
				record.promotionStatus = "needs_manual_review";
			} else if (requiredWritePassed) {
				record.promotionStatus = "promoted";
			} else {
				record.promotionStatus = "rejected";
			}
		}
		return records;
	}

	function summary(records, tests, stoppedReason) {
		var result = {
			candidateEffectsAvailable: records.length,
			candidateEffectsTested: 0,
			successfullyApplied: 0,
			successfullyWrittenReadBack: 0,
			rejected: 0,
			ambiguous: 0,
			cleanupFailures: 0,
			promoted: 0,
			stoppedReason: stoppedReason || null
		};
		var i;
		var t;
		for (i = 0; i < records.length; i++) {
			for (t = 0; t < records[i].tests.length; t++) {
				if (records[i].tests[t].kind === "apply-only") {
					result.candidateEffectsTested += 1;
					if (records[i].tests[t].passed) {
						result.successfullyApplied += 1;
					}
				}
				if (records[i].tests[t].kind === "apply-value" &&
						records[i].tests[t].passed) {
					result.successfullyWrittenReadBack += 1;
				}
				if (records[i].tests[t].finish &&
						records[i].tests[t].finish.reason === "CLEANUP_FAILED") {
					result.cleanupFailures += 1;
				}
			}
			if (records[i].promotionStatus === "rejected") {
				result.rejected += 1;
			} else if (records[i].promotionStatus === "needs_manual_review") {
				result.ambiguous += 1;
			} else if (records[i].promotionStatus === "promoted") {
				result.promoted += 1;
			}
		}
		for (i = 0; i < tests.length; i++) {
			if (tests[i].finish && tests[i].finish.reason === "CLEANUP_FAILED" &&
					!tests[i].candidateName) {
				result.cleanupFailures += 1;
			}
		}
		return result;
	}

	function promotedParameterRecords(record) {
		var parameters = [];
		var byName = {};
		var test;
		var name;
		var i;
		for (i = 0; i < record.tests.length; i++) {
			test = record.tests[i];
			if (test.kind !== "apply-value" || test.passed !== true ||
					!test.resolution || !test.resolution.parameter) {
				continue;
			}
			name = test.resolution.parameter.displayName;
			if (!byName[name]) {
				byName[name] = {
					index: test.resolution.parameter.index,
					displayName: name,
					valueType: test.resolution.parameter.valueType,
					confidence: test.resolution.parameter.confidence,
					valuesValidated: []
				};
				parameters.push(byName[name]);
			}
			byName[name].valuesValidated.push({
				requested: test.value,
				readBack: test.evaluation && test.evaluation.readBack,
				verified: true
			});
		}
		return parameters;
	}

	function buildArtifacts(run, registry, generatedAt) {
		var promoted = [];
		var i;
		var record;
		for (i = 0; i < run.records.length; i++) {
			record = run.records[i];
			if (record.promotionStatus !== "promoted") {
				continue;
			}
			promoted.push({
				type: "video-effect",
				displayName: record.displayName,
				premiereName: record.displayName,
				matchName: record.matchName,
				applyOnlyValidated: true,
				parameters: promotedParameterRecords(record),
				promotionStatus: "promoted"
			});
		}
		return {
			promotion: {
				schemaVersion: ARTIFACT_SCHEMA_VERSION,
				artifactType: PROMOTION_ARTIFACT_TYPE,
				source: "PickFX controlled research terminal validation",
				harnessVersion: HARNESS_VERSION,
				generatedAt: generatedAt,
				environment: {
					sequence: RESEARCH_SEQUENCE_NAME,
					clip: RESEARCH_CLIP_NAME
				},
				sourceRegistry: copy(registry && registry.sourceRegistry),
				productionFeatureFlagEnabled: false,
				effectCount: promoted.length,
				effects: promoted,
				transitions: []
			},
			validation: {
				schemaVersion: ARTIFACT_SCHEMA_VERSION,
				artifactType: VALIDATION_ARTIFACT_TYPE,
				source: "PickFX controlled research terminal validation",
				harnessVersion: HARNESS_VERSION,
				generatedAt: generatedAt,
				environment: copy(run.environment),
				productionFeatureFlagEnabled: false,
				summary: copy(run.summary),
				candidates: copy(run.records),
				nonCandidateTests: copy(run.nonCandidateTests),
				completion: copy(run.completion)
			}
		};
	}

	function validatePromotionManifest(manifest) {
		var i;
		if (!manifest ||
				manifest.schemaVersion !== ARTIFACT_SCHEMA_VERSION ||
				manifest.artifactType !== PROMOTION_ARTIFACT_TYPE ||
				manifest.productionFeatureFlagEnabled !== false ||
				!manifest.effects ||
				typeof manifest.effects.length !== "number" ||
				!manifest.transitions ||
				manifest.transitions.length !== 0) {
			return { ok: false, reason: "PROMOTION_MANIFEST_INVALID" };
		}
		for (i = 0; i < manifest.effects.length; i++) {
			if (!manifest.effects[i] ||
					manifest.effects[i].promotionStatus !== "promoted" ||
					!trim(manifest.effects[i].displayName) ||
					manifest.effects[i].applyOnlyValidated !== true) {
				return {
					ok: false,
					reason: "PROMOTION_ENTRY_INVALID",
					effectIndex: i
				};
			}
		}
		if (manifest.effectCount !== manifest.effects.length) {
			return { ok: false, reason: "PROMOTION_COUNT_MISMATCH" };
		}
		return { ok: true, effectCount: manifest.effects.length };
	}

	function run(options, done) {
		var resolver = options && options.resolver;
		var dispatcher = options && options.dispatcher;
		var bridge = options && options.bridge;
		var registry = options && options.registry;
		var rawCS = options && options.csInterface;
		var targetedCS;
		var plan;
		var completedTests = [];
		var stoppedReason = "";
		var environment;
		var index = 0;

		function completeRun() {
			var runResult;
			var nonCandidateTests = [];
			var i;
			for (i = 0; i < completedTests.length; i++) {
				if (!completedTests[i].candidateName) {
					nonCandidateTests.push(completedTests[i]);
				}
			}
			finishPromotionStatuses(plan.records);
			runResult = {
				ok: !stoppedReason,
				reason: stoppedReason,
				environment: environment,
				records: plan.records,
				nonCandidateTests: nonCandidateTests,
				tests: completedTests,
				completion: null
			};
			bridge.researchTerminalComplete(rawCS, function (completion) {
				if (!completion || completion.ok !== true) {
					runResult.ok = false;
					runResult.reason = runResult.reason || "CLEANUP_FAILED";
				}
				runResult.completion = completion;
				runResult.summary = summary(
					runResult.records,
					runResult.tests,
					runResult.reason
				);
				runResult.artifacts = buildArtifacts(
					runResult,
					registry,
					options && options.now ? options.now() : new Date().toISOString()
				);
				done(runResult);
			});
		}

		function storeTest(test, execution, finish, evaluation) {
			var stored = {
				id: test.id,
				kind: test.kind,
				query: test.query,
				candidateName: test.candidateName,
				requiredForPromotion: test.requiredForPromotion,
				probe: test.probe,
				value: test.value,
				resolution: copy(test.resolution),
				execution: copy(execution),
				readBackResult: execution && {
					expected: test.value,
					actual: execution.actualValue !== undefined
						? execution.actualValue
						: execution.readBack,
					verified: execution.verified === true
				},
				finish: copy(finish),
				cleanupResult: finish && finish.cleanupResult,
				evaluation: copy(evaluation),
				passed: evaluation && evaluation.ok === true
			};
			var record = recordFor(plan.records, test.candidateName);
			completedTests.push(stored);
			if (record) {
				record.tests.push(stored);
			}
		}

		function runNext() {
			var test;
			if (stoppedReason || index >= plan.tests.length) {
				completeRun();
				return;
			}
			test = plan.tests[index];
			index += 1;
			if (options && typeof options.onBeforeTest === "function") {
				options.onBeforeTest({
					target: "TARGET: PickFX Research / PickFX Research Clip",
					testId: test.id,
					query: test.query
				});
			}
			bridge.researchTerminalBeginTest(
				rawCS,
				test.id,
				test.effectName,
				test.effectMatchName,
				function (begun) {
					function finish(execution) {
						bridge.researchTerminalFinishTest(
							rawCS,
							test.expectMutation,
							function (finished) {
								var evaluation = evaluateTest(test, execution, finished);
								storeTest(test, execution, finished, evaluation);
								if (!evaluation.ok && evaluation.stopRun) {
									stoppedReason = evaluation.reason || "CLEANUP_FAILED";
								}
								runNext();
							}
						);
					}
					if (!begun || begun.ok !== true) {
						storeTest(test, null, begun, {
							ok: false,
							reason: (begun && begun.reason) ||
								"RESEARCH_ENVIRONMENT_UNAVAILABLE",
							stopRun: true
						});
						stoppedReason = (begun && begun.reason) ||
							"RESEARCH_ENVIRONMENT_UNAVAILABLE";
						runNext();
						return;
					}
					if (!test.shouldDispatch) {
						finish({
							ok: false,
							reason: test.resolution && test.resolution.reason,
							dispatchSkipped: true
						});
						return;
					}
					dispatcher.dispatch(
						targetedCS,
						test.resolution,
						{
							featureEnabled: true,
							researchValidation: true,
							effectExecutor: options.effectExecutor,
							commandExecutor: options.commandExecutor
						},
						finish
					);
				}
			);
		}

		if (typeof done !== "function") {
			return;
		}
		if (!resolver || !dispatcher || !bridge || !rawCS ||
				!registry || !registry.effects) {
			done({ ok: false, reason: "VALIDATION_DEPENDENCY_UNAVAILABLE" });
			return;
		}
		if (options.productionFeatureEnabled === true) {
			done({
				ok: false,
				reason: "PRODUCTION_FEATURE_FLAG_ENABLED",
				productionFeatureFlagEnabled: true
			});
			return;
		}
		targetedCS = createTargetedCSInterface(rawCS);
		plan = buildPlan(registry, resolver);
		bridge.researchTerminalPrepare(rawCS, function (prepared) {
			environment = prepared;
			if (!prepared ||
					prepared.ok !== true ||
					prepared.environment !== "research" ||
					prepared.sequence !== RESEARCH_SEQUENCE_NAME ||
					prepared.clip !== RESEARCH_CLIP_NAME ||
					prepared.videoTrackItem !== true ||
					prepared.builderAvailable !== true ||
					prepared.discoveryAvailable !== true) {
				done({
					ok: false,
					reason: "RESEARCH_ENVIRONMENT_UNAVAILABLE",
					environment: prepared || null,
					records: plan.records,
					tests: []
				});
				return;
			}
			runNext();
		});
	}

	return {
		ARTIFACT_SCHEMA_VERSION: ARTIFACT_SCHEMA_VERSION,
		PROMOTION_ARTIFACT_TYPE: PROMOTION_ARTIFACT_TYPE,
		VALIDATION_ARTIFACT_TYPE: VALIDATION_ARTIFACT_TYPE,
		HARNESS_VERSION: HARNESS_VERSION,
		RESEARCH_SEQUENCE_NAME: RESEARCH_SEQUENCE_NAME,
		RESEARCH_CLIP_NAME: RESEARCH_CLIP_NAME,
		CANDIDATE_NAMES: CANDIDATE_NAMES.slice(),
		findEffect: findEffect,
		parameterMetadata: parameterMetadata,
		buildPlan: buildPlan,
		routeScript: routeScript,
		createTargetedCSInterface: createTargetedCSInterface,
		evaluateTest: evaluateTest,
		finishPromotionStatuses: finishPromotionStatuses,
		summary: summary,
		buildArtifacts: buildArtifacts,
		validatePromotionManifest: validatePromotionManifest,
		run: run
	};
}());

if (typeof module !== "undefined" && module.exports) {
	module.exports = TerminalResearchHarness;
}
