var TerminalExhaustiveHarness = (function () {
	var SCHEMA_VERSION = 1;
	var ARTIFACT_TYPE = "pickfx-terminal-registry-validation-run";
	var HARNESS_VERSION = "phase4b-20260822";
	var PROMOTION_ARTIFACT_TYPE = "pickfx-terminal-registry-promotion";
	var TEST_TIMEOUT_MS = 20000;

	function clone(value) {
		return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
	}

	function fold(value) {
		return String(value || "")
			.replace(/^\s+|\s+$/g, "")
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "");
	}

	function compareTests(a, b) {
		var effectCompare = fold(a.effectDisplayName);
		var otherEffect = fold(b.effectDisplayName);
		if (effectCompare < otherEffect) {
			return -1;
		}
		if (effectCompare > otherEffect) {
			return 1;
		}
		return a.parameterIndex - b.parameterIndex;
	}

	function buildPlan(audit) {
		var tests = [];
		var effects = audit && audit.effects ? audit.effects : [];
		var effect;
		var parameter;
		var i;
		var p;
		for (i = 0; i < effects.length; i++) {
			effect = effects[i];
			for (p = 0; p < (effect.parameters ? effect.parameters.length : 0); p++) {
				parameter = effect.parameters[p];
				if (!parameter.liveTestPlanned) {
					continue;
				}
				tests.push({
					testId: "pair-" + fold(effect.displayName) + "-" +
						fold(parameter.parameterDisplayName) + "-" +
						String(parameter.parameterIndex),
					effectDisplayName: effect.displayName,
					effectPremiereName: effect.premiereName || effect.displayName,
					effectMatchName: effect.matchName || null,
					parameterIndex: parameter.parameterIndex,
					parameterDisplayName: parameter.parameterDisplayName,
					registryValueType: parameter.valueType,
					registryCurrentValue: clone(parameter.currentValue),
					terminalReason: parameter.terminalReason
				});
			}
		}
		tests.sort(compareTests);
		for (i = 0; i < tests.length; i++) {
			tests[i].ordinal = i;
		}
		return {
			ordering: "effect displayName normalized ascending, parameter index ascending",
			totalTests: tests.length,
			tests: tests
		};
	}

	function resultSummary(state) {
		var summary = {
			totalPlanned: state.plan.totalTests,
			cursor: state.cursor,
			prevalidated: 1,
			passed: 1,
			failed: 0,
			unsupported: 0,
			manualReview: 0,
			cleanupFailures: 0,
			promotedPairs: 1,
			promotedEffects: 1
		};
		var promotedEffects = {};
		var result;
		var i;
		promotedEffects["Gaussian Blur"] = true;
		for (i = 0; i < state.results.length; i++) {
			result = state.results[i];
			if (result.status === "passed") {
				summary.passed += 1;
				summary.promotedPairs += 1;
				promotedEffects[result.effectDisplayName] = true;
			} else if (result.status === "unsupported") {
				summary.unsupported += 1;
			} else if (result.status === "manual_review") {
				summary.manualReview += 1;
			} else {
				summary.failed += 1;
			}
			if (result.reason === "CLEANUP_FAILED") {
				summary.cleanupFailures += 1;
			}
		}
		for (i in promotedEffects) {
			if (promotedEffects.hasOwnProperty(i)) {
				summary.promotedEffects += 1;
			}
		}
		summary.promotedEffects -= 1;
		return summary;
	}

	function createState(audit, options) {
		var plan = buildPlan(audit);
		var now = options && options.now ? options.now() : "";
		var state = {
			schemaVersion: SCHEMA_VERSION,
			artifactType: ARTIFACT_TYPE,
			harnessVersion: HARNESS_VERSION,
			status: "pending",
			stoppedReason: null,
			productionFeatureFlagEnabled: false,
			createdAt: now,
			updatedAt: now,
			completedAt: null,
			sourceRegistry: clone(audit && audit.sourceRegistry),
			auditClassifierVersion: audit && audit.classifierVersion,
			auditSummary: clone(audit && audit.summary),
			environment: null,
			plan: plan,
			cursor: 0,
			prevalidated: {
				testId: "pair-gaussian-blur-amount-5",
				reference: "phase4-gaussian-blur-30",
				effectDisplayName: "Gaussian Blur",
				effectMatchName: "AE.Impact_Blur_FX",
				parameterDisplayName: "Amount",
				parameterIndex: 5,
				requestedValue: 30,
				readBack: 30,
				verified: true,
				status: "prevalidated",
				passed: true,
				skipLiveRun: true
			},
			results: [],
			summary: null,
			promotion: null,
			completion: null
		};
		state.summary = resultSummary(state);
		state.promotion = buildPromotion(state);
		return state;
	}

	function stateCompatible(state, audit) {
		var expectedPlan;
		var i;
		if (!state ||
				state.schemaVersion !== SCHEMA_VERSION ||
				state.artifactType !== ARTIFACT_TYPE ||
				state.harnessVersion !== HARNESS_VERSION ||
				state.auditClassifierVersion !== audit.classifierVersion ||
				!state.plan ||
				!state.results) {
			return false;
		}
		expectedPlan = buildPlan(audit);
		if (expectedPlan.totalTests !== state.plan.totalTests) {
			return false;
		}
		for (i = 0; i < expectedPlan.tests.length; i++) {
			if (!state.plan.tests[i] ||
					state.plan.tests[i].testId !== expectedPlan.tests[i].testId) {
				return false;
			}
		}
		return true;
	}

	function findRuntimeParameter(parameters, test) {
		var found = null;
		var count = 0;
		var i;
		for (i = 0; i < (parameters ? parameters.length : 0); i++) {
			if (parameters[i] &&
					String(parameters[i].displayName || "") ===
						String(test.parameterDisplayName || "")) {
				found = parameters[i];
				count += 1;
			}
		}
		if (count !== 1) {
			return {
				ok: false,
				reason: count > 1
					? "AMBIGUOUS_PARAMETER"
					: "PARAMETER_NOT_FOUND",
				matchCount: count,
				parameter: null
			};
		}
		if (typeof found.index === "number" &&
				found.index !== test.parameterIndex) {
			return {
				ok: false,
				reason: "PARAMETER_IDENTITY_MISMATCH",
				matchCount: 1,
				expectedIndex: test.parameterIndex,
				actualIndex: found.index,
				parameter: null
			};
		}
		return {
			ok: true,
			matchCount: 1,
			parameter: found
		};
	}

	function valuePicker(options) {
		if (options && options.valuePicker) {
			return options.valuePicker;
		}
		return typeof SafeNumericTestValue !== "undefined"
			? SafeNumericTestValue
			: null;
	}

	function pickRuntimeValue(runtimeParameter, options) {
		var picker = valuePicker(options);
		var current = runtimeParameter && runtimeParameter.value;
		if (!runtimeParameter ||
				(runtimeParameter.type !== "number" &&
					runtimeParameter.type !== "angle")) {
			return {
				ok: false,
				reason: "LIVE_TYPE_NOT_NUMERIC",
				runtimeType: runtimeParameter && runtimeParameter.type
			};
		}
		if (runtimeParameter.writable !== true) {
			return {
				ok: false,
				reason: "PARAMETER_NOT_WRITABLE"
			};
		}
		if (!picker || typeof picker.generate !== "function") {
			return {
				ok: false,
				reason: "SAFE_VALUE_PICKER_UNAVAILABLE"
			};
		}
		return picker.generate(current, runtimeParameter);
	}

	function resolutionFor(test, value) {
		return {
			ok: true,
			type: "effect",
			query: test.effectDisplayName,
			value: value,
			hasValue: true,
			resolvedEffect: {
				type: "video-effect",
				name: test.effectDisplayName,
				displayName: test.effectDisplayName,
				premiereName: test.effectPremiereName,
				matchName: test.effectMatchName
			},
			parameter: {
				index: test.parameterIndex,
				displayName: test.parameterDisplayName,
				valueType: "number",
				confidence: "audited",
				score: null
			},
			execution: {
				type: "effect",
				action: "apply-and-set",
				requiresWrite: true,
				requiresReadBack: true,
				writerPath: "CommandExecutor.run"
			}
		};
	}

	function verifyNumber(picker, expected, actual) {
		if (picker && typeof picker.verify === "function") {
			return picker.verify(expected, actual);
		}
		return expected === actual;
	}

	function buildPromotion(state) {
		var byEffect = {};
		var effects = [];
		var pairs = [];
		var result;
		var effect;
		var name;
		var i;
		function addPair(pair) {
			var key = pair.effectDisplayName;
			if (!byEffect[key]) {
				byEffect[key] = {
					type: "video-effect",
					displayName: pair.effectDisplayName,
					premiereName: pair.effectPremiereName || pair.effectDisplayName,
					matchName: pair.effectMatchName || null,
					promotionStatus: "promoted",
					parameters: []
				};
			}
			byEffect[key].parameters.push({
				index: pair.parameterIndex,
				displayName: pair.parameterDisplayName,
				valueType: "number",
				requestedValue: pair.requestedValue,
				readBack: pair.readBack,
				verified: true
			});
			pairs.push({
				effectDisplayName: pair.effectDisplayName,
				effectMatchName: pair.effectMatchName || null,
				parameterIndex: pair.parameterIndex,
				parameterDisplayName: pair.parameterDisplayName,
				requestedValue: pair.requestedValue,
				readBack: pair.readBack,
				verified: true,
				promotionStatus: "promoted"
			});
		}
		addPair({
			effectDisplayName: "Gaussian Blur",
			effectPremiereName: "Gaussian Blur",
			effectMatchName: "AE.Impact_Blur_FX",
			parameterIndex: 5,
			parameterDisplayName: "Amount",
			requestedValue: 30,
			readBack: 30
		});
		for (i = 0; i < state.results.length; i++) {
			result = state.results[i];
			if (result.status === "passed" &&
					result.verified === true &&
					result.cleanup &&
					result.cleanup.ok === true) {
				addPair(result);
			}
		}
		for (name in byEffect) {
			if (byEffect.hasOwnProperty(name)) {
				effect = byEffect[name];
				effect.parameters.sort(function (a, b) {
					return a.index - b.index;
				});
				effects.push(effect);
			}
		}
		effects.sort(function (a, b) {
			return fold(a.displayName) < fold(b.displayName) ? -1 : 1;
		});
		pairs.sort(function (a, b) {
			var compared = fold(a.effectDisplayName) < fold(b.effectDisplayName)
				? -1
				: (fold(a.effectDisplayName) > fold(b.effectDisplayName) ? 1 : 0);
			return compared || a.parameterIndex - b.parameterIndex;
		});
		return {
			schemaVersion: SCHEMA_VERSION,
			artifactType: PROMOTION_ARTIFACT_TYPE,
			source: "PickFX exhaustive controlled research validation",
			harnessVersion: HARNESS_VERSION,
			productionFeatureFlagEnabled: false,
			effectCount: effects.length,
			pairCount: pairs.length,
			effects: effects,
			pairs: pairs,
			transitions: []
		};
	}

	function updateState(state, options) {
		state.updatedAt = options && options.now ? options.now() : state.updatedAt;
		state.summary = resultSummary(state);
		state.promotion = buildPromotion(state);
		if (options && typeof options.saveState === "function") {
			options.saveState(state);
		}
		if (options && typeof options.onProgress === "function") {
			options.onProgress(state);
		}
	}

	function validateState(state) {
		if (!state ||
				state.schemaVersion !== SCHEMA_VERSION ||
				state.artifactType !== ARTIFACT_TYPE ||
				state.productionFeatureFlagEnabled !== false ||
				!state.plan ||
				typeof state.plan.totalTests !== "number" ||
				!state.results ||
				!state.promotion ||
				state.promotion.productionFeatureFlagEnabled !== false ||
				state.promotion.transitions.length !== 0) {
			return { ok: false, reason: "VALIDATION_STATE_INVALID" };
		}
		if (state.cursor < 0 ||
				state.cursor > state.plan.totalTests ||
				state.results.length !== state.cursor) {
			return { ok: false, reason: "VALIDATION_CURSOR_INVALID" };
		}
		return { ok: true };
	}

	function auditParameterFor(audit, result) {
		var parameters = audit && audit.parameters ? audit.parameters : [];
		var row;
		var i;
		for (i = 0; i < parameters.length; i++) {
			row = parameters[i];
			if (row.effectDisplayName === result.effectDisplayName &&
					row.parameterIndex === result.parameterIndex &&
					row.parameterDisplayName === result.parameterDisplayName) {
				return row;
			}
		}
		return null;
	}

	function reconcileState(state, audit, options) {
		var result;
		var row;
		var reclassified = [];
		var i;
		if (!state || !audit) {
			return {
				ok: false,
				reason: "RECONCILIATION_INPUT_INVALID"
			};
		}
		for (i = 0; i < state.results.length; i++) {
			result = state.results[i];
			row = auditParameterFor(audit, result);
			if (!row) {
				result.status = "manual_review";
				result.reason = "AUDIT_IDENTITY_NOT_FOUND";
				result.promotionEligible = false;
				reclassified.push(result.testId);
				continue;
			}
			result.auditTerminalSafety = row.terminalSafety;
			result.auditTerminalReason = row.terminalReason;
			if (result.status === "passed" &&
					row.terminalSafety !== "safe_terminal") {
				result.status = row.terminalSafety === "unsupported"
					? "unsupported"
					: "manual_review";
				result.reason = row.terminalReason;
				result.promotionEligible = false;
				reclassified.push(result.testId);
			} else if (result.status === "passed") {
				result.promotionEligible = true;
			}
		}
		state.auditClassifierVersion = audit.classifierVersion;
		state.auditSummary = clone(audit.summary);
		state.reconciliation = {
			classifierVersion: audit.classifierVersion,
			reclassifiedCount: reclassified.length,
			reclassifiedTestIds: reclassified,
			reconciledAt: options && options.now ? options.now() : ""
		};
		state.updatedAt = options && options.now ? options.now() : state.updatedAt;
		state.summary = resultSummary(state);
		state.promotion = buildPromotion(state);
		return {
			ok: true,
			state: state,
			reclassifiedCount: reclassified.length,
			reclassifiedTestIds: reclassified
		};
	}

	function run(options, done) {
		var bridge = options && options.bridge;
		var dispatcher = options && options.dispatcher;
		var effectExecutor = options && options.effectExecutor;
		var commandExecutor = options && options.commandExecutor;
		var audit = options && options.audit;
		var rawCS = options && options.csInterface;
		var targetedCS;
		var state;
		var stopped = false;

		function schedule(fn, delay) {
			if (options && typeof options.schedule === "function") {
				options.schedule(fn, delay);
				return;
			}
			setTimeout(fn, delay);
		}

		function startTimer(fn, delay) {
			if (options && typeof options.startTimer === "function") {
				return options.startTimer(fn, delay);
			}
			return setTimeout(fn, delay);
		}

		function cancelTimer(timer) {
			if (options && typeof options.cancelTimer === "function") {
				options.cancelTimer(timer);
				return;
			}
			clearTimeout(timer);
		}

		function featureEnabled() {
			return options && typeof options.productionFeatureEnabled === "function"
				? options.productionFeatureEnabled() === true
				: options && options.productionFeatureEnabled === true;
		}

		function finishRun(status, reason) {
			if (stopped) {
				return;
			}
			stopped = true;
			state.status = status;
			state.stoppedReason = reason || null;
			if (status === "complete") {
				state.completedAt = options && options.now ? options.now() : "";
			}
			bridge.researchTerminalComplete(rawCS, function (completion) {
				state.completion = completion;
				if (!completion || completion.ok !== true) {
					state.status = "stopped";
					state.stoppedReason = state.stoppedReason || "CLEANUP_FAILED";
				}
				updateState(state, options);
				done(state);
			});
		}

		function storeResult(result) {
			state.results.push(result);
			state.cursor += 1;
			updateState(state, options);
		}

		function processNext() {
			var test;
			var settled = false;
			var timedOut = false;
			var timer;
			if (state.cursor >= state.plan.totalTests) {
				finishRun("complete", "");
				return;
			}
			if (featureEnabled()) {
				finishRun("stopped", "PRODUCTION_FEATURE_FLAG_ENABLED");
				return;
			}
			test = state.plan.tests[state.cursor];
			if (options && typeof options.onBeforeTest === "function") {
				options.onBeforeTest(test, state);
			}
			timer = startTimer(function () {
				timedOut = true;
			}, options && options.timeoutMs ? options.timeoutMs : TEST_TIMEOUT_MS);

			bridge.researchTerminalBeginTest(
				rawCS,
				test.testId,
				test.effectDisplayName,
				test.effectMatchName || "",
				function (begun) {
					var startedAt = options && options.now ? options.now() : "";
					function finalize(execution, runtimeParameter, requestedValue, failureReason) {
						bridge.researchTerminalFinishTest(
							rawCS,
							true,
							function (cleanup) {
								var actual = execution &&
									(execution.actualValue !== undefined
										? execution.actualValue
										: execution.readBack);
								var picker = valuePicker(options);
								var verified = !!(
									execution &&
									execution.ok === true &&
									execution.verified === true &&
									verifyNumber(picker, requestedValue, actual)
								);
								var cleanupOk = !!(
									cleanup &&
									cleanup.ok === true &&
									cleanup.fingerprintRestored === true &&
									cleanup.productionUntouched === true &&
									cleanup.cleanupResult &&
									cleanup.cleanupResult.parameterValueMismatches === 0 &&
									cleanup.cleanupResult.unexpectedComponents === 0
								);
								var status = failureReason
									? (failureReason === "LIVE_TYPE_NOT_NUMERIC" ||
										failureReason === "PARAMETER_NOT_WRITABLE" ||
										failureReason === "NO_SAFE_TEST_VALUE"
										? "unsupported"
										: "failed")
									: (verified && cleanupOk ? "passed" : "failed");
								var reason = cleanupOk
									? (failureReason || (verified ? "" :
										(execution && execution.reason) ||
										"VALUE_NOT_VERIFIED"))
									: "CLEANUP_FAILED";
								if (settled) {
									return;
								}
								settled = true;
								cancelTimer(timer);
								storeResult({
									testId: test.testId,
									status: status,
									reason: reason,
									effectDisplayName: test.effectDisplayName,
									effectPremiereName: test.effectPremiereName,
									effectMatchName: test.effectMatchName,
									parameterIndex: test.parameterIndex,
									parameterDisplayName: test.parameterDisplayName,
									runtimeParameter: clone(runtimeParameter),
									requestedValue: requestedValue,
									readBack: actual,
									verified: verified,
									execution: clone(execution),
									componentIdentity: cleanup && cleanup.addedComponent
										? {
											componentIndex: cleanup.addedComponent.componentIndex,
											displayName: cleanup.addedComponent.displayName,
											matchName: cleanup.addedComponent.matchName
										}
										: null,
									cleanup: clone(cleanup),
									startedAt: startedAt,
									finishedAt: options && options.now ? options.now() : ""
								});
								if (!cleanupOk) {
									finishRun("stopped", "CLEANUP_FAILED");
									return;
								}
								schedule(processNext, 25);
							}
						);
					}

					if (!begun || begun.ok !== true) {
						if (!settled) {
							settled = true;
							cancelTimer(timer);
							state.status = "stopped";
							state.stoppedReason = (begun && begun.reason) ||
								"RESEARCH_ENVIRONMENT_UNAVAILABLE";
							updateState(state, options);
							finishRun("stopped", state.stoppedReason);
						}
						return;
					}
					effectExecutor.applyEffect(
						targetedCS,
						test.effectPremiereName,
						function (applied) {
							if (timedOut) {
								finalize(applied, null, null, "TIMEOUT");
								return;
							}
							if (!applied || applied.ok !== true || applied.applied !== 1) {
								finalize(applied, null, null,
									(applied && applied.reason) || "APPLY_FAILED");
								return;
							}
							bridge.listEffectParameters(
								targetedCS,
								test.effectPremiereName,
								function (listed) {
									var runtime = findRuntimeParameter(
										listed && listed.parameters,
										test
									);
									var picked;
									var resolution;
									if (timedOut) {
										finalize(listed, null, null, "TIMEOUT");
										return;
									}
									if (!listed || listed.ok !== true) {
										finalize(listed, null, null,
											(listed && listed.reason) ||
											"PARAMETER_NOT_FOUND");
										return;
									}
									if (!runtime.ok) {
										finalize(runtime, null, null, runtime.reason);
										return;
									}
									picked = pickRuntimeValue(runtime.parameter, options);
									if (!picked.ok) {
										finalize(
											picked,
											runtime.parameter,
											null,
											picked.reason
										);
										return;
									}
									resolution = resolutionFor(test, picked.value);
									dispatcher.dispatch(
										targetedCS,
										resolution,
										{
											featureEnabled: true,
											researchValidation: true,
											effectExecutor: effectExecutor,
											commandExecutor: commandExecutor
										},
										function (written) {
											if (timedOut && written && written.ok === true) {
												written.ok = false;
												written.reason = "TIMEOUT";
											}
											finalize(
												written,
												runtime.parameter,
												picked.value,
												timedOut ? "TIMEOUT" : ""
											);
										}
									);
								}
							);
						}
					);
				}
			);
		}

		if (typeof done !== "function") {
			return;
		}
		if (!bridge ||
				!dispatcher ||
				!effectExecutor ||
				!commandExecutor ||
				!audit ||
				!rawCS ||
				typeof bridge.researchTerminalPrepare !== "function" ||
				typeof bridge.listEffectParameters !== "function") {
			done({
				ok: false,
				reason: "VALIDATION_DEPENDENCY_UNAVAILABLE"
			});
			return;
		}
		if (featureEnabled()) {
			done({
				ok: false,
				reason: "PRODUCTION_FEATURE_FLAG_ENABLED",
				productionFeatureFlagEnabled: true
			});
			return;
		}
		state = options && options.existingState &&
			stateCompatible(options.existingState, audit)
			? options.existingState
			: createState(audit, options);
		if (state.status === "complete") {
			done(state);
			return;
		}
		if (state.stoppedReason === "CLEANUP_FAILED" &&
				!(options && options.resumeAfterCleanupVerified === true)) {
			done(state);
			return;
		}
		targetedCS = TerminalResearchHarness.createTargetedCSInterface(rawCS);
		state.status = "preparing";
		state.stoppedReason = null;
		updateState(state, options);
		bridge.researchTerminalPrepare(rawCS, function (environment) {
			if (!environment ||
					environment.ok !== true ||
					environment.environment !== "research" ||
					environment.sequence !== "PickFX Research" ||
					environment.trackItemName !== "PickFX Research Clip.mp4" ||
					environment.videoTrackItem !== true) {
				state.status = "stopped";
				state.stoppedReason = "RESEARCH_ENVIRONMENT_UNAVAILABLE";
				state.environment = environment || null;
				updateState(state, options);
				done(state);
				return;
			}
			state.environment = environment;
			state.status = "running";
			updateState(state, options);
			processNext();
		});
	}

	return {
		SCHEMA_VERSION: SCHEMA_VERSION,
		ARTIFACT_TYPE: ARTIFACT_TYPE,
		HARNESS_VERSION: HARNESS_VERSION,
		PROMOTION_ARTIFACT_TYPE: PROMOTION_ARTIFACT_TYPE,
		TEST_TIMEOUT_MS: TEST_TIMEOUT_MS,
		buildPlan: buildPlan,
		createState: createState,
		stateCompatible: stateCompatible,
		findRuntimeParameter: findRuntimeParameter,
		pickRuntimeValue: pickRuntimeValue,
		resolutionFor: resolutionFor,
		resultSummary: resultSummary,
		buildPromotion: buildPromotion,
		validateState: validateState,
		reconcileState: reconcileState,
		run: run
	};
}());

if (typeof module !== "undefined" && module.exports) {
	module.exports = TerminalExhaustiveHarness;
}
