var PresetCapability = (function () {
	var PRODUCTION_TYPES = {
		number: true,
		angle: true,
		boolean: true,
		point: true
	};

	function fold(value) {
		return String(value || "").replace(/^\s+|\s+$/g, "").toLowerCase();
	}

	function typeApi() {
		if (typeof ParameterValueType !== "undefined") {
			return ParameterValueType;
		}
		if (typeof $ !== "undefined" && $._pickfxParameterValueType) {
			return $._pickfxParameterValueType;
		}
		return null;
	}

	function capabilityApi() {
		if (typeof ParameterCapability !== "undefined") {
			return ParameterCapability;
		}
		if (typeof $ !== "undefined" && $._pickfxParameterCapability) {
			return $._pickfxParameterCapability;
		}
		return null;
	}

	function resolverApi() {
		if (typeof $ !== "undefined" && $._pickfxParameterResolver) {
			return $._pickfxParameterResolver;
		}
		return null;
	}

	function writerApi() {
		if (typeof $ !== "undefined" && $._pickfxParameterWriter) {
			return $._pickfxParameterWriter;
		}
		return null;
	}

	function hasFn(obj, name) {
		var res = resolverApi();
		if (res && typeof res.hasFunction === "function") {
			return res.hasFunction(obj, name);
		}
		try {
			return !!(obj && typeof obj[name] === "function");
		} catch (ignore) {
			return false;
		}
	}

	function productionTypes() {
		return {
			number: true,
			angle: true,
			boolean: true,
			point: true
		};
	}

	function isProductionType(type) {
		return !!PRODUCTION_TYPES[fold(type)];
	}

	function pickfxWriterSupportsType(type) {
		var wanted = fold(type);
		if (!isProductionType(wanted)) {
			return false;
		}
		if (wanted === "point") {
			return typeof PointValue !== "undefined" && typeof PointValue.verify === "function";
		}
		return true;
	}

	function actualKeyCount(param) {
		var keys;
		var count;
		if (!param) {
			return 0;
		}
		try {
			if (hasFn(param, "getKeys")) {
				keys = param.getKeys();
				if (keys && typeof keys.length === "number") {
					return keys.length;
				}
				if (keys && typeof keys.numItems === "number") {
					return keys.numItems;
				}
			}
		} catch (ignoreKeys) {}
		try {
			if (typeof param.numKeys === "number" && isFinite(param.numKeys)) {
				return param.numKeys;
			}
		} catch (ignoreNum) {}
		try {
			if (hasFn(param, "getKeyCount")) {
				count = param.getKeyCount();
				if (typeof count === "number" && isFinite(count)) {
					return count;
				}
			}
		} catch (ignoreCount) {}
		return 0;
	}

	function isActuallyKeyframed(param) {
		return actualKeyCount(param) > 0;
	}

	function detectType(param, live) {
		var api = typeApi();
		if (api && api.detectLive) {
			return api.detectLive(param, live);
		}
		if (api && api.detect) {
			return api.detect(live);
		}
		return null;
	}

	function jsonSafeValue(value) {
		var i;
		var out;
		if (value === true || value === false) {
			return value;
		}
		if (typeof value === "number" && isFinite(value)) {
			return value;
		}
		if (typeof value === "string") {
			return value;
		}
		if (value && typeof value.length === "number" && value.length === 2 &&
				typeof value[0] === "number" && typeof value[1] === "number") {
			return [value[0], value[1]];
		}
		if (value && typeof value.x === "number" && typeof value.y === "number") {
			return [value.x, value.y];
		}
		if (value && typeof value.length === "number" && value.length <= 4) {
			out = [];
			for (i = 0; i < value.length; i++) {
				if (typeof value[i] === "number") {
					out.push(value[i]);
				}
			}
			if (out.length) {
				return out;
			}
		}
		try {
			return JSON.parse(JSON.stringify(value));
		} catch (ignore) {}
		return String(value);
	}

	function classify(param, displayName, matchName, componentDisplayName, componentMatchName) {
		var live;
		var getErr = "";
		var detected;
		var type = "unknown";
		var keyCount = 0;
		var timeVarying = false;
		var keyframesSupported = false;
		var readable = false;
		var writable = false;
		var pickfxWrite = false;
		var pickfxVerify = false;
		var snapshot;
		var cap;
		var capApi = capabilityApi();
		var reason = "";
		var presetCapture = false;
		var parityBug = false;

		try {
			timeVarying = hasFn(param, "isTimeVarying") && param.isTimeVarying() === true;
		} catch (tvErr) {
			timeVarying = false;
		}
		try {
			keyframesSupported = hasFn(param, "areKeyframesSupported") && param.areKeyframesSupported() === true;
		} catch (kfErr) {
			keyframesSupported = false;
		}
		keyCount = actualKeyCount(param);
		writable = hasFn(param, "setValue") || hasFn(param, "setColorValue");
		try {
			if (hasFn(param, "getValue")) {
				live = param.getValue();
				readable = true;
			}
		} catch (readErr) {
			getErr = String(readErr);
			readable = false;
		}

		detected = detectType(param, live);
		if (!detected) {
			return {
				displayName: displayName || "",
				matchName: matchName || "",
				pickfxRead: readable,
				pickfxWrite: false,
				pickfxVerify: false,
				presetCapture: false,
				reason: "PRESET_HOST_ENGINE_MISSING",
				type: "unknown",
				value: null,
				valueShape: null,
				keyCount: keyCount,
				timeVarying: timeVarying,
				areKeyframesSupported: keyframesSupported,
				writable: writable,
				getValueSuccess: readable,
				getError: getErr,
				parityBug: true
			};
		}
		type = detected.type || "unknown";

		if (capApi && capApi.classify) {
			snapshot = {
				displayName: displayName,
				matchName: matchName,
				componentDisplayName: componentDisplayName,
				componentMatchName: componentMatchName,
				runtimeType: type === "angle" ? "number" : type,
				currentValue: detected.value,
				hasGetValue: readable,
				hasSetValue: writable,
				timeVarying: keyCount > 0,
				areKeyframesSupported: keyframesSupported
			};
			cap = capApi.classify(snapshot);
			pickfxWrite = !!(cap && (cap.writable === true || cap.productionEnabled === true) &&
				pickfxWriterSupportsType(type));
			if (!pickfxWrite && isProductionType(type) && writable && readable && keyCount === 0) {
				pickfxWrite = true;
			}
		} else {
			pickfxWrite = isProductionType(type) && writable && readable && keyCount === 0 &&
				pickfxWriterSupportsType(type);
		}
		pickfxVerify = pickfxWrite;

		if (!readable) {
			reason = "READ_FAILED";
		} else if (keyCount > 0) {
			reason = "ANIMATION_REPLAY_NOT_YET_VERIFIED";
			pickfxWrite = false;
			pickfxVerify = false;
		} else if (!writable) {
			reason = "NOT_WRITABLE";
		} else if (!isProductionType(type) || !pickfxWriterSupportsType(type)) {
			reason = "UNSUPPORTED_TYPE";
		} else if (!pickfxWrite) {
			reason = "UNSUPPORTED_TYPE";
		} else {
			presetCapture = true;
			reason = "SUPPORTED";
		}

		if (readable && writable && isProductionType(type) && pickfxWriterSupportsType(type) &&
				keyCount === 0 && !presetCapture) {
			parityBug = true;
			reason = "PRESET_CAPABILITY_PARITY_BUG";
		}

		return {
			displayName: displayName || "",
			matchName: matchName || "",
			pickfxRead: readable,
			pickfxWrite: pickfxWrite,
			pickfxVerify: pickfxVerify,
			presetCapture: presetCapture,
			reason: reason,
			type: type,
			value: jsonSafeValue(detected.value !== undefined ? detected.value : live),
			valueShape: detected.valueShape || null,
			keyCount: keyCount,
			timeVarying: timeVarying,
			areKeyframesSupported: keyframesSupported,
			writable: writable,
			getValueSuccess: readable,
			getError: getErr,
			parityBug: parityBug,
			typeofSetValue: hasFn(param, "setValue") ? "function" : typeof (param && param.setValue)
		};
	}

	function hostStatus() {
		var missing = [];
		var status = {
			parameterValueType: !!typeApi(),
			pointValue: typeof PointValue !== "undefined",
			parameterReadBack: typeof ParameterReadBack !== "undefined" ||
				(typeof $ !== "undefined" && !!$._pickfxParameterReadBack),
			parameterResolver: !!resolverApi(),
			parameterWriter: !!writerApi(),
			parameterCapability: !!capabilityApi(),
			confirmedWrites: typeof ConfirmedParameterWrites !== "undefined",
			universalResolver: typeof UniversalParameterResolver !== "undefined" ||
				(typeof $ !== "undefined" && !!$._pickfxUniversalParameterResolver),
			universalWriter: typeof UniversalParameterWriter !== "undefined" ||
				(typeof $ !== "undefined" && !!$._pickfxUniversalParameterWriter),
			presetSchema: typeof PresetSchema !== "undefined" ||
				(typeof $ !== "undefined" && !!$._pickfxPresetSchema),
			presetHost: typeof PresetHost !== "undefined" ||
				(typeof $ !== "undefined" && !!$._pickfxPresetHost),
			presetCapability: true
		};
		var key;
		for (key in status) {
			if (status.hasOwnProperty(key) && !status[key]) {
				missing.push(key);
			}
		}
		status.ok = missing.length === 0;
		status.missing = missing;
		status.productionTypes = ["number", "angle", "boolean", "point"];
		status.stubTypes = ["color", "enum", "string"];
		return status;
	}

	return {
		productionTypes: productionTypes,
		isProductionType: isProductionType,
		pickfxWriterSupportsType: pickfxWriterSupportsType,
		actualKeyCount: actualKeyCount,
		isActuallyKeyframed: isActuallyKeyframed,
		hasDirectLiveValue: function (param) {
			var live;
			try {
				if (!hasFn(param, "getValue")) {
					return false;
				}
				live = param.getValue();
			} catch (ignore) {
				return false;
			}
			if (typeof live === "number" || live === true || live === false || typeof live === "string") {
				return true;
			}
			if (live && typeof live.length === "number" && live.length === 2) {
				return true;
			}
			if (live && typeof live.x === "number" && typeof live.y === "number") {
				return true;
			}
			return false;
		},
		classify: classify,
		hostStatus: hostStatus
	};
}());

if (typeof $ !== "undefined") {
	$._pickfxPresetCapability = PresetCapability;
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = PresetCapability;
}
