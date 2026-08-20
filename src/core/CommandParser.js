var CommandParser = (function () {
	var NUMBER_TOKEN = /^[+-]?(?:\d+\.?\d*|\d*\.\d+)$/;

	function trim(value) {
		return String(value || "").replace(/^\s+|\s+$/g, "");
	}

	function parseNumberToken(token) {
		var n;
		if (!NUMBER_TOKEN.test(token)) {
			return null;
		}
		n = Number(token);
		if (!isFinite(n)) {
			return null;
		}
		return n;
	}

	function notCommand(raw) {
		return {
			isCommand: false,
			type: "search",
			query: raw,
			effectQuery: raw,
			parameterQuery: "",
			value: null,
			effect: null
		};
	}

	function commandResult(type, rest, effectQuery, parameterQuery, value, effect) {
		return {
			isCommand: true,
			type: type,
			query: rest,
			effectQuery: effectQuery,
			parameterQuery: parameterQuery || "",
			value: value,
			effect: effect || null
		};
	}

	function resolveFromText(text, effects, aliases) {
		var parts;
		var len;
		var effectQuery;
		var parameterQuery;
		var matches;
		var top;
		var exact;
		var bestExact = null;
		var bestOther = null;
		var candidate;

		if (!text || !effects || !effects.length) {
			return null;
		}

		parts = String(text).split(/\s+/);
		for (len = parts.length; len >= 1; len--) {
			effectQuery = parts.slice(0, len).join(" ");
			parameterQuery = parts.slice(len).join(" ");
			matches = EffectSearch.search(effectQuery, effects, aliases);
			if (!matches.length) {
				continue;
			}

			top = matches[0];
			exact = EffectSearch.normalize(top.effect.name) === EffectSearch.normalize(effectQuery);
			candidate = {
				effectQuery: effectQuery,
				parameterQuery: parameterQuery,
				effect: top.effect,
				rank: top.rank,
				score: top.score,
				tokenCount: len,
				exact: exact
			};

			if (exact) {
				bestExact = candidate;
				break;
			}

			if (!bestOther) {
				bestOther = candidate;
			} else if (candidate.rank < bestOther.rank) {
				bestOther = candidate;
			} else if (candidate.rank === bestOther.rank && candidate.score > bestOther.score) {
				bestOther = candidate;
			} else if (
				candidate.rank === bestOther.rank &&
				candidate.score === bestOther.score &&
				candidate.tokenCount > bestOther.tokenCount
			) {
				bestOther = candidate;
			}
		}

		return bestExact || bestOther || null;
	}

	function chooseSplit(rest, value, effects, aliases) {
		var resolved = resolveFromText(rest, effects, aliases);
		if (!resolved || !resolved.effect) {
			return commandResult("auto-parameter", rest, rest, "", value, null);
		}
		if (resolved.parameterQuery) {
			return commandResult(
				"parameter",
				rest,
				resolved.effectQuery,
				resolved.parameterQuery,
				value,
				resolved.effect
			);
		}
		return commandResult(
			"auto-parameter",
			rest,
			resolved.effectQuery,
			"",
			value,
			resolved.effect
		);
	}

	function uniqueProductionClipParameter(parameterName) {
		var row;
		var name = trim(parameterName);
		if (!name) {
			return null;
		}
		if (typeof ConfirmedParameterWrites === "undefined") {
			return null;
		}
		if (ConfirmedParameterWrites.lookupByParameter) {
			row = ConfirmedParameterWrites.lookupByParameter(name);
		} else if (ConfirmedParameterWrites.lookup) {
			row = ConfirmedParameterWrites.lookup(null, name);
		}
		if (row && row.productionEnabled === true) {
			return row;
		}
		return null;
	}

	function foldName(value) {
		if (typeof EffectSearch !== "undefined" && EffectSearch.normalize) {
			return EffectSearch.normalize(value);
		}
		return String(value || "").toLowerCase().replace(/^\s+|\s+$/g, "");
	}

	function matchingCompoundEffectToken(effectName, typed) {
		var wanted = foldName(typed);
		var parts;
		var i;
		var found = "";
		var count = 0;
		if (!wanted || String(effectName || "").indexOf("&") === -1) {
			return "";
		}
		if (foldName(effectName) === wanted) {
			return "";
		}
		parts = String(effectName || "").split(/[^A-Za-z0-9]+/).filter(Boolean);
		for (i = 0; i < parts.length; i++) {
			if (foldName(parts[i]) === wanted) {
				found = parts[i];
				count += 1;
			}
		}
		if (count === 1) {
			return found;
		}
		return "";
	}

	function namedCompoundToken(split) {
		var leftover;
		if (!split || !split.effect) {
			return "";
		}
		leftover = trim(split.parameterQuery || "");
		if (leftover) {
			return matchingCompoundEffectToken(split.effect.name, leftover);
		}
		return matchingCompoundEffectToken(split.effect.name, split.effectQuery || split.query || "");
	}

	function withNamedCompoundToken(split, value) {
		var token;
		if (!split || trim(split.parameterQuery || "")) {
			return split;
		}
		token = namedCompoundToken(split);
		if (!token) {
			return split;
		}
		return commandResult(
			"parameter",
			split.query,
			split.effectQuery,
			token,
			value,
			split.effect
		);
	}

	function parse(query, effects, aliases) {
		var raw = trim(query);
		var parts;
		var last;
		var value;
		var rest;
		var split;

		if (!raw) {
			return notCommand(raw);
		}

		parts = raw.split(/\s+/);
		if (parts.length < 2) {
			return notCommand(raw);
		}

		last = parts[parts.length - 1];
		value = parseNumberToken(last);
		if (value === null) {
			return notCommand(raw);
		}

		rest = parts.slice(0, parts.length - 1).join(" ");
		if (!rest) {
			return notCommand(raw);
		}

		if (uniqueProductionClipParameter(rest)) {
			if (effects && effects.length) {
				split = withNamedCompoundToken(chooseSplit(rest, value, effects, aliases), value);
				if (split && split.effect && trim(split.parameterQuery || "")) {
					return preferUniqueClipParameter(split, value);
				}
			}
			return commandResult("auto-parameter", rest, rest, "", value, null);
		}

		if (!effects || !effects.length) {
			return commandResult("auto-parameter", rest, rest, "", value, null);
		}

		return preferUniqueClipParameter(
			withNamedCompoundToken(chooseSplit(rest, value, effects, aliases), value),
			value
		);
	}

	function preferUniqueClipParameter(split, value) {
		var leftover;
		var row;
		if (!split || !split.effect) {
			return split;
		}
		leftover = trim(split.parameterQuery || "");
		if (!leftover) {
			return split;
		}
		if (namedCompoundToken(split)) {
			return split;
		}
		row = uniqueProductionClipParameter(leftover);
		if (!row) {
			return split;
		}
		return commandResult(
			"auto-parameter",
			row.parameterDisplayName,
			row.parameterDisplayName,
			"",
			value,
			null
		);
	}

	function numericClipFromParsed(parsed) {
		var name;
		var row;
		if (!parsed || parsed.isCommand !== true) {
			return null;
		}
		if (typeof parsed.value !== "number" || !isFinite(parsed.value)) {
			return null;
		}
		if (parsed.effect && namedCompoundToken(parsed)) {
			return null;
		}
		name = parsed.effect
			? trim(parsed.parameterQuery || "")
			: trim(parsed.effectQuery || parsed.query || "");
		row = uniqueProductionClipParameter(name);
		if (!row) {
			return null;
		}
		return {
			isClipParameter: true,
			isCommand: true,
			parameterQuery: row.parameterDisplayName,
			numbers: [parsed.value],
			expectedType: "number",
			value: parsed.value
		};
	}

	function identify(query, effects, aliases) {
		var parsed = parse(query, effects, aliases);
		var raw = trim(query);
		var resolved;

		if (parsed.isCommand) {
			return {
				isCommand: true,
				exact: !!parsed.effect,
				effect: parsed.effect,
				effectQuery: parsed.effectQuery,
				parameterQuery: parsed.parameterQuery || "",
				value: parsed.value
			};
		}

		resolved = resolveFromText(raw, effects, aliases);
		if (!resolved || !resolved.effect) {
			return {
				isCommand: false,
				exact: false,
				effect: null,
				effectQuery: raw,
				parameterQuery: "",
				value: null
			};
		}

		return {
			isCommand: false,
			exact: !!resolved.exact,
			effect: resolved.effect,
			effectQuery: resolved.effectQuery,
			parameterQuery: resolved.parameterQuery || "",
			value: null
		};
	}

	function searchQuery(query, effects, aliases) {
		var identity = identify(query, effects, aliases);
		if (identity.isCommand || identity.exact) {
			return identity.effectQuery || query;
		}
		return identity.effectQuery || query;
	}

	function hasTypedValue(leftover) {
		var parts;
		var last;
		var n;
		leftover = trim(leftover);
		if (!leftover) {
			return false;
		}
		parts = leftover.split(/\s+/);
		last = parts[parts.length - 1] || "";
		n = last.toLowerCase();
		if (n === "true" || n === "false" || n === "on" || n === "off" || n === "yes" || n === "no") {
			return true;
		}
		if (last.charAt(0) === "#") {
			return true;
		}
		if (/^rgba?\(/i.test(leftover)) {
			return true;
		}
		if (last.indexOf(",") !== -1) {
			return true;
		}
		return parts.length >= 2;
	}

	function classify(query, effects, aliases) {
		var parsed = parse(query, effects, aliases);
		var identity;
		var leftover;
		if (parsed.isCommand) {
			return {
				kind: parsed.parameterQuery ? "named-numeric" : "numeric",
				isCommand: true,
				effect: parsed.effect,
				effectQuery: parsed.effectQuery,
				parameterQuery: parsed.parameterQuery || "",
				leftover: parsed.parameterQuery || "",
				value: parsed.value
			};
		}
		identity = identify(query, effects, aliases);
		leftover = (identity && identity.parameterQuery) || "";
		if (identity && identity.effect && leftover && hasTypedValue(leftover)) {
			return {
				kind: "typed",
				isCommand: false,
				effect: identity.effect,
				effectQuery: identity.effectQuery,
				parameterQuery: leftover,
				leftover: leftover,
				value: null
			};
		}
		return {
			kind: "effect",
			isCommand: false,
			effect: identity ? identity.effect : null,
			effectQuery: identity && identity.effectQuery ? identity.effectQuery : trim(query),
			parameterQuery: leftover,
			leftover: leftover,
			value: null
		};
	}

	function parseNamedAxes(query) {
		var raw = trim(query);
		var match;
		if (!raw) {
			return null;
		}
		match = /^(.*?)\s+x\s+([+-]?(?:\d+\.?\d*|\d*\.\d+))\s+y\s+([+-]?(?:\d+\.?\d*|\d*\.\d+))$/i.exec(raw);
		if (!match || !trim(match[1])) {
			return null;
		}
		return {
			parameterQuery: trim(match[1]),
			numbers: [Number(match[2]), Number(match[3])],
			expectedType: "point",
			value: [Number(match[2]), Number(match[3])]
		};
	}

	function parseBooleanToken(token) {
		var key = String(token || "").toLowerCase();
		var bools = {
			true: true,
			false: false,
			on: true,
			off: false,
			yes: true,
			no: false
		};
		if (!bools.hasOwnProperty(key)) {
			return null;
		}
		return bools[key];
	}

	function parsePointRest(rest) {
		var named;
		var parts;
		var i;
		var n;
		var numbers;
		rest = trim(rest);
		if (!rest) {
			return { ok: false, reason: "INVALID_VALUE", detail: "Point value is missing a coordinate." };
		}
		named = /^x\s+([+-]?(?:\d+\.?\d*|\d*\.\d+))\s+y\s+([+-]?(?:\d+\.?\d*|\d*\.\d+))$/i.exec(rest);
		if (named) {
			return {
				ok: true,
				numbers: [Number(named[1]), Number(named[2])],
				value: [Number(named[1]), Number(named[2])]
			};
		}
		parts = rest.split(/\s+/);
		numbers = [];
		for (i = 0; i < parts.length; i++) {
			n = parseNumberToken(parts[i]);
			if (n === null) {
				return { ok: false, reason: "INVALID_VALUE", detail: "Point coordinates must be numbers." };
			}
			numbers.push(n);
		}
		if (numbers.length < 2) {
			return { ok: false, reason: "INVALID_VALUE", detail: "Point value is missing a coordinate." };
		}
		if (numbers.length > 2) {
			return { ok: false, reason: "INVALID_VALUE", detail: "Point value has extra coordinates." };
		}
		return {
			ok: true,
			numbers: numbers,
			value: [numbers[0], numbers[1]]
		};
	}

	function motionCommandSpecs() {
		return [
			{ name: "Anchor Point", type: "point" },
			{ name: "Scale Width", type: "number" },
			{ name: "Scale Height", type: "number" },
			{ name: "Anti-flicker Filter", type: "number" },
			{ name: "Crop Left", type: "number" },
			{ name: "Crop Top", type: "number" },
			{ name: "Crop Right", type: "number" },
			{ name: "Crop Bottom", type: "number" },
			{ name: "Uniform Scale", type: "boolean" },
			{ name: "Position", type: "point" },
			{ name: "Rotation", type: "number" },
			{ name: "Scale", type: "number" }
		];
	}

	function matchMotionCommand(query) {
		var raw = trim(query);
		var folded;
		var specs;
		var i;
		var spec;
		var prefix;
		var rest;
		var parsedPoint;
		var n;
		var boolValue;
		var parts;
		if (!raw) {
			return null;
		}
		folded = raw.toLowerCase();
		specs = motionCommandSpecs();
		for (i = 0; i < specs.length; i++) {
			spec = specs[i];
			prefix = spec.name.toLowerCase();
			if (folded === prefix) {
				rest = "";
			} else if (folded.indexOf(prefix + " ") === 0) {
				rest = trim(raw.slice(spec.name.length));
			} else {
				continue;
			}
			if (spec.type === "point") {
				parsedPoint = parsePointRest(rest);
				if (!parsedPoint.ok) {
					return {
						isClipParameter: true,
						isCommand: true,
						parameterQuery: spec.name,
						numbers: parsedPoint.numbers || [],
						expectedType: "point",
						value: null,
						reason: "INVALID_VALUE",
						detail: parsedPoint.detail || "Invalid value."
					};
				}
				return {
					isClipParameter: true,
					isCommand: true,
					parameterQuery: spec.name,
					numbers: parsedPoint.numbers,
					expectedType: "point",
					value: parsedPoint.value
				};
			}
			if (spec.type === "boolean") {
				parts = rest ? rest.split(/\s+/) : [];
				if (parts.length !== 1) {
					return {
						isClipParameter: true,
						isCommand: true,
						parameterQuery: spec.name,
						numbers: [],
						expectedType: "boolean",
						value: null,
						reason: "INVALID_VALUE",
						detail: "Boolean parameter requires true or false."
					};
				}
				boolValue = parseBooleanToken(parts[0]);
				if (boolValue !== true && boolValue !== false) {
					return {
						isClipParameter: true,
						isCommand: true,
						parameterQuery: spec.name,
						numbers: [],
						expectedType: "boolean",
						value: null,
						reason: "INVALID_VALUE",
						detail: "Boolean parameter requires true or false."
					};
				}
				return {
					isClipParameter: true,
					isCommand: true,
					parameterQuery: spec.name,
					numbers: [],
					booleanValue: boolValue,
					expectedType: "boolean",
					value: boolValue
				};
			}
			parts = rest ? rest.split(/\s+/) : [];
			if (parts.length !== 1) {
				return {
					isClipParameter: true,
					isCommand: true,
					parameterQuery: spec.name,
					numbers: [],
					expectedType: "number",
					value: null,
					reason: "INVALID_VALUE",
					detail: parts.length > 1 ? "Extra arguments for a numeric parameter." : "Numeric parameter requires one number."
				};
			}
			n = parseNumberToken(parts[0]);
			if (n === null) {
				return {
					isClipParameter: true,
					isCommand: true,
					parameterQuery: spec.name,
					numbers: [],
					expectedType: "number",
					value: null,
					reason: "INVALID_VALUE",
					detail: "Numeric parameter requires one number."
				};
			}
			return {
				isClipParameter: true,
				isCommand: true,
				parameterQuery: spec.name,
				numbers: [n],
				expectedType: "number",
				value: n
			};
		}
		return null;
	}

	function parseTrailingValues(query) {
		var raw = trim(query);
		var parts;
		var i;
		var n;
		var last;
		var bools;
		var numbers;
		if (!raw) {
			return null;
		}
		parts = raw.split(/\s+/);
		if (parts.length < 2) {
			return null;
		}
		last = parts[parts.length - 1].toLowerCase();
		bools = {
			true: true,
			false: false,
			on: true,
			off: false,
			yes: true,
			no: false
		};
		if (bools.hasOwnProperty(last) && parts.length >= 2) {
			return {
				parameterQuery: parts.slice(0, parts.length - 1).join(" "),
				numbers: [],
				booleanValue: bools[last],
				expectedType: "boolean",
				value: bools[last]
			};
		}
		numbers = [];
		for (i = parts.length - 1; i >= 0; i--) {
			n = parseNumberToken(parts[i]);
			if (n === null) {
				break;
			}
			numbers.unshift(n);
		}
		if (!numbers.length || i < 0) {
			return null;
		}
		return {
			parameterQuery: parts.slice(0, i + 1).join(" "),
			numbers: numbers,
			expectedType: numbers.length >= 2 ? "point" : "number",
			value: numbers.length >= 2 ? [numbers[0], numbers[1]] : numbers[0]
		};
	}

	function parseClipParameter(query, effects, aliases) {
		var parsed = parse(query, effects, aliases);
		var identity;
		var motion;
		var named;
		var trailing;
		var clipFromParse;
		if (parsed && parsed.isCommand && parsed.effect) {
			clipFromParse = numericClipFromParsed(parsed);
			if (clipFromParse) {
				return clipFromParse;
			}
			return {
				isClipParameter: false,
				handledByEffectNumeric: true
			};
		}
		if (!(parsed && parsed.isCommand)) {
			identity = identify(query, effects, aliases);
			if (identity && identity.effect && identity.parameterQuery && hasTypedValue(identity.parameterQuery)) {
				return {
					isClipParameter: false,
					handledByEffectTyped: true
				};
			}
		}
		motion = matchMotionCommand(query);
		if (motion) {
			return motion;
		}
		named = parseNamedAxes(query);
		if (named && named.parameterQuery) {
			return {
				isClipParameter: true,
				isCommand: true,
				parameterQuery: named.parameterQuery,
				numbers: named.numbers,
				expectedType: "point",
				value: named.value
			};
		}
		clipFromParse = numericClipFromParsed(parsed);
		if (clipFromParse) {
			return clipFromParse;
		}
		trailing = parseTrailingValues(query);
		if (trailing && trailing.parameterQuery) {
			return {
				isClipParameter: true,
				isCommand: true,
				parameterQuery: trailing.parameterQuery,
				numbers: trailing.numbers || [],
				booleanValue: trailing.booleanValue,
				expectedType: trailing.expectedType,
				value: trailing.value
			};
		}
		return {
			isClipParameter: false,
			isCommand: false
		};
	}

	return {
		parse: parse,
		identify: identify,
		searchQuery: searchQuery,
		hasTypedValue: hasTypedValue,
		classify: classify,
		parseClipParameter: parseClipParameter
	};
}());
