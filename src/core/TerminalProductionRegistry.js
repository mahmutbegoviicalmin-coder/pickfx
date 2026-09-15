var TerminalProductionRegistry = (function () {
	var SCHEMA_VERSION = 1;
	var ARTIFACT_TYPE = "pickfx-terminal-production-registry";
	var FEATURE_FLAG_KEY = "pickfx.terminalResolver.enabled";
	var FEATURE_ENABLED_BY_DEFAULT = true;
	var EXPECTED_EFFECT_PAIRS = 36;
	var EXPECTED_MOTION_CAPABILITIES = 5;
	var V2_REGISTRY_VERSION = 2;
	var MOTION_ORDER = [
		"motion.opacity",
		"motion.scale",
		"motion.position",
		"motion.rotation",
		"motion.anchor-point"
	];

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

	function copy(value) {
		var out;
		var key;
		var i;
		if (value === null || value === undefined || typeof value !== "object") {
			return value;
		}
		if (typeof value.length === "number") {
			out = [];
			for (i = 0; i < value.length; i++) {
				out.push(copy(value[i]));
			}
			return out;
		}
		out = {};
		for (key in value) {
			if (value.hasOwnProperty(key)) {
				out[key] = copy(value[key]);
			}
		}
		return out;
	}

	function fail(reason, detail, extra) {
		var payload = {
			ok: false,
			reason: reason,
			detail: detail || reason
		};
		var key;
		if (extra) {
			for (key in extra) {
				if (extra.hasOwnProperty(key)) {
					payload[key] = extra[key];
				}
			}
		}
		return payload;
	}

	function evidenceIsProductionReady(parameter) {
		var evidence = parameter && parameter.validationEvidence;
		var cleanup = evidence && evidence.cleanup;
		return !!(
			parameter &&
			parameter.status === "PRODUCTION_READY" &&
			evidence &&
			evidence.promotionStatus === "promoted" &&
			evidence.verified === true &&
			evidence.applyVerified === true &&
			evidence.writeVerified === true &&
			evidence.readBackVerified === true &&
			evidence.baselineRestored === true &&
			evidence.productionUntouched === true &&
			cleanup &&
			cleanup.ok === true &&
			cleanup.fingerprintRestored === true &&
			cleanup.productionUntouched === true
		);
	}

	function motionEvidenceIsProductionReady(row) {
		return !!(
			row &&
			MOTION_ORDER.indexOf(row.capabilityId) !== -1 &&
			row.ok === true &&
			row.verified === true &&
			row.verifiedTest === true &&
			row.verifiedRestore === true &&
			row.cleanupVerified === true &&
			row.fingerprintRestored === true &&
			row.productionUntouched === true &&
			row.usedQE === false &&
			row.writerPath === "ConfirmedParameterWrites.write"
		);
	}

	function pairIdentityKey(matchName, parameterIndex) {
		return trim(matchName) + "|" + String(parameterIndex);
	}

	function isV2Registry(registry) {
		return !!(registry && registry.registryVersion === V2_REGISTRY_VERSION);
	}

	function productionParameter(effect, parameter) {
		var evidence = copy(parameter.validationEvidence);
		return {
			index: parameter.index,
			displayName: parameter.displayName,
			matchName: parameter.matchName || null,
			valueType: "number",
			currentValue: evidence.readBack,
			hasGetValue: true,
			hasSetValue: true,
			isTimeVarying: false,
			productionReady: true,
			status: "PRODUCTION_READY",
			validationEvidence: evidence
		};
	}

	function productionEffect(effect) {
		var parameters = effect.productionReadyParameters || [];
		var converted = [];
		var i;
		for (i = 0; i < parameters.length; i++) {
			if (evidenceIsProductionReady(parameters[i])) {
				converted.push(productionParameter(effect, parameters[i]));
			}
		}
		if (converted.length !== 1) {
			return null;
		}
		return {
			type: "video-effect",
			displayName: effect.displayName,
			name: effect.displayName,
			premiereName: effect.premiereName,
			matchName: effect.matchName || null,
			productionReady: true,
			parameters: converted,
			defaultParameterIndex: converted[0].index,
			defaultParameterDisplayName: converted[0].displayName
		};
	}

	function motionCommandName(row) {
		return normalize(row.property).replace(/\s+/g, " ");
	}

	function productionMotion(row) {
		var commandName = motionCommandName(row);
		var isPoint = row.type === "point";
		var isPercent = row.capabilityId === "motion.opacity" ||
			row.capabilityId === "motion.scale";
		return {
			id: row.capabilityId,
			type: "MOTION",
			property: row.property,
			displayName: commandName.replace(/\b[a-z]/g, function (letter) {
				return letter.toUpperCase();
			}),
			names: [commandName],
			valueType: isPoint ? "point" : (isPercent ? "percent" : "number"),
			componentDisplayName: row.component,
			componentMatchName: row.componentMatchName,
			parameterDisplayName: row.parameter,
			writerPath: row.writerPath,
			productionReady: true,
			validationEvidence: {
				verified: true,
				verifiedTest: true,
				verifiedRestore: true,
				cleanupVerified: true,
				fingerprintRestored: true,
				productionUntouched: true,
				usedQE: false,
				source: "terminal-capability-audit.json"
			}
		};
	}

	function build(productionReady, capabilityAudit, options) {
		var effects = [];
		var capabilities = [];
		var sourceEffects = productionReady && productionReady.effects
			? productionReady.effects : [];
		var sourceMotion = capabilityAudit && capabilityAudit.motion
			? capabilityAudit.motion : [];
		var effect;
		var motion;
		var i;
		var generatedAt = options && options.generatedAt
			? options.generatedAt
			: (new Date()).toISOString();

		if (!productionReady ||
				productionReady.artifactType !== "pickfx-terminal-production-ready-allowlist") {
			return fail("INVALID_EFFECT_EVIDENCE", "Production-readiness allowlist is unavailable.");
		}
		if (!capabilityAudit || capabilityAudit.phase !== "PHASE_6_TERMINAL_MVP") {
			return fail("INVALID_MOTION_EVIDENCE", "Terminal capability audit is unavailable.");
		}
		for (i = 0; i < sourceEffects.length; i++) {
			effect = productionEffect(sourceEffects[i]);
			if (effect) {
				effects.push(effect);
			}
		}
		for (i = 0; i < sourceMotion.length; i++) {
			if (motionEvidenceIsProductionReady(sourceMotion[i])) {
				motion = productionMotion(sourceMotion[i]);
				capabilities.push(motion);
			}
		}
		capabilities.sort(function (a, b) {
			return MOTION_ORDER.indexOf(a.id) - MOTION_ORDER.indexOf(b.id);
		});
		effects.sort(function (a, b) {
			var aName = normalize(a.displayName);
			var bName = normalize(b.displayName);
			return aName < bName ? -1 : (aName > bName ? 1 : 0);
		});

		if (effects.length !== EXPECTED_EFFECT_PAIRS) {
			return fail("EFFECT_PAIR_COUNT_MISMATCH", "Expected exactly 36 verified effect pairs.", {
				actual: effects.length,
				expected: EXPECTED_EFFECT_PAIRS
			});
		}
		if (capabilities.length !== EXPECTED_MOTION_CAPABILITIES) {
			return fail("MOTION_COUNT_MISMATCH", "Expected exactly 5 verified Motion capabilities.", {
				actual: capabilities.length,
				expected: EXPECTED_MOTION_CAPABILITIES
			});
		}
		if (!capabilityAudit.safety ||
				capabilityAudit.safety.productionFingerprintChanges !== 0 ||
				capabilityAudit.safety.cleanupFailures !== 0) {
			return fail("MOTION_SAFETY_EVIDENCE_FAILED", "Motion safety evidence is incomplete.");
		}

		return {
			schemaVersion: SCHEMA_VERSION,
			artifactType: ARTIFACT_TYPE,
			generatedAt: generatedAt,
			enabled: true,
			sourceEvidence: {
				effectsArtifact: productionReady.artifactType,
				effectsAuditVersion: productionReady.auditVersion,
				sourceRegistry: copy(productionReady.sourceRegistry),
				promotion: copy(productionReady.sourcePromotion),
				motionPhase: capabilityAudit.phase,
				productionFingerprintChanges: capabilityAudit.safety.productionFingerprintChanges,
				cleanupFailures: capabilityAudit.safety.cleanupFailures
			},
			counts: {
				effectParameterPairs: effects.length,
				motionCapabilities: capabilities.length,
				totalExecutableCapabilities: effects.length + capabilities.length
			},
			effects: effects,
			capabilities: capabilities,
			speed: [],
			transitions: [],
			excludedStatuses: [
				"AMBIGUOUS",
				"MANUAL_REVIEW",
				"UNSUPPORTED",
				"FAILED",
				"NOT_VALIDATED",
				"VALIDATED_BUT_NOT_PROMOTED"
			]
		};
	}

	function evidenceFromValidationResult(result) {
		var fingerprint = result && result.transaction && result.transaction.fingerprint
			? result.transaction.fingerprint
			: {};
		return {
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
				ok: fingerprint.ok === true || fingerprint.fingerprintRestored === true,
				fingerprintRestored: fingerprint.fingerprintRestored === true,
				productionUntouched: fingerprint.productionUntouched === true,
				parameterValueMismatches: fingerprint.parameterValueMismatches || 0,
				unexpectedComponents: fingerprint.unexpectedComponents || 0,
				missingComponents: fingerprint.missingComponents || 0
			},
			baselineRestored: fingerprint.fingerprintRestored === true,
			productionUntouched: fingerprint.productionUntouched === true
		};
	}

	function parameterFromExisting(parameter) {
		return copy(parameter);
	}

	function parameterFromValidationResult(result) {
		return {
			index: result.parameterIndex,
			displayName: result.parameterDisplayName,
			matchName: result.parameterMatchName || null,
			valueType: "number",
			currentValue: result.readBack,
			hasGetValue: true,
			hasSetValue: true,
			isTimeVarying: false,
			productionReady: true,
			status: "PRODUCTION_READY",
			validationEvidence: evidenceFromValidationResult(result)
		};
	}

	function sortEffects(effects) {
		effects.sort(function (a, b) {
			var aName = normalize(a.displayName);
			var bName = normalize(b.displayName);
			return aName < bName ? -1 : (aName > bName ? 1 : 0);
		});
		return effects;
	}

	function sortParameters(parameters) {
		parameters.sort(function (a, b) {
			return a.index - b.index;
		});
		return parameters;
	}

	function buildV2(existingRegistry, validationResults, options) {
		var generatedAt = options && options.generatedAt
			? options.generatedAt
			: (new Date()).toISOString();
		var existingEffects = existingRegistry && existingRegistry.effects
			? copy(existingRegistry.effects)
			: [];
		var capabilities = existingRegistry && existingRegistry.capabilities
			? copy(existingRegistry.capabilities)
			: [];
		var results = validationResults && validationResults.results
			? validationResults.results
			: [];
		var byIdentity = {};
		var byEffect = {};
		var effects = [];
		var added = [];
		var retained = [];
		var rejected = [];
		var duplicates = [];
		var result;
		var effect;
		var parameter;
		var key;
		var i;
		var j;
		var existingCount;
		var validated;

		if (!existingRegistry ||
				existingRegistry.artifactType !== ARTIFACT_TYPE ||
				!existingRegistry.effects) {
			return fail("INVALID_EXISTING_PRODUCTION_REGISTRY",
				"The previous production registry is unavailable.");
		}
		validated = validate(existingRegistry);
		if (!validated.ok) {
			return validated;
		}

		for (i = 0; i < existingEffects.length; i++) {
			effect = existingEffects[i];
			effect.parameters = effect.parameters || [];
			byEffect[normalize(effect.matchName || effect.displayName)] = effect;
			effects.push(effect);
			for (j = 0; j < effect.parameters.length; j++) {
				parameter = effect.parameters[j];
				key = pairIdentityKey(effect.matchName, parameter.index);
				byIdentity[key] = {
					effect: effect,
					parameter: parameter,
					source: "existing-production-registry"
				};
				retained.push({
					effectDisplayName: effect.displayName,
					effectMatchName: effect.matchName,
					parameterDisplayName: parameter.displayName,
					parameterIndex: parameter.index,
					source: "existing-production-registry"
				});
			}
		}
		existingCount = retained.length;

		for (i = 0; i < results.length; i++) {
			result = results[i];
			if (!result ||
					result.status !== "PRODUCTION_READY" ||
					result.promoted !== true) {
				rejected.push({
					candidateId: result && result.candidateId,
					effectDisplayName: result && result.effectDisplayName,
					parameterDisplayName: result && result.parameterDisplayName,
					parameterIndex: result && result.parameterIndex,
					status: result && result.status,
					reason: result && result.reason,
					promoted: !!(result && result.promoted)
				});
				continue;
			}
			key = pairIdentityKey(result.effectMatchName, result.parameterIndex);
			if (byIdentity[key]) {
				duplicates.push({
					identityKey: key,
					effectMatchName: result.effectMatchName,
					parameterIndex: result.parameterIndex,
					incomingDisplayName: result.parameterDisplayName,
					keptDisplayName: byIdentity[key].parameter.displayName,
					keptSource: byIdentity[key].source
				});
				continue;
			}
			parameter = parameterFromValidationResult(result);
			if (!evidenceIsProductionReady(parameter)) {
				rejected.push({
					candidateId: result.candidateId,
					effectDisplayName: result.effectDisplayName,
					parameterDisplayName: result.parameterDisplayName,
					parameterIndex: result.parameterIndex,
					status: "FAILED",
					reason: "INCOMPLETE_LIVE_EVIDENCE",
					promoted: true
				});
				continue;
			}
			effect = byEffect[normalize(result.effectMatchName || result.effectDisplayName)];
			if (!effect) {
				effect = {
					type: "video-effect",
					displayName: result.effectDisplayName,
					name: result.effectDisplayName,
					premiereName: result.effectPremiereName || result.effectDisplayName,
					matchName: result.effectMatchName || null,
					productionReady: true,
					parameters: [],
					defaultParameterIndex: result.parameterIndex,
					defaultParameterDisplayName: result.parameterDisplayName
				};
				byEffect[normalize(effect.matchName || effect.displayName)] = effect;
				effects.push(effect);
			}
			effect.parameters.push(parameter);
			byIdentity[key] = {
				effect: effect,
				parameter: parameter,
				source: "phase9-targeted-live-validation"
			};
			added.push({
				effectDisplayName: effect.displayName,
				effectMatchName: effect.matchName,
				parameterDisplayName: parameter.displayName,
				parameterIndex: parameter.index,
				source: "phase9-targeted-live-validation",
				candidateId: result.candidateId
			});
		}

		for (i = 0; i < effects.length; i++) {
			sortParameters(effects[i].parameters);
			if (effects[i].defaultParameterIndex === undefined &&
					effects[i].parameters.length) {
				effects[i].defaultParameterIndex = effects[i].parameters[0].index;
				effects[i].defaultParameterDisplayName =
					effects[i].parameters[0].displayName;
			}
		}
		sortEffects(effects);

		return {
			ok: true,
			registry: {
				schemaVersion: SCHEMA_VERSION,
				registryVersion: V2_REGISTRY_VERSION,
				artifactType: ARTIFACT_TYPE,
				generatedAt: generatedAt,
				enabled: true,
				sourceEvidence: {
					previousProductionRegistry: existingRegistry.sourceEvidence || {},
					validationArtifact: validationResults && validationResults.artifactType,
					pipelineVersion: validationResults && validationResults.pipelineVersion,
					generatedAt: validationResults && validationResults.generatedAt,
					previousEffectParameterPairs: existingCount,
					newlyPromoted: added.length,
					duplicatesKeptCanonical: duplicates.length
				},
				counts: {
					effectParameterPairs: existingCount + added.length,
					motionCapabilities: capabilities.length,
					totalExecutableCapabilities:
						existingCount + added.length + capabilities.length,
					retainedExistingPairs: existingCount,
					newlyPromotedPairs: added.length
				},
				effects: effects,
				capabilities: capabilities,
				speed: [],
				transitions: [],
				excludedStatuses: [
					"FAILED",
					"MANUAL_REVIEW",
					"ENUM_REVIEW",
					"AMBIGUOUS",
					"UNSUPPORTED",
					"PENDING_LIVE"
				]
			},
			audit: {
				schemaVersion: SCHEMA_VERSION,
				artifactType: "pickfx-terminal-production-v2-audit",
				generatedAt: generatedAt,
				previousProductionCount: existingCount,
				previousMotionCapabilities: capabilities.length,
				previousTotalExecutableCapabilities:
					existingCount + capabilities.length,
				newlyPromotedCount: added.length,
				finalProductionCount: existingCount + added.length,
				finalMotionCapabilities: capabilities.length,
				finalTotalExecutableCapabilities:
					existingCount + added.length + capabilities.length,
				exactAddedCapabilities: added,
				exactRetainedCapabilities: retained,
				rejectedCapabilities: rejected,
				duplicateHandling: {
					key: "componentMatchName+parameterIndex",
					displayNameOnlyIgnored: true,
					keptCanonicalFromExistingRegistry: duplicates.length,
					duplicates: duplicates
				},
				sourceValidationEvidence: {
					artifactType: validationResults && validationResults.artifactType,
					pipelineVersion: validationResults && validationResults.pipelineVersion,
					generatedAt: validationResults && validationResults.generatedAt,
					summary: validationResults && validationResults.summary
						? copy(validationResults.summary)
						: null
				},
				gaussianBlur: added.concat(retained).filter(function (row) {
					return normalize(row.effectDisplayName) === "gaussian blur";
				}),
				productionFeatureFlag: {
					customerFlagKey: FEATURE_FLAG_KEY,
					customerFlagDefault: FEATURE_ENABLED_BY_DEFAULT,
					pipelineDoesNotEnableCustomerFlag: true
				}
			}
		};
	}

	function validateV2(registry) {
		var seenPairs = {};
		var seenCapabilities = {};
		var effect;
		var parameter;
		var capability;
		var key;
		var pairCount = 0;
		var i;
		var j;
		if (!registry ||
				registry.schemaVersion !== SCHEMA_VERSION ||
				registry.registryVersion !== V2_REGISTRY_VERSION ||
				registry.artifactType !== ARTIFACT_TYPE ||
				registry.enabled !== true) {
			return fail("INVALID_PRODUCTION_REGISTRY",
				"Production terminal v2 registry header is invalid.");
		}
		if (!registry.effects || !registry.capabilities ||
				(registry.speed && registry.speed.length) ||
				(registry.transitions && registry.transitions.length)) {
			return fail("INVALID_PRODUCTION_SCOPE",
				"Production terminal v2 registry scope is invalid.");
		}
		if (registry.capabilities.length !== EXPECTED_MOTION_CAPABILITIES) {
			return fail("MOTION_COUNT_MISMATCH",
				"Expected exactly 5 verified Motion capabilities.", {
					actual: registry.capabilities.length,
					expected: EXPECTED_MOTION_CAPABILITIES
				});
		}
		for (i = 0; i < registry.effects.length; i++) {
			effect = registry.effects[i];
			if (!effect || effect.productionReady !== true ||
					!effect.parameters || !effect.parameters.length) {
				return fail("INVALID_EFFECT_ENTRY",
					"Every v2 effect must contain at least one verified parameter.");
			}
			for (j = 0; j < effect.parameters.length; j++) {
				parameter = effect.parameters[j];
				if (!evidenceIsProductionReady(parameter)) {
					return fail("UNVERIFIED_EFFECT_ENTRY",
						"Effect evidence is not production-ready.", {
							effectDisplayName: effect.displayName,
							parameterIndex: parameter && parameter.index
						});
				}
				key = pairIdentityKey(effect.matchName, parameter.index);
				if (seenPairs[key]) {
					return fail("DUPLICATE_EFFECT_PAIR",
						"Duplicate effect/parameter identity.", {
							identityKey: key
						});
				}
				seenPairs[key] = true;
				pairCount += 1;
			}
		}
		if (!registry.counts ||
				registry.counts.effectParameterPairs !== pairCount ||
				registry.counts.motionCapabilities !== EXPECTED_MOTION_CAPABILITIES ||
				registry.counts.totalExecutableCapabilities !==
					pairCount + EXPECTED_MOTION_CAPABILITIES) {
			return fail("INVALID_PRODUCTION_COUNTS",
				"Production terminal v2 registry counts are invalid.", {
					actualPairs: pairCount,
					countedPairs: registry.counts && registry.counts.effectParameterPairs
				});
		}
		for (i = 0; i < registry.capabilities.length; i++) {
			capability = registry.capabilities[i];
			if (!capability || capability.type !== "MOTION" ||
					capability.productionReady !== true ||
					MOTION_ORDER.indexOf(capability.id) === -1 ||
					!capability.validationEvidence ||
					capability.validationEvidence.verified !== true ||
					capability.validationEvidence.cleanupVerified !== true ||
					capability.validationEvidence.fingerprintRestored !== true ||
					capability.writerPath !== "ConfirmedParameterWrites.write") {
				return fail("UNVERIFIED_MOTION_ENTRY",
					"Motion evidence is not production-ready.");
			}
			if (seenCapabilities[capability.id]) {
				return fail("DUPLICATE_MOTION_CAPABILITY",
					"Duplicate Motion capability.");
			}
			seenCapabilities[capability.id] = true;
		}
		return { ok: true, registry: registry };
	}

	function validate(registry) {
		var seenPairs = {};
		var seenCapabilities = {};
		var effect;
		var parameter;
		var capability;
		var key;
		var i;
		if (isV2Registry(registry)) {
			return validateV2(registry);
		}
		if (!registry || registry.schemaVersion !== SCHEMA_VERSION ||
				registry.artifactType !== ARTIFACT_TYPE || registry.enabled !== true) {
			return fail("INVALID_PRODUCTION_REGISTRY", "Production terminal registry header is invalid.");
		}
		if (!registry.counts ||
				registry.counts.effectParameterPairs !== EXPECTED_EFFECT_PAIRS ||
				registry.counts.motionCapabilities !== EXPECTED_MOTION_CAPABILITIES ||
				registry.counts.totalExecutableCapabilities !==
					EXPECTED_EFFECT_PAIRS + EXPECTED_MOTION_CAPABILITIES) {
			return fail("INVALID_PRODUCTION_COUNTS", "Production terminal registry counts are invalid.");
		}
		if (!registry.effects || registry.effects.length !== EXPECTED_EFFECT_PAIRS ||
				!registry.capabilities ||
				registry.capabilities.length !== EXPECTED_MOTION_CAPABILITIES ||
				(registry.speed && registry.speed.length) ||
				(registry.transitions && registry.transitions.length)) {
			return fail("INVALID_PRODUCTION_SCOPE", "Production terminal registry scope is invalid.");
		}
		for (i = 0; i < registry.effects.length; i++) {
			effect = registry.effects[i];
			if (!effect || effect.productionReady !== true ||
				!effect.parameters || effect.parameters.length !== 1) {
				return fail("INVALID_EFFECT_ENTRY", "Every effect must contain one verified parameter.");
			}
			parameter = effect.parameters[0];
			if (!evidenceIsProductionReady(parameter)) {
				return fail("UNVERIFIED_EFFECT_ENTRY", "Effect evidence is not production-ready.");
			}
			key = normalize(effect.matchName || effect.displayName) + "|" +
				String(parameter.index) + "|" + normalize(parameter.displayName);
			if (seenPairs[key]) {
				return fail("DUPLICATE_EFFECT_PAIR", "Duplicate effect/parameter pair.");
			}
			seenPairs[key] = true;
		}
		for (i = 0; i < registry.capabilities.length; i++) {
			capability = registry.capabilities[i];
			if (!capability || capability.type !== "MOTION" ||
				capability.productionReady !== true ||
				MOTION_ORDER.indexOf(capability.id) === -1 ||
				!capability.validationEvidence ||
				capability.validationEvidence.verified !== true ||
				capability.validationEvidence.cleanupVerified !== true ||
				capability.validationEvidence.fingerprintRestored !== true ||
				capability.writerPath !== "ConfirmedParameterWrites.write") {
				return fail("UNVERIFIED_MOTION_ENTRY", "Motion evidence is not production-ready.");
			}
			if (seenCapabilities[capability.id]) {
				return fail("DUPLICATE_MOTION_CAPABILITY", "Duplicate Motion capability.");
			}
			seenCapabilities[capability.id] = true;
		}
		return { ok: true, registry: registry };
	}

	function promotionManifest(registry) {
		var pairs = [];
		var effect;
		var parameter;
		var i;
		var j;
		for (i = 0; i < registry.effects.length; i++) {
			effect = registry.effects[i];
			for (j = 0; j < (effect.parameters ? effect.parameters.length : 0); j++) {
				parameter = effect.parameters[j];
				pairs.push({
					effectDisplayName: effect.displayName,
					effectMatchName: effect.matchName,
					parameterIndex: parameter.index,
					parameterDisplayName: parameter.displayName,
					requestedValue: parameter.validationEvidence.requestedValue,
					readBack: parameter.validationEvidence.readBack,
					verified: true,
					promotionStatus: "promoted"
				});
			}
		}
		return { pairs: pairs };
	}

	function findCapability(registry, capabilityId) {
		var i;
		for (i = 0; i < registry.capabilities.length; i++) {
			if (registry.capabilities[i].id === capabilityId) {
				return registry.capabilities[i];
			}
		}
		return null;
	}

	function motionResolution(input, registry) {
		var parsed;
		var capability;
		if (typeof TerminalCapabilityRegistry === "undefined" ||
				!TerminalCapabilityRegistry.resolve) {
			return null;
		}
		parsed = TerminalCapabilityRegistry.resolve(input);
		if (!parsed || parsed.type !== "MOTION") {
			return null;
		}
		capability = findCapability(registry, parsed.capabilityId);
		if (!capability) {
			return fail("CAPABILITY_NOT_PROMOTED", "Command is not in the production registry.", {
				type: "MOTION",
				query: input
			});
		}
		if (!parsed.ok) {
			return parsed;
		}
		parsed.productionVerified = true;
		parsed.productionEntry = capability;
		parsed.execution = parsed.execution || {};
		parsed.execution.writerPath = "ConfirmedParameterWrites.write";
		parsed.execution.requiresReadBack = true;
		return parsed;
	}

	function explicitParameterQuery(input, effectEntry) {
		var parsed;
		var query;
		var effectName;
		if (typeof TerminalCommandResolver === "undefined" ||
				!TerminalCommandResolver.parse ||
				!effectEntry) {
			return "";
		}
		parsed = TerminalCommandResolver.parse(input);
		query = normalize(parsed && parsed.query);
		effectName = normalize(effectEntry.displayName);
		if (query.indexOf(effectName + " ") === 0) {
			return trim(query.substring(effectName.length));
		}
		return "";
	}

	function isLumetriEffect(effect) {
		if (!effect) {
			return false;
		}
		if (effect.matchName === "AE.ADBE Lumetri") {
			return true;
		}
		return normalize(effect.displayName) === "lumetri color" ||
			normalize(effect.premiereName) === "lumetri color";
	}

	function attachExecution(resolved, extra) {
		var key;
		if (!resolved) {
			return resolved;
		}
		resolved.execution = resolved.execution || {};
		if (extra) {
			for (key in extra) {
				if (extra.hasOwnProperty(key)) {
					resolved.execution[key] = extra[key];
				}
			}
		}
		return resolved;
	}

	function findEffectParameter(effectEntry, index, displayName) {
		var j;
		var parameter;
		if (!effectEntry || !effectEntry.parameters) {
			return null;
		}
		for (j = 0; j < effectEntry.parameters.length; j++) {
			parameter = effectEntry.parameters[j];
			if (typeof index === "number" && parameter.index !== index) {
				continue;
			}
			if (displayName &&
					normalize(parameter.displayName) !== normalize(displayName)) {
				continue;
			}
			return parameter;
		}
		return null;
	}

	function effectResolution(input, registry) {
		var resolved;
		var effectEntry;
		var parameter;
		var namedQuery;
		var parsed;
		var i;
		if (typeof TerminalCommandResolver === "undefined" ||
				!TerminalCommandResolver.resolve) {
			return fail("RESOLVER_UNAVAILABLE", "Production effect resolver is unavailable.");
		}
		resolved = TerminalCommandResolver.resolveWithParameter(input, {
			effects: registry.effects,
			transitions: []
		}, {
			promotionManifest: promotionManifest(registry)
		});
		if (resolved && resolved.resolvedEffect) {
			for (i = 0; i < registry.effects.length; i++) {
				if ((resolved.resolvedEffect.matchName &&
						registry.effects[i].matchName ===
							resolved.resolvedEffect.matchName) ||
						normalize(registry.effects[i].displayName) ===
							normalize(resolved.resolvedEffect.displayName)) {
					effectEntry = registry.effects[i];
					break;
				}
			}
		}
		namedQuery = explicitParameterQuery(input, effectEntry);
		if ((!resolved || !resolved.ok) &&
				effectEntry &&
				!namedQuery &&
				resolved &&
				resolved.hasValue &&
				resolved.reason === "AMBIGUOUS_PARAMETER") {
			resolved = {
				ok: true,
				type: "effect",
				query: resolved.query || effectEntry.displayName,
				value: resolved.value,
				hasValue: true,
				resolvedEffect: effectEntry,
				parameter: {
					index: effectEntry.defaultParameterIndex,
					displayName: effectEntry.defaultParameterDisplayName
				},
				execution: resolved.execution || {}
			};
		}
		if ((!resolved || !resolved.ok) && effectEntry && namedQuery) {
			parameter = findEffectParameter(effectEntry, undefined, namedQuery);
			if (parameter && typeof TerminalCommandResolver.parse === "function") {
				parsed = TerminalCommandResolver.parse(input);
				if (parsed && parsed.hasValue) {
					resolved = {
						ok: true,
						type: "effect",
						query: effectEntry.displayName,
						value: parsed.value,
						hasValue: true,
						resolvedEffect: effectEntry,
						parameter: {
							index: parameter.index,
							displayName: parameter.displayName
						},
						execution: (resolved && resolved.execution) || {}
					};
				}
			}
		}
		if (!resolved || !resolved.ok) {
			return resolved || fail("EFFECT_NOT_FOUND", "No verified effect matches.");
		}
		if (!resolved.hasValue) {
			if (isLumetriEffect(effectEntry || resolved.resolvedEffect)) {
				effectEntry = effectEntry || resolved.resolvedEffect;
				parameter = findEffectParameter(
					effectEntry,
					effectEntry.defaultParameterIndex,
					effectEntry.defaultParameterDisplayName
				) || findEffectParameter(
					effectEntry,
					effectEntry.defaultParameterIndex
				);
				resolved.ok = true;
				resolved.type = "EFFECT";
				resolved.applyOnly = true;
				resolved.resolvedEffect = effectEntry;
				resolved.resolvedParameter = parameter || null;
				resolved.productionVerified = true;
				return attachExecution(resolved, {
					type: "effect",
					action: "apply",
					requiresWrite: false,
					requiresReadBack: false,
					targetLockRequired: true,
					writerPath: "ensureVerifiedTerminalEffect"
				});
			}
			return fail("VALUE_REQUIRED", "A value is required for a production terminal command.", {
				type: "EFFECT",
				query: resolved.query,
				candidates: resolved.candidates || []
			});
		}
		if (!effectEntry) {
			for (i = 0; i < registry.effects.length; i++) {
				if ((resolved.resolvedEffect && resolved.resolvedEffect.matchName &&
						registry.effects[i].matchName ===
							resolved.resolvedEffect.matchName) ||
						normalize(registry.effects[i].displayName) ===
							normalize((resolved.resolvedEffect &&
								resolved.resolvedEffect.displayName) || "")) {
					effectEntry = registry.effects[i];
					break;
				}
			}
		}
		namedQuery = explicitParameterQuery(input, effectEntry);
		if (!namedQuery && effectEntry) {
			parameter = findEffectParameter(
				effectEntry,
				effectEntry.defaultParameterIndex,
				effectEntry.defaultParameterDisplayName
			) || findEffectParameter(
				effectEntry,
				effectEntry.defaultParameterIndex
			);
		} else {
			parameter = findEffectParameter(
				effectEntry,
				resolved.parameter && resolved.parameter.index,
				resolved.parameter && resolved.parameter.displayName
			);
		}
		if (!parameter || parameter.productionReady !== true ||
				!evidenceIsProductionReady(parameter)) {
			return fail("PARAMETER_NOT_PROMOTED", "Parameter is not in the production registry.");
		}
		resolved.type = "EFFECT";
		resolved.resolvedEffect = effectEntry;
		resolved.resolvedParameter = parameter;
		resolved.parameter = {
			index: parameter.index,
			displayName: parameter.displayName,
			valueType: parameter.valueType,
			inferredSection: parameter.inferredSection || null,
			confidence: namedQuery ? (resolved.parameter && resolved.parameter.confidence) : "default",
			confidenceTier: namedQuery ? (resolved.parameter && resolved.parameter.confidenceTier) : "default",
			confidenceScore: namedQuery ? (resolved.parameter && resolved.parameter.confidenceScore) : 0.99,
			score: namedQuery ? (resolved.parameter && resolved.parameter.score) : 0,
			reasons: namedQuery ? (resolved.parameter && resolved.parameter.reasons) : [{
				code: "DEFAULT_PRODUCTION_PARAMETER",
				detail: "Bare effect commands resolve to the verified default parameter."
			}]
		};
		resolved.productionVerified = true;
		return attachExecution(resolved, {
			requiresReadBack: true,
			targetLockRequired: true
		});
	}

	function resolve(input, registry) {
		var validated = validate(registry);
		var normalizedInput = normalize(input);
		var motion;
		if (!validated.ok) {
			return validated;
		}
		if (!normalizedInput) {
			return fail("EMPTY_INPUT", "Enter a command.");
		}
		if (normalizedInput === "speed" || normalizedInput.indexOf("speed ") === 0) {
			return fail("CAPABILITY_NOT_PROMOTED", "Speed is not executable.", {
				query: input
			});
		}
		motion = motionResolution(input, registry);
		if (motion) {
			return motion;
		}
		return effectResolution(input, registry);
	}

	function commandQuery(input) {
		var parsed;
		var text = trim(input);
		if (typeof TerminalCommandResolver !== "undefined" &&
				TerminalCommandResolver.parse) {
			parsed = TerminalCommandResolver.parse(text);
			if (parsed && parsed.query) {
				return parsed.query;
			}
		}
		return text;
	}

	function search(input, registry) {
		var validated = validate(registry);
		var query = commandQuery(input);
		var entries = [];
		var matches;
		var i;
		if (!validated.ok) {
			return validated;
		}
		for (i = 0; i < registry.effects.length; i++) {
			entries.push(registry.effects[i]);
		}
		for (i = 0; i < registry.capabilities.length; i++) {
			entries.push({
				type: "MOTION",
				displayName: registry.capabilities[i].displayName,
				name: registry.capabilities[i].names[0],
				premiereName: "",
				matchName: registry.capabilities[i].id,
				capability: registry.capabilities[i]
			});
		}
		if (!query || typeof TerminalCommandResolver === "undefined" ||
				!TerminalCommandResolver.matchEntries) {
			return { ok: true, query: query, candidates: [] };
		}
		matches = TerminalCommandResolver.matchEntries(query, entries);
		if (!matches.ok) {
			return {
				ok: false,
				reason: matches.reason,
				query: query,
				candidates: matches.candidates || []
			};
		}
		return {
			ok: true,
			query: query,
			candidates: matches.candidates || [],
			entry: matches.entry,
			matchReason: matches.matchReason
		};
	}

	function displayNumber(value) {
		return String(value);
	}

	function preview(input, registry) {
		var resolution = resolve(input, registry);
		var entry;
		var parameter;
		var title;
		var detail;
		var kindLabel;
		var searched;
		if (resolution && resolution.ok && resolution.applyOnly === true) {
			return {
				ok: false,
				kind: "search",
				executable: false,
				reason: "APPLY_ONLY_BROWSE",
				resolution: resolution
			};
		}
		if (resolution && resolution.ok) {
			if (resolution.type === "MOTION") {
				entry = resolution.productionEntry;
				title = entry.displayName;
				if (entry.valueType === "point") {
					detail = entry.displayName + " = x " +
						displayNumber(resolution.x) + " y " +
						displayNumber(resolution.y);
				} else {
					detail = entry.displayName + " = " +
						displayNumber(resolution.value) +
						(entry.valueType === "percent" ? "%" : "");
				}
				kindLabel = "Parameter";
			} else {
				parameter = resolution.resolvedParameter;
				title = resolution.resolvedEffect.displayName;
				detail = parameter.displayName + " = " +
					displayNumber(resolution.value);
				kindLabel = "Effect";
			}
			return {
				ok: true,
				kind: "executable",
				executable: true,
				title: title,
				detail: detail,
				kindLabel: kindLabel,
				resolution: resolution
			};
		}
		searched = search(input, registry);
		if (resolution && (resolution.reason === "AMBIGUOUS_EFFECT" ||
				resolution.reason === "AMBIGUOUS_PARAMETER")) {
			return {
				ok: false,
				kind: "choices",
				executable: false,
				reason: resolution.reason,
				choices: resolution.candidates || searched.candidates || []
			};
		}
		return {
			ok: false,
			kind: "search",
			executable: false,
			reason: resolution && resolution.reason,
			choices: searched && searched.candidates ? searched.candidates : []
		};
	}

	function isFeatureEnabled(options) {
		var stored;
		if (options && options.explicit === false) {
			return false;
		}
		if (options && options.explicit === true) {
			return true;
		}
		try {
			if (options && options.storage &&
					typeof options.storage.getItem === "function") {
				stored = options.storage.getItem(FEATURE_FLAG_KEY);
				if (stored === "false") {
					return false;
				}
				if (stored === "true") {
					return true;
				}
			}
		} catch (ignoreStorage) {}
		return FEATURE_ENABLED_BY_DEFAULT;
	}

	return {
		SCHEMA_VERSION: SCHEMA_VERSION,
		ARTIFACT_TYPE: ARTIFACT_TYPE,
		FEATURE_FLAG_KEY: FEATURE_FLAG_KEY,
		FEATURE_ENABLED_BY_DEFAULT: FEATURE_ENABLED_BY_DEFAULT,
		EXPECTED_EFFECT_PAIRS: EXPECTED_EFFECT_PAIRS,
		EXPECTED_MOTION_CAPABILITIES: EXPECTED_MOTION_CAPABILITIES,
		V2_REGISTRY_VERSION: V2_REGISTRY_VERSION,
		MOTION_ORDER: MOTION_ORDER,
		normalize: normalize,
		pairIdentityKey: pairIdentityKey,
		isV2Registry: isV2Registry,
		evidenceIsProductionReady: evidenceIsProductionReady,
		motionEvidenceIsProductionReady: motionEvidenceIsProductionReady,
		isLumetriEffect: isLumetriEffect,
		build: build,
		buildV2: buildV2,
		validate: validate,
		validateV2: validateV2,
		promotionManifest: promotionManifest,
		resolve: resolve,
		search: search,
		preview: preview,
		isFeatureEnabled: isFeatureEnabled
	};
}());

if (typeof module !== "undefined" && module.exports) {
	module.exports = TerminalProductionRegistry;
}
