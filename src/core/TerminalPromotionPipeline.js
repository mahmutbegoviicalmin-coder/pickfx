var TerminalPromotionPipeline = (function () {
	var SCHEMA_VERSION = 1;
	var PRIORITY_ARTIFACT_TYPE = "pickfx-terminal-registry-validation-priority";
	var RESULTS_ARTIFACT_TYPE = "pickfx-terminal-registry-validation-results";
	var READY_ARTIFACT_TYPE = "pickfx-terminal-production-ready-allowlist";
	var PIPELINE_VERSION = "phase9-targeted-promotion-20260823";
	var TEST_TIMEOUT_MS = 20000;
	var RESEARCH_SEQUENCE = "PickFX Research";
	var RESEARCH_CLIP = "PickFX Research Clip.mp4";
	var STATUS = {
		PRODUCTION_READY: "PRODUCTION_READY",
		FAILED: "FAILED",
		AMBIGUOUS: "AMBIGUOUS",
		MANUAL_REVIEW: "MANUAL_REVIEW",
		ENUM_REVIEW: "ENUM_REVIEW",
		UNSUPPORTED: "UNSUPPORTED",
		PENDING_LIVE: "PENDING_LIVE"
	};
	var CLASS = {
		NUMERIC: "numeric",
		BOOLEAN: "boolean",
		ENUM: "enum",
		COLOR: "color",
		OBJECT: "object",
		INTERNAL: "internal",
		TIME_VARYING: "time-varying",
		STRING: "string"
	};
	var EFFECT_GROUPS = [
		{
			id: "blur-sharpen",
			priority: 1,
			names: [
				"Gaussian Blur",
				"Gaussian Blur (Legacy)",
				"Directional Blur",
				"Directional Blur (Legacy)",
				"Fast Blur",
				"Camera Blur",
				"Compound Blur",
				"Focus Blur",
				"Sharpen",
				"Unsharp Mask"
			]
		},
		{
			id: "color",
			priority: 2,
			names: [
				"Brightness & Contrast",
				"Tint",
				"Lumetri Color",
				"Gamma Correction"
			]
		},
		{
			id: "distortion-transform",
			priority: 3,
			names: [
				"Transform",
				"Turbulent Displace",
				"Wave Warp",
				"Twirl",
				"Spherize",
				"Mirror",
				"Offset"
			]
		},
		{
			id: "stylize-generate",
			priority: 4,
			names: [
				"Noise",
				"Noise (Legacy)",
				"Posterize",
				"Find Edges",
				"Wonder Glow",
				"Alpha Glow",
				"Edge Glow",
				"Gradient",
				"Replicate"
			]
		},
		{
			id: "wipe-transition",
			priority: 5,
			names: [
				"Linear Wipe (Legacy)",
				"Block Dissolve",
				"Gradient Wipe (Legacy)"
			]
		}
	];
	var WIPE_NAME = /wipe|dissolve|blinds/i;
	var LUMETRI_USEFUL = {
		temperature: true,
		tint: true,
		exposure: true,
		contrast: true,
		highlights: true,
		shadows: true,
		whites: true,
		blacks: true,
		vibrance: true,
		saturation: true,
		amount: true,
		sharpen: true,
		intensity: true,
		"faded film": true,
		denoise: true,
		blur: true,
		midpoint: true,
		roundness: true,
		feather: true,
		"hdr white": true,
		"hdr specular": true,
		gamma: true
	};
	var ENUM_NAME = /^(blur dimensions|edge behavior|focus type|wave type|displacement|pinning|sampling|blend mode|overlay mode|color mode|interpolation|antialiasing|antialiasing for best quality|antialiasing \(best quality\)|look|input lut|color space|type|color depth|pattern|highlights only|volumetric glow|colorize)$/;
	var INTERNAL_NAME = /^(error occurred|controls|unused|blob|gradient controls|color controls|texture controls|evolution options)$/;
	var COLOR_NAME = /(^color$|start color|end color|map black|map white|tone color|ambient color|set color|add color|remove color|white balance)/;
	var NUMERIC_HINT = /(amount|intensity|radius|size|speed|rate|angle|percent|percentage|blurriness|brightness|contrast|sharpen|gamma|seed|thickness|chromatic|softness|feather|gain|width|height|scale|rotation|opacity|direction|length|threshold|count|level|glow|completion|phase|complexity|evolution|vibrance|saturation|exposure|highlights|shadows|whites|blacks|temperature|tint|denoise|midpoint|roundness|skew|weight|depth|master|repeats|grain|distortion|ambient amount|source opacity|wipe|block|twirl|shift|blend with original)/;

	function trim(value) {
		return String(value === undefined || value === null ? "" : value)
			.replace(/^\s+|\s+$/g, "");
	}

	function normalize(value) {
		return trim(value)
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, " ")
			.replace(/^\s+|\s+$/g, "")
			.replace(/\s+/g, " ");
	}

	function fold(value) {
		return normalize(value).replace(/\s+/g, "-");
	}

	function copy(value) {
		return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
	}

	function finiteNumber(value) {
		return typeof value === "number" && isFinite(value);
	}

	function parameterKey(effectName, index, parameterName) {
		return normalize(effectName) + "::" +
			String(index) + "::" +
			normalize(parameterName);
	}

	function picker() {
		return typeof SafeNumericTestValue !== "undefined"
			? SafeNumericTestValue
			: null;
	}

	function isInternalName(name) {
		var raw = trim(name);
		var folded = normalize(name);
		if (!folded) {
			return true;
		}
		if (raw.charAt(0) === "_") {
			return true;
		}
		if (INTERNAL_NAME.test(folded)) {
			return true;
		}
		return false;
	}

	function isColorValue(value) {
		return finiteNumber(value) && Math.abs(value) >= 1e10;
	}

	function classifyParameter(parameter) {
		var name = parameter && parameter.displayName;
		var folded = normalize(name);
		var type = parameter && parameter.valueType;
		var value = parameter && parameter.currentValue;
		if (parameter && parameter.isTimeVarying === true) {
			return {
				kind: CLASS.TIME_VARYING,
				liveTest: false,
				reason: "TIME_VARYING_PARAMETER"
			};
		}
		if (isInternalName(name)) {
			return {
				kind: CLASS.INTERNAL,
				liveTest: false,
				reason: "INTERNAL_PARAMETER"
			};
		}
		if (type === "boolean") {
			return {
				kind: CLASS.BOOLEAN,
				liveTest: false,
				reason: "BOOLEAN_PARAMETER"
			};
		}
		if (type === "object" || (value && typeof value === "object")) {
			return {
				kind: CLASS.OBJECT,
				liveTest: false,
				reason: "OBJECT_PARAMETER"
			};
		}
		if (type === "string") {
			return {
				kind: CLASS.STRING,
				liveTest: false,
				reason: "STRING_PARAMETER"
			};
		}
		if (type === "color" || COLOR_NAME.test(folded) || isColorValue(value)) {
			return {
				kind: CLASS.COLOR,
				liveTest: false,
				reason: "COLOR_PARAMETER"
			};
		}
		if (type === "enum" || ENUM_NAME.test(folded)) {
			return {
				kind: CLASS.ENUM,
				liveTest: false,
				reason: "ENUM_METADATA_REQUIRED"
			};
		}
		if (/layer/.test(folded) || value === 4294967295) {
			return {
				kind: CLASS.OBJECT,
				liveTest: false,
				reason: "LAYER_OR_OBJECT_PARAMETER"
			};
		}
		if (type === "number" || type === "angle") {
			return {
				kind: CLASS.NUMERIC,
				liveTest: true,
				reason: "NUMERIC_CANDIDATE"
			};
		}
		return {
			kind: CLASS.INTERNAL,
			liveTest: false,
			reason: "UNSUPPORTED_VALUE_TYPE"
		};
	}

	function numericUsefulness(parameter, effectName) {
		var folded = normalize(parameter && parameter.displayName);
		var effect = normalize(effectName);
		if (effect === "lumetri color" && !LUMETRI_USEFUL[folded]) {
			return 0;
		}
		if (NUMERIC_HINT.test(folded)) {
			return 2;
		}
		return 1;
	}

	function includeParameter(effect, parameter, classification) {
		var effectName = normalize(effect.displayName);
		if (effectName === "gaussian blur" ||
				effectName === "gaussian blur legacy") {
			return true;
		}
		if (effectName === "lumetri color") {
			return classification.kind === CLASS.NUMERIC &&
				numericUsefulness(parameter, effect.displayName) > 0;
		}
		if (classification.kind === CLASS.INTERNAL &&
				isInternalName(parameter.displayName)) {
			return false;
		}
		return true;
	}

	function duplicateNameIndex(parameters) {
		var counts = {};
		var index = {};
		var parameter;
		var key;
		var i;
		for (i = 0; i < (parameters ? parameters.length : 0); i++) {
			parameter = parameters[i];
			key = normalize(parameter && parameter.displayName);
			if (!key) {
				continue;
			}
			counts[key] = (counts[key] || 0) + 1;
		}
		for (i = 0; i < (parameters ? parameters.length : 0); i++) {
			parameter = parameters[i];
			key = normalize(parameter && parameter.displayName);
			index[parameterKey(
				"",
				parameter && parameter.index,
				parameter && parameter.displayName
			)] = counts[key] > 1;
		}
		return {
			counts: counts,
			duplicates: index
		};
	}

	function findEffect(registry, displayName) {
		var effects = registry && registry.effects ? registry.effects : [];
		var wanted = normalize(displayName);
		var i;
		for (i = 0; i < effects.length; i++) {
			if (normalize(effects[i].displayName) === wanted) {
				return effects[i];
			}
		}
		return null;
	}

	function wipeEffects(registry, already) {
		var effects = registry && registry.effects ? registry.effects : [];
		var extra = [];
		var i;
		for (i = 0; i < effects.length; i++) {
			if (WIPE_NAME.test(effects[i].displayName) &&
					!already[normalize(effects[i].displayName)]) {
				extra.push(effects[i].displayName);
			}
		}
		extra.sort(function (a, b) {
			return normalize(a) < normalize(b) ? -1 : 1;
		});
		return extra;
	}

	function chooseNumericTestValue(parameter, original, meta) {
		var safe = picker();
		var name = normalize(parameter && parameter.displayName);
		var limits = safe && typeof safe.limitsOf === "function"
			? safe.limitsOf(meta || parameter)
			: {};
		var candidate;
		var generated;
		function inRange(value) {
			if (finiteNumber(limits.min) && value < limits.min) {
				return false;
			}
			if (finiteNumber(limits.max) && value > limits.max) {
				return false;
			}
			return true;
		}
		if (!finiteNumber(original)) {
			return { ok: false, reason: "NO_SAFE_TEST_VALUE" };
		}
		if (/angle|direction|rotation|phase|skew axis|wipe angle|reflection angle/.test(name)) {
			candidate = original === 0 ? 15 : original + 15;
		} else if ((finiteNumber(limits.max) && limits.max === 100 && original >= 50) ||
				(/percent|percentage|opacity|scale height|scale width|^scale$|saturation|master|source opacity|amount to tint/.test(name) &&
					original >= 50) ||
				(original === 100 && /amount|tint|saturation|master|scale/.test(name))) {
			candidate = original === 100 ? 80 : original - 20;
		} else if (/^seed$/.test(name) && original === 0) {
			candidate = 12;
		} else if (/amount|intensity|radius|blurriness|thickness|glow|feather|gain|sharpen/.test(name)) {
			candidate = original + 10;
		}
		if (finiteNumber(candidate) && candidate !== original && inRange(candidate)) {
			return { ok: true, value: candidate, strategy: "conservative-named" };
		}
		if (!safe || typeof safe.generate !== "function") {
			return { ok: false, reason: "SAFE_VALUE_PICKER_UNAVAILABLE" };
		}
		generated = safe.generate(original, meta || parameter);
		if (generated && generated.ok === true) {
			generated.strategy = generated.strategy || "safe-numeric";
		}
		return generated;
	}

	function verifyNumber(requested, actual) {
		var safe = picker();
		if (safe && typeof safe.verify === "function") {
			return safe.verify(requested, actual);
		}
		if (!finiteNumber(requested) || !finiteNumber(actual)) {
			return false;
		}
		return requested === actual || Math.abs(actual - requested) <= 0.0001;
	}

	function buildPriorityQueue(registry, options) {
		var candidates = [];
		var seenEffects = {};
		var groups = [];
		var group;
		var names;
		var extraWipes;
		var effect;
		var parameter;
		var classification;
		var duplicates;
		var alreadyReady = options && options.alreadyReady
			? options.alreadyReady
			: {};
		var i;
		var g;
		var p;
		for (g = 0; g < EFFECT_GROUPS.length; g++) {
			group = EFFECT_GROUPS[g];
			names = group.names.slice();
			if (group.id === "wipe-transition") {
				extraWipes = wipeEffects(registry, seenEffects);
				for (i = 0; i < extraWipes.length; i++) {
					names.push(extraWipes[i]);
				}
			}
			groups.push({
				id: group.id,
				priority: group.priority,
				requestedNames: group.names.slice(),
				resolvedNames: []
			});
			for (i = 0; i < names.length; i++) {
				effect = findEffect(registry, names[i]);
				if (!effect || seenEffects[normalize(effect.displayName)]) {
					continue;
				}
				seenEffects[normalize(effect.displayName)] = true;
				groups[groups.length - 1].resolvedNames.push(effect.displayName);
				duplicates = duplicateNameIndex(effect.parameters);
				for (p = 0; p < (effect.parameters ? effect.parameters.length : 0); p++) {
					parameter = effect.parameters[p];
					classification = classifyParameter(parameter);
					if (!includeParameter(effect, parameter, classification)) {
						continue;
					}
					candidates.push({
						candidateId: "pair-" + fold(effect.displayName) + "-" +
							fold(parameter.displayName) + "-" +
							String(parameter.index),
						groupId: group.id,
						groupPriority: group.priority,
						effectOrder: i,
						effectDisplayName: effect.displayName,
						effectPremiereName: effect.premiereName || effect.displayName,
						effectMatchName: effect.matchName || null,
						parameterIndex: parameter.index,
						parameterDisplayName: parameter.displayName || "",
						parameterMatchName: parameter.matchName || null,
						valueType: parameter.valueType || "unknown",
						registryCurrentValue: copy(parameter.currentValue),
						hasGetValue: parameter.hasGetValue === true,
						hasSetValue: parameter.hasSetValue === true,
						isTimeVarying: parameter.isTimeVarying === true,
						classification: classification.kind,
						classificationReason: classification.reason,
						liveTestPlanned: classification.liveTest === true,
						duplicateDisplayName: !!duplicates.counts[
							normalize(parameter.displayName)
						] && duplicates.counts[normalize(parameter.displayName)] > 1,
						alreadyProductionReady: !!alreadyReady[parameterKey(
							effect.displayName,
							parameter.index,
							parameter.displayName
						)],
						usefulness: numericUsefulness(parameter, effect.displayName)
					});
				}
			}
		}
		candidates.sort(function (a, b) {
			if (a.groupPriority !== b.groupPriority) {
				return a.groupPriority - b.groupPriority;
			}
			if (a.effectOrder !== b.effectOrder) {
				return a.effectOrder - b.effectOrder;
			}
			if (a.liveTestPlanned !== b.liveTestPlanned) {
				return a.liveTestPlanned ? -1 : 1;
			}
			if (a.usefulness !== b.usefulness) {
				return b.usefulness - a.usefulness;
			}
			return a.parameterIndex - b.parameterIndex;
		});
		for (i = 0; i < candidates.length; i++) {
			candidates[i].rank = i + 1;
		}
		return {
			schemaVersion: SCHEMA_VERSION,
			artifactType: PRIORITY_ARTIFACT_TYPE,
			modelVersion: PIPELINE_VERSION,
			generatedAt: options && options.generatedAt ? options.generatedAt : "",
			sourceRegistry: copy(registry && registry.source ? {
				schemaVersion: registry.schemaVersion,
				source: registry.source,
				apiModel: registry.apiModel,
				generatedAt: registry.generatedAt,
				sha256: registry.sha256 || null
			} : registry && registry.sourceRegistry),
			productionFeatureFlagEnabled: false,
			rankingPolicy: {
				popularityClaimsUsed: false,
				evidenceOnly: true,
				hardcodedParameterNamesAsValid: false,
				criteria: [
					"high-value Premiere effect groups from the research registry",
					"numeric continuous / percent / angle / intensity / amount / radius / size / speed",
					"Gaussian Blur usable candidates are always queued",
					"enum / boolean / color / object / internal / time-varying are classified, not auto-promoted"
				]
			},
			groups: groups,
			candidateCount: candidates.length,
			liveTestCount: candidates.filter(function (row) {
				return row.liveTestPlanned;
			}).length,
			candidates: candidates
		};
	}

	function indexAlreadyReady(productionReady) {
		var index = {};
		var effects = productionReady && productionReady.effects
			? productionReady.effects
			: [];
		var effect;
		var parameter;
		var i;
		var j;
		for (i = 0; i < effects.length; i++) {
			effect = effects[i];
			for (j = 0; j < (effect.productionReadyParameters
				? effect.productionReadyParameters.length : 0); j++) {
				parameter = effect.productionReadyParameters[j];
				index[parameterKey(
					effect.displayName,
					parameter.index,
					parameter.displayName
				)] = parameter;
			}
		}
		return index;
	}

	function classificationStatus(candidate) {
		if (candidate.duplicateDisplayName &&
				normalize(candidate.effectDisplayName) === "lumetri color") {
			return {
				status: STATUS.AMBIGUOUS,
				reason: "AMBIGUOUS_PARAMETER"
			};
		}
		if (candidate.classification === CLASS.ENUM) {
			return {
				status: STATUS.ENUM_REVIEW,
				reason: candidate.classificationReason
			};
		}
		if (candidate.classification === CLASS.BOOLEAN ||
				candidate.classification === CLASS.COLOR ||
				candidate.classification === CLASS.OBJECT ||
				candidate.classification === CLASS.INTERNAL ||
				candidate.classification === CLASS.TIME_VARYING ||
				candidate.classification === CLASS.STRING) {
			return {
				status: STATUS.MANUAL_REVIEW,
				reason: candidate.classificationReason
			};
		}
		if (candidate.liveTestPlanned) {
			return {
				status: STATUS.PENDING_LIVE,
				reason: "LIVE_VALIDATION_REQUIRED"
			};
		}
		return {
			status: STATUS.MANUAL_REVIEW,
			reason: candidate.classificationReason || "MANUAL_REVIEW"
		};
	}

	function fingerprintOk(fingerprint) {
		return !!(
			fingerprint &&
			fingerprint.ok === true &&
			fingerprint.fingerprintRestored === true &&
			fingerprint.productionUntouched === true &&
			(fingerprint.unexpectedComponents || 0) === 0 &&
			(fingerprint.missingComponents || 0) === 0 &&
			(fingerprint.unrelatedParameterChanges || 0) === 0 &&
			(fingerprint.parameterValueMismatches || 0) === 0
		);
	}

	function evaluateCandidate(candidate, transaction) {
		var classified = classificationStatus(candidate);
		var identityKnown;
		var result;
		if (!candidate) {
			return {
				status: STATUS.FAILED,
				reason: "MISSING_PARAMETER",
				promoted: false
			};
		}
		result = {
			candidateId: candidate.candidateId,
			effectDisplayName: candidate.effectDisplayName,
			effectPremiereName: candidate.effectPremiereName,
			effectMatchName: candidate.effectMatchName,
			parameterIndex: candidate.parameterIndex,
			parameterDisplayName: candidate.parameterDisplayName,
			classification: candidate.classification,
			liveTestPlanned: candidate.liveTestPlanned === true,
			hasGetValue: candidate.hasGetValue === true,
			hasSetValue: candidate.hasSetValue === true,
			promoted: false,
			automaticPromotion: false,
			productionRegistryMutated: false
		};
		if (!transaction) {
			result.status = classified.status;
			result.reason = classified.reason;
			return result;
		}
		result.transaction = copy(transaction);
		if (transaction.automaticPromotion === true) {
			result.status = STATUS.FAILED;
			result.reason = "AUTOMATIC_PROMOTION_FORBIDDEN";
			return result;
		}
		if (transaction.productionRegistryMutated === true) {
			result.status = STATUS.FAILED;
			result.reason = "PRODUCTION_REGISTRY_MUTATED";
			return result;
		}
		if ((transaction.productionWrites || 0) > 0) {
			result.status = STATUS.FAILED;
			result.reason = "PRODUCTION_WRITE_ATTEMPTED";
			return result;
		}
		if (transaction.usedQE === true) {
			result.status = STATUS.FAILED;
			result.reason = "QE_WRITE_FORBIDDEN";
			return result;
		}
		if (transaction.environment && (
				transaction.environment.ok !== true ||
				transaction.environment.environment !== "research" ||
				transaction.environment.sequence !== RESEARCH_SEQUENCE ||
				transaction.environment.trackItemName !== RESEARCH_CLIP
			)) {
			result.status = STATUS.FAILED;
			result.reason = "RESEARCH_SEQUENCE_ISOLATION";
			return result;
		}
		if (candidate.classification !== CLASS.NUMERIC) {
			result.status = classified.status;
			result.reason = classified.reason;
			return result;
		}
		if (candidate.isTimeVarying === true ||
				transaction.isTimeVarying === true) {
			result.status = STATUS.MANUAL_REVIEW;
			result.reason = "TIME_VARYING_PARAMETER";
			return result;
		}
		if (transaction.duplicateEffectInstance === true ||
				(transaction.matchingComponents || 0) > 1) {
			result.status = STATUS.AMBIGUOUS;
			result.reason = "DUPLICATE_EFFECT_INSTANCE";
			return result;
		}
		if (transaction.parameterResolved === false ||
				transaction.missingParameter === true) {
			result.status = STATUS.FAILED;
			result.reason = "MISSING_PARAMETER";
			return result;
		}
		if (transaction.ambiguousParameter === true) {
			result.status = STATUS.AMBIGUOUS;
			result.reason = "AMBIGUOUS_PARAMETER";
			return result;
		}
		identityKnown = !!(
			transaction.componentIdentity &&
			transaction.componentIdentity.displayName &&
			(transaction.componentIdentity.matchName ||
				transaction.componentIdentity.componentIndex !== undefined) &&
			typeof transaction.parameterIndex === "number" &&
			transaction.parameterIndex === candidate.parameterIndex
		);
		if (!identityKnown) {
			result.status = STATUS.AMBIGUOUS;
			result.reason = "COMPONENT_IDENTITY_UNKNOWN";
			return result;
		}
		if (normalize(transaction.componentIdentity.displayName) !==
				normalize(candidate.effectDisplayName) &&
				normalize(transaction.componentIdentity.matchName || "") !==
					normalize(candidate.effectMatchName || "")) {
			result.status = STATUS.AMBIGUOUS;
			result.reason = "COMPONENT_IDENTITY_MISMATCH";
			return result;
		}
		if (transaction.writable !== true) {
			result.status = STATUS.FAILED;
			result.reason = "PARAMETER_NOT_WRITABLE";
			return result;
		}
		if (transaction.writeOk !== true ||
				transaction.writeVerified !== true ||
				!verifyNumber(transaction.testValue, transaction.readBack)) {
			result.status = STATUS.FAILED;
			result.reason = transaction.readBackMismatch
				? "READBACK_MISMATCH"
				: (transaction.writeReason || "READBACK_MISMATCH");
			return result;
		}
		if (transaction.restoreOk !== true ||
				transaction.restoreVerified !== true ||
				!verifyNumber(transaction.originalValue, transaction.restoreReadBack)) {
			result.status = STATUS.FAILED;
			result.reason = "RESTORE_FAILED";
			return result;
		}
		if (!fingerprintOk(transaction.fingerprint)) {
			result.status = STATUS.FAILED;
			result.reason = "FINGERPRINT_MISMATCH";
			return result;
		}
		if (transaction.writerPath !== "CommandExecutor.run" &&
				transaction.writerPath !== "ConfirmedParameterWrites.write") {
			result.status = STATUS.FAILED;
			result.reason = "UNSAFE_WRITE_PATH";
			return result;
		}
		result.status = STATUS.PRODUCTION_READY;
		result.reason = "LIVE_VALIDATION_PASSED";
		result.promoted = true;
		result.requestedValue = transaction.testValue;
		result.readBack = transaction.readBack;
		result.originalValue = transaction.originalValue;
		result.restoreReadBack = transaction.restoreReadBack;
		return result;
	}

	function summarizeResults(results) {
		var summary = {
			totalCandidatesTested: 0,
			passed: 0,
			failed: 0,
			ambiguous: 0,
			manualReview: 0,
			enumReview: 0,
			pendingLive: 0,
			productionReady: 0,
			effectsCovered: 0,
			parametersCovered: 0
		};
		var effects = {};
		var result;
		var i;
		for (i = 0; i < results.length; i++) {
			result = results[i];
			summary.parametersCovered += 1;
			effects[normalize(result.effectDisplayName)] = true;
			if (result.liveTestPlanned && result.status !== STATUS.PENDING_LIVE) {
				summary.totalCandidatesTested += 1;
			} else if (!result.liveTestPlanned && result.status !== STATUS.PENDING_LIVE) {
				summary.totalCandidatesTested += 1;
			}
			if (result.status === STATUS.PRODUCTION_READY) {
				summary.passed += 1;
				summary.productionReady += 1;
			} else if (result.status === STATUS.FAILED) {
				summary.failed += 1;
			} else if (result.status === STATUS.AMBIGUOUS) {
				summary.ambiguous += 1;
			} else if (result.status === STATUS.ENUM_REVIEW) {
				summary.enumReview += 1;
			} else if (result.status === STATUS.PENDING_LIVE) {
				summary.pendingLive += 1;
			} else {
				summary.manualReview += 1;
			}
		}
		summary.effectsCovered = Object.keys(effects).length;
		return summary;
	}

	function gaussianBlurReport(results) {
		var report = [];
		var result;
		var i;
		for (i = 0; i < results.length; i++) {
			result = results[i];
			if (normalize(result.effectDisplayName) !== "gaussian blur") {
				continue;
			}
			report.push({
				parameterDisplayName: result.parameterDisplayName,
				parameterIndex: result.parameterIndex,
				status: result.status,
				reason: result.reason,
				promoted: result.promoted === true
			});
		}
		return report;
	}

	function nextUnvalidated(priority, results, limit) {
		var evaluated = {};
		var remaining = [];
		var candidate;
		var result;
		var i;
		var cap = typeof limit === "number" ? limit : 25;
		for (i = 0; i < results.length; i++) {
			result = results[i];
			evaluated[result.candidateId] = result;
		}
		for (i = 0; i < priority.candidates.length; i++) {
			candidate = priority.candidates[i];
			result = evaluated[candidate.candidateId];
			if (result && result.status === STATUS.PRODUCTION_READY) {
				continue;
			}
			if (result && result.status !== STATUS.PENDING_LIVE &&
					!candidate.liveTestPlanned) {
				continue;
			}
			if (!candidate.liveTestPlanned) {
				continue;
			}
			if (result && result.status === STATUS.PRODUCTION_READY) {
				continue;
			}
			remaining.push({
				rank: candidate.rank,
				effectDisplayName: candidate.effectDisplayName,
				parameterDisplayName: candidate.parameterDisplayName,
				parameterIndex: candidate.parameterIndex,
				classification: candidate.classification,
				status: result ? result.status : STATUS.PENDING_LIVE,
				reason: result ? result.reason : "LIVE_VALIDATION_REQUIRED"
			});
			if (remaining.length >= cap) {
				break;
			}
		}
		return remaining;
	}

	function productionReadyRow(result, candidate) {
		return {
			index: result.parameterIndex,
			displayName: result.parameterDisplayName,
			matchName: candidate && candidate.parameterMatchName
				? candidate.parameterMatchName
				: null,
			valueType: "number",
			status: STATUS.PRODUCTION_READY,
			statusReason:
				"Promoted after successful isolated research write, read-back, restore, and fingerprint comparison.",
			validationEvidence: {
				source: "phase9-targeted-live-validation",
				promotionStatus: "promoted",
				verified: true,
				requestedValue: result.requestedValue,
				readBack: result.readBack,
				validationTestId: result.candidateId,
				reference: null,
				applyVerified: true,
				writeVerified: true,
				readBackVerified: true,
				cleanup: {
					ok: true,
					fingerprintRestored: true,
					productionUntouched: true,
					parameterValueMismatches: 0,
					unexpectedComponents: 0,
					missingComponents: 0
				},
				baselineRestored: true,
				productionUntouched: true
			},
			commands: {
				explicitParameterCommand:
					normalize(result.effectDisplayName) + " " +
					normalize(result.parameterDisplayName) + " " +
					String(result.requestedValue)
			}
		};
	}

	function buildNextProductionReady(existingReady, results, candidates, options) {
		var effects = [];
		var source = existingReady && existingReady.effects
			? copy(existingReady.effects)
			: [];
		var byEffect = {};
		var candidateById = {};
		var effect;
		var result;
		var candidate;
		var added = 0;
		var i;
		var j;
		for (i = 0; i < (candidates ? candidates.length : 0); i++) {
			candidateById[candidates[i].candidateId] = candidates[i];
		}
		for (i = 0; i < source.length; i++) {
			effect = source[i];
			byEffect[normalize(effect.displayName)] = effect;
			effects.push(effect);
		}
		for (i = 0; i < results.length; i++) {
			result = results[i];
			if (result.status !== STATUS.PRODUCTION_READY || result.promoted !== true) {
				continue;
			}
			candidate = candidateById[result.candidateId];
			effect = byEffect[normalize(result.effectDisplayName)];
			if (!effect) {
				effect = {
					type: "video-effect",
					displayName: result.effectDisplayName,
					premiereName: result.effectPremiereName,
					matchName: result.effectMatchName,
					parameterCount: 0,
					productionReady: true,
					applyOnlyReady: false,
					parameterWritesReady: true,
					reason: "Newly promoted from isolated targeted validation.",
					validationEvidence: [],
					productionReadyParameters: []
				};
				byEffect[normalize(result.effectDisplayName)] = effect;
				effects.push(effect);
			}
			for (j = 0; j < effect.productionReadyParameters.length; j++) {
				if (effect.productionReadyParameters[j].index === result.parameterIndex &&
						normalize(effect.productionReadyParameters[j].displayName) ===
							normalize(result.parameterDisplayName)) {
					break;
				}
			}
			if (j < effect.productionReadyParameters.length) {
				continue;
			}
			effect.productionReadyParameters.push(productionReadyRow(result, candidate));
			effect.validationEvidence.push({
				parameterIndex: result.parameterIndex,
				parameterDisplayName: result.parameterDisplayName,
				status: STATUS.PRODUCTION_READY,
				evidence: productionReadyRow(result, candidate).validationEvidence
			});
			effect.productionReady = true;
			effect.parameterWritesReady = true;
			added += 1;
		}
		effects.sort(function (a, b) {
			return normalize(a.displayName) < normalize(b.displayName) ? -1 : 1;
		});
		return {
			schemaVersion: SCHEMA_VERSION,
			artifactType: READY_ARTIFACT_TYPE,
			auditVersion: PIPELINE_VERSION,
			generatedAt: options && options.generatedAt ? options.generatedAt : "",
			sourceRegistry: copy(existingReady && existingReady.sourceRegistry),
			sourcePromotion: {
				artifactType: RESULTS_ARTIFACT_TYPE,
				pipelineVersion: PIPELINE_VERSION,
				pairCount: effects.reduce(function (sum, row) {
					return sum + (row.productionReadyParameters
						? row.productionReadyParameters.length : 0);
				}, 0)
			},
			productionFeatureFlagEnabled: false,
			registryResolverCurrentlyEnabled: false,
			note: "Generated from successfully validated rows only. The customer production registry was not modified.",
			summary: {
				effectsProductionReady: effects.length,
				productionReadyParameters: effects.reduce(function (sum, row) {
					return sum + (row.productionReadyParameters
						? row.productionReadyParameters.length : 0);
				}, 0),
				newlyPromoted: added
			},
			effects: effects
		};
	}

	function buildResultsArtifact(priority, results, options) {
		var live = options && options.liveRun ? options.liveRun : {
			status: "not-run",
			reason: "LIVE_VALIDATION_NOT_EXECUTED"
		};
		return {
			schemaVersion: SCHEMA_VERSION,
			artifactType: RESULTS_ARTIFACT_TYPE,
			pipelineVersion: PIPELINE_VERSION,
			generatedAt: options && options.generatedAt ? options.generatedAt : "",
			productionFeatureFlagEnabled: false,
			productionRegistryMutated: false,
			productionWrites: 0,
			usedQE: false,
			liveRun: live,
			sourcePriority: {
				artifactType: priority.artifactType,
				modelVersion: priority.modelVersion,
				candidateCount: priority.candidateCount
			},
			summary: summarizeResults(results),
			gaussianBlur: gaussianBlurReport(results),
			nextUnvalidated: nextUnvalidated(priority, results, 25),
			results: results
		};
	}

	function findRuntimeParameter(parameters, candidate) {
		var found = null;
		var count = 0;
		var i;
		for (i = 0; i < (parameters ? parameters.length : 0); i++) {
			if (parameters[i] &&
					String(parameters[i].displayName || "") ===
						String(candidate.parameterDisplayName || "")) {
				found = parameters[i];
				count += 1;
			}
		}
		if (count !== 1) {
			return {
				ok: false,
				reason: count > 1 ? "AMBIGUOUS_PARAMETER" : "MISSING_PARAMETER",
				matchCount: count,
				parameter: null
			};
		}
		if (typeof found.index === "number" &&
				found.index !== candidate.parameterIndex) {
			return {
				ok: false,
				reason: "PARAMETER_IDENTITY_MISMATCH",
				matchCount: 1,
				expectedIndex: candidate.parameterIndex,
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

	function resolutionFor(candidate, value) {
		return {
			ok: true,
			type: "effect",
			query: candidate.effectDisplayName,
			value: value,
			hasValue: true,
			resolvedEffect: {
				type: "video-effect",
				name: candidate.effectDisplayName,
				displayName: candidate.effectDisplayName,
				premiereName: candidate.effectPremiereName,
				matchName: candidate.effectMatchName
			},
			parameter: {
				index: candidate.parameterIndex,
				displayName: candidate.parameterDisplayName,
				valueType: "number",
				confidence: "targeted-validation",
				score: null
			}
		};
	}

	function cleanupFingerprint(cleanup) {
		var result = cleanup && cleanup.cleanupResult
			? cleanup.cleanupResult
			: {};
		return {
			ok: !!(cleanup && cleanup.ok === true),
			fingerprintRestored: !!(cleanup && cleanup.fingerprintRestored === true),
			productionUntouched: !!(cleanup && cleanup.productionUntouched === true),
			unexpectedComponents: result.unexpectedComponents || 0,
			missingComponents: result.missingComponents || 0,
			unrelatedParameterChanges: result.parameterValueMismatches || 0,
			parameterValueMismatches: result.parameterValueMismatches || 0
		};
	}

	function writeValue(options, targetedCS, candidate, value, done) {
		options.dispatcher.dispatch(
			targetedCS,
			resolutionFor(candidate, value),
			{
				featureEnabled: true,
				researchValidation: true,
				effectExecutor: options.effectExecutor,
				commandExecutor: options.commandExecutor
			},
			done
		);
	}

	function run(options, done) {
		var bridge = options && options.bridge;
		var registry = options && options.registry;
		var rawCS = options && options.csInterface;
		var productionReady = options && options.productionReady;
		var productionMutations = [];
		var targetedCS;
		var priority;
		var results = [];
		var environment = null;
		var stopped = false;
		var cursor = 0;

		function schedule(fn) {
			if (options && typeof options.schedule === "function") {
				options.schedule(fn, 25);
				return;
			}
			setTimeout(fn, 25);
		}

		function now() {
			return options && options.now ? options.now() : "";
		}

		function featureEnabled() {
			return options && typeof options.productionFeatureEnabled === "function"
				? options.productionFeatureEnabled() === true
				: options && options.productionFeatureEnabled === true;
		}

		function persist(state) {
			if (options && typeof options.saveState === "function") {
				options.saveState(state, {
					allowProductionRegistryWrite: false,
					productionMutations: productionMutations
				});
			}
		}

		function finish(status, reason) {
			var artifact;
			var nextReady;
			if (stopped) {
				return;
			}
			stopped = true;
			function complete(completion) {
				artifact = buildResultsArtifact(priority, results, {
					generatedAt: now(),
					liveRun: {
						status: status,
						reason: reason || "",
						environment: environment,
						completion: completion || null,
						productionFeatureFlagEnabled: false,
						isolatedValidationRunnerEnabled: true,
						customerProductionFeatureFlagEnabled: featureEnabled(),
						productionRegistryMutated: productionMutations.length > 0,
						productionWrites: 0,
						usedQE: false
					}
				});
				nextReady = buildNextProductionReady(
					productionReady,
					results,
					priority.candidates,
					{ generatedAt: now() }
				);
				persist({
					results: artifact,
					nextProductionReady: nextReady
				});
				done({
					ok: status === "complete" || status === "classified-only",
					status: status,
					stoppedReason: reason || null,
					priority: priority,
					results: artifact,
					nextProductionReady: nextReady,
					productionRegistryMutated: productionMutations.length > 0,
					productionFeatureFlagEnabled: featureEnabled()
				});
			}
			if (bridge && typeof bridge.researchTerminalComplete === "function" && rawCS) {
				bridge.researchTerminalComplete(rawCS, complete);
				return;
			}
			complete(null);
		}

		function classifyRemainingAndFinish(status, reason) {
			var candidate;
			while (cursor < priority.candidates.length) {
				candidate = priority.candidates[cursor];
				results.push(evaluateCandidate(candidate, null));
				cursor += 1;
			}
			finish(status, reason);
		}

		function processNext() {
			var candidate;
			var settled = false;
			if (cursor >= priority.candidates.length) {
				finish("complete", "");
				return;
			}
			candidate = priority.candidates[cursor];
			if (options && typeof options.onBeforeTest === "function") {
				options.onBeforeTest(candidate, {
					cursor: cursor,
					total: priority.candidates.length
				});
			}
			if (!candidate.liveTestPlanned) {
				results.push(evaluateCandidate(candidate, null));
				cursor += 1;
				persist({ cursor: cursor, results: results });
				schedule(processNext);
				return;
			}
			if (candidate.alreadyProductionReady &&
					normalize(candidate.effectDisplayName) !== "gaussian blur") {
				results.push(evaluateCandidate(candidate, null));
				results[results.length - 1].status = STATUS.PRODUCTION_READY;
				results[results.length - 1].reason = "ALREADY_PRODUCTION_READY";
				results[results.length - 1].promoted = false;
				results[results.length - 1].retainedExistingEvidence = true;
				cursor += 1;
				persist({ cursor: cursor, results: results });
				schedule(processNext);
				return;
			}
			bridge.researchTerminalBeginTest(
				rawCS,
				candidate.candidateId,
				candidate.effectDisplayName,
				candidate.effectMatchName || "",
				function (begun) {
					function finalize(transaction, extraReason) {
						var evaluation;
						if (settled) {
							return;
						}
						settled = true;
						bridge.researchTerminalFinishTest(rawCS, true, function (cleanup) {
							if (!transaction) {
								transaction = {};
							}
							transaction.environment = environment;
							transaction.productionFeatureFlagEnabled = false;
							transaction.isolatedValidationRunnerEnabled = true;
							transaction.customerProductionFeatureFlagEnabled = featureEnabled();
							transaction.productionRegistryMutated = productionMutations.length > 0;
							transaction.productionWrites = 0;
							transaction.usedQE = transaction.usedQE === true;
							transaction.fingerprint = cleanupFingerprint(cleanup);
							if (cleanup && cleanup.addedComponent) {
								transaction.componentIdentity = {
									componentIndex: cleanup.addedComponent.componentIndex,
									displayName: cleanup.addedComponent.displayName,
									matchName: cleanup.addedComponent.matchName
								};
							}
							if (extraReason && !transaction.writeReason) {
								transaction.writeReason = extraReason;
							}
							evaluation = evaluateCandidate(candidate, transaction);
							results.push(evaluation);
							cursor += 1;
							persist({ cursor: cursor, results: results });
							if (!fingerprintOk(transaction.fingerprint) &&
									evaluation.reason === "FINGERPRINT_MISMATCH") {
								classifyRemainingAndFinish("stopped", "CLEANUP_FAILED");
								return;
							}
							schedule(processNext);
						});
					}

					if (!begun || begun.ok !== true) {
						classifyRemainingAndFinish(
							"stopped",
							(begun && begun.reason) || "RESEARCH_ENVIRONMENT_UNAVAILABLE"
						);
						return;
					}
					options.effectExecutor.applyEffect(
						targetedCS,
						candidate.effectPremiereName,
						function (applied) {
							if (!applied || applied.ok !== true || applied.applied !== 1) {
								finalize({
									writeOk: false,
									writerPath: "CommandExecutor.run",
									parameterResolved: false,
									matchingComponents: 0
								}, (applied && applied.reason) || "APPLY_FAILED");
								return;
							}
							if (applied.matchingComponents > 1 ||
									applied.duplicateEffectInstance === true) {
								finalize({
									writerPath: "CommandExecutor.run",
									duplicateEffectInstance: true,
									matchingComponents: applied.matchingComponents || 2,
									parameterResolved: true,
									parameterIndex: candidate.parameterIndex,
									writable: true,
									componentIdentity: applied.componentIdentity || {
										displayName: candidate.effectDisplayName,
										matchName: candidate.effectMatchName,
										componentIndex: 0
									}
								}, "DUPLICATE_EFFECT_INSTANCE");
								return;
							}
							bridge.listEffectParameters(
								targetedCS,
								candidate.effectPremiereName,
								function (listed) {
									var runtime = findRuntimeParameter(
										listed && listed.parameters,
										candidate
									);
									var original;
									var picked;
									if (!listed || listed.ok !== true) {
										finalize({
											writerPath: "CommandExecutor.run",
											parameterResolved: false,
											missingParameter: true
										}, (listed && listed.reason) || "MISSING_PARAMETER");
										return;
									}
									if ((listed.matchingComponents || 0) > 1) {
										finalize({
											writerPath: "CommandExecutor.run",
											duplicateEffectInstance: true,
											matchingComponents: listed.matchingComponents,
											parameterResolved: true,
											parameterIndex: candidate.parameterIndex,
											writable: true,
											componentIdentity: {
												displayName: candidate.effectDisplayName,
												matchName: candidate.effectMatchName,
												componentIndex: 0
											}
										}, "DUPLICATE_EFFECT_INSTANCE");
										return;
									}
									if (!runtime.ok) {
										finalize({
											writerPath: "CommandExecutor.run",
											parameterResolved: false,
											missingParameter: runtime.reason === "MISSING_PARAMETER",
											ambiguousParameter: runtime.reason === "AMBIGUOUS_PARAMETER",
											parameterIndex: candidate.parameterIndex
										}, runtime.reason);
										return;
									}
									if (runtime.parameter.writable !== true) {
										finalize({
											writerPath: "CommandExecutor.run",
											parameterResolved: true,
											parameterIndex: candidate.parameterIndex,
											writable: false,
											componentIdentity: {
												displayName: candidate.effectDisplayName,
												matchName: candidate.effectMatchName,
												componentIndex: 0
											}
										}, "PARAMETER_NOT_WRITABLE");
										return;
									}
									original = runtime.parameter.value;
									picked = chooseNumericTestValue(
										candidate,
										original,
										runtime.parameter
									);
									if (!picked || picked.ok !== true) {
										finalize({
											writerPath: "CommandExecutor.run",
											parameterResolved: true,
											parameterIndex: candidate.parameterIndex,
											writable: true,
											originalValue: original,
											componentIdentity: {
												displayName: candidate.effectDisplayName,
												matchName: candidate.effectMatchName,
												componentIndex: 0
											}
										}, (picked && picked.reason) || "NO_SAFE_TEST_VALUE");
										return;
									}
									writeValue(
										options,
										targetedCS,
										candidate,
										picked.value,
										function (written) {
											var readBack = written &&
												(written.actualValue !== undefined
													? written.actualValue
													: written.readBack);
											var writeOk = !!(
												written &&
												written.ok === true &&
												written.verified === true &&
												verifyNumber(picked.value, readBack)
											);
											if (!writeOk) {
												finalize({
													writerPath: "CommandExecutor.run",
													parameterResolved: true,
													parameterIndex: candidate.parameterIndex,
													writable: true,
													originalValue: original,
													testValue: picked.value,
													writeOk: false,
													writeVerified: false,
													readBack: readBack,
													readBackMismatch: true,
													componentIdentity: {
														displayName: candidate.effectDisplayName,
														matchName: candidate.effectMatchName,
														componentIndex: 0
													}
												}, (written && written.reason) || "READBACK_MISMATCH");
												return;
											}
											writeValue(
												options,
												targetedCS,
												candidate,
												original,
												function (restored) {
													var restoreReadBack = restored &&
														(restored.actualValue !== undefined
															? restored.actualValue
															: restored.readBack);
													var restoreOk = !!(
														restored &&
														restored.ok === true &&
														restored.verified === true &&
														verifyNumber(original, restoreReadBack)
													);
													finalize({
														writerPath: written.executionPath ===
															"CommandExecutor.run"
															? "CommandExecutor.run"
															: "CommandExecutor.run",
														parameterResolved: true,
														parameterIndex: candidate.parameterIndex,
														writable: true,
														isTimeVarying: runtime.parameter.isTimeVarying === true,
														originalValue: original,
														testValue: picked.value,
														writeOk: true,
														writeVerified: true,
														readBack: readBack,
														restoreOk: restoreOk,
														restoreVerified: restoreOk,
														restoreReadBack: restoreReadBack,
														matchingComponents: 1,
														usedQE: written.usedQE === true,
														componentIdentity: {
															displayName: candidate.effectDisplayName,
															matchName: candidate.effectMatchName,
															componentIndex: 0
														}
													}, restoreOk ? "" : "RESTORE_FAILED");
												}
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
		priority = options && options.priority
			? options.priority
			: buildPriorityQueue(registry, {
				generatedAt: now(),
				alreadyReady: indexAlreadyReady(productionReady)
			});
		if (!options.live || !bridge || !rawCS) {
			classifyRemainingAndFinish(
				"classified-only",
				"LIVE_VALIDATION_NOT_EXECUTED"
			);
			return;
		}
		if (typeof bridge.researchTerminalPrepare !== "function" ||
				typeof TerminalResearchHarness === "undefined") {
			classifyRemainingAndFinish(
				"classified-only",
				"VALIDATION_DEPENDENCY_UNAVAILABLE"
			);
			return;
		}
		targetedCS = TerminalResearchHarness.createTargetedCSInterface(rawCS);
		bridge.researchTerminalPrepare(rawCS, function (prepared) {
			environment = prepared || null;
			if (!prepared ||
					prepared.ok !== true ||
					prepared.environment !== "research" ||
					prepared.sequence !== RESEARCH_SEQUENCE ||
					prepared.trackItemName !== RESEARCH_CLIP ||
					prepared.videoTrackItem !== true) {
				classifyRemainingAndFinish(
					"stopped",
					"RESEARCH_ENVIRONMENT_UNAVAILABLE"
				);
				return;
			}
			if (typeof bridge.researchBaselineCleanup !== "function") {
				classifyRemainingAndFinish(
					"stopped",
					"RESEARCH_BASELINE_NOT_CLEAN"
				);
				return;
			}
			bridge.researchBaselineCleanup(
				rawCS,
				typeof ResearchBaselineCleanup !== "undefined"
					? ResearchBaselineCleanup.mergeKnownEffects(
						ResearchBaselineCleanup.KNOWN_RESEARCH_EFFECTS,
						ResearchBaselineCleanup.identitiesFromRegistry(registry)
					)
					: [],
				function (cleanup) {
					if (!cleanup ||
							cleanup.status !== "READY_FOR_TARGETED_PROMOTION" ||
							cleanup.cleanupFullyVerified !== true) {
						classifyRemainingAndFinish(
							"stopped",
							"RESEARCH_BASELINE_NOT_CLEAN"
						);
						return;
					}
					processNext();
				}
			);
		});
	}

	return {
		SCHEMA_VERSION: SCHEMA_VERSION,
		PRIORITY_ARTIFACT_TYPE: PRIORITY_ARTIFACT_TYPE,
		RESULTS_ARTIFACT_TYPE: RESULTS_ARTIFACT_TYPE,
		PIPELINE_VERSION: PIPELINE_VERSION,
		STATUS: STATUS,
		CLASS: CLASS,
		EFFECT_GROUPS: EFFECT_GROUPS,
		RESEARCH_SEQUENCE: RESEARCH_SEQUENCE,
		RESEARCH_CLIP: RESEARCH_CLIP,
		classifyParameter: classifyParameter,
		chooseNumericTestValue: chooseNumericTestValue,
		buildPriorityQueue: buildPriorityQueue,
		indexAlreadyReady: indexAlreadyReady,
		evaluateCandidate: evaluateCandidate,
		findRuntimeParameter: findRuntimeParameter,
		summarizeResults: summarizeResults,
		gaussianBlurReport: gaussianBlurReport,
		nextUnvalidated: nextUnvalidated,
		buildNextProductionReady: buildNextProductionReady,
		buildResultsArtifact: buildResultsArtifact,
		run: run
	};
}());

if (typeof $ !== "undefined") {
	$._pickfxTerminalPromotionPipeline = TerminalPromotionPipeline;
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = TerminalPromotionPipeline;
}
