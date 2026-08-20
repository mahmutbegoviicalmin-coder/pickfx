(function () {
	var storedScale;
	var storedWidth;
	var storedUniform;
	var setCalls;
	var clip;
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
			}
		};
	}

	function numberParam(name, getter, setter) {
		return {
			displayName: name,
			matchName: "",
			getValue: getter,
			setValue: function (next, updateUI) {
				setCalls.push(name + ":" + String(next) + ":" + String(updateUI));
				if (updateUI !== true) {
					return false;
				}
				return setter(next);
			},
			isTimeVarying: function () {
				return false;
			}
		};
	}

	function makeClip(extras) {
		extras = extras || {};
		return {
			name: "Clip A",
			mediaType: "Video",
			components: [
				{
					displayName: "Motion",
					matchName: "AE.ADBE Motion",
					properties: [
						numberParam("Scale", function () {
							return storedScale;
						}, function (next) {
							storedScale = next;
							return true;
						}),
						numberParam("Scale Width", function () {
							return storedWidth;
						}, function (next) {
							storedWidth = next;
							return true;
						}),
						{
							displayName: "Uniform Scale",
							matchName: "",
							getValue: function () {
								return storedUniform;
							},
							setValue: function (next, updateUI) {
								setCalls.push("Uniform Scale:" + String(next) + ":" + String(updateUI));
								if (updateUI !== true) {
									return false;
								}
								storedUniform = next;
								return true;
							},
							isTimeVarying: extras.uniformTimeVarying || function () {
								return false;
							}
						}
					]
				}
			]
		};
	}

	if (typeof $ === "undefined") {
		$ = {};
	}
	$._pickfxParameterResolver = mockResolver();

	assertEq("safe 80 stays 80", MotionScaleSemanticsTest.safeNumber(100, 80), 80);
	assertEq("safe 80 when current 80", MotionScaleSemanticsTest.safeNumber(80, 80), 79);

	storedScale = 150;
	storedWidth = 100;
	storedUniform = true;
	setCalls = [];
	clip = makeClip();
	result = MotionScaleSemanticsTest.run(clip);
	assertEq("semantics ok", result.ok, true);
	assertEq("semantics operation", result.operation, "motion.scale.semantics.test");
	assertEq("semantics usedQE", result.usedQE, false);
	assertEq("semantics productionEnabled", result.productionEnabled, false);
	assertEq("semantics original scale", result.originals.scale, 150);
	assertEq("semantics original width", result.originals.scaleWidth, 100);
	assertEq("semantics original uniform", result.originals.uniformScale, true);
	assertEq("semantics unlink verified", result.steps[0].write.verified, true);
	assertEq("semantics unlink after", result.steps[0].readBack.uniformScale, false);
	assertEq("semantics width requested", result.steps[1].write.requested, 80);
	assertEq("semantics width verified", result.steps[1].write.verified, true);
	assertEq("semantics width after", result.steps[1].readBack.scaleWidth, 80);
	assertEq("semantics scale requested", result.steps[2].write.requested, 120);
	assertEq("semantics scale verified", result.steps[2].write.verified, true);
	assertEq("semantics scale after", result.steps[2].readBack.scale, 120);
	assertEq("semantics width independent", result.steps[2].readBack.scaleWidth, 80);
	assertEq("semantics restore scale", result.verifiedRestore.scale, true);
	assertEq("semantics restore width", result.verifiedRestore.scaleWidth, true);
	assertEq("semantics restore uniform", result.verifiedRestore.uniformScale, true);
	assertEq("semantics live scale restored", storedScale, 150);
	assertEq("semantics live width restored", storedWidth, 100);
	assertEq("semantics live uniform restored", storedUniform, true);
	assert("semantics used setValue true", setCalls.length > 0 && setCalls.join(" ").indexOf(":true") !== -1);
	assertEq("semantics JSON", JSON.stringify(result).indexOf("motion.scale.semantics.test") !== -1, true);

	storedScale = 120;
	storedWidth = 80;
	storedUniform = false;
	setCalls = [];
	result = MotionScaleSemanticsTest.run(makeClip());
	assertEq("semantics avoids same test width", result.testValues.scaleWidth, 79);
	assertEq("semantics avoids same test scale", result.testValues.scale, 119);
	assertEq("semantics alt ok", result.ok, true);
	assertEq("semantics alt restored scale", storedScale, 120);
	assertEq("semantics alt restored width", storedWidth, 80);

	result = MotionScaleSemanticsTest.run({
		name: "Clip A",
		mediaType: "Video",
		components: [{
			displayName: "Motion",
			matchName: "AE.ADBE Motion",
			properties: [
				numberParam("Scale", function () { return 100; }, function () { return true; })
			]
		}]
	});
	assertEq("missing width", result.reason, "PARAMETER_NOT_FOUND");
	assertEq("missing width no setter", result.settersCalled, false);

	storedScale = 150;
	storedWidth = 100;
	storedUniform = true;
	setCalls = [];
	clip = makeClip({
		uniformTimeVarying: function () {
			return true;
		}
	});
	result = MotionScaleSemanticsTest.run(clip);
	assertEq("time varying reason", result.reason, "PARAMETER_TIME_VARYING_UNSUPPORTED");
	assertEq("time varying no write", setCalls.length, 0);
	assertEq("time varying live scale", storedScale, 150);
}());
