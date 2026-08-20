(function () {
	var TEST_EFFECTS = [
		{ name: "Gaussian Blur", premiereName: "Gaussian Blur" },
		{ name: "Directional Blur", premiereName: "Directional Blur" },
		{ name: "Brightness & Contrast", premiereName: "Brightness & Contrast" }
	];
	var detected;
	var classified;
	var resolved;
	var written;
	var probe;
	var clip;
	var inspected;
	var matrix;
	var applyCalls;
	var writerCalls;
	var clipWriterCalls;
	var result;

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
			},
			resolve: function (trackItem, componentName, parameterName) {
				var comps = trackItem && trackItem.components;
				var c;
				var p;
				var comp;
				var param;
				if (!comps) {
					return { ok: false, reason: "PARAMETER_NOT_FOUND" };
				}
				for (c = 0; c < comps.length; c++) {
					comp = comps[c];
					if (comp.displayName !== componentName && comp.matchName !== componentName) {
						continue;
					}
					for (p = 0; p < (comp.properties ? comp.properties.length : 0); p++) {
						param = comp.properties[p];
						if (param && param.displayName === parameterName) {
							return {
								ok: true,
								effect: { displayName: comp.displayName, matchName: comp.matchName },
								parameter: { displayName: parameterName },
								_param: param
							};
						}
					}
				}
				return {
					ok: false,
					reason: "PARAMETER_NOT_FOUND",
					detail: 'No property with displayName "' + parameterName + '".'
				};
			},
			resolveMotionParameter: function (trackItem, parameterName) {
				var comps = trackItem && trackItem.components;
				var c;
				var p;
				var comp;
				var param;
				if (!comps) {
					return { ok: false, reason: "PARAMETER_NOT_FOUND" };
				}
				for (c = 0; c < comps.length; c++) {
					comp = comps[c];
					if (comp.displayName !== "Motion" && comp.matchName !== "AE.ADBE Motion") {
						continue;
					}
					for (p = 0; p < (comp.properties ? comp.properties.length : 0); p++) {
						param = comp.properties[p];
						if (param && param.displayName === parameterName) {
							return {
								ok: true,
								effect: { displayName: "Motion", matchName: "AE.ADBE Motion" },
								parameter: { displayName: parameterName },
								_param: param
							};
						}
					}
				}
				return {
					ok: false,
					reason: "PARAMETER_NOT_FOUND",
					detail: 'No property with displayName "' + parameterName + '".'
				};
			}
		};
	}

	function numberParam(name, initial, extras) {
		var value = initial;
		extras = extras || {};
		return {
			displayName: name,
			matchName: extras.matchName || "",
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
			},
			enumOptions: extras.enumOptions
		};
	}

	function videoClip(components) {
		return {
			name: "Clip A",
			mediaType: "Video",
			components: components
		};
	}

	if (typeof $ === "undefined") {
		$ = {};
	}
	$._pickfxParameterResolver = mockResolver();

	detected = ParameterValueType.detect(80);
	assertEq("detect number", detected.type, "number");
	detected = ParameterValueType.detect(true);
	assertEq("detect boolean", detected.type, "boolean");
	detected = ParameterValueType.detect([0.5, 0.5]);
	assertEq("detect point 2-array", detected.type, "point");
	detected = ParameterValueType.detect([0.5, 0.5, 0.5]);
	assertEq("3-array is not a point", detected.type, "unknown");
	assertEq("3-array shape length", detected.valueShape && detected.valueShape.length, 3);
	detected = ParameterValueType.detect({ r: 1, g: 2, b: 3 });
	assertEq("detect color", detected.type, "color");
	detected = ParameterValueType.detect("hello");
	assertEq("detect string", detected.type, "string");
	detected = ParameterValueType.detect({ weird: true });
	assertEq("detect unknown object", detected.type, "unknown");

	detected = ParameterValueType.detectLive({ enumOptions: [{ value: 0, label: "A" }, { value: 1, label: "B" }] }, 1);
	assertEq("detectLive enum from options", detected.type, "enum");
	detected = ParameterValueType.detectLive({}, 1);
	assertEq("detectLive number without options", detected.type, "number");

	classified = ParameterCapability.classify({
		displayName: "Scale",
		componentDisplayName: "Motion",
		runtimeType: "number",
		hasGetValue: true,
		hasSetValue: true,
		timeVarying: false
	});
	assertEq("motion scale confirmed", classified.status, "MULTICLIP_CONFIRMED");
	assertEq("motion scale write cap", classified.writeCapability, "NUMBER");

	classified = ParameterCapability.classify({
		displayName: "Opacity",
		componentDisplayName: "Opacity",
		runtimeType: "number",
		hasGetValue: true,
		hasSetValue: true,
		timeVarying: false
	});
	assertEq("opacity is confirmed", classified.status, "WRITE_CONFIRMED");

	classified = ParameterCapability.classify({
		displayName: "Fill",
		runtimeType: "color",
		hasGetValue: true,
		hasSetValue: true,
		timeVarying: false
	});
	assertEq("color write cap", classified.writeCapability, "COLOR");
	assertEq("color not enabled writer", classified.writable, false);

	classified = ParameterCapability.classify({
		displayName: "Scale",
		componentDisplayName: "Motion",
		runtimeType: "number",
		hasGetValue: true,
		hasSetValue: true,
		timeVarying: true
	});
	assertEq("time varying capability", classified.writeCapability, "TIME_VARYING_UNSUPPORTED");
	assertEq("time varying status", classified.status, "TIME_VARYING_UNSUPPORTED");

	clip = videoClip([
		{
			displayName: "Motion",
			matchName: "AE.ADBE Motion",
			properties: [
				numberParam("Amount", 10),
				numberParam("Scale", 100)
			]
		}
	]);
	resolved = UniversalParameterResolver.resolve(clip, "Scale");
	assertEq("resolve by displayName", resolved.ok, true);
	assertEq("resolve ignores index 0 Amount", resolved.parameter.displayName, "Scale");
	assertEq("resolve component", resolved.effect.displayName, "Motion");

	clip = videoClip([
		{
			displayName: "Motion",
			matchName: "AE.ADBE Motion",
			properties: [
				numberParam("Scale", 100),
				numberParam("Amount", 10)
			]
		}
	]);
	resolved = UniversalParameterResolver.resolve(clip, "Scale");
	assertEq("resolve after swap still Scale", resolved.parameter.displayName, "Scale");

	resolved = UniversalParameterResolver.resolve(clip, "Scale", "AE.ADBE Motion");
	assertEq("resolve with matchName hint", resolved.ok, true);

	clip = videoClip([
		{
			displayName: "Motion",
			matchName: "AE.ADBE Motion",
			properties: [numberParam("Opacity", 100)]
		},
		{
			displayName: "Opacity",
			matchName: "AE.ADBE Opacity",
			properties: [numberParam("Opacity", 80)]
		}
	]);
	resolved = UniversalParameterResolver.resolve(clip, "Opacity");
	assertEq("ambiguous Opacity", resolved.reason, "PARAMETER_NOT_FOUND");
	resolved = UniversalParameterResolver.resolve(clip, "Opacity", "Opacity");
	assertEq("Opacity with component hint", resolved.ok, true);
	assertEq("Opacity not assumed on Motion", resolved.effect.displayName, "Opacity");

	clip = videoClip([
		{
			displayName: "Opacity",
			matchName: "AE.ADBE Opacity",
			properties: [numberParam("Opacity", 80)]
		}
	]);
	inspected = UniversalParameterInspect.inspect(clip);
	assertEq("inspect ok", inspected.ok, true);
	assertEq("inspect settersCalled", inspected.settersCalled, false);
	assertEq("inspect usedQE", inspected.usedQE, false);
	assertEq("inspect component displayName", inspected.components[0].displayName, "Opacity");
	assertEq("inspect parameterCount", inspected.components[0].parameterCount, 1);
	assertEq("inspect param displayName", inspected.parameters[0].displayName, "Opacity");
	assertEq("inspect runtimeType", inspected.parameters[0].runtimeType, "number");
	assertEq("inspect currentValue", inspected.parameters[0].currentValue, 80);
	assertEq("inspect summary value alias", inspected.parameters[0].value, 80);
	assertEq("inspect summary type alias", inspected.parameters[0].type, "number");
	assertEq("inspect summary writable alias", inspected.parameters[0].writable, true);
	assert("inspect isSnapshot", UniversalParameterInspect.isSnapshot(inspected.parameters[0]) === true);
	assertEq("inspect hasGetValue", inspected.parameters[0].hasGetValue, true);
	assertEq("inspect hasSetValue", inspected.parameters[0].hasSetValue, true);
	assert("inspect matrix number count", inspected.capabilities && inspected.capabilities.number.count === 1);

	clip = videoClip([
		{
			displayName: "Motion",
			matchName: "AE.ADBE Motion",
			properties: [
				{
					displayName: "Fill",
					getValue: function () {
						return { r: 1, g: 2, b: 3 };
					}
				}
			]
		}
	]);
	inspected = UniversalParameterInspect.inspect(clip);
	assertEq("missing setValue hasSetValue", inspected.parameters[0].hasSetValue, false);
	assertEq("missing setValue readable", inspected.parameters[0].readable, true);

	clip = videoClip([
		{
			displayName: "Motion",
			matchName: "AE.ADBE Motion",
			properties: [
				{
					displayName: "Broken",
					setValue: function () {}
				}
			]
		}
	]);
	inspected = UniversalParameterInspect.inspect(clip);
	assertEq("missing getValue", inspected.parameters[0].hasGetValue, false);

	probe = ParameterWriteTest.makeSafeTestValue("number", 100);
	assertEq("safe number test", probe.value, 101);
	probe = ParameterWriteTest.makeSafeTestValue("number", 0);
	assertEq("safe number from zero", probe.value, 1);
	probe = ParameterWriteTest.makeSafeTestValue("boolean", true);
	assertEq("safe boolean test", probe.value, false);
	probe = ParameterWriteTest.makeSafeTestValue("point", [0.5, 0.5], { shape: "index0" });
	assert("safe point test", probe.ok && probe.value[0] === 0.51 && probe.value[1] === 0.5);
	probe = ParameterWriteTest.makeSafeTestValue("color", { r: 1, g: 2, b: 3 });
	assertEq("no safe color", probe.reason, "NO_SAFE_TEST_VALUE");
	probe = ParameterWriteTest.makeSafeTestValue("enum", 1);
	assertEq("no safe enum", probe.reason, "NO_SAFE_TEST_VALUE");

	clip = videoClip([
		{
			displayName: "Opacity",
			matchName: "AE.ADBE Opacity",
			properties: [numberParam("Opacity", 100)]
		}
	]);
	probe = ParameterWriteTest.run(clip, "Opacity", "Opacity");
	assertEq("write test ok", probe.ok, true);
	assertEq("write test component", probe.component, "Opacity");
	assertEq("write test parameter", probe.parameter, "Opacity");
	assertEq("write test type", probe.type, "number");
	assertEq("write test matchName", probe.componentMatchName, "AE.ADBE Opacity");
	assertEq("write test original", probe.originalValue, 100);
	assertEq("write test value", probe.testValue, 101);
	assertEq("write test after", probe.afterTest, 101);
	assertEq("write test restored", probe.restoredValue, 100);
	assertEq("write test verifiedTest", probe.verifiedTest, true);
	assertEq("write test verifiedRestore", probe.verifiedRestore, true);
	assertEq("write test status", probe.status, "WRITE_CONFIRMED");
	assertEq("write test productionEnabled", probe.productionEnabled, true);
	assertEq("write test restored live", clip.components[0].properties[0].getValue(), 100);
	assertEq("write test settersCalled", probe.settersCalled, true);
	assertEq("write test usedQE", probe.usedQE, false);
	assert("opacity production confirmed", ConfirmedParameterWrites.lookup("Opacity", "Opacity", "number") !== null);
	assertEq("opacity productionEnabled", ConfirmedParameterWrites.isProductionEnabled("Opacity"), true);

	probe = ParameterWriteTest.run(clip, "AE.ADBE Opacity", "Opacity");
	assertEq("write test by matchName", probe.ok, true);
	assertEq("write test by matchName component", probe.component, "Opacity");

	function motionNumericClip() {
		return videoClip([
			{
				displayName: "Opacity",
				matchName: "AE.ADBE Opacity",
				properties: [
					numberParam("Opacity", 100),
					numberParam("Blend Mode", 18)
				]
			},
			{
				displayName: "Motion",
				matchName: "AE.ADBE Motion",
				properties: [
					numberParam("Scale", 100),
					numberParam("Anti-flicker Filter", 0),
					numberParam("Crop Left", 0),
					numberParam("Crop Top", 0),
					numberParam("Crop Right", 0),
					numberParam("Crop Bottom", 0)
				]
			}
		]);
	}

	function assertNumericWriteRestore(label, componentHint, parameterName, original, testValue) {
		var target = motionNumericClip();
		var result = ParameterWriteTest.run(target, componentHint, parameterName);
		assertEq(label + " ok", result.ok, true);
		assertEq(label + " type", result.type, "number");
		assertEq(label + " original", result.originalValue, original);
		assertEq(label + " test", result.testValue, testValue);
		assertEq(label + " afterTest", result.afterTest, testValue);
		assertEq(label + " restored", result.restoredValue, original);
		assertEq(label + " verifiedTest", result.verifiedTest, true);
		assertEq(label + " verifiedRestore", result.verifiedRestore, true);
		assertEq(label + " status", result.status, "WRITE_CONFIRMED");
		assertEq(label + " productionEnabled", result.productionEnabled, true);
		assertEq(label + " usedQE", result.usedQE, false);
		assertEq(label + " live restored", (function () {
			var comps = target.components;
			var c;
			var p;
			var props;
			for (c = 0; c < comps.length; c++) {
				props = comps[c].properties;
				for (p = 0; p < props.length; p++) {
					if (props[p].displayName === parameterName) {
						return props[p].getValue();
					}
				}
			}
			return undefined;
		}()), original);
		return result;
	}

	assertNumericWriteRestore("anti-flicker", "AE.ADBE Motion", "Anti-flicker Filter", 0, 1);
	assertNumericWriteRestore("crop left", "Motion", "Crop Left", 0, 1);
	assertNumericWriteRestore("crop top", "AE.ADBE Motion", "Crop Top", 0, 1);
	assertNumericWriteRestore("crop right", "Motion", "Crop Right", 0, 1);
	assertNumericWriteRestore("crop bottom", "AE.ADBE Motion", "Crop Bottom", 0, 1);

	clip = motionNumericClip();
	clipWriterCalls = [];
	$._pickfxClipParameterWriter = {
		set: function () {
			clipWriterCalls.push("clip");
			return { ok: false, reason: "should not run" };
		}
	};
	probe = ParameterWriteTest.run(clip, "Motion", "Crop Left");
	assertEq("crop probe skips ClipParameterWriter", clipWriterCalls.length, 0);
	assertEq("crop probe verified", probe.verified, true);
	assertEq("blend mode not probed by default specs", ParameterWriteTest.discoveredNumericSpecs().length, 6);
	assert("blend mode excluded from specs", (function () {
		var specs = ParameterWriteTest.discoveredNumericSpecs();
		var i;
		for (i = 0; i < specs.length; i++) {
			if (specs[i].parameterDisplayName === "Blend Mode") {
				return false;
			}
		}
		return true;
	}()));

	clip = motionNumericClip();
	probe = ParameterWriteTest.runMany(clip);
	assertEq("batch ok", probe.ok, true);
	assertEq("batch count", probe.tests.length, 6);
	assertEq("batch verified", probe.verifiedCount, 6);
	assertEq("batch excluded blend", probe.excluded[0], "Blend Mode");
	assertEq("batch productionEnabled", probe.productionEnabled, true);
	assertEq("batch usedQE", probe.usedQE, false);
	assertEq("opacity live after batch", clip.components[0].properties[0].getValue(), 100);
	assertEq("blend mode untouched", clip.components[0].properties[1].getValue(), 18);
	assertEq("crop left live after batch", clip.components[1].properties[2].getValue(), 0);

	inspected = UniversalParameterInspect.inspect(motionNumericClip());
	assertEq("legacy summary opacity value", inspected.parameters[0].value, 100);
	assertEq("legacy summary opacity type", inspected.parameters[0].type, "number");
	assertEq("legacy summary opacity writable", inspected.parameters[0].writable, true);
	assertEq("legacy summary crop left value", (function () {
		var i;
		for (i = 0; i < inspected.parameters.length; i++) {
			if (inspected.parameters[i].displayName === "Crop Left") {
				return inspected.parameters[i].value;
			}
		}
		return null;
	}()), 0);
	assertEq("crop left production confirmed", ConfirmedParameterWrites.lookup("Motion", "Crop Left", "number").productionEnabled, true);
	assertEq("anti-flicker production confirmed", ConfirmedParameterWrites.lookup("Motion", "Anti-flicker Filter", "number").productionEnabled, true);
	assertEq("scale height production confirmed", ConfirmedParameterWrites.lookup("Motion", "Scale Height", "number"), null);
	assertEq("blend mode not confirmed", ConfirmedParameterWrites.lookup("Opacity", "Blend Mode", "number"), null);
	assertEq("confirmed registry count", ConfirmedParameterWrites.all().length, 26);

	classified = ParameterCapability.classify({
		displayName: "Scale Height",
		componentDisplayName: "Motion",
		runtimeType: "number",
		hasGetValue: true,
		hasSetValue: true,
		timeVarying: false
	});
	assertEq("scale height confirmed", classified.status, "REJECTED");
	classified = ParameterCapability.classify({
		displayName: "Blend Mode",
		componentDisplayName: "Opacity",
		runtimeType: "number",
		hasGetValue: true,
		hasSetValue: true,
		timeVarying: false
	});
	assertEq("blend mode still candidate", classified.status, "ENUM_LIKE_NUMBER");

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
			},
			setTyped: function (trackItem, componentName, parameterName, value) {
				var resolved = UniversalParameterResolver.resolve(trackItem, parameterName, componentName);
				var param = resolved && resolved._param;
				var actual;
				if (!param) {
					return { ok: false, reason: "PARAMETER_NOT_FOUND", effect: componentName, parameter: parameterName };
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
					type: "boolean"
				};
			}
		};
	}

	$._pickfxParameterWriter = liveNumericWriter();

	function productionClip() {
		return videoClip([
			{
				displayName: "Opacity",
				matchName: "AE.ADBE Opacity",
				properties: [
					numberParam("Opacity", 100),
					numberParam("Blend Mode", 18)
				]
			},
			{
				displayName: "Motion",
				matchName: "AE.ADBE Motion",
				properties: [
					numberParam("Scale", 100),
					numberParam("Scale Width", 100),
					numberParam("Scale Height", 100),
					numberParam("Rotation", 0),
					numberParam("Anti-flicker Filter", 0),
					numberParam("Crop Left", 0),
					numberParam("Crop Top", 0),
					numberParam("Crop Right", 0),
					numberParam("Crop Bottom", 0),
					{
						displayName: "Uniform Scale",
						getValue: function () {
							return this._value;
						},
						setValue: function (next, updateUI) {
							if (updateUI !== true) {
								return false;
							}
							this._value = next;
							return true;
						},
						isTimeVarying: function () {
							return false;
						},
						_value: true
					},
					{
						displayName: "Position",
						getValue: function () {
							return this._value;
						},
						setValue: function (next, updateUI) {
							if (updateUI !== true) {
								return false;
							}
							this._value = [next[0], next[1]];
							return true;
						},
						isTimeVarying: function () {
							return false;
						},
						_value: [0.5, 0.5]
					},
					{
						displayName: "Anchor Point",
						getValue: function () {
							return this._value;
						},
						setValue: function (next, updateUI) {
							if (updateUI !== true) {
								return false;
							}
							this._value = [next[0], next[1]];
							return true;
						},
						isTimeVarying: function () {
							return false;
						},
						_value: [0.5, 0.5]
					}
				]
			}
		]);
	}

	function motionProp(clip, name) {
		var props = clip.components[1].properties;
		var i;
		for (i = 0; i < props.length; i++) {
			if (props[i].displayName === name) {
				return props[i];
			}
		}
		return null;
	}

	clip = productionClip();
	written = ConfirmedParameterWrites.write(clip, "Opacity", { numbers: [50], value: 50 });
	assertEq("prod opacity ok", written.ok, true);
	assertEq("prod opacity verified", written.verified, true);
	assertEq("prod opacity component", written.component, "Opacity");
	assertEq("prod opacity parameter", written.parameter, "Opacity");
	assertEq("prod opacity type", written.parameterType, "number");
	assertEq("prod opacity requested", written.requestedValue, 50);
	assertEq("prod opacity actual", written.actualValue, 50);
	assertEq("prod opacity method", written.method, "ComponentParam.setValue(value, true)");
	assertEq("prod opacity usedQE", written.usedQE, false);
	assertEq("prod opacity scope", written.scope, "clip");
	assertEq("prod opacity productionEnabled", written.productionEnabled, true);
	assertEq("prod opacity live stays 50", clip.components[0].properties[0].getValue(), 50);
	assertEq("prod opacity blend untouched", clip.components[0].properties[1].getValue(), 18);

	written = ConfirmedParameterWrites.write(clip, "Scale", { numbers: [120], value: 120 });
	assertEq("prod scale ok", written.ok, true);
	assertEq("prod scale live", motionProp(clip, "Scale").getValue(), 120);
	written = ConfirmedParameterWrites.write(clip, "Scale Width", { numbers: [120], value: 120 });
	assertEq("prod scale width live", motionProp(clip, "Scale Width").getValue(), 120);
	written = ConfirmedParameterWrites.write(clip, "Scale Height", { numbers: [120], value: 120 });
	assertEq("prod scale height rejected", written.reason, "PARAMETER_NOT_FOUND");
	assertEq("prod scale height live", motionProp(clip, "Scale Height").getValue(), 100);
	written = ConfirmedParameterWrites.write(clip, "Rotation", { numbers: [30], value: 30 });
	assertEq("prod rotation live", motionProp(clip, "Rotation").getValue(), 30);
	written = ConfirmedParameterWrites.write(clip, "Anti-flicker Filter", { numbers: [1], value: 1 });
	assertEq("prod anti-flicker live", motionProp(clip, "Anti-flicker Filter").getValue(), 1);
	written = ConfirmedParameterWrites.write(clip, "Crop Left", { numbers: [10], value: 10 });
	assertEq("prod crop left live", motionProp(clip, "Crop Left").getValue(), 10);
	written = ConfirmedParameterWrites.write(clip, "Crop Top", { numbers: [10], value: 10 });
	assertEq("prod crop top live", motionProp(clip, "Crop Top").getValue(), 10);
	written = ConfirmedParameterWrites.write(clip, "Crop Right", { numbers: [10], value: 10 });
	assertEq("prod crop right live", motionProp(clip, "Crop Right").getValue(), 10);
	written = ConfirmedParameterWrites.write(clip, "Crop Bottom", { numbers: [10], value: 10 });
	assertEq("prod crop bottom live", motionProp(clip, "Crop Bottom").getValue(), 10);
	written = ConfirmedParameterWrites.write(clip, "Uniform Scale", { booleanValue: false, value: false });
	assertEq("prod uniform false", motionProp(clip, "Uniform Scale").getValue(), false);
	written = ConfirmedParameterWrites.write(clip, "Uniform Scale", { booleanValue: true, value: true });
	assertEq("prod uniform true", motionProp(clip, "Uniform Scale").getValue(), true);
	written = ConfirmedParameterWrites.write(clip, "Position", { numbers: [0.6, 0.5], value: [0.6, 0.5] });
	assert("prod position live", motionProp(clip, "Position").getValue()[0] === 0.6 && motionProp(clip, "Position").getValue()[1] === 0.5);
	written = ConfirmedParameterWrites.write(clip, "Anchor Point", { numbers: [0.25, 0.75], value: [0.25, 0.75] });
	assert("prod anchor live", motionProp(clip, "Anchor Point").getValue()[0] === 0.25 && motionProp(clip, "Anchor Point").getValue()[1] === 0.75);
	assertEq("prod no restore scale", motionProp(clip, "Scale").getValue(), 120);
	assertEq("prod no restore opacity", clip.components[0].properties[0].getValue(), 50);

	written = ConfirmedParameterWrites.write(clip, "Blend Mode", { numbers: [18], value: 18 });
	assertEq("prod blend rejected", written.reason, "UNSUPPORTED_TYPE");
	assertEq("prod blend not enabled", written.productionEnabled, false);
	assertEq("prod blend live untouched", clip.components[0].properties[1].getValue(), 18);

	written = ConfirmedParameterWrites.write(clip, "Uniform Scale", { numbers: [1], value: 1 });
	assertEq("prod boolean rejects 1", written.reason, "INVALID_VALUE");
	written = ConfirmedParameterWrites.write(clip, "Uniform Scale", { numbers: [0], value: 0 });
	assertEq("prod boolean rejects 0", written.reason, "INVALID_VALUE");

	written = ConfirmedParameterWrites.write(videoClip([{
		displayName: "Opacity",
		matchName: "AE.ADBE Opacity",
		properties: []
	}]), "Opacity", { numbers: [50], value: 50 });
	assertEq("prod missing parameter", written.reason, "PARAMETER_NOT_FOUND");

	clip = productionClip();
	motionProp(clip, "Scale").isTimeVarying = function () {
		return true;
	};
	written = ConfirmedParameterWrites.write(clip, "Scale", { numbers: [120], value: 120 });
	assertEq("prod time varying", written.reason, "PARAMETER_TIME_VARYING_UNSUPPORTED");
	assertEq("prod time varying no write", motionProp(clip, "Scale").getValue(), 100);

	clip = productionClip();
	motionProp(clip, "Scale").getValue = function () {
		return { r: 1, g: 2, b: 3 };
	};
	written = ConfirmedParameterWrites.write(clip, "Scale", { numbers: [120], value: 120 });
	assertEq("prod wrong runtime type", written.reason, "UNSUPPORTED_TYPE");

	clip = productionClip();
	$._pickfxParameterWriter.set = function (trackItem, componentName, parameterName, value) {
		return {
			ok: false,
			verified: false,
			effect: componentName,
			parameter: parameterName,
			requestedValue: value,
			actualValue: 999,
			readBack: 999,
			type: "number",
			reason: "VALUE_NOT_VERIFIED"
		};
	};
	written = ConfirmedParameterWrites.write(clip, "Scale", { numbers: [120], value: 120 });
	assertEq("prod verify fail ok", written.ok, false);
	assertEq("prod verify fail verified", written.verified, false);
	assertEq("prod verify fail reason", written.reason, "VALUE_NOT_VERIFIED");
	assertEq("prod verify fail live unrestored", motionProp(clip, "Scale").getValue(), 100);
	$._pickfxParameterWriter = liveNumericWriter();

	result = BatchNumericExecutor.summarize({
		effect: "",
		parameter: "Opacity",
		requestedValue: 50
	}, [
		{ clip: "A", ok: true, verified: true, requestedValue: 50, actualValue: 50 },
		{ clip: "B", ok: true, verified: true, requestedValue: 50, actualValue: 50 }
	]);
	assertEq("prod multi opacity selected", result.selectedCount, 2);
	assertEq("prod multi opacity successful", result.successfulCount, 2);
	assertEq("prod multi opacity failed", result.failedCount, 0);
	assertEq("prod multi opacity verified", result.verifiedCount, 2);

	result = BatchNumericExecutor.summarize({
		effect: "",
		parameter: "Crop Left",
		requestedValue: 10
	}, [
		{ clip: "A", ok: true, verified: true, requestedValue: 10, actualValue: 10 },
		{ clip: "B", ok: false, verified: false, reason: "PARAMETER_NOT_FOUND", requestedValue: 10 }
	]);
	assertEq("prod mixed selected", result.selectedCount, 2);
	assertEq("prod mixed successful", result.successfulCount, 1);
	assertEq("prod mixed failed", result.failedCount, 1);
	assertEq("prod mixed verified", result.verifiedCount, 1);
	assertEq("prod mixed reason", result.reason, "PARAMETER_NOT_FOUND");

	clip = videoClip([
		{
			displayName: "Opacity",
			matchName: "AE.ADBE Opacity",
			properties: [numberParam("Opacity", 100, {
				setValue: function () {
					return true;
				}
			})]
		}
	]);
	probe = ParameterWriteTest.run(clip, "Opacity", "Opacity");
	assertEq("write verify fail", probe.reason, "VALUE_NOT_VERIFIED");
	assertEq("restore verify fail when noop", probe.verifiedTest, false);

	clip = videoClip([
		{
			displayName: "Opacity",
			matchName: "AE.ADBE Opacity",
			properties: [numberParam("Opacity", 100, {
				isTimeVarying: function () {
					return true;
				}
			})]
		}
	]);
	probe = ParameterWriteTest.run(clip, "Opacity", "Opacity");
	assertEq("probe time varying", probe.reason, "PARAMETER_TIME_VARYING_UNSUPPORTED");
	assertEq("probe time varying no setter", probe.settersCalled, false);
	assertEq("probe time varying stored", clip.components[0].properties[0].getValue(), 100);

	clip = videoClip([
		{
			displayName: "Color",
			matchName: "color",
			properties: [{
				displayName: "Fill",
				getValue: function () {
					return { r: 1, g: 2, b: 3 };
				},
				setValue: function () {
					throw new Error("should not write");
				},
				isTimeVarying: function () {
					return false;
				}
			}]
		}
	]);
	probe = ParameterWriteTest.run(clip, "Color", "Fill");
	assertEq("color no safe test", probe.reason, "NO_SAFE_TEST_VALUE");
	assertEq("color setters not called", probe.settersCalled, false);

	writerCalls = [];
	$._pickfxParameterWriter = {
		set: function (trackItem, componentName, parameterName, value) {
			writerCalls.push(componentName + ":" + parameterName + ":" + value);
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
		setTyped: function () {
			return { ok: true, verified: true, type: "boolean" };
		}
	};
	clip = videoClip([
		{
			displayName: "Opacity",
			matchName: "AE.ADBE Opacity",
			properties: [numberParam("Opacity", 80)]
		}
	]);
	written = UniversalParameterWriter.set(clip, "Opacity", { numbers: [50], value: 50 });
	assertEq("universal number used wrapper", writerCalls[0], "Opacity:Opacity:50");
	assertEq("universal number ok", written.ok, true);
	assertEq("universal flag", written.universal, true);

	clip = videoClip([
		{
			displayName: "Motion",
			matchName: "AE.ADBE Motion",
			properties: [
				numberParam("Anti-flicker Filter", 0),
				numberParam("Crop Left", 0),
				numberParam("Crop Top", 0),
				numberParam("Crop Right", 0),
				numberParam("Crop Bottom", 0)
			]
		}
	]);
	writerCalls = [];
	written = UniversalParameterWriter.set(clip, "Anti-flicker Filter", { numbers: [1], value: 1 }, "AE.ADBE Motion");
	assertEq("universal anti-flicker wrapper", writerCalls[0], "Motion:Anti-flicker Filter:1");
	assertEq("universal anti-flicker ok", written.ok, true);
	assertEq("universal anti-flicker flag", written.universal, true);
	writerCalls = [];
	written = UniversalParameterWriter.set(clip, "Crop Left", { numbers: [1], value: 1 }, "Motion");
	assertEq("universal crop left wrapper", writerCalls[0], "Motion:Crop Left:1");
	written = UniversalParameterWriter.set(clip, "Crop Top", { numbers: [1], value: 1 }, "AE.ADBE Motion");
	assertEq("universal crop top wrapper", writerCalls[1], "Motion:Crop Top:1");
	written = UniversalParameterWriter.set(clip, "Crop Right", { numbers: [1], value: 1 }, "Motion");
	assertEq("universal crop right wrapper", writerCalls[2], "Motion:Crop Right:1");
	written = UniversalParameterWriter.set(clip, "Crop Bottom", { numbers: [1], value: 1 }, "AE.ADBE Motion");
	assertEq("universal crop bottom wrapper", writerCalls[3], "Motion:Crop Bottom:1");
	assertEq("universal crop uses wrapper not clip writer", clipWriterCalls.length, 0);

	clip = videoClip([
		{
			displayName: "Opacity",
			matchName: "AE.ADBE Opacity",
			properties: [numberParam("Opacity", 80)]
		}
	]);
	written = UniversalParameterWriter.set(clip, "Opacity", { numbers: [50], value: 50 });
	clip.components[0].properties[0].isTimeVarying = function () {
		return true;
	};
	writerCalls = [];
	written = UniversalParameterWriter.set(clip, "Opacity", { numbers: [50], value: 50 });
	assertEq("universal time varying", written.reason, "PARAMETER_TIME_VARYING_UNSUPPORTED");
	assertEq("universal time varying no write", writerCalls.length, 0);

	written = ColorParameterWriter.set({}, "Lumetri", "Temperature");
	assertEq("color writer unsupported", written.reason, "UNSUPPORTED_TYPE");
	assertEq("color writer settersCalled", written.settersCalled, false);
	written = EnumParameterWriter.set({}, "Lumetri", "Mode");
	assertEq("enum writer unsupported", written.reason, "UNSUPPORTED_TYPE");
	written = StringParameterWriter.set({}, "Lumetri", "Name");
	assertEq("string writer unsupported", written.reason, "UNSUPPORTED_TYPE");

	matrix = ParameterCapability.matrixFromParameters([
		{ runtimeType: "number", status: "MULTICLIP_CONFIRMED", writeCapability: "NUMBER", displayName: "Scale" },
		{ runtimeType: "color", status: "DISCOVERED", writeCapability: "COLOR", displayName: "Fill" },
		{ runtimeType: "unknown", status: "UNKNOWN", writeCapability: "UNSUPPORTED", displayName: "?" }
	]);
	assertEq("matrix confirmed", matrix.confirmedWrites.length, 1);
	assertEq("matrix unsupported", matrix.unsupported.length, 1);
	assertEq("matrix unknown", matrix.unknown.length, 1);

	applyCalls = 0;
	EffectExecutor = {
		applyEffect: function () {
			applyCalls += 1;
		}
	};
	assertEq("gaussian still effect numeric", CommandParser.parseClipParameter("Gaussian Blur 50", TEST_EFFECTS, {}).handledByEffectNumeric, true);
	assertEq("directional still effect numeric", CommandParser.parse("Directional Blur 35", TEST_EFFECTS, {}).value, 35);
	assertEq("brightness auto numeric still effect", CommandParser.parse("Brightness & Contrast 25", TEST_EFFECTS, {}).effect && CommandParser.parse("Brightness & Contrast 25", TEST_EFFECTS, {}).effect.name, "Brightness & Contrast");
	assertEq("brightness named contrast is effect leftover", CommandParser.parse("Brightness & Contrast Contrast 40", TEST_EFFECTS, {}).parameterQuery, "Contrast");
	assertEq("brightness named contrast is not clip", CommandParser.parseClipParameter("Brightness & Contrast Contrast 40", TEST_EFFECTS, {}).isClipParameter, false);
	assertEq("motion scale still clip", CommandParser.parseClipParameter("Scale 120", TEST_EFFECTS, {}).isClipParameter, true);
	assertEq("motion scale proven", ConfirmedParameterWrites.isMotionProven("Scale"), true);
	assertEq("opacity not motion proven", ConfirmedParameterWrites.isMotionProven("Opacity"), false);
	assertEq("crop left is motion proven", ConfirmedParameterWrites.isMotionProven("Crop Left"), true);
	assertEq("anti-flicker is motion proven", ConfirmedParameterWrites.isMotionProven("Anti-flicker Filter"), true);
	assertEq("scale height is motion proven", ConfirmedParameterWrites.isMotionProven("Scale Height"), false);
	assertEq("apply not used in these checks", applyCalls, 0);

	result = BatchNumericExecutor.summarize({
		effect: "",
		parameter: "Opacity",
		requestedValue: 50
	}, [
		{ clip: "A", ok: true, verified: true, requestedValue: 50, actualValue: 50 },
		{ clip: "B", ok: false, verified: false, reason: "PARAMETER_NOT_FOUND", requestedValue: 50 }
	]);
	assertEq("universal multi selected", result.selectedCount, 2);
	assertEq("universal multi successful", result.successfulCount, 1);
	assertEq("universal multi failed", result.failedCount, 1);
}());
