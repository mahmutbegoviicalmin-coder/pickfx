(function () {
	var startCount = passed + failed;
	var Readiness = TerminalProductionReadinessAudit;
	var registry;
	var audit;
	var validation;
	var promotion;
	var artifacts;
	var validated;
	var full;
	var ready;
	var storedFull;
	var storedReady;
	var markdown;
	var effectByName = {};
	var readyPairKeys = {};
	var promotionPairKeys = {};
	var allowedStatuses = {};
	var gaussian;
	var amount;
	var statusTotal;
	var validatedEffects = [
		"Camera Shake",
		"Fast Blur",
		"Gaussian Blur (Legacy)",
		"MPEG Source Settings",
		"PRORES RAW Source Settings",
		"Sony RAW MXF Source Settings",
		"Sony Raw Source Settings",
		"VR Fractal Noise"
	];
	var failedEffects = [
		"Alpha Adjust",
		"Spacer",
		"Tint",
		"Track Matte Key",
		"Vignette"
	];
	var effect;
	var parameter;
	var pair;
	var key;
	var i;
	var p;

	if (typeof fs !== "undefined" &&
			typeof path !== "undefined" &&
			typeof __pickfxRoot === "string") {
		registry = JSON.parse(fs.readFileSync(path.join(
			__pickfxRoot,
			"src/data/terminal-registry.generated.json"
		), "utf8"));
		audit = JSON.parse(fs.readFileSync(path.join(
			__pickfxRoot,
			"src/data/terminal-registry.audit.json"
		), "utf8"));
		validation = JSON.parse(fs.readFileSync(path.join(
			__pickfxRoot,
			"src/data/terminal-registry.validation-run.json"
		), "utf8"));
		promotion = JSON.parse(fs.readFileSync(path.join(
			__pickfxRoot,
			"src/data/terminal-registry.promotion.json"
		), "utf8"));
		storedFull = JSON.parse(fs.readFileSync(path.join(
			__pickfxRoot,
			"src/data/terminal-registry.production-readiness-audit.json"
		), "utf8"));
		storedReady = JSON.parse(fs.readFileSync(path.join(
			__pickfxRoot,
			"src/data/terminal-registry.production-ready.json"
		), "utf8"));
		markdown = fs.readFileSync(path.join(
			__pickfxRoot,
			"src/data/terminal-registry.production-ready.md"
		), "utf8");

		artifacts = Readiness.build(
			registry,
			audit,
			validation,
			promotion,
			{ generatedAt: "test" }
		);
		validated = Readiness.validate(artifacts);
		full = artifacts.fullAudit;
		ready = artifacts.productionReady;

		assertEq(
			"phase5b readiness artifact validates",
			validated.ok,
			true
		);
		assertEq(
			"phase5b total effects",
			full.summary.totalEffects,
			134
		);
		assertEq(
			"phase5b production-ready effects",
			full.summary.effectsProductionReady,
			36
		);
		assertEq(
			"phase5b apply-only-ready effects",
			full.summary.effectsApplyOnlyReady,
			0
		);
		assertEq(
			"phase5b parameter-write-ready effects",
			full.summary.effectsWithParameterWritesReady,
			36
		);
		assertEq(
			"phase5b not-ready effects",
			full.summary.effectsNotProductionReady,
			98
		);
		assertEq(
			"phase5b total parameters",
			full.summary.totalParameters,
			2434
		);
		assertEq(
			"phase5b production-ready parameters",
			full.summary.productionReadyParameters,
			36
		);
		assertEq(
			"phase5b validated not promoted parameters",
			full.summary.validatedButNotPromoted,
			8
		);
		assertEq(
			"phase5b ambiguous parameters",
			full.summary.ambiguous,
			1135
		);
		assertEq(
			"phase5b manual-review exclusive parameters",
			full.summary.manualReview,
			1120
		);
		assertEq(
			"phase5b unsupported parameters",
			full.summary.unsupported,
			130
		);
		assertEq(
			"phase5b failed parameters",
			full.summary.failed,
			5
		);
		assertEq(
			"phase5b not-validated residual parameters",
			full.summary.notValidated,
			0
		);
		statusTotal =
			full.summary.productionReadyParameters +
			full.summary.validatedButNotPromoted +
			full.summary.ambiguous +
			full.summary.manualReview +
			full.summary.unsupported +
			full.summary.failed +
			full.summary.notValidated;
		assertEq(
			"phase5b parameter statuses are exhaustive",
			statusTotal,
			2434
		);

		assertEq(
			"phase5b full artifact includes all effects",
			full.effects.length,
			134
		);
		assertEq(
			"phase5b ready artifact contains ready effects only",
			ready.effects.length,
			36
		);
		assertEq(
			"phase5b ready artifact has no independent apply-only entries",
			ready.applyOnlyEffects.length,
			0
		);
		assertEq(
			"phase5b full feature flag remains off",
			full.productionFeatureFlagEnabled,
			false
		);
		assertEq(
			"phase5b ready feature flag remains off",
			ready.productionFeatureFlagEnabled,
			false
		);
		assertEq(
			"phase5b registry resolver remains disabled",
			ready.registryResolverCurrentlyEnabled,
			false
		);

		for (key in Readiness.STATUS) {
			if (Readiness.STATUS.hasOwnProperty(key)) {
				allowedStatuses[Readiness.STATUS[key]] = true;
			}
		}
		for (i = 0; i < full.effects.length; i++) {
			effect = full.effects[i];
			effectByName[effect.displayName] = effect;
			assertEq(
				"phase5b parameter count preserved " +
					effect.displayName,
				effect.parameters.length,
				effect.parameterCount
			);
			for (p = 0; p < effect.parameters.length; p++) {
				parameter = effect.parameters[p];
				assert(
					"phase5b allowed parameter status " +
						effect.displayName + "::" +
						String(parameter.index),
					allowedStatuses[parameter.currentStatus] === true
				);
			}
		}

		for (i = 0; i < ready.effects.length; i++) {
			effect = ready.effects[i];
			assertEq(
				"phase5b ready effect marked ready " +
					effect.displayName,
				effect.productionReady,
				true
			);
			assert(
				"phase5b ready effect has promoted parameter " +
					effect.displayName,
				effect.productionReadyParameters.length > 0
			);
			for (p = 0;
					p < effect.productionReadyParameters.length;
					p++) {
				parameter = effect.productionReadyParameters[p];
				key = Readiness.parameterKey(
					effect.displayName,
					parameter.index,
					parameter.displayName
				);
				readyPairKeys[key] = true;
				assertEq(
					"phase5b ready pair status " + key,
					parameter.status,
					"PRODUCTION_READY"
				);
				assertEq(
					"phase5b ready pair verified " + key,
					parameter.validationEvidence.verified,
					true
				);
				assertEq(
					"phase5b ready pair read-back matched " + key,
					parameter.validationEvidence.readBackVerified,
					true
				);
				assertEq(
					"phase5b ready pair baseline restored " + key,
					parameter.validationEvidence.baselineRestored,
					true
				);
				assertEq(
					"phase5b ready pair production untouched " + key,
					parameter.validationEvidence.productionUntouched,
					true
				);
				assert(
					"phase5b ready pair explicit command " + key,
					!!parameter.commands.explicitParameterCommand
				);
				assert(
					"phase5b ready pair default command " + key,
					!!parameter.commands.defaultParameterCommand
				);
			}
		}

		for (i = 0; i < promotion.pairs.length; i++) {
			pair = promotion.pairs[i];
			key = Readiness.parameterKey(
				pair.effectDisplayName,
				pair.parameterIndex,
				pair.parameterDisplayName
			);
			promotionPairKeys[key] = true;
			assert(
				"phase5b promotion pair retained " + key,
				readyPairKeys[key] === true
			);
		}
		assertEq(
			"phase5b no extra ready pairs",
			Object.keys(readyPairKeys).filter(function (identity) {
				return !promotionPairKeys[identity];
			}).length,
			0
		);

		for (i = 0; i < validatedEffects.length; i++) {
			effect = effectByName[validatedEffects[i]];
			assertEq(
				"phase5b validated-not-promoted effect remains not ready " +
					validatedEffects[i],
				effect.productionReady,
				false
			);
			assertEq(
				"phase5b validated-not-promoted pair count " +
					validatedEffects[i],
				effect.validatedButNotPromotedParameters.length,
				1
			);
		}
		for (i = 0; i < failedEffects.length; i++) {
			effect = effectByName[failedEffects[i]];
			assertEq(
				"phase5b failed effect remains not ready " +
					failedEffects[i],
				effect.productionReady,
				false
			);
			assertEq(
				"phase5b failed pair count " +
					failedEffects[i],
				effect.failedParameters.length,
				1
			);
		}

		gaussian = effectByName["Gaussian Blur"];
		assertEq(
			"phase5b Gaussian parameter count",
			gaussian.parameterCount,
			20
		);
		assertEq(
			"phase5b Gaussian ready parameter count",
			gaussian.productionReadyParameters.length,
			1
		);
		assertEq(
			"phase5b Gaussian ambiguous parameter count",
			gaussian.ambiguousParameters.length,
			5
		);
		assertEq(
			"phase5b Gaussian manual parameter count",
			gaussian.manualReviewParameters.length,
			14
		);
		amount = gaussian.parameters.filter(function (candidate) {
			return candidate.displayName === "Amount";
		})[0];
		assertEq(
			"phase5b Gaussian Amount is ready",
			amount.currentStatus,
			"PRODUCTION_READY"
		);
		assertEq(
			"phase5b Gaussian Amount index",
			amount.index,
			5
		);
		assertEq(
			"phase5b Gaussian default command",
			amount.commands.defaultParameterCommand,
			"gaussian blur 30"
		);
		assertEq(
			"phase5b Gaussian explicit command",
			amount.commands.explicitParameterCommand,
			"gaussian blur amount 30"
		);
		assertEq(
			"phase5b Gaussian has no invented Sharpness",
			gaussian.parameters.filter(function (candidate) {
				return candidate.displayName === "Sharpness";
			}).length,
			0
		);

		assertEq(
			"phase5b stored full summary matches generated",
			JSON.stringify(storedFull.summary),
			JSON.stringify(full.summary)
		);
		assertEq(
			"phase5b stored ready summary matches generated",
			JSON.stringify(storedReady.summary),
			JSON.stringify(ready.summary)
		);
		assertEq(
			"phase5b stored ready list count",
			storedReady.effects.length,
			36
		);
		assert(
			"phase5b markdown has production-ready section",
			markdown.indexOf("## PRODUCTION READY") !== -1
		);
		assert(
			"phase5b markdown has apply-only section",
			markdown.indexOf("## APPLY-ONLY READY") !== -1
		);
		assert(
			"phase5b markdown has not-ready section",
			markdown.indexOf("## NOT PRODUCTION READY") !== -1
		);
		assert(
			"phase5b markdown states feature flag off",
			markdown.indexOf("Production feature flag: **OFF**") !== -1
		);
		assert(
			"phase5b audit module performs no direct writes",
			fs.readFileSync(path.join(
				__pickfxRoot,
				"src/core/TerminalProductionReadinessAudit.js"
			), "utf8").indexOf("setValue") === -1
		);
	}

	print(
		"terminal production readiness audit tests " +
			((passed + failed) - startCount)
	);
}());
