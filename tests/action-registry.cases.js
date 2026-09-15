(function () {
	var startCount = passed + failed;
	var results;
	var names;
	var html;

	function namesOf(rows) {
		return rows.map(function (row) {
			return row.action.name;
		});
	}

	assertEq("registry has five actions", ActionRegistry.all().length, 5);
	assertEq("zoom in id", ActionRegistry.findById("zoom-in").name, "Zoom In");
	assertEq("set scale execution", ActionRegistry.findById("set-scale").execution, "set-parameter");
	assertEq("zoom amount default", ActionRegistry.DEFAULTS.zoomAmount, 10);
	assertEq("duration default", ActionRegistry.DEFAULTS.durationFrames, 10);

	results = ActionRegistry.search("zoom");
	names = namesOf(results);
	assert("zoom finds zoom in", names.indexOf("Zoom In") !== -1);
	assert("zoom finds zoom out", names.indexOf("Zoom Out") !== -1);
	assert("zoom finds set scale", names.indexOf("Set Scale") !== -1);
	assert("zoom does not find fade in", names.indexOf("Fade In") === -1);
	assertEq("zoom ranks zoom in first", names[0], "Zoom In");
	assertEq("zoom ranks zoom out second", names[1], "Zoom Out");

	results = ActionRegistry.search("zoom in");
	assertEq("zoom in exact name", results[0].action.id, "zoom-in");
	assertEq("zoom in reason", results[0].reason, "exact");

	results = ActionRegistry.search("zoom out");
	assertEq("zoom out exact name", results[0].action.id, "zoom-out");

	results = ActionRegistry.search("fade");
	names = namesOf(results);
	assert("fade finds fade in", names.indexOf("Fade In") !== -1);
	assert("fade finds fade out", names.indexOf("Fade Out") !== -1);
	assert("fade does not find zoom in", names.indexOf("Zoom In") === -1);

	results = ActionRegistry.search("fade in");
	assertEq("fade in prefers fade in", results[0].action.id, "fade-in");

	results = ActionRegistry.search("fade out");
	assertEq("fade out prefers fade out", results[0].action.id, "fade-out");

	results = ActionRegistry.search("scale");
	assert("scale finds set scale", namesOf(results).indexOf("Set Scale") !== -1);
	assert("scale does not find zoom out", namesOf(results).indexOf("Zoom Out") === -1);

	results = ActionRegistry.search("punch in");
	assertEq("punch in maps to zoom in", results[0].action.id, "zoom-in");

	assertEq("unrelated query is empty", ActionRegistry.search("gaussian").length, 0);
	assertEq("stopword in is empty", ActionRegistry.search("in").length, 0);
	assertEq("stopword out is empty", ActionRegistry.search("out").length, 0);
	assertEq("empty query is empty", ActionRegistry.search("").length, 0);

	assertEq("host spec id", ActionRegistry.hostSpec(ActionRegistry.findById("zoom-in")).actionId, "zoom-in");
	assertEq("host spec plan", ActionRegistry.hostSpec(ActionRegistry.findById("zoom-in")).valuePlan, "current-to-current-plus");
	assertEq("host spec amount", ActionRegistry.hostSpec(ActionRegistry.findById("zoom-in")).amount, 10);

	if (typeof EffectSearch !== "undefined") {
		results = EffectSearch.search("gaussian", [{ name: "Gaussian Blur", premiereName: "Gaussian Blur" }], {});
		assert("effect search still returns gaussian blur", results.length === 1 && results[0].effect.name === "Gaussian Blur");
		results = EffectSearch.search("zoom", [{ name: "Gaussian Blur", premiereName: "Gaussian Blur" }], {});
		assert("effect search does not invent zoom action", results.length === 0);
	}

	if (typeof CommandPaletteState !== "undefined") {
		assertEq(
			"conflict message",
			CommandPaletteState.userFacingMessage({ ok: false, reason: "KEYFRAME_CONFLICT" }).title,
			"Existing animation in the way"
		);
		assertEq(
			"unsupported keyframes message",
			CommandPaletteState.userFacingMessage({ ok: false, reason: "KEYFRAMES_NOT_SUPPORTED" }).title,
			"Can't animate that"
		);
		assertEq(
			"short clip message",
			CommandPaletteState.userFacingMessage({ ok: false, reason: "INVALID_CLIP_DURATION" }).title,
			"Clip is too short"
		);
	}

	if (typeof fs !== "undefined" && typeof path !== "undefined" && typeof __pickfxRoot !== "undefined") {
		html = fs.readFileSync(path.join(__pickfxRoot, "src/panel/index.html"), "utf8");
		assert("panel loads action registry", html.indexOf("ActionRegistry.js") !== -1);
		assert("action registry loads before panel.js", html.indexOf("ActionRegistry.js") < html.indexOf("js/panel.js"));
		assert("panel loads action executor", html.indexOf("ActionExecutor.js") !== -1);
		assert("action executor loads after premiere bridge", html.indexOf("PremiereBridge.js") < html.indexOf("ActionExecutor.js"));
		assert(
			"panel extraHost loads keyframe engine",
			fs.readFileSync(path.join(__pickfxRoot, "src/panel/js/panel.js"), "utf8").indexOf("/src/core/KeyframeEngine.js") !== -1
		);
	}

	print("action registry: " + ((passed + failed) - startCount) + " assertions");
}());
