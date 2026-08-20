var ParameterWriteTest = (function () {
	var OPERATION = "parameter.write.test";
	var WRITE_METHOD = "ComponentParam.setValue(value, true)";
	var NUMBER_EPS = 0.0001;
	var POINT_DELTA = 0.01;

	function fail(reason, extra) {
		var payload = {
			ok: false,
			operation: OPERATION,
			reason: reason || "WRITE_FAILED",
			verified: false,
			verifiedTest: false,
			verifiedRestore: false,
			writeMethod: WRITE_METHOD,
			settersCalled: false,
			usedQE: false
		};
		var key;
		if (extra) {
			for (key in extra) {
				if (extra.hasOwnProperty(key)) {
					payload[key] = extra[key];
				}
			}
		}
		if (payload.productionEnabled === undefined) {
			payload.productionEnabled = productionEnabledFor(payload.component, payload.parameter);
		}
		if (payload.globalSearchUsed === undefined) {
			payload.globalSearchUsed = true;
		}
		return payload;
	}

	function numbersClose(a, b) {
		if (typeof a !== "number" || typeof b !== "number" || !isFinite(a) || !isFinite(b)) {
			return false;
		}
		if (a === b) {
			return true;
		}
		return Math.abs(a - b) <= NUMBER_EPS;
	}

	function verifyValue(type, requested, actual) {
		var got;
		if (type === "number" || type === "angle") {
			if (typeof SafeNumericTestValue !== "undefined" && SafeNumericTestValue.verify) {
				return SafeNumericTestValue.verify(requested, actual);
			}
			return numbersClose(requested, actual);
		}
		if (type === "boolean") {
			return requested === actual;
		}
		if (type === "point") {
			if (typeof PointValue !== "undefined" && PointValue.verify) {
				got = PointValue.verify(requested, actual, NUMBER_EPS);
				return !!(got && got.ok);
			}
			return false;
		}
		return false;
	}

	function makeSafeTestValue(type, current, valueShape) {
		var x;
		var y;
		if (type === "number" || type === "angle") {
			if (typeof SafeNumericTestValue !== "undefined" && SafeNumericTestValue.generate) {
				return SafeNumericTestValue.generate(current, valueShape);
			}
			if (typeof current !== "number" || !isFinite(current)) {
				return { ok: false, reason: "NO_SAFE_TEST_VALUE" };
			}
			if (current === 0) {
				return { ok: true, value: 1 };
			}
			if (current === 1) {
				return { ok: true, value: 2 };
			}
			return { ok: true, value: current + 1 };
		}
		if (type === "boolean") {
			if (current !== true && current !== false) {
				return { ok: false, reason: "NO_SAFE_TEST_VALUE" };
			}
			return { ok: true, value: current === true ? false : true };
		}
		if (type === "point") {
			if (!valueShape || valueShape.shape !== "index0") {
				if (!current || current.length !== 2) {
					return { ok: false, reason: "NO_SAFE_TEST_VALUE" };
				}
			}
			if (current && typeof current.length === "number" && current.length === 2 &&
					typeof current[0] === "number" && typeof current[1] === "number") {
				x = current[0];
				y = current[1];
				return { ok: true, value: [x + POINT_DELTA, y] };
			}
			return { ok: false, reason: "NO_SAFE_TEST_VALUE" };
		}
		return { ok: false, reason: "NO_SAFE_TEST_VALUE" };
	}

	function resolveTarget(trackItem, componentName, parameterName) {
		if (typeof UniversalParameterResolver !== "undefined" && UniversalParameterResolver.resolve) {
			return UniversalParameterResolver.resolve(trackItem, parameterName, componentName);
		}
		if (typeof $ !== "undefined" && $._pickfxUniversalParameterResolver) {
			return $._pickfxUniversalParameterResolver.resolve(trackItem, parameterName, componentName);
		}
		return {
			ok: false,
			reason: "PARAMETER_NOT_FOUND",
			detail: "UniversalParameterResolver is not loaded."
		};
	}

	function productionEnabledFor(componentName, parameterName) {
		if (typeof ConfirmedParameterWrites === "undefined") {
			return false;
		}
		if (ConfirmedParameterWrites.isProductionEnabled) {
			return ConfirmedParameterWrites.isProductionEnabled(parameterName, componentName);
		}
		return !!(ConfirmedParameterWrites.lookup && ConfirmedParameterWrites.lookup(componentName, parameterName));
	}

	function liveLimits(param) {
		var limits = {};
		try {
			if (typeof param.min === "number" && isFinite(param.min)) {
				limits.min = param.min;
			}
		} catch (ignoreMin) {}
		try {
			if (typeof param.max === "number" && isFinite(param.max)) {
				limits.max = param.max;
			}
		} catch (ignoreMax) {}
		return limits;
	}

	function hasFn(obj, name) {
		try {
			return typeof obj[name] === "function";
		} catch (e) {
			return false;
		}
	}

	function classifyNumeric(componentName, parameterName, param, type, current, timeVarying) {
		var snapshot;
		if (typeof NumericCandidateClassifier === "undefined" || !NumericCandidateClassifier.classify) {
			return { status: "CANDIDATE", candidate: true };
		}
		snapshot = {
			displayName: parameterName,
			componentDisplayName: componentName,
			runtimeType: type,
			currentValue: current,
			hasGetValue: hasFn(param, "getValue"),
			hasSetValue: hasFn(param, "setValue"),
			hasGetItem: hasFn(param, "getItem"),
			hasGetListItem: hasFn(param, "getListItem"),
			hasGetValueName: hasFn(param, "getValueName"),
			hasGetValueNames: hasFn(param, "getValueNames"),
			hasGetOptions: hasFn(param, "getOptions"),
			timeVarying: timeVarying === true
		};
		try {
			snapshot.hasItems = param.items !== undefined && param.items !== null;
		} catch (ignoreItems) {}
		try {
			snapshot.hasValueNames = param.valueNames !== undefined && param.valueNames !== null;
		} catch (ignoreNames) {}
		try {
			snapshot.hasOptions = param.options !== undefined && param.options !== null;
		} catch (ignoreOptions) {}
		try {
			snapshot.hasEnumItems = param.enumItems !== undefined && param.enumItems !== null;
		} catch (ignoreEnum) {}
		try {
			snapshot.hasListItems = param.listItems !== undefined && param.listItems !== null;
		} catch (ignoreList) {}
		return NumericCandidateClassifier.classify(snapshot);
	}

	function recordWriteConfirmed(resolved, type) {
		if (typeof ConfirmedParameterWrites === "undefined" || !ConfirmedParameterWrites.markWriteConfirmed) {
			return;
		}
		ConfirmedParameterWrites.markWriteConfirmed({
			component: resolved.effect && resolved.effect.displayName,
			componentMatchName: resolved.effect && resolved.effect.matchName,
			parameter: resolved.parameter && resolved.parameter.displayName,
			parameterMatchName: resolved.parameter && resolved.parameter.matchName,
			runtimeType: type
		});
	}

	function discoveredNumericSpecs() {
		return [
			{ componentDisplayName: "Opacity", componentMatchName: "AE.ADBE Opacity", parameterDisplayName: "Opacity" },
			{ componentDisplayName: "Motion", componentMatchName: "AE.ADBE Motion", parameterDisplayName: "Anti-flicker Filter" },
			{ componentDisplayName: "Motion", componentMatchName: "AE.ADBE Motion", parameterDisplayName: "Crop Left" },
			{ componentDisplayName: "Motion", componentMatchName: "AE.ADBE Motion", parameterDisplayName: "Crop Top" },
			{ componentDisplayName: "Motion", componentMatchName: "AE.ADBE Motion", parameterDisplayName: "Crop Right" },
			{ componentDisplayName: "Motion", componentMatchName: "AE.ADBE Motion", parameterDisplayName: "Crop Bottom" }
		];
	}

	function run(trackItem, componentName, parameterName, options) {
		var resolved;

		options = options || {};

		if (!componentName || !parameterName) {
			return fail("PARAMETER_NOT_FOUND", {
				detail: "Component and parameter displayName are required.",
				component: componentName || "",
				parameter: parameterName || ""
			});
		}

		resolved = resolveTarget(trackItem, componentName, parameterName);
		if (!resolved || !resolved.ok) {
			return fail((resolved && resolved.reason) || "PARAMETER_NOT_FOUND", {
				detail: (resolved && resolved.detail) || "Parameter not found.",
				component: componentName,
				parameter: parameterName
			});
		}

		return runResolved(resolved, options, componentName, parameterName);
	}

	function runResolved(resolved, options, componentName, parameterName) {
		var param;
		var original;
		var detected;
		var test;
		var afterTest;
		var restored;
		var verifiedTest;
		var verifiedRestore;
		var type;
		var valueShape;
		var originalNumber;
		var classified;
		var limits;
		var productionEnabled;
		var operationName;

		options = options || {};
		componentName = componentName || (resolved && resolved.effect && resolved.effect.displayName) || "";
		parameterName = parameterName || (resolved && resolved.parameter && resolved.parameter.displayName) || "";
		operationName = options.operation || (options.numericOnly === true ? "numeric.parameter.write.test" : OPERATION);

		if (!resolved || !resolved.ok) {
			return fail((resolved && resolved.reason) || "PARAMETER_NOT_FOUND", {
				operation: operationName,
				detail: (resolved && resolved.detail) || "Parameter not found.",
				component: componentName,
				parameter: parameterName
			});
		}

		param = resolved._param;
		if (!param) {
			return fail("PARAMETER_NOT_FOUND", {
				component: componentName,
				parameter: parameterName
			});
		}

		try {
			if (typeof param.isTimeVarying === "function" && param.isTimeVarying() === true) {
				return fail("PARAMETER_TIME_VARYING_UNSUPPORTED", {
					component: resolved.effect && resolved.effect.displayName ? resolved.effect.displayName : componentName,
					parameter: resolved.parameter && resolved.parameter.displayName ? resolved.parameter.displayName : parameterName,
					type: "unknown",
					runtimeType: "unknown",
					timeVarying: true,
					status: "REJECTED",
					productionEnabled: false
				});
			}
		} catch (tvErr) {
			return fail("WRITE_FAILED", {
				detail: "isTimeVarying() threw: " + String(tvErr),
				component: componentName,
				parameter: parameterName
			});
		}

		if (!hasFn(param, "getValue")) {
			return fail("NO_GET_VALUE", {
				component: resolved.effect && resolved.effect.displayName ? resolved.effect.displayName : componentName,
				parameter: resolved.parameter && resolved.parameter.displayName ? resolved.parameter.displayName : parameterName,
				status: "REJECTED",
				settersCalled: false
			});
		}

		try {
			original = param.getValue();
		} catch (getErr) {
			return fail("NO_GET_VALUE", {
				detail: "getValue() threw: " + String(getErr),
				component: componentName,
				parameter: parameterName,
				status: "REJECTED"
			});
		}

		detected = typeof ParameterValueType !== "undefined" && ParameterValueType.detectLive
			? ParameterValueType.detectLive(param, original)
			: { type: typeof original, value: original };
		type = detected.type || "unknown";
		valueShape = detected.valueShape || detected;
		if (type === "point" && detected.value && detected.value.length === 2) {
			original = [detected.value[0], detected.value[1]];
		}
		if (type === "number" || type === "angle") {
			originalNumber = detected.value !== undefined ? detected.value : original;
			if (typeof originalNumber === "number") {
				original = originalNumber;
			}
		}

		if (options.numericOnly === true && type !== "number" && type !== "angle") {
			return fail("UNSUPPORTED_TYPE", {
				component: resolved.effect.displayName,
				parameter: resolved.parameter.displayName,
				type: type,
				runtimeType: type,
				originalValue: detected.value !== undefined ? detected.value : original,
				status: "UNSUPPORTED",
				settersCalled: false
			});
		}

		if (type === "number" || type === "angle") {
			classified = classifyNumeric(
				resolved.effect.displayName,
				resolved.parameter.displayName,
				param,
				type,
				original,
				false
			);
			if (classified && classified.status !== "CANDIDATE" &&
					classified.status !== "WRITE_TESTED" &&
					classified.status !== "WRITE_CONFIRMED" &&
					classified.status !== "PRODUCTION_ENABLED") {
				return fail(classified.reason || "UNSUPPORTED_TYPE", {
					component: resolved.effect.displayName,
					parameter: resolved.parameter.displayName,
					type: type,
					runtimeType: type,
					originalValue: original,
					status: classified.status,
					timeVarying: false,
					productionEnabled: classified.productionEnabled === true,
					settersCalled: false
				});
			}
		}

		limits = liveLimits(param);
		if (detected.valueShape) {
			valueShape = detected.valueShape;
			if (limits.min !== undefined) {
				valueShape.min = limits.min;
			}
			if (limits.max !== undefined) {
				valueShape.max = limits.max;
			}
		} else {
			valueShape = limits;
		}

		if (typeof options.testValue === "number" && isFinite(options.testValue)) {
			test = { ok: true, value: options.testValue };
		} else {
			test = makeSafeTestValue(type, detected.value !== undefined ? detected.value : original, valueShape);
		}
		if (!test.ok) {
			return fail("NO_SAFE_TEST_VALUE", {
				component: resolved.effect.displayName,
				parameter: resolved.parameter.displayName,
				type: type,
				originalValue: detected.value !== undefined ? detected.value : original,
				settersCalled: false
			});
		}

		try {
			if (typeof param.setValue !== "function") {
				return fail("NO_SET_VALUE", {
					component: resolved.effect.displayName,
					parameter: resolved.parameter.displayName,
					type: type,
					runtimeType: type,
					originalValue: detected.value,
					status: "REJECTED"
				});
			}
		} catch (setTypeErr) {
			return fail("NO_SET_VALUE", {
				detail: String(setTypeErr),
				component: resolved.effect.displayName,
				parameter: resolved.parameter.displayName,
				status: "REJECTED"
			});
		}

		try {
			param.setValue(test.value, true);
		} catch (setErr) {
			return fail("WRITE_FAILED", {
				detail: "setValue threw: " + String(setErr),
				component: resolved.effect.displayName,
				parameter: resolved.parameter.displayName,
				type: type,
				originalValue: detected.value,
				testValue: test.value,
				settersCalled: true
			});
		}

		try {
			afterTest = param.getValue();
		} catch (afterErr) {
			return fail("VALUE_NOT_VERIFIED", {
				detail: "getValue() after test write threw: " + String(afterErr),
				component: resolved.effect.displayName,
				parameter: resolved.parameter.displayName,
				settersCalled: true
			});
		}

		verifiedTest = verifyValue(type, test.value, afterTest);
		try {
			param.setValue(original, true);
		} catch (restoreErr) {
			return fail("WRITE_FAILED", {
				detail: "restore setValue threw: " + String(restoreErr),
				component: resolved.effect.displayName,
				parameter: resolved.parameter.displayName,
				type: type,
				originalValue: detected.value,
				testValue: test.value,
				afterTest: afterTest,
				verifiedTest: verifiedTest,
				settersCalled: true
			});
		}

		try {
			restored = param.getValue();
		} catch (restoreReadErr) {
			return fail("VALUE_NOT_VERIFIED", {
				detail: "getValue() after restore threw: " + String(restoreReadErr),
				settersCalled: true
			});
		}

		verifiedRestore = verifyValue(type, original, restored);

		if (verifiedTest === true && verifiedRestore === true && options.recordConfirmed !== false) {
			recordWriteConfirmed(resolved, type);
		}

		productionEnabled = productionEnabledFor(
			resolved.effect.displayName || componentName,
			resolved.parameter.displayName || parameterName
		);
		if (options.productionEnabled === false) {
			productionEnabled = false;
		}

		return {
			ok: verifiedTest === true && verifiedRestore === true,
			operation: operationName,
			component: resolved.effect.displayName,
			componentMatchName: resolved.effect.matchName || "",
			parameter: resolved.parameter.displayName,
			parameterMatchName: resolved.parameter.matchName || "",
			identity: resolved.identity,
			type: type,
			runtimeType: type,
			originalValue: detected.value !== undefined ? detected.value : original,
			testValue: test.value,
			afterTest: afterTest,
			restoredValue: restored,
			verifiedTest: verifiedTest === true,
			verifiedRestore: verifiedRestore === true,
			verified: verifiedTest === true && verifiedRestore === true,
			writeMethod: WRITE_METHOD,
			timeVarying: false,
			settersCalled: true,
			usedQE: false,
			productionEnabled: productionEnabled,
			globalSearchUsed: false,
			status: (verifiedTest === true && verifiedRestore === true) ? "WRITE_CONFIRMED" : "WRITE_TESTED",
			reason: (verifiedTest === true && verifiedRestore === true) ? undefined : "VALUE_NOT_VERIFIED"
		};
	}

	function runNumeric(trackItem, componentName, parameterName, options) {
		var spec = options || {};
		spec.numericOnly = true;
		return run(trackItem, componentName, parameterName, spec);
	}

	function runMany(trackItem, specs) {
		var tests = [];
		var i;
		var spec;
		var row;
		var successful = 0;
		var failed = 0;
		var verifiedCount = 0;
		var settersCalled = false;
		var productionEnabled = true;
		specs = specs && specs.length ? specs : discoveredNumericSpecs();
		for (i = 0; i < specs.length; i++) {
			spec = specs[i];
			if (!spec || spec.parameterDisplayName === "Blend Mode") {
				continue;
			}
			row = run(
				trackItem,
				spec.componentMatchName || spec.componentDisplayName,
				spec.parameterDisplayName,
				spec
			);
			if (row) {
				row.requestedComponent = spec.componentDisplayName || spec.componentMatchName;
				row.requestedParameter = spec.parameterDisplayName;
				if (row.settersCalled) {
					settersCalled = true;
				}
				if (row.productionEnabled !== true) {
					productionEnabled = false;
				}
				if (row.ok && row.verified) {
					successful += 1;
					verifiedCount += 1;
				} else {
					failed += 1;
				}
			} else {
				failed += 1;
			}
			tests.push(row);
		}
		return {
			ok: tests.length > 0 && failed === 0,
			operation: "parameter.write.test.batch",
			tests: tests,
			selectedCount: 1,
			successfulCount: successful,
			failedCount: failed,
			verifiedCount: verifiedCount,
			writeMethod: WRITE_METHOD,
			settersCalled: settersCalled,
			usedQE: false,
			productionEnabled: tests.length > 0 && productionEnabled,
			excluded: ["Blend Mode"]
		};
	}

	return {
		run: run,
		runResolved: runResolved,
		runNumeric: runNumeric,
		runMany: runMany,
		makeSafeTestValue: makeSafeTestValue,
		discoveredNumericSpecs: discoveredNumericSpecs
	};
}());

if (typeof $ !== "undefined") {
	$._pickfxParameterWriteTest = ParameterWriteTest;
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = ParameterWriteTest;
}
