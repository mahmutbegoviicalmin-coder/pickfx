var BooleanWriteTest = (function () {
	var METHOD = "setValue(value, true)";

	function trim(value) {
		return String(value || "").replace(/^\s+|\s+$/g, "");
	}

	function isStrictBoolean(value) {
		return value === true || value === false;
	}

	function verifyBooleanEqual(actual, expected) {
		return isStrictBoolean(actual) && isStrictBoolean(expected) && actual === expected;
	}

	function requestedFromOriginal(originalValue) {
		if (!isStrictBoolean(originalValue)) {
			return {
				ok: false,
				stage: "ORIGINAL_TYPE",
				detail: "originalValue is not a boolean."
			};
		}
		return {
			ok: true,
			requestedValue: originalValue === true ? false : true
		};
	}

	function validateCandidate(candidate) {
		var parameter;
		var effect;
		if (!candidate) {
			return {
				ok: false,
				stage: "VALIDATE_CANDIDATE",
				detail: "No boolean candidate was selected."
			};
		}
		if (candidate.type !== "boolean") {
			return {
				ok: false,
				stage: "VALIDATE_TYPE",
				detail: 'Candidate type must be exactly "boolean".',
				type: candidate.type
			};
		}
		parameter = trim(candidate.parameter || candidate.displayName);
		effect = trim(candidate.effect);
		if (!parameter) {
			return {
				ok: false,
				stage: "VALIDATE_DISPLAY_NAME",
				detail: "Parameter displayName is required.",
				effect: effect,
				parameter: parameter,
				type: candidate.type
			};
		}
		return {
			ok: true,
			effect: effect,
			parameter: parameter,
			type: "boolean"
		};
	}

	function classifyVerification(originalValue, requestedValue, afterWrite, restoredValue) {
		var writeVerified = verifyBooleanEqual(afterWrite, requestedValue);
		var restoreVerified = verifyBooleanEqual(restoredValue, originalValue);
		return {
			writeVerified: writeVerified,
			restoreVerified: restoreVerified,
			ok: writeVerified === true && restoreVerified === true
		};
	}

	function baseReport(spec) {
		return {
			ok: false,
			effect: spec && spec.effect ? String(spec.effect) : "",
			parameter: spec && spec.parameter ? String(spec.parameter) : "",
			type: spec && spec.type !== undefined ? spec.type : undefined,
			originalValue: undefined,
			requestedValue: undefined,
			afterWrite: undefined,
			writeVerified: false,
			restoredValue: undefined,
			restoreVerified: false,
			settersCalled: false,
			usedQE: false,
			method: METHOD
		};
	}

	function failReport(report, stage, detail, premiereException) {
		report.ok = false;
		report.stage = stage;
		report.detail = String(detail || "");
		report.usedQE = false;
		report.method = METHOD;
		if (premiereException !== undefined && premiereException !== null && premiereException !== "") {
			report.premiereException = String(premiereException);
		}
		return report;
	}

	function callSetValueTrue(param, value) {
		var setResult;
		if (!param) {
			return {
				ok: false,
				stage: "WRITE",
				detail: "Resolver did not return a ComponentParam."
			};
		}
		try {
			if (typeof param.setValue !== "function") {
				return {
					ok: false,
					stage: "WRITE",
					detail: "setValue is not a function on this ComponentParam."
				};
			}
		} catch (typeErr) {
			return {
				ok: false,
				stage: "WRITE",
				detail: "Could not read setValue: " + String(typeErr),
				premiereException: String(typeErr)
			};
		}
		try {
			setResult = param.setValue(value, true);
		} catch (setErr) {
			return {
				ok: false,
				invoked: true,
				stage: "WRITE",
				detail: "setValue(value, true) threw: " + String(setErr),
				premiereException: String(setErr)
			};
		}
		if (setResult === false) {
			return {
				ok: false,
				invoked: true,
				stage: "WRITE",
				detail: "setValue(value, true) returned false."
			};
		}
		return {
			ok: true,
			invoked: true,
			setResult: setResult
		};
	}

	function readValue(param, stage) {
		var value;
		try {
			value = param.getValue();
		} catch (readErr) {
			return {
				ok: false,
				stage: stage,
				detail: "getValue() threw: " + String(readErr),
				premiereException: String(readErr)
			};
		}
		return {
			ok: true,
			value: value
		};
	}

	function restoreOriginal(param, originalValue, report) {
		var write;
		var read;
		if (!isStrictBoolean(originalValue)) {
			return report;
		}
		write = callSetValueTrue(param, originalValue);
		if (write.invoked) {
			report.settersCalled = true;
		}
		if (!write.ok) {
			report.restoreVerified = false;
			if (write.premiereException) {
				report.restoreException = write.premiereException;
			}
			if (write.detail) {
				report.detail = (report.detail ? report.detail + " " : "") + "restore " + write.detail;
			}
			return report;
		}
		read = readValue(param, "READ_AFTER_RESTORE");
		if (!read.ok) {
			report.restoreVerified = false;
			if (read.premiereException) {
				report.restoreException = read.premiereException;
			}
			report.detail = (report.detail ? report.detail + " " : "") + read.detail;
			return report;
		}
		report.restoredValue = read.value;
		report.restoreVerified = verifyBooleanEqual(read.value, originalValue);
		return report;
	}

	function run(trackItem, candidate) {
		var validated = validateCandidate(candidate);
		var report;
		var resolver;
		var resolved;
		var param;
		var originalRead;
		var requested;
		var write;
		var afterRead;
		var restoreWrite;
		var restoreRead;
		var classified;

		report = baseReport(validated.ok ? validated : {
			effect: candidate && candidate.effect,
			parameter: candidate && (candidate.parameter || candidate.displayName),
			type: candidate && candidate.type
		});

		if (!validated.ok) {
			return failReport(report, validated.stage, validated.detail);
		}

		if (typeof $._pickfxParameterResolver === "undefined" || !$._pickfxParameterResolver.resolve) {
			return failReport(report, "RESOLVE", "ParameterResolver.resolve is not loaded.");
		}
		resolver = $._pickfxParameterResolver;

		resolved = resolver.resolve(trackItem, validated.effect, validated.parameter);
		if (!resolved || !resolved.ok) {
			return failReport(
				report,
				"RESOLVE",
				(resolved && resolved.detail) ? resolved.detail : "ParameterResolver.resolve failed."
			);
		}
		report.resolvedByDisplayName = true;
		param = resolved._param;
		if (!param) {
			return failReport(report, "RESOLVE", "Resolver did not return a ComponentParam.");
		}

		originalRead = readValue(param, "READ_ORIGINAL");
		if (!originalRead.ok) {
			return failReport(report, originalRead.stage, originalRead.detail, originalRead.premiereException);
		}
		report.originalValue = originalRead.value;
		if (typeof originalRead.value !== "boolean") {
			return failReport(
				report,
				"ORIGINAL_TYPE",
				"getValue() returned " + (typeof originalRead.value) + ", expected boolean."
			);
		}

		requested = requestedFromOriginal(originalRead.value);
		if (!requested.ok) {
			return failReport(report, requested.stage, requested.detail);
		}
		report.requestedValue = requested.requestedValue;

		write = callSetValueTrue(param, requested.requestedValue);
		if (write.invoked) {
			report.settersCalled = true;
		}
		if (!write.ok) {
			failReport(report, write.stage, write.detail, write.premiereException);
			restoreOriginal(param, originalRead.value, report);
			return report;
		}

		afterRead = readValue(param, "READ_AFTER_WRITE");
		if (!afterRead.ok) {
			failReport(report, afterRead.stage, afterRead.detail, afterRead.premiereException);
			restoreOriginal(param, originalRead.value, report);
			return report;
		}
		report.afterWrite = afterRead.value;
		report.writeVerified = verifyBooleanEqual(afterRead.value, requested.requestedValue);
		if (!report.writeVerified) {
			failReport(
				report,
				"WRITE_VERIFY",
				"readBack !== requestedValue. afterWrite=" + String(afterRead.value) +
					" typeof=" + (typeof afterRead.value)
			);
			restoreOriginal(param, originalRead.value, report);
			return report;
		}

		restoreWrite = callSetValueTrue(param, originalRead.value);
		if (restoreWrite.invoked) {
			report.settersCalled = true;
		}
		if (!restoreWrite.ok) {
			return failReport(
				report,
				"RESTORE",
				restoreWrite.detail,
				restoreWrite.premiereException
			);
		}

		restoreRead = readValue(param, "READ_AFTER_RESTORE");
		if (!restoreRead.ok) {
			return failReport(
				report,
				restoreRead.stage,
				restoreRead.detail,
				restoreRead.premiereException
			);
		}
		report.restoredValue = restoreRead.value;
		classified = classifyVerification(
			originalRead.value,
			requested.requestedValue,
			afterRead.value,
			restoreRead.value
		);
		report.writeVerified = classified.writeVerified;
		report.restoreVerified = classified.restoreVerified;
		if (!classified.ok) {
			return failReport(
				report,
				"RESTORE_VERIFY",
				"restoredValue !== originalValue. restoredValue=" + String(restoreRead.value) +
					" typeof=" + (typeof restoreRead.value)
			);
		}

		report.ok = true;
		report.stage = "OK";
		report.usedQE = false;
		report.method = METHOD;
		return report;
	}

	return {
		METHOD: METHOD,
		isStrictBoolean: isStrictBoolean,
		verifyBooleanEqual: verifyBooleanEqual,
		requestedFromOriginal: requestedFromOriginal,
		validateCandidate: validateCandidate,
		classifyVerification: classifyVerification,
		run: run
	};
}());

if (typeof $ !== "undefined") {
	$._pickfxBooleanWriteTest = BooleanWriteTest;
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = BooleanWriteTest;
}
