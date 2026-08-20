var ClipParameterWriter = (function () {
	function fail(parameterName, reason, detail, extra) {
		var payload = {
			ok: false,
			parameter: String(parameterName || ""),
			reason: reason || "WRITE_FAILED",
			detail: detail ? String(detail) : ""
		};
		var key;
		if (extra) {
			for (key in extra) {
				if (extra.hasOwnProperty(key)) {
					payload[key] = extra[key];
				}
			}
		}
		return payload;
	}

	function booleanFromInput(input) {
		if (!input) {
			return undefined;
		}
		if (input.booleanValue === true || input.booleanValue === false) {
			return input.booleanValue;
		}
		return undefined;
	}

	function numbersFromInput(input) {
		if (!input) {
			return [];
		}
		if (input.numbers && input.numbers.length) {
			return input.numbers;
		}
		if (typeof input.value === "number" && isFinite(input.value)) {
			return [input.value];
		}
		if (input.value && typeof input.value.length === "number" && input.value.length === 2 &&
				typeof input.value[0] === "number" && typeof input.value[1] === "number") {
			return [input.value[0], input.value[1]];
		}
		if (input.value && typeof input.value.x === "number" && typeof input.value.y === "number") {
			return [input.value.x, input.value.y];
		}
		return [];
	}

	function timeVaryingOf(param) {
		try {
			if (typeof param.isTimeVarying !== "function") {
				return { available: false, value: false };
			}
			return { available: true, value: !!param.isTimeVarying() };
		} catch (e) {
			return { available: true, error: String(e), value: false };
		}
	}

	function keyframesOf(param) {
		try {
			if (typeof param.areKeyframesSupported !== "function") {
				return { available: false };
			}
			return { available: true, value: !!param.areKeyframesSupported() };
		} catch (e) {
			return { available: true, error: String(e) };
		}
	}

	function withDebug(written, extra) {
		var key;
		if (!written) {
			return written;
		}
		for (key in extra) {
			if (extra.hasOwnProperty(key) && written[key] === undefined) {
				written[key] = extra[key];
			}
		}
		return written;
	}

	function set(trackItem, parameterName, input) {
		var resolved;
		var param;
		var live;
		var detected;
		var numbers;
		var boolValue;
		var timeVarying;
		var keyframes;
		var componentName;
		var requested;
		var debug;

		if (typeof $._pickfxParameterResolver === "undefined" || !$._pickfxParameterResolver.resolveMotionParameter) {
			return fail(parameterName, "PARAMETER_NOT_FOUND", "resolveMotionParameter is not loaded.");
		}

		resolved = $._pickfxParameterResolver.resolveMotionParameter(trackItem, parameterName);
		if (!resolved || !resolved.ok) {
			return fail(
				parameterName,
				(resolved && resolved.reason) || "PARAMETER_NOT_FOUND",
				(resolved && resolved.detail) || "Parameter not found."
			);
		}

		param = resolved._param;
		componentName = resolved.effect && resolved.effect.displayName ? resolved.effect.displayName : "";
		if (!param) {
			return fail(parameterName, "PARAMETER_NOT_FOUND", "Resolver did not return a ComponentParam.", {
				effect: componentName
			});
		}

		try {
			live = param.getValue();
		} catch (getErr) {
			return fail(parameterName, "UNSUPPORTED_TYPE", "getValue() threw: " + String(getErr), {
				effect: componentName,
				parameter: resolved.parameter && resolved.parameter.displayName ? resolved.parameter.displayName : parameterName,
				componentMatchName: resolved.effect && resolved.effect.matchName ? resolved.effect.matchName : ""
			});
		}

		detected = typeof ParameterValueType !== "undefined" && ParameterValueType.detect
			? ParameterValueType.detect(live)
			: { type: typeof live, value: live };

		try {
			if (typeof param.setValue !== "function") {
				return fail(parameterName, "PARAMETER_NOT_WRITABLE", "setValue is not a function on this ComponentParam.", {
					effect: componentName,
					parameter: resolved.parameter && resolved.parameter.displayName ? resolved.parameter.displayName : parameterName,
					parameterType: detected.type,
					originalValue: detected.type === "point" && detected.value ? detected.value : live
				});
			}
		} catch (typeErr) {
			return fail(parameterName, "PARAMETER_NOT_WRITABLE", "Could not read setValue: " + String(typeErr), {
				effect: componentName,
				parameterType: detected.type
			});
		}

		timeVarying = timeVaryingOf(param);
		keyframes = keyframesOf(param);
		debug = {
			effect: componentName,
			parameter: resolved.parameter && resolved.parameter.displayName ? resolved.parameter.displayName : parameterName,
			componentMatchName: resolved.effect && resolved.effect.matchName ? resolved.effect.matchName : "",
			parameterType: detected.type,
			originalValue: detected.type === "point" && detected.value ? detected.value : live,
			timeVarying: timeVarying.value === true,
			keyframesSupported: keyframes.value === true
		};

		if (timeVarying.error) {
			return fail(parameterName, "WRITE_FAILED", "isTimeVarying() threw: " + timeVarying.error, debug);
		}
		if (timeVarying.available && timeVarying.value === true) {
			return fail(
				parameterName,
				"PARAMETER_TIME_VARYING_UNSUPPORTED",
				"This parameter is time-varying. Keyframe writes are not enabled yet.",
				debug
			);
		}

		numbers = numbersFromInput(input);
		boolValue = booleanFromInput(input);

		if (detected.type === "number" || detected.type === "angle") {
			if (numbers.length !== 1) {
				return fail(
					parameterName,
					numbers.length > 1 ? "INVALID_VALUE" : "INVALID_VALUE",
					numbers.length > 1 ? "Extra arguments for a numeric parameter." : "Numeric parameter requires one number.",
					debug
				);
			}
			if (typeof $._pickfxParameterWriter === "undefined" || !$._pickfxParameterWriter.set) {
				return fail(parameterName, "WRITE_FAILED", "ParameterWriter.set is not loaded.", debug);
			}
			requested = numbers[0];
			return withDebug(
				$._pickfxParameterWriter.set(trackItem, componentName, debug.parameter, requested),
				{
					clipParameter: true,
					parameterType: detected.type,
					originalValue: live,
					requestedValue: requested,
					timeVarying: false,
					keyframesSupported: debug.keyframesSupported
				}
			);
		}

		if (detected.type === "point") {
			if (numbers.length !== 2) {
				return fail(
					parameterName,
					"INVALID_VALUE",
					numbers.length < 2 ? "Point value is missing a coordinate." : "Point value has extra coordinates.",
					debug
				);
			}
			if (typeof PointParameterWriter === "undefined" || !PointParameterWriter.set) {
				return fail(parameterName, "UNSUPPORTED_TYPE", "PointParameterWriter is not loaded.", debug);
			}
			requested = [numbers[0], numbers[1]];
			return withDebug(
				PointParameterWriter.set(trackItem, componentName, debug.parameter, requested),
				{
					clipParameter: true,
					parameterType: "point",
					timeVarying: false,
					keyframesSupported: debug.keyframesSupported
				}
			);
		}

		if (detected.type === "boolean") {
			if (boolValue !== true && boolValue !== false) {
				return fail(parameterName, "INVALID_VALUE", "Boolean parameter requires true or false.", debug);
			}
			if (typeof $._pickfxParameterWriter === "undefined" || !$._pickfxParameterWriter.setTyped) {
				return fail(parameterName, "UNSUPPORTED_TYPE", "Typed writer is not loaded.", debug);
			}
			return withDebug(
				$._pickfxParameterWriter.setTyped(trackItem, componentName, debug.parameter, boolValue, "boolean", ""),
				{
					clipParameter: true,
					parameterType: "boolean",
					originalValue: live,
					requestedValue: boolValue,
					timeVarying: false,
					keyframesSupported: debug.keyframesSupported
				}
			);
		}

		return fail(
			parameterName,
			"UNSUPPORTED_TYPE",
			"Live runtime type is not writable: " + String(detected.type || "unknown") + ".",
			debug
		);
	}

	return {
		set: set
	};
}());

if (typeof $ !== "undefined") {
	$._pickfxClipParameterWriter = ClipParameterWriter;
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = ClipParameterWriter;
}
