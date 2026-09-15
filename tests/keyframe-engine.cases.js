(function () {
	var startCount = passed + failed;
	var TPF = 10584000000;
	var Engine = KeyframeEngine;
	var sequence = { timebase: TPF };
	var result;
	var clipA;
	var clipB;
	var param;
	var keysAfter;

	if (typeof Time === "undefined") {
		Time = function () {
			this.ticks = "0";
		};
	}

	function ticks(frames) {
		return frames * TPF;
	}

	function timeObj(frame) {
		return { ticks: String(ticks(frame)) };
	}

	function keyframeParam(initial, opts) {
		var value = initial;
		var varying = !!(opts && opts.timeVarying);
		var keyTicks = opts && opts.keys ? opts.keys.slice(0) : [];
		var store = {};
		var i;
		opts = opts || {};
		if (opts.seedStore) {
			for (i = 0; i < keyTicks.length; i++) {
				store[String(keyTicks[i])] = opts.seedStore[i] !== undefined ? opts.seedStore[i] : initial;
			}
		}
		return {
			displayName: opts.displayName || "Scale",
			matchName: opts.matchName || "",
			getValue: function () {
				return value;
			},
			getValueAtTime: function (time) {
				var t = String(time && time.ticks);
				if (store.hasOwnProperty(t)) {
					return store[t];
				}
				if (opts.atTimeMiss !== undefined && !varying) {
					return opts.atTimeMiss;
				}
				return value;
			},
			areKeyframesSupported: function () {
				return opts.unsupported === true ? false : true;
			},
			isTimeVarying: function () {
				return varying;
			},
			setTimeVarying: function (next) {
				if (opts.setTimeVaryingThrows) {
					throw new Error("setTimeVarying refused");
				}
				varying = !!next;
				if (next && opts.autoEndTicks !== undefined) {
					if (keyTicks.indexOf(0) === -1) {
						keyTicks.push(0);
					}
					store["0"] = value;
					if (keyTicks.indexOf(opts.autoEndTicks) === -1) {
						keyTicks.push(opts.autoEndTicks);
					}
					store[String(opts.autoEndTicks)] = value;
				}
			},
			getKeys: function () {
				if (opts.noGetKeys) {
					throw new Error("getKeys unavailable");
				}
				return keyTicks.map(function (tick) {
					return { ticks: String(tick) };
				});
			},
			addKey: function (time) {
				var t = Number(time.ticks);
				if (keyTicks.indexOf(t) === -1) {
					keyTicks.push(t);
				}
			},
			setValueAtKey: function (time, next) {
				store[String(time.ticks)] = next;
				value = next;
				varying = true;
			},
			_store: store,
			_keys: keyTicks
		};
	}

	function makeClip(name, startFrame, endFrame, componentMatch, componentDisplay, param) {
		return {
			name: name,
			mediaType: "Video",
			start: timeObj(startFrame),
			end: timeObj(endFrame),
			components: [{
				displayName: componentDisplay,
				matchName: componentMatch,
				properties: [param]
			}]
		};
	}

	function zoomInSpec() {
		return ActionRegistry.hostSpec(ActionRegistry.findById("zoom-in"));
	}

	function zoomOutSpec() {
		return ActionRegistry.hostSpec(ActionRegistry.findById("zoom-out"));
	}

	function fadeInSpec() {
		return ActionRegistry.hostSpec(ActionRegistry.findById("fade-in"));
	}

	function fadeOutSpec() {
		return ActionRegistry.hostSpec(ActionRegistry.findById("fade-out"));
	}

	param = keyframeParam(100);
	clipA = makeClip("Clip A", 0, 20, "AE.ADBE Motion", "Motion", param);
	result = Engine.applyToClip(clipA, sequence, zoomInSpec());
	assertEq("zoom in ok", result.ok, true);
	assertEq("zoom in verified", result.verified, true);
	assertEq("zoom in start", result.requestedStartValue, 100);
	assertEq("zoom in end", result.requestedEndValue, 110);
	assertEq("zoom in actual start", result.actualStartValue, 100);
	assertEq("zoom in actual end", result.actualEndValue, 110);
	assertEq("zoom in original captured before write", result.originalValue, 100);
	assert("zoom in midpoint is between keys", result.actualMidValue >= 100 && result.actualMidValue <= 110);
	assertEq("zoom in method uses official DOM", result.method.indexOf("setValueAtKey") !== -1, true);
	assertEq("zoom in never uses QE", result.usedQE, false);

	param = keyframeParam(100, { atTimeMiss: 0 });
	clipA = makeClip("AtTimeZero", 0, 20, "AE.ADBE Motion", "Motion", param);
	result = Engine.applyToClip(clipA, sequence, zoomInSpec());
	assertEq("static getValue wins over getValueAtTime 0", result.requestedStartValue, 100);
	assertEq("static getValue zoom in end", result.requestedEndValue, 110);
	assertEq("static getValue original", result.originalValue, 100);

	param = keyframeParam(100);
	clipA = makeClip("Repeat", 0, 20, "AE.ADBE Motion", "Motion", param);
	Engine.applyToClip(clipA, sequence, zoomInSpec());
	result = Engine.applyToClip(clipA, sequence, zoomInSpec());
	assertEq("repeat zoom in does not stack start", result.requestedStartValue, 100);
	assertEq("repeat zoom in does not stack end", result.requestedEndValue, 110);
	assertEq("repeat zoom in original stays boundary value", result.originalValue, 100);

	param = keyframeParam(100, { autoEndTicks: ticks(20) });
	clipA = makeClip("Hold", 0, 20, "AE.ADBE Motion", "Motion", param);
	result = Engine.applyToClip(clipA, sequence, zoomInSpec());
	assertEq("auto clip-end key holds zoom end", param._store[String(ticks(20))], 110);
	assertEq("hold zoom in still verified", result.verified, true);

	param = keyframeParam(125);
	clipA = makeClip("Clip A", 0, 20, "AE.ADBE Motion", "Motion", param);
	result = Engine.applyToClip(clipA, sequence, zoomInSpec());
	assertEq("zoom in respects current scale", result.requestedStartValue, 125);
	assertEq("zoom in adds ten points", result.requestedEndValue, 135);

	param = keyframeParam(100);
	clipA = makeClip("Clip A", 0, 20, "AE.ADBE Motion", "Motion", param);
	result = Engine.applyToClip(clipA, sequence, zoomOutSpec());
	assertEq("zoom out start", result.requestedStartValue, 110);
	assertEq("zoom out end matches current", result.requestedEndValue, 100);
	assertEq("zoom out original", result.originalValue, 100);

	param = keyframeParam(125);
	clipA = makeClip("Clip A", 0, 20, "AE.ADBE Motion", "Motion", param);
	result = Engine.applyToClip(clipA, sequence, zoomOutSpec());
	assertEq("zoom out 125 start", result.requestedStartValue, 135);
	assertEq("zoom out 125 end", result.requestedEndValue, 125);

	param = keyframeParam(80, { displayName: "Opacity" });
	clipA = makeClip("Clip A", 0, 20, "AE.ADBE Opacity", "Opacity", param);
	result = Engine.applyToClip(clipA, sequence, fadeInSpec());
	assertEq("fade in start", result.requestedStartValue, 0);
	assertEq("fade in end uses current opacity", result.requestedEndValue, 80);

	param = keyframeParam(80, { displayName: "Opacity" });
	clipA = makeClip("Clip A", 0, 20, "AE.ADBE Opacity", "Opacity", param);
	result = Engine.applyToClip(clipA, sequence, fadeOutSpec());
	assertEq("fade out start uses current opacity", result.requestedStartValue, 80);
	assertEq("fade out end", result.requestedEndValue, 0);
	assertEq("fade out starts at clip end minus duration", result.startTicks, ticks(10));
	assertEq("fade out ends at clip end", result.endTicks, ticks(20));

	param = keyframeParam(100);
	clipA = makeClip("Short", 0, 4, "AE.ADBE Motion", "Motion", param);
	result = Engine.applyToClip(clipA, sequence, zoomInSpec());
	assertEq("short clip still ok", result.ok, true);
	assertEq("short clip is clamped", result.clamped, true);
	assertEq("short clip end is clip end", result.endTicks, ticks(4));

	param = keyframeParam(100);
	clipA = makeClip("Zero", 0, 0, "AE.ADBE Motion", "Motion", param);
	result = Engine.applyToClip(clipA, sequence, zoomInSpec());
	assertEq("zero length reason", result.reason, "INVALID_CLIP_DURATION");
	assertEq("zero length not ok", result.ok, false);

	param = keyframeParam(100, { timeVarying: true, keys: [ticks(5)] });
	clipA = makeClip("Keyed", 0, 20, "AE.ADBE Motion", "Motion", param);
	result = Engine.applyToClip(clipA, sequence, zoomInSpec());
	assertEq("interior key conflict", result.reason, "KEYFRAME_CONFLICT");
	assertEq("conflict does not write", result.ok, false);
	assertEq("conflict preserves existing key", param._keys.length, 1);

	param = keyframeParam(100, { timeVarying: true, keys: [ticks(15)], seedStore: [100] });
	clipA = makeClip("Later", 0, 20, "AE.ADBE Motion", "Motion", param);
	result = Engine.applyToClip(clipA, sequence, zoomInSpec());
	assertEq("outside key allowed", result.ok, true);
	keysAfter = param._keys.slice(0).sort(function (a, b) { return a - b; });
	assert("outside key preserved", keysAfter.indexOf(ticks(15)) !== -1);
	assert("start key added", keysAfter.indexOf(ticks(0)) !== -1);
	assert("end key added", keysAfter.indexOf(ticks(10)) !== -1);

	param = keyframeParam(100, { unsupported: true });
	clipA = makeClip("Locked", 0, 20, "AE.ADBE Motion", "Motion", param);
	result = Engine.applyToClip(clipA, sequence, zoomInSpec());
	assertEq("unsupported reason", result.reason, "KEYFRAMES_NOT_SUPPORTED");

	clipA = {
		name: "Audio",
		mediaType: "Audio",
		start: timeObj(0),
		end: timeObj(20),
		components: []
	};
	result = Engine.applyToClip(clipA, sequence, zoomInSpec());
	assertEq("audio rejected", result.reason, "NO_VIDEO_SELECTION");

	param = keyframeParam(100);
	clipA = makeClip("A", 0, 20, "AE.ADBE Motion", "Motion", param);
	param = keyframeParam(200);
	clipB = makeClip("B", 0, 20, "AE.ADBE Motion", "Motion", param);
	result = Engine.applyMany([clipA, clipB], sequence, zoomInSpec());
	assertEq("batch selected", result.selectedCount, 2);
	assertEq("batch successful", result.successfulCount, 2);
	assertEq("batch failed", result.failedCount, 0);
	assertEq("batch ok", result.ok, true);
	assertEq("batch per-clip current a", result.clips[0].requestedStartValue, 100);
	assertEq("batch per-clip current b", result.clips[1].requestedStartValue, 200);
	assertEq("batch action flag", result.action, true);

	param = keyframeParam(100);
	clipA = makeClip("A", 0, 20, "AE.ADBE Motion", "Motion", param);
	param = keyframeParam(100, { unsupported: true });
	clipB = makeClip("B", 0, 20, "AE.ADBE Motion", "Motion", param);
	result = Engine.applyMany([clipA, clipB], sequence, zoomInSpec());
	assertEq("partial batch not all-ok", result.ok, false);
	assertEq("partial success count", result.successfulCount, 1);
	assertEq("partial fail count", result.failedCount, 1);
	assertEq("partial does not drop the success", result.clips[0].ok, true);

	result = Engine.applyMany([], sequence, zoomInSpec());
	assertEq("empty selection reason", result.reason, "NO_VIDEO_SELECTION");
	assertEq("empty selection count", result.selectedCount, 0);

	result = Engine.planTimes(
		{ start: timeObj(0), end: timeObj(20) },
		sequence,
		10,
		"start"
	);
	assertEq("plan 10 frames at 24fps", result.endTicks - result.startTicks, ticks(10));
	assertEq("plan does not hard-code 24", Engine.ticksPerFrame({ timebase: 8477280000 }), 8477280000);

	result = Engine.planTimes(
		{ start: timeObj(0), end: timeObj(20) },
		{ timebase: 0, getSettings: function () { return { videoFrameRate: { ticks: String(TPF) } }; } },
		10,
		"start"
	);
	assertEq("plan can use videoFrameRate", result.ok, true);

	clipA = makeClip("Missing", 0, 20, "AE.ADBE Gaussian", "Gaussian Blur", keyframeParam(100, { displayName: "Blurriness" }));
	result = Engine.applyToClip(clipA, sequence, zoomInSpec());
	assertEq("missing motion component", result.reason, "COMPONENT_NOT_FOUND");

	if (typeof PremiereBridge !== "undefined" && PremiereBridge.runAction) {
		result = null;
		PremiereBridge.runAction({
			evalScript: function (script, done) {
				script = String(script || "");
				if (script.indexOf("actionHostStatus") !== -1 ||
						(script.indexOf("keyframeEngine") !== -1 && script.indexOf("$._pickfx.runAction") === -1)) {
					done(JSON.stringify({
						ok: true,
						host: true,
						runAction: true,
						keyframeEngine: true
					}));
					return;
				}
				assert("runAction script calls host runAction", script.indexOf("$._pickfx.runAction") !== -1);
				assert("runAction script is one host call", script.indexOf("$._pickfx.runAction") === script.lastIndexOf("$._pickfx.runAction"));
				done(JSON.stringify({
					ok: true,
					action: true,
					actionId: "zoom-in",
					selectedCount: 1,
					successfulCount: 1,
					failedCount: 0,
					verified: true
				}));
			}
		}, zoomInSpec(), function (payload) {
			result = payload;
		});
		assertEq("bridge runAction parses ok", result.ok, true);
		assertEq("bridge runAction id", result.actionId, "zoom-in");
		assertEq("bridge runAction marks host ready", result.hostReady, true);
	}

	print("keyframe engine: " + ((passed + failed) - startCount) + " assertions");
}());
