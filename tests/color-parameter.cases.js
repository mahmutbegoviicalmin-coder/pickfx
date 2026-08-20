(function () {
	var clip;
	var report;
	var row;
	var probe;
	var written;
	var beforeCount;
	var afterCount;
	var names;
	var i;
	var identity;

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

	function byName(list, name) {
		var n;
		for (n = 0; n < (list ? list.length : 0); n++) {
			if (list[n] && list[n].displayName === name) {
				return list[n];
			}
		}
		return null;
	}

	function byNameAndParent(list, name, parent) {
		var n;
		for (n = 0; n < (list ? list.length : 0); n++) {
			if (list[n] && list[n].displayName === name && list[n].parent === parent) {
				return list[n];
			}
		}
		return null;
	}

	function mockedLumetri(extraParams) {
		var basic = [
			numberParam("Temperature", 0, { matchName: "ADBE Temperature", min: -100, max: 100 }),
			numberParam("Tint", 0, { matchName: "ADBE Tint", min: -100, max: 100 }),
			numberParam("Exposure", 0, { matchName: "ADBE Exposure", min: -5, max: 5 }),
			numberParam("Contrast", 0, { matchName: "ADBE Contrast", min: -100, max: 100 }),
			numberParam("Highlights", 0, { matchName: "ADBE Highlights", min: -100, max: 100 }),
			numberParam("Shadows", 0, { matchName: "ADBE Shadows", min: -100, max: 100 }),
			numberParam("Whites", 0, { matchName: "ADBE Whites", min: -100, max: 100 }),
			numberParam("Blacks", 0, { matchName: "ADBE Blacks", min: -100, max: 100 }),
			numberParam("Saturation", 100, { matchName: "ADBE Saturation", min: 0, max: 200 })
		];
		var n;
		if (extraParams && extraParams.length) {
			for (n = 0; n < extraParams.length; n++) {
				basic.push(extraParams[n]);
			}
		}
		return {
			displayName: "Lumetri Color",
			matchName: "AE.ADBE Lumetri",
			properties: [
				{
					displayName: "Basic Correction",
					matchName: "ADBE Lumetri Basic",
					properties: basic
				}
			]
		};
	}

	if (typeof ConfirmedParameterWrites !== "undefined" && ConfirmedParameterWrites.resetSession) {
		ConfirmedParameterWrites.resetSession();
	}
	if (typeof $ === "undefined") {
		$ = {};
	}
	$._pickfxParameterResolver = mockResolver();

	assertEq("color match lumetri display", ColorParameterDiscover.looksLikeColorComponent("Lumetri Color", "").matched, true);
	assertEq("color match lumetri matchName", ColorParameterDiscover.looksLikeColorComponent("FX", "AE.ADBE Lumetri").matched, true);
	assertEq("color reject change color", ColorParameterDiscover.looksLikeColorComponent("Change Color", "ADBE Change To Color").matched, false);
	assertEq("color reject motion", ColorParameterDiscover.looksLikeColorComponent("Motion", "AE.ADBE Motion").matched, false);

	clip = videoClip([
		{
			displayName: "Motion",
			matchName: "AE.ADBE Motion",
			properties: [numberParam("Scale", 100)]
		},
		{
			displayName: "Change Color",
			matchName: "ADBE Change To Color",
			properties: [numberParam("Hue", 10)]
		}
	]);
	report = ColorParameterDiscover.inspect(clip);
	assertEq("color missing component ok", report.ok, false);
	assertEq("color missing component reason", report.reason, "EFFECT_NOT_FOUND");
	assertEq("color missing usedQE", report.usedQE, false);
	assertEq("color missing production", report.productionEnabled, false);

	clip = videoClip([
		{
			displayName: "Motion",
			matchName: "AE.ADBE Motion",
			properties: [numberParam("Scale", 100)]
		},
		mockedLumetri(),
		{
			displayName: "Opacity",
			matchName: "AE.ADBE Opacity",
			properties: [numberParam("Opacity", 80)]
		}
	]);
	report = ColorParameterDiscover.inspect(clip);
	assertEq("color discover ok", report.ok, true);
	assertEq("color discover operation", report.operation, "color.parameter.discover");
	assertEq("color discover usedQE", report.usedQE, false);
	assertEq("color discover productionEnabled", report.productionEnabled, false);
	assertEq("color discover settersCalled", report.settersCalled, false);
	assertEq("color component displayName", report.component.displayName, "Lumetri Color");
	assertEq("color component matchName", report.component.matchName, "AE.ADBE Lumetri");
	assertEq("color clip still has motion", report.clipComponents.length, 3);

	names = ["Temperature", "Tint", "Exposure", "Contrast", "Highlights", "Shadows", "Whites", "Blacks", "Saturation"];
	for (i = 0; i < names.length; i++) {
		row = byName(report.parameters, names[i]);
		assert("color discovered " + names[i], !!row);
		assertEq(names[i] + " runtimeType", row && row.runtimeType, "number");
		assertEq(names[i] + " classification", row && row.classification, "NUMERIC_CANDIDATE");
		assertEq(names[i] + " candidate", row && row.candidate, true);
		assertEq(names[i] + " hasGetValue", row && row.hasGetValue, true);
		assertEq(names[i] + " hasSetValue", row && row.hasSetValue, true);
		assertEq(names[i] + " timeVarying", row && row.timeVarying, false);
		assertEq(names[i] + " parent", row && row.parent, "Basic Correction");
		assertEq(names[i] + " identity component", row && row.identity.componentDisplayName, "Lumetri Color");
		assertEq(names[i] + " identity componentMatch", row && row.identity.componentMatchName, "AE.ADBE Lumetri");
		assertEq(names[i] + " identity parameter", row && row.identity.parameterDisplayName, names[i]);
		assert("color candidate listed " + names[i], !!byName(report.candidates, names[i]));
	}

	row = byName(report.parameters, "Temperature");
	assertEq("temperature value", row.value, 0);
	assertEq("temperature min", row.min, -100);
	assertEq("temperature max", row.max, 100);
	assertEq("temperature matchName", row.matchName, "ADBE Temperature");
	row = byName(report.parameters, "Tint");
	assertEq("tint value", row.value, 0);
	assertEq("tint min", row.min, -100);
	assertEq("tint max", row.max, 100);
	row = byName(report.parameters, "Exposure");
	assertEq("exposure min", row.min, -5);
	assertEq("exposure max", row.max, 5);
	row = byName(report.parameters, "Saturation");
	assertEq("saturation value", row.value, 100);
	assertEq("saturation min", row.min, 0);
	assertEq("saturation max", row.max, 200);

	clip = videoClip([mockedLumetri([{
		displayName: "Fill",
		matchName: "ADBE Fill",
		getValue: function () {
			return { r: 0.1, g: 0.2, b: 0.3 };
		},
		setValue: function () {},
		isTimeVarying: function () {
			return false;
		}
	}])]);
	report = ColorParameterDiscover.inspect(clip);
	row = byName(report.rejected, "Fill");
	assertEq("rejected color classification", row && row.classification, "COLOR_VALUE");
	assertEq("rejected color reason", row && row.reason, "COLOR_VALUE");
	assertEq("rejected color candidate", row && row.candidate, false);
	assert("rejected color not candidate list", !byName(report.candidates, "Fill"));

	clip = videoClip([{
		displayName: "Lumetri Color",
		matchName: "AE.ADBE Lumetri",
		properties: [numberParam("Contrast", 10, {
			isTimeVarying: function () {
				return true;
			}
		})]
	}]);
	report = ColorParameterDiscover.inspect(clip);
	row = byName(report.rejected, "Contrast");
	assertEq("time-varying classification", row && row.classification, "TIME_VARYING");
	assertEq("time-varying reason", row && row.reason, "TIME_VARYING");

	clip = videoClip([{
		displayName: "Lumetri Color",
		matchName: "AE.ADBE Lumetri",
		properties: [{
			displayName: "Temperature",
			matchName: "ADBE Temperature",
			setValue: function () {},
			isTimeVarying: function () {
				return false;
			}
		}]
	}]);
	report = ColorParameterDiscover.inspect(clip);
	row = byName(report.rejected, "Temperature");
	assertEq("missing getValue reason", row && row.reason, "NO_GET_VALUE");

	clip = videoClip([{
		displayName: "Lumetri Color",
		matchName: "AE.ADBE Lumetri",
		properties: [{
			displayName: "Temperature",
			matchName: "ADBE Temperature",
			getValue: function () {
				return 0;
			},
			isTimeVarying: function () {
				return false;
			}
		}]
	}]);
	report = ColorParameterDiscover.inspect(clip);
	row = byName(report.rejected, "Temperature");
	assertEq("missing setValue reason", row && row.reason, "NO_SET_VALUE");

	clip = videoClip([mockedLumetri([numberParam("Look", 1, {
		getValueNames: function () {
			return ["None", "Film"];
		}
	})])]);
	report = ColorParameterDiscover.inspect(clip);
	row = byName(report.rejected, "Look");
	assertEq("enum-like reason", row && row.reason, "ENUM_LIKE_NUMBER");

	clip = videoClip([mockedLumetri([numberParam("Locked", 5, { min: 5, max: 5 })])]);
	report = ColorParameterDiscover.inspect(clip);
	row = byName(report.rejected, "Locked");
	assertEq("no-safe-test-value reason", row && row.reason, "NO_SAFE_TEST_VALUE");

	beforeCount = ConfirmedParameterWrites.all().length;
	clip = videoClip([
		{
			displayName: "Motion",
			matchName: "AE.ADBE Motion",
			properties: [numberParam("Scale", 100)]
		},
		mockedLumetri()
	]);
	written = ColorParameterWriteTest.run(clip, "Lumetri Color", "Temperature");
	assertEq("color write ok", written.ok, true);
	assertEq("color write operation", written.operation, "color.parameter.write.test");
	assertEq("color write status", written.status, "WRITE_CONFIRMED");
	assertEq("color write productionEnabled", written.productionEnabled, false);
	assertEq("color write usedQE", written.usedQE, false);
	assertEq("color write component", written.component, "Lumetri Color");
	assertEq("color write componentMatchName", written.componentMatchName, "AE.ADBE Lumetri");
	assertEq("color write parameter", written.parameter, "Temperature");
	assertEq("color write parameterMatchName", written.parameterMatchName, "ADBE Temperature");
	assertEq("color write identity component", written.identity.componentDisplayName, "Lumetri Color");
	assertEq("color write identity componentMatch", written.identity.componentMatchName, "AE.ADBE Lumetri");
	assertEq("color write identity parameter", written.identity.parameterDisplayName, "Temperature");
	assertEq("color write identity parameterMatch", written.identity.parameterMatchName, "ADBE Temperature");
	assertEq("color write runtimeType", written.runtimeType, "number");
	assertEq("color write original", written.originalValue, 0);
	assertEq("color write test", written.testValue, 1);
	assertEq("color write after", written.afterTest, 1);
	assertEq("color write restored", written.restoredValue, 0);
	assertEq("color write verifiedTest", written.verifiedTest, true);
	assertEq("color write verifiedRestore", written.verifiedRestore, true);
	assertEq("color write verified", written.verified, true);
	assertEq("color write method", written.writeMethod, "ComponentParam.setValue(value, true)");
	assertEq("color write timeVarying", written.timeVarying, false);
	assertEq("color write settersCalled", written.settersCalled, true);
	assertEq("color write live restored", clip.components[1].properties[0].properties[0].getValue(), 0);
	assertEq("color write production registry", ConfirmedParameterWrites.isProductionEnabled("Temperature", "Lumetri Color"), true);
	assertEq("color write looked up", ConfirmedParameterWrites.lookup("Lumetri Color", "Temperature") !== null, true);
	afterCount = ConfirmedParameterWrites.all().length;
	assertEq("color write registry size unchanged", afterCount, beforeCount);

	identity = {
		componentDisplayName: "Lumetri Color",
		componentMatchName: "AE.ADBE Lumetri",
		parameterDisplayName: "Tint",
		parameterMatchName: "ADBE Tint"
	};
	written = ColorParameterWriteTest.run(clip, identity);
	assertEq("color identity write ok", written.ok, true);
	assertEq("color identity write parameter", written.parameter, "Tint");
	assertEq("color identity write restored live", clip.components[1].properties[0].properties[1].getValue(), 0);
	assertEq("color identity productionEnabled", written.productionEnabled, false);
	assertEq("color identity registry still same", ConfirmedParameterWrites.all().length, beforeCount);

	clip = videoClip([mockedLumetri([{
		displayName: "Fill",
		getValue: function () {
			return { r: 1, g: 0, b: 0 };
		},
		setValue: function () {},
		isTimeVarying: function () {
			return false;
		}
	}])]);
	probe = ColorParameterWriteTest.run(clip, "Lumetri Color", "Fill");
	assertEq("color write reject non-numeric", probe.reason, "COLOR_VALUE");
	assertEq("color write reject no setters", probe.settersCalled, false);
	assertEq("color write reject production", probe.productionEnabled, false);

	clip = videoClip([{
		displayName: "Lumetri Color",
		matchName: "AE.ADBE Lumetri",
		properties: [numberParam("Contrast", 10, {
			isTimeVarying: function () {
				return true;
			}
		})]
	}]);
	probe = ColorParameterWriteTest.run(clip, "Lumetri Color", "Contrast");
	assertEq("color write time-varying", probe.reason, "TIME_VARYING");
	assertEq("color write time-varying setters", probe.settersCalled, false);

	clip = videoClip([{
		displayName: "Lumetri Color",
		matchName: "AE.ADBE Lumetri",
		properties: [{
			displayName: "Temperature",
			setValue: function () {}
		}]
	}]);
	probe = ColorParameterWriteTest.run(clip, "Lumetri Color", "Temperature");
	assertEq("color write missing getValue", probe.reason, "NO_GET_VALUE");
	assertEq("color write missing getValue setters", probe.settersCalled, false);

	clip = videoClip([{
		displayName: "Lumetri Color",
		matchName: "AE.ADBE Lumetri",
		properties: [{
			displayName: "Temperature",
			getValue: function () {
				return 0;
			},
			isTimeVarying: function () {
				return false;
			}
		}]
	}]);
	probe = ColorParameterWriteTest.run(clip, "Lumetri Color", "Temperature");
	assertEq("color write missing setValue", probe.reason, "NO_SET_VALUE");
	assertEq("color write missing setValue setters", probe.settersCalled, false);

	clip = videoClip([{
		displayName: "Lumetri Color",
		matchName: "AE.ADBE Lumetri",
		properties: [numberParam("Look", 1, {
			getValueNames: function () {
				return ["None", "Film"];
			}
		})]
	}]);
	probe = ColorParameterWriteTest.run(clip, "Lumetri Color", "Look");
	assertEq("color write enum-like", probe.reason, "ENUM_LIKE_NUMBER");
	assertEq("color write enum-like setters", probe.settersCalled, false);

	clip = videoClip([{
		displayName: "Lumetri Color",
		matchName: "AE.ADBE Lumetri",
		properties: [numberParam("Locked", 5, { min: 5, max: 5 })]
	}]);
	probe = ColorParameterWriteTest.run(clip, "Lumetri Color", "Locked");
	assertEq("color write no safe test", probe.reason, "NO_SAFE_TEST_VALUE");
	assertEq("color write no safe setters", probe.settersCalled, false);
	assertEq("color write no safe live", clip.components[0].properties[0].getValue(), 5);

	clip = videoClip([{
		displayName: "Lumetri Color",
		matchName: "AE.ADBE Lumetri",
		properties: [numberParam("Temperature", 0, {
			setValue: function () {
				return true;
			}
		})]
	}]);
	probe = ColorParameterWriteTest.run(clip, "Lumetri Color", "Temperature");
	assertEq("color write verify fail", probe.reason, "VALUE_NOT_VERIFIED");
	assertEq("color write verify fail test", probe.verifiedTest, false);
	assertEq("color write verify fail production", probe.productionEnabled, false);

	clip = videoClip([{
		displayName: "Lumetri Color",
		matchName: "AE.ADBE Lumetri",
		properties: [(function () {
			var value = 100;
			return {
				displayName: "Restore Probe",
				matchName: "ADBE Restore",
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
				}
			};
		}())]
	}]);
	probe = ColorParameterWriteTest.run(clip, "Lumetri Color", "Restore Probe");
	assertEq("color restore verify fail", probe.reason, "VALUE_NOT_VERIFIED");
	assertEq("color restore verify fail restore", probe.verifiedRestore, false);
	assertEq("color restore verify fail production", probe.productionEnabled, false);

	clip = videoClip([
		{
			displayName: "Creative",
			matchName: "AE.ADBE Creative",
			properties: [numberParam("Temperature", 10, { matchName: "" })]
		},
		{
			displayName: "Color Wheels",
			matchName: "AE.ADBE Color Wheels",
			properties: [numberParam("Temperature", 20, { matchName: "" })]
		},
		{
			displayName: "Lumetri Color",
			matchName: "AE.ADBE Lumetri",
			properties: [{
				displayName: "Basic Correction",
				matchName: "",
				properties: [numberParam("Temperature", 0, { matchName: "" })]
			}]
		},
		{
			displayName: "HSL Secondary",
			matchName: "AE.ADBE HSL Secondary",
			properties: [numberParam("Temperature", 30, { matchName: "" })]
		},
		{
			displayName: "Curves",
			matchName: "AE.ADBE Curves",
			properties: [numberParam("Temperature", 40, { matchName: "" })]
		}
	]);
	probe = UniversalParameterResolver.resolve(clip, "Temperature");
	assertEq("global temperature still ambiguous", probe.ok, false);
	assert("global temperature ambiguous detail", String(probe.detail || "").indexOf("ambiguous across 4 components") !== -1);
	probe = ColorParameterWriteTest.run(clip, {
		componentDisplayName: "Lumetri Color",
		componentMatchName: "AE.ADBE Lumetri",
		parameterDisplayName: "Temperature",
		parameterMatchName: ""
	});
	assertEq("scoped temperature unique inside lumetri", probe.ok, true);
	assertEq("scoped temperature component", probe.component, "Lumetri Color");
	assertEq("scoped temperature componentMatch", probe.componentMatchName, "AE.ADBE Lumetri");
	assertEq("scoped temperature parameter", probe.parameter, "Temperature");
	assertEq("scoped temperature empty param matchName", probe.parameterMatchName, "");
	assertEq("scoped temperature verified", probe.verified, true);
	assertEq("scoped temperature production", probe.productionEnabled, false);
	assertEq("scoped other temperature creative", clip.components[0].properties[0].getValue(), 10);
	assertEq("scoped other temperature wheels", clip.components[1].properties[0].getValue(), 20);
	assertEq("scoped lumetri restored", clip.components[2].properties[0].properties[0].getValue(), 0);
	assertEq("scoped other temperature hsl", clip.components[3].properties[0].getValue(), 30);
	assertEq("scoped other temperature curves", clip.components[4].properties[0].getValue(), 40);

	probe = ColorParameterWriteTest.run(clip, {
		componentMatchName: "AE.ADBE Lumetri",
		parameterDisplayName: "Temperature"
	});
	assertEq("matchName plus displayName resolve ok", probe.ok, true);
	assertEq("matchName plus displayName component", probe.component, "Lumetri Color");
	assertEq("matchName plus displayName restored", clip.components[2].properties[0].properties[0].getValue(), 0);

	probe = ColorParameterWriteTest.run(clip, {
		componentDisplayName: "Lumetri Color",
		componentMatchName: "AE.ADBE NotLumetri",
		parameterDisplayName: "Temperature"
	});
	assertEq("identity mismatch ok", probe.ok, false);
	assertEq("identity mismatch reason", probe.reason, "PARAMETER_NOT_FOUND");
	assertEq("identity mismatch setters", probe.settersCalled, false);
	assert("identity mismatch detail", String(probe.detail || "").indexOf("No component matching") !== -1);

	clip = videoClip([{
		displayName: "Lumetri Color",
		matchName: "AE.ADBE Lumetri",
		properties: [
			{
				displayName: "Basic Correction",
				properties: [numberParam("Temperature", 0, { matchName: "" })]
			},
			{
				displayName: "Creative",
				properties: [numberParam("Temperature", 5, { matchName: "" })]
			}
		]
	}]);
	probe = ColorParameterWriteTest.run(clip, {
		componentDisplayName: "Lumetri Color",
		componentMatchName: "AE.ADBE Lumetri",
		parameterDisplayName: "Temperature",
		parameterMatchName: ""
	});
	assertEq("inside-component ambiguous ok", probe.ok, false);
	assertEq("inside-component ambiguous reason", probe.reason, "PARAMETER_NOT_FOUND");
	assertEq("inside-component ambiguous setters", probe.settersCalled, false);
	assert("inside-component ambiguous detail", String(probe.detail || "").indexOf("inside component") !== -1);
	assertEq("inside-component left first", clip.components[0].properties[0].properties[0].getValue(), 0);
	assertEq("inside-component left second", clip.components[0].properties[1].properties[0].getValue(), 5);

	clip = videoClip([{
		displayName: "Lumetri Color",
		matchName: "AE.ADBE Lumetri",
		properties: [numberParam("Temperature", 0, { matchName: "" })]
	}]);
	probe = ColorParameterDiscover.resolve(clip, {
		componentDisplayName: "Lumetri Color",
		componentMatchName: "AE.ADBE Lumetri",
		parameterDisplayName: "Temperature",
		parameterMatchName: ""
	});
	assertEq("empty param matchName resolve ok", probe.ok, true);
	assertEq("empty param matchName value", probe.parameter.matchName, "");
	written = ColorParameterWriteTest.run(clip, {
		componentDisplayName: "Lumetri Color",
		componentMatchName: "AE.ADBE Lumetri",
		parameterDisplayName: "Temperature",
		parameterMatchName: ""
	});
	assertEq("empty param matchName write ok", written.ok, true);
	assertEq("empty param matchName write restored", clip.components[0].properties[0].getValue(), 0);
	assertEq("empty param matchName registered", ConfirmedParameterWrites.lookup("Lumetri Color", "Temperature") !== null, true);

	clip = videoClip([
		{
			displayName: "Lumetri Color",
			matchName: "AE.ADBE Lumetri",
			properties: [numberParam("Temperature", 0, { matchName: "" })]
		},
		{
			displayName: "Other A",
			matchName: "AE.ADBE OtherA",
			properties: [numberParam("Temperature", 1, { matchName: "" })]
		},
		{
			displayName: "Other B",
			matchName: "AE.ADBE OtherB",
			properties: [numberParam("Temperature", 2, { matchName: "" })]
		},
		{
			displayName: "Other C",
			matchName: "AE.ADBE OtherC",
			properties: [numberParam("Temperature", 3, { matchName: "" })]
		}
	]);
	(function () {
		var globalCalls = 0;
		var runCalls = 0;
		var origGlobal = UniversalParameterResolver.resolve;
		var origRun = ParameterWriteTest.run;
		UniversalParameterResolver.resolve = function () {
			globalCalls += 1;
			return origGlobal.apply(this, arguments);
		};
		ParameterWriteTest.run = function () {
			runCalls += 1;
			return origRun.apply(this, arguments);
		};
		written = ColorParameterWriteTest.run(clip, {
			componentDisplayName: "Lumetri Color",
			componentMatchName: "AE.ADBE Lumetri",
			parameterDisplayName: "Temperature",
			parameterMatchName: ""
		});
		assertEq("spy color write ok", written.ok, true);
		assertEq("spy no UniversalParameterResolver.resolve", globalCalls, 0);
		assertEq("spy no ParameterWriteTest.run", runCalls, 0);
		assertEq("spy color operation", written.operation, "color.parameter.write.test");
		assertEq("spy color globalSearchUsed", written.globalSearchUsed, false);
		assertEq("spy color resolverUsed", written.resolverUsed, "ColorParameterDiscover.resolve");
		assertEq("spy color bridgePath", written.bridgePath, "color-parameter-write-test");
		assertEq("spy color hostFunction", written.hostFunction, "debugColorParameterWriteTest");
		assertEq("spy color button id", written.debugButton && written.debugButton.id, "test-color-parameter-write-btn");
		assertEq("spy color handler", written.debugButton && written.debugButton.handler, "invokeColorParameterWriteTest");
		assert("spy color runtimePath", !!(written.runtimePath && written.runtimePath.indexOf("ColorParameterWriteTest.run") !== -1));
		assert("spy color runtimePath button", !!(written.runtimePath && written.runtimePath.indexOf("invokeColorParameterWriteTest") !== -1));
		assert("spy color runtimePath button id", !!(written.runtimePath && written.runtimePath.indexOf("test-color-parameter-write-btn") !== -1));
		assertEq("spy component resolved", written.componentResolution && written.componentResolution.resolved, true);
		assertEq("spy component display", written.componentResolution.resolvedDisplayName, "Lumetri Color");
		assertEq("spy component match", written.componentResolution.resolvedMatchName, "AE.ADBE Lumetri");
		assertEq("spy param scope", written.parameterResolution.scope, "component");
		assertEq("spy param global flag", written.parameterResolution.globalSearchUsed, false);
		assertEq("spy matches inside", written.parameterResolution.matchesInsideComponent, 1);
		assertEq("spy other A untouched", clip.components[1].properties[0].getValue(), 1);
		assertEq("spy other B untouched", clip.components[2].properties[0].getValue(), 2);
		assertEq("spy other C untouched", clip.components[3].properties[0].getValue(), 3);
		UniversalParameterResolver.resolve = origGlobal;
		ParameterWriteTest.run = origRun;
	}());
	probe = UniversalParameterResolver.resolve(clip, "Temperature");
	assertEq("generic global lookup ok", probe.ok, false);
	assert("generic global lookup ambiguous", String(probe.detail || "").indexOf("ambiguous across 4 components") !== -1);

	(function () {
		var ident;
		var script;
		var payload;
		var hostRaw;
		var origPickfx;
		var origWriteTest;
		var genericCalls;
		var runCalls;
		var origGlobal;
		var origRun;

		ident = ColorWriteTestWiring.normalizeIdent({
			componentDisplayName: "Lumetri Color",
			componentMatchName: "AE.ADBE Lumetri",
			parameterDisplayName: "Temperature",
			parameterMatchName: ""
		});
		script = ColorWriteTestWiring.buildEvalScript(ident);
		assertEq("wiring button id", ColorWriteTestWiring.BUTTON_ID, "test-color-parameter-write-btn");
		assertEq("wiring handler", ColorWriteTestWiring.HANDLER, "invokeColorParameterWriteTest");
		assertEq("wiring bridge method", ColorWriteTestWiring.BRIDGE_METHOD, "testColorParameterWrite");
		assertEq("wiring bridge path", ColorWriteTestWiring.BRIDGE_PATH, "color-parameter-write-test");
		assertEq("wiring host function", ColorWriteTestWiring.HOST_FUNCTION, "debugColorParameterWriteTest");
		assertEq("wiring evalScript host", ColorWriteTestWiring.hostFunctionFromScript(script), "debugColorParameterWriteTest");
		assertEq("wiring evalScript never generic", ColorWriteTestWiring.scriptCallsGenericParameterWrite(script), false);
		assert("wiring evalScript debugButtonClicked", script.indexOf("\"debugButtonClicked\":true") !== -1);
		assert("wiring evalScript buttonId", script.indexOf("\"buttonId\":\"test-color-parameter-write-btn\"") !== -1);
		assert("wiring evalScript handler", script.indexOf("\"handler\":\"invokeColorParameterWriteTest\"") !== -1);
		assert("wiring evalScript never testParameterWrite token", script.indexOf("testParameterWrite") === -1);

		payload = ColorWriteTestWiring.notLoadedPayload(ident);
		assertEq("not loaded ok", payload.ok, false);
		assertEq("not loaded operation", payload.operation, "color.parameter.write.test");
		assertEq("not loaded reason", payload.reason, "COLOR_WRITE_TEST_PATH_NOT_LOADED");
		assertEq("not loaded global", payload.globalSearchUsed, false);
		assertEq("not loaded bridge", payload.bridgePath, "color-parameter-write-test");
		assertEq("not loaded host", payload.hostFunction, "debugColorParameterWriteTest");
		assertEq("not loaded function available", payload.colorWriteTestFunctionAvailable, false);

		genericCalls = 0;
		runCalls = 0;
		origGlobal = UniversalParameterResolver.resolve;
		origRun = ParameterWriteTest.run;
		UniversalParameterResolver.resolve = function () {
			genericCalls += 1;
			return origGlobal.apply(this, arguments);
		};
		ParameterWriteTest.run = function () {
			runCalls += 1;
			return origRun.apply(this, arguments);
		};
		origPickfx = $._pickfx;
		origWriteTest = $._pickfxParameterWriteTest;
		$._pickfx = {
			__colorWriteTestLoaded: true,
			debugColorParameterWriteTest: ColorParameterWriteTest.hostDebugRun,
			firstSelectedVideoTrackItem: function () {
				return { ok: true, trackItem: clip };
			},
			jsonSafeParamResult: function (result) {
				return result;
			}
		};
		$._pickfxParameterWriteTest = ParameterWriteTest;
		hostRaw = $._pickfx.debugColorParameterWriteTest(ident);
		payload = JSON.parse(hostRaw);
		assertEq("hostDebugRun ok", payload.ok, true);
		assertEq("hostDebugRun operation", payload.operation, "color.parameter.write.test");
		assertEq("hostDebugRun global", payload.globalSearchUsed, false);
		assertEq("hostDebugRun resolver", payload.resolverUsed, "ColorParameterDiscover.resolve");
		assertEq("hostDebugRun bridge", payload.bridgePath, "color-parameter-write-test");
		assertEq("hostDebugRun hostFunction", payload.hostFunction, "debugColorParameterWriteTest");
		assertEq("hostDebugRun button clicked", payload.debugButton && payload.debugButton.clicked, true);
		assertEq("hostDebugRun button id", payload.debugButton && payload.debugButton.id, "test-color-parameter-write-btn");
		assertEq("hostDebugRun handler", payload.debugButton && payload.debugButton.handler, "invokeColorParameterWriteTest");
		assertEq("hostDebugRun no UniversalParameterResolver.resolve", genericCalls, 0);
		assertEq("hostDebugRun no ParameterWriteTest.run", runCalls, 0);
		assertEq("hostDebugRun other A untouched", clip.components[1].properties[0].getValue(), 1);
		assertEq("hostDebugRun other B untouched", clip.components[2].properties[0].getValue(), 2);
		assertEq("hostDebugRun other C untouched", clip.components[3].properties[0].getValue(), 3);
		assertEq("hostDebugRun param scope", payload.parameterResolution && payload.parameterResolution.scope, "component");
		assertEq("hostDebugRun matches inside", payload.parameterResolution && payload.parameterResolution.matchesInsideComponent, 1);
		$._pickfx = origPickfx;
		$._pickfxParameterWriteTest = origWriteTest;
		UniversalParameterResolver.resolve = origGlobal;
		ParameterWriteTest.run = origRun;
	}());

	(function () {
		var writes = 0;
		var basicSat;
		var creativeSat;
		var dual;
		var listed;
		var resolved;
		var writtenSat;
		var runCalls;
		var origRun;
		var registryBefore;
		function spySet(orig) {
			return function (next, updateUI) {
				writes += 1;
				return orig(next, updateUI);
			};
		}
		basicSat = numberParam("Saturation", 100, { matchName: "", min: 0, max: 200 });
		creativeSat = numberParam("Saturation", 80, { matchName: "", min: 0, max: 200 });
		basicSat.setValue = spySet(basicSat.setValue);
		creativeSat.setValue = spySet(creativeSat.setValue);
		dual = videoClip([{
			displayName: "Lumetri Color",
			matchName: "AE.ADBE Lumetri",
			properties: [
				{
					displayName: "Basic Correction",
					matchName: "ADBE Lumetri Basic",
					properties: [
						numberParam("Temperature", 0, { matchName: "" }),
						basicSat
					]
				},
				{
					displayName: "Creative",
					matchName: "ADBE Lumetri Creative",
					properties: [
						creativeSat
					]
				}
			]
		}]);
		listed = ColorParameterDiscover.inspectSaturationMatches(dual);
		assertEq("sat matches ok", listed.ok, true);
		assertEq("sat matches operation", listed.operation, "color.saturation.matches");
		assertEq("sat matches usedQE", listed.usedQE, false);
		assertEq("sat matches production", listed.productionEnabled, false);
		assertEq("sat matches setters", listed.settersCalled, false);
		assertEq("sat matches writes", listed.writesPerformed, false);
		assertEq("sat matches chosen", listed.chosen, false);
		assertEq("sat matches count", listed.matchCount, 2);
		assertEq("sat matches component display", listed.component.displayName, "Lumetri Color");
		assertEq("sat matches component match", listed.component.matchName, "AE.ADBE Lumetri");
		assertEq("sat matches first name", listed.matches[0].displayName, "Saturation");
		assertEq("sat matches second name", listed.matches[1].displayName, "Saturation");
		assertEq("sat matches first matchName", listed.matches[0].matchName, "");
		assertEq("sat matches second matchName", listed.matches[1].matchName, "");
		assertEq("sat matches param matchName available", listed.parameterMatchNameAvailable, false);
		assertEq("sat matches usable matchName count", listed.usableParameterMatchNames.length, 0);
		assertEq("sat matches parent differentiates", listed.parentDifferentiates, true);
		assertEq("sat matches group differentiates", listed.groupDifferentiates, true);
		assertEq("sat matches hierarchy differentiates", listed.hierarchyDifferentiates, true);
		assertEq("sat matches basic count", listed.basicCorrectionMatchCount, 1);
		assertEq("sat matches resolver ambiguous flag", listed.resolverWouldBeAmbiguous, true);
		assertEq("sat matches first parent", listed.matches[0].parent, "Basic Correction");
		assertEq("sat matches first group", listed.matches[0].group, "Basic Correction");
		assert("sat matches first hierarchy", String(listed.matches[0].hierarchyPath).indexOf("Basic Correction") !== -1);
		assertEq("sat matches first basic flag", listed.matches[0].isBasicCorrectionSaturation, true);
		assertEq("sat matches first value", listed.matches[0].currentValue, 100);
		assertEq("sat matches first hasGetValue", listed.matches[0].hasGetValue, true);
		assertEq("sat matches first hasSetValue", listed.matches[0].hasSetValue, true);
		assertEq("sat matches first timeVarying", listed.matches[0].timeVarying, false);
		assertEq("sat matches second parent", listed.matches[1].parent, "Creative");
		assertEq("sat matches second group", listed.matches[1].group, "Creative");
		assert("sat matches second hierarchy", String(listed.matches[1].hierarchyPath).indexOf("Creative") !== -1);
		assertEq("sat matches second basic flag", listed.matches[1].isBasicCorrectionSaturation, false);
		assertEq("sat matches second value", listed.matches[1].currentValue, 80);
		assertEq("sat matches live basic unchanged", basicSat.getValue(), 100);
		assertEq("sat matches live creative unchanged", creativeSat.getValue(), 80);
		assertEq("sat matches no setValue calls", writes, 0);

		resolved = ColorParameterDiscover.resolve(dual, {
			componentDisplayName: "Lumetri Color",
			componentMatchName: "AE.ADBE Lumetri",
			parameterDisplayName: "Saturation",
			parameterMatchName: ""
		});
		assertEq("sat resolve still not unique", resolved.ok, false);
		assertEq("sat resolve still not found", resolved.reason, "PARAMETER_NOT_FOUND");
		assert("sat resolve still ambiguous", String(resolved.detail || "").indexOf("ambiguous across 2 parameters") !== -1);
		assertEq("sat resolve matches inside", resolved.parameterResolution && resolved.parameterResolution.matchesInsideComponent, 2);

		runCalls = 0;
		origRun = ParameterWriteTest.run;
		ParameterWriteTest.run = function () {
			runCalls += 1;
			return origRun.apply(this, arguments);
		};
		registryBefore = ConfirmedParameterWrites.all().length;
		writtenSat = ColorParameterWriteTest.run(dual, {
			componentDisplayName: "Lumetri Color",
			componentMatchName: "AE.ADBE Lumetri",
			parameterDisplayName: "Saturation",
			parameterMatchName: ""
		});
		assertEq("sat write still rejected", writtenSat.ok, false);
		assertEq("sat write still not found", writtenSat.reason, "PARAMETER_NOT_FOUND");
		assertEq("sat write setters still false", writtenSat.settersCalled, false);
		assertEq("sat write production still false", writtenSat.productionEnabled, false);
		assertEq("sat write no ParameterWriteTest.run", runCalls, 0);
		assertEq("sat write no setValue calls", writes, 0);
		assertEq("sat write registry unchanged", ConfirmedParameterWrites.all().length, registryBefore);
		assertEq("sat still registered", ConfirmedParameterWrites.lookup("Lumetri Color", "Saturation") !== null, true);
		ParameterWriteTest.run = origRun;
	}());

	report = ColorParameterDiscover.inspectSaturationMatches(videoClip([{
		displayName: "Motion",
		matchName: "AE.ADBE Motion",
		properties: [numberParam("Scale", 100)]
	}]));
	assertEq("sat matches missing lumetri ok", report.ok, false);
	assertEq("sat matches missing lumetri count", report.matchCount, 0);
	assertEq("sat matches missing lumetri writes", report.writesPerformed, false);

	(function () {
		var writes = 0;
		var basicSat;
		var creativeSat;
		var temperature;
		var vibrance;
		var hue;
		var lumetri;
		var listed;
		var all;
		var resolvedSat;
		var origRun;
		var runCalls;
		var registryBefore;
		function spySet(orig) {
			return function (next, updateUI) {
				writes += 1;
				return orig(next, updateUI);
			};
		}
		temperature = numberParam("Temperature", 0, { matchName: "ADBE Temperature", min: -100, max: 100 });
		vibrance = numberParam("Vibrance", 0, { matchName: "ADBE Vibrance", min: -100, max: 100 });
		hue = numberParam("Hue", 0, { matchName: "ADBE HSL Hue", min: -180, max: 180 });
		basicSat = numberParam("Saturation", 100, { matchName: "", min: 0, max: 200 });
		creativeSat = numberParam("Saturation", 80, { matchName: "", min: 0, max: 200 });
		temperature.setValue = spySet(temperature.setValue);
		vibrance.setValue = spySet(vibrance.setValue);
		hue.setValue = spySet(hue.setValue);
		basicSat.setValue = spySet(basicSat.setValue);
		creativeSat.setValue = spySet(creativeSat.setValue);
		lumetri = {
			displayName: "Lumetri Color",
			matchName: "AE.ADBE Lumetri",
			properties: [
				{
					displayName: "Basic Correction",
					matchName: "ADBE Lumetri Basic",
					properties: [temperature, basicSat]
				},
				{
					displayName: "Creative",
					matchName: "ADBE Lumetri Creative",
					properties: [vibrance, creativeSat]
				},
				{
					displayName: "HSL Secondary",
					matchName: "ADBE Lumetri HSL",
					properties: [{
						displayName: "Correction",
						matchName: "ADBE Lumetri HSL Correction",
						properties: [hue]
					}]
				}
			]
		};
		clip = videoClip([lumetri]);
		listed = ColorParameterDiscover.inspect(clip);
		assertEq("all-groups discover ok", listed.ok, true);
		assertEq("all-groups writesPerformed", listed.writesPerformed, false);
		assertEq("all-groups settersCalled", listed.settersCalled, false);
		assertEq("all-groups classifier", listed.classifierUsed, "NumericCandidateClassifier.classify");
		assertEq("all-groups discover no writes", writes, 0);
		assert("all-groups has basic section", !!byName(listed.sections, "Basic Correction"));
		assert("all-groups has creative section", !!byName(listed.sections, "Creative"));
		assert("all-groups has hsl nested section", !!byName(listed.sections, "Correction") || !!byName(listed.sections, "HSL Secondary"));
		assertEq("all-groups temperature parent", byNameAndParent(listed.parameters, "Temperature", "Basic Correction") && byNameAndParent(listed.parameters, "Temperature", "Basic Correction").parent, "Basic Correction");
		assertEq("all-groups vibrance parent", byNameAndParent(listed.parameters, "Vibrance", "Creative") && byNameAndParent(listed.parameters, "Vibrance", "Creative").parent, "Creative");
		assertEq("all-groups hue parent", byNameAndParent(listed.parameters, "Hue", "Correction") && byNameAndParent(listed.parameters, "Hue", "Correction").parent, "Correction");
		assertEq("all-groups temperature classification", byName(listed.candidates, "Temperature").classification, "NUMERIC_CANDIDATE");
		assertEq("all-groups vibrance runtimeType", byName(listed.parameters, "Vibrance").runtimeType, "number");
		assertEq("all-groups hue timeVarying", byName(listed.parameters, "Hue").timeVarying, false);
		assertEq("all-groups temperature unambiguous", byName(listed.candidates, "Temperature").unambiguous, true);
		assertEq("all-groups vibrance unambiguous", byNameAndParent(listed.candidates, "Vibrance", "Creative").unambiguous, true);
		assertEq("all-groups hue unambiguous", byNameAndParent(listed.candidates, "Hue", "Correction").unambiguous, true);
		assertEq("all-groups basic sat unambiguous", byNameAndParent(listed.candidates, "Saturation", "Basic Correction").unambiguous, false);
		assertEq("all-groups creative sat unambiguous", byNameAndParent(listed.candidates, "Saturation", "Creative").unambiguous, false);
		assertEq("all-groups unambiguous count", listed.unambiguousCandidates.length, 3);
		assertEq("all-groups ambiguous count", listed.ambiguousCandidates.length, 2);
		assertEq("all-groups temperature value", byName(listed.parameters, "Temperature").currentValue, 0);
		assertEq("all-groups vibrance value", byName(listed.parameters, "Vibrance").currentValue, 0);
		assertEq("all-groups hue value", byName(listed.parameters, "Hue").currentValue, 0);
		assert("all-groups temperature hierarchy", String(byName(listed.parameters, "Temperature").hierarchyPath).indexOf("Basic Correction") !== -1);
		assert("all-groups vibrance hierarchy", String(byName(listed.parameters, "Vibrance").hierarchyPath).indexOf("Creative") !== -1);
		assert("all-groups hue hierarchy", String(byName(listed.parameters, "Hue").hierarchyPath).indexOf("Correction") !== -1);

		resolvedSat = ColorParameterDiscover.resolve(clip, {
			componentDisplayName: "Lumetri Color",
			componentMatchName: "AE.ADBE Lumetri",
			parameterDisplayName: "Saturation",
			parameterMatchName: ""
		});
		assertEq("all-groups sat still ambiguous", resolvedSat.ok, false);

		runCalls = 0;
		origRun = ParameterWriteTest.run;
		ParameterWriteTest.run = function () {
			runCalls += 1;
			return origRun.apply(this, arguments);
		};
		registryBefore = ConfirmedParameterWrites.all().length;
		all = ColorParameterWriteTest.run(clip, {
			componentDisplayName: "Lumetri Color",
			componentMatchName: "AE.ADBE Lumetri"
		});
		assertEq("all-groups write-test ok", all.ok, true);
		assertEq("all-groups write-test selected", all.selectedCount, 3);
		assertEq("all-groups write-test successful", all.successfulCount, 3);
		assertEq("all-groups write-test skipped ambiguous", all.skippedAmbiguousCount, 2);
		assertEq("all-groups write-test no ParameterWriteTest.run", runCalls, 0);
		assertEq("all-groups candidateResults count", all.candidateResults.length, 5);
		assertEq("all-groups productionEnabled", all.productionEnabled, false);
		assertEq("all-groups usedQE", all.usedQE, false);
		(function () {
			var n;
			var row;
			var writtenNames = {};
			var skippedNames = 0;
			for (n = 0; n < all.candidateResults.length; n++) {
				row = all.candidateResults[n];
				assert("candidateResult has parameter " + n, !!row.parameter);
				assert("candidateResult has originalValue " + row.parameter, row.originalValue !== undefined);
				assert("candidateResult has verifiedTest " + row.parameter, row.verifiedTest === true || row.verifiedTest === false);
				assert("candidateResult has verifiedRestore " + row.parameter, row.verifiedRestore === true || row.verifiedRestore === false);
				assert("candidateResult has status " + row.parameter, !!row.status);
				assertEq("candidateResult usedQE " + row.parameter, row.usedQE, false);
				assertEq("candidateResult production " + row.parameter, row.productionEnabled, false);
				if (row.parameter === "Saturation") {
					skippedNames += 1;
					assertEq("sat candidate not written", row.settersCalled, false);
					assertEq("sat candidate not verifiedTest", row.verifiedTest, false);
					assertEq("sat candidate not verifiedRestore", row.verifiedRestore, false);
					assertEq("sat candidate status", row.status, "REJECTED");
					assertEq("sat candidate restored stays original", row.restoredValue, row.originalValue);
				} else {
					writtenNames[row.parameter] = true;
					assertEq(row.parameter + " candidate written", row.settersCalled, true);
					assertEq(row.parameter + " candidate verifiedTest", row.verifiedTest, true);
					assertEq(row.parameter + " candidate verifiedRestore", row.verifiedRestore, true);
					assertEq(row.parameter + " candidate restored", row.restoredValue, row.originalValue);
					assertEq(row.parameter + " afterTest is testValue", row.afterTest, row.testValue);
					assertEq(row.parameter + " status", row.status, "WRITE_CONFIRMED");
				}
			}
			assertEq("written temperature", writtenNames.Temperature, true);
			assertEq("written vibrance", writtenNames.Vibrance, true);
			assertEq("written hue", writtenNames.Hue, true);
			assertEq("skipped both saturations", skippedNames, 2);
		}());
		assertEq("all-groups sat values unchanged", basicSat.getValue(), 100);
		assertEq("all-groups creative sat unchanged", creativeSat.getValue(), 80);
		assertEq("all-groups temperature restored", temperature.getValue(), 0);
		assertEq("all-groups vibrance restored", vibrance.getValue(), 0);
		assertEq("all-groups hue restored", hue.getValue(), 0);
		assertEq("all-groups registry unchanged", ConfirmedParameterWrites.all().length, registryBefore);
		assertEq("all-groups sat registered", ConfirmedParameterWrites.lookup("Lumetri Color", "Saturation") !== null, true);
		assertEq("all-groups vibrance unpromoted", ConfirmedParameterWrites.lookup("Lumetri Color", "Vibrance"), null);
		ParameterWriteTest.run = origRun;
	}());

	(function () {
		var extraVibrance = numberParam("Vibrance", 12, { matchName: "ADBE Vibrance", min: -100, max: 100 });
		var listed;
		clip = videoClip([{
			displayName: "Lumetri Color",
			matchName: "AE.ADBE Lumetri",
			properties: [{
				displayName: "Basic Correction",
				matchName: "ADBE Lumetri Basic",
				properties: [numberParam("Temperature", 0, { matchName: "ADBE Temperature", min: -100, max: 100 })]
			}],
			numProperties: 2,
			property: function (index) {
				if (index === 1) {
					return this.properties[0];
				}
				if (index === 2) {
					return {
						displayName: "Creative",
						matchName: "ADBE Lumetri Creative",
						properties: [extraVibrance]
					};
				}
				return null;
			}
		}]);
		listed = ColorParameterDiscover.inspect(clip);
		assertEq("numProperties merge temperature", !!byName(listed.parameters, "Temperature"), true);
		assertEq("numProperties merge vibrance", !!byName(listed.parameters, "Vibrance"), true);
		assertEq("numProperties merge vibrance parent", byName(listed.parameters, "Vibrance").parent, "Creative");
		assertEq("numProperties merge writesPerformed", listed.writesPerformed, false);
	}());

	assertEq("color seed registry still 26", ConfirmedParameterWrites.all().length, 26);
	assertEq("color motion scale still production", ConfirmedParameterWrites.isProductionEnabled("Scale", "Motion"), true);
	assertEq("color crop left still production", ConfirmedParameterWrites.isProductionEnabled("Left", "Crop"), true);
	assertEq("color opacity still production", ConfirmedParameterWrites.isProductionEnabled("Opacity", "Opacity"), true);
	assertEq("color lumetri temperature promoted", ConfirmedParameterWrites.lookup("Lumetri Color", "Temperature") !== null, true);
	assertEq("color lumetri temperature enabled", ConfirmedParameterWrites.isProductionEnabled("Temperature", "Lumetri Color"), true);
	assertEq("color lumetri saturation enabled", ConfirmedParameterWrites.isProductionEnabled("Saturation", "Lumetri Color"), true);
	assertEq("color lumetri vibrance unpromoted", ConfirmedParameterWrites.lookup("Lumetri Color", "Vibrance"), null);
	assertEq("color lumetri hue unpromoted", ConfirmedParameterWrites.lookup("Lumetri Color", "Hue"), null);

	(function () {
		var temperature = numberParam("Temperature", 0, { matchName: "" });
		var uniqueSat = numberParam("Saturation", 100, { matchName: "" });
		var basicSat = numberParam("Saturation", 100, { matchName: "" });
		var creativeSat = numberParam("Saturation", 80, { matchName: "" });
		var verifyFail = numberParam("Tint", 0, {
			matchName: "",
			setValue: function (next, updateUI) {
				if (updateUI !== true) {
					return false;
				}
				return true;
			}
		});
		var uniqueClip;
		var dualClip;
		var missingClip;
		var verifyClip;
		var cropClip;
		var opacityClip;
		var written;
		var origUniversal;
		var universalCalls;
		var origDiscover;
		var discoverCalls;
		var preview;

		uniqueClip = videoClip([{
			displayName: "Lumetri Color",
			matchName: "AE.ADBE Lumetri",
			properties: [temperature, uniqueSat]
		}]);
		universalCalls = 0;
		origUniversal = UniversalParameterWriter.set;
		UniversalParameterWriter.set = function () {
			universalCalls += 1;
			return origUniversal.apply(this, arguments);
		};
		discoverCalls = 0;
		origDiscover = ColorParameterDiscover.resolve;
		ColorParameterDiscover.resolve = function () {
			discoverCalls += 1;
			return origDiscover.apply(this, arguments);
		};

		written = ConfirmedParameterWrites.write(uniqueClip, "Temperature", { numbers: [10], value: 10 });
		assertEq("prod temperature ok", written.ok, true);
		assertEq("prod temperature verified", written.verified, true);
		assertEq("prod temperature usedQE", written.usedQE, false);
		assertEq("prod temperature method", written.method, "ComponentParam.setValue(value, true)");
		assertEq("prod temperature matchName", written.parameterMatchName, "");
		assertEq("prod temperature componentMatch", written.componentMatchName, "AE.ADBE Lumetri");
		assertEq("prod temperature live", temperature.getValue(), 10);
		assertEq("prod temperature discover used", discoverCalls >= 1, true);
		assertEq("prod temperature no universal writer", universalCalls, 0);

		written = ConfirmedParameterWrites.write(uniqueClip, "Saturation", { numbers: [120], value: 120 });
		assertEq("prod unique sat ok", written.ok, true);
		assertEq("prod unique sat verified", written.verified, true);
		assertEq("prod unique sat usedQE", written.usedQE, false);
		assertEq("prod unique sat live", uniqueSat.getValue(), 120);
		assertEq("prod unique sat no universal writer", universalCalls, 0);

		dualClip = videoClip([{
			displayName: "Lumetri Color",
			matchName: "AE.ADBE Lumetri",
			properties: [
				{ displayName: "Basic Correction", matchName: "", getValue: function () { return true; }, setValue: function () { return true; } },
				basicSat,
				{ displayName: "Creative", matchName: "", getValue: function () { return true; }, setValue: function () { return true; } },
				creativeSat
			]
		}]);
		written = ConfirmedParameterWrites.write(dualClip, "Saturation", { numbers: [12], value: 12 }, "Lumetri Color");
		assertEq("prod dual sat ok", written.ok, false);
		assertEq("prod dual sat verified", written.verified, false);
		assertEq("prod dual sat uiKind", written.uiKind, "choose-parameter");
		assertEq("prod dual sat choices", written.choices && written.choices.length, 2);
		assertEq("prod dual sat setters", written.settersCalled, false);
		assertEq("prod dual sat usedQE", written.usedQE, false);
		assertEq("prod dual sat live basic", basicSat.getValue(), 100);
		assertEq("prod dual sat live creative", creativeSat.getValue(), 80);
		assertEq("prod dual sat no universal writer", universalCalls, 0);

		missingClip = videoClip([{
			displayName: "Motion",
			matchName: "AE.ADBE Motion",
			properties: [numberParam("Scale", 100)]
		}]);
		written = ConfirmedParameterWrites.write(missingClip, "Temperature", { numbers: [10], value: 10 });
		assertEq("prod missing lumetri ok", written.ok, false);
		assertEq("prod missing lumetri reason", written.reason, "PARAMETER_NOT_FOUND");
		assertEq("prod missing lumetri setters", written.settersCalled, false);
		assertEq("prod missing lumetri usedQE", written.usedQE, false);

		written = ConfirmedParameterWrites.write(uniqueClip, "Vibrance", { numbers: [10], value: 10 });
		assertEq("prod vibrance rejected", written.reason, "UNSUPPORTED_TYPE");
		assertEq("prod vibrance not enabled", written.productionEnabled, false);

		verifyClip = videoClip([{
			displayName: "Lumetri Color",
			matchName: "AE.ADBE Lumetri",
			properties: [verifyFail]
		}]);
		written = ConfirmedParameterWrites.write(verifyClip, "Tint", { numbers: [8], value: 8 });
		assertEq("prod verify fail ok", written.ok, false);
		assertEq("prod verify fail reason", written.reason, "VALUE_NOT_VERIFIED");
		assertEq("prod verify fail setters", written.settersCalled, true);
		assertEq("prod verify fail usedQE", written.usedQE, false);
		assertEq("prod verify fail live", verifyFail.getValue(), 0);
		assertEq("prod verify fail no universal writer", universalCalls, 0);

		ColorParameterDiscover.resolve = origDiscover;
		UniversalParameterWriter.set = origUniversal;

		assertEq("prod motion scale still enabled", ConfirmedParameterWrites.isProductionEnabled("Scale", "Motion"), true);
		assertEq("prod crop left still enabled", ConfirmedParameterWrites.isProductionEnabled("Left", "Crop"), true);
		assertEq("prod opacity still enabled", ConfirmedParameterWrites.isProductionEnabled("Opacity", "Opacity"), true);

		cropClip = videoClip([{
			displayName: "Crop",
			matchName: "AE.ADBE AECrop",
			properties: [numberParam("Left", 0)]
		}]);
		written = ConfirmedParameterWrites.write(cropClip, "Left", { numbers: [10], value: 10 });
		assertEq("prod crop left still ok", written.ok, true);
		assertEq("prod crop left live", cropClip.components[0].properties[0].getValue(), 10);

		opacityClip = videoClip([{
			displayName: "Opacity",
			matchName: "AE.ADBE Opacity",
			properties: [numberParam("Opacity", 100)]
		}]);
		written = ConfirmedParameterWrites.write(opacityClip, "Opacity", { numbers: [50], value: 50 });
		assertEq("prod opacity still ok", written.ok, true);
		assertEq("prod opacity live", opacityClip.components[0].properties[0].getValue(), 50);

		if (typeof CommandPreview !== "undefined" && CommandPreview.fromQuery) {
			preview = CommandPreview.fromQuery("Temperature 10", [], {});
			assertEq("prod preview temperature kind", preview.kind, "parameter-command");
			assertEq("prod preview temperature component", preview.component, "Lumetri Color");
			preview = CommandPreview.fromQuery("Saturation 80", [], {});
			assertEq("prod preview saturation kind", preview.kind, "parameter-command");
			preview = CommandPreview.fromQuery("Vibrance 10", [], {});
			assertEq("prod preview vibrance unknown", preview.kind, "unknown-command");
		}
	}());
}());
