var TerminalRegistryAdapter = (function () {
	var ARTIFACT_SCHEMA_VERSION = 1;
	var ARTIFACT_TYPE = "pickfx-terminal-registry";
	var RESEARCH_SCHEMA_VERSION = 1;
	var RESEARCH_SOURCE = "PickFX CEP Research Registry Builder";

	function trim(value) {
		return String(value || "").replace(/^\s+|\s+$/g, "");
	}

	function copyParameter(parameter) {
		return {
			index: parameter.index,
			displayName: parameter.displayName === undefined ? "" : String(parameter.displayName),
			matchName: parameter.matchName === undefined ? null : parameter.matchName,
			matchNameAvailable: parameter.matchNameAvailable === true,
			valueType: parameter.valueType || "unknown",
			currentValue: parameter.currentValue,
			hasGetValue: parameter.hasGetValue === true,
			hasSetValue: parameter.hasSetValue === true,
			isTimeVarying: parameter.isTimeVarying === true,
			areKeyframesSupported: parameter.areKeyframesSupported,
			constructorName: parameter.constructorName || null,
			enumMetadata: parameter.enumMetadata === undefined ? "unavailable" : parameter.enumMetadata,
			inferredSection: parameter.inferredSection || null
		};
	}

	function copyEffect(effect) {
		var parameters = [];
		var i;
		for (i = 0; i < (effect.parameters ? effect.parameters.length : 0); i++) {
			parameters.push(copyParameter(effect.parameters[i] || {}));
		}
		return {
			type: "video-effect",
			displayName: trim(effect.displayName),
			premiereName: trim(effect.displayName),
			matchName: effect.matchName === undefined ? null : effect.matchName,
			matchNameAvailable: effect.matchNameAvailable === true,
			status: effect.status,
			parameterCount: parameters.length,
			parameters: parameters
		};
	}

	function validateResearch(research) {
		if (!research || typeof research !== "object") {
			return { ok: false, reason: "REGISTRY_MISSING", detail: "Research registry is missing." };
		}
		if (research.schemaVersion !== RESEARCH_SCHEMA_VERSION) {
			return { ok: false, reason: "REGISTRY_SCHEMA_UNSUPPORTED", detail: "Research schemaVersion must be 1." };
		}
		if (research.source !== RESEARCH_SOURCE) {
			return { ok: false, reason: "REGISTRY_SOURCE_UNSUPPORTED", detail: "Unexpected research registry source." };
		}
		if (!research.effects || typeof research.effects.length !== "number") {
			return { ok: false, reason: "REGISTRY_EFFECTS_MISSING", detail: "Research effects array is missing." };
		}
		return { ok: true };
	}

	function compile(research, provenance) {
		var checked = validateResearch(research);
		var effects = [];
		var parameterCount = 0;
		var skippedEffects = 0;
		var i;
		var effect;
		var copied;
		if (!checked.ok) {
			return checked;
		}
		for (i = 0; i < research.effects.length; i++) {
			effect = research.effects[i];
			if (!effect || effect.status !== "discovered" || !trim(effect.displayName)) {
				skippedEffects += 1;
				continue;
			}
			copied = copyEffect(effect);
			effects.push(copied);
			parameterCount += copied.parameters.length;
		}
		return {
			ok: true,
			registry: {
				schemaVersion: ARTIFACT_SCHEMA_VERSION,
				artifactType: ARTIFACT_TYPE,
				source: "PickFX compiled terminal registry",
				sourceRegistry: {
					schemaVersion: research.schemaVersion,
					source: research.source,
					apiModel: research.apiModel || "",
					generatedAt: research.generatedAt || "",
					sha256: provenance && provenance.sha256 ? String(provenance.sha256) : ""
				},
				effectCount: effects.length,
				parameterCount: parameterCount,
				skippedEffects: skippedEffects,
				effects: effects,
				transitions: [],
				transitionSupport: {
					available: false,
					reason: "TRANSITION_REGISTRY_UNAVAILABLE",
					detail: "The research registry contains video effects only."
				}
			}
		};
	}

	function validateCompiled(registry) {
		var effectCount = 0;
		var parameterCount = 0;
		var i;
		var effect;
		if (!registry || registry.schemaVersion !== ARTIFACT_SCHEMA_VERSION ||
				registry.artifactType !== ARTIFACT_TYPE) {
			return { ok: false, reason: "REGISTRY_SCHEMA_UNSUPPORTED" };
		}
		if (!registry.effects || typeof registry.effects.length !== "number") {
			return { ok: false, reason: "REGISTRY_EFFECTS_MISSING" };
		}
		if (!registry.transitions || typeof registry.transitions.length !== "number") {
			return { ok: false, reason: "TRANSITION_REGISTRY_INVALID" };
		}
		for (i = 0; i < registry.effects.length; i++) {
			effect = registry.effects[i];
			if (!effect || effect.type !== "video-effect" || !trim(effect.displayName) ||
				!effect.parameters || typeof effect.parameters.length !== "number") {
				return { ok: false, reason: "REGISTRY_EFFECT_INVALID", effectIndex: i };
			}
			effectCount += 1;
			parameterCount += effect.parameters.length;
		}
		if (registry.effectCount !== effectCount || registry.parameterCount !== parameterCount) {
			return {
				ok: false,
				reason: "REGISTRY_COUNT_MISMATCH",
				effectCount: effectCount,
				parameterCount: parameterCount
			};
		}
		return {
			ok: true,
			effectCount: effectCount,
			parameterCount: parameterCount,
			transitionCount: registry.transitions.length
		};
	}

	return {
		ARTIFACT_SCHEMA_VERSION: ARTIFACT_SCHEMA_VERSION,
		ARTIFACT_TYPE: ARTIFACT_TYPE,
		RESEARCH_SCHEMA_VERSION: RESEARCH_SCHEMA_VERSION,
		RESEARCH_SOURCE: RESEARCH_SOURCE,
		validateResearch: validateResearch,
		compile: compile,
		validateCompiled: validateCompiled
	};
}());

if (typeof module !== "undefined" && module.exports) {
	module.exports = TerminalRegistryAdapter;
}
