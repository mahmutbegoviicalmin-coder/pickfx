(function () {
	var clip;
	var report;
	var row;
	var probe;
	var written;
	var beforeCount;
	var afterCount;
	var origRun;
	var origRunResolved;
	var origEnumSet;
	var runCalls;
	var enumWriterCalls;
	var classified;
	var payload;
	var PREMIERE_EFFECTS = [
		{ name: "Gaussian Blur", premiereName: "Gaussian Blur" },
		{ name: "Brightness & Contrast", premiereName: "Brightness & Contrast" },
		{ name: "Lumetri Color", premiereName: "Lumetri Color" }
	];

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
			matchName: extras.matchName !== undefined ? extras.matchName : "",
			min: extras.min,
			max: extras.max,
			valueNames: extras.valueNames,
			items: extras.items,
			enumOptions: extras.enumOptions,
			getValueNames: extras.getValueNames,
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
			name: name || "Video A",
			mediaType: "Video",
			components: components
		};
	}

	function audioClip(components) {
		return {
			name: "Audio A",
			mediaType: "Audio",
			components: components
		};
	}

	function byName(list, name) {
		var n;
		for (n = 0; n < (list ? list.length : 0); n++) {
			if (list[n] && list[n].displayName === name) {
				return list[n];
			}
		}
		return null;
	}

	function spyNumericWrite() {
		runCalls = 0;
		origRun = ParameterWriteTest.run;
		origRunResolved = ParameterWriteTest.runResolved;
		ParameterWriteTest.run = function () {
			runCalls += 1;
			return origRun.apply(ParameterWriteTest, arguments);
		};
		ParameterWriteTest.runResolved = function () {
			runCalls += 1;
			return origRunResolved.apply(ParameterWriteTest, arguments);
		};
		enumWriterCalls = 0;
		origEnumSet = EnumParameterWriter.set;
		EnumParameterWriter.set = function () {
			enumWriterCalls += 1;
			return origEnumSet.apply(EnumParameterWriter, arguments);
		};
	}

	function unspyNumericWrite() {
		if (origRun) {
			ParameterWriteTest.run = origRun;
		}
		if (origRunResolved) {
			ParameterWriteTest.runResolved = origRunResolved;
		}
		if (origEnumSet) {
			EnumParameterWriter.set = origEnumSet;
		}
	}

	if (typeof ConfirmedParameterWrites !== "undefined" && ConfirmedParameterWrites.resetSession) {
		ConfirmedParameterWrites.resetSession();
	}
	if (typeof $ === "undefined") {
		$ = {};
	}
	$._pickfxParameterResolver = mockResolver();

	(function () {
		var probe;
		var savedCap;
		var required;
		var capBeforeDiscover;
		probe = EnumWriteTestWiring.probeDebugLoad();
		assertEq("enum debug load ok", probe.ok, true);
		assertEq("enum debug load operation", probe.operation, "enum.debug.load.probe");
		assertEq("enum debug load missing count", probe.missing.length, 0);
		assertEq("enum debug inspect callable", probe.inspectEnumParametersCallable, true);
		assertEq("enum debug discover inspect type", typeof EnumParameterDiscover.inspect, "function");
		assertEq("enum debug write hostDebugRun type", typeof EnumParameterWriteTest.hostDebugRun, "function");
		assertEq("enum debug ParameterCapability classify", typeof ParameterCapability.classify, "function");
		assertEq("enum debug capability boolean bucket", typeof ParameterCapability.matrixFromParameters([]).capabilities.boolean, "object");
		assertEq("enum debug capability enum bucket", typeof ParameterCapability.matrixFromParameters([]).capabilities.enum, "object");
		assertEq("enum debug NumericCandidateClassifier", typeof NumericCandidateClassifier.hasEnumLikeMetadata, "function");
		required = EnumWriteTestWiring.REQUIRED_EXTRA_HOST_FILES;
		assert("enum debug extraHost includes ParameterCapability", required.indexOf("/src/core/ParameterCapability.js") !== -1);
		assert("enum debug extraHost includes EnumParameterDiscover", required.indexOf("/src/core/EnumParameterDiscover.js") !== -1);
		capBeforeDiscover = required.indexOf("/src/core/ParameterCapability.js") <
			required.indexOf("/src/core/EnumParameterDiscover.js");
		assertEq("enum debug ParameterCapability loads before discover", capBeforeDiscover, true);
		savedCap = ParameterCapability;
		ParameterCapability = undefined;
		probe = EnumWriteTestWiring.probeDebugLoad();
		ParameterCapability = savedCap;
		assertEq("enum debug load fails if ParameterCapability missing", probe.ok, false);
		assertEq("enum debug missing name", probe.missing[0], "ParameterCapability");
		probe = EnumWriteTestWiring.probeDebugLoad();
		assertEq("enum debug load restored", probe.ok, true);
	}());

	assertEq("enum match on Video TrackItem", EnumParameterDiscover.looksLikeVideoClipComponent("Anything", "", "Video").matched, true);
	assertEq("enum reject audio media", EnumParameterDiscover.looksLikeVideoClipComponent("Opacity", "AE.ADBE Opacity", "Audio").matched, false);

	clip = audioClip([{
		displayName: "Volume",
		matchName: "",
		properties: [numberParam("Level", 1)]
	}]);
	report = EnumParameterDiscover.inspect(clip);
	assertEq("enum audio selection ok", report.ok, false);
	assertEq("enum audio selection reason", report.reason, "NO_VIDEO_SELECTION");
	assertEq("enum audio usedQE", report.usedQE, false);
	assertEq("enum audio production", report.productionEnabled, false);

	clip = videoClip([
		{
			displayName: "Opacity",
			matchName: "AE.ADBE Opacity",
			properties: [
				numberParam("Opacity", 100),
				numberParam("Blend Mode", 0, { matchName: "" })
			]
		},
		{
			displayName: "Motion",
			matchName: "AE.ADBE Motion",
			properties: [numberParam("Scale", 100)]
		}
	]);
	report = EnumParameterDiscover.inspect(clip);
	assertEq("enum inspect ok", report.ok, true);
	assertEq("enum inspect operation", report.operation, "enum.parameter.discover");
	assertEq("enum inspect usedQE", report.usedQE, false);
	assertEq("enum inspect production", report.productionEnabled, false);
	assertEq("enum inspect writes", report.writesPerformed, false);
	assertEq("enum inspect classifier", report.classifierUsed, "EnumParameterDiscover.classifySnapshot");
	assertEq("enum inspect clip media", report.clip.mediaType, "Video");
	row = byName(report.parameters, "Blend Mode");
	assert("enum blend found", !!row);
	assertEq("enum blend component display", row.componentDisplayName, "Opacity");
	assertEq("enum blend component match", row.componentMatchName, "AE.ADBE Opacity");
	assertEq("enum blend param display", row.displayName, "Blend Mode");
	assertEq("enum blend param match", row.matchName, "");
	assertEq("enum blend runtimeType", row.runtimeType, "number");
	assertEq("enum blend currentValue", row.currentValue, 0);
	assertEq("enum blend enumLike", row.enumLike, true);
	assertEq("enum blend classification", row.classification, "ENUM_LIKE_NUMBER");
	assertEq("enum blend reason", row.reason, "ENUM_LIKE_NUMBER");
	assertEq("enum blend candidate", row.candidate, false);
	assertEq("enum blend safelyWritable", row.safelyWritable, false);
	assertEq("enum blend representation", row.representation, "F");
	assertEq("enum blend hasSafeOptions", !!(row.enumMetadata && row.enumMetadata.hasSafeOptions), false);
	assertEq("enum blend optionCount", row.enumMetadata && row.enumMetadata.optionCount, 0);
	assert("enum blend metadataSources present", !!(row.metadataSources));
	assertEq("enum blend valueNames present", row.metadataSources.valueNames.present, false);
	assertEq("enum blendModeMatches count", report.blendModeMatches.length, 1);
	assertEq("enum blendModeMatches name", report.blendModeMatches[0].displayName, "Blend Mode");
	assertEq("enum scale not candidate", !byName(report.candidates, "Scale"), true);
	assertEq("enum opacity numeric not candidate", !byName(report.candidates, "Opacity"), true);

	classified = NumericCandidateClassifier.classify({
		displayName: "Blend Mode",
		componentDisplayName: "Opacity",
		runtimeType: "number",
		currentValue: 0,
		hasGetValue: true,
		hasSetValue: true,
		timeVarying: false
	});
	assertEq("enum numeric classifier still blend ENUM_LIKE_NUMBER", classified.status, "ENUM_LIKE_NUMBER");
	assertEq("enum numeric classifier still candidate false", classified.candidate, false);

	classified = NumericCandidateClassifier.classify({
		displayName: "Scale",
		componentDisplayName: "Motion",
		runtimeType: "number",
		currentValue: 100,
		hasGetValue: true,
		hasSetValue: true,
		timeVarying: false
	});
	assertEq("enum numeric classifier scale still PRODUCTION_ENABLED", classified.status, "PRODUCTION_ENABLED");

	clip = videoClip([{
		displayName: "Opacity",
		matchName: "AE.ADBE Opacity",
		properties: [numberParam("Blend Mode", 0, {
			enumOptions: [
				{ value: 0, label: "LiveA" },
				{ value: 5, label: "LiveB" }
			]
		})]
	}]);
	report = EnumParameterDiscover.inspect(clip);
	row = byName(report.parameters, "Blend Mode");
	assertEq("enum meta runtimeType", row.runtimeType, "enum");
	assertEq("enum meta classification", row.classification, "ENUM_LIKE_NUMBER");
	assertEq("enum meta candidate", row.candidate, true);
	assertEq("enum meta safelyWritable", row.safelyWritable, true);
	assertEq("enum meta representation", row.representation, "E");
	assertEq("enum meta optionCount", row.enumValues.length, 2);
	assertEq("enum meta option0 value", row.enumValues[0].value, 0);
	assertEq("enum meta option0 label", row.enumValues[0].label, "LiveA");
	assertEq("enum meta option1 value", row.enumValues[1].value, 5);
	assertEq("enum meta option1 label", row.enumValues[1].label, "LiveB");
	assert("enum meta in candidates", !!byName(report.candidates, "Blend Mode"));

	clip = videoClip([{
		displayName: "Opacity",
		matchName: "AE.ADBE Opacity",
		properties: [numberParam("Mode", "A", {
			enumOptions: [
				{ value: "A", label: "A" },
				{ value: "B", label: "B" }
			]
		})]
	}]);
	report = EnumParameterDiscover.inspect(clip);
	row = byName(report.parameters, "Mode");
	assertEq("enum string classification", row.classification, "STRING_ENUM");
	assertEq("enum string candidate", row.candidate, true);
	assertEq("enum string representation", row.representation, "B");
	assertEq("enum string currentValue", row.currentValue, "A");
	assertEq("enum string runtimeType", row.runtimeType, "enum");

	clip = videoClip([{
		displayName: "Opacity",
		matchName: "AE.ADBE Opacity",
		properties: [numberParam("Blend Mode", 0, {
			valueNames: ["LiveA", "LiveB"]
		})]
	}]);
	report = EnumParameterDiscover.inspect(clip);
	row = byName(report.parameters, "Blend Mode");
	assertEq("enum missing-safe-options", row.enumMetadata.hasSafeOptions, false);
	assertEq("enum valueNames source present", row.metadataSources.valueNames.present, true);
	assertEq("enum valueNames source length", row.metadataSources.valueNames.length, 2);
	assertEq("enum missing metadata classification", row.classification, "ENUM_LIKE_NUMBER");
	assertEq("enum missing metadata candidate", row.candidate, false);

	clip = videoClip([{
		displayName: "Opacity",
		matchName: "AE.ADBE Opacity",
		properties: [
			numberParam("Blend Mode", 0, { matchName: "" }),
			numberParam("Blend Mode", 1, { matchName: "" })
		]
	}]);
	report = EnumParameterDiscover.inspect(clip);
	assertEq("enum ambiguous blend count", report.blendModeMatches.length, 2);
	assertEq("enum ambiguous unambiguous flag", report.blendModeMatches[0].unambiguous, false);
	probe = EnumParameterDiscover.resolve(clip, {
		componentDisplayName: "Opacity",
		componentMatchName: "AE.ADBE Opacity",
		parameterDisplayName: "Blend Mode",
		parameterMatchName: ""
	});
	assertEq("enum ambiguous resolve ok", probe.ok, false);
	assertEq("enum ambiguous resolve reason", probe.reason, "PARAMETER_NOT_FOUND");
	assertEq("enum ambiguous matchCount", probe.matchCount, 2);

	probe = EnumParameterDiscover.resolve(clip, {
		parameterDisplayName: "Blend Mode"
	});
	assertEq("enum no component identity", probe.reason, "NO_SAFE_IDENTITY");

	clip = videoClip([{
		displayName: "Opacity",
		matchName: "AE.ADBE Opacity",
		properties: [numberParam("Blend Mode", 0, {
			enumOptions: [
				{ value: 0, label: "LiveA" },
				{ value: 5, label: "LiveB" }
			],
			isTimeVarying: function () {
				return true;
			}
		})]
	}]);
	report = EnumParameterDiscover.inspect(clip);
	row = byName(report.parameters, "Blend Mode");
	assertEq("enum time-varying class", row.classification, "PARAMETER_TIME_VARYING_UNSUPPORTED");
	assertEq("enum time-varying candidate", row.candidate, false);
	spyNumericWrite();
	written = EnumParameterWriteTest.run(clip, {
		componentDisplayName: "Opacity",
		componentMatchName: "AE.ADBE Opacity",
		parameterDisplayName: "Blend Mode",
		parameterMatchName: ""
	});
	unspyNumericWrite();
	assertEq("enum time-varying write reason", written.reason, "PARAMETER_TIME_VARYING_UNSUPPORTED");
	assertEq("enum time-varying setters", written.settersCalled, false);
	assertEq("enum time-varying numeric spy", runCalls, 0);

	clip = videoClip([{
		displayName: "Opacity",
		matchName: "AE.ADBE Opacity",
		properties: [numberParam("Blend Mode", 0)]
	}]);
	beforeCount = ConfirmedParameterWrites.all().length;
	spyNumericWrite();
	written = EnumParameterWriteTest.run(clip, {
		componentDisplayName: "Opacity",
		componentMatchName: "AE.ADBE Opacity",
		parameterDisplayName: "Blend Mode",
		parameterMatchName: ""
	});
	unspyNumericWrite();
	assertEq("enum unsafe write reason", written.reason, "ENUM_LIKE_NUMBER");
	assertEq("enum unsafe write ok", written.ok, false);
	assertEq("enum unsafe setters", written.settersCalled, false);
	assertEq("enum unsafe verified", written.verified, false);
	assertEq("enum unsafe production", written.productionEnabled, false);
	assertEq("enum unsafe numeric spy", runCalls, 0);
	assertEq("enum unsafe enum writer spy", enumWriterCalls, 0);
	assertEq("enum unsafe live untouched", clip.components[0].properties[0].getValue(), 0);
	assertEq("enum unsafe registry", ConfirmedParameterWrites.all().length, beforeCount);

	clip = videoClip([{
		displayName: "Opacity",
		matchName: "AE.ADBE Opacity",
		properties: [numberParam("Blend Mode", 0, {
			enumOptions: [
				{ value: 0, label: "LiveA" },
				{ value: 5, label: "LiveB" }
			]
		})]
	}]);
	beforeCount = ConfirmedParameterWrites.all().length;
	spyNumericWrite();
	written = EnumParameterWriteTest.run(clip, {
		componentDisplayName: "Opacity",
		componentMatchName: "AE.ADBE Opacity",
		parameterDisplayName: "Blend Mode",
		parameterMatchName: ""
	});
	unspyNumericWrite();
	assertEq("enum safe write ok", written.ok, true);
	assertEq("enum safe write operation", written.operation, "enum.parameter.write.test");
	assertEq("enum safe write status", written.status, "WRITE_CONFIRMED");
	assertEq("enum safe write verifiedTest", written.verifiedTest, true);
	assertEq("enum safe write verifiedRestore", written.verifiedRestore, true);
	assertEq("enum safe write verified", written.verified, true);
	assertEq("enum safe write usedQE", written.usedQE, false);
	assertEq("enum safe write production", written.productionEnabled, false);
	assertEq("enum safe write recordConfirmed", written.recordConfirmed, false);
	assertEq("enum safe write method", written.writeMethod, "ComponentParam.setValue(value, true)");
	assertEq("enum safe write original", written.originalValue, 0);
	assertEq("enum safe write testValue", written.testValue, 5);
	assertEq("enum safe write not plus one", written.testValue === 1, false);
	assertEq("enum safe write afterTest", written.afterTest, 5);
	assertEq("enum safe write restored", written.restoredValue, 0);
	assertEq("enum safe write live", clip.components[0].properties[0].getValue(), 0);
	assertEq("enum safe write identity component", written.identity.componentDisplayName, "Opacity");
	assertEq("enum safe write identity match", written.identity.componentMatchName, "AE.ADBE Opacity");
	assertEq("enum safe write identity parameter", written.identity.parameterDisplayName, "Blend Mode");
	assertEq("enum safe write identity param match", written.identity.parameterMatchName, "");
	assertEq("enum safe write numeric spy", runCalls, 0);
	assertEq("enum safe write enum writer spy", enumWriterCalls, 0);
	assertEq("enum safe write not production lookup", ConfirmedParameterWrites.lookup("Opacity", "Blend Mode"), null);
	afterCount = ConfirmedParameterWrites.all().length;
	assertEq("enum safe write registry unchanged", afterCount, beforeCount);

	clip = videoClip([{
		displayName: "Opacity",
		matchName: "AE.ADBE Opacity",
		properties: [numberParam("Mode", "A", {
			enumOptions: [
				{ value: "A", label: "A" },
				{ value: "B", label: "B" }
			]
		})]
	}]);
	spyNumericWrite();
	written = EnumParameterWriteTest.run(clip, {
		componentDisplayName: "Opacity",
		componentMatchName: "AE.ADBE Opacity",
		parameterDisplayName: "Mode",
		parameterMatchName: ""
	});
	unspyNumericWrite();
	assertEq("enum string write ok", written.ok, true);
	assertEq("enum string write test", written.testValue, "B");
	assertEq("enum string write restored", written.restoredValue, "A");
	assertEq("enum string write live", clip.components[0].properties[0].getValue(), "A");
	assertEq("enum string write numeric spy", runCalls, 0);

	clip = videoClip([{
		displayName: "Opacity",
		matchName: "AE.ADBE Opacity",
		properties: [numberParam("Blend Mode", 0, {
			enumOptions: [
				{ value: 0, label: "LiveA" },
				{ value: 5, label: "LiveB" }
			],
			setValue: function (next, updateUI) {
				if (updateUI !== true) {
					return false;
				}
				return true;
			}
		})]
	}]);
	written = EnumParameterWriteTest.run(clip, {
		componentDisplayName: "Opacity",
		componentMatchName: "AE.ADBE Opacity",
		parameterDisplayName: "Blend Mode"
	});
	assertEq("enum verify fail reason", written.reason, "VALUE_NOT_VERIFIED");
	assertEq("enum verify fail test", written.verifiedTest, false);
	assertEq("enum verify fail setters", written.settersCalled, true);

	clip = videoClip([
		{
			displayName: "Opacity",
			matchName: "AE.ADBE Opacity",
			properties: [numberParam("Blend Mode", 0)]
		},
		{
			displayName: "Motion",
			matchName: "AE.ADBE Motion",
			properties: [numberParam("Scale", 100)]
		}
	]);
	spyNumericWrite();
	written = EnumParameterWriteTest.run(clip, {});
	unspyNumericWrite();
	assertEq("enum runAll blend reason", written.tests && written.tests[0] && written.tests[0].reason, "ENUM_LIKE_NUMBER");
	assertEq("enum runAll numeric spy", runCalls, 0);
	assertEq("enum runAll production", written.productionEnabled, false);

	assertEq("enum wiring button", EnumWriteTestWiring.BUTTON_ID, "test-enum-parameter-write-btn");
	assertEq("enum wiring host", EnumWriteTestWiring.HOST_FUNCTION, "debugEnumParameterWriteTest");
	assertEq("enum wiring resolver", EnumWriteTestWiring.RESOLVER_USED, "EnumParameterDiscover.resolve");
	assert("enum wiring eval is debug host", EnumWriteTestWiring.buildEvalScript({}).indexOf("$._pickfx.debugEnumParameterWriteTest(") !== -1);
	assertEq("enum wiring not generic", EnumWriteTestWiring.scriptCallsGenericParameterWrite(EnumWriteTestWiring.buildEvalScript({})), false);
	assertEq("enum wiring generic detect", EnumWriteTestWiring.scriptCallsGenericParameterWrite("$._pickfx.testParameterWrite({})"), true);

	if (typeof $._pickfx === "undefined") {
		$._pickfx = {};
	}
	clip = videoClip([{
		displayName: "Opacity",
		matchName: "AE.ADBE Opacity",
		properties: [numberParam("Blend Mode", 0)]
	}]);
	$._pickfx.firstSelectedVideoTrackItem = function () {
		return { ok: true, trackItem: clip };
	};
	$._pickfx.jsonSafeParamResult = function (result) {
		return result;
	};
	payload = JSON.parse(EnumParameterWriteTest.hostDebugRun({
		componentDisplayName: "Opacity",
		componentMatchName: "AE.ADBE Opacity",
		parameterDisplayName: "Blend Mode",
		parameterMatchName: ""
	}));
	assertEq("enum hostDebugRun reason", payload.reason, "ENUM_LIKE_NUMBER");
	assertEq("enum hostDebugRun hostFunction", payload.hostFunction, "debugEnumParameterWriteTest");
	assertEq("enum hostDebugRun production", payload.productionEnabled, false);
	assertEq("enum hostDebugRun usedQE", payload.usedQE, false);

	assertEq("enum seed registry still 26", ConfirmedParameterWrites.all().length, 26);
	assertEq("enum motion still production", ConfirmedParameterWrites.isProductionEnabled("Scale", "Motion"), true);
	assertEq("enum crop still production", ConfirmedParameterWrites.isProductionEnabled("Left", "Crop"), true);
	assertEq("enum opacity still production", ConfirmedParameterWrites.isProductionEnabled("Opacity", "Opacity"), true);
	assertEq("enum lumetri still production", ConfirmedParameterWrites.isProductionEnabled("Temperature", "Lumetri Color"), true);
	assertEq("enum blend not production", ConfirmedParameterWrites.lookup("Opacity", "Blend Mode"), null);
	assertEq("enum blend not enabled", ConfirmedParameterWrites.isProductionEnabled("Blend Mode", "Opacity"), false);
	assertEq("enum routing scale still clip", CommandParser.parseClipParameter("Scale 120", PREMIERE_EFFECTS, {}).isClipParameter, true);
	assertEq("enum routing temperature still clip", CommandParser.parseClipParameter("Temperature 10", PREMIERE_EFFECTS, {}).isClipParameter, true);
	assertEq("enum routing blur still effect", CommandParser.parseClipParameter("Gaussian Blur 50", PREMIERE_EFFECTS, {}).handledByEffectNumeric, true);
	assertEq("enum routing opacity still clip", CommandParser.parseClipParameter("Opacity 50", PREMIERE_EFFECTS, {}).isClipParameter, true);
	assertEq("enum routing crop left still clip", CommandParser.parseClipParameter("Crop Left 10", PREMIERE_EFFECTS, {}).isClipParameter, true);

	probe = ParameterWriteTest.runNumeric(videoClip([{
		displayName: "Opacity",
		matchName: "AE.ADBE Opacity",
		properties: [numberParam("Blend Mode", 0)]
	}]), "Opacity", "Blend Mode");
	assertEq("enum generic numeric still rejects blend", probe.reason, "ENUM_LIKE_NUMBER");
	assertEq("enum generic numeric still no write", probe.settersCalled, false);
}());
