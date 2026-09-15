/*global app, qe, $ */

try {
	$._pickfxRuntimeDiagnostic = {
		runtimeMarker: "2026-08-22-RUNTIME-VERIFY-01",
		hostBootstrapPath: String($.fileName || ""),
		hostBootstrapExists: !!($.fileName && new File($.fileName).exists),
		hostBootstrapExecuted: true
	};
} catch (runtimeDiagnosticError) {
	$._pickfxRuntimeDiagnostic = {
		runtimeMarker: "2026-08-22-RUNTIME-VERIFY-01",
		hostBootstrapPath: "",
		hostBootstrapExists: false,
		hostBootstrapExecuted: true,
		hostBootstrapDiagnosticError: String(runtimeDiagnosticError)
	};
}

// QE DOM adapter. Official Premiere DOM cannot add effects.
// Isolated here so panel JS never talks to QE directly.
$._pickfxQE = {
	result: function (effectName, ok, applied, failed, errors, extraReason, extraFields) {
		var payload = {
			ok: ok,
			effect: effectName || "",
			applied: applied,
			failed: failed,
			errors: errors
		};
		var key;
		if (extraReason) {
			payload.status = extraReason;
		}
		if (extraFields) {
			for (key in extraFields) {
				if (extraFields.hasOwnProperty(key)) {
					payload[key] = extraFields[key];
				}
			}
		}
		return JSON.stringify(payload);
	},

	fail: function (effectName, reason, extra) {
		var error = { reason: reason };
		var extraFields = {};
		var key;
		if (extra) {
			for (key in extra) {
				if (extra.hasOwnProperty(key)) {
					if (key === "reasonCode") {
						extraFields.reason = extra[key];
					} else {
						error[key] = extra[key];
					}
				}
			}
		}
		return $._pickfxQE.result(effectName, false, 0, 0, [error], reason, extraFields);
	},

	enable: function () {
		app.enableQE();
		if (typeof qe === "undefined" || !qe || !qe.project) {
			throw new Error("QE DOM is not available after app.enableQE().");
		}
	},

	getVideoEffectByName: function (effectName) {
		var effect;
		var lookedUp;

		try {
			effect = qe.project.getVideoEffectByName(effectName);
		} catch (lookupErr) {
			throw new Error(
				'qe.project.getVideoEffectByName("' + effectName + '") threw: ' + String(lookupErr)
			);
		}

		try {
			lookedUp = effect ? String(effect.name) : "";
		} catch (invalidErr) {
			throw new Error(
				'getVideoEffectByName("' + effectName + '") returned an invalid object: ' + String(invalidErr)
			);
		}

		if (!effect || !lookedUp) {
			throw new Error(
				'getVideoEffectByName("' + effectName + '") did not return a usable effect.'
			);
		}

		return effect;
	},

	isTrackLocked: function (qeTrack) {
		try {
			return !!qeTrack.isLocked();
		} catch (ignore) {
			return false;
		}
	},

	findQEClip: function (qeSequence, trackItem) {
		var trackIndex = trackItem.parentTrackIndex;
		var clipName = String(trackItem.name);
		var clipTicks;
		var qeTrack;
		var i;
		var qeItem;
		var itemType;
		var qeName;
		var qeTicks;

		if (trackIndex === undefined || trackIndex === null) {
			return {
				error: {
					clip: clipName,
					reason: "Could not map clip to QE item.",
					detail: "parentTrackIndex is missing."
				}
			};
		}

		try {
			clipTicks = String(trackItem.start.ticks);
		} catch (ticksErr) {
			return {
				error: {
					clip: clipName,
					reason: "Could not map clip to QE item.",
					detail: "start.ticks is missing. " + String(ticksErr)
				}
			};
		}

		try {
			qeTrack = qeSequence.getVideoTrackAt(trackIndex);
		} catch (trackErr) {
			return {
				error: {
					clip: clipName,
					reason: "Could not map clip to QE item.",
					detail: "getVideoTrackAt(" + trackIndex + ") failed. " + String(trackErr)
				}
			};
		}

		if (!qeTrack) {
			return {
				error: {
					clip: clipName,
					reason: "Could not map clip to QE item.",
					detail: "getVideoTrackAt(" + trackIndex + ") returned nothing."
				}
			};
		}

		if ($._pickfxQE.isTrackLocked(qeTrack)) {
			return {
				error: {
					clip: clipName,
					reason: "Track is locked"
				}
			};
		}

		for (i = 0; i < qeTrack.numItems; i++) {
			try {
				qeItem = qeTrack.getItemAt(i);
				itemType = qeItem.type;
			} catch (itemErr) {
				continue;
			}

			if (!qeItem || itemType === "Empty") {
				continue;
			}

			try {
				qeName = String(qeItem.name);
				qeTicks = String(qeItem.start.ticks);
			} catch (matchErr) {
				continue;
			}

			if (qeName === clipName && qeTicks === clipTicks) {
				return { clip: qeItem };
			}
		}

		return {
			error: {
				clip: clipName,
				reason: "Could not map clip to QE item.",
				trackIndex: trackIndex,
				ticks: clipTicks
			}
		};
	},

	applyEffectToTrackItem: function (item, effect, qeSequence) {
		var mapped;
		var added;
		var clipName;
		try {
			clipName = String(item.name);
		} catch (ignoreName) {
			clipName = "";
		}
		mapped = $._pickfxQE.findQEClip(qeSequence, item);
		if (!mapped.clip) {
			return {
				ok: false,
				applied: false,
				error: mapped.error || {
					clip: clipName,
					reason: "Could not map clip to QE item."
				}
			};
		}
		try {
			added = mapped.clip.addVideoEffect(effect);
			if (added === false) {
				return {
					ok: false,
					applied: false,
					error: {
						clip: clipName,
						reason: "addVideoEffect failed."
					}
				};
			}
			return { ok: true, applied: true };
		} catch (applyErr) {
			return {
				ok: false,
				applied: false,
				error: {
					clip: clipName,
					reason: "addVideoEffect failed.",
					detail: String(applyErr)
				}
			};
		}
	},

	applyEffect: function (effectName) {
		var name = String(effectName || "");
		var selection;
		var total;
		var videoItems;
		var i;
		var item;
		var effect;
		var qeSequence;
		var applied;
		var failed;
		var errors;
		var mapped;
		var added;

		if (!name) {
			return $._pickfxQE.fail("", "No effect name provided.");
		}

		if (!(app && app.project && app.project.activeSequence)) {
			return $._pickfxQE.fail(name, "No active sequence.");
		}

		selection = app.project.activeSequence.getSelection();
		total = (selection && selection.length) ? selection.length : 0;
		videoItems = [];

		for (i = 0; i < total; i++) {
			item = selection[i];
			if (item && item.mediaType === "Video") {
				videoItems.push(item);
			}
		}

		if (total === 0 || videoItems.length === 0) {
			return $._pickfxQE.fail(
				name,
				videoItems.length === 0 && total > 0
					? "This effect can only be applied to video clips."
					: "Select a video clip first.",
				{ reasonCode: "NO_VIDEO_SELECTION" }
			);
		}

		try {
			$._pickfxQE.enable();
		} catch (qeEnableErr) {
			return $._pickfxQE.fail(name, "QE error.", { detail: String(qeEnableErr) });
		}

		try {
			effect = $._pickfxQE.getVideoEffectByName(name);
		} catch (effectErr) {
			return $._pickfxQE.fail(
				name,
				"Effect is not available in this Premiere installation.",
				{ detail: String(effectErr) }
			);
		}

		try {
			qeSequence = qe.project.getActiveSequence();
		} catch (seqErr) {
			return $._pickfxQE.fail(name, "QE error.", { detail: String(seqErr) });
		}

		if (!qeSequence) {
			return $._pickfxQE.fail(name, "QE error.", {
				detail: "qe.project.getActiveSequence() returned nothing."
			});
		}

		applied = 0;
		failed = 0;
		errors = [];

		for (i = 0; i < videoItems.length; i++) {
			item = videoItems[i];
			mapped = $._pickfxQE.applyEffectToTrackItem(item, effect, qeSequence);
			if (!mapped || !mapped.ok) {
				failed++;
				if (mapped && mapped.error) {
					errors.push(mapped.error);
				} else {
					errors.push({
						clip: String(item.name),
						reason: "addVideoEffect failed."
					});
				}
			} else {
				applied++;
			}
		}

		return $._pickfxQE.result(name, failed === 0, applied, failed, errors);
	},

	safeString: function (value) {
		try {
			return String(value);
		} catch (e) {
			return "";
		}
	},

	inspectItem: function (item) {
		var info = {
			typeofValue: typeof item,
			constructorName: "",
			stringValue: "",
			probed: {},
			enumerableKeys: []
		};
		var probes = ["name", "matchName", "displayName", "id", "type", "category"];
		var i;
		var key;
		var value;

		try {
			info.constructorName = item && item.constructor
				? $._pickfxQE.safeString(item.constructor.name || item.constructor)
				: "";
		} catch (ignore) {
			info.constructorName = "";
		}

		try {
			info.stringValue = String(item);
		} catch (stringErr) {
			info.stringValue = "(throw) " + String(stringErr);
		}

		if (typeof item === "string") {
			return info;
		}

		for (i = 0; i < probes.length; i++) {
			key = probes[i];
			try {
				value = item[key];
				if (value === undefined) {
					info.probed[key] = { exists: false };
				} else {
					info.probed[key] = {
						exists: true,
						typeofValue: typeof value,
						stringValue: $._pickfxQE.safeString(value)
					};
				}
			} catch (probeErr) {
				info.probed[key] = { exists: "threw", detail: String(probeErr) };
			}
		}

		if (typeof item === "object" && item !== null) {
			try {
				for (key in item) {
					info.enumerableKeys.push(String(key));
					if (info.enumerableKeys.length >= 40) {
						break;
					}
				}
			} catch (enumErr) {
				info.enumerableKeysError = String(enumErr);
			}
		}

		return info;
	},

	extractName: function (item) {
		if (typeof item === "string") {
			return item;
		}
		try {
			if (item && item.name !== undefined && item.name !== null && String(item.name) !== "") {
				return String(item.name);
			}
		} catch (ignoreName) {}
		try {
			if (item && item.displayName) {
				return String(item.displayName);
			}
		} catch (ignoreDisplay) {}
		return $._pickfxQE.safeString(item);
	},

	listLength: function (list) {
		try {
			if (typeof list.length === "number") {
				return list.length;
			}
		} catch (ignoreLength) {}
		try {
			if (typeof list.numItems === "number") {
				return list.numItems;
			}
		} catch (ignoreNumItems) {}
		return -1;
	},

	itemAt: function (list, index) {
		try {
			return list[index];
		} catch (e) {
			return undefined;
		}
	},

	discoverVideoEffects: function () {
		var report = {
			ok: false,
			method: "qe.project.getVideoEffectList()",
			methodType: "",
			total: 0,
			returnType: "",
			lengthProperty: -1,
			first20Names: [],
			sampleObjectStructure: null,
			identifierFieldsFound: [],
			duplicateNames: [],
			observations: {
				allItemsAreStrings: false,
				stringItemCount: 0,
				objectItemCount: 0,
				looksLikeMatchNameCount: 0,
				likelyThirdPartyMatches: [],
				namesContainingTransition: [],
				note: "This is a raw dump of getVideoEffectList(). It is not a claim that this is every Premiere effect."
			}
		};
		var list;
		var total;
		var i;
		var item;
		var name;
		var names = [];
		var counts = {};
		var duplicates = [];
		var firstItem;
		var key;
		var probed;
		var vendors = [
			"Sapphire", "BCC", "Boris", "Red Giant", "Universe", "Magic Bullet",
			"Trapcode", "Optical Flares", "NewBlue", "FilmConvert", "Neat Video",
			"RE:Vision", "Twixtor", "Flicker Free", "Maxon", "CineMatch"
		];
		var vendor;
		var lower;
		var qeKeys = [];

		$._pickfxQE.enable();

		try {
			report.methodType = typeof qe.project.getVideoEffectList;
		} catch (typeErr) {
			report.methodType = "threw: " + String(typeErr);
		}

		if (report.methodType !== "function") {
			try {
				for (key in qe.project) {
					if (String(key).toLowerCase().indexOf("effect") !== -1) {
						qeKeys.push(String(key));
					}
					if (qeKeys.length >= 40) {
						break;
					}
				}
			} catch (ignoreKeys) {}
			report.error = "getVideoEffectList is not a function on qe.project.";
			report.qeProjectKeysContainingEffect = qeKeys;
			return report;
		}

		try {
			list = qe.project.getVideoEffectList();
		} catch (listErr) {
			report.error = "qe.project.getVideoEffectList() threw: " + String(listErr);
			return report;
		}

		if (list === undefined || list === null) {
			report.error = "getVideoEffectList() returned " + String(list) + ".";
			return report;
		}

		report.returnType = typeof list;
		report.lengthProperty = $._pickfxQE.listLength(list);
		total = report.lengthProperty;

		if (typeof list === "string") {
			report.total = 1;
			report.first20Names = [list];
			report.sampleObjectStructure = $._pickfxQE.inspectItem(list);
			report.observations.allItemsAreStrings = true;
			report.observations.stringItemCount = 1;
			report.error = "getVideoEffectList() returned a string, not a list.";
			return report;
		}

		if (total < 0) {
			report.error = "Could not read length or numItems from getVideoEffectList() result.";
			report.sampleObjectStructure = $._pickfxQE.inspectItem(list);
			return report;
		}

		report.total = total;

		for (i = 0; i < total; i++) {
			item = $._pickfxQE.itemAt(list, i);
			if (typeof item === "string") {
				report.observations.stringItemCount++;
			} else {
				report.observations.objectItemCount++;
			}
			name = $._pickfxQE.extractName(item);
			names.push(name);
			if (!counts[name]) {
				counts[name] = 0;
			}
			counts[name]++;
			if (name.indexOf("AE.") === 0 || name.indexOf("ADBE") !== -1) {
				report.observations.looksLikeMatchNameCount++;
			}
			lower = name.toLowerCase();
			if (lower.indexOf("transition") !== -1 && report.observations.namesContainingTransition.length < 10) {
				report.observations.namesContainingTransition.push(name);
			}
			for (vendor = 0; vendor < vendors.length; vendor++) {
				if (name.indexOf(vendors[vendor]) !== -1) {
					if (report.observations.likelyThirdPartyMatches.length < 20) {
						report.observations.likelyThirdPartyMatches.push(name);
					}
					break;
				}
			}
		}

		report.observations.allItemsAreStrings = (
			report.observations.stringItemCount === total && total > 0
		);

		report.first20Names = [];
		for (i = 0; i < total && i < 20; i++) {
			report.first20Names.push(names[i]);
		}

		firstItem = $._pickfxQE.itemAt(list, 0);
		report.sampleObjectStructure = $._pickfxQE.inspectItem(firstItem);

		probed = report.sampleObjectStructure.probed || {};
		for (key in probed) {
			if (probed.hasOwnProperty(key) && probed[key].exists === true) {
				report.identifierFieldsFound.push(key);
			}
		}
		if (report.observations.allItemsAreStrings) {
			report.identifierFieldsFound = [];
		}

		for (key in counts) {
			if (counts.hasOwnProperty(key) && counts[key] > 1) {
				duplicates.push({ name: key, count: counts[key] });
				if (duplicates.length >= 20) {
					break;
				}
			}
		}
		report.duplicateNames = duplicates;
		report.ok = true;
		return report;
	}
};

