(function () {
	var EFFECTS = [
		{ name: "Gaussian Blur", premiereName: "Gaussian Blur" },
		{ name: "Lumetri Color", premiereName: "Lumetri Color" },
		{ name: "Crop", premiereName: "Crop" },
		{ name: "Tint", premiereName: "Tint" },
		{ name: "Exposure", premiereName: "Exposure" },
		{ name: "Opacity", premiereName: "Opacity" }
	];
	var ALIASES = {
		gaussian: ["Gaussian Blur"],
		lumetri: ["Lumetri Color"]
	};
	var WRITE_METHOD = "ComponentParam.setValue(value, true)";
	var rows;
	var i;
	var row;
	var query;
	var parsed;
	var clipCmd;
	var preview;
	var names;
	var written;
	var origClipSet;
	var origUniversalSet;
	var origColorResolve;
	var clipHits;
	var universalHits;
	var lumetriHits;
	var input;
	var expectedWriter;
	var canWrite;
	var picked;
	var speed;

	function sampleQuery(entry) {
		if (entry.type === "boolean") {
			return entry.parameterDisplayName + " true";
		}
		if (entry.type === "point") {
			return entry.parameterDisplayName + " 0.5 0.5";
		}
		return entry.parameterDisplayName + " 10";
	}

	function sampleInput(entry) {
		if (entry.type === "boolean") {
			return { booleanValue: true, value: true, numbers: [] };
		}
		if (entry.type === "point") {
			return { numbers: [0.5, 0.5], value: [0.5, 0.5] };
		}
		return { numbers: [10], value: 10 };
	}

	function writerFor(entry) {
		if (entry.componentDisplayName === "Motion") {
			return "ClipParameterWriter";
		}
		if (entry.componentDisplayName === "Lumetri Color") {
			return "writeLumetri";
		}
		return "UniversalParameterWriter";
	}

	rows = ConfirmedParameterWrites.all();
	assertEq("production seed count", rows.length, 26);

	names = {};
	for (i = 0; i < rows.length; i++) {
		row = rows[i];
		assertEq(row.parameterDisplayName + " productionEnabled", row.productionEnabled, true);
		assertEq(row.parameterDisplayName + " write method", row.method, WRITE_METHOD);
		assertEq(row.parameterDisplayName + " verification", row.verificationMethod, "getValue read-back epsilon 0.0001");
		assert("unique displayName " + row.parameterDisplayName, !names.hasOwnProperty(row.parameterDisplayName));
		names[row.parameterDisplayName] = true;
		assertEq(
			row.parameterDisplayName + " unique lookup",
			ConfirmedParameterWrites.lookupByParameter(row.parameterDisplayName).parameterDisplayName,
			row.parameterDisplayName
		);
		assertEq(
			row.parameterDisplayName + " isProductionEnabled",
			ConfirmedParameterWrites.isProductionEnabled(row.parameterDisplayName),
			true
		);
	}

	assertEq("Motion Scale lookup", ConfirmedParameterWrites.lookup("Motion", "Scale").type, "number");
	assertEq("Motion Uniform Scale type", ConfirmedParameterWrites.lookup("Motion", "Uniform Scale").type, "boolean");
	assertEq("Motion Position type", ConfirmedParameterWrites.lookup("Motion", "Position").type, "point");
	assertEq("Opacity matchName", ConfirmedParameterWrites.lookup("Opacity", "Opacity").componentMatchName, "AE.ADBE Opacity");
	assertEq("Crop matchName", ConfirmedParameterWrites.lookup("Crop", "Left").componentMatchName, "AE.ADBE AECrop");
	assertEq("Lumetri matchName", ConfirmedParameterWrites.lookup("Lumetri Color", "Temperature").componentMatchName, "AE.ADBE Lumetri");
	assertEq("Lumetri Saturation enabled", ConfirmedParameterWrites.isProductionEnabled("Saturation"), true);

	for (i = 0; i < rows.length; i++) {
		row = rows[i];
		query = sampleQuery(row);
		parsed = CommandParser.parse(query, EFFECTS, ALIASES);
		if (row.type === "number") {
			assertEq(query + " parse isCommand", parsed.isCommand, true);
			assertEq(query + " parse skips effect", parsed.effect, null);
		} else {
			assertEq(query + " parse is not effect numeric", parsed.effect, null);
		}
		clipCmd = CommandParser.parseClipParameter(query, EFFECTS, ALIASES);
		assertEq(query + " clip path", clipCmd.isClipParameter, true);
		assertEq(query + " clip name", clipCmd.parameterQuery, row.parameterDisplayName);
		preview = CommandPreview.fromQuery(query, EFFECTS, ALIASES);
		assertEq(query + " preview kind", preview.kind, "parameter-command");
		assertEq(query + " preview component", preview.component, row.componentDisplayName);
		assertEq(query + " preview parameter", preview.parameter, row.parameterDisplayName);
		assertEq(query + " preview production", preview.productionEnabled, true);
	}

	clipCmd = CommandParser.parseClipParameter("Gaussian Blur 50", EFFECTS, ALIASES);
	assertEq("effect numeric not clip", clipCmd.isClipParameter, false);
	assertEq("effect numeric flag", clipCmd.handledByEffectNumeric, true);
	parsed = CommandParser.parse("Gaussian Blur 50", EFFECTS, ALIASES);
	assertEq("effect numeric effect", parsed.effect && parsed.effect.name, "Gaussian Blur");
	assertEq("effect numeric preview", CommandPreview.fromQuery("Gaussian Blur 50", EFFECTS, ALIASES).kind, "effect-command");

	parsed = CommandParser.parse("Gaussian Blur Amount 80", EFFECTS, ALIASES);
	assertEq("named numeric type", parsed.type, "parameter");
	assertEq("named numeric leftover", parsed.parameterQuery, "Amount");

	clipCmd = CommandParser.parseClipParameter("Gaussian Blur Uniform Blur true", EFFECTS, ALIASES);
	assertEq("effect typed not clip", clipCmd.handledByEffectTyped, true);

	parsed = CommandParser.parse("Lumetri Color Temperature 10", EFFECTS, ALIASES);
	assertEq("prefixed Lumetri skips effect", parsed.effect, null);
	assertEq("prefixed Lumetri query", parsed.effectQuery, "Temperature");
	clipCmd = CommandParser.parseClipParameter("Lumetri Color Temperature 10", EFFECTS, ALIASES);
	assertEq("prefixed Lumetri is clip", clipCmd.isClipParameter, true);
	assertEq("prefixed Lumetri clip name", clipCmd.parameterQuery, "Temperature");

	parsed = CommandParser.parse("Crop 10", EFFECTS, ALIASES);
	assertEq("Crop 10 is effect numeric", parsed.effect && parsed.effect.name, "Crop");
	clipCmd = CommandParser.parseClipParameter("Left 10", EFFECTS, ALIASES);
	assertEq("Left 10 is Crop.Left", clipCmd.parameterQuery, "Left");

	parsed = CommandParser.parse("Tint 5", EFFECTS, ALIASES);
	assertEq("Tint 5 steals Tint effect", parsed.effect, null);
	parsed = CommandParser.parse("Exposure 1.25", EFFECTS, ALIASES);
	assertEq("Exposure steals Exposure effect", parsed.effect, null);
	parsed = CommandParser.parse("Opacity 50", EFFECTS, ALIASES);
	assertEq("Opacity 50 steals Opacity effect", parsed.effect, null);

	assertEq("alias gaussian search", CommandParser.identify("gaussian", EFFECTS, ALIASES).effect && CommandParser.identify("gaussian", EFFECTS, ALIASES).effect.name, "Gaussian Blur");
	assertEq("gaussian 50 still numeric", CommandParser.parse("gaussian 50", EFFECTS, ALIASES).isCommand, true);

	assertEq("Scale Height blocked", ConfirmedParameterWrites.isBlockedName("Scale Height"), true);
	assertEq("Blend Mode blocked", ConfirmedParameterWrites.isBlockedName("Blend Mode"), true);
	assertEq("Time Remapping blocked", ConfirmedParameterWrites.isBlockedName("Time Remapping"), true);
	assertEq("Scale Height not production", ConfirmedParameterWrites.isProductionEnabled("Scale Height"), false);
	written = ConfirmedParameterWrites.write({}, "Scale Height", { numbers: [120], value: 120 });
	assertEq("Scale Height reason", written.reason, "PARAMETER_NOT_FOUND");
	assertEq("Scale Height not verified", written.verified, false);
	written = ConfirmedParameterWrites.write({}, "Blend Mode", { numbers: [0], value: 0 });
	assertEq("Blend Mode not production", written.productionEnabled, false);
	written = ConfirmedParameterWrites.write({}, "Vibrance", { numbers: [10], value: 10 });
	assertEq("Vibrance not production", written.productionEnabled, false);
	assertEq("Vibrance reason", written.reason, "UNSUPPORTED_TYPE");

	clipCmd = CommandParser.parseClipParameter("Scale Height 120", EFFECTS, ALIASES);
	assertEq("Scale Height still parses as clip", clipCmd.isClipParameter, true);
	preview = CommandPreview.fromQuery("Scale Height 120", EFFECTS, ALIASES);
	assertEq("Scale Height preview unknown", preview.kind, "unknown-command");

	assertEq("Speed is speed command", SpeedOperation.isSpeedCommand("Speed"), true);
	speed = SpeedOperation.unsupportedWrite();
	assertEq("Speed writeSupported", speed.writeSupported, false);
	assertEq("Speed reason", speed.reason, "UNSUPPORTED_OPERATION");

	assertEq("color writer stub", ColorParameterWriter.set("Lumetri Color", "Color").reason, "UNSUPPORTED_TYPE");
	assertEq("enum writer stub", EnumParameterWriter.set("Opacity", "Blend Mode").reason, "UNSUPPORTED_TYPE");
	assertEq("string writer stub", StringParameterWriter.set("Motion", "Label").reason, "UNSUPPORTED_TYPE");

	canWrite = ParameterEngine.canWrite({ displayName: "Amount", writable: true, type: "number" }, "number");
	assertEq("engine can write number", canWrite.ok, true);
	canWrite = ParameterEngine.canWrite({ displayName: "Uniform Scale", writable: true, type: "boolean" }, "boolean");
	assertEq("engine can write boolean", canWrite.ok, true);
	canWrite = ParameterEngine.canWrite({ displayName: "Position", writable: true, type: "point" }, "point");
	assertEq("engine can write point", canWrite.ok, true);
	canWrite = ParameterEngine.canWrite({ displayName: "Color", writable: true, type: "color" }, "color");
	assertEq("engine rejects color", canWrite.reason, "UNSUPPORTED_TYPE");
	canWrite = ParameterEngine.canWrite({ displayName: "Blend Mode", writable: true, type: "enum" }, "enum");
	assertEq("engine rejects enum without options", canWrite.reason, "PARAMETER_NOT_WRITABLE");

	picked = NumericParameterPicker.pick("Gaussian Blur", [
		{ displayName: "Blurriness", type: "number", writable: true, value: 0 },
		{ displayName: "Amount", type: "number", writable: true, value: 25 },
		{ displayName: "Repeat Edge Pixels", type: "boolean", writable: true, value: false }
	]);
	assertEq("picker prefers Amount", picked && picked.displayName, "Amount");

	EffectRegistry.loadFromNames(["Gaussian Blur", "Transform", "Transform", "Noise (Legacy)", "Noise (Legacy)"]);
	assertEq("effect raw count keeps duplicates", EffectRegistry.rawCount(), 5);
	assertEq("effect unique count", EffectRegistry.uniqueCount(), 3);
	assertEq("effect index has Gaussian Blur", EffectRegistry.findByPremiereName("Gaussian Blur").premiereName, "Gaussian Blur");
	assertEq("effect index misses unknown", EffectRegistry.findByPremiereName("Not An Effect"), null);
	assertEq("duplicate summary count", EffectRegistry.duplicateSummary().length, 2);
	EffectRegistry.loadFromNames([]);

	origClipSet = ClipParameterWriter.set;
	origUniversalSet = UniversalParameterWriter.set;
	origColorResolve = ColorParameterDiscover.resolve;
	clipHits = [];
	universalHits = [];
	lumetriHits = [];
	ClipParameterWriter.set = function (trackItem, parameterName) {
		clipHits.push(parameterName);
		return { ok: true, verified: true, parameter: parameterName };
	};
	UniversalParameterWriter.set = function (trackItem, parameterName, inputValue, componentHint) {
		universalHits.push({ parameter: parameterName, component: componentHint });
		return { ok: true, verified: true, parameter: parameterName };
	};
	ColorParameterDiscover.resolve = function (trackItem, ident) {
		var stored = 0;
		lumetriHits.push(ident && ident.parameterDisplayName);
		return {
			ok: true,
			effect: {
				displayName: "Lumetri Color",
				matchName: "AE.ADBE Lumetri"
			},
			parameter: {
				displayName: ident && ident.parameterDisplayName,
				matchName: ""
			},
			_param: {
				setValue: function (value, updateUI) {
					if (updateUI !== true) {
						return false;
					}
					stored = value;
					return true;
				},
				getValue: function () {
					return stored;
				}
			}
		};
	};

	try {
		for (i = 0; i < rows.length; i++) {
			row = rows[i];
			input = sampleInput(row);
			written = ConfirmedParameterWrites.write({}, row.parameterDisplayName, input);
			expectedWriter = writerFor(row);
			assertEq(row.parameterDisplayName + " write ok", written.ok, true);
			assertEq(row.parameterDisplayName + " write verified", written.verified, true);
			assertEq(row.parameterDisplayName + " write usedQE", written.usedQE, false);
			assertEq(row.parameterDisplayName + " write production", written.productionEnabled, true);
			assertEq(row.parameterDisplayName + " write method", written.method, WRITE_METHOD);
			assertEq(row.parameterDisplayName + " write component", written.component || written.effect, row.componentDisplayName);
			if (expectedWriter === "ClipParameterWriter") {
				assertEq(row.parameterDisplayName + " motion writer", clipHits[clipHits.length - 1], row.parameterDisplayName);
			} else if (expectedWriter === "writeLumetri") {
				assertEq(row.parameterDisplayName + " lumetri writer", lumetriHits[lumetriHits.length - 1], row.parameterDisplayName);
			} else {
				assertEq(row.parameterDisplayName + " universal writer", universalHits[universalHits.length - 1].parameter, row.parameterDisplayName);
			}
		}
	} finally {
		ClipParameterWriter.set = origClipSet;
		UniversalParameterWriter.set = origUniversalSet;
		ColorParameterDiscover.resolve = origColorResolve;
	}

	assertEq("motion writer hits", clipHits.length, 11);
	assertEq("universal writer hits", universalHits.length, 6);
	assertEq("lumetri writer hits", lumetriHits.length, 9);
	assertEq("seed registry still 26 after matrix write", ConfirmedParameterWrites.all().length, 26);
}());
