(function () {
	var classified;
	var generated;
	var clip;
	var inspected;
	var probe;
	var written;
	var enabled;
	var result;
	var applyCalls;
	var clips;

	function mockResolver() {
		return {
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
			inspectRealEnumOptions: function (param) {
				return (param && param.enumOptions) || [];
			}
		};
	}

	function numberParam(name, initial, extras) {
		var value = initial;
		extras = extras || {};
		return {
			displayName: name,
			matchName: extras.matchName || "",
			min: extras.min,
			max: extras.max,
			items: extras.items,
			valueNames: extras.valueNames,
			options: extras.options,
			enumItems: extras.enumItems,
			listItems: extras.listItems,
			getItem: extras.getItem,
			getListItem: extras.getListItem,
			getValueName: extras.getValueName,
			getValueNames: extras.getValueNames,
			getOptions: extras.getOptions,
			getValue: extras.getValue || function () {
				return value;
			},
			setValue: extras.setValue || function (next, updateUI) {
				if (updateUI !== true) {
					return false;
				}
				value = next;
				return true;
			},
			isTimeVarying: extras.isTimeVarying || function () {
				return false;
			},
			areKeyframesSupported: function () {
				return true;
			}
		};
	}

	function videoClip(components, name) {
		return {
			name: name || "Clip A",
			mediaType: "Video",
			components: components
		};
	}

	function liveNumericWriter() {
		return {
			set: function (trackItem, componentName, parameterName, value) {
				var resolved = UniversalParameterResolver.resolve(trackItem, parameterName, componentName);
				var param = resolved && resolved._param;
				var actual;
				if (!param || typeof param.setValue !== "function") {
					return {
						ok: false,
						reason: "PARAMETER_NOT_FOUND",
						effect: componentName,
						parameter: parameterName
					};
				}
				param.setValue(value, true);
				actual = param.getValue();
				return {
					ok: actual === value,
					verified: actual === value,
					effect: componentName,
					component: componentName,
					parameter: parameterName,
					requestedValue: value,
					actualValue: actual,
					readBack: actual,
					type: "number",
					method: "setValue(value, true)"
				};
			}
		};
	}

	if (typeof ConfirmedParameterWrites !== "undefined" && ConfirmedParameterWrites.resetSession) {
		ConfirmedParameterWrites.resetSession();
	}
	if (typeof $ === "undefined") {
		$ = {};
	}
	$._pickfxParameterResolver = mockResolver();
	$._pickfxParameterWriter = liveNumericWriter();

	classified = NumericCandidateClassifier.classify({
		displayName: "Saturation",
		componentDisplayName: "Lumetri Color",
		runtimeType: "number",
		currentValue: 100,
		hasGetValue: true,
		hasSetValue: true,
		timeVarying: false
	});
	assertEq("v2 numeric production status", classified.status, "PRODUCTION_ENABLED");
	assertEq("v2 numeric production candidate flag", classified.candidate, false);
	assertEq("v2 numeric production enabled", classified.productionEnabled, true);

	classified = NumericCandidateClassifier.classify({
		displayName: "Vibrance",
		componentDisplayName: "Lumetri Color",
		runtimeType: "number",
		currentValue: 0,
		hasGetValue: true,
		hasSetValue: true,
		timeVarying: false
	});
	assertEq("v2 unpromoted candidate", classified.status, "CANDIDATE");
	assertEq("v2 unpromoted candidate flag", classified.candidate, true);
	assertEq("v2 unpromoted not production", classified.productionEnabled, false);

	classified = NumericCandidateClassifier.classify({
		displayName: "",
		componentDisplayName: "Lumetri Color",
		runtimeType: "number",
		hasGetValue: true,
		hasSetValue: true
	});
	assertEq("v2 empty displayName status", classified.status, "REJECTED");
	assertEq("v2 empty displayName reason", classified.reason, "EMPTY_DISPLAY_NAME");

	classified = NumericCandidateClassifier.classify({
		displayName: "Saturation",
		componentDisplayName: "",
		runtimeType: "number",
		hasGetValue: true,
		hasSetValue: true
	});
	assertEq("v2 no component identity", classified.reason, "NO_SAFE_IDENTITY");

	classified = NumericCandidateClassifier.classify({
		displayName: "Saturation",
		componentDisplayName: "Lumetri Color",
		runtimeType: "number",
		hasGetValue: false,
		hasSetValue: true
	});
	assertEq("v2 missing getValue", classified.reason, "NO_GET_VALUE");

	classified = NumericCandidateClassifier.classify({
		displayName: "Saturation",
		componentDisplayName: "Lumetri Color",
		runtimeType: "number",
		hasGetValue: true,
		hasSetValue: false
	});
	assertEq("v2 missing setValue", classified.reason, "NO_SET_VALUE");

	classified = NumericCandidateClassifier.classify({
		displayName: "Saturation",
		componentDisplayName: "Lumetri Color",
		runtimeType: "number",
		hasGetValue: true,
		hasSetValue: true,
		timeVarying: true
	});
	assertEq("v2 time varying status", classified.status, "REJECTED");
	assertEq("v2 time varying reason", classified.reason, "TIME_VARYING");

	classified = NumericCandidateClassifier.classify({
		displayName: "Fill",
		componentDisplayName: "Color",
		runtimeType: "color",
		hasGetValue: true,
		hasSetValue: true
	});
	assertEq("v2 color unsupported", classified.reason, "UNSUPPORTED_TYPE");

	classified = NumericCandidateClassifier.classify({
		displayName: "Blend Mode",
		componentDisplayName: "Opacity",
		runtimeType: "number",
		currentValue: 18,
		hasGetValue: true,
		hasSetValue: true
	});
	assertEq("v2 blend enum-like status", classified.status, "ENUM_LIKE_NUMBER");
	assertEq("v2 blend enum-like reason", classified.reason, "ENUM_LIKE_NUMBER");

	classified = NumericCandidateClassifier.classify({
		displayName: "Mode",
		componentDisplayName: "Lumetri Color",
		runtimeType: "number",
		currentValue: 1,
		hasGetValue: true,
		hasSetValue: true,
		hasGetValueNames: true
	});
	assertEq("v2 enum metadata rejected", classified.reason, "ENUM_LIKE_NUMBER");

	classified = NumericCandidateClassifier.classify({
		displayName: "Scale Height",
		componentDisplayName: "Motion",
		runtimeType: "number",
		currentValue: 100,
		hasGetValue: true,
		hasSetValue: true
	});
	assertEq("v2 scale height status", classified.status, "REJECTED");
	assertEq("v2 scale height reason", classified.reason, "PARAMETER_NOT_FOUND");

	classified = NumericCandidateClassifier.classify({
		displayName: "Opacity",
		componentDisplayName: "Opacity",
		runtimeType: "number",
		currentValue: 80,
		hasGetValue: true,
		hasSetValue: true
	});
	assertEq("v2 opacity production status", classified.status, "PRODUCTION_ENABLED");
	assertEq("v2 opacity productionEnabled", classified.productionEnabled, true);

	generated = SafeNumericTestValue.generate(0);
	assertEq("v2 test from 0", generated.value, 1);
	generated = SafeNumericTestValue.generate(1);
	assertEq("v2 test from 1", generated.value, 2);
	generated = SafeNumericTestValue.generate(100);
	assertEq("v2 test from 100", generated.value, 101);
	generated = SafeNumericTestValue.generate(10, { min: 0, max: 10 });
	assertEq("v2 test clamped at max", generated.value, 9);
	generated = SafeNumericTestValue.generate(1, { min: 1, max: 1 });
	assertEq("v2 no safe when min=max", generated.reason, "NO_SAFE_TEST_VALUE");
	generated = SafeNumericTestValue.generate("x");
	assertEq("v2 no safe non-number", generated.reason, "NO_SAFE_TEST_VALUE");
	assertEq("v2 verify exact", SafeNumericTestValue.verify(50, 50), true);
	assertEq("v2 verify epsilon", SafeNumericTestValue.verify(50, 50.00005), true);
	assertEq("v2 verify outside epsilon", SafeNumericTestValue.verify(50, 50.001), false);

	clip = videoClip([
		{
			displayName: "Lumetri Color",
			matchName: "AE.ADBE Lumetri",
			properties: [
				numberParam("Saturation", 40),
				numberParam("Vibrance", 0),
				numberParam("Blend Mode", 2, { getValueNames: function () { return ["A", "B"]; } }),
				numberParam("", 1)
			]
		},
		{
			displayName: "Opacity",
			matchName: "AE.ADBE Opacity",
			properties: [numberParam("Opacity", 80)]
		},
		{
			displayName: "Color",
			matchName: "color",
			properties: [{
				displayName: "Fill",
				getValue: function () {
					return { r: 1, g: 2, b: 3 };
				},
				setValue: function () {},
				isTimeVarying: function () {
					return false;
				}
			}]
		}
	]);
	inspected = NumericCandidateScan.scan(clip);
	assertEq("v2 scan ok", inspected.ok, true);
	assertEq("v2 scan settersCalled", inspected.settersCalled, false);
	assertEq("v2 scan usedQE", inspected.usedQE, false);
	assert("v2 scan number discovered", inspected.capabilities.number.discovered >= 4);
	assert("v2 scan has candidate", inspected.capabilities.number.candidate >= 1);
	assert("v2 scan has confirmed", inspected.capabilities.number.confirmed >= 1);
	assertEq("v2 scan productionEnabled", inspected.capabilities.number.productionEnabled, 2);
	assert("v2 scan writeCandidates", inspected.writeCandidates && inspected.writeCandidates.length >= 1);
	assert("v2 scan confirmedProduction", inspected.confirmedProduction && inspected.confirmedProduction.length >= 1);
	assert("v2 scan rejected", inspected.rejected && inspected.rejected.length >= 1);
	assert("v2 scan unsupported", inspected.unsupported && inspected.unsupported.length >= 1);
	assertEq("v2 scan candidate name", inspected.writeCandidates[0].parameter, "Vibrance");
	assertEq("v2 scan candidate not writable claim", inspected.writeCandidates[0].writable, false);

	probe = ParameterWriteTest.runNumeric(clip, "Lumetri Color", "Saturation");
	assertEq("v2 numeric write ok", probe.ok, true);
	assertEq("v2 numeric write status", probe.status, "WRITE_CONFIRMED");
	assertEq("v2 numeric write productionEnabled", probe.productionEnabled, true);
	assertEq("v2 numeric write original", probe.originalValue, 40);
	assertEq("v2 numeric write test", probe.testValue, 41);
	assertEq("v2 numeric write after", probe.afterTest, 41);
	assertEq("v2 numeric write restored", probe.restoredValue, 40);
	assertEq("v2 numeric write verifiedTest", probe.verifiedTest, true);
	assertEq("v2 numeric write verifiedRestore", probe.verifiedRestore, true);
	assertEq("v2 numeric write method", probe.writeMethod, "ComponentParam.setValue(value, true)");
	assertEq("v2 numeric write timeVarying", probe.timeVarying, false);
	assertEq("v2 numeric write runtimeType", probe.runtimeType, "number");
	assertEq("v2 numeric write live restored", clip.components[0].properties[0].getValue(), 40);
	assertEq("v2 confirmed production enabled", ConfirmedParameterWrites.isProductionEnabled("Saturation", "Lumetri Color"), true);

	written = ConfirmedParameterWrites.write(clip, "Saturation", { numbers: [12], value: 12 });
	assertEq("v2 production write before enable ok", written.ok, true);
	assertEq("v2 production write before enable enabled", written.productionEnabled, true);
	assertEq("v2 production write before enable live", clip.components[0].properties[0].getValue(), 12);

	enabled = ConfirmedParameterWrites.enableProduction("Lumetri Color", "Saturation");
	assertEq("v2 enable production ok", enabled.ok, true);
	assertEq("v2 enable production flag", ConfirmedParameterWrites.isProductionEnabled("Saturation", "Lumetri Color"), true);
	written = ConfirmedParameterWrites.write(clip, "Saturation", { numbers: [18], value: 18 });
	assertEq("v2 promoted write ok", written.ok, true);
	assertEq("v2 promoted write verified", written.verified, true);
	assertEq("v2 promoted write live", clip.components[0].properties[0].getValue(), 18);

	probe = ParameterWriteTest.runNumeric(clip, "Lumetri Color", "Blend Mode");
	assertEq("v2 numeric blend rejected", probe.reason, "ENUM_LIKE_NUMBER");
	assertEq("v2 numeric blend no write", probe.settersCalled, false);

	probe = ParameterWriteTest.runNumeric(clip, "Motion", "Scale Height");
	assertEq("v2 numeric scale height missing", probe.reason, "PARAMETER_NOT_FOUND");

	clip = videoClip([{
		displayName: "Motion",
		matchName: "AE.ADBE Motion",
		properties: [numberParam("Scale Height", 100)]
	}]);
	probe = ParameterWriteTest.runNumeric(clip, "Motion", "Scale Height");
	assertEq("v2 scale height live rejected", probe.reason, "PARAMETER_NOT_FOUND");
	assertEq("v2 scale height live no write", probe.settersCalled, false);
	assertEq("v2 scale height live untouched", clip.components[0].properties[0].getValue(), 100);
	written = ConfirmedParameterWrites.write(clip, "Scale Height", { numbers: [80], value: 80 });
	assertEq("v2 scale height production reason", written.reason, "PARAMETER_NOT_FOUND");
	assertEq("v2 scale height production live", clip.components[0].properties[0].getValue(), 100);

	clip = videoClip([{
		displayName: "Lumetri Color",
		matchName: "AE.ADBE Lumetri",
		properties: [numberParam("Contrast", 10, {
			isTimeVarying: function () {
				return true;
			}
		})]
	}]);
	probe = ParameterWriteTest.runNumeric(clip, "Lumetri Color", "Contrast");
	assertEq("v2 probe time varying", probe.reason, "PARAMETER_TIME_VARYING_UNSUPPORTED");
	assertEq("v2 probe time varying no setter", probe.settersCalled, false);

	clip = videoClip([{
		displayName: "Lumetri Color",
		matchName: "AE.ADBE Lumetri",
		properties: [{
			displayName: "Saturation",
			setValue: function () {}
		}]
	}]);
	probe = ParameterWriteTest.runNumeric(clip, "Lumetri Color", "Saturation");
	assertEq("v2 probe no getValue", probe.reason, "NO_GET_VALUE");
	assertEq("v2 probe no getValue setters", probe.settersCalled, false);

	clip = videoClip([{
		displayName: "Lumetri Color",
		matchName: "AE.ADBE Lumetri",
		properties: [{
			displayName: "Saturation",
			getValue: function () {
				return 10;
			},
			isTimeVarying: function () {
				return false;
			}
		}]
	}]);
	probe = ParameterWriteTest.runNumeric(clip, "Lumetri Color", "Saturation");
	assertEq("v2 probe no setValue", probe.reason, "NO_SET_VALUE");
	assertEq("v2 probe no setValue setters", probe.settersCalled, false);

	clip = videoClip([{
		displayName: "Lumetri Color",
		matchName: "AE.ADBE Lumetri",
		properties: [numberParam("Locked", 5, { min: 5, max: 5 })]
	}]);
	probe = ParameterWriteTest.runNumeric(clip, "Lumetri Color", "Locked");
	assertEq("v2 no safe test value", probe.reason, "NO_SAFE_TEST_VALUE");
	assertEq("v2 no safe test setters", probe.settersCalled, false);
	assertEq("v2 no safe test live", clip.components[0].properties[0].getValue(), 5);

	clip = videoClip([{
		displayName: "Lumetri Color",
		matchName: "AE.ADBE Lumetri",
		properties: [numberParam("Saturation", 100, {
			setValue: function () {
				return true;
			}
		})]
	}]);
	probe = ParameterWriteTest.runNumeric(clip, "Lumetri Color", "Saturation");
	assertEq("v2 write verify fail", probe.reason, "VALUE_NOT_VERIFIED");
	assertEq("v2 write verify fail test", probe.verifiedTest, false);

	clip = videoClip([{
		displayName: "Lumetri Color",
		matchName: "AE.ADBE Lumetri",
		properties: [(function () {
			var value = 100;
			return {
				displayName: "Restore Probe",
				getValue: function () {
					return value;
				},
				setValue: function (next, updateUI) {
					if (updateUI !== true) {
						return false;
					}
					if (next !== 100) {
						value = next;
					}
					return true;
				},
				isTimeVarying: function () {
					return false;
				},
				areKeyframesSupported: function () {
					return true;
				}
			};
		}())]
	}]);
	probe = ParameterWriteTest.runNumeric(clip, "Lumetri Color", "Restore Probe");
	assertEq("v2 restore verify fail", probe.reason, "VALUE_NOT_VERIFIED");
	assertEq("v2 restore verify fail test", probe.verifiedTest, true);
	assertEq("v2 restore verify fail restore", probe.verifiedRestore, false);
	assertEq("v2 restore verify fail status", probe.status, "WRITE_TESTED");

	clips = [
		{
			clip: "A",
			ok: true,
			verified: true,
			component: "Lumetri Color",
			parameter: "Saturation",
			requestedValue: 12,
			actualValue: 12
		},
		{
			clip: "B",
			ok: true,
			verified: true,
			component: "Lumetri Color",
			parameter: "Saturation",
			requestedValue: 12,
			actualValue: 12
		}
	];
	result = BatchNumericExecutor.summarize({
		effect: "",
		parameter: "Saturation",
		requestedValue: 12
	}, clips);
	assertEq("v2 multi success selected", result.selectedCount, 2);
	assertEq("v2 multi success successful", result.successfulCount, 2);
	assertEq("v2 multi success failed", result.failedCount, 0);
	assertEq("v2 multi success verified", result.verifiedCount, 2);

	result = BatchNumericExecutor.summarize({
		effect: "",
		parameter: "Saturation",
		requestedValue: 12
	}, [
		{
			clip: "A",
			ok: true,
			verified: true,
			component: "Lumetri Color",
			parameter: "Saturation",
			requestedValue: 12,
			actualValue: 12
		},
		{
			clip: "B",
			ok: false,
			verified: false,
			component: "Lumetri Color",
			parameter: "Saturation",
			requestedValue: 12,
			reason: "PARAMETER_NOT_FOUND"
		}
	]);
	assertEq("v2 multi mixed selected", result.selectedCount, 2);
	assertEq("v2 multi mixed successful", result.successfulCount, 1);
	assertEq("v2 multi mixed failed", result.failedCount, 1);
	assertEq("v2 multi mixed verified", result.verifiedCount, 1);
	assertEq("v2 multi mixed reason", result.reason, "PARAMETER_NOT_FOUND");

	applyCalls = 0;
	EffectExecutor = {
		applyEffect: function () {
			applyCalls += 1;
		}
	};
	assertEq("v2 gaussian still effect", CommandParser.parse("Gaussian Blur 50", [
		{ name: "Gaussian Blur", premiereName: "Gaussian Blur" },
		{ name: "Directional Blur", premiereName: "Directional Blur" },
		{ name: "Brightness & Contrast", premiereName: "Brightness & Contrast" }
	], {}).value, 50);
	assertEq("v2 gaussian clip path blocked", CommandParser.parseClipParameter("Gaussian Blur 50", [
		{ name: "Gaussian Blur", premiereName: "Gaussian Blur" }
	], {}).handledByEffectNumeric, true);
	assertEq("v2 directional still effect", CommandParser.parse("Directional Blur 35", [
		{ name: "Directional Blur", premiereName: "Directional Blur" }
	], {}).value, 35);
	assertEq("v2 brightness still effect", CommandParser.parse("Brightness & Contrast 40", [
		{ name: "Brightness & Contrast", premiereName: "Brightness & Contrast" }
	], {}).value, 40);
	assertEq("v2 motion scale still clip", CommandParser.parseClipParameter("Scale 120", [
		{ name: "Gaussian Blur", premiereName: "Gaussian Blur" }
	], {}).isClipParameter, true);
	assertEq("v2 motion scale proven", ConfirmedParameterWrites.isMotionProven("Scale"), true);
	assertEq("v2 apply unused", applyCalls, 0);

	if (ConfirmedParameterWrites.resetSession) {
		ConfirmedParameterWrites.resetSession();
	}
}());