// Read-only official DOM inspector. Does not enable QE and does not set any values.
$._pickfxInspect = {
	METHOD: "official DOM: TrackItem.components / Component.properties / ComponentParam",

	safeString: function (value) {
		try {
			return String(value);
		} catch (e) {
			return "(throw) " + String(e);
		}
	},

	safeTypeof: function (value) {
		try {
			return typeof value;
		} catch (e) {
			return "threw: " + String(e);
		}
	},

	constructorName: function (value) {
		try {
			if (value && value.constructor) {
				return $._pickfxInspect.safeString(value.constructor.name || value.constructor);
			}
		} catch (ignore) {}
		return "";
	},

	serializeValue: function (value, depth) {
		var t;
		var out;
		var i;
		var key;
		var known;
		var hasLength;

		if (depth === undefined) {
			depth = 0;
		}

		if (value === null) {
			return { jsonType: "null", value: null };
		}
		if (value === undefined) {
			return { jsonType: "undefined" };
		}

		t = $._pickfxInspect.safeTypeof(value);
		if (t === "number") {
			if (isNaN(value)) {
				return { jsonType: "number", note: "NaN" };
			}
			if (value === Infinity || value === -Infinity) {
				return { jsonType: "number", note: String(value) };
			}
			return { jsonType: "number", value: value };
		}
		if (t === "boolean" || t === "string") {
			return { jsonType: t, value: value };
		}
		if (t === "function") {
			return { jsonType: "function" };
		}
		if (t !== "object") {
			return { jsonType: t, stringValue: $._pickfxInspect.safeString(value) };
		}

		out = {
			jsonType: "object",
			constructorName: $._pickfxInspect.constructorName(value),
			stringValue: $._pickfxInspect.safeString(value),
			fields: {},
			enumerableKeys: []
		};

		if (depth >= 2) {
			return out;
		}

		try {
			hasLength = typeof value.length === "number" && value.length >= 0 && value.length < 32;
		} catch (ignoreLength) {
			hasLength = false;
		}

		if (hasLength) {
			out.isArrayLike = true;
			out.length = value.length;
			out.items = [];
			for (i = 0; i < value.length; i++) {
				try {
					out.items.push($._pickfxInspect.serializeValue(value[i], depth + 1));
				} catch (itemErr) {
					out.items.push({ jsonType: "error", error: String(itemErr) });
				}
			}
		}

		known = [
			"ticks", "seconds", "red", "green", "blue", "alpha",
			"x", "y", "z", "width", "height", "name", "displayName",
			"matchName", "length", "numItems"
		];
		for (i = 0; i < known.length; i++) {
			key = known[i];
			try {
				if (value[key] !== undefined) {
					out.fields[key] = $._pickfxInspect.serializeValue(value[key], depth + 1);
				}
			} catch (fieldErr) {
				out.fields[key] = { jsonType: "error", error: String(fieldErr) };
			}
		}

		try {
			for (key in value) {
				out.enumerableKeys.push(String(key));
				if (out.enumerableKeys.length >= 40) {
					break;
				}
			}
		} catch (enumErr) {
			out.enumerableKeysError = String(enumErr);
		}

		return out;
	},

	probeProperty: function (obj, key) {
		var value;
		try {
			value = obj[key];
		} catch (probeErr) {
			return { exists: "threw", error: String(probeErr) };
		}
		if (value === undefined) {
			return { exists: false };
		}
		return {
			exists: true,
			typeofValue: $._pickfxInspect.safeTypeof(value),
			serialized: $._pickfxInspect.serializeValue(value, 0)
		};
	},

	probeProperties: function (obj, keys) {
		var probed = {};
		var i;
		for (i = 0; i < keys.length; i++) {
			probed[keys[i]] = $._pickfxInspect.probeProperty(obj, keys[i]);
		}
		return probed;
	},

	probeMethods: function (obj, names) {
		var methods = {};
		var i;
		var name;
		var t;
		for (i = 0; i < names.length; i++) {
			name = names[i];
			try {
				t = typeof obj[name];
				methods[name] = {
					exists: t !== "undefined",
					typeofValue: t
				};
			} catch (methodErr) {
				methods[name] = {
					exists: "threw",
					error: String(methodErr)
				};
			}
		}
		return methods;
	},

	callReadOnly: function (fn) {
		try {
			return {
				ok: true,
				serialized: $._pickfxInspect.serializeValue(fn(), 0)
			};
		} catch (e) {
			return {
				ok: false,
				error: String(e)
			};
		}
	},

	collectionCount: function (col) {
		try {
			if (col && typeof col.numItems === "number") {
				return { count: col.numItems, via: "numItems" };
			}
		} catch (ignoreNumItems) {}
		try {
			if (col && typeof col.length === "number") {
				return { count: col.length, via: "length" };
			}
		} catch (ignoreLength) {}
		return { count: -1, via: "" };
	},

	collectionIndexBase: function (col, count) {
		var zero;
		var one;
		if (count <= 0) {
			return 0;
		}
		try {
			zero = col[0];
		} catch (ignoreZero) {
			zero = undefined;
		}
		try {
			one = col[1];
		} catch (ignoreOne) {
			one = undefined;
		}
		if (zero !== undefined && zero !== null) {
			return 0;
		}
		if (one !== undefined && one !== null) {
			return 1;
		}
		return 0;
	},

	collectionItem: function (col, index, indexBase) {
		try {
			return col[index + indexBase];
		} catch (e) {
			return undefined;
		}
	},

	observedKind: function (getValueResult, colorResult) {
		var jsonType;
		var fields;
		if (colorResult && colorResult.ok) {
			return "color (getColorValue succeeded)";
		}
		if (!getValueResult || !getValueResult.ok || !getValueResult.serialized) {
			return "unknown";
		}
		jsonType = getValueResult.serialized.jsonType;
		if (jsonType === "number") {
			return "numeric";
		}
		if (jsonType === "boolean") {
			return "boolean";
		}
		if (jsonType === "string") {
			return "string";
		}
		if (getValueResult.serialized.isArrayLike) {
			return "array-like (possible point or multi-value)";
		}
		if (jsonType === "object") {
			fields = getValueResult.serialized.fields || {};
			if (fields.red || fields.green || fields.blue) {
				return "object with color fields";
			}
			if (fields.x || fields.y) {
				return "object with point fields";
			}
			if (fields.ticks || fields.seconds) {
				return "object with time fields";
			}
			return "object";
		}
		return jsonType || "unknown";
	},

	inspectParam: function (param, index, clipStart) {
		var info;
		var getValueResult;
		var colorResult;
		var timeVaryingResult;
		var keysResult;

		info = {
			index: index,
			displayName: null,
			identifiers: {},
			methods: {},
			getValue: null,
			getColorValue: null,
			isTimeVarying: null,
			areKeyframesSupported: null,
			getKeys: null,
			getValueAtTimeUsingClipStart: null,
			observedKind: "unknown",
			limitations: []
		};

		if (param === undefined || param === null) {
			info.limitations.push("Component.properties[" + index + "] was " + String(param) + ".");
			return info;
		}

		try {
			info.displayName = param.displayName !== undefined ? String(param.displayName) : null;
		} catch (nameErr) {
			info.displayName = null;
			info.limitations.push("ComponentParam.displayName threw: " + String(nameErr));
		}

		info.identifiers = $._pickfxInspect.probeProperties(param, [
			"displayName", "matchName", "name", "id", "type", "dataType",
			"value", "keyType", "canVaryOverTime"
		]);

		info.methods = $._pickfxInspect.probeMethods(param, [
			"getValue", "getColorValue", "getValueAtTime", "getValueAtKey",
			"isTimeVarying", "areKeyframesSupported", "getKeys", "key",
			"findNearestKey", "findNextKey", "findPreviousKey",
			"setValue", "setColorValue", "setValueAtTime", "setValueAtKey",
			"addKey", "removeKey", "setTimeVarying"
		]);

		if (info.methods.getValue && info.methods.getValue.typeofValue === "function") {
			getValueResult = $._pickfxInspect.callReadOnly(function () {
				return param.getValue();
			});
			info.getValue = getValueResult;
		} else {
			info.getValue = { ok: false, error: "getValue is not a function on this ComponentParam." };
			info.limitations.push("No getValue() on parameter " + String(info.displayName || index) + ".");
		}

		if (info.methods.getColorValue && info.methods.getColorValue.typeofValue === "function") {
			colorResult = $._pickfxInspect.callReadOnly(function () {
				return param.getColorValue();
			});
			info.getColorValue = colorResult;
		} else {
			info.getColorValue = { ok: false, error: "getColorValue is not a function on this ComponentParam." };
		}

		if (info.methods.isTimeVarying && info.methods.isTimeVarying.typeofValue === "function") {
			timeVaryingResult = $._pickfxInspect.callReadOnly(function () {
				return param.isTimeVarying();
			});
			info.isTimeVarying = timeVaryingResult;
		}

		if (info.methods.areKeyframesSupported && info.methods.areKeyframesSupported.typeofValue === "function") {
			info.areKeyframesSupported = $._pickfxInspect.callReadOnly(function () {
				return param.areKeyframesSupported();
			});
		}

		if (
			timeVaryingResult &&
			timeVaryingResult.ok &&
			timeVaryingResult.serialized &&
			timeVaryingResult.serialized.value === true &&
			info.methods.getKeys &&
			info.methods.getKeys.typeofValue === "function"
		) {
			keysResult = $._pickfxInspect.callReadOnly(function () {
				return param.getKeys();
			});
			info.getKeys = keysResult;
		}

		if (
			info.methods.getValueAtTime &&
			info.methods.getValueAtTime.typeofValue === "function" &&
			clipStart
		) {
			info.getValueAtTimeUsingClipStart = $._pickfxInspect.callReadOnly(function () {
				return param.getValueAtTime(clipStart);
			});
		}

		info.observedKind = $._pickfxInspect.observedKind(info.getValue, info.getColorValue);
		info.constructorName = $._pickfxInspect.constructorName(param);
		return info;
	},

	inspectComponent: function (component, index, clipStart) {
		var info;
		var props;
		var countInfo;
		var indexBase;
		var i;
		var param;

		info = {
			index: index,
			displayName: null,
			matchName: null,
			constructorName: $._pickfxInspect.constructorName(component),
			identifiers: {},
			propertiesAvailable: false,
			propertyCount: -1,
			propertyCountVia: "",
			propertyIndexBase: 0,
			properties: [],
			limitations: []
		};

		if (component === undefined || component === null) {
			info.limitations.push("TrackItem.components[" + index + "] was " + String(component) + ".");
			return info;
		}

		try {
			info.displayName = component.displayName !== undefined ? String(component.displayName) : null;
		} catch (displayErr) {
			info.limitations.push("Component.displayName threw: " + String(displayErr));
		}

		try {
			info.matchName = component.matchName !== undefined ? String(component.matchName) : null;
		} catch (matchErr) {
			info.limitations.push("Component.matchName threw: " + String(matchErr));
		}

		info.identifiers = $._pickfxInspect.probeProperties(component, [
			"displayName", "matchName", "name", "id", "instanceID", "type"
		]);

		try {
			props = component.properties;
		} catch (propsErr) {
			info.limitations.push("Component.properties threw: " + String(propsErr));
			return info;
		}

		if (props === undefined || props === null) {
			info.limitations.push("Component.properties is " + String(props) + ". Official DOM did not expose parameters for this effect.");
			return info;
		}

		info.propertiesAvailable = true;
		countInfo = $._pickfxInspect.collectionCount(props);
		info.propertyCount = countInfo.count;
		info.propertyCountVia = countInfo.via;

		if (countInfo.count < 0) {
			info.limitations.push("Could not read properties.numItems or properties.length.");
			info.propertiesCollectionProbe = $._pickfxInspect.probeProperties(props, ["numItems", "length"]);
			return info;
		}

		indexBase = $._pickfxInspect.collectionIndexBase(props, countInfo.count);
		info.propertyIndexBase = indexBase;

		for (i = 0; i < countInfo.count; i++) {
			param = $._pickfxInspect.collectionItem(props, i, indexBase);
			info.properties.push($._pickfxInspect.inspectParam(param, i, clipStart));
		}

		return info;
	},

	inspectClip: function (item) {
		var info;
		var components;
		var countInfo;
		var indexBase;
		var i;
		var clipStart;
		var surfaceNames;
		var surfaces;

		info = {
			name: null,
			mediaType: null,
			parentTrackIndex: null,
			startTicks: null,
			componentsAvailable: false,
			componentCount: -1,
			componentCountVia: "",
			componentIndexBase: 0,
			effectSurfaces: {},
			effects: [],
			limitations: []
		};

		try {
			info.name = String(item.name);
		} catch (nameErr) {
			info.name = "(unnamed)";
			info.limitations.push("TrackItem.name threw: " + String(nameErr));
		}

		try {
			info.mediaType = String(item.mediaType);
		} catch (mediaErr) {
			info.limitations.push("TrackItem.mediaType threw: " + String(mediaErr));
		}

		try {
			info.parentTrackIndex = item.parentTrackIndex;
		} catch (trackErr) {
			info.limitations.push("TrackItem.parentTrackIndex threw: " + String(trackErr));
		}

		try {
			clipStart = item.start;
			info.startTicks = clipStart && clipStart.ticks !== undefined ? String(clipStart.ticks) : null;
		} catch (startErr) {
			clipStart = null;
			info.limitations.push("TrackItem.start threw: " + String(startErr));
		}

		surfaceNames = ["components", "videoComponents", "effects", "appliedEffects", "filters"];
		surfaces = {};
		for (i = 0; i < surfaceNames.length; i++) {
			surfaces[surfaceNames[i]] = $._pickfxInspect.probeProperty(item, surfaceNames[i]);
		}
		info.effectSurfaces = surfaces;

		try {
			components = item.components;
		} catch (compErr) {
			info.limitations.push("TrackItem.components threw: " + String(compErr));
			return info;
		}

		if (components === undefined || components === null) {
			info.limitations.push("TrackItem.components is " + String(components) + ". Official DOM did not expose applied effects on this clip.");
			return info;
		}

		info.componentsAvailable = true;
		countInfo = $._pickfxInspect.collectionCount(components);
		info.componentCount = countInfo.count;
		info.componentCountVia = countInfo.via;

		if (countInfo.count < 0) {
			info.limitations.push("Could not read components.numItems or components.length.");
			return info;
		}

		indexBase = $._pickfxInspect.collectionIndexBase(components, countInfo.count);
		info.componentIndexBase = indexBase;

		for (i = 0; i < countInfo.count; i++) {
			info.effects.push(
				$._pickfxInspect.inspectComponent(
					$._pickfxInspect.collectionItem(components, i, indexBase),
					i,
					clipStart
				)
			);
		}

		return info;
	},

	inspect: function () {
		var report;
		var selection;
		var total;
		var i;
		var item;
		var clipReport;

		report = {
			ok: false,
			method: $._pickfxInspect.METHOD,
			modified: false,
			readOnly: true,
			usedQE: false,
			hasSequence: false,
			selectedTotal: 0,
			videoClipCount: 0,
			clips: [],
			limitations: [],
			note: "This diagnostic only reads official Premiere DOM. It does not set parameters and does not use QE."
		};

		if (!(app && app.project && app.project.activeSequence)) {
			report.limitations.push("No active sequence.");
			report.status = "No active sequence.";
			return report;
		}

		report.hasSequence = true;
		try {
			report.sequenceName = String(app.project.activeSequence.name);
		} catch (ignoreName) {
			report.sequenceName = null;
		}

		try {
			selection = app.project.activeSequence.getSelection();
		} catch (selErr) {
			report.limitations.push("sequence.getSelection() threw: " + String(selErr));
			report.status = "Could not read selection.";
			return report;
		}

		total = (selection && selection.length) ? selection.length : 0;
		report.selectedTotal = total;

		if (total === 0) {
			report.ok = true;
			report.status = "No clips selected.";
			report.limitations.push("Select a video clip that already has the effect applied, then run this diagnostic again.");
			return report;
		}

		for (i = 0; i < total; i++) {
			item = selection[i];
			if (!(item && item.mediaType === "Video")) {
				continue;
			}
			report.videoClipCount++;
			clipReport = $._pickfxInspect.inspectClip(item);
			report.clips.push(clipReport);
			if (clipReport.limitations && clipReport.limitations.length) {
				report.limitations = report.limitations.concat(clipReport.limitations);
			}
		}

		if (report.videoClipCount === 0) {
			report.ok = true;
			report.status = "No video clips selected. Audio-only items are ignored.";
			report.limitations.push("This diagnostic only inspects selected video TrackItems.");
			return report;
		}

		report.ok = true;
		report.status = "Inspected " + report.videoClipCount + " video clip(s).";
		return report;
	}
};

$._pickfxWriteTest = {
	EFFECT_DISPLAY: "Gaussian Blur",
	EFFECT_MATCH: "AE.Impact_Blur_FX",
	PARAM_DISPLAY: "Amount",
	TARGET_VALUE: 50,

	lines: [],

	resetLog: function () {
		$._pickfxWriteTest.lines = [];
	},

	log: function (message) {
		var line = String(message);
		$._pickfxWriteTest.lines.push(line);
		try {
			$.writeln("[PickFX write test] " + line);
		} catch (ignore) {}
	},

	fail: function (stage, error) {
		$._pickfxWriteTest.log("FAIL stage=" + stage + " error=" + error);
		return {
			success: false,
			error: String(error),
			stage: String(stage),
			log: $._pickfxWriteTest.lines.slice(0)
		};
	},

	readString: function (obj, key) {
		try {
			if (obj && obj[key] !== undefined && obj[key] !== null) {
				return String(obj[key]);
			}
		} catch (ignore) {}
		return null;
	},

	run: function () {
		var selection;
		var total;
		var i;
		var item;
		var clip;
		var components;
		var componentCount;
		var componentBase;
		var component;
		var displayName;
		var matchName;
		var matchedComponent;
		var matchedComponentIndex;
		var props;
		var propertyCount;
		var propertyBase;
		var param;
		var paramName;
		var matchedParam;
		var matchedParamIndex;
		var oldValue;
		var setResult;
		var newValue;
		var usedTwoArgSet;

		$._pickfxWriteTest.resetLog();
		$._pickfxWriteTest.log("Starting Gaussian Blur Amount write test. target=" + $._pickfxWriteTest.TARGET_VALUE);

		if (!(app && app.project && app.project.activeSequence)) {
			return $._pickfxWriteTest.fail("sequence", "No active sequence.");
		}

		try {
			selection = app.project.activeSequence.getSelection();
		} catch (selErr) {
			return $._pickfxWriteTest.fail("selection", "sequence.getSelection() threw: " + String(selErr));
		}

		total = (selection && selection.length) ? selection.length : 0;
		$._pickfxWriteTest.log("selectedTotal=" + total);

		for (i = 0; i < total; i++) {
			item = selection[i];
			try {
				$._pickfxWriteTest.log(
					"selection[" + i + "] name=" + $._pickfxWriteTest.readString(item, "name") +
					" mediaType=" + $._pickfxWriteTest.readString(item, "mediaType")
				);
			} catch (ignoreItem) {}
			if (!clip && item && item.mediaType === "Video") {
				clip = item;
			}
		}

		if (!clip) {
			return $._pickfxWriteTest.fail("selection", "No selected video TrackItem.");
		}

		$._pickfxWriteTest.log(
			"using clip name=" + $._pickfxWriteTest.readString(clip, "name") +
			" parentTrackIndex=" + $._pickfxWriteTest.readString(clip, "parentTrackIndex")
		);

		try {
			components = clip.components;
		} catch (compErr) {
			return $._pickfxWriteTest.fail("components", "TrackItem.components threw: " + String(compErr));
		}

		if (components === undefined || components === null) {
			return $._pickfxWriteTest.fail("components", "TrackItem.components is " + String(components) + ".");
		}

		componentCount = $._pickfxInspect.collectionCount(components);
		if (componentCount.count < 0) {
			return $._pickfxWriteTest.fail("components", "Could not read components.numItems or components.length.");
		}

		componentBase = $._pickfxInspect.collectionIndexBase(components, componentCount.count);
		$._pickfxWriteTest.log("componentCount=" + componentCount.count + " via=" + componentCount.via);

		matchedComponent = null;
		matchedComponentIndex = -1;

		for (i = 0; i < componentCount.count; i++) {
			component = $._pickfxInspect.collectionItem(components, i, componentBase);
			displayName = $._pickfxWriteTest.readString(component, "displayName");
			matchName = $._pickfxWriteTest.readString(component, "matchName");
			$._pickfxWriteTest.log("component[" + i + "] displayName=" + displayName + " matchName=" + matchName);

			if (
				!matchedComponent &&
				(displayName === $._pickfxWriteTest.EFFECT_DISPLAY ||
					matchName === $._pickfxWriteTest.EFFECT_MATCH)
			) {
				matchedComponent = component;
				matchedComponentIndex = i;
			}
		}

		if (!matchedComponent) {
			return $._pickfxWriteTest.fail(
				"effect",
				'No component with displayName "Gaussian Blur" or matchName "AE.Impact_Blur_FX".'
			);
		}

		$._pickfxWriteTest.log(
			"matched Gaussian Blur at component[" + matchedComponentIndex +
			"] displayName=" + $._pickfxWriteTest.readString(matchedComponent, "displayName") +
			" matchName=" + $._pickfxWriteTest.readString(matchedComponent, "matchName")
		);

		try {
			props = matchedComponent.properties;
		} catch (propsErr) {
			return $._pickfxWriteTest.fail("properties", "Component.properties threw: " + String(propsErr));
		}

		if (props === undefined || props === null) {
			return $._pickfxWriteTest.fail("properties", "Component.properties is " + String(props) + ".");
		}

		propertyCount = $._pickfxInspect.collectionCount(props);
		if (propertyCount.count < 0) {
			return $._pickfxWriteTest.fail("properties", "Could not read properties.numItems or properties.length.");
		}

		propertyBase = $._pickfxInspect.collectionIndexBase(props, propertyCount.count);
		$._pickfxWriteTest.log("propertyCount=" + propertyCount.count + " via=" + propertyCount.via);

		matchedParam = null;
		matchedParamIndex = -1;

		for (i = 0; i < propertyCount.count; i++) {
			param = $._pickfxInspect.collectionItem(props, i, propertyBase);
			paramName = $._pickfxWriteTest.readString(param, "displayName");
			$._pickfxWriteTest.log("property[" + i + "] displayName=" + paramName);
			if (!matchedParam && paramName === $._pickfxWriteTest.PARAM_DISPLAY) {
				matchedParam = param;
				matchedParamIndex = i;
			}
		}

		if (!matchedParam) {
			return $._pickfxWriteTest.fail("parameter", 'No property with displayName "Amount".');
		}

		$._pickfxWriteTest.log("matched Amount at property[" + matchedParamIndex + "]");

		try {
			oldValue = matchedParam.getValue();
		} catch (getErr) {
			return $._pickfxWriteTest.fail("getValue", "getValue() threw: " + String(getErr));
		}

		$._pickfxWriteTest.log("old value=" + oldValue + " typeof=" + (typeof oldValue));

		try {
			if (typeof matchedParam.setValue !== "function") {
				return $._pickfxWriteTest.fail("setValue", "setValue is not a function on this ComponentParam.");
			}
		} catch (typeErr) {
			return $._pickfxWriteTest.fail("setValue", "Could not read setValue: " + String(typeErr));
		}

		usedTwoArgSet = true;
		try {
			setResult = matchedParam.setValue($._pickfxWriteTest.TARGET_VALUE, true);
		} catch (setTwoErr) {
			$._pickfxWriteTest.log("setValue(50, true) threw: " + String(setTwoErr) + " — retrying setValue(50)");
			usedTwoArgSet = false;
			try {
				setResult = matchedParam.setValue($._pickfxWriteTest.TARGET_VALUE);
			} catch (setOneErr) {
				return $._pickfxWriteTest.fail("setValue", "setValue threw: " + String(setOneErr));
			}
		}

		$._pickfxWriteTest.log(
			"setValue called as " + (usedTwoArgSet ? "setValue(50, true)" : "setValue(50)") +
			" result=" + setResult + " typeof=" + (typeof setResult)
		);

		if (setResult === false) {
			return $._pickfxWriteTest.fail("setValue", "setValue returned false.");
		}

		try {
			newValue = matchedParam.getValue();
		} catch (readErr) {
			return $._pickfxWriteTest.fail("verify", "getValue() after setValue threw: " + String(readErr));
		}

		$._pickfxWriteTest.log("new value=" + newValue + " typeof=" + (typeof newValue));

		return {
			success: true,
			effect: "Gaussian Blur",
			parameter: "Amount",
			value: 50,
			oldValue: oldValue,
			readBack: newValue,
			setValueResult: setResult,
			log: $._pickfxWriteTest.lines.slice(0)
		};
	}
};

