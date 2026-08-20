var ParameterEngine = (function () {
	var NUMBER_EPS = 0.0001;
	var REASON_ALIASES = {
		OUT_OF_RANGE: "VALUE_OUT_OF_RANGE",
		VERIFY_FAILED: "VALUE_NOT_VERIFIED",
		TYPE_NOT_WRITABLE: "UNSUPPORTED_TYPE"
	};
	var USER_STATUS = {
		EFFECT_NOT_FOUND: "Effect not found.",
		PARAMETER_NOT_FOUND: "Parameter not found.",
		PARAMETER_NOT_WRITABLE: "Parameter is not writable.",
		INVALID_VALUE: "Invalid value.",
		VALUE_OUT_OF_RANGE: "Value out of range.",
		WRITE_FAILED: "Could not write parameter.",
		VALUE_NOT_VERIFIED: "Value could not be verified.",
		UNSUPPORTED_TYPE: "Parameter type not writable yet.",
		NO_VIDEO_SELECTION: "Select a video clip first.",
		NO_NUMERIC_PARAMETER: "Could not find a writable numeric parameter.",
		ENUM_OPTION_NOT_FOUND: "Enum option not found.",
		PARAMETER_TIME_VARYING_UNSUPPORTED: "This parameter is time-varying.",
		UNSUPPORTED_OPERATION: "This operation is not writable.",
		NO_SAFE_TEST_VALUE: "No safe test value."
	};

	function trim(value) {
		return String(value || "").replace(/^\s+|\s+$/g, "");
	}

	function normalizeReason(reason) {
		var code = String(reason || "WRITE_FAILED");
		if (REASON_ALIASES[code]) {
			return REASON_ALIASES[code];
		}
		return code;
	}

	function statusFor(reason) {
		var code = normalizeReason(reason);
		return USER_STATUS[code] || USER_STATUS.WRITE_FAILED;
	}

	function copyExtra(target, extra) {
		var key;
		if (!extra) {
			return target;
		}
		for (key in extra) {
			if (extra.hasOwnProperty(key) && target[key] === undefined) {
				target[key] = extra[key];
			}
		}
		return target;
	}

	function fail(reason, extra) {
		var code = normalizeReason(reason);
		var payload = {
			ok: false,
			reason: code,
			status: statusFor(code)
		};
		return copyExtra(payload, extra);
	}

	function success(fields) {
		var payload = {
			ok: true,
			verified: true
		};
		copyExtra(payload, fields);
		if (payload.requestedValue === undefined && payload.value !== undefined) {
			payload.requestedValue = payload.value;
		}
		if (payload.actualValue === undefined && payload.readBack !== undefined) {
			payload.actualValue = payload.readBack;
		}
		if (!payload.method) {
			payload.method = payload.methodUsed || "setValue(value, true)";
		}
		return payload;
	}

	function coerceBoolean(value) {
		if (value === true || value === 1) {
			return true;
		}
		if (value === false || value === 0) {
			return false;
		}
		try {
			if (String(value).toLowerCase() === "true") {
				return true;
			}
			if (String(value).toLowerCase() === "false") {
				return false;
			}
		} catch (ignore) {}
		return undefined;
	}

	function asFiniteNumber(value) {
		var n;
		if (typeof value === "number" && isFinite(value)) {
			return value;
		}
		if (typeof value === "string" && value !== "") {
			n = Number(value);
			if (isFinite(n)) {
				return n;
			}
		}
		return undefined;
	}

	function numbersClose(requested, actual, epsilon) {
		var a = asFiniteNumber(requested);
		var b = asFiniteNumber(actual);
		var eps = typeof epsilon === "number" && isFinite(epsilon) ? epsilon : NUMBER_EPS;
		if (a === undefined || b === undefined) {
			return false;
		}
		if (a === b) {
			return true;
		}
		return Math.abs(a - b) <= eps;
	}

	function enumMatches(readBack, expectedValue, expectedLabel) {
		if (readBack === expectedValue) {
			return true;
		}
		try {
			if (String(readBack) === String(expectedValue)) {
				return true;
			}
		} catch (ignoreString) {}
		if (expectedLabel) {
			try {
				if (String(readBack).toLowerCase() === String(expectedLabel).toLowerCase()) {
					return true;
				}
			} catch (ignoreLabel) {}
		}
		return false;
	}

	function verify(kind, requested, actual, extra) {
		var type = String(kind || "number");
		var label = extra && extra.expectedLabel;
		var epsilon = extra && extra.epsilon;
		if (type === "number" || type === "angle") {
			if (numbersClose(requested, actual, epsilon)) {
				return { ok: true, type: type, requested: requested, actual: actual };
			}
			return { ok: false, reason: "VALUE_NOT_VERIFIED", type: type, requested: requested, actual: actual };
		}
		if (type === "boolean") {
			if (coerceBoolean(actual) === coerceBoolean(requested) && coerceBoolean(requested) !== undefined) {
				return { ok: true, type: type, requested: requested, actual: actual };
			}
			return { ok: false, reason: "VALUE_NOT_VERIFIED", type: type, requested: requested, actual: actual };
		}
		if (type === "enum") {
			if (enumMatches(actual, requested, label)) {
				return { ok: true, type: type, requested: requested, actual: actual };
			}
			return { ok: false, reason: "VALUE_NOT_VERIFIED", type: type, requested: requested, actual: actual };
		}
		if (type === "point") {
			if (typeof PointValue !== "undefined" && PointValue.verify) {
				return PointValue.verify(requested, actual, epsilon);
			}
			return { ok: false, reason: "UNSUPPORTED_TYPE", type: type, requested: requested, actual: actual };
		}
		return { ok: false, reason: "UNSUPPORTED_TYPE", type: type, requested: requested, actual: actual };
	}

	function inRange(metadata, value) {
		if (!metadata || typeof value !== "number" || !isFinite(value)) {
			return true;
		}
		if (typeof metadata.min === "number" && isFinite(metadata.min) && value < metadata.min) {
			return false;
		}
		if (typeof metadata.max === "number" && isFinite(metadata.max) && value > metadata.max) {
			return false;
		}
		return true;
	}

	function canWrite(metadata, expectedType) {
		var type = expectedType || (metadata && metadata.type) || "unknown";
		if (!metadata) {
			return fail("PARAMETER_NOT_FOUND");
		}
		if (!trim(metadata.displayName)) {
			return fail("PARAMETER_NOT_FOUND", { detail: "Empty displayName is not user-addressable." });
		}
		if (metadata.writable === false) {
			return fail("PARAMETER_NOT_WRITABLE", { type: type, parameter: metadata.displayName });
		}
		if (type === "number" || type === "angle") {
			return { ok: true, type: type, write: true };
		}
		if (type === "boolean") {
			return { ok: true, type: type, write: true };
		}
		if (type === "enum") {
			if (!metadata.options || !metadata.options.length) {
				return fail("PARAMETER_NOT_WRITABLE", {
					type: type,
					parameter: metadata.displayName,
					detail: "Enum options were not exposed."
				});
			}
			return { ok: true, type: type, write: true };
		}
		if (type === "point") {
			return { ok: true, type: type, write: true };
		}
		return fail("UNSUPPORTED_TYPE", { type: type, parameter: metadata.displayName });
	}

	function setParameter(csInterface, spec, done) {
		var type;
		var effectName;
		var parameterName;
		if (!spec) {
			done(fail("INVALID_VALUE"));
			return;
		}
		effectName = spec.effectName;
		parameterName = spec.parameterName;
		type = spec.expectedType || "number";
		if (spec.scope === "clip") {
			if (!trim(parameterName)) {
				done(fail("PARAMETER_NOT_FOUND"));
				return;
			}
			if (typeof PremiereBridge !== "undefined" && PremiereBridge.setClipParameter) {
				PremiereBridge.setClipParameter(csInterface, parameterName, spec.value, type, done);
				return;
			}
			done(fail("WRITE_FAILED", { parameter: parameterName, detail: "Clip parameter bridge is not loaded." }));
			return;
		}
		if (!effectName) {
			done(fail("EFFECT_NOT_FOUND", { parameter: parameterName }));
			return;
		}
		if (!trim(parameterName)) {
			done(fail("PARAMETER_NOT_FOUND", { effect: effectName }));
			return;
		}
		if (type === "number" || type === "angle") {
			PremiereBridge.setParameter(csInterface, effectName, parameterName, spec.value, done);
			return;
		}
		if (type === "boolean" || type === "enum") {
			PremiereBridge.setTypedParameter(
				csInterface,
				effectName,
				parameterName,
				spec.value,
				type,
				spec.expectedLabel || "",
				done
			);
			return;
		}
		done(fail("UNSUPPORTED_TYPE", {
			effect: effectName,
			parameter: parameterName,
			type: type
		}));
	}

	function commandFromWrite(written, fields) {
		var extra = fields || {};
		if (!written || !written.ok || written.verified === false) {
			return fail(
				(written && written.reason) || "WRITE_FAILED",
				copyExtra({
					effect: extra.effect || (written && written.effect),
					parameter: extra.parameter || (written && written.parameter),
					detail: written && written.detail,
					log: written && written.log
				}, extra)
			);
		}
		return success({
			command: true,
			effect: written.effect || extra.effect,
			parameter: written.parameter || extra.parameter,
			value: extra.value !== undefined ? extra.value : written.newValue,
			requestedValue: written.requestedValue !== undefined ? written.requestedValue : extra.requestedValue,
			actualValue: written.actualValue !== undefined ? written.actualValue : written.readBack,
			oldValue: written.oldValue,
			readBack: written.readBack,
			type: written.type || extra.type,
			method: written.method || written.methodUsed,
			log: written.log
		});
	}

	return {
		NUMBER_EPS: NUMBER_EPS,
		normalizeReason: normalizeReason,
		statusFor: statusFor,
		fail: fail,
		success: success,
		coerceBoolean: coerceBoolean,
		numbersClose: numbersClose,
		enumMatches: enumMatches,
		verify: verify,
		inRange: inRange,
		canWrite: canWrite,
		setParameter: setParameter,
		commandFromWrite: commandFromWrite
	};
}());

if (typeof $ !== "undefined") {
	$._pickfxParameterEngine = ParameterEngine;
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = ParameterEngine;
}
