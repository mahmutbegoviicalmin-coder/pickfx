(function () {
	var clip;
	var report;
	var row;
	var setCalls;
	var beforeCount;

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
			enumOptions: extras.enumOptions,
			valueNames: extras.valueNames,
			getValueNames: extras.getValueNames,
			getValue: extras.getValue || function () {
				return value;
			},
			setValue: extras.setValue || function (next, updateUI) {
				setCalls += 1;
				if (updateUI !== true) {
					return false;
				}
				value = next;
				return true;
			},
			isTimeVarying: extras.isTimeVarying || function () {
				return false;
			}
		};
	}

	function videoClip(components) {
		return {
			name: "Video A",
			mediaType: "Video",
			components: components
		};
	}

	if (typeof $ === "undefined") {
		$ = {};
	}
	$._pickfxParameterResolver = mockResolver();
	setCalls = 0;

	assertEq("blend diag constants not exposed", BlendModeDiagnostic.NOT_EXPOSED, "BLEND_MODE_NOT_EXPOSED_AS_COMPONENT_PARAM");
	assertEq("blend diag constants unavailable", BlendModeDiagnostic.METADATA_UNAVAILABLE, "BLEND_MODE_ENUM_METADATA_UNAVAILABLE");
	assertEq("blend diag constants available", BlendModeDiagnostic.METADATA_AVAILABLE, "BLEND_MODE_ENUM_METADATA_AVAILABLE");

	clip = videoClip([{
		displayName: "Motion",
		matchName: "AE.ADBE Motion",
		properties: [numberParam("Scale", 100)]
	}]);
	setCalls = 0;
	report = BlendModeDiagnostic.diagnose(clip);
	assertEq("blend diag missing opacity ok", report.ok, true);
	assertEq("blend diag missing opacity outcome", report.outcome, "BLEND_MODE_NOT_EXPOSED_AS_COMPONENT_PARAM");
	assertEq("blend diag missing opacity reason", report.reason, "BLEND_MODE_NOT_EXPOSED_AS_COMPONENT_PARAM");
	assertEq("blend diag missing opacity found", report.opacityFound, false);
	assertEq("blend diag missing opacity matches", report.blendModeMatchCount, 0);
	assertEq("blend diag missing opacity setters", report.settersCalled, false);
	assertEq("blend diag missing opacity usedQE", report.usedQE, false);
	assertEq("blend diag missing opacity production", report.productionEnabled, false);
	assertEq("blend diag missing opacity readOnly", report.readOnly, true);
	assertEq("blend diag missing opacity setCalls", setCalls, 0);

	clip = videoClip([{
		displayName: "Opacity",
		matchName: "AE.ADBE Opacity",
		properties: [numberParam("Opacity", 100)]
	}]);
	setCalls = 0;
	report = BlendModeDiagnostic.diagnose(clip);
	assertEq("blend diag no blend outcome", report.outcome, "BLEND_MODE_NOT_EXPOSED_AS_COMPONENT_PARAM");
	assertEq("blend diag no blend opacityFound", report.opacityFound, true);
	assertEq("blend diag no blend componentParamCount", report.blendModeComponentParamCount, 0);
	assertEq("blend diag no blend setters", report.settersCalled, false);
	assertEq("blend diag no blend setCalls", setCalls, 0);

	clip = videoClip([{
		displayName: "Opacity",
		matchName: "AE.ADBE Opacity",
		properties: [
			numberParam("Opacity", 100),
			numberParam("Blend Mode", 18, { matchName: "" })
		]
	}]);
	setCalls = 0;
	beforeCount = ConfirmedParameterWrites.all().length;
	report = BlendModeDiagnostic.diagnose(clip);
	assertEq("blend diag unavailable ok", report.ok, true);
	assertEq("blend diag unavailable outcome", report.outcome, "BLEND_MODE_ENUM_METADATA_UNAVAILABLE");
	assertEq("blend diag unavailable reason", report.reason, "BLEND_MODE_ENUM_METADATA_UNAVAILABLE");
	assertEq("blend diag unavailable matchCount", report.blendModeMatchCount, 1);
	assertEq("blend diag unavailable componentParamCount", report.blendModeComponentParamCount, 1);
	row = report.blendModeMatches[0];
	assertEq("blend diag unavailable display", row.parameterDisplayName, "Blend Mode");
	assertEq("blend diag unavailable param match", row.parameterMatchName, "");
	assertEq("blend diag unavailable component display", row.componentDisplayName, "Opacity");
	assertEq("blend diag unavailable component match", row.componentMatchName, "AE.ADBE Opacity");
	assertEq("blend diag unavailable runtimeType", row.runtimeType, "number");
	assertEq("blend diag unavailable currentValue", row.currentValue, 18);
	assertEq("blend diag unavailable hasGetValue", row.hasGetValue, true);
	assertEq("blend diag unavailable isComponentParam", row.isComponentParam, true);
	assertEq("blend diag unavailable hasSafeOptions", row.enumMetadata.hasSafeOptions, false);
	assertEq("blend diag unavailable optionCount", row.enumMetadata.optionCount, 0);
	assertEq("blend diag unavailable hasGetValueNames", row.hasGetValueNames, false);
	assertEq("blend diag unavailable hasValueNames", row.hasValueNames, false);
	assertEq("blend diag unavailable hasItems", row.hasItems, false);
	assertEq("blend diag unavailable hasOptions", row.hasOptions, false);
	assertEq("blend diag unavailable setters", report.settersCalled, false);
	assertEq("blend diag unavailable writes", report.writesPerformed, false);
	assertEq("blend diag unavailable setCalls", setCalls, 0);
	assertEq("blend diag unavailable live value", clip.components[0].properties[1].getValue(), 18);
	assertEq("blend diag unavailable registry", ConfirmedParameterWrites.all().length, beforeCount);

	clip = videoClip([{
		displayName: "Opacity",
		matchName: "AE.ADBE Opacity",
		properties: [numberParam("Blend Mode", 0, {
			matchName: "",
			enumOptions: [
				{ value: 0, label: "LiveA" },
				{ value: 5, label: "LiveB" }
			]
		})]
	}]);
	setCalls = 0;
	report = BlendModeDiagnostic.diagnose(clip);
	assertEq("blend diag available ok", report.ok, true);
	assertEq("blend diag available outcome", report.outcome, "BLEND_MODE_ENUM_METADATA_AVAILABLE");
	assertEq("blend diag available reason", report.reason, "BLEND_MODE_ENUM_METADATA_AVAILABLE");
	row = report.blendModeMatches[0];
	assertEq("blend diag available hasSafeOptions", row.enumMetadata.hasSafeOptions, true);
	assertEq("blend diag available optionCount", row.enumMetadata.optionCount, 2);
	assertEq("blend diag available option0 value", row.enumMetadata.options[0].value, 0);
	assertEq("blend diag available option0 label", row.enumMetadata.options[0].label, "LiveA");
	assertEq("blend diag available option1 value", row.enumMetadata.options[1].value, 5);
	assertEq("blend diag available option1 label", row.enumMetadata.options[1].label, "LiveB");
	assertEq("blend diag available setCalls", setCalls, 0);
	assertEq("blend diag available live value", clip.components[0].properties[0].getValue(), 0);
	assertEq("blend diag available production", report.productionEnabled, false);
	assertEq("blend diag available usedQE", report.usedQE, false);

	clip = {
		name: "Audio A",
		mediaType: "Audio",
		components: [{
			displayName: "Opacity",
			matchName: "AE.ADBE Opacity",
			properties: [numberParam("Blend Mode", 0)]
		}]
	};
	report = BlendModeDiagnostic.diagnose(clip);
	assertEq("blend diag audio ok", report.ok, false);
	assertEq("blend diag audio reason", report.reason, "NO_VIDEO_SELECTION");

	assertEq("blend diag seed registry still 26", ConfirmedParameterWrites.all().length, 26);
}());
