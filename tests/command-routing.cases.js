(function () {
	var TEST_EFFECTS = [
		{ name: "Gaussian Blur", premiereName: "Gaussian Blur" },
		{ name: "Directional Blur", premiereName: "Directional Blur" },
		{ name: "Brightness & Contrast", premiereName: "Brightness & Contrast" }
	];
	var applyCalls;
	var lastTypedPayload;
	var listedParameters = [
		{ displayName: "Amount", type: "number", writable: true, value: 80 },
		{ displayName: "", type: "boolean", writable: true, value: true },
		{ displayName: "Edge Behavior", type: "number", writable: true, value: 1 }
	];

	function resetRouting() {
		applyCalls = 0;
		lastTypedPayload = null;
		EffectExecutor = {
			applyEffect: function (csInterface, premiereName, done) {
				applyCalls += 1;
				if (done) {
					done({
						ok: true,
						effect: premiereName,
						applied: 1,
						failed: 0
					});
				}
			}
		};
		PremiereBridge = {
			listEffectParameters: function (csInterface, effectName, done) {
				done({
					ok: true,
					effect: { displayName: effectName },
					parameters: listedParameters
				});
			},
			setParameter: function () {
				applyCalls += 100;
			},
			setTypedParameter: function () {
				applyCalls += 100;
			}
		};
	}

	function route(query) {
		var parsed;
		var classified;
		parsed = CommandParser.parse(query, TEST_EFFECTS, {});
		if (parsed.isCommand) {
			return {
				path: parsed.parameterQuery ? "named-numeric" : "numeric",
				effect: parsed.effect,
				parameterQuery: parsed.parameterQuery || "",
				value: parsed.value
			};
		}
		classified = CommandParser.classify(query, TEST_EFFECTS, {});
		if (classified.kind === "typed") {
			CommandExecutor.runTyped(null, classified.effect, classified.leftover, function (payload) {
				lastTypedPayload = payload;
			});
			return {
				path: "typed",
				effect: classified.effect,
				leftover: classified.leftover
			};
		}
		EffectExecutor.applyEffect(null, classified.effect ? classified.effect.premiereName : "", function () {});
		return {
			path: "effect",
			effect: classified.effect
		};
	}

	resetRouting();
	assertEq("classify Gaussian Blur", CommandParser.classify("Gaussian Blur", TEST_EFFECTS, {}).kind, "effect");
	assertEq("route Gaussian Blur", route("Gaussian Blur").path, "effect");

	resetRouting();
	assertEq("classify Gaussian Blur 50", CommandParser.classify("Gaussian Blur 50", TEST_EFFECTS, {}).kind, "numeric");
	assertEq("route Gaussian Blur 50", route("Gaussian Blur 50").path, "numeric");
	assertEq("numeric does not use typed leftover apply", applyCalls, 0);

	resetRouting();
	assertEq("classify Gaussian Blur Amount 80", CommandParser.classify("Gaussian Blur Amount 80", TEST_EFFECTS, {}).kind, "named-numeric");
	assertEq("route Gaussian Blur Amount 80", route("Gaussian Blur Amount 80").path, "named-numeric");
	assertEq("named numeric does not apply effect", applyCalls, 0);

	resetRouting();
	assertEq("classify Uniform Blur true", CommandParser.classify("Gaussian Blur Uniform Blur true", TEST_EFFECTS, {}).kind, "typed");
	assertEq("route Uniform Blur true", route("Gaussian Blur Uniform Blur true").path, "typed");
	assertEq("Uniform Blur true does not apply", applyCalls, 0);
	assert("Uniform Blur true payload", lastTypedPayload && lastTypedPayload.ok === false);
	assertEq("Uniform Blur true reason", lastTypedPayload && lastTypedPayload.reason, "PARAMETER_NOT_FOUND");

	resetRouting();
	assertEq("classify nonexistent true", CommandParser.classify("Gaussian Blur NonexistentParameter true", TEST_EFFECTS, {}).kind, "typed");
	assertEq("route nonexistent true", route("Gaussian Blur NonexistentParameter true").path, "typed");
	assertEq("nonexistent true does not apply", applyCalls, 0);
	assertEq("nonexistent true reason", lastTypedPayload && lastTypedPayload.reason, "PARAMETER_NOT_FOUND");

	resetRouting();
	assertEq("classify Uniform Blur false", CommandParser.classify("Gaussian Blur Uniform Blur false", TEST_EFFECTS, {}).kind, "typed");
	assertEq("route Uniform Blur false", route("Gaussian Blur Uniform Blur false").path, "typed");
	assertEq("Uniform Blur false does not apply", applyCalls, 0);
	assert("Uniform Blur false payload", lastTypedPayload && lastTypedPayload.ok === false);

	resetRouting();
	assertEq("clip Scale not effect apply", CommandParser.parseClipParameter("Scale 120", TEST_EFFECTS, {}).isClipParameter, true);
	assertEq("clip Position not effect apply", CommandParser.parseClipParameter("Position 0.6 0.5", TEST_EFFECTS, {}).isClipParameter, true);
	assertEq("Scale 120 parse still numeric-shaped", CommandParser.parse("Scale 120", TEST_EFFECTS, {}).isCommand, true);
	assertEq("Scale 120 has no effect", CommandParser.parse("Scale 120", TEST_EFFECTS, {}).effect, null);

	function routeLikePanel(query) {
		var parsed;
		var classified;
		var clipCmd;
		parsed = CommandParser.parse(query, TEST_EFFECTS, {});
		if (parsed.isCommand && parsed.effect) {
			return { path: parsed.parameterQuery ? "named-numeric" : "numeric" };
		}
		if (typeof CommandParser.parseClipParameter === "function") {
			clipCmd = CommandParser.parseClipParameter(query, TEST_EFFECTS, {});
			if (clipCmd && clipCmd.isClipParameter) {
				return { path: "clip", clipCmd: clipCmd };
			}
		}
		if (parsed.isCommand) {
			return { path: "numeric-no-effect" };
		}
		classified = CommandParser.classify(query, TEST_EFFECTS, {});
		if (classified && classified.kind === "typed") {
			return { path: "typed" };
		}
		EffectExecutor.applyEffect(null, classified.effect ? classified.effect.premiereName : "", function () {});
		return { path: "effect" };
	}

	resetRouting();
	assertEq("panel Scale path", routeLikePanel("Scale 120").path, "clip");
	assertEq("panel Scale does not apply", applyCalls, 0);
	resetRouting();
	assertEq("panel Position path", routeLikePanel("Position 0.6 0.5").path, "clip");
	assertEq("panel Position does not apply", applyCalls, 0);
	resetRouting();
	assertEq("panel Rotation path", routeLikePanel("Rotation 30").path, "clip");
	assertEq("panel Rotation does not apply", applyCalls, 0);
	resetRouting();
	assertEq("panel Uniform Scale path", routeLikePanel("Uniform Scale false").path, "clip");
	assertEq("panel Uniform Scale does not apply", applyCalls, 0);
	resetRouting();
	assertEq("panel invalid Position path", routeLikePanel("Position 0.5").path, "clip");
	assertEq("panel invalid Position does not apply", applyCalls, 0);
	resetRouting();
	assertEq("panel Gaussian Blur 50 still numeric", routeLikePanel("Gaussian Blur 50").path, "numeric");
	assertEq("panel Gaussian Blur 50 does not apply", applyCalls, 0);
	resetRouting();
	assertEq("panel Gaussian Blur Amount still numeric", routeLikePanel("Gaussian Blur Amount 80").path, "named-numeric");
	assertEq("panel Directional Blur still numeric", routeLikePanel("Directional Blur 35").path, "numeric");
	resetRouting();
	assertEq("panel Opacity path", routeLikePanel("Opacity 50").path, "clip");
	assertEq("panel Opacity does not apply", applyCalls, 0);
	resetRouting();
	assertEq("panel Scale Height path", routeLikePanel("Scale Height 120").path, "clip");
	assertEq("panel Scale Height does not apply", applyCalls, 0);
	resetRouting();
	assertEq("panel Crop Left path", routeLikePanel("Crop Left 10").path, "clip");
	assertEq("panel Crop Left does not apply", applyCalls, 0);
	resetRouting();
	assertEq("panel Anti-flicker path", routeLikePanel("Anti-flicker Filter 1").path, "clip");
	assertEq("panel Anti-flicker does not apply", applyCalls, 0);
}());
