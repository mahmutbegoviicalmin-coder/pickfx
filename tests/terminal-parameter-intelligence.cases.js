(function () {
	var startCount = passed + failed;
	var Resolver = TerminalCommandResolver;
	var Intelligence = TerminalParameterIntelligence;

	function parameter(index, name, value, extra) {
		var result = {
			index: index,
			displayName: name,
			matchName: null,
			matchNameAvailable: false,
			valueType: "number",
			currentValue: value,
			hasGetValue: true,
			hasSetValue: true,
			isTimeVarying: false,
			areKeyframesSupported: true,
			enumMetadata: "unavailable",
			inferredSection: null
		};
		var key;
		if (extra) {
			for (key in extra) {
				if (extra.hasOwnProperty(key)) {
					result[key] = extra[key];
				}
			}
		}
		return result;
	}

	function effect(name, parameters) {
		return {
			type: "video-effect",
			displayName: name,
			premiereName: name,
			matchName: "TEST." + name,
			matchNameAvailable: true,
			parameters: parameters || []
		};
	}

	var confidenceEffect = effect("Confidence Blur", [
		parameter(0, "Amount", 10),
		parameter(1, "Noise", 0)
	]);
	var exact;
	var resolved;
	var sectionEffect;
	var selectorEffect;
	var promotion;
	var validation;
	var promotionIndex;
	var validationIndex;
	var explanation;
	var registry;
	var audit;
	var validationRun;
	var promotionArtifact;
	var analysisArtifact;
	var priorityArtifact;
	var generatedArtifacts;
	var validationResult;
	var effectByName;
	var promotedResolved;
	var i;
	var pair;

	resolved = Resolver.resolveNumericParameter(confidenceEffect);
	assertEq(
		"phase5 scored candidate resolves",
		resolved.ok,
		true
	);
	assertEq(
		"phase5 scored candidate chooses semantic amount",
		resolved.parameter.displayName,
		"Amount"
	);
	assertEq(
		"phase5 scored result exposes confidence tier",
		resolved.confidenceTier,
		"scored"
	);
	assert(
		"phase5 confidence score normalized",
		resolved.confidenceScore >= 0 &&
			resolved.confidenceScore <= 1
	);
	assert(
		"phase5 scored result records reasons",
		resolved.reasons.length >= 2
	);
	assertEq(
		"phase5 scored result records competing candidate",
		resolved.competingCandidates.length,
		1
	);

	exact = Resolver.resolveParameterQuery(
		confidenceEffect,
		"Amount"
	);
	assertEq("phase5 exact parameter match resolves", exact.ok, true);
	assertEq(
		"phase5 exact parameter match confidence",
		exact.confidenceScore,
		0.94
	);
	assertEq(
		"phase5 exact parameter match tier",
		exact.confidenceTier,
		"exact"
	);
	assertEq(
		"phase5 exact parameter match identity",
		exact.parameter.index,
		0
	);

	sectionEffect = effect("Section FX", [
		parameter(0, "Amount", 10, { inferredSection: "Basic" }),
		parameter(1, "Amount", 20, { inferredSection: "Advanced" })
	]);
	resolved = Resolver.resolveParameterQuery(sectionEffect, "Amount");
	assertEq(
		"phase5 duplicate exact names fail closed",
		resolved.reason,
		"AMBIGUOUS_PARAMETER"
	);
	resolved = Resolver.resolveParameterQuery(
		sectionEffect,
		"Basic Amount"
	);
	assertEq(
		"phase5 section-qualified parameter resolves",
		resolved.ok,
		true
	);
	assertEq(
		"phase5 section disambiguation chooses index",
		resolved.parameter.index,
		0
	);
	assertEq(
		"phase5 section disambiguation confidence",
		resolved.confidenceTier,
		"section"
	);
	resolved = Resolver.resolveParameterQuery(
		sectionEffect,
		"Amount",
		{ section: "Advanced" }
	);
	assertEq(
		"phase5 structured section option resolves",
		resolved.ok,
		true
	);
	assertEq(
		"phase5 structured section option chooses index",
		resolved.parameter.index,
		1
	);

	selectorEffect = effect("Selector FX", [
		parameter(0, "Camera Mode", 0)
	]);
	assertEq(
		"phase5 selector detector recognizes mode",
		Resolver.isSelectorLike(selectorEffect.parameters[0]),
		true
	);
	assertEq(
		"phase5 selector detector accepts amount",
		Resolver.isSelectorLike(confidenceEffect.parameters[0]),
		false
	);
	resolved = Resolver.resolveNumericParameter(selectorEffect);
	assertEq(
		"phase5 implicit selector fails closed",
		resolved.reason,
		"AMBIGUOUS_PARAMETER"
	);
	assertEq(
		"phase5 selector rejection is explainable",
		resolved.candidates[0].rejectionReason,
		"SELECTOR_METADATA_REQUIRED"
	);
	resolved = Resolver.resolveParameterQuery(
		selectorEffect,
		"Camera Mode"
	);
	assertEq(
		"phase5 exact selector still fails closed",
		resolved.reason,
		"AMBIGUOUS_PARAMETER"
	);

	promotion = {
		pairs: [{
			effectDisplayName: "Confidence Blur",
			effectMatchName: "TEST.Confidence Blur",
			parameterIndex: 1,
			parameterDisplayName: "Noise",
			verified: true,
			promotionStatus: "promoted"
		}]
	};
	promotionIndex = Resolver.buildPromotionIndex(promotion);
	resolved = Resolver.resolveNumericParameter(confidenceEffect, {
		promotionIndex: promotionIndex
	});
	assertEq(
		"phase5 promoted pair overrides heuristic",
		resolved.parameter.displayName,
		"Noise"
	);
	assertEq(
		"phase5 promoted pair confidence tier",
		resolved.confidenceTier,
		"promoted"
	);
	assertEq(
		"phase5 promoted pair confidence score",
		resolved.confidenceScore,
		0.99
	);

	validation = {
		results: [{
			effectDisplayName: "Confidence Blur",
			parameterIndex: 0,
			parameterDisplayName: "Amount",
			status: "failed",
			reason: "VALUE_NOT_VERIFIED"
		}]
	};
	validationIndex = Resolver.buildValidationIndex(validation);
	resolved = Resolver.resolveNumericParameter(confidenceEffect, {
		validationIndex: validationIndex
	});
	assertEq(
		"phase5 failed live pair cannot remain default",
		resolved.reason,
		"AMBIGUOUS_PARAMETER"
	);
	assertEq(
		"phase5 failed live pair rejection recorded",
		resolved.candidates[0].rejectionReason,
		"LIVE_VALIDATION_FAILED"
	);

	explanation = Resolver.explain(resolved);
	assert(
		"phase5 explanation records fail-closed result",
		explanation.indexOf("Fail closed") !== -1
	);
	assert(
		"phase5 confidence comparator ranks promoted first",
		Resolver.compareConfidence(
			{ confidenceScore: 0.99 },
			{ confidenceScore: 0.94 }
		) < 0
	);

	registry = {
		effects: [sectionEffect],
		transitions: []
	};
	resolved = Resolver.resolveWithParameter(
		"Section FX Basic Amount 10",
		registry
	);
	assertEq(
		"phase5 explicit command parameter syntax resolves",
		resolved.ok,
		true
	);
	assertEq(
		"phase5 explicit command preserves value",
		resolved.value,
		10
	);
	assertEq(
		"phase5 explicit command uses section identity",
		resolved.parameter.index,
		0
	);
	assertEq(
		"phase5 explicit command keeps safe writer path",
		resolved.execution.writerPath,
		"CommandExecutor.run"
	);

	assertEq(
		"phase5 ambiguity duplicate classifier",
		Intelligence.ambiguityPrimary({
			terminalReason: "INTRA_EFFECT_PARAMETER_NAME_COLLISION"
		}),
		"duplicate_parameter_names"
	);
	assertEq(
		"phase5 ambiguity multi-candidate classifier",
		Intelligence.ambiguityPrimary({
			terminalReason: "AMBIGUOUS_PARAMETER"
		}),
		"multiple_numeric_candidates"
	);
	assertEq(
		"phase5 ambiguity semantic classifier",
		Intelligence.ambiguityPrimary({
			terminalReason: "NOT_SELECTED_BY_MINIMAL_TERMINAL_SYNTAX"
		}),
		"insufficient_semantic_evidence"
	);
	assertEq(
		"phase5 enum manual queue is potentially resolvable",
		Intelligence.manualPotential(
			"ENUM_LIKE_NAME_REQUIRES_METADATA"
		).potentiallyResolvable,
		true
	);
	assertEq(
		"phase5 internal manual queue remains blocked",
		Intelligence.manualPotential(
			"INTERNAL_PARAMETER"
		).potentiallyResolvable,
		false
	);

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
		validationRun = JSON.parse(fs.readFileSync(path.join(
			__pickfxRoot,
			"src/data/terminal-registry.validation-run.json"
		), "utf8"));
		promotionArtifact = JSON.parse(fs.readFileSync(path.join(
			__pickfxRoot,
			"src/data/terminal-registry.promotion.json"
		), "utf8"));
		analysisArtifact = JSON.parse(fs.readFileSync(path.join(
			__pickfxRoot,
			"src/data/terminal-registry.ambiguity-analysis.json"
		), "utf8"));
		priorityArtifact = JSON.parse(fs.readFileSync(path.join(
			__pickfxRoot,
			"src/data/terminal-registry.validation-priority.phase5.json"
		), "utf8"));

		generatedArtifacts = Intelligence.buildArtifacts({
			registry: registry,
			audit: audit,
			validation: validationRun,
			promotion: promotionArtifact,
			resolver: Resolver,
			generatedAt: "test"
		});
		validationResult = Intelligence.validateAnalysis(
			generatedArtifacts.analysis
		);
		assertEq(
			"phase5 generated analysis validates",
			validationResult.ok,
			true
		);
		assertEq(
			"phase5 ambiguous population preserved",
			generatedArtifacts.analysis.ambiguity.count,
			1135
		);
		assertEq(
			"phase5 duplicate ambiguity count",
			generatedArtifacts.analysis.ambiguity
				.primaryCategoryCounts.duplicate_parameter_names,
			224
		);
		assertEq(
			"phase5 multiple numeric ambiguity count",
			generatedArtifacts.analysis.ambiguity
				.primaryCategoryCounts.multiple_numeric_candidates,
			613
		);
		assertEq(
			"phase5 insufficient semantic ambiguity count",
			generatedArtifacts.analysis.ambiguity
				.primaryCategoryCounts.insufficient_semantic_evidence,
			298
		);
		assertEq(
			"phase5 generic primary ambiguity is zero",
			generatedArtifacts.analysis.ambiguity
				.primaryCategoryCounts.generic_names,
			0
		);
		assertEq(
			"phase5 all ambiguous parameters lack matchName",
			generatedArtifacts.analysis.ambiguity
				.evidenceFlagCounts.missing_parameter_matchName,
			1135
		);
		assertEq(
			"phase5 ambiguous section metadata gap count",
			generatedArtifacts.analysis.ambiguity
				.evidenceFlagCounts.missing_section_metadata,
			1125
		);
		assertEq(
			"phase5 selector-like ambiguous count",
			generatedArtifacts.analysis.ambiguity
				.evidenceFlagCounts.selector_like_control,
			0
		);
		assertEq(
			"phase5 manual-review population preserved",
			generatedArtifacts.analysis.manualReview.count,
			1128
		);
		assertEq(
			"phase5 empty display manual count",
			generatedArtifacts.analysis.manualReview
				.categoryCounts.EMPTY_DISPLAY_NAME,
			428
		);
		assertEq(
			"phase5 boolean manual count",
			generatedArtifacts.analysis.manualReview
				.categoryCounts.BOOLEAN_REQUIRES_LIVE_TYPED_AUDIT,
			373
		);
		assertEq(
			"phase5 internal manual count",
			generatedArtifacts.analysis.manualReview
				.categoryCounts.INTERNAL_PARAMETER,
			165
		);
		assertEq(
			"phase5 color-like manual count",
			generatedArtifacts.analysis.manualReview
				.categoryCounts
				.COLOR_LIKE_NUMERIC_REQUIRES_TYPED_AUDIT,
			65
		);
		assertEq(
			"phase5 enum-like manual count",
			generatedArtifacts.analysis.manualReview
				.categoryCounts.ENUM_LIKE_NAME_REQUIRES_METADATA,
			52
		);
		assertEq(
			"phase5 Lumetri manual count",
			generatedArtifacts.analysis.manualReview
				.categoryCounts.LUMETRI_REQUIRES_INSTANCE_IDENTITY,
			36
		);
		assertEq(
			"phase5 baseline manual count",
			generatedArtifacts.analysis.manualReview
				.categoryCounts.BASELINE_COMPONENT_NOT_APPLY_TESTED,
			9
		);
		assertEq(
			"phase5 failure count",
			generatedArtifacts.analysis.failures.length,
			5
		);
		assertEq(
			"phase5 alpha failure classification",
			generatedArtifacts.analysis.failures[0]
				.classification.primary,
			"read-back mismatch"
		);
		assertEq(
			"phase5 track matte failure classification",
			generatedArtifacts.analysis.failures[3]
				.classification.primary,
			"enum/selector"
		);
		assertEq(
			"phase5 all failure cleanups passed",
			generatedArtifacts.analysis.failures.filter(
				function (failure) { return !failure.cleanupOk; }
			).length,
			0
		);
		assertEq(
			"phase5 minimal syntax deterministic count",
			generatedArtifacts.analysis.summary
				.minimalSyntaxDeterministic,
			36
		);
		assertEq(
			"phase5 explicit syntax new deterministic count",
			generatedArtifacts.analysis.summary
				.explicitSyntaxNewlyDeterministic,
			910
		);
		assertEq(
			"phase5 combined deterministic count",
			generatedArtifacts.analysis.summary.combinedDeterministic,
			946
		);
		assertEq(
			"phase5 remaining ambiguous count includes failures",
			generatedArtifacts.analysis.summary.stillAmbiguous,
			230
		);
		assertEq(
			"phase5 manual review remains unchanged",
			generatedArtifacts.analysis.summary.stillManualReview,
			1128
		);

		effectByName = {};
		for (i = 0; i < registry.effects.length; i++) {
			effectByName[registry.effects[i].displayName] =
				registry.effects[i];
		}
		promotionIndex = Resolver.buildPromotionIndex(
			promotionArtifact
		);
		validationIndex = Resolver.buildValidationIndex(
			validationRun
		);
		for (i = 0; i < promotionArtifact.pairs.length; i++) {
			pair = promotionArtifact.pairs[i];
			promotedResolved = Resolver.resolveNumericParameter(
				effectByName[pair.effectDisplayName],
				{
					promotionIndex: promotionIndex,
					validationIndex: validationIndex
				}
			);
			assert(
				"phase5 existing promoted pair preserved " +
					pair.effectDisplayName,
				promotedResolved.ok === true &&
					promotedResolved.parameter.index ===
						pair.parameterIndex &&
					promotedResolved.confidenceTier === "promoted"
			);
		}

		assertEq(
			"phase5 stored analysis flag remains off",
			analysisArtifact.productionFeatureFlagEnabled,
			false
		);
		assertEq(
			"phase5 priority flag remains off",
			priorityArtifact.productionFeatureFlagEnabled,
			false
		);
		assertEq(
			"phase5 priority candidate count",
			priorityArtifact.candidateCount,
			910
		);
		assertEq(
			"phase5 priority uses no popularity claims",
			priorityArtifact.rankingPolicy.popularityClaimsUsed,
			false
		);
		assertEq(
			"phase5 priority auto-promotes nothing",
			priorityArtifact.candidates.filter(function (candidate) {
				return candidate.promotionStatus === "promoted";
			}).length,
			0
		);
		assertEq(
			"phase5 priority requires live validation",
			priorityArtifact.candidates.filter(function (candidate) {
				return candidate.requiresLiveValidation !== true;
			}).length,
			0
		);
	}

	print(
		"terminal parameter intelligence tests " +
			((passed + failed) - startCount)
	);
}());
