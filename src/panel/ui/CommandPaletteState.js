var CommandPaletteState = (function () {
	var SUCCESS_HOLD_MS = 1800;
	var INTERNAL_CODES = [
		"UNSUPPORTED_TYPE",
		"PARAMETER_NOT_FOUND",
		"VALUE_NOT_VERIFIED",
		"WRITE_FAILED",
		"EFFECT_NOT_FOUND",
		"NO_NUMERIC_PARAMETER",
		"TYPE_NOT_WRITABLE",
		"VERIFY_FAILED",
		"PARAMETER_NOT_WRITABLE",
		"PARAMETER_TIME_VARYING_UNSUPPORTED",
		"UNSUPPORTED_OPERATION",
		"NO_VIDEO_SELECTION",
		"NO_AUDIO_SELECTION",
		"COMPONENT_NOT_FOUND",
		"KEYFRAMES_NOT_SUPPORTED",
		"INVALID_CLIP_DURATION",
		"KEYFRAME_CONFLICT",
		"NEEDS_PARAMETER_CHOICE",
		"NEEDS_LUMETRI_CHOICE",
		"INVALID_VALUE",
		"VALUE_OUT_OF_RANGE",
		"OUT_OF_RANGE",
		"MULTIPLE_CLIPS_SELECTED",
		"NO_EFFECT_SELECTED",
		"COMPONENTPARAM",
		"SETVALUE",
		"USEDQE",
		"PRESET_HOST_MODULE_LOAD_FAILED",
		"PRESET_HOST_NOT_READY",
		"PRESET_STORAGE_UNAVAILABLE",
		"PRESET_USER_SCOPE_UNAVAILABLE",
		"PRESET_CAPABILITY_PARITY_BUG",
		"ANIMATION_REPLAY_NOT_YET_VERIFIED",
		"CAPTURE_REQUIRES_SINGLE_CLIP",
		"CAPTURE_SOURCE_CHANGED",
		"PRESET_EFFECT_UNAVAILABLE",
		"NEW_EFFECT_INSTANCE_AMBIGUOUS",
		"EMPTY_PRESET",
		"EMPTY_NAME",
		"NAME_CONFLICT",
		"UNSUPPORTED_SCHEMA",
		"KEYFRAMED_PARAMETER_UNSUPPORTED",
		"TRACK_LOCKED",
		"QE_MAPPING_FAILED"
	];

	function trim(value) {
		return String(value || "").replace(/^\s+|\s+$/g, "");
	}

	function containsInternalCode(text) {
		var raw = String(text || "");
		var folded = raw.toUpperCase();
		var i;
		for (i = 0; i < INTERNAL_CODES.length; i++) {
			if (folded.indexOf(INTERNAL_CODES[i]) !== -1) {
				return true;
			}
		}
		return false;
	}

	function fromInputs(query, preview, searchMatches) {
		var raw = trim(query);
		var kind;
		if (!raw) {
			return {
				kind: "idle",
				showCustom: false,
				shouldExecute: false,
				query: ""
			};
		}
		kind = preview && preview.kind ? preview.kind : "";
		if (kind === "parameter-command" || kind === "effect-command") {
			return {
				kind: "supported",
				showCustom: false,
				shouldExecute: true,
				query: raw,
				previewKind: kind
			};
		}
		if (kind === "unknown-command") {
			return customState(raw);
		}
		if (searchMatches && searchMatches.length) {
			return {
				kind: "supported",
				showCustom: false,
				shouldExecute: true,
				query: raw,
				previewKind: kind || "effect-search"
			};
		}
		return customState(raw);
	}

	function customState(raw) {
		return {
			kind: "custom",
			showCustom: true,
			shouldExecute: false,
			query: raw,
			title: raw,
			subtitle: "Custom command",
			section: "CUSTOM"
		};
	}

	function unsupportedFeedback() {
		return {
			title: "Command not supported yet",
			detail: "Try searching for an effect or parameter.",
			footer: "Command not supported yet"
		};
	}

	function payloadDetail(payload) {
		return String((payload && payload.detail) || "");
	}

	function isMultipleLumetri(payload) {
		var detail;
		if (!payload) {
			return false;
		}
		if (payload.uiKind === "choose-lumetri" || payload.uiKind === "choose-parameter") {
			return false;
		}
		if (payload.uiKind === "multiple-lumetri") {
			return true;
		}
		if (typeof payload.componentMatchCount === "number" && payload.componentMatchCount > 1) {
			return true;
		}
		detail = payloadDetail(payload);
		return detail.indexOf("Lumetri Color") !== -1 &&
			detail.indexOf("ambiguous across") !== -1 &&
			detail.indexOf("components") !== -1 &&
			detail.indexOf("parameters inside") === -1;
	}

	function isMissingLumetri(payload) {
		var detail;
		if (!payload) {
			return false;
		}
		if (payload.uiKind === "no-lumetri") {
			return true;
		}
		if (payload.componentMatchCount === 0) {
			return true;
		}
		detail = payloadDetail(payload);
		return detail.indexOf('No component matching displayName "Lumetri Color"') !== -1;
	}

	function formatDisplayValue(value) {
		if (typeof value === "number" && isFinite(value)) {
			if (value === Math.floor(value)) {
				return String(value);
			}
			return String(value);
		}
		if (value === true || value === false) {
			return String(value);
		}
		if (value && typeof value.length === "number" && value.length === 2) {
			return String(value[0]) + " " + String(value[1]);
		}
		if (value === undefined || value === null || value === "") {
			return "";
		}
		return String(value);
	}

	function commandName(payload) {
		if (!payload) {
			return "Command";
		}
		if (payload.clipParameter && payload.parameter) {
			return String(payload.parameter);
		}
		if (payload.effect) {
			return String(payload.effect);
		}
		if (payload.parameter) {
			return String(payload.parameter);
		}
		if (payload.presetName) {
			return String(payload.presetName);
		}
		return "Command";
	}

	function successHeadline(payload) {
		var name = commandName(payload);
		var value = formatDisplayValue(payload && (payload.value !== undefined ? payload.value : payload.requestedValue));
		return "✓ " + name + (value !== "" ? " " + value : "");
	}

	function successView(payload) {
		var presetSummary;
		var effect = payload && (payload.effect || payload.component)
			? String(payload.effect || payload.component)
			: "";
		var parameter = payload && payload.parameter ? String(payload.parameter) : "";
		var value = formatDisplayValue(payload && (payload.value !== undefined ? payload.value : payload.requestedValue));
		var title = successHeadline(payload);
		var detail = "Applied successfully";
		if (typeof PresetExecutor !== "undefined" && PresetExecutor.userSummary && payload && payload.preset) {
			presetSummary = PresetExecutor.userSummary(payload);
			if (presetSummary) {
				return {
					title: "✓ " + presetSummary.title.replace(/^Applied\s+/, ""),
					detail: presetSummary.detail,
					footer: presetSummary.footer,
					holdMs: SUCCESS_HOLD_MS,
					restorePalette: true
				};
			}
		}
		if (effect && parameter && parameter !== effect) {
			title = "✓ " + effect;
			detail = trim(parameter + (value ? " " + value : ""));
		}
		return {
			title: title,
			detail: detail,
			footer: "Applied successfully",
			holdMs: SUCCESS_HOLD_MS,
			restorePalette: true
		};
	}

	function recentLabel(payload, query) {
		var name = commandName(payload);
		if (name && name !== "Command") {
			return name;
		}
		return trim(String(query || "")).replace(/\s+-?\d+(\.\d+)?$/, "");
	}

	function applyingLabel() {
		return "Applying...";
	}

	function userFacingMessage(payload) {
		var reason;
		var status;
		if (payload && payload.uiKind === "unsupported-custom") {
			return unsupportedFeedback();
		}
		if (payload && payload.uiKind === "choose-lumetri") {
			return {
				title: "Choose Lumetri",
				detail: "",
				footer: "Choose Lumetri"
			};
		}
		if (payload && payload.uiKind === "choose-parameter") {
			return {
				title: "Choose Parameter",
				detail: "",
				footer: "Choose Parameter"
			};
		}
		if (payload && payload.uiKind === "stale-lumetri" || payload && payload.uiKind === "stale-parameter") {
			return {
				title: "Couldn't apply the command",
				detail: "The selected Lumetri control changed. Try again.",
				footer: "Couldn't apply the command"
			};
		}
		if (isMultipleLumetri(payload)) {
			return {
				title: "Multiple Lumetri effects found",
				detail: "Select a clip with one Lumetri Color effect to use this command.",
				footer: "Multiple Lumetri effects found"
			};
		}
		if (isMissingLumetri(payload)) {
			return {
				title: "No Lumetri Color effect found",
				detail: "Select a clip with one Lumetri Color effect to use this command.",
				footer: "No Lumetri Color effect found"
			};
		}
		reason = payload && payload.reason ? String(payload.reason) : "";
		status = payload && payload.status ? String(payload.status) : "";
		if (reason === "PRESET_HOST_MODULE_LOAD_FAILED" || reason === "PRESET_HOST_NOT_READY" ||
				(payload && payload.capture === true && (reason === "SAFE_EXECUTOR_UNAVAILABLE" ||
					reason === "WRITE_FAILED" || /EvalScript/i.test(status + " " + (payload.detail || "") + " " + (payload.error || ""))))) {
			return {
				title: "Preset engine couldn't start",
				detail: "Reload PickFX and try again.",
				footer: "Preset engine couldn't start"
			};
		}
		if (reason === "NO_VIDEO_SELECTION") {
			return {
				title: "Select a video clip",
				detail: "Choose a clip in the timeline to use PickFX.",
				footer: "Select a video clip"
			};
		}
		if (reason === "CAPTURE_REQUIRES_SINGLE_CLIP" || reason === "MULTIPLE_CLIPS_SELECTED") {
			return {
				title: "Select one clip",
				detail: reason === "CAPTURE_REQUIRES_SINGLE_CLIP"
					? "Capture works on one selected clip."
					: "PickFX works on one selected video clip at a time.",
				footer: "Select one clip"
			};
		}
		if (reason === "CAPTURE_SOURCE_CHANGED") {
			return {
				title: "Clip changed",
				detail: "The selected clip changed. Capture again.",
				footer: "Clip changed"
			};
		}
		if (reason === "PRESET_STORAGE_UNAVAILABLE" || reason === "PRESET_USER_SCOPE_UNAVAILABLE") {
			return {
				title: reason === "PRESET_USER_SCOPE_UNAVAILABLE" ? "Sign in to save presets" : "Couldn't save preset",
				detail: reason === "PRESET_USER_SCOPE_UNAVAILABLE"
					? "Presets are saved to your PickFX account on this computer."
					: "PickFX couldn’t reach the presets folder.",
				footer: reason === "PRESET_USER_SCOPE_UNAVAILABLE" ? "Sign in to save presets" : "Couldn't save preset"
			};
		}
		if (reason === "PRESET_EFFECT_UNAVAILABLE") {
			return {
				title: "Effect isn’t installed",
				detail: "A required effect isn’t available in this Premiere.",
				footer: "Effect isn’t installed"
			};
		}
		if (reason === "NEW_EFFECT_INSTANCE_AMBIGUOUS") {
			return {
				title: "Couldn't apply that look",
				detail: "PickFX wouldn’t risk changing an existing effect.",
				footer: "Couldn't apply that look"
			};
		}
		if (reason === "EMPTY_PRESET" || reason === "EMPTY_NAME") {
			return {
				title: reason === "EMPTY_NAME" ? "Name this preset" : "Nothing to save",
				detail: reason === "EMPTY_NAME" ? "Give the preset a name." : "Select at least one supported effect.",
				footer: reason === "EMPTY_NAME" ? "Name this preset" : "Nothing to save"
			};
		}
		if (reason === "UNSUPPORTED_SCHEMA") {
			return {
				title: "Preset can’t be used",
				detail: "This preset isn’t supported in this version.",
				footer: "Preset can’t be used"
			};
		}
		if (reason === "TRACK_LOCKED") {
			return {
				title: "Track locked",
				detail: payload && payload.clipName
					? "Unlock the track for " + payload.clipName + " and try again."
					: "Unlock the track and try again.",
				footer: "Track locked"
			};
		}
		if (reason === "QE_MAPPING_FAILED") {
			return {
				title: "Couldn't apply that look",
				detail: payload && payload.clipName
					? "PickFX couldn’t map " + payload.clipName + " for this preset."
					: "PickFX couldn’t map a selected clip for this preset.",
				footer: "Couldn't apply that look"
			};
		}
		if (reason === "KEYFRAMES_NOT_SUPPORTED") {
			return {
				title: "Can't animate that",
				detail: "This property cannot be animated on the selected clip.",
				footer: "Can't animate that"
			};
		}
		if (reason === "KEYFRAME_CONFLICT") {
			return {
				title: "Existing animation in the way",
				detail: "PickFX left the existing keyframes unchanged.",
				footer: "Existing animation in the way"
			};
		}
		if (reason === "INVALID_CLIP_DURATION") {
			return {
				title: "Clip is too short",
				detail: "Choose a longer clip and try again.",
				footer: "Clip is too short"
			};
		}
		if (reason === "COMPONENT_NOT_FOUND") {
			return {
				title: "Parameter not found",
				detail: "We couldn't find that property on the selected clip.",
				footer: "Parameter not found"
			};
		}
		if (reason === "MULTIPLE_CLIPS_SELECTED") {
			return {
				title: "Select one clip",
				detail: "PickFX works on one selected video clip at a time.",
				footer: "Select one clip"
			};
		}
		if (reason === "NO_AUDIO_SELECTION") {
			return {
				title: "Select an audio clip",
				detail: "Choose an audio clip in the timeline to use this command.",
				footer: "Select an audio clip"
			};
		}
		if (reason === "INVALID_VALUE") {
			return {
				title: "Invalid value",
				detail: "Check the value and try again.",
				footer: "Invalid value"
			};
		}
		if (reason === "VALUE_OUT_OF_RANGE" || reason === "OUT_OF_RANGE") {
			return {
				title: "Value out of range",
				detail: "Try a value within the supported range.",
				footer: "Value out of range"
			};
		}
		if (reason === "UNSUPPORTED_TYPE" || reason === "TYPE_NOT_WRITABLE" || reason === "UNSUPPORTED_OPERATION") {
			return {
				title: "Not supported yet",
				detail: "This parameter can't be changed by PickFX yet.",
				footer: "Not supported yet"
			};
		}
		if (status === "Parameter type not writable yet.") {
			return {
				title: "Not supported yet",
				detail: "This parameter can't be changed by PickFX yet.",
				footer: "Not supported yet"
			};
		}
		if (reason === "PARAMETER_NOT_FOUND" || reason === "EFFECT_NOT_FOUND" ||
				reason === "NO_NUMERIC_PARAMETER" || status === "Parameter not found." ||
				status === "Effect not found.") {
			return {
				title: "Parameter not found",
				detail: "We couldn't find that parameter on the selected clip.",
				footer: "Parameter not found"
			};
		}
		if (reason === "VALUE_NOT_VERIFIED" || reason === "VERIFY_FAILED" ||
				reason === "TARGET_NOT_LOCKED" ||
				reason === "SAFE_EXECUTOR_UNAVAILABLE" ||
				status === "Effect value or target could not be verified." ||
				/EvalScript|host\.jsx/i.test(status + " " + (payload && payload.detail ? payload.detail : "") + " " + (payload && payload.error ? payload.error : ""))) {
			return {
				title: "Couldn’t apply that value.",
				detail: "The change could not be confirmed. Try again.",
				footer: "Couldn’t apply that value."
			};
		}
		if (containsInternalCode(reason) || containsInternalCode(status)) {
			return {
				title: "Couldn't apply the command",
				detail: "Try searching for an effect or parameter.",
				footer: "Couldn't apply the command"
			};
		}
		if (status && !containsInternalCode(status)) {
			return { title: status, detail: "", footer: status };
		}
		return {
			title: "Couldn't apply the command",
			detail: "",
			footer: "Couldn't apply the command"
		};
	}

	function sanitizeVisibleText(text) {
		var out = String(text == null ? "" : text);
		var i;
		var code;
		for (i = 0; i < INTERNAL_CODES.length; i++) {
			code = INTERNAL_CODES[i];
			while (out.toUpperCase().indexOf(code) !== -1) {
				out = out.replace(new RegExp(code, "ig"), "");
			}
		}
		out = out.replace(/EvalScript error\.?\s*(host\.jsx may not be loaded\.?)?/ig, "");
		out = out.replace(/host\.jsx/ig, "");
		return trim(out.replace(/\s+·\s+$/g, "").replace(/\s{2,}/g, " "));
	}

	function visibleFieldsHaveNoCodes(view) {
		if (!view) {
			return true;
		}
		return !containsInternalCode([view.title, view.detail, view.footer, view.subtitle].join(" "));
	}

	return {
		SUCCESS_HOLD_MS: SUCCESS_HOLD_MS,
		fromInputs: fromInputs,
		unsupportedFeedback: unsupportedFeedback,
		userFacingMessage: userFacingMessage,
		successView: successView,
		successHeadline: successHeadline,
		recentLabel: recentLabel,
		applyingLabel: applyingLabel,
		containsInternalCode: containsInternalCode,
		sanitizeVisibleText: sanitizeVisibleText,
		visibleFieldsHaveNoCodes: visibleFieldsHaveNoCodes
	};
}());

if (typeof module !== "undefined" && module.exports) {
	module.exports = CommandPaletteState;
}
