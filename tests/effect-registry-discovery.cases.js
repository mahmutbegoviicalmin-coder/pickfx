(function () {
	var writes;
	var report;
	var registry;
	var lumetri;
	var temp14;
	var temp101;
	var motion;
	var scale;
	var opacity;
	var unknownParam;
	var objectParam;

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
			}
		};
	}

	function recordWrite(name) {
		writes[name] = (writes[name] || 0) + 1;
		writes.total += 1;
	}

	function param(name, value, extras) {
		var current = value;
		extras = extras || {};
		return {
			displayName: extras.displayName === undefined ? name : extras.displayName,
			matchName: extras.matchName,
			getValue: extras.getValue === false ? undefined : function () {
				if (extras.getThrows) {
					throw new Error("getValue failed");
				}
				return current;
			},
			setValue: extras.setValue === false ? undefined : function () {
				recordWrite("setValue");
			},
			setColorValue: function () {
				recordWrite("setColorValue");
			},
			addKey: function () {
				recordWrite("addKey");
			},
			removeKey: function () {
				recordWrite("removeKey");
			},
			isTimeVarying: extras.isTimeVarying || function () {
				return false;
			},
			areKeyframesSupported: extras.areKeyframesSupported || function () {
				return extras.keyframes !== false;
			},
			parent: extras.parent,
			group: extras.group,
			hierarchyPath: extras.hierarchyPath,
			id: extras.id,
			guid: extras.guid,
			min: extras.min,
			max: extras.max
		};
	}

	function headerParam(name) {
		return param(name, undefined, {
			getValue: false,
			setValue: false,
			keyframes: false
		});
	}

	function videoClip(components) {
		return {
			name: "Clip A",
			mediaType: "Video",
			components: components || [],
			addComponent: function () {
				recordWrite("addComponent");
			},
			removeComponent: function () {
				recordWrite("removeComponent");
			}
		};
	}

	function reset() {
		writes = {
			setValue: 0,
			setColorValue: 0,
			addKey: 0,
			removeKey: 0,
			addComponent: 0,
			removeComponent: 0,
			apply: 0,
			enableQE: 0,
			total: 0
		};
		if (typeof $ === "undefined") {
			$ = {};
		}
		$._pickfxParameterResolver = mockResolver();
	}

	function findParam(component, index) {
		var i;
		if (!component || !component.parameters) {
			return null;
		}
		for (i = 0; i < component.parameters.length; i++) {
			if (component.parameters[i].index === index) {
				return component.parameters[i];
			}
		}
		return null;
	}

	function findComponent(result, name) {
		var i;
		for (i = 0; i < (result.components ? result.components.length : 0); i++) {
			if (result.components[i].displayName === name) {
				return result.components[i];
			}
		}
		return null;
	}

	reset();

	report = EffectRegistryDiscovery.discover(videoClip([
		{
			displayName: "Motion",
			matchName: "AE.ADBE Motion",
			properties: [
				param("Position", { x: 960, y: 540 }),
				param("Scale", 120),
				param("Rotation", 0)
			]
		},
		{
			displayName: "Opacity",
			matchName: "AE.ADBE Opacity",
			properties: [param("Opacity", 80)]
		},
		{
			displayName: "Lumetri Color",
			matchName: "AE.ADBE Lumetri",
			properties: (function () {
				var list = [];
				var i;
				for (i = 0; i < 130; i++) {
					list.push(param("Other " + i, 0, { setValue: true }));
				}
				list[0] = headerParam("Basic Correction");
				list[14] = param("Temperature", 0);
				list[90] = headerParam("HSL Secondary");
				list[101] = param("Temperature", 0);
				list[20] = param("Uniform Scale", true);
				list[21] = param("Label", "clip");
				list[22] = param("Broken", 1, { getThrows: true });
				return list;
			}())
		},
		{
			displayName: "Gaussian Blur",
			matchName: "AE.Impact_Blur_FX",
			properties: [
				param("Blurriness", 30),
				param("Repeat Edge Pixels", true)
			]
		}
	]));

	assertEq("discover ok", report.ok, true);
	assertEq("selected clip yes", report.selectedClip, true);
	assertEq("component count", report.components.length, 4);

	motion = findComponent(report, "Motion");
	assert("1 discovers component displayName", !!(motion && motion.displayName === "Motion"));
	assert("2 discovers matchName when available", !!(motion && motion.matchName === "AE.ADBE Motion" && motion.matchNameAvailable === true));

	reset();
	report = EffectRegistryDiscovery.discover(videoClip([
		{
			displayName: "Mystery FX",
			properties: [param("Amount", 10)]
		}
	]));
	assertEq("3 missing matchName available", report.components[0].matchNameAvailable, false);
	assertEq("3 missing matchName value", report.components[0].matchName, null);

	reset();
	report = EffectRegistryDiscovery.discover(videoClip([
		{
			displayName: "Motion",
			matchName: "AE.ADBE Motion",
			properties: [
				param("Scale", 120),
				param("Uniform Scale", true),
				param("Blend", "Normal"),
				param("Position", { x: 1, y: 2 }),
				param("Broken", 1, { getThrows: true })
			]
		}
	]));
	scale = report.components[0].parameters[0];
	opacity = report.components[0].parameters[1];
	unknownParam = report.components[0].parameters[2];
	objectParam = report.components[0].parameters[3];
	assertEq("4 parameter displayName", scale.displayName, "Scale");
	assertEq("5 numeric type", scale.valueType, "number");
	assertEq("5 numeric value", scale.currentValue, 120);
	assertEq("5 preserves index", scale.index, 0);
	assertEq("6 boolean type", opacity.valueType, "boolean");
	assertEq("6 boolean value", opacity.currentValue, true);
	assertEq("7 string type", unknownParam.valueType, "string");
	assertEq("7 string value", unknownParam.currentValue, "Normal");
	assertEq("8 object type", objectParam.valueType, "object");
	assertEq("8 object not raw circular dump", typeof objectParam.currentValue === "object" && objectParam.currentValue.x === undefined, true);
	assertEq("8 unknown/error type", report.components[0].parameters[4].valueType, "unknown");
	assertEq("9 index 0", report.components[0].parameters[0].index, 0);
	assertEq("9 index 4", report.components[0].parameters[4].index, 4);
	assertEq("10 previous neighbor", scale.neighborContext.previous, null);
	assertEq("10 next neighbor", scale.neighborContext.next.displayName, "Uniform Scale");
	assertEq("11 setValueCalls", writes.setValue, 0);
	assertEq("12 writeOperationCalls total", writes.total, 0);
	assertEq("12 addComponent", writes.addComponent, 0);
	assertEq("12 removeComponent", writes.removeComponent, 0);
	assertEq("12 setColorValue", writes.setColorValue, 0);

	reset();
	report = EffectRegistryDiscovery.discover(null);
	assertEq("13 no clip reason", report.reason, "NO_SELECTED_CLIP");
	assertEq("13 no clip selected", report.selectedClip, false);
	assertEq("13 no clip writes", report.setValueCalls, 0);

	reset();
	report = EffectRegistryDiscovery.discoverSelected({ ok: false, reason: "NO_VIDEO_SELECTION" });
	assertEq("13 selected helper reason", report.reason, "NO_SELECTED_CLIP");

	reset();
	report = EffectRegistryDiscovery.discover(videoClip([]));
	assertEq("14 empty components ok", report.ok, true);
	assertEq("14 empty count", report.components.length, 0);
	assertEq("14 empty writes", writes.setValue, 0);

	reset();
	report = EffectRegistryDiscovery.discover(videoClip([
		{
			displayName: "Broken",
			matchName: "AE.ADBE Broken",
			properties: [
				null,
				param(undefined, 1, { displayName: undefined }),
				{
					getValue: function () {
						throw new Error("nope");
					},
					setValue: function () {
						recordWrite("setValue");
					}
				}
			]
		},
		null
	]));
	assertEq("15 malformed does not throw", report.ok, true);
	assertEq("15 null param index preserved", report.components[0].parameters[0].index, 0);
	assertEq("15 missing displayName", report.components[0].parameters[1].displayNameAvailable, false);
	assertEq("15 getValue throw is unknown", report.components[0].parameters[2].valueType, "unknown");
	assertEq("15 setValue still not called", writes.setValue, 0);

	reset();
	report = EffectRegistryDiscovery.discover(videoClip([
		{
			displayName: "Lumetri Color",
			matchName: "AE.ADBE Lumetri",
			properties: (function () {
				var list = [];
				var i;
				for (i = 0; i < 110; i++) {
					list.push(param("Slot " + i, 1));
				}
				list[0] = headerParam("Basic Correction");
				list[13] = param("Tint", 0);
				list[14] = param("Temperature", 0);
				list[15] = param("Tint After", 0);
				list[90] = headerParam("HSL Secondary");
				list[100] = param("Hue", 0);
				list[101] = param("Temperature", 0);
				list[102] = param("Tint HSL", 0);
				return list;
			}())
		}
	]));
	lumetri = findComponent(report, "Lumetri Color");
	temp14 = findParam(lumetri, 14);
	temp101 = findParam(lumetri, 101);
	assertEq("lumetri param count", lumetri.parameterCount, 110);
	assertEq("temp 14 name", temp14.displayName, "Temperature");
	assertEq("temp 14 type", temp14.valueType, "number");
	assertEq("temp 14 inferredSection", temp14.inferredSection, "Basic Correction");
	assertEq("temp 14 previous", temp14.neighborContext.previous.displayName, "Tint");
	assertEq("temp 14 next", temp14.neighborContext.next.displayName, "Tint After");
	assertEq("temp 101 name", temp101.displayName, "Temperature");
	assertEq("temp 101 inferredSection", temp101.inferredSection, "HSL Secondary");
	assertEq("temp 101 previous", temp101.neighborContext.previous.displayName, "Hue");
	assert("temp 14 vs 101 distinguished", temp14.index !== temp101.index);
	assertEq("lumetri setValueCalls", writes.setValue, 0);

	registry = EffectRegistryDiscovery.toRegistryShape(report);
	assertEq("registry has lumetri", registry.components[0].displayName, "Lumetri Color");
	assertEq("registry temp 14 index", registry.components[0].parameters[14].index, 14);
	assertEq("registry no aliases invented", registry.components[0].parameters[14].aliases, undefined);

	assert("human report mentions Temperature", report.humanReport.indexOf("Temperature") !== -1);
	assert("human report mentions inferredSection", report.humanReport.indexOf("inferredSection: Basic Correction") !== -1);
	assertEq("safety unchanged", report.safety.parameterValuesUnchanged, true);
	assertEq("safety setValueCalls", report.safety.setValueCalls, 0);
	assertEq("catalog not all effects", report.apiModel.allInstalledEffectsEnumerated, false);
	assertEq("no QE", report.usedQE, false);
}());
