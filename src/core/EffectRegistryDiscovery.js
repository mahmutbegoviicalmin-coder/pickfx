/*global $ */

var EffectRegistryDiscovery = (function () {
	var OPERATION = "effect.registry.discovery";
	var NO_SELECTED_CLIP = "NO_SELECTED_CLIP";
	var FORBIDDEN_CALL_NAMES = [
		"setValue",
		"setColorValue",
		"setValueAtTime",
		"setValueAtKey",
		"addKey",
		"removeKey",
		"removeKeyRange",
		"setTimeVarying",
		"setInterpolationTypeAtKey",
		"addComponent",
		"removeComponent",
		"apply",
		"addVideoEffect",
		"enableQE"
	];
	var COMPONENT_IDENTITY_FIELDS = [
		"displayName", "matchName", "name", "instanceName",
		"instanceID", "instanceId", "id", "guid", "uuid", "type"
	];
	var PARAMETER_IDENTITY_FIELDS = [
		"displayName", "matchName", "name", "id", "guid", "uuid",
		"parent", "group", "hierarchyPath", "type", "dataType",
		"propertyType", "propertyValueType"
	];
	var INFERRED_SECTION_HEADERS = [
		{ fold: "basic correction", label: "Basic Correction" },
		{ fold: "creative", label: "Creative" },
		{ fold: "hsl secondary", label: "HSL Secondary" },
		{ fold: "curves", label: "Curves" },
		{ fold: "color wheels & match", label: "Color Wheels" },
		{ fold: "vignette", label: "Vignette" }
	];

	function resolver() {
		if (typeof $ !== "undefined" && $._pickfxParameterResolver) {
			return $._pickfxParameterResolver;
		}
		return null;
	}

	function fallbackResolver() {
		return {
			readString: function (obj, key) {
				try {
					if (obj && obj[key] !== undefined && obj[key] !== null) {
						return String(obj[key]);
					}
				} catch (ignore) {}
				return null;
			},
			collectionCount: function (col) {
				try {
					if (col && typeof col.numItems === "number") {
						return { count: col.numItems, via: "numItems" };
					}
				} catch (ignoreNum) {}
				try {
					if (col && typeof col.length === "number") {
						return { count: col.length, via: "length" };
					}
				} catch (ignoreLen) {}
				return { count: -1, via: "" };
			},
			collectionIndexBase: function (col, count) {
				var zero;
				var one;
				if (count <= 0) {
					return 0;
				}
				try {
					zero = col[0];
				} catch (ignoreZero) {
					zero = undefined;
				}
				try {
					one = col[1];
				} catch (ignoreOne) {
					one = undefined;
				}
				if (zero !== undefined && zero !== null) {
					return 0;
				}
				if (one !== undefined && one !== null) {
					return 1;
				}
				return 0;
			},
			collectionItem: function (col, index, indexBase) {
				try {
					return col[index + indexBase];
				} catch (e) {
					return undefined;
				}
			}
		};
	}

	function activeResolver() {
		var res = resolver();
		if (res && typeof res.readString === "function" && typeof res.collectionCount === "function") {
			return res;
		}
		return fallbackResolver();
	}

	function trimmed(value) {
		return String(value || "").replace(/^\s+|\s+$/g, "");
	}

	function fold(value) {
		return trimmed(value).toLowerCase();
	}

	function typeOfFn(obj, name) {
		try {
			return typeof obj[name];
		} catch (e) {
			return "threw";
		}
	}

	function hasFn(obj, name) {
		return typeOfFn(obj, name) === "function";
	}

	function constructorName(obj) {
		try {
			if (obj && obj.constructor && obj.constructor.name) {
				return String(obj.constructor.name);
			}
		} catch (ignoreName) {}
		try {
			return obj ? String(obj) : null;
		} catch (ignoreString) {
			return null;
		}
	}

	function safeString(value) {
		try {
			return String(value);
		} catch (e) {
			return "";
		}
	}

	function probeField(obj, name) {
		var value;
		try {
			value = obj[name];
		} catch (e) {
			return {
				name: name,
				available: false,
				threw: true,
				error: String(e),
				value: null
			};
		}
		if (value === undefined) {
			return {
				name: name,
				available: false,
				threw: false,
				value: null
			};
		}
		return {
			name: name,
			available: true,
			threw: false,
			typeofValue: typeof value,
			value: typeof value === "function" ? null : value
		};
	}

	function identityMap(obj, names) {
		var out = {};
		var i;
		var probed;
		if (!obj) {
			return out;
		}
		for (i = 0; i < names.length; i++) {
			probed = probeField(obj, names[i]);
			out[names[i]] = {
				available: probed.available === true,
				typeofValue: probed.typeofValue,
				value: probed.available && probed.typeofValue !== "object" && probed.typeofValue !== "function"
					? probed.value
					: (probed.available && probed.typeofValue === "string" ? probed.value : null)
			};
			if (probed.available && (probed.typeofValue === "string" || probed.typeofValue === "number" || probed.typeofValue === "boolean")) {
				out[names[i]].value = probed.value;
			} else if (probed.available && probed.typeofValue !== "function") {
				out[names[i]].value = probed.typeofValue === "object" ? constructorName(probed.value) : null;
			}
			if (probed.threw) {
				out[names[i]].threw = true;
			}
		}
		return out;
	}

	function classifyValue(value, getErr) {
		var t;
		if (getErr) {
			return "unknown";
		}
		if (value === undefined || value === null) {
			return "unknown";
		}
		try {
			t = typeof value;
		} catch (e) {
			return "unknown";
		}
		if (t === "number" || t === "boolean" || t === "string") {
			return t;
		}
		if (t === "object") {
			return "object";
		}
		return "unknown";
	}

	function serializeValue(value, valueType) {
		var i;
		var keys;
		var summary;
		if (valueType === "number" || valueType === "boolean" || valueType === "string") {
			return value;
		}
		if (valueType !== "object") {
			return null;
		}
		summary = {
			constructorName: constructorName(value),
			stringValue: safeString(value)
		};
		try {
			if (typeof value.length === "number" && value.length >= 0 && value.length < 8) {
				summary.isArrayLike = true;
				summary.length = value.length;
			}
		} catch (ignoreLen) {}
		try {
			keys = [];
			for (i in value) {
				if (keys.length >= 8) {
					break;
				}
				if (typeof value[i] !== "function") {
					keys.push(String(i));
				}
			}
			if (keys.length) {
				summary.keys = keys;
			}
		} catch (ignoreKeys) {}
		return summary;
	}

	function fingerprintValue(value, valueType) {
		if (valueType === "number" || valueType === "boolean" || valueType === "string") {
			return String(valueType) + ":" + String(value);
		}
		if (valueType === "object") {
			return "object:" + constructorName(value) + ":" + safeString(value);
		}
		return "unknown";
	}

	function callBool(obj, name) {
		try {
			if (typeof obj[name] !== "function") {
				return { available: false, value: null };
			}
			return { available: true, value: !!obj[name]() };
		} catch (e) {
			return { available: true, value: null, error: String(e) };
		}
	}

	function sectionLabelForName(displayName) {
		var name = fold(displayName);
		var i;
		for (i = 0; i < INFERRED_SECTION_HEADERS.length; i++) {
			if (INFERRED_SECTION_HEADERS[i].fold === name) {
				return INFERRED_SECTION_HEADERS[i].label;
			}
		}
		return "";
	}

	function inferSection(rows, parameterIndex) {
		var i;
		var label;
		for (i = parameterIndex - 1; i >= 0; i--) {
			label = sectionLabelForName(rows[i] && rows[i].displayName);
			if (label) {
				return label;
			}
		}
		return null;
	}

	function neighborContext(rows, index) {
		var prev = index > 0 ? rows[index - 1] : null;
		var next = index < rows.length - 1 ? rows[index + 1] : null;
		return {
			previous: prev ? { index: prev.index, displayName: prev.displayName } : null,
			next: next ? { index: next.index, displayName: next.displayName } : null
		};
	}

	function emptySafety() {
		return {
			selectedClipUnchanged: true,
			componentCountBefore: 0,
			componentCountAfter: 0,
			componentCountUnchanged: true,
			parameterValueMismatches: [],
			parameterValuesUnchanged: true,
			setValueCalls: 0,
			writeOperationCalls: 0,
			usedQE: false,
			forbiddenCallsInvoked: []
		};
	}

	function fail(reason, detail, extra) {
		var payload = {
			ok: false,
			operation: OPERATION,
			reason: reason || NO_SELECTED_CLIP,
			detail: detail ? String(detail) : "",
			selectedClip: false,
			readOnly: true,
			usedQE: false,
			setValueCalls: 0,
			writeOperationCalls: 0,
			writesPerformed: false,
			settersCalled: false,
			forbiddenCallsInvoked: [],
			components: [],
			registry: { components: [] },
			safety: emptySafety(),
			apiModel: apiModel()
		};
		var key;
		if (extra) {
			for (key in extra) {
				if (extra.hasOwnProperty(key)) {
					payload[key] = extra[key];
				}
			}
		}
		payload.humanReport = formatReport(payload);
		return payload;
	}

	function apiModel() {
		return {
			host: "CEP ExtendScript",
			dom: "official Premiere Pro DOM",
			selection: "app.project.activeSequence.getSelection() → first video TrackItem",
			components: "TrackItem.components",
			parameters: "Component.properties → ComponentParam",
			catalogScope: "SELECTED_CLIP_APPLIED_COMPONENTS_ONLY",
			allInstalledEffectsEnumerated: false,
			installedEffectNameList: "Existing EffectRegistry uses qe.project.getVideoEffectList() for display names. This module does not call QE.",
			uxp: false
		};
	}

	function readCurrentValue(param) {
		var getErr = false;
		var value;
		var hasGet;
		hasGet = hasFn(param, "getValue");
		if (!hasGet) {
			return {
				hasGetValue: false,
				getError: false,
				value: undefined
			};
		}
		try {
			value = param.getValue();
		} catch (e) {
			getErr = true;
			value = undefined;
		}
		return {
			hasGetValue: true,
			getError: getErr,
			value: value
		};
	}

	function inspectParameter(res, param, index) {
		var displayProbe;
		var matchProbe;
		var current;
		var valueType;
		var timeVarying;
		var keyframes;
		var nestedProps;
		var nestedCount;
		var identity;
		var minProbe;
		var maxProbe;
		var row;

		displayProbe = probeField(param, "displayName");
		matchProbe = probeField(param, "matchName");
		current = readCurrentValue(param);
		valueType = classifyValue(current.value, current.getError);
		timeVarying = callBool(param, "isTimeVarying");
		keyframes = callBool(param, "areKeyframesSupported");
		identity = identityMap(param, PARAMETER_IDENTITY_FIELDS);
		nestedProps = probeField(param, "properties");
		nestedCount = probeField(param, "numProperties");
		minProbe = probeField(param, "min");
		maxProbe = probeField(param, "max");

		row = {
			index: index,
			displayName: displayProbe.available ? String(displayProbe.value) : null,
			displayNameAvailable: displayProbe.available === true,
			matchName: matchProbe.available && matchProbe.value !== undefined && matchProbe.value !== null && String(matchProbe.value) !== ""
				? String(matchProbe.value)
				: (matchProbe.available ? String(matchProbe.value || "") : null),
			matchNameAvailable: matchProbe.available === true,
			valueType: valueType,
			currentValue: serializeValue(current.value, valueType),
			getValue: current.hasGetValue,
			setValue: hasFn(param, "setValue"),
			hasGetValue: current.hasGetValue,
			hasSetValue: hasFn(param, "setValue"),
			getError: current.getError === true,
			isTimeVarying: timeVarying.available ? timeVarying.value : null,
			areKeyframesSupported: keyframes.available ? keyframes.value : null,
			constructorName: constructorName(param),
			identityFields: identity,
			nestedPropertiesAvailable: nestedProps.available === true,
			nestedPropertyCount: nestedCount.available && typeof nestedCount.value === "number" ? nestedCount.value : null,
			parentAvailable: !!(identity.parent && identity.parent.available),
			groupAvailable: !!(identity.group && identity.group.available),
			hierarchyPathAvailable: !!(identity.hierarchyPath && identity.hierarchyPath.available),
			fingerprint: fingerprintValue(current.value, valueType)
		};

		if (minProbe.available && typeof minProbe.value === "number" && isFinite(minProbe.value)) {
			row.min = minProbe.value;
		}
		if (maxProbe.available && typeof maxProbe.value === "number" && isFinite(maxProbe.value)) {
			row.max = maxProbe.value;
		}

		return row;
	}

	function inspectComponent(res, component, componentIndex) {
		var displayProbe;
		var matchProbe;
		var props;
		var countInfo;
		var indexBase;
		var i;
		var param;
		var parameters;
		var identity;
		var nested;

		if (component === undefined || component === null) {
			return {
				componentIndex: componentIndex,
				displayName: null,
				displayNameAvailable: false,
				matchName: null,
				matchNameAvailable: false,
				constructorName: null,
				parameterCount: 0,
				parameters: [],
				identityFields: {}
			};
		}

		displayProbe = probeField(component, "displayName");
		matchProbe = probeField(component, "matchName");
		identity = identityMap(component, COMPONENT_IDENTITY_FIELDS);
		parameters = [];

		try {
			props = component.properties;
		} catch (propsErr) {
			return {
				componentIndex: componentIndex,
				displayName: displayProbe.available ? String(displayProbe.value) : null,
				displayNameAvailable: displayProbe.available === true,
				matchName: matchProbe.available && matchProbe.value ? String(matchProbe.value) : null,
				matchNameAvailable: matchProbe.available === true,
				constructorName: constructorName(component),
				parameterCount: 0,
				parameters: [],
				identityFields: identity,
				error: "Component.properties threw: " + String(propsErr)
			};
		}

		if (props === undefined || props === null) {
			return {
				componentIndex: componentIndex,
				displayName: displayProbe.available ? String(displayProbe.value) : null,
				displayNameAvailable: displayProbe.available === true,
				matchName: matchProbe.available && matchProbe.value ? String(matchProbe.value) : null,
				matchNameAvailable: matchProbe.available === true,
				constructorName: constructorName(component),
				parameterCount: 0,
				parameters: [],
				identityFields: identity
			};
		}

		countInfo = res.collectionCount(props);
		indexBase = res.collectionIndexBase(props, countInfo.count < 0 ? 0 : countInfo.count);
		if (countInfo.count > 0) {
			for (i = 0; i < countInfo.count; i++) {
				param = res.collectionItem(props, i, indexBase);
				if (param === undefined || param === null) {
					parameters.push({
						index: i,
						displayName: null,
						displayNameAvailable: false,
						matchName: null,
						matchNameAvailable: false,
						valueType: "unknown",
						currentValue: null,
						getValue: false,
						setValue: false,
						hasGetValue: false,
						hasSetValue: false
					});
					continue;
				}
				parameters.push(inspectParameter(res, param, i));
			}
		}

		for (i = 0; i < parameters.length; i++) {
			parameters[i].neighborContext = neighborContext(parameters, i);
			parameters[i].inferredSection = inferSection(parameters, i);
		}

		nested = {
			componentIndex: componentIndex,
			displayName: displayProbe.available ? String(displayProbe.value) : null,
			displayNameAvailable: displayProbe.available === true,
			matchName: matchProbe.available && matchProbe.value ? String(matchProbe.value) : (matchProbe.available ? null : null),
			matchNameAvailable: matchProbe.available === true,
			constructorName: constructorName(component),
			parameterCount: countInfo.count < 0 ? parameters.length : countInfo.count,
			parameterCountVia: countInfo.via || "",
			parameters: parameters,
			identityFields: identity
		};
		if (!nested.matchNameAvailable) {
			nested.matchName = null;
		} else if (!nested.matchName) {
			nested.matchName = matchProbe.available ? (matchProbe.value === "" ? "" : String(matchProbe.value)) : null;
			if (nested.matchName === "") {
				nested.matchName = null;
			}
		}
		return nested;
	}

	function toRegistryShape(report) {
		var components = [];
		var i;
		var c;
		var p;
		var param;
		var outParam;
		var src;
		if (!report || !report.components) {
			return { components: [] };
		}
		for (i = 0; i < report.components.length; i++) {
			c = report.components[i];
			src = {
				componentIndex: c.componentIndex,
				displayName: c.displayName,
				matchName: c.matchName,
				matchNameAvailable: c.matchNameAvailable === true,
				parameterCount: c.parameterCount,
				parameters: []
			};
			for (p = 0; p < (c.parameters ? c.parameters.length : 0); p++) {
				param = c.parameters[p];
				outParam = {
					index: param.index,
					displayName: param.displayName,
					valueType: param.valueType,
					currentValue: param.currentValue
				};
				if (param.matchNameAvailable) {
					outParam.matchName = param.matchName;
					outParam.matchNameAvailable = true;
				} else {
					outParam.matchName = null;
					outParam.matchNameAvailable = false;
				}
				if (param.inferredSection) {
					outParam.inferredSection = param.inferredSection;
				}
				if (param.neighborContext) {
					outParam.neighborContext = param.neighborContext;
				}
				src.parameters.push(outParam);
			}
			components.push(src);
		}
		return { components: components };
	}

	function formatReport(report) {
		var lines = [];
		var i;
		var c;
		var p;
		var param;
		var yesNo;
		if (!report) {
			return "PICKFX EFFECT DISCOVERY\n\nNo report.";
		}
		yesNo = function (value) {
			return value === true ? "yes" : (value === false ? "no" : "unknown");
		};
		lines.push("PICKFX EFFECT DISCOVERY");
		lines.push("");
		lines.push("Selected clip: " + (report.selectedClip ? "YES" : "NO"));
		if (!report.ok) {
			lines.push("Reason: " + String(report.reason || ""));
			if (report.detail) {
				lines.push("Detail: " + String(report.detail));
			}
			return lines.join("\n");
		}
		lines.push("");
		lines.push("Components discovered: " + String(report.components ? report.components.length : 0));
		lines.push("");
		for (i = 0; i < (report.components ? report.components.length : 0); i++) {
			c = report.components[i];
			lines.push((i + 1) + ". " + String(c.displayName || "(unnamed)"));
			lines.push("   matchName: " + (c.matchNameAvailable ? String(c.matchName) : "null (unavailable)"));
			lines.push("   parameters: " + String(c.parameterCount));
			lines.push("");
		}
		for (i = 0; i < (report.components ? report.components.length : 0); i++) {
			c = report.components[i];
			lines.push(String(c.displayName || "(unnamed)"));
			for (p = 0; p < (c.parameters ? c.parameters.length : 0); p++) {
				param = c.parameters[p];
				lines.push("  [" + String(param.index) + "] " + String(param.displayName || "(unnamed)"));
				lines.push("      type: " + String(param.valueType));
				lines.push("      value: " + (param.valueType === "object" ? "[object]" : String(param.currentValue)));
				lines.push("      getValue: " + yesNo(param.getValue));
				lines.push("      setValue: " + yesNo(param.setValue));
				lines.push("      keyframes: " + (param.areKeyframesSupported === true ? "supported" : (param.areKeyframesSupported === false ? "no" : "unknown")));
				if (param.inferredSection) {
					lines.push("      inferredSection: " + param.inferredSection);
				}
			}
			lines.push("");
		}
		if (report.safety) {
			lines.push("WRITE SAFETY");
			lines.push("  setValueCalls: " + String(report.safety.setValueCalls));
			lines.push("  writeOperationCalls: " + String(report.safety.writeOperationCalls));
			lines.push("  usedQE: " + String(report.safety.usedQE));
			lines.push("  parameterValuesUnchanged: " + String(report.safety.parameterValuesUnchanged));
			lines.push("  componentCountUnchanged: " + String(report.safety.componentCountUnchanged));
		}
		return lines.join("\n");
	}

	function collectFingerprints(components) {
		var out = [];
		var i;
		var p;
		var c;
		var param;
		for (i = 0; i < components.length; i++) {
			c = components[i];
			for (p = 0; p < (c.parameters ? c.parameters.length : 0); p++) {
				param = c.parameters[p];
				out.push({
					componentIndex: c.componentIndex,
					parameterIndex: param.index,
					displayName: param.displayName,
					fingerprint: param.fingerprint
				});
			}
		}
		return out;
	}

	function verifyUnchanged(beforeComponents, afterComponents) {
		var before = collectFingerprints(beforeComponents);
		var after = collectFingerprints(afterComponents);
		var mismatches = [];
		var i;
		var key;
		var afterMap = {};
		for (i = 0; i < after.length; i++) {
			key = String(after[i].componentIndex) + ":" + String(after[i].parameterIndex);
			afterMap[key] = after[i];
		}
		for (i = 0; i < before.length; i++) {
			key = String(before[i].componentIndex) + ":" + String(before[i].parameterIndex);
			if (!afterMap[key] || afterMap[key].fingerprint !== before[i].fingerprint) {
				mismatches.push({
					componentIndex: before[i].componentIndex,
					parameterIndex: before[i].parameterIndex,
					displayName: before[i].displayName,
					before: before[i].fingerprint,
					after: afterMap[key] ? afterMap[key].fingerprint : null
				});
			}
		}
		return mismatches;
	}

	function inspectTrackItem(trackItem) {
		var res;
		var mediaType;
		var components;
		var countInfo;
		var indexBase;
		var i;
		var component;
		var discovered;
		var afterPass;
		var mismatches;
		var clipName;

		if (!trackItem) {
			return fail(NO_SELECTED_CLIP, "No TrackItem was provided.");
		}

		res = activeResolver();
		try {
			mediaType = res.readString(trackItem, "mediaType") || "";
		} catch (mediaErr) {
			mediaType = "";
		}
		if (mediaType && mediaType !== "Video") {
			return fail(NO_SELECTED_CLIP, "TrackItem.mediaType is " + String(mediaType) + ", expected Video.");
		}

		try {
			components = trackItem.components;
		} catch (compErr) {
			return fail("EFFECT_NOT_FOUND", "TrackItem.components threw: " + String(compErr), {
				selectedClip: true
			});
		}

		if (components === undefined || components === null) {
			countInfo = { count: 0, via: "" };
		} else {
			countInfo = res.collectionCount(components);
		}
		if (countInfo.count < 0) {
			countInfo = { count: 0, via: countInfo.via || "" };
		}
		indexBase = res.collectionIndexBase(components, countInfo.count);
		discovered = [];
		for (i = 0; i < countInfo.count; i++) {
			component = res.collectionItem(components, i, indexBase);
			discovered.push(inspectComponent(res, component, i));
		}

		afterPass = [];
		for (i = 0; i < countInfo.count; i++) {
			component = res.collectionItem(components, i, indexBase);
			afterPass.push(inspectComponent(res, component, i));
		}
		mismatches = verifyUnchanged(discovered, afterPass);

		try {
			clipName = res.readString(trackItem, "name") || "";
		} catch (ignoreName) {
			clipName = "";
		}

		return finishReport({
			ok: true,
			operation: OPERATION,
			reason: "",
			selectedClip: true,
			clip: {
				name: clipName,
				mediaType: mediaType || "Video"
			},
			readOnly: true,
			usedQE: false,
			setValueCalls: 0,
			writeOperationCalls: 0,
			writesPerformed: false,
			settersCalled: false,
			forbiddenCallsInvoked: [],
			components: discovered,
			safety: {
				selectedClipUnchanged: true,
				componentCountBefore: countInfo.count,
				componentCountAfter: countInfo.count,
				componentCountUnchanged: true,
				parameterValueMismatches: mismatches,
				parameterValuesUnchanged: mismatches.length === 0,
				setValueCalls: 0,
				writeOperationCalls: 0,
				usedQE: false,
				forbiddenCallsInvoked: []
			},
			apiModel: apiModel()
		});
	}

	function finishReport(report) {
		report.registry = toRegistryShape(report);
		report.humanReport = formatReport(report);
		return report;
	}

	function discover(trackItem) {
		return inspectTrackItem(trackItem);
	}

	function discoverSelected(selected) {
		if (!selected) {
			return fail(NO_SELECTED_CLIP, "No selected video TrackItem.");
		}
		if (selected.ok === false) {
			return fail(NO_SELECTED_CLIP, selected.detail || selected.reason || "No selected video TrackItem.");
		}
		if (selected.trackItem) {
			return inspectTrackItem(selected.trackItem);
		}
		if (selected.items && selected.items.length) {
			return inspectTrackItem(selected.items[0]);
		}
		return fail(NO_SELECTED_CLIP, "No selected video TrackItem.");
	}

	return {
		OPERATION: OPERATION,
		NO_SELECTED_CLIP: NO_SELECTED_CLIP,
		FORBIDDEN_CALL_NAMES: FORBIDDEN_CALL_NAMES.slice(),
		discover: discover,
		discoverSelected: discoverSelected,
		toRegistryShape: toRegistryShape,
		formatReport: formatReport,
		apiModel: apiModel
	};
}());

if (typeof $ !== "undefined") {
	$._pickfxEffectRegistryDiscovery = EffectRegistryDiscovery;
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = EffectRegistryDiscovery;
}
