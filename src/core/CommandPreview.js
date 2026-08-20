var CommandPreview = (function () {
	var PERCENT_NAMES = {
		"Scale": true,
		"Scale Width": true,
		"Opacity": true,
		"Left": true,
		"Top": true,
		"Right": true,
		"Bottom": true,
		"Edge Feather": true,
		"Crop Left": true,
		"Crop Top": true,
		"Crop Right": true,
		"Crop Bottom": true
	};

	function trim(value) {
		return String(value || "").replace(/^\s+|\s+$/g, "");
	}

	function registry() {
		if (typeof ConfirmedParameterWrites !== "undefined") {
			return ConfirmedParameterWrites;
		}
		if (typeof $ !== "undefined" && $._pickfxConfirmedParameterWrites) {
			return $._pickfxConfirmedParameterWrites;
		}
		return null;
	}

	function lookupEntry(parameterName) {
		var reg = registry();
		if (!reg || !parameterName) {
			return null;
		}
		if (reg.lookupByParameter) {
			return reg.lookupByParameter(parameterName);
		}
		if (reg.lookup) {
			return reg.lookup(null, parameterName);
		}
		return null;
	}

	function isKnownParameter(parameterName) {
		var entry = lookupEntry(parameterName);
		return !!(entry && entry.productionEnabled === true);
	}

	function formatNumber(value) {
		if (typeof value !== "number" || !isFinite(value)) {
			return "";
		}
		if (value === Math.floor(value)) {
			return String(value);
		}
		return String(value);
	}

	function formatScalar(parameterName, value) {
		var text = formatNumber(value);
		if (!text) {
			return String(value);
		}
		if (PERCENT_NAMES[parameterName]) {
			return text + "%";
		}
		return text;
	}

	function valueLines(parameterName, clipCmd) {
		var value;
		if (!clipCmd) {
			return [];
		}
		if (clipCmd.reason === "INVALID_VALUE") {
			return [clipCmd.detail || "Invalid value."];
		}
		value = clipCmd.value;
		if (clipCmd.expectedType === "point" || (value && typeof value.length === "number" && value.length === 2)) {
			return [
				"X " + formatNumber(value[0]),
				"Y " + formatNumber(value[1])
			];
		}
		if (clipCmd.expectedType === "boolean" || value === true || value === false) {
			return [String(value)];
		}
		if (typeof value === "number") {
			return [formatScalar(parameterName, value)];
		}
		if (value === undefined || value === null) {
			return [];
		}
		return [String(value)];
	}

	function commandLabel(entry, parameterName) {
		if (entry && entry.componentDisplayName === "Crop") {
			return {
				title: "Crop",
				subtitle: entry.parameterDisplayName || parameterName
			};
		}
		if (entry && entry.componentDisplayName) {
			return {
				title: entry.parameterDisplayName || parameterName,
				subtitle: entry.componentDisplayName + " parameter"
			};
		}
		return {
			title: parameterName,
			subtitle: "Clip parameter"
		};
	}

	function formatInlineValue(parameterName, clipCmd, payload) {
		var value;
		if (payload && payload.value !== undefined) {
			value = payload.value;
		} else if (clipCmd) {
			value = clipCmd.value;
		}
		if (value && typeof value.length === "number" && value.length === 2) {
			return formatNumber(value[0]) + " " + formatNumber(value[1]);
		}
		if (value === true || value === false) {
			return String(value);
		}
		if (typeof value === "number") {
			return formatNumber(value);
		}
		if (typeof BatchNumericExecutor !== "undefined" && BatchNumericExecutor.formatSuccessFooter) {
			return "";
		}
		if (value === undefined || value === null) {
			return "";
		}
		return String(value);
	}

	function fromQuery(query, effects, aliases) {
		var raw = trim(query);
		var parsed;
		var clipCmd;
		var entry;
		var label;
		var parameterName;

		if (!raw) {
			return {
				kind: "empty",
				query: raw
			};
		}

		parsed = typeof CommandParser !== "undefined" && CommandParser.parse
			? CommandParser.parse(query, effects, aliases)
			: { isCommand: false };
		clipCmd = typeof CommandParser !== "undefined" && CommandParser.parseClipParameter
			? CommandParser.parseClipParameter(query, effects, aliases)
			: { isClipParameter: false };

		if (parsed && parsed.isCommand && parsed.effect) {
			return {
				kind: "effect-command",
				query: raw,
				parsed: parsed,
				effect: parsed.effect,
				parameter: parsed.parameterQuery || "",
				value: parsed.value
			};
		}

		if (clipCmd && clipCmd.isClipParameter) {
			parameterName = clipCmd.parameterQuery || "";
			entry = lookupEntry(parameterName);
			if (entry && entry.productionEnabled === true) {
				label = commandLabel(entry, parameterName);
				return {
					kind: "parameter-command",
					query: raw,
					clipCmd: clipCmd,
					entry: entry,
					component: entry.componentDisplayName,
					componentMatchName: entry.componentMatchName,
					parameter: entry.parameterDisplayName,
					title: label.title,
					subtitle: label.subtitle,
					value: clipCmd.value,
					valueLines: valueLines(entry.parameterDisplayName, clipCmd),
					reason: clipCmd.reason,
					hint: clipCmd.reason === "INVALID_VALUE" ? (clipCmd.detail || "Invalid value.") : "Enter to apply",
					productionEnabled: true
				};
			}
			return {
				kind: "unknown-command",
				query: raw,
				clipCmd: clipCmd,
				parameter: parameterName,
				value: clipCmd.value
			};
		}

		return {
			kind: "effect-search",
			query: raw,
			parsed: parsed
		};
	}

	function applyHeadline(payload) {
		var mark;
		var parameter;
		var effectName;
		var name;
		var value;
		if (typeof CommandPaletteState !== "undefined" && CommandPaletteState.successHeadline && payload && payload.ok) {
			return CommandPaletteState.successHeadline(payload);
		}
		parameter = (payload && payload.parameter) || "";
		effectName = (payload && payload.effect) || "";
		if (payload && payload.clipParameter) {
			name = parameter || effectName || "Parameter";
		} else {
			name = effectName || parameter || "Parameter";
		}
		value = formatInlineValue(parameter, null, payload);
		if (payload && payload.successfulCount > 0 && payload.failedCount > 0) {
			mark = "⚠";
		} else if (payload && payload.ok) {
			mark = "✓";
		} else {
			mark = "⚠";
		}
		return mark + " " + name + (value ? " " + value : "");
	}

	function applyDetail(payload) {
		if (!payload) {
			return "";
		}
		if (payload.ok) {
			return "Applied successfully";
		}
		if (typeof CommandPaletteState !== "undefined" && CommandPaletteState.userFacingMessage) {
			return CommandPaletteState.userFacingMessage(payload).detail || "";
		}
		return "";
	}

	function clipLines() {
		return [];
	}

	function fromApply(payload) {
		var selected;
		var successful;
		var failed;
		var state = "error";
		if (!payload) {
			return {
				kind: "apply-result",
				state: "error",
				headline: "Could not apply command.",
				detail: "",
				clipLines: []
			};
		}
		selected = typeof payload.selectedCount === "number" ? payload.selectedCount : 0;
		successful = typeof payload.successfulCount === "number" ? payload.successfulCount : 0;
		failed = typeof payload.failedCount === "number" ? payload.failedCount : 0;
		if (payload.ok) {
			state = "ok";
		} else if (successful > 0 && failed > 0) {
			state = "warn";
		}
		return {
			kind: "apply-result",
			state: state,
			headline: applyHeadline(payload),
			detail: applyDetail(payload),
			clipLines: clipLines(payload),
			payload: payload
		};
	}

	function formatFooter(payload) {
		var card;
		if (payload && payload.ok && typeof CommandPaletteState !== "undefined" && CommandPaletteState.successView) {
			return CommandPaletteState.successView(payload).footer;
		}
		card = fromApply(payload);
		if (card.detail) {
			return card.headline + " · " + card.detail;
		}
		return card.headline;
	}

	return {
		fromQuery: fromQuery,
		fromApply: fromApply,
		formatFooter: formatFooter,
		isKnownParameter: isKnownParameter
	};
}());

if (typeof $ !== "undefined") {
	$._pickfxCommandPreview = CommandPreview;
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = CommandPreview;
}
