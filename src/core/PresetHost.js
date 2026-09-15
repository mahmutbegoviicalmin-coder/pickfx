var PresetHost = (function () {
	var PAGE_SIZE = 20;
	var EPSILON = 0.0001;

	function schema() {
		if (typeof PresetSchema !== "undefined") {
			return PresetSchema;
		}
		if (typeof $ !== "undefined" && $._pickfxPresetSchema) {
			return $._pickfxPresetSchema;
		}
		return null;
	}

	function resolver() {
		if (typeof $ !== "undefined" && $._pickfxParameterResolver) {
			return $._pickfxParameterResolver;
		}
		return null;
	}

	function writer() {
		if (typeof $ !== "undefined" && $._pickfxParameterWriter) {
			return $._pickfxParameterWriter;
		}
		return null;
	}

	function fail(reason, detail, extra) {
		var payload = {
			ok: false,
			reason: reason || "WRITE_FAILED",
			detail: detail ? String(detail) : "",
			preset: true
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

	function stringify(payload) {
		var json;
		try {
			json = JSON.stringify(payload);
		} catch (serErr) {
			return JSON.stringify(fail("WRITE_FAILED", "Could not serialize preset result."));
		}
		if (json && json.length > 30000) {
			payload.debug = undefined;
			payload.log = undefined;
			try {
				json = JSON.stringify(payload);
			} catch (ignore) {}
		}
		return json;
	}

	function parseJson(raw) {
		if (raw && typeof raw === "object") {
			return raw;
		}
		try {
			return JSON.parse(String(raw || ""));
		} catch (parseErr) {
			return null;
		}
	}

	function readTicks(item) {
		try {
			if (item && item.start && item.start.ticks !== undefined) {
				return String(item.start.ticks);
			}
		} catch (ignore) {}
		return "";
	}

	function sequenceName() {
		try {
			if (app && app.project && app.project.activeSequence) {
				return String(app.project.activeSequence.name || "");
			}
		} catch (ignore) {}
		return "";
	}

	function componentCount(item) {
		var res = resolver();
		var components;
		var countInfo;
		try {
			components = item.components;
		} catch (ignore) {
			return -1;
		}
		if (!res) {
			try {
				return typeof components.numItems === "number" ? components.numItems : -1;
			} catch (ignoreCount) {
				return -1;
			}
		}
		countInfo = res.collectionCount(components);
		return countInfo ? countInfo.count : -1;
	}

	function fingerprintItem(item) {
		var name = "";
		var trackIndex = null;
		try {
			name = String(item.name || "");
		} catch (ignoreName) {}
		try {
			if (item.parentTrackIndex !== undefined && item.parentTrackIndex !== null) {
				trackIndex = item.parentTrackIndex;
			}
		} catch (ignoreTrack) {}
		return {
			sequenceName: sequenceName(),
			parentTrackIndex: trackIndex,
			startTicks: readTicks(item),
			clipName: name,
			componentCount: componentCount(item)
		};
	}

	function fingerprintsEqual(a, b) {
		if (!a || !b) {
			return false;
		}
		return a.sequenceName === b.sequenceName &&
			a.parentTrackIndex === b.parentTrackIndex &&
			a.startTicks === b.startTicks &&
			a.clipName === b.clipName &&
			a.componentCount === b.componentCount;
	}

	function selectedVideo() {
		if (typeof $ === "undefined" || !$._pickfx || !$._pickfx.selectedVideoTrackItems) {
			return fail("NO_VIDEO_SELECTION", "Selection helper is not loaded.");
		}
		return $._pickfx.selectedVideoTrackItems();
	}

	function snapshotComponents(item) {
		var res = resolver();
		var api = schema();
		var components;
		var countInfo;
		var indexBase;
		var i;
		var component;
		var rows = [];
		var displayName;
		var matchName;
		if (!res) {
			return [];
		}
		try {
			components = item.components;
		} catch (ignore) {
			return [];
		}
		countInfo = res.collectionCount(components);
		if (!countInfo || countInfo.count < 0) {
			return [];
		}
		indexBase = res.collectionIndexBase(components, countInfo.count);
		for (i = 0; i < countInfo.count; i++) {
			component = res.collectionItem(components, i, indexBase);
			displayName = res.readString(component, "displayName") || "";
			matchName = res.readString(component, "matchName") || "";
			rows.push({
				index: i,
				displayName: displayName,
				matchName: matchName,
				premiereName: displayName,
				kind: api && api.isIntrinsicComponent(matchName, displayName) ? "intrinsic" : "effect",
				_component: component
			});
		}
		return rows;
	}

	function componentAt(item, index) {
		var rows = snapshotComponents(item);
		if (index < 0 || index >= rows.length) {
			return null;
		}
		return rows[index];
	}

	function propertyCollection(node) {
		try {
			if (node && node.properties) {
				return node.properties;
			}
		} catch (ignore) {}
		return null;
	}

	function isTimeVarying(param) {
		try {
			if (param && typeof param.isTimeVarying === "function") {
				return param.isTimeVarying() === true;
			}
		} catch (err) {
			return { error: String(err) };
		}
		return false;
	}

	function classifyParam(param, displayName, matchName, order) {
		var api = schema();
		var live;
		var detected;
		var serialized;
		var writable = false;
		var varying;
		var type;
		if (api && api.isSkippedParameterName(displayName)) {
			return {
				status: "UNSUPPORTED_TYPE",
				reason: "UNSUPPORTED_TYPE",
				order: order,
				displayName: displayName,
				matchName: matchName || ""
			};
		}
		if (!param) {
			return {
				status: "READ_FAILED",
				reason: "READ_FAILED",
				order: order,
				displayName: displayName,
				matchName: matchName || ""
			};
		}
		try {
			writable = typeof param.setValue === "function";
		} catch (ignoreWritable) {}
		varying = isTimeVarying(param);
		if (varying && varying.error) {
			return {
				status: "READ_FAILED",
				reason: "READ_FAILED",
				order: order,
				displayName: displayName,
				matchName: matchName || ""
			};
		}
		if (varying === true) {
			return {
				status: "KEYFRAMED_PARAMETER_UNSUPPORTED",
				reason: "KEYFRAMED_PARAMETER_UNSUPPORTED",
				order: order,
				displayName: displayName,
				matchName: matchName || ""
			};
		}
		try {
			live = param.getValue();
		} catch (readErr) {
			return {
				status: "READ_FAILED",
				reason: "READ_FAILED",
				order: order,
				displayName: displayName,
				matchName: matchName || ""
			};
		}
		if (typeof ParameterValueType !== "undefined" && ParameterValueType.detectLive) {
			detected = ParameterValueType.detectLive(param, live);
		} else if (typeof ParameterValueType !== "undefined" && ParameterValueType.detect) {
			detected = ParameterValueType.detect(live);
		} else if (typeof live === "number" && isFinite(live)) {
			detected = { type: "number", value: live };
		} else if (live === true || live === false) {
			detected = { type: "boolean", value: live };
		} else {
			detected = { type: "unknown", value: live };
		}
		type = detected && detected.type ? detected.type : "unknown";
		if (type === "enum" || type === "color" || type === "string" || type === "unknown") {
			return {
				status: "UNSUPPORTED_TYPE",
				reason: "UNSUPPORTED_TYPE",
				order: order,
				displayName: displayName,
				matchName: matchName || "",
				type: type
			};
		}
		if (!writable) {
			return {
				status: "NOT_WRITABLE",
				reason: "NOT_WRITABLE",
				order: order,
				displayName: displayName,
				matchName: matchName || "",
				type: type
			};
		}
		serialized = api ? api.serializeValue(type, detected.value !== undefined ? detected.value : live) : null;
		if (!serialized || !serialized.ok) {
			return {
				status: "NOT_VERIFIABLE",
				reason: "NOT_VERIFIABLE",
				order: order,
				displayName: displayName,
				matchName: matchName || "",
				type: type
			};
		}
		return {
			status: "SUPPORTED",
			reason: "SUPPORTED",
			order: order,
			displayName: displayName,
			matchName: matchName || "",
			type: serialized.type,
			value: serialized.value
		};
	}

	function walkParams(node, out, parentName) {
		var res = resolver();
		var api = schema();
		var props;
		var countInfo;
		var indexBase;
		var i;
		var param;
		var displayName;
		var matchName;
		var nested;
		if (!res) {
			return;
		}
		props = propertyCollection(node);
		if (!props) {
			return;
		}
		countInfo = res.collectionCount(props);
		if (!countInfo || countInfo.count < 0) {
			return;
		}
		indexBase = res.collectionIndexBase(props, countInfo.count);
		for (i = 0; i < countInfo.count; i++) {
			param = res.collectionItem(props, i, indexBase);
			displayName = res.readString(param, "displayName") || "";
			matchName = res.readString(param, "matchName") || "";
			if (api && api.isContainerParameterName(displayName)) {
				continue;
			}
			nested = propertyCollection(param);
			if (nested && res.collectionCount(nested).count > 0) {
				walkParams(param, out, displayName || parentName);
				continue;
			}
			if (api && api.isSkippedParameterName(displayName)) {
				continue;
			}
			out.push({
				param: param,
				displayName: displayName,
				matchName: matchName,
				parentName: parentName || ""
			});
		}
	}

	function uniqueNameConflict(rows, displayName, matchName) {
		var i;
		var matchCount = 0;
		var nameCount = 0;
		var matchFold = String(matchName || "").toLowerCase();
		var nameFold = String(displayName || "").toLowerCase();
		if (matchFold) {
			for (i = 0; i < rows.length; i++) {
				if (String(rows[i].matchName || "").toLowerCase() === matchFold) {
					matchCount += 1;
				}
			}
			return matchCount > 1;
		}
		for (i = 0; i < rows.length; i++) {
			if (String(rows[i].displayName || "").toLowerCase() === nameFold) {
				nameCount += 1;
			}
		}
		return nameCount > 1;
	}

	function classifyLeaves(component) {
		var leaves = [];
		var classified = [];
		var i;
		var row;
		var info;
		walkParams(component, leaves, "");
		for (i = 0; i < leaves.length; i++) {
			row = leaves[i];
			info = classifyParam(row.param, row.displayName, row.matchName, i);
			if (info.status === "SUPPORTED" && uniqueNameConflict(leaves, row.displayName, row.matchName)) {
				info = {
					status: "AMBIGUOUS_PARAMETER",
					reason: "AMBIGUOUS_PARAMETER",
					order: i,
					displayName: row.displayName,
					matchName: row.matchName || ""
				};
			}
			classified.push(info);
		}
		return classified;
	}

	function componentPreview(row) {
		var classified;
		var supported = 0;
		var skipped = 0;
		var keyframed = 0;
		var i;
		var captureStatus;
		var kind = row.kind;
		var limitation = "";
		classified = classifyLeaves(row._component);
		for (i = 0; i < classified.length; i++) {
			if (classified[i].status === "SUPPORTED") {
				supported += 1;
			} else {
				skipped += 1;
				if (classified[i].status === "KEYFRAMED_PARAMETER_UNSUPPORTED") {
					keyframed += 1;
				}
			}
		}
		if (supported === 0) {
			captureStatus = "unsupported";
			kind = row.kind === "intrinsic" ? "intrinsic" : "unsupported";
			limitation = keyframed === classified.length && classified.length
				? "Animated parameters aren’t captured yet"
				: "Cannot reproduce safely";
		} else if (skipped) {
			captureStatus = "partial";
		} else {
			captureStatus = "full";
		}
		return {
			index: row.index,
			order: row.index,
			kind: kind,
			displayName: row.displayName,
			matchName: row.matchName,
			premiereName: row.premiereName,
			parameterCount: classified.length,
			supportedParameterCount: supported,
			skippedCount: skipped,
			keyframedCount: keyframed,
			captureStatus: captureStatus,
			limitation: limitation
		};
	}

	function listCapturableComponents() {
		var selected;
		var item;
		var snap;
		var i;
		var session;
		var components = [];
		selected = selectedVideo();
		if (!selected || selected.ok !== true) {
			return stringify(fail(
				(selected && selected.reason) || "NO_VIDEO_SELECTION",
				(selected && selected.detail) || "Select a video clip."
			));
		}
		if (selected.count > 1) {
			return stringify(fail(
				"CAPTURE_REQUIRES_SINGLE_CLIP",
				"Capture works on one selected clip."
			));
		}
		item = selected.items[0];
		snap = snapshotComponents(item);
		for (i = 0; i < snap.length; i++) {
			components.push(componentPreview(snap[i]));
		}
		session = fingerprintItem(item);
		session.captureSessionId = "cap_" + session.startTicks + "_" + session.componentCount;
		return stringify({
			ok: true,
			session: session,
			clipName: session.clipName,
			components: components
		});
	}

	function verifySession(session) {
		var selected = selectedVideo();
		var item;
		var live;
		if (!selected || selected.ok !== true) {
			return fail(
				(selected && selected.reason) || "NO_VIDEO_SELECTION",
				(selected && selected.detail) || "Select a video clip."
			);
		}
		if (selected.count > 1) {
			return fail("CAPTURE_REQUIRES_SINGLE_CLIP", "Capture works on one selected clip.");
		}
		item = selected.items[0];
		live = fingerprintItem(item);
		if (session && !fingerprintsEqual(session, live)) {
			return fail("CAPTURE_SOURCE_CHANGED", "The selected clip changed.");
		}
		return { ok: true, item: item, session: live };
	}

	function captureComponent(sessionRaw, componentIndex, offset, limit) {
		var session = parseJson(sessionRaw);
		var verified;
		var row;
		var classified;
		var start;
		var pageSize;
		var i;
		var slice = [];
		var skipped = [];
		var info;
		var hasMore;
		verified = verifySession(session);
		if (!verified.ok) {
			return stringify(verified);
		}
		row = componentAt(verified.item, componentIndex);
		if (!row) {
			return stringify(fail("COMPONENT_NOT_FOUND", "That effect is no longer on the clip."));
		}
		classified = classifyLeaves(row._component);
		pageSize = typeof limit === "number" && limit > 0 ? limit : PAGE_SIZE;
		start = typeof offset === "number" && offset > 0 ? offset : 0;
		for (i = start; i < classified.length && slice.length + skipped.length < pageSize; i++) {
			info = classified[i];
			if (info.status === "SUPPORTED") {
				slice.push({
					order: info.order,
					displayName: info.displayName,
					matchName: info.matchName,
					type: info.type,
					value: info.value
				});
			} else {
				skipped.push({
					order: info.order,
					displayName: info.displayName,
					reason: info.reason
				});
			}
		}
		hasMore = i < classified.length;
		return stringify({
			ok: true,
			hasMore: hasMore,
			nextOffset: i,
			component: {
				order: row.index,
				kind: row.kind,
				displayName: row.displayName,
				matchName: row.matchName,
				premiereName: row.premiereName
			},
			parameters: slice,
			skipped: skipped
		});
	}

	function effectAvailable(name) {
		var effect;
		if (typeof $ === "undefined" || !$._pickfxQE || !$._pickfxQE.getVideoEffectByName) {
			return false;
		}
		try {
			$._pickfxQE.enable();
		} catch (ignoreEnable) {}
		try {
			effect = $._pickfxQE.getVideoEffectByName(name);
			return !!effect;
		} catch (ignore) {
			return false;
		}
	}

	function trackLockedMessage(item) {
		var mapped;
		var qeSequence;
		if (typeof $ === "undefined" || !$._pickfxQE) {
			return "";
		}
		try {
			$._pickfxQE.enable();
			qeSequence = qe.project.getActiveSequence();
			mapped = $._pickfxQE.findQEClip(qeSequence, item);
			if (mapped && mapped.error && mapped.error.reason === "Track is locked") {
				return "Track locked";
			}
		} catch (ignore) {}
		return "";
	}

	function findParam(component, spec, leaves) {
		var i;
		var matchFold = String(spec.matchName || "").toLowerCase();
		var nameFold = String(spec.displayName || "").toLowerCase();
		var matchHits = [];
		var nameHits = [];
		var row;
		for (i = 0; i < leaves.length; i++) {
			row = leaves[i];
			if (matchFold && String(row.matchName || "").toLowerCase() === matchFold) {
				matchHits.push(row);
			}
			if (nameFold && String(row.displayName || "").toLowerCase() === nameFold) {
				nameHits.push(row);
			}
		}
		if (matchFold && matchHits.length === 1) {
			return { ok: true, row: matchHits[0] };
		}
		if (nameHits.length === 1) {
			return { ok: true, row: nameHits[0] };
		}
		if (typeof spec.order === "number" && spec.order >= 0 && spec.order < leaves.length) {
			row = leaves[spec.order];
			if (row && String(row.displayName || "").toLowerCase() === nameFold) {
				return { ok: true, row: row };
			}
		}
		return { ok: false, reason: "PARAMETER_NOT_FOUND" };
	}

	function valuesClose(kind, requested, actual) {
		var api = writer();
		if (api && api.verifyWrite) {
			return api.verifyWrite(kind, requested, actual);
		}
		if (kind === "boolean") {
			return { ok: requested === actual };
		}
		if (kind === "point") {
			return {
				ok: actual && typeof actual.length === "number" && actual.length === 2 &&
					Math.abs(requested[0] - actual[0]) <= EPSILON &&
					Math.abs(requested[1] - actual[1]) <= EPSILON
			};
		}
		if (typeof requested === "number" && typeof actual === "number") {
			return { ok: requested === actual || Math.abs(requested - actual) <= EPSILON };
		}
		return { ok: requested === actual };
	}

	function writeParam(param, spec) {
		var varying;
		var requested = spec.value;
		var writeValue = requested;
		var setResult;
		var methodUsed;
		var verified;
		var actual;
		var api = writer();
		var readApi;
		varying = isTimeVarying(param);
		if (varying === true) {
			return { ok: false, reason: "KEYFRAMED_PARAMETER_UNSUPPORTED" };
		}
		if (spec.type === "point" && typeof PointValue !== "undefined" && PointValue.normalize) {
			writeValue = PointValue.normalize(requested);
			if (!writeValue || writeValue.ok !== true) {
				return { ok: false, reason: "INVALID_VALUE" };
			}
			writeValue = writeValue.value || [requested[0], requested[1]];
		}
		try {
			if (typeof param.setValue !== "function") {
				return { ok: false, reason: "NOT_WRITABLE" };
			}
		} catch (ignoreType) {
			return { ok: false, reason: "NOT_WRITABLE" };
		}
		methodUsed = "setValue(value, true)";
		try {
			setResult = param.setValue(writeValue, true);
		} catch (setTwoErr) {
			methodUsed = "setValue(value)";
			try {
				setResult = param.setValue(writeValue);
			} catch (setOneErr) {
				return { ok: false, reason: "WRITE_FAILED", detail: String(setOneErr) };
			}
		}
		if (setResult === false) {
			return { ok: false, reason: "WRITE_FAILED", detail: methodUsed + " returned false." };
		}
		if (api && api.readBackVerified) {
			verified = api.readBackVerified(param, spec.type === "angle" ? "number" : spec.type, requested, "", []);
			if (!verified || !verified.ok) {
				return { ok: false, reason: "VALUE_NOT_VERIFIED" };
			}
			return { ok: true, verified: true };
		}
		readApi = typeof ParameterReadBack !== "undefined" ? ParameterReadBack : (typeof $ !== "undefined" ? $._pickfxParameterReadBack : null);
		if (readApi && readApi.verifyWithRetry) {
			verified = readApi.verifyWithRetry(param, requested, function (wanted, got) {
				return valuesClose(spec.type, wanted, got);
			});
			if (!verified || !verified.ok) {
				return { ok: false, reason: "VALUE_NOT_VERIFIED" };
			}
			return { ok: true, verified: true };
		}
		try {
			actual = param.getValue();
		} catch (readErr) {
			return { ok: false, reason: "VALUE_NOT_VERIFIED" };
		}
		if (!valuesClose(spec.type, requested, actual).ok) {
			return { ok: false, reason: "VALUE_NOT_VERIFIED" };
		}
		return { ok: true, verified: true };
	}

	function applyParameters(component, parameters) {
		var leaves = [];
		var applied = 0;
		var failures = [];
		var i;
		var found;
		var written;
		walkParams(component, leaves, "");
		for (i = 0; i < (parameters || []).length; i++) {
			found = findParam(component, parameters[i], leaves);
			if (!found.ok) {
				failures.push({
					displayName: parameters[i].displayName,
					reason: found.reason || "PARAMETER_NOT_FOUND"
				});
				continue;
			}
			written = writeParam(found.row.param, parameters[i]);
			if (!written.ok) {
				failures.push({
					displayName: parameters[i].displayName,
					reason: written.reason || "WRITE_FAILED"
				});
				continue;
			}
			applied += 1;
		}
		return {
			ok: failures.length === 0,
			parametersVerified: applied,
			failures: failures
		};
	}

	function addEffect(item, effectName) {
		var qeSequence;
		var effect;
		var mapped;
		if (typeof $ === "undefined" || !$._pickfxQE) {
			return { ok: false, reason: "WRITE_FAILED", detail: "Effect add is not available." };
		}
		try {
			$._pickfxQE.enable();
			effect = $._pickfxQE.getVideoEffectByName(effectName);
			qeSequence = qe.project.getActiveSequence();
		} catch (lookupErr) {
			return { ok: false, reason: "PRESET_EFFECT_UNAVAILABLE", detail: String(lookupErr) };
		}
		if (!effect) {
			return { ok: false, reason: "PRESET_EFFECT_UNAVAILABLE" };
		}
		mapped = $._pickfxQE.applyEffectToTrackItem(item, effect, qeSequence);
		if (!mapped || mapped.ok !== true) {
			return {
				ok: false,
				reason: (mapped && mapped.error && mapped.error.reason === "Track is locked")
					? "TRACK_LOCKED"
					: "WRITE_FAILED",
				message: mapped && mapped.error ? mapped.error.reason : "Could not add effect."
			};
		}
		return { ok: true };
	}

	function resolveIntrinsic(item, spec) {
		var snap = snapshotComponents(item);
		var i;
		var hits = [];
		for (i = 0; i < snap.length; i++) {
			if (schema().matchesExpectedEffect(snap[i], spec)) {
				hits.push(snap[i]);
			}
		}
		if (hits.length === 1) {
			return { ok: true, row: hits[0] };
		}
		return { ok: false, reason: "COMPONENT_NOT_FOUND" };
	}

	function applyComponentToClip(item, spec) {
		var before;
		var after;
		var added;
		var identity;
		var target;
		var written;
		if (spec.kind === "intrinsic") {
			target = resolveIntrinsic(item, spec);
			if (!target.ok) {
				return {
					ok: false,
					reason: target.reason,
					message: "Couldn't find that built-in control."
				};
			}
			written = applyParameters(target.row._component, spec.parameters);
			return written;
		}
		before = snapshotComponents(item);
		added = addEffect(item, spec.premiereName || spec.displayName);
		if (!added.ok) {
			return added;
		}
		after = snapshotComponents(item);
		identity = schema().identifyInserted(before, after);
		if (!identity.ok) {
			return {
				ok: false,
				reason: "NEW_EFFECT_INSTANCE_AMBIGUOUS",
				message: "Couldn't add a new effect instance."
			};
		}
		if (!schema().matchesExpectedEffect(identity.component, spec)) {
			return {
				ok: false,
				reason: "NEW_EFFECT_INSTANCE_AMBIGUOUS",
				message: "Couldn't add a new effect instance."
			};
		}
		written = applyParameters(identity.component._component, spec.parameters);
		return written;
	}

	function clipNameOf(item) {
		try {
			return String(item.name || "");
		} catch (ignore) {
			return "";
		}
	}

	function applyToClip(item, preset) {
		var i;
		var result;
		var componentsApplied = 0;
		var parametersVerified = 0;
		var failures = [];
		var locked = trackLockedMessage(item);
		if (locked) {
			return {
				name: clipNameOf(item),
				ok: false,
				componentsApplied: 0,
				parametersVerified: 0,
				reason: "TRACK_LOCKED",
				message: locked,
				failures: [{ reason: "TRACK_LOCKED", message: locked }]
			};
		}
		for (i = 0; i < preset.components.length; i++) {
			result = applyComponentToClip(item, preset.components[i]);
			if (!result || result.ok !== true) {
				failures.push({
					component: preset.components[i].displayName,
					reason: (result && result.reason) || "WRITE_FAILED",
					message: (result && result.message) || ""
				});
				if (result && result.failures) {
					failures = failures.concat(result.failures);
				}
				return {
					name: clipNameOf(item),
					ok: false,
					componentsApplied: componentsApplied,
					parametersVerified: parametersVerified + ((result && result.parametersVerified) || 0),
					reason: (result && result.reason) || "WRITE_FAILED",
					message: (result && result.message) || "Couldn't apply that look.",
					failures: failures
				};
			}
			componentsApplied += 1;
			parametersVerified += result.parametersVerified || 0;
		}
		return {
			name: clipNameOf(item),
			ok: true,
			componentsApplied: componentsApplied,
			parametersVerified: parametersVerified,
			failures: []
		};
	}

	function preflight(preset) {
		var selected;
		var required;
		var i;
		if (!(app && app.project && app.project.activeSequence)) {
			return fail("NO_VIDEO_SELECTION", "No active sequence.");
		}
		selected = selectedVideo();
		if (!selected || selected.ok !== true || !selected.count) {
			return fail("NO_VIDEO_SELECTION", "Select a video clip.");
		}
		required = schema().requiredEffects(preset);
		for (i = 0; i < required.length; i++) {
			if (!effectAvailable(required[i])) {
				return fail(
					"PRESET_EFFECT_UNAVAILABLE",
					required[i] + " isn’t installed.",
					{ effect: required[i] }
				);
			}
		}
		return {
			ok: true,
			selectedCount: selected.count,
			items: selected.items
		};
	}

	function applyPreset(presetRaw) {
		var api = schema();
		var parsed;
		var checked;
		var ready;
		var clips = [];
		var i;
		var clipResult;
		var successful = 0;
		var failed = 0;
		if (!api) {
			return stringify(fail("WRITE_FAILED", "Preset schema is not loaded."));
		}
		parsed = parseJson(presetRaw);
		checked = api.validate(parsed);
		if (!checked.ok) {
			checked.preset = true;
			return stringify(checked);
		}
		ready = preflight(checked.preset);
		if (!ready.ok) {
			return stringify(ready);
		}
		for (i = 0; i < ready.items.length; i++) {
			clipResult = applyToClip(ready.items[i], checked.preset);
			if (clipResult.ok) {
				successful += 1;
			} else {
				failed += 1;
			}
			clips.push({
				name: clipResult.name,
				ok: clipResult.ok === true,
				componentsApplied: clipResult.componentsApplied || 0,
				parametersVerified: clipResult.parametersVerified || 0,
				reason: clipResult.reason || "",
				message: clipResult.message || "",
				failures: clipResult.failures || []
			});
		}
		return stringify({
			ok: failed === 0 && successful > 0,
			preset: true,
			command: true,
			presetId: checked.preset.id,
			presetName: checked.preset.name,
			selectedCount: ready.items.length,
			successfulCount: successful,
			failedCount: failed,
			applied: successful,
			clips: clips
		});
	}

	return {
		PAGE_SIZE: PAGE_SIZE,
		listCapturableComponents: listCapturableComponents,
		captureComponent: captureComponent,
		applyPreset: applyPreset,
		preflight: preflight,
		identifyInserted: function (before, after) {
			return schema().identifyInserted(before, after);
		},
		fingerprintsEqual: fingerprintsEqual
	};
}());

if (typeof $ !== "undefined") {
	$._pickfxPresetHost = PresetHost;
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = PresetHost;
}
