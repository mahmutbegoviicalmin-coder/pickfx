/*global $ */

var ResearchBaselineCleanup = (function () {
	var SCHEMA_VERSION = 1;
	var ARTIFACT_TYPE = "pickfx-research-baseline-cleanup";
	var CLEANUP_VERSION = "research-baseline-20260823";
	var RESEARCH_SEQUENCE = "PickFX Research";
	var RESEARCH_CLIP = "PickFX Research Clip";
	var RESEARCH_CLIP_FILE = "PickFX Research Clip.mp4";
	var READY = "READY_FOR_TARGETED_PROMOTION";
	var NOT_CLEAN = "RESEARCH_BASELINE_NOT_CLEAN";
	var EXPECTED_BASELINE = [
		{ displayName: "Opacity", matchName: "AE.ADBE Opacity" },
		{ displayName: "Motion", matchName: "AE.ADBE Motion" }
	];
	var PROTECTED_INTRINSICS = [
		{ displayName: "Opacity", matchName: "AE.ADBE Opacity" },
		{ displayName: "Motion", matchName: "AE.ADBE Motion" },
		{ displayName: "Time Remapping", matchName: "AE.ADBE Time Remapping" }
	];
	var KNOWN_RESEARCH_EFFECTS = [
		{ displayName: "Gaussian Blur", matchName: "AE.Impact_Blur_FX" },
		{ displayName: "Gaussian Blur (Legacy)", matchName: "AE.ADBE Gaussian Blur 2" },
		{ displayName: "Directional Blur", matchName: "AE.Impact_Directional_Blur_FX" },
		{ displayName: "Directional Blur (Legacy)", matchName: "AE.ADBE Motion Blur" },
		{ displayName: "Fast Blur", matchName: "AE.ADBE Fast Blur" },
		{ displayName: "Camera Blur", matchName: "AE.ADBE Camera Blur" },
		{ displayName: "Compound Blur", matchName: "AE.Impact_Compound_Blur_FX" },
		{ displayName: "Focus Blur", matchName: "AE.Impact_Focus_Blur_FX" },
		{ displayName: "Sharpen", matchName: "AE.ADBE Sharpen" },
		{ displayName: "Unsharp Mask", matchName: "AE.ADBE Unsharp Mask" },
		{ displayName: "Brightness & Contrast", matchName: "AE.ADBE Brightness & Contrast 2" },
		{ displayName: "Tint", matchName: "AE.ADBE Tint" },
		{ displayName: "Lumetri Color", matchName: "AE.ADBE Lumetri" },
		{ displayName: "Gamma Correction", matchName: "PR.ADBE Gamma Correction" },
		{ displayName: "Transform", matchName: "AE.ADBE Geometry" },
		{ displayName: "Turbulent Displace", matchName: "AE.ADBE Turbulent Displace" },
		{ displayName: "Wave Warp", matchName: "AE.ADBE Wave Warp" },
		{ displayName: "Twirl", matchName: "AE.ADBE Twirl" },
		{ displayName: "Spherize", matchName: "AE.ADBE Spherize" },
		{ displayName: "Mirror", matchName: "AE.ADBE Mirror" },
		{ displayName: "Offset", matchName: "AE.ADBE Offset" },
		{ displayName: "Noise", matchName: "AE.ADBE_Noise_FX" },
		{ displayName: "Noise (Legacy)", matchName: "AE.ADBE Noise2" },
		{ displayName: "Posterize", matchName: "AE.ADBE Posterize" },
		{ displayName: "Find Edges", matchName: "AE.ADBE Find Edges" },
		{ displayName: "Wonder Glow", matchName: "AE.Impact_Wonder_Glow_FX" },
		{ displayName: "Alpha Glow", matchName: "AE.ADBE Alpha Glow" },
		{ displayName: "Edge Glow", matchName: "AE.Impact_Edge_Glow_FX" },
		{ displayName: "Gradient", matchName: "AE.Impact_Gradient_FX" },
		{ displayName: "Replicate", matchName: "AE.ADBE Replicate" },
		{ displayName: "Block Dissolve", matchName: "AE.ADBE Block Dissolve" },
		{ displayName: "Drop Shadow", matchName: "AE.ADBE Drop Shadow" }
	];

	function trim(value) {
		return String(value === undefined || value === null ? "" : value)
			.replace(/^\s+|\s+$/g, "");
	}

	function copy(value) {
		return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
	}

	function identityOf(component) {
		return {
			componentIndex: component && typeof component.componentIndex === "number"
				? component.componentIndex
				: null,
			displayName: trim(component && component.displayName),
			matchName: trim(component && component.matchName) || null,
			parameterCount: component && typeof component.parameterCount === "number"
				? component.parameterCount
				: (component && component.parameters ? component.parameters.length : 0)
		};
	}

	function identitiesMatch(a, b) {
		var leftName;
		var rightName;
		var leftMatch;
		var rightMatch;
		if (!a || !b) {
			return false;
		}
		leftName = trim(a.displayName);
		rightName = trim(b.displayName);
		leftMatch = trim(a.matchName);
		rightMatch = trim(b.matchName);
		if (!leftMatch || !rightMatch) {
			return false;
		}
		if (leftMatch !== rightMatch) {
			return false;
		}
		if (leftName && rightName && leftName !== rightName) {
			return false;
		}
		return true;
	}

	function findIdentity(list, component) {
		var i;
		for (i = 0; i < (list ? list.length : 0); i++) {
			if (identitiesMatch(list[i], component)) {
				return list[i];
			}
		}
		return null;
	}

	function isExpectedBaseline(component) {
		return !!findIdentity(EXPECTED_BASELINE, component);
	}

	function isProtectedIntrinsic(component) {
		return !!findIdentity(PROTECTED_INTRINSICS, component);
	}

	function identitiesFromRegistry(registry) {
		var effects = registry && registry.effects ? registry.effects : [];
		var rows = [];
		var seen = {};
		var effect;
		var key;
		var i;
		for (i = 0; i < effects.length; i++) {
			effect = effects[i];
			if (!effect || !trim(effect.displayName) || !trim(effect.matchName)) {
				continue;
			}
			if (isExpectedBaseline(effect) || isProtectedIntrinsic(effect)) {
				continue;
			}
			key = trim(effect.displayName) + "::" + trim(effect.matchName);
			if (seen[key]) {
				continue;
			}
			seen[key] = true;
			rows.push({
				displayName: trim(effect.displayName),
				matchName: trim(effect.matchName)
			});
		}
		return rows;
	}

	function mergeKnownEffects() {
		var rows = [];
		var seen = {};
		var source;
		var item;
		var key;
		var a;
		var i;
		for (a = 0; a < arguments.length; a++) {
			source = arguments[a];
			for (i = 0; i < (source ? source.length : 0); i++) {
				item = source[i];
				if (!item || !trim(item.matchName)) {
					continue;
				}
				if (isExpectedBaseline(item) || isProtectedIntrinsic(item)) {
					continue;
				}
				key = trim(item.displayName) + "::" + trim(item.matchName);
				if (seen[key]) {
					continue;
				}
				seen[key] = true;
				rows.push({
					displayName: trim(item.displayName),
					matchName: trim(item.matchName)
				});
			}
		}
		return rows;
	}

	function isResearchAdded(component, knownResearchEffects) {
		if (!component || isExpectedBaseline(component) || isProtectedIntrinsic(component)) {
			return false;
		}
		if (!trim(component.matchName) || !trim(component.displayName)) {
			return false;
		}
		return !!findIdentity(knownResearchEffects, component);
	}

	function snapshotComponents(fingerprint) {
		if (!fingerprint) {
			return [];
		}
		if (fingerprint.components) {
			return fingerprint.components;
		}
		return [];
	}

	function compactFingerprint(fingerprint) {
		var components = snapshotComponents(fingerprint);
		var rows = [];
		var component;
		var i;
		for (i = 0; i < components.length; i++) {
			component = identityOf(components[i]);
			rows.push(component);
		}
		return {
			ok: !!(fingerprint && fingerprint.ok !== false),
			clipName: fingerprint && fingerprint.clipName ? fingerprint.clipName : "",
			components: rows
		};
	}

	function classifyComponent(component, knownResearchEffects) {
		var identity = identityOf(component);
		if (isExpectedBaseline(component)) {
			return {
				classification: "baseline",
				removable: false,
				reason: "INTRINSIC_BASELINE",
				component: identity
			};
		}
		if (isProtectedIntrinsic(component)) {
			return {
				classification: "protected",
				removable: false,
				reason: "PROTECTED_INTRINSIC",
				component: identity
			};
		}
		if (!identity.matchName) {
			return {
				classification: "ownership-unknown",
				removable: false,
				reason: "MATCH_NAME_MISSING",
				component: identity
			};
		}
		if (!identity.displayName) {
			return {
				classification: "ownership-unknown",
				removable: false,
				reason: "DISPLAY_NAME_MISSING",
				component: identity
			};
		}
		if (isResearchAdded(component, knownResearchEffects)) {
			return {
				classification: "research-added",
				removable: true,
				reason: "RESEARCH_ADDED_EFFECT",
				component: identity
			};
		}
		return {
			classification: "ownership-unknown",
			removable: false,
			reason: "OWNERSHIP_UNPROVEN",
			component: identity
		};
	}

	function parameterFingerprintsEqual(before, after) {
		var beforeParams = before && before.parameters ? before.parameters : [];
		var afterParams = after && after.parameters ? after.parameters : [];
		var i;
		if (beforeParams.length !== afterParams.length) {
			return false;
		}
		for (i = 0; i < beforeParams.length; i++) {
			if (!beforeParams[i] || !afterParams[i]) {
				return false;
			}
			if (beforeParams[i].index !== afterParams[i].index ||
					trim(beforeParams[i].displayName) !== trim(afterParams[i].displayName) ||
					trim(beforeParams[i].matchName) !== trim(afterParams[i].matchName) ||
					beforeParams[i].fingerprint !== afterParams[i].fingerprint) {
				return false;
			}
		}
		return true;
	}

	function findUniqueComponent(fingerprint, identity) {
		var components = snapshotComponents(fingerprint);
		var matches = [];
		var i;
		for (i = 0; i < components.length; i++) {
			if (identitiesMatch(components[i], identity)) {
				matches.push(components[i]);
			}
		}
		return {
			ok: matches.length === 1,
			matchCount: matches.length,
			component: matches.length === 1 ? matches[0] : null
		};
	}

	function inspectFingerprint(fingerprint, options) {
		var known = mergeKnownEffects(
			KNOWN_RESEARCH_EFFECTS,
			options && options.knownResearchEffects
		);
		var components = snapshotComponents(fingerprint);
		var found = [];
		var retained = [];
		var removable = [];
		var blocked = [];
		var classified;
		var baselineHits = {};
		var i;
		for (i = 0; i < EXPECTED_BASELINE.length; i++) {
			baselineHits[EXPECTED_BASELINE[i].matchName] = 0;
		}
		for (i = 0; i < components.length; i++) {
			classified = classifyComponent(components[i], known);
			found.push(classified.component);
			if (classified.classification === "baseline") {
				retained.push(classified.component);
				baselineHits[classified.component.matchName] += 1;
			} else if (classified.removable === true) {
				removable.push(classified.component);
			} else {
				blocked.push({
					component: classified.component,
					reason: classified.reason,
					classification: classified.classification
				});
			}
		}
		for (i = 0; i < EXPECTED_BASELINE.length; i++) {
			if (baselineHits[EXPECTED_BASELINE[i].matchName] !== 1) {
				blocked.push({
					component: copy(EXPECTED_BASELINE[i]),
					reason: baselineHits[EXPECTED_BASELINE[i].matchName] === 0
						? "MISSING_BASELINE_COMPONENT"
						: "DUPLICATE_BASELINE_COMPONENT",
					classification: "baseline-invalid"
				});
			}
		}
		return {
			ok: fingerprint && fingerprint.ok !== false,
			componentsFound: found,
			componentsRetained: retained,
			componentsRemovable: removable,
			blockedComponents: blocked,
			safeToClean: blocked.length === 0,
			alreadyClean: blocked.length === 0 && removable.length === 0 &&
				retained.length === EXPECTED_BASELINE.length,
			fingerprint: compactFingerprint(fingerprint)
		};
	}

	function verifyClean(beforeFingerprint, afterFingerprint) {
		var after = inspectFingerprint(afterFingerprint, { knownResearchEffects: [] });
		var unexpected = [];
		var missing = [];
		var opacityBefore = findUniqueComponent(beforeFingerprint, EXPECTED_BASELINE[0]);
		var opacityAfter = findUniqueComponent(afterFingerprint, EXPECTED_BASELINE[0]);
		var motionBefore = findUniqueComponent(beforeFingerprint, EXPECTED_BASELINE[1]);
		var motionAfter = findUniqueComponent(afterFingerprint, EXPECTED_BASELINE[1]);
		var opacityUnchanged = opacityBefore.ok && opacityAfter.ok &&
			parameterFingerprintsEqual(opacityBefore.component, opacityAfter.component);
		var motionUnchanged = motionBefore.ok && motionAfter.ok &&
			parameterFingerprintsEqual(motionBefore.component, motionAfter.component);
		var afterComponents = snapshotComponents(afterFingerprint);
		var i;
		for (i = 0; i < afterComponents.length; i++) {
			if (!isExpectedBaseline(afterComponents[i])) {
				unexpected.push(identityOf(afterComponents[i]));
			}
		}
		for (i = 0; i < EXPECTED_BASELINE.length; i++) {
			if (!findUniqueComponent(afterFingerprint, EXPECTED_BASELINE[i]).ok) {
				missing.push(copy(EXPECTED_BASELINE[i]));
			}
		}
		return {
			ok: after.alreadyClean === true &&
				unexpected.length === 0 &&
				missing.length === 0 &&
				opacityUnchanged === true &&
				motionUnchanged === true,
			alreadyClean: after.alreadyClean === true,
			opacityUnchanged: opacityUnchanged,
			motionUnchanged: motionUnchanged,
			unexpectedComponents: unexpected,
			missingComponents: missing,
			afterFingerprint: compactFingerprint(afterFingerprint)
		};
	}

	function buildReport(options) {
		var inspection = options && options.inspection ? options.inspection : {
			componentsFound: [],
			componentsRetained: [],
			componentsRemovable: [],
			blockedComponents: [],
			safeToClean: false,
			alreadyClean: false
		};
		var verification = options && options.verification ? options.verification : null;
		var removed = options && options.componentsRemoved ? options.componentsRemoved : [];
		var productionUntouched = options && options.productionUntouched === true;
		var verified = !!(
			verification &&
			verification.ok === true &&
			productionUntouched === true &&
			(options && options.cleanupVerified === true)
		);
		var status = verified ? READY : NOT_CLEAN;
		return {
			schemaVersion: SCHEMA_VERSION,
			artifactType: ARTIFACT_TYPE,
			cleanupVersion: CLEANUP_VERSION,
			generatedAt: options && options.generatedAt ? options.generatedAt : "",
			ok: status === READY,
			status: status,
			reason: options && options.reason ? options.reason : (verified ? "" : NOT_CLEAN),
			environment: {
				sequence: RESEARCH_SEQUENCE,
				clip: RESEARCH_CLIP,
				trackItemName: options && options.trackItemName
					? options.trackItemName
					: RESEARCH_CLIP_FILE
			},
			componentsFound: copy(inspection.componentsFound),
			componentsRemoved: copy(removed),
			componentsRetained: copy(inspection.componentsRetained),
			blockedComponents: copy(inspection.blockedComponents),
			baselineFingerprintBefore: options && options.beforeFingerprint
				? compactFingerprint(options.beforeFingerprint)
				: inspection.fingerprint || null,
			baselineFingerprintAfter: options && options.afterFingerprint
				? compactFingerprint(options.afterFingerprint)
				: (verification && verification.afterFingerprint) || null,
			cleanupFullyVerified: verified,
			productionUntouched: productionUntouched,
			productionRegistryMutated: false,
			opacityUnchanged: !!(verification && verification.opacityUnchanged),
			motionUnchanged: !!(verification && verification.motionUnchanged),
			unexpectedComponents: verification ? copy(verification.unexpectedComponents) : [],
			missingComponents: verification ? copy(verification.missingComponents) : [],
			removalOperations: copy(options && options.removalOperations ? options.removalOperations : [])
		};
	}

	function evaluateCleanup(beforeFingerprint, afterFingerprint, options) {
		var inspection = inspectFingerprint(beforeFingerprint, options);
		var verification;
		var removed = options && options.componentsRemoved
			? options.componentsRemoved
			: [];
		if (!inspection.ok) {
			return buildReport({
				inspection: inspection,
				beforeFingerprint: beforeFingerprint,
				afterFingerprint: afterFingerprint,
				componentsRemoved: removed,
				productionUntouched: options && options.productionUntouched === true,
				cleanupVerified: false,
				reason: "FINGERPRINT_FAILED",
				generatedAt: options && options.generatedAt,
				trackItemName: options && options.trackItemName
			});
		}
		if (!inspection.safeToClean && removed.length === 0) {
			return buildReport({
				inspection: inspection,
				beforeFingerprint: beforeFingerprint,
				afterFingerprint: beforeFingerprint,
				componentsRemoved: [],
				productionUntouched: options && options.productionUntouched === true,
				cleanupVerified: false,
				reason: inspection.blockedComponents.length
					? inspection.blockedComponents[0].reason
					: "OWNERSHIP_UNPROVEN",
				generatedAt: options && options.generatedAt,
				trackItemName: options && options.trackItemName
			});
		}
		verification = verifyClean(beforeFingerprint, afterFingerprint);
		return buildReport({
			inspection: {
				componentsFound: inspection.componentsFound,
				componentsRetained: inspection.componentsRetained,
				componentsRemovable: inspection.componentsRemovable,
				blockedComponents: inspection.blockedComponents,
				safeToClean: inspection.safeToClean,
				alreadyClean: inspection.alreadyClean,
				fingerprint: inspection.fingerprint
			},
			verification: verification,
			beforeFingerprint: beforeFingerprint,
			afterFingerprint: afterFingerprint,
			componentsRemoved: removed,
			productionUntouched: options && options.productionUntouched === true,
			cleanupVerified: verification.ok === true &&
				(options && options.productionUntouched === true),
			reason: verification.ok === true
				? ""
				: (verification.unexpectedComponents.length
					? "UNEXPECTED_COMPONENTS"
					: (verification.missingComponents.length
						? "MISSING_BASELINE_COMPONENT"
						: (!verification.opacityUnchanged || !verification.motionUnchanged
							? "BASELINE_COMPONENT_CHANGED"
							: NOT_CLEAN))),
			generatedAt: options && options.generatedAt,
			trackItemName: options && options.trackItemName,
			removalOperations: options && options.removalOperations
		});
	}

	return {
		SCHEMA_VERSION: SCHEMA_VERSION,
		ARTIFACT_TYPE: ARTIFACT_TYPE,
		CLEANUP_VERSION: CLEANUP_VERSION,
		RESEARCH_SEQUENCE: RESEARCH_SEQUENCE,
		RESEARCH_CLIP: RESEARCH_CLIP,
		RESEARCH_CLIP_FILE: RESEARCH_CLIP_FILE,
		READY: READY,
		NOT_CLEAN: NOT_CLEAN,
		EXPECTED_BASELINE: EXPECTED_BASELINE.slice(),
		PROTECTED_INTRINSICS: PROTECTED_INTRINSICS.slice(),
		KNOWN_RESEARCH_EFFECTS: KNOWN_RESEARCH_EFFECTS.slice(),
		identityOf: identityOf,
		identitiesMatch: identitiesMatch,
		isExpectedBaseline: isExpectedBaseline,
		isProtectedIntrinsic: isProtectedIntrinsic,
		isResearchAdded: isResearchAdded,
		identitiesFromRegistry: identitiesFromRegistry,
		mergeKnownEffects: mergeKnownEffects,
		compactFingerprint: compactFingerprint,
		classifyComponent: classifyComponent,
		inspectFingerprint: inspectFingerprint,
		verifyClean: verifyClean,
		buildReport: buildReport,
		evaluateCleanup: evaluateCleanup
	};
}());

if (typeof $ !== "undefined") {
	$._pickfxResearchBaselineCleanup = ResearchBaselineCleanup;
	try {
		if ($._pickfx) {
			$._pickfx.researchBaselineCleanupLogic = ResearchBaselineCleanup;
		}
	} catch (ignorePickfx) {}
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = ResearchBaselineCleanup;
}
