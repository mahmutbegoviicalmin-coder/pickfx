var MotionParameterInspect = (function () {
	function resolver() {
		if (typeof $._pickfxParameterResolver !== "undefined") {
			return $._pickfxParameterResolver;
		}
		return null;
	}

	function typeOfFn(obj, name) {
		try {
			return typeof obj[name];
		} catch (e) {
			return "threw:" + String(e);
		}
	}

	function callBool(obj, name) {
		try {
			if (typeof obj[name] !== "function") {
				return { available: false, typeofValue: typeof obj[name] };
			}
			return { available: true, typeofValue: "function", value: !!obj[name]() };
		} catch (e) {
			return { available: true, typeofValue: "function", error: String(e) };
		}
	}

	function classifyValue(value, getErr) {
		var detected;
		if (getErr) {
			return { runtimeType: "error", error: getErr };
		}
		if (typeof ParameterValueType !== "undefined" && ParameterValueType.detect) {
			detected = ParameterValueType.detect(value);
			if (detected) {
				return {
					runtimeType: detected.type || "unknown",
					value: detected.value,
					shape: detected.shape,
					constructorName: detected.constructorName
				};
			}
		}
		if (value === undefined) {
			return { runtimeType: "unknown" };
		}
		try {
			return { runtimeType: typeof value, value: value };
		} catch (e) {
			return { runtimeType: "error", error: String(e) };
		}
	}

	function inspectParam(res, param, index) {
		var displayName;
		var getValue;
		var getErr;
		var classified;
		var dump;
		var identity;
		var safe;
		displayName = res.readString(param, "displayName") || "";
		getErr = "";
		getValue = undefined;
		try {
			getValue = param.getValue();
		} catch (e) {
			getErr = String(e);
		}
		classified = classifyValue(getValue, getErr);
		if (res.inspectSafeValue) {
			try {
				safe = res.inspectSafeValue(getValue);
			} catch (ignoreSafe) {
				safe = null;
			}
		}
		identity = res.inspectIdentity ? res.inspectIdentity(param) : undefined;
		dump = null;
		try {
			if (res.inspectHostObject) {
				dump = res.inspectHostObject(param, res.inspectParamCandidates ? res.inspectParamCandidates() : []);
			}
		} catch (ignoreDump) {}
		return {
			displayName: displayName,
			index: index,
			runtimeType: classified.runtimeType,
			value: classified.value,
			getValueAvailable: typeOfFn(param, "getValue") === "function",
			setValueAvailable: typeOfFn(param, "setValue") === "function",
			typeofGetValue: typeOfFn(param, "getValue"),
			typeofSetValue: typeOfFn(param, "setValue"),
			typeofGetValueAtTime: typeOfFn(param, "getValueAtTime"),
			typeofSetValueAtKey: typeOfFn(param, "setValueAtKey"),
			typeofAreKeyframesSupported: typeOfFn(param, "areKeyframesSupported"),
			typeofIsTimeVarying: typeOfFn(param, "isTimeVarying"),
			keyframesSupported: callBool(param, "areKeyframesSupported"),
			timeVarying: callBool(param, "isTimeVarying"),
			constructorName: classified.constructorName || (safe && safe.constructorName) || "",
			getValueInspect: safe,
			identity: identity,
			objectKeys: dump ? dump.objectKeys : [],
			ownPropertyNames: dump ? dump.ownPropertyNames : [],
			prototypeChain: dump ? dump.prototypeChain : [],
			settersCalled: false
		};
	}

	function inspect(trackItem) {
		var res = resolver();
		var mediaType;
		var components;
		var countInfo;
		var indexBase;
		var i;
		var component;
		var displayName;
		var matchName;
		var props;
		var propertyCount;
		var propertyBase;
		var p;
		var param;
		var rows;
		var out;
		if (!res) {
			return {
				ok: false,
				reason: "EFFECT_NOT_FOUND",
				detail: "ParameterResolver is not loaded.",
				settersCalled: false,
				usedQE: false
			};
		}
		if (!trackItem) {
			return {
				ok: false,
				reason: "NO_VIDEO_SELECTION",
				detail: "No TrackItem was provided.",
				settersCalled: false,
				usedQE: false
			};
		}
		mediaType = res.readString(trackItem, "mediaType");
		if (mediaType !== "Video") {
			return {
				ok: false,
				reason: "NO_VIDEO_SELECTION",
				detail: "TrackItem.mediaType is " + String(mediaType) + ", expected Video.",
				settersCalled: false,
				usedQE: false
			};
		}
		try {
			components = trackItem.components;
		} catch (compErr) {
			return {
				ok: false,
				reason: "EFFECT_NOT_FOUND",
				detail: "TrackItem.components threw: " + String(compErr),
				settersCalled: false,
				usedQE: false
			};
		}
		countInfo = res.collectionCount(components);
		if (countInfo.count < 0) {
			return {
				ok: false,
				reason: "EFFECT_NOT_FOUND",
				detail: "Could not read components.",
				settersCalled: false,
				usedQE: false
			};
		}
		indexBase = res.collectionIndexBase(components, countInfo.count);
		out = [];
		for (i = 0; i < countInfo.count; i++) {
			component = res.collectionItem(components, i, indexBase);
			displayName = res.readString(component, "displayName") || "";
			matchName = res.readString(component, "matchName") || "";
			try {
				props = component.properties;
			} catch (ignoreProps) {
				out.push({
					component: {
						displayName: displayName,
						matchName: matchName,
						paramCount: 0
					},
					parameters: [],
					error: "Component.properties threw."
				});
				continue;
			}
			propertyCount = res.collectionCount(props);
			propertyBase = res.collectionIndexBase(props, propertyCount.count);
			rows = [];
			for (p = 0; p < propertyCount.count; p++) {
				param = res.collectionItem(props, p, propertyBase);
				rows.push(inspectParam(res, param, p));
			}
			out.push({
				component: {
					displayName: displayName,
					matchName: matchName,
					paramCount: propertyCount.count < 0 ? rows.length : propertyCount.count
				},
				parameters: rows
			});
		}
		return {
			ok: true,
			clip: {
				name: res.readString(trackItem, "name") || "",
				mediaType: mediaType
			},
			components: out,
			settersCalled: false,
			usedQE: false,
			confirmation: "LIVE_PREMIERE_READ"
		};
	}

	function findByDisplayName(trackItem, wantedName) {
		var wanted = String(wantedName || "").replace(/^\s+|\s+$/g, "");
		var inspected;
		var matches;
		var c;
		var p;
		var component;
		var param;
		if (!wanted) {
			return {
				ok: false,
				reason: "PARAMETER_NOT_FOUND",
				detail: "Parameter displayName is required.",
				query: wanted,
				matches: [],
				settersCalled: false,
				usedQE: false
			};
		}
		inspected = inspect(trackItem);
		if (!inspected || !inspected.ok) {
			if (inspected) {
				inspected.query = wanted;
				inspected.matches = inspected.matches || [];
				inspected.settersCalled = false;
				inspected.usedQE = false;
			}
			return inspected || {
				ok: false,
				reason: "PARAMETER_NOT_FOUND",
				detail: "Inspect failed.",
				query: wanted,
				matches: [],
				settersCalled: false,
				usedQE: false
			};
		}
		matches = [];
		for (c = 0; c < inspected.components.length; c++) {
			component = inspected.components[c];
			if (!component || !component.parameters) {
				continue;
			}
			for (p = 0; p < component.parameters.length; p++) {
				param = component.parameters[p];
				if (!param || param.displayName !== wanted) {
					continue;
				}
				matches.push({
					componentDisplayName: component.component ? component.component.displayName : "",
					componentMatchName: component.component ? component.component.matchName : "",
					parameterDisplayName: param.displayName,
					runtimeType: param.runtimeType,
					getValue: param.value,
					setValueAvailable: param.setValueAvailable === true,
					timeVarying: param.timeVarying,
					diagnosticIndex: param.index
				});
			}
		}
		if (!matches.length) {
			return {
				ok: false,
				reason: "PARAMETER_NOT_FOUND",
				detail: 'No property with displayName "' + wanted + '".',
				query: wanted,
				clip: inspected.clip,
				matches: [],
				settersCalled: false,
				usedQE: false,
				confirmation: "LIVE_PREMIERE_READ"
			};
		}
		return {
			ok: true,
			query: wanted,
			clip: inspected.clip,
			matches: matches,
			settersCalled: false,
			usedQE: false,
			confirmation: "LIVE_PREMIERE_READ"
		};
	}

	return {
		inspect: inspect,
		findByDisplayName: findByDisplayName
	};
}());

if (typeof $ !== "undefined") {
	$._pickfxMotionParameterInspect = MotionParameterInspect;
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = MotionParameterInspect;
}
