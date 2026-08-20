if (typeof $ !== "undefined" && $._pickfx) {
	$._pickfx.__audioWriteTestLoaded = true;
}

var AudioParameterWriteTest = (function () {
	var OPERATION = "audio.parameter.write.test";
	var WRITE_METHOD = "ComponentParam.setValue(value, true)";
	var RUNTIME_PATH = "index.html #test-audio-parameter-write-btn onclick invokeAudioParameterWriteTest → PremiereBridge.testAudioParameterWrite → $._pickfx.debugAudioParameterWriteTest → AudioParameterWriteTest.run → AudioParameterDiscover.resolve → ParameterWriteTest.runResolved";
	var RESOLVER_USED = "AudioParameterDiscover.resolve";

	function wiring() {
		if (typeof AudioWriteTestWiring !== "undefined") {
			return AudioWriteTestWiring;
		}
		if (typeof $ !== "undefined" && $._pickfxAudioWriteTestWiring) {
			return $._pickfxAudioWriteTestWiring;
		}
		return null;
	}

	function discover() {
		if (typeof AudioParameterDiscover !== "undefined") {
			return AudioParameterDiscover;
		}
		if (typeof $ !== "undefined" && $._pickfxAudioParameterDiscover) {
			return $._pickfxAudioParameterDiscover;
		}
		return null;
	}

	function writeTest() {
		if (typeof ParameterWriteTest !== "undefined" && ParameterWriteTest.runResolved) {
			return ParameterWriteTest;
		}
		if (typeof $ !== "undefined" && $._pickfxParameterWriteTest && $._pickfxParameterWriteTest.runResolved) {
			return $._pickfxParameterWriteTest;
		}
		return null;
	}

	function stamp(result, extra, ident) {
		var key;
		var wired = wiring();
		result = result || {};
		result.operation = OPERATION;
		result.usedQE = false;
		result.productionEnabled = false;
		result.writeMethod = result.writeMethod || WRITE_METHOD;
		result.runtimePath = RUNTIME_PATH;
		result.resolverUsed = RESOLVER_USED;
		result.globalSearchUsed = false;
		if (wired) {
			wired.attachTrace(result, ident || extra);
		} else {
			result.debugButton = {
				clicked: true,
				id: "test-audio-parameter-write-btn",
				handler: "invokeAudioParameterWriteTest"
			};
			result.bridgePath = "audio-parameter-write-test";
			result.hostFunction = "debugAudioParameterWriteTest";
			result.debugButtonClicked = true;
			result.buttonId = "test-audio-parameter-write-btn";
			result.handler = "invokeAudioParameterWriteTest";
			result.audioWriteTestLoaded = typeof $ !== "undefined" && $._pickfx && $._pickfx.__audioWriteTestLoaded === true;
			result.audioWriteTestFunctionAvailable = true;
		}
		if (extra) {
			for (key in extra) {
				if (extra.hasOwnProperty(key)) {
					result[key] = extra[key];
				}
			}
		}
		result.operation = OPERATION;
		result.globalSearchUsed = false;
		result.productionEnabled = false;
		result.bridgePath = "audio-parameter-write-test";
		result.hostFunction = "debugAudioParameterWriteTest";
		return result;
	}

	function reject(reason, extra, ident) {
		return stamp({
			ok: false,
			reason: reason || "PARAMETER_NOT_FOUND",
			verified: false,
			verifiedTest: false,
			verifiedRestore: false,
			settersCalled: false,
			usedQE: false,
			productionEnabled: false,
			status: "REJECTED",
			writeMethod: WRITE_METHOD
		}, extra, ident);
	}

	function candidateResult(row, writeResult) {
		var result = writeResult || {};
		var original = result.originalValue;
		if (original === undefined && row) {
			original = row.currentValue !== undefined ? row.currentValue : row.value;
		}
		return {
			ok: result.ok === true,
			operation: OPERATION,
			component: result.component || (row && row.componentDisplayName) || "",
			componentMatchName: result.componentMatchName || (row && row.componentMatchName) || "",
			parameter: result.parameter || (row && row.displayName) || "",
			parameterMatchName: result.parameterMatchName !== undefined ? result.parameterMatchName : ((row && row.matchName) || ""),
			parent: result.parent || (row && row.parent) || "",
			group: result.group || (row && row.group) || "",
			hierarchyPath: result.hierarchyPath || (row && row.hierarchyPath) || "",
			unambiguous: result.unambiguous !== undefined ? result.unambiguous === true : !!(row && row.unambiguous === true),
			originalValue: original,
			testValue: result.testValue,
			afterTest: result.afterTest,
			restoredValue: result.restoredValue !== undefined ? result.restoredValue : (result.settersCalled === true ? result.restoredValue : original),
			verifiedTest: result.verifiedTest === true,
			verifiedRestore: result.verifiedRestore === true,
			verified: result.verified === true,
			status: result.status || "REJECTED",
			reason: result.reason,
			settersCalled: result.settersCalled === true,
			usedQE: false,
			productionEnabled: false,
			writeMethod: result.writeMethod || WRITE_METHOD
		};
	}

	function identityArgs(componentHint, parameterName, options) {
		options = options || {};
		if (componentHint && typeof componentHint === "object") {
			return {
				componentDisplayName: componentHint.componentDisplayName || componentHint.component || "",
				componentMatchName: componentHint.componentMatchName || options.componentMatchName || "",
				parameterDisplayName: componentHint.parameterDisplayName || componentHint.parameter || parameterName || "",
				parameterMatchName: componentHint.parameterMatchName || options.parameterMatchName || "",
				options: options,
				debugButton: componentHint.debugButton,
				debugButtonClicked: componentHint.debugButtonClicked,
				buttonId: componentHint.buttonId,
				handler: componentHint.handler,
				bridgePath: componentHint.bridgePath
			};
		}
		return {
			componentDisplayName: componentHint || "",
			componentMatchName: options.componentMatchName || "",
			parameterDisplayName: parameterName || "",
			parameterMatchName: options.parameterMatchName || "",
			options: options
		};
	}

	function runOne(trackItem, componentHint, parameterName, parameterMatchName) {
		var finder = discover();
		var tester = writeTest();
		var resolved;
		var classified;
		var result;
		var ident;
		if (!finder || !finder.resolve) {
			return reject("WRITE_FAILED", {
				detail: "AudioParameterDiscover.js is not loaded."
			}, componentHint);
		}
		if (!tester || !tester.runResolved) {
			return reject("WRITE_FAILED", {
				detail: "ParameterWriteTest.runResolved is not loaded."
			}, componentHint);
		}
		ident = identityArgs(
			componentHint,
			parameterName,
			typeof parameterMatchName === "object" && parameterMatchName
				? parameterMatchName
				: { parameterMatchName: parameterMatchName || "" }
		);
		if (!ident.parameterDisplayName && !ident.parameterMatchName) {
			return reject("PARAMETER_NOT_FOUND", {
				detail: "Parameter displayName is required.",
				component: ident.componentDisplayName || "",
				parameter: ""
			}, ident);
		}
		resolved = finder.resolve(trackItem, {
			componentDisplayName: ident.componentDisplayName,
			componentMatchName: ident.componentMatchName,
			parameterDisplayName: ident.parameterDisplayName,
			parameterMatchName: ident.parameterMatchName
		});
		if (!resolved || !resolved.ok) {
			return reject((resolved && resolved.reason) || "PARAMETER_NOT_FOUND", {
				detail: (resolved && resolved.detail) || "Audio parameter not found.",
				component: ident.componentDisplayName,
				componentMatchName: ident.componentMatchName,
				parameter: ident.parameterDisplayName,
				parameterMatchName: ident.parameterMatchName,
				identity: resolved && resolved.identity ? resolved.identity : ident,
				componentResolution: resolved && resolved.componentResolution,
				parameterResolution: resolved && resolved.parameterResolution,
				resolverUsed: (resolved && resolved.resolverUsed) || RESOLVER_USED,
				globalSearchUsed: false
			}, ident);
		}
		classified = finder.classifySnapshot
			? finder.classifySnapshot(resolved.snapshot)
			: { classification: "NUMERIC_CANDIDATE", candidate: true };
		if (classified.classification !== "NUMERIC_CANDIDATE") {
			return reject(classified.reason || classified.classification, {
				component: resolved.effect.displayName,
				componentMatchName: resolved.effect.matchName || "",
				parameter: resolved.parameter.displayName,
				parameterMatchName: resolved.parameter.matchName || "",
				identity: resolved.identity,
				runtimeType: resolved.snapshot && resolved.snapshot.runtimeType,
				originalValue: resolved.snapshot && resolved.snapshot.currentValue,
				classification: classified.classification,
				timeVarying: !!(resolved.snapshot && resolved.snapshot.timeVarying),
				min: resolved.snapshot && resolved.snapshot.min,
				max: resolved.snapshot && resolved.snapshot.max
			}, ident);
		}
		result = tester.runResolved(resolved, {
			numericOnly: true,
			recordConfirmed: false,
			productionEnabled: false,
			operation: OPERATION
		}, resolved.effect.displayName, resolved.parameter.displayName);
		return stamp(result, {
			component: resolved.effect.displayName,
			componentMatchName: resolved.effect.matchName || "",
			parameter: resolved.parameter.displayName,
			parameterMatchName: resolved.parameter.matchName || "",
			identity: resolved.identity,
			min: resolved.snapshot && resolved.snapshot.min,
			max: resolved.snapshot && resolved.snapshot.max,
			parent: resolved.snapshot && resolved.snapshot.parent,
			group: resolved.snapshot && resolved.snapshot.group,
			hasGetValue: resolved.snapshot && resolved.snapshot.hasGetValue,
			hasSetValue: resolved.snapshot && resolved.snapshot.hasSetValue,
			typeMetadata: resolved.snapshot && resolved.snapshot.typeMetadata,
			raw: resolved.snapshot && resolved.snapshot.raw,
			reflection: resolved.snapshot && resolved.snapshot.reflection,
			componentResolution: resolved.componentResolution,
			parameterResolution: resolved.parameterResolution,
			resolverUsed: resolved.resolverUsed || RESOLVER_USED,
			globalSearchUsed: false
		}, ident);
	}

	function candidateIsUnambiguous(report, row) {
		var i;
		var count = 0;
		if (!row) {
			return false;
		}
		if (row.unambiguous === true) {
			return true;
		}
		if (row.unambiguous === false) {
			return false;
		}
		for (i = 0; i < (report && report.candidates ? report.candidates.length : 0); i++) {
			if (report.candidates[i].displayName === row.displayName &&
					(report.candidates[i].matchName || "") === (row.matchName || "")) {
				count += 1;
			}
		}
		return count === 1;
	}

	function runAll(trackItem, componentHint) {
		var finder = discover();
		var report;
		var tests = [];
		var i;
		var row;
		var result;
		var successful = 0;
		var failed = 0;
		var skippedAmbiguous = 0;
		var writesAttempted = 0;
		var candidateResults = [];
		if (!finder || !finder.inspect) {
			return reject("WRITE_FAILED", {
				detail: "AudioParameterDiscover.js is not loaded."
			}, componentHint);
		}
		report = finder.inspect(trackItem);
		if (!report || report.ok !== true) {
			return stamp(report || reject("EFFECT_NOT_FOUND", null, componentHint), {
				tests: [],
				successfulCount: 0,
				failedCount: 0
			}, componentHint);
		}
		for (i = 0; i < (report.candidates ? report.candidates.length : 0); i++) {
			row = report.candidates[i];
			if (!row || !row.displayName) {
				continue;
			}
			if (componentHint && typeof componentHint === "object") {
				if (componentHint.componentMatchName &&
						row.componentMatchName !== componentHint.componentMatchName) {
					continue;
				}
				if (componentHint.componentDisplayName &&
						row.componentDisplayName !== componentHint.componentDisplayName &&
						row.componentMatchName !== componentHint.componentDisplayName) {
					continue;
				}
			} else if (componentHint && row.componentDisplayName !== componentHint && row.componentMatchName !== componentHint) {
				continue;
			}
			if (!candidateIsUnambiguous(report, row)) {
				skippedAmbiguous += 1;
				result = reject("PARAMETER_NOT_FOUND", {
					detail: 'Parameter displayName "' + row.displayName + '" is ambiguous across ' +
						(row.matchCountForName || 2) + " parameters inside component \"" +
						(row.componentDisplayName || "") + "\" / \"" + (row.componentMatchName || "") + "\".",
					component: row.componentDisplayName,
					componentMatchName: row.componentMatchName,
					parameter: row.displayName,
					parameterMatchName: row.matchName || "",
					parent: row.parent,
					group: row.group,
					hierarchyPath: row.hierarchyPath,
					unambiguous: false,
					originalValue: row.currentValue !== undefined ? row.currentValue : row.value,
					testValue: undefined,
					afterTest: undefined,
					restoredValue: row.currentValue !== undefined ? row.currentValue : row.value,
					verifiedTest: false,
					verifiedRestore: false,
					verified: false,
					settersCalled: false
				}, componentHint);
				tests.push(result);
				candidateResults.push(candidateResult(row, result));
				failed += 1;
				continue;
			}
			result = runOne(trackItem, {
				componentDisplayName: row.componentDisplayName,
				componentMatchName: row.componentMatchName,
				parameterDisplayName: row.displayName,
				parameterMatchName: row.matchName || "",
				debugButton: componentHint && componentHint.debugButton,
				buttonId: componentHint && componentHint.buttonId,
				handler: componentHint && componentHint.handler,
				bridgePath: componentHint && componentHint.bridgePath
			});
			writesAttempted += 1;
			tests.push(result);
			candidateResults.push(candidateResult(row, result));
			if (result && result.ok && result.verified) {
				successful += 1;
			} else {
				failed += 1;
			}
		}
		return stamp({
			ok: writesAttempted > 0 && successful === writesAttempted,
			component: report.component && report.component.displayName,
			componentMatchName: report.component && report.component.matchName,
			tests: tests,
			candidateResults: candidateResults,
			candidates: report.candidates,
			unambiguousCandidates: report.unambiguousCandidates,
			ambiguousCandidates: report.ambiguousCandidates,
			sections: report.sections,
			rejected: report.rejected,
			selectedCount: writesAttempted,
			successfulCount: successful,
			failedCount: failed,
			skippedAmbiguousCount: skippedAmbiguous,
			verifiedCount: successful,
			settersCalled: writesAttempted > 0,
			usedQE: false,
			productionEnabled: false,
			status: writesAttempted > 0 && successful === writesAttempted ? "WRITE_CONFIRMED" : (successful > 0 ? "WRITE_TESTED" : "REJECTED")
		}, null, componentHint);
	}

	function run(trackItem, componentHint, parameterName, options) {
		var args = identityArgs(componentHint, parameterName, options);
		if (!args.parameterDisplayName && !args.parameterMatchName) {
			return runAll(trackItem, args);
		}
		return runOne(trackItem, args);
	}

	var DIAGNOSE_OPERATION = "audio.parameter.setvalue.diagnose";
	var DIAGNOSE_BUTTON_ID = "diagnose-audio-level-setvalue-btn";
	var DIAGNOSE_HANDLER = "invokeAudioLevelSetValueDiagnose";
	var DIAGNOSE_BRIDGE_PATH = "audio-level-setvalue-diagnose";
	var DIAGNOSE_HOST_FUNCTION = "debugAudioLevelSetValueDiagnose";
	var DIAGNOSE_RUNTIME_PATH = "index.html #diagnose-audio-level-setvalue-btn onclick invokeAudioLevelSetValueDiagnose → PremiereBridge.diagnoseAudioLevelSetValue → $._pickfx.debugAudioLevelSetValueDiagnose → AudioParameterWriteTest.diagnoseSetValue → AudioParameterDiscover.resolve → ComponentParam.setValue(value, true)";

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
		var out = {
			text: String(err)
		};
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
			if (err && err.lineNumber !== undefined && out.line === undefined) {
				out.line = err.lineNumber;
			}
		} catch (ignoreLineNumber) {}
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

	function readTimeVarying(param) {
		var out = {
			available: false,
			value: null
		};
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
		try {
			if (param && param.timeVarying !== undefined) {
				out.available = true;
				out.source = "timeVarying";
				out.value = param.timeVarying === true;
			}
		} catch (propErr) {
			out.error = exceptionInfo(propErr);
		}
		return out;
	}

	function readGetValue(param) {
		var out = {
			available: false,
			threw: false,
			value: null
		};
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
		var out = {
			available: false,
			value: null,
			attempts: []
		};
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
			out.length = param.getValueAtTime.length;
		} catch (lenErr) {
			out.lengthError = String(lenErr);
		}
		try {
			if (trackItem && trackItem.start !== undefined && trackItem.start !== null) {
				args.push({ label: "trackItem.start", arg: trackItem.start });
			}
		} catch (ignoreStart) {}
		for (i = 0; i < args.length; i++) {
			attempt = {
				label: args[i].label,
				threw: false,
				value: null
			};
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

	function probeDirtyRead(name, reader, into) {
		var value;
		try {
			value = reader();
			if (value === undefined) {
				into.probes[name] = {
					present: false,
					value: null
				};
				return;
			}
			into.observed = true;
			into.probes[name] = {
				present: true,
				value: jsonSafeLocal(value)
			};
		} catch (e) {
			into.probes[name] = {
				present: false,
				error: String(e)
			};
		}
	}

	function readDirty(trackItem, component, param) {
		var out = {
			observed: false,
			probes: {}
		};
		if (typeof app !== "undefined" && app && app.project) {
			probeDirtyRead("app.project.dirty", function () {
				return app.project.dirty;
			}, out);
			probeDirtyRead("app.project.isDirty", function () {
				return app.project.isDirty;
			}, out);
		}
		if (trackItem) {
			probeDirtyRead("trackItem.dirty", function () {
				return trackItem.dirty;
			}, out);
			probeDirtyRead("trackItem.isDirty", function () {
				return trackItem.isDirty;
			}, out);
		}
		if (component) {
			probeDirtyRead("component.dirty", function () {
				return component.dirty;
			}, out);
			probeDirtyRead("component.isDirty", function () {
				return component.isDirty;
			}, out);
		}
		if (param) {
			probeDirtyRead("param.dirty", function () {
				return param.dirty;
			}, out);
			probeDirtyRead("param.isDirty", function () {
				return param.isDirty;
			}, out);
		}
		return out;
	}

	function typeofName(obj, name) {
		try {
			return typeof obj[name];
		} catch (e) {
			return "threw:" + String(e);
		}
	}

	function reflectSetValue(param) {
		var out = {
			typeofValue: "undefined",
			lengthObserved: false,
			oneArgumentCallNotAttempted: true,
			setValueAtKeyCalled: false,
			alternativeSettersCalled: false
		};
		var fn;
		var source;
		var names;
		var i;
		var name;
		try {
			fn = param.setValue;
			out.typeofValue = typeof fn;
		} catch (typeErr) {
			out.typeofValue = "threw";
			out.typeofError = exceptionInfo(typeErr);
			return out;
		}
		if (typeof fn === "function") {
			try {
				out.length = fn.length;
				out.lengthObserved = true;
			} catch (lenErr) {
				out.lengthError = String(lenErr);
			}
			try {
				source = String(fn);
				out.source = source.length > 240 ? source.substring(0, 240) : source;
			} catch (srcErr) {
				out.sourceError = String(srcErr);
			}
			if (out.lengthObserved) {
				if (out.length === 2) {
					out.arityInference = "function.length===2 (two declared arguments; one-arg form not invoked)";
				} else if (out.length === 1) {
					out.arityInference = "function.length===1 (one declared argument; one-arg form not invoked)";
				} else if (out.length === 0) {
					out.arityInference = "function.length===0 (host/native methods often report 0; not conclusive; one-arg form not invoked)";
				} else {
					out.arityInference = "function.length===" + out.length + " (one-arg form not invoked)";
				}
			} else {
				out.arityInference = "function.length not observable; one-arg form not invoked";
			}
		}
		names = [
			"getValue",
			"getValueAtTime",
			"setValue",
			"setValueAtTime",
			"setValueAtKey",
			"addKey",
			"setTimeVarying"
		];
		out.otherMethods = {};
		for (i = 0; i < names.length; i++) {
			name = names[i];
			out.otherMethods[name] = typeofName(param, name);
		}
		return out;
	}

	function classifySetValueOutcome(probe) {
		var after;
		var getValueAfter;
		var atTimeAfter;
		var atAvailable;
		var conclusion;
		after = probe.valueImmediatelyAfterSetValue;
		getValueAfter = probe.getValueAfter;
		atTimeAfter = probe.getValueAtTimeAfter;
		atAvailable = !!(probe.getValueAtTime && probe.getValueAtTime.available === true);
		conclusion = {
			letter: null,
			code: "NOT_RUN",
			A_setValueThrows: false,
			B_setValueReturnsButPremiereIgnores: false,
			C_getValueStaleOrCached: false,
			D_requiresDifferentApi: false,
			summary: "setValue was not invoked."
		};
		if (probe.setValueThrew === true) {
			conclusion.letter = "A";
			conclusion.code = "A_SETVALUE_THREW";
			conclusion.A_setValueThrows = true;
			conclusion.summary = "setValue throws.";
			return conclusion;
		}
		if (probe.setValueReflection && probe.setValueReflection.typeofValue !== "function") {
			conclusion.letter = "D";
			conclusion.code = "D_DIFFERENT_API";
			conclusion.D_requiresDifferentApi = true;
			conclusion.summary = "setValue is not a function; the parameter requires a different API mechanism.";
			return conclusion;
		}
		if (valuesMatch(probe.testValuePassed, getValueAfter) || valuesMatch(probe.testValuePassed, after)) {
			conclusion.code = "SETVALUE_APPLIED";
			conclusion.summary = "setValue changed the live value.";
			return conclusion;
		}
		if (atAvailable && atTimeAfter !== null && atTimeAfter !== undefined &&
				valuesMatch(probe.testValuePassed, atTimeAfter) &&
				!valuesMatch(probe.testValuePassed, getValueAfter)) {
			conclusion.letter = "C";
			conclusion.code = "C_GETVALUE_STALE";
			conclusion.C_getValueStaleOrCached = true;
			conclusion.summary = "getValue() is stale or cached; getValueAtTime() reflects the test value.";
			return conclusion;
		}
		conclusion.letter = "B";
		conclusion.code = "B_SETVALUE_IGNORED";
		conclusion.B_setValueReturnsButPremiereIgnores = true;
		if (!atAvailable) {
			conclusion.cannotProveC = true;
			conclusion.summary = "setValue returned but Premiere ignored the change. getValueAtTime() was not available, so a stale getValue() cache could not be proven.";
		} else {
			conclusion.summary = "setValue returned but Premiere ignored the change. getValue() and getValueAtTime() both remained at the original value.";
		}
		return conclusion;
	}

	function stampDiagnose(result, extra, ident) {
		var key;
		result = result || {};
		result.operation = DIAGNOSE_OPERATION;
		result.usedQE = false;
		result.productionEnabled = false;
		result.recordConfirmed = false;
		result.writeMethod = WRITE_METHOD;
		result.runtimePath = DIAGNOSE_RUNTIME_PATH;
		result.resolverUsed = RESOLVER_USED;
		result.globalSearchUsed = false;
		result.bridgePath = DIAGNOSE_BRIDGE_PATH;
		result.hostFunction = DIAGNOSE_HOST_FUNCTION;
		result.debugButtonClicked = true;
		result.buttonId = DIAGNOSE_BUTTON_ID;
		result.handler = DIAGNOSE_HANDLER;
		result.debugButton = {
			clicked: true,
			id: DIAGNOSE_BUTTON_ID,
			handler: DIAGNOSE_HANDLER
		};
		result.audioWriteTestLoaded = typeof $ !== "undefined" && $._pickfx && $._pickfx.__audioWriteTestLoaded === true;
		result.audioSetValueDiagnoseAvailable = true;
		if (extra) {
			for (key in extra) {
				if (extra.hasOwnProperty(key)) {
					result[key] = extra[key];
				}
			}
		}
		result.operation = DIAGNOSE_OPERATION;
		result.usedQE = false;
		result.productionEnabled = false;
		result.recordConfirmed = false;
		result.globalSearchUsed = false;
		result.bridgePath = DIAGNOSE_BRIDGE_PATH;
		result.hostFunction = DIAGNOSE_HOST_FUNCTION;
		result.runtimePath = DIAGNOSE_RUNTIME_PATH;
		return result;
	}

	function rejectDiagnose(reason, extra, ident) {
		return stampDiagnose({
			ok: false,
			reason: reason || "PARAMETER_NOT_FOUND",
			probeRan: false,
			settersCalled: false,
			usedQE: false,
			productionEnabled: false,
			status: "REJECTED",
			conclusion: {
				letter: null,
				code: "NOT_RUN",
				A_setValueThrows: false,
				B_setValueReturnsButPremiereIgnores: false,
				C_getValueStaleOrCached: false,
				D_requiresDifferentApi: false,
				summary: "Diagnostic did not invoke setValue."
			}
		}, extra, ident);
	}

	function uniqueNamedIdent(trackItem, displayName, matchName) {
		var finder = discover();
		var report;
		var matches = [];
		var i;
		var row;
		var wantedName = String(displayName || "");
		var wantedMatch = String(matchName || "");
		if (!finder || !finder.inspect) {
			return {
				ok: false,
				reason: "WRITE_FAILED",
				detail: "AudioParameterDiscover.js is not loaded."
			};
		}
		report = finder.inspect(trackItem);
		if (!report || report.ok !== true) {
			return {
				ok: false,
				reason: (report && report.reason) || "NO_AUDIO_SELECTION",
				detail: (report && report.detail) || "Audio inspect failed.",
				inspect: report
			};
		}
		for (i = 0; i < (report.candidates ? report.candidates.length : 0); i++) {
			row = report.candidates[i];
			if (!row) {
				continue;
			}
			if (wantedMatch && (row.matchName || "") !== wantedMatch) {
				continue;
			}
			if (wantedName && row.displayName !== wantedName) {
				continue;
			}
			if (!wantedName && !wantedMatch) {
				continue;
			}
			if (!candidateIsUnambiguous(report, row)) {
				continue;
			}
			matches.push(row);
		}
		if (matches.length === 1) {
			return {
				ok: true,
				ident: {
					componentDisplayName: matches[0].componentDisplayName || "",
					componentMatchName: matches[0].componentMatchName || "",
					parameterDisplayName: matches[0].displayName || wantedName,
					parameterMatchName: matches[0].matchName || ""
				},
				resolvedFromInspect: true
			};
		}
		return {
			ok: false,
			reason: "PARAMETER_NOT_FOUND",
			detail: matches.length === 0
				? ('No unique unambiguous "' + (wantedName || wantedMatch || "Level") + '" Audio candidate.')
				: ('"' + (wantedName || wantedMatch || "Level") + '" is ambiguous across ' + matches.length + " Audio candidates."),
			matchCount: matches.length
		};
	}

	function resolveDiagnoseIdentity(trackItem, ident) {
		ident = ident || {};
		if ((ident.componentDisplayName || ident.componentMatchName) &&
				(ident.parameterDisplayName || ident.parameterMatchName)) {
			return { ok: true, ident: ident, resolvedFromInspect: false };
		}
		if (ident.parameterDisplayName || ident.parameterMatchName) {
			return uniqueNamedIdent(trackItem, ident.parameterDisplayName, ident.parameterMatchName);
		}
		return uniqueNamedIdent(trackItem, "Level", "");
	}

	function diagnoseSetValue(trackItem, componentHint, parameterName, options) {
		var finder = discover();
		var resolved;
		var ident;
		var identity;
		var param;
		var test;
		var limits;
		var beforeGet;
		var afterGet;
		var restoreGet;
		var beforeAtTime;
		var afterAtTime;
		var restoreAtTime;
		var beforeVarying;
		var afterVarying;
		var restoreVarying;
		var beforeDirty;
		var afterDirty;
		var restoreDirty;
		var reflection;
		var setValueReturn;
		var setValueReturnTypeof;
		var setValueThrew;
		var setValueException;
		var restoreThrew;
		var restoreReturn;
		var restoreException;
		var probe;
		var conclusion;
		var picked;
		ident = identityArgs(componentHint, parameterName, options);
		if (!finder || !finder.resolve) {
			return rejectDiagnose("WRITE_FAILED", {
				detail: "AudioParameterDiscover.js is not loaded."
			}, ident);
		}
		picked = resolveDiagnoseIdentity(trackItem, ident);
		if (!picked || !picked.ok) {
			return rejectDiagnose((picked && picked.reason) || "PARAMETER_NOT_FOUND", {
				detail: (picked && picked.detail) || "Could not resolve a unique Audio Level identity.",
				matchCount: picked && picked.matchCount,
				component: ident.componentDisplayName,
				parameter: ident.parameterDisplayName || "Level"
			}, ident);
		}
		identity = picked.ident;
		resolved = finder.resolve(trackItem, {
			componentDisplayName: identity.componentDisplayName,
			componentMatchName: identity.componentMatchName,
			parameterDisplayName: identity.parameterDisplayName,
			parameterMatchName: identity.parameterMatchName
		});
		if (!resolved || !resolved.ok) {
			return rejectDiagnose((resolved && resolved.reason) || "PARAMETER_NOT_FOUND", {
				detail: (resolved && resolved.detail) || "Audio parameter not found.",
				component: identity.componentDisplayName,
				componentMatchName: identity.componentMatchName,
				parameter: identity.parameterDisplayName,
				parameterMatchName: identity.parameterMatchName,
				identity: resolved && resolved.identity ? resolved.identity : identity,
				componentResolution: resolved && resolved.componentResolution,
				parameterResolution: resolved && resolved.parameterResolution,
				resolvedFromInspect: picked.resolvedFromInspect === true
			}, ident);
		}
		param = resolved._param;
		if (!param) {
			return rejectDiagnose("PARAMETER_NOT_FOUND", {
				detail: "Resolved Audio parameter has no live host object.",
				component: resolved.effect && resolved.effect.displayName,
				parameter: resolved.parameter && resolved.parameter.displayName
			}, ident);
		}
		reflection = reflectSetValue(param);
		beforeVarying = readTimeVarying(param);
		beforeDirty = readDirty(trackItem, resolved._component || resolved.effect, param);
		beforeGet = readGetValue(param);
		beforeAtTime = readGetValueAtTime(param, trackItem);
		if (beforeGet.threw || !beforeGet.available) {
			return stampDiagnose({
				ok: false,
				reason: "NO_GET_VALUE",
				probeRan: false,
				settersCalled: false,
				valueImmediatelyBeforeSetValue: beforeGet.value,
				getValueBefore: beforeGet,
				getValueAtTimeBefore: beforeAtTime,
				timeVaryingBefore: beforeVarying,
				dirtyBefore: beforeDirty,
				setValueReflection: reflection,
				component: resolved.effect && resolved.effect.displayName,
				parameter: resolved.parameter && resolved.parameter.displayName,
				identity: resolved.identity || identity,
				conclusion: {
					letter: null,
					code: "NOT_RUN",
					A_setValueThrows: false,
					B_setValueReturnsButPremiereIgnores: false,
					C_getValueStaleOrCached: false,
					D_requiresDifferentApi: reflection.typeofValue !== "function",
					summary: "getValue() was not available, so setValue was not invoked."
				}
			}, null, ident);
		}
		limits = {};
		try {
			if (typeof param.min === "number") {
				limits.min = param.min;
			}
		} catch (ignoreMin) {}
		try {
			if (typeof param.max === "number") {
				limits.max = param.max;
			}
		} catch (ignoreMax) {}
		if (typeof SafeNumericTestValue !== "undefined" && SafeNumericTestValue.generate) {
			test = SafeNumericTestValue.generate(beforeGet.value, limits);
		} else {
			test = { ok: false, reason: "NO_SAFE_TEST_VALUE" };
		}
		if (!test || !test.ok) {
			return stampDiagnose({
				ok: false,
				reason: "NO_SAFE_TEST_VALUE",
				probeRan: false,
				settersCalled: false,
				valueImmediatelyBeforeSetValue: beforeGet.value,
				getValueBefore: beforeGet,
				setValueReflection: reflection,
				component: resolved.effect && resolved.effect.displayName,
				parameter: resolved.parameter && resolved.parameter.displayName,
				identity: resolved.identity || identity,
				conclusion: {
					letter: null,
					code: "NOT_RUN",
					A_setValueThrows: false,
					B_setValueReturnsButPremiereIgnores: false,
					C_getValueStaleOrCached: false,
					D_requiresDifferentApi: false,
					summary: "No safe test value; setValue was not invoked."
				}
			}, null, ident);
		}
		setValueThrew = false;
		setValueReturn = null;
		setValueReturnTypeof = "undefined";
		setValueException = null;
		if (reflection.typeofValue !== "function") {
			probe = {
				valueImmediatelyBeforeSetValue: beforeGet.value,
				testValuePassed: test.value,
				setValueThrew: false,
				setValueReturn: null,
				setValueReturnTypeof: reflection.typeofValue,
				valueImmediatelyAfterSetValue: beforeGet.value,
				getValueAfter: beforeGet.value,
				getValueAtTimeAfter: beforeAtTime.value,
				getValueAtTime: beforeAtTime,
				setValueReflection: reflection
			};
			conclusion = classifySetValueOutcome(probe);
			return stampDiagnose({
				ok: false,
				reason: "NO_SET_VALUE",
				probeRan: false,
				settersCalled: false,
				valueImmediatelyBeforeSetValue: beforeGet.value,
				testValuePassed: test.value,
				setValueThrew: false,
				setValueReturn: null,
				setValueReturnTypeof: reflection.typeofValue,
				valueImmediatelyAfterSetValue: beforeGet.value,
				getValueAfter: beforeGet.value,
				getValueAtTimeAfter: beforeAtTime.value,
				getValueAtTimeBefore: beforeAtTime,
				getValueAtTime: beforeAtTime,
				timeVaryingBefore: beforeVarying,
				timeVaryingAfter: beforeVarying,
				dirtyBefore: beforeDirty,
				dirtyAfter: beforeDirty,
				setValueReflection: reflection,
				conclusion: conclusion,
				component: resolved.effect && resolved.effect.displayName,
				parameter: resolved.parameter && resolved.parameter.displayName,
				identity: resolved.identity || identity
			}, null, ident);
		}
		try {
			setValueReturn = param.setValue(test.value, true);
			setValueReturnTypeof = typeof setValueReturn;
			setValueReturn = jsonSafeLocal(setValueReturn);
		} catch (setErr) {
			setValueThrew = true;
			setValueException = exceptionInfo(setErr);
			setValueReturn = null;
			setValueReturnTypeof = "threw";
		}
		afterGet = readGetValue(param);
		afterAtTime = readGetValueAtTime(param, trackItem);
		afterVarying = readTimeVarying(param);
		afterDirty = readDirty(trackItem, resolved._component || resolved.effect, param);
		restoreThrew = false;
		restoreReturn = null;
		restoreException = null;
		try {
			restoreReturn = param.setValue(beforeGet.value, true);
			restoreReturn = jsonSafeLocal(restoreReturn);
		} catch (restoreErr) {
			restoreThrew = true;
			restoreException = exceptionInfo(restoreErr);
		}
		restoreGet = readGetValue(param);
		restoreAtTime = readGetValueAtTime(param, trackItem);
		restoreVarying = readTimeVarying(param);
		restoreDirty = readDirty(trackItem, resolved._component || resolved.effect, param);
		probe = {
			valueImmediatelyBeforeSetValue: beforeGet.value,
			testValuePassed: test.value,
			setValueThrew: setValueThrew,
			setValueReturn: setValueReturn,
			setValueReturnTypeof: setValueReturnTypeof,
			valueImmediatelyAfterSetValue: afterGet.value,
			getValueAfter: afterGet.value,
			getValueAtTimeAfter: afterAtTime.value,
			getValueAtTime: afterAtTime,
			setValueReflection: reflection
		};
		conclusion = classifySetValueOutcome(probe);
		return stampDiagnose({
			ok: true,
			writeApplied: conclusion.code === "SETVALUE_APPLIED",
			reason: conclusion.letter ? conclusion.code : (conclusion.code === "SETVALUE_APPLIED" ? undefined : conclusion.code),
			probeRan: true,
			settersCalled: true,
			valueImmediatelyBeforeSetValue: beforeGet.value,
			testValuePassed: test.value,
			setValueReturn: setValueReturn,
			setValueReturnTypeof: setValueReturnTypeof,
			setValueThrew: setValueThrew,
			setValueException: setValueException,
			valueImmediatelyAfterSetValue: afterGet.value,
			getValueBefore: beforeGet.value,
			getValueAfter: afterGet.value,
			getValueAtTimeBefore: beforeAtTime.value,
			getValueAtTimeAfter: afterAtTime.value,
			getValueAtTime: {
				available: afterAtTime.available,
				typeofValue: afterAtTime.typeofValue,
				before: beforeAtTime,
				after: afterAtTime,
				afterRestore: restoreAtTime
			},
			timeVaryingBefore: beforeVarying.value,
			timeVaryingAfter: afterVarying.value,
			timeVarying: {
				before: beforeVarying,
				after: afterVarying,
				afterRestore: restoreVarying
			},
			dirtyBefore: beforeDirty,
			dirtyAfter: afterDirty,
			dirtyChanged: (function () {
				try {
					return !!(beforeDirty.observed && afterDirty.observed &&
						JSON.stringify(beforeDirty.probes) !== JSON.stringify(afterDirty.probes));
				} catch (dirtyCmpErr) {
					return false;
				}
			}()),
			dirty: {
				before: beforeDirty,
				after: afterDirty,
				afterRestore: restoreDirty,
				safelyObservable: beforeDirty.observed === true || afterDirty.observed === true
			},
			setValueReflection: reflection,
			setValueCall: {
				signature: "setValue(testValue, true)",
				argumentCount: 2,
				updateUI: true,
				oneArgumentCallNotAttempted: true,
				setValueAtKeyCalled: false
			},
			restore: {
				setValueThrew: restoreThrew,
				setValueReturn: restoreReturn,
				setValueException: restoreException,
				getValueAfterRestore: restoreGet.value,
				getValueAtTimeAfterRestore: restoreAtTime.value,
				verifiedRestore: valuesMatch(beforeGet.value, restoreGet.value)
			},
			conclusion: conclusion,
			component: resolved.effect && resolved.effect.displayName,
			componentMatchName: resolved.effect && resolved.effect.matchName || "",
			parameter: resolved.parameter && resolved.parameter.displayName,
			parameterMatchName: resolved.parameter && resolved.parameter.matchName || "",
			identity: resolved.identity || identity,
			parent: resolved.snapshot && resolved.snapshot.parent,
			group: resolved.snapshot && resolved.snapshot.group,
			hierarchyPath: resolved.snapshot && resolved.snapshot.hierarchyPath,
			resolvedFromInspect: picked.resolvedFromInspect === true,
			componentResolution: resolved.componentResolution,
			parameterResolution: resolved.parameterResolution,
			originalValue: beforeGet.value,
			testValue: test.value,
			afterTest: afterGet.value,
			restoredValue: restoreGet.value,
			verifiedRestore: valuesMatch(beforeGet.value, restoreGet.value)
		}, null, ident);
	}

	function hostDebugDiagnose(componentName, parameterName, componentMatchName, parameterMatchName) {
		var ident;
		var selected;
		var result;
		var payload;
		if (componentName && typeof componentName === "object") {
			ident = identityArgs(componentName);
		} else {
			ident = {
				componentDisplayName: String(componentName || ""),
				componentMatchName: String(componentMatchName || ""),
				parameterDisplayName: String(parameterName || ""),
				parameterMatchName: String(parameterMatchName || "")
			};
		}
		payload = stampDiagnose({
			ok: false,
			probeRan: false,
			settersCalled: false
		}, null, ident);
		if (typeof $ === "undefined" || !$._pickfx || typeof $._pickfx.firstSelectedAudioTrackItem !== "function") {
			payload.reason = "WRITE_FAILED";
			payload.detail = "host.jsx firstSelectedAudioTrackItem is not available.";
			return JSON.stringify(payload);
		}
		selected = $._pickfx.firstSelectedAudioTrackItem();
		if (!selected || !selected.ok) {
			payload.reason = (selected && selected.reason) || "NO_AUDIO_SELECTION";
			payload.detail = (selected && selected.detail) || "No selected audio TrackItem.";
			return JSON.stringify(payload);
		}
		result = diagnoseSetValue(selected.trackItem, ident);
		result = stampDiagnose(result, null, ident);
		if (typeof $._pickfx.jsonSafeParamResult === "function") {
			return JSON.stringify($._pickfx.jsonSafeParamResult(result));
		}
		return JSON.stringify(result);
	}

	function hostDebugRun(componentName, parameterName, componentMatchName, parameterMatchName) {
		var ident;
		var selected;
		var result;
		var payload;
		var wired = wiring();
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
		if (wired) {
			ident = wired.normalizeIdent(ident);
		}
		payload = {
			ok: false,
			operation: OPERATION,
			runtimePath: RUNTIME_PATH,
			resolverUsed: RESOLVER_USED,
			globalSearchUsed: false,
			usedQE: false,
			productionEnabled: false,
			componentResolution: {
				requestedDisplayName: ident.componentDisplayName || ident.component || "",
				requestedMatchName: ident.componentMatchName || "",
				resolved: false,
				resolvedDisplayName: "",
				resolvedMatchName: ""
			},
			parameterResolution: {
				requestedDisplayName: ident.parameterDisplayName || ident.parameter || "",
				requestedMatchName: ident.parameterMatchName || "",
				scope: "component",
				globalSearchUsed: false,
				matchesInsideComponent: 0
			}
		};
		payload = stamp(payload, null, ident);
		if (typeof $ === "undefined" || !$._pickfx || typeof $._pickfx.firstSelectedAudioTrackItem !== "function") {
			payload.reason = "WRITE_FAILED";
			payload.detail = "host.jsx firstSelectedAudioTrackItem is not available.";
			return JSON.stringify(payload);
		}
		selected = $._pickfx.firstSelectedAudioTrackItem();
		if (!selected || !selected.ok) {
			payload.reason = (selected && selected.reason) || "NO_AUDIO_SELECTION";
			payload.detail = (selected && selected.detail) || "No selected audio TrackItem.";
			return JSON.stringify(payload);
		}
		result = run(selected.trackItem, ident);
		result = stamp(result, {
			runtimePath: RUNTIME_PATH,
			resolverUsed: (result && result.resolverUsed) || RESOLVER_USED,
			globalSearchUsed: false
		}, ident);
		if (typeof $._pickfx.jsonSafeParamResult === "function") {
			return JSON.stringify($._pickfx.jsonSafeParamResult(result));
		}
		return JSON.stringify(result);
	}

	return {
		OPERATION: OPERATION,
		RUNTIME_PATH: RUNTIME_PATH,
		RESOLVER_USED: RESOLVER_USED,
		run: run,
		runOne: runOne,
		runAll: runAll,
		hostDebugRun: hostDebugRun,
		diagnoseSetValue: diagnoseSetValue,
		hostDebugDiagnose: hostDebugDiagnose,
		DIAGNOSE_OPERATION: DIAGNOSE_OPERATION,
		DIAGNOSE_RUNTIME_PATH: DIAGNOSE_RUNTIME_PATH,
		DIAGNOSE_HOST_FUNCTION: DIAGNOSE_HOST_FUNCTION
	};
}());

if (typeof $ !== "undefined") {
	$._pickfxAudioParameterWriteTest = AudioParameterWriteTest;
	if ($._pickfx) {
		$._pickfx.__audioWriteTestLoaded = true;
		$._pickfx.debugAudioParameterWriteTest = AudioParameterWriteTest.hostDebugRun;
		$._pickfx.testAudioParameterWrite = AudioParameterWriteTest.hostDebugRun;
		$._pickfx.debugAudioLevelSetValueDiagnose = AudioParameterWriteTest.hostDebugDiagnose;
	}
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = AudioParameterWriteTest;
}
