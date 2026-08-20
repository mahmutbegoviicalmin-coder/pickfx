var ConfirmedParameterWrites = (function () {
	var MOTION_DISPLAY = "Motion";
	var MOTION_MATCH = "AE.ADBE Motion";
	var OPACITY_DISPLAY = "Opacity";
	var OPACITY_MATCH = "AE.ADBE Opacity";
	var CROP_DISPLAY = "Crop";
	var CROP_MATCH = "AE.ADBE AECrop";
	var LUMETRI_DISPLAY = "Lumetri Color";
	var LUMETRI_MATCH = "AE.ADBE Lumetri";
	var WRITE_METHOD = "ComponentParam.setValue(value, true)";
	var VERIFICATION_METHOD = "getValue read-back epsilon 0.0001";
	var LUMETRI_NUMERIC = [
		"Temperature",
		"Tint",
		"Exposure",
		"Contrast",
		"Highlights",
		"Shadows",
		"Whites",
		"Blacks",
		"Saturation"
	];
	var ENTRIES = [
		{ componentDisplayName: MOTION_DISPLAY, componentMatchName: MOTION_MATCH, parameterDisplayName: "Scale", type: "number", writeCapability: "NUMBER", status: "MULTICLIP_CONFIRMED", productionEnabled: true },
		{ componentDisplayName: MOTION_DISPLAY, componentMatchName: MOTION_MATCH, parameterDisplayName: "Scale Width", type: "number", writeCapability: "NUMBER", status: "MULTICLIP_CONFIRMED", productionEnabled: true },
		{ componentDisplayName: MOTION_DISPLAY, componentMatchName: MOTION_MATCH, parameterDisplayName: "Rotation", type: "number", writeCapability: "NUMBER", status: "MULTICLIP_CONFIRMED", productionEnabled: true },
		{ componentDisplayName: MOTION_DISPLAY, componentMatchName: MOTION_MATCH, parameterDisplayName: "Uniform Scale", type: "boolean", writeCapability: "BOOLEAN", status: "MULTICLIP_CONFIRMED", productionEnabled: true },
		{ componentDisplayName: MOTION_DISPLAY, componentMatchName: MOTION_MATCH, parameterDisplayName: "Position", type: "point", writeCapability: "POINT", status: "MULTICLIP_CONFIRMED", productionEnabled: true },
		{ componentDisplayName: MOTION_DISPLAY, componentMatchName: MOTION_MATCH, parameterDisplayName: "Anchor Point", type: "point", writeCapability: "POINT", status: "MULTICLIP_CONFIRMED", productionEnabled: true },
		{ componentDisplayName: MOTION_DISPLAY, componentMatchName: MOTION_MATCH, parameterDisplayName: "Anti-flicker Filter", type: "number", writeCapability: "NUMBER", status: "WRITE_CONFIRMED", productionEnabled: true },
		{ componentDisplayName: MOTION_DISPLAY, componentMatchName: MOTION_MATCH, parameterDisplayName: "Crop Left", type: "number", writeCapability: "NUMBER", status: "WRITE_CONFIRMED", productionEnabled: true },
		{ componentDisplayName: MOTION_DISPLAY, componentMatchName: MOTION_MATCH, parameterDisplayName: "Crop Top", type: "number", writeCapability: "NUMBER", status: "WRITE_CONFIRMED", productionEnabled: true },
		{ componentDisplayName: MOTION_DISPLAY, componentMatchName: MOTION_MATCH, parameterDisplayName: "Crop Right", type: "number", writeCapability: "NUMBER", status: "WRITE_CONFIRMED", productionEnabled: true },
		{ componentDisplayName: MOTION_DISPLAY, componentMatchName: MOTION_MATCH, parameterDisplayName: "Crop Bottom", type: "number", writeCapability: "NUMBER", status: "WRITE_CONFIRMED", productionEnabled: true },
		{ componentDisplayName: OPACITY_DISPLAY, componentMatchName: OPACITY_MATCH, parameterDisplayName: "Opacity", type: "number", writeCapability: "NUMBER", status: "WRITE_CONFIRMED", productionEnabled: true },
		{ componentDisplayName: CROP_DISPLAY, componentMatchName: CROP_MATCH, parameterDisplayName: "Left", type: "number", writeCapability: "NUMBER", status: "WRITE_CONFIRMED", productionEnabled: true },
		{ componentDisplayName: CROP_DISPLAY, componentMatchName: CROP_MATCH, parameterDisplayName: "Top", type: "number", writeCapability: "NUMBER", status: "WRITE_CONFIRMED", productionEnabled: true },
		{ componentDisplayName: CROP_DISPLAY, componentMatchName: CROP_MATCH, parameterDisplayName: "Right", type: "number", writeCapability: "NUMBER", status: "WRITE_CONFIRMED", productionEnabled: true },
		{ componentDisplayName: CROP_DISPLAY, componentMatchName: CROP_MATCH, parameterDisplayName: "Bottom", type: "number", writeCapability: "NUMBER", status: "WRITE_CONFIRMED", productionEnabled: true },
		{ componentDisplayName: CROP_DISPLAY, componentMatchName: CROP_MATCH, parameterDisplayName: "Edge Feather", type: "number", writeCapability: "NUMBER", status: "WRITE_CONFIRMED", productionEnabled: true }
	];
	(function appendLumetriNumeric() {
		var i;
		for (i = 0; i < LUMETRI_NUMERIC.length; i++) {
			ENTRIES.push({
				componentDisplayName: LUMETRI_DISPLAY,
				componentMatchName: LUMETRI_MATCH,
				parameterDisplayName: LUMETRI_NUMERIC[i],
				parameterMatchName: "",
				type: "number",
				writeCapability: "NUMBER",
				status: "WRITE_CONFIRMED",
				productionEnabled: true
			});
		}
	}());
	var sessionEntries = [];

	function fold(value) {
		return String(value || "").replace(/^\s+|\s+$/g, "").toLowerCase();
	}

	function decorate(row) {
		if (!row) {
			return row;
		}
		row.component = row.componentDisplayName;
		row.parameter = row.parameterDisplayName;
		row.runtimeType = row.runtimeType || row.type;
		row.method = WRITE_METHOD;
		row.writeMethod = WRITE_METHOD;
		row.verificationMethod = VERIFICATION_METHOD;
		return row;
	}

	function decorateAll(list) {
		var i;
		for (i = 0; i < list.length; i++) {
			decorate(list[i]);
		}
		return list;
	}

	decorateAll(ENTRIES);

	function isLumetriEntry(entry) {
		if (!entry) {
			return false;
		}
		if (entry.componentMatchName === LUMETRI_MATCH) {
			return true;
		}
		return entry.componentDisplayName === LUMETRI_DISPLAY;
	}

	function lumetriDiscover() {
		if (typeof ColorParameterDiscover !== "undefined" && ColorParameterDiscover.resolve) {
			return ColorParameterDiscover;
		}
		if (typeof $ !== "undefined" && $._pickfxColorParameterDiscover && $._pickfxColorParameterDiscover.resolve) {
			return $._pickfxColorParameterDiscover;
		}
		return null;
	}

	function lumetriPicker() {
		if (typeof LumetriPicker !== "undefined" && LumetriPicker.plan) {
			return LumetriPicker;
		}
		if (typeof $ !== "undefined" && $._pickfxLumetriPicker && $._pickfxLumetriPicker.plan) {
			return $._pickfxLumetriPicker;
		}
		return null;
	}

	function numberFromInput(input) {
		if (!input) {
			return undefined;
		}
		if (input.numbers && input.numbers.length === 1 && typeof input.numbers[0] === "number" && isFinite(input.numbers[0])) {
			return input.numbers[0];
		}
		if (typeof input.value === "number" && isFinite(input.value)) {
			return input.value;
		}
		return undefined;
	}

	function verifyLumetriNumber(requested, actual) {
		if (typeof requested === "number" && typeof actual === "number" && isFinite(requested) && isFinite(actual)) {
			return requested === actual || Math.abs(requested - actual) <= 0.0001;
		}
		return requested === actual;
	}

	function lumetriFail(entry, parameterName, reason, detail, extra) {
		var payload = {
			ok: false,
			verified: false,
			scope: "clip",
			component: entry ? entry.componentDisplayName : LUMETRI_DISPLAY,
			effect: entry ? entry.componentDisplayName : LUMETRI_DISPLAY,
			componentMatchName: entry ? entry.componentMatchName : LUMETRI_MATCH,
			parameter: (entry && entry.parameterDisplayName) || String(parameterName || ""),
			parameterMatchName: entry && entry.parameterMatchName !== undefined ? entry.parameterMatchName : "",
			parameterType: "number",
			type: "number",
			method: WRITE_METHOD,
			writeMethod: WRITE_METHOD,
			usedQE: false,
			productionEnabled: true,
			clipParameter: true,
			settersCalled: false,
			reason: reason || "WRITE_FAILED",
			detail: detail ? String(detail) : ""
		};
		var key;
		if (extra) {
			for (key in extra) {
				if (extra.hasOwnProperty(key)) {
					payload[key] = extra[key];
				}
			}
		}
		payload.ok = false;
		payload.verified = false;
		payload.usedQE = false;
		payload.method = WRITE_METHOD;
		return payload;
	}

	function writeLumetri(trackItem, entry, input) {
		var finder = lumetriDiscover();
		var picker = lumetriPicker();
		var requested;
		var resolved;
		var plan;
		var targeting;
		var param;
		var original;
		var setResult;
		var readBack;
		requested = numberFromInput(input);
		if (typeof requested !== "number" || !isFinite(requested)) {
			return lumetriFail(entry, entry.parameterDisplayName, "INVALID_VALUE", "Numeric parameter requires one number.");
		}
		if (!finder) {
			return lumetriFail(entry, entry.parameterDisplayName, "WRITE_FAILED", "ColorParameterDiscover is not loaded.");
		}
		if (picker && picker.plan) {
			targeting = picker.targetingFromInput ? picker.targetingFromInput(input) : {};
			plan = picker.plan(trackItem, {
				componentDisplayName: entry.componentDisplayName,
				componentMatchName: entry.componentMatchName,
				parameterDisplayName: entry.parameterDisplayName,
				parameterMatchName: entry.parameterMatchName || ""
			}, targeting);
			if (plan && plan.uiKind === "choose-lumetri") {
				return lumetriFail(
					entry,
					entry.parameterDisplayName,
					plan.reason || "NEEDS_LUMETRI_CHOICE",
					plan.detail || "Choose which Lumetri Color effect to use.",
					{
						uiKind: "choose-lumetri",
						choices: plan.choices || [],
						picker: plan.picker,
						matchCount: plan.matchCount,
						componentMatchCount: plan.componentMatchCount,
						settersCalled: false
					}
				);
			}
			if (plan && plan.uiKind === "choose-parameter") {
				return lumetriFail(
					entry,
					entry.parameterDisplayName,
					plan.reason || "NEEDS_PARAMETER_CHOICE",
					plan.detail || "Choose which parameter to use.",
					{
						uiKind: "choose-parameter",
						choices: plan.choices || [],
						picker: plan.picker,
						matchCount: plan.matchCount,
						componentMatchCount: plan.componentMatchCount,
						settersCalled: false
					}
				);
			}
			if (plan && (plan.uiKind === "stale-lumetri" || plan.uiKind === "stale-parameter")) {
				return lumetriFail(
					entry,
					entry.parameterDisplayName,
					"PARAMETER_NOT_FOUND",
					plan.detail || "That Lumetri Color effect is no longer on this clip.",
					{
						uiKind: plan.uiKind,
						settersCalled: false
					}
				);
			}
			if (plan && plan.ok && plan._param && plan.useExistingResolve !== true) {
				resolved = {
					ok: true,
					effect: plan.effect,
					parameter: plan.parameter,
					_param: plan._param,
					_component: plan._component,
					reResolved: plan.reResolved === true
				};
			} else if (plan && plan.useExistingResolve === false && (!plan.ok || !plan._param) &&
					plan.uiKind !== "choose-lumetri" && plan.uiKind !== "choose-parameter") {
				return lumetriFail(
					entry,
					entry.parameterDisplayName,
					plan.reason || "PARAMETER_NOT_FOUND",
					plan.detail || "Lumetri parameter is not uniquely resolved.",
					{
						uiKind: plan.uiKind,
						matchCount: plan.matchCount,
						componentMatchCount: plan.componentMatchCount,
						settersCalled: false
					}
				);
			}
		}
		if (!resolved) {
			resolved = finder.resolve(trackItem, {
				componentDisplayName: entry.componentDisplayName,
				componentMatchName: entry.componentMatchName,
				parameterDisplayName: entry.parameterDisplayName,
				parameterMatchName: entry.parameterMatchName || ""
			});
		}
		if (!resolved || !resolved.ok) {
			return lumetriFail(
				entry,
				entry.parameterDisplayName,
				(resolved && resolved.reason) || "PARAMETER_NOT_FOUND",
				(resolved && resolved.detail) || "Lumetri parameter is not uniquely resolved.",
				{
					componentResolution: resolved && resolved.componentResolution,
					parameterResolution: resolved && resolved.parameterResolution,
					matchCount: resolved && resolved.matchCount,
					componentMatchCount: resolved && resolved.componentMatchCount,
					uiKind: resolved && resolved.componentMatchCount > 1
						? "multiple-lumetri"
						: (resolved && resolved.componentMatchCount === 0 ? "no-lumetri" : undefined),
					settersCalled: false
				}
			);
		}
		param = resolved._param;
		if (!param) {
			return lumetriFail(entry, entry.parameterDisplayName, "PARAMETER_NOT_FOUND", "Resolver did not return a ComponentParam.");
		}
		try {
			if (typeof param.setValue !== "function") {
				return lumetriFail(entry, entry.parameterDisplayName, "PARAMETER_NOT_WRITABLE", "setValue is not a function on this ComponentParam.");
			}
		} catch (typeErr) {
			return lumetriFail(entry, entry.parameterDisplayName, "PARAMETER_NOT_WRITABLE", "Could not read setValue: " + String(typeErr));
		}
		try {
			if (typeof param.isTimeVarying === "function" && param.isTimeVarying() === true) {
				return lumetriFail(entry, entry.parameterDisplayName, "PARAMETER_TIME_VARYING_UNSUPPORTED", "This parameter is time-varying. Keyframe writes are not enabled yet.");
			}
		} catch (timeErr) {
			return lumetriFail(entry, entry.parameterDisplayName, "WRITE_FAILED", "isTimeVarying() threw: " + String(timeErr));
		}
		try {
			original = param.getValue();
		} catch (getErr) {
			return lumetriFail(entry, entry.parameterDisplayName, "WRITE_FAILED", "getValue() threw: " + String(getErr));
		}
		try {
			setResult = param.setValue(requested, true);
		} catch (setErr) {
			return lumetriFail(entry, entry.parameterDisplayName, "WRITE_FAILED", "setValue(value, true) threw: " + String(setErr), {
				originalValue: original,
				requestedValue: requested,
				settersCalled: true
			});
		}
		if (setResult === false) {
			return lumetriFail(entry, entry.parameterDisplayName, "WRITE_FAILED", "setValue(value, true) returned false.", {
				originalValue: original,
				requestedValue: requested,
				settersCalled: true
			});
		}
		try {
			readBack = param.getValue();
		} catch (readErr) {
			return lumetriFail(entry, entry.parameterDisplayName, "VALUE_NOT_VERIFIED", "getValue() after setValue threw: " + String(readErr), {
				originalValue: original,
				requestedValue: requested,
				settersCalled: true
			});
		}
		if (!verifyLumetriNumber(requested, readBack)) {
			return lumetriFail(entry, entry.parameterDisplayName, "VALUE_NOT_VERIFIED", "Value could not be verified.", {
				originalValue: original,
				requestedValue: requested,
				actualValue: readBack,
				readBack: readBack,
				settersCalled: true
			});
		}
		return {
			ok: true,
			verified: true,
			scope: "clip",
			component: resolved.effect.displayName,
			effect: resolved.effect.displayName,
			componentMatchName: resolved.effect.matchName || LUMETRI_MATCH,
			parameter: resolved.parameter.displayName,
			parameterMatchName: resolved.parameter.matchName || "",
			parameterType: "number",
			type: "number",
			originalValue: original,
			requestedValue: requested,
			newValue: requested,
			actualValue: readBack,
			readBack: readBack,
			method: WRITE_METHOD,
			writeMethod: WRITE_METHOD,
			usedQE: false,
			productionEnabled: true,
			clipParameter: true,
			settersCalled: true,
			reResolved: resolved.reResolved === true
		};
	}

	function isScaleHeightName(parameterName) {
		return fold(parameterName) === "scale height";
	}

	function isBlockedName(parameterName) {
		var name = fold(parameterName);
		return name === "scale height" || name === "blend mode" || name === "time remapping";
	}

	function namesEqual(a, b) {
		return fold(a) === fold(b);
	}

	function componentMatches(row, hint) {
		if (!hint) {
			return true;
		}
		return namesEqual(row.componentDisplayName, hint) || namesEqual(row.componentMatchName, hint);
	}

	function allRows() {
		var out = [];
		var i;
		for (i = 0; i < ENTRIES.length; i++) {
			out.push(ENTRIES[i]);
		}
		for (i = 0; i < sessionEntries.length; i++) {
			out.push(sessionEntries[i]);
		}
		return out;
	}

	function lookup(componentDisplayName, parameterDisplayName, type) {
		var rows = allRows();
		var i;
		var row;
		for (i = 0; i < rows.length; i++) {
			row = rows[i];
			if (!namesEqual(row.parameterDisplayName, parameterDisplayName)) {
				continue;
			}
			if (componentDisplayName && !componentMatches(row, componentDisplayName)) {
				continue;
			}
			if (type && row.type !== type) {
				continue;
			}
			return row;
		}
		return null;
	}

	function lookupByParameter(parameterName) {
		var rows = allRows();
		var i;
		var row;
		var found = null;
		for (i = 0; i < rows.length; i++) {
			row = rows[i];
			if (!namesEqual(row.parameterDisplayName, parameterName)) {
				continue;
			}
			if (found) {
				return null;
			}
			found = row;
		}
		return found;
	}

	function isProductionEnabled(parameterName, componentHint) {
		var row;
		if (isBlockedName(parameterName)) {
			return false;
		}
		row = componentHint
			? lookup(componentHint, parameterName)
			: lookupByParameter(parameterName);
		return !!(row && row.productionEnabled === true);
	}

	function isMotionProven(parameterName) {
		var row = lookup(MOTION_DISPLAY, parameterName);
		return !!(row && row.productionEnabled === true);
	}

	function resolveProductionEntry(parameterName, componentHint) {
		var row;
		if (isBlockedName(parameterName)) {
			return null;
		}
		if (componentHint) {
			row = lookup(componentHint, parameterName);
		} else {
			row = lookupByParameter(parameterName);
		}
		if (!row || row.productionEnabled !== true) {
			return null;
		}
		if (!row.componentDisplayName || !row.parameterDisplayName) {
			return null;
		}
		return row;
	}

	function all() {
		return allRows();
	}

	function identityFrom(info) {
		return {
			componentDisplayName: info.componentDisplayName || info.component || "",
			componentMatchName: info.componentMatchName || "",
			parameterDisplayName: info.parameterDisplayName || info.parameter || "",
			parameterMatchName: info.parameterMatchName || "",
			type: info.runtimeType === "angle" ? "number" : (info.runtimeType || info.type || "number")
		};
	}

	function markWriteConfirmed(info) {
		var ident = identityFrom(info || {});
		var existing;
		var entry;
		if (isBlockedName(ident.parameterDisplayName)) {
			return {
				ok: false,
				reason: isScaleHeightName(ident.parameterDisplayName) ? "PARAMETER_NOT_FOUND" : "UNSUPPORTED_TYPE",
				productionEnabled: false,
				status: "REJECTED"
			};
		}
		if (!ident.componentDisplayName || !ident.parameterDisplayName) {
			return {
				ok: false,
				reason: "NO_SAFE_IDENTITY",
				productionEnabled: false,
				status: "REJECTED"
			};
		}
		existing = lookup(ident.componentDisplayName, ident.parameterDisplayName, ident.type);
		if (existing) {
			if (existing.status !== "WRITE_CONFIRMED" && existing.status !== "MULTICLIP_CONFIRMED") {
				existing.status = "WRITE_CONFIRMED";
			}
			decorate(existing);
			return existing;
		}
		entry = decorate({
			componentDisplayName: ident.componentDisplayName,
			componentMatchName: ident.componentMatchName,
			parameterDisplayName: ident.parameterDisplayName,
			parameterMatchName: ident.parameterMatchName,
			type: ident.type,
			runtimeType: ident.type,
			writeCapability: "NUMBER",
			status: "WRITE_CONFIRMED",
			productionEnabled: false
		});
		sessionEntries.push(entry);
		return entry;
	}

	function enableProduction(componentHint, parameterName) {
		var row;
		if (isBlockedName(parameterName)) {
			return {
				ok: false,
				reason: isScaleHeightName(parameterName) ? "PARAMETER_NOT_FOUND" : "UNSUPPORTED_TYPE",
				productionEnabled: false
			};
		}
		row = lookup(componentHint, parameterName);
		if (!row) {
			return {
				ok: false,
				reason: "PARAMETER_NOT_FOUND",
				productionEnabled: false,
				detail: "Only WRITE_CONFIRMED parameters can be production-enabled."
			};
		}
		if (row.status !== "WRITE_CONFIRMED" && row.status !== "MULTICLIP_CONFIRMED") {
			return {
				ok: false,
				reason: "UNSUPPORTED_TYPE",
				productionEnabled: false,
				detail: "Only WRITE_CONFIRMED parameters can be production-enabled."
			};
		}
		row.productionEnabled = true;
		decorate(row);
		return {
			ok: true,
			productionEnabled: true,
			status: "PRODUCTION_ENABLED",
			entry: row
		};
	}

	function resetSession() {
		sessionEntries = [];
	}

	function annotate(written, entry) {
		var payload = written || {};
		payload.scope = "clip";
		payload.usedQE = false;
		payload.productionEnabled = true;
		payload.clipParameter = true;
		if (entry) {
			if (!payload.component) {
				payload.component = payload.effect || entry.componentDisplayName;
			}
			if (!payload.effect) {
				payload.effect = entry.componentDisplayName;
			}
			if (!payload.parameter) {
				payload.parameter = entry.parameterDisplayName;
			}
			if (!payload.parameterType) {
				payload.parameterType = payload.type || entry.type;
			}
			if (!payload.type) {
				payload.type = entry.type;
			}
			if (!payload.componentMatchName) {
				payload.componentMatchName = entry.componentMatchName;
			}
		}
		payload.method = WRITE_METHOD;
		if (payload.verified === undefined) {
			payload.verified = payload.ok === true;
		}
		if (payload.verified !== true) {
			payload.ok = false;
			payload.verified = false;
			if (!payload.reason) {
				payload.reason = "VALUE_NOT_VERIFIED";
			}
		}
		return payload;
	}

	function unsupported(parameterName, reason) {
		return {
			ok: false,
			scope: "clip",
			component: "",
			parameter: String(parameterName || ""),
			parameterType: "unknown",
			verified: false,
			method: WRITE_METHOD,
			usedQE: false,
			productionEnabled: false,
			clipParameter: true,
			reason: reason || "UNSUPPORTED_TYPE",
			detail: reason === "PARAMETER_NOT_FOUND"
				? "Scale Height is not a Premiere ComponentParam."
				: "This clip parameter is not in the live-confirmed production registry."
		};
	}

	function motionWriter() {
		if (typeof ClipParameterWriter !== "undefined" && ClipParameterWriter.set) {
			return ClipParameterWriter;
		}
		if (typeof $ !== "undefined" && $._pickfxClipParameterWriter && $._pickfxClipParameterWriter.set) {
			return $._pickfxClipParameterWriter;
		}
		return null;
	}

	function universalWriter() {
		if (typeof UniversalParameterWriter !== "undefined" && UniversalParameterWriter.set) {
			return UniversalParameterWriter;
		}
		if (typeof $ !== "undefined" && $._pickfxUniversalParameterWriter && $._pickfxUniversalParameterWriter.set) {
			return $._pickfxUniversalParameterWriter;
		}
		return null;
	}

	function write(trackItem, parameterName, input, componentHint) {
		var entry;
		var writer;
		var written;
		if (isScaleHeightName(parameterName)) {
			return unsupported(parameterName, "PARAMETER_NOT_FOUND");
		}
		entry = resolveProductionEntry(parameterName, componentHint);
		if (!entry) {
			return unsupported(parameterName);
		}
		if (entry.componentDisplayName === MOTION_DISPLAY) {
			writer = motionWriter();
			if (writer) {
				written = writer.set(trackItem, entry.parameterDisplayName, input);
				return annotate(written, entry);
			}
		}
		if (isLumetriEntry(entry)) {
			written = writeLumetri(trackItem, entry, input);
			return annotate(written, entry);
		}
		writer = universalWriter();
		if (writer) {
			written = writer.set(
				trackItem,
				entry.parameterDisplayName,
				input,
				entry.componentMatchName || entry.componentDisplayName
			);
			return annotate(written, entry);
		}
		writer = motionWriter();
		if (writer) {
			written = writer.set(trackItem, entry.parameterDisplayName, input);
			return annotate(written, entry);
		}
		return {
			ok: false,
			scope: "clip",
			component: entry.componentDisplayName,
			parameter: entry.parameterDisplayName,
			parameterType: entry.type,
			verified: false,
			method: WRITE_METHOD,
			usedQE: false,
			productionEnabled: true,
			clipParameter: true,
			reason: "WRITE_FAILED",
			detail: "No clip parameter writer is loaded."
		};
	}

	return {
		MOTION_DISPLAY: MOTION_DISPLAY,
		MOTION_MATCH: MOTION_MATCH,
		OPACITY_DISPLAY: OPACITY_DISPLAY,
		OPACITY_MATCH: OPACITY_MATCH,
		CROP_DISPLAY: CROP_DISPLAY,
		CROP_MATCH: CROP_MATCH,
		LUMETRI_DISPLAY: LUMETRI_DISPLAY,
		LUMETRI_MATCH: LUMETRI_MATCH,
		WRITE_METHOD: WRITE_METHOD,
		VERIFICATION_METHOD: VERIFICATION_METHOD,
		isMotionProven: isMotionProven,
		isProductionEnabled: isProductionEnabled,
		isBlockedName: isBlockedName,
		resolveProductionEntry: resolveProductionEntry,
		lookup: lookup,
		lookupByParameter: lookupByParameter,
		markWriteConfirmed: markWriteConfirmed,
		enableProduction: enableProduction,
		resetSession: resetSession,
		write: write,
		all: all,
		fold: fold
	};
}());

if (typeof $ !== "undefined") {
	$._pickfxConfirmedParameterWrites = ConfirmedParameterWrites;
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = ConfirmedParameterWrites;
}
