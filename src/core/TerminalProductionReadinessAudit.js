var TerminalProductionReadinessAudit = (function () {
	var SCHEMA_VERSION = 1;
	var FULL_ARTIFACT_TYPE =
		"pickfx-terminal-production-readiness-audit";
	var READY_ARTIFACT_TYPE =
		"pickfx-terminal-production-ready-allowlist";
	var AUDIT_VERSION = "phase5b-production-readiness-20260822";
	var STATUS = {
		PRODUCTION_READY: "PRODUCTION_READY",
		VALIDATED_BUT_NOT_PROMOTED: "VALIDATED_BUT_NOT_PROMOTED",
		AMBIGUOUS: "AMBIGUOUS",
		MANUAL_REVIEW: "MANUAL_REVIEW",
		UNSUPPORTED: "UNSUPPORTED",
		FAILED: "FAILED",
		NOT_VALIDATED: "NOT_VALIDATED"
	};

	function trim(value) {
		return String(value === undefined || value === null ? "" : value)
			.replace(/^\s+|\s+$/g, "");
	}

	function normalize(value) {
		return trim(value).toLowerCase().replace(/\s+/g, " ");
	}

	function copy(value) {
		return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
	}

	function parameterKey(effectName, parameterIndex, parameterName) {
		return normalize(effectName) + "::" +
			String(parameterIndex) + "::" +
			normalize(parameterName);
	}

	function effectKey(effectName) {
		return normalize(effectName);
	}

	function indexAudit(audit) {
		var index = {};
		var rows = audit && audit.parameters ? audit.parameters : [];
		var row;
		var i;
		for (i = 0; i < rows.length; i++) {
			row = rows[i];
			index[parameterKey(
				row.effectDisplayName,
				row.parameterIndex,
				row.parameterDisplayName
			)] = row;
		}
		return index;
	}

	function indexValidation(validation) {
		var index = {};
		var results = validation && validation.results
			? validation.results
			: [];
		var result;
		var i;
		for (i = 0; i < results.length; i++) {
			result = results[i];
			index[parameterKey(
				result.effectDisplayName,
				result.parameterIndex,
				result.parameterDisplayName
			)] = result;
		}
		return index;
	}

	function indexPromotions(promotion) {
		var index = {};
		var pairs = promotion && promotion.pairs ? promotion.pairs : [];
		var pair;
		var i;
		for (i = 0; i < pairs.length; i++) {
			pair = pairs[i];
			if (pair &&
					pair.promotionStatus === "promoted" &&
					pair.verified === true) {
				index[parameterKey(
					pair.effectDisplayName,
					pair.parameterIndex,
					pair.parameterDisplayName
				)] = pair;
			}
		}
		return index;
	}

	function indexPromotionEffects(promotion) {
		var index = {};
		var effects = promotion && promotion.effects
			? promotion.effects
			: [];
		var effect;
		var i;
		for (i = 0; i < effects.length; i++) {
			effect = effects[i];
			if (effect && effect.promotionStatus === "promoted") {
				index[effectKey(effect.displayName)] = effect;
			}
		}
		return index;
	}

	function prevalidatedKey(validation) {
		var row = validation && validation.prevalidated;
		return row
			? parameterKey(
				row.effectDisplayName,
				row.parameterIndex,
				row.parameterDisplayName
			)
			: "";
	}

	function compactCleanup(result) {
		var cleanup = result && result.cleanup;
		return cleanup ? {
			ok: cleanup.ok === true,
			fingerprintRestored: cleanup.fingerprintRestored === true,
			productionUntouched: cleanup.productionUntouched === true,
			parameterValueMismatches:
				cleanup.cleanupResult &&
				cleanup.cleanupResult.parameterValueMismatches,
			unexpectedComponents:
				cleanup.cleanupResult &&
				cleanup.cleanupResult.unexpectedComponents,
			missingComponents:
				cleanup.cleanupResult &&
				cleanup.cleanupResult.missingComponents
		} : null;
	}

	function promotionEvidence(pair, result, validation, key) {
		var prevalidated = key === prevalidatedKey(validation)
			? validation.prevalidated
			: null;
		return {
			source: result
				? "phase4b-live-validation"
				: "promotion-manifest-prevalidated-reference",
			promotionStatus: pair.promotionStatus,
			verified: pair.verified === true,
			requestedValue: pair.requestedValue,
			readBack: pair.readBack,
			validationTestId: result
				? result.testId
				: (prevalidated && prevalidated.testId),
			reference: prevalidated && prevalidated.reference,
			applyVerified: result
				? !!result.componentIdentity
				: !!prevalidated,
			writeVerified: result
				? result.verified === true
				: !!(prevalidated && prevalidated.verified === true),
			readBackVerified: pair.readBack === pair.requestedValue,
			cleanup: result
				? compactCleanup(result)
				: {
					ok: !!(prevalidated && prevalidated.passed === true),
					fingerprintRestored: true,
					productionUntouched: true,
					source: "promoted prevalidated transaction reference"
				},
			baselineRestored: result
				? !!(
					result.cleanup &&
					result.cleanup.fingerprintRestored === true
				)
				: !!(prevalidated && prevalidated.passed === true),
			productionUntouched: result
				? !!(
					result.cleanup &&
					result.cleanup.productionUntouched === true
				)
				: !!(prevalidated && prevalidated.passed === true)
		};
	}

	function validatedNotPromotedEvidence(result, auditRow) {
		return {
			source: "phase4b-live-validation",
			validationTestId: result.testId,
			status: result.status,
			verified: result.verified === true,
			requestedValue: result.requestedValue,
			readBack: result.readBack,
			applyVerified: !!result.componentIdentity,
			writeVerified: result.verified === true,
			readBackVerified: result.verified === true,
			cleanup: compactCleanup(result),
			baselineRestored: !!(
				result.cleanup &&
				result.cleanup.fingerprintRestored === true
			),
			productionUntouched: !!(
				result.cleanup &&
				result.cleanup.productionUntouched === true
			),
			promotionBlockedBy:
				(auditRow && auditRow.terminalReason) ||
				result.auditTerminalReason ||
				result.reason
		};
	}

	function failedEvidence(result) {
		return {
			source: "phase4b-live-validation",
			validationTestId: result.testId,
			status: result.status,
			verified: false,
			requestedValue: result.requestedValue,
			readBackRecorded: result.readBack !== undefined,
			readBack: result.readBack,
			failureReason: result.reason,
			cleanup: compactCleanup(result),
			baselineRestored: !!(
				result.cleanup &&
				result.cleanup.fingerprintRestored === true
			),
			productionUntouched: !!(
				result.cleanup &&
				result.cleanup.productionUntouched === true
			)
		};
	}

	function statusFromAudit(auditRow) {
		if (!auditRow) {
			return STATUS.NOT_VALIDATED;
		}
		if (auditRow.terminalSafety === "ambiguous") {
			return STATUS.AMBIGUOUS;
		}
		if (auditRow.terminalSafety === "manual_review") {
			return STATUS.MANUAL_REVIEW;
		}
		if (auditRow.terminalSafety === "unsupported") {
			return STATUS.UNSUPPORTED;
		}
		return STATUS.NOT_VALIDATED;
	}

	function reasonForStatus(status, auditRow, validationResult) {
		if (status === STATUS.PRODUCTION_READY) {
			return "Promoted after successful Premiere apply, write, read-back, cleanup, and baseline restoration.";
		}
		if (status === STATUS.VALIDATED_BUT_NOT_PROMOTED) {
			return "Live write/read-back and cleanup passed, but promotion was withheld: " +
				String(
					(auditRow && auditRow.terminalReason) ||
					(validationResult &&
						validationResult.auditTerminalReason) ||
					"PROMOTION_CRITERIA_NOT_MET"
				) + ".";
		}
		if (status === STATUS.FAILED) {
			return "Live validation failed: " +
				String(
					(validationResult && validationResult.reason) ||
					"VALIDATION_FAILED"
				) + ".";
		}
		if (status === STATUS.AMBIGUOUS) {
			return "No deterministic parameter target: " +
				String(
					(auditRow && auditRow.terminalReason) ||
					"AMBIGUOUS_PARAMETER"
				) + ".";
		}
		if (status === STATUS.MANUAL_REVIEW) {
			return "Requires manual or typed metadata review: " +
				String(
					(auditRow && auditRow.terminalReason) ||
					"MANUAL_REVIEW"
				) + ".";
		}
		if (status === STATUS.UNSUPPORTED) {
			return "Current writer or parameter contract does not support this parameter: " +
				String(
					(auditRow && auditRow.terminalReason) ||
					"UNSUPPORTED"
				) + ".";
		}
		return "No successful live validation and no terminal safety classification.";
	}

	function commandText(value) {
		return typeof value === "number"
			? String(value)
			: trim(value);
	}

	function commandsFor(effect, parameter, pair, auditRow) {
		var effectName = trim(effect.displayName).toLowerCase();
		var parameterName = trim(parameter.displayName).toLowerCase();
		var value = commandText(pair.requestedValue);
		var commands = {
			explicitParameterCommand:
				effectName + " " + parameterName + " " + value
		};
		if (auditRow && auditRow.terminalSelected === true) {
			commands.defaultParameterCommand =
				effectName + " " + value;
		}
		return commands;
	}

	function parameterRecord(effect, parameter, context) {
		var key = parameterKey(
			effect.displayName,
			parameter.index,
			parameter.displayName
		);
		var pair = context.promotions[key];
		var validationResult = context.validation[key];
		var auditRow = context.audit[key];
		var status;
		var evidence = null;
		var commands = null;
		if (pair) {
			status = STATUS.PRODUCTION_READY;
			evidence = promotionEvidence(
				pair,
				validationResult,
				context.validationRun,
				key
			);
			commands = commandsFor(
				effect,
				parameter,
				pair,
				auditRow
			);
		} else if (validationResult &&
				validationResult.status === "manual_review" &&
				validationResult.verified === true) {
			status = STATUS.VALIDATED_BUT_NOT_PROMOTED;
			evidence = validatedNotPromotedEvidence(
				validationResult,
				auditRow
			);
		} else if (validationResult &&
				validationResult.status === "failed") {
			status = STATUS.FAILED;
			evidence = failedEvidence(validationResult);
		} else {
			status = statusFromAudit(auditRow);
		}
		return {
			id: effect.displayName + "::" +
				String(parameter.index) + "::" +
				trim(parameter.displayName),
			index: parameter.index,
			displayName: trim(parameter.displayName),
			matchName: parameter.matchName || null,
			valueType: parameter.valueType || "unknown",
			currentStatus: status,
			statusReason: reasonForStatus(
				status,
				auditRow,
				validationResult
			),
			productionReady: status === STATUS.PRODUCTION_READY,
			validationEvidence: evidence,
			commands: commands,
			auditEvidence: auditRow ? {
				terminalSafety: auditRow.terminalSafety,
				terminalReason: auditRow.terminalReason,
				terminalSelected:
					auditRow.terminalSelected === true,
				prevalidated: auditRow.prevalidated === true,
				apiWritableCandidate:
					auditRow.apiWritableCandidate === true,
				writableByLegacyMapping:
					auditRow.writable === true
			} : null
		};
	}

	function emptyStatusCounts() {
		var counts = {};
		var key;
		for (key in STATUS) {
			if (STATUS.hasOwnProperty(key)) {
				counts[STATUS[key]] = 0;
			}
		}
		return counts;
	}

	function parameterReference(row) {
		return {
			index: row.index,
			displayName: row.displayName,
			valueType: row.valueType,
			status: row.currentStatus,
			reason: row.statusReason
		};
	}

	function effectReason(effectRecord) {
		var counts = effectRecord.parameterStatusCounts;
		if (effectRecord.productionReadyParameters.length) {
			return "Production-ready because " +
				String(effectRecord.productionReadyParameters.length) +
				" parameter pair(s) are present in the verified promotion manifest.";
		}
		if (effectRecord.applyOnlyReady) {
			return "Production-ready for apply-only use from explicit apply-only validation evidence.";
		}
		if (counts[STATUS.VALIDATED_BUT_NOT_PROMOTED]) {
			return "Not production-ready: live validation succeeded for " +
				String(counts[STATUS.VALIDATED_BUT_NOT_PROMOTED]) +
				" parameter(s), but promotion was explicitly withheld.";
		}
		if (counts[STATUS.FAILED]) {
			return "Not production-ready: " +
				String(counts[STATUS.FAILED]) +
				" live parameter validation(s) failed and no parameter is promoted.";
		}
		return "Not production-ready: no promoted parameter and no explicit apply-only validation; " +
			String(counts[STATUS.AMBIGUOUS]) + " ambiguous, " +
			String(counts[STATUS.MANUAL_REVIEW]) + " manual review, " +
			String(counts[STATUS.UNSUPPORTED]) + " unsupported, " +
			String(counts[STATUS.NOT_VALIDATED]) + " not validated.";
	}

	function effectRecord(effect, context) {
		var parameters = effect.parameters || [];
		var rows = [];
		var statusCounts = emptyStatusCounts();
		var byStatus = {};
		var promotionEffect =
			context.promotionEffects[effectKey(effect.displayName)];
		var applyOnlyReady = !!(
			promotionEffect &&
			promotionEffect.applyOnlyValidated === true &&
			(!promotionEffect.parameters ||
				!promotionEffect.parameters.length)
		);
		var row;
		var status;
		var i;
		for (status in STATUS) {
			if (STATUS.hasOwnProperty(status)) {
				byStatus[STATUS[status]] = [];
			}
		}
		for (i = 0; i < parameters.length; i++) {
			row = parameterRecord(effect, parameters[i], context);
			rows.push(row);
			statusCounts[row.currentStatus] += 1;
			byStatus[row.currentStatus].push(parameterReference(row));
		}
		var result = {
			type: effect.type || "video-effect",
			displayName: effect.displayName,
			premiereName:
				effect.premiereName || effect.displayName,
			matchName: effect.matchName || null,
			parameterCount: parameters.length,
			productionReady: !!(
				byStatus[STATUS.PRODUCTION_READY].length ||
				applyOnlyReady
			),
			applyOnlyReady: applyOnlyReady,
			parameterWritesReady:
				byStatus[STATUS.PRODUCTION_READY].length > 0,
			parameterStatusCounts: statusCounts,
			productionReadyParameters:
				byStatus[STATUS.PRODUCTION_READY],
			validatedButNotPromotedParameters:
				byStatus[STATUS.VALIDATED_BUT_NOT_PROMOTED],
			ambiguousParameters:
				byStatus[STATUS.AMBIGUOUS],
			manualReviewParameters:
				byStatus[STATUS.MANUAL_REVIEW],
			unsupportedParameters:
				byStatus[STATUS.UNSUPPORTED],
			failedParameters:
				byStatus[STATUS.FAILED],
			notValidatedParameters:
				byStatus[STATUS.NOT_VALIDATED],
			parameters: rows
		};
		result.reason = effectReason(result);
		result.validationEvidence = rows.filter(function (parameter) {
			return parameter.validationEvidence !== null;
		}).map(function (parameter) {
			return {
				parameterIndex: parameter.index,
				parameterDisplayName: parameter.displayName,
				status: parameter.currentStatus,
				evidence: parameter.validationEvidence
			};
		});
		return result;
	}

	function addCounts(target, source) {
		var status;
		for (status in source) {
			if (source.hasOwnProperty(status)) {
				target[status] += source[status];
			}
		}
	}

	function readyEffectShape(effect) {
		return {
			type: effect.type,
			displayName: effect.displayName,
			premiereName: effect.premiereName,
			matchName: effect.matchName,
			parameterCount: effect.parameterCount,
			productionReady: true,
			applyOnlyReady: effect.applyOnlyReady,
			parameterWritesReady: effect.parameterWritesReady,
			reason: effect.reason,
			validationEvidence: copy(effect.validationEvidence),
			productionReadyParameters: effect.parameters
				.filter(function (parameter) {
					return parameter.currentStatus ===
						STATUS.PRODUCTION_READY;
				})
				.map(function (parameter) {
					return {
						index: parameter.index,
						displayName: parameter.displayName,
						matchName: parameter.matchName,
						valueType: parameter.valueType,
						status: parameter.currentStatus,
						statusReason: parameter.statusReason,
						validationEvidence:
							copy(parameter.validationEvidence),
						commands: copy(parameter.commands)
					};
				})
		};
	}

	function build(registry, audit, validation, promotion, options) {
		var effects = registry && registry.effects
			? registry.effects
			: [];
		var context = {
			audit: indexAudit(audit),
			validation: indexValidation(validation),
			promotions: indexPromotions(promotion),
			promotionEffects:
				indexPromotionEffects(promotion),
			validationRun: validation
		};
		var allEffects = [];
		var readyEffects = [];
		var notReadyEffects = [];
		var applyOnlyEffects = [];
		var parameterCounts = emptyStatusCounts();
		var record;
		var i;
		for (i = 0; i < effects.length; i++) {
			record = effectRecord(effects[i], context);
			allEffects.push(record);
			addCounts(parameterCounts, record.parameterStatusCounts);
			if (record.productionReady) {
				readyEffects.push(record);
				if (record.applyOnlyReady &&
						!record.parameterWritesReady) {
					applyOnlyEffects.push(record);
				}
			} else {
				notReadyEffects.push(record);
			}
		}
		allEffects.sort(function (a, b) {
			return normalize(a.displayName) <
				normalize(b.displayName) ? -1 : 1;
		});
		readyEffects.sort(function (a, b) {
			return normalize(a.displayName) <
				normalize(b.displayName) ? -1 : 1;
		});
		notReadyEffects.sort(function (a, b) {
			return normalize(a.displayName) <
				normalize(b.displayName) ? -1 : 1;
		});
		var summary = {
			totalEffects: allEffects.length,
			effectsProductionReady: readyEffects.length,
			effectsApplyOnlyReady: applyOnlyEffects.length,
			effectsWithParameterWritesReady:
				readyEffects.filter(function (effect) {
					return effect.parameterWritesReady;
				}).length,
			effectsNotProductionReady: notReadyEffects.length,
			totalParameters:
				Object.keys(parameterCounts).reduce(
					function (sum, key) {
						return sum + parameterCounts[key];
					},
					0
				),
			productionReadyParameters:
				parameterCounts[STATUS.PRODUCTION_READY],
			validatedButNotPromoted:
				parameterCounts[
					STATUS.VALIDATED_BUT_NOT_PROMOTED
				],
			ambiguous:
				parameterCounts[STATUS.AMBIGUOUS],
			manualReview:
				parameterCounts[STATUS.MANUAL_REVIEW],
			unsupported:
				parameterCounts[STATUS.UNSUPPORTED],
			failed:
				parameterCounts[STATUS.FAILED],
			notValidated:
				parameterCounts[STATUS.NOT_VALIDATED]
		};
		var full = {
			schemaVersion: SCHEMA_VERSION,
			artifactType: FULL_ARTIFACT_TYPE,
			auditVersion: AUDIT_VERSION,
			generatedAt:
				(options && options.generatedAt) || "",
			sourceRegistry:
				copy(registry && registry.sourceRegistry),
			sourcePromotion: {
				artifactType:
					promotion && promotion.artifactType,
				harnessVersion:
					promotion && promotion.harnessVersion,
				effectCount:
					promotion && promotion.effectCount,
				pairCount:
					promotion && promotion.pairCount
			},
			productionFeatureFlagEnabled: false,
			registryResolverCurrentlyEnabled: false,
			readinessDefinition: [
				"effect applied in controlled Premiere research environment",
				"parameter write completed through existing safe writer",
				"read-back matched requested value",
				"test-added component cleanup succeeded",
				"baseline fingerprint restored",
				"pair is present in current promotion manifest"
			],
			statusDefinitions: {
				PRODUCTION_READY:
					"Current promotion-manifest allowlist member with verified Premiere transaction.",
				VALIDATED_BUT_NOT_PROMOTED:
					"Live apply/write/read-back/cleanup succeeded, but promotion criteria withheld the pair.",
				AMBIGUOUS:
					"Static audit cannot choose a deterministic parameter target.",
				MANUAL_REVIEW:
					"Typed, identity, enum, baseline, or internal metadata review is required.",
				UNSUPPORTED:
					"Current writer/parameter contract does not support the parameter.",
				FAILED:
					"Controlled live write verification failed.",
				NOT_VALIDATED:
					"No live result and no stronger static disposition."
			},
			summary: summary,
			effects: allEffects
		};
		var ready = {
			schemaVersion: SCHEMA_VERSION,
			artifactType: READY_ARTIFACT_TYPE,
			auditVersion: AUDIT_VERSION,
			generatedAt: full.generatedAt,
			sourceRegistry: copy(full.sourceRegistry),
			sourcePromotion: copy(full.sourcePromotion),
			productionFeatureFlagEnabled: false,
			registryResolverCurrentlyEnabled: false,
			note:
				"This is an evidence-ready allowlist. The registry-derived production resolver remains disabled.",
			summary: copy(summary),
			effects: readyEffects.map(readyEffectShape),
			applyOnlyEffects:
				applyOnlyEffects.map(readyEffectShape)
		};
		return {
			fullAudit: full,
			productionReady: ready,
			notReadyEffects: notReadyEffects
		};
	}

	function validate(artifacts) {
		var full = artifacts && artifacts.fullAudit;
		var ready = artifacts && artifacts.productionReady;
		var sum;
		if (!full ||
				full.artifactType !== FULL_ARTIFACT_TYPE ||
				!ready ||
				ready.artifactType !== READY_ARTIFACT_TYPE) {
			return { ok: false, reason: "READINESS_AUDIT_INVALID" };
		}
		sum = full.summary.productionReadyParameters +
			full.summary.validatedButNotPromoted +
			full.summary.ambiguous +
			full.summary.manualReview +
			full.summary.unsupported +
			full.summary.failed +
			full.summary.notValidated;
		if (sum !== full.summary.totalParameters ||
				full.effects.length !== full.summary.totalEffects ||
				ready.effects.length !==
					full.summary.effectsProductionReady) {
			return {
				ok: false,
				reason: "READINESS_AUDIT_COUNT_MISMATCH",
				classifiedParameters: sum,
				totalParameters:
					full.summary.totalParameters
			};
		}
		if (full.productionFeatureFlagEnabled !== false ||
				ready.productionFeatureFlagEnabled !== false) {
			return {
				ok: false,
				reason: "PRODUCTION_FEATURE_FLAG_MUST_REMAIN_OFF"
			};
		}
		return {
			ok: true,
			effectCount: full.summary.totalEffects,
			readyEffectCount:
				full.summary.effectsProductionReady,
			parameterCount:
				full.summary.totalParameters,
			readyParameterCount:
				full.summary.productionReadyParameters
		};
	}

	return {
		SCHEMA_VERSION: SCHEMA_VERSION,
		FULL_ARTIFACT_TYPE: FULL_ARTIFACT_TYPE,
		READY_ARTIFACT_TYPE: READY_ARTIFACT_TYPE,
		AUDIT_VERSION: AUDIT_VERSION,
		STATUS: copy(STATUS),
		parameterKey: parameterKey,
		build: build,
		validate: validate
	};
}());

if (typeof module !== "undefined" && module.exports) {
	module.exports = TerminalProductionReadinessAudit;
}