$._pickfx = {
	ping: function () {
		try {
			var hasProject = !!(app && app.project);
			var sequenceName = null;

			if (hasProject && app.project.activeSequence) {
				sequenceName = app.project.activeSequence.name;
			}

			return JSON.stringify({
				ok: true,
				hasProject: hasProject,
				sequenceName: sequenceName
			});
		} catch (e) {
			return JSON.stringify({
				ok: false,
				hasProject: false,
				sequenceName: null,
				error: String(e)
			});
		}
	},

	getSelection: function () {
		var selected;
		var debug;
		var videoClips;
		var i;
		var status;
		try {
			if (!(app && app.project && app.project.activeSequence)) {
				return JSON.stringify({
					ok: true,
					hasSequence: false,
					videoClips: [],
					status: "No active sequence."
				});
			}

			selected = $._pickfx.selectedVideoTrackItems();
			debug = selected.debug || {};
			videoClips = [];
			if (debug.videoItems && debug.videoItems.length) {
				videoClips = debug.videoItems;
			} else if (selected.items) {
				for (i = 0; i < selected.items.length; i++) {
					videoClips.push({
						name: $._pickfx.clipDisplayName(selected.items[i]),
						mediaType: "Video"
					});
				}
			}

			if (!selected.ok && (!debug.rawCount || debug.rawCount === 0)) {
				status = selected.detail || "No clips selected.";
			} else if (!selected.ok) {
				status = selected.detail || "No video clips selected. Audio-only items are ignored.";
			} else {
				status = "Found " + selected.count + " video clip(s).";
			}

			return JSON.stringify({
				ok: true,
				hasSequence: true,
				videoClips: videoClips,
				status: status,
				debugSelection: debug
			});
		} catch (e) {
			return JSON.stringify({
				ok: false,
				hasSequence: false,
				videoClips: [],
				error: String(e)
			});
		}
	},

	applyEffect: function (effectName) {
		try {
			return $._pickfxQE.applyEffect(effectName);
		} catch (e) {
			return $._pickfxQE.fail(String(effectName || ""), "QE error.", { detail: String(e) });
		}
	},

	discoverEffects: function () {
		try {
			return JSON.stringify($._pickfxQE.discoverVideoEffects());
		} catch (e) {
			return JSON.stringify({
				ok: false,
				method: "qe.project.getVideoEffectList()",
				error: String(e)
			});
		}
	},

	listVideoEffectNames: function () {
		try {
			$._pickfxQE.enable();
			var list = qe.project.getVideoEffectList();
			var total = $._pickfxQE.listLength(list);
			var names = [];
			var i;
			var item;

			if (total < 0) {
				return JSON.stringify({
					ok: false,
					names: [],
					error: "Could not read length from getVideoEffectList().",
					reason: "EFFECT_INDEX_UNAVAILABLE",
					retryable: true
				});
			}

			for (i = 0; i < total; i++) {
				item = $._pickfxQE.itemAt(list, i);
				names.push($._pickfxQE.extractName(item));
			}

			return JSON.stringify({
				ok: true,
				names: names,
				total: names.length
			});
		} catch (e) {
			return JSON.stringify({
				ok: false,
				names: [],
				error: String(e),
				reason: "EFFECT_INDEX_UNAVAILABLE",
				retryable: true
			});
		}
	},

	inspectSelectedEffects: function () {
		try {
			return JSON.stringify($._pickfxInspect.inspect());
		} catch (e) {
			return JSON.stringify({
				ok: false,
				method: $._pickfxInspect.METHOD,
				modified: false,
				usedQE: false,
				error: String(e)
			});
		}
	},

	testSetGaussianBlurAmount: function () {
		try {
			return JSON.stringify($._pickfxWriteTest.run());
		} catch (e) {
			return JSON.stringify({
				success: false,
				error: String(e),
				stage: "exception"
			});
		}
	},

	selectedVideoTrackItems: function () {
		var selection;
		var countInfo;
		var indexBase;
		var i;
		var item;
		var items;
		var name;
		var mediaType;
		var selectedFlag;
		var rawItems;
		var videoItems;
		var resolver;

		if (!(app && app.project && app.project.activeSequence)) {
			return {
				ok: false,
				reason: "NO_VIDEO_SELECTION",
				detail: "No active sequence.",
				items: [],
				count: 0,
				debug: {
					rawCount: 0,
					rawVia: "",
					indexBase: 0,
					rawItems: [],
					videoCount: 0,
					videoItems: []
				}
			};
		}

		try {
			selection = app.project.activeSequence.getSelection();
		} catch (selErr) {
			return {
				ok: false,
				reason: "NO_VIDEO_SELECTION",
				detail: "sequence.getSelection() threw: " + String(selErr),
				items: [],
				count: 0,
				debug: {
					rawCount: 0,
					rawVia: "threw",
					indexBase: 0,
					rawItems: [],
					videoCount: 0,
					videoItems: [],
					error: String(selErr)
				}
			};
		}

		resolver = typeof $._pickfxParameterResolver !== "undefined" ? $._pickfxParameterResolver : null;
		countInfo = { count: -1, via: "" };
		if (resolver && resolver.collectionCount) {
			countInfo = resolver.collectionCount(selection);
		}
		if (countInfo.count < 0) {
			try {
				if (selection && typeof selection.numItems === "number") {
					countInfo = { count: selection.numItems, via: "numItems" };
				}
			} catch (ignoreNum) {}
		}
		if (countInfo.count < 0) {
			try {
				if (selection && typeof selection.length === "number") {
					countInfo = { count: selection.length, via: "length" };
				}
			} catch (ignoreLen) {}
		}
		if (countInfo.count < 0) {
			countInfo = { count: 0, via: "none" };
		}

		if (resolver && resolver.collectionIndexBase) {
			indexBase = resolver.collectionIndexBase(selection, countInfo.count);
		} else {
			indexBase = 0;
			try {
				if (selection && (selection[0] === undefined || selection[0] === null) &&
						selection[1] !== undefined && selection[1] !== null) {
					indexBase = 1;
				}
			} catch (ignoreBase) {}
		}

		items = [];
		rawItems = [];
		videoItems = [];
		for (i = 0; i < countInfo.count; i++) {
			item = undefined;
			if (resolver && resolver.collectionItem) {
				item = resolver.collectionItem(selection, i, indexBase);
			} else {
				try {
					item = selection[i + indexBase];
				} catch (ignoreItem) {
					item = undefined;
				}
			}
			name = "";
			mediaType = "";
			selectedFlag = true;
			try {
				if (item && item.name !== undefined && item.name !== null) {
					name = String(item.name);
				}
			} catch (ignoreName) {}
			try {
				if (item && item.mediaType !== undefined && item.mediaType !== null) {
					mediaType = String(item.mediaType);
				}
			} catch (ignoreType) {}
			try {
				if (item && typeof item.isSelected === "boolean") {
					selectedFlag = item.isSelected === true;
				}
			} catch (ignoreSelBool) {}
			try {
				if (item && typeof item.isSelected === "function") {
					selectedFlag = item.isSelected() === true;
				}
			} catch (ignoreSelFn) {}
			rawItems.push({
				index: i,
				collectionIndex: i + indexBase,
				name: name,
				mediaType: mediaType,
				selected: selectedFlag,
				present: !!(item)
			});
			if (item && mediaType === "Video") {
				items.push(item);
				videoItems.push({
					name: name,
					mediaType: mediaType,
					selected: selectedFlag
				});
			}
		}

		if (items.length === 0) {
			return {
				ok: false,
				reason: "NO_VIDEO_SELECTION",
				detail: countInfo.count === 0 ? "No clips selected." : "No selected video TrackItem.",
				items: [],
				count: 0,
				debug: {
					rawCount: countInfo.count,
					rawVia: countInfo.via,
					indexBase: indexBase,
					rawItems: rawItems,
					videoCount: 0,
					videoItems: []
				}
			};
		}

		return {
			ok: true,
			items: items,
			count: items.length,
			debug: {
				rawCount: countInfo.count,
				rawVia: countInfo.via,
				indexBase: indexBase,
				rawItems: rawItems,
				videoCount: items.length,
				videoItems: videoItems
			}
		};
	},

	firstSelectedVideoTrackItem: function () {
		var selected = $._pickfx.selectedVideoTrackItems();
		if (!selected.ok) {
			return {
				ok: false,
				reason: selected.reason || "NO_VIDEO_SELECTION",
				detail: selected.detail || "No selected video TrackItem."
			};
		}
		return {
			ok: true,
			trackItem: selected.items[0]
		};
	},

	selectedAudioTrackItems: function () {
		var selected;
		var items;
		var audioItems;
		var rawItems;
		if (!(app && app.project && app.project.activeSequence)) {
			return {
				ok: false,
				reason: "NO_AUDIO_SELECTION",
				detail: "No active sequence.",
				items: [],
				count: 0,
				debug: {
					rawCount: 0,
					audioCount: 0,
					audioItems: []
				}
			};
		}
		try {
			selected = app.project.activeSequence.getSelection();
		} catch (selErr) {
			return {
				ok: false,
				reason: "NO_AUDIO_SELECTION",
				detail: "sequence.getSelection() threw: " + String(selErr),
				items: [],
				count: 0,
				debug: { error: String(selErr), audioCount: 0, audioItems: [] }
			};
		}
		rawItems = [];
		items = [];
		audioItems = [];
		(function walkSelection() {
			var resolver = typeof $._pickfxParameterResolver !== "undefined" ? $._pickfxParameterResolver : null;
			var countInfo = { count: -1, via: "" };
			var indexBase = 0;
			var i;
			var item;
			var name;
			var mediaType;
			var selectedFlag;
			if (resolver && resolver.collectionCount) {
				countInfo = resolver.collectionCount(selected);
			}
			if (countInfo.count < 0) {
				try {
					if (selected && typeof selected.numItems === "number") {
						countInfo = { count: selected.numItems, via: "numItems" };
					}
				} catch (ignoreNum) {}
			}
			if (countInfo.count < 0) {
				try {
					if (selected && typeof selected.length === "number") {
						countInfo = { count: selected.length, via: "length" };
					}
				} catch (ignoreLen) {}
			}
			if (countInfo.count < 0) {
				countInfo = { count: 0, via: "none" };
			}
			if (resolver && resolver.collectionIndexBase) {
				indexBase = resolver.collectionIndexBase(selected, countInfo.count);
			} else {
				try {
					if (selected && (selected[0] === undefined || selected[0] === null) &&
							selected[1] !== undefined && selected[1] !== null) {
						indexBase = 1;
					}
				} catch (ignoreBase) {}
			}
			for (i = 0; i < countInfo.count; i++) {
				item = undefined;
				if (resolver && resolver.collectionItem) {
					item = resolver.collectionItem(selected, i, indexBase);
				} else {
					try {
						item = selected[i + indexBase];
					} catch (ignoreItem) {
						item = undefined;
					}
				}
				name = "";
				mediaType = "";
				selectedFlag = true;
				try {
					if (item && item.name !== undefined && item.name !== null) {
						name = String(item.name);
					}
				} catch (ignoreName) {}
				try {
					if (item && item.mediaType !== undefined && item.mediaType !== null) {
						mediaType = String(item.mediaType);
					}
				} catch (ignoreType) {}
				rawItems.push({
					index: i,
					name: name,
					mediaType: mediaType,
					present: !!(item)
				});
				if (item && mediaType === "Audio") {
					items.push(item);
					audioItems.push({
						name: name,
						mediaType: mediaType
					});
				}
			}
		}());
		if (items.length === 0) {
			return {
				ok: false,
				reason: "NO_AUDIO_SELECTION",
				detail: rawItems.length === 0 ? "No clips selected." : "No selected audio TrackItem.",
				items: [],
				count: 0,
				debug: {
					rawItems: rawItems,
					audioCount: 0,
					audioItems: []
				}
			};
		}
		return {
			ok: true,
			items: items,
			count: items.length,
			debug: {
				rawItems: rawItems,
				audioCount: items.length,
				audioItems: audioItems
			}
		};
	},

	firstSelectedAudioTrackItem: function () {
		var selected = $._pickfx.selectedAudioTrackItems();
		if (!selected.ok) {
			return {
				ok: false,
				reason: selected.reason || "NO_AUDIO_SELECTION",
				detail: selected.detail || "No selected audio TrackItem."
			};
		}
		return {
			ok: true,
			trackItem: selected.items[0]
		};
	},

	jsonSafeValue: function (value) {
		var t;
		var vector;
		var i;
		var item;
		var out;
		try {
			t = typeof value;
		} catch (e) {
			return null;
		}
		if (value === undefined || value === null) {
			return null;
		}
		if (t === "number") {
			if (isNaN(value)) {
				return null;
			}
			return value;
		}
		if (t === "boolean" || t === "string") {
			return value;
		}
		if (t !== "object") {
			return null;
		}
		try {
			if (typeof value.r === "number" && typeof value.g === "number" && typeof value.b === "number") {
				out = { r: value.r, g: value.g, b: value.b };
				if (typeof value.a === "number") {
					out.a = value.a;
				}
				if (typeof value.y === "number") {
					out.y = value.y;
				}
				return out;
			}
		} catch (ignoreColor) {}
		try {
			if (typeof value.x === "number" && typeof value.y === "number") {
				out = { x: value.x, y: value.y };
				if (typeof value.z === "number") {
					out.z = value.z;
				}
				return out;
			}
		} catch (ignorePoint) {}
		vector = [];
		try {
			if (typeof value.length === "number" && value.length > 0 && value.length <= 4) {
				for (i = 0; i < value.length; i++) {
					item = value[i];
					if (typeof item !== "number" || isNaN(item)) {
						vector = [];
						break;
					}
					vector.push(item);
				}
				if (vector.length) {
					return vector;
				}
			}
		} catch (ignoreVector) {}
		return null;
	},

	jsonSafeOptions: function (options) {
		var out = [];
		var i;
		var option;
		var label;
		var value;
		if (!options || !options.length) {
			return [];
		}
		for (i = 0; i < options.length; i++) {
			option = options[i];
			if (option === undefined || option === null) {
				continue;
			}
			try {
				if (typeof option === "string" || typeof option === "number") {
					out.push({ value: i, label: String(option) });
					continue;
				}
				label = option.label == null ? "" : String(option.label);
				value = option.value;
				if (typeof value !== "number") {
					value = i;
				}
				if (label) {
					out.push({ value: value, label: label });
				}
			} catch (ignoreOption) {}
		}
		return out;
	},

	jsonSafeParameterList: function (parameters) {
		var out = [];
		var i;
		var param;
		var item;
		if (!parameters || !parameters.length) {
			return [];
		}
		for (i = 0; i < parameters.length; i++) {
			param = parameters[i];
			if (!param) {
				continue;
			}
			try {
				item = {
					displayName: param.displayName == null ? "" : String(param.displayName),
					index: param.index,
					value: $._pickfx.jsonSafeValue(
						(param.value !== undefined && param.value !== null) ? param.value : param.currentValue
					),
					type: (param.type && param.type !== "unknown")
						? String(param.type)
						: (param.runtimeType ? String(param.runtimeType) : (param.type == null ? "unknown" : String(param.type))),
					writable: param.writable !== undefined ? !!param.writable : param.hasSetValue === true
				};
				if (typeof param.min === "number" && !isNaN(param.min)) {
					item.min = param.min;
				}
				if (typeof param.max === "number" && !isNaN(param.max)) {
					item.max = param.max;
				}
				if (typeof param.dimensions === "number" && !isNaN(param.dimensions)) {
					item.dimensions = param.dimensions;
				}
				if (param.unit) {
					item.unit = String(param.unit);
				}
				if (param.options && param.options.length) {
					item.options = $._pickfx.jsonSafeOptions(param.options);
				}
				out.push(item);
			} catch (ignoreItem) {}
		}
		return out;
	},

	jsonSafeInspectTree: function (value) {
		var t;
		var i;
		var key;
		var out;
		try {
			t = typeof value;
		} catch (e) {
			return null;
		}
		if (value === undefined) {
			return undefined;
		}
		if (value === null || t === "boolean" || t === "string") {
			return value;
		}
		if (t === "number") {
			if (isNaN(value)) {
				return null;
			}
			return value;
		}
		if (t !== "object") {
			return null;
		}
		try {
			if (typeof value.length === "number" && value.length >= 0 && value.length < 256 &&
					(value.join || Object.prototype.toString.call(value) === "[object Array]")) {
				out = [];
				for (i = 0; i < value.length; i++) {
					out.push($._pickfx.jsonSafeInspectTree(value[i]));
				}
				return out;
			}
		} catch (ignoreArr) {}
		out = {};
		try {
			for (key in value) {
				if (value.hasOwnProperty(key)) {
					out[key] = $._pickfx.jsonSafeInspectTree(value[key]);
				}
			}
		} catch (ignoreObj) {
			return $._pickfx.jsonSafeValue(value);
		}
		return out;
	},

	jsonSafeInspectParameterList: function (parameters) {
		var out = [];
		var i;
		var param;
		var item;
		if (!parameters || !parameters.length) {
			return [];
		}
		for (i = 0; i < parameters.length; i++) {
			param = parameters[i];
			if (!param) {
				continue;
			}
			try {
				item = {
					displayName: param.displayName == null ? "" : String(param.displayName),
					index: param.index,
					type: param.type == null ? "unknown" : String(param.type),
					writable: !!param.writable,
					value: $._pickfx.jsonSafeValue(param.value)
				};
				if (param.raw) {
					item.raw = $._pickfx.jsonSafeInspectTree(param.raw);
				}
				if (param.domCapabilities) {
					item.domCapabilities = $._pickfx.jsonSafeInspectTree(param.domCapabilities);
				}
				if (param.metadata) {
					item.metadata = $._pickfx.jsonSafeInspectTree(param.metadata);
				}
				if (param.identity) {
					item.identity = $._pickfx.jsonSafeInspectTree(param.identity);
				}
				if (param.objectKeys) {
					item.objectKeys = $._pickfx.jsonSafeInspectTree(param.objectKeys);
				}
				if (param.forInKeys) {
					item.forInKeys = $._pickfx.jsonSafeInspectTree(param.forInKeys);
				}
				if (param.ownPropertyNames) {
					item.ownPropertyNames = $._pickfx.jsonSafeInspectTree(param.ownPropertyNames);
				}
				if (param.prototypeChain) {
					item.prototypeChain = $._pickfx.jsonSafeInspectTree(param.prototypeChain);
				}
				if (param.candidateMetadata) {
					item.candidateMetadata = $._pickfx.jsonSafeInspectTree(param.candidateMetadata);
				}
				if (param.reflection) {
					item.reflection = $._pickfx.jsonSafeInspectTree(param.reflection);
				}
				if (param.accessorDescriptors) {
					item.accessorDescriptors = $._pickfx.jsonSafeInspectTree(param.accessorDescriptors);
				}
				if (param.visibilityEvidence) {
					item.visibilityEvidence = $._pickfx.jsonSafeInspectTree(param.visibilityEvidence);
				}
				out.push(item);
			} catch (ignoreItem) {}
		}
		return out;
	},

	jsonSafeParamResult: function (result) {
		var copy = {};
		var key;
		var first;
		var own;
		if (!result) {
			return {
				ok: false,
				reason: "WRITE_FAILED",
				detail: "Empty parameter result."
			};
		}
		for (key in result) {
			own = false;
			try {
				own = Object.prototype.hasOwnProperty.call(result, key);
			} catch (ignoreOwn) {
				own = true;
			}
			if (own && key !== "_param" && key !== "_component") {
				copy[key] = result[key];
			}
		}
		if (copy.parameters) {
			try {
				first = copy.parameters[0];
				if (first && typeof $._pickfxUniversalParameterInspect !== "undefined" &&
						$._pickfxUniversalParameterInspect.isSnapshot &&
						$._pickfxUniversalParameterInspect.isSnapshot(first)) {
					copy.parameters = $._pickfx.jsonSafeInspectTree(copy.parameters);
				} else if (first && (first.raw || first.domCapabilities || first.identity || first.objectKeys || first.candidateMetadata)) {
					copy.parameters = $._pickfx.jsonSafeInspectParameterList(copy.parameters);
				} else {
					copy.parameters = $._pickfx.jsonSafeParameterList(copy.parameters);
				}
			} catch (ignoreList) {
				copy.parameters = [];
			}
		}
		if (copy.candidates) {
			try {
				copy.candidates = $._pickfx.jsonSafeInspectTree(copy.candidates);
			} catch (ignoreCandidates) {
				copy.candidates = [];
			}
		}
		if (copy.unambiguousCandidates) {
			try {
				copy.unambiguousCandidates = $._pickfx.jsonSafeInspectTree(copy.unambiguousCandidates);
			} catch (ignoreUnamb) {
				copy.unambiguousCandidates = [];
			}
		}
		if (copy.ambiguousCandidates) {
			try {
				copy.ambiguousCandidates = $._pickfx.jsonSafeInspectTree(copy.ambiguousCandidates);
			} catch (ignoreAmb) {
				copy.ambiguousCandidates = [];
			}
		}
		if (copy.sections) {
			try {
				copy.sections = $._pickfx.jsonSafeInspectTree(copy.sections);
			} catch (ignoreSections) {
				copy.sections = [];
			}
		}
		if (copy.choices) {
			try {
				copy.choices = $._pickfx.jsonSafeInspectTree(copy.choices);
			} catch (ignoreChoices) {
				copy.choices = [];
			}
		}
		if (copy.picker) {
			try {
				copy.picker = $._pickfx.jsonSafeInspectTree(copy.picker);
			} catch (ignorePicker) {
				copy.picker = undefined;
			}
		}
		if (copy.componentHost) {
			try {
				copy.componentHost = $._pickfx.jsonSafeInspectTree(copy.componentHost);
			} catch (ignoreComponent) {
				copy.componentHost = { error: "componentHost could not be serialized." };
			}
		}
		if (copy.objectKeys) {
			copy.objectKeys = $._pickfx.jsonSafeInspectTree(copy.objectKeys);
		}
		if (copy.forInKeys) {
			copy.forInKeys = $._pickfx.jsonSafeInspectTree(copy.forInKeys);
		}
		if (copy.ownPropertyNames) {
			copy.ownPropertyNames = $._pickfx.jsonSafeInspectTree(copy.ownPropertyNames);
		}
		if (copy.prototypeChain) {
			copy.prototypeChain = $._pickfx.jsonSafeInspectTree(copy.prototypeChain);
		}
		if (copy.candidateMetadata) {
			copy.candidateMetadata = $._pickfx.jsonSafeInspectTree(copy.candidateMetadata);
		}
		if (copy.reflection) {
			copy.reflection = $._pickfx.jsonSafeInspectTree(copy.reflection);
		}
		if (copy.accessorDescriptors) {
			copy.accessorDescriptors = $._pickfx.jsonSafeInspectTree(copy.accessorDescriptors);
		}
		if (copy.visibilityEvidence) {
			copy.visibilityEvidence = $._pickfx.jsonSafeInspectTree(copy.visibilityEvidence);
		}
		if (copy.conclusions) {
			copy.conclusions = $._pickfx.jsonSafeInspectTree(copy.conclusions);
		}
		if (copy.exposedFields) {
			copy.exposedFields = $._pickfx.jsonSafeInspectTree(copy.exposedFields);
		}
		if (copy.identity) {
			copy.identity = $._pickfx.jsonSafeInspectTree(copy.identity);
		}
		if (copy.raw) {
			copy.raw = $._pickfx.jsonSafeInspectTree(copy.raw);
		}
		if (copy.metadata) {
			copy.metadata = $._pickfx.jsonSafeInspectTree(copy.metadata);
		}
		if (copy.domCapabilities) {
			copy.domCapabilities = $._pickfx.jsonSafeInspectTree(copy.domCapabilities);
		}
		if (copy.clips) {
			copy.clips = $._pickfx.jsonSafeInspectTree(copy.clips);
		}
		if (copy.summary) {
			copy.summary = $._pickfx.jsonSafeInspectTree(copy.summary);
		}
		if (copy.debugSelection) {
			copy.debugSelection = $._pickfx.jsonSafeInspectTree(copy.debugSelection);
		}
		if (copy.runtime) {
			copy.runtime = $._pickfx.jsonSafeInspectTree(copy.runtime);
		}
		if (copy.components) {
			copy.components = $._pickfx.jsonSafeInspectTree(copy.components);
		}
		if (copy.originalValue !== undefined) {
			copy.originalValue = $._pickfx.jsonSafeInspectTree(copy.originalValue);
		}
		if (copy.actualValue !== undefined && typeof copy.actualValue === "object") {
			copy.actualValue = $._pickfx.jsonSafeInspectTree(copy.actualValue);
		}
		if (copy.tests) {
			copy.tests = $._pickfx.jsonSafeInspectTree(copy.tests);
		}
		if (copy.candidateResults) {
			try {
				copy.candidateResults = $._pickfx.jsonSafeInspectTree(copy.candidateResults);
			} catch (ignoreCandidateResults) {
				copy.candidateResults = [];
			}
		}
		if (copy.matches) {
			copy.matches = $._pickfx.jsonSafeInspectTree(copy.matches);
		}
		if (copy.capabilities) {
			copy.capabilities = $._pickfx.jsonSafeInspectTree(copy.capabilities);
		}
		if (copy.confirmedWrites) {
			copy.confirmedWrites = $._pickfx.jsonSafeInspectTree(copy.confirmedWrites);
		}
		if (copy.unsupported) {
			copy.unsupported = $._pickfx.jsonSafeInspectTree(copy.unsupported);
		}
		if (copy.unknown) {
			copy.unknown = $._pickfx.jsonSafeInspectTree(copy.unknown);
		}
		if (copy.comparison) {
			copy.comparison = $._pickfx.jsonSafeInspectTree(copy.comparison);
		}
		if (copy.lumetriInstances) {
			copy.lumetriInstances = $._pickfx.jsonSafeInspectTree(copy.lumetriInstances);
		}
		if (copy.parameterComparison) {
			copy.parameterComparison = $._pickfx.jsonSafeInspectTree(copy.parameterComparison);
		}
		if (copy.saturationIdentities) {
			copy.saturationIdentities = $._pickfx.jsonSafeInspectTree(copy.saturationIdentities);
		}
		if (copy.effectControlsProbes) {
			copy.effectControlsProbes = $._pickfx.jsonSafeInspectTree(copy.effectControlsProbes);
		}
		if (copy.identityComparison) {
			copy.identityComparison = $._pickfx.jsonSafeInspectTree(copy.identityComparison);
		}
		if (copy.officialAdobeApi) {
			copy.officialAdobeApi = $._pickfx.jsonSafeInspectTree(copy.officialAdobeApi);
		}
		if (copy.allComponents) {
			copy.allComponents = $._pickfx.jsonSafeInspectTree(copy.allComponents);
		}
		if (copy.answers) {
			copy.answers = $._pickfx.jsonSafeInspectTree(copy.answers);
		}
		if (copy.steps) {
			copy.steps = $._pickfx.jsonSafeInspectTree(copy.steps);
		}
		if (copy.originals) {
			copy.originals = $._pickfx.jsonSafeInspectTree(copy.originals);
		}
		if (copy.restored) {
			copy.restored = $._pickfx.jsonSafeInspectTree(copy.restored);
		}
		if (copy.testValues) {
			copy.testValues = $._pickfx.jsonSafeInspectTree(copy.testValues);
		}
		if (copy.verifiedRestore) {
			copy.verifiedRestore = $._pickfx.jsonSafeInspectTree(copy.verifiedRestore);
		}
		copy.usedQE = false;
		return copy;
	},

	compactTerminalWriteResult: function (result) {
		var clips = [];
		var i;
		var clip;
		if (!result) {
			return {
				ok: false,
				reason: "WRITE_FAILED",
				detail: "Empty parameter result.",
				verified: false,
				targetLocked: false
			};
		}
		if (result.clips) {
			for (i = 0; i < result.clips.length; i++) {
				clip = result.clips[i] || {};
				clips.push({
					clip: clip.clip,
					ok: clip.ok === true,
					verified: clip.verified === true,
					effectApplied: clip.effectApplied === true,
					effectAlreadyExisted: clip.effectAlreadyExisted === true,
					requestedValue: clip.requestedValue,
					actualValue: clip.actualValue,
					reason: clip.reason,
					detail: clip.detail
				});
			}
		}
		return {
			ok: result.ok === true,
			verified: result.verified === true,
			targetLocked: result.targetLocked === true,
			command: true,
			productionTerminal: true,
			confirmed: result.confirmed === true,
			effect: result.effect || "",
			parameter: result.parameter || "",
			value: result.value,
			requestedValue: result.requestedValue,
			actualValue: result.actualValue,
			readBack: result.readBack,
			reason: result.reason,
			detail: result.detail,
			selectedCount: result.selectedCount,
			successfulCount: result.successfulCount,
			failedCount: result.failedCount,
			verifiedCount: result.verifiedCount,
			clips: clips
		};
	},

	terminalParameterAliases: function (effectName, parameterName) {
		var names = [String(parameterName || "")];
		if (String(effectName) === "Gaussian Blur" && String(parameterName) === "Amount") {
			names.push("Blurriness");
		}
		return names;
	},

	writeTerminalParameterOnTrackItem: function (item, effectName, parameterName, value, parameterIndex, effectMatchName) {
		var written;
		var aliases;
		var i;
		if ($._pickfx.isLumetriEffect(effectName, effectMatchName)) {
			return $._pickfx.writeVerifiedLumetriParameter(
				item,
				parameterName,
				value,
				parameterIndex
			);
		}
		written = $._pickfxParameterWriter.set(
			item,
			effectName,
			parameterName,
			value
		);
		if (written && written.ok) {
			return written;
		}
		aliases = $._pickfx.terminalParameterAliases(effectName, parameterName);
		for (i = 1; i < aliases.length; i++) {
			if (!written || written.reason !== "PARAMETER_NOT_FOUND") {
				break;
			}
			written = $._pickfxParameterWriter.set(
				item,
				effectName,
				aliases[i],
				value
			);
			if (written && written.ok) {
				return written;
			}
		}
		return written;
	},

	readClipParameterValue: function (parameterName) {
		var selected;
		var resolved;
		var value;
		try {
			if (typeof $._pickfxParameterResolver === "undefined") {
				return JSON.stringify({
					ok: false,
					reason: "SAFE_EXECUTOR_UNAVAILABLE",
					targetLocked: false
				});
			}
			selected = $._pickfx.firstSelectedVideoTrackItem();
			if (!selected.ok) {
				return JSON.stringify({
					ok: false,
					reason: selected.reason || "NO_VIDEO_SELECTION",
					targetLocked: false
				});
			}
			if (typeof $._pickfxParameterResolver.resolveClipParameter === "function") {
				resolved = $._pickfxParameterResolver.resolveClipParameter(
					selected.trackItem,
					parameterName
				);
			}
			if ((!resolved || !resolved.ok || !resolved._param) &&
					typeof $._pickfxParameterResolver.resolveMotionParameter === "function") {
				resolved = $._pickfxParameterResolver.resolveMotionParameter(
					selected.trackItem,
					parameterName
				);
			}
			if (!resolved || !resolved.ok || !resolved._param) {
				return JSON.stringify({
					ok: false,
					reason: (resolved && resolved.reason) || "PARAMETER_NOT_FOUND",
					targetLocked: true
				});
			}
			try {
				value = resolved._param.getValue();
			} catch (readErr) {
				return JSON.stringify({
					ok: false,
					reason: "WRITE_FAILED",
					detail: String(readErr),
					targetLocked: true
				});
			}
			return JSON.stringify({
				ok: true,
				value: value,
				effect: resolved.effect ? resolved.effect.displayName : "",
				parameter: resolved.parameter ? resolved.parameter.displayName : String(parameterName || ""),
				targetLocked: true
			});
		} catch (e) {
			return JSON.stringify({
				ok: false,
				reason: "WRITE_FAILED",
				detail: String(e),
				targetLocked: false
			});
		}
	},

	readTerminalParameterValue: function (effectName, parameterName) {
		var selected;
		var resolved;
		try {
			if (typeof $._pickfxParameterResolver === "undefined") {
				return JSON.stringify({
					ok: false,
					reason: "SAFE_EXECUTOR_UNAVAILABLE",
					targetLocked: false
				});
			}
			selected = $._pickfx.firstSelectedVideoTrackItem();
			if (!selected.ok) {
				return JSON.stringify({
					ok: false,
					reason: selected.reason || "NO_VIDEO_SELECTION",
					targetLocked: false
				});
			}
			resolved = $._pickfxParameterResolver.resolve(
				selected.trackItem,
				effectName,
				parameterName
			);
			if (!resolved || !resolved.ok || !resolved.parameter) {
				return JSON.stringify({
					ok: false,
					reason: (resolved && resolved.reason) || "PARAMETER_NOT_FOUND",
					targetLocked: true
				});
			}
			return JSON.stringify({
				ok: true,
				value: resolved.parameter.value,
				effect: resolved.effect ? resolved.effect.displayName : String(effectName || ""),
				parameter: resolved.parameter.displayName,
				targetLocked: true
			});
		} catch (e) {
			return JSON.stringify({
				ok: false,
				reason: "WRITE_FAILED",
				detail: String(e),
				targetLocked: false
			});
		}
	},

	confirmParameterOnTrackItem: function (trackItem, effectName, parameterName, value) {
		var resolved;
		var actual;
		var verified;
		resolved = $._pickfxParameterResolver.resolve(trackItem, effectName, parameterName);
		if (!resolved || !resolved.ok || !resolved._param) {
			return {
				ok: false,
				verified: false,
				reason: (resolved && resolved.reason) || "PARAMETER_NOT_FOUND",
				detail: (resolved && resolved.detail) || "Parameter not found.",
				effect: String(effectName || ""),
				parameter: String(parameterName || "")
			};
		}
		try {
			actual = resolved._param.getValue();
		} catch (readErr) {
			return {
				ok: false,
				verified: false,
				reason: "VALUE_NOT_VERIFIED",
				detail: "Value could not be verified.",
				effect: resolved.effect.displayName,
				parameter: resolved.parameter.displayName,
				requestedValue: value
			};
		}
		verified = $._pickfxParameterWriter.verifyWrite("number", value, actual, null);
		if (!verified || !verified.ok) {
			return {
				ok: false,
				verified: false,
				reason: "VALUE_NOT_VERIFIED",
				detail: "Value could not be verified.",
				effect: resolved.effect.displayName,
				parameter: resolved.parameter.displayName,
				requestedValue: value,
				actualValue: actual,
				readBack: actual
			};
		}
		return {
			ok: true,
			verified: true,
			effect: resolved.effect.displayName,
			parameter: resolved.parameter.displayName,
			requestedValue: value,
			actualValue: actual,
			readBack: actual
		};
	},

	resolveParameter: function (effectName, parameterName) {
		var selected;
		var resolved;

		try {
			if (typeof $._pickfxParameterResolver === "undefined") {
				return JSON.stringify({
					ok: false,
					reason: "EFFECT_NOT_FOUND",
					detail: "ParameterResolver.js is not loaded.",
					usedQE: false
				});
			}

			selected = $._pickfx.firstSelectedVideoTrackItem();
			if (!selected.ok) {
				selected.usedQE = false;
				return JSON.stringify(selected);
			}

			resolved = $._pickfxParameterResolver.resolve(
				selected.trackItem,
				effectName,
				parameterName
			);
			return JSON.stringify($._pickfx.jsonSafeParamResult(resolved));
		} catch (e) {
			return JSON.stringify({
				ok: false,
				reason: "EFFECT_NOT_FOUND",
				detail: String(e),
				usedQE: false
			});
		}
	},

	clipDisplayName: function (trackItem) {
		try {
			if (trackItem && trackItem.name !== undefined && trackItem.name !== null) {
				return String(trackItem.name);
			}
		} catch (ignore) {}
		return "";
	},

	effectExistsOnTrackItem: function (trackItem, effectName) {
		var listed;
		if (typeof $._pickfxParameterResolver === "undefined" || !$._pickfxParameterResolver.listParameters) {
			return false;
		}
		listed = $._pickfxParameterResolver.listParameters(trackItem, effectName);
		return !!(listed && listed.ok);
	},

	countEffectInstances: function (trackItem, effectName, effectMatchName) {
		var components;
		var countInfo;
		var indexBase;
		var wantedName = String(effectName || "").toLowerCase();
		var wantedMatch = String(effectMatchName || "");
		var component;
		var displayName;
		var matchName;
		var count = 0;
		var i;
		if (!trackItem || typeof $._pickfxParameterResolver === "undefined") {
			return 0;
		}
		try {
			components = trackItem.components;
		} catch (ignoreComponents) {
			return 0;
		}
		countInfo = $._pickfxParameterResolver.collectionCount(components);
		indexBase = $._pickfxParameterResolver.collectionIndexBase(
			components,
			countInfo.count
		);
		for (i = 0; i < countInfo.count; i++) {
			component = $._pickfxParameterResolver.collectionItem(
				components,
				i,
				indexBase
			);
			displayName = $._pickfxParameterResolver.readString(
				component,
				"displayName"
			);
			matchName = $._pickfxParameterResolver.readString(
				component,
				"matchName"
			);
			if ((wantedMatch && matchName === wantedMatch) ||
					(wantedName && displayName &&
						String(displayName).toLowerCase() === wantedName)) {
				count += 1;
			}
		}
		return count;
	},

	isLumetriEffect: function (effectName, effectMatchName) {
		return String(effectMatchName || "") === "AE.ADBE Lumetri" ||
			String(effectName || "") === "Lumetri Color";
	},

	writeVerifiedLumetriParameter: function (trackItem, parameterName, value, parameterIndex) {
		if (typeof $._pickfxConfirmedParameterWrites === "undefined" ||
				typeof $._pickfxConfirmedParameterWrites.write !== "function") {
			return {
				ok: false,
				verified: false,
				reason: "SAFE_EXECUTOR_UNAVAILABLE",
				detail: "Confirmed Lumetri writer is not loaded.",
				usedQE: false
			};
		}
		if (typeof $._pickfxConfirmedParameterWrites.writeLumetriParameter !== "function") {
			return {
				ok: false,
				verified: false,
				reason: "SAFE_EXECUTOR_UNAVAILABLE",
				detail: "Confirmed Lumetri writer is not loaded.",
				usedQE: false
			};
		}
		return $._pickfxConfirmedParameterWrites.writeLumetriParameter(
			trackItem,
			parameterName,
			{
				value: value,
				numbers: typeof value === "number" && isFinite(value) ? [value] : [],
				parameterIndex: typeof parameterIndex === "number" ? parameterIndex : undefined
			}
		);
	},

	qeApplyContext: function (effectName) {
		var effect;
		var qeSequence;
		try {
			$._pickfxQE.enable();
		} catch (qeEnableErr) {
			return { ok: false, detail: String(qeEnableErr) };
		}
		try {
			effect = $._pickfxQE.getVideoEffectByName(effectName);
		} catch (effectErr) {
			return { ok: false, detail: String(effectErr) };
		}
		try {
			qeSequence = qe.project.getActiveSequence();
		} catch (seqErr) {
			return { ok: false, detail: String(seqErr) };
		}
		if (!qeSequence) {
			return { ok: false, detail: "qe.project.getActiveSequence() returned nothing." };
		}
		return { ok: true, effect: effect, qeSequence: qeSequence };
	},

	effectPresentOnTrackItem: function (trackItem, effectName, effectMatchName) {
		if ($._pickfx.isLumetriEffect(effectName, effectMatchName)) {
			return $._pickfx.countEffectInstances(
				trackItem,
				effectName,
				effectMatchName || "AE.ADBE Lumetri"
			) > 0;
		}
		return $._pickfx.effectExistsOnTrackItem(trackItem, effectName);
	},

	ensureEffectOnTrackItem: function (trackItem, effectName, qeContext, effectMatchName) {
		var existed;
		var appliedResult;
		existed = $._pickfx.effectPresentOnTrackItem(
			trackItem,
			effectName,
			effectMatchName
		);
		if (existed) {
			return { ok: true, existed: true, applied: false };
		}
		if (!qeContext || !qeContext.ok) {
			return {
				ok: false,
				existed: false,
				applied: false,
				reason: "EFFECT_NOT_FOUND",
				detail: (qeContext && qeContext.detail) || "Could not apply effect."
			};
		}
		appliedResult = $._pickfxQE.applyEffectToTrackItem(trackItem, qeContext.effect, qeContext.qeSequence);
		if (!appliedResult || !appliedResult.ok) {
			return {
				ok: false,
				existed: false,
				applied: false,
				reason: "EFFECT_NOT_FOUND",
				detail: (appliedResult && appliedResult.error && (appliedResult.error.detail || appliedResult.error.reason)) || "Could not apply effect."
			};
		}
		if (!$._pickfx.effectPresentOnTrackItem(trackItem, effectName, effectMatchName)) {
			return {
				ok: false,
				existed: false,
				applied: true,
				reason: "EFFECT_NOT_FOUND",
				detail: "Effect was not resolvable after apply."
			};
		}
		return { ok: true, existed: false, applied: true };
	},

	ensureEffectOnSelection: function (effectName) {
		var selected;
		var qeContext;
		var i;
		var item;
		var ensured;
		var applied = 0;
		var failed = 0;
		var errors = [];

		try {
			selected = $._pickfx.selectedVideoTrackItems();
			if (!selected.ok) {
				return JSON.stringify({
					ok: false,
					reason: selected.reason || "NO_VIDEO_SELECTION",
					detail: selected.detail || "No selected video TrackItem.",
					applied: 0,
					failed: 0
				});
			}

			qeContext = null;
			for (i = 0; i < selected.items.length; i++) {
				item = selected.items[i];
				if ($._pickfx.effectExistsOnTrackItem(item, effectName)) {
					continue;
				}
				if (!qeContext) {
					qeContext = $._pickfx.qeApplyContext(effectName);
				}
				ensured = $._pickfx.ensureEffectOnTrackItem(item, effectName, qeContext);
				if (!ensured.ok) {
					failed += 1;
					errors.push({
						clip: $._pickfx.clipDisplayName(item),
						reason: ensured.reason || "EFFECT_NOT_FOUND",
						detail: ensured.detail || ""
					});
				} else if (ensured.applied) {
					applied += 1;
				}
			}

			return JSON.stringify({
				ok: true,
				applied: applied,
				failed: failed,
				errors: errors
			});
		} catch (e) {
			return JSON.stringify({
				ok: false,
				reason: "EFFECT_NOT_FOUND",
				detail: String(e),
				applied: 0,
				failed: 0
			});
		}
	},

	setNumericOnSelectedClips: function (effectName, parameterName, value) {
		var selected;
		var qeContext;
		var i;
		var item;
		var ensured;
		var written;
		var clipResults;
		var batch;
		var executor;
		var spec;

		selected = $._pickfx.selectedVideoTrackItems();
		if (!selected.ok) {
			return {
				ok: false,
				effect: String(effectName || ""),
				parameter: String(parameterName || ""),
				reason: selected.reason || "NO_VIDEO_SELECTION",
				detail: selected.detail || "No selected video TrackItem.",
				usedQE: false,
				debugSelection: selected.debug,
				runtime: {
					path: "no-selection",
					videoCount: 0,
					enteredBatchExecutor: false,
					setParameterReceived: "none",
					loopedClips: 0
				},
				selectedCount: 0,
				successfulCount: 0,
				failedCount: 0,
				verifiedCount: 0,
				summary: { selected: 0, successful: 0, failed: 0 },
				clips: []
			};
		}

		if (selected.count === 1) {
			written = $._pickfxParameterWriter.set(
				selected.items[0],
				effectName,
				parameterName,
				value
			);
			if (written) {
				written.debugSelection = selected.debug;
				written.runtime = {
					path: "single-clip-writer",
					videoCount: 1,
					enteredBatchExecutor: false,
					setParameterReceived: "one TrackItem",
					loopedClips: 1
				};
			}
			return written;
		}

		executor = typeof $._pickfxBatchNumericExecutor !== "undefined" ? $._pickfxBatchNumericExecutor : null;
		qeContext = null;
		clipResults = [];
		spec = {
			effect: String(effectName || ""),
			parameter: String(parameterName || ""),
			requestedValue: value
		};

		for (i = 0; i < selected.items.length; i++) {
			item = selected.items[i];
			if ($._pickfx.effectExistsOnTrackItem(item, effectName)) {
				ensured = { ok: true, existed: true, applied: false };
			} else {
				if (!qeContext) {
					qeContext = $._pickfx.qeApplyContext(effectName);
				}
				ensured = $._pickfx.ensureEffectOnTrackItem(item, effectName, qeContext);
			}
			if (!ensured.ok) {
				if (executor && executor.failClip) {
					clipResults.push(executor.failClip(
						{ name: $._pickfx.clipDisplayName(item) },
						ensured.reason || "EFFECT_NOT_FOUND",
						ensured.detail || "Effect not found.",
						{
							existed: !!ensured.existed,
							applied: !!ensured.applied,
							requestedValue: value
						}
					));
				} else {
					clipResults.push({
						clip: $._pickfx.clipDisplayName(item),
						ok: false,
						effectAlreadyExisted: !!ensured.existed,
						effectApplied: !!ensured.applied,
						parameterResolved: false,
						requestedValue: value,
						verified: false,
						reason: ensured.reason || "EFFECT_NOT_FOUND",
						detail: ensured.detail || "Effect not found."
					});
				}
				continue;
			}

			written = $._pickfxParameterWriter.set(item, effectName, parameterName, value);
			if (executor && executor.fromWriterResult) {
				clipResults.push(executor.fromWriterResult(written, { name: $._pickfx.clipDisplayName(item) }, {
					existed: !!ensured.existed,
					applied: !!ensured.applied,
					requestedValue: value
				}));
			} else {
				clipResults.push({
					clip: $._pickfx.clipDisplayName(item),
					ok: !!(written && written.ok && written.verified),
					effectAlreadyExisted: !!ensured.existed,
					effectApplied: !!ensured.applied,
					parameterResolved: !!(written && written.parameter),
					requestedValue: value,
					actualValue: written && written.readBack,
					verified: !!(written && written.ok && written.verified),
					reason: (written && written.ok && written.verified) ? undefined : ((written && written.reason) || "WRITE_FAILED"),
					detail: (written && written.ok && written.verified) ? undefined : (written && written.detail)
				});
			}
		}

		if (executor && executor.summarize) {
			batch = executor.summarize(spec, clipResults);
		} else {
			batch = {
				ok: false,
				batch: true,
				effect: spec.effect,
				parameter: spec.parameter,
				requestedValue: value,
				clips: clipResults
			};
		}
		if (batch) {
			batch.debugSelection = selected.debug;
			batch.runtime = {
				path: "batch",
				videoCount: selected.count,
				enteredBatchExecutor: true,
				setParameterReceived: "all selected video TrackItems",
				loopedClips: clipResults.length
			};
		}
		return batch;
	},

	setParameter: function (effectName, parameterName, value) {
		var written;

		try {
			if (typeof $._pickfxParameterWriter === "undefined") {
				return JSON.stringify({
					ok: false,
					effect: String(effectName || ""),
					parameter: String(parameterName || ""),
					reason: "WRITE_FAILED",
					detail: "ParameterWriter.js is not loaded.",
					usedQE: false
				});
			}

			written = $._pickfx.setNumericOnSelectedClips(effectName, parameterName, value);
			return JSON.stringify($._pickfx.jsonSafeParamResult(written));
		} catch (e) {
			return JSON.stringify({
				ok: false,
				effect: String(effectName || ""),
				parameter: String(parameterName || ""),
				reason: "WRITE_FAILED",
				detail: String(e),
				usedQE: false
			});
		}
	},

	setVerifiedTerminalEffectParameter: function (
		effectName,
		effectMatchName,
		parameterName,
		value,
		parameterIndex
	) {
		var selected;
		var executor;
		var qeContext = null;
		var clipResults = [];
		var spec;
		var i;
		var item;
		var instanceCount;
		var ensured;
		var written;
		var batch;
		var clipName;
		try {
			if (typeof $._pickfxParameterWriter === "undefined" ||
					typeof $._pickfxBatchNumericExecutor === "undefined") {
				return JSON.stringify({
					ok: false,
					reason: "SAFE_EXECUTOR_UNAVAILABLE",
					detail: "Verified terminal writer modules are not loaded.",
					verified: false,
					targetLocked: false
				});
			}
			selected = $._pickfx.selectedVideoTrackItems();
			if (!selected.ok) {
				return JSON.stringify({
					ok: false,
					reason: selected.reason || "NO_VIDEO_SELECTION",
					detail: selected.detail || "Select a video clip first.",
					verified: false,
					targetLocked: false,
					debugSelection: selected.debug
				});
			}
			executor = $._pickfxBatchNumericExecutor;
			spec = {
				effect: String(effectName || ""),
				parameter: String(parameterName || ""),
				requestedValue: value
			};
			for (i = 0; i < selected.items.length; i++) {
				item = selected.items[i];
				clipName = $._pickfx.clipDisplayName(item);
				instanceCount = $._pickfx.countEffectInstances(
					item,
					effectName,
					effectMatchName
				);
				if (instanceCount > 1) {
					clipResults.push(executor.failClip(
						{ name: clipName },
						"AMBIGUOUS_EFFECT_INSTANCE",
						"Multiple matching effect instances exist on the locked clip.",
						{
							existed: true,
							applied: false,
							requestedValue: value
						}
					));
					continue;
				}
				ensured = { ok: true, existed: instanceCount === 1, applied: false };
				if (instanceCount === 0) {
					if (!qeContext) {
						qeContext = $._pickfx.qeApplyContext(effectName);
					}
					ensured = $._pickfx.ensureEffectOnTrackItem(
						item,
						effectName,
						qeContext,
						effectMatchName
					);
				}
				if (!ensured.ok) {
					clipResults.push(executor.failClip(
						{ name: clipName },
						ensured.reason || "EFFECT_NOT_FOUND",
						ensured.detail || "Could not apply effect.",
						{
							existed: !!ensured.existed,
							applied: !!ensured.applied,
							requestedValue: value
						}
					));
					continue;
				}
				instanceCount = $._pickfx.countEffectInstances(
					item,
					effectName,
					effectMatchName
				);
				if (instanceCount !== 1) {
					clipResults.push(executor.failClip(
						{ name: clipName },
						instanceCount > 1
							? "AMBIGUOUS_EFFECT_INSTANCE"
							: "EFFECT_NOT_FOUND",
						"Exactly one matching effect instance is required.",
						{
							existed: !!ensured.existed,
							applied: !!ensured.applied,
							requestedValue: value
						}
					));
					continue;
				}
				written = $._pickfx.writeTerminalParameterOnTrackItem(
					item,
					effectName,
					parameterName,
					value,
					parameterIndex,
					effectMatchName
				);
				clipResults.push(executor.fromWriterResult(
					written,
					{ name: clipName },
					{
						existed: !!ensured.existed,
						applied: !!ensured.applied,
						requestedValue: value
					}
				));
			}
			batch = executor.summarize(spec, clipResults);
			batch.targetLocked = true;
			batch.productionTerminal = true;
			return JSON.stringify($._pickfx.compactTerminalWriteResult(batch));
		} catch (e) {
			return JSON.stringify({
				ok: false,
				reason: "WRITE_FAILED",
				detail: String(e),
				verified: false,
				targetLocked: false
			});
		}
	},

	confirmVerifiedTerminalEffectParameter: function (
		effectName,
		effectMatchName,
		parameterName,
		value
	) {
		var selected;
		var executor;
		var clipResults = [];
		var spec;
		var i;
		var n;
		var item;
		var written;
		var lastFail;
		var aliases;
		var batch;
		var clipName;
		try {
			if (typeof $._pickfxParameterWriter === "undefined" ||
					typeof $._pickfxParameterResolver === "undefined" ||
					typeof $._pickfxBatchNumericExecutor === "undefined") {
				return JSON.stringify({
					ok: false,
					reason: "SAFE_EXECUTOR_UNAVAILABLE",
					detail: "Verified terminal writer modules are not loaded.",
					verified: false,
					targetLocked: false
				});
			}
			selected = $._pickfx.selectedVideoTrackItems();
			if (!selected.ok) {
				return JSON.stringify({
					ok: false,
					reason: selected.reason || "NO_VIDEO_SELECTION",
					detail: selected.detail || "Select a video clip first.",
					verified: false,
					targetLocked: false
				});
			}
			executor = $._pickfxBatchNumericExecutor;
			spec = {
				effect: String(effectName || ""),
				parameter: String(parameterName || ""),
				requestedValue: value
			};
			aliases = $._pickfx.terminalParameterAliases(effectName, parameterName);
			for (i = 0; i < selected.items.length; i++) {
				item = selected.items[i];
				clipName = $._pickfx.clipDisplayName(item);
				written = null;
				lastFail = null;
				for (n = 0; n < aliases.length; n++) {
					written = $._pickfx.confirmParameterOnTrackItem(
						item,
						effectName,
						aliases[n],
						value
					);
					if (written && written.ok && written.verified) {
						break;
					}
					lastFail = written;
				}
				clipResults.push(executor.fromWriterResult(
					(written && written.ok) ? written : (lastFail || written),
					{ name: clipName },
					{
						existed: true,
						applied: false,
						requestedValue: value
					}
				));
			}
			batch = executor.summarize(spec, clipResults);
			batch.targetLocked = true;
			batch.productionTerminal = true;
			batch.confirmed = true;
			return JSON.stringify($._pickfx.compactTerminalWriteResult(batch));
		} catch (e) {
			return JSON.stringify({
				ok: false,
				reason: "WRITE_FAILED",
				detail: String(e),
				verified: false,
				targetLocked: false
			});
		}
	},

	ensureVerifiedTerminalEffect: function (effectName, effectMatchName) {
		var selected;
		var executor;
		var qeContext = null;
		var clipResults = [];
		var spec;
		var i;
		var item;
		var instanceCount;
		var ensured;
		var batch;
		var clipName;
		var wantedMatch = String(effectMatchName || "");
		try {
			if (typeof $._pickfxBatchNumericExecutor === "undefined") {
				return JSON.stringify({
					ok: false,
					reason: "SAFE_EXECUTOR_UNAVAILABLE",
					detail: "Verified terminal writer modules are not loaded.",
					verified: false,
					targetLocked: false
				});
			}
			selected = $._pickfx.selectedVideoTrackItems();
			if (!selected.ok) {
				return JSON.stringify({
					ok: false,
					reason: selected.reason || "NO_VIDEO_SELECTION",
					detail: selected.detail || "Select a video clip first.",
					verified: false,
					targetLocked: false,
					debugSelection: selected.debug
				});
			}
			executor = $._pickfxBatchNumericExecutor;
			spec = {
				effect: String(effectName || ""),
				parameter: "",
				requestedValue: null
			};
			for (i = 0; i < selected.items.length; i++) {
				item = selected.items[i];
				clipName = $._pickfx.clipDisplayName(item);
				instanceCount = $._pickfx.countEffectInstances(
					item,
					effectName,
					effectMatchName
				);
				if (instanceCount > 1) {
					clipResults.push(executor.failClip(
						{ name: clipName },
						"AMBIGUOUS_EFFECT_INSTANCE",
						"Multiple matching effect instances exist on the locked clip.",
						{
							existed: true,
							applied: false
						}
					));
					continue;
				}
				ensured = { ok: true, existed: instanceCount === 1, applied: false };
				if (instanceCount === 0) {
					if (!qeContext) {
						qeContext = $._pickfx.qeApplyContext(effectName);
					}
					ensured = $._pickfx.ensureEffectOnTrackItem(
						item,
						effectName,
						qeContext,
						effectMatchName
					);
				}
				if (!ensured.ok) {
					clipResults.push(executor.failClip(
						{ name: clipName },
						ensured.reason || "EFFECT_NOT_FOUND",
						ensured.detail || "Could not apply effect.",
						{
							existed: !!ensured.existed,
							applied: !!ensured.applied
						}
					));
					continue;
				}
				instanceCount = $._pickfx.countEffectInstances(
					item,
					effectName,
					effectMatchName
				);
				if (instanceCount !== 1) {
					clipResults.push(executor.failClip(
						{ name: clipName },
						instanceCount > 1
							? "AMBIGUOUS_EFFECT_INSTANCE"
							: "EFFECT_NOT_FOUND",
						"Exactly one matching effect instance is required.",
						{
							existed: !!ensured.existed,
							applied: !!ensured.applied
						}
					));
					continue;
				}
				if (wantedMatch &&
						$._pickfx.countEffectInstances(item, "", wantedMatch) !== 1) {
					clipResults.push(executor.failClip(
						{ name: clipName },
						"EFFECT_IDENTITY_MISMATCH",
						"Applied effect identity was not " + wantedMatch + ".",
						{
							existed: !!ensured.existed,
							applied: !!ensured.applied
						}
					));
					continue;
				}
				clipResults.push({
					clip: clipName,
					ok: true,
					effectAlreadyExisted: !!ensured.existed,
					effectApplied: !!ensured.applied,
					parameterResolved: false,
					verified: true,
					matchName: wantedMatch || null
				});
			}
			batch = executor.summarize(spec, clipResults);
			batch.targetLocked = true;
			batch.verified = batch.ok === true;
			batch.matchName = wantedMatch || null;
			batch.targetLock = {
				selectedCount: selected.count,
				videoItems: selected.debug && selected.debug.videoItems
					? selected.debug.videoItems
					: []
			};
			batch.debugSelection = selected.debug;
			batch.productionTerminal = true;
			return JSON.stringify($._pickfx.jsonSafeParamResult(batch));
		} catch (e) {
			return JSON.stringify({
				ok: false,
				reason: "EFFECT_NOT_FOUND",
				detail: String(e),
				verified: false,
				targetLocked: false
			});
		}
	},

	setTypedParameter: function (effectName, parameterName, value, kind, expectedLabel) {
		var selected;
		var written;

		try {
			if (typeof $._pickfxParameterWriter === "undefined" || !$._pickfxParameterWriter.setTyped) {
				return JSON.stringify({
					ok: false,
					effect: String(effectName || ""),
					parameter: String(parameterName || ""),
					reason: "TYPE_NOT_WRITABLE",
					detail: "Parameter type not writable yet.",
					usedQE: false
				});
			}

			selected = $._pickfx.firstSelectedVideoTrackItem();
			if (!selected.ok) {
				return JSON.stringify({
					ok: false,
					effect: String(effectName || ""),
					parameter: String(parameterName || ""),
					reason: selected.reason || "NO_VIDEO_SELECTION",
					detail: selected.detail || "No selected video TrackItem.",
					usedQE: false
				});
			}

			written = $._pickfxParameterWriter.setTyped(
				selected.trackItem,
				effectName,
				parameterName,
				value,
				kind,
				expectedLabel
			);
			return JSON.stringify($._pickfx.jsonSafeParamResult(written));
		} catch (e) {
			return JSON.stringify({
				ok: false,
				effect: String(effectName || ""),
				parameter: String(parameterName || ""),
				reason: "WRITE_FAILED",
				detail: String(e),
				usedQE: false
			});
		}
	},

	listEffectParameters: function (effectName) {
		var selected;
		var listed;
		var inspect;
		var mapped;
		var i;
		var row;

		try {
			if (typeof $._pickfxParameterResolver === "undefined") {
				return JSON.stringify({
					ok: false,
					reason: "EFFECT_NOT_FOUND",
					detail: "ParameterResolver.js is not loaded.",
					usedQE: false
				});
			}

			selected = $._pickfx.firstSelectedVideoTrackItem();
			if (!selected.ok) {
				selected.usedQE = false;
				return JSON.stringify(selected);
			}

			if ($._pickfx.isLumetriEffect(effectName, "") &&
					typeof $._pickfxColorParameterDiscover !== "undefined" &&
					typeof $._pickfxColorParameterDiscover.inspect === "function") {
				inspect = $._pickfxColorParameterDiscover.inspect(selected.trackItem);
				if (!inspect || inspect.ok !== true) {
					return JSON.stringify({
						ok: false,
						reason: (inspect && inspect.reason) || "EFFECT_NOT_FOUND",
						detail: (inspect && inspect.detail) || "Lumetri Color is not applied.",
						usedQE: false
					});
				}
				mapped = [];
				for (i = 0; i < (inspect.parameters || []).length; i++) {
					row = inspect.parameters[i];
					if (!row || !row.displayName) {
						continue;
					}
					mapped.push({
						index: typeof row.diagnosticIndex === "number"
							? row.diagnosticIndex
							: row.index,
						displayName: row.displayName,
						matchName: row.matchName || null,
						currentValue: row.currentValue,
						valueType: row.runtimeType || "number"
					});
				}
				return JSON.stringify($._pickfx.jsonSafeParamResult({
					ok: true,
					effect: "Lumetri Color",
					matchName: "AE.ADBE Lumetri",
					parameters: mapped,
					usedQE: false
				}));
			}

			listed = $._pickfxParameterResolver.listParameters(selected.trackItem, effectName);
			return JSON.stringify($._pickfx.jsonSafeParamResult(listed));
		} catch (e) {
			return JSON.stringify({
				ok: false,
				reason: "EFFECT_NOT_FOUND",
				detail: String(e),
				usedQE: false
			});
		}
	},

	inspectParameter: function (effectName, parameterName) {
		var selected;
		var inspected;

		try {
			if (typeof $._pickfxParameterResolver === "undefined" || !$._pickfxParameterResolver.inspectParameter) {
				return JSON.stringify({
					ok: false,
					reason: "EFFECT_NOT_FOUND",
					detail: "ParameterResolver.inspectParameter is not loaded.",
					usedQE: false
				});
			}

			selected = $._pickfx.firstSelectedVideoTrackItem();
			if (!selected.ok) {
				selected.usedQE = false;
				return JSON.stringify(selected);
			}

			inspected = $._pickfxParameterResolver.inspectParameter(
				selected.trackItem,
				effectName,
				parameterName
			);
			return JSON.stringify($._pickfx.jsonSafeParamResult(inspected));
		} catch (e) {
			return JSON.stringify({
				ok: false,
				reason: "EFFECT_NOT_FOUND",
				detail: String(e),
				usedQE: false
			});
		}
	},

	inspectBooleanCandidate: function (effectName, parameterName) {
		var selected;
		var inspected;

		try {
			if (typeof $._pickfxParameterResolver === "undefined" ||
					!$._pickfxParameterResolver.inspectBooleanCandidate) {
				return JSON.stringify({
					ok: false,
					reason: "EFFECT_NOT_FOUND",
					detail: "ParameterResolver.inspectBooleanCandidate is not loaded.",
					settersCalled: false,
					setColorValueCalled: false,
					usedQE: false
				});
			}

			selected = $._pickfx.firstSelectedVideoTrackItem();
			if (!selected.ok) {
				selected.usedQE = false;
				selected.settersCalled = false;
				selected.setColorValueCalled = false;
				return JSON.stringify(selected);
			}

			inspected = $._pickfxParameterResolver.inspectBooleanCandidate(
				selected.trackItem,
				effectName,
				parameterName
			);
			if (inspected) {
				inspected.settersCalled = false;
				inspected.setColorValueCalled = false;
				inspected.usedQE = false;
			}
			return JSON.stringify($._pickfx.jsonSafeParamResult(inspected));
		} catch (e) {
			return JSON.stringify({
				ok: false,
				reason: "EFFECT_NOT_FOUND",
				detail: String(e),
				settersCalled: false,
				setColorValueCalled: false,
				usedQE: false
			});
		}
	},

	testBooleanWrite: function (effectName, parameterName, declaredType) {
		var selected;
		var result;

		try {
			if (typeof $._pickfxBooleanWriteTest === "undefined" || !$._pickfxBooleanWriteTest.run) {
				return JSON.stringify({
					ok: false,
					stage: "RESOLVE",
					effect: String(effectName || ""),
					parameter: String(parameterName || ""),
					type: declaredType,
					writeVerified: false,
					restoreVerified: false,
					settersCalled: false,
					usedQE: false,
					method: "setValue(value, true)",
					detail: "BooleanWriteTest is not loaded."
				});
			}

			selected = $._pickfx.firstSelectedVideoTrackItem();
			if (!selected.ok) {
				return JSON.stringify({
					ok: false,
					stage: "RESOLVE",
					effect: String(effectName || ""),
					parameter: String(parameterName || ""),
					type: declaredType,
					writeVerified: false,
					restoreVerified: false,
					settersCalled: false,
					usedQE: false,
					method: "setValue(value, true)",
					reason: selected.reason || "NO_VIDEO_SELECTION",
					detail: selected.detail || "No selected video TrackItem."
				});
			}

			result = $._pickfxBooleanWriteTest.run(selected.trackItem, {
				effect: effectName,
				parameter: parameterName,
				type: declaredType
			});
			if (result) {
				result.usedQE = false;
				result.method = result.method || "setValue(value, true)";
			}
			return JSON.stringify($._pickfx.jsonSafeParamResult(result));
		} catch (e) {
			return JSON.stringify({
				ok: false,
				stage: "WRITE",
				effect: String(effectName || ""),
				parameter: String(parameterName || ""),
				type: declaredType,
				writeVerified: false,
				restoreVerified: false,
				settersCalled: false,
				usedQE: false,
				method: "setValue(value, true)",
				detail: String(e),
				premiereException: String(e)
			});
		}
	},

	inspectEffectParameters: function (effectName) {
		var selected;
		var inspected;

		try {
			if (typeof $._pickfxParameterResolver === "undefined" || !$._pickfxParameterResolver.inspectEffectParameters) {
				return JSON.stringify({
					ok: false,
					reason: "EFFECT_NOT_FOUND",
					detail: "ParameterResolver.inspectEffectParameters is not loaded.",
					usedQE: false
				});
			}

			selected = $._pickfx.firstSelectedVideoTrackItem();
			if (!selected.ok) {
				selected.usedQE = false;
				return JSON.stringify(selected);
			}

			inspected = $._pickfxParameterResolver.inspectEffectParameters(
				selected.trackItem,
				effectName
			);
			return JSON.stringify($._pickfx.jsonSafeParamResult(inspected));
		} catch (e) {
			return JSON.stringify({
				ok: false,
				reason: "EFFECT_NOT_FOUND",
				detail: String(e),
				usedQE: false
			});
		}
	},

	findTypedCandidates: function () {
		var selected;
		var report;

		try {
			if (typeof $._pickfxParameterResolver === "undefined" || !$._pickfxParameterResolver.scanTypedCandidates) {
				return JSON.stringify({
					ok: false,
					reason: "EFFECT_NOT_FOUND",
					detail: "Typed candidate scanner is not loaded.",
					booleanCandidates: [],
					enumCandidates: [],
					rejected: [],
					settersCalled: false,
					usedQE: false
				});
			}

			selected = $._pickfx.firstSelectedVideoTrackItem();
			if (!selected.ok) {
				return JSON.stringify({
					ok: false,
					reason: selected.reason || "NO_VIDEO_SELECTION",
					detail: selected.detail || "No selected video TrackItem.",
					booleanCandidates: [],
					enumCandidates: [],
					rejected: [],
					settersCalled: false,
					usedQE: false
				});
			}

			report = $._pickfxParameterResolver.scanTypedCandidates(selected.trackItem);
			if (!report) {
				report = {
					ok: false,
					booleanCandidates: [],
					enumCandidates: [],
					rejected: [],
					settersCalled: false,
					usedQE: false
				};
			}
			report.settersCalled = false;
			report.usedQE = false;
			return JSON.stringify($._pickfx.jsonSafeInspectTree(report));
		} catch (e) {
			return JSON.stringify({
				ok: false,
				reason: "EFFECT_NOT_FOUND",
				detail: String(e),
				booleanCandidates: [],
				enumCandidates: [],
				rejected: [],
				settersCalled: false,
				usedQE: false
			});
		}
	},

	testGenericParameterWrite: function (effectName, parameterName, value) {
		return $._pickfx.setParameter(effectName, parameterName, value);
	},

	inspectClipParameters: function () {
		var selected;
		var inspected;
		try {
			if (typeof $._pickfxMotionParameterInspect === "undefined" || !$._pickfxMotionParameterInspect.inspect) {
				return JSON.stringify({
					ok: false,
					reason: "EFFECT_NOT_FOUND",
					detail: "MotionParameterInspect.js is not loaded.",
					settersCalled: false,
					usedQE: false
				});
			}
			selected = $._pickfx.firstSelectedVideoTrackItem();
			if (!selected.ok) {
				selected.settersCalled = false;
				selected.usedQE = false;
				return JSON.stringify(selected);
			}
			inspected = $._pickfxMotionParameterInspect.inspect(selected.trackItem);
			inspected.settersCalled = false;
			inspected.usedQE = false;
			return JSON.stringify($._pickfx.jsonSafeParamResult(inspected));
		} catch (e) {
			return JSON.stringify({
				ok: false,
				reason: "EFFECT_NOT_FOUND",
				detail: String(e),
				settersCalled: false,
				usedQE: false
			});
		}
	},

	inspectMotionScale: function () {
		var selected;
		var inspected;
		try {
			if (typeof $._pickfxMotionScaleDiscover === "undefined" || !$._pickfxMotionScaleDiscover.discover) {
				return JSON.stringify({
					ok: false,
					operation: "motion.scale.discover",
					reason: "EFFECT_NOT_FOUND",
					detail: "MotionScaleDiscover.js is not loaded.",
					settersCalled: false,
					usedQE: false
				});
			}
			selected = $._pickfx.firstSelectedVideoTrackItem();
			if (!selected.ok) {
				selected.operation = "motion.scale.discover";
				selected.settersCalled = false;
				selected.usedQE = false;
				return JSON.stringify(selected);
			}
			inspected = $._pickfxMotionScaleDiscover.discover(selected.trackItem);
			if (inspected) {
				inspected.settersCalled = false;
				inspected.usedQE = false;
				inspected.operation = inspected.operation || "motion.scale.discover";
			}
			return JSON.stringify($._pickfx.jsonSafeParamResult(inspected));
		} catch (e) {
			return JSON.stringify({
				ok: false,
				operation: "motion.scale.discover",
				reason: "EFFECT_NOT_FOUND",
				detail: String(e),
				settersCalled: false,
				usedQE: false
			});
		}
	},

	testMotionScaleSemantics: function () {
		var selected;
		var result;
		try {
			if (typeof $._pickfxMotionScaleSemanticsTest === "undefined" || !$._pickfxMotionScaleSemanticsTest.run) {
				return JSON.stringify({
					ok: false,
					operation: "motion.scale.semantics.test",
					reason: "WRITE_FAILED",
					detail: "MotionScaleSemanticsTest.js is not loaded.",
					verified: false,
					settersCalled: false,
					usedQE: false,
					productionEnabled: false
				});
			}
			selected = $._pickfx.firstSelectedVideoTrackItem();
			if (!selected.ok) {
				return JSON.stringify({
					ok: false,
					operation: "motion.scale.semantics.test",
					reason: selected.reason || "NO_VIDEO_SELECTION",
					detail: selected.detail || "No selected video TrackItem.",
					verified: false,
					settersCalled: false,
					usedQE: false,
					productionEnabled: false
				});
			}
			result = $._pickfxMotionScaleSemanticsTest.run(selected.trackItem);
			if (result) {
				result.usedQE = false;
				result.operation = result.operation || "motion.scale.semantics.test";
				result.productionEnabled = false;
			}
			return JSON.stringify($._pickfx.jsonSafeParamResult(result));
		} catch (e) {
			return JSON.stringify({
				ok: false,
				operation: "motion.scale.semantics.test",
				reason: "WRITE_FAILED",
				detail: String(e),
				verified: false,
				settersCalled: false,
				usedQE: false,
				productionEnabled: false
			});
		}
	},

	findOpacityParameter: function () {
		var selected;
		var found;
		try {
			if (typeof $._pickfxMotionParameterInspect === "undefined" || !$._pickfxMotionParameterInspect.findByDisplayName) {
				return JSON.stringify({
					ok: false,
					reason: "PARAMETER_NOT_FOUND",
					detail: "MotionParameterInspect.js is not loaded.",
					query: "Opacity",
					matches: [],
					settersCalled: false,
					usedQE: false
				});
			}
			selected = $._pickfx.firstSelectedVideoTrackItem();
			if (!selected.ok) {
				selected.query = "Opacity";
				selected.matches = [];
				selected.settersCalled = false;
				selected.usedQE = false;
				return JSON.stringify(selected);
			}
			found = $._pickfxMotionParameterInspect.findByDisplayName(selected.trackItem, "Opacity");
			if (found) {
				found.settersCalled = false;
				found.usedQE = false;
				found.query = found.query || "Opacity";
			}
			return JSON.stringify($._pickfx.jsonSafeParamResult(found));
		} catch (e) {
			return JSON.stringify({
				ok: false,
				reason: "PARAMETER_NOT_FOUND",
				detail: String(e),
				query: "Opacity",
				matches: [],
				settersCalled: false,
				usedQE: false
			});
		}
	},

	inspectUniversalParameters: function () {
		var selected;
		var inspected;
		try {
			if (typeof $._pickfxUniversalParameterInspect === "undefined" || !$._pickfxUniversalParameterInspect.inspectMany) {
				return JSON.stringify({
					ok: false,
					reason: "EFFECT_NOT_FOUND",
					detail: "UniversalParameterInspect.js is not loaded.",
					settersCalled: false,
					usedQE: false
				});
			}
			selected = $._pickfx.selectedVideoTrackItems();
			if (!selected.ok) {
				selected.settersCalled = false;
				selected.usedQE = false;
				return JSON.stringify(selected);
			}
			inspected = $._pickfxUniversalParameterInspect.inspectMany(selected.items || []);
			if (inspected) {
				inspected.settersCalled = false;
				inspected.usedQE = false;
				inspected.debugSelection = selected.debug;
			}
			return JSON.stringify($._pickfx.jsonSafeParamResult(inspected));
		} catch (e) {
			return JSON.stringify({
				ok: false,
				reason: "EFFECT_NOT_FOUND",
				detail: String(e),
				settersCalled: false,
				usedQE: false
			});
		}
	},

	scanNumericCandidates: function () {
		var selected;
		var inspected;
		try {
			if (typeof $._pickfxNumericCandidateScan === "undefined" || !$._pickfxNumericCandidateScan.scanMany) {
				return JSON.stringify({
					ok: false,
					operation: "numeric.candidate.scan",
					reason: "EFFECT_NOT_FOUND",
					detail: "NumericCandidateScan.js is not loaded.",
					settersCalled: false,
					usedQE: false
				});
			}
			selected = $._pickfx.selectedVideoTrackItems();
			if (!selected.ok) {
				selected.operation = "numeric.candidate.scan";
				selected.settersCalled = false;
				selected.usedQE = false;
				return JSON.stringify(selected);
			}
			inspected = $._pickfxNumericCandidateScan.scanMany(selected.items || []);
			if (inspected) {
				inspected.operation = inspected.operation || "numeric.candidate.scan";
				inspected.settersCalled = false;
				inspected.usedQE = false;
				inspected.debugSelection = selected.debug;
			}
			return JSON.stringify($._pickfx.jsonSafeParamResult(inspected));
		} catch (e) {
			return JSON.stringify({
				ok: false,
				operation: "numeric.candidate.scan",
				reason: "EFFECT_NOT_FOUND",
				detail: String(e),
				settersCalled: false,
				usedQE: false
			});
		}
	},

	testParameterWrite: function (componentName, parameterName) {
		var selected;
		var result;
		try {
			if (typeof $._pickfxParameterWriteTest === "undefined" || !$._pickfxParameterWriteTest.run) {
				return JSON.stringify({
					ok: false,
					operation: "parameter.write.test",
					reason: "WRITE_FAILED",
					error: "ParameterWriteTest.js is not loaded.",
					verified: false,
					settersCalled: false,
					usedQE: false
				});
			}
			selected = $._pickfx.firstSelectedVideoTrackItem();
			if (!selected.ok) {
				return JSON.stringify({
					ok: false,
					operation: "parameter.write.test",
					reason: selected.reason || "NO_VIDEO_SELECTION",
					error: selected.detail || "No selected video TrackItem.",
					component: String(componentName || ""),
					parameter: String(parameterName || ""),
					verified: false,
					settersCalled: false,
					usedQE: false
				});
			}
			result = $._pickfxParameterWriteTest.run(selected.trackItem, componentName, parameterName);
			if (result) {
				result.usedQE = false;
				result.operation = result.operation || "parameter.write.test";
				result.bridgePath = "generic-parameter-write-test";
				result.hostFunction = "testParameterWrite";
			}
			return JSON.stringify($._pickfx.jsonSafeParamResult(result));
		} catch (e) {
			return JSON.stringify({
				ok: false,
				operation: "parameter.write.test",
				reason: "WRITE_FAILED",
				error: String(e),
				verified: false,
				settersCalled: false,
				usedQE: false
			});
		}
	},

	testNumericParameterWrite: function (componentName, parameterName) {
		var selected;
		var result;
		try {
			if (typeof $._pickfxParameterWriteTest === "undefined" ||
					(!$._pickfxParameterWriteTest.runNumeric && !$._pickfxParameterWriteTest.run)) {
				return JSON.stringify({
					ok: false,
					operation: "numeric.parameter.write.test",
					reason: "WRITE_FAILED",
					error: "ParameterWriteTest.js is not loaded.",
					verified: false,
					settersCalled: false,
					usedQE: false
				});
			}
			selected = $._pickfx.firstSelectedVideoTrackItem();
			if (!selected.ok) {
				return JSON.stringify({
					ok: false,
					operation: "numeric.parameter.write.test",
					reason: selected.reason || "NO_VIDEO_SELECTION",
					error: selected.detail || "No selected video TrackItem.",
					component: String(componentName || ""),
					parameter: String(parameterName || ""),
					verified: false,
					settersCalled: false,
					usedQE: false
				});
			}
			if ($._pickfxParameterWriteTest.runNumeric) {
				result = $._pickfxParameterWriteTest.runNumeric(selected.trackItem, componentName, parameterName);
			} else {
				result = $._pickfxParameterWriteTest.run(selected.trackItem, componentName, parameterName, { numericOnly: true });
			}
			if (result) {
				result.usedQE = false;
				result.operation = result.operation || "numeric.parameter.write.test";
			}
			return JSON.stringify($._pickfx.jsonSafeParamResult(result));
		} catch (e) {
			return JSON.stringify({
				ok: false,
				operation: "numeric.parameter.write.test",
				reason: "WRITE_FAILED",
				error: String(e),
				verified: false,
				settersCalled: false,
				usedQE: false
			});
		}
	},

	speedWriteStatus: function () {
		if (typeof $._pickfxSpeedOperation !== "undefined" && $._pickfxSpeedOperation.unsupportedWrite) {
			return JSON.stringify($._pickfxSpeedOperation.unsupportedWrite());
		}
		return JSON.stringify({
			ok: false,
			reason: "UNSUPPORTED_OPERATION",
			operation: "speed.write",
			readSupported: true,
			writeSupported: false,
			detail: "NO_PROVEN_PUBLIC_WRITE_API"
		});
	},

	writeClipParameter: function (trackItem, parameterName, input) {
		if (typeof $._pickfxConfirmedParameterWrites !== "undefined" && $._pickfxConfirmedParameterWrites.write) {
			return $._pickfxConfirmedParameterWrites.write(
				trackItem,
				parameterName,
				input,
				input && input.componentMatchName
					? String(input.componentMatchName)
					: ""
			);
		}
		return {
			ok: false,
			reason: "WRITE_FAILED",
			detail: "Confirmed parameter registry is not loaded.",
			parameter: String(parameterName || ""),
			scope: "clip",
			usedQE: false,
			productionEnabled: false
		};
	},

	setClipParameter: function (parameterName, input) {
		var selected;
		var i;
		var item;
		var written;
		var clipResults;
		var batch;
		var executor;
		var spec;
		var clipName;

		try {
			if (typeof $._pickfx.writeClipParameter !== "function") {
				return JSON.stringify({
					ok: false,
					reason: "WRITE_FAILED",
					detail: "Clip parameter writer is not loaded.",
					parameter: String(parameterName || "")
				});
			}

			selected = $._pickfx.selectedVideoTrackItems();
			if (!selected.ok) {
				return JSON.stringify({
					ok: false,
					reason: selected.reason || "NO_VIDEO_SELECTION",
					detail: selected.detail || "No selected video TrackItem.",
					parameter: String(parameterName || ""),
					debugSelection: selected.debug,
					clipParameter: true,
					selectedCount: 0,
					successfulCount: 0,
					failedCount: 0,
					clips: []
				});
			}

			executor = typeof $._pickfxBatchNumericExecutor !== "undefined" ? $._pickfxBatchNumericExecutor : null;
			clipResults = [];
			spec = {
				effect: "",
				parameter: String(parameterName || ""),
				requestedValue: input && input.value !== undefined ? input.value : input
			};

			for (i = 0; i < selected.items.length; i++) {
				item = selected.items[i];
				clipName = $._pickfx.clipDisplayName(item);
				written = $._pickfx.writeClipParameter(item, parameterName, input);
				if (written && (written.uiKind === "choose-lumetri" || written.uiKind === "choose-parameter")) {
					written.clipParameter = true;
					written.command = true;
					written.scope = "clip";
					written.usedQE = false;
					written.debugSelection = selected.debug;
					return JSON.stringify($._pickfx.jsonSafeParamResult(written));
				}
				if (executor && executor.fromWriterResult) {
					clipResults.push(executor.fromWriterResult(written, { name: clipName }, {
						existed: true,
						applied: false,
						requestedValue: spec.requestedValue
					}));
				} else {
					clipResults.push({
						clip: clipName,
						ok: !!(written && written.ok && written.verified),
						requestedValue: spec.requestedValue,
						actualValue: written && (written.actualValue !== undefined ? written.actualValue : written.readBack),
						verified: !!(written && written.ok && written.verified),
						reason: (written && written.ok && written.verified) ? undefined : ((written && written.reason) || "WRITE_FAILED"),
						parameterType: written && written.parameterType,
						originalValue: written && written.originalValue,
						method: written && written.method
					});
				}
			}

			if (executor && executor.summarize) {
				batch = executor.summarize(spec, clipResults);
			} else {
				batch = {
					ok: false,
					reason: "WRITE_FAILED",
					clips: clipResults
				};
			}
			if (batch) {
				batch.clipParameter = true;
				batch.scope = "clip";
				batch.usedQE = false;
				batch.targetLocked = true;
				batch.targetLock = {
					selectedCount: selected.count,
					videoItems: selected.debug && selected.debug.videoItems
						? selected.debug.videoItems
						: []
				};
				batch.debugSelection = selected.debug;
				batch.runtime = {
					path: "clip-parameter",
					videoCount: selected.count,
					enteredBatchExecutor: true,
					loopedClips: clipResults.length
				};
				if (written) {
					batch.component = written.component || written.effect;
					batch.parameterType = written.parameterType || written.type;
					batch.originalValue = written.originalValue;
					batch.timeVarying = written.timeVarying;
					batch.keyframesSupported = written.keyframesSupported;
					batch.method = written.method || "ComponentParam.setValue(value, true)";
					batch.type = written.type || written.parameterType;
					batch.productionEnabled = written.productionEnabled === true;
					batch.usedQE = false;
					if (written.uiKind) {
						batch.uiKind = written.uiKind;
					}
					if (written.componentMatchCount !== undefined) {
						batch.componentMatchCount = written.componentMatchCount;
					}
					if (written.matchCount !== undefined) {
						batch.matchCount = written.matchCount;
					}
					if (written.settersCalled !== undefined) {
						batch.settersCalled = written.settersCalled === true;
					}
					if (written.detail && !batch.detail) {
						batch.detail = written.detail;
					}
				}
			}
			return JSON.stringify($._pickfx.jsonSafeParamResult(batch));
		} catch (e) {
			return JSON.stringify({
				ok: false,
				reason: "WRITE_FAILED",
				detail: String(e),
				parameter: String(parameterName || ""),
				clipParameter: true
			});
		}
	},

	compactActionCall: function (call) {
		if (!call || typeof call !== "object") {
			return call || null;
		}
		return {
			name: call.name || null,
			invoked: call.invoked === true,
			threw: call.threw === true,
			unavailable: call.unavailable === true,
			skipped: call.skipped === true,
			reason: call.reason || null,
			returnTypeof: call.returnTypeof || null,
			returnValue: call.returnValue === undefined ? null : call.returnValue,
			exception: call.exception || null
		};
	},

	compactActionProbe: function (probe) {
		if (!probe || typeof probe !== "object") {
			return probe || null;
		}
		return {
			label: probe.label || null,
			threw: probe.threw === true,
			unavailable: probe.unavailable === true,
			returnTypeof: probe.returnTypeof || null,
			returnValue: probe.returnValue && probe.returnValue.json !== undefined
				? probe.returnValue.json
				: (probe.returnValue || null),
			exception: probe.exception || null
		};
	},

	compactActionRuntime: function (runtime) {
		var readable;
		if (!runtime || typeof runtime !== "object") {
			return runtime;
		}
		readable = runtime.readable ? String(runtime.readable) : "";
		if (readable.length > 2500) {
			readable = readable.substring(0, 2500) + "\n…truncated for CEP evalScript return…";
		}
		return {
			temporary: true,
			compacted: true,
			actionId: runtime.actionId || "",
			failingOperation: runtime.failingOperation || null,
			componentDisplayName: runtime.componentDisplayName || null,
			componentMatchName: runtime.componentMatchName || null,
			parameterDisplayName: runtime.parameterDisplayName || null,
			parameterMatchName: runtime.parameterMatchName || null,
			getValueTypeof: runtime.getValueTypeof || null,
			getValue: runtime.getValue && runtime.getValue.json !== undefined
				? runtime.getValue.json
				: runtime.getValue,
			areKeyframesSupported: runtime.areKeyframesSupported || null,
			isTimeVaryingBefore: runtime.isTimeVaryingBefore || null,
			isTimeVaryingAfter: runtime.isTimeVaryingAfter || null,
			requestedValues: runtime.requestedValues || null,
			calculatedStart: runtime.calculatedStart || null,
			calculatedEnd: runtime.calculatedEnd || null,
			clipTimes: runtime.clipTimes || null,
			sequenceTiming: runtime.sequenceTiming || null,
			startTimeObject: runtime.startTimeObject || null,
			endTimeObject: runtime.endTimeObject || null,
			setTimeVarying: $._pickfx.compactActionCall(runtime.setTimeVarying),
			addKeyStart: $._pickfx.compactActionCall(runtime.addKeyStart),
			addKeyEnd: $._pickfx.compactActionCall(runtime.addKeyEnd),
			setValueAtKeyStart: $._pickfx.compactActionCall(runtime.setValueAtKeyStart),
			setValueAtKeyEnd: $._pickfx.compactActionCall(runtime.setValueAtKeyEnd),
			getKeysBeforeCount: runtime.getKeysBeforeRaw && runtime.getKeysBeforeRaw.keys
				? runtime.getKeysBeforeRaw.keys.length
				: null,
			getKeysAfterCount: runtime.getKeysAfterRaw && runtime.getKeysAfterRaw.keys
				? runtime.getKeysAfterRaw.keys.length
				: null,
			getKeysAfter: runtime.getKeysAfterRaw && runtime.getKeysAfterRaw.keys
				? runtime.getKeysAfterRaw.keys
				: null,
			getValueAtTimeStart: $._pickfx.compactActionProbe(runtime.getValueAtTimeStart),
			getValueAtTimeEnd: $._pickfx.compactActionProbe(runtime.getValueAtTimeEnd),
			keyCoordinateGuess: runtime.keyCoordinateGuess && runtime.keyCoordinateGuess.guess
				? runtime.keyCoordinateGuess.guess
				: runtime.keyCoordinateGuess,
			caughtException: runtime.caughtException || null,
			resultOk: runtime.resultOk,
			resultReason: runtime.resultReason || null,
			semantics: runtime.semantics || null,
			readable: readable,
			diagnosticFile: "Desktop/action-debug.json"
		};
	},

	actionHostStatus: function () {
		return JSON.stringify({
			ok: true,
			host: true,
			runAction: typeof $._pickfx.runAction === "function",
			keyframeEngine: typeof $._pickfxKeyframeEngine !== "undefined" &&
				typeof $._pickfxKeyframeEngine.runAction === "function"
		});
	},

	presetHostStatus: function () {
		return JSON.stringify({
			ok: typeof $._pickfxPresetHost !== "undefined" &&
				typeof $._pickfxPresetHost.listCapturableComponents === "function" &&
				typeof $._pickfxPresetHost.applyPreset === "function",
			host: true,
			listCapturable: typeof $._pickfxPresetHost !== "undefined" &&
				typeof $._pickfxPresetHost.listCapturableComponents === "function",
			applyPreset: typeof $._pickfxPresetHost !== "undefined" &&
				typeof $._pickfxPresetHost.applyPreset === "function",
			presetHost: typeof $._pickfxPresetHost !== "undefined"
		});
	},

	listCapturableComponents: function () {
		try {
			if (typeof $._pickfxPresetHost === "undefined" || !$._pickfxPresetHost.listCapturableComponents) {
				return JSON.stringify({
					ok: false,
					reason: "WRITE_FAILED",
					detail: "PresetHost is not loaded.",
					preset: true
				});
			}
			return $._pickfxPresetHost.listCapturableComponents();
		} catch (e) {
			return JSON.stringify({
				ok: false,
				reason: "WRITE_FAILED",
				detail: String(e),
				preset: true
			});
		}
	},

	captureComponent: function (session, componentIndex, offset, limit) {
		try {
			if (typeof $._pickfxPresetHost === "undefined" || !$._pickfxPresetHost.captureComponent) {
				return JSON.stringify({
					ok: false,
					reason: "WRITE_FAILED",
					detail: "PresetHost is not loaded.",
					preset: true
				});
			}
			return $._pickfxPresetHost.captureComponent(session, componentIndex, offset, limit);
		} catch (e) {
			return JSON.stringify({
				ok: false,
				reason: "WRITE_FAILED",
				detail: String(e),
				preset: true
			});
		}
	},

	applyPickFXPreset: function (preset) {
		try {
			if (typeof $._pickfxPresetHost === "undefined" || !$._pickfxPresetHost.applyPreset) {
				return JSON.stringify({
					ok: false,
					reason: "WRITE_FAILED",
					detail: "PresetHost is not loaded.",
					preset: true
				});
			}
			return $._pickfxPresetHost.applyPreset(preset);
		} catch (e) {
			return JSON.stringify({
				ok: false,
				reason: "WRITE_FAILED",
				detail: String(e),
				preset: true
			});
		}
	},

	runAction: function (spec) {
		var result;
		var safe;
		var json;
		var i;
		try {
			if (typeof $._pickfxKeyframeEngine === "undefined" || !$._pickfxKeyframeEngine.runAction) {
				return JSON.stringify({
					ok: false,
					reason: "WRITE_FAILED",
					detail: "KeyframeEngine is not loaded.",
					action: true,
					command: true,
					verified: false,
					hostReady: true,
					runAction: true,
					keyframeEngine: false
				});
			}
			result = $._pickfxKeyframeEngine.runAction(spec);
			if (result) {
				result.action = true;
				result.command = true;
				result.usedQE = false;
				if (result.runtime) {
					result.runtime = $._pickfx.compactActionRuntime(result.runtime);
				}
				if (result.clips && result.clips.length) {
					for (i = 0; i < result.clips.length; i++) {
						if (result.clips[i] && result.clips[i].runtime) {
							result.clips[i].runtime = $._pickfx.compactActionRuntime(result.clips[i].runtime);
						}
					}
				}
			}
			safe = $._pickfx.jsonSafeParamResult(result);
			try {
				json = JSON.stringify(safe);
			} catch (serErr) {
				if (safe && safe.runtime) {
					safe.runtime = {
						stringifyFailed: true,
						failingOperation: safe.runtime.failingOperation || null,
						readable: safe.runtime.readable || null,
						error: String(serErr)
					};
				}
				json = JSON.stringify(safe);
			}
			if (json && json.length > 30000) {
				if (safe.runtime) {
					safe.runtime = {
						compacted: true,
						failingOperation: safe.runtime.failingOperation || null,
						resultReason: safe.runtime.resultReason || null,
						readable: "CEP evalScript return truncated; see Desktop/action-debug.json"
					};
				}
				if (safe.clips) {
					for (i = 0; i < safe.clips.length; i++) {
						if (safe.clips[i]) {
							safe.clips[i].runtime = undefined;
						}
					}
				}
				json = JSON.stringify(safe);
			}
			return json;
		} catch (e) {
			return JSON.stringify({
				ok: false,
				reason: "WRITE_FAILED",
				detail: String(e),
				action: true,
				command: true,
				verified: false,
				hostReady: true
			});
		}
	},

	testMotionWrite: function () {
		var selected;
		var result;
		try {
			if (typeof $._pickfxMotionWriteTest === "undefined" || !$._pickfxMotionWriteTest.run) {
				return JSON.stringify({
					ok: false,
					operation: "motion.write.test",
					reason: "WRITE_FAILED",
					error: "MotionWriteTest.js is not loaded.",
					verified: false,
					usedQE: false,
					writeMethod: "ComponentParam.setValue(value, true)",
					tests: []
				});
			}
			selected = $._pickfx.firstSelectedVideoTrackItem();
			if (!selected.ok) {
				return JSON.stringify({
					ok: false,
					operation: "motion.write.test",
					reason: selected.reason || "NO_VIDEO_SELECTION",
					error: selected.detail || "No selected video TrackItem.",
					verified: false,
					usedQE: false,
					writeMethod: "ComponentParam.setValue(value, true)",
					tests: []
				});
			}
			result = $._pickfxMotionWriteTest.run(selected.trackItem);
			if (result) {
				result.usedQE = false;
				result.operation = result.operation || "motion.write.test";
			}
			return JSON.stringify($._pickfx.jsonSafeParamResult(result));
		} catch (e) {
			return JSON.stringify({
				ok: false,
				operation: "motion.write.test",
				reason: "WRITE_EXCEPTION",
				error: String(e),
				verified: false,
				usedQE: false,
				writeMethod: "ComponentParam.setValue(value, true)",
				tests: []
			});
		}
	},

	inspectColorParameters: function () {
		var selected;
		var inspected;
		try {
			if (typeof $._pickfxColorParameterDiscover === "undefined" || !$._pickfxColorParameterDiscover.inspect) {
				return JSON.stringify({
					ok: false,
					operation: "color.parameter.discover",
					reason: "EFFECT_NOT_FOUND",
					detail: "ColorParameterDiscover.js is not loaded.",
					usedQE: false,
					productionEnabled: false,
					settersCalled: false,
					parameters: [],
					candidates: [],
					rejected: []
				});
			}
			selected = $._pickfx.firstSelectedVideoTrackItem();
			if (!selected.ok) {
				selected.operation = "color.parameter.discover";
				selected.settersCalled = false;
				selected.usedQE = false;
				selected.productionEnabled = false;
				return JSON.stringify(selected);
			}
			inspected = $._pickfxColorParameterDiscover.inspect(selected.trackItem);
			if (inspected) {
				inspected.settersCalled = false;
				inspected.writesPerformed = false;
				inspected.usedQE = false;
				inspected.productionEnabled = false;
				inspected.operation = inspected.operation || "color.parameter.discover";
			}
			return JSON.stringify($._pickfx.jsonSafeParamResult(inspected));
		} catch (e) {
			return JSON.stringify({
				ok: false,
				operation: "color.parameter.discover",
				reason: "EFFECT_NOT_FOUND",
				detail: String(e),
				usedQE: false,
				productionEnabled: false,
				settersCalled: false,
				parameters: [],
				candidates: [],
				rejected: []
			});
		}
	},

	inspectLumetriInstanceIdentity: function () {
		if (typeof $._pickfxLumetriInstanceIdentityInspect !== "undefined" &&
				typeof $._pickfxLumetriInstanceIdentityInspect.hostDebugRun === "function") {
			return $._pickfxLumetriInstanceIdentityInspect.hostDebugRun();
		}
		return JSON.stringify({
			ok: false,
			operation: "lumetri.instance.identity.inspect",
			reason: "EFFECT_NOT_FOUND",
			detail: "LumetriInstanceIdentityInspect.js is not loaded.",
			readOnly: true,
			usedQE: false,
			productionEnabled: false,
			settersCalled: false,
			writesPerformed: false,
			chosen: false,
			lumetriInstances: []
		});
	},

	inspectSaturationMatches: function () {
		var selected;
		var inspected;
		try {
			if (typeof $._pickfxColorParameterDiscover === "undefined" ||
					typeof $._pickfxColorParameterDiscover.inspectSaturationMatches !== "function") {
				return JSON.stringify({
					ok: false,
					operation: "color.saturation.matches",
					reason: "EFFECT_NOT_FOUND",
					detail: "ColorParameterDiscover.inspectSaturationMatches is not loaded.",
					usedQE: false,
					productionEnabled: false,
					settersCalled: false,
					writesPerformed: false,
					matchCount: 0,
					matches: []
				});
			}
			selected = $._pickfx.firstSelectedVideoTrackItem();
			if (!selected.ok) {
				selected.operation = "color.saturation.matches";
				selected.settersCalled = false;
				selected.writesPerformed = false;
				selected.usedQE = false;
				selected.productionEnabled = false;
				selected.matchCount = 0;
				selected.matches = selected.matches || [];
				return JSON.stringify(selected);
			}
			inspected = $._pickfxColorParameterDiscover.inspectSaturationMatches(selected.trackItem);
			if (inspected) {
				inspected.settersCalled = false;
				inspected.writesPerformed = false;
				inspected.usedQE = false;
				inspected.productionEnabled = false;
				inspected.operation = inspected.operation || "color.saturation.matches";
			}
			return JSON.stringify($._pickfx.jsonSafeParamResult(inspected));
		} catch (e) {
			return JSON.stringify({
				ok: false,
				operation: "color.saturation.matches",
				reason: "EFFECT_NOT_FOUND",
				detail: String(e),
				usedQE: false,
				productionEnabled: false,
				settersCalled: false,
				writesPerformed: false,
				matchCount: 0,
				matches: []
			});
		}
	},

	testColorParameterWrite: function (componentName, parameterName, componentMatchName, parameterMatchName) {
		return $._pickfx.debugColorParameterWriteTest({
			componentDisplayName: String(componentName || ""),
			componentMatchName: String(componentMatchName || ""),
			parameterDisplayName: String(parameterName || ""),
			parameterMatchName: String(parameterMatchName || ""),
			bridgePath: "color-parameter-write-test",
			debugButtonClicked: true,
			buttonId: "test-color-parameter-write-btn",
			handler: "invokeColorParameterWriteTest"
		});
	},

	debugColorParameterWriteTest: function (ident) {
		var payload;
		ident = ident || {};
		try {
			if ($._pickfx.__colorWriteTestLoaded === true &&
					typeof $._pickfxColorParameterWriteTest !== "undefined" &&
					typeof $._pickfxColorParameterWriteTest.hostDebugRun === "function") {
				return $._pickfxColorParameterWriteTest.hostDebugRun(ident);
			}
			payload = {
				ok: false,
				operation: "color.parameter.write.test",
				reason: "COLOR_WRITE_TEST_PATH_NOT_LOADED",
				detail: "ColorParameterWriteTest.js was not evalFile'd into the ExtendScript host. Color path does not fall back to ParameterWriteTest or UniversalParameterResolver.",
				runtimePath: "host.jsx.debugColorParameterWriteTest stub",
				resolverUsed: "none",
				globalSearchUsed: false,
				colorWriteTestLoaded: $._pickfx.__colorWriteTestLoaded === true,
				colorWriteTestFunctionAvailable: typeof $._pickfxColorParameterWriteTest !== "undefined" &&
					typeof $._pickfxColorParameterWriteTest.hostDebugRun === "function",
				hostFunction: "debugColorParameterWriteTest",
				bridgePath: ident.bridgePath || "color-parameter-write-test",
				debugButtonClicked: ident.debugButtonClicked === true,
				buttonId: ident.buttonId || "test-color-parameter-write-btn",
				handler: ident.handler || "invokeColorParameterWriteTest",
				debugButton: ident.debugButton || {
					clicked: ident.debugButtonClicked === true,
					id: ident.buttonId || "test-color-parameter-write-btn",
					handler: ident.handler || "invokeColorParameterWriteTest"
				},
				verified: false,
				settersCalled: false,
				usedQE: false,
				productionEnabled: false
			};
			return JSON.stringify(payload);
		} catch (e) {
			return JSON.stringify({
				ok: false,
				operation: "color.parameter.write.test",
				reason: "COLOR_WRITE_TEST_PATH_NOT_LOADED",
				error: String(e),
				runtimePath: "host.jsx.debugColorParameterWriteTest exception",
				resolverUsed: "none",
				globalSearchUsed: false,
				colorWriteTestLoaded: $._pickfx.__colorWriteTestLoaded === true,
				colorWriteTestFunctionAvailable: false,
				hostFunction: "debugColorParameterWriteTest",
				bridgePath: "color-parameter-write-test",
				verified: false,
				settersCalled: false,
				usedQE: false,
				productionEnabled: false
			});
		}
	},

	inspectAudioParameters: function () {
		var selected;
		var inspected;
		try {
			if (typeof $._pickfxAudioParameterDiscover === "undefined" || !$._pickfxAudioParameterDiscover.inspect) {
				return JSON.stringify({
					ok: false,
					operation: "audio.parameter.discover",
					reason: "EFFECT_NOT_FOUND",
					detail: "AudioParameterDiscover.js is not loaded.",
					usedQE: false,
					productionEnabled: false,
					settersCalled: false,
					parameters: [],
					candidates: [],
					rejected: []
				});
			}
			selected = $._pickfx.firstSelectedAudioTrackItem();
			if (!selected.ok) {
				selected.operation = "audio.parameter.discover";
				selected.settersCalled = false;
				selected.usedQE = false;
				selected.productionEnabled = false;
				return JSON.stringify(selected);
			}
			inspected = $._pickfxAudioParameterDiscover.inspect(selected.trackItem);
			if (inspected) {
				inspected.settersCalled = false;
				inspected.writesPerformed = false;
				inspected.usedQE = false;
				inspected.productionEnabled = false;
				inspected.operation = inspected.operation || "audio.parameter.discover";
			}
			return JSON.stringify($._pickfx.jsonSafeParamResult(inspected));
		} catch (e) {
			return JSON.stringify({
				ok: false,
				operation: "audio.parameter.discover",
				reason: "EFFECT_NOT_FOUND",
				detail: String(e),
				usedQE: false,
				productionEnabled: false,
				settersCalled: false,
				parameters: [],
				candidates: [],
				rejected: []
			});
		}
	},

	testAudioParameterWrite: function (componentName, parameterName, componentMatchName, parameterMatchName) {
		return $._pickfx.debugAudioParameterWriteTest({
			componentDisplayName: String(componentName || ""),
			componentMatchName: String(componentMatchName || ""),
			parameterDisplayName: String(parameterName || ""),
			parameterMatchName: String(parameterMatchName || ""),
			bridgePath: "audio-parameter-write-test",
			debugButtonClicked: true,
			buttonId: "test-audio-parameter-write-btn",
			handler: "invokeAudioParameterWriteTest"
		});
	},

	debugAudioParameterWriteTest: function (ident) {
		var payload;
		ident = ident || {};
		try {
			if ($._pickfx.__audioWriteTestLoaded === true &&
					typeof $._pickfxAudioParameterWriteTest !== "undefined" &&
					typeof $._pickfxAudioParameterWriteTest.hostDebugRun === "function") {
				return $._pickfxAudioParameterWriteTest.hostDebugRun(ident);
			}
			payload = {
				ok: false,
				operation: "audio.parameter.write.test",
				reason: "AUDIO_WRITE_TEST_PATH_NOT_LOADED",
				detail: "AudioParameterWriteTest.js was not evalFile'd into the ExtendScript host. Audio path does not fall back to ParameterWriteTest or UniversalParameterResolver.",
				runtimePath: "host.jsx.debugAudioParameterWriteTest stub",
				resolverUsed: "none",
				globalSearchUsed: false,
				audioWriteTestLoaded: $._pickfx.__audioWriteTestLoaded === true,
				audioWriteTestFunctionAvailable: typeof $._pickfxAudioParameterWriteTest !== "undefined" &&
					typeof $._pickfxAudioParameterWriteTest.hostDebugRun === "function",
				hostFunction: "debugAudioParameterWriteTest",
				bridgePath: ident.bridgePath || "audio-parameter-write-test",
				debugButtonClicked: ident.debugButtonClicked === true,
				buttonId: ident.buttonId || "test-audio-parameter-write-btn",
				handler: ident.handler || "invokeAudioParameterWriteTest",
				debugButton: ident.debugButton || {
					clicked: ident.debugButtonClicked === true,
					id: ident.buttonId || "test-audio-parameter-write-btn",
					handler: ident.handler || "invokeAudioParameterWriteTest"
				},
				verified: false,
				settersCalled: false,
				usedQE: false,
				productionEnabled: false
			};
			return JSON.stringify(payload);
		} catch (e) {
			return JSON.stringify({
				ok: false,
				operation: "audio.parameter.write.test",
				reason: "AUDIO_WRITE_TEST_PATH_NOT_LOADED",
				error: String(e),
				runtimePath: "host.jsx.debugAudioParameterWriteTest exception",
				resolverUsed: "none",
				globalSearchUsed: false,
				audioWriteTestLoaded: $._pickfx.__audioWriteTestLoaded === true,
				audioWriteTestFunctionAvailable: false,
				hostFunction: "debugAudioParameterWriteTest",
				bridgePath: "audio-parameter-write-test",
				verified: false,
				settersCalled: false,
				usedQE: false,
				productionEnabled: false
			});
		}
	},

	debugAudioLevelSetValueDiagnose: function (ident) {
		var payload;
		ident = ident || {};
		try {
			if (typeof $._pickfxAudioParameterWriteTest !== "undefined" &&
					typeof $._pickfxAudioParameterWriteTest.hostDebugDiagnose === "function") {
				return $._pickfxAudioParameterWriteTest.hostDebugDiagnose(ident);
			}
			payload = {
				ok: false,
				operation: "audio.parameter.setvalue.diagnose",
				reason: "AUDIO_SETVALUE_DIAGNOSE_NOT_LOADED",
				detail: "AudioParameterWriteTest.js was not evalFile'd into the ExtendScript host. Diagnose does not fall back to QE, setValueAtKey, or production writers.",
				runtimePath: "host.jsx.debugAudioLevelSetValueDiagnose stub",
				resolverUsed: "none",
				globalSearchUsed: false,
				hostFunction: "debugAudioLevelSetValueDiagnose",
				bridgePath: ident.bridgePath || "audio-level-setvalue-diagnose",
				debugButtonClicked: true,
				buttonId: ident.buttonId || "diagnose-audio-level-setvalue-btn",
				handler: ident.handler || "invokeAudioLevelSetValueDiagnose",
				debugButton: ident.debugButton || {
					clicked: true,
					id: ident.buttonId || "diagnose-audio-level-setvalue-btn",
					handler: ident.handler || "invokeAudioLevelSetValueDiagnose"
				},
				probeRan: false,
				verified: false,
				settersCalled: false,
				usedQE: false,
				productionEnabled: false
			};
			return JSON.stringify(payload);
		} catch (e) {
			return JSON.stringify({
				ok: false,
				operation: "audio.parameter.setvalue.diagnose",
				reason: "AUDIO_SETVALUE_DIAGNOSE_NOT_LOADED",
				error: String(e),
				runtimePath: "host.jsx.debugAudioLevelSetValueDiagnose exception",
				resolverUsed: "none",
				globalSearchUsed: false,
				hostFunction: "debugAudioLevelSetValueDiagnose",
				bridgePath: "audio-level-setvalue-diagnose",
				probeRan: false,
				verified: false,
				settersCalled: false,
				usedQE: false,
				productionEnabled: false
			});
		}
	},

	debugAudioLevelCapabilityProbe: function (ident) {
		var payload;
		ident = ident || {};
		try {
			if (typeof $._pickfxAudioLevelCapabilityProbe !== "undefined" &&
					typeof $._pickfxAudioLevelCapabilityProbe.hostDebugRun === "function") {
				return $._pickfxAudioLevelCapabilityProbe.hostDebugRun(ident);
			}
			payload = {
				ok: false,
				operation: "audio.parameter.capability.probe",
				reason: "AUDIO_CAPABILITY_PROBE_NOT_LOADED",
				detail: "AudioLevelCapabilityProbe.js was not evalFile'd into the ExtendScript host. Probe does not fall back to QE or production writers.",
				runtimePath: "host.jsx.debugAudioLevelCapabilityProbe stub",
				resolverUsed: "none",
				globalSearchUsed: false,
				hostFunction: "debugAudioLevelCapabilityProbe",
				bridgePath: ident.bridgePath || "audio-level-capability-probe",
				debugButtonClicked: true,
				buttonId: ident.buttonId || "probe-audio-level-capability-btn",
				handler: ident.handler || "invokeAudioLevelCapabilityProbe",
				probeRan: false,
				anyMethodWrote: false,
				settersCalled: false,
				usedQE: false,
				productionEnabled: false
			};
			return JSON.stringify(payload);
		} catch (e) {
			return JSON.stringify({
				ok: false,
				operation: "audio.parameter.capability.probe",
				reason: "AUDIO_CAPABILITY_PROBE_NOT_LOADED",
				error: String(e),
				runtimePath: "host.jsx.debugAudioLevelCapabilityProbe exception",
				hostFunction: "debugAudioLevelCapabilityProbe",
				bridgePath: "audio-level-capability-probe",
				probeRan: false,
				anyMethodWrote: false,
				usedQE: false,
				productionEnabled: false
			});
		}
	},

	diagnoseBlendMode: function () {
		try {
			if (typeof $._pickfxBlendModeDiagnostic === "undefined" || !$._pickfxBlendModeDiagnostic.hostDebugRun) {
				return JSON.stringify({
					ok: false,
					operation: "blendmode.parameter.diagnose",
					reason: "EFFECT_NOT_FOUND",
					detail: "BlendModeDiagnostic.js is not loaded.",
					usedQE: false,
					productionEnabled: false,
					settersCalled: false,
					writesPerformed: false,
					readOnly: true,
					blendModeMatches: [],
					nodes: []
				});
			}
			return $._pickfxBlendModeDiagnostic.hostDebugRun();
		} catch (e) {
			return JSON.stringify({
				ok: false,
				operation: "blendmode.parameter.diagnose",
				reason: "EFFECT_NOT_FOUND",
				detail: String(e),
				usedQE: false,
				productionEnabled: false,
				settersCalled: false,
				writesPerformed: false,
				readOnly: true,
				blendModeMatches: [],
				nodes: []
			});
		}
	},

	inspectEnumParameters: function () {
		var selected;
		var inspected;
		try {
			if (typeof $._pickfxEnumParameterDiscover === "undefined" || !$._pickfxEnumParameterDiscover.inspect) {
				return JSON.stringify({
					ok: false,
					operation: "enum.parameter.discover",
					reason: "EFFECT_NOT_FOUND",
					detail: "EnumParameterDiscover.js is not loaded.",
					usedQE: false,
					productionEnabled: false,
					settersCalled: false,
					parameters: [],
					candidates: [],
					rejected: [],
					blendModeMatches: []
				});
			}
			selected = $._pickfx.firstSelectedVideoTrackItem();
			if (!selected.ok) {
				selected.operation = "enum.parameter.discover";
				selected.settersCalled = false;
				selected.usedQE = false;
				selected.productionEnabled = false;
				return JSON.stringify(selected);
			}
			inspected = $._pickfxEnumParameterDiscover.inspect(selected.trackItem);
			if (inspected) {
				inspected.settersCalled = false;
				inspected.writesPerformed = false;
				inspected.usedQE = false;
				inspected.productionEnabled = false;
				inspected.operation = inspected.operation || "enum.parameter.discover";
			}
			return JSON.stringify($._pickfx.jsonSafeParamResult(inspected));
		} catch (e) {
			return JSON.stringify({
				ok: false,
				operation: "enum.parameter.discover",
				reason: "EFFECT_NOT_FOUND",
				detail: String(e),
				usedQE: false,
				productionEnabled: false,
				settersCalled: false,
				parameters: [],
				candidates: [],
				rejected: [],
				blendModeMatches: []
			});
		}
	},

	testEnumParameterWrite: function (componentName, parameterName, componentMatchName, parameterMatchName) {
		return $._pickfx.debugEnumParameterWriteTest({
			componentDisplayName: String(componentName || ""),
			componentMatchName: String(componentMatchName || ""),
			parameterDisplayName: String(parameterName || ""),
			parameterMatchName: String(parameterMatchName || ""),
			bridgePath: "enum-parameter-write-test",
			debugButtonClicked: true,
			buttonId: "test-enum-parameter-write-btn",
			handler: "invokeEnumParameterWriteTest"
		});
	},

	discoverEffectRegistry: function () {
		var selected;
		var inspected;
		try {
			if (typeof $._pickfxEffectRegistryDiscovery === "undefined" ||
					typeof $._pickfxEffectRegistryDiscovery.discover !== "function") {
				return JSON.stringify({
					ok: false,
					operation: "effect.registry.discovery",
					reason: "EFFECT_NOT_FOUND",
					detail: "EffectRegistryDiscovery.js is not loaded.",
					selectedClip: false,
					readOnly: true,
					usedQE: false,
					setValueCalls: 0,
					writeOperationCalls: 0,
					writesPerformed: false,
					settersCalled: false,
					components: [],
					registry: { components: [] }
				});
			}
			selected = $._pickfx.firstSelectedVideoTrackItem();
			if (!selected.ok) {
				inspected = $._pickfxEffectRegistryDiscovery.discoverSelected(selected);
				inspected.usedQE = false;
				inspected.setValueCalls = 0;
				inspected.writeOperationCalls = 0;
				inspected.writesPerformed = false;
				inspected.settersCalled = false;
				try {
					$.writeln(inspected.humanReport || "PICKFX EFFECT DISCOVERY\n\nSelected clip: NO");
				} catch (ignoreLog) {}
				return JSON.stringify($._pickfx.jsonSafeParamResult(inspected));
			}
			inspected = $._pickfxEffectRegistryDiscovery.discover(selected.trackItem);
			if (inspected) {
				inspected.usedQE = false;
				inspected.setValueCalls = 0;
				inspected.writeOperationCalls = 0;
				inspected.writesPerformed = false;
				inspected.settersCalled = false;
				inspected.operation = inspected.operation || "effect.registry.discovery";
				inspected.readOnly = true;
			}
			try {
				$.writeln(inspected && inspected.humanReport ? inspected.humanReport : "PICKFX EFFECT DISCOVERY");
			} catch (ignoreWrite) {}
			return JSON.stringify($._pickfx.jsonSafeParamResult(inspected));
		} catch (e) {
			return JSON.stringify({
				ok: false,
				operation: "effect.registry.discovery",
				reason: "EFFECT_NOT_FOUND",
				detail: String(e),
				selectedClip: false,
				readOnly: true,
				usedQE: false,
				setValueCalls: 0,
				writeOperationCalls: 0,
				writesPerformed: false,
				settersCalled: false,
				components: []
			});
		}
	},

	debugEnumParameterWriteTest: function (ident) {
		var payload;
		ident = ident || {};
		try {
			if ($._pickfx.__enumWriteTestLoaded === true &&
					typeof $._pickfxEnumParameterWriteTest !== "undefined" &&
					typeof $._pickfxEnumParameterWriteTest.hostDebugRun === "function") {
				return $._pickfxEnumParameterWriteTest.hostDebugRun(ident);
			}
			payload = {
				ok: false,
				operation: "enum.parameter.write.test",
				reason: "ENUM_WRITE_TEST_PATH_NOT_LOADED",
				detail: "EnumParameterWriteTest.js was not evalFile'd into the ExtendScript host. Enum path does not fall back to ParameterWriteTest or UniversalParameterResolver.",
				runtimePath: "host.jsx.debugEnumParameterWriteTest stub",
				resolverUsed: "none",
				globalSearchUsed: false,
				enumWriteTestLoaded: $._pickfx.__enumWriteTestLoaded === true,
				enumWriteTestFunctionAvailable: typeof $._pickfxEnumParameterWriteTest !== "undefined" &&
					typeof $._pickfxEnumParameterWriteTest.hostDebugRun === "function",
				hostFunction: "debugEnumParameterWriteTest",
				bridgePath: ident.bridgePath || "enum-parameter-write-test",
				debugButtonClicked: ident.debugButtonClicked === true,
				buttonId: ident.buttonId || "test-enum-parameter-write-btn",
				handler: ident.handler || "invokeEnumParameterWriteTest",
				debugButton: ident.debugButton || {
					clicked: ident.debugButtonClicked === true,
					id: ident.buttonId || "test-enum-parameter-write-btn",
					handler: ident.handler || "invokeEnumParameterWriteTest"
				},
				verified: false,
				settersCalled: false,
				usedQE: false,
				productionEnabled: false
			};
			return JSON.stringify(payload);
		} catch (e) {
			return JSON.stringify({
				ok: false,
				operation: "enum.parameter.write.test",
				reason: "ENUM_WRITE_TEST_PATH_NOT_LOADED",
				error: String(e),
				runtimePath: "host.jsx.debugEnumParameterWriteTest exception",
				resolverUsed: "none",
				globalSearchUsed: false,
				enumWriteTestLoaded: $._pickfx.__enumWriteTestLoaded === true,
				enumWriteTestFunctionAvailable: false,
				hostFunction: "debugEnumParameterWriteTest",
				bridgePath: "enum-parameter-write-test",
				verified: false,
				settersCalled: false,
				usedQE: false,
				productionEnabled: false
			});
		}
	}
};
