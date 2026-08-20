var LumetriPicker = (function () {
	var LUMETRI_DISPLAY = "Lumetri Color";
	var LUMETRI_MATCH = "AE.ADBE Lumetri";
	var MAX_CHILDREN = 160;
	var CHOOSE_LUMETRI = "choose-lumetri";
	var CHOOSE_PARAMETER = "choose-parameter";
	var STALE_LUMETRI = "stale-lumetri";
	var STALE_PARAMETER = "stale-parameter";
	var SECTION_HEADERS = [
		{ fold: "basic correction", label: "Basic Correction" },
		{ fold: "creative", label: "Creative" },
		{ fold: "hsl secondary", label: "HSL Secondary" },
		{ fold: "curves", label: "Curves" },
		{ fold: "color wheels & match", label: "Color Wheels" },
		{ fold: "vignette", label: "Vignette" }
	];

	function resolver() {
		if (typeof $._pickfxParameterResolver !== "undefined") {
			return $._pickfxParameterResolver;
		}
		return null;
	}

	function trimmed(value) {
		return String(value || "").replace(/^\s+|\s+$/g, "");
	}

	function fold(value) {
		return trimmed(value).toLowerCase();
	}

	function isPickerUiKind(uiKind) {
		return uiKind === CHOOSE_LUMETRI || uiKind === CHOOSE_PARAMETER;
	}

	function isPickerPayload(payload) {
		return !!(payload && isPickerUiKind(payload.uiKind));
	}

	function asIndex(value) {
		if (typeof value === "number" && isFinite(value) && value >= 0 && Math.floor(value) === value) {
			return value;
		}
		return undefined;
	}

	function targetingFromInput(input) {
		var nested;
		if (!input) {
			return {};
		}
		nested = input.lumetriTarget && typeof input.lumetriTarget === "object" ? input.lumetriTarget : input;
		return {
			componentIndex: asIndex(nested.lumetriComponentIndex !== undefined ? nested.lumetriComponentIndex : nested.componentIndex),
			parameterIndex: asIndex(nested.lumetriParameterIndex !== undefined ? nested.lumetriParameterIndex : nested.parameterIndex),
			hierarchyPath: nested.lumetriHierarchyPath !== undefined ? trimmed(nested.lumetriHierarchyPath) : trimmed(nested.hierarchyPath)
		};
	}

	function copyObject(spec) {
		var out = {};
		var key;
		if (!spec) {
			return out;
		}
		for (key in spec) {
			if (spec.hasOwnProperty(key)) {
				out[key] = spec[key];
			}
		}
		return out;
	}

	function readString(obj, key) {
		var res = resolver();
		if (res && typeof res.readString === "function") {
			return res.readString(obj, key) || "";
		}
		try {
			return obj && obj[key] !== undefined && obj[key] !== null ? String(obj[key]) : "";
		} catch (ignoreRead) {
			return "";
		}
	}

	function eachCollectionItem(collection, visitor) {
		var res = resolver();
		var countInfo;
		var count;
		var indexBase;
		var i;
		var item;
		if (!collection || typeof visitor !== "function") {
			return;
		}
		if (res && typeof res.collectionCount === "function") {
			countInfo = res.collectionCount(collection);
			count = countInfo && typeof countInfo.count === "number" ? countInfo.count : 0;
			indexBase = typeof res.collectionIndexBase === "function"
				? res.collectionIndexBase(collection, count)
				: 0;
			for (i = 0; i < count && i < MAX_CHILDREN; i++) {
				item = res.collectionItem(collection, i, indexBase);
				visitor(item, i);
			}
			return;
		}
		try {
			count = collection.length;
		} catch (ignoreLength) {
			count = 0;
		}
		if (typeof count !== "number" || !isFinite(count) || count < 0) {
			count = 0;
		}
		for (i = 0; i < count && i < MAX_CHILDREN; i++) {
			try {
				item = collection[i];
			} catch (ignoreItem) {
				item = undefined;
			}
			visitor(item, i);
		}
	}

	function looksLikeLumetri(displayName, matchName) {
		return trimmed(displayName) === LUMETRI_DISPLAY && trimmed(matchName) === LUMETRI_MATCH;
	}

	function formatLiveNumber(value) {
		var rounded;
		if (typeof value !== "number" || !isFinite(value)) {
			return "";
		}
		if (value === Math.floor(value)) {
			return String(value);
		}
		rounded = Math.round(value * 100) / 100;
		return String(rounded);
	}

	function childCollection(param) {
		if (!param) {
			return null;
		}
		try {
			if (param.properties) {
				return param.properties;
			}
		} catch (ignoreProps) {}
		try {
			if (param.children) {
				return param.children;
			}
		} catch (ignoreChildren) {}
		return null;
	}

	function readNumericValue(param) {
		var value;
		try {
			if (!param || typeof param.getValue !== "function") {
				return undefined;
			}
			value = param.getValue();
		} catch (ignoreGet) {
			return undefined;
		}
		if (typeof value !== "number" || !isFinite(value)) {
			return undefined;
		}
		return value;
	}

	function isNumericWriteCandidate(param) {
		if (readNumericValue(param) === undefined) {
			return false;
		}
		try {
			return typeof param.setValue === "function";
		} catch (ignoreSet) {
			return false;
		}
	}

	function sectionLabelForName(displayName) {
		var name = fold(displayName);
		var i;
		for (i = 0; i < SECTION_HEADERS.length; i++) {
			if (SECTION_HEADERS[i].fold === name) {
				return SECTION_HEADERS[i].label;
			}
		}
		return "";
	}

	function inferSection(flatRows, parameterIndex) {
		var i;
		var label;
		for (i = parameterIndex - 1; i >= 0; i--) {
			label = sectionLabelForName(flatRows[i] && flatRows[i].displayName);
			if (label) {
				return label;
			}
		}
		return "";
	}

	function listFlatParams(component) {
		var out = [];
		if (!component) {
			return out;
		}
		eachCollectionItem(childCollection(component), function (param, index) {
			out.push({
				parameterIndex: index,
				displayName: readString(param, "displayName") || "",
				matchName: readString(param, "matchName") || "",
				_param: param
			});
		});
		return out;
	}

	function readPropertyAt(component, parameterIndex) {
		var found = null;
		if (asIndex(parameterIndex) === undefined) {
			return null;
		}
		eachCollectionItem(childCollection(component), function (param, index) {
			if (index === parameterIndex) {
				found = param;
			}
		});
		return found;
	}

	function listNumericParams(component, parameterDisplayName) {
		var wanted = trimmed(parameterDisplayName);
		var flat;
		var out = [];
		var i;
		var row;
		var value;
		if (!component || !wanted) {
			return out;
		}
		flat = listFlatParams(component);
		for (i = 0; i < flat.length; i++) {
			row = flat[i];
			if (trimmed(row.displayName) !== wanted) {
				continue;
			}
			if (!isNumericWriteCandidate(row._param)) {
				continue;
			}
			value = readNumericValue(row._param);
			out.push({
				displayName: row.displayName,
				matchName: row.matchName || "",
				parameterIndex: row.parameterIndex,
				section: inferSection(flat, row.parameterIndex),
				currentValue: value,
				_param: row._param
			});
		}
		return out;
	}

	function resolveAtIndex(component, parameterIndex, expectedDisplayName) {
		var param;
		var name;
		var value;
		param = readPropertyAt(component, parameterIndex);
		if (!param) {
			return null;
		}
		name = readString(param, "displayName") || "";
		if (trimmed(name) !== trimmed(expectedDisplayName)) {
			return null;
		}
		if (!isNumericWriteCandidate(param)) {
			return null;
		}
		value = readNumericValue(param);
		return {
			displayName: name,
			matchName: readString(param, "matchName") || "",
			parameterIndex: parameterIndex,
			currentValue: value,
			_param: param
		};
	}

	function firstNumericNamed(component, parameterDisplayName) {
		var matches = listNumericParams(component, parameterDisplayName);
		var best = null;
		var i;
		for (i = 0; i < matches.length; i++) {
			if (!best || matches[i].parameterIndex < best.parameterIndex) {
				best = matches[i];
			}
		}
		return best;
	}

	function listInstances(trackItem) {
		var components;
		var out = [];
		if (!trackItem) {
			return out;
		}
		try {
			components = trackItem.components;
		} catch (ignoreComponents) {
			return out;
		}
		eachCollectionItem(components, function (component, index) {
			var displayName;
			var matchName;
			var temperature;
			var saturation;
			if (!component) {
				return;
			}
			displayName = readString(component, "displayName") || "";
			matchName = readString(component, "matchName") || "";
			if (!looksLikeLumetri(displayName, matchName)) {
				return;
			}
			temperature = firstNumericNamed(component, "Temperature");
			saturation = firstNumericNamed(component, "Saturation");
			out.push({
				componentIndex: index,
				displayName: displayName,
				matchName: matchName,
				temperature: temperature ? temperature.currentValue : undefined,
				saturation: saturation ? saturation.currentValue : undefined,
				_component: component
			});
		});
		return out;
	}

	function instanceSubtitle(instance) {
		var parts = [];
		if (instance && typeof instance.temperature === "number" && isFinite(instance.temperature)) {
			parts.push("Temperature " + formatLiveNumber(instance.temperature));
		}
		if (instance && typeof instance.saturation === "number" && isFinite(instance.saturation)) {
			parts.push("Saturation " + formatLiveNumber(instance.saturation));
		}
		return parts.join(" · ");
	}

	function formatInstanceChoices(instances) {
		var choices = [];
		var i;
		var row;
		for (i = 0; i < (instances ? instances.length : 0); i++) {
			row = instances[i];
			choices.push({
				kind: "lumetri-instance",
				title: row.displayName || LUMETRI_DISPLAY,
				subtitle: instanceSubtitle(row),
				componentIndex: row.componentIndex,
				displayName: row.displayName,
				matchName: row.matchName,
				temperature: row.temperature,
				saturation: row.saturation
			});
		}
		return choices;
	}

	function formatParameterChoices(matches, componentIndex) {
		var choices = [];
		var i;
		var row;
		var title;
		for (i = 0; i < (matches ? matches.length : 0); i++) {
			row = matches[i];
			title = row.section || row.displayName;
			choices.push({
				kind: "lumetri-parameter",
				title: title,
				subtitle: row.displayName + " · " + formatLiveNumber(row.currentValue),
				componentIndex: componentIndex,
				parameterIndex: row.parameterIndex,
				section: row.section || "",
				displayName: row.displayName,
				matchName: row.matchName || "",
				currentValue: row.currentValue
			});
		}
		return choices;
	}

	function findInstance(instances, componentIndex) {
		var i;
		for (i = 0; i < (instances ? instances.length : 0); i++) {
			if (instances[i].componentIndex === componentIndex) {
				return instances[i];
			}
		}
		return null;
	}

	function pickerResult(uiKind, extra) {
		var payload = {
			ok: false,
			useExistingResolve: false,
			uiKind: uiKind,
			reason: uiKind === CHOOSE_LUMETRI ? "NEEDS_LUMETRI_CHOICE" : "NEEDS_PARAMETER_CHOICE",
			settersCalled: false,
			verified: false,
			usedQE: false,
			choices: extra && extra.choices ? extra.choices : [],
			picker: {
				kind: uiKind,
				title: uiKind === CHOOSE_LUMETRI ? "CHOOSE LUMETRI" : "CHOOSE PARAMETER",
				componentIndexIsTemporary: true
			}
		};
		var key;
		if (extra) {
			for (key in extra) {
				if (extra.hasOwnProperty(key) && key !== "choices") {
					payload[key] = extra[key];
				}
			}
			if (extra.choices) {
				payload.choices = extra.choices;
			}
		}
		return payload;
	}

	function staleResult(uiKind, detail) {
		return {
			ok: false,
			useExistingResolve: false,
			uiKind: uiKind,
			reason: uiKind === STALE_PARAMETER ? "NEEDS_PARAMETER_CHOICE" : "NEEDS_LUMETRI_CHOICE",
			detail: detail || "That Lumetri Color effect is no longer on this clip.",
			settersCalled: false,
			verified: false,
			usedQE: false,
			choices: []
		};
	}

	function writePlan(match, instance) {
		return {
			ok: true,
			useExistingResolve: false,
			reResolved: true,
			effect: {
				displayName: instance.displayName,
				matchName: instance.matchName
			},
			parameter: {
				displayName: match.displayName,
				matchName: match.matchName || "",
				section: match.section || "",
				parameterIndex: match.parameterIndex
			},
			componentIndex: instance.componentIndex,
			parameterIndex: match.parameterIndex,
			_param: match._param,
			_component: instance._component
		};
	}

	function plan(trackItem, ident, targeting) {
		var instances;
		var instance;
		var matches;
		var filtered;
		var wantedName;
		targeting = targeting || {};
		ident = ident || {};
		wantedName = trimmed(ident.parameterDisplayName || ident.parameter || "");
		instances = listInstances(trackItem);

		if (targeting.componentIndex !== undefined) {
			instance = findInstance(instances, targeting.componentIndex);
			if (!instance) {
				return staleResult(STALE_LUMETRI, "That Lumetri Color effect is no longer on this clip.");
			}
		} else if (instances.length === 0) {
			return { ok: false, useExistingResolve: true };
		} else if (instances.length > 1) {
			return pickerResult(CHOOSE_LUMETRI, {
				choices: formatInstanceChoices(instances),
				componentMatchCount: instances.length,
				matchCount: instances.length,
				detail: 'Component identity "' + LUMETRI_DISPLAY + '" / "' + LUMETRI_MATCH +
					'" is ambiguous across ' + instances.length + " components."
			});
		} else {
			instance = instances[0];
		}

		if (targeting.parameterIndex !== undefined) {
			filtered = resolveAtIndex(instance._component, targeting.parameterIndex, wantedName);
			if (!filtered) {
				return staleResult(STALE_PARAMETER, "That Lumetri parameter is no longer on this clip.");
			}
			return writePlan(filtered, instance);
		}
		matches = listNumericParams(instance._component, wantedName);
		if (matches.length > 1) {
			return pickerResult(CHOOSE_PARAMETER, {
				choices: formatParameterChoices(matches, instance.componentIndex),
				componentMatchCount: 1,
				matchCount: matches.length,
				componentIndex: instance.componentIndex,
				detail: 'Parameter displayName "' + wantedName +
					'" is ambiguous across ' + matches.length + ' parameters inside component "' +
					instance.displayName + '" / "' + instance.matchName + '".'
			});
		}
		if (matches.length === 1) {
			if (targeting.componentIndex !== undefined) {
				return writePlan(matches[0], instance);
			}
			return { ok: false, useExistingResolve: true };
		}
		if (targeting.componentIndex !== undefined) {
			return {
				ok: false,
				useExistingResolve: false,
				reason: "PARAMETER_NOT_FOUND",
				detail: 'No parameter with displayName "' + wantedName +
					'" inside component "' + instance.displayName + '" / "' + instance.matchName + '".',
				settersCalled: false,
				componentMatchCount: 1,
				matchCount: 0
			};
		}
		return { ok: false, useExistingResolve: true };
	}

	function applyTargetingToSpec(spec, choice, stage) {
		var next = copyObject(spec);
		if (!choice) {
			return next;
		}
		if (stage === CHOOSE_LUMETRI || choice.kind === "lumetri-instance") {
			next.lumetriComponentIndex = choice.componentIndex;
		}
		if (stage === CHOOSE_PARAMETER || choice.kind === "lumetri-parameter") {
			if (typeof choice.componentIndex === "number") {
				next.lumetriComponentIndex = choice.componentIndex;
			}
			next.lumetriParameterIndex = choice.parameterIndex;
		}
		return next;
	}

	function createSession(payload, clipCmd) {
		var selected = 0;
		var active = true;
		var stage = payload && payload.uiKind ? payload.uiKind : CHOOSE_LUMETRI;
		var choices = payload && payload.choices ? payload.choices : [];

		function clampIndex(index) {
			if (!choices.length) {
				return 0;
			}
			if (index < 0) {
				return choices.length - 1;
			}
			if (index >= choices.length) {
				return 0;
			}
			return index;
		}

		return {
			stage: stage,
			choices: choices,
			clipCmd: clipCmd,
			sectionTitle: stage === CHOOSE_PARAMETER ? "CHOOSE PARAMETER" : "CHOOSE LUMETRI",
			selectedIndex: function () {
				return selected;
			},
			selectedChoice: function () {
				return choices[selected] || null;
			},
			isActive: function () {
				return active === true;
			},
			move: function (delta) {
				if (!active || !choices.length) {
					return selected;
				}
				selected = clampIndex(selected + (typeof delta === "number" ? delta : 0));
				return selected;
			},
			selectIndex: function (index) {
				selected = clampIndex(index);
				return selected;
			},
			confirm: function () {
				var choice;
				if (!active) {
					return { cancelled: true, settersCalled: false };
				}
				choice = choices[selected];
				active = false;
				if (!choice) {
					return { cancelled: true, settersCalled: false };
				}
				return {
					cancelled: false,
					settersCalled: false,
					choice: choice,
					clipCmd: applyTargetingToSpec(clipCmd, choice, stage)
				};
			},
			cancel: function () {
				active = false;
				return {
					cancelled: true,
					settersCalled: false
				};
			}
		};
	}

	return {
		CHOOSE_LUMETRI: CHOOSE_LUMETRI,
		CHOOSE_PARAMETER: CHOOSE_PARAMETER,
		STALE_LUMETRI: STALE_LUMETRI,
		STALE_PARAMETER: STALE_PARAMETER,
		LUMETRI_DISPLAY: LUMETRI_DISPLAY,
		LUMETRI_MATCH: LUMETRI_MATCH,
		isPickerUiKind: isPickerUiKind,
		isPickerPayload: isPickerPayload,
		targetingFromInput: targetingFromInput,
		listInstances: listInstances,
		listNumericParams: listNumericParams,
		inferSection: inferSection,
		formatInstanceChoices: formatInstanceChoices,
		formatParameterChoices: formatParameterChoices,
		formatLiveNumber: formatLiveNumber,
		plan: plan,
		applyTargetingToSpec: applyTargetingToSpec,
		createSession: createSession
	};
}());

if (typeof $ !== "undefined") {
	$._pickfxLumetriPicker = LumetriPicker;
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = LumetriPicker;
}
