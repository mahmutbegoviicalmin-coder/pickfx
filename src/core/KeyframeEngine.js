var KeyframeEngine = (function () {
	var NUMBER_EPS = 0.0001;
	var TICKS_PER_SECOND = 254016000000;
	var METHOD = "setTimeVarying+addKey+setValueAtKey";

	function trim(value) {
		return String(value || "").replace(/^\s+|\s+$/g, "");
	}

	function hasFn(obj, name) {
		try {
			return !!(obj && typeof obj[name] === "function");
		} catch (ignore) {
			return false;
		}
	}

	function readString(obj, key) {
		try {
			if (obj && obj[key] !== undefined && obj[key] !== null) {
				return String(obj[key]);
			}
		} catch (ignore) {}
		return "";
	}

	function asFiniteNumber(value) {
		var n;
		if (typeof value === "number" && isFinite(value)) {
			return value;
		}
		if (typeof value === "string" && value !== "") {
			n = Number(value);
			if (isFinite(n)) {
				return n;
			}
		}
		return undefined;
	}

	function numbersClose(a, b) {
		var left = asFiniteNumber(a);
		var right = asFiniteNumber(b);
		if (left === undefined || right === undefined) {
			return false;
		}
		if (left === right) {
			return true;
		}
		return Math.abs(left - right) <= NUMBER_EPS;
	}

	function copyExtra(target, extra) {
		var key;
		if (!extra) {
			return target;
		}
		for (key in extra) {
			if (extra.hasOwnProperty(key) && target[key] === undefined) {
				target[key] = extra[key];
			}
		}
		return target;
	}

	function exceptionInfo(err) {
		var out = { text: String(err) };
		try {
			if (err && err.name) {
				out.name = String(err.name);
			}
		} catch (ignoreName) {}
		try {
			if (err && err.message) {
				out.message = String(err.message);
			}
		} catch (ignoreMessage) {}
		try {
			if (err && err.fileName) {
				out.fileName = String(err.fileName);
			}
		} catch (ignoreFile) {}
		try {
			if (err && err.line !== undefined && err.line !== null) {
				out.line = err.line;
			}
		} catch (ignoreLine) {}
		try {
			if (err && err.source) {
				out.source = String(err.source);
			}
		} catch (ignoreSource) {}
		try {
			if (err && err.description) {
				out.description = String(err.description);
			}
		} catch (ignoreDesc) {}
		try {
			if (err && err.stack) {
				out.stack = String(err.stack);
			}
		} catch (ignoreStack) {}
		return out;
	}

	function constructorNameOf(value) {
		try {
			if (value && value.constructor && value.constructor.name) {
				return String(value.constructor.name);
			}
		} catch (ignore) {}
		try {
			return Object.prototype.toString.call(value);
		} catch (ignoreToString) {}
		return null;
	}

	function jsonSafeDiag(value, depth) {
		var t;
		var i;
		var key;
		var out;
		var item;
		if (depth === undefined) {
			depth = 0;
		}
		if (depth > 8) {
			return "[max-depth]";
		}
		if (value === undefined) {
			return null;
		}
		if (value === null) {
			return null;
		}
		t = typeof value;
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
			try {
				return String(value);
			} catch (ignoreString) {
				return null;
			}
		}
		try {
			if (typeof value.length === "number" && value.length >= 0 && value.length < 64 &&
					(value.join || Object.prototype.toString.call(value) === "[object Array]")) {
				out = [];
				for (i = 0; i < value.length; i++) {
					out.push(jsonSafeDiag(value[i], depth + 1));
				}
				return out;
			}
		} catch (ignoreArr) {}
		out = {};
		try {
			if (value.seconds !== undefined || value.ticks !== undefined) {
				out.seconds = jsonSafeDiag(value.seconds, depth + 1);
				out.ticks = jsonSafeDiag(value.ticks, depth + 1);
				out.typeofSeconds = typeof value.seconds;
				out.typeofTicks = typeof value.ticks;
			}
		} catch (ignoreTime) {}
		try {
			for (key in value) {
				try {
					if (value.hasOwnProperty && !value.hasOwnProperty(key)) {
						continue;
					}
				} catch (ignoreOwn) {}
				try {
					item = value[key];
				} catch (ignoreGet) {
					out[key] = "[threw]";
					continue;
				}
				if (typeof item === "function") {
					continue;
				}
				out[key] = jsonSafeDiag(item, depth + 1);
			}
		} catch (ignoreObj) {}
		return out;
	}

	function serializeTime(timeObj) {
		var rec = {
			present: timeObj !== undefined && timeObj !== null,
			typeofValue: typeof timeObj,
			constructorName: constructorNameOf(timeObj)
		};
		if (typeof timeObj === "number") {
			rec.number = timeObj;
			rec.seconds = timeObj;
			return rec;
		}
		try {
			if (timeObj && timeObj.seconds !== undefined) {
				rec.seconds = timeObj.seconds;
				rec.typeofSeconds = typeof timeObj.seconds;
			}
		} catch (secErr) {
			rec.secondsError = exceptionInfo(secErr);
		}
		try {
			if (timeObj && timeObj.ticks !== undefined) {
				rec.ticks = timeObj.ticks;
				rec.typeofTicks = typeof timeObj.ticks;
			}
		} catch (tickErr) {
			rec.ticksError = exceptionInfo(tickErr);
		}
		try {
			rec.ticksNumber = ticksOf(timeObj);
		} catch (ignoreTicksOf) {}
		return rec;
	}

	function describeValue(value) {
		var rec;
		var i;
		var item;
		rec = {
			typeofValue: typeof value,
			constructorName: constructorNameOf(value),
			isArray: false,
			length: null,
			json: jsonSafeDiag(value)
		};
		if (value === undefined) {
			rec.json = null;
			rec.undefined = true;
			return rec;
		}
		if (value === null) {
			rec.isNull = true;
			return rec;
		}
		try {
			if (typeof value.length === "number") {
				rec.length = value.length;
				rec.isArray = !!(value.join || Object.prototype.toString.call(value) === "[object Array]");
				if (rec.isArray || (value.length >= 0 && value.length <= 8)) {
					rec.items = [];
					for (i = 0; i < value.length && i < 8; i++) {
						try {
							item = value[i];
							rec.items.push({
								index: i,
								typeofValue: typeof item,
								json: jsonSafeDiag(item)
							});
						} catch (itemErr) {
							rec.items.push({ index: i, error: exceptionInfo(itemErr) });
						}
					}
				}
			}
		} catch (ignoreLen) {}
		try {
			if (value && (value.seconds !== undefined || value.ticks !== undefined) && typeof value !== "number") {
				rec.time = serializeTime(value);
			}
		} catch (ignoreTime) {}
		return rec;
	}

	function describeGetKeysRaw(keys) {
		var rec;
		var i;
		var countInfo;
		var indexBase;
		var item;
		rec = {
			typeofValue: typeof keys,
			constructorName: constructorNameOf(keys),
			isNull: keys === null,
			isUndefined: keys === undefined,
			isZero: keys === 0,
			length: null,
			numItems: null,
			keys: [],
			forInKeys: []
		};
		if (keys === undefined || keys === null || keys === 0) {
			return rec;
		}
		try {
			if (keys.length !== undefined) {
				rec.length = keys.length;
				rec.typeofLength = typeof keys.length;
			}
		} catch (lenErr) {
			rec.lengthError = exceptionInfo(lenErr);
		}
		try {
			if (keys.numItems !== undefined) {
				rec.numItems = keys.numItems;
				rec.typeofNumItems = typeof keys.numItems;
			}
		} catch (numErr) {
			rec.numItemsError = exceptionInfo(numErr);
		}
		try {
			for (i in keys) {
				rec.forInKeys.push(String(i));
				if (rec.forInKeys.length >= 24) {
					break;
				}
			}
		} catch (forInErr) {
			rec.forInError = exceptionInfo(forInErr);
		}
		if (typeof keys.length === "number") {
			for (i = 0; i < keys.length && i < 24; i++) {
				try {
					item = keys[i];
					rec.keys.push(serializeTime(item));
				} catch (itemErr) {
					rec.keys.push({ index: i, error: exceptionInfo(itemErr) });
				}
			}
			return rec;
		}
		countInfo = collectionCount(keys);
		rec.collectionCount = countInfo;
		if (countInfo.count >= 0) {
			indexBase = collectionIndexBase(keys, countInfo.count);
			rec.collectionIndexBase = indexBase;
			for (i = 0; i < countInfo.count && i < 24; i++) {
				item = collectionItem(keys, i, indexBase);
				rec.keys.push(serializeTime(item));
			}
		}
		return rec;
	}

	function callMethod(obj, name, args) {
		var out = {
			name: name,
			invoked: false,
			threw: false,
			unavailable: false,
			argumentCount: args ? args.length : 0,
			returnValue: null,
			returnDescribed: null,
			returnTypeof: "undefined"
		};
		var raw;
		try {
			if (!obj || typeof obj[name] !== "function") {
				out.unavailable = true;
				try {
					out.typeofMember = obj ? typeof obj[name] : "no-object";
				} catch (typeErr) {
					out.typeofMember = "threw";
					out.typeofError = exceptionInfo(typeErr);
				}
				return out;
			}
		} catch (accessErr) {
			out.threw = true;
			out.exception = exceptionInfo(accessErr);
			return out;
		}
		out.invoked = true;
		try {
			if (!args || args.length === 0) {
				raw = obj[name]();
			} else if (args.length === 1) {
				raw = obj[name](args[0]);
			} else if (args.length === 2) {
				raw = obj[name](args[0], args[1]);
			} else if (args.length === 3) {
				raw = obj[name](args[0], args[1], args[2]);
			} else {
				raw = obj[name](args[0], args[1], args[2], args[3]);
			}
			out.returnTypeof = typeof raw;
			out.returnValue = jsonSafeDiag(raw);
			out.returnDescribed = describeValue(raw);
		} catch (callErr) {
			out.threw = true;
			out.exception = exceptionInfo(callErr);
			out.returnTypeof = "threw";
		}
		return out;
	}

	function describeCreatedTime(timeObj, ticks, via) {
		var rec = serializeTime(timeObj);
		rec.construction = via || "new Time(); ticks=String(Math.round(ticks))";
		rec.assignedTicks = String(Math.round(ticks));
		rec.assignedSeconds = Math.round(ticks) / TICKS_PER_SECOND;
		try {
			rec.ticksReadBackMatches = String(timeObj && timeObj.ticks) === rec.assignedTicks;
		} catch (ignoreMatch) {
			rec.ticksReadBackMatches = false;
		}
		return rec;
	}

	function createTimeViaSeconds(seconds) {
		var t;
		if (typeof Time === "function") {
			try {
				t = new Time();
				t.seconds = seconds;
				return t;
			} catch (ignoreNew) {}
		}
		return {
			ticks: String(Math.round(seconds * TICKS_PER_SECOND)),
			seconds: seconds
		};
	}

	function clipTimeFields(clip) {
		var rec = {
			start: serializeTime(clip && clip.start),
			end: serializeTime(clip && clip.end),
			inPoint: null,
			outPoint: null,
			duration: null
		};
		try {
			rec.inPoint = serializeTime(clip.inPoint);
		} catch (inErr) {
			rec.inPoint = { error: exceptionInfo(inErr) };
		}
		try {
			rec.outPoint = serializeTime(clip.outPoint);
		} catch (outErr) {
			rec.outPoint = { error: exceptionInfo(outErr) };
		}
		try {
			rec.duration = serializeTime(clip.duration);
		} catch (durErr) {
			rec.duration = { error: exceptionInfo(durErr) };
		}
		return rec;
	}

	function sequenceTimingFields(sequence) {
		var rec = {
			timebase: null,
			typeofTimebase: null,
			videoFrameRate: null,
			getSettingsThrew: false
		};
		var settings;
		try {
			rec.timebase = sequence && sequence.timebase !== undefined ? sequence.timebase : null;
			rec.typeofTimebase = sequence ? typeof sequence.timebase : "no-sequence";
		} catch (tbErr) {
			rec.timebaseError = exceptionInfo(tbErr);
		}
		try {
			if (sequence && hasFn(sequence, "getSettings")) {
				settings = sequence.getSettings();
				if (settings && settings.videoFrameRate) {
					rec.videoFrameRate = serializeTime(settings.videoFrameRate);
				} else {
					rec.videoFrameRate = null;
				}
			}
		} catch (setErr) {
			rec.getSettingsThrew = true;
			rec.getSettingsError = exceptionInfo(setErr);
		}
		rec.ticksPerFrame = ticksPerFrame(sequence);
		return rec;
	}

	function classifyKeyAgainstClip(keyTime, clip) {
		var keyTicks = ticksOf(keyTime);
		var startTicks = ticksOf(clip && clip.start);
		var inTicks;
		var rec = {
			key: serializeTime(keyTime),
			deltaFromClipStartTicks: null,
			deltaFromZeroTicks: keyTicks,
			deltaFromInPointTicks: null,
			matchesClipStart: false,
			matchesZero: false,
			matchesInPoint: false
		};
		if (isFinite(keyTicks) && isFinite(startTicks)) {
			rec.deltaFromClipStartTicks = keyTicks - startTicks;
			rec.matchesClipStart = Math.abs(keyTicks - startTicks) < 2;
		}
		if (isFinite(keyTicks)) {
			rec.matchesZero = Math.abs(keyTicks) < 2;
		}
		try {
			inTicks = ticksOf(clip.inPoint);
			if (isFinite(keyTicks) && isFinite(inTicks)) {
				rec.deltaFromInPointTicks = keyTicks - inTicks;
				rec.matchesInPoint = Math.abs(keyTicks - inTicks) < 2;
			}
		} catch (ignoreIn) {}
		return rec;
	}

	function probeGetValueAtTime(param, label, timeArg) {
		var rec = {
			label: label,
			threw: false,
			time: serializeTime(timeArg)
		};
		var raw;
		if (!hasFn(param, "getValueAtTime")) {
			rec.unavailable = true;
			return rec;
		}
		try {
			raw = param.getValueAtTime(timeArg);
			rec.returnTypeof = typeof raw;
			rec.returnValue = describeValue(raw);
		} catch (e) {
			rec.threw = true;
			rec.exception = exceptionInfo(e);
		}
		return rec;
	}

	function formatRuntimeReadable(diag) {
		var lines = [];
		var i;
		function line(label, value) {
			lines.push(label + ": " + value);
		}
		function asText(value) {
			try {
				return JSON.stringify(value);
			} catch (e) {
				return String(value);
			}
		}
		if (!diag) {
			return "No diagnostic captured.";
		}
		line("failingOperation", diag.failingOperation || "none");
		line("component.displayName", diag.componentDisplayName);
		line("component.matchName", diag.componentMatchName);
		line("parameter.displayName", diag.parameterDisplayName);
		line("parameter.matchName", diag.parameterMatchName);
		line("parameter.getValue()", asText(diag.getValue));
		line("typeof getValue", diag.getValueTypeof);
		line("areKeyframesSupported()", asText(diag.areKeyframesSupported));
		line("isTimeVarying() before", asText(diag.isTimeVaryingBefore));
		line("getKeys() before typeof/shape", asText(diag.getKeysBeforeRaw && {
			typeofValue: diag.getKeysBeforeRaw.typeofValue,
			length: diag.getKeysBeforeRaw.length,
			numItems: diag.getKeysBeforeRaw.numItems,
			isZero: diag.getKeysBeforeRaw.isZero
		}));
		line("getKeys() before", asText(diag.getKeysBeforeRaw && diag.getKeysBeforeRaw.keys));
		line("clip.start.seconds/ticks", asText(diag.clipTimes && diag.clipTimes.start));
		line("clip.end.seconds/ticks", asText(diag.clipTimes && diag.clipTimes.end));
		line("sequence.timebase", asText(diag.sequenceTiming && diag.sequenceTiming.timebase));
		line("sequence.getSettings().videoFrameRate", asText(diag.sequenceTiming && diag.sequenceTiming.videoFrameRate));
		line("calculated start key time", asText(diag.calculatedStart));
		line("calculated end key time", asText(diag.calculatedEnd));
		line("Time passed to addKey/setValueAtKey/getValueAtTime start", asText(diag.startTimeObject));
		line("Time passed to addKey/setValueAtKey/getValueAtTime end", asText(diag.endTimeObject));
		line("setTimeVarying(true)", asText(diag.setTimeVarying));
		line("addKey(start)", asText(diag.addKeyStart));
		line("addKey(end)", asText(diag.addKeyEnd));
		line("setValueAtKey(start)", asText(diag.setValueAtKeyStart));
		line("setValueAtKey(end)", asText(diag.setValueAtKeyEnd));
		line("getKeys() after write", asText(diag.getKeysAfterRaw && diag.getKeysAfterRaw.keys));
		line("getKeys() after shape", asText(diag.getKeysAfterRaw && {
			typeofValue: diag.getKeysAfterRaw.typeofValue,
			length: diag.getKeysAfterRaw.length,
			numItems: diag.getKeysAfterRaw.numItems
		}));
		line("getValueAtTime(start)", asText(diag.getValueAtTimeStart));
		line("getValueAtTime(end)", asText(diag.getValueAtTimeEnd));
		line("isTimeVarying() after", asText(diag.isTimeVaryingAfter));
		line("requested start/end values", asText(diag.requestedValues));
		line("time-coordinate classification", asText(diag.keyCoordinateGuess));
		if (diag.getValueAtTimeProbes) {
			for (i = 0; i < diag.getValueAtTimeProbes.length; i++) {
				line("getValueAtTime probe " + diag.getValueAtTimeProbes[i].label, asText(diag.getValueAtTimeProbes[i]));
			}
		}
		if (diag.caughtException) {
			line("caught ExtendScript exception", asText(diag.caughtException));
		}
		if (diag.errors && diag.errors.length) {
			for (i = 0; i < diag.errors.length; i++) {
				line("error[" + i + "]", asText(diag.errors[i]));
			}
		}
		return lines.join("\n");
	}

	function persistDiagnostic(diag) {
		var text;
		var pretty;
		var folder;
		var file;
		var extra;
		if (!diag) {
			return;
		}
		try {
			diag.readable = formatRuntimeReadable(diag);
		} catch (readErr) {
			diag.readableError = exceptionInfo(readErr);
		}
		try {
			text = JSON.stringify(diag);
		} catch (e) {
			text = '{"stringifyError":' + JSON.stringify(String(e)) + "}";
		}
		try {
			if (typeof $ !== "undefined" && typeof $.writeln === "function") {
				$.writeln("[PickFX ZoomInDiag]\n" + (diag.readable || text));
			}
		} catch (ignoreLog) {}
		pretty = text;
		try {
			pretty = JSON.stringify(diag, null, 2);
		} catch (ignorePretty) {}
		function writeTo(path) {
			var f;
			if (typeof File === "undefined") {
				return;
			}
			f = new File(path);
			f.encoding = "UTF8";
			if (f.open("w")) {
				f.write(pretty);
				f.close();
			}
		}
		try {
			if (typeof Folder !== "undefined" && Folder.desktop) {
				writeTo(Folder.desktop.fsName + "/action-debug.json");
			}
		} catch (ignoreDesktopFolder) {}
		try {
			writeTo("~/Desktop/action-debug.json");
		} catch (ignoreDesktopTilde) {}
		try {
			if (typeof Folder !== "undefined") {
				folder = new Folder("~/Library/Application Support/PickFX");
				if (!folder.exists) {
					folder.create();
				}
				writeTo(folder.fsName + "/action-debug.json");
			}
		} catch (ignoreAppSupport) {}
		try {
			writeTo("~/Desktop/pickfx/.pickfx-action-debug.json");
		} catch (ignoreDesktop) {}
		try {
			if (typeof Folder !== "undefined") {
				extra = new Folder("~/Desktop/pickfx");
				if (extra.exists) {
					writeTo(extra.fsName + "/.pickfx-action-debug.json");
				}
			}
		} catch (ignoreExtra) {}
	}

	function emptyRuntime(spec) {
		return {
			temporary: true,
			scope: "one-selected-clip-zoom-in",
			actionId: spec && spec.actionId ? spec.actionId : "",
			failingOperation: null,
			errors: [],
			caughtException: null
		};
	}

	function resolver() {
		if (typeof $ !== "undefined" && $._pickfxParameterResolver) {
			return $._pickfxParameterResolver;
		}
		return null;
	}

	function collectionCount(col) {
		var res = resolver();
		if (res && res.collectionCount) {
			return res.collectionCount(col);
		}
		try {
			if (col && typeof col.numItems === "number") {
				return { count: col.numItems, via: "numItems" };
			}
		} catch (ignoreNum) {}
		try {
			if (col && typeof col.length === "number") {
				return { count: col.length, via: "length" };
			}
		} catch (ignoreLen) {}
		return { count: -1, via: "" };
	}

	function collectionIndexBase(col, count) {
		var res = resolver();
		if (res && res.collectionIndexBase) {
			return res.collectionIndexBase(col, count);
		}
		try {
			if (col && (col[0] === undefined || col[0] === null) &&
					col[1] !== undefined && col[1] !== null) {
				return 1;
			}
		} catch (ignore) {}
		return 0;
	}

	function collectionItem(col, index, indexBase) {
		var res = resolver();
		if (res && res.collectionItem) {
			return res.collectionItem(col, index, indexBase);
		}
		try {
			return col[index + indexBase];
		} catch (e) {
			return undefined;
		}
	}

	function ticksOf(timeObj) {
		var n;
		if (timeObj === undefined || timeObj === null) {
			return NaN;
		}
		if (typeof timeObj === "number" && isFinite(timeObj)) {
			return timeObj;
		}
		try {
			if (timeObj.ticks !== undefined && timeObj.ticks !== null && timeObj.ticks !== "") {
				n = Number(timeObj.ticks);
				if (isFinite(n)) {
					return n;
				}
			}
		} catch (ignoreTicks) {}
		try {
			n = asFiniteNumber(timeObj.seconds);
			if (n !== undefined) {
				return n * TICKS_PER_SECOND;
			}
		} catch (ignoreSeconds) {}
		return NaN;
	}

	function createTime(ticks) {
		var t;
		var rounded = Math.round(ticks);
		if (typeof Time === "function") {
			try {
				t = new Time();
				t.ticks = String(rounded);
				return t;
			} catch (ignoreNew) {}
		}
		return {
			ticks: String(rounded),
			seconds: rounded / TICKS_PER_SECOND
		};
	}

	function ticksPerFrame(sequence) {
		var n;
		var settings;
		var rate;
		if (!sequence) {
			return 0;
		}
		try {
			if (sequence.timebase !== undefined && sequence.timebase !== null && sequence.timebase !== "") {
				n = Number(sequence.timebase);
				if (isFinite(n) && n > 0) {
					return n;
				}
			}
		} catch (ignoreTimebase) {}
		try {
			if (hasFn(sequence, "getSettings")) {
				settings = sequence.getSettings();
				if (settings && settings.videoFrameRate) {
					rate = settings.videoFrameRate;
					n = ticksOf(rate);
					if (isFinite(n) && n > 0) {
						return n;
					}
				}
			}
		} catch (ignoreSettings) {}
		return 0;
	}

	function clipWindow(clip) {
		var startTicks;
		var endTicks;
		var durationTicks;
		startTicks = ticksOf(clip && clip.start);
		endTicks = ticksOf(clip && clip.end);
		if (!isFinite(endTicks) && clip && clip.duration) {
			durationTicks = ticksOf(clip.duration);
			if (isFinite(startTicks) && isFinite(durationTicks)) {
				endTicks = startTicks + durationTicks;
			}
		}
		return {
			startTicks: startTicks,
			endTicks: endTicks
		};
	}

	// ComponentParam times in the official DOM are sequence times.
	// Existing host diagnostics call getValueAtTime(clip.start), so Actions
	// use TrackItem.start/end rather than inPoint/outPoint (media time).
	function planTimes(clip, sequence, durationFrames, anchor) {
		var window;
		var frameTicks;
		var requested;
		var clipTicks;
		var span;
		var frames;
		var startTicks;
		var endTicks;

		window = clipWindow(clip);
		if (!isFinite(window.startTicks) || !isFinite(window.endTicks)) {
			return {
				ok: false,
				reason: "INVALID_CLIP_DURATION",
				detail: "Could not read clip start/end time."
			};
		}
		clipTicks = window.endTicks - window.startTicks;
		if (!(clipTicks > 0)) {
			return {
				ok: false,
				reason: "INVALID_CLIP_DURATION",
				detail: "The selected clip is too short."
			};
		}
		frameTicks = ticksPerFrame(sequence);
		if (!(frameTicks > 0)) {
			return {
				ok: false,
				reason: "WRITE_FAILED",
				detail: "Could not read the active sequence frame rate."
			};
		}
		frames = asFiniteNumber(durationFrames);
		if (frames === undefined || frames <= 0) {
			frames = 10;
		}
		requested = frames * frameTicks;
		span = requested < clipTicks ? requested : clipTicks;
		if (!(span > 0)) {
			return {
				ok: false,
				reason: "INVALID_CLIP_DURATION",
				detail: "The selected clip is too short."
			};
		}
		if (anchor === "end") {
			startTicks = window.endTicks - span;
			endTicks = window.endTicks;
		} else {
			startTicks = window.startTicks;
			endTicks = window.startTicks + span;
		}
		return {
			ok: true,
			startTicks: startTicks,
			endTicks: endTicks,
			spanTicks: span,
			ticksPerFrame: frameTicks,
			clamped: span < requested,
			clipStartTicks: window.startTicks,
			clipEndTicks: window.endTicks,
			startTime: createTime(startTicks),
			endTime: createTime(endTicks)
		};
	}

	function clipNameOf(clip) {
		try {
			if (typeof $ !== "undefined" && $._pickfx && $._pickfx.clipDisplayName) {
				return $._pickfx.clipDisplayName(clip);
			}
		} catch (ignoreHelper) {}
		try {
			if (clip && clip.name) {
				return String(clip.name);
			}
		} catch (ignoreName) {}
		return "";
	}

	function failClip(clip, spec, reason, detail, extra) {
		return copyExtra({
			clip: clipNameOf(clip),
			ok: false,
			verified: false,
			reason: reason || "WRITE_FAILED",
			detail: detail ? String(detail) : "",
			action: true,
			actionId: spec && spec.actionId ? spec.actionId : ""
		}, extra);
	}

	function listKeys(param) {
		var keys;
		var out = [];
		var countInfo;
		var indexBase;
		var i;
		var item;
		var ticks;
		if (!hasFn(param, "getKeys")) {
			return { available: false, keys: out };
		}
		try {
			keys = param.getKeys();
		} catch (e) {
			return { available: false, keys: out, error: String(e) };
		}
		if (keys === undefined || keys === null || keys === 0) {
			return { available: true, keys: out };
		}
		if (typeof keys.length === "number") {
			for (i = 0; i < keys.length; i++) {
				try {
					item = keys[i];
				} catch (ignoreItem) {
					item = undefined;
				}
				ticks = ticksOf(item);
				if (isFinite(ticks)) {
					out.push(ticks);
				}
			}
			return { available: true, keys: out };
		}
		countInfo = collectionCount(keys);
		if (countInfo.count < 0) {
			return { available: true, keys: out };
		}
		indexBase = collectionIndexBase(keys, countInfo.count);
		for (i = 0; i < countInfo.count; i++) {
			item = collectionItem(keys, i, indexBase);
			ticks = ticksOf(item);
			if (isFinite(ticks)) {
				out.push(ticks);
			}
		}
		return { available: true, keys: out };
	}

	function keyExistsAt(keyTicks, ticks) {
		var i;
		var wanted = Math.round(ticks);
		for (i = 0; i < keyTicks.length; i++) {
			if (Math.round(keyTicks[i]) === wanted) {
				return true;
			}
		}
		return false;
	}

	function hasInteriorConflict(keyTicks, startTicks, endTicks) {
		var i;
		var t;
		var start = Math.round(startTicks);
		var end = Math.round(endTicks);
		for (i = 0; i < keyTicks.length; i++) {
			t = Math.round(keyTicks[i]);
			if (t > start && t < end) {
				return true;
			}
		}
		return false;
	}

	function resolveComponent(clip, matchName, displayName) {
		var components;
		var countInfo;
		var indexBase;
		var i;
		var component;
		var mn;
		var dn;
		var matchHit = null;
		var displayHit = null;
		var wantedMatch = trim(matchName);
		var wantedDisplay = trim(displayName);

		if (!clip) {
			return { ok: false, reason: "NO_VIDEO_SELECTION", detail: "No TrackItem was provided." };
		}
		try {
			components = clip.components;
		} catch (compErr) {
			return {
				ok: false,
				reason: "COMPONENT_NOT_FOUND",
				detail: "TrackItem.components threw: " + String(compErr)
			};
		}
		countInfo = collectionCount(components);
		if (countInfo.count < 0) {
			return { ok: false, reason: "COMPONENT_NOT_FOUND", detail: "Could not read clip components." };
		}
		indexBase = collectionIndexBase(components, countInfo.count);
		for (i = 0; i < countInfo.count; i++) {
			component = collectionItem(components, i, indexBase);
			mn = readString(component, "matchName");
			dn = readString(component, "displayName");
			if (wantedMatch && mn === wantedMatch) {
				matchHit = { component: component, matchName: mn, displayName: dn };
				break;
			}
			if (!displayHit && wantedDisplay && dn === wantedDisplay) {
				displayHit = { component: component, matchName: mn, displayName: dn };
			}
		}
		if (matchHit) {
			return {
				ok: true,
				_component: matchHit.component,
				matchName: matchHit.matchName,
				displayName: matchHit.displayName
			};
		}
		if (displayHit) {
			return {
				ok: true,
				_component: displayHit.component,
				matchName: displayHit.matchName,
				displayName: displayHit.displayName
			};
		}
		return {
			ok: false,
			reason: "COMPONENT_NOT_FOUND",
			detail: "No component matching " + (wantedMatch || wantedDisplay || "target") + "."
		};
	}

	function resolveParameter(component, parameterName, parameterMatchName) {
		var props;
		var countInfo;
		var indexBase;
		var i;
		var param;
		var dn;
		var mn;
		var wanted = trim(parameterName);
		var wantedMatch = trim(parameterMatchName);
		var folded = wanted.toLowerCase();
		var exact = null;
		var foldedHit = null;
		var matchHit = null;

		if (!component) {
			return { ok: false, reason: "PARAMETER_NOT_FOUND", detail: "Component is missing." };
		}
		try {
			props = component.properties;
		} catch (propsErr) {
			return {
				ok: false,
				reason: "PARAMETER_NOT_FOUND",
				detail: "Component.properties threw: " + String(propsErr)
			};
		}
		countInfo = collectionCount(props);
		if (countInfo.count < 0) {
			return { ok: false, reason: "PARAMETER_NOT_FOUND", detail: "Could not read component properties." };
		}
		indexBase = collectionIndexBase(props, countInfo.count);
		for (i = 0; i < countInfo.count; i++) {
			param = collectionItem(props, i, indexBase);
			dn = readString(param, "displayName");
			mn = readString(param, "matchName");
			if (wantedMatch && mn === wantedMatch) {
				matchHit = { param: param, displayName: dn, matchName: mn };
				break;
			}
			if (!exact && wanted && dn === wanted) {
				exact = { param: param, displayName: dn, matchName: mn };
			} else if (!foldedHit && folded && dn.toLowerCase() === folded) {
				foldedHit = { param: param, displayName: dn, matchName: mn };
			}
		}
		if (matchHit || exact || foldedHit) {
			param = (matchHit || exact || foldedHit);
			return {
				ok: true,
				_param: param.param,
				displayName: param.displayName,
				matchName: param.matchName
			};
		}
		return {
			ok: false,
			reason: "PARAMETER_NOT_FOUND",
			detail: 'No property with displayName "' + wanted + '".'
		};
	}

	function readCurrentValue(param, time) {
		if (time && hasFn(param, "getValueAtTime")) {
			try {
				return { ok: true, value: param.getValueAtTime(time), via: "getValueAtTime" };
			} catch (ignoreAtTime) {}
		}
		if (hasFn(param, "getValue")) {
			try {
				return { ok: true, value: param.getValue(), via: "getValue" };
			} catch (getErr) {
				return { ok: false, error: String(getErr) };
			}
		}
		return { ok: false, error: "getValue is not a function." };
	}

	function readStaticValue(param) {
		if (!hasFn(param, "getValue")) {
			return { ok: false, error: "getValue is not a function." };
		}
		try {
			return { ok: true, value: param.getValue(), via: "getValue" };
		} catch (getErr) {
			return { ok: false, error: String(getErr) };
		}
	}

	function readBaseline(param, boundaryTime, alreadyVarying) {
		var staticRead = readStaticValue(param);
		var atTimeRead = { ok: false };
		var baseline;
		var via;
		if (boundaryTime && hasFn(param, "getValueAtTime")) {
			try {
				atTimeRead = { ok: true, value: param.getValueAtTime(boundaryTime), via: "getValueAtTime" };
			} catch (atErr) {
				atTimeRead = { ok: false, error: String(atErr) };
			}
		}
		if (alreadyVarying) {
			baseline = asFiniteNumber(atTimeRead.ok ? atTimeRead.value : undefined);
			via = "getValueAtTime";
			if (baseline === undefined) {
				baseline = asFiniteNumber(staticRead.ok ? staticRead.value : undefined);
				via = "getValue";
			}
		} else {
			baseline = asFiniteNumber(staticRead.ok ? staticRead.value : undefined);
			via = "getValue";
			if (baseline === undefined) {
				baseline = asFiniteNumber(atTimeRead.ok ? atTimeRead.value : undefined);
				via = "getValueAtTime";
			}
		}
		return {
			ok: baseline !== undefined,
			value: baseline,
			via: via,
			getValue: staticRead,
			getValueAtTime: atTimeRead,
			capturedBeforeMutation: true
		};
	}

	function valueBetween(mid, a, b) {
		var left = asFiniteNumber(a);
		var right = asFiniteNumber(b);
		var value = asFiniteNumber(mid);
		var lo;
		var hi;
		if (left === undefined || right === undefined || value === undefined) {
			return false;
		}
		lo = left < right ? left : right;
		hi = left > right ? left : right;
		return value + NUMBER_EPS >= lo && value - NUMBER_EPS <= hi;
	}

	function readKeyValues(param) {
		var listed = listKeys(param);
		var out = [];
		var i;
		var ticks;
		var time;
		var value;
		if (!listed || !listed.keys) {
			return out;
		}
		for (i = 0; i < listed.keys.length; i++) {
			ticks = listed.keys[i];
			time = createTime(ticks);
			value = undefined;
			if (hasFn(param, "getValueAtKey")) {
				try {
					value = asFiniteNumber(param.getValueAtKey(time));
				} catch (ignoreKey) {}
			}
			if (value === undefined && hasFn(param, "getValueAtTime")) {
				try {
					value = asFiniteNumber(param.getValueAtTime(time));
				} catch (ignoreAt) {}
			}
			out.push({
				ticks: ticks,
				seconds: ticks / TICKS_PER_SECOND,
				value: value
			});
		}
		return out;
	}

	function holdGeneratedKeys(param, keysBefore, actionEndTicks, endValue) {
		var after;
		var i;
		var ticks;
		var held = [];
		var write;
		after = listKeys(param);
		if (!after.available) {
			return { ok: true, held: held };
		}
		for (i = 0; i < after.keys.length; i++) {
			ticks = after.keys[i];
			if (keyExistsAt(keysBefore, ticks)) {
				continue;
			}
			if (!(Math.round(ticks) > Math.round(actionEndTicks))) {
				continue;
			}
			write = writeKey(param, createTime(ticks), endValue);
			held.push({
				ticks: ticks,
				ok: write.ok === true,
				reason: write.reason || null
			});
			if (!write.ok) {
				return {
					ok: false,
					reason: write.reason || "WRITE_FAILED",
					detail: write.detail || "Could not hold the generated clip-end key.",
					held: held
				};
			}
		}
		return { ok: true, held: held };
	}

	function plannedValues(plan, current, amount) {
		var add = asFiniteNumber(amount);
		if (add === undefined) {
			add = 0;
		}
		if (plan === "current-to-current-plus") {
			return { ok: true, startValue: current, endValue: current + add };
		}
		if (plan === "current-plus-to-current") {
			return { ok: true, startValue: current + add, endValue: current };
		}
		if (plan === "zero-to-current") {
			return { ok: true, startValue: 0, endValue: current };
		}
		if (plan === "current-to-zero") {
			return { ok: true, startValue: current, endValue: 0 };
		}
		return { ok: false, reason: "WRITE_FAILED", detail: "Unknown action value plan." };
	}

	function callAreKeyframesSupported(param) {
		if (!hasFn(param, "areKeyframesSupported")) {
			return { available: false, value: null };
		}
		try {
			return { available: true, value: param.areKeyframesSupported() === true };
		} catch (e) {
			return { available: true, error: String(e), value: null };
		}
	}

	function callIsTimeVarying(param) {
		if (!hasFn(param, "isTimeVarying")) {
			return { available: false, value: false };
		}
		try {
			return { available: true, value: param.isTimeVarying() === true };
		} catch (e) {
			return { available: true, error: String(e), value: false };
		}
	}

	function applyInterpolation(param, time) {
		if (!hasFn(param, "setInterpolationTypeAtKey")) {
			return { applied: false, mode: "" };
		}
		try {
			if (typeof KeyframeInterpolationType !== "undefined" &&
					KeyframeInterpolationType.LINEAR !== undefined) {
				param.setInterpolationTypeAtKey(time, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
				return { applied: true, mode: "LINEAR" };
			}
		} catch (ignoreLinear) {}
		return { applied: false, mode: "" };
	}

	function writeKey(param, time, value) {
		var keys;
		var exists;
		var addCall;
		var setCall;
		var out = {
			ok: false,
			time: serializeTime(time),
			value: describeValue(value),
			existedBefore: false,
			addKey: null,
			setValueAtKey: null
		};
		if (!hasFn(param, "setValueAtKey") && !hasFn(param, "addKey")) {
			out.reason = "KEYFRAMES_NOT_SUPPORTED";
			out.detail = "addKey/setValueAtKey are unavailable.";
			return out;
		}
		keys = listKeys(param);
		exists = keyExistsAt(keys.keys, ticksOf(time));
		out.existedBefore = exists === true;
		if (!exists && hasFn(param, "addKey")) {
			addCall = callMethod(param, "addKey", [time]);
			out.addKey = addCall;
			if (addCall.threw) {
				out.reason = "WRITE_FAILED";
				out.detail = "addKey threw: " + (addCall.exception && addCall.exception.text ? addCall.exception.text : "");
				out.exception = addCall.exception;
				return out;
			}
		} else if (exists) {
			out.addKey = { skipped: true, reason: "key already existed at this time" };
		} else {
			out.addKey = { skipped: true, reason: "addKey unavailable" };
		}
		if (!hasFn(param, "setValueAtKey")) {
			out.reason = "KEYFRAMES_NOT_SUPPORTED";
			out.detail = "setValueAtKey is unavailable.";
			return out;
		}
		setCall = callMethod(param, "setValueAtKey", [time, value, true]);
		out.setValueAtKey = setCall;
		if (setCall.threw) {
			out.reason = "WRITE_FAILED";
			out.detail = "setValueAtKey threw: " + (setCall.exception && setCall.exception.text ? setCall.exception.text : "");
			out.exception = setCall.exception;
			return out;
		}
		applyInterpolation(param, time);
		out.ok = true;
		return out;
	}

	function verifyKeys(param, startTime, endTime, startValue, endValue, midTime) {
		var varying;
		var actualStart;
		var actualEnd;
		var actualMid;
		var keyValues;
		varying = callIsTimeVarying(param);
		if (varying.available && varying.value !== true) {
			return {
				ok: false,
				verified: false,
				reason: "VALUE_NOT_VERIFIED",
				detail: "Parameter is not time-varying after the write."
			};
		}
		actualStart = readCurrentValue(param, startTime);
		actualEnd = readCurrentValue(param, endTime);
		if (!actualStart.ok || !actualEnd.ok) {
			return {
				ok: false,
				verified: false,
				reason: "VALUE_NOT_VERIFIED",
				detail: "Could not read values at the action key times."
			};
		}
		if (!numbersClose(actualStart.value, startValue) || !numbersClose(actualEnd.value, endValue)) {
			return {
				ok: false,
				verified: false,
				reason: "VALUE_NOT_VERIFIED",
				detail: "Keyframe values did not match the requested animation.",
				actualStartValue: actualStart.value,
				actualEndValue: actualEnd.value
			};
		}
		actualMid = midTime ? readCurrentValue(param, midTime) : { ok: false };
		if (midTime && actualMid.ok && !valueBetween(actualMid.value, startValue, endValue)) {
			return {
				ok: false,
				verified: false,
				reason: "VALUE_NOT_VERIFIED",
				detail: "Midpoint value is not between the start and end keys.",
				actualStartValue: actualStart.value,
				actualEndValue: actualEnd.value,
				actualMidValue: actualMid.value
			};
		}
		keyValues = readKeyValues(param);
		return {
			ok: true,
			verified: true,
			actualStartValue: actualStart.value,
			actualEndValue: actualEnd.value,
			actualMidValue: actualMid.ok ? actualMid.value : undefined,
			keyValues: keyValues
		};
	}

	function guessKeyCoordinate(diag, clip) {
		var keys;
		var i;
		var hit;
		var classified;
		var startHits = 0;
		var zeroHits = 0;
		var inHits = 0;
		if (!diag || !diag.getKeysAfterRaw || !diag.getKeysAfterRaw.keys) {
			return { guess: "unknown", reason: "no keys after write" };
		}
		keys = diag.getKeysAfterRaw.keys;
		if (!keys.length) {
			return { guess: "unknown", reason: "getKeys() empty after write" };
		}
		for (i = 0; i < keys.length; i++) {
			hit = classifyKeyAgainstClip(keys[i], clip);
			if (hit.matchesClipStart) {
				startHits += 1;
			}
			if (hit.matchesZero) {
				zeroHits += 1;
			}
			if (hit.matchesInPoint) {
				inHits += 1;
			}
		}
		classified = [];
		for (i = 0; i < keys.length; i++) {
			classified.push(classifyKeyAgainstClip(keys[i], clip));
		}
		return {
			guess: startHits && !zeroHits ? "sequence-relative (matches TrackItem.start)" :
				zeroHits && !startHits ? "clip-relative or zero-based" :
				startHits && zeroHits ? "ambiguous: clip.start is ~0, sequence and clip-relative collide" :
				inHits ? "media/inPoint time" :
				"neither clip.start, 0, nor inPoint",
			startHits: startHits,
			zeroHits: zeroHits,
			inPointHits: inHits,
			keyCount: keys.length,
			classified: classified
		};
	}

	function capturePostWrite(diag, param, clip, times) {
		var rawKeys;
		var zeroTime;
		var startSecondsTime;
		diag.isTimeVaryingAfter = callIsTimeVarying(param);
		try {
			rawKeys = hasFn(param, "getKeys") ? param.getKeys() : undefined;
			diag.getKeysAfterRaw = describeGetKeysRaw(rawKeys);
		} catch (keysErr) {
			diag.getKeysAfterRaw = { threw: true, exception: exceptionInfo(keysErr) };
			diag.errors.push({ step: "getKeys() after write", exception: exceptionInfo(keysErr) });
		}
		diag.getValueAtTimeStart = probeGetValueAtTime(param, "constructed startTime", times && times.startTime);
		diag.getValueAtTimeEnd = probeGetValueAtTime(param, "constructed endTime", times && times.endTime);
		try {
			zeroTime = createTimeViaSeconds(0);
		} catch (ignoreZero) {
			zeroTime = 0;
		}
		try {
			startSecondsTime = clip && clip.start && clip.start.seconds !== undefined
				? createTimeViaSeconds(clip.start.seconds)
				: null;
		} catch (ignoreStartSec) {
			startSecondsTime = null;
		}
		diag.getValueAtTimeProbes = [
			probeGetValueAtTime(param, "constructed startTime", times && times.startTime),
			probeGetValueAtTime(param, "constructed endTime", times && times.endTime),
			probeGetValueAtTime(param, "native clip.start", clip && clip.start),
			probeGetValueAtTime(param, "native clip.end", clip && clip.end),
			probeGetValueAtTime(param, "number 0", 0)
		];
		try {
			diag.getValueAtTimeProbes.push(probeGetValueAtTime(param, "new Time seconds=0", zeroTime));
		} catch (ignoreZeroProbe) {}
		if (startSecondsTime) {
			diag.getValueAtTimeProbes.push(probeGetValueAtTime(param, "new Time seconds=clip.start.seconds", startSecondsTime));
		}
		try {
			diag.getValueAtTimeProbes.push(probeGetValueAtTime(param, "native clip.inPoint", clip.inPoint));
		} catch (ignoreInProbe) {}
		try {
			diag.getValueAtTimeProbes.push(probeGetValueAtTime(param, "native clip.outPoint", clip.outPoint));
		} catch (ignoreOutProbe) {}
		diag.keyCoordinateGuess = guessKeyCoordinate(diag, clip);
	}

	function finishClipResult(result, diag) {
		if (result && diag) {
			if (!diag.failingOperation && result.ok !== true) {
				diag.failingOperation = result.reason || "unknown";
			}
			diag.resultOk = result.ok === true;
			diag.resultReason = result.reason || null;
			diag.resultDetail = result.detail || null;
			try {
				diag.readable = formatRuntimeReadable(diag);
			} catch (readErr) {
				diag.readableError = exceptionInfo(readErr);
			}
			try {
				result.runtime = jsonSafeDiag(diag);
			} catch (safeErr) {
				result.runtime = {
					failingOperation: diag.failingOperation || null,
					readable: diag.readable || null,
					jsonSafeError: exceptionInfo(safeErr)
				};
			}
			try {
				persistDiagnostic(diag);
			} catch (persistErr) {
				result.runtimePersistError = exceptionInfo(persistErr);
			}
		}
		return result;
	}

	function applyToClip(clip, sequence, spec) {
		var times;
		var component;
		var parameter;
		var param;
		var supported;
		var varying;
		var keys;
		var current;
		var rawCurrent;
		var getValueCall;
		var values;
		var startWrite;
		var endWrite;
		var verified;
		var mediaType;
		var tvCall;
		var rawKeysBefore;
		var diag;
		var baseline;
		var alreadyVarying;
		var boundaryTime;
		var keysBeforeVarying;
		var holdResult;
		var midTime;
		var semantics;
		spec = spec || {};
		diag = emptyRuntime(spec);
		diag.clipTimes = clipTimeFields(clip);
		diag.sequenceTiming = sequenceTimingFields(sequence);
		diag.timeConstructorAvailable = typeof Time === "function";

		try {
			mediaType = readString(clip, "mediaType");
		} catch (ignoreType) {
			mediaType = "";
		}
		if (mediaType && mediaType !== "Video") {
			diag.failingOperation = "mediaType check";
			return finishClipResult(
				failClip(clip, spec, "NO_VIDEO_SELECTION", "TrackItem.mediaType is " + mediaType + ", expected Video."),
				diag
			);
		}

		times = planTimes(clip, sequence, spec.durationFrames, spec.anchor || "start");
		if (!times.ok) {
			diag.failingOperation = "planTimes";
			diag.planTimes = jsonSafeDiag(times);
			return finishClipResult(failClip(clip, spec, times.reason, times.detail), diag);
		}
		diag.calculatedStart = {
			ticks: times.startTicks,
			seconds: times.startTicks / TICKS_PER_SECOND
		};
		diag.calculatedEnd = {
			ticks: times.endTicks,
			seconds: times.endTicks / TICKS_PER_SECOND
		};
		diag.startTimeObject = describeCreatedTime(times.startTime, times.startTicks, "planTimes createTime(startTicks)");
		diag.endTimeObject = describeCreatedTime(times.endTime, times.endTicks, "planTimes createTime(endTicks)");
		diag.ticksPerFrame = times.ticksPerFrame;
		diag.clamped = times.clamped === true;

		component = resolveComponent(clip, spec.componentMatchName, spec.componentDisplayName);
		if (!component.ok) {
			diag.failingOperation = "resolveComponent";
			return finishClipResult(failClip(clip, spec, component.reason, component.detail), diag);
		}
		diag.componentDisplayName = component.displayName;
		diag.componentMatchName = component.matchName;

		parameter = resolveParameter(component._component, spec.parameterDisplayName, spec.parameterMatchName);
		if (!parameter.ok) {
			diag.failingOperation = "resolveParameter";
			return finishClipResult(failClip(clip, spec, parameter.reason, parameter.detail, {
				component: component.displayName,
				componentMatchName: component.matchName
			}), diag);
		}
		param = parameter._param;
		diag.parameterDisplayName = parameter.displayName;
		diag.parameterMatchName = parameter.matchName;

		getValueCall = callMethod(param, "getValue", []);
		diag.getValue = getValueCall.returnDescribed || getValueCall.returnValue;
		diag.getValueTypeof = getValueCall.returnTypeof;
		diag.getValueCall = getValueCall;
		if (getValueCall.threw) {
			diag.errors.push({ step: "parameter.getValue()", exception: getValueCall.exception });
		}

		supported = callAreKeyframesSupported(param);
		diag.areKeyframesSupported = supported;
		if (supported.available && supported.value === false) {
			diag.failingOperation = "areKeyframesSupported() === false";
			return finishClipResult(failClip(clip, spec, "KEYFRAMES_NOT_SUPPORTED", "This property cannot be animated.", {
				component: component.displayName,
				parameter: parameter.displayName,
				keyframesSupported: false
			}), diag);
		}
		if (!hasFn(param, "addKey") && !hasFn(param, "setValueAtKey")) {
			diag.failingOperation = "addKey/setValueAtKey unavailable";
			return finishClipResult(failClip(clip, spec, "KEYFRAMES_NOT_SUPPORTED", "Keyframe write methods are unavailable.", {
				component: component.displayName,
				parameter: parameter.displayName,
				keyframesSupported: supported.value
			}), diag);
		}

		varying = callIsTimeVarying(param);
		diag.isTimeVaryingBefore = varying;
		if (varying.error) {
			diag.failingOperation = "isTimeVarying()";
			diag.caughtException = { text: varying.error };
			return finishClipResult(
				failClip(clip, spec, "WRITE_FAILED", "isTimeVarying() threw: " + varying.error),
				diag
			);
		}

		try {
			rawKeysBefore = hasFn(param, "getKeys") ? param.getKeys() : undefined;
			diag.getKeysBeforeRaw = describeGetKeysRaw(rawKeysBefore);
		} catch (keysBeforeErr) {
			diag.getKeysBeforeRaw = { threw: true, exception: exceptionInfo(keysBeforeErr) };
			diag.errors.push({ step: "getKeys() before write", exception: exceptionInfo(keysBeforeErr) });
		}
		keys = listKeys(param);
		if (varying.available && varying.value === true && keys.available !== true) {
			diag.failingOperation = "getKeys() unavailable while time-varying";
			return finishClipResult(failClip(clip, spec, "KEYFRAME_CONFLICT", "Existing keyframes could not be inspected safely.", {
				component: component.displayName,
				parameter: parameter.displayName
			}), diag);
		}
		if (keys.available && hasInteriorConflict(keys.keys, times.startTicks, times.endTicks)) {
			diag.failingOperation = "KEYFRAME_CONFLICT";
			return finishClipResult(failClip(clip, spec, "KEYFRAME_CONFLICT", "Existing keyframes would be overwritten.", {
				component: component.displayName,
				parameter: parameter.displayName,
				existingKeyCount: keys.keys.length,
				startTicks: times.startTicks,
				endTicks: times.endTicks
			}), diag);
		}

		alreadyVarying = varying.available && varying.value === true;
		boundaryTime = spec.anchor === "end" ? times.endTime : times.startTime;
		baseline = readBaseline(param, boundaryTime, alreadyVarying);
		rawCurrent = baseline.getValue && baseline.getValue.ok ? baseline.getValue.value : undefined;
		diag.currentRead = {
			ok: baseline.ok === true,
			via: baseline.via,
			raw: describeValue(baseline.value),
			getValueBeforeMutation: describeValue(baseline.getValue && baseline.getValue.value),
			getValueAtTimeBeforeMutation: describeValue(baseline.getValueAtTime && baseline.getValueAtTime.value),
			capturedBeforeMutation: true,
			alreadyVarying: alreadyVarying === true
		};
		if (!baseline.ok) {
			diag.failingOperation = "readBaseline";
			return finishClipResult(failClip(clip, spec, "WRITE_FAILED", "Could not read the original parameter value before mutation.", {
				component: component.displayName,
				parameter: parameter.displayName
			}), diag);
		}

		values = plannedValues(spec.valuePlan, baseline.value, spec.amount);
		if (!values.ok) {
			diag.failingOperation = "plannedValues";
			return finishClipResult(failClip(clip, spec, values.reason, values.detail), diag);
		}
		diag.requestedValues = {
			startValue: values.startValue,
			endValue: values.endValue,
			amount: spec.amount,
			valuePlan: spec.valuePlan,
			originalValue: baseline.value,
			originalVia: baseline.via
		};

		keysBeforeVarying = keys.keys.slice ? keys.keys.slice(0) : [];
		if (!alreadyVarying) {
			if (!hasFn(param, "setTimeVarying")) {
				diag.failingOperation = "setTimeVarying unavailable";
				return finishClipResult(
					failClip(clip, spec, "KEYFRAMES_NOT_SUPPORTED", "setTimeVarying is unavailable."),
					diag
				);
			}
			tvCall = callMethod(param, "setTimeVarying", [true]);
			diag.setTimeVarying = tvCall;
			if (tvCall.threw) {
				diag.failingOperation = "setTimeVarying(true)";
				diag.caughtException = tvCall.exception;
				return finishClipResult(
					failClip(clip, spec, "WRITE_FAILED", "setTimeVarying(true) threw: " + (tvCall.exception && tvCall.exception.text ? tvCall.exception.text : "")),
					diag
				);
			}
		} else {
			diag.setTimeVarying = { skipped: true, reason: "already time-varying" };
		}
		// Never call setTimeVarying(false). Existing animation outside the
		// action range must remain.

		startWrite = writeKey(param, times.startTime, values.startValue);
		diag.addKeyStart = startWrite.addKey;
		diag.setValueAtKeyStart = startWrite.setValueAtKey;
		diag.startWrite = startWrite;
		if (!startWrite.ok) {
			diag.failingOperation = startWrite.addKey && startWrite.addKey.threw
				? "addKey(start)"
				: "setValueAtKey(start)";
			diag.caughtException = startWrite.exception || null;
			capturePostWrite(diag, param, clip, times);
			return finishClipResult(failClip(clip, spec, startWrite.reason, startWrite.detail, {
				component: component.displayName,
				parameter: parameter.displayName
			}), diag);
		}
		endWrite = writeKey(param, times.endTime, values.endValue);
		diag.addKeyEnd = endWrite.addKey;
		diag.setValueAtKeyEnd = endWrite.setValueAtKey;
		diag.endWrite = endWrite;
		if (!endWrite.ok) {
			diag.failingOperation = endWrite.addKey && endWrite.addKey.threw
				? "addKey(end)"
				: "setValueAtKey(end)";
			diag.caughtException = endWrite.exception || null;
			capturePostWrite(diag, param, clip, times);
			return finishClipResult(failClip(clip, spec, endWrite.reason, endWrite.detail, {
				component: component.displayName,
				parameter: parameter.displayName
			}), diag);
		}

		if (!alreadyVarying) {
			holdResult = holdGeneratedKeys(param, keysBeforeVarying, times.endTicks, values.endValue);
			diag.heldGeneratedKeys = holdResult.held;
			if (!holdResult.ok) {
				diag.failingOperation = "hold generated clip-end key";
				capturePostWrite(diag, param, clip, times);
				return finishClipResult(failClip(clip, spec, holdResult.reason, holdResult.detail, {
					component: component.displayName,
					parameter: parameter.displayName
				}), diag);
			}
		}

		midTime = createTime((times.startTicks + times.endTicks) / 2);
		capturePostWrite(diag, param, clip, times);
		verified = verifyKeys(param, times.startTime, times.endTime, values.startValue, values.endValue, midTime);
		diag.verify = {
			ok: verified.ok === true,
			verified: verified.verified === true,
			reason: verified.reason || null,
			detail: verified.detail || null,
			actualStartValue: describeValue(verified.actualStartValue),
			actualEndValue: describeValue(verified.actualEndValue),
			actualMidValue: describeValue(verified.actualMidValue)
		};
		semantics = {
			originalValue: baseline.value,
			originalVia: baseline.via,
			capturedBeforeMutation: true,
			startKeyTime: { ticks: times.startTicks, seconds: times.startTicks / TICKS_PER_SECOND },
			endKeyTime: { ticks: times.endTicks, seconds: times.endTicks / TICKS_PER_SECOND },
			requestedStartValue: values.startValue,
			requestedEndValue: values.endValue,
			actualStart: verified.actualStartValue,
			actualEnd: verified.actualEndValue,
			actualMid: verified.actualMidValue,
			getKeysAfter: verified.keyValues || readKeyValues(param)
		};
		diag.semantics = semantics;
		if (verified.ok !== true) {
			if (verified.detail && verified.detail.indexOf("not time-varying") !== -1) {
				diag.failingOperation = "isTimeVarying() after writing";
			} else if (verified.detail && verified.detail.indexOf("Midpoint") !== -1) {
				diag.failingOperation = "getValueAtTime(midpoint) value differs";
			} else if (verified.detail && verified.detail.indexOf("Could not read") !== -1) {
				diag.failingOperation = "getValueAtTime after writing";
			} else if (!numbersClose(verified.actualStartValue, values.startValue)) {
				diag.failingOperation = "getValueAtTime(start) value differs";
			} else if (!numbersClose(verified.actualEndValue, values.endValue)) {
				diag.failingOperation = "getValueAtTime(end) value differs";
			} else {
				diag.failingOperation = "verification";
			}
		} else {
			diag.failingOperation = null;
		}

		return finishClipResult(copyExtra({
			clip: clipNameOf(clip),
			ok: verified.ok === true && verified.verified === true,
			verified: verified.verified === true,
			reason: verified.ok ? undefined : (verified.reason || "VALUE_NOT_VERIFIED"),
			detail: verified.ok ? undefined : verified.detail,
			action: true,
			actionId: spec.actionId || "",
			component: component.displayName,
			componentMatchName: component.matchName,
			parameter: parameter.displayName,
			keyframesSupported: supported.value === true || supported.available === false,
			existingKeyCount: keys.keys.length,
			startTicks: times.startTicks,
			endTicks: times.endTicks,
			requestedStartValue: values.startValue,
			requestedEndValue: values.endValue,
			actualStartValue: verified.actualStartValue,
			actualEndValue: verified.actualEndValue,
			actualMidValue: verified.actualMidValue,
			currentValue: baseline.value,
			originalValue: baseline.value,
			semantics: semantics,
			clamped: times.clamped === true,
			method: METHOD,
			usedQE: false
		}, {}), diag);
	}

	function summarize(spec, clipResults) {
		var i;
		var row;
		var successful = 0;
		var failed = 0;
		var verifiedCount = 0;
		var firstFail;
		var payload;
		var selected = clipResults ? clipResults.length : 0;
		spec = spec || {};

		for (i = 0; i < selected; i++) {
			row = clipResults[i];
			if (row && row.ok && row.verified) {
				successful += 1;
				verifiedCount += 1;
			} else {
				failed += 1;
				if (!firstFail) {
					firstFail = row;
				}
			}
		}

		payload = {
			ok: selected > 0 && failed === 0,
			batch: selected > 1,
			command: true,
			action: true,
			actionId: spec.actionId || "",
			effect: spec.actionName || spec.actionId || "",
			parameter: spec.parameterDisplayName || "",
			selectedCount: selected,
			successfulCount: successful,
			failedCount: failed,
			verifiedCount: verifiedCount,
			clips: clipResults || [],
			method: METHOD,
			usedQE: false
		};

		if (!payload.ok) {
			payload.reason = selected === 0
				? "NO_VIDEO_SELECTION"
				: ((firstFail && firstFail.reason) || "WRITE_FAILED");
			payload.detail = selected === 0
				? "Select a video clip first."
				: ((firstFail && firstFail.detail) || "");
			payload.verified = false;
		} else {
			payload.verified = verifiedCount === selected;
		}
		if (firstFail && firstFail.runtime) {
			payload.runtime = firstFail.runtime;
		} else if (clipResults && clipResults[0] && clipResults[0].runtime) {
			payload.runtime = clipResults[0].runtime;
		}
		return payload;
	}

	function applyMany(clips, sequence, spec) {
		var i;
		var results = [];
		if (!clips || !clips.length) {
			return summarize(spec, []);
		}
		for (i = 0; i < clips.length; i++) {
			try {
				results.push(applyToClip(clips[i], sequence, spec));
			} catch (e) {
				results.push(finishClipResult(failClip(clips[i], spec, "WRITE_FAILED", String(e)), {
					temporary: true,
					actionId: spec && spec.actionId ? spec.actionId : "",
					failingOperation: "applyToClip threw",
					caughtException: exceptionInfo(e)
				}));
			}
		}
		return summarize(spec, results);
	}

	function runAction(spec) {
		var selected;
		var sequence;
		spec = spec || {};
		try {
			if (!(typeof app !== "undefined" && app.project && app.project.activeSequence)) {
				return summarize(spec, []);
			}
			sequence = app.project.activeSequence;
			if (typeof $ === "undefined" || !$._pickfx || typeof $._pickfx.selectedVideoTrackItems !== "function") {
				return copyExtra(summarize(spec, []), {
					ok: false,
					reason: "WRITE_FAILED",
					detail: "Selection helper is not loaded.",
					verified: false
				});
			}
			selected = $._pickfx.selectedVideoTrackItems();
			if (!selected || !selected.ok || !selected.items || !selected.items.length) {
				return copyExtra(summarize(spec, []), {
					ok: false,
					reason: (selected && selected.reason) || "NO_VIDEO_SELECTION",
					detail: (selected && selected.detail) || "Select a video clip first.",
					debugSelection: selected && selected.debug,
					verified: false
				});
			}
			return applyMany(selected.items, sequence, spec);
		} catch (e) {
			diag = {
				temporary: true,
				actionId: spec.actionId || "",
				failingOperation: "runAction threw",
				caughtException: exceptionInfo(e)
			};
			try {
				persistDiagnostic(diag);
			} catch (ignorePersist) {}
			return {
				ok: false,
				command: true,
				action: true,
				actionId: spec.actionId || "",
				reason: "WRITE_FAILED",
				detail: String(e),
				verified: false,
				selectedCount: 0,
				successfulCount: 0,
				failedCount: 0,
				clips: [],
				runtime: jsonSafeDiag(diag)
			};
		}
	}

	return {
		NUMBER_EPS: NUMBER_EPS,
		ticksOf: ticksOf,
		createTime: createTime,
		ticksPerFrame: ticksPerFrame,
		planTimes: planTimes,
		plannedValues: plannedValues,
		resolveComponent: resolveComponent,
		resolveParameter: resolveParameter,
		applyToClip: applyToClip,
		applyMany: applyMany,
		runAction: runAction,
		summarize: summarize
	};
}());

if (typeof $ !== "undefined") {
	$._pickfxKeyframeEngine = KeyframeEngine;
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = KeyframeEngine;
}
