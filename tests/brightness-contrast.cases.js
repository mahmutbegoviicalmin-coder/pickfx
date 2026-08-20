(function () {
	var EFFECTS = [
		{ name: "Gaussian Blur", premiereName: "Gaussian Blur" },
		{ name: "Brightness & Contrast", premiereName: "Brightness & Contrast" },
		{ name: "Lumetri Color", premiereName: "Lumetri Color" },
		{ name: "Hue/Saturation", premiereName: "Hue/Saturation" },
		{ name: "Tint", premiereName: "Tint" },
		{ name: "Exposure", premiereName: "Exposure" },
		{ name: "Opacity", premiereName: "Opacity" }
	];
	var ALIASES = {
		gaussian: ["Gaussian Blur"],
		lumetri: ["Lumetri Color"]
	};
	var parsed;
	var clipCmd;

	function assertNamed(query, effectName, parameterName, value) {
		parsed = CommandParser.parse(query, EFFECTS, ALIASES);
		clipCmd = CommandParser.parseClipParameter(query, EFFECTS, ALIASES);
		assertEq(query + " is command", parsed.isCommand, true);
		assertEq(query + " effect", parsed.effect && parsed.effect.name, effectName);
		assertEq(query + " parameter", parsed.parameterQuery, parameterName);
		assertEq(query + " value", parsed.value, value);
		assertEq(query + " not clip", clipCmd.isClipParameter, false);
		assertEq(query + " effect numeric", clipCmd.handledByEffectNumeric, true);
	}

	assertNamed("Brightness 20", "Brightness & Contrast", "Brightness", 20);
	assertNamed("brightness 20", "Brightness & Contrast", "Brightness", 20);
	assertNamed("Contrast 20", "Brightness & Contrast", "Contrast", 20);
	assertNamed("contrast 20", "Brightness & Contrast", "Contrast", 20);
	assertNamed("Contrast 30", "Brightness & Contrast", "Contrast", 30);
	assertNamed("contrast 30", "Brightness & Contrast", "Contrast", 30);
	assertNamed("Brightness -20", "Brightness & Contrast", "Brightness", -20);
	assertNamed("Contrast -20", "Brightness & Contrast", "Contrast", -20);
	assertNamed("Brightness & Contrast Brightness 20", "Brightness & Contrast", "Brightness", 20);
	assertNamed("Brightness & Contrast Contrast 20", "Brightness & Contrast", "Contrast", 20);

	parsed = CommandParser.parse("Brightness 20", EFFECTS, ALIASES);
	assertEq("Brightness 20 never Contrast leftover", parsed.parameterQuery, "Brightness");

	parsed = CommandParser.parse("Contrast 20", EFFECTS, ALIASES);
	assertEq("Contrast 20 never Brightness leftover", parsed.parameterQuery, "Contrast");

	parsed = CommandParser.parse("Gaussian Blur 23", EFFECTS, ALIASES);
	clipCmd = CommandParser.parseClipParameter("Gaussian Blur 23", EFFECTS, ALIASES);
	assertEq("Gaussian Blur 23 effect", parsed.effect && parsed.effect.name, "Gaussian Blur");
	assertEq("Gaussian Blur 23 leftover empty", parsed.parameterQuery, "");
	assertEq("Gaussian Blur 23 value", parsed.value, 23);
	assertEq("Gaussian Blur 23 not clip", clipCmd.isClipParameter, false);

	parsed = CommandParser.parse("Gaussian Blur Amount 23", EFFECTS, ALIASES);
	assertEq("Gaussian Blur Amount 23 effect", parsed.effect && parsed.effect.name, "Gaussian Blur");
	assertEq("Gaussian Blur Amount 23 leftover", parsed.parameterQuery, "Amount");
	assertEq("Gaussian Blur Amount 23 value", parsed.value, 23);

	parsed = CommandParser.parse("Brightness & Contrast 25", EFFECTS, ALIASES);
	assertEq("full effect numeric leftover empty", parsed.parameterQuery, "");
	assertEq("full effect numeric effect", parsed.effect && parsed.effect.name, "Brightness & Contrast");

	clipCmd = CommandParser.parseClipParameter("Temperature 10", EFFECTS, ALIASES);
	assertEq("Temperature still clip", clipCmd.parameterQuery, "Temperature");
	clipCmd = CommandParser.parseClipParameter("Saturation 80", EFFECTS, ALIASES);
	assertEq("Saturation still clip", clipCmd.parameterQuery, "Saturation");
	clipCmd = CommandParser.parseClipParameter("Lumetri Color Contrast 20", EFFECTS, ALIASES);
	assertEq("prefixed Lumetri Contrast still clip", clipCmd.parameterQuery, "Contrast");
}());
