var TerminalParameterIntelligence = (function () {
	var SCHEMA_VERSION = 1;
	var ANALYSIS_ARTIFACT_TYPE =
		"pickfx-terminal-registry-ambiguity-analysis";
	var PRIORITY_ARTIFACT_TYPE =
		"pickfx-terminal-registry-validation-priority";
	var MODEL_VERSION = "phase5-parameter-intelligence-20260822";
	var GENERIC_TOKENS = {
		amount: true,
		intensity: true,
		strength: true,
		radius: true
	};

	function trim(value) {
		return String(value === undefined || value === null ? "" : value)
			.replace(/^\s+|\s+$/g, "");
	}

	function normalize(value) {
		return trim(value).toLowerCase().replace(/[^a-z0-9]+/g, " ")
			.replace(/^\s+|\s+$/g, "")
			.replace(/\s+/g, " ");
	}

	function copy(value) {
		return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
	}

	function containsGenericToken(value) {
		var parts = normalize(value).split(/\s+/);
		var i;
		for (i = 0; i < parts.length; i++) {
			if (GENERIC_TOKENS[parts[i]]) {
				return true;
			}
		}
		return false;
	}

	function effectMap(registry) {
		var map = {};
		var effects = registry && registry.effects ? registry.effects : [];
		var i;
		for (i = 0; i < effects.length; i++) {
			map[normalize(effects[i].displayName)] = effects[i];
		}
		return map;
	}

	function parameterFor(effect, row) {
		var parameters = effect && effect.parameters ? effect.parameters : [];
		var parameter;
		var i;
		for (i = 0; i < parameters.length; i++) {
			parameter = parameters[i];
			if (parameter.index === row.parameterIndex &&
					normalize(parameter.displayName) ===
						normalize(row.parameterDisplayName)) {
				return parameter;
			}
		}
		return null;
	}

	function auditRowMap(audit) {
		var map = {};
		var rows = audit && audit.parameters ? audit.parameters : [];
		var row;
		var i;
		for (i = 0; i < rows.length; i++) {
			row = rows[i];
			map[
				normalize(row.effectDisplayName) + "::" +
				String(row.parameterIndex) + "::" +
				normalize(row.parameterDisplayName)
			] = row;
		}
		return map;
	}

	function auditRowFor(map, result) {
		return map[
			normalize(result && result.effectDisplayName) + "::" +
			String(result && result.parameterIndex) + "::" +
			normalize(result && result.parameterDisplayName)
		] || null;
	}

	function failureClassification(result) {
		var current = result && result.runtimeParameter
			? result.runtimeParameter.value
			: undefined;
		var requested = result && result.requestedValue;
		var trackSelectorEvidence = !!(
			normalize(result && result.effectDisplayName) ===
				"track matte key" &&
			normalize(result && result.parameterDisplayName) === "matte" &&
			current === 4294967295
		);
		if (trackSelectorEvidence) {
			return {
				primary: "enum/selector",
				categories: [
					"enum/selector",
					"read-back mismatch",
					"insufficient metadata",
					"Premiere-specific behavior"
				],
				conclusion:
					"The registry exposed a UINT32_MAX sentinel as a number " +
					"without enum or track-selector metadata. The attempted " +
					"increment was not verified."
			};
		}
		return {
			primary: "read-back mismatch",
			categories: [
				"read-back mismatch",
				"insufficient metadata"
			],
			possibleButUnproven: (
				typeof current === "number" &&
				requested === current + 1
			) ? [
				"invalid test value",
				"range issue",
				"Premiere-specific behavior"
			] : [],
			conclusion:
				"The writer reached verification, but the artifact does not " +
				"record the post-write value. No min/max metadata exists, so " +
				"range rejection or clamping cannot be proven."
		};
	}

	function analyzeFailures(validationRun, audit) {
		var results = validationRun && validationRun.results
			? validationRun.results
			: [];
		var rows = auditRowMap(audit);
		var failures = [];
		var result;
		var row;
		var classification;
		var i;
		for (i = 0; i < results.length; i++) {
			result = results[i];
			if (result.status !== "failed") {
				continue;
			}
			row = auditRowFor(rows, result);
			classification = failureClassification(result);
			failures.push({
				testId: result.testId,
				effectDisplayName: result.effectDisplayName,
				effectMatchName: result.effectMatchName || null,
				parameterIndex: result.parameterIndex,
				parameterDisplayName: result.parameterDisplayName,
				runtimeType: result.runtimeParameter &&
					result.runtimeParameter.type,
				currentValue: result.runtimeParameter &&
					result.runtimeParameter.value,
				requestedValue: result.requestedValue,
				readBackRecorded: result.readBack !== undefined,
				readBack: result.readBack,
				writerReason: result.reason,
				writerMethod: result.execution && result.execution.method,
				runtimeWritableFlag: !!(
					result.runtimeParameter &&
					result.runtimeParameter.writable === true
				),
				rangeMetadataAvailable: !!(
					result.runtimeParameter &&
					(
						typeof result.runtimeParameter.min === "number" ||
						typeof result.runtimeParameter.max === "number"
					)
				),
				enumMetadata: row && row.enumMetadata,
				auditWritable: !!(row && row.writable),
				auditTerminalSafety: row && row.terminalSafety,
				auditTerminalReason: row && row.terminalReason,
				cleanupOk: !!(
					result.cleanup &&
					result.cleanup.ok === true &&
					result.cleanup.fingerprintRestored === true &&
					result.cleanup.productionUntouched === true
				),
				classification: classification
			});
		}
		return failures;
	}

	function ambiguityPrimary(row) {
		if (row.terminalReason ===
				"INTRA_EFFECT_PARAMETER_NAME_COLLISION") {
			return "duplicate_parameter_names";
		}
		if (row.terminalReason === "AMBIGUOUS_PARAMETER") {
			return "multiple_numeric_candidates";
		}
		if (row.terminalReason ===
				"NOT_SELECTED_BY_MINIMAL_TERMINAL_SYNTAX") {
			return "insufficient_semantic_evidence";
		}
		return "other";
	}

	function ambiguityFlags(row, parameter, resolver) {
		var resolverResult = row && row.resolverResult;
		var candidates = resolverResult && resolverResult.candidates
			? resolverResult.candidates
			: [];
		var allZero = candidates.length > 0;
		var flags = [];
		var i;
		if (row.intraEffectNameCount > 1) {
			flags.push("duplicate_parameter_names");
		}
		if (containsGenericToken(row.parameterDisplayName)) {
			flags.push("generic_name");
		}
		if (!row.parameterMatchName) {
			flags.push("missing_parameter_matchName");
		}
		if (!row.inferredSection) {
			flags.push("missing_section_metadata");
		}
		if (resolverResult &&
				resolverResult.reason === "AMBIGUOUS_PARAMETER") {
			flags.push("multiple_numeric_candidates");
			flags.push("effect_resolver_ambiguous");
		}
		if (resolver && resolver.isSelectorLike &&
				resolver.isSelectorLike(parameter || row)) {
			flags.push("selector_like_control");
		}
		if (row.terminalReason ===
				"NOT_SELECTED_BY_MINIMAL_TERMINAL_SYNTAX") {
			flags.push("insufficient_semantic_evidence");
		}
		for (i = 0; i < candidates.length; i++) {
			if (candidates[i].score !== 0) {
				allZero = false;
			}
		}
		if (allZero) {
			flags.push("resolver_candidates_all_zero_score");
		}
		return flags;
	}

	function countValues(rows, field) {
		var counts = {};
		var value;
		var i;
		for (i = 0; i < rows.length; i++) {
			value = rows[i][field] || "other";
			counts[value] = (counts[value] || 0) + 1;
		}
		return counts;
	}

	function countFlags(rows) {
		var counts = {};
		var flags;
		var i;
		var f;
		for (i = 0; i < rows.length; i++) {
			flags = rows[i].evidenceFlags || [];
			for (f = 0; f < flags.length; f++) {
				counts[flags[f]] = (counts[flags[f]] || 0) + 1;
			}
		}
		return counts;
	}

	function ambiguityPrimaryCounts(rows) {
		var counts = countValues(rows, "primaryCategory");
		var categories = [
			"duplicate_parameter_names",
			"generic_names",
			"missing_parameter_matchName",
			"missing_section_metadata",
			"multiple_numeric_candidates",
			"selector_like_controls",
			"insufficient_semantic_evidence",
			"other"
		];
		var i;
		for (i = 0; i < categories.length; i++) {
			if (!counts.hasOwnProperty(categories[i])) {
				counts[categories[i]] = 0;
			}
		}
		return counts;
	}

	function ambiguityEvidenceCounts(rows) {
		var counts = countFlags(rows);
		var flags = [
			"duplicate_parameter_names",
			"generic_name",
			"missing_parameter_matchName",
			"missing_section_metadata",
			"multiple_numeric_candidates",
			"selector_like_control",
			"insufficient_semantic_evidence",
			"other"
		];
		var i;
		for (i = 0; i < flags.length; i++) {
			if (!counts.hasOwnProperty(flags[i])) {
				counts[flags[i]] = 0;
			}
		}
		return counts;
	}

	function manualPotential(reason) {
		var map = {
			EMPTY_DISPLAY_NAME: {
				potentiallyResolvable: true,
				requires: [
					"stable parameter matchName or non-empty display identity"
				]
			},
			BOOLEAN_REQUIRES_LIVE_TYPED_AUDIT: {
				potentiallyResolvable: true,
				requires: [
					"live boolean type confirmation",
					"boolean command syntax",
					"write/read-back validation"
				]
			},
			INTERNAL_PARAMETER: {
				potentiallyResolvable: false,
				requires: [
					"user-facing visibility and semantic metadata"
				]
			},
			COLOR_LIKE_NUMERIC_REQUIRES_TYPED_AUDIT: {
				potentiallyResolvable: true,
				requires: [
					"typed color metadata",
					"typed color writer validation"
				]
			},
			ENUM_LIKE_NAME_REQUIRES_METADATA: {
				potentiallyResolvable: true,
				requires: [
					"enum option labels and values",
					"valid range metadata"
				]
			},
			LUMETRI_REQUIRES_INSTANCE_IDENTITY: {
				potentiallyResolvable: true,
				requires: [
					"Lumetri instance identity",
					"parameter matchName or unique section identity"
				]
			},
			BASELINE_COMPONENT_NOT_APPLY_TESTED: {
				potentiallyResolvable: false,
				requires: [
					"separate intrinsic-component validation contract"
				]
			}
		};
		return map[reason] || {
			potentiallyResolvable: false,
			requires: ["additional registry evidence"]
		};
	}

	function manualCategorySummaries(counts) {
		var summaries = [];
		var potential;
		var reason;
		for (reason in counts) {
			if (!counts.hasOwnProperty(reason)) {
				continue;
			}
			potential = manualPotential(reason);
			summaries.push({
				reason: reason,
				count: counts[reason],
				potentiallyResolvableWithMetadata:
					potential.potentiallyResolvable,
				requiredEvidence: potential.requires
			});
		}
		summaries.sort(function (a, b) {
			if (a.count !== b.count) {
				return b.count - a.count;
			}
			return a.reason < b.reason ? -1 : 1;
		});
		return summaries;
	}

	function analyzeAmbiguity(registry, audit, resolver) {
		var effects = effectMap(registry);
		var rows = audit && audit.parameters ? audit.parameters : [];
		var ambiguous = [];
		var manual = [];
		var row;
		var effect;
		var parameter;
		var primary;
		var potential;
		var manualCounts;
		var i;
		for (i = 0; i < rows.length; i++) {
			row = rows[i];
			effect = effects[normalize(row.effectDisplayName)];
			parameter = parameterFor(effect, row);
			if (row.terminalSafety === "ambiguous") {
				primary = ambiguityPrimary(row);
				ambiguous.push({
					id: row.id,
					effectDisplayName: row.effectDisplayName,
					effectMatchName: row.effectMatchName,
					parameterIndex: row.parameterIndex,
					parameterDisplayName: row.parameterDisplayName,
					valueType: row.valueType,
					currentValue: copy(row.currentValue),
					primaryCategory: primary,
					terminalReason: row.terminalReason,
					intraEffectNameCount: row.intraEffectNameCount,
					parameterMatchName: row.parameterMatchName,
					inferredSection: row.inferredSection,
					resolverResult: copy(row.resolverResult),
					evidenceFlags: ambiguityFlags(
						row,
						parameter,
						resolver
					)
				});
			} else if (row.terminalSafety === "manual_review") {
				potential = manualPotential(row.terminalReason);
				manual.push({
					id: row.id,
					effectDisplayName: row.effectDisplayName,
					effectMatchName: row.effectMatchName,
					parameterIndex: row.parameterIndex,
					parameterDisplayName: row.parameterDisplayName,
					valueType: row.valueType,
					currentValue: copy(row.currentValue),
					reviewCategory: row.terminalReason,
					parameterMatchName: row.parameterMatchName,
					inferredSection: row.inferredSection,
					intraEffectNameCount: row.intraEffectNameCount,
					potentiallyResolvableWithMetadata:
						potential.potentiallyResolvable,
					requiredEvidence: potential.requires
				});
			}
		}
		manualCounts = countValues(manual, "reviewCategory");
		return {
			ambiguous: {
				count: ambiguous.length,
				primaryCategoryCounts:
					ambiguityPrimaryCounts(ambiguous),
				evidenceFlagCounts:
					ambiguityEvidenceCounts(ambiguous),
				parameters: ambiguous
			},
			manualReview: {
				count: manual.length,
				categoryCounts: manualCounts,
				categories:
					manualCategorySummaries(manualCounts),
				potentiallyResolvableWithMetadata:
					manual.filter(function (item) {
						return item.potentiallyResolvableWithMetadata;
					}).length,
				parameters: manual
			}
		};
	}

	function confidenceAnalysis(registry, audit, promotion, validation, resolver) {
		var effects = registry && registry.effects ? registry.effects : [];
		var auditRows = audit && audit.parameters ? audit.parameters : [];
		var byEffect = effectMap(registry);
		var promotionIndex = resolver.buildPromotionIndex(promotion);
		var validationIndex = resolver.buildValidationIndex(validation);
		var options = {
			promotionIndex: promotionIndex,
			validationIndex: validationIndex
		};
		var effectResolutions = [];
		var minimalIdentities = {};
		var explicitIdentities = {};
		var remainingAmbiguous = [];
		var resolution;
		var named;
		var row;
		var effect;
		var key;
		var numericCandidateCount;
		var p;
		var i;
		for (i = 0; i < effects.length; i++) {
			resolution = resolver.resolveNumericParameter(
				effects[i],
				options
			);
			effectResolutions.push({
				effectDisplayName: effects[i].displayName,
				effectMatchName: effects[i].matchName || null,
				result: copy(resolution)
			});
			if (resolution.ok) {
				key = normalize(effects[i].displayName) + "::" +
					String(resolution.parameter.index) + "::" +
					normalize(resolution.parameter.displayName);
				minimalIdentities[key] = true;
			}
		}
		for (i = 0; i < auditRows.length; i++) {
			row = auditRows[i];
			key = normalize(row.effectDisplayName) + "::" +
				String(row.parameterIndex) + "::" +
				normalize(row.parameterDisplayName);
			if (row.terminalSafety !== "ambiguous") {
				continue;
			}
			effect = byEffect[normalize(row.effectDisplayName)];
			numericCandidateCount = 0;
			for (p = 0; p < (effect && effect.parameters
					? effect.parameters.length
					: 0); p++) {
				if (resolver.isEligibleNumeric(effect.parameters[p])) {
					numericCandidateCount += 1;
				}
			}
			named = resolver.resolveParameterQuery(
				effect,
				row.parameterDisplayName,
				options
			);
			if (named.ok &&
					named.parameter.index === row.parameterIndex &&
					normalize(named.parameter.displayName) ===
						normalize(row.parameterDisplayName)) {
				explicitIdentities[key] = {
					effectDisplayName: row.effectDisplayName,
					effectMatchName: row.effectMatchName,
					parameterIndex: row.parameterIndex,
					parameterDisplayName: row.parameterDisplayName,
					parameterMatchName: row.parameterMatchName,
					inferredSection: row.inferredSection,
					currentValue: copy(row.currentValue),
					effectParameterCount: effect && effect.parameters
						? effect.parameters.length
						: 0,
					effectNumericCandidateCount:
						numericCandidateCount,
					confidenceTier: named.confidenceTier,
					confidenceScore: named.confidenceScore,
					score: named.score,
					reasons: copy(named.reasons),
					competingCandidates:
						copy(named.competingCandidates)
				};
			} else {
				remainingAmbiguous.push({
					effectDisplayName: row.effectDisplayName,
					parameterIndex: row.parameterIndex,
					parameterDisplayName: row.parameterDisplayName,
					reason: named.reason,
					candidates: copy(named.candidates)
				});
			}
		}
		return {
			modelVersion: resolver.CONFIDENCE_MODEL_VERSION,
			minimalSyntax: {
				deterministicallyResolved:
					Object.keys(minimalIdentities).length,
				identities: Object.keys(minimalIdentities)
			},
			explicitParameterSyntax: {
				newlyDeterministicallyResolved:
					Object.keys(explicitIdentities).length,
				parameters: Object.keys(explicitIdentities).map(
					function (identity) {
						return explicitIdentities[identity];
					}
				),
				stillAmbiguous: remainingAmbiguous.length,
				remainingAmbiguous: remainingAmbiguous
			},
			combined: {
				deterministicallyResolved:
					Object.keys(minimalIdentities).length +
					Object.keys(explicitIdentities).length,
				stillAmbiguous:
					remainingAmbiguous.length +
					(validation && validation.summary
						? validation.summary.failed
						: 0),
				stillManualReview:
					audit && audit.summary
						? audit.summary.manualReview
						: 0
			},
			effectResolutions: effectResolutions
		};
	}

	function promotedPatternCounts(promotion) {
		var counts = {};
		var pairs = promotion && promotion.pairs ? promotion.pairs : [];
		var name;
		var i;
		for (i = 0; i < pairs.length; i++) {
			name = normalize(pairs[i].parameterDisplayName);
			if (name) {
				counts[name] = (counts[name] || 0) + 1;
			}
		}
		return counts;
	}

	function tokenOverlapCount(a, b) {
		var aTokens = normalize(a).split(/\s+/);
		var bTokens = normalize(b).split(/\s+/);
		var seen = {};
		var count = 0;
		var i;
		var j;
		for (i = 0; i < aTokens.length; i++) {
			for (j = 0; j < bTokens.length; j++) {
				if (aTokens[i] &&
						aTokens[i] === bTokens[j] &&
						!seen[aTokens[i]]) {
					seen[aTokens[i]] = true;
					count += 1;
				}
			}
		}
		return count;
	}

	function selectorRisk(value) {
		var normalized = normalize(value);
		return /(^| )(operator|placement|layer|track|source|channel|quality|method|preset)( |$)/
			.test(normalized);
	}

	function priorityQueue(confidence, promotion) {
		var candidates = confidence &&
			confidence.explicitParameterSyntax &&
			confidence.explicitParameterSyntax.parameters
			? confidence.explicitParameterSyntax.parameters
			: [];
		var patterns = promotedPatternCounts(promotion);
		var queue = [];
		var candidate;
		var contributions;
		var overlap;
		var patternCount;
		var selectorLikeRisk;
		var score;
		var i;
		for (i = 0; i < candidates.length; i++) {
			candidate = candidates[i];
			overlap = tokenOverlapCount(
				candidate.effectDisplayName,
				candidate.parameterDisplayName
			);
			patternCount =
				patterns[normalize(candidate.parameterDisplayName)] || 0;
			selectorLikeRisk = selectorRisk(
				candidate.parameterDisplayName
			);
			contributions = {
				explicitResolverConfidence:
					Math.round(candidate.confidenceScore * 1000),
				numericReadWriteApiEvidence: 150,
				clearUniqueDisplayName: 100,
				effectParameterTokenOverlap: overlap * 50,
				promotedParameterPattern:
					Math.min(100, patternCount * 25),
				lowNumericCandidateCount: Math.max(
					0,
					100 -
						(candidate.effectNumericCandidateCount || 0) * 5
				),
				sectionIdentityAvailable:
					candidate.inferredSection ? 20 : 0,
				selectorRiskPenalty:
					selectorLikeRisk ? -200 : 0,
				effectPopularity: 0,
				missingParameterMatchNamePenalty: -10
			};
			score = contributions.explicitResolverConfidence +
				contributions.numericReadWriteApiEvidence +
				contributions.clearUniqueDisplayName +
				contributions.effectParameterTokenOverlap +
				contributions.promotedParameterPattern +
				contributions.lowNumericCandidateCount +
				contributions.sectionIdentityAvailable +
				contributions.selectorRiskPenalty +
				contributions.effectPopularity +
				contributions.missingParameterMatchNamePenalty;
			queue.push({
				rank: 0,
				effectDisplayName: candidate.effectDisplayName,
				effectMatchName: candidate.effectMatchName,
				parameterIndex: candidate.parameterIndex,
				parameterDisplayName: candidate.parameterDisplayName,
				confidenceTier: candidate.confidenceTier,
				confidenceScore: candidate.confidenceScore,
				priorityScore: score,
				priorityContributions: contributions,
				effectPopularityEvidenceAvailable: false,
				promotionStatus: "candidate",
				requiresLiveValidation: true,
				requiresMetadataBeforeLiveValidation:
					selectorLikeRisk,
				reasons: copy(candidate.reasons)
			});
		}
		queue.sort(function (a, b) {
			if (a.priorityScore !== b.priorityScore) {
				return b.priorityScore - a.priorityScore;
			}
			if (normalize(a.effectDisplayName) !==
					normalize(b.effectDisplayName)) {
				return normalize(a.effectDisplayName) <
					normalize(b.effectDisplayName) ? -1 : 1;
			}
			return a.parameterIndex - b.parameterIndex;
		});
		for (i = 0; i < queue.length; i++) {
			queue[i].rank = i + 1;
		}
		return queue;
	}

	function buildArtifacts(options) {
		var resolver = options.resolver;
		var ambiguity = analyzeAmbiguity(
			options.registry,
			options.audit,
			resolver
		);
		var failures = analyzeFailures(
			options.validation,
			options.audit
		);
		var confidence = confidenceAnalysis(
			options.registry,
			options.audit,
			options.promotion,
			options.validation,
			resolver
		);
		var queue = priorityQueue(confidence, options.promotion);
		var analysis = {
			schemaVersion: SCHEMA_VERSION,
			artifactType: ANALYSIS_ARTIFACT_TYPE,
			modelVersion: MODEL_VERSION,
			generatedAt: options.generatedAt || "",
			sourceRegistry: copy(
				options.registry && options.registry.sourceRegistry
			),
			productionFeatureFlagEnabled: false,
			summary: {
				failureCount: failures.length,
				ambiguousParameterCount: ambiguity.ambiguous.count,
				manualReviewParameterCount: ambiguity.manualReview.count,
				minimalSyntaxDeterministic:
					confidence.minimalSyntax.deterministicallyResolved,
				explicitSyntaxNewlyDeterministic:
					confidence.explicitParameterSyntax
						.newlyDeterministicallyResolved,
				combinedDeterministic:
					confidence.combined.deterministicallyResolved,
				stillAmbiguous:
					confidence.combined.stillAmbiguous,
				stillManualReview:
					confidence.combined.stillManualReview
			},
			failures: failures,
			ambiguity: ambiguity.ambiguous,
			manualReview: ambiguity.manualReview,
			confidenceModel: confidence
		};
		var priority = {
			schemaVersion: SCHEMA_VERSION,
			artifactType: PRIORITY_ARTIFACT_TYPE,
			modelVersion: MODEL_VERSION,
			generatedAt: options.generatedAt || "",
			sourceRegistry: copy(
				options.registry && options.registry.sourceRegistry
			),
			productionFeatureFlagEnabled: false,
			rankingPolicy: {
				popularityClaimsUsed: false,
				evidenceOnly: true,
				criteria: [
					"explicit exact parameter confidence",
					"numeric read/write registry evidence",
					"unique parameter display identity",
					"effect/parameter token overlap",
					"previously promoted parameter-name pattern",
					"parameter matchName availability"
				]
			},
			candidateCount: queue.length,
			candidates: queue
		};
		return {
			analysis: analysis,
			priority: priority
		};
	}

	function validateAnalysis(artifact) {
		var primaryTotal = 0;
		var manualTotal = 0;
		var key;
		if (!artifact ||
				artifact.schemaVersion !== SCHEMA_VERSION ||
				artifact.artifactType !== ANALYSIS_ARTIFACT_TYPE ||
				artifact.productionFeatureFlagEnabled !== false) {
			return { ok: false, reason: "ANALYSIS_INVALID" };
		}
		for (key in artifact.ambiguity.primaryCategoryCounts) {
			if (artifact.ambiguity.primaryCategoryCounts.hasOwnProperty(key)) {
				primaryTotal +=
					artifact.ambiguity.primaryCategoryCounts[key];
			}
		}
		for (key in artifact.manualReview.categoryCounts) {
			if (artifact.manualReview.categoryCounts.hasOwnProperty(key)) {
				manualTotal += artifact.manualReview.categoryCounts[key];
			}
		}
		if (primaryTotal !== artifact.ambiguity.count ||
				manualTotal !== artifact.manualReview.count) {
			return {
				ok: false,
				reason: "ANALYSIS_COUNT_MISMATCH"
			};
		}
		return {
			ok: true,
			ambiguousCount: artifact.ambiguity.count,
			manualReviewCount: artifact.manualReview.count
		};
	}

	return {
		SCHEMA_VERSION: SCHEMA_VERSION,
		ANALYSIS_ARTIFACT_TYPE: ANALYSIS_ARTIFACT_TYPE,
		PRIORITY_ARTIFACT_TYPE: PRIORITY_ARTIFACT_TYPE,
		MODEL_VERSION: MODEL_VERSION,
		analyzeFailures: analyzeFailures,
		ambiguityPrimary: ambiguityPrimary,
		ambiguityFlags: ambiguityFlags,
		manualPotential: manualPotential,
		analyzeAmbiguity: analyzeAmbiguity,
		confidenceAnalysis: confidenceAnalysis,
		priorityQueue: priorityQueue,
		buildArtifacts: buildArtifacts,
		validateAnalysis: validateAnalysis
	};
}());

if (typeof module !== "undefined" && module.exports) {
	module.exports = TerminalParameterIntelligence;
}
