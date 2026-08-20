var UniversalParameterInspect = (function () {
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

	function hasFn(obj, name) {
		return typeOfFn(obj, name) === "function";
	}

	function hasExposed(obj, name) {
		try {
			return obj[name] !== undefined && obj[name] !== null;
		} catch (e) {
			return false;
		}
	}

	function callBool(obj, name) {
		try {
			if (typeof obj[name] !== "function") {
				return { available: false, typeofValue: typeOfFn(obj, name) };
			}
			return { available: true, typeofValue: "function", value: !!obj[name]() };
		} catch (e) {
			return { available: true, typeofValue: "function", error: String(e) };
		}
	}

	function inspectParam(res, component, param, diagnosticIndex) {
		var displayName;
		var matchName;
		var getValue;
		var getErr;
		var detected;
		var timeVarying;
		var keyframes;
		var snapshot;
		var capability;
		displayName = res.readString(param, "displayName") || "";
		matchName = res.readString(param, "matchName") || "";
		getErr = false;
		getValue = undefined;
		try {
			if (hasFn(param, "getValue")) {
				getValue = param.getValue();
			}
		} catch (e) {
			getErr = true;
			getValue = undefined;
		}
		if (typeof ParameterValueType !== "undefined" && ParameterValueType.detectLive) {
			detected = ParameterValueType.detectLive(param, getValue);
		} else if (typeof ParameterValueType !== "undefined" && ParameterValueType.detect) {
			detected = ParameterValueType.detect(getValue);
		} else {
			detected = { type: typeof getValue, value: getValue };
		}
		timeVarying = callBool(param, "isTimeVarying");
		keyframes = callBool(param, "areKeyframesSupported");
		snapshot = {
			displayName: displayName,
			matchName: matchName,
			componentDisplayName: component.displayName,
			componentMatchName: component.matchName,
			runtimeType: detected && detected.type ? detected.type : "unknown",
			currentValue: detected ? detected.value : getValue,
			valueShape: detected ? detected.valueShape : undefined,
			hasGetValue: hasFn(param, "getValue"),
			hasSetValue: hasFn(param, "setValue"),
			hasSetColorValue: hasFn(param, "setColorValue"),
			hasGetColorValue: hasFn(param, "getColorValue"),
			hasGetValueAtTime: hasFn(param, "getValueAtTime"),
			hasSetValueAtKey: hasFn(param, "setValueAtKey"),
			hasItems: hasExposed(param, "items"),
			hasValueNames: hasExposed(param, "valueNames"),
			hasOptions: hasExposed(param, "options"),
			hasEnumItems: hasExposed(param, "enumItems"),
			hasListItems: hasExposed(param, "listItems"),
			hasGetItem: hasFn(param, "getItem"),
			hasGetListItem: hasFn(param, "getListItem"),
			hasGetValueName: hasFn(param, "getValueName"),
			hasGetValueNames: hasFn(param, "getValueNames"),
			hasGetOptions: hasFn(param, "getOptions"),
			areKeyframesSupported: keyframes.value === true,
			isTimeVarying: timeVarying.value === true,
			timeVarying: timeVarying.value === true,
			typeofGetValue: typeOfFn(param, "getValue"),
			typeofSetValue: typeOfFn(param, "setValue"),
			typeofGetColorValue: typeOfFn(param, "getColorValue"),
			typeofSetColorValue: typeOfFn(param, "setColorValue"),
			typeofGetValueAtTime: typeOfFn(param, "getValueAtTime"),
			typeofSetValueAtKey: typeOfFn(param, "setValueAtKey"),
			typeofAreKeyframesSupported: typeOfFn(param, "areKeyframesSupported"),
			typeofIsTimeVarying: typeOfFn(param, "isTimeVarying"),
			getError: getErr === true,
			parent: res.readString(param, "parent") || "",
			group: res.readString(param, "group") || "",
			diagnosticIndex: diagnosticIndex,
			settersCalled: false
		};
		try {
			if (typeof param.min === "number" && isFinite(param.min)) {
				snapshot.min = param.min;
			}
		} catch (ignoreMin) {}
		try {
			if (typeof param.max === "number" && isFinite(param.max)) {
				snapshot.max = param.max;
			}
		} catch (ignoreMax) {}
		if (typeof NumericCandidateClassifier !== "undefined" && NumericCandidateClassifier.hasEnumLikeMetadata) {
			snapshot.enumLike = NumericCandidateClassifier.hasEnumLikeMetadata(snapshot);
		}
		if (typeof ParameterCapability !== "undefined" && ParameterCapability.classify) {
			capability = ParameterCapability.classify(snapshot);
			snapshot.readable = capability.readable;
			snapshot.writable = capability.writable;
			snapshot.writableCandidate = capability.writableCandidate;
			snapshot.keyframeSupported = capability.keyframeSupported;
			snapshot.writeCapability = capability.writeCapability;
			snapshot.status = capability.status;
			snapshot.type = capability.type;
			snapshot.productionEnabled = capability.productionEnabled === true;
			snapshot.rejectionReason = capability.reason;
		}
		if (snapshot.type === undefined) {
			snapshot.type = snapshot.runtimeType;
		}
		if (snapshot.value === undefined) {
			snapshot.value = snapshot.currentValue;
		}
		if (snapshot.writable === undefined) {
			snapshot.writable = snapshot.hasSetValue === true;
		}
		return snapshot;
	}

	function inspectTrackItem(trackItem) {
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
		var flat;
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
		flat = [];
		for (i = 0; i < countInfo.count; i++) {
			component = res.collectionItem(components, i, indexBase);
			displayName = res.readString(component, "displayName") || "";
			matchName = res.readString(component, "matchName") || "";
			try {
				props = component.properties;
			} catch (ignoreProps) {
				out.push({
					displayName: displayName,
					matchName: matchName,
					parameterCount: 0,
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
				rows.push(inspectParam(res, { displayName: displayName, matchName: matchName }, param, p));
			}
			out.push({
				displayName: displayName,
				matchName: matchName,
				parameterCount: propertyCount.count < 0 ? rows.length : propertyCount.count,
				parameters: rows
			});
			for (p = 0; p < rows.length; p++) {
				flat.push(rows[p]);
			}
		}
		return {
			ok: true,
			clip: {
				name: res.readString(trackItem, "name") || "",
				mediaType: mediaType
			},
			components: out,
			parameters: flat,
			settersCalled: false,
			usedQE: false,
			confirmation: "LIVE_PREMIERE_READ"
		};
	}

	function withMatrix(inspected) {
		var matrix;
		if (!inspected || !inspected.ok) {
			return inspected;
		}
		if (typeof ParameterCapability !== "undefined" && ParameterCapability.matrixFromParameters) {
			matrix = ParameterCapability.matrixFromParameters(inspected.parameters || []);
			inspected.capabilities = matrix.capabilities;
			inspected.confirmedWrites = matrix.confirmedWrites;
			inspected.unsupported = matrix.unsupported;
			inspected.unknown = matrix.unknown;
			inspected.confirmedProduction = matrix.confirmedProduction;
			inspected.writeCandidates = matrix.writeCandidates;
			inspected.testedCandidates = matrix.testedCandidates;
			inspected.rejected = matrix.rejected;
		}
		if (typeof NumericCandidateScan !== "undefined" && NumericCandidateScan.attach) {
			inspected = NumericCandidateScan.attach(inspected);
		} else if (typeof $ !== "undefined" && $._pickfxNumericCandidateScan && $._pickfxNumericCandidateScan.attach) {
			inspected = $._pickfxNumericCandidateScan.attach(inspected);
		}
		inspected.settersCalled = false;
		inspected.usedQE = false;
		return inspected;
	}

	function inspect(trackItem) {
		return withMatrix(inspectTrackItem(trackItem));
	}

	function inspectMany(trackItems) {
		var clips = [];
		var allParams = [];
		var allComponents = [];
		var i;
		var inspected;
		var c;
		var p;
		trackItems = trackItems || [];
		for (i = 0; i < trackItems.length; i++) {
			inspected = inspectTrackItem(trackItems[i]);
			clips.push(inspected);
			if (inspected && inspected.ok) {
				if (inspected.components) {
					for (c = 0; c < inspected.components.length; c++) {
						allComponents.push(inspected.components[c]);
					}
				}
				if (inspected.parameters) {
					for (p = 0; p < inspected.parameters.length; p++) {
						allParams.push(inspected.parameters[p]);
					}
				}
			}
		}
		inspected = withMatrix({
			ok: true,
			selectedCount: trackItems.length,
			clips: clips,
			components: allComponents,
			parameters: allParams,
			settersCalled: false,
			usedQE: false,
			confirmation: "LIVE_PREMIERE_READ"
		});
		return inspected;
	}

	function isSnapshot(param) {
		if (!param || typeof param !== "object") {
			return false;
		}
		if (param.runtimeType) {
			return true;
		}
		if (param.hasGetValue === true || param.hasSetValue === true) {
			return true;
		}
		if (param.currentValue !== undefined) {
			return true;
		}
		if (param.writeCapability) {
			return true;
		}
		return false;
	}

	return {
		inspect: inspect,
		inspectTrackItem: inspectTrackItem,
		inspectMany: inspectMany,
		isSnapshot: isSnapshot
	};
}());

if (typeof $ !== "undefined") {
	$._pickfxUniversalParameterInspect = UniversalParameterInspect;
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = UniversalParameterInspect;
}
