var MotionWriteTest = (function () {
	var OPERATION = "motion.write.test";
	var WRITE_METHOD = "ComponentParam.setValue(value, true)";
	var MOTION_DISPLAY = "Motion";
	var MOTION_MATCH_PREFERRED = "AE.ADBE Motion";
	var NUMBER_EPS = 0.0001;
	var POINT_DELTA = 0.01;
	var PARAM_SPECS = [
		{ displayName: "Scale", kind: "number" },
		{ displayName: "Rotation", kind: "number" },
		{ displayName: "Opacity", kind: "number" },
		{ displayName: "Uniform Scale", kind: "boolean" },
		{ displayName: "Position", kind: "point" },
		{ displayName: "Anchor Point", kind: "point" }
	];

	function numbersClose(a, b) {
		if (typeof a !== "number" || typeof b !== "number" || !isFinite(a) || !isFinite(b)) {
			return false;
		}
		if (a === b) {
			return true;
		}
		return Math.abs(a - b) <= NUMBER_EPS;
	}

	function asFiniteNumber(value) {
		if (typeof value === "number" && isFinite(value)) {
			return value;
		}
		return undefined;
	}

	function readIndex(value, index) {
		try {
			if (value && value[index] !== undefined && value[index] !== null) {
				return asFiniteNumber(value[index]);
			}
		} catch (ignore) {}
		return undefined;
	}

	function inspectPointShape(value) {
		var zero;
		var one;
		var two;
		var x;
		var y;
		if (value === undefined || value === null || typeof value !== "object") {
			return { ok: false, reason: "not a point" };
		}
		zero = readIndex(value, 0);
		one = readIndex(value, 1);
		two = readIndex(value, 2);
		if (zero !== undefined && one !== undefined && two === undefined) {
			return { ok: true, shape: "index0", x: zero, y: one };
		}
		if (zero === undefined && one !== undefined && two !== undefined && readIndex(value, 3) === undefined) {
			return { ok: true, shape: "index1", x: one, y: two };
		}
		try {
			x = asFiniteNumber(value.x);
			y = asFiniteNumber(value.y);
		} catch (ignoreXy) {
			x = undefined;
			y = undefined;
		}
		if (x !== undefined && y !== undefined && asFiniteNumber(value.z) === undefined) {
			return { ok: true, shape: "xy", x: x, y: y };
		}
		return { ok: false, reason: "not a 2D pair" };
	}

	function snapshotPoint(value) {
		var shape = inspectPointShape(value);
		if (!shape.ok) {
			return null;
		}
		if (shape.shape === "xy") {
			return { shape: "xy", json: { x: shape.x, y: shape.y }, x: shape.x, y: shape.y };
		}
		if (shape.shape === "index1") {
			return { shape: "index1", json: [shape.x, shape.y], x: shape.x, y: shape.y };
		}
		return { shape: "index0", json: [shape.x, shape.y], x: shape.x, y: shape.y };
	}

	function pointWriteValue(snapshot, x, y) {
		if (!snapshot) {
			return undefined;
		}
		if (snapshot.shape === "xy") {
			return { x: x, y: y };
		}
		if (snapshot.shape === "index1") {
			return { 1: x, 2: y };
		}
		return [x, y];
	}

	function pointsEqual(actual, expectedX, expectedY) {
		var shape = inspectPointShape(actual);
		if (!shape.ok) {
			return false;
		}
		return numbersClose(shape.x, expectedX) && numbersClose(shape.y, expectedY);
	}

	function jsonValue(value, kind) {
		var snap;
		if (kind === "point") {
			snap = snapshotPoint(value);
			return snap ? snap.json : value;
		}
		return value;
	}

	function timeVaryingOf(param) {
		try {
			if (!param || typeof param.isTimeVarying !== "function") {
				return { available: false, value: false };
			}
			return { available: true, value: !!param.isTimeVarying() };
		} catch (e) {
			return { available: true, error: String(e), value: false };
		}
	}

	function keyframesOf(param) {
		try {
			if (!param || typeof param.areKeyframesSupported !== "function") {
				return { available: false };
			}
			return { available: true, value: !!param.areKeyframesSupported() };
		} catch (e) {
			return { available: true, error: String(e) };
		}
	}

	function baseResult(displayName, kind, component) {
		return {
			ok: false,
			operation: OPERATION,
			component: component ? {
				displayName: component.displayName || "",
				matchName: component.matchName || ""
			} : undefined,
			parameter: {
				displayName: displayName,
				type: kind
			},
			before: undefined,
			requested: undefined,
			after: undefined,
			originalValue: undefined,
			testValue: undefined,
			afterTest: undefined,
			restoredValue: undefined,
			verified: false,
			verifiedTest: false,
			verifiedRestore: false,
			writeMethod: WRITE_METHOD,
			timeVarying: false,
			settersCalled: false,
			usedQE: false
		};
	}

	function fail(result, reason, extra) {
		var key;
		result.ok = false;
		result.reason = reason;
		result.verified = false;
		if (extra) {
			for (key in extra) {
				if (extra.hasOwnProperty(key)) {
					result[key] = extra[key];
				}
			}
		}
		return result;
	}

	function callSetValue(param, value) {
		var setResult;
		try {
			if (!param || typeof param.setValue !== "function") {
				return { ok: false, reason: "MISSING_SETVALUE", invoked: false };
			}
		} catch (typeErr) {
			return { ok: false, reason: "MISSING_SETVALUE", invoked: false, error: String(typeErr) };
		}
		try {
			setResult = param.setValue(value, true);
		} catch (setErr) {
			return {
				ok: false,
				reason: "WRITE_EXCEPTION",
				invoked: true,
				error: String(setErr)
			};
		}
		if (setResult === false) {
			return {
				ok: false,
				reason: "WRITE_EXCEPTION",
				invoked: true,
				error: "setValue(value, true) returned false."
			};
		}
		return { ok: true, invoked: true, setResult: setResult };
	}

	function callGetValue(param) {
		var value;
		try {
			value = param.getValue();
		} catch (readErr) {
			return { ok: false, error: String(readErr) };
		}
		return { ok: true, value: value };
	}

	function makeNumericTestValue(current) {
		if (typeof current !== "number" || !isFinite(current)) {
			return { ok: false, reason: "WRONG_TYPE" };
		}
		return { ok: true, value: current + 1 };
	}

	function makeBooleanTestValue(current) {
		if (current !== true && current !== false) {
			return { ok: false, reason: "WRONG_TYPE" };
		}
		return { ok: true, value: current === true ? false : true };
	}

	function makePointTestValue(current) {
		var snap = snapshotPoint(current);
		if (!snap) {
			return { ok: false, reason: "WRONG_TYPE" };
		}
		return {
			ok: true,
			shape: snap.shape,
			originalSnapshot: snap,
			testX: snap.x + POINT_DELTA,
			testY: snap.y,
			writeValue: pointWriteValue(snap, snap.x + POINT_DELTA, snap.y),
			restoreValue: pointWriteValue(snap, snap.x, snap.y)
		};
	}

	function verifyKind(kind, actual, expected) {
		if (kind === "number") {
			return numbersClose(actual, expected);
		}
		if (kind === "boolean") {
			return actual === expected && (expected === true || expected === false);
		}
		if (kind === "point") {
			return pointsEqual(actual, expected.x, expected.y);
		}
		return false;
	}

	function testParameter(param, spec, component) {
		var result = baseResult(spec.displayName, spec.kind, component);
		var varying;
		var originalRead;
		var original;
		var testPlan;
		var write;
		var afterRead;
		var restore;
		var restoreRead;
		var expectedAfter;
		var restoreExpected;

		if (!param) {
			return fail(result, "PARAMETER_NOT_FOUND", {
				error: 'No property with displayName "' + spec.displayName + '".'
			});
		}

		varying = timeVaryingOf(param);
		result.timeVarying = varying.value === true;
		result.keyframesSupported = keyframesOf(param);
		if (varying.error) {
			return fail(result, "WRITE_EXCEPTION", { error: "isTimeVarying() threw: " + varying.error });
		}
		if (varying.available && varying.value === true) {
			return fail(result, "PARAMETER_TIME_VARYING_UNSUPPORTED", {
				error: "Parameter is time-varying. Write test was not attempted."
			});
		}

		try {
			if (typeof param.setValue !== "function") {
				return fail(result, "MISSING_SETVALUE", {
					error: "setValue is not a function on this ComponentParam."
				});
			}
		} catch (setTypeErr) {
			return fail(result, "MISSING_SETVALUE", { error: String(setTypeErr) });
		}

		originalRead = callGetValue(param);
		if (!originalRead.ok) {
			return fail(result, "WRITE_EXCEPTION", { error: "getValue() threw: " + originalRead.error });
		}
		original = originalRead.value;
		result.before = jsonValue(original, spec.kind);
		result.originalValue = result.before;

		if (spec.kind === "number") {
			if (typeof original !== "number" || !isFinite(original)) {
				return fail(result, "WRONG_TYPE", {
					error: "Live getValue() is not a number.",
					liveType: typeof original
				});
			}
			testPlan = makeNumericTestValue(original);
			expectedAfter = testPlan.value;
			restoreExpected = original;
		} else if (spec.kind === "boolean") {
			if (original !== true && original !== false) {
				return fail(result, "WRONG_TYPE", {
					error: "Live getValue() is not a boolean.",
					liveType: typeof original
				});
			}
			testPlan = makeBooleanTestValue(original);
			expectedAfter = testPlan.value;
			restoreExpected = original;
		} else if (spec.kind === "point") {
			testPlan = makePointTestValue(original);
			if (!testPlan.ok) {
				return fail(result, "WRONG_TYPE", {
					error: "Live getValue() is not a 2D point/vector.",
					liveType: typeof original
				});
			}
			expectedAfter = { x: testPlan.testX, y: testPlan.testY };
			restoreExpected = { x: testPlan.originalSnapshot.x, y: testPlan.originalSnapshot.y };
		} else {
			return fail(result, "UNSUPPORTED_TYPE", { error: "Unsupported test kind." });
		}

		if (!testPlan.ok) {
			return fail(result, testPlan.reason || "WRONG_TYPE");
		}

		result.requested = spec.kind === "point" ? testPlan.writeValue : testPlan.value;
		result.testValue = spec.kind === "point" ? [testPlan.testX, testPlan.testY] : testPlan.value;
		if (spec.kind === "point" && testPlan.shape === "xy") {
			result.testValue = { x: testPlan.testX, y: testPlan.testY };
		}

		write = callSetValue(param, spec.kind === "point" ? testPlan.writeValue : testPlan.value);
		if (write.invoked) {
			result.settersCalled = true;
		}
		if (!write.ok) {
			return fail(result, write.reason || "WRITE_EXCEPTION", { error: write.error });
		}

		afterRead = callGetValue(param);
		if (!afterRead.ok) {
			return fail(result, "WRITE_EXCEPTION", { error: "getValue() after write threw: " + afterRead.error });
		}
		result.after = jsonValue(afterRead.value, spec.kind);
		result.afterTest = result.after;
		result.verifiedTest = verifyKind(
			spec.kind,
			afterRead.value,
			spec.kind === "point" ? expectedAfter : expectedAfter
		);
		result.verified = result.verifiedTest;

		restore = callSetValue(
			param,
			spec.kind === "point" ? testPlan.restoreValue : restoreExpected
		);
		if (restore.invoked) {
			result.settersCalled = true;
		}
		if (!restore.ok) {
			result.verifiedRestore = false;
			return fail(result, "RESTORE_FAILED", {
				error: restore.error || restore.reason,
				verifiedTest: result.verifiedTest
			});
		}

		restoreRead = callGetValue(param);
		if (!restoreRead.ok) {
			result.verifiedRestore = false;
			return fail(result, "RESTORE_FAILED", {
				error: "getValue() after restore threw: " + restoreRead.error,
				verifiedTest: result.verifiedTest
			});
		}
		result.restoredValue = jsonValue(restoreRead.value, spec.kind);
		result.verifiedRestore = verifyKind(
			spec.kind,
			restoreRead.value,
			spec.kind === "point" ? restoreExpected : restoreExpected
		);

		if (!result.verifiedTest) {
			return fail(result, "WRITE_NOT_VERIFIED");
		}
		if (!result.verifiedRestore) {
			return fail(result, "RESTORE_FAILED");
		}

		result.ok = true;
		result.verified = true;
		return result;
	}

	function resolver() {
		if (typeof $._pickfxParameterResolver !== "undefined") {
			return $._pickfxParameterResolver;
		}
		return null;
	}

	function findMotionComponent(trackItem) {
		var res = resolver();
		var components;
		var countInfo;
		var indexBase;
		var i;
		var component;
		var displayName;
		var matchName;
		var preferred;
		var named;
		if (!res) {
			return { ok: false, reason: "WRITE_FAILED", error: "ParameterResolver is not loaded." };
		}
		if (!trackItem) {
			return { ok: false, reason: "NO_VIDEO_SELECTION", error: "No TrackItem was provided." };
		}
		try {
			components = trackItem.components;
		} catch (compErr) {
			return { ok: false, reason: "PARAMETER_NOT_FOUND", error: "TrackItem.components threw: " + String(compErr) };
		}
		countInfo = res.collectionCount(components);
		if (countInfo.count < 0) {
			return { ok: false, reason: "PARAMETER_NOT_FOUND", error: "Could not read components." };
		}
		indexBase = res.collectionIndexBase(components, countInfo.count);
		preferred = null;
		named = null;
		for (i = 0; i < countInfo.count; i++) {
			component = res.collectionItem(components, i, indexBase);
			displayName = res.readString(component, "displayName") || "";
			matchName = res.readString(component, "matchName") || "";
			if (displayName !== MOTION_DISPLAY) {
				continue;
			}
			if (!named) {
				named = { component: component, displayName: displayName, matchName: matchName };
			}
			if (matchName === MOTION_MATCH_PREFERRED) {
				preferred = { component: component, displayName: displayName, matchName: matchName };
				break;
			}
		}
		if (preferred) {
			return { ok: true, displayName: preferred.displayName, matchName: preferred.matchName, component: preferred.component };
		}
		if (named) {
			return { ok: true, displayName: named.displayName, matchName: named.matchName, component: named.component };
		}
		return {
			ok: false,
			reason: "PARAMETER_NOT_FOUND",
			error: 'No component with displayName "' + MOTION_DISPLAY + '".'
		};
	}

	function findParamByDisplayName(component, wanted) {
		var res = resolver();
		var props;
		var propertyCount;
		var propertyBase;
		var i;
		var param;
		var name;
		if (!res || !component) {
			return null;
		}
		try {
			props = component.properties;
		} catch (ignoreProps) {
			return null;
		}
		propertyCount = res.collectionCount(props);
		if (propertyCount.count < 0) {
			return null;
		}
		propertyBase = res.collectionIndexBase(props, propertyCount.count);
		for (i = 0; i < propertyCount.count; i++) {
			param = res.collectionItem(props, i, propertyBase);
			name = res.readString(param, "displayName") || "";
			if (name === wanted) {
				return param;
			}
		}
		return null;
	}

	function run(trackItem) {
		var motion;
		var tests;
		var i;
		var spec;
		var param;
		var row;
		var successful;
		var failed;
		var payload;

		motion = findMotionComponent(trackItem);
		if (!motion.ok) {
			return {
				ok: false,
				operation: OPERATION,
				reason: motion.reason || "PARAMETER_NOT_FOUND",
				error: motion.error || "",
				verified: false,
				usedQE: false,
				writeMethod: WRITE_METHOD,
				tests: []
			};
		}

		tests = [];
		successful = 0;
		failed = 0;
		for (i = 0; i < PARAM_SPECS.length; i++) {
			spec = PARAM_SPECS[i];
			param = findParamByDisplayName(motion.component, spec.displayName);
			row = testParameter(param, spec, motion);
			tests.push(row);
			if (row.ok) {
				successful += 1;
			} else {
				failed += 1;
			}
		}

		payload = {
			ok: failed === 0 && successful === PARAM_SPECS.length,
			operation: OPERATION,
			component: {
				displayName: motion.displayName,
				matchName: motion.matchName
			},
			writeMethod: WRITE_METHOD,
			usedQE: false,
			successfulCount: successful,
			failedCount: failed,
			tests: tests
		};
		if (tests[0]) {
			payload.parameter = tests[0].parameter;
			payload.before = tests[0].before;
			payload.requested = tests[0].requested;
			payload.after = tests[0].after;
			payload.verified = tests[0].verified;
			payload.timeVarying = tests[0].timeVarying;
			payload.originalValue = tests[0].originalValue;
			payload.testValue = tests[0].testValue;
			payload.afterTest = tests[0].afterTest;
			payload.restoredValue = tests[0].restoredValue;
			payload.verifiedTest = tests[0].verifiedTest;
			payload.verifiedRestore = tests[0].verifiedRestore;
		}
		if (!payload.ok) {
			payload.reason = (function () {
				var n;
				for (n = 0; n < tests.length; n++) {
					if (tests[n] && !tests[n].ok) {
						return tests[n].reason;
					}
				}
				return "WRITE_NOT_VERIFIED";
			}());
		}
		return payload;
	}

	return {
		OPERATION: OPERATION,
		WRITE_METHOD: WRITE_METHOD,
		PARAM_SPECS: PARAM_SPECS,
		numbersClose: numbersClose,
		inspectPointShape: inspectPointShape,
		snapshotPoint: snapshotPoint,
		makeNumericTestValue: makeNumericTestValue,
		makeBooleanTestValue: makeBooleanTestValue,
		makePointTestValue: makePointTestValue,
		testParameter: testParameter,
		findMotionComponent: findMotionComponent,
		run: run
	};
}());

if (typeof $ !== "undefined") {
	$._pickfxMotionWriteTest = MotionWriteTest;
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = MotionWriteTest;
}
