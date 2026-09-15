var PresetSchema = (function () {
	var SCHEMA_VERSION = 1;
	var ID_PATTERN = /^preset_[a-z0-9]+_[a-z0-9]+$/;
	var SUPPORTED_TYPES = {
		number: true,
		angle: true,
		"boolean": true,
		point: true
	};
	var INTRINSIC = {
		"ae.adbe motion": { kind: "intrinsic", displayName: "Motion", defaultChecked: false },
		"ae.adbe opacity": { kind: "intrinsic", displayName: "Opacity", defaultChecked: false },
		"ae.adbe time remapping": { kind: "intrinsic", displayName: "Time Remapping", defaultChecked: false }
	};
	var INTRINSIC_DISPLAY = {
		motion: true,
		opacity: true,
		"time remapping": true,
		transform: true
	};

	function trim(value) {
		return String(value || "").replace(/^\s+|\s+$/g, "");
	}

	function fold(value) {
		return trim(value).toLowerCase();
	}

	function isPlainObject(value) {
		return !!(value && typeof value === "object" && (value.constructor === Object || value.constructor === undefined));
	}

	function cloneJson(value) {
		return JSON.parse(JSON.stringify(value));
	}

	function randomToken() {
		return Math.floor(Math.random() * 0x1000000).toString(16);
	}

	function createId(now, token) {
		var stamp = typeof now === "number" && isFinite(now) ? now : Date.now();
		var rand = token || randomToken();
		return "preset_" + String(stamp) + "_" + String(rand).replace(/[^a-z0-9]/gi, "").toLowerCase();
	}

	function isSafePresetId(id) {
		return ID_PATTERN.test(String(id || ""));
	}

	function normalizeName(name) {
		return trim(name).replace(/\s+/g, " ");
	}

	function namesEqual(a, b) {
		return fold(a) === fold(b) && fold(a) !== "";
	}

	function isIntrinsicMatchName(matchName) {
		return !!INTRINSIC[fold(matchName)];
	}

	function isIntrinsicDisplayName(displayName) {
		return !!INTRINSIC_DISPLAY[fold(displayName)];
	}

	function isIntrinsicComponent(matchName, displayName) {
		return isIntrinsicMatchName(matchName) || isIntrinsicDisplayName(displayName);
	}

	function intrinsicDefaultChecked(matchName, displayName) {
		if (!isIntrinsicComponent(matchName, displayName)) {
			return true;
		}
		return false;
	}

	function isSkippedParameterName(name) {
		var n = fold(name);
		if (!n) {
			return true;
		}
		if (n.charAt(0) === "_") {
			return true;
		}
		if (n === "controls" || n === "about" || n === "compositing options" ||
				n === "applied version" || n === "overlay mode" || n === "seed" ||
				n === "sequence width" || n === "sequence height" || n === "sequence pixel ratio" ||
				n === "error occurred") {
			return true;
		}
		if (n.indexOf("error occurred") !== -1 ||
				n.indexOf("applied version") !== -1 ||
				n.indexOf("overlay mode") !== -1 ||
				n.indexOf("sequence width") !== -1 ||
				n.indexOf("sequence height") !== -1 ||
				n.indexOf("sequence pixel ratio") !== -1) {
			return true;
		}
		return false;
	}

	function isContainerParameterName(name) {
		var n = fold(name);
		return n === "controls" || n === "about" || n === "compositing options";
	}

	function serializeValue(type, value) {
		var wanted = fold(type);
		if (wanted === "number" || wanted === "angle") {
			if (typeof value === "number" && isFinite(value)) {
				return { ok: true, type: wanted === "angle" ? "angle" : "number", value: value };
			}
			return { ok: false, reason: "UNSUPPORTED_TYPE" };
		}
		if (wanted === "boolean") {
			if (value === true || value === false) {
				return { ok: true, type: "boolean", value: value };
			}
			return { ok: false, reason: "UNSUPPORTED_TYPE" };
		}
		if (wanted === "point") {
			if (value && typeof value.length === "number" && value.length === 2 &&
					typeof value[0] === "number" && isFinite(value[0]) &&
					typeof value[1] === "number" && isFinite(value[1])) {
				return { ok: true, type: "point", value: [value[0], value[1]] };
			}
			if (value && typeof value.x === "number" && typeof value.y === "number" &&
					isFinite(value.x) && isFinite(value.y)) {
				return { ok: true, type: "point", value: [value.x, value.y] };
			}
			return { ok: false, reason: "UNSUPPORTED_TYPE" };
		}
		return { ok: false, reason: "UNSUPPORTED_TYPE" };
	}

	function isSupportedType(type) {
		return !!SUPPORTED_TYPES[fold(type)];
	}

	function fail(reason, detail, extra) {
		var payload = {
			ok: false,
			reason: reason || "INVALID_PRESET",
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
		return payload;
	}

	function validateParameter(raw, index) {
		var serialized;
		var displayName;
		var type;
		if (!raw || typeof raw !== "object") {
			return fail("INVALID_PRESET", "Parameter is not an object.", { order: index });
		}
		displayName = trim(raw.displayName);
		if (!displayName) {
			return fail("INVALID_PRESET", "Parameter is missing a name.", { order: index });
		}
		if (isSkippedParameterName(displayName)) {
			return fail("UNSUPPORTED_TYPE", "Parameter is metadata.", { order: index, skip: true });
		}
		type = fold(raw.type);
		if (!isSupportedType(type)) {
			return fail(raw.skipReason || "UNSUPPORTED_TYPE", "Parameter type is not supported.", {
				order: index,
				skip: true,
				displayName: displayName
			});
		}
		serialized = serializeValue(type, raw.value);
		if (!serialized.ok) {
			return fail("UNSUPPORTED_TYPE", "Parameter value is not serializable.", {
				order: index,
				skip: true,
				displayName: displayName
			});
		}
		return {
			ok: true,
			parameter: {
				order: typeof raw.order === "number" ? raw.order : index,
				displayName: displayName,
				matchName: trim(raw.matchName),
				parentName: trim(raw.parentName),
				type: serialized.type,
				value: serialized.value
			}
		};
	}

	function validateComponent(raw, index) {
		var displayName;
		var parameters = [];
		var skipped = [];
		var i;
		var checked;
		var kind;
		var captureStatus;
		if (!raw || typeof raw !== "object") {
			return fail("INVALID_PRESET", "Component is not an object.", { order: index });
		}
		displayName = trim(raw.displayName || raw.premiereName);
		if (!displayName) {
			return fail("INVALID_PRESET", "Component is missing a name.", { order: index });
		}
		kind = isIntrinsicComponent(raw.matchName, displayName) ? "intrinsic" : "effect";
		if (raw.kind === "intrinsic" || raw.kind === "effect") {
			kind = raw.kind;
		}
		if (raw.parameters && Object.prototype.toString.call(raw.parameters) !== "[object Array]") {
			return fail("INVALID_PRESET", "Component parameters must be an array.", { order: index });
		}
		for (i = 0; i < (raw.parameters || []).length; i++) {
			checked = validateParameter(raw.parameters[i], i);
			if (checked.ok) {
				parameters.push(checked.parameter);
			} else if (checked.skip) {
				skipped.push({
					displayName: trim(raw.parameters[i] && raw.parameters[i].displayName),
					reason: checked.reason
				});
			} else {
				return checked;
			}
		}
		if (parameters.length) {
			captureStatus = skipped.length ? "partial" : "full";
		} else {
			captureStatus = "unsupported";
		}
		if (raw.captureStatus === "partial" && captureStatus === "full") {
			captureStatus = "partial";
		}
		return {
			ok: true,
			component: {
				order: typeof raw.order === "number" ? raw.order : index,
				kind: kind,
				displayName: displayName,
				matchName: trim(raw.matchName),
				premiereName: trim(raw.premiereName || displayName),
				parameters: parameters,
				skipped: skipped,
				captureStatus: captureStatus
			}
		};
	}

	function validate(raw) {
		var preset;
		var components = [];
		var i;
		var checked;
		var name;
		if (raw == null) {
			return fail("INVALID_PRESET", "Preset is empty.");
		}
		if (typeof raw === "string") {
			try {
				raw = JSON.parse(raw);
			} catch (parseErr) {
				return fail("INVALID_PRESET", "Preset JSON is malformed.");
			}
		}
		if (!raw || typeof raw !== "object") {
			return fail("INVALID_PRESET", "Preset is not an object.");
		}
		if (raw.schemaVersion !== SCHEMA_VERSION) {
			return fail("UNSUPPORTED_SCHEMA", "Preset schema is not supported.", {
				schemaVersion: raw.schemaVersion
			});
		}
		if (!isSafePresetId(raw.id)) {
			return fail("INVALID_PRESET", "Preset id is invalid.");
		}
		name = normalizeName(raw.name);
		if (!name) {
			return fail("EMPTY_NAME", "Preset name is empty.");
		}
		if (!raw.components || !raw.components.length) {
			return fail("EMPTY_PRESET", "Preset has no components.");
		}
		for (i = 0; i < raw.components.length; i++) {
			checked = validateComponent(raw.components[i], i);
			if (!checked.ok) {
				return checked;
			}
			if (checked.component.captureStatus !== "unsupported") {
				components.push(checked.component);
			}
		}
		if (!components.length) {
			return fail("EMPTY_PRESET", "Preset has no reproducible components.");
		}
		preset = {
			schemaVersion: SCHEMA_VERSION,
			id: String(raw.id),
			name: name,
			createdAt: trim(raw.createdAt) || "",
			updatedAt: trim(raw.updatedAt) || "",
			components: components
		};
		return {
			ok: true,
			preset: preset
		};
	}

	function componentKey(row) {
		return fold(row && (row.matchName || "")) + "||" + fold(row && (row.displayName || row.premiereName || ""));
	}

	function instanceIdentity(row) {
		var token;
		if (!row) {
			return "";
		}
		token = trim(row.instanceID || row.instanceId || row.id || row.guid || "");
		return token;
	}

	function identifyByInstanceIdentity(before, after) {
		var beforeIds = {};
		var seenAfter = {};
		var hits = [];
		var i;
		var token;
		for (i = 0; i < before.length; i++) {
			token = instanceIdentity(before[i]);
			if (!token) {
				continue;
			}
			if (beforeIds[token]) {
				return null;
			}
			beforeIds[token] = true;
		}
		for (i = 0; i < after.length; i++) {
			token = instanceIdentity(after[i]);
			if (!token) {
				continue;
			}
			if (seenAfter[token]) {
				return null;
			}
			seenAfter[token] = true;
			if (!beforeIds[token]) {
				hits.push({
					component: after[i],
					index: typeof after[i].index === "number" ? after[i].index : i
				});
			}
		}
		if (hits.length !== 1) {
			return null;
		}
		return {
			ok: true,
			component: hits[0].component,
			index: hits[0].index,
			via: "instance-id"
		};
	}

	function identifyInserted(before, after) {
		var i;
		var j;
		var inserted;
		var key;
		var existed;
		var byId;
		if (!after || !before || after.length !== before.length + 1) {
			return {
				ok: false,
				reason: "NEW_EFFECT_INSTANCE_AMBIGUOUS",
				detail: "Could not identify the newly added effect."
			};
		}
		byId = identifyByInstanceIdentity(before, after);
		if (byId) {
			return byId;
		}
		i = 0;
		while (i < before.length && componentKey(before[i]) === componentKey(after[i])) {
			i += 1;
		}
		j = 0;
		while (i + j < before.length && componentKey(before[i + j]) === componentKey(after[i + 1 + j])) {
			j += 1;
		}
		if (i + j !== before.length) {
			return {
				ok: false,
				reason: "NEW_EFFECT_INSTANCE_AMBIGUOUS",
				detail: "Could not identify the newly added effect."
			};
		}
		inserted = after[i];
		if (!inserted) {
			return {
				ok: false,
				reason: "NEW_EFFECT_INSTANCE_AMBIGUOUS",
				detail: "Could not identify the newly added effect."
			};
		}
		key = componentKey(inserted);
		existed = false;
		for (j = 0; j < before.length; j++) {
			if (componentKey(before[j]) === key) {
				existed = true;
				break;
			}
		}
		if (existed) {
			return {
				ok: false,
				reason: "NEW_EFFECT_INSTANCE_AMBIGUOUS",
				detail: "Duplicate same-name effect has no proven instance identity."
			};
		}
		return {
			ok: true,
			component: inserted,
			index: typeof inserted.index === "number" ? inserted.index : i,
			via: "structural"
		};
	}

	function matchesExpectedEffect(row, expected) {
		var wantedName;
		var wantedMatch;
		if (!row || !expected) {
			return false;
		}
		wantedMatch = fold(expected.matchName);
		wantedName = fold(expected.displayName || expected.premiereName);
		if (wantedMatch && fold(row.matchName) === wantedMatch) {
			return true;
		}
		return wantedName !== "" && fold(row.displayName || row.premiereName) === wantedName;
	}

	function capturableComponents(components) {
		var out = [];
		var i;
		for (i = 0; i < (components || []).length; i++) {
			if (components[i] && components[i].captureStatus !== "unsupported") {
				out.push(components[i]);
			}
		}
		return out;
	}

	function effectCount(preset) {
		var count = 0;
		var i;
		var list = preset && preset.components ? preset.components : [];
		for (i = 0; i < list.length; i++) {
			if (list[i] && list[i].captureStatus !== "unsupported") {
				count += 1;
			}
		}
		return count;
	}

	function parameterCount(preset) {
		var count = 0;
		var i;
		var list = preset && preset.components ? preset.components : [];
		for (i = 0; i < list.length; i++) {
			if (list[i] && list[i].parameters) {
				count += list[i].parameters.length;
			}
		}
		return count;
	}

	function skippedCount(preset) {
		var count = 0;
		var i;
		var list = preset && preset.components ? preset.components : [];
		for (i = 0; i < list.length; i++) {
			if (list[i] && list[i].skipped) {
				count += list[i].skipped.length;
			}
		}
		return count;
	}

	function requiredEffects(preset) {
		var names = [];
		var seen = {};
		var i;
		var component;
		var key;
		var list = preset && preset.components ? preset.components : [];
		for (i = 0; i < list.length; i++) {
			component = list[i];
			if (!component || component.kind === "intrinsic") {
				continue;
			}
			key = trim(component.premiereName || component.displayName);
			if (!key || seen[fold(key)]) {
				continue;
			}
			seen[fold(key)] = true;
			names.push(key);
		}
		return names;
	}

	function build(options) {
		var now = options && options.now ? options.now : new Date().toISOString();
		var name = normalizeName(options && options.name);
		var components = capturableComponents(options && options.components);
		var id = options && options.id ? String(options.id) : createId(options && options.clock, options && options.token);
		if (!name) {
			return fail("EMPTY_NAME", "Preset name is empty.");
		}
		if (!isSafePresetId(id)) {
			id = createId(options && options.clock, options && options.token);
		}
		if (!components.length) {
			return fail("EMPTY_PRESET", "Preset has no reproducible components.");
		}
		return validate({
			schemaVersion: SCHEMA_VERSION,
			id: id,
			name: name,
			createdAt: (options && options.createdAt) || now,
			updatedAt: now,
			components: components
		});
	}

	return {
		SCHEMA_VERSION: SCHEMA_VERSION,
		createId: createId,
		isSafePresetId: isSafePresetId,
		normalizeName: normalizeName,
		namesEqual: namesEqual,
		isIntrinsicComponent: isIntrinsicComponent,
		intrinsicDefaultChecked: intrinsicDefaultChecked,
		isSkippedParameterName: isSkippedParameterName,
		isContainerParameterName: isContainerParameterName,
		isSupportedType: isSupportedType,
		serializeValue: serializeValue,
		validate: validate,
		validateComponent: validateComponent,
		build: build,
		effectCount: effectCount,
		parameterCount: parameterCount,
		skippedCount: skippedCount,
		requiredEffects: requiredEffects,
		identifyInserted: identifyInserted,
		matchesExpectedEffect: matchesExpectedEffect,
		cloneJson: cloneJson,
		fold: fold,
		trim: trim
	};
}());

if (typeof $ !== "undefined") {
	$._pickfxPresetSchema = PresetSchema;
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = PresetSchema;
}
