(function () {
	var origResolver;
	var payload;
	var clip;
	var first;
	var second;
	var third;
	var written;
	var session;
	var confirmed;
	var cancelled;
	var replacement;
	var basicSat;
	var creativeSat;
	var booleanSat;

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
		var innerSet;
		extras = extras || {};
		innerSet = extras.setValue || function (next, updateUI) {
			if (updateUI !== true) {
				return false;
			}
			value = next;
			return true;
		};
		return {
			displayName: name,
			matchName: extras.matchName !== undefined ? extras.matchName : "",
			setCalls: [],
			getValue: extras.getValue || function () {
				return value;
			},
			setValue: function (next, updateUI) {
				this.setCalls.push({
					value: next,
					updateUI: updateUI,
					argc: arguments.length
				});
				return innerSet.call(this, next, updateUI);
			},
			isTimeVarying: extras.isTimeVarying || function () {
				return false;
			}
		};
	}

	function boolParam(name, initial) {
		var value = initial === undefined ? false : initial;
		return {
			displayName: name,
			matchName: "",
			setCalls: [],
			getValue: function () {
				return value;
			},
			setValue: function () {
				this.setCalls.push({ argc: arguments.length });
				return true;
			},
			isTimeVarying: function () {
				return false;
			}
		};
	}

	function placeholderParam(name) {
		return boolParam(name, false);
	}

	function liveLumetriProperties(named) {
		var props = [];
		var i;
		named = named || {};
		for (i = 0; i <= 108; i++) {
			props[i] = placeholderParam(" ");
		}
		props[2] = boolParam("Basic Correction", true);
		props[13] = placeholderParam("White Balance");
		props[14] = named.basicTemp;
		props[15] = placeholderParam("Tint");
		props[16] = named.basicSat;
		props[18] = placeholderParam("Light");
		props[19] = placeholderParam("Exposure");
		props[30] = boolParam("Creative", true);
		props[42] = placeholderParam("Vibrance");
		props[43] = named.creativeSat;
		props[81] = boolParam("HSL Secondary", true);
		props[98] = placeholderParam("Correction");
		props[99] = placeholderParam("");
		props[100] = placeholderParam("");
		props[101] = named.hslTemp;
		props[102] = placeholderParam("Tint");
		props[103] = placeholderParam("Contrast");
		props[104] = placeholderParam("Sharpen");
		props[105] = named.hslSat;
		props[106] = named.booleanSat;
		props[108] = boolParam("Vignette", true);
		return props;
	}

	function choiceVisible(choice) {
		return String((choice && choice.title) || "") + "\n" + String((choice && choice.subtitle) || "");
	}

	function assertHumanChoice(label, choice, title, subtitle, leakedIndexes) {
		var visible;
		var i;
		assertEq(label + " title", choice && choice.title, title);
		assertEq(label + " subtitle", choice && choice.subtitle, subtitle);
		visible = choiceVisible(choice);
		assert(label + " hides parameterIndex", visible.indexOf("parameterIndex") === -1);
		assert(label + " hides ComponentParam", visible.indexOf("ComponentParam") === -1);
		assert(label + " hides matchName", visible.indexOf("matchName") === -1);
		assert(label + " hides boolean", visible.toLowerCase().indexOf("boolean") === -1);
		for (i = 0; i < (leakedIndexes ? leakedIndexes.length : 0); i++) {
			assert(label + " hides index " + leakedIndexes[i], visible.indexOf(String(leakedIndexes[i])) === -1);
		}
	}

	function lumetriComponent(properties) {
		return {
			displayName: "Lumetri Color",
			matchName: "AE.ADBE Lumetri",
			properties: properties
		};
	}

	function videoClip(components) {
		return {
			name: "Clip A",
			mediaType: "Video",
			components: components
		};
	}

	function writeClip(trackItem, parameterName, input) {
		return ConfirmedParameterWrites.write(trackItem, parameterName, input);
	}

	if (typeof $ === "undefined") {
		$ = {};
	}
	origResolver = $._pickfxParameterResolver;
	$._pickfxParameterResolver = mockResolver();

	assertEq("picker module loaded", typeof LumetriPicker.plan, "function");
	assertEq("picker does not persist identity", LumetriPicker.CHOOSE_LUMETRI, "choose-lumetri");

	clip = videoClip([{
		displayName: "Motion",
		matchName: "AE.ADBE Motion",
		properties: [numberParam("Scale", 100)]
	}]);
	written = writeClip(clip, "Temperature", { numbers: [11], value: 11 });
	assertEq("0 lumetri ok", written.ok, false);
	assertEq("0 lumetri uiKind", written.uiKind, "no-lumetri");
	assertEq("0 lumetri setters", written.settersCalled, false);
	assertEq("0 lumetri usedQE", written.usedQE, false);
	assertEq("0 lumetri motion unchanged", clip.components[0].properties[0].getValue(), 100);

	first = numberParam("Temperature", 0);
	clip = videoClip([lumetriComponent([first, numberParam("Saturation", 100)])]);
	written = writeClip(clip, "Temperature", { numbers: [11], value: 11 });
	assertEq("1 lumetri ok", written.ok, true);
	assertEq("1 lumetri verified", written.verified, true);
	assertEq("1 lumetri settersCalled", written.settersCalled, true);
	assertEq("1 lumetri live", first.getValue(), 11);
	assertEq("1 lumetri no picker", written.uiKind, undefined);
	assertEq("1 lumetri usedQE", written.usedQE, false);

	first = numberParam("Temperature", 0);
	second = numberParam("Temperature", 4);
	clip = videoClip([
		lumetriComponent([first, numberParam("Saturation", 100)]),
		lumetriComponent([second, numberParam("Saturation", 90)])
	]);
	written = writeClip(clip, "Temperature", { numbers: [11], value: 11 });
	assertEq("2 lumetri ok", written.ok, false);
	assertEq("2 lumetri uiKind", written.uiKind, "choose-lumetri");
	assertEq("2 lumetri choices", written.choices && written.choices.length, 2);
	assertEq("2 lumetri first index", written.choices[0].componentIndex, 0);
	assertEq("2 lumetri second index", written.choices[1].componentIndex, 1);
	assertEq("2 lumetri first title", written.choices[0].title, "Lumetri Color");
	assertEq("2 lumetri first subtitle", written.choices[0].subtitle, "Temperature 0 · Saturation 100");
	assertEq("2 lumetri second subtitle", written.choices[1].subtitle, "Temperature 4 · Saturation 90");
	assertEq("2 lumetri settersCalled", written.settersCalled, false);
	assertEq("2 lumetri first live", first.getValue(), 0);
	assertEq("2 lumetri second live", second.getValue(), 4);
	assertEq("2 lumetri usedQE", written.usedQE, false);
	assert("2 lumetri no first/last guess", first.getValue() !== 11 && second.getValue() !== 11);

	first = numberParam("Temperature", 0);
	second = numberParam("Temperature", 11);
	third = numberParam("Temperature", 22);
	clip = videoClip([
		lumetriComponent([first, numberParam("Saturation", 100)]),
		lumetriComponent([second, numberParam("Saturation", 90)]),
		{ displayName: "Opacity", matchName: "AE.ADBE Opacity", properties: [numberParam("Opacity", 100)] },
		lumetriComponent([third, numberParam("Saturation", 60)])
	]);
	written = writeClip(clip, "Temperature", { numbers: [40], value: 40 });
	assertEq("3 lumetri ok", written.ok, false);
	assertEq("3 lumetri uiKind", written.uiKind, "choose-lumetri");
	assertEq("3 lumetri choices", written.choices && written.choices.length, 3);
	assertEq("3 lumetri indexes 0", written.choices[0].componentIndex, 0);
	assertEq("3 lumetri indexes 1", written.choices[1].componentIndex, 1);
	assertEq("3 lumetri indexes 3", written.choices[2].componentIndex, 3);
	assertEq("3 lumetri third subtitle", written.choices[2].subtitle, "Temperature 22 · Saturation 60");
	assertEq("3 lumetri settersCalled", written.settersCalled, false);
	assertEq("3 lumetri first live", first.getValue(), 0);
	assertEq("3 lumetri second live", second.getValue(), 11);
	assertEq("3 lumetri third live", third.getValue(), 22);

	written = writeClip(clip, "Temperature", {
		numbers: [40],
		value: 40,
		lumetriComponentIndex: 3
	});
	assertEq("selected index write ok", written.ok, true);
	assertEq("selected index verified", written.verified, true);
	assertEq("selected index reResolved", written.reResolved, true);
	assertEq("selected index third live", third.getValue(), 40);
	assertEq("selected index first unchanged", first.getValue(), 0);
	assertEq("selected index second unchanged", second.getValue(), 11);
	assertEq("selected index first setters", first.setCalls.length, 0);
	assertEq("selected index second setters", second.setCalls.length, 0);
	assertEq("selected index third setters", third.setCalls.length, 1);

	replacement = numberParam("Temperature", 22);
	clip.components[3] = lumetriComponent([replacement, numberParam("Saturation", 60)]);
	written = writeClip(clip, "Temperature", {
		numbers: [50],
		value: 50,
		lumetriComponentIndex: 3
	});
	assertEq("re-resolve write ok", written.ok, true);
	assertEq("re-resolve wrote replacement", replacement.getValue(), 50);
	assertEq("re-resolve old object unchanged", third.getValue(), 40);
	assertEq("re-resolve old object no extra setter", third.setCalls.length, 1);

	clip.components[3] = {
		displayName: "Motion",
		matchName: "AE.ADBE Motion",
		properties: [numberParam("Scale", 100)]
	};
	written = writeClip(clip, "Temperature", {
		numbers: [70],
		value: 70,
		lumetriComponentIndex: 3
	});
	assertEq("stale index ok", written.ok, false);
	assertEq("stale index uiKind", written.uiKind, "stale-lumetri");
	assertEq("stale index settersCalled", written.settersCalled, false);
	assertEq("stale index no fallback first", first.getValue(), 0);
	assertEq("stale index no fallback second", second.getValue(), 11);
	assertEq("stale index no silent write", first.setCalls.length + second.setCalls.length, 0);

	session = LumetriPicker.createSession({
		uiKind: "choose-lumetri",
		choices: LumetriPicker.formatInstanceChoices(LumetriPicker.listInstances(videoClip([
			lumetriComponent([numberParam("Temperature", 0), numberParam("Saturation", 100)]),
			lumetriComponent([numberParam("Temperature", 4), numberParam("Saturation", 90)])
		])))
	}, {
		isClipParameter: true,
		parameterQuery: "Temperature",
		value: 11,
		numbers: [11]
	});
	assertEq("session starts at 0", session.selectedIndex(), 0);
	session.move(1);
	assertEq("session down selects 1", session.selectedIndex(), 1);
	session.move(-1);
	assertEq("session up wraps to 0", session.selectedIndex(), 0);
	session.move(1);
	confirmed = session.confirm();
	assertEq("enter not cancelled", confirmed.cancelled, false);
	assertEq("enter targets selected index", confirmed.clipCmd.lumetriComponentIndex, 1);
	assertEq("enter does not write", confirmed.settersCalled, false);

	session = LumetriPicker.createSession({
		uiKind: "choose-lumetri",
		choices: [{ kind: "lumetri-instance", title: "Lumetri Color", componentIndex: 2 }]
	}, { parameterQuery: "Temperature", value: 11, numbers: [11] });
	cancelled = session.cancel();
	assertEq("escape cancelled", cancelled.cancelled, true);
	assertEq("escape no setter", cancelled.settersCalled, false);
	assertEq("escape session inactive", session.isActive(), false);

	first = numberParam("Saturation", 100);
	clip = videoClip([lumetriComponent([numberParam("Temperature", 0), first])]);
	written = writeClip(clip, "Saturation", { numbers: [40], value: 40 });
	assertEq("unique saturation ok", written.ok, true);
	assertEq("unique saturation verified", written.verified, true);
	assertEq("unique saturation live", first.getValue(), 40);
	assertEq("unique saturation no picker", written.uiKind, undefined);

	basicSat = numberParam("Saturation", 100);
	creativeSat = numberParam("Saturation", 80);
	booleanSat = boolParam("Saturation", false);
	clip = videoClip([lumetriComponent([
		boolParam("Basic Correction", true),
		basicSat,
		boolParam("Creative", true),
		creativeSat,
		booleanSat
	])]);
	written = writeClip(clip, "Saturation", { numbers: [40], value: 40 });
	assertEq("ambiguous saturation ok", written.ok, false);
	assertEq("ambiguous saturation uiKind", written.uiKind, "choose-parameter");
	assertEq("ambiguous saturation choices", written.choices && written.choices.length, 2);
	assertHumanChoice("ambiguous saturation first", written.choices[0], "Basic Correction", "Saturation · 100", []);
	assertHumanChoice("ambiguous saturation second", written.choices[1], "Creative", "Saturation · 80", []);
	assertEq("ambiguous saturation setters", written.settersCalled, false);
	assertEq("ambiguous saturation basic live", basicSat.getValue(), 100);
	assertEq("ambiguous saturation creative live", creativeSat.getValue(), 80);
	assertEq("ambiguous saturation boolean setters", booleanSat.setCalls.length, 0);

	session = LumetriPicker.createSession(written, {
		isClipParameter: true,
		parameterQuery: "Saturation",
		value: 40,
		numbers: [40],
		lumetriComponentIndex: 0
	});
	assertEq("param session section", session.sectionTitle, "CHOOSE PARAMETER");
	confirmed = session.confirm();
	assertEq("param session index", confirmed.clipCmd.lumetriParameterIndex, 1);
	assertEq("param session keeps component", confirmed.clipCmd.lumetriComponentIndex, 0);
	assertEq("param session no hierarchy identity", confirmed.clipCmd.lumetriHierarchyPath, undefined);

	written = writeClip(clip, "Saturation", {
		numbers: [40],
		value: 40,
		lumetriComponentIndex: 0,
		lumetriParameterIndex: confirmed.clipCmd.lumetriParameterIndex
	});
	assertEq("chosen saturation ok", written.ok, true);
	assertEq("chosen saturation verified", written.verified, true);
	assertEq("chosen saturation basic live", basicSat.getValue(), 40);
	assertEq("chosen saturation creative unchanged", creativeSat.getValue(), 80);
	assertEq("chosen saturation creative setters", creativeSat.setCalls.length, 0);
	assertEq("chosen saturation setValue true", basicSat.setCalls[0] && basicSat.setCalls[0].updateUI, true);

	first = numberParam("Tint", 0, {
		setValue: function (next, updateUI) {
			if (updateUI !== true) {
				return false;
			}
			return true;
		}
	});
	clip = videoClip([lumetriComponent([first])]);
	written = writeClip(clip, "Tint", { numbers: [8], value: 8 });
	assertEq("failed write ok", written.ok, false);
	assertEq("failed write reason", written.reason, "VALUE_NOT_VERIFIED");
	assertEq("failed write settersCalled", written.settersCalled, true);
	assertEq("failed write live", first.getValue(), 0);
	assertEq("failed write no fallback uiKind", written.uiKind, undefined);

	payload = LumetriPicker.plan(videoClip([
		lumetriComponent([numberParam("Temperature", 0)]),
		lumetriComponent([numberParam("Temperature", 4)])
	]), { parameterDisplayName: "Temperature" }, {});
	assertEq("plan two instances kind", payload.uiKind, "choose-lumetri");
	assertEq("plan two instances no write object", payload.ok, false);

	(function liveFlatParameterPicker() {
		var basicTemp = numberParam("Temperature", 0);
		var hslTemp = numberParam("Temperature", 0);
		var basicSatLive = numberParam("Saturation", 100);
		var creativeSatLive = numberParam("Saturation", 100);
		var hslSatLive = numberParam("Saturation", 100);
		var booleanSatLive = boolParam("Saturation", false);
		var liveClip;
		var listed;
		var staleTint;
		var otherTemp;
		var otherSat;
		var liveWritten;
		var paramSession;
		var pick;
		var cancelledPick;
		var i;
		var leaked;

		liveClip = videoClip([lumetriComponent(liveLumetriProperties({
			basicTemp: basicTemp,
			hslTemp: hslTemp,
			basicSat: basicSatLive,
			creativeSat: creativeSatLive,
			hslSat: hslSatLive,
			booleanSat: booleanSatLive
		}))]);

		listed = LumetriPicker.listNumericParams(liveClip.components[0], "Temperature");
		assertEq("live temp candidate count", listed.length, 2);
		assertEq("live temp first index", listed[0].parameterIndex, 14);
		assertEq("live temp second index", listed[1].parameterIndex, 101);
		assertEq("live temp first section", listed[0].section, "Basic Correction");
		assertEq("live temp second section", listed[1].section, "HSL Secondary");
		assert("live temp skips Correction header", listed[1].section !== "Correction");

		liveWritten = writeClip(liveClip, "Temperature", { numbers: [30], value: 30 });
		assertEq("live temp picker ok", liveWritten.ok, false);
		assertEq("live temp picker uiKind", liveWritten.uiKind, "choose-parameter");
		assertEq("live temp picker choices", liveWritten.choices && liveWritten.choices.length, 2);
		assertEq("live temp picker setters", liveWritten.settersCalled, false);
		assertEq("live temp picker usedQE", liveWritten.usedQE, false);
		assertEq("live temp picker basic live", basicTemp.getValue(), 0);
		assertEq("live temp picker hsl live", hslTemp.getValue(), 0);
		assertEq("live temp picker basic setters", basicTemp.setCalls.length, 0);
		assertEq("live temp picker hsl setters", hslTemp.setCalls.length, 0);
		assertHumanChoice("live temp basic", liveWritten.choices[0], "Basic Correction", "Temperature · 0", [14, 101, 16, 43, 105]);
		assertHumanChoice("live temp hsl", liveWritten.choices[1], "HSL Secondary", "Temperature · 0", [14, 101, 16, 43, 105]);

		listed = LumetriPicker.listNumericParams(liveClip.components[0], "Saturation");
		assertEq("live sat candidate count", listed.length, 3);
		assertEq("live sat indexes", listed[0].parameterIndex + "," + listed[1].parameterIndex + "," + listed[2].parameterIndex, "16,43,105");
		assertEq("live sat sections", listed[0].section + "," + listed[1].section + "," + listed[2].section, "Basic Correction,Creative,HSL Secondary");

		liveWritten = writeClip(liveClip, "Saturation", { numbers: [40], value: 40 });
		assertEq("live sat picker ok", liveWritten.ok, false);
		assertEq("live sat picker uiKind", liveWritten.uiKind, "choose-parameter");
		assertEq("live sat picker choices", liveWritten.choices && liveWritten.choices.length, 3);
		assertEq("live sat picker setters", liveWritten.settersCalled, false);
		assertEq("live sat picker boolean setters", booleanSatLive.setCalls.length, 0);
		assertEq("live sat picker basic live", basicSatLive.getValue(), 100);
		assertEq("live sat picker creative live", creativeSatLive.getValue(), 100);
		assertEq("live sat picker hsl live", hslSatLive.getValue(), 100);
		assertHumanChoice("live sat basic", liveWritten.choices[0], "Basic Correction", "Saturation · 100", [16, 43, 105, 106, 14, 101]);
		assertHumanChoice("live sat creative", liveWritten.choices[1], "Creative", "Saturation · 100", [16, 43, 105, 106, 14, 101]);
		assertHumanChoice("live sat hsl", liveWritten.choices[2], "HSL Secondary", "Saturation · 100", [16, 43, 105, 106, 14, 101]);
		for (i = 0; i < liveWritten.choices.length; i++) {
			assert("live sat choice " + i + " not boolean title", String(liveWritten.choices[i].title).indexOf("boolean") === -1);
			assert("live sat choice " + i + " numeric subtitle", liveWritten.choices[i].subtitle.indexOf("Saturation · ") === 0);
		}

		leaked = choiceVisible(liveWritten.choices[0]) + choiceVisible(liveWritten.choices[1]) + choiceVisible(liveWritten.choices[2]);
		assert("live sat ui hides 106", leaked.indexOf("106") === -1);

		paramSession = LumetriPicker.createSession(liveWritten, {
			isClipParameter: true,
			parameterQuery: "Saturation",
			value: 40,
			numbers: [40]
		});
		cancelledPick = paramSession.cancel();
		assertEq("escape cancelled", cancelledPick.cancelled, true);
		assertEq("escape zero setters", cancelledPick.settersCalled, false);
		assertEq("escape basic sat setters", basicSatLive.setCalls.length, 0);
		assertEq("escape creative sat setters", creativeSatLive.setCalls.length, 0);
		assertEq("escape hsl sat setters", hslSatLive.setCalls.length, 0);
		assertEq("escape boolean sat setters", booleanSatLive.setCalls.length, 0);

		liveWritten = writeClip(liveClip, "Temperature", {
			numbers: [30],
			value: 30,
			lumetriComponentIndex: 0,
			lumetriParameterIndex: 14
		});
		assertEq("selected temp write ok", liveWritten.ok, true);
		assertEq("selected temp write verified", liveWritten.verified, true);
		assertEq("selected temp write reResolved", liveWritten.reResolved, true);
		assertEq("selected temp write usedQE", liveWritten.usedQE, false);
		assertEq("selected temp write method", liveWritten.method, "ComponentParam.setValue(value, true)");
		assertEq("selected temp basic live", basicTemp.getValue(), 30);
		assertEq("selected temp hsl unchanged", hslTemp.getValue(), 0);
		assertEq("selected temp basic setters", basicTemp.setCalls.length, 1);
		assertEq("selected temp hsl setters", hslTemp.setCalls.length, 0);
		assertEq("selected temp setValue true", basicTemp.setCalls[0].updateUI, true);
		assertEq("selected temp setValue requested", basicTemp.setCalls[0].value, 30);

		liveWritten = writeClip(liveClip, "Saturation", {
			numbers: [40],
			value: 40,
			lumetriComponentIndex: 0,
			lumetriParameterIndex: 43
		});
		assertEq("selected sat write ok", liveWritten.ok, true);
		assertEq("selected sat write verified", liveWritten.verified, true);
		assertEq("selected sat write reResolved", liveWritten.reResolved, true);
		assertEq("selected sat write usedQE", liveWritten.usedQE, false);
		assertEq("selected sat creative live", creativeSatLive.getValue(), 40);
		assertEq("selected sat basic unchanged", basicSatLive.getValue(), 100);
		assertEq("selected sat hsl unchanged", hslSatLive.getValue(), 100);
		assertEq("selected sat boolean setters", booleanSatLive.setCalls.length, 0);
		assertEq("selected sat creative setters", creativeSatLive.setCalls.length, 1);
		assertEq("selected sat basic setters", basicSatLive.setCalls.length, 0);
		assertEq("selected sat hsl setters", hslSatLive.setCalls.length, 0);
		assertEq("selected sat setValue true", creativeSatLive.setCalls[0].updateUI, true);
		assertEq("selected sat setValue requested", creativeSatLive.setCalls[0].value, 40);

		staleTint = numberParam("Tint", 3);
		liveClip.components[0].properties[14] = staleTint;
		otherTemp = hslTemp.getValue();
		liveWritten = writeClip(liveClip, "Temperature", {
			numbers: [50],
			value: 50,
			lumetriComponentIndex: 0,
			lumetriParameterIndex: 14
		});
		assertEq("stale param ok", liveWritten.ok, false);
		assertEq("stale param uiKind", liveWritten.uiKind, "stale-parameter");
		assertEq("stale param settersCalled", liveWritten.settersCalled, false);
		assertEq("stale param no write tint", staleTint.getValue(), 3);
		assertEq("stale param no fallback hsl", hslTemp.getValue(), otherTemp);
		assertEq("stale param hsl setters", hslTemp.setCalls.length, 0);
		assertEq("stale param tint setters", staleTint.setCalls.length, 0);

		liveClip.components[0].properties[14] = basicTemp;
		otherSat = creativeSatLive.getValue();
		liveClip.components[0].properties[43] = boolParam("Saturation", false);
		liveWritten = writeClip(liveClip, "Saturation", {
			numbers: [70],
			value: 70,
			lumetriComponentIndex: 0,
			lumetriParameterIndex: 43
		});
		assertEq("stale sat type ok", liveWritten.ok, false);
		assertEq("stale sat type uiKind", liveWritten.uiKind, "stale-parameter");
		assertEq("stale sat type settersCalled", liveWritten.settersCalled, false);
		assertEq("stale sat type no fallback basic", basicSatLive.getValue(), 100);
		assertEq("stale sat type no fallback hsl", hslSatLive.getValue(), 100);
		assertEq("stale sat type no fallback previous", otherSat, 40);
		assertEq("stale sat type basic setters", basicSatLive.setCalls.length, 0);
		assertEq("stale sat type hsl setters", hslSatLive.setCalls.length, 0);

		liveWritten = writeClip(liveClip, "Saturation", {
			numbers: [12],
			value: 12,
			lumetriComponentIndex: 0,
			lumetriParameterIndex: 106
		});
		assertEq("boolean sat index rejected", liveWritten.ok, false);
		assertEq("boolean sat index uiKind", liveWritten.uiKind, "stale-parameter");
		assertEq("boolean sat index setters", booleanSatLive.setCalls.length, 0);
		assertEq("boolean sat index no numeric write", basicSatLive.setCalls.length + hslSatLive.setCalls.length, 0);

		otherTemp = numberParam("Temperature", 4);
		liveClip = videoClip([
			lumetriComponent(liveLumetriProperties({
				basicTemp: numberParam("Temperature", 0),
				hslTemp: numberParam("Temperature", 0),
				basicSat: numberParam("Saturation", 100),
				creativeSat: numberParam("Saturation", 100),
				hslSat: numberParam("Saturation", 100),
				booleanSat: boolParam("Saturation", false)
			})),
			lumetriComponent([otherTemp, numberParam("Saturation", 90)])
		]);
		liveWritten = writeClip(liveClip, "Temperature", { numbers: [11], value: 11 });
		assertEq("multi then param instance picker", liveWritten.uiKind, "choose-lumetri");
		assertEq("multi then param instance setters", liveWritten.settersCalled, false);
		liveWritten = writeClip(liveClip, "Temperature", {
			numbers: [11],
			value: 11,
			lumetriComponentIndex: 0
		});
		assertEq("multi then param parameter picker", liveWritten.uiKind, "choose-parameter");
		assertEq("multi then param parameter choices", liveWritten.choices && liveWritten.choices.length, 2);
		assertHumanChoice("multi then param basic", liveWritten.choices[0], "Basic Correction", "Temperature · 0", [14, 101]);
		assertEq("multi then param no write first", liveClip.components[0].properties[14].getValue(), 0);
		assertEq("multi then param no write second", otherTemp.getValue(), 4);
		assertEq("multi then param setters", liveWritten.settersCalled, false);

		paramSession = LumetriPicker.createSession(liveWritten, {
			isClipParameter: true,
			parameterQuery: "Temperature",
			value: 11,
			numbers: [11],
			lumetriComponentIndex: 0
		});
		paramSession.move(1);
		pick = paramSession.confirm();
		assertEq("multi then param selected index", pick.clipCmd.lumetriParameterIndex, 101);
		assertEq("multi then param keeps component", pick.clipCmd.lumetriComponentIndex, 0);
		assertEq("multi then param confirm no write", pick.settersCalled, false);
	}());

	$._pickfxParameterResolver = origResolver;
}());
