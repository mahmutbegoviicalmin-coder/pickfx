if (typeof $ !== "undefined" && $._pickfx) {
	$._pickfx.__audioLevelCapabilityProbeLoaded = true;
}

var AudioLevelCapabilityProbe = (function () {
	var OPERATION = "audio.parameter.capability.probe";
	var BUTTON_ID = "probe-audio-level-capability-btn";
	var HANDLER = "invokeAudioLevelCapabilityProbe";
	var BRIDGE_PATH = "audio-level-capability-probe";
	var HOST_FUNCTION = "debugAudioLevelCapabilityProbe";
	var RUNTIME_PATH = "index.html #probe-audio-level-capability-btn onclick invokeAudioLevelCapabilityProbe → PremiereBridge.probeAudioLevelCapability → $._pickfx.debugAudioLevelCapabilityProbe → AudioLevelCapabilityProbe.run → AudioParameterDiscover.resolve";
	var RESOLVER_USED = "AudioParameterDiscover.resolve";
	var KNOWN_WRITERS = {
		setValue: true,
		setValueAtKey: true,
		addKey: true,
		setTimeVarying: true
	};
	var EXTRA_WRITE_NAMES = [
		"setValueAtTime",
		"setColorValue",
		"setInterpolationTypeAtKey",
		"createSetValueAction",
		"createKeyframe",
		"createAddKeyframeAction",
		"createSetTimeVaryingAction",
		"createSetValueAtKeyAction"
	];

	function discover() {
		if (typeof AudioParameterDiscover !== "undefined") {
			return AudioParameterDiscover;
		}
		if (typeof $ !== "undefined" && $._pickfxAudioParameterDiscover) {
			return $._pickfxAudioParameterDiscover;
		}
		return null;
	}

	function jsonSafeLocal(value) {
		if (typeof $ !== "undefined" && $._pickfx && typeof $._pickfx.jsonSafeValue === "function") {
			return $._pickfx.jsonSafeValue(value);
		}
		if (value === undefined || value === null) {
			return null;
		}
		if (typeof value === "number") {
			if (isNaN(value)) {
				return null;
			}
			return value;
		}
		if (typeof value === "boolean" || typeof value === "string") {
			return value;
		}
		try {
			return String(value);
		} catch (e) {
			return null;
		}
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
			if (err && err.line !== undefined) {
				out.line = err.line;
			}
		} catch (ignoreLine) {}
		try {
			if (err && err.stack) {
				out.stack = String(err.stack);
			}
		} catch (ignoreStack) {}
		return out;
	}

	function valuesMatch(requested, actual) {
		if (typeof SafeNumericTestValue !== "undefined" && SafeNumericTestValue.verify) {
			return SafeNumericTestValue.verify(requested, actual);
		}
		return requested === actual;
	}

	function typeOfName(obj, name) {
		try {
			return typeof obj[name];
		} catch (e) {
			return "threw:" + String(e);
		}
	}

	function readGetValue(param) {
		var out = { available: false, threw: false, value: null };
		try {
			out.typeofValue = typeof param.getValue;
		} catch (typeErr) {
			out.typeofValue = "threw";
			out.typeofError = exceptionInfo(typeErr);
			return out;
		}
		if (out.typeofValue !== "function") {
			return out;
		}
		out.available = true;
		try {
			out.value = jsonSafeLocal(param.getValue());
		} catch (getErr) {
			out.threw = true;
			out.error = exceptionInfo(getErr);
		}
		return out;
	}

	function readGetValueAtTime(param, trackItem) {
		var out = { available: false, value: null, attempts: [] };
		var args = [{ label: "0", arg: 0 }];
		var i;
		var attempt;
		var raw;
		try {
			out.typeofValue = typeof param.getValueAtTime;
		} catch (typeErr) {
			out.typeofValue = "threw";
			out.typeofError = exceptionInfo(typeErr);
			return out;
		}
		if (out.typeofValue !== "function") {
			return out;
		}
		out.available = true;
		try {
			if (trackItem && trackItem.start !== undefined && trackItem.start !== null) {
				args.push({ label: "trackItem.start", arg: trackItem.start });
			}
		} catch (ignoreStart) {}
		for (i = 0; i < args.length; i++) {
			attempt = { label: args[i].label, threw: false, value: null };
			try {
				raw = param.getValueAtTime(args[i].arg);
				attempt.typeofReturn = typeof raw;
				attempt.value = jsonSafeLocal(raw);
				if (out.value === null && attempt.value !== null) {
					out.value = attempt.value;
				}
			} catch (atErr) {
				attempt.threw = true;
				attempt.error = exceptionInfo(atErr);
			}
			out.attempts.push(attempt);
		}
		return out;
	}

	function readTimeVarying(param) {
		var out = { available: false, value: null };
		try {
			if (param && typeof param.isTimeVarying === "function") {
				out.available = true;
				out.source = "isTimeVarying()";
				out.value = param.isTimeVarying() === true;
				return out;
			}
		} catch (fnErr) {
			out.available = true;
			out.source = "isTimeVarying()";
			out.error = exceptionInfo(fnErr);
			return out;
		}
		return out;
	}

	function serializeTime(timeObj) {
		var rec = {};
		try {
			if (timeObj && timeObj.seconds !== undefined) {
				rec.seconds = jsonSafeLocal(timeObj.seconds);
			}
		} catch (ignoreSeconds) {}
		try {
			if (timeObj && timeObj.ticks !== undefined) {
				rec.ticks = jsonSafeLocal(timeObj.ticks);
			}
		} catch (ignoreTicks) {}
		return rec;
	}

	function readKeys(param) {
		var out = { available: false, count: 0, times: [] };
		var keys;
		var i;
		try {
			out.typeofValue = typeof param.getKeys;
		} catch (typeErr) {
			out.typeofValue = "threw";
			out.error = exceptionInfo(typeErr);
			return out;
		}
		if (out.typeofValue !== "function") {
			return out;
		}
		out.available = true;
		try {
			keys = param.getKeys();
			if (keys === 0 || keys === null || keys === undefined) {
				out.count = 0;
				return out;
			}
			if (keys && keys.length !== undefined) {
				out.count = keys.length;
				for (i = 0; i < keys.length; i++) {
					out.times.push(serializeTime(keys[i]));
				}
			}
		} catch (keysErr) {
			out.error = exceptionInfo(keysErr);
		}
		return out;
	}

	function readAreKeyframesSupported(param) {
		var out = { available: false, value: null };
		try {
			if (typeof param.areKeyframesSupported === "function") {
				out.available = true;
				out.value = param.areKeyframesSupported() === true;
			}
		} catch (e) {
			out.available = true;
			out.error = exceptionInfo(e);
		}
		return out;
	}

	function snapshot(param, trackItem) {
		var gv = readGetValue(param);
		var at = readGetValueAtTime(param, trackItem);
		var tv = readTimeVarying(param);
		return {
			getValue: gv.value,
			getValueRead: gv,
			getValueAtTime: at.value,
			getValueAtTimeRead: at,
			isTimeVarying: tv.value,
			timeVaryingRead: tv,
			keys: readKeys(param),
			areKeyframesSupported: readAreKeyframesSupported(param)
		};
	}

	function pickTimeArg(trackItem) {
		try {
			if (trackItem && trackItem.start !== undefined && trackItem.start !== null) {
				return {
					label: "trackItem.start",
					arg: trackItem.start,
					available: true
				};
			}
		} catch (ignoreStart) {}
		return {
			label: "0",
			arg: 0,
			available: true,
			note: "TrackItem.start was not available; using 0 because getValueAtTime(0) was accepted on this host."
		};
	}

	function callMethod(param, name, args) {
		var out = {
			name: name,
			invoked: false,
			threw: false,
			unavailable: false,
			argumentCount: args ? args.length : 0,
			returnValue: null,
			returnTypeof: "undefined"
		};
		var raw;
		try {
			if (typeof param[name] !== "function") {
				out.unavailable = true;
				out.typeofValue = typeOfName(param, name);
				return out;
			}
		} catch (typeErr) {
			out.threw = true;
			out.exception = exceptionInfo(typeErr);
			return out;
		}
		out.invoked = true;
		out.typeofValue = "function";
		try {
			raw = param[name].apply(param, args || []);
			out.returnTypeof = typeof raw;
			out.returnValue = jsonSafeLocal(raw);
		} catch (callErr) {
			out.threw = true;
			out.exception = exceptionInfo(callErr);
			out.returnTypeof = "threw";
		}
		return out;
	}

	function looksLikeWriteName(name) {
		var n = String(name || "");
		if (!n) {
			return false;
		}
		if (n.indexOf("set") === 0 || n.indexOf("add") === 0 || n.indexOf("create") === 0) {
			return true;
		}
		if (n.indexOf("insert") === 0 || n.indexOf("put") === 0 || n.indexOf("write") === 0) {
			return true;
		}
		if (n.indexOf("update") === 0 || n.indexOf("change") === 0) {
			return true;
		}
		return false;
	}

	function collectExtraWriteMethods(param) {
		var found = [];
		var seen = {};
		var names = [];
		var i;
		var name;
		var t;
		var res;
		var dump;
		var key;
		function consider(n) {
			if (!n || seen[n] || KNOWN_WRITERS[n]) {
				return;
			}
			if (n === "getValue" || n === "getValueAtTime" || n === "getValueAtKey" || n === "getKeys" ||
					n === "isTimeVarying" || n === "areKeyframesSupported" || n === "removeKey" ||
					n === "removeKeyRange" || n === "displayName" || n === "matchName") {
				return;
			}
			if (!looksLikeWriteName(n) && EXTRA_WRITE_NAMES.join(" ").indexOf(n) === -1) {
				return;
			}
			seen[n] = true;
			t = typeOfName(param, n);
			found.push({
				name: n,
				typeofValue: t,
				tested: false,
				classification: t === "function" ? "UNSAFE_TO_TEST" : "UNAVAILABLE",
				reason: t === "function"
					? "Discovered write-shaped native method; not invoked because signature/safety is unknown for numeric Level 1→2."
					: "Not a function on this ComponentParam."
			});
		}
		for (i = 0; i < EXTRA_WRITE_NAMES.length; i++) {
			consider(EXTRA_WRITE_NAMES[i]);
		}
		try {
			for (key in param) {
				if (param.hasOwnProperty(key) || true) {
					consider(key);
				}
			}
		} catch (forInErr) {}
		if (typeof $ !== "undefined" && $._pickfxParameterResolver && $._pickfxParameterResolver.inspectHostObject) {
			try {
				dump = $._pickfxParameterResolver.inspectHostObject(param, EXTRA_WRITE_NAMES);
				if (dump && dump.objectKeys) {
					for (i = 0; i < dump.objectKeys.length; i++) {
						consider(dump.objectKeys[i]);
					}
				}
				if (dump && dump.forInKeys) {
					for (i = 0; i < dump.forInKeys.length; i++) {
						consider(dump.forInKeys[i]);
					}
				}
				if (dump && dump.ownPropertyNames) {
					for (i = 0; i < dump.ownPropertyNames.length; i++) {
						consider(dump.ownPropertyNames[i]);
					}
				}
			} catch (dumpErr) {}
		}
		for (i = 0; i < found.length; i++) {
			if (found[i].name === "setValueAtTime" && found[i].typeofValue === "function") {
				found[i].classification = "PENDING_TEST";
				found[i].reason = "Native value setter candidate; will be tested one-at-a-time if still present after known writers.";
			}
			if (found[i].name === "setColorValue" && found[i].typeofValue === "function") {
				found[i].classification = "UNSAFE_TO_TEST";
				found[i].reason = "Color setter; not a numeric Level 1→2 mechanism.";
			}
		}
		return found;
	}

	function classifyNumeric(call, afterSnap, testValue) {
		if (call.unavailable === true) {
			return "UNAVAILABLE";
		}
		if (call.unsafe === true) {
			return "UNSAFE_TO_TEST";
		}
		if (call.threw === true) {
			return "THROWS";
		}
		if (valuesMatch(testValue, afterSnap.getValue) || valuesMatch(testValue, afterSnap.getValueAtTime)) {
			return "SUPPORTED_AND_WRITES";
		}
		return "SUPPORTED_BUT_IGNORED";
	}

	function restoreOriginal(param, original, trackItem, timeArg) {
		var steps = [];
		var now;
		var i;
		var liveKeys;
		now = snapshot(param, trackItem);
		if (!valuesMatch(original.getValue, now.getValue) && typeof param.setValueAtKey === "function" &&
				timeArg && timeArg.available) {
			steps.push(callMethod(param, "setValueAtKey", [timeArg.arg, original.getValue, true]));
			now = snapshot(param, trackItem);
		}
		if (!valuesMatch(original.getValue, now.getValue) && typeof param.setValue === "function") {
			steps.push(callMethod(param, "setValue", [original.getValue, true]));
			now = snapshot(param, trackItem);
		}
		if (original.isTimeVarying === false && now.isTimeVarying === true && typeof param.setTimeVarying === "function") {
			steps.push(callMethod(param, "setTimeVarying", [false]));
			now = snapshot(param, trackItem);
		}
		if (original.isTimeVarying === false && now.keys && now.keys.count > 0) {
			if (typeof param.removeKey === "function" && timeArg && timeArg.available) {
				steps.push(callMethod(param, "removeKey", [timeArg.arg]));
			}
			try {
				if (typeof param.getKeys === "function" && typeof param.removeKey === "function") {
					liveKeys = param.getKeys();
					if (liveKeys && liveKeys.length) {
						for (i = 0; i < liveKeys.length; i++) {
							steps.push(callMethod(param, "removeKey", [liveKeys[i]]));
						}
					}
				}
			} catch (ignoreKeys) {}
			now = snapshot(param, trackItem);
			if (now.keys && now.keys.count > 0 && typeof param.setTimeVarying === "function") {
				steps.push(callMethod(param, "setTimeVarying", [false]));
				now = snapshot(param, trackItem);
			}
		}
		if (original.isTimeVarying === false && now.isTimeVarying === true && typeof param.setTimeVarying === "function") {
			steps.push(callMethod(param, "setTimeVarying", [false]));
			now = snapshot(param, trackItem);
		}
		if (!valuesMatch(original.getValue, now.getValue) && typeof param.setValue === "function") {
			steps.push(callMethod(param, "setValue", [original.getValue, true]));
			now = snapshot(param, trackItem);
		}
		return {
			steps: steps,
			after: now,
			verifiedValue: valuesMatch(original.getValue, now.getValue),
			verifiedTimeVarying: original.isTimeVarying === now.isTimeVarying,
			verifiedNoLeftoverKeys: original.isTimeVarying === true || !now.keys || now.keys.count === 0 ||
				!!(original.keys && now.keys.count === original.keys.count),
			verified: valuesMatch(original.getValue, now.getValue) && original.isTimeVarying === now.isTimeVarying &&
				(original.isTimeVarying === true || !now.keys || now.keys.count === 0 ||
					(original.keys && now.keys.count === original.keys.count))
		};
	}

	function methodResult(name, call, before, after, restore, testValue, extra) {
		var classification = classifyNumeric(call, after, testValue);
		var row = {
			method: name,
			classification: classification,
			valueBefore: before.getValue,
			testValue: testValue,
			call: call,
			threw: call.threw === true,
			exception: call.exception || null,
			returnValue: call.returnValue,
			returnTypeof: call.returnTypeof,
			getValueAfter: after.getValue,
			getValueAtTimeAfter: after.getValueAtTime,
			isTimeVaryingAfter: after.isTimeVarying,
			keysAfter: after.keys,
			restore: {
				verified: restore.verified === true,
				verifiedValue: restore.verifiedValue === true,
				verifiedTimeVarying: restore.verifiedTimeVarying === true,
				verifiedNoLeftoverKeys: restore.verifiedNoLeftoverKeys === true,
				getValue: restore.after && restore.after.getValue,
				getValueAtTime: restore.after && restore.after.getValueAtTime,
				isTimeVarying: restore.after && restore.after.isTimeVarying,
				keys: restore.after && restore.after.keys
			},
			usedQE: false,
			productionEnabled: false
		};
		var key;
		if (extra) {
			for (key in extra) {
				if (extra.hasOwnProperty(key)) {
					row[key] = extra[key];
				}
			}
		}
		return row;
	}

	function uniqueLevelIdent(trackItem, ident) {
		var finder = discover();
		var report;
		var matches = [];
		var i;
		var row;
		var wantedName;
		var wantedMatch;
		ident = ident || {};
		if ((ident.componentDisplayName || ident.componentMatchName) &&
				(ident.parameterDisplayName || ident.parameterMatchName)) {
			return { ok: true, ident: ident, resolvedFromInspect: false };
		}
		if (!finder || !finder.inspect) {
			return { ok: false, reason: "WRITE_FAILED", detail: "AudioParameterDiscover.js is not loaded." };
		}
		report = finder.inspect(trackItem);
		if (!report || report.ok !== true) {
			return {
				ok: false,
				reason: (report && report.reason) || "NO_AUDIO_SELECTION",
				detail: (report && report.detail) || "Audio inspect failed."
			};
		}
		wantedName = ident.parameterDisplayName || "Level";
		wantedMatch = ident.parameterMatchName || "";
		for (i = 0; i < (report.candidates ? report.candidates.length : 0); i++) {
			row = report.candidates[i];
			if (!row || row.displayName !== wantedName) {
				continue;
			}
			if (wantedMatch && (row.matchName || "") !== wantedMatch) {
				continue;
			}
			if (row.unambiguous === false) {
				continue;
			}
			if (ident.componentDisplayName && row.componentDisplayName !== ident.componentDisplayName &&
					row.componentMatchName !== ident.componentDisplayName) {
				continue;
			}
			matches.push(row);
		}
		if (matches.length === 1) {
			return {
				ok: true,
				resolvedFromInspect: true,
				ident: {
					componentDisplayName: matches[0].componentDisplayName || "",
					componentMatchName: matches[0].componentMatchName || "",
					parameterDisplayName: matches[0].displayName || "Level",
					parameterMatchName: matches[0].matchName || ""
				}
			};
		}
		return {
			ok: false,
			reason: "PARAMETER_NOT_FOUND",
			detail: matches.length === 0
				? "No unique unambiguous Audio Level candidate."
				: "Audio Level is ambiguous across " + matches.length + " candidates.",
			matchCount: matches.length
		};
	}

	function stamp(result, extra) {
		var key;
		result = result || {};
		result.operation = OPERATION;
		result.usedQE = false;
		result.productionEnabled = false;
		result.recordConfirmed = false;
		result.runtimePath = RUNTIME_PATH;
		result.resolverUsed = RESOLVER_USED;
		result.globalSearchUsed = false;
		result.bridgePath = BRIDGE_PATH;
		result.hostFunction = HOST_FUNCTION;
		result.buttonId = BUTTON_ID;
		result.handler = HANDLER;
		result.debugButtonClicked = true;
		result.debugButton = {
			clicked: true,
			id: BUTTON_ID,
			handler: HANDLER
		};
		if (extra) {
			for (key in extra) {
				if (extra.hasOwnProperty(key)) {
					result[key] = extra[key];
				}
			}
		}
		result.operation = OPERATION;
		result.usedQE = false;
		result.productionEnabled = false;
		return result;
	}

	function run(trackItem, componentHint) {
		var finder = discover();
		var ident;
		var picked;
		var resolved;
		var param;
		var timeArg;
		var original;
		var testValue;
		var generated;
		var extraMethods;
		var attempts = [];
		var setValueAtKeyCall;
		var after;
		var restore;
		var addKeyCall;
		var setAfterAdd;
		var tvCall;
		var tvAfter;
		var tvRestore;
		var extraTest;
		var extraAfter;
		var extraRestore;
		var i;
		var anyWrote;
		var summary;
		ident = componentHint && typeof componentHint === "object" ? componentHint : {
			componentDisplayName: String(componentHint || ""),
			parameterDisplayName: ""
		};
		if (!finder || !finder.resolve) {
			return stamp({
				ok: false,
				reason: "WRITE_FAILED",
				detail: "AudioParameterDiscover.js is not loaded.",
				probeRan: false,
				anyMethodWrote: false
			});
		}
		picked = uniqueLevelIdent(trackItem, ident);
		if (!picked || !picked.ok) {
			return stamp({
				ok: false,
				reason: (picked && picked.reason) || "PARAMETER_NOT_FOUND",
				detail: (picked && picked.detail) || "Could not resolve unique Audio Level.",
				probeRan: false,
				anyMethodWrote: false
			});
		}
		resolved = finder.resolve(trackItem, picked.ident);
		if (!resolved || !resolved.ok || !resolved._param) {
			return stamp({
				ok: false,
				reason: (resolved && resolved.reason) || "PARAMETER_NOT_FOUND",
				detail: (resolved && resolved.detail) || "Audio Level not found.",
				identity: picked.ident,
				probeRan: false,
				anyMethodWrote: false
			});
		}
		param = resolved._param;
		timeArg = pickTimeArg(trackItem);
		original = snapshot(param, trackItem);
		if (typeof SafeNumericTestValue !== "undefined" && SafeNumericTestValue.generate) {
			generated = SafeNumericTestValue.generate(original.getValue, {});
		} else {
			generated = { ok: false };
		}
		if (!generated || !generated.ok) {
			return stamp({
				ok: false,
				reason: "NO_SAFE_TEST_VALUE",
				probeRan: false,
				anyMethodWrote: false,
				identity: resolved.identity || picked.ident,
				original: original
			});
		}
		testValue = generated.value;
		extraMethods = collectExtraWriteMethods(param);

		if (original.isTimeVarying === true && original.keys && original.keys.count > 0) {
			attempts.push({
				method: "setValueAtKey",
				classification: "UNSAFE_TO_TEST",
				reason: "Parameter already has keyframes; probe refuses to mutate existing keys.",
				valueBefore: original.getValue,
				testValue: testValue,
				threw: false,
				invoked: false,
				restore: { verified: true }
			});
			attempts.push({
				method: "addKey+setValueAtKey",
				classification: "UNSAFE_TO_TEST",
				reason: "Parameter already has keyframes; probe will not add more keys.",
				valueBefore: original.getValue,
				testValue: testValue,
				threw: false,
				invoked: false,
				restore: { verified: true }
			});
		} else {
			setValueAtKeyCall = callMethod(param, "setValueAtKey", [timeArg.arg, testValue, true]);
			after = snapshot(param, trackItem);
			restore = restoreOriginal(param, original, trackItem, timeArg);
			attempts.push(methodResult("setValueAtKey", setValueAtKeyCall, original, after, restore, testValue, {
				timeArgLabel: timeArg.label,
				signature: "setValueAtKey(time, value, true)",
				skippedBecause: null
			}));

			if (attempts[0].classification !== "SUPPORTED_AND_WRITES") {
				addKeyCall = callMethod(param, "addKey", [timeArg.arg]);
				setAfterAdd = { unavailable: addKeyCall.unavailable, threw: false, returnValue: null };
				if (addKeyCall.unavailable) {
					after = snapshot(param, trackItem);
					restore = restoreOriginal(param, original, trackItem, timeArg);
					attempts.push(methodResult("addKey+setValueAtKey", addKeyCall, original, after, restore, testValue, {
						timeArgLabel: timeArg.label,
						addKey: addKeyCall,
						setValueAtKey: { invoked: false, skipped: true },
						reason: "addKey is unavailable, so the documented key-first sequence cannot run."
					}));
				} else if (addKeyCall.threw) {
					after = snapshot(param, trackItem);
					restore = restoreOriginal(param, original, trackItem, timeArg);
					attempts.push(methodResult("addKey+setValueAtKey", addKeyCall, original, after, restore, testValue, {
						timeArgLabel: timeArg.label,
						addKey: addKeyCall,
						setValueAtKey: { invoked: false, skipped: true, reason: "addKey threw; setValueAtKey was not called." },
						reason: "addKey threw, so setValueAtKey was not chained."
					}));
				} else {
					setAfterAdd = callMethod(param, "setValueAtKey", [timeArg.arg, testValue, true]);
					after = snapshot(param, trackItem);
					restore = restoreOriginal(param, original, trackItem, timeArg);
					attempts.push(methodResult("addKey+setValueAtKey", setAfterAdd, original, after, restore, testValue, {
						timeArgLabel: timeArg.label,
						signature: "addKey(time); setValueAtKey(time, value, true)",
						addKey: addKeyCall,
						setValueAtKey: setAfterAdd,
						skippedBecause: null
					}));
				}
			} else {
				attempts.push({
					method: "addKey+setValueAtKey",
					classification: "UNSAFE_TO_TEST",
					reason: "Not required: setValueAtKey already wrote the live value. addKey was not invoked.",
					invoked: false,
					threw: false,
					valueBefore: original.getValue,
					testValue: testValue,
					restore: { verified: true },
					usedQE: false,
					productionEnabled: false
				});
			}
		}

		tvCall = callMethod(param, "setTimeVarying", [true]);
		tvAfter = snapshot(param, trackItem);
		tvRestore = restoreOriginal(param, original, trackItem, timeArg);
		attempts.push(methodResult("setTimeVarying", tvCall, original, tvAfter, tvRestore, testValue, {
			signature: "setTimeVarying(true) then immediate restore of original time-varying state",
			capabilityOnly: true,
			timeVaryingBefore: original.isTimeVarying,
			timeVaryingAfterEnable: tvAfter.isTimeVarying,
			timeVaryingRestored: tvRestore.after && tvRestore.after.isTimeVarying,
			valueWriteIntended: false,
			note: "Not a numeric 1→2 setter. Classification below is for the live Level value, not the flag. Flag behavior is in timeVaryingAfterEnable."
		}));

		for (i = 0; i < extraMethods.length; i++) {
			if (extraMethods[i].name === "setValueAtTime" && extraMethods[i].typeofValue === "function") {
				extraTest = callMethod(param, "setValueAtTime", [timeArg.arg, testValue]);
				extraAfter = snapshot(param, trackItem);
				extraRestore = restoreOriginal(param, original, trackItem, timeArg);
				attempts.push(methodResult("setValueAtTime", extraTest, original, extraAfter, extraRestore, testValue, {
					timeArgLabel: timeArg.label,
					signature: "setValueAtTime(time, value)",
					discoveredExtra: true
				}));
				extraMethods[i].tested = true;
				extraMethods[i].classification = attempts[attempts.length - 1].classification;
				extraMethods[i].reason = "Tested one-at-a-time as an extra native value setter.";
			}
		}

		anyWrote = false;
		for (i = 0; i < attempts.length; i++) {
			if (attempts[i].classification === "SUPPORTED_AND_WRITES") {
				anyWrote = true;
			}
		}
		summary = anyWrote
			? "At least one native ComponentParam method changed the live Audio Level value. This is DEBUG-only; Level is not promoted."
			: "None of the probed native ComponentParam methods changed the live Audio Level value from " +
				String(original.getValue) + " to " + String(testValue) + ".";

		return stamp({
			ok: true,
			probeRan: true,
			anyMethodWrote: anyWrote,
			noneWrote: !anyWrote,
			summary: summary,
			testValue: testValue,
			original: original,
			timeArg: { label: timeArg.label, note: timeArg.note || null },
			attempts: attempts,
			extraWriteMethods: extraMethods,
			finalSnapshot: snapshot(param, trackItem),
			component: resolved.effect && resolved.effect.displayName,
			componentMatchName: (resolved.effect && resolved.effect.matchName) || "",
			parameter: resolved.parameter && resolved.parameter.displayName,
			parameterMatchName: (resolved.parameter && resolved.parameter.matchName) || "",
			identity: resolved.identity || picked.ident,
			parent: resolved.snapshot && resolved.snapshot.parent,
			group: resolved.snapshot && resolved.snapshot.group,
			hierarchyPath: resolved.snapshot && resolved.snapshot.hierarchyPath,
			resolvedFromInspect: picked.resolvedFromInspect === true,
			componentResolution: resolved.componentResolution,
			parameterResolution: resolved.parameterResolution,
			productionSetterChosen: false,
			usedQE: false,
			productionEnabled: false,
			recordConfirmed: false
		});
	}

	function hostDebugRun(componentName, parameterName, componentMatchName, parameterMatchName) {
		var ident;
		var selected;
		var result;
		if (componentName && typeof componentName === "object") {
			ident = componentName;
		} else {
			ident = {
				componentDisplayName: String(componentName || ""),
				componentMatchName: String(componentMatchName || ""),
				parameterDisplayName: String(parameterName || ""),
				parameterMatchName: String(parameterMatchName || "")
			};
		}
		result = stamp({
			ok: false,
			probeRan: false,
			anyMethodWrote: false
		});
		if (typeof $ === "undefined" || !$._pickfx || typeof $._pickfx.firstSelectedAudioTrackItem !== "function") {
			result.reason = "WRITE_FAILED";
			result.detail = "host.jsx firstSelectedAudioTrackItem is not available.";
			return JSON.stringify(result);
		}
		selected = $._pickfx.firstSelectedAudioTrackItem();
		if (!selected || !selected.ok) {
			result.reason = (selected && selected.reason) || "NO_AUDIO_SELECTION";
			result.detail = (selected && selected.detail) || "No selected audio TrackItem.";
			return JSON.stringify(result);
		}
		result = run(selected.trackItem, ident);
		result = stamp(result);
		if (typeof $._pickfx.jsonSafeParamResult === "function") {
			return JSON.stringify($._pickfx.jsonSafeParamResult(result));
		}
		return JSON.stringify(result);
	}

	return {
		OPERATION: OPERATION,
		RUNTIME_PATH: RUNTIME_PATH,
		HOST_FUNCTION: HOST_FUNCTION,
		run: run,
		hostDebugRun: hostDebugRun
	};
}());

if (typeof $ !== "undefined") {
	$._pickfxAudioLevelCapabilityProbe = AudioLevelCapabilityProbe;
	if ($._pickfx) {
		$._pickfx.__audioLevelCapabilityProbeLoaded = true;
		$._pickfx.debugAudioLevelCapabilityProbe = AudioLevelCapabilityProbe.hostDebugRun;
	}
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = AudioLevelCapabilityProbe;
}
