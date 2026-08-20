(function () {
	var Test = MotionWriteTest;
	var stored;
	var result;
	var param;
	var throwsOnWrite;
	var noopWrite;
	var restoreFails;
	var motion;

	function numberParam(initial) {
		stored = initial;
		return {
			getValue: function () {
				return stored;
			},
			setValue: function (value, updateUI) {
				if (updateUI !== true) {
					return false;
				}
				stored = value;
				return true;
			},
			isTimeVarying: function () {
				return false;
			},
			areKeyframesSupported: function () {
				return true;
			}
		};
	}

	result = Test.makeNumericTestValue(100);
	assertEq("numeric test value", result.value, 101);
	result = Test.makeBooleanTestValue(true);
	assertEq("boolean invert true", result.value, false);
	result = Test.makeBooleanTestValue(false);
	assertEq("boolean invert false", result.value, true);
	result = Test.makePointTestValue([0.5, 0.5]);
	assert("point keeps array write shape", result.writeValue && result.writeValue[0] === 0.51 && result.writeValue[1] === 0.5);
	assert("point restore array", result.restoreValue && result.restoreValue[0] === 0.5 && result.restoreValue[1] === 0.5);
	assertEq("point does not use xy for array", result.shape, "index0");

	param = numberParam(100);
	result = Test.testParameter(param, { displayName: "Scale", kind: "number" }, { displayName: "Motion", matchName: "AE.ADBE Motion" });
	assertEq("numeric write ok", result.ok, true);
	assertEq("numeric original", result.originalValue, 100);
	assertEq("numeric testValue", result.testValue, 101);
	assertEq("numeric afterTest", result.afterTest, 101);
	assertEq("numeric restored", result.restoredValue, 100);
	assertEq("numeric verifiedTest", result.verifiedTest, true);
	assertEq("numeric verifiedRestore", result.verifiedRestore, true);
	assertEq("numeric live restored", param.getValue(), 100);
	assertEq("numeric operation", result.operation, "motion.write.test");
	assertEq("numeric method", result.writeMethod, "ComponentParam.setValue(value, true)");

	throwsOnWrite = {
		getValue: function () {
			return 100;
		},
		setValue: function () {
			throw new Error("setValue refused");
		},
		isTimeVarying: function () {
			return false;
		}
	};
	result = Test.testParameter(throwsOnWrite, { displayName: "Scale", kind: "number" }, { displayName: "Motion" });
	assertEq("failed write reason", result.reason, "WRITE_EXCEPTION");
	assertEq("failed write verified", result.verified, false);
	assertEq("failed write ok", result.ok, false);

	stored = 100;
	noopWrite = {
		getValue: function () {
			return stored;
		},
		setValue: function () {
			return true;
		},
		isTimeVarying: function () {
			return false;
		}
	};
	result = Test.testParameter(noopWrite, { displayName: "Scale", kind: "number" }, { displayName: "Motion" });
	assertEq("verification mismatch reason", result.reason, "WRITE_NOT_VERIFIED");
	assertEq("verification mismatch verifiedTest", result.verifiedTest, false);

	stored = 100;
	restoreFails = {
		getValue: function () {
			return stored;
		},
		setValue: function (value) {
			if (value === 101) {
				stored = 101;
			}
			return true;
		},
		isTimeVarying: function () {
			return false;
		}
	};
	result = Test.testParameter(restoreFails, { displayName: "Scale", kind: "number" }, { displayName: "Motion" });
	assertEq("restore failure reason", result.reason, "RESTORE_FAILED");
	assertEq("restore failure verifiedTest", result.verifiedTest, true);
	assertEq("restore failure verifiedRestore", result.verifiedRestore, false);
	assertEq("restore failure ok", result.ok, false);

	stored = true;
	param = {
		getValue: function () {
			return stored;
		},
		setValue: function (value, updateUI) {
			if (updateUI !== true) {
				return false;
			}
			stored = value;
			return true;
		},
		isTimeVarying: function () {
			return false;
		}
	};
	result = Test.testParameter(param, { displayName: "Uniform Scale", kind: "boolean" }, { displayName: "Motion" });
	assertEq("boolean write ok", result.ok, true);
	assertEq("boolean original", result.originalValue, true);
	assertEq("boolean testValue", result.testValue, false);
	assertEq("boolean restored", result.restoredValue, true);
	assertEq("boolean live restored", param.getValue(), true);

	stored = [0.5, 0.5];
	param = {
		getValue: function () {
			return stored;
		},
		setValue: function (value, updateUI) {
			if (updateUI !== true) {
				return false;
			}
			stored = [value[0], value[1]];
			return true;
		},
		isTimeVarying: function () {
			return false;
		}
	};
	result = Test.testParameter(param, { displayName: "Position", kind: "point" }, { displayName: "Motion" });
	assertEq("point write ok", result.ok, true);
	assert("point original array", result.originalValue && result.originalValue[0] === 0.5 && result.originalValue[1] === 0.5);
	assert("point test x only", result.testValue && result.testValue[0] === 0.51 && result.testValue[1] === 0.5);
	assert("point restored array", result.restoredValue && result.restoredValue[0] === 0.5 && result.restoredValue[1] === 0.5);
	assert("point write value was array not xy", Object.prototype.toString.call(result.requested) === "[object Array]");

	param = {
		getValue: function () {
			return 80;
		},
		setValue: function (value, updateUI) {
			return true;
		},
		isTimeVarying: function () {
			return true;
		}
	};
	result = Test.testParameter(param, { displayName: "Scale", kind: "number" }, { displayName: "Motion" });
	assertEq("time varying reason", result.reason, "PARAMETER_TIME_VARYING_UNSUPPORTED");
	assertEq("time varying settersCalled", result.settersCalled, false);

	result = Test.testParameter(null, { displayName: "Scale", kind: "number" }, { displayName: "Motion" });
	assertEq("missing parameter reason", result.reason, "PARAMETER_NOT_FOUND");

	param = {
		getValue: function () {
			return 100;
		},
		isTimeVarying: function () {
			return false;
		}
	};
	result = Test.testParameter(param, { displayName: "Scale", kind: "number" }, { displayName: "Motion" });
	assertEq("missing setValue reason", result.reason, "MISSING_SETVALUE");

	if (typeof $ === "undefined") {
		$ = {};
	}
	motion = {
		displayName: "Motion",
		matchName: "AE.ADBE Motion",
		properties: []
	};
	$._pickfxParameterResolver = {
		readString: function (obj, key) {
			return obj && obj[key] != null ? String(obj[key]) : null;
		},
		collectionCount: function (col) {
			return { count: col && col.length ? col.length : 0, via: "length" };
		},
		collectionIndexBase: function () {
			return 0;
		},
		collectionItem: function (col, index) {
			return col[index];
		}
	};
	result = Test.run({
		components: [motion]
	});
	assertEq("run missing Scale", result.ok, false);
	assertEq("run still reports six tests", result.tests.length, 6);
	assertEq("run first missing param", result.tests[0].reason, "PARAMETER_NOT_FOUND");

	result = Test.run({
		components: [{ displayName: "Opacity", matchName: "other", properties: [] }]
	});
	assertEq("missing Motion component", result.reason, "PARAMETER_NOT_FOUND");
	assert("missing Motion error", result.error && result.error.indexOf("Motion") !== -1);

	$._pickfxParameterResolver = {
		readString: function (obj, key) {
			return obj && obj[key] !== undefined && obj[key] !== null ? String(obj[key]) : "";
		},
		collectionCount: function (col) {
			return { count: col && col.length ? col.length : 0, via: "length" };
		},
		collectionIndexBase: function () {
			return 0;
		},
		collectionItem: function (col, index) {
			return col[index];
		},
		inspectIdentity: function () {
			return undefined;
		},
		inspectHostObject: function () {
			return { objectKeys: [], ownPropertyNames: [], prototypeChain: [] };
		},
		inspectParamCandidates: function () {
			return [];
		},
		inspectSafeValue: function (value) {
			return { value: value };
		}
	};
	result = MotionParameterInspect.findByDisplayName({
		mediaType: "Video",
		name: "Clip A",
		components: [
			{
				displayName: "Motion",
				matchName: "AE.ADBE Motion",
				properties: [
					{ displayName: "Scale", getValue: function () { return 100; }, setValue: function () {}, isTimeVarying: function () { return false; } },
					{ displayName: "Position", getValue: function () { return [0.5, 0.5]; }, setValue: function () {}, isTimeVarying: function () { return false; } }
				]
			},
			{
				displayName: "Opacity",
				matchName: "AE.ADBE Opacity",
				properties: [
					{
						displayName: "Opacity",
						getValue: function () { return 100; },
						setValue: function () {},
						isTimeVarying: function () { return false; }
					}
				]
			}
		]
	}, "Opacity");
	assertEq("opacity discovery ok", result.ok, true);
	assertEq("opacity discovery query", result.query, "Opacity");
	assertEq("opacity discovery settersCalled", result.settersCalled, false);
	assertEq("opacity discovery usedQE", result.usedQE, false);
	assert("opacity discovery match", result.matches && result.matches.length === 1);
	assertEq("opacity component displayName", result.matches[0].componentDisplayName, "Opacity");
	assertEq("opacity component matchName", result.matches[0].componentMatchName, "AE.ADBE Opacity");
	assertEq("opacity parameter displayName", result.matches[0].parameterDisplayName, "Opacity");
	assertEq("opacity runtime type", result.matches[0].runtimeType, "number");
	assertEq("opacity getValue", result.matches[0].getValue, 100);
	assertEq("opacity setValueAvailable", result.matches[0].setValueAvailable, true);
	assertEq("opacity diagnostic index", result.matches[0].diagnosticIndex, 0);
	assert("opacity timeVarying present", !!result.matches[0].timeVarying);

	result = MotionParameterInspect.findByDisplayName({
		mediaType: "Video",
		name: "Clip A",
		components: [{
			displayName: "Motion",
			matchName: "AE.ADBE Motion",
			properties: [{ displayName: "Scale", getValue: function () { return 100; }, setValue: function () {} }]
		}]
	}, "Opacity");
	assertEq("opacity missing reason", result.reason, "PARAMETER_NOT_FOUND");
	assertEq("opacity missing settersCalled", result.settersCalled, false);
}());
