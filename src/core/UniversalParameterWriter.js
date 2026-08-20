var UniversalParameterWriter = (function () {
	function fail(parameterName, reason, detail, extra) {
		var payload = {
			ok: false,
			parameter: String(parameterName || ""),
			reason: reason || "WRITE_FAILED",
			detail: detail ? String(detail) : "",
			universal: true
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

	function resolverFn() {
		if (typeof UniversalParameterResolver !== "undefined" && UniversalParameterResolver.resolve) {
			return UniversalParameterResolver.resolve;
		}
		if (typeof $ !== "undefined" && $._pickfxUniversalParameterResolver) {
			return $._pickfxUniversalParameterResolver.resolve;
		}
		return null;
	}

	function set(trackItem, parameterName, input, componentHint) {
		var resolveFn;
		var resolved;
		var param;
		var live;
		var detected;
		var numbers;
		var boolValue;
		var timeVarying;
		var componentName;
		var requested;
		var debug;
		var written;

		resolveFn = resolverFn();
		if (!resolveFn) {
			return fail(parameterName, "PARAMETER_NOT_FOUND", "UniversalParameterResolver is not loaded.");
		}

		resolved = resolveFn(trackItem, parameterName, componentHint);
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
				effect: componentName
			});
		}

		detected = typeof ParameterValueType !== "undefined" && ParameterValueType.detectLive
			? ParameterValueType.detectLive(param, live)
			: (typeof ParameterValueType !== "undefined" && ParameterValueType.detect
				? ParameterValueType.detect(live)
				: { type: typeof live, value: live });

		try {
			if (typeof param.setValue !== "function") {
				return fail(parameterName, "PARAMETER_NOT_WRITABLE", "setValue is not a function on this ComponentParam.", {
					effect: componentName,
					parameterType: detected.type
				});
			}
		} catch (typeErr) {
			return fail(parameterName, "PARAMETER_NOT_WRITABLE", "Could not read setValue: " + String(typeErr), {
				effect: componentName
			});
		}

		timeVarying = timeVaryingOf(param);
		debug = {
			effect: componentName,
			parameter: resolved.parameter && resolved.parameter.displayName ? resolved.parameter.displayName : parameterName,
			componentMatchName: resolved.effect && resolved.effect.matchName ? resolved.effect.matchName : "",
			parameterType: detected.type,
			originalValue: detected.type === "point" && detected.value ? detected.value : live,
			timeVarying: timeVarying.value === true,
			universal: true
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
				return fail(parameterName, "INVALID_VALUE", "Numeric parameter requires one number.", debug);
			}
			if (typeof NumberParameterWriter === "undefined" || !NumberParameterWriter.set) {
				return fail(parameterName, "WRITE_FAILED", "NumberParameterWriter is not loaded.", debug);
			}
			requested = numbers[0];
			written = NumberParameterWriter.set(trackItem, componentName, debug.parameter, requested);
			return withDebug(written, {
				clipParameter: true,
				universal: true,
				parameterType: detected.type,
				originalValue: live,
				requestedValue: requested,
				timeVarying: false
			});
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
					universal: true,
					parameterType: "point",
					timeVarying: false
				}
			);
		}

		if (detected.type === "boolean") {
			if (boolValue !== true && boolValue !== false) {
				return fail(parameterName, "INVALID_VALUE", "Boolean parameter requires true or false.", debug);
			}
			if (typeof BooleanParameterWriter === "undefined" || !BooleanParameterWriter.set) {
				return fail(parameterName, "UNSUPPORTED_TYPE", "BooleanParameterWriter is not loaded.", debug);
			}
			return withDebug(
				BooleanParameterWriter.set(trackItem, componentName, debug.parameter, boolValue),
				{
					clipParameter: true,
					universal: true,
					parameterType: "boolean",
					originalValue: live,
					requestedValue: boolValue,
					timeVarying: false
				}
			);
		}

		if (detected.type === "color") {
			if (typeof ColorParameterWriter !== "undefined" && ColorParameterWriter.set) {
				return withDebug(ColorParameterWriter.set(trackItem, componentName, debug.parameter, input), debug);
			}
			return fail(parameterName, "UNSUPPORTED_TYPE", "Color writes are not confirmed.", debug);
		}
		if (detected.type === "enum") {
			if (typeof EnumParameterWriter !== "undefined" && EnumParameterWriter.set) {
				return withDebug(EnumParameterWriter.set(trackItem, componentName, debug.parameter, input), debug);
			}
			return fail(parameterName, "UNSUPPORTED_TYPE", "Enum writes are not confirmed.", debug);
		}
		if (detected.type === "string") {
			if (typeof StringParameterWriter !== "undefined" && StringParameterWriter.set) {
				return withDebug(StringParameterWriter.set(trackItem, componentName, debug.parameter, input), debug);
			}
			return fail(parameterName, "UNSUPPORTED_TYPE", "String writes are not confirmed.", debug);
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
	$._pickfxUniversalParameterWriter = UniversalParameterWriter;
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = UniversalParameterWriter;
}
