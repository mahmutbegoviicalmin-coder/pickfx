var PaletteFlow = (function () {
	var MODE = {
		SEARCH: "search",
		PARAMETERS: "parameters",
		VALUE: "value",
		SUCCESS: "success"
	};

	function trim(value) {
		return String(value == null ? "" : value).replace(/^\s+|\s+$/g, "");
	}

	function create() {
		return {
			mode: MODE.SEARCH,
			effect: null,
			parameters: [],
			parameter: null,
			selectedIndex: 0,
			valueText: "",
			valueType: "number",
			options: [],
			dismiss: false,
			focus: "search"
		};
	}

	function copyState(state) {
		var next = create();
		var key;
		if (!state) {
			return next;
		}
		for (key in next) {
			if (next.hasOwnProperty(key) && state[key] !== undefined) {
				next[key] = state[key];
			}
		}
		return next;
	}

	function executableParameters(parameters) {
		var out = [];
		var i;
		var item;
		if (!parameters) {
			return out;
		}
		for (i = 0; i < parameters.length; i++) {
			item = parameters[i];
			if (item && item.executable !== false && item.writable !== false) {
				out.push(item);
			}
		}
		return out;
	}

	function parameterName(parameter) {
		if (!parameter) {
			return "";
		}
		return parameter.parameterDisplayName || parameter.displayName || "";
	}

	function parameterType(parameter) {
		if (!parameter) {
			return "number";
		}
		return parameter.valueType || parameter.type || "number";
	}

	function defaultParameterIndex(effect, parameters) {
		var i;
		var wantedIndex;
		var wantedName;
		if (!parameters || !parameters.length) {
			return 0;
		}
		wantedIndex = effect && typeof effect.defaultParameterIndex === "number"
			? effect.defaultParameterIndex
			: undefined;
		wantedName = effect && effect.defaultParameterDisplayName
			? trim(effect.defaultParameterDisplayName).toLowerCase()
			: "";
		if (wantedName) {
			for (i = 0; i < parameters.length; i++) {
				if (trim(parameterName(parameters[i])).toLowerCase() === wantedName) {
					return i;
				}
			}
		}
		if (wantedIndex !== undefined) {
			for (i = 0; i < parameters.length; i++) {
				if (parameters[i] && parameters[i].parameterIndex === wantedIndex) {
					return i;
				}
				if (parameters[i] && parameters[i].index === wantedIndex) {
					return i;
				}
			}
		}
		return 0;
	}

	function currentValueText(parameter) {
		var value;
		var type;
		if (!parameter) {
			return "";
		}
		value = parameter.currentValue !== undefined && parameter.currentValue !== null
			? parameter.currentValue
			: parameter.discoveredValue;
		type = parameterType(parameter);
		if (value === undefined || value === null || value === "") {
			return "";
		}
		if (type === "boolean") {
			return value === true || value === "true" || value === 1 ? "true" : "false";
		}
		if (type === "point" && value && typeof value.length === "number" && value.length >= 2) {
			return String(value[0]) + " " + String(value[1]);
		}
		return String(value);
	}

	function booleanOptions() {
		return [
			{ id: "true", label: "On", value: true },
			{ id: "false", label: "Off", value: false }
		];
	}

	function optionFromRaw(raw, index) {
		if (raw === undefined || raw === null) {
			return null;
		}
		if (typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean") {
			return { id: String(index), label: String(raw), value: raw };
		}
		return {
			id: raw.id != null ? String(raw.id) : String(index),
			label: raw.label != null ? String(raw.label) : String(raw.value != null ? raw.value : index),
			value: raw.value !== undefined ? raw.value : raw
		};
	}

	function enumOptions(parameter) {
		var raw = [];
		var meta;
		var i;
		var option;
		var out = [];
		if (!parameter) {
			return out;
		}
		if (parameter.options && parameter.options.length) {
			raw = parameter.options;
		} else if (parameter.enumValues && parameter.enumValues.length) {
			raw = parameter.enumValues;
		} else {
			meta = parameter.enumMetadata;
			if (meta && meta !== "unavailable" && meta !== "none" && meta.options) {
				raw = meta.options;
			}
		}
		for (i = 0; i < raw.length; i++) {
			option = optionFromRaw(raw[i], i);
			if (option) {
				out.push(option);
			}
		}
		return out;
	}

	function selectedOptionIndex(options, parameter) {
		var current;
		var i;
		if (!options || !options.length) {
			return 0;
		}
		current = currentValueText(parameter);
		for (i = 0; i < options.length; i++) {
			if (String(options[i].value) === current ||
					String(options[i].label).toLowerCase() === String(current).toLowerCase()) {
				return i;
			}
		}
		return 0;
	}

	function usesChoiceList(state) {
		if (!state || state.mode !== MODE.VALUE) {
			return false;
		}
		return state.valueType === "boolean" ||
			(state.valueType === "enum" && state.options && state.options.length > 0);
	}

	function enterValue(state, effect, parameter) {
		var next = copyState(state);
		var type = parameterType(parameter);
		next.mode = MODE.VALUE;
		next.effect = effect;
		next.parameter = parameter;
		next.parameters = state && state.parameters ? state.parameters : [];
		next.valueType = type;
		next.valueText = currentValueText(parameter);
		next.dismiss = false;
		if (type === "boolean") {
			next.options = booleanOptions();
			next.selectedIndex = selectedOptionIndex(next.options, parameter);
			next.focus = "results";
			return next;
		}
		if (type === "enum") {
			next.options = enumOptions(parameter);
			if (next.options.length) {
				next.selectedIndex = selectedOptionIndex(next.options, parameter);
				next.focus = "results";
				return next;
			}
		}
		next.options = [];
		next.selectedIndex = 0;
		next.focus = "value";
		return next;
	}

	function selectEffect(state, effect, parameters) {
		var next = copyState(state);
		var list = executableParameters(parameters);
		var index;
		next.effect = effect;
		next.parameters = list;
		next.parameter = null;
		next.valueText = "";
		next.dismiss = false;
		if (!list.length) {
			next.mode = MODE.SEARCH;
			next.focus = "search";
			next.selectedIndex = 0;
			return next;
		}
		if (list.length === 1) {
			return enterValue(next, effect, list[0]);
		}
		index = defaultParameterIndex(effect, list);
		next.mode = MODE.PARAMETERS;
		next.selectedIndex = index;
		next.focus = "results";
		return next;
	}

	function selectParameter(state, parameter) {
		return enterValue(state, state && state.effect, parameter || (state && state.parameter));
	}

	function wrapIndex(index, count) {
		if (!count) {
			return 0;
		}
		return ((index % count) + count) % count;
	}

	function move(state, delta, rowCount) {
		var next = copyState(state);
		var count = typeof rowCount === "number" ? rowCount : 0;
		if (usesChoiceList(next) && next.options.length) {
			count = next.options.length;
		}
		if (next.mode === MODE.PARAMETERS) {
			count = next.parameters.length;
		}
		if (!count) {
			return next;
		}
		next.selectedIndex = wrapIndex((next.selectedIndex || 0) + delta, count);
		next.preventScroll = true;
		return next;
	}

	function selectIndex(state, index, rowCount) {
		var next = copyState(state);
		var count = typeof rowCount === "number" ? rowCount : 0;
		var wanted = typeof index === "number" && isFinite(index)
			? Math.floor(index)
			: 0;
		if (usesChoiceList(next) && next.options.length) {
			count = next.options.length;
		}
		if (next.mode === MODE.PARAMETERS) {
			count = next.parameters.length;
		}
		if (!count) {
			next.selectedIndex = 0;
			return next;
		}
		next.selectedIndex = Math.max(0, Math.min(wanted, count - 1));
		return next;
	}

	function setValueText(state, text) {
		var next = copyState(state);
		next.valueText = String(text == null ? "" : text);
		return next;
	}

	function escape(state) {
		var next = copyState(state);
		next.dismiss = false;
		if (next.mode === MODE.VALUE) {
			if (next.parameters && next.parameters.length > 1) {
				next.mode = MODE.PARAMETERS;
				next.parameter = null;
				next.valueText = "";
				next.focus = "results";
				next.selectedIndex = defaultParameterIndex(next.effect, next.parameters);
				return next;
			}
			next.mode = MODE.SEARCH;
			next.effect = null;
			next.parameters = [];
			next.parameter = null;
			next.valueText = "";
			next.focus = "search";
			next.selectedIndex = 0;
			return next;
		}
		if (next.mode === MODE.PARAMETERS || next.mode === MODE.SUCCESS) {
			next.mode = MODE.SEARCH;
			next.effect = null;
			next.parameters = [];
			next.parameter = null;
			next.valueText = "";
			next.focus = "search";
			next.selectedIndex = 0;
			return next;
		}
		next.dismiss = true;
		next.focus = "none";
		return next;
	}

	function success(state, payload) {
		var next = copyState(state);
		next.mode = MODE.SUCCESS;
		next.payload = payload || null;
		next.focus = "search";
		next.dismiss = false;
		return next;
	}

	function toSearch(state) {
		var next = create();
		next.selectedIndex = state && typeof state.selectedIndex === "number"
			? state.selectedIndex
			: 0;
		return next;
	}

	function focusTarget(state) {
		if (!state) {
			return "search";
		}
		if (state.mode === MODE.VALUE && state.focus === "value") {
			return "value";
		}
		if (usesChoiceList(state)) {
			return "results";
		}
		if (state.mode === MODE.PARAMETERS) {
			return "results";
		}
		if (state.dismiss) {
			return "none";
		}
		return "search";
	}

	function interceptsArrows(state) {
		if (!state) {
			return true;
		}
		return state.mode === MODE.SEARCH ||
			state.mode === MODE.PARAMETERS ||
			usesChoiceList(state);
	}

	function applyQuery(state) {
		var effectName;
		var name;
		var value;
		if (!state || !state.effect || !state.parameter) {
			return "";
		}
		effectName = state.effect.premiereName || state.effect.displayName || "";
		name = parameterName(state.parameter);
		if (usesChoiceList(state)) {
			value = state.options && state.options[state.selectedIndex]
				? (state.valueType === "boolean"
					? String(state.options[state.selectedIndex].value)
					: String(state.options[state.selectedIndex].label || state.options[state.selectedIndex].value))
				: (state.valueText || "");
			return trim(effectName + " " + name + " " + value);
		}
		value = trim(state.valueText);
		if (!value) {
			return "";
		}
		return trim(effectName + " " + name + " " + value);
	}

	function successCopy(payload) {
		var effect = payload && (payload.effect || payload.component) ? String(payload.effect || payload.component) : "";
		var parameter = payload && payload.parameter ? String(payload.parameter) : "";
		var value = payload && (payload.value !== undefined ? payload.value : payload.requestedValue);
		var valueText = "";
		if (typeof value === "number" && isFinite(value)) {
			valueText = String(value);
		} else if (value === true || value === false) {
			valueText = value ? "On" : "Off";
		} else if (value !== undefined && value !== null && value !== "") {
			valueText = String(value);
		}
		return {
			title: "✓ " + (effect || parameter || "Command"),
			detail: trim((parameter && parameter !== effect ? parameter : "") + (valueText ? " " + valueText : "")),
			footer: "Applied successfully"
		};
	}

	return {
		MODE: MODE,
		create: create,
		executableParameters: executableParameters,
		selectEffect: selectEffect,
		selectParameter: selectParameter,
		enterValue: enterValue,
		move: move,
		selectIndex: selectIndex,
		setValueText: setValueText,
		escape: escape,
		success: success,
		toSearch: toSearch,
		focusTarget: focusTarget,
		interceptsArrows: interceptsArrows,
		applyQuery: applyQuery,
		parameterName: parameterName,
		parameterType: parameterType,
		defaultParameterIndex: defaultParameterIndex,
		enumOptions: enumOptions,
		usesChoiceList: usesChoiceList,
		successCopy: successCopy
	};
}());

if (typeof module !== "undefined" && module.exports) {
	module.exports = PaletteFlow;
}
