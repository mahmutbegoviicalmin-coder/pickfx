if (typeof $ !== "undefined" && $._pickfx) {
	$._pickfx.__enumWriteTestLoaded = true;
}

var EnumParameterWriteTest = (function () {
	var OPERATION = "enum.parameter.write.test";
	var WRITE_METHOD = "ComponentParam.setValue(value, true)";
	var RUNTIME_PATH = "index.html #test-enum-parameter-write-btn onclick invokeEnumParameterWriteTest → PremiereBridge.testEnumParameterWrite → $._pickfx.debugEnumParameterWriteTest → EnumParameterWriteTest.run → EnumParameterDiscover.resolve → ComponentParam.setValue(value, true)";
	var RESOLVER_USED = "EnumParameterDiscover.resolve";

	function wiring() {
		if (typeof EnumWriteTestWiring !== "undefined") {
			return EnumWriteTestWiring;
		}
		if (typeof $ !== "undefined" && $._pickfxEnumWriteTestWiring) {
			return $._pickfxEnumWriteTestWiring;
		}
		return null;
	}

	function discover() {
		if (typeof EnumParameterDiscover !== "undefined") {
			return EnumParameterDiscover;
		}
		if (typeof $ !== "undefined" && $._pickfxEnumParameterDiscover) {
			return $._pickfxEnumParameterDiscover;
		}
		return null;
	}

	function completeEnumOptions(meta) {
		var opts = meta && meta.options;
		var i;
		var out = [];
		if (!opts || opts.length < 2) {
			return [];
		}
		for (i = 0; i < opts.length; i++) {
			if (!opts[i] || opts[i].incomplete === true) {
				continue;
			}
			if (opts[i].value === undefined || opts[i].value === null) {
				continue;
			}
			out.push(opts[i]);
		}
		return out.length >= 2 ? out : [];
	}

	function pickAlternateOption(options, original) {
		var i;
		var val;
		for (i = 0; i < (options ? options.length : 0); i++) {
			val = options[i].value;
			if (original !== undefined && original !== null && typeof val !== typeof original) {
				continue;
			}
			if (val !== original) {
				return options[i];
			}
		}
		return null;
	}

	function valuesEqual(requested, actual) {
		return requested === actual;
	}

	function identityExtra(resolved, ident, extra) {
		var out = extra || {};
		out.component = resolved && resolved.effect ? resolved.effect.displayName : (ident && ident.componentDisplayName) || "";
		out.componentMatchName = resolved && resolved.effect ? (resolved.effect.matchName || "") : (ident && ident.componentMatchName) || "";
		out.parameter = resolved && resolved.parameter ? resolved.parameter.displayName : (ident && ident.parameterDisplayName) || "";
		out.parameterMatchName = resolved && resolved.parameter
			? (resolved.parameter.matchName || "")
			: (ident && ident.parameterMatchName) || "";
		out.identity = resolved && resolved.identity ? resolved.identity : ident;
		if (resolved) {
			out.componentResolution = resolved.componentResolution;
			out.parameterResolution = resolved.parameterResolution;
			out.resolverUsed = resolved.resolverUsed || RESOLVER_USED;
			out.globalSearchUsed = false;
			if (resolved.snapshot) {
				out.parent = resolved.snapshot.parent;
				out.group = resolved.snapshot.group;
				out.hierarchyPath = resolved.snapshot.hierarchyPath;
				out.hasGetValue = resolved.snapshot.hasGetValue;
				out.hasSetValue = resolved.snapshot.hasSetValue;
				out.typeMetadata = resolved.snapshot.typeMetadata;
				out.raw = resolved.snapshot.raw;
				out.reflection = resolved.snapshot.reflection;
				out.runtimeType = resolved.snapshot.runtimeType;
				out.enumMetadata = resolved.snapshot.enumMetadata;
				out.metadataSources = resolved.snapshot.metadataSources;
				out.enumValues = resolved.snapshot.enumValues;
				out.representation = resolved.snapshot.representation;
				out.classification = resolved.snapshot.classification;
				out.enumLike = resolved.snapshot.enumLike;
			}
		}
		return out;
	}

	function runEnumWrite(resolved, ident) {
		var param = resolved && resolved._param;
		var snapshot = resolved && resolved.snapshot;
		var classified;
		var options;
		var alternate;
		var original;
		var testValue;
		var afterTest;
		var restored;
		var verifiedTest;
		var verifiedRestore;
		var setReturn;
		if (!param) {
			return reject("PARAMETER_NOT_FOUND", identityExtra(resolved, ident, {
				detail: "Resolved enum parameter has no live ComponentParam."
			}), ident);
		}
		classified = discover() && discover().classifySnapshot
			? discover().classifySnapshot(snapshot)
			: { classification: "UNSUPPORTED_TYPE", reason: "UNSUPPORTED_TYPE", candidate: false };
		if (snapshot && snapshot.timeVarying === true) {
			return reject("PARAMETER_TIME_VARYING_UNSUPPORTED", identityExtra(resolved, ident, {
				originalValue: snapshot.currentValue,
				classification: classified.classification,
				timeVarying: true
			}), ident);
		}
		if (!snapshot || snapshot.hasGetValue !== true) {
			return reject("PARAMETER_NOT_WRITABLE", identityExtra(resolved, ident, {
				detail: "Parameter has no getValue().",
				classification: classified.classification
			}), ident);
		}
		if (snapshot.hasSetValue !== true) {
			return reject("PARAMETER_NOT_WRITABLE", identityExtra(resolved, ident, {
				detail: "Parameter has no setValue().",
				classification: classified.classification,
				originalValue: snapshot.currentValue
			}), ident);
		}
		options = completeEnumOptions(snapshot.enumMetadata);
		if (!options.length) {
			if (classified.classification === "ENUM_LIKE_NUMBER" || classified.reason === "ENUM_LIKE_NUMBER") {
				return reject("ENUM_LIKE_NUMBER", identityExtra(resolved, ident, {
					detail: "Numeric enum-like parameter has no safely enumerable option values. No guessed numeric write.",
					originalValue: snapshot.currentValue,
					classification: "ENUM_LIKE_NUMBER",
					enumLike: true,
					settersCalled: false
				}), ident);
			}
			return reject(classified.reason || "UNSUPPORTED_TYPE", identityExtra(resolved, ident, {
				detail: "No live enum metadata with at least two complete option values.",
				originalValue: snapshot.currentValue,
				classification: classified.classification || "MISSING_ENUM_METADATA",
				settersCalled: false
			}), ident);
		}
		if (classified.candidate !== true) {
			return reject(classified.reason || classified.classification || "UNSUPPORTED_TYPE", identityExtra(resolved, ident, {
				originalValue: snapshot.currentValue,
				classification: classified.classification,
				settersCalled: false
			}), ident);
		}
		try {
			original = param.getValue();
		} catch (getErr) {
			return reject("PARAMETER_NOT_WRITABLE", identityExtra(resolved, ident, {
				detail: "getValue() threw: " + String(getErr)
			}), ident);
		}
		alternate = pickAlternateOption(options, original);
		if (!alternate) {
			return reject("INVALID_VALUE", identityExtra(resolved, ident, {
				detail: "Live enum metadata does not expose a different valid option from the original value.",
				originalValue: original,
				enumValues: options,
				settersCalled: false
			}), ident);
		}
		testValue = alternate.value;
		try {
			setReturn = param.setValue(testValue, true);
		} catch (setErr) {
			return reject("WRITE_FAILED", identityExtra(resolved, ident, {
				detail: "setValue threw: " + String(setErr),
				originalValue: original,
				testValue: testValue,
				settersCalled: true
			}), ident);
		}
		try {
			afterTest = param.getValue();
		} catch (afterErr) {
			try {
				param.setValue(original, true);
			} catch (ignoreRestore) {}
			return reject("VALUE_NOT_VERIFIED", identityExtra(resolved, ident, {
				detail: "getValue() after test write threw: " + String(afterErr),
				originalValue: original,
				testValue: testValue,
				setReturn: setReturn,
				settersCalled: true
			}), ident);
		}
		verifiedTest = valuesEqual(testValue, afterTest);
		try {
			param.setValue(original, true);
		} catch (restoreErr) {
			return reject("WRITE_FAILED", identityExtra(resolved, ident, {
				detail: "restore setValue threw: " + String(restoreErr),
				originalValue: original,
				testValue: testValue,
				afterTest: afterTest,
				verifiedTest: verifiedTest,
				settersCalled: true
			}), ident);
		}
		try {
			restored = param.getValue();
		} catch (restoreReadErr) {
			return reject("VALUE_NOT_VERIFIED", identityExtra(resolved, ident, {
				detail: "getValue() after restore threw: " + String(restoreReadErr),
				originalValue: original,
				testValue: testValue,
				afterTest: afterTest,
				verifiedTest: verifiedTest,
				settersCalled: true
			}), ident);
		}
		verifiedRestore = valuesEqual(original, restored);
		if (verifiedTest !== true || verifiedRestore !== true) {
			return stamp({
				ok: false,
				reason: "VALUE_NOT_VERIFIED",
				verified: false,
				verifiedTest: verifiedTest === true,
				verifiedRestore: verifiedRestore === true,
				settersCalled: true,
				usedQE: false,
				productionEnabled: false,
				recordConfirmed: false,
				status: "WRITE_TESTED",
				writeMethod: WRITE_METHOD,
				originalValue: original,
				testValue: testValue,
				afterTest: afterTest,
				restoredValue: restored,
				setReturn: setReturn,
				chosenOption: {
					value: alternate.value,
					label: alternate.label
				}
			}, identityExtra(resolved, ident), ident);
		}
		return stamp({
			ok: true,
			reason: undefined,
			verified: true,
			verifiedTest: true,
			verifiedRestore: true,
			settersCalled: true,
			usedQE: false,
			productionEnabled: false,
			recordConfirmed: false,
			status: "WRITE_CONFIRMED",
			writeMethod: WRITE_METHOD,
			originalValue: original,
			testValue: testValue,
			afterTest: afterTest,
			restoredValue: restored,
			setReturn: setReturn,
			chosenOption: {
				value: alternate.value,
				label: alternate.label
			},
			enumValues: options
		}, identityExtra(resolved, ident), ident);
	}

	function runOne(trackItem, componentHint, parameterName, parameterMatchName) {
		var finder = discover();
		var resolved;
		var ident;
		if (!finder || !finder.resolve) {
			return reject("WRITE_FAILED", {
				detail: "EnumParameterDiscover.js is not loaded."
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
				detail: (resolved && resolved.detail) || "Enum parameter not found.",
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
		return runEnumWrite(resolved, ident);
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
				id: "test-enum-parameter-write-btn",
				handler: "invokeEnumParameterWriteTest"
			};
			result.bridgePath = "enum-parameter-write-test";
			result.hostFunction = "debugEnumParameterWriteTest";
			result.debugButtonClicked = true;
			result.buttonId = "test-enum-parameter-write-btn";
			result.handler = "invokeEnumParameterWriteTest";
			result.enumWriteTestLoaded = typeof $ !== "undefined" && $._pickfx && $._pickfx.__enumWriteTestLoaded === true;
			result.enumWriteTestFunctionAvailable = true;
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
		result.bridgePath = "enum-parameter-write-test";
		result.hostFunction = "debugEnumParameterWriteTest";
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
		var rows;
		var seen;
		var key;
		var lists;
		var l;
		if (!finder || !finder.inspect) {
			return reject("WRITE_FAILED", {
				detail: "EnumParameterDiscover.js is not loaded."
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
		rows = [];
		seen = {};
		lists = [report.candidates || [], report.blendModeMatches || []];
		for (l = 0; l < lists.length; l++) {
			for (i = 0; i < lists[l].length; i++) {
				row = lists[l][i];
				if (!row || !row.displayName) {
					continue;
				}
				key = String(row.componentDisplayName || "") + "\0" +
					String(row.componentMatchName || "") + "\0" +
					String(row.displayName || "") + "\0" +
					String(row.matchName || "");
				if (seen[key]) {
					continue;
				}
				seen[key] = true;
				rows.push(row);
			}
		}
		for (i = 0; i < rows.length; i++) {
			row = rows[i];
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
		if (typeof $ === "undefined" || !$._pickfx || typeof $._pickfx.firstSelectedVideoTrackItem !== "function") {
			payload.reason = "WRITE_FAILED";
			payload.detail = "host.jsx firstSelectedVideoTrackItem is not available.";
			return JSON.stringify(payload);
		}
		selected = $._pickfx.firstSelectedVideoTrackItem();
		if (!selected || !selected.ok) {
			payload.reason = (selected && selected.reason) || "NO_VIDEO_SELECTION";
			payload.detail = (selected && selected.detail) || "No selected video TrackItem.";
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
		hostDebugRun: hostDebugRun
	};
}());

if (typeof $ !== "undefined") {
	$._pickfxEnumParameterWriteTest = EnumParameterWriteTest;
	if ($._pickfx) {
		$._pickfx.__enumWriteTestLoaded = true;
		$._pickfx.debugEnumParameterWriteTest = EnumParameterWriteTest.hostDebugRun;
		$._pickfx.testEnumParameterWrite = EnumParameterWriteTest.hostDebugRun;
	}
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = EnumParameterWriteTest;
}
