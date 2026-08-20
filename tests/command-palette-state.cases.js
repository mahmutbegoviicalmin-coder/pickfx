(function () {
	var EFFECTS = [
		{ name: "Gaussian Blur", premiereName: "Gaussian Blur" }
	];
	var state;
	var msg;

	function preview(kind, extra) {
		var out = { kind: kind };
		var key;
		if (extra) {
			for (key in extra) {
				if (extra.hasOwnProperty(key)) {
					out[key] = extra[key];
				}
			}
		}
		return out;
	}

	state = CommandPaletteState.fromInputs("", preview("empty"), []);
	assertEq("empty is idle", state.kind, "idle");
	assertEq("empty hides custom", state.showCustom, false);
	assertEq("empty does not execute", state.shouldExecute, false);

	state = CommandPaletteState.fromInputs("Gaussian Blur 30", preview("effect-command", {
		effect: EFFECTS[0],
		value: 30
	}), [{ effect: EFFECTS[0] }]);
	assertEq("gaussian command is supported", state.kind, "supported");
	assertEq("gaussian hides custom", state.showCustom, false);
	assertEq("gaussian should execute", state.shouldExecute, true);

	state = CommandPaletteState.fromInputs("Scale 120", preview("parameter-command", {
		parameter: "Scale",
		productionEnabled: true
	}), []);
	assertEq("scale is supported", state.kind, "supported");
	assertEq("scale hides custom", state.showCustom, false);

	state = CommandPaletteState.fromInputs("Brightness 20", preview("effect-command"), []);
	assertEq("brightness command is supported", state.showCustom, false);

	state = CommandPaletteState.fromInputs("temperature 30", preview("unknown-command", {
		parameter: "temperature"
	}), []);
	assertEq("unknown temperature is custom", state.kind, "custom");
	assertEq("unknown temperature shows custom", state.showCustom, true);
	assertEq("unknown temperature title is exact input", state.title, "temperature 30");
	assertEq("unknown temperature subtitle", state.subtitle, "Custom command");
	assertEq("unknown temperature section", state.section, "CUSTOM");
	assertEq("unknown temperature does not execute", state.shouldExecute, false);

	state = CommandPaletteState.fromInputs("hello world", preview("effect-search"), []);
	assertEq("hello world is custom", state.kind, "custom");
	assertEq("hello world exact input", state.title, "hello world");
	assertEq("hello world no execute", state.shouldExecute, false);

	state = CommandPaletteState.fromInputs("make it cinematic", preview("effect-search"), []);
	assertEq("cinematic is custom", state.showCustom, true);
	assertEq("cinematic exact input", state.query, "make it cinematic");

	state = CommandPaletteState.fromInputs("some random command", preview("effect-search"), []);
	assertEq("random is custom", state.showCustom, true);

	state = CommandPaletteState.fromInputs("zzzzzz", preview("effect-search"), []);
	assertEq("no search matches is custom", state.showCustom, true);

	state = CommandPaletteState.fromInputs("gauss", preview("effect-search"), [{ effect: EFFECTS[0] }]);
	assertEq("search matches hide custom", state.showCustom, false);
	assertEq("search matches execute", state.shouldExecute, true);

	state = CommandPaletteState.fromInputs("Gaussian Blur 30", preview("effect-command"), [{ effect: EFFECTS[0] }]);
	assertEq("supported never pairs with custom", state.showCustom, false);

	state = CommandPaletteState.fromInputs("foobar 123", preview("unknown-command"), []);
	assertEq("unknown numeric is custom", state.showCustom, true);
	assertEq("unknown numeric exact", state.title, "foobar 123");

	msg = CommandPaletteState.unsupportedFeedback();
	assertEq("unsupported title", msg.title, "Command not supported yet");
	assertEq("unsupported detail", msg.detail, "Try searching for an effect or parameter.");
	assert("unsupported has no internal code", !CommandPaletteState.containsInternalCode(msg.title + " " + msg.detail + " " + msg.footer));

	msg = CommandPaletteState.successView({
		ok: true,
		command: true,
		clipParameter: true,
		parameter: "Temperature",
		value: 239
	});
	assertEq("success temperature title", msg.title, "✓ Temperature 239");
	assertEq("success temperature detail", msg.detail, "Applied successfully");
	assertEq("success temperature footer", msg.footer, "Applied successfully");
	assertEq("success temperature hold", msg.holdMs, 1800);
	assertEq("success temperature restore", msg.restorePalette, true);
	assert("success temperature no codes", !CommandPaletteState.containsInternalCode(msg.title + msg.detail + msg.footer));
	assert("success temperature no updated", String(msg.title + msg.detail).indexOf("updated") === -1);
	assert("success temperature no filename", String(msg.detail).indexOf("clip") === -1);

	msg = CommandPaletteState.successView({
		ok: true,
		command: true,
		clipParameter: true,
		parameter: "Saturation",
		value: 40
	});
	assertEq("success saturation title", msg.title, "✓ Saturation 40");
	assertEq("success saturation detail", msg.detail, "Applied successfully");

	msg = CommandPaletteState.successView({
		ok: true,
		command: true,
		effect: "Gaussian Blur",
		parameter: "Blurriness",
		value: 30
	});
	assertEq("success gaussian title", msg.title, "✓ Gaussian Blur 30");
	assertEq("success gaussian detail", msg.detail, "Applied successfully");

	assertEq("recent temperature", CommandPaletteState.recentLabel({
		ok: true,
		clipParameter: true,
		parameter: "Temperature",
		value: 239
	}, "temperature 239"), "Temperature 239");
	assertEq("recent saturation", CommandPaletteState.recentLabel({
		ok: true,
		clipParameter: true,
		parameter: "Saturation",
		value: 40
	}, "saturation 40"), "Saturation 40");
	assertEq("recent gaussian", CommandPaletteState.recentLabel({
		ok: true,
		effect: "Gaussian Blur",
		value: 30
	}, "Gaussian Blur 30"), "Gaussian Blur 30");

	assert("success hold is 1.5-2s", CommandPaletteState.SUCCESS_HOLD_MS >= 1500 && CommandPaletteState.SUCCESS_HOLD_MS <= 2000);
	assertEq("applying label", CommandPaletteState.applyingLabel(), "Applying...");

	msg = CommandPaletteState.userFacingMessage({
		ok: false,
		reason: "NO_VIDEO_SELECTION"
	});
	assertEq("no video title", msg.title, "Select a video clip");
	assertEq("no video detail", msg.detail, "Choose a clip in the timeline to use PickFX.");
	assert("no video hides code", !CommandPaletteState.containsInternalCode(msg.title + msg.detail + msg.footer));

	msg = CommandPaletteState.userFacingMessage({
		ok: false,
		reason: "MULTIPLE_CLIPS_SELECTED"
	});
	assertEq("multi clip title", msg.title, "Select one clip");
	assertEq("multi clip detail", msg.detail, "PickFX works on one selected video clip at a time.");
	assert("multi clip hides code", !CommandPaletteState.containsInternalCode(msg.title + msg.detail + msg.footer));

	msg = CommandPaletteState.userFacingMessage({
		ok: false,
		reason: "UNSUPPORTED_TYPE",
		status: "Parameter type not writable yet."
	});
	assertEq("unsupported type title", msg.title, "Not supported yet");
	assertEq("unsupported type detail", msg.detail, "This parameter can't be changed by PickFX yet.");
	assert("unsupported type hides code", !CommandPaletteState.containsInternalCode(msg.title + msg.detail + msg.footer));
	assert("unsupported type hides status code path", String(msg.footer).indexOf("UNSUPPORTED_TYPE") === -1);

	msg = CommandPaletteState.userFacingMessage({
		ok: false,
		reason: "PARAMETER_NOT_FOUND",
		status: "Parameter not found."
	});
	assertEq("param not found title", msg.title, "Parameter not found");
	assertEq("param not found detail", msg.detail, "We couldn't find that parameter on the selected clip.");
	assert("param not found hides code", !CommandPaletteState.containsInternalCode(msg.title + msg.footer + msg.detail));

	msg = CommandPaletteState.userFacingMessage({
		ok: false,
		reason: "VALUE_NOT_VERIFIED",
		status: "VALUE_NOT_VERIFIED"
	});
	assertEq("verify title", msg.title, "Couldn't verify the change");
	assertEq("verify detail", msg.detail, "The value could not be confirmed. Try again.");
	assert("verify hides code", !CommandPaletteState.containsInternalCode(msg.title + msg.detail + msg.footer));

	msg = CommandPaletteState.userFacingMessage({
		uiKind: "unsupported-custom",
		reason: "UNSUPPORTED_TYPE"
	});
	assertEq("custom ui kind", msg.title, "Command not supported yet");
	assertEq("custom ui footer", msg.footer, "Command not supported yet");
	assertEq("custom ui detail", msg.detail, "Try searching for an effect or parameter.");

	msg = CommandPaletteState.userFacingMessage({
		ok: false,
		reason: "PARAMETER_NOT_FOUND",
		uiKind: "multiple-lumetri",
		componentMatchCount: 3,
		detail: 'Component identity "Lumetri Color" / "AE.ADBE Lumetri" is ambiguous across 3 components.',
		status: "Parameter not found."
	});
	assertEq("multiple lumetri title", msg.title, "Multiple Lumetri effects found");
	assertEq("multiple lumetri detail", msg.detail, "Select a clip with one Lumetri Color effect to use this command.");
	assertEq("multiple lumetri footer", msg.footer, "Multiple Lumetri effects found");
	assert("multiple lumetri hides code", !CommandPaletteState.containsInternalCode(msg.title + msg.detail + msg.footer));

	msg = CommandPaletteState.userFacingMessage({
		ok: false,
		reason: "NEEDS_LUMETRI_CHOICE",
		uiKind: "choose-lumetri",
		componentMatchCount: 3,
		choices: [{ title: "Lumetri Color", componentIndex: 2 }]
	});
	assertEq("choose lumetri title", msg.title, "Choose Lumetri");
	assert("choose lumetri hides multiple error", msg.title !== "Multiple Lumetri effects found");
	assert("choose lumetri hides code", !CommandPaletteState.containsInternalCode(msg.title + msg.detail + msg.footer));

	msg = CommandPaletteState.userFacingMessage({
		ok: false,
		reason: "NEEDS_PARAMETER_CHOICE",
		uiKind: "choose-parameter",
		choices: [{ title: "Basic Correction", subtitle: "Saturation · 100" }]
	});
	assertEq("choose parameter title", msg.title, "Choose Parameter");
	assert("choose parameter hides code", !CommandPaletteState.containsInternalCode(msg.title + msg.detail + msg.footer));
	assert("choose parameter hides needs code", String(msg.title + msg.detail + msg.footer).indexOf("NEEDS_PARAMETER_CHOICE") === -1);

	msg = CommandPaletteState.userFacingMessage({
		ok: false,
		reason: "PARAMETER_NOT_FOUND",
		uiKind: "no-lumetri",
		componentMatchCount: 0,
		detail: 'No component matching displayName "Lumetri Color" and matchName "AE.ADBE Lumetri".',
		status: "Parameter not found."
	});
	assertEq("no lumetri title", msg.title, "No Lumetri Color effect found");
	assertEq("no lumetri detail", msg.detail, "Select a clip with one Lumetri Color effect to use this command.");
	assert("no lumetri hides code", !CommandPaletteState.containsInternalCode(msg.title + msg.detail + msg.footer));

	msg = CommandPaletteState.userFacingMessage({
		ok: false,
		uiKind: "stale-parameter",
		reason: "PARAMETER_NOT_FOUND"
	});
	assertEq("stale parameter title", msg.title, "Couldn't apply the command");
	assertEq("stale parameter detail", msg.detail, "The selected Lumetri control changed. Try again.");

	msg = CommandPaletteState.userFacingMessage({
		ok: false,
		uiKind: "stale-lumetri",
		reason: "PARAMETER_NOT_FOUND"
	});
	assertEq("stale lumetri title", msg.title, "Couldn't apply the command");
	assertEq("stale lumetri detail", msg.detail, "The selected Lumetri control changed. Try again.");

	assert("sanitize hides code", CommandPaletteState.sanitizeVisibleText("Clip A · UNSUPPORTED_TYPE").indexOf("UNSUPPORTED_TYPE") === -1);
	assert("sanitize parameter code gone", CommandPaletteState.sanitizeVisibleText("PARAMETER_NOT_FOUND").indexOf("PARAMETER_NOT_FOUND") === -1);
	assert("sanitize never leaves needs code", CommandPaletteState.sanitizeVisibleText("NEEDS_PARAMETER_CHOICE").indexOf("NEEDS") === -1);
}());
