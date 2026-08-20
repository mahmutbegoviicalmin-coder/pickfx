(function () {
	var EFFECTS = [
		{ name: "Gaussian Blur", premiereName: "Gaussian Blur" },
		{ name: "Brightness & Contrast", premiereName: "Brightness & Contrast" },
		{ name: "Lumetri Color", premiereName: "Lumetri Color" },
		{ name: "Tint", premiereName: "Tint" },
		{ name: "Exposure", premiereName: "Exposure" },
		{ name: "Opacity", premiereName: "Opacity" },
		{ name: "Hue/Saturation", premiereName: "Hue/Saturation" },
		{ name: "Crop", premiereName: "Crop" },
		{ name: "Color Temperature", premiereName: "Color Temperature" }
	];
	var ALIASES = {
		gaussian: ["Gaussian Blur"],
		lumetri: ["Lumetri Color"]
	};
	var routed;
	var parsed;
	var clipCmd;
	var preview;

	function routeLikePanel(query) {
		var panelParsed;
		var panelClip;
		var classified;
		panelParsed = CommandParser.parse(query, EFFECTS, ALIASES);
		if (panelParsed.isCommand && panelParsed.effect) {
			return {
				path: panelParsed.parameterQuery ? "named-numeric" : "numeric",
				effect: panelParsed.effect.name,
				parameterQuery: panelParsed.parameterQuery || "",
				value: panelParsed.value
			};
		}
		if (typeof CommandParser.parseClipParameter === "function") {
			panelClip = CommandParser.parseClipParameter(query, EFFECTS, ALIASES);
			if (panelClip && panelClip.isClipParameter) {
				preview = CommandPreview.fromQuery(query, EFFECTS, ALIASES);
				return {
					path: preview.kind === "parameter-command" ? "clip" : "unknown-clip",
					parameterQuery: panelClip.parameterQuery,
					component: preview.component || "",
					value: panelClip.value,
					previewKind: preview.kind
				};
			}
		}
		if (panelParsed.isCommand) {
			return {
				path: "numeric-no-effect",
				parameterQuery: panelParsed.effectQuery,
				value: panelParsed.value
			};
		}
		classified = CommandParser.classify(query, EFFECTS, ALIASES);
		if (classified && classified.kind === "typed") {
			return {
				path: "typed",
				effect: classified.effect && classified.effect.name,
				leftover: classified.leftover
			};
		}
		return {
			path: "effect",
			effect: classified.effect && classified.effect.name
		};
	}

	function assertClip(query, parameterName, componentName, value) {
		parsed = CommandParser.parse(query, EFFECTS, ALIASES);
		clipCmd = CommandParser.parseClipParameter(query, EFFECTS, ALIASES);
		preview = CommandPreview.fromQuery(query, EFFECTS, ALIASES);
		routed = routeLikePanel(query);
		assertEq(query + " parse skips effect", parsed.effect, null);
		assertEq(query + " clip", clipCmd.isClipParameter, true);
		assertEq(query + " clip name", clipCmd.parameterQuery, parameterName);
		assertEq(query + " clip value", clipCmd.value, value);
		assertEq(query + " preview", preview.kind, "parameter-command");
		assertEq(query + " preview component", preview.component, componentName);
		assertEq(query + " preview parameter", preview.parameter, parameterName);
		assertEq(query + " panel path", routed.path, "clip");
		assertEq(query + " panel parameter", routed.parameterQuery, parameterName);
	}

	function assertNumeric(query, effectName, value) {
		parsed = CommandParser.parse(query, EFFECTS, ALIASES);
		clipCmd = CommandParser.parseClipParameter(query, EFFECTS, ALIASES);
		preview = CommandPreview.fromQuery(query, EFFECTS, ALIASES);
		routed = routeLikePanel(query);
		assertEq(query + " parse is command", parsed.isCommand, true);
		assertEq(query + " parse effect", parsed.effect && parsed.effect.name, effectName);
		assertEq(query + " parse leftover empty", parsed.parameterQuery, "");
		assertEq(query + " parse value", parsed.value, value);
		assertEq(query + " not clip", clipCmd.isClipParameter, false);
		assertEq(query + " effect numeric flag", clipCmd.handledByEffectNumeric, true);
		assertEq(query + " preview", preview.kind, "effect-command");
		assertEq(query + " panel path", routed.path, "numeric");
		assertEq(query + " panel effect", routed.effect, effectName);
	}

	function assertNamedNumeric(query, effectName, parameterName, value) {
		parsed = CommandParser.parse(query, EFFECTS, ALIASES);
		clipCmd = CommandParser.parseClipParameter(query, EFFECTS, ALIASES);
		routed = routeLikePanel(query);
		assertEq(query + " parse effect", parsed.effect && parsed.effect.name, effectName);
		assertEq(query + " parse leftover", parsed.parameterQuery, parameterName);
		assertEq(query + " parse value", parsed.value, value);
		assertEq(query + " not clip", clipCmd.isClipParameter, false);
		assertEq(query + " effect numeric flag", clipCmd.handledByEffectNumeric, true);
		assertEq(query + " panel path", routed.path, "named-numeric");
	}

	function assertApply(query, effectName) {
		parsed = CommandParser.parse(query, EFFECTS, ALIASES);
		routed = routeLikePanel(query);
		assertEq(query + " not numeric command", parsed.isCommand, false);
		assertEq(query + " panel path", routed.path, "effect");
		assertEq(query + " panel effect", routed.effect, effectName);
	}

	assertClip("Temperature 10", "Temperature", "Lumetri Color", 10);
	assertClip("temperature 30", "Temperature", "Lumetri Color", 30);
	assertClip("TEMPERATURE 30", "Temperature", "Lumetri Color", 30);
	assertClip("TeMpErAtUrE 30", "Temperature", "Lumetri Color", 30);
	assertClip("Lumetri Color Temperature 10", "Temperature", "Lumetri Color", 10);
	assertClip("Lumetri Color Temperature 30", "Temperature", "Lumetri Color", 30);
	assertClip("lumetri color temperature 20", "Temperature", "Lumetri Color", 20);
	assertClip("LUMETRI COLOR TEMPERATURE 30", "Temperature", "Lumetri Color", 30);
	assertClip("Scale 120", "Scale", "Motion", 120);
	assertClip("scale 120", "Scale", "Motion", 120);
	assertClip("SCALE 120", "Scale", "Motion", 120);
	assertClip("Opacity 80", "Opacity", "Opacity", 80);
	assertClip("Crop Left 10", "Crop Left", "Motion", 10);
	assertClip("Tint 5", "Tint", "Lumetri Color", 5);
	assertClip("Lumetri Color Tint 5", "Tint", "Lumetri Color", 5);
	assertClip("Exposure 1.25", "Exposure", "Lumetri Color", 1.25);
	assertClip("Lumetri Color Exposure 1.25", "Exposure", "Lumetri Color", 1.25);
	assertClip("Lumetri Color Contrast 20", "Contrast", "Lumetri Color", 20);
	assertClip("Saturation 80", "Saturation", "Lumetri Color", 80);
	assertClip("Lumetri Color Saturation 80", "Saturation", "Lumetri Color", 80);
	assertClip("Opacity 50", "Opacity", "Opacity", 50);

	assertNumeric("Gaussian Blur 50", "Gaussian Blur", 50);
	assertNumeric("gaussian blur 30", "Gaussian Blur", 30);
	assertNumeric("GAUSSIAN BLUR 30", "Gaussian Blur", 30);
	assertNamedNumeric("Gaussian Blur Amount 80", "Gaussian Blur", "Amount", 80);
	assertNamedNumeric("Gaussian Blur Amount 30", "Gaussian Blur", "Amount", 30);
	assertApply("Gaussian Blur", "Gaussian Blur");
	assertNumeric("Brightness & Contrast 25", "Brightness & Contrast", 25);
	assertApply("Brightness & Contrast", "Brightness & Contrast");
	assertNamedNumeric("Gaussian Blur Blurriness 12", "Gaussian Blur", "Blurriness", 12);
	assertNumeric("Hue/Saturation 40", "Hue/Saturation", 40);
	assertClip("Gaussian Blur Temperature 10", "Temperature", "Lumetri Color", 10);

	clipCmd = CommandParser.parseClipParameter("Gaussian Blur Uniform Blur true", EFFECTS, ALIASES);
	assertEq("typed leftover still effect typed", clipCmd.handledByEffectTyped, true);
	assertEq("typed leftover not clip", clipCmd.isClipParameter, false);

	assertEq("Crop 10 stays effect numeric", routeLikePanel("Crop 10").path, "numeric");
	assertEq("Left 10 stays Crop.Left", routeLikePanel("Left 10").parameterQuery, "Left");
}());
