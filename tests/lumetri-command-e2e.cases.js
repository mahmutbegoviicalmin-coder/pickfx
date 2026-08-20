(function () {
	var PREMIERE_EFFECTS = [
		{ name: "Gaussian Blur", premiereName: "Gaussian Blur" },
		{ name: "Brightness & Contrast", premiereName: "Brightness & Contrast" },
		{ name: "Lumetri Color", premiereName: "Lumetri Color" },
		{ name: "Exposure", premiereName: "Exposure" },
		{ name: "Tint", premiereName: "Tint" },
		{ name: "Hue/Saturation", premiereName: "Hue/Saturation" },
		{ name: "Extract", premiereName: "Extract" },
		{ name: "ProcAmp", premiereName: "ProcAmp" },
		{ name: "Shadow/Highlight", premiereName: "Shadow/Highlight" }
	];
	var COMMANDS = [
		{ name: "Temperature", query: "Temperature 10", value: 10, initial: 0 },
		{ name: "Tint", query: "Tint 5", value: 5, initial: 0 },
		{ name: "Exposure", query: "Exposure 1.25", value: 1.25, initial: 0 },
		{ name: "Contrast", query: "Lumetri Color Contrast 20", value: 20, initial: 0 },
		{ name: "Highlights", query: "Highlights -10", value: -10, initial: 0 },
		{ name: "Shadows", query: "Shadows 15", value: 15, initial: 0 },
		{ name: "Whites", query: "Whites 8", value: 8, initial: 0 },
		{ name: "Blacks", query: "Blacks -8", value: -8, initial: 0 },
		{ name: "Saturation", query: "Saturation 80", value: 80, initial: 100 }
	];
	var WRITE_METHOD = "ComponentParam.setValue(value, true)";
	var RESOLVER_PATH = "ColorParameterDiscover.resolve";
	var savedBridge;
	var savedUniversalSet;
	var savedDiscoverResolve;
	var origResolver;
	var universalCalls;
	var discoverCalls;
	var discoverIdents;
	var effectSetterCalls;
	var i;
	var row;
	var parsed;
	var clipCmd;
	var preview;
	var routed;
	var clip;
	var params;
	var payload;
	var original;
	var param;

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
			min: extras.min,
			max: extras.max,
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

	function lumetriClip(properties) {
		return videoClip([{
			displayName: "Lumetri Color",
			matchName: "AE.ADBE Lumetri",
			properties: properties
		}]);
	}

	function uniqueLumetriClip() {
		var listed = [];
		var map = {};
		var i;
		var spec;
		var node;
		for (i = 0; i < COMMANDS.length; i++) {
			spec = COMMANDS[i];
			node = numberParam(spec.name, spec.initial, { matchName: "" });
			listed.push(node);
			map[spec.name] = node;
		}
		return { clip: lumetriClip(listed), params: map };
	}

	function routeLikePanel(query, effects) {
		var parsed = CommandParser.parse(query, effects, {});
		var clipCmd;
		if (parsed.isCommand && parsed.effect) {
			return {
				path: "effect",
				effect: parsed.effect.name,
				parameterQuery: parsed.parameterQuery || "",
				value: parsed.value
			};
		}
		if (typeof CommandParser.parseClipParameter === "function") {
			clipCmd = CommandParser.parseClipParameter(query, effects, {});
			if (clipCmd && clipCmd.isClipParameter) {
				return {
					path: "clip",
					clipCmd: clipCmd,
					parameterQuery: clipCmd.parameterQuery,
					value: clipCmd.value
				};
			}
		}
		if (parsed.isCommand) {
			return { path: "numeric-no-effect", parsed: parsed };
		}
		return { path: "other" };
	}

	function installProductionBridge(trackItem) {
		PremiereBridge = {
			setClipParameter: function (csInterface, parameterName, input, expectedType, done) {
				var written = ConfirmedParameterWrites.write(trackItem, parameterName, input);
				done(written);
			},
			setParameter: function () {
				effectSetterCalls += 1;
			}
		};
	}

	function runCommand(query, trackItem, effects) {
		var clipCmd;
		var result = null;
		routed = routeLikePanel(query, effects);
		if (routed.path !== "clip") {
			return {
				routed: routed,
				payload: null
			};
		}
		clipCmd = routed.clipCmd;
		installProductionBridge(trackItem);
		CommandExecutor.runClipParameter(null, clipCmd, function (written) {
			result = written;
		});
		return {
			routed: routed,
			clipCmd: clipCmd,
			payload: result
		};
	}

	function noFallbackSetters(setCalls) {
		var i;
		var call;
		for (i = 0; i < (setCalls ? setCalls.length : 0); i++) {
			call = setCalls[i];
			if (!call) {
				continue;
			}
			if (call.updateUI !== true || call.argc !== 2) {
				return false;
			}
		}
		return true;
	}

	if (typeof $ === "undefined") {
		$ = {};
	}
	origResolver = $._pickfxParameterResolver;
	$._pickfxParameterResolver = mockResolver();
	savedBridge = typeof PremiereBridge !== "undefined" ? PremiereBridge : undefined;
	savedUniversalSet = UniversalParameterWriter.set;
	savedDiscoverResolve = ColorParameterDiscover.resolve;
	universalCalls = 0;
	discoverCalls = 0;
	discoverIdents = [];
	effectSetterCalls = 0;
	UniversalParameterWriter.set = function () {
		universalCalls += 1;
		return savedUniversalSet.apply(this, arguments);
	};
	ColorParameterDiscover.resolve = function (trackItem, ident) {
		discoverCalls += 1;
		discoverIdents.push(ident);
		return savedDiscoverResolve.apply(this, arguments);
	};

	assertEq("e2e blur still effect", routeLikePanel("Gaussian Blur 50", PREMIERE_EFFECTS).path, "effect");
	assertEq("e2e brightness contrast still effect", routeLikePanel("Brightness & Contrast 25", PREMIERE_EFFECTS).path, "effect");
	assertEq("e2e brightness named contrast is effect", routeLikePanel("Brightness & Contrast Contrast 40", PREMIERE_EFFECTS).path, "effect");
	assertEq("e2e brightness named contrast parameter", routeLikePanel("Brightness & Contrast Contrast 40", PREMIERE_EFFECTS).parameterQuery, "Contrast");
	assertEq("e2e brightness named contrast effect", routeLikePanel("Brightness & Contrast Contrast 40", PREMIERE_EFFECTS).effect, "Brightness & Contrast");
	assertEq("e2e prefixed temperature is clip", routeLikePanel("Lumetri Color Temperature 10", PREMIERE_EFFECTS).path, "clip");
	assertEq("e2e prefixed temperature parameter", routeLikePanel("Lumetri Color Temperature 10", PREMIERE_EFFECTS).parameterQuery, "Temperature");
	assertEq("e2e lowercase temperature is clip", routeLikePanel("temperature 30", PREMIERE_EFFECTS).path, "clip");
	assertEq("e2e lowercase temperature parameter", routeLikePanel("temperature 30", PREMIERE_EFFECTS).parameterQuery, "Temperature");
	assertEq("e2e uppercase temperature is clip", routeLikePanel("TEMPERATURE 30", PREMIERE_EFFECTS).path, "clip");
	assertEq("e2e mixed temperature is clip", routeLikePanel("TeMpErAtUrE 30", PREMIERE_EFFECTS).parameterQuery, "Temperature");
	assertEq("e2e lowercase prefixed temperature is clip", routeLikePanel("lumetri color temperature 30", PREMIERE_EFFECTS).path, "clip");
	assertEq("e2e lowercase prefixed temperature parameter", routeLikePanel("lumetri color temperature 30", PREMIERE_EFFECTS).parameterQuery, "Temperature");
	assertEq("e2e uppercase prefixed temperature is clip", routeLikePanel("LUMETRI COLOR TEMPERATURE 30", PREMIERE_EFFECTS).parameterQuery, "Temperature");
	assertEq("e2e lowercase gaussian is effect", routeLikePanel("gaussian blur 30", PREMIERE_EFFECTS).path, "effect");
	assertEq("e2e lowercase gaussian effect", routeLikePanel("gaussian blur 30", PREMIERE_EFFECTS).effect, "Gaussian Blur");
	assertEq("e2e lowercase brightness parameter", routeLikePanel("brightness 20", PREMIERE_EFFECTS).parameterQuery, "Brightness");
	assertEq("e2e lowercase brightness effect", routeLikePanel("brightness 20", PREMIERE_EFFECTS).effect, "Brightness & Contrast");
	assertEq("e2e lowercase contrast parameter", routeLikePanel("contrast 20", PREMIERE_EFFECTS).parameterQuery, "Contrast");
	assertEq("e2e lowercase contrast effect", routeLikePanel("contrast 20", PREMIERE_EFFECTS).effect, "Brightness & Contrast");
	assertEq("e2e scale still clip", routeLikePanel("Scale 120", PREMIERE_EFFECTS).path, "clip");

	for (i = 0; i < COMMANDS.length; i++) {
		row = COMMANDS[i];
		parsed = CommandParser.parse(row.query, PREMIERE_EFFECTS, {});
		clipCmd = CommandParser.parseClipParameter(row.query, PREMIERE_EFFECTS, {});
		preview = CommandPreview.fromQuery(row.query, PREMIERE_EFFECTS, {});
		routed = routeLikePanel(row.query, PREMIERE_EFFECTS);
		assertEq("e2e parse " + row.name + " has no effect", parsed.effect, null);
		assertEq("e2e parse " + row.name + " value", parsed.value, row.value);
		assertEq("e2e clip " + row.name + " is clip", clipCmd.isClipParameter, true);
		assertEq("e2e clip " + row.name + " parameter", clipCmd.parameterQuery, row.name);
		assertEq("e2e clip " + row.name + " value", clipCmd.value, row.value);
		assertEq("e2e clip " + row.name + " type", clipCmd.expectedType, "number");
		assertEq("e2e preview " + row.name + " kind", preview.kind, "parameter-command");
		assertEq("e2e preview " + row.name + " component", preview.component, "Lumetri Color");
		assertEq("e2e preview " + row.name + " matchName", preview.componentMatchName, "AE.ADBE Lumetri");
		assertEq("e2e preview " + row.name + " parameter", preview.parameter, row.name);
		assertEq("e2e panel " + row.name + " path", routed.path, "clip");
		assertEq("e2e panel " + row.name + " parameter", routed.parameterQuery, row.name);
		assertEq("e2e panel " + row.name + " value", routed.value, row.value);
	}

	params = uniqueLumetriClip();
	clip = params.clip;
	for (i = 0; i < COMMANDS.length; i++) {
		row = COMMANDS[i];
		param = params.params[row.name];
		original = param.getValue();
		discoverCalls = 0;
		universalCalls = 0;
		effectSetterCalls = 0;
		param.setCalls = [];
		payload = runCommand(row.query, clip, PREMIERE_EFFECTS).payload;
		assertEq("e2e " + row.name + " ok", payload && payload.ok, true);
		assertEq("e2e " + row.name + " verified", payload && payload.verified, true);
		assertEq("e2e " + row.name + " command", payload && payload.command, true);
		assertEq("e2e " + row.name + " clipParameter", payload && payload.clipParameter, true);
		assertEq("e2e " + row.name + " component", payload && payload.component, "Lumetri Color");
		assertEq("e2e " + row.name + " effect", payload && payload.effect, "Lumetri Color");
		assertEq("e2e " + row.name + " parameter", payload && payload.parameter, row.name);
		assertEq("e2e " + row.name + " requested", payload && payload.requestedValue, row.value);
		assertEq("e2e " + row.name + " actual", payload && payload.actualValue, row.value);
		assertEq("e2e " + row.name + " readBack", payload && payload.readBack, row.value);
		assertEq("e2e " + row.name + " method", payload && payload.method, WRITE_METHOD);
		assertEq("e2e " + row.name + " usedQE", payload && payload.usedQE, false);
		assertEq("e2e " + row.name + " productionEnabled", payload && payload.productionEnabled, true);
		assertEq("e2e " + row.name + " live value", param.getValue(), row.value);
		assertEq("e2e " + row.name + " setValue calls", param.setCalls.length, 1);
		assertEq("e2e " + row.name + " setValue arg", param.setCalls[0] && param.setCalls[0].value, row.value);
		assertEq("e2e " + row.name + " setValue true", param.setCalls[0] && param.setCalls[0].updateUI, true);
		assertEq("e2e " + row.name + " no fallback setter", noFallbackSetters(param.setCalls), true);
		assertEq("e2e " + row.name + " resolver used", discoverCalls >= 1, true);
		assertEq("e2e " + row.name + " resolver displayName", discoverIdents[discoverIdents.length - 1] && discoverIdents[discoverIdents.length - 1].parameterDisplayName, row.name);
		assertEq("e2e " + row.name + " resolver matchName", discoverIdents[discoverIdents.length - 1] && discoverIdents[discoverIdents.length - 1].parameterMatchName, "");
		assertEq("e2e " + row.name + " no universal writer", universalCalls, 0);
		assertEq("e2e " + row.name + " no effect setter", effectSetterCalls, 0);
		param.setValue(original, true);
		assertEq("e2e " + row.name + " restored", param.getValue(), original);
	}

	assertEq("e2e lookup temperature lower", ConfirmedParameterWrites.lookupByParameter("temperature").parameterDisplayName, "Temperature");
	assertEq("e2e lookup temperature upper", ConfirmedParameterWrites.lookupByParameter("TEMPERATURE").componentMatchName, "AE.ADBE Lumetri");
	payload = runCommand("temperature 30", params.clip, PREMIERE_EFFECTS).payload;
	assertEq("e2e lowercase temperature write ok", payload && payload.ok, true);
	assertEq("e2e lowercase temperature write parameter", payload && payload.parameter, "Temperature");
	assertEq("e2e lowercase temperature write component", payload && payload.component, "Lumetri Color");
	assertEq("e2e lowercase temperature write requested", payload && payload.requestedValue, 30);
	assertEq("e2e lowercase temperature write usedQE", payload && payload.usedQE, false);
	assertEq("e2e lowercase temperature write production", payload && payload.productionEnabled, true);
	preview = CommandPreview.fromQuery("temperature 30", PREMIERE_EFFECTS, {});
	assertEq("e2e lowercase temperature preview matchName", preview.componentMatchName, "AE.ADBE Lumetri");
	assertEq("e2e lowercase temperature preview paramMatch empty", preview.entry && preview.entry.parameterMatchName, "");
	params.params.Temperature.setValue(0, true);
	payload = runCommand("Lumetri Color Temperature 30", params.clip, PREMIERE_EFFECTS).payload;
	assertEq("e2e prefixed temperature write ok", payload && payload.ok, true);
	assertEq("e2e prefixed temperature write parameter", payload && payload.parameter, "Temperature");
	assertEq("e2e prefixed temperature write component", payload && payload.component, "Lumetri Color");
	params.params.Temperature.setValue(0, true);
	payload = runCommand("lumetri color temperature 30", params.clip, PREMIERE_EFFECTS).payload;
	assertEq("e2e lowercase prefixed temperature write ok", payload && payload.ok, true);
	assertEq("e2e lowercase prefixed temperature write parameter", payload && payload.parameter, "Temperature");
	params.params.Temperature.setValue(0, true);

	clipCmd = CommandParser.parseClipParameter("Look 12", PREMIERE_EFFECTS, {});
	assertEq("e2e unknown look is clip", clipCmd.isClipParameter, true);
	payload = runCommand("Look 12", params.clip, PREMIERE_EFFECTS).payload;
	assertEq("e2e unknown look ok", payload && payload.ok, false);
	assertEq("e2e unknown look reason", payload && payload.reason, "UNSUPPORTED_TYPE");
	assertEq("e2e unknown look usedQE", payload && payload.usedQE, false);

	clipCmd = CommandParser.parseClipParameter("Vibrance 10", PREMIERE_EFFECTS, {});
	assertEq("e2e vibrance is clip", clipCmd.isClipParameter, true);
	payload = runCommand("Vibrance 10", params.clip, PREMIERE_EFFECTS).payload;
	assertEq("e2e vibrance ok", payload && payload.ok, false);
	assertEq("e2e vibrance reason", payload && payload.reason, "UNSUPPORTED_TYPE");
	assertEq("e2e vibrance usedQE", payload && payload.usedQE, false);
	assertEq("e2e vibrance not enabled", payload && payload.productionEnabled, false);

	routed = routeLikePanel("Hue 10", PREMIERE_EFFECTS);
	assertEq("e2e hue with effects not lumetri clip", routed.path === "clip", false);
	clip = lumetriClip([numberParam("Hue", 0, { matchName: "" })]);
	clipCmd = CommandParser.parseClipParameter("Hue 10", [], {});
	assertEq("e2e hue empty-effects is clip", clipCmd.isClipParameter, true);
	installProductionBridge(clip);
	payload = null;
	CommandExecutor.runClipParameter(null, clipCmd, function (written) {
		payload = written;
	});
	assertEq("e2e hue write ok", payload && payload.ok, false);
	assertEq("e2e hue write reason", payload && payload.reason, "UNSUPPORTED_TYPE");
	assertEq("e2e hue live unchanged", clip.components[0].properties[0].getValue(), 0);
	assertEq("e2e hue usedQE", payload && payload.usedQE, false);

	clip = videoClip([{
		displayName: "Motion",
		matchName: "AE.ADBE Motion",
		properties: [numberParam("Scale", 100)]
	}]);
	payload = runCommand("Temperature 10", clip, PREMIERE_EFFECTS).payload;
	assertEq("e2e missing lumetri ok", payload && payload.ok, false);
	assertEq("e2e missing lumetri reason", payload && payload.reason, "PARAMETER_NOT_FOUND");
	assertEq("e2e missing lumetri uiKind", payload && payload.uiKind, "no-lumetri");
	assertEq("e2e missing lumetri componentCount", payload && payload.componentMatchCount, 0);
	assertEq("e2e missing lumetri settersCalled", payload && payload.settersCalled, false);
	assertEq("e2e missing lumetri setters", clip.components[0].properties[0].setCalls.length, 0);
	assertEq("e2e missing lumetri usedQE", payload && payload.usedQE, false);

	(function () {
		var one = numberParam("Temperature", 0, { matchName: "" });
		var single = videoClip([{
			displayName: "Lumetri Color",
			matchName: "AE.ADBE Lumetri",
			properties: [one]
		}]);
		payload = runCommand("Temperature 11", single, PREMIERE_EFFECTS).payload;
		assertEq("e2e one lumetri ok", payload && payload.ok, true);
		assertEq("e2e one lumetri verified", payload && payload.verified, true);
		assertEq("e2e one lumetri settersCalled", payload && payload.settersCalled, true);
		assertEq("e2e one lumetri setValue calls", one.setCalls.length, 1);
		assertEq("e2e one lumetri live", one.getValue(), 11);
		one.setValue(0, true);
	}());

	(function () {
		var first = numberParam("Temperature", 0, { matchName: "" });
		var second = numberParam("Temperature", 4, { matchName: "" });
		var dual = videoClip([
			{ displayName: "Lumetri Color", matchName: "AE.ADBE Lumetri", properties: [first] },
			{ displayName: "Lumetri Color", matchName: "AE.ADBE Lumetri", properties: [second] }
		]);
		payload = runCommand("Temperature 11", dual, PREMIERE_EFFECTS).payload;
		assertEq("e2e two lumetri ok", payload && payload.ok, false);
		assertEq("e2e two lumetri uiKind", payload && payload.uiKind, "choose-lumetri");
		assertEq("e2e two lumetri choices", payload && payload.choices && payload.choices.length, 2);
		assertEq("e2e two lumetri first index", payload.choices[0].componentIndex, 0);
		assertEq("e2e two lumetri second index", payload.choices[1].componentIndex, 1);
		assertEq("e2e two lumetri componentCount", payload && payload.componentMatchCount, 2);
		assertEq("e2e two lumetri settersCalled", payload && payload.settersCalled, false);
		assertEq("e2e two lumetri first setters", first.setCalls.length, 0);
		assertEq("e2e two lumetri second setters", second.setCalls.length, 0);
		assertEq("e2e two lumetri first live", first.getValue(), 0);
		assertEq("e2e two lumetri second live", second.getValue(), 4);
		assertEq("e2e two lumetri usedQE", payload && payload.usedQE, false);
		assert("e2e two lumetri no first/last guess", first.getValue() !== 11 && second.getValue() !== 11);

		clipCmd = CommandParser.parseClipParameter("Temperature 11", PREMIERE_EFFECTS, {});
		clipCmd.lumetriComponentIndex = 1;
		installProductionBridge(dual);
		payload = null;
		CommandExecutor.runClipParameter(null, clipCmd, function (written) {
			payload = written;
		});
		assertEq("e2e two lumetri enter ok", payload && payload.ok, true);
		assertEq("e2e two lumetri enter verified", payload && payload.verified, true);
		assertEq("e2e two lumetri enter first live", first.getValue(), 0);
		assertEq("e2e two lumetri enter second live", second.getValue(), 11);
		assertEq("e2e two lumetri enter first setters", first.setCalls.length, 0);
		assertEq("e2e two lumetri enter second setters", second.setCalls.length, 1);
	}());

	(function () {
		var first = numberParam("Temperature", 0, { matchName: "" });
		var second = numberParam("Temperature", 4, { matchName: "" });
		var third = numberParam("Temperature", 8, { matchName: "" });
		var triple = videoClip([
			{ displayName: "Lumetri Color", matchName: "AE.ADBE Lumetri", properties: [first] },
			{ displayName: "Lumetri Color", matchName: "AE.ADBE Lumetri", properties: [second] },
			{ displayName: "Opacity", matchName: "AE.ADBE Opacity", properties: [numberParam("Opacity", 100)] },
			{ displayName: "Lumetri Color", matchName: "AE.ADBE Lumetri", properties: [third] }
		]);
		payload = runCommand("Temperature 11", triple, PREMIERE_EFFECTS).payload;
		assertEq("e2e three lumetri ok", payload && payload.ok, false);
		assertEq("e2e three lumetri uiKind", payload && payload.uiKind, "choose-lumetri");
		assertEq("e2e three lumetri choices", payload && payload.choices && payload.choices.length, 3);
		assertEq("e2e three lumetri componentCount", payload && payload.componentMatchCount, 3);
		assertEq("e2e three lumetri settersCalled", payload && payload.settersCalled, false);
		assertEq("e2e three lumetri first setters", first.setCalls.length, 0);
		assertEq("e2e three lumetri second setters", second.setCalls.length, 0);
		assertEq("e2e three lumetri third setters", third.setCalls.length, 0);
		assertEq("e2e three lumetri first live", first.getValue(), 0);
		assertEq("e2e three lumetri second live", second.getValue(), 4);
		assertEq("e2e three lumetri third live", third.getValue(), 8);
		assertEq("e2e three lumetri usedQE", payload && payload.usedQE, false);
		assertEq("e2e three lumetri indexes", payload.choices[0].componentIndex + "," + payload.choices[1].componentIndex + "," + payload.choices[2].componentIndex, "0,1,3");
	}());

	clip = lumetriClip([numberParam("Tint", 0, { matchName: "" })]);
	payload = runCommand("Temperature 10", clip, PREMIERE_EFFECTS).payload;
	assertEq("e2e missing parameter ok", payload && payload.ok, false);
	assertEq("e2e missing parameter reason", payload && payload.reason, "PARAMETER_NOT_FOUND");
	assertEq("e2e missing parameter setters", clip.components[0].properties[0].setCalls.length, 0);
	assertEq("e2e missing parameter usedQE", payload && payload.usedQE, false);

	(function () {
		var basicSat = numberParam("Saturation", 100, { matchName: "" });
		var creativeSat = numberParam("Saturation", 80, { matchName: "" });
		var booleanSat = {
			displayName: "Saturation",
			matchName: "",
			setCalls: [],
			getValue: function () {
				return false;
			},
			setValue: function () {
				this.setCalls.push({ argc: arguments.length });
				return true;
			},
			isTimeVarying: function () {
				return false;
			}
		};
		var dual = videoClip([{
			displayName: "Lumetri Color",
			matchName: "AE.ADBE Lumetri",
			properties: [
				{ displayName: "Basic Correction", matchName: "", getValue: function () { return true; }, setValue: function () { return true; } },
				basicSat,
				{ displayName: "Creative", matchName: "", getValue: function () { return true; }, setValue: function () { return true; } },
				creativeSat,
				booleanSat
			]
		}]);
		payload = runCommand("Saturation 12", dual, PREMIERE_EFFECTS).payload;
		assertEq("e2e ambiguous sat ok", payload && payload.ok, false);
		assertEq("e2e ambiguous sat uiKind", payload && payload.uiKind, "choose-parameter");
		assertEq("e2e ambiguous sat choices", payload && payload.choices && payload.choices.length, 2);
		assertEq("e2e ambiguous sat first title", payload.choices[0].title, "Basic Correction");
		assertEq("e2e ambiguous sat first subtitle", payload.choices[0].subtitle, "Saturation · 100");
		assertEq("e2e ambiguous sat second title", payload.choices[1].title, "Creative");
		assertEq("e2e ambiguous sat second subtitle", payload.choices[1].subtitle, "Saturation · 80");
		assert("e2e ambiguous sat hides index", String(payload.choices[0].title + payload.choices[0].subtitle + payload.choices[1].title + payload.choices[1].subtitle).indexOf("parameterIndex") === -1);
		assertEq("e2e ambiguous sat setters basic", basicSat.setCalls.length, 0);
		assertEq("e2e ambiguous sat setters creative", creativeSat.setCalls.length, 0);
		assertEq("e2e ambiguous sat setters boolean", booleanSat.setCalls.length, 0);
		assertEq("e2e ambiguous sat live basic", basicSat.getValue(), 100);
		assertEq("e2e ambiguous sat live creative", creativeSat.getValue(), 80);
		assertEq("e2e ambiguous sat usedQE", payload && payload.usedQE, false);
		assertEq("e2e ambiguous sat no universal", universalCalls, 0);
	}());

	(function () {
		function boolHeader(name) {
			return {
				displayName: name,
				matchName: "",
				getValue: function () {
					return true;
				},
				setValue: function () {
					return true;
				}
			};
		}
		function blankParam() {
			return {
				displayName: " ",
				matchName: "",
				getValue: function () {
					return false;
				},
				setValue: function () {
					return true;
				}
			};
		}
		var basicTemp = numberParam("Temperature", 0, { matchName: "" });
		var hslTemp = numberParam("Temperature", 0, { matchName: "" });
		var props = [];
		var i;
		var live;
		var clipCmd;
		for (i = 0; i <= 108; i++) {
			props[i] = blankParam();
		}
		props[2] = boolHeader("Basic Correction");
		props[14] = basicTemp;
		props[81] = boolHeader("HSL Secondary");
		props[98] = { displayName: "Correction", matchName: "", getValue: function () { return false; }, setValue: function () { return true; } };
		props[101] = hslTemp;
		live = videoClip([{
			displayName: "Lumetri Color",
			matchName: "AE.ADBE Lumetri",
			properties: props
		}]);
		payload = runCommand("Temperature 30", live, PREMIERE_EFFECTS).payload;
		assertEq("e2e live temp picker ok", payload && payload.ok, false);
		assertEq("e2e live temp picker uiKind", payload && payload.uiKind, "choose-parameter");
		assertEq("e2e live temp picker choices", payload && payload.choices && payload.choices.length, 2);
		assertEq("e2e live temp picker first title", payload.choices[0].title, "Basic Correction");
		assertEq("e2e live temp picker first subtitle", payload.choices[0].subtitle, "Temperature · 0");
		assertEq("e2e live temp picker second title", payload.choices[1].title, "HSL Secondary");
		assertEq("e2e live temp picker second subtitle", payload.choices[1].subtitle, "Temperature · 0");
		assert("e2e live temp picker hides 14", String(payload.choices[0].title + payload.choices[0].subtitle).indexOf("14") === -1);
		assert("e2e live temp picker hides 101", String(payload.choices[1].title + payload.choices[1].subtitle).indexOf("101") === -1);
		assertEq("e2e live temp picker setters", payload && payload.settersCalled, false);
		assertEq("e2e live temp picker basic setters", basicTemp.setCalls.length, 0);
		assertEq("e2e live temp picker hsl setters", hslTemp.setCalls.length, 0);
		assertEq("e2e live temp picker usedQE", payload && payload.usedQE, false);

		clipCmd = CommandParser.parseClipParameter("Temperature 30", PREMIERE_EFFECTS, {});
		clipCmd.lumetriComponentIndex = 0;
		clipCmd.lumetriParameterIndex = 14;
		installProductionBridge(live);
		payload = null;
		CommandExecutor.runClipParameter(null, clipCmd, function (written) {
			payload = written;
		});
		assertEq("e2e live temp selected ok", payload && payload.ok, true);
		assertEq("e2e live temp selected verified", payload && payload.verified, true);
		assertEq("e2e live temp selected basic live", basicTemp.getValue(), 30);
		assertEq("e2e live temp selected hsl live", hslTemp.getValue(), 0);
		assertEq("e2e live temp selected basic setters", basicTemp.setCalls.length, 1);
		assertEq("e2e live temp selected hsl setters", hslTemp.setCalls.length, 0);
		assertEq("e2e live temp selected setValue true", basicTemp.setCalls[0].updateUI, true);
	}());

	clip = lumetriClip([numberParam("Temperature", 0, {
		matchName: "",
		isTimeVarying: function () {
			return true;
		}
	})]);
	payload = runCommand("Temperature 10", clip, PREMIERE_EFFECTS).payload;
	assertEq("e2e time varying ok", payload && payload.ok, false);
	assertEq("e2e time varying reason", payload && payload.reason, "PARAMETER_TIME_VARYING_UNSUPPORTED");
	assertEq("e2e time varying setters", clip.components[0].properties[0].setCalls.length, 0);
	assertEq("e2e time varying live", clip.components[0].properties[0].getValue(), 0);
	assertEq("e2e time varying usedQE", payload && payload.usedQE, false);

	clip = lumetriClip([numberParam("Tint", 0, {
		matchName: "",
		setValue: function (next, updateUI) {
			if (updateUI !== true) {
				return false;
			}
			return true;
		}
	})]);
	payload = runCommand("Tint 8", clip, PREMIERE_EFFECTS).payload;
	assertEq("e2e verify fail ok", payload && payload.ok, false);
	assertEq("e2e verify fail reason", payload && payload.reason, "VALUE_NOT_VERIFIED");
	assertEq("e2e verify fail setters", clip.components[0].properties[0].setCalls.length, 1);
	assertEq("e2e verify fail setValue true", clip.components[0].properties[0].setCalls[0].updateUI, true);
	assertEq("e2e verify fail no fallback", noFallbackSetters(clip.components[0].properties[0].setCalls), true);
	assertEq("e2e verify fail live", clip.components[0].properties[0].getValue(), 0);
	assertEq("e2e verify fail usedQE", payload && payload.usedQE, false);
	assertEq("e2e verify fail no universal", universalCalls, 0);

	UniversalParameterWriter.set = savedUniversalSet;
	ColorParameterDiscover.resolve = savedDiscoverResolve;
	if (savedBridge === undefined) {
		PremiereBridge = undefined;
	} else {
		PremiereBridge = savedBridge;
	}
	$._pickfxParameterResolver = origResolver;

	assertEq("e2e resolver path", RESOLVER_PATH, "ColorParameterDiscover.resolve");
}());
