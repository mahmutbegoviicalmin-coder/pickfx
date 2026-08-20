(function () {
	var TEST_EFFECTS = [
		{ name: "Gaussian Blur", premiereName: "Gaussian Blur" },
		{ name: "Directional Blur", premiereName: "Directional Blur" },
		{ name: "Brightness & Contrast", premiereName: "Brightness & Contrast" }
	];
	var classified;
	var written;
	var clip;
	var result;
	var applyCalls;
	var confirmed;
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
					detail: 'No Motion property with displayName "' + parameterName + '".'
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

	function cropComponent(extras) {
		extras = extras || {};
		return {
			displayName: "Crop",
			matchName: "AE.ADBE AECrop",
			properties: extras.properties || [
				numberParam("Left", extras.left !== undefined ? extras.left : 0),
				numberParam("Top", extras.top !== undefined ? extras.top : 0),
				numberParam("Right", extras.right !== undefined ? extras.right : 0),
				numberParam("Bottom", extras.bottom !== undefined ? extras.bottom : 0),
				numberParam("Edge Feather", extras.feather !== undefined ? extras.feather : 0),
				numberParam("Expansion", extras.expansion !== undefined ? extras.expansion : 0)
			]
		};
	}

	function motionComponent() {
		return {
			displayName: "Motion",
			matchName: "AE.ADBE Motion",
			properties: [
				numberParam("Scale", 100),
				numberParam("Crop Left", 0),
				numberParam("Crop Top", 0),
				numberParam("Crop Right", 0),
				numberParam("Crop Bottom", 0)
			]
		};
	}

	function cropClip(name) {
		return videoClip([cropComponent(), motionComponent()], name);
	}

	function cropProp(clip, name) {
		var comps = clip.components;
		var c;
		var p;
		var props;
		for (c = 0; c < comps.length; c++) {
			if (comps[c].displayName !== "Crop" && comps[c].matchName !== "AE.ADBE AECrop") {
				continue;
			}
			props = comps[c].properties;
			for (p = 0; p < props.length; p++) {
				if (props[p].displayName === name) {
					return props[p];
				}
			}
		}
		return null;
	}

	function motionProp(clip, name) {
		var comps = clip.components;
		var c;
		var p;
		var props;
		for (c = 0; c < comps.length; c++) {
			if (comps[c].displayName !== "Motion" && comps[c].matchName !== "AE.ADBE Motion") {
				continue;
			}
			props = comps[c].properties;
			for (p = 0; p < props.length; p++) {
				if (props[p].displayName === name) {
					return props[p];
				}
			}
		}
		return null;
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

	confirmed = ConfirmedParameterWrites.lookup("Crop", "Left", "number");
	assert("crop left registry identity", !!(confirmed && confirmed.componentDisplayName === "Crop" &&
		confirmed.componentMatchName === "AE.ADBE AECrop" && confirmed.parameterDisplayName === "Left"));
	assertEq("crop left productionEnabled", confirmed.productionEnabled, true);
	assertEq("crop left status", confirmed.status, "WRITE_CONFIRMED");
	assertEq("crop left type", confirmed.runtimeType, "number");
	assertEq("crop left method", confirmed.method, "ComponentParam.setValue(value, true)");

	assertEq("crop top productionEnabled", ConfirmedParameterWrites.lookup("Crop", "Top", "number").productionEnabled, true);
	assertEq("crop right productionEnabled", ConfirmedParameterWrites.lookup("Crop", "Right", "number").productionEnabled, true);
	assertEq("crop bottom productionEnabled", ConfirmedParameterWrites.lookup("Crop", "Bottom", "number").productionEnabled, true);
	assertEq("crop edge feather productionEnabled", ConfirmedParameterWrites.lookup("Crop", "Edge Feather", "number").productionEnabled, true);

	assertEq("crop left not motion proven", ConfirmedParameterWrites.isMotionProven("Left"), false);
	assertEq("motion crop left still proven", ConfirmedParameterWrites.isMotionProven("Crop Left"), true);
	assertEq("crop left enabled on Crop", ConfirmedParameterWrites.isProductionEnabled("Left", "Crop"), true);
	assertEq("crop left enabled by matchName", ConfirmedParameterWrites.isProductionEnabled("Left", "AE.ADBE AECrop"), true);
	assertEq("crop left rejected on Motion", ConfirmedParameterWrites.isProductionEnabled("Left", "Motion"), false);
	assertEq("motion crop left rejected on Crop", ConfirmedParameterWrites.isProductionEnabled("Crop Left", "Crop"), false);
	assertEq("no crop left alias on Crop", ConfirmedParameterWrites.lookup("Crop", "Crop Left", "number"), null);
	assertEq("expansion not confirmed", ConfirmedParameterWrites.lookup("Crop", "Expansion", "number"), null);

	classified = ParameterCapability.classify({
		displayName: "Left",
		componentDisplayName: "Crop",
		runtimeType: "number",
		hasGetValue: true,
		hasSetValue: true,
		timeVarying: false
	});
	assertEq("crop left capability confirmed", classified.status, "WRITE_CONFIRMED");
	assertEq("crop left capability production", classified.productionEnabled, true);

	classified = ParameterCapability.classify({
		displayName: "Left",
		componentDisplayName: "Motion",
		runtimeType: "number",
		hasGetValue: true,
		hasSetValue: true,
		timeVarying: false
	});
	assertEq("motion left is not crop left", classified.productionEnabled, false);

	clip = cropClip("A");
	written = ConfirmedParameterWrites.write(clip, "Left", { numbers: [10], value: 10 });
	assertEq("prod crop left ok", written.ok, true);
	assertEq("prod crop left verified", written.verified, true);
	assertEq("prod crop left component", written.component, "Crop");
	assertEq("prod crop left parameter", written.parameter, "Left");
	assertEq("prod crop left matchName", written.componentMatchName, "AE.ADBE AECrop");
	assertEq("prod crop left type", written.parameterType, "number");
	assertEq("prod crop left requested", written.requestedValue, 10);
	assertEq("prod crop left actual", written.actualValue, 10);
	assertEq("prod crop left method", written.method, "ComponentParam.setValue(value, true)");
	assertEq("prod crop left usedQE", written.usedQE, false);
	assertEq("prod crop left productionEnabled", written.productionEnabled, true);
	assertEq("prod crop left live", cropProp(clip, "Left").getValue(), 10);
	assertEq("prod crop left does not touch motion", motionProp(clip, "Crop Left").getValue(), 0);

	written = ConfirmedParameterWrites.write(clip, "Top", { numbers: [12], value: 12 });
	assertEq("prod crop top live", cropProp(clip, "Top").getValue(), 12);
	written = ConfirmedParameterWrites.write(clip, "Right", { numbers: [14], value: 14 });
	assertEq("prod crop right live", cropProp(clip, "Right").getValue(), 14);
	written = ConfirmedParameterWrites.write(clip, "Bottom", { numbers: [16], value: 16 });
	assertEq("prod crop bottom live", cropProp(clip, "Bottom").getValue(), 16);
	written = ConfirmedParameterWrites.write(clip, "Edge Feather", { numbers: [8], value: 8 });
	assertEq("prod crop edge feather live", cropProp(clip, "Edge Feather").getValue(), 8);
	assertEq("prod crop expansion untouched", cropProp(clip, "Expansion").getValue(), 0);

	written = ConfirmedParameterWrites.write(clip, "Crop Left", { numbers: [20], value: 20 });
	assertEq("prod motion crop left ok", written.ok, true);
	assertEq("prod motion crop left live", motionProp(clip, "Crop Left").getValue(), 20);
	assertEq("prod crop left stays crop identity", cropProp(clip, "Left").getValue(), 10);

	written = ConfirmedParameterWrites.write(clip, "Expansion", { numbers: [4], value: 4 });
	assertEq("unconfirmed crop rejected", written.reason, "UNSUPPORTED_TYPE");
	assertEq("unconfirmed crop not enabled", written.productionEnabled, false);
	assertEq("unconfirmed crop live", cropProp(clip, "Expansion").getValue(), 0);

	written = ConfirmedParameterWrites.write(clip, "Left", { numbers: [30], value: 30 }, "Motion");
	assertEq("wrong component left rejected", written.reason, "UNSUPPORTED_TYPE");
	assertEq("wrong component left live", cropProp(clip, "Left").getValue(), 10);

	written = ConfirmedParameterWrites.write(clip, "Crop Left", { numbers: [40], value: 40 }, "Crop");
	assertEq("wrong component crop left rejected", written.reason, "UNSUPPORTED_TYPE");
	assertEq("wrong component crop left live", motionProp(clip, "Crop Left").getValue(), 20);

	written = ConfirmedParameterWrites.write(videoClip([motionComponent()]), "Left", { numbers: [10], value: 10 });
	assertEq("crop missing component", written.reason, "PARAMETER_NOT_FOUND");

	clip = cropClip("A");
	cropProp(clip, "Left").isTimeVarying = function () {
		return true;
	};
	written = ConfirmedParameterWrites.write(clip, "Left", { numbers: [10], value: 10 });
	assertEq("crop time varying", written.reason, "PARAMETER_TIME_VARYING_UNSUPPORTED");
	assertEq("crop time varying no write", cropProp(clip, "Left").getValue(), 0);

	confirmed = ConfirmedParameterWrites.markWriteConfirmed({
		component: "Crop",
		componentMatchName: "AE.ADBE AECrop",
		parameter: "Expansion",
		runtimeType: "number"
	});
	assertEq("debug confirm does not enable", confirmed.productionEnabled, false);
	written = ConfirmedParameterWrites.write(clip, "Expansion", { numbers: [4], value: 4 });
	assertEq("debug confirmed still not production", written.reason, "UNSUPPORTED_TYPE");
	ConfirmedParameterWrites.resetSession();

	clips = [
		ConfirmedParameterWrites.write(cropClip("A"), "Left", { numbers: [10], value: 10 }),
		ConfirmedParameterWrites.write(cropClip("B"), "Left", { numbers: [10], value: 10 })
	];
	result = BatchNumericExecutor.summarize({
		effect: "",
		parameter: "Left",
		requestedValue: 10
	}, [
		{ clip: "A", ok: clips[0].ok, verified: clips[0].verified, component: clips[0].component, parameter: clips[0].parameter, requestedValue: 10, actualValue: clips[0].actualValue },
		{ clip: "B", ok: clips[1].ok, verified: clips[1].verified, component: clips[1].component, parameter: clips[1].parameter, requestedValue: 10, actualValue: clips[1].actualValue }
	]);
	assertEq("crop multi selected", result.selectedCount, 2);
	assertEq("crop multi successful", result.successfulCount, 2);
	assertEq("crop multi failed", result.failedCount, 0);
	assertEq("crop multi verified", result.verifiedCount, 2);

	clips = [
		ConfirmedParameterWrites.write(cropClip("A"), "Edge Feather", { numbers: [8], value: 8 }),
		ConfirmedParameterWrites.write(videoClip([motionComponent()], "B"), "Edge Feather", { numbers: [8], value: 8 })
	];
	result = BatchNumericExecutor.summarize({
		effect: "",
		parameter: "Edge Feather",
		requestedValue: 8
	}, [
		{ clip: "A", ok: clips[0].ok, verified: clips[0].verified, component: clips[0].component, parameter: clips[0].parameter, requestedValue: 8, actualValue: clips[0].actualValue },
		{ clip: "B", ok: clips[1].ok, verified: clips[1].verified, reason: clips[1].reason, parameter: "Edge Feather", requestedValue: 8 }
	]);
	assertEq("crop mixed selected", result.selectedCount, 2);
	assertEq("crop mixed successful", result.successfulCount, 1);
	assertEq("crop mixed failed", result.failedCount, 1);
	assertEq("crop mixed verified", result.verifiedCount, 1);
	assertEq("crop mixed reason", result.reason, "PARAMETER_NOT_FOUND");

	applyCalls = 0;
	EffectExecutor = {
		applyEffect: function () {
			applyCalls += 1;
		}
	};
	assertEq("crop gaussian still effect", CommandParser.parse("Gaussian Blur 50", TEST_EFFECTS, {}).value, 50);
	assertEq("crop gaussian not clip", CommandParser.parseClipParameter("Gaussian Blur 50", TEST_EFFECTS, {}).handledByEffectNumeric, true);
	assertEq("crop directional still effect", CommandParser.parse("Directional Blur 35", TEST_EFFECTS, {}).value, 35);
	assertEq("crop brightness still effect", CommandParser.parse("Brightness & Contrast 40", TEST_EFFECTS, {}).value, 40);
	assertEq("crop left command is clip", CommandParser.parseClipParameter("Left 10", TEST_EFFECTS, {}).isClipParameter, true);
	assertEq("crop left command name", CommandParser.parseClipParameter("Left 10", TEST_EFFECTS, {}).parameterQuery, "Left");
	assertEq("crop edge feather command name", CommandParser.parseClipParameter("Edge Feather 8", TEST_EFFECTS, {}).parameterQuery, "Edge Feather");
	assertEq("motion crop left command name", CommandParser.parseClipParameter("Crop Left 10", TEST_EFFECTS, {}).parameterQuery, "Crop Left");
	assertEq("motion scale still clip", CommandParser.parseClipParameter("Scale 120", TEST_EFFECTS, {}).isClipParameter, true);
	assertEq("motion scale still proven", ConfirmedParameterWrites.isMotionProven("Scale"), true);
	assertEq("crop apply unused", applyCalls, 0);

	if (ConfirmedParameterWrites.resetSession) {
		ConfirmedParameterWrites.resetSession();
	}
}());
