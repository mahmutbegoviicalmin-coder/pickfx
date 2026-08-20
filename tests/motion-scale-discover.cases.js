(function () {
	var setCalls;
	var inspected;
	var encoded;
	var answers;
	var clip;

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
		setCalls = setCalls || [];
		return {
			displayName: name,
			matchName: extras.matchName || "",
			getValue: extras.getValue || function () {
				return value;
			},
			setValue: extras.setValue || function (next) {
				setCalls.push(name);
				value = next;
				return true;
			},
			isTimeVarying: extras.isTimeVarying || function () {
				return false;
			},
			areKeyframesSupported: extras.areKeyframesSupported || function () {
				return true;
			},
			properties: extras.properties,
			numProperties: extras.numProperties,
			property: extras.property
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
	setCalls = [];
	$._pickfxParameterResolver = mockResolver();

	clip = videoClip([
		{
			displayName: "Opacity",
			matchName: "AE.ADBE Opacity",
			properties: [numberParam("Opacity", 100)]
		},
		{
			displayName: "Motion",
			matchName: "AE.ADBE Motion",
			properties: [
				numberParam("Scale", 150),
				numberParam("Scale Width", 100),
				numberParam("Uniform Scale", true, {
					getValue: function () {
						return true;
					}
				}),
				numberParam("Rotation", 0)
			]
		}
	]);
	inspected = MotionScaleDiscover.discover(clip);
	assertEq("discover ok", inspected.ok, true);
	assertEq("discover operation", inspected.operation, "motion.scale.discover");
	assertEq("discover settersCalled", inspected.settersCalled, false);
	assertEq("discover usedQE", inspected.usedQE, false);
	assertEq("discover no setValue", setCalls.length, 0);
	assertEq("discover component", inspected.component.displayName, "Motion");
	assertEq("discover matchName", inspected.component.matchName, "AE.ADBE Motion");
	assertEq("discover scale value", inspected.comparison.scale.currentValue, 150);
	assertEq("discover scale type", inspected.comparison.scale.runtimeType, "number");
	assertEq("discover scale hasSetValue", inspected.comparison.scale.hasSetValue, true);
	assertEq("discover scale childCount", inspected.comparison.scale.childCount, 0);
	assertEq("discover uniform value", inspected.comparison.uniformScale.currentValue, true);
	assertEq("discover uniform type", inspected.comparison.uniformScale.runtimeType, "boolean");
	assertEq("discover no nested second param", inspected.answers.separateSecondScaleParameter, false);
	assertEq("discover second name null", inspected.answers.secondScaleDisplayName, null);
	assertEq("discover scale not array", inspected.answers.scaleValueIsTwoElementArray, false);
	assertEq("discover top-level count", inspected.comparison.topLevelDisplayNames.length, 4);
	assertEq("discover top-level 0", inspected.comparison.topLevelDisplayNames[0].parameterDisplayName, "Scale");
	encoded = JSON.stringify(inspected);
	assert("discover JSON serializable", typeof encoded === "string" && encoded.indexOf("motion.scale.discover") !== -1);
	assert("discover JSON settersCalled false", encoded.indexOf("\"settersCalled\":false") !== -1);
	assert("discover JSON usedQE false", encoded.indexOf("\"usedQE\":false") !== -1);
	clip = videoClip([
		{
			displayName: "Motion",
			matchName: "AE.ADBE Motion",
			properties: [
				numberParam("Scale", [150, 100]),
				numberParam("Uniform Scale", false, {
					getValue: function () {
						return false;
					}
				})
			]
		}
	]);
	inspected = MotionScaleDiscover.discover(clip);
	assertEq("array scale settersCalled", inspected.settersCalled, false);
	assertEq("array scale no setValue", setCalls.length, 0);
	assertEq("array scale two-element", inspected.answers.scaleValueIsTwoElementArray, true);
	assertEq("array scale runtimeType", inspected.comparison.scale.runtimeType, "point");
	assert("array scale value 0", inspected.comparison.scale.currentValue && inspected.comparison.scale.currentValue[0] === 150);
	assert("array scale value 1", inspected.comparison.scale.currentValue && inspected.comparison.scale.currentValue[1] === 100);
	assertEq("array no nested children", inspected.answers.separateSecondScaleParameter, false);
	assert("array representation mentions 2-element", inspected.answers.howSecondDimensionIsRepresented.indexOf("2-element") !== -1);

	setCalls = [];
	clip = videoClip([
		{
			displayName: "Motion",
			matchName: "AE.ADBE Motion",
			properties: [
				numberParam("Scale", 150, {
					properties: [
						numberParam("X", 150),
						numberParam("Y", 100)
					]
				}),
				numberParam("Uniform Scale", true, {
					getValue: function () {
						return true;
					}
				})
			]
		}
	]);
	inspected = MotionScaleDiscover.discover(clip);
	assertEq("nested ok", inspected.ok, true);
	assertEq("nested no setValue", setCalls.length, 0);
	assertEq("nested separate child", inspected.answers.separateSecondScaleParameter, true);
	assertEq("nested first child name", inspected.answers.secondScaleDisplayName, "X");
	assertEq("nested child count", inspected.comparison.scaleChildren.length, 2);
	assertEq("nested child 1 name", inspected.comparison.scaleChildren[1].parameterDisplayName, "Y");
	assertEq("nested child 1 value", inspected.comparison.scaleChildren[1].currentValue, 100);
	assertEq("nested child parent collection", inspected.comparison.scaleChildren[0].parent.collectionName, "properties");
	assertEq("nested is child/group", inspected.answers.secondScaleIsChildOrGroup, true);
	assertEq("nested child hasSetValue", inspected.comparison.scaleChildren[1].hasSetValue, true);

	setCalls = [];
	clip = videoClip([
		{
			displayName: "Motion",
			matchName: "AE.ADBE Motion",
			properties: [
				numberParam("Scale", 150, {
					numProperties: 2,
					property: function (index) {
						if (index === 1) {
							return numberParam("Width", 150);
						}
						if (index === 2) {
							return numberParam("Height", 80);
						}
						return undefined;
					}
				})
			]
		}
	]);
	inspected = MotionScaleDiscover.discover(clip);
	assertEq("property() no setValue", setCalls.length, 0);
	assertEq("property() children", inspected.comparison.scaleChildren.length, 2);
	assertEq("property() second live name", inspected.comparison.scaleChildren[1].parameterDisplayName, "Height");
	assertEq("property() second value", inspected.comparison.scaleChildren[1].currentValue, 80);
	assertEq("property() parent collection", inspected.comparison.scaleChildren[1].parent.collectionName, "numProperties/property()");

	inspected = MotionScaleDiscover.discover(videoClip([{
		displayName: "Opacity",
		matchName: "AE.ADBE Opacity",
		properties: []
	}]));
	assertEq("missing motion", inspected.reason, "PARAMETER_NOT_FOUND");
	assertEq("missing motion no setters", inspected.settersCalled, false);
	assertEq("missing motion usedQE", inspected.usedQE, false);

	answers = MotionScaleDiscover.buildAnswers([], null, null);
	assertEq("answers scale missing", answers.scaleFound, false);
	encoded = JSON.stringify(answers);
	assert("answers JSON", typeof encoded === "string");
}());
