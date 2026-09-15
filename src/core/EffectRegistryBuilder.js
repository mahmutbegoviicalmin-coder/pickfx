/*global $ */

var EffectRegistryBuilder = (function () {
	var SCHEMA_VERSION = 1;
	var SOURCE = "PickFX CEP Research Registry Builder";
	var API_MODEL = "CEP_ExtendScript";
	var RESEARCH_SEQUENCE_NAME = "PickFX Research";
	var RESEARCH_CLIP_NAME = "PickFX Research Clip";
	var RESEARCH_ENVIRONMENT_UNAVAILABLE = "RESEARCH_ENVIRONMENT_UNAVAILABLE";
	var CLEANUP_FAILED = "CLEANUP_FAILED";
	var WARNING = "PickFX Research Registry Builder will operate only on the isolated research environment.";
	var RECOGNIZED_VIDEO_EXTENSIONS = {
		"3g2": true,
		"3gp": true,
		ari: true,
		avi: true,
		braw: true,
		crm: true,
		dv: true,
		f4v: true,
		flv: true,
		hevc: true,
		insv: true,
		m2t: true,
		m2ts: true,
		m2v: true,
		m4v: true,
		mkv: true,
		mov: true,
		mp4: true,
		mpe: true,
		mpeg: true,
		mpg: true,
		mpv: true,
		mts: true,
		mxf: true,
		ogv: true,
		r3d: true,
		ts: true,
		vob: true,
		webm: true,
		wmv: true
	};
	var STATUSES = {
		pending: true,
		discovered: true,
		apply_failed: true,
		component_not_found: true,
		parameter_read_failed: true,
		unsupported: true,
		cleanup_failed: true,
		skipped: true,
		timeout: true
	};
	var TERMINAL_KEEP = {
		discovered: true,
		apply_failed: true,
		component_not_found: true,
		parameter_read_failed: true,
		unsupported: true,
		skipped: true
	};

	function trimmed(value) {
		return String(value || "").replace(/^\s+|\s+$/g, "");
	}

	function normalizeResearchClipName(value) {
		var name = String(value === undefined || value === null ? "" : value);
		var dot = name.lastIndexOf(".");
		var extension;
		if (dot <= 0 || dot === name.length - 1) {
			return name;
		}
		extension = name.substring(dot + 1).toLowerCase();
		if (RECOGNIZED_VIDEO_EXTENSIONS.hasOwnProperty(extension)) {
			return name.substring(0, dot);
		}
		return name;
	}

	function matchesResearchClipName(value) {
		return normalizeResearchClipName(value) === RESEARCH_CLIP_NAME;
	}

	function resolveResearchVideoClip(clips) {
		var matches = [];
		var i;
		var clip;
		for (i = 0; i < (clips ? clips.length : 0); i++) {
			clip = clips[i];
			if (clip &&
					String(clip.mediaType || "") === "Video" &&
					matchesResearchClipName(clip.name)) {
				matches.push(clip);
			}
		}
		return {
			ok: matches.length === 1,
			clip: matches.length === 1 ? matches[0] : null,
			matchCount: matches.length,
			matches: matches
		};
	}

	function nowIso(hooks) {
		if (hooks && typeof hooks.now === "function") {
			return hooks.now();
		}
		try {
			return String(new Date().getTime());
		} catch (ignore) {
			return "";
		}
	}

	function extractName(item) {
		if (item === undefined || item === null) {
			return "";
		}
		if (typeof item === "string") {
			return trimmed(item);
		}
		try {
			if (item.displayName) {
				return trimmed(item.displayName);
			}
		} catch (ignoreDisplay) {}
		try {
			if (item.name) {
				return trimmed(item.name);
			}
		} catch (ignoreName) {}
		return "";
	}

	function isArrayLike(value) {
		try {
			return !!(value && typeof value.length === "number" && value.length >= 0);
		} catch (e) {
			return false;
		}
	}

	function normalizeCandidates(raw) {
		var out = [];
		var seen = {};
		var duplicates = [];
		var skipped = 0;
		var i;
		var name;
		var item;
		if (raw === undefined || raw === null) {
			return {
				ok: false,
				malformed: true,
				candidates: [],
				duplicateNames: [],
				skipped: 0,
				errorType: "MALFORMED_QE_RESULT",
				message: "QE effect list was null or undefined."
			};
		}
		if (typeof raw === "string") {
			return {
				ok: false,
				malformed: true,
				candidates: [],
				duplicateNames: [],
				skipped: 0,
				errorType: "MALFORMED_QE_RESULT",
				message: "QE effect list was a string, not a list."
			};
		}
		if (!isArrayLike(raw)) {
			return {
				ok: false,
				malformed: true,
				candidates: [],
				duplicateNames: [],
				skipped: 0,
				errorType: "MALFORMED_QE_RESULT",
				message: "QE effect list was not array-like."
			};
		}
		for (i = 0; i < raw.length; i++) {
			item = raw[i];
			name = extractName(item);
			if (!name) {
				skipped += 1;
				continue;
			}
			if (seen.hasOwnProperty(name)) {
				seen[name] += 1;
				if (seen[name] === 2) {
					duplicates.push(name);
				}
				continue;
			}
			seen[name] = 1;
			out.push({
				displayName: name,
				status: "pending"
			});
		}
		return {
			ok: true,
			malformed: false,
			empty: out.length === 0,
			candidates: out,
			duplicateNames: duplicates,
			skipped: skipped,
			totalRaw: raw.length,
			totalUnique: out.length
		};
	}

	function validateEnvironment(check) {
		var sequenceName = trimmed(check && check.researchSequenceName);
		var clipName = trimmed(check && check.researchClipName);
		var researchId = check && check.researchSequenceId ? String(check.researchSequenceId) : "";
		var productionId = check && check.productionSequenceId ? String(check.productionSequenceId) : "";
		var productionName = trimmed(check && check.productionSequenceName);
		if (!check || check.available === false) {
			return {
				ok: false,
				reason: RESEARCH_ENVIRONMENT_UNAVAILABLE,
				message: (check && check.message) || "Isolated research environment is not available.",
				isolated: false
			};
		}
		if (sequenceName !== RESEARCH_SEQUENCE_NAME) {
			return {
				ok: false,
				reason: RESEARCH_ENVIRONMENT_UNAVAILABLE,
				message: 'Research sequence must be named exactly "' + RESEARCH_SEQUENCE_NAME + '".',
				isolated: false
			};
		}
		if (!researchId) {
			return {
				ok: false,
				reason: RESEARCH_ENVIRONMENT_UNAVAILABLE,
				message: "Research sequence id is missing.",
				isolated: false
			};
		}
		if (check.researchClipExists !== true) {
			return {
				ok: false,
				reason: RESEARCH_ENVIRONMENT_UNAVAILABLE,
				message: "Research sequence has no isolated video clip.",
				isolated: false
			};
		}
		if (check.clipCount > 1 && clipName !== RESEARCH_CLIP_NAME) {
			return {
				ok: false,
				reason: RESEARCH_ENVIRONMENT_UNAVAILABLE,
				message: 'Multiple clips found. Name the research clip exactly "' + RESEARCH_CLIP_NAME + '".',
				isolated: false
			};
		}
		if (productionId && researchId === productionId && productionName !== RESEARCH_SEQUENCE_NAME) {
			return {
				ok: false,
				reason: RESEARCH_ENVIRONMENT_UNAVAILABLE,
				message: "Active production sequence is not allowed as the research target.",
				isolated: false
			};
		}
		if (check.productionClipIsResearchTarget === true && productionName !== RESEARCH_SEQUENCE_NAME) {
			return {
				ok: false,
				reason: RESEARCH_ENVIRONMENT_UNAVAILABLE,
				message: "Active production clip is not allowed as the research target.",
				isolated: false
			};
		}
		return {
			ok: true,
			reason: "",
			isolated: true,
			researchSequenceName: sequenceName,
			researchClipName: clipName || "(first video clip)",
			warning: WARNING
		};
	}

	function createRegistry(candidates, extra) {
		var registry = {
			schemaVersion: SCHEMA_VERSION,
			generatedAt: extra && extra.generatedAt ? extra.generatedAt : "",
			source: SOURCE,
			apiModel: API_MODEL,
			warning: WARNING,
			researchSequenceName: RESEARCH_SEQUENCE_NAME,
			candidatesTotal: candidates ? candidates.length : 0,
			cursor: 0,
			stopped: false,
			stoppedReason: null,
			effects: [],
			errors: []
		};
		return registry;
	}

	function validateSchema(registry) {
		var i;
		var effect;
		if (!registry || typeof registry !== "object") {
			return { ok: false, message: "Registry is missing." };
		}
		if (registry.schemaVersion !== SCHEMA_VERSION) {
			return { ok: false, message: "schemaVersion must be " + SCHEMA_VERSION + "." };
		}
		if (registry.apiModel !== API_MODEL) {
			return { ok: false, message: "apiModel must be CEP_ExtendScript." };
		}
		if (registry.source !== SOURCE) {
			return { ok: false, message: "source label is not the research builder." };
		}
		if (!registry.effects || typeof registry.effects.length !== "number") {
			return { ok: false, message: "effects must be an array." };
		}
		for (i = 0; i < registry.effects.length; i++) {
			effect = registry.effects[i];
			if (!effect || !trimmed(effect.displayName)) {
				return { ok: false, message: "Effect is missing displayName." };
			}
			if (!STATUSES[effect.status]) {
				return { ok: false, message: "Unknown status: " + String(effect.status) };
			}
			if (!effect.parameters || typeof effect.parameters.length !== "number") {
				return { ok: false, message: "parameters must be an array." };
			}
		}
		return { ok: true };
	}

	function fingerprintsEqual(a, b) {
		return String(a || "") === String(b || "");
	}

	function findAddedComponent(beforeFingerprint, components) {
		var before;
		var i;
		var key;
		var seen = {};
		try {
			before = beforeFingerprint ? JSON.parse(beforeFingerprint) : { components: [] };
		} catch (e) {
			before = { components: [] };
		}
		for (i = 0; i < (before.components ? before.components.length : 0); i++) {
			key = String(before.components[i].componentIndex) + "|" +
				String(before.components[i].displayName || "") + "|" +
				String(before.components[i].matchName || "");
			seen[key] = true;
		}
		if (!components || !components.length) {
			return null;
		}
		if (before.components && components.length > before.components.length) {
			return components[components.length - 1];
		}
		for (i = components.length - 1; i >= 0; i--) {
			key = String(components[i].componentIndex) + "|" +
				String(components[i].displayName || "") + "|" +
				String(components[i].matchName || "");
			if (!seen[key]) {
				return components[i];
			}
		}
		return null;
	}

	function mapParameter(param) {
		var enumMetadata = "unavailable";
		var mapped;
		if (!param) {
			return null;
		}
		if (param.hasItems === true || param.hasGetValueName === true || param.hasGetValueNames === true) {
			enumMetadata = {
				hasItems: param.hasItems === true,
				hasGetValueName: param.hasGetValueName === true,
				hasGetValueNames: param.hasGetValueNames === true
			};
		}
		mapped = {
			index: param.index,
			displayName: param.displayName === undefined ? null : param.displayName,
			matchName: null,
			matchNameAvailable: false,
			valueType: param.valueType || "unknown",
			currentValue: param.currentValue,
			hasGetValue: param.hasGetValue === true || param.getValue === true,
			hasSetValue: param.hasSetValue === true || param.setValue === true,
			isTimeVarying: param.isTimeVarying,
			areKeyframesSupported: param.areKeyframesSupported,
			constructorName: param.constructorName || null,
			enumMetadata: enumMetadata,
			previousParameter: param.neighborContext ? param.neighborContext.previous : null,
			currentParameter: {
				index: param.index,
				displayName: param.displayName === undefined ? null : param.displayName
			},
			nextParameter: param.neighborContext ? param.neighborContext.next : null
		};
		if (param.inferredSection) {
			mapped.inferredSection = param.inferredSection;
		}
		if (param.matchNameAvailable === true && param.matchName) {
			mapped.matchName = param.matchName;
			mapped.matchNameAvailable = true;
		}
		return mapped;
	}

	function mapEffect(candidateName, component, status) {
		var parameters = [];
		var i;
		var mapped;
		if (component && component.parameters) {
			for (i = 0; i < component.parameters.length; i++) {
				mapped = mapParameter(component.parameters[i]);
				if (mapped) {
					parameters.push(mapped);
				}
			}
		}
		return {
			displayName: candidateName,
			matchName: component && component.matchNameAvailable === false ? null : ((component && component.matchName) || null),
			matchNameAvailable: !!(component && component.matchNameAvailable === true && component.matchName),
			componentIndex: component ? component.componentIndex : null,
			parameterCount: component ? component.parameterCount : 0,
			status: status,
			parameters: parameters
		};
	}

	function failureRecord(candidateName, status, stage, errorType, message, extra) {
		var record = {
			displayName: candidateName,
			matchName: null,
			matchNameAvailable: false,
			componentIndex: null,
			parameterCount: 0,
			status: status,
			parameters: [],
			error: {
				stage: stage,
				effect: candidateName,
				errorType: errorType,
				message: message || "",
				recoverable: status !== "cleanup_failed"
			}
		};
		var key;
		if (extra) {
			for (key in extra) {
				if (extra.hasOwnProperty(key)) {
					record[key] = extra[key];
				}
			}
		}
		return record;
	}

	function processOne(candidate, hooks) {
		var name = trimmed(candidate && (candidate.displayName || candidate.name || candidate));
		var beforeResearch;
		var beforeProduction;
		var applied;
		var inspected;
		var added;
		var record;
		var afterResearch;
		var afterProduction;
		var removed;
		var timestamp = nowIso(hooks);

		if (!name) {
			return failureRecord("", "skipped", "apply", "EMPTY_NAME", "Candidate displayName was empty.", {
				timestamp: timestamp
			});
		}
		if (!hooks) {
			return failureRecord(name, "unsupported", "apply", RESEARCH_ENVIRONMENT_UNAVAILABLE, "No research hooks provided.", {
				timestamp: timestamp,
				stopRun: true
			});
		}
		if (hooks.timedOut === true || (typeof hooks.isTimedOut === "function" && hooks.isTimedOut())) {
			if (typeof hooks.removeAdded === "function") {
				try {
					hooks.removeAdded(null);
				} catch (ignoreTimeoutCleanup) {}
			}
			record = failureRecord(name, "timeout", "apply", "TIMEOUT", "Effect processing timed out.", {
				timestamp: timestamp
			});
			return record;
		}

		try {
			beforeResearch = hooks.fingerprintResearch();
			beforeProduction = hooks.fingerprintProduction();
		} catch (fpErr) {
			return failureRecord(name, "unsupported", "inspect", RESEARCH_ENVIRONMENT_UNAVAILABLE, String(fpErr), {
				timestamp: timestamp,
				stopRun: true
			});
		}

		try {
			applied = hooks.apply(name);
		} catch (applyErr) {
			applied = {
				ok: false,
				errorType: "APPLY_EXCEPTION",
				message: String(applyErr)
			};
		}
		if (!applied || applied.ok !== true) {
			return failureRecord(name, "apply_failed", "apply", (applied && applied.errorType) || "APPLY_FAILED", (applied && applied.message) || "Effect application failed.", {
				timestamp: timestamp,
				stage: "apply"
			});
		}

		try {
			inspected = hooks.inspect();
		} catch (inspectErr) {
			try {
				hooks.removeAdded(null);
			} catch (ignore) {}
			return failureRecord(name, "parameter_read_failed", "inspect", "INSPECT_EXCEPTION", String(inspectErr), {
				timestamp: timestamp
			});
		}

		if (!inspected || inspected.ok !== true) {
			try {
				hooks.removeAdded(null);
			} catch (ignoreInspectFail) {}
			return failureRecord(name, "parameter_read_failed", "inspect", (inspected && inspected.reason) || "INSPECT_FAILED", (inspected && inspected.detail) || "Could not read research clip components.", {
				timestamp: timestamp
			});
		}

		added = findAddedComponent(beforeResearch, inspected.components);
		if (!added) {
			try {
				removed = hooks.removeAdded(null);
			} catch (ignoreMissing) {
				removed = { ok: true };
			}
			record = failureRecord(name, "component_not_found", "inspect", "COMPONENT_NOT_FOUND", 'Applied "' + name + '" but no new component was found.', {
				timestamp: timestamp
			});
			if (removed && removed.ok === false) {
				record.status = "cleanup_failed";
				record.error.errorType = CLEANUP_FAILED;
				record.error.recoverable = false;
				record.stopRun = true;
			}
			return record;
		}

		if (added.parameterCount === 0 && (!added.parameters || added.parameters.length === 0) && added.propertiesUnavailable === true) {
			record = mapEffect(name, added, "unsupported");
			record.timestamp = timestamp;
		} else {
			record = mapEffect(name, added, "discovered");
			record.timestamp = timestamp;
		}

		try {
			removed = hooks.removeAdded(added);
		} catch (cleanupErr) {
			removed = {
				ok: false,
				message: String(cleanupErr)
			};
		}
		if (!removed || removed.ok !== true) {
			record.status = "cleanup_failed";
			record.error = {
				stage: "cleanup",
				effect: name,
				errorType: CLEANUP_FAILED,
				message: (removed && removed.message) || "Research effect could not be removed.",
				recoverable: false
			};
			record.stopRun = true;
			return record;
		}

		try {
			afterResearch = hooks.fingerprintResearch();
			afterProduction = hooks.fingerprintProduction();
		} catch (afterErr) {
			record.status = "cleanup_failed";
			record.error = {
				stage: "cleanup",
				effect: name,
				errorType: CLEANUP_FAILED,
				message: String(afterErr),
				recoverable: false
			};
			record.stopRun = true;
			return record;
		}

		if (!fingerprintsEqual(beforeResearch, afterResearch)) {
			record.status = "cleanup_failed";
			record.error = {
				stage: "cleanup",
				effect: name,
				errorType: CLEANUP_FAILED,
				message: "Research clip did not return to its original state.",
				recoverable: false
			};
			record.stopRun = true;
			return record;
		}
		if (!fingerprintsEqual(beforeProduction, afterProduction)) {
			record.status = "cleanup_failed";
			record.error = {
				stage: "cleanup",
				effect: name,
				errorType: CLEANUP_FAILED,
				message: "Production sequence or clip changed during research.",
				recoverable: false
			};
			record.stopRun = true;
			return record;
		}

		record.setValueCalls = 0;
		record.writesPerformed = false;
		return record;
	}

	function findEffectIndex(registry, displayName) {
		var i;
		if (!registry || !registry.effects) {
			return -1;
		}
		for (i = 0; i < registry.effects.length; i++) {
			if (registry.effects[i] && registry.effects[i].displayName === displayName) {
				return i;
			}
		}
		return -1;
	}

	function mergeRecord(registry, record) {
		var index;
		if (!registry || !record) {
			return registry;
		}
		index = findEffectIndex(registry, record.displayName);
		if (index === -1) {
			registry.effects.push(record);
			return registry;
		}
		if (TERMINAL_KEEP[registry.effects[index].status] && record.status !== "cleanup_failed") {
			return registry;
		}
		registry.effects[index] = record;
		return registry;
	}

	function recordByName(registry, displayName) {
		var index = findEffectIndex(registry, displayName);
		if (index === -1) {
			return null;
		}
		return registry.effects[index];
	}

	function nextResumeIndex(registry, candidates) {
		var i;
		var existing;
		if (!candidates) {
			return 0;
		}
		for (i = 0; i < candidates.length; i++) {
			existing = recordByName(registry, candidates[i].displayName);
			if (!existing || existing.status === "pending") {
				return i;
			}
		}
		return candidates.length;
	}

	function incrementalSave(store, registry) {
		if (!store || typeof store.save !== "function") {
			return { ok: false, message: "No store.save provided." };
		}
		store.save(registry);
		return { ok: true, registry: registry };
	}

	function loadOrCreate(store, candidates, extra) {
		var loaded;
		var schema;
		if (store && typeof store.load === "function") {
			loaded = store.load();
			if (loaded) {
				schema = validateSchema(loaded);
				if (schema.ok) {
					return loaded;
				}
			}
		}
		return createRegistry(candidates, extra);
	}

	function isHostBuilderAPI(obj) {
		try {
			return !!(obj &&
				typeof obj.validateEnvironment === "function" &&
				typeof obj.normalizeCandidates === "function" &&
				typeof obj.createRegistry === "function" &&
				typeof obj.processOne === "function" &&
				typeof obj.mergeRecord === "function" &&
				obj.RESEARCH_SEQUENCE_NAME === RESEARCH_SEQUENCE_NAME &&
				obj.RESEARCH_CLIP_NAME === RESEARCH_CLIP_NAME &&
				obj.RESEARCH_ENVIRONMENT_UNAVAILABLE === RESEARCH_ENVIRONMENT_UNAVAILABLE);
		} catch (e) {
			return false;
		}
	}

	function resolveHostBuilder(globals) {
		var dollar;
		var pickfx;
		var candidates = [];
		var i;
		try {
			dollar = globals ? globals.$ : undefined;
		} catch (ignoreDollar) {
			dollar = undefined;
		}
		try {
			if (dollar) {
				candidates.push(dollar._pickfxEffectRegistryBuilder);
			}
		} catch (ignoreA) {}
		try {
			pickfx = dollar ? dollar._pickfx : undefined;
			if (pickfx) {
				candidates.push(pickfx.effectRegistryBuilder);
			}
		} catch (ignoreB) {}
		try {
			if (globals) {
				candidates.push(globals.EffectRegistryBuilder);
			}
		} catch (ignoreC) {}
		for (i = 0; i < candidates.length; i++) {
			if (isHostBuilderAPI(candidates[i])) {
				return candidates[i];
			}
		}
		return null;
	}

	function recognizeBuilderLoaded(globals, staleLoadedFlag) {
		return isHostBuilderAPI(resolveHostBuilder(globals));
	}

	function hostLoadProbe(globals, staleLoadedFlag) {
		var builder = resolveHostBuilder(globals);
		var apiOk = isHostBuilderAPI(builder);
		var discoveryLoaded = false;
		try {
			discoveryLoaded = !!(globals && globals.$ && globals.$._pickfxEffectRegistryDiscovery);
		} catch (ignoreDiscovery) {}
		return {
			EffectRegistryBuilderLoaded: apiOk,
			EffectRegistryBuilderHostFunctionAvailable: apiOk,
			EffectRegistryDiscoveryLoaded: discoveryLoaded
		};
	}

	function summarize(registry) {
		var stats = {
			candidatesTotal: registry && registry.candidatesTotal ? registry.candidatesTotal : 0,
			discovered: 0,
			apply_failed: 0,
			parameter_read_failed: 0,
			unsupported: 0,
			cleanup_failed: 0,
			timeout: 0,
			component_not_found: 0,
			skipped: 0,
			pending: 0,
			totalParameters: 0,
			types: {
				number: 0,
				"boolean": 0,
				string: 0,
				object: 0,
				unknown: 0
			},
			withMatchName: 0,
			withoutMatchName: 0,
			zeroParameters: 0,
			complexObjectParameters: 0,
			manualHandling: []
		};
		var i;
		var p;
		var effect;
		var param;
		if (!registry || !registry.effects) {
			return stats;
		}
		for (i = 0; i < registry.effects.length; i++) {
			effect = registry.effects[i];
			if (stats[effect.status] !== undefined) {
				stats[effect.status] += 1;
			}
			if (effect.status === "discovered") {
				if (effect.matchNameAvailable) {
					stats.withMatchName += 1;
				} else {
					stats.withoutMatchName += 1;
				}
				if (!effect.parameters || effect.parameters.length === 0) {
					stats.zeroParameters += 1;
				}
			}
			for (p = 0; p < (effect.parameters ? effect.parameters.length : 0); p++) {
				param = effect.parameters[p];
				stats.totalParameters += 1;
				if (param.valueType && stats.types[param.valueType] !== undefined) {
					stats.types[param.valueType] += 1;
				} else {
					stats.types.unknown += 1;
				}
				if (param.valueType === "object") {
					stats.complexObjectParameters += 1;
				}
			}
			if (effect.status === "unsupported" || effect.status === "component_not_found" ||
					(effect.status === "discovered" && effect.parameters && effect.parameters.length === 0)) {
				stats.manualHandling.push(effect.displayName);
			}
		}
		return stats;
	}

	return {
		SCHEMA_VERSION: SCHEMA_VERSION,
		SOURCE: SOURCE,
		API_MODEL: API_MODEL,
		RESEARCH_SEQUENCE_NAME: RESEARCH_SEQUENCE_NAME,
		RESEARCH_CLIP_NAME: RESEARCH_CLIP_NAME,
		RECOGNIZED_VIDEO_EXTENSIONS: RECOGNIZED_VIDEO_EXTENSIONS,
		RESEARCH_ENVIRONMENT_UNAVAILABLE: RESEARCH_ENVIRONMENT_UNAVAILABLE,
		CLEANUP_FAILED: CLEANUP_FAILED,
		WARNING: WARNING,
		normalizeCandidates: normalizeCandidates,
		normalizeResearchClipName: normalizeResearchClipName,
		matchesResearchClipName: matchesResearchClipName,
		resolveResearchVideoClip: resolveResearchVideoClip,
		validateEnvironment: validateEnvironment,
		createRegistry: createRegistry,
		validateSchema: validateSchema,
		processOne: processOne,
		mergeRecord: mergeRecord,
		nextResumeIndex: nextResumeIndex,
		incrementalSave: incrementalSave,
		loadOrCreate: loadOrCreate,
		summarize: summarize,
		mapParameter: mapParameter,
		findAddedComponent: findAddedComponent,
		isHostBuilderAPI: isHostBuilderAPI,
		resolveHostBuilder: resolveHostBuilder,
		recognizeBuilderLoaded: recognizeBuilderLoaded,
		hostLoadProbe: hostLoadProbe,
		REQUIRED_HOST_FILES: [
			"/src/core/EffectRegistryDiscovery.js",
			"/src/core/EffectRegistryBuilder.js",
			"/src/core/ResearchBaselineCleanup.js",
			"/src/premiere/research-registry-host.jsx"
		]
	};
}());

if (typeof $ !== "undefined") {
	$._pickfxEffectRegistryBuilder = EffectRegistryBuilder;
	try {
		if ($._pickfx) {
			$._pickfx.effectRegistryBuilder = EffectRegistryBuilder;
		}
	} catch (ignorePickfx) {}
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = EffectRegistryBuilder;
}
