var TerminalCapabilityRegistry = (function () {
	var SCHEMA_VERSION = 1;
	var MODEL_VERSION = "phase6-terminal-capabilities-20260822";
	var TYPES = {
		EFFECT: "EFFECT",
		CLIP_PROPERTY: "CLIP_PROPERTY",
		MOTION: "MOTION",
		TRANSITION: "TRANSITION"
	};
	var CAPABILITIES = [
		{
			id: "clip.speed",
			type: TYPES.CLIP_PROPERTY,
			property: "SPEED",
			names: ["speed", "clip speed"],
			valueType: "percent",
			componentDisplayName: "",
			componentMatchName: "",
			parameterDisplayName: "",
			executionSupported: false,
			evidence: "PUBLIC_TRACKITEM_READ_ONLY"
		},
		{
			id: "motion.opacity",
			type: TYPES.MOTION,
			property: "OPACITY",
			names: ["opacity"],
			valueType: "percent",
			componentDisplayName: "Opacity",
			componentMatchName: "AE.ADBE Opacity",
			parameterDisplayName: "Opacity",
			executionSupported: true,
			evidence: "CONFIRMED_PARAMETER_WRITE"
		},
		{
			id: "motion.scale",
			type: TYPES.MOTION,
			property: "SCALE",
			names: ["scale"],
			valueType: "percent",
			componentDisplayName: "Motion",
			componentMatchName: "AE.ADBE Motion",
			parameterDisplayName: "Scale",
			executionSupported: true,
			evidence: "CONFIRMED_PARAMETER_WRITE"
		},
		{
			id: "motion.rotation",
			type: TYPES.MOTION,
			property: "ROTATION",
			names: ["rotation"],
			valueType: "number",
			componentDisplayName: "Motion",
			componentMatchName: "AE.ADBE Motion",
			parameterDisplayName: "Rotation",
			executionSupported: true,
			evidence: "CONFIRMED_PARAMETER_WRITE"
		},
		{
			id: "motion.position",
			type: TYPES.MOTION,
			property: "POSITION",
			names: ["position"],
			valueType: "point",
			componentDisplayName: "Motion",
			componentMatchName: "AE.ADBE Motion",
			parameterDisplayName: "Position",
			executionSupported: true,
			evidence: "CONFIRMED_PARAMETER_WRITE"
		},
		{
			id: "motion.anchor-point",
			type: TYPES.MOTION,
			property: "ANCHOR_POINT",
			names: ["anchor point"],
			valueType: "point",
			componentDisplayName: "Motion",
			componentMatchName: "AE.ADBE Motion",
			parameterDisplayName: "Anchor Point",
			executionSupported: true,
			evidence: "CONFIRMED_PARAMETER_WRITE"
		},
		{
			id: "motion.scale-height",
			type: TYPES.MOTION,
			property: "SCALE_HEIGHT",
			names: ["scale height"],
			valueType: "percent",
			componentDisplayName: "Motion",
			componentMatchName: "AE.ADBE Motion",
			parameterDisplayName: "Scale Height",
			executionSupported: false,
			evidence: "EXPLICITLY_BLOCKED"
		}
	];

	function trim(value) {
		return String(value === undefined || value === null ? "" : value)
			.replace(/^\s+|\s+$/g, "");
	}

	function normalize(value) {
		return trim(value).toLowerCase().replace(/\s+/g, " ");
	}

	function clone(value) {
		return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
	}

	function finiteNumber(value) {
		return typeof value === "number" && isFinite(value);
	}

	function parseNumberToken(token, allowPercent) {
		var raw = trim(token);
		var percent = false;
		var value;
		if (allowPercent && /%$/.test(raw)) {
			percent = true;
			raw = trim(raw.substring(0, raw.length - 1));
		}
		if (!/^[+-]?(?:\d+\.?\d*|\d*\.\d+)$/.test(raw)) {
			return null;
		}
		value = Number(raw);
		if (!finiteNumber(value)) {
			return null;
		}
		return {
			value: value,
			percent: percent
		};
	}

	function matchPrefix(raw, names) {
		var folded = normalize(raw);
		var name;
		var i;
		for (i = 0; i < names.length; i++) {
			name = normalize(names[i]);
			if (folded === name) {
				return { name: names[i], rest: "" };
			}
			if (folded.indexOf(name + " ") === 0) {
				return {
					name: names[i],
					rest: trim(raw.substring(names[i].length))
				};
			}
		}
		return null;
	}

	function baseResolution(spec, raw) {
		return {
			ok: false,
			command: true,
			type: spec.type,
			capabilityType: spec.type,
			capabilityId: spec.id,
			property: spec.property,
			query: trim(raw),
			valueType: spec.valueType,
			executionSupported:
				spec.executionSupported === true,
			evidence: spec.evidence,
			componentDisplayName:
				spec.componentDisplayName || "",
			componentMatchName:
				spec.componentMatchName || "",
			parameterDisplayName:
				spec.parameterDisplayName || ""
		};
	}

	function invalid(spec, raw, detail) {
		var result = baseResolution(spec, raw);
		result.reason = "INVALID_VALUE";
		result.detail = detail || "Invalid capability value.";
		return result;
	}

	function parsePoint(spec, raw, rest) {
		var match = /^x\s+([+-]?(?:\d+\.?\d*|\d*\.\d+))\s+y\s+([+-]?(?:\d+\.?\d*|\d*\.\d+))$/i.exec(
			trim(rest)
		);
		var result;
		if (!match) {
			return invalid(
				spec,
				raw,
				"Point command requires x <number> y <number>."
			);
		}
		result = baseResolution(spec, raw);
		result.ok = spec.executionSupported === true;
		result.reason = result.ok ? "" : "UNSUPPORTED";
		result.x = Number(match[1]);
		result.y = Number(match[2]);
		result.value = [result.x, result.y];
		result.numbers = [result.x, result.y];
		result.execution = {
			action: "set-clip-property",
			writerPath: "ConfirmedParameterWrites.write",
			requiresReadBack: true,
			requiresTargetLock: true
		};
		return result;
	}

	function parseScalar(spec, raw, rest) {
		var parsed = parseNumberToken(
			rest,
			spec.valueType === "percent"
		);
		var result;
		if (!parsed) {
			return invalid(
				spec,
				raw,
				spec.valueType === "percent"
					? "Value must be a number with an optional % suffix."
					: "Value must be a number."
			);
		}
		result = baseResolution(spec, raw);
		result.ok = spec.executionSupported === true;
		result.reason = result.ok
			? ""
			: (
				spec.id === "clip.speed"
					? "NO_PROVEN_PUBLIC_WRITE_API"
					: "UNSUPPORTED"
			);
		result.value = parsed.value;
		result.percent = parsed.percent;
		result.numbers = [parsed.value];
		result.execution = {
			action: "set-clip-property",
			writerPath: spec.executionSupported
				? "ConfirmedParameterWrites.write"
				: "none",
			requiresReadBack: true,
			requiresTargetLock: true
		};
		return result;
	}

	function parseDeclared(input) {
		var raw = trim(input);
		var match;
		var spec;
		var ordered;
		var i;
		if (!raw) {
			return null;
		}
		ordered = CAPABILITIES.slice(0);
		ordered.sort(function (a, b) {
			return normalize(b.names[0]).length -
				normalize(a.names[0]).length;
		});
		for (i = 0; i < ordered.length; i++) {
			spec = ordered[i];
			match = matchPrefix(raw, spec.names);
			if (!match) {
				continue;
			}
			if (!match.rest) {
				return invalid(
					spec,
					raw,
					"Capability value is required."
				);
			}
			return spec.valueType === "point"
				? parsePoint(spec, raw, match.rest)
				: parseScalar(spec, raw, match.rest);
		}
		return null;
	}

	function transitionEntries(options) {
		var registry = options && options.transitionRegistry;
		return registry && registry.transitions
			? registry.transitions
			: [];
	}

	function compareTransitionNames(a, b) {
		return normalize(b.displayName).length -
			normalize(a.displayName).length;
	}

	function parseTransition(input, options) {
		var raw = trim(input);
		var entries = transitionEntries(options).slice(0);
		var normalizedRaw = normalize(raw);
		var entry;
		var name;
		var rest;
		var duration;
		var result;
		var i;
		entries.sort(compareTransitionNames);
		for (i = 0; i < entries.length; i++) {
			entry = entries[i];
			name = normalize(entry.displayName);
			if (normalizedRaw === name) {
				rest = "";
			} else if (normalizedRaw.indexOf(name + " ") === 0) {
				rest = trim(raw.substring(entry.displayName.length));
			} else {
				continue;
			}
			result = {
				ok: false,
				command: true,
				type: TYPES.TRANSITION,
				capabilityType: TYPES.TRANSITION,
				capabilityId:
					"transition." + name.replace(/\s+/g, "-"),
				query: raw,
				resolvedTransition: clone(entry),
				executionSupported:
					entry.safelyApplicable === true
			};
			if (rest) {
				duration = /^([+]?\d+)\s+frames?$/i.exec(rest);
				if (!duration || Number(duration[1]) <= 0) {
					result.reason = "INVALID_VALUE";
					result.detail =
						"Transition duration requires a positive frame count.";
					return result;
				}
				result.durationFrames = Number(duration[1]);
			}
			result.ok = result.executionSupported;
			result.reason = result.ok
				? ""
				: "TRANSITION_UNSUPPORTED";
			result.execution = {
				action: "apply-transition",
				requiresReadBack: true,
				requiresCleanup: true,
				requiresTargetLock: true
			};
			return result;
		}
		return null;
	}

	function parseEffect(input, options) {
		var resolver = options && options.effectResolver;
		var registry = options && options.effectRegistry;
		var resolved;
		if (!resolver ||
				typeof resolver.resolve !== "function" ||
				!registry) {
			return null;
		}
		resolved = resolver.resolve(
			input,
			registry,
			options.effectResolverOptions
		);
		if (!resolved) {
			return null;
		}
		resolved.capabilityType = TYPES.EFFECT;
		resolved.type = TYPES.EFFECT;
		return resolved;
	}

	function resolve(input, options) {
		var declared = parseDeclared(input);
		var transition;
		var effect;
		if (declared) {
			return declared;
		}
		transition = parseTransition(input, options);
		if (transition) {
			return transition;
		}
		effect = parseEffect(input, options);
		if (effect) {
			return effect;
		}
		return {
			ok: false,
			command: false,
			reason: "CAPABILITY_NOT_FOUND",
			query: trim(input),
			candidates: []
		};
	}

	function definition(capabilityId) {
		var i;
		for (i = 0; i < CAPABILITIES.length; i++) {
			if (CAPABILITIES[i].id === capabilityId) {
				return clone(CAPABILITIES[i]);
			}
		}
		return null;
	}

	function entries(type) {
		return CAPABILITIES.filter(function (entry) {
			return !type || entry.type === type;
		}).map(clone);
	}

	function route(resolution, handlers) {
		var handler;
		if (!resolution || !resolution.type) {
			return {
				ok: false,
				reason: "CAPABILITY_NOT_FOUND"
			};
		}
		handler = handlers
			? handlers[resolution.type]
			: null;
		if (typeof handler !== "function") {
			return {
				ok: false,
				reason: "CAPABILITY_UNSUPPORTED",
				type: resolution.type,
				resolution: resolution
			};
		}
		return handler(resolution);
	}

	return {
		SCHEMA_VERSION: SCHEMA_VERSION,
		MODEL_VERSION: MODEL_VERSION,
		TYPES: clone(TYPES),
		normalize: normalize,
		parseNumberToken: parseNumberToken,
		definition: definition,
		entries: entries,
		parseDeclared: parseDeclared,
		parseTransition: parseTransition,
		resolve: resolve,
		route: route
	};
}());

if (typeof module !== "undefined" && module.exports) {
	module.exports = TerminalCapabilityRegistry;
}
