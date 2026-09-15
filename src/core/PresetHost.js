var PresetHost = (function () {
	var PAGE_SIZE = 20;
	var EPSILON = 0.0001;
	var MAX_RESULT_BYTES = 30000;
	var MAX_CLIP_FAILURES = 3;
	var MAX_FAILURE_CHARS = 160;
	var RUNTIME_VERSION = "24b6bf1-presets-parity-v1";

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

	function capability() {
		if (typeof PresetCapability !== "undefined") {
			return PresetCapability;
		}
		if (typeof $ !== "undefined" && $._pickfxPresetCapability) {
			return $._pickfxPresetCapability;
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

	function clipText(value, max) {
		var text = String(value || "");
		if (text.length <= max) {
			return text;
		}
		return text.slice(0, max);
	}

	function compactFailures(failures, limit) {
		var out = [];
		var i;
		var row;
		var max = typeof limit === "number" ? limit : MAX_CLIP_FAILURES;
		for (i = 0; i < (failures || []).length && out.length < max; i++) {
			row = failures[i];
			if (!row) {
				continue;
			}
			out.push({
				reason: row.reason || "",
				message: clipText(row.message || row.detail || "", MAX_FAILURE_CHARS),
				displayName: row.displayName || "",
				component: row.component || ""
			});
		}
		return out;
	}

	function compactClips(clips) {
		var failed = [];
		var okClips = [];
		var out = [];
		var i;
		var clip;
		for (i = 0; i < (clips || []).length; i++) {
			clip = clips[i];
			if (!clip) {
				continue;
			}
			if (clip.ok === true) {
				okClips.push(clip);
			} else {
				failed.push(clip);
			}
		}
		failed = failed.concat(okClips);
		for (i = 0; i < failed.length; i++) {
			clip = failed[i];
			out.push({
				name: clipText(clip.name || "", 80),
				ok: clip.ok === true,
				componentsApplied: clip.componentsApplied || 0,
				parametersVerified: clip.parametersVerified || 0,
				reason: clip.reason || "",
				message: clipText(clip.message || "", MAX_FAILURE_CHARS),
				failures: compactFailures(clip.failures, 2)
			});
		}
		return out;
	}

	function copyKnownFields(payload, target) {
		if (!payload || !target) {
			return target;
		}
		if (payload.reason) {
			target.reason = payload.reason;
		}
		if (payload.detail) {
			target.detail = clipText(payload.detail, 240);
		}
		if (payload.message) {
			target.message = clipText(payload.message, MAX_FAILURE_CHARS);
		}
		if (payload.presetName !== undefined) {
			target.presetName = payload.presetName;
		}
		if (payload.presetId !== undefined) {
			target.presetId = payload.presetId;
		}
		if (payload.selectedCount !== undefined) {
			target.selectedCount = payload.selectedCount;
		}
		if (payload.successfulCount !== undefined) {
			target.successfulCount = payload.successfulCount;
		}
		if (payload.failedCount !== undefined) {
			target.failedCount = payload.failedCount;
		}
		if (payload.applied !== undefined) {
			target.applied = payload.applied;
		}
		if (payload.clipName !== undefined) {
			target.clipName = payload.clipName;
		}
		if (payload.clipIndex !== undefined) {
			target.clipIndex = payload.clipIndex;
		}
		if (payload.effect !== undefined) {
			target.effect = payload.effect;
		}
		if (payload.hasMore !== undefined) {
			target.hasMore = payload.hasMore;
		}
		if (payload.nextOffset !== undefined) {
			target.nextOffset = payload.nextOffset;
		}
		return target;
	}

	function compactResult(payload) {
		var compact = {
			ok: !!(payload && payload.ok === true),
			resultTruncated: true
		};
		if (payload && payload.preset === true) {
			compact.preset = true;
		}
		if (payload && payload.command === true) {
			compact.command = true;
		}
		copyKnownFields(payload, compact);
		if (payload && payload.clips) {
			compact.clips = compactClips(payload.clips);
		}
		if (payload && payload.failures) {
			compact.failures = compactFailures(payload.failures, MAX_CLIP_FAILURES);
		}
		return compact;
	}

	function emergencyResult(payload) {
		return {
			ok: !!(payload && payload.ok === true),
			preset: true,
			command: true,
			presetName: payload && payload.presetName ? clipText(payload.presetName, 80) : "",
			selectedCount: payload && payload.selectedCount ? payload.selectedCount : 0,
			successfulCount: payload && payload.successfulCount ? payload.successfulCount : 0,
			failedCount: payload && payload.failedCount ? payload.failedCount : 0,
			resultTruncated: true,
			reason: (payload && payload.reason) || (payload && payload.ok ? "" : "WRITE_FAILED"),
			detail: "Preset result exceeded transport limit."
		};
	}

	function stripUnsafe(value, depth) {
		var out;
		var key;
		var i;
		if (value === undefined || value === null) {
			return value;
		}
		if (depth > 8) {
			return undefined;
		}
		if (typeof value === "function") {
			return undefined;
		}
		if (typeof value !== "object") {
			return value;
		}
		if (Object.prototype.toString.call(value) === "[object Array]") {
			out = [];
			for (i = 0; i < value.length && i < 400; i++) {
				out.push(stripUnsafe(value[i], depth + 1));
			}
			return out;
		}
		out = {};
		for (key in value) {
			if (!value.hasOwnProperty(key)) {
				continue;
			}
			if (key.charAt(0) === "_" || key === "debug" || key === "log" || key === "item" || key === "items") {
				continue;
			}
			if (typeof value[key] === "function") {
				continue;
			}
			out[key] = stripUnsafe(value[key], depth + 1);
		}
		return out;
	}

	function stringify(payload) {
		var safe;
		var json;
		try {
			safe = stripUnsafe(payload, 0);
			json = JSON.stringify(safe);
		} catch (serErr) {
			return JSON.stringify(fail("WRITE_FAILED", "Could not serialize preset result."));
		}
		if (json && json.length > MAX_RESULT_BYTES) {
			safe = compactResult(safe || payload);
			try {
				json = JSON.stringify(safe);
			} catch (compactErr) {
				json = "";
			}
			while (json && json.length > MAX_RESULT_BYTES && safe.clips && safe.clips.length) {
				safe.clips = safe.clips.slice(0, safe.clips.length - 1);
				json = JSON.stringify(safe);
			}
			if (!json || json.length > MAX_RESULT_BYTES) {
				try {
					json = JSON.stringify(emergencyResult(payload));
				} catch (emergencyErr) {
					json = "";
				}
			}
		}
		if (!json || json.length > MAX_RESULT_BYTES) {
			json = JSON.stringify({
				ok: false,
				reason: "WRITE_FAILED",
				detail: "Preset result exceeded transport limit.",
				resultTruncated: true,
				preset: true
			});
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

	function componentStackSignatureFromRows(rows) {
		var counts = {};
		var stack = [];
		var i;
		var matchName;
		var displayName;
		var key;
		for (i = 0; i < (rows || []).length; i++) {
			matchName = String((rows[i] && rows[i].matchName) || "");
			displayName = String((rows[i] && rows[i].displayName) || "");
			key = matchName + "|" + displayName;
			counts[key] = (counts[key] || 0) + 1;
			stack.push(key + "#" + counts[key]);
		}
		return stack;
	}

	function stacksEqual(a, b) {
		var i;
		if (!a || !b || a.length !== b.length) {
			return false;
		}
		for (i = 0; i < a.length; i++) {
			if (a[i] !== b[i]) {
				return false;
			}
		}
		return true;
	}

	function identityRows(rows) {
		var out = [];
		var i;
		var row;
		for (i = 0; i < (rows || []).length; i++) {
			row = rows[i];
			out.push({
				index: row.index,
				displayName: row.displayName || "",
				matchName: row.matchName || "",
				premiereName: row.premiereName || row.displayName || "",
				kind: row.kind || "effect",
				instanceID: row.instanceID || "",
				instanceName: row.instanceName || "",
				id: row.id || ""
			});
		}
		return out;
	}

	function fingerprintItem(item) {
		var name = "";
		var trackIndex = null;
		var rows;
		try {
			name = String(item.name || "");
		} catch (ignoreName) {}
		try {
			if (item.parentTrackIndex !== undefined && item.parentTrackIndex !== null) {
				trackIndex = item.parentTrackIndex;
			}
		} catch (ignoreTrack) {}
		rows = snapshotComponents(item);
		return {
			sequenceName: sequenceName(),
			parentTrackIndex: trackIndex,
			startTicks: readTicks(item),
			clipName: name,
			componentCount: rows.length ? rows.length : componentCount(item),
			componentStack: componentStackSignatureFromRows(rows)
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
			a.componentCount === b.componentCount &&
			stacksEqual(a.componentStack, b.componentStack);
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
				instanceID: res.readString(component, "instanceID") || res.readString(component, "instanceId") || "",
				instanceName: res.readString(component, "instanceName") || "",
				id: res.readString(component, "id") || "",
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

	function classifyParam(param, displayName, matchName, order, componentDisplayName, componentMatchName, parentName) {
		var api = schema();
		var cap = capability();
		var classified;
		var serialized;
		if (api && api.isSkippedParameterName(displayName)) {
			return {
				status: "UNSUPPORTED_TYPE",
				reason: "UNSUPPORTED_TYPE",
				order: order,
				displayName: displayName,
				matchName: matchName || "",
				parentName: parentName || ""
			};
		}
		if (!cap || !cap.classify) {
			return {
				status: "PRESET_HOST_ENGINE_MISSING",
				reason: "PRESET_HOST_ENGINE_MISSING",
				order: order,
				displayName: displayName,
				matchName: matchName || "",
				parentName: parentName || "",
				parityBug: true
			};
		}
		classified = cap.classify(param, displayName, matchName, componentDisplayName, componentMatchName);
		if (!classified.presetCapture) {
			return {
				status: classified.reason || "UNSUPPORTED_TYPE",
				reason: classified.reason || "UNSUPPORTED_TYPE",
				order: order,
				displayName: displayName,
				matchName: matchName || "",
				parentName: parentName || "",
				type: classified.type,
				value: classified.value,
				valueShape: classified.valueShape,
				pickfxRead: classified.pickfxRead,
				pickfxWrite: classified.pickfxWrite,
				pickfxVerify: classified.pickfxVerify,
				keyCount: classified.keyCount,
				timeVarying: classified.timeVarying,
				parityBug: classified.parityBug === true,
				getValueSuccess: classified.getValueSuccess,
				typeofSetValue: classified.typeofSetValue,
				areKeyframesSupported: classified.areKeyframesSupported
			};
		}
		serialized = api ? api.serializeValue(classified.type, classified.value) : null;
		if (!serialized || !serialized.ok) {
			return {
				status: "NOT_VERIFIABLE",
				reason: "NOT_VERIFIABLE",
				order: order,
				displayName: displayName,
				matchName: matchName || "",
				parentName: parentName || "",
				type: classified.type
			};
		}
		return {
			status: "SUPPORTED",
			reason: "SUPPORTED",
			order: order,
			displayName: displayName,
			matchName: matchName || "",
			parentName: parentName || "",
			type: serialized.type,
			value: serialized.value,
			valueShape: classified.valueShape,
			pickfxRead: true,
			pickfxWrite: true,
			pickfxVerify: true,
			keyCount: classified.keyCount,
			timeVarying: classified.timeVarying,
			getValueSuccess: true,
			typeofSetValue: classified.typeofSetValue,
			areKeyframesSupported: classified.areKeyframesSupported
		};
	}

	function walkParams(node, out, parentName, depth) {
		var res = resolver();
		var api = schema();
		var cap = capability();
		var props;
		var countInfo;
		var indexBase;
		var i;
		var param;
		var displayName;
		var matchName;
		var nested;
		var nestedCount;
		var isContainer;
		var isLeaf;
		if (depth > 8) {
			return;
		}
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
			nested = propertyCollection(param);
			nestedCount = nested ? res.collectionCount(nested).count : 0;
			isContainer = api && api.isContainerParameterName(displayName);
			isLeaf = cap && cap.hasDirectLiveValue ? cap.hasDirectLiveValue(param) : false;
			if (isContainer || (nestedCount > 0 && !isLeaf)) {
				walkParams(param, out, displayName || parentName, (depth || 0) + 1);
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

	function paramIdentityKey(row) {
		return String((row && row.parentName) || "").toLowerCase() + "||" +
			String((row && row.displayName) || "").toLowerCase() + "||" +
			String((row && row.matchName) || "").toLowerCase();
	}

	function uniqueNameConflict(rows, row) {
		var i;
		var count = 0;
		var key = paramIdentityKey(row);
		for (i = 0; i < (rows || []).length; i++) {
			if (paramIdentityKey(rows[i]) === key) {
				count += 1;
			}
		}
		return count > 1;
	}

	function classifyLeaves(component, componentDisplayName, componentMatchName) {
		var leaves = [];
		var classified = [];
		var i;
		var row;
		var info;
		walkParams(component, leaves, "", 0);
		for (i = 0; i < leaves.length; i++) {
			row = leaves[i];
			info = classifyParam(
				row.param,
				row.displayName,
				row.matchName,
				i,
				componentDisplayName,
				componentMatchName,
				row.parentName
			);
			if (info.status === "SUPPORTED" && uniqueNameConflict(leaves, row)) {
				info = {
					status: "AMBIGUOUS_PARAMETER",
					reason: "AMBIGUOUS_PARAMETER",
					order: i,
					displayName: row.displayName,
					matchName: row.matchName || "",
					parentName: row.parentName || ""
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
		var skippedReasons = [];
		var engineMissing = !resolver() || !capability() || !capability().classify;
		classified = classifyLeaves(row._component, row.displayName, row.matchName);
		for (i = 0; i < classified.length; i++) {
			if (classified[i].status === "SUPPORTED") {
				supported += 1;
			} else {
				skipped += 1;
				if (classified[i].status === "ANIMATION_REPLAY_NOT_YET_VERIFIED" ||
						classified[i].status === "KEYFRAMED_PARAMETER_UNSUPPORTED") {
					keyframed += 1;
				}
				if (skippedReasons.length < 6) {
					skippedReasons.push({
						displayName: classified[i].displayName || "",
						reason: classified[i].reason || classified[i].status || ""
					});
				}
			}
		}
		if (supported === 0) {
			captureStatus = "unsupported";
			kind = row.kind === "intrinsic" ? "intrinsic" : "unsupported";
			if (engineMissing) {
				limitation = "Cannot reproduce safely";
			} else if (keyframed === classified.length && classified.length) {
				limitation = "Animated parameters aren’t captured yet";
			} else {
				limitation = "Cannot reproduce safely";
			}
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
			limitation: limitation,
			skippedReasons: skippedReasons,
			engineMissing: engineMissing === true
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
			componentStack: session.componentStack,
			components: components,
			host: capability() && capability().hostStatus ? capability().hostStatus() : { ok: false }
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
		if (!session || !fingerprintsEqual(session, live)) {
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
		classified = classifyLeaves(row._component, row.displayName, row.matchName);
		pageSize = typeof limit === "number" && limit > 0 ? limit : PAGE_SIZE;
		start = typeof offset === "number" && offset > 0 ? offset : 0;
		for (i = start; i < classified.length && slice.length + skipped.length < pageSize; i++) {
			info = classified[i];
			if (info.status === "SUPPORTED") {
				slice.push({
					order: info.order,
					displayName: info.displayName,
					matchName: info.matchName,
					parentName: info.parentName || "",
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

	function mapTargetClip(item) {
		var mapped;
		var qeSequence;
		if (typeof $ === "undefined" || !$._pickfxQE || !$._pickfxQE.findQEClip) {
			return {
				ok: false,
				reason: "QE_MAPPING_FAILED",
				detail: "QE mapping is not available."
			};
		}
		try {
			$._pickfxQE.enable();
			qeSequence = qe.project.getActiveSequence();
			mapped = $._pickfxQE.findQEClip(qeSequence, item);
		} catch (mapErr) {
			return {
				ok: false,
				reason: "QE_MAPPING_FAILED",
				detail: String(mapErr)
			};
		}
		if (mapped && mapped.error && mapped.error.reason === "Track is locked") {
			return {
				ok: false,
				reason: "TRACK_LOCKED",
				detail: "Track locked"
			};
		}
		if (!mapped || !mapped.clip) {
			return {
				ok: false,
				reason: "QE_MAPPING_FAILED",
				detail: (mapped && mapped.error && (mapped.error.detail || mapped.error.reason)) ||
					"Could not map clip to QE item."
			};
		}
		return { ok: true, clip: mapped.clip };
	}

	function trackLockedMessage(item) {
		var mapped = mapTargetClip(item);
		if (mapped && mapped.reason === "TRACK_LOCKED") {
			return mapped.detail || "Track locked";
		}
		return "";
	}

	function clipExtras(item, index) {
		return {
			clipName: clipNameOf(item),
			clipIndex: index
		};
	}

	function preflightClip(item, index, needsQE) {
		var mapped;
		var extras = clipExtras(item, index);
		if (needsQE) {
			mapped = mapTargetClip(item);
			if (!mapped.ok) {
				return fail(mapped.reason, mapped.detail, extras);
			}
			return { ok: true };
		}
		mapped = mapTargetClip(item);
		if (mapped && mapped.reason === "TRACK_LOCKED") {
			return fail("TRACK_LOCKED", mapped.detail, extras);
		}
		return { ok: true };
	}

	function findParam(component, spec, leaves) {
		var i;
		var matchFold = String(spec.matchName || "").toLowerCase();
		var nameFold = String(spec.displayName || "").toLowerCase();
		var parentFold = String(spec.parentName || "").toLowerCase();
		var matchHits = [];
		var nameHits = [];
		var parentHits = [];
		var row;
		for (i = 0; i < leaves.length; i++) {
			row = leaves[i];
			if (matchFold && String(row.matchName || "").toLowerCase() === matchFold) {
				matchHits.push(row);
			}
			if (nameFold && String(row.displayName || "").toLowerCase() === nameFold) {
				nameHits.push(row);
				if (parentFold && String(row.parentName || "").toLowerCase() === parentFold) {
					parentHits.push(row);
				}
			}
		}
		if (parentHits.length === 1) {
			return { ok: true, row: parentHits[0] };
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
		var cap = capability();
		var api = writer();
		if (cap && cap.isActuallyKeyframed && cap.isActuallyKeyframed(param)) {
			return { ok: false, reason: "ANIMATION_REPLAY_NOT_YET_VERIFIED" };
		}
		if (api && api.writeResolved) {
			return api.writeResolved(param, spec.value, spec.type, spec.displayName);
		}
		return { ok: false, reason: "PRESET_HOST_ENGINE_MISSING" };
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
		var needsQE;
		var i;
		var clipCheck;
		if (!(app && app.project && app.project.activeSequence)) {
			return fail("NO_VIDEO_SELECTION", "No active sequence.");
		}
		selected = selectedVideo();
		if (!selected || selected.ok !== true || !selected.count) {
			return fail(
				(selected && selected.reason) || "NO_VIDEO_SELECTION",
				(selected && selected.detail) || "Select a video clip."
			);
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
		needsQE = required.length > 0;
		for (i = 0; i < selected.items.length; i++) {
			clipCheck = preflightClip(selected.items[i], i, needsQE);
			if (!clipCheck.ok) {
				return clipCheck;
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

	function findNamedParam(component, paramName) {
		var leaves = [];
		var i;
		var foldName = String(paramName || "").toLowerCase();
		walkParams(component, leaves, "");
		for (i = 0; i < leaves.length; i++) {
			if (String(leaves[i].displayName || "").toLowerCase() === foldName) {
				return leaves[i];
			}
		}
		return null;
	}

	function matchingEffectRows(rows, spec) {
		var hits = [];
		var i;
		for (i = 0; i < (rows || []).length; i++) {
			if (schema().matchesExpectedEffect(rows[i], spec)) {
				hits.push(rows[i]);
			}
		}
		return hits;
	}

	function hasUsableInstanceIdentity(rows) {
		var i;
		var token;
		var seen = {};
		var found = 0;
		for (i = 0; i < (rows || []).length; i++) {
			token = String((rows[i] && (rows[i].instanceID || rows[i].id)) || "");
			if (!token || seen[token]) {
				return false;
			}
			seen[token] = true;
			found += 1;
		}
		return found === (rows || []).length && found > 0;
	}

	function probeDuplicateEffectInsert() {
		var spec = {
			displayName: "Gaussian Blur",
			matchName: "AE.ADBE Gaussian Blur",
			premiereName: "Gaussian Blur"
		};
		var paramName = "Blurriness";
		var selected;
		var item;
		var before;
		var after;
		var existingHits;
		var existingParam;
		var added;
		var identity;
		var written;
		var newParam;
		var existingValue = null;
		var newValue = null;
		var proven = false;
		selected = selectedVideo();
		if (!selected || selected.ok !== true) {
			return stringify(fail(
				(selected && selected.reason) || "NO_VIDEO_SELECTION",
				(selected && selected.detail) || "Select a video clip.",
				{ liveProbe: true }
			));
		}
		if (selected.count !== 1) {
			return stringify(fail(
				"CAPTURE_REQUIRES_SINGLE_CLIP",
				"Live duplicate-effect probe requires one selected clip.",
				{ liveProbe: true }
			));
		}
		item = selected.items[0];
		before = snapshotComponents(item);
		existingHits = matchingEffectRows(before, spec);
		if (!existingHits.length) {
			return stringify(fail(
				"COMPONENT_NOT_FOUND",
				"Live case requires an existing Gaussian Blur set to 5 before adding a duplicate.",
				{ liveProbe: true }
			));
		}
		existingParam = findNamedParam(existingHits[0]._component, paramName);
		if (!existingParam || !existingParam.param) {
			return stringify(fail(
				"PARAMETER_NOT_FOUND",
				"Could not read Blurriness on the existing Gaussian Blur.",
				{ liveProbe: true }
			));
		}
		written = writeParam(existingParam.param, {
			displayName: paramName,
			type: "number",
			value: 5
		});
		if (!written || written.ok !== true) {
			return stringify(fail(
				(written && written.reason) || "WRITE_FAILED",
				"Could not set the existing Gaussian Blur to 5.",
				{ liveProbe: true }
			));
		}
		try {
			existingValue = existingParam.param.getValue();
		} catch (readExistingErr) {
			existingValue = null;
		}
		before = snapshotComponents(item);
		added = addEffect(item, spec.premiereName);
		if (!added || added.ok !== true) {
			return stringify({
				ok: false,
				liveProbe: true,
				reason: (added && added.reason) || "WRITE_FAILED",
				detail: (added && added.detail) || (added && added.message) || "Could not add Gaussian Blur.",
				wroteNewInstance: false,
				existingValue: existingValue,
				beforeStack: componentStackSignatureFromRows(before),
				beforeComponents: identityRows(before)
			});
		}
		after = snapshotComponents(item);
		identity = schema().identifyInserted(before, after);
		if (!identity || identity.ok !== true || !identity.component || !identity.component._component) {
			return stringify({
				ok: false,
				liveProbe: true,
				reason: "NEW_EFFECT_INSTANCE_AMBIGUOUS",
				detail: "QE insert did not prove which Gaussian Blur instance is new.",
				instanceIdentityAvailable: hasUsableInstanceIdentity(after),
				wroteNewInstance: false,
				existingValue: existingValue,
				beforeStack: componentStackSignatureFromRows(before),
				afterStack: componentStackSignatureFromRows(after),
				beforeComponents: identityRows(before),
				afterComponents: identityRows(after),
				identify: identity
			});
		}
		if (identity.component._component === existingHits[0]._component) {
			return stringify({
				ok: false,
				liveProbe: true,
				reason: "NEW_EFFECT_INSTANCE_AMBIGUOUS",
				detail: "Insert identity resolved to the existing Gaussian Blur.",
				instanceIdentityAvailable: hasUsableInstanceIdentity(after),
				wroteNewInstance: false,
				existingValue: existingValue,
				beforeStack: componentStackSignatureFromRows(before),
				afterStack: componentStackSignatureFromRows(after),
				beforeComponents: identityRows(before),
				afterComponents: identityRows(after)
			});
		}
		newParam = findNamedParam(identity.component._component, paramName);
		if (!newParam || !newParam.param) {
			return stringify({
				ok: false,
				liveProbe: true,
				reason: "NEW_EFFECT_INSTANCE_AMBIGUOUS",
				detail: "Could not read Blurriness on the candidate new instance.",
				wroteNewInstance: false,
				existingValue: existingValue,
				beforeStack: componentStackSignatureFromRows(before),
				afterStack: componentStackSignatureFromRows(after),
				beforeComponents: identityRows(before),
				afterComponents: identityRows(after)
			});
		}
		written = writeParam(newParam.param, {
			displayName: paramName,
			type: "number",
			value: 30
		});
		try {
			existingValue = existingParam.param.getValue();
		} catch (rereadErr) {
			existingValue = null;
		}
		try {
			newValue = newParam.param.getValue();
		} catch (newReadErr) {
			newValue = null;
		}
		proven = written && written.ok === true &&
			valuesClose("number", 5, existingValue).ok &&
			valuesClose("number", 30, newValue).ok;
		return stringify({
			ok: proven,
			liveProbe: true,
			reason: proven ? "" : "NEW_EFFECT_INSTANCE_AMBIGUOUS",
			detail: proven
				? "New Gaussian Blur instance was identified and written independently."
				: "Could not prove the new Gaussian Blur instance without changing the existing one.",
			instanceIdentityAvailable: hasUsableInstanceIdentity(after),
			wroteNewInstance: proven,
			existingValue: existingValue,
			newValue: newValue,
			identifyVia: identity.via || "",
			beforeStack: componentStackSignatureFromRows(before),
			afterStack: componentStackSignatureFromRows(after),
			beforeComponents: identityRows(before),
			afterComponents: identityRows(after)
		});
	}

	function inspectPresetCaptureSupport() {
		var selected;
		var item;
		var snap;
		var i;
		var j;
		var classified;
		var row;
		var info;
		var components = [];
		var params;
		var parityBugs = 0;
		selected = selectedVideo();
		if (!selected || selected.ok !== true) {
			return stringify(fail(
				(selected && selected.reason) || "NO_VIDEO_SELECTION",
				(selected && selected.detail) || "Select a video clip.",
				{ diagnostic: true }
			));
		}
		if (selected.count !== 1) {
			return stringify(fail(
				"CAPTURE_REQUIRES_SINGLE_CLIP",
				"Capture diagnostics require one selected clip.",
				{ diagnostic: true }
			));
		}
		item = selected.items[0];
		snap = snapshotComponents(item);
		for (i = 0; i < snap.length; i++) {
			row = snap[i];
			classified = classifyLeaves(row._component, row.displayName, row.matchName);
			params = [];
			for (j = 0; j < classified.length && params.length < 40; j++) {
				info = classified[j];
				if (info.parityBug || (info.pickfxWrite === true && info.status !== "SUPPORTED")) {
					parityBugs += 1;
				}
				params.push({
					displayName: info.displayName,
					matchName: info.matchName,
					parentName: info.parentName || "",
					getValueSuccess: info.getValueSuccess === true ||
						(info.pickfxRead !== false && info.status !== "READ_FAILED"),
					rawValue: info.value,
					valueType: info.type || "",
					valueShape: info.valueShape || "",
					typeofSetValue: info.typeofSetValue ||
						(info.status === "NOT_WRITABLE" ? "unavailable" : "function"),
					isTimeVarying: info.timeVarying === true,
					areKeyframesSupported: info.areKeyframesSupported === true,
					keyCount: info.keyCount || 0,
					pickfxRead: info.pickfxRead === true || info.status === "SUPPORTED",
					pickfxWrite: info.pickfxWrite === true || info.status === "SUPPORTED",
					pickfxVerify: info.pickfxVerify === true || info.status === "SUPPORTED",
					presetCapture: info.status === "SUPPORTED",
					reason: info.reason || info.status,
					parityBug: info.parityBug === true ||
						((info.pickfxWrite === true) && info.status !== "SUPPORTED" &&
							info.status !== "ANIMATION_REPLAY_NOT_YET_VERIFIED")
				});
			}
			components.push({
				displayName: row.displayName,
				matchName: row.matchName,
				kind: row.kind,
				parameters: params
			});
		}
		return stringify({
			ok: true,
			diagnostic: true,
			host: capability() && capability().hostStatus ? capability().hostStatus() : { ok: false },
			parityBugs: parityBugs,
			components: components
		});
	}

	function presetHostCapabilityStatus() {
		var cap = capability();
		if (cap && cap.hostStatus) {
			return stringify(cap.hostStatus());
		}
		return stringify({
			ok: false,
			reason: "PRESET_HOST_ENGINE_MISSING",
			missing: ["presetCapability"]
		});
	}

	function probePresetEffectCompatibility(effectName) {
		var selected;
		var item;
		var before;
		var after;
		var added;
		var identity;
		var classified;
		var ready = 0;
		var partial = 0;
		var unsupported = 0;
		var i;
		var info;
		selected = selectedVideo();
		if (!selected || selected.ok !== true || selected.count !== 1) {
			return stringify(fail(
				(selected && selected.reason) || "NO_VIDEO_SELECTION",
				"Compatibility probe requires one disposable selected clip."
			));
		}
		item = selected.items[0];
		before = snapshotComponents(item);
		added = addEffect(item, effectName);
		if (!added || added.ok !== true) {
			return stringify({
				ok: false,
				liveProbe: true,
				effect: effectName,
				reason: (added && added.reason) || "PRESET_EFFECT_UNAVAILABLE"
			});
		}
		after = snapshotComponents(item);
		identity = schema().identifyInserted(before, after);
		if (!identity || !identity.ok) {
			return stringify({
				ok: false,
				liveProbe: true,
				effect: effectName,
				reason: "NEW_EFFECT_INSTANCE_AMBIGUOUS",
				status: "UNSUPPORTED"
			});
		}
		classified = classifyLeaves(
			identity.component._component,
			identity.component.displayName,
			identity.component.matchName
		);
		for (i = 0; i < classified.length; i++) {
			info = classified[i];
			if (info.status === "SUPPORTED") {
				ready += 1;
			} else if (info.status === "ANIMATION_REPLAY_NOT_YET_VERIFIED" ||
					info.status === "UNSUPPORTED_TYPE" ||
					info.status === "AMBIGUOUS_PARAMETER") {
				partial += 1;
			} else {
				unsupported += 1;
			}
		}
		return stringify({
			ok: true,
			liveProbe: true,
			effect: effectName,
			status: ready && !unsupported && !partial ? "READY" : (ready ? "PARTIAL" : "UNSUPPORTED"),
			supportedParameters: ready,
			partialParameters: partial,
			unsupportedParameters: unsupported,
			identifyVia: identity.via || "",
			parameters: classified.slice(0, 40)
		});
	}

	function videoEffectNames() {
		var names = [];
		var list;
		var count = 0;
		var i;
		var item;
		try {
			if (typeof $ !== "undefined" && $._pickfxQE && $._pickfxQE.enable) {
				$._pickfxQE.enable();
			}
			list = qe.project.getVideoEffectList();
		} catch (listErr) {
			return { names: names, error: String(listErr) };
		}
		if (list && typeof list.numItems === "number") {
			count = list.numItems;
		} else if (list && typeof list.length === "number") {
			count = list.length;
		}
		for (i = 0; i < count; i++) {
			try {
				item = list[i];
				if (item && item.name) {
					names.push(String(item.name));
				} else if (item) {
					names.push(String(item));
				}
			} catch (ignoreItem) {}
		}
		return { names: names };
	}

	function probePresetRegistryCompatibility() {
		var selected;
		var listed;
		var names;
		var i;
		var probed;
		var parsed;
		var ready = 0;
		var partial = 0;
		var unsupported = 0;
		var addFailed = 0;
		var qeResolvable = 0;
		var samples = [];
		selected = selectedVideo();
		if (!selected || selected.ok !== true || selected.count !== 1) {
			return stringify(fail(
				(selected && selected.reason) || "NO_VIDEO_SELECTION",
				"Registry compatibility requires one disposable selected clip.",
				{ liveProbe: true, diagnostic: true }
			));
		}
		listed = videoEffectNames();
		names = listed.names || [];
		for (i = 0; i < names.length; i++) {
			if (effectAvailable(names[i])) {
				qeResolvable += 1;
			}
			probed = probePresetEffectCompatibility(names[i]);
			try {
				parsed = typeof probed === "string" ? JSON.parse(probed) : probed;
			} catch (ignoreParse) {
				parsed = { ok: false, status: "UNSUPPORTED", effect: names[i] };
			}
			if (!parsed || parsed.ok !== true) {
				addFailed += 1;
				unsupported += 1;
				if (samples.length < 20) {
					samples.push({
						effect: names[i],
						status: "UNSUPPORTED",
						reason: (parsed && parsed.reason) || "PRESET_EFFECT_UNAVAILABLE"
					});
				}
				continue;
			}
			if (parsed.status === "READY") {
				ready += 1;
			} else if (parsed.status === "PARTIAL") {
				partial += 1;
			} else {
				unsupported += 1;
			}
			if (samples.length < 20) {
				samples.push({
					effect: names[i],
					status: parsed.status,
					supportedParameters: parsed.supportedParameters || 0,
					partialParameters: parsed.partialParameters || 0,
					unsupportedParameters: parsed.unsupportedParameters || 0
				});
			}
		}
		return stringify({
			ok: true,
			liveProbe: true,
			diagnostic: true,
			totalDiscovered: names.length,
			qeResolvable: qeResolvable,
			presetReady: ready,
			partial: partial,
			unsupported: unsupported,
			addFailed: addFailed,
			listError: listed.error || "",
			samples: samples
		});
	}

	return {
		runtimeVersion: RUNTIME_VERSION,
		PAGE_SIZE: PAGE_SIZE,
		MAX_RESULT_BYTES: MAX_RESULT_BYTES,
		listCapturableComponents: listCapturableComponents,
		captureComponent: captureComponent,
		applyPreset: applyPreset,
		preflight: preflight,
		stringify: stringify,
		fingerprintItem: fingerprintItem,
		componentStackSignatureFromRows: componentStackSignatureFromRows,
		probeDuplicateEffectInsert: probeDuplicateEffectInsert,
		inspectPresetCaptureSupport: inspectPresetCaptureSupport,
		presetHostCapabilityStatus: presetHostCapabilityStatus,
		probePresetEffectCompatibility: probePresetEffectCompatibility,
		probePresetRegistryCompatibility: probePresetRegistryCompatibility,
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
