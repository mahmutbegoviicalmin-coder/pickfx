(function () {
	var TEST_EFFECTS = [
		{ name: "Gaussian Blur", premiereName: "Gaussian Blur" },
		{ name: "Directional Blur", premiereName: "Directional Blur" },
		{ name: "Brightness & Contrast", premiereName: "Brightness & Contrast" },
		{ name: "Lumetri Color", premiereName: "Lumetri Color" },
		{ name: "Sharpen", premiereName: "Sharpen" }
	];
	var preview;
	var card;

	function fromQuery(query) {
		return CommandPreview.fromQuery(query, TEST_EFFECTS, {});
	}

	preview = fromQuery("");
	assertEq("empty query kind", preview.kind, "empty");

	preview = fromQuery("Gaussian Blur");
	assertEq("effect search gaussian", preview.kind, "effect-search");
	preview = fromQuery("Lumetri");
	assertEq("effect search lumetri", preview.kind, "effect-search");
	preview = fromQuery("Sharpen");
	assertEq("effect search sharpen", preview.kind, "effect-search");
	preview = fromQuery("Directional Blur");
	assertEq("effect search directional", preview.kind, "effect-search");

	preview = fromQuery("Gaussian Blur 50");
	assertEq("effect command gaussian", preview.kind, "effect-command");
	assertEq("effect command not empty effects", preview.kind === "unknown-command", false);

	preview = fromQuery("Scale 120");
	assertEq("scale kind", preview.kind, "parameter-command");
	assertEq("scale title", preview.title, "Scale");
	assertEq("scale subtitle", preview.subtitle, "Motion parameter");
	assertEq("scale component", preview.component, "Motion");
	assertEq("scale parameter", preview.parameter, "Scale");
	assertEq("scale value", preview.valueLines[0], "120%");
	assertEq("scale hint", preview.hint, "Enter to apply");

	preview = fromQuery("Scale Width 80");
	assertEq("scale width kind", preview.kind, "parameter-command");
	assertEq("scale width value", preview.valueLines[0], "80%");
	assertEq("scale width component", preview.component, "Motion");

	preview = fromQuery("Rotation 30");
	assertEq("rotation kind", preview.kind, "parameter-command");
	assertEq("rotation title", preview.title, "Rotation");
	assertEq("rotation value", preview.valueLines[0], "30");

	preview = fromQuery("Uniform Scale false");
	assertEq("uniform kind", preview.kind, "parameter-command");
	assertEq("uniform value", preview.valueLines[0], "false");

	preview = fromQuery("Position 0.6 0.5");
	assertEq("position kind", preview.kind, "parameter-command");
	assertEq("position x", preview.valueLines[0], "X 0.6");
	assertEq("position y", preview.valueLines[1], "Y 0.5");

	preview = fromQuery("Anchor Point 0.5 0.5");
	assertEq("anchor kind", preview.kind, "parameter-command");
	assertEq("anchor x", preview.valueLines[0], "X 0.5");

	preview = fromQuery("Opacity 75");
	assertEq("opacity kind", preview.kind, "parameter-command");
	assertEq("opacity component", preview.component, "Opacity");
	assertEq("opacity value", preview.valueLines[0], "75%");

	preview = fromQuery("Crop Left 10");
	assertEq("motion crop left kind", preview.kind, "parameter-command");
	assertEq("motion crop left component", preview.component, "Motion");
	assertEq("motion crop left parameter", preview.parameter, "Crop Left");
	assertEq("motion crop left title", preview.title, "Crop Left");
	assertEq("motion crop left value", preview.valueLines[0], "10%");

	preview = fromQuery("Crop Top 5");
	assertEq("motion crop top kind", preview.kind, "parameter-command");
	preview = fromQuery("Crop Right 10");
	assertEq("motion crop right kind", preview.kind, "parameter-command");
	preview = fromQuery("Crop Bottom 10");
	assertEq("motion crop bottom kind", preview.kind, "parameter-command");

	preview = fromQuery("Left 10");
	assertEq("crop left kind", preview.kind, "parameter-command");
	assertEq("crop left component", preview.component, "Crop");
	assertEq("crop left title", preview.title, "Crop");
	assertEq("crop left subtitle", preview.subtitle, "Left");
	assertEq("crop left value", preview.valueLines[0], "10%");

	preview = fromQuery("Edge Feather 10");
	assertEq("edge feather kind", preview.kind, "parameter-command");
	assertEq("edge feather component", preview.component, "Crop");
	assertEq("edge feather subtitle", preview.subtitle, "Edge Feather");
	assertEq("edge feather value", preview.valueLines[0], "10%");

	preview = fromQuery("foobar 123");
	assertEq("unknown command kind", preview.kind, "unknown-command");
	preview = fromQuery("notancommand 1");
	assertEq("unknown numeric kind", preview.kind, "unknown-command");

	preview = fromQuery("zzzzzz");
	assertEq("unknown search stays effect-search", preview.kind, "effect-search");

	preview = fromQuery("Position 0.5");
	assertEq("invalid position still command", preview.kind, "parameter-command");
	assertEq("invalid position reason", preview.reason, "INVALID_VALUE");

	preview = fromQuery("Temperature 10");
	assertEq("temperature kind", preview.kind, "parameter-command");
	assertEq("temperature component", preview.component, "Lumetri Color");

	preview = fromQuery("Lumetri Color Temperature 10");
	assertEq("prefixed temperature kind", preview.kind, "parameter-command");
	assertEq("prefixed temperature parameter", preview.parameter, "Temperature");
	assertEq("prefixed temperature component", preview.component, "Lumetri Color");

	preview = fromQuery("Brightness & Contrast Contrast 40");
	assertEq("named contrast kind", preview.kind, "effect-command");
	assertEq("named contrast parameter", preview.parameter, "Contrast");
	assertEq("named contrast effect", preview.effect && preview.effect.name, "Brightness & Contrast");

	preview = fromQuery("Brightness & Contrast 25");
	assertEq("brightness numeric still effect command", preview.kind, "effect-command");

	card = CommandPreview.fromApply({
		ok: true,
		clipParameter: true,
		parameter: "Temperature",
		value: 239,
		selectedCount: 1,
		successfulCount: 1,
		failedCount: 0,
		clips: [{ clip: "Clip A", ok: true, verified: true }]
	});
	assertEq("apply temperature headline", card.headline, "✓ Temperature 239");
	assertEq("apply temperature detail", card.detail, "Applied successfully");
	assertEq("apply temperature state", card.state, "ok");
	assertEq("apply temperature no clip lines", card.clipLines.length, 0);
	assert("apply temperature no updated", String(card.headline + card.detail).indexOf("updated") === -1);

	card = CommandPreview.fromApply({
		ok: true,
		clipParameter: true,
		parameter: "Saturation",
		value: 40,
		selectedCount: 1,
		successfulCount: 1,
		failedCount: 0,
		clips: [{ clip: "Clip A", ok: true, verified: true }]
	});
	assertEq("apply saturation headline", card.headline, "✓ Saturation 40");
	assertEq("apply saturation detail", card.detail, "Applied successfully");

	card = CommandPreview.fromApply({
		ok: true,
		command: true,
		effect: "Gaussian Blur",
		parameter: "Blurriness",
		value: 30,
		selectedCount: 1,
		successfulCount: 1,
		failedCount: 0,
		clips: [{ clip: "Interview.mp4", ok: true, verified: true }]
	});
	assertEq("apply gaussian headline", card.headline, "✓ Gaussian Blur 30");
	assertEq("apply gaussian detail", card.detail, "Applied successfully");
	assertEq("apply gaussian no filenames", card.clipLines.length, 0);

	card = CommandPreview.fromApply({
		ok: true,
		clipParameter: true,
		parameter: "Scale",
		value: 120,
		selectedCount: 5,
		successfulCount: 5,
		failedCount: 0,
		clips: [
			{ clip: "A", ok: true, verified: true },
			{ clip: "B", ok: true, verified: true },
			{ clip: "C", ok: true, verified: true },
			{ clip: "D", ok: true, verified: true },
			{ clip: "E", ok: true, verified: true }
		]
	});
	assertEq("apply multi headline", card.headline, "✓ Scale 120");
	assertEq("apply multi detail", card.detail, "Applied successfully");
	assertEq("apply multi clip count", card.clipLines.length, 0);

	card = CommandPreview.fromApply({
		ok: false,
		clipParameter: true,
		parameter: "Scale",
		value: 120,
		selectedCount: 5,
		successfulCount: 4,
		failedCount: 1,
		clips: [
			{ clip: "A", ok: true, verified: true },
			{ clip: "B", ok: true, verified: true },
			{ clip: "C", ok: true, verified: true },
			{ clip: "D", ok: true, verified: true },
			{ clip: "E", ok: false, verified: false, reason: "PARAMETER_NOT_FOUND" }
		]
	});
	assertEq("apply partial state", card.state, "warn");
	assertEq("apply partial no clip lines", card.clipLines.length, 0);
	assert("apply partial hides code", String(card.headline + card.detail + card.clipLines.join(" ")).indexOf("PARAMETER_NOT_FOUND") === -1);
	assert("apply partial hides updated", String(card.detail).indexOf("updated") === -1);

	assertEq("gaussian parse still effect", CommandParser.parse("Gaussian Blur 50", TEST_EFFECTS, {}).effect.name, "Gaussian Blur");
	assertEq("scale parse still clip", CommandParser.parseClipParameter("Scale 120", TEST_EFFECTS, {}).isClipParameter, true);
}());
