if (typeof $ !== "undefined" && $._pickfx) {
	$._pickfx.__colorWriteTestLoaded = true;
}

var ColorParameterWriteTest = (function () {
	var OPERATION = "color.parameter.write.test";
	var WRITE_METHOD = "ComponentParam.setValue(value, true)";
	var RUNTIME_PATH = "index.html #test-color-parameter-write-btn onclick invokeColorParameterWriteTest → PremiereBridge.testColorParameterWrite → $._pickfx.debugColorParameterWriteTest → ColorParameterWriteTest.run → ColorParameterDiscover.resolve → ParameterWriteTest.runResolved";
	var RESOLVER_USED = "ColorParameterDiscover.resolve";

	function wiring() {
		if (typeof ColorWriteTestWiring !== "undefined") {
			return ColorWriteTestWiring;
		}
		if (typeof $ !== "undefined" && $._pickfxColorWriteTestWiring) {
			return $._pickfxColorWriteTestWiring;
		}
		return null;
	}

	function discover() {
		if (typeof ColorParameterDiscover !== "undefined") {
			return ColorParameterDiscover;
		}
		if (typeof $ !== "undefined" && $._pickfxColorParameterDiscover) {
			return $._pickfxColorParameterDiscover;
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
				id: "test-color-parameter-write-btn",
				handler: "invokeColorParameterWriteTest"
			};
			result.bridgePath = "color-parameter-write-test";
			result.hostFunction = "debugColorParameterWriteTest";
			result.debugButtonClicked = true;
			result.buttonId = "test-color-parameter-write-btn";
			result.handler = "invokeColorParameterWriteTest";
			result.colorWriteTestLoaded = typeof $ !== "undefined" && $._pickfx && $._pickfx.__colorWriteTestLoaded === true;
			result.colorWriteTestFunctionAvailable = true;
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
		result.bridgePath = "color-parameter-write-test";
		result.hostFunction = "debugColorParameterWriteTest";
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
				detail: "ColorParameterDiscover.js is not loaded."
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
				detail: (resolved && resolved.detail) || "Color parameter not found.",
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
				detail: "ColorParameterDiscover.js is not loaded."
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
	$._pickfxColorParameterWriteTest = ColorParameterWriteTest;
	if ($._pickfx) {
		$._pickfx.__colorWriteTestLoaded = true;
		$._pickfx.debugColorParameterWriteTest = ColorParameterWriteTest.hostDebugRun;
		$._pickfx.testColorParameterWrite = ColorParameterWriteTest.hostDebugRun;
	}
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = ColorParameterWriteTest;
}
