(function () {
	var TEST_EFFECTS = [
		{ name: "Gaussian Blur", premiereName: "Gaussian Blur" },
		{ name: "Directional Blur", premiereName: "Directional Blur" },
		{ name: "Brightness & Contrast", premiereName: "Brightness & Contrast" }
	];
	var parsed;
	var clipCmd;
	var result;
	var writerCalls;
	var applyCalls;
	var fakeParam;
	var written;
	var storedPoint;
	var originalPointSet;
	var executorCalls;
	var lastExecutorPayload;

	parsed = CommandParser.parse("Gaussian Blur 50", TEST_EFFECTS, {});
	assertEq("parse Gaussian Blur 50 still command", parsed.isCommand, true);
	assertEq("parse Gaussian Blur 50 effect", parsed.effect && parsed.effect.name, "Gaussian Blur");
	assertEq("parse Gaussian Blur 50 value", parsed.value, 50);
	assertEq("parse Gaussian Blur Amount 80 parameter", CommandParser.parse("Gaussian Blur Amount 80", TEST_EFFECTS, {}).parameterQuery, "Amount");
	assertEq("parse Directional Blur 35", CommandParser.parse("Directional Blur 35", TEST_EFFECTS, {}).value, 35);
	assertEq("parse Directional Blur Angle 30 parameter", CommandParser.parse("Directional Blur Angle 30", TEST_EFFECTS, {}).parameterQuery, "Angle");
	assertEq("parse Brightness 25", CommandParser.parse("Brightness & Contrast 25", TEST_EFFECTS, {}).value, 25);
	assertEq("parse Brightness 25 effect", CommandParser.parse("Brightness & Contrast 25", TEST_EFFECTS, {}).effect && CommandParser.parse("Brightness & Contrast 25", TEST_EFFECTS, {}).effect.name, "Brightness & Contrast");
	assertEq("parse Brightness Contrast 40 keeps effect", CommandParser.parse("Brightness & Contrast Contrast 40", TEST_EFFECTS, {}).effect && CommandParser.parse("Brightness & Contrast Contrast 40", TEST_EFFECTS, {}).effect.name, "Brightness & Contrast");
	assertEq("named Brightness Contrast 40", CommandParser.parse("Brightness & Contrast Contrast 40", TEST_EFFECTS, {}).parameterQuery, "Contrast");
	assertEq("clip Brightness Contrast 40 not clip", CommandParser.parseClipParameter("Brightness & Contrast Contrast 40", TEST_EFFECTS, {}).isClipParameter, false);

	clipCmd = CommandParser.parseClipParameter("Gaussian Blur 50", TEST_EFFECTS, {});
	assertEq("blur numeric not stolen", clipCmd.handledByEffectNumeric, true);
	assertEq("blur numeric not clip", clipCmd.isClipParameter, false);

	clipCmd = CommandParser.parseClipParameter("Gaussian Blur Uniform Blur true", TEST_EFFECTS, {});
	assertEq("typed leftover not stolen", clipCmd.handledByEffectTyped, true);
	assertEq("typed leftover not clip", clipCmd.isClipParameter, false);

	clipCmd = CommandParser.parseClipParameter("Scale 120", TEST_EFFECTS, {});
	assertEq("scale is clip", clipCmd.isClipParameter, true);
	assertEq("scale name", clipCmd.parameterQuery, "Scale");
	assertEq("scale value", clipCmd.value, 120);
	assertEq("scale type", clipCmd.expectedType, "number");
	clipCmd = CommandParser.parseClipParameter("scale 120", TEST_EFFECTS, {});
	assertEq("scale lower is clip", clipCmd.isClipParameter, true);
	assertEq("scale lower name", clipCmd.parameterQuery, "Scale");
	assertEq("scale lower value", clipCmd.value, 120);
	clipCmd = CommandParser.parseClipParameter("SCALE 120", TEST_EFFECTS, {});
	assertEq("scale upper is clip", clipCmd.isClipParameter, true);
	assertEq("scale upper name", clipCmd.parameterQuery, "Scale");
	assertEq("scale upper value", clipCmd.value, 120);

	clipCmd = CommandParser.parseClipParameter("Scale 80", TEST_EFFECTS, {});
	assertEq("scale 80 value", clipCmd.value, 80);

	clipCmd = CommandParser.parseClipParameter("Scale Width 120", TEST_EFFECTS, {});
	assertEq("scale width is clip", clipCmd.isClipParameter, true);
	assertEq("scale width name", clipCmd.parameterQuery, "Scale Width");
	assertEq("scale width value", clipCmd.value, 120);
	assertEq("scale width type", clipCmd.expectedType, "number");

	clipCmd = CommandParser.parseClipParameter("Rotation 30", TEST_EFFECTS, {});
	assertEq("rotation 30", clipCmd.value, 30);
	clipCmd = CommandParser.parseClipParameter("Rotation -15", TEST_EFFECTS, {});
	assertEq("rotation negative", clipCmd.value, -15);

	clipCmd = CommandParser.parseClipParameter("Uniform Scale true", TEST_EFFECTS, {});
	assertEq("uniform scale true type", clipCmd.expectedType, "boolean");
	assertEq("uniform scale true", clipCmd.booleanValue, true);
	clipCmd = CommandParser.parseClipParameter("Uniform Scale false", TEST_EFFECTS, {});
	assertEq("uniform scale false", clipCmd.booleanValue, false);
	clipCmd = CommandParser.parseClipParameter("Uniform Scale on", TEST_EFFECTS, {});
	assertEq("uniform scale on", clipCmd.booleanValue, true);
	clipCmd = CommandParser.parseClipParameter("Uniform Scale off", TEST_EFFECTS, {});
	assertEq("uniform scale off", clipCmd.booleanValue, false);

	clipCmd = CommandParser.parseClipParameter("Position 0.6 0.5", TEST_EFFECTS, {});
	assertEq("position is clip", clipCmd.isClipParameter, true);
	assertEq("position name", clipCmd.parameterQuery, "Position");
	assert("position is array", clipCmd.value && clipCmd.value.length === 2);
	assertEq("position x", clipCmd.value[0], 0.6);
	assertEq("position y", clipCmd.value[1], 0.5);
	assertEq("position type", clipCmd.expectedType, "point");

	clipCmd = CommandParser.parseClipParameter("Position 0.25 0.75", TEST_EFFECTS, {});
	assertEq("position 0.25 x", clipCmd.value[0], 0.25);
	assertEq("position 0.75 y", clipCmd.value[1], 0.75);

	clipCmd = CommandParser.parseClipParameter("Anchor Point 0.5 0.5", TEST_EFFECTS, {});
	assertEq("anchor name", clipCmd.parameterQuery, "Anchor Point");
	assert("anchor is array", clipCmd.value && clipCmd.value[0] === 0.5 && clipCmd.value[1] === 0.5);

	clipCmd = CommandParser.parseClipParameter("Anchor Point 0.25 0.75", TEST_EFFECTS, {});
	assertEq("anchor 0.25 x", clipCmd.value[0], 0.25);
	assertEq("anchor 0.75 y", clipCmd.value[1], 0.75);

	clipCmd = CommandParser.parseClipParameter("Position x 0.6 y 0.5", TEST_EFFECTS, {});
	assert("named axes array", clipCmd.value && clipCmd.value[0] === 0.6 && clipCmd.value[1] === 0.5);

	clipCmd = CommandParser.parseClipParameter("Position 0.5", TEST_EFFECTS, {});
	assertEq("too few coordinates clip", clipCmd.isClipParameter, true);
	assertEq("too few coordinates reason", clipCmd.reason, "INVALID_VALUE");

	clipCmd = CommandParser.parseClipParameter("Position 0.5 0.5 0.5", TEST_EFFECTS, {});
	assertEq("too many coordinates clip", clipCmd.isClipParameter, true);
	assertEq("too many coordinates reason", clipCmd.reason, "INVALID_VALUE");

	clipCmd = CommandParser.parseClipParameter("Position abc 0.5", TEST_EFFECTS, {});
	assertEq("invalid point clip", clipCmd.isClipParameter, true);
	assertEq("invalid point reason", clipCmd.reason, "INVALID_VALUE");

	clipCmd = CommandParser.parseClipParameter("Opacity 50", TEST_EFFECTS, {});
	assertEq("opacity 50 still parsed", clipCmd.value, 50);
	assertEq("opacity 50 is clip", clipCmd.isClipParameter, true);
	assertEq("opacity 50 name", clipCmd.parameterQuery, "Opacity");
	assertEq("opacity 50 type", clipCmd.expectedType, "number");
	assertEq("opacity 50 not effect", clipCmd.handledByEffectNumeric, undefined);

	clipCmd = CommandParser.parseClipParameter("Scale Height 120", TEST_EFFECTS, {});
	assertEq("scale height is clip", clipCmd.isClipParameter, true);
	assertEq("scale height name", clipCmd.parameterQuery, "Scale Height");
	assertEq("scale height value", clipCmd.value, 120);
	assertEq("scale height type", clipCmd.expectedType, "number");

	clipCmd = CommandParser.parseClipParameter("Anti-flicker Filter 1", TEST_EFFECTS, {});
	assertEq("anti-flicker is clip", clipCmd.isClipParameter, true);
	assertEq("anti-flicker name", clipCmd.parameterQuery, "Anti-flicker Filter");
	assertEq("anti-flicker value", clipCmd.value, 1);

	clipCmd = CommandParser.parseClipParameter("Crop Left 10", TEST_EFFECTS, {});
	assertEq("crop left is clip", clipCmd.isClipParameter, true);
	assertEq("crop left name", clipCmd.parameterQuery, "Crop Left");
	assertEq("crop left value", clipCmd.value, 10);
	clipCmd = CommandParser.parseClipParameter("Crop Top 10", TEST_EFFECTS, {});
	assertEq("crop top value", clipCmd.value, 10);
	clipCmd = CommandParser.parseClipParameter("Crop Right 10", TEST_EFFECTS, {});
	assertEq("crop right value", clipCmd.value, 10);
	clipCmd = CommandParser.parseClipParameter("Crop Bottom 10", TEST_EFFECTS, {});
	assertEq("crop bottom value", clipCmd.value, 10);

	clipCmd = CommandParser.parseClipParameter("Uniform Scale 0", TEST_EFFECTS, {});
	assertEq("boolean rejects 0", clipCmd.reason, "INVALID_VALUE");
	assertEq("boolean 0 not written as number", clipCmd.booleanValue, undefined);
	clipCmd = CommandParser.parseClipParameter("Uniform Scale 1", TEST_EFFECTS, {});
	assertEq("boolean rejects 1", clipCmd.reason, "INVALID_VALUE");

	clipCmd = CommandParser.parseClipParameter("Speed 200", TEST_EFFECTS, {});
	assertEq("speed parsed as clip name", clipCmd.parameterQuery, "Speed");
	assert("speed is speed command", SpeedOperation.isSpeedCommand(clipCmd.parameterQuery));
	result = SpeedOperation.unsupportedWrite();
	assertEq("speed reason", result.reason, "UNSUPPORTED_OPERATION");
	assertEq("speed writeSupported", result.writeSupported, false);
	assertEq("speed detail", result.detail, "NO_PROVEN_PUBLIC_WRITE_API");

	assertEq("clip footer scale", BatchNumericExecutor.formatSuccessFooter({
		clipParameter: true,
		parameter: "Scale",
		value: 120,
		selectedCount: 1
	}), "✓ Scale 120");
	assertEq("clip footer scale multi", BatchNumericExecutor.formatSuccessFooter({
		clipParameter: true,
		parameter: "Scale",
		value: 120,
		selectedCount: 4
	}), "✓ Scale 120 · 4 clips");
	assertEq("clip footer position", BatchNumericExecutor.formatSuccessFooter({
		clipParameter: true,
		parameter: "Position",
		value: [0.6, 0.5],
		selectedCount: 4
	}), "✓ Position 0.6 0.5 · 4 clips");
	assertEq("clip footer position one", BatchNumericExecutor.formatSuccessFooter({
		clipParameter: true,
		parameter: "Position",
		value: [0.6, 0.5],
		selectedCount: 1
	}), "✓ Position 0.6 0.5");
	assertEq("effect footer unchanged", BatchNumericExecutor.formatSuccessFooter({
		effect: "Gaussian Blur",
		parameter: "Amount",
		value: 30,
		selectedCount: 4
	}), "✓ Gaussian Blur · Amount 30 · 4 clips");

	if (typeof $ === "undefined") {
		$ = {};
	}
	writerCalls = [];
	applyCalls = 0;
	originalPointSet = PointParameterWriter.set;
	EffectExecutor = {
		apply: function () {
			applyCalls += 1;
		},
		applyEffect: function () {
			applyCalls += 1;
		}
	};
	fakeParam = {
		getValue: function () {
			return 100;
		},
		setValue: function () {
			return true;
		},
		isTimeVarying: function () {
			return false;
		}
	};
	$._pickfxParameterResolver = {
		resolveMotionParameter: function () {
			return {
				ok: true,
				effect: { displayName: "Motion", matchName: "AE.ADBE Motion" },
				parameter: { displayName: "Scale" },
				_param: fakeParam
			};
		},
		resolve: function () {
			return {
				ok: true,
				effect: { displayName: "Motion" },
				parameter: { displayName: "Position" },
				_param: {
					getValue: function () {
						return [0.5, 0.5];
					}
				}
			};
		}
	};
	$._pickfxParameterWriter = {
		set: function (trackItem, componentName, parameterName, value) {
			writerCalls.push("number:" + value);
			assertEq("numeric writer component is Motion", componentName, "Motion");
			return {
				ok: true,
				verified: true,
				effect: componentName,
				parameter: parameterName,
				requestedValue: value,
				actualValue: value,
				readBack: value,
				type: "number",
				method: "setValue(value, true)"
			};
		},
		setTyped: function (trackItem, componentName, parameterName, value) {
			writerCalls.push("boolean:" + String(value));
			return {
				ok: true,
				verified: true,
				effect: componentName,
				parameter: parameterName,
				actualValue: value,
				type: "boolean"
			};
		}
	};

	written = ClipParameterWriter.set({}, "Scale", { numbers: [120], value: 120 });
	assertEq("numeric clip writer used proven set", writerCalls[0], "number:120");
	assertEq("numeric clip ok", written.ok, true);
	assertEq("numeric clipParameter flag", written.clipParameter, true);
	assertEq("numeric did not apply effect", applyCalls, 0);

	writerCalls = [];
	written = ClipParameterWriter.set({}, "Scale Width", { numbers: [120], value: 120 });
	assertEq("scale width used numeric writer", writerCalls[0], "number:120");

	written = ClipParameterWriter.set({}, "Scale", { numbers: [120, 80] });
	assertEq("extra args on number", written.reason, "INVALID_VALUE");

	written = PointParameterWriter.set({}, "Motion", "Position", [0.6, 0.5]);
	assertEq("missing setter", written.reason, "PARAMETER_NOT_WRITABLE");

	fakeParam.getValue = function () {
		return [0.5, 0.5];
	};
	PointParameterWriter.set = function (trackItem, componentName, parameterName, point) {
		writerCalls.push("point:" + point[0] + "," + point[1]);
		assert("point write value is array", point && point.length === 2);
		return {
			ok: true,
			verified: true,
			effect: componentName,
			parameter: parameterName,
			requestedValue: point,
			actualValue: point,
			parameterType: "point",
			type: "point",
			method: "setValue(value, true)"
		};
	};
	written = ClipParameterWriter.set({}, "Position", { numbers: [0.6, 0.5], value: [0.6, 0.5] });
	assert("point writer used", writerCalls.indexOf("point:0.6,0.5") !== -1);
	assertEq("point clip ok", written.ok, true);
	assertEq("point did not apply effect", applyCalls, 0);

	written = ClipParameterWriter.set({}, "Position", { numbers: [0.5] });
	assertEq("too few coordinates writer", written.reason, "INVALID_VALUE");
	written = ClipParameterWriter.set({}, "Position", { numbers: [0.5, 0.5, 0.5] });
	assertEq("too many coordinates writer", written.reason, "INVALID_VALUE");

	fakeParam.getValue = function () {
		return true;
	};
	written = ClipParameterWriter.set({}, "Uniform Scale", { booleanValue: true, value: true });
	assert("boolean writer used true", writerCalls.indexOf("boolean:true") !== -1);
	written = ClipParameterWriter.set({}, "Uniform Scale", { booleanValue: false, value: false });
	assert("boolean writer used false", writerCalls.indexOf("boolean:false") !== -1);

	fakeParam.getValue = function () {
		return 100;
	};
	fakeParam.isTimeVarying = function () {
		return true;
	};
	writerCalls = [];
	written = ClipParameterWriter.set({}, "Scale", { numbers: [120], value: 120 });
	assertEq("time varying reason", written.reason, "PARAMETER_TIME_VARYING_UNSUPPORTED");
	assertEq("time varying did not write", writerCalls.length, 0);

	fakeParam.isTimeVarying = function () {
		return false;
	};
	fakeParam.getValue = function () {
		return { r: 1, g: 2, b: 3 };
	};
	written = ClipParameterWriter.set({}, "Color", { numbers: [1] });
	assertEq("wrong type color", written.reason, "UNSUPPORTED_TYPE");

	fakeParam.getValue = function () {
		return 100;
	};
	delete fakeParam.setValue;
	written = ClipParameterWriter.set({}, "Scale", { numbers: [120], value: 120 });
	assertEq("clip missing setter", written.reason, "PARAMETER_NOT_WRITABLE");
	fakeParam.setValue = function () {
		return true;
	};

	$._pickfxParameterResolver.resolveMotionParameter = function () {
		return { ok: false, reason: "PARAMETER_NOT_FOUND", detail: "missing" };
	};
	writerCalls = [];
	written = ClipParameterWriter.set({}, "NoSuch", { numbers: [1] });
	assertEq("missing param", written.reason, "PARAMETER_NOT_FOUND");
	assertEq("missing param did not write", writerCalls.length, 0);
	assertEq("missing param did not apply effect", applyCalls, 0);

	result = BatchNumericExecutor.summarize({
		effect: "",
		parameter: "Scale",
		requestedValue: 120
	}, [
		{ clip: "A", ok: true, verified: true, requestedValue: 120, actualValue: 120 },
		{ clip: "B", ok: true, verified: true, requestedValue: 120, actualValue: 120 },
		{ clip: "C", ok: true, verified: true, requestedValue: 120, actualValue: 120 },
		{ clip: "D", ok: true, verified: true, requestedValue: 120, actualValue: 120 }
	]);
	result.clipParameter = true;
	result = BatchNumericExecutor.toCommandPayload(result, {
		parameter: "Scale",
		value: 120,
		clipParameter: true,
		type: "number"
	});
	assertEq("multi clip scale selected", result.selectedCount, 4);
	assertEq("multi clip scale successful", result.successfulCount, 4);
	assertEq("multi clip scale failed", result.failedCount, 0);
	assertEq("multi clip scale verified", result.verifiedCount, 4);
	assertEq("multi clip scale footer", BatchNumericExecutor.formatSuccessFooter(result), "✓ Scale 120 · 4 clips");

	result = BatchNumericExecutor.summarize({
		effect: "",
		parameter: "Position",
		requestedValue: [0.6, 0.5]
	}, [
		{ clip: "A", ok: true, verified: true, requestedValue: [0.6, 0.5], actualValue: [0.6, 0.5] },
		{ clip: "B", ok: false, verified: false, reason: "VALUE_NOT_VERIFIED", requestedValue: [0.6, 0.5], actualValue: [0.5, 0.5] },
		{ clip: "C", ok: true, verified: true, requestedValue: [0.6, 0.5], actualValue: [0.6, 0.5] },
		{ clip: "D", ok: true, verified: true, requestedValue: [0.6, 0.5], actualValue: [0.6, 0.5] }
	]);
	result.clipParameter = true;
	result = BatchNumericExecutor.toCommandPayload(result, {
		parameter: "Position",
		value: [0.6, 0.5],
		clipParameter: true,
		type: "point"
	});
	assertEq("multi clip partial selected", result.selectedCount, 4);
	assertEq("multi clip partial successful", result.successfulCount, 3);
	assertEq("multi clip partial failed", result.failedCount, 1);
	assertEq("multi clip partial verified", result.verifiedCount, 3);
	assert("multi clip partial has clips", result.clips && result.clips.length === 4);

	PointParameterWriter.set = originalPointSet;
	storedPoint = [0.5, 0.5];
	$._pickfxParameterResolver.resolve = function () {
		return {
			ok: true,
			effect: { displayName: "Motion" },
			parameter: { displayName: "Position" },
			_param: {
				getValue: function () {
					return storedPoint;
				},
				setValue: function (value, updateUI) {
					if (updateUI !== true) {
						return false;
					}
					storedPoint = [value[0], value[1]];
					return true;
				}
			}
		};
	};
	written = PointParameterWriter.set({}, "Motion", "Position", [0.6, 0.5]);
	assertEq("point write ok", written.ok, true);
	assertEq("point write verified", written.verified, true);
	assert("point requested array", written.requestedValue && written.requestedValue[0] === 0.6 && written.requestedValue[1] === 0.5);
	assert("point actual array", written.actualValue && written.actualValue[0] === 0.6 && written.actualValue[1] === 0.5);
	assert("point live stored array", storedPoint[0] === 0.6 && storedPoint[1] === 0.5);
	assertEq("point method", written.method, "setValue(value, true)");

	$._pickfxParameterResolver.resolve = function () {
		return {
			ok: true,
			effect: { displayName: "Motion" },
			parameter: { displayName: "Position" },
			_param: {
				getValue: function () {
					return [0.5, 0.5];
				},
				setValue: function () {
					return true;
				}
			}
		};
	};
	written = PointParameterWriter.set({}, "Motion", "Position", [0.6, 0.5]);
	assertEq("read-back mismatch", written.reason, "VALUE_NOT_VERIFIED");
	assertEq("read-back mismatch verified", written.verified, false);

	executorCalls = 0;
	lastExecutorPayload = null;
	PremiereBridge = {
		setClipParameter: function () {
			executorCalls += 1;
		}
	};
	CommandExecutor.runClipParameter(null, CommandParser.parseClipParameter("Position 0.5", TEST_EFFECTS, {}), function (payload) {
		lastExecutorPayload = payload;
	});
	assertEq("invalid point never writes", executorCalls, 0);
	assertEq("invalid point executor reason", lastExecutorPayload && lastExecutorPayload.reason, "INVALID_VALUE");
	assertEq("invalid point did not apply", applyCalls, 0);
}());
