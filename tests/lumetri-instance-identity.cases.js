(function () {
	var clip;
	var report;
	var tempRow;
	var sat;
	var setCalls;
	var beforeCount;
	var i;
	var names;

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

	function numberParam(name, initial, extras) {
		var value = initial;
		extras = extras || {};
		return {
			displayName: name,
			matchName: extras.matchName !== undefined ? extras.matchName : "",
			instanceName: extras.instanceName !== undefined ? extras.instanceName : "",
			getValue: extras.getValue || function () {
				return value;
			},
			setValue: extras.setValue || function (next) {
				setCalls += 1;
				value = next;
				return true;
			},
			isTimeVarying: extras.isTimeVarying || function () {
				return false;
			}
		};
	}

	function groupParam(name, children) {
		return {
			displayName: name,
			matchName: "",
			properties: children
		};
	}

	function lumetriComponent(properties, extras) {
		extras = extras || {};
		return {
			displayName: "Lumetri Color",
			matchName: "AE.ADBE Lumetri",
			instanceName: extras.instanceName !== undefined ? extras.instanceName : "",
			properties: properties
		};
	}

	function videoClip(components) {
		return {
			name: "Video A",
			mediaType: "Video",
			nodeId: "clip-node-1",
			components: components
		};
	}

	function byParam(comparison, name) {
		var n;
		for (n = 0; n < (comparison ? comparison.length : 0); n++) {
			if (comparison[n].parameter === name) {
				return comparison[n];
			}
		}
		return null;
	}

	if (typeof $ === "undefined") {
		$ = {};
	}
	$._pickfxParameterResolver = mockResolver();
	setCalls = 0;
	beforeCount = typeof ConfirmedParameterWrites !== "undefined" && ConfirmedParameterWrites.all
		? ConfirmedParameterWrites.all().length
		: 0;

	assertEq("identity inspect operation", LumetriInstanceIdentityInspect.OPERATION, "lumetri.instance.identity.inspect");
	assertEq("identity inspect uxp no extra id", LumetriInstanceIdentityInspect.officialAdobeApi().uxpImprovesInstanceIdentity, false);
	assertEq("identity inspect uxp still names+index", LumetriInstanceIdentityInspect.officialAdobeApi().uxpStillOnlyDisplayNameMatchNameIndex, true);

	clip = videoClip([
		{ displayName: "Motion", matchName: "AE.ADBE Motion", properties: [numberParam("Scale", 100)] }
	]);
	setCalls = 0;
	report = LumetriInstanceIdentityInspect.inspect(clip);
	assertEq("no lumetri ok", report.ok, true);
	assertEq("no lumetri count", report.lumetriCount, 0);
	assertEq("no lumetri chosen", report.chosen, false);
	assertEq("no lumetri writes", report.settersCalled, false);
	assertEq("no lumetri qe", report.usedQE, false);
	assertEq("no lumetri production", report.productionEnabled, false);
	assertEq("no lumetri setCalls", setCalls, 0);
	assertEq("no lumetri auto target", report.conclusions.safestAutomaticTarget, "no Lumetri instance");

	clip = videoClip([
		lumetriComponent([
			numberParam("Temperature", 0),
			numberParam("Saturation", 100)
		])
	]);
	setCalls = 0;
	report = LumetriInstanceIdentityInspect.inspect(clip);
	assertEq("single lumetri count", report.lumetriCount, 1);
	assertEq("single lumetri chosen", report.chosen, false);
	assertEq("single lumetri auto target", report.conclusions.safestAutomaticTarget, "single Lumetri instance is unambiguous by displayName+matchName");
	assertEq("single lumetri setCalls", setCalls, 0);
	assertEq("single saturation unique", report.conclusions.saturationDisplayNameUnique, true);

	clip = videoClip([
		lumetriComponent([
			groupParam("Basic Correction", [
				numberParam("Temperature", 0),
				numberParam("Tint", 0),
				numberParam("Exposure", 0),
				numberParam("Contrast", 0),
				numberParam("Highlights", 0),
				numberParam("Shadows", 0),
				numberParam("Whites", 0),
				numberParam("Blacks", 0),
				numberParam("Saturation", 100)
			]),
			groupParam("Creative", [
				numberParam("Saturation", 80)
			])
		]),
		lumetriComponent([
			groupParam("Basic Correction", [
				numberParam("Temperature", 11),
				numberParam("Tint", 2),
				numberParam("Exposure", 0.5),
				numberParam("Contrast", 10),
				numberParam("Highlights", -5),
				numberParam("Shadows", 8),
				numberParam("Whites", 1),
				numberParam("Blacks", -2),
				numberParam("Saturation", 90)
			]),
			groupParam("Creative", [
				numberParam("Saturation", 70)
			])
		]),
		lumetriComponent([
			numberParam("Temperature", 22),
			numberParam("Saturation", 60)
		])
	]);
	setCalls = 0;
	report = LumetriInstanceIdentityInspect.inspect(clip);
	assertEq("multi lumetri ok", report.ok, true);
	assertEq("multi lumetri count", report.lumetriCount, 3);
	assertEq("multi lumetri chosen", report.chosen, false);
	assertEq("multi lumetri auto index", report.autoSelectedIndex, "unavailable");
	assertEq("multi lumetri writes", report.settersCalled, false);
	assertEq("multi lumetri writesPerformed", report.writesPerformed, false);
	assertEq("multi lumetri qe", report.usedQE, false);
	assertEq("multi lumetri production", report.productionEnabled, false);
	assertEq("multi lumetri setCalls", setCalls, 0);
	assertEq("multi lumetri first ordinal", report.lumetriInstances[0].lumetriOrdinal, 1);
	assertEq("multi lumetri second ordinal", report.lumetriInstances[1].lumetriOrdinal, 2);
	assertEq("multi lumetri third ordinal", report.lumetriInstances[2].lumetriOrdinal, 3);
	assertEq("multi lumetri indexes kept", report.lumetriInstances[0].componentIndex, 0);
	assertEq("multi lumetri second index", report.lumetriInstances[1].componentIndex, 1);
	assertEq("multi lumetri third index", report.lumetriInstances[2].componentIndex, 2);
	assertEq("multi lumetri display", report.lumetriInstances[0].displayName, "Lumetri Color");
	assertEq("multi lumetri match", report.lumetriInstances[0].matchName, "AE.ADBE Lumetri");
	assertEq("multi lumetri instanceName empty", report.lumetriInstances[0].instanceName, "");
	assertEq("identity display not unique", report.identityComparison.displayNameUnique, false);
	assertEq("identity match not unique", report.identityComparison.matchNameUnique, false);
	assertEq("identity instanceName not unique", report.identityComparison.instanceNameUnique, false);
	assertEq("pairwise count", report.identityComparison.pairwise.length, 3);
	assertEq("pairwise 1vs2 not same ref", report.identityComparison.pairwise[0].reference.strictEqual, false);
	assertEq("conclusions not chosen", report.conclusions.chosen, false);
	assertEq("conclusions no user-intent index", report.conclusions.componentIndexDocumentedAsUserIntent, false);
	assertEq("conclusions index can address", report.conclusions.componentIndexCanAddressInstance, true);
	assertEq("conclusions no auto target", report.conclusions.safestAutomaticTarget, "none");
	assertEq("conclusions user pick targetable", report.conclusions.userVisibleSelectionWouldBeTargetable, true);

	tempRow = byParam(report.parameterComparison, "Temperature");
	assertEq("temp match count", tempRow && tempRow.matchCount, 3);
	assertEq("temp 1 value", tempRow.matches[0].currentValue, 0);
	assertEq("temp 2 value", tempRow.matches[1].currentValue, 11);
	assertEq("temp 3 value", tempRow.matches[2].currentValue, 22);
	assertEq("temp 1 componentIndex", tempRow.matches[0].componentIndex, 0);
	assertEq("temp 2 componentIndex", tempRow.matches[1].componentIndex, 1);
	assertEq("temp 1 hierarchy", tempRow.matches[0].hierarchyPath, "Basic Correction / Temperature");
	assertEq("temp 3 hierarchy", tempRow.matches[2].hierarchyPath, "Temperature");

	assertEq("saturation identities count", report.saturationIdentities.length, 5);
	assertEq("saturation parent differentiates", report.conclusions.saturationParentDifferentiates, true);
	assertEq("saturation hierarchy differentiates", report.conclusions.saturationHierarchyDifferentiates, true);
	assertEq("saturation displayName not unique", report.conclusions.saturationDisplayNameUnique, false);
	sat = report.saturationIdentities[0];
	assertEq("sat 1 parent", sat.parent, "Basic Correction");
	assertEq("sat 1 path", sat.hierarchyPath, "Basic Correction / Saturation");
	assertEq("sat 1 value", sat.currentValue, 100);
	assertEq("sat 2 parent", report.saturationIdentities[1].parent, "Creative");
	assertEq("sat 2 path", report.saturationIdentities[1].hierarchyPath, "Creative / Saturation");
	assertEq("sat 2 value", report.saturationIdentities[1].currentValue, 80);
	assertEq("sat 3 parent", report.saturationIdentities[2].parent, "Basic Correction");
	assertEq("sat 3 component", report.saturationIdentities[2].componentIndex, 1);
	assertEq("sat 5 parent empty", report.saturationIdentities[4].parent, "");
	assertEq("sat 5 path", report.saturationIdentities[4].hierarchyPath, "Saturation");

	assertEq("effect controls official none", report.effectControlsProbes.officialApi.indexOf("none documented") !== -1, true);
	assertEq("uxp documented methods count", report.officialAdobeApi.uxpComponent.documentedMethods.length, 4);
	assertEq("cep component no guid", report.officialAdobeApi.cepComponent.notDocumented.indexOf("guid") !== -1, true);

	names = [];
	for (i = 0; i < report.allComponents.length; i++) {
		names.push(report.allComponents[i].displayName + ":" + String(report.allComponents[i].isLumetri));
	}
	assertEq("all components three lumetri flags", names[0] + "/" + names[1] + "/" + names[2], "Lumetri Color:true/Lumetri Color:true/Lumetri Color:true");

	if (typeof ConfirmedParameterWrites !== "undefined" && ConfirmedParameterWrites.all) {
		assertEq("identity inspect did not promote", ConfirmedParameterWrites.all().length, beforeCount);
	}
}());
