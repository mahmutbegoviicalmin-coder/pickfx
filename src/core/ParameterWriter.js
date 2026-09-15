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

		verified = $._pickfxParameterWriter.readBackVerified(param, "number", value, null, log);
		readBack = verified.actual;
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
				readBackAttempts: verified.readBackAttempts,
				staleBeforeVerify: verified.staleBeforeVerify === true,
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
			readBackAttempts: verified.readBackAttempts,
			staleBeforeVerify: verified.staleBeforeVerify === true,
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
		if (kind === "point") {
			if (typeof PointValue !== "undefined" && PointValue.verify) {
				return PointValue.verify(requested, actual);
			}
			return { ok: false };
		}
		if (typeof requested === "number" && typeof actual === "number" && isFinite(requested) && isFinite(actual)) {
			return { ok: requested === actual || Math.abs(requested - actual) <= 0.0001 };
		}
		return { ok: requested === actual };
	},

	readBackApi: function () {
		if (typeof $ !== "undefined" && $._pickfxParameterReadBack) {
			return $._pickfxParameterReadBack;
		}
		if (typeof ParameterReadBack !== "undefined") {
			return ParameterReadBack;
		}
		return null;
	},

	readBackVerified: function (param, kind, requested, expectedLabel, log) {
		var api = $._pickfxParameterWriter.readBackApi();
		var result;
		var verified;
		var readBack;
		if (api && typeof api.verifyWithRetry === "function") {
			result = api.verifyWithRetry(param, requested, function (wanted, actual) {
				return $._pickfxParameterWriter.verifyWrite(kind, wanted, actual, expectedLabel);
			});
			if (log) {
				$._pickfxParameterWriter.appendLog(
					log,
					"readBack attempts=" + result.readBackAttempts +
						" stale=" + result.staleBeforeVerify +
						" value=" + result.value
				);
			}
			return {
				ok: result.ok === true,
				actual: result.value,
				readBackAttempts: result.readBackAttempts,
				staleBeforeVerify: result.staleBeforeVerify === true,
				error: result.error
			};
		}
		try {
			readBack = param.getValue();
		} catch (readErr) {
			return {
				ok: false,
				error: String(readErr),
				readBackAttempts: 1,
				staleBeforeVerify: false
			};
		}
		verified = $._pickfxParameterWriter.verifyWrite(kind, requested, readBack, expectedLabel);
		return {
			ok: !!(verified && verified.ok),
			actual: readBack,
			readBackAttempts: 1,
			staleBeforeVerify: false
		};
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

		verified = $._pickfxParameterWriter.readBackVerified(param, kind, value, expectedLabel, log);
		readBack = verified.actual;
		if (!verified.ok) {
			return $._pickfxParameterWriter.typedFail(
				effectName,
				parameterName,
				"VALUE_NOT_VERIFIED",
				"Value could not be verified.",
				log
			);
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
			readBackAttempts: verified.readBackAttempts,
			staleBeforeVerify: verified.staleBeforeVerify === true,
			log: log
		};
	},

	writeResolved: function (param, value, kind, parameterName) {
		var wanted = String(kind || "number");
		var writeValue = value;
		var setResult;
		var methodUsed;
		var verified;
		var adapted;
		var original;
		if (!param) {
			return {
				ok: false,
				reason: "PARAMETER_NOT_FOUND",
				parameter: String(parameterName || ""),
				type: wanted
			};
		}
		if (wanted === "color" || wanted === "enum" || wanted === "string") {
			return {
				ok: false,
				reason: "UNSUPPORTED_TYPE",
				parameter: String(parameterName || ""),
				type: wanted,
				detail: "PickFX does not have a production-verified writer for this type."
			};
		}
		if (wanted === "point") {
			if (typeof PointValue === "undefined") {
				return {
					ok: false,
					reason: "UNSUPPORTED_TYPE",
					parameter: String(parameterName || ""),
					type: "point",
					detail: "PointValue is not loaded."
				};
			}
			try {
				original = param.getValue();
			} catch (readErr) {
				return {
					ok: false,
					reason: "READ_FAILED",
					parameter: String(parameterName || ""),
					type: "point",
					detail: String(readErr)
				};
			}
			adapted = PointValue.toWriteValue
				? PointValue.toWriteValue(original, value)
				: PointValue.normalize(value);
			if (!adapted || adapted.ok !== true) {
				return {
					ok: false,
					reason: (adapted && adapted.reason) || "INVALID_VALUE",
					parameter: String(parameterName || ""),
					type: "point"
				};
			}
			writeValue = adapted.value;
		}
		methodUsed = "setValue(value, true)";
		try {
			if (typeof param.setValue !== "function") {
				return {
					ok: false,
					reason: "NOT_WRITABLE",
					parameter: String(parameterName || ""),
					type: wanted
				};
			}
			setResult = param.setValue(writeValue, true);
		} catch (setTwoErr) {
			methodUsed = "setValue(value)";
			try {
				setResult = param.setValue(writeValue);
			} catch (setOneErr) {
				return {
					ok: false,
					reason: "WRITE_FAILED",
					parameter: String(parameterName || ""),
					type: wanted,
					detail: String(setOneErr)
				};
			}
		}
		if (setResult === false) {
			return {
				ok: false,
				reason: "WRITE_FAILED",
				parameter: String(parameterName || ""),
				type: wanted,
				detail: methodUsed + " returned false."
			};
		}
		verified = $._pickfxParameterWriter.readBackVerified(
			param,
			wanted === "angle" ? "number" : wanted,
			writeValue,
			"",
			[]
		);
		if (!verified || !verified.ok) {
			return {
				ok: false,
				reason: "VALUE_NOT_VERIFIED",
				parameter: String(parameterName || ""),
				type: wanted,
				verified: false
			};
		}
		return {
			ok: true,
			verified: true,
			parameter: String(parameterName || ""),
			type: wanted,
			methodUsed: methodUsed
		};
	}
};
