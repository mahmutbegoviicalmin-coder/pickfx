var PointParameterWriter = (function () {
	function fail(effectName, parameterName, reason, detail, extra) {
		var payload = {
			ok: false,
			effect: String(effectName || ""),
			parameter: String(parameterName || ""),
			reason: reason || "WRITE_FAILED",
			detail: detail ? String(detail) : "",
			type: "point"
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

	function set(trackItem, componentName, parameterName, point) {
		var resolved;
		var param;
		var original;
		var writeValue;
		var adapted;
		var setResult;
		var methodUsed;
		var readBack;
		var verified;
		var originalPoint;
		var pair;

		if (typeof $._pickfxParameterResolver === "undefined" || !$._pickfxParameterResolver.resolve) {
			return fail(componentName, parameterName, "WRITE_FAILED", "ParameterResolver is not loaded.");
		}
		if (typeof PointValue === "undefined") {
			return fail(componentName, parameterName, "UNSUPPORTED_TYPE", "PointValue is not loaded.");
		}

		resolved = $._pickfxParameterResolver.resolve(trackItem, componentName, parameterName);
		if (!resolved || !resolved.ok) {
			return fail(
				componentName,
				parameterName,
				(resolved && resolved.reason) || "WRITE_FAILED",
				(resolved && resolved.detail) || "ParameterResolver failed."
			);
		}

		param = resolved._param;
		if (!param) {
			return fail(componentName, parameterName, "PARAMETER_NOT_FOUND", "Resolver did not return a ComponentParam.");
		}

		try {
			if (typeof param.setValue !== "function") {
				return fail(componentName, parameterName, "PARAMETER_NOT_WRITABLE", "setValue is not a function on this ComponentParam.");
			}
		} catch (typeErr) {
			return fail(componentName, parameterName, "PARAMETER_NOT_WRITABLE", "Could not read setValue: " + String(typeErr));
		}

		try {
			original = param.getValue();
		} catch (readErr) {
			return fail(componentName, parameterName, "UNSUPPORTED_TYPE", "getValue() threw: " + String(readErr));
		}

		originalPoint = PointValue.inspect(original);
		if (!originalPoint.ok || originalPoint.shape !== "index0") {
			return fail(
				componentName,
				parameterName,
				"UNSUPPORTED_TYPE",
				"Live getValue() is not a 2-element array.",
				{
					parameterType: originalPoint.type || "unknown",
					originalValue: originalPoint
				}
			);
		}

		pair = PointValue.pairFrom ? PointValue.pairFrom(point) : null;
		if (!pair) {
			return fail(componentName, parameterName, "INVALID_VALUE", "Point value must be a 2-element array.");
		}
		writeValue = [pair[0], pair[1]];
		adapted = PointValue.toWriteValue(original, writeValue);
		if (!adapted.ok) {
			return fail(componentName, parameterName, adapted.reason || "UNSUPPORTED_TYPE", adapted.detail || "");
		}
		writeValue = adapted.value;

		methodUsed = "setValue(value, true)";
		try {
			setResult = param.setValue(writeValue, true);
		} catch (setTwoErr) {
			methodUsed = "setValue(value)";
			try {
				setResult = param.setValue(writeValue);
			} catch (setOneErr) {
				return fail(componentName, parameterName, "WRITE_FAILED", "setValue threw: " + String(setOneErr), {
					parameterType: "point",
					originalValue: [originalPoint.x, originalPoint.y],
					requestedValue: writeValue
				});
			}
		}

		if (setResult === false) {
			return fail(componentName, parameterName, "WRITE_FAILED", methodUsed + " returned false.", {
				parameterType: "point",
				method: methodUsed,
				originalValue: [originalPoint.x, originalPoint.y],
				requestedValue: writeValue
			});
		}

		try {
			readBack = param.getValue();
		} catch (afterErr) {
			return fail(componentName, parameterName, "VALUE_NOT_VERIFIED", "getValue() after setValue threw: " + String(afterErr), {
				parameterType: "point",
				method: methodUsed,
				originalValue: [originalPoint.x, originalPoint.y],
				requestedValue: writeValue
			});
		}

		verified = PointValue.verify(writeValue, readBack);
		if (!verified.ok) {
			return {
				ok: false,
				verified: false,
				effect: resolved.effect.displayName,
				parameter: resolved.parameter.displayName,
				reason: "VALUE_NOT_VERIFIED",
				detail: "Value could not be verified.",
				parameterType: "point",
				requestedValue: writeValue,
				originalValue: [originalPoint.x, originalPoint.y],
				actualValue: verified.actual,
				readBack: verified.actual,
				method: methodUsed,
				type: "point"
			};
		}

		return {
			ok: true,
			verified: true,
			effect: resolved.effect.displayName,
			parameter: resolved.parameter.displayName,
			parameterType: "point",
			requestedValue: writeValue,
			originalValue: [originalPoint.x, originalPoint.y],
			actualValue: verified.actual,
			readBack: verified.actual,
			method: methodUsed,
			type: "point",
			shape: "index0"
		};
	}

	return {
		set: set
	};
}());

if (typeof $ !== "undefined") {
	$._pickfxPointParameterWriter = PointParameterWriter;
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = PointParameterWriter;
}
