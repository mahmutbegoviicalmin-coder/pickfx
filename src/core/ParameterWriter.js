/*global $ */

// Official Premiere DOM only. Not QE.
// Loaded into ExtendScript via $.evalFile from the CEP host bootstrap.
$._pickfxParameterWriter = {
	appendLog: function (lines, message) {
		var line = String(message);
		lines.push(line);
		try {
			$.writeln("[PickFX ParameterWriter] " + line);
		} catch (ignore) {}
	},

	fail: function (effectName, parameterName, detail, log, reason) {
		return {
			ok: false,
			effect: String(effectName || ""),
			parameter: String(parameterName || ""),
			reason: reason || "WRITE_FAILED",
			detail: String(detail),
			log: log || []
		};
	},

	engine: function () {
		if (typeof $._pickfxParameterEngine !== "undefined") {
			return $._pickfxParameterEngine;
		}
		if (typeof ParameterEngine !== "undefined") {
			return ParameterEngine;
		}
		return null;
	},

	set: function (trackItem, effectName, parameterName, value) {
		var resolved;
		var log;
		var param;
		var oldValue;
		var setResult;
		var methodUsed;
		var readBack;
		var verified;

		if (typeof $._pickfxParameterResolver === "undefined" || !$._pickfxParameterResolver.resolve) {
			return $._pickfxParameterWriter.fail(
				effectName,
				parameterName,
				"ParameterResolver is not loaded.",
				[]
			);
		}

		resolved = $._pickfxParameterResolver.resolve(trackItem, effectName, parameterName);
		log = (resolved && resolved.log) ? resolved.log.slice(0) : [];

		if (!resolved || !resolved.ok) {
			return {
				ok: false,
				effect: String(effectName || ""),
				parameter: String(parameterName || ""),
				reason: (resolved && resolved.reason) ? resolved.reason : "WRITE_FAILED",
				detail: (resolved && resolved.detail) ? resolved.detail : "ParameterResolver failed.",
				log: log
			};
		}

		param = resolved._param;
		oldValue = resolved.parameter ? resolved.parameter.value : undefined;

		$._pickfxParameterWriter.appendLog(log, "old value=" + oldValue);
		$._pickfxParameterWriter.appendLog(log, "target value=" + value);

		if (!param) {
			return $._pickfxParameterWriter.fail(
				effectName,
				parameterName,
				"Resolver did not return a ComponentParam.",
				log
			);
		}

		try {
			if (typeof param.setValue !== "function") {
				return $._pickfxParameterWriter.fail(
					effectName,
					parameterName,
					"setValue is not a function on this ComponentParam.",
					log,
					"PARAMETER_NOT_WRITABLE"
				);
			}
		} catch (typeErr) {
			return $._pickfxParameterWriter.fail(
				effectName,
				parameterName,
				"Could not read setValue: " + String(typeErr),
				log,
				"PARAMETER_NOT_WRITABLE"
			);
		}

		methodUsed = "setValue(value, true)";
		try {
			setResult = param.setValue(value, true);
		} catch (setTwoErr) {
			$._pickfxParameterWriter.appendLog(log, "setValue(value, true) threw: " + String(setTwoErr));
			methodUsed = "setValue(value)";
			try {
				setResult = param.setValue(value);
			} catch (setOneErr) {
				return $._pickfxParameterWriter.fail(
					effectName,
					parameterName,
					"setValue threw: " + String(setOneErr),
					log
				);
			}
		}

		$._pickfxParameterWriter.appendLog(log, "setValue method used=" + methodUsed);
		$._pickfxParameterWriter.appendLog(log, "setValue result=" + setResult + " typeof=" + (typeof setResult));

		if (setResult === false) {
			return $._pickfxParameterWriter.fail(
				effectName,
				parameterName,
				methodUsed + " returned false.",
				log
			);
		}

		try {
			readBack = param.getValue();
		} catch (readErr) {
			return $._pickfxParameterWriter.fail(
				effectName,
				parameterName,
				"getValue() after setValue threw: " + String(readErr),
				log
			);
		}

		$._pickfxParameterWriter.appendLog(log, "readBack value=" + readBack + " typeof=" + (typeof readBack));

		verified = $._pickfxParameterWriter.verifyWrite("number", value, readBack, null);
		if (!verified.ok) {
			$._pickfxParameterWriter.appendLog(log, "verification failed requested=" + value + " actual=" + readBack);
			return {
				ok: false,
				effect: resolved.effect.displayName,
				parameter: resolved.parameter.displayName,
				reason: "VALUE_NOT_VERIFIED",
				detail: "Value could not be verified.",
				requestedValue: value,
				actualValue: readBack,
				oldValue: oldValue,
				readBack: readBack,
				type: "number",
				method: methodUsed,
				log: log
			};
		}

		return {
			ok: true,
			verified: true,
			effect: resolved.effect.displayName,
			parameter: resolved.parameter.displayName,
			oldValue: oldValue,
			newValue: value,
			requestedValue: value,
			actualValue: readBack,
			setValueResult: setResult === false ? false : true,
			readBack: readBack,
			type: "number",
			method: methodUsed,
			methodUsed: methodUsed,
			log: log
		};
	},

	setParameter: function (trackItem, effectName, parameterName, value) {
		return $._pickfxParameterWriter.set(trackItem, effectName, parameterName, value);
	},

	typedFail: function (effectName, parameterName, reason, detail, log) {
		return {
			ok: false,
			effect: String(effectName || ""),
			parameter: String(parameterName || ""),
			reason: reason === "VERIFY_FAILED" ? "VALUE_NOT_VERIFIED" : (reason === "TYPE_NOT_WRITABLE" ? "UNSUPPORTED_TYPE" : reason),
			detail: String(detail),
			log: log || []
		};
	},

	verifyWrite: function (kind, requested, actual, expectedLabel) {
		var engine = $._pickfxParameterWriter.engine();
		if (engine && engine.verify) {
			return engine.verify(kind, requested, actual, { expectedLabel: expectedLabel });
		}
		if (kind === "boolean") {
			return {
				ok: $._pickfxParameterWriter.coerceBoolean(actual) === $._pickfxParameterWriter.coerceBoolean(requested)
			};
		}
		if (kind === "enum") {
			return {
				ok: $._pickfxParameterWriter.enumMatches(actual, requested, expectedLabel)
			};
		}
		if (typeof requested === "number" && typeof actual === "number" && isFinite(requested) && isFinite(actual)) {
			return { ok: requested === actual || Math.abs(requested - actual) <= 0.0001 };
		}
		return { ok: requested === actual };
	},

	coerceBoolean: function (value) {
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
	},

	enumMatches: function (readBack, expectedValue, expectedLabel) {
		if (readBack === expectedValue) {
			return true;
		}
		try {
			if (String(readBack) === String(expectedValue)) {
				return true;
			}
		} catch (ignoreString) {}
		if (typeof readBack === "number" && typeof expectedValue === "number" && readBack === expectedValue) {
			return true;
		}
		if (expectedLabel) {
			try {
				if (String(readBack).toLowerCase() === String(expectedLabel).toLowerCase()) {
					return true;
				}
			} catch (ignoreLabel) {}
		}
		return false;
	},

	callSetValue: function (param, value, log) {
		var setResult;
		var methodUsed = "setValue(value, true)";
		try {
			setResult = param.setValue(value, true);
			return { ok: true, setResult: setResult, methodUsed: methodUsed };
		} catch (setTwoErr) {
			$._pickfxParameterWriter.appendLog(log, "setValue(value, true) threw: " + String(setTwoErr));
		}
		methodUsed = "setValue(value)";
		try {
			setResult = param.setValue(value);
			return { ok: true, setResult: setResult, methodUsed: methodUsed };
		} catch (setOneErr) {
			return {
				ok: false,
				error: String(setOneErr)
			};
		}
	},

	setTyped: function (trackItem, effectName, parameterName, value, kind, expectedLabel) {
		var resolved;
		var log;
		var param;
		var oldValue;
		var write;
		var readBack;
		var verified;

		if (kind !== "boolean" && kind !== "enum") {
			return $._pickfxParameterWriter.typedFail(
				effectName,
				parameterName,
				"TYPE_NOT_WRITABLE",
				"Parameter type not writable yet.",
				[]
			);
		}

		if (typeof $._pickfxParameterResolver === "undefined" || !$._pickfxParameterResolver.resolve) {
			return $._pickfxParameterWriter.typedFail(
				effectName,
				parameterName,
				"TYPE_NOT_WRITABLE",
				"ParameterResolver is not loaded.",
				[]
			);
		}

		resolved = $._pickfxParameterResolver.resolve(trackItem, effectName, parameterName);
		log = (resolved && resolved.log) ? resolved.log.slice(0) : [];

		if (!resolved || !resolved.ok) {
			return {
				ok: false,
				effect: String(effectName || ""),
				parameter: String(parameterName || ""),
				reason: (resolved && resolved.reason) ? resolved.reason : "WRITE_FAILED",
				detail: (resolved && resolved.detail) ? resolved.detail : "ParameterResolver failed.",
				log: log
			};
		}

		param = resolved._param;
		oldValue = resolved.parameter ? resolved.parameter.value : undefined;
		$._pickfxParameterWriter.appendLog(log, "typed kind=" + kind);
		$._pickfxParameterWriter.appendLog(log, "old value=" + oldValue);
		$._pickfxParameterWriter.appendLog(log, "target value=" + value);

		if (!param) {
			return $._pickfxParameterWriter.typedFail(
				effectName,
				parameterName,
				"TYPE_NOT_WRITABLE",
				"Resolver did not return a ComponentParam.",
				log
			);
		}

		write = $._pickfxParameterWriter.callSetValue(param, value, log);
		if (!write.ok) {
			return $._pickfxParameterWriter.typedFail(
				effectName,
				parameterName,
				"PARAMETER_NOT_WRITABLE",
				"Parameter is not writable.",
				log
			);
		}
		if (write.setResult === false) {
			return $._pickfxParameterWriter.typedFail(
				effectName,
				parameterName,
				"PARAMETER_NOT_WRITABLE",
				"Parameter is not writable.",
				log
			);
		}

		try {
			readBack = param.getValue();
		} catch (readErr) {
			return $._pickfxParameterWriter.typedFail(
				effectName,
				parameterName,
				"VALUE_NOT_VERIFIED",
				"Value could not be verified.",
				log
			);
		}

		$._pickfxParameterWriter.appendLog(log, "readBack value=" + readBack + " typeof=" + (typeof readBack));

		if (kind === "boolean") {
			verified = $._pickfxParameterWriter.verifyWrite("boolean", value, readBack, expectedLabel);
			if (!verified.ok) {
				return $._pickfxParameterWriter.typedFail(
					effectName,
					parameterName,
					"VALUE_NOT_VERIFIED",
					"Value could not be verified.",
					log
				);
			}
		} else {
			verified = $._pickfxParameterWriter.verifyWrite("enum", value, readBack, expectedLabel);
			if (!verified.ok) {
				return $._pickfxParameterWriter.typedFail(
					effectName,
					parameterName,
					"VALUE_NOT_VERIFIED",
					"Value could not be verified.",
					log
				);
			}
		}

		return {
			ok: true,
			verified: true,
			effect: resolved.effect.displayName,
			parameter: resolved.parameter.displayName,
			oldValue: oldValue,
			newValue: value,
			requestedValue: value,
			actualValue: readBack,
			readBack: readBack,
			type: kind,
			method: write.methodUsed,
			methodUsed: write.methodUsed,
			log: log
		};
	}
};
