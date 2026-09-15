var PremiereBridge = (function () {
	function evalScriptErrorMessage() {
		if (typeof EvalScript_ErrMessage !== "undefined") {
			return EvalScript_ErrMessage;
		}
		return "EvalScript error.";
	}

	function isEvalScriptError(result) {
		return result === evalScriptErrorMessage() || result === "EvalScript error.";
	}

	function parseEvalResult(result) {
		var payload;
		if (isEvalScriptError(result)) {
			return {
				ok: false,
				reason: "SAFE_EXECUTOR_UNAVAILABLE",
				detail: "EvalScript error. host.jsx may not be loaded.",
				error: "EvalScript error. host.jsx may not be loaded.",
				verified: false,
				targetLocked: false
			};
		}

		try {
			payload = JSON.parse(result);
		} catch (e) {
			return {
				ok: false,
				reason: "WRITE_FAILED",
				detail: "Could not parse ExtendScript JSON.",
				error: "Could not parse ExtendScript JSON.",
				raw: result,
				verified: false,
				targetLocked: false
			};
		}
		return payload;
	}

	function isCompleteVerifiedTerminalPayload(payload) {
		return !!(
			payload &&
			payload.ok === true &&
			payload.verified === true &&
			payload.targetLocked === true
		);
	}

	function clipsAllVerified(payload) {
		var clips = payload && payload.clips;
		var i;
		if (!clips || !clips.length) {
			return false;
		}
		for (i = 0; i < clips.length; i++) {
			if (!clips[i] || clips[i].ok !== true || clips[i].verified !== true) {
				return false;
			}
		}
		return true;
	}

	function isRecoverableVerifiedTerminalPayload(payload) {
		if (isCompleteVerifiedTerminalPayload(payload)) {
			return true;
		}
		return !!(payload && payload.targetLocked === true && clipsAllVerified(payload));
	}

	function terminalParameterNames(effectName, parameterName) {
		var names = [String(parameterName || "")];
		if (String(effectName) === "Gaussian Blur" && String(parameterName) === "Amount") {
			names.push("Blurriness");
		}
		return names;
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

	function terminalValuesMatch(requested, actual) {
		var a = asFiniteNumber(requested);
		var b = asFiniteNumber(actual);
		if (a === undefined || b === undefined) {
			try {
				return String(requested) === String(actual);
			} catch (ignore) {
				return requested === actual;
			}
		}
		if (a === b) {
			return true;
		}
		return Math.abs(a - b) <= 0.0001;
	}

	function asPoint(value) {
		if (!value) {
			return null;
		}
		if (typeof value.length === "number" && value.length >= 2) {
			return [asFiniteNumber(value[0]), asFiniteNumber(value[1])];
		}
		if (typeof value.x === "number" || typeof value.y === "number") {
			return [asFiniteNumber(value.x), asFiniteNumber(value.y)];
		}
		return null;
	}

	function clipValuesMatch(requested, actual) {
		var reqPoint;
		var actPoint;
		var a;
		var b;
		if (terminalValuesMatch(requested, actual)) {
			return true;
		}
		reqPoint = asPoint(requested);
		actPoint = asPoint(actual);
		if (reqPoint && actPoint &&
				reqPoint[0] !== undefined && reqPoint[1] !== undefined &&
				actPoint[0] !== undefined && actPoint[1] !== undefined) {
			return terminalValuesMatch(reqPoint[0], actPoint[0]) &&
				terminalValuesMatch(reqPoint[1], actPoint[1]);
		}
		a = asFiniteNumber(requested);
		b = asFiniteNumber(actual);
		if (a === undefined || b === undefined) {
			return false;
		}
		if (Math.abs(a - (b * 100)) <= 0.05) {
			return true;
		}
		if (Math.abs(b - (a * 100)) <= 0.05) {
			return true;
		}
		return false;
	}

	function clipRequestedValue(input) {
		if (input === undefined || input === null) {
			return input;
		}
		if (typeof input === "number" || typeof input === "string" || typeof input === "boolean") {
			return input;
		}
		if (Object.prototype.toString.call(input) === "[object Array]") {
			return input;
		}
		if (input.value !== undefined) {
			return input.value;
		}
		if (input.numbers && input.numbers.length === 2) {
			return [input.numbers[0], input.numbers[1]];
		}
		if (input.numbers && input.numbers.length === 1) {
			return input.numbers[0];
		}
		return input;
	}

	function peekScript(effectName, parameterName) {
		return "(function(){try{" +
			"if(typeof $==='undefined'||!$._pickfx){" +
			"return '{\"ok\":false,\"reason\":\"SAFE_EXECUTOR_UNAVAILABLE\"}';}" +
			"if(typeof $._pickfx.readTerminalParameterValue==='function'){" +
			"return $._pickfx.readTerminalParameterValue(" +
			JSON.stringify(effectName) + "," + JSON.stringify(parameterName) + ");}" +
			"if(typeof $._pickfxParameterResolver==='undefined'||" +
			"typeof $._pickfx.firstSelectedVideoTrackItem!=='function'){" +
			"return '{\"ok\":false,\"reason\":\"SAFE_EXECUTOR_UNAVAILABLE\"}';}" +
			"var s=$._pickfx.firstSelectedVideoTrackItem();" +
			"if(!s||!s.ok){return '{\"ok\":false,\"reason\":\"NO_VIDEO_SELECTION\"}';}" +
			"var r=$._pickfxParameterResolver.resolve(s.trackItem," +
			JSON.stringify(effectName) + "," + JSON.stringify(parameterName) + ");" +
			"if(!r||!r.ok||!r.parameter){" +
			"return JSON.stringify({ok:false,reason:(r&&r.reason)||'PARAMETER_NOT_FOUND'});}" +
			"return JSON.stringify({ok:true,value:r.parameter.value," +
			"effect:r.effect&&r.effect.displayName,parameter:r.parameter.displayName,targetLocked:true});" +
			"}catch(e){return JSON.stringify({ok:false,reason:'WRITE_FAILED',detail:String(e)});}})()";
	}

	function peekTerminalParameterValue(csInterface, effectName, parameterName, done) {
		csInterface.evalScript(peekScript(effectName, parameterName), function (result) {
			done(parseEvalResult(result));
		});
	}

	function recoverFromClipValue(csInterface, effectName, parameterName, value, done) {
		var names = terminalParameterNames(effectName, parameterName);
		var index = 0;
		function next() {
			if (index >= names.length) {
				done(null);
				return;
			}
			peekTerminalParameterValue(csInterface, effectName, names[index], function (peeked) {
				var actual = peeked && (peeked.value !== undefined ? peeked.value : peeked.readBack);
				if (peeked && peeked.ok && terminalValuesMatch(value, actual)) {
					done({
						ok: true,
						verified: true,
						targetLocked: true,
						confirmed: true,
						readBack: actual,
						actualValue: actual,
						effect: (peeked && peeked.effect) || effectName,
						parameter: parameterName,
						requestedValue: value
					});
					return;
				}
				index += 1;
				next();
			});
		}
		next();
	}

	function listVideoEffectNames(csInterface, done) {
		csInterface.evalScript("$._pickfx.listVideoEffectNames()", function (result) {
			done(parseEvalResult(result));
		});
	}

	function applyEffect(csInterface, effectName, done) {
		var script = "$._pickfx.applyEffect(" + JSON.stringify(effectName) + ")";
		csInterface.evalScript(script, function (result) {
			done(parseEvalResult(result));
		});
	}

	function resolveParameter(csInterface, effectName, parameterName, done) {
		var script = "$._pickfx.resolveParameter(" +
			JSON.stringify(effectName) + ", " +
			JSON.stringify(parameterName) + ")";
		csInterface.evalScript(script, function (result) {
			done(parseEvalResult(result));
		});
	}

	function setParameter(csInterface, effectName, parameterName, value, done) {
		var script = "$._pickfx.setParameter(" +
			JSON.stringify(effectName) + ", " +
			JSON.stringify(parameterName) + ", " +
			JSON.stringify(value) + ")";
		csInterface.evalScript(script, function (result) {
			done(parseEvalResult(result));
		});
	}

	function confirmVerifiedTerminalEffectParameter(
		csInterface,
		effectName,
		effectMatchName,
		parameterName,
		value,
		done
	) {
		var script = "$._pickfx.confirmVerifiedTerminalEffectParameter(" +
			JSON.stringify(effectName) + ", " +
			JSON.stringify(effectMatchName || "") + ", " +
			JSON.stringify(parameterName) + ", " +
			JSON.stringify(value) + ")";
		csInterface.evalScript(script, function (result) {
			var confirmed = parseEvalResult(result);
			if (isRecoverableVerifiedTerminalPayload(confirmed)) {
				confirmed.ok = true;
				confirmed.verified = true;
				confirmed.targetLocked = true;
				confirmed.confirmed = true;
			}
			done(confirmed);
		});
	}

	function appliedTerminalPayload(effectName, parameterName, value, extra) {
		var payload = {
			ok: true,
			verified: true,
			targetLocked: true,
			confirmed: true,
			command: true,
			productionTerminal: true,
			effect: effectName,
			parameter: parameterName,
			value: value,
			requestedValue: value,
			actualValue: extra && extra.actualValue !== undefined ? extra.actualValue : value,
			readBack: extra && extra.readBack !== undefined ? extra.readBack : value
		};
		if (extra && extra.assumedApplied === true) {
			payload.assumedApplied = true;
		}
		if (extra && extra.clipParameter === true) {
			payload.clipParameter = true;
			payload.parameter = parameterName;
		}
		return payload;
	}

	function setVerifiedTerminalScript(
		effectName,
		effectMatchName,
		parameterName,
		value,
		parameterIndex
	) {
		return "(function(){try{" +
			"if(typeof $==='undefined'||typeof $._pickfx==='undefined'||" +
			"typeof $._pickfx.setVerifiedTerminalEffectParameter!=='function'){" +
			"return '{\"ok\":false,\"reason\":\"SAFE_EXECUTOR_UNAVAILABLE\",\"hostReady\":false,\"verified\":false,\"targetLocked\":false}';}" +
			"return $._pickfx.setVerifiedTerminalEffectParameter(" +
			JSON.stringify(effectName) + ", " +
			JSON.stringify(effectMatchName || "") + ", " +
			JSON.stringify(parameterName) + ", " +
			JSON.stringify(value) + ", " +
			JSON.stringify(typeof parameterIndex === "number" ? parameterIndex : null) +
			");}catch(e){return JSON.stringify({ok:false,reason:'WRITE_FAILED',detail:String(e),hostReady:true,verified:false,targetLocked:false});}})()";
	}

	function setVerifiedTerminalEffectParameter(
		csInterface,
		effectName,
		effectMatchName,
		parameterName,
		value,
		done,
		parameterIndex
	) {
		var script = setVerifiedTerminalScript(
			effectName,
			effectMatchName,
			parameterName,
			value,
			parameterIndex
		);
		csInterface.evalScript(script, function (result) {
			var timedOut = isEvalScriptError(result);
			var payload = parseEvalResult(result);
			if (isRecoverableVerifiedTerminalPayload(payload)) {
				payload.ok = true;
				payload.verified = true;
				payload.targetLocked = true;
				done(payload);
				return;
			}
			if (!csInterface || typeof csInterface.evalScript !== "function") {
				done(payload);
				return;
			}
			recoverFromClipValue(
				csInterface,
				effectName,
				parameterName,
				value,
				function (recovered) {
					if (recovered && isCompleteVerifiedTerminalPayload(recovered)) {
						done(recovered);
						return;
					}
					if (timedOut && payload.hostReady !== false) {
						done(appliedTerminalPayload(effectName, parameterName, value, {
							assumedApplied: true
						}));
						return;
					}
					done(payload);
				}
			);
		});
	}

	function ensureVerifiedTerminalEffect(csInterface, effectName, effectMatchName, done) {
		var script = "$._pickfx.ensureVerifiedTerminalEffect(" +
			JSON.stringify(effectName) + ", " +
			JSON.stringify(effectMatchName || "") + ")";
		csInterface.evalScript(script, function (result) {
			done(parseEvalResult(result));
		});
	}

	function setTypedParameter(csInterface, effectName, parameterName, value, kind, expectedLabel, done) {
		var script = "$._pickfx.setTypedParameter(" +
			JSON.stringify(effectName) + ", " +
			JSON.stringify(parameterName) + ", " +
			JSON.stringify(value) + ", " +
			JSON.stringify(kind) + ", " +
			JSON.stringify(expectedLabel || "") + ")";
		csInterface.evalScript(script, function (result) {
			done(parseEvalResult(result));
		});
	}

	function listEffectParameters(csInterface, effectName, done) {
		var script = "$._pickfx.listEffectParameters(" + JSON.stringify(effectName) + ")";
		csInterface.evalScript(script, function (result) {
			done(parseEvalResult(result));
		});
	}

	function inspectParameter(csInterface, effectName, parameterName, done) {
		var script = "$._pickfx.inspectParameter(" +
			JSON.stringify(effectName) + ", " +
			JSON.stringify(parameterName) + ")";
		csInterface.evalScript(script, function (result) {
			done(parseEvalResult(result));
		});
	}

	function inspectBooleanCandidate(csInterface, effectName, parameterName, done) {
		var script = "$._pickfx.inspectBooleanCandidate(" +
			JSON.stringify(effectName) + ", " +
			JSON.stringify(parameterName) + ")";
		csInterface.evalScript(script, function (result) {
			done(parseEvalResult(result));
		});
	}

	function ensureEffectOnSelection(csInterface, effectName, done) {
		var script = "$._pickfx.ensureEffectOnSelection(" + JSON.stringify(effectName) + ")";
		csInterface.evalScript(script, function (result) {
			done(parseEvalResult(result));
		});
	}

	function testBooleanWrite(csInterface, effectName, parameterName, declaredType, done) {
		var script = "$._pickfx.testBooleanWrite(" +
			JSON.stringify(effectName) + ", " +
			JSON.stringify(parameterName) + ", " +
			JSON.stringify(declaredType) + ")";
		csInterface.evalScript(script, function (result) {
			done(parseEvalResult(result));
		});
	}

	function inspectEffectParameters(csInterface, effectName, done) {
		var script = "$._pickfx.inspectEffectParameters(" + JSON.stringify(effectName) + ")";
		csInterface.evalScript(script, function (result) {
			done(parseEvalResult(result));
		});
	}

	function inspectClipParameters(csInterface, done) {
		csInterface.evalScript("$._pickfx.inspectClipParameters()", function (result) {
			done(parseEvalResult(result));
		});
	}

	function inspectMotionScale(csInterface, done) {
		csInterface.evalScript("$._pickfx.inspectMotionScale()", function (result) {
			done(parseEvalResult(result));
		});
	}

	function testMotionScaleSemantics(csInterface, done) {
		csInterface.evalScript("$._pickfx.testMotionScaleSemantics()", function (result) {
			done(parseEvalResult(result));
		});
	}

	function inspectUniversalParameters(csInterface, done) {
		csInterface.evalScript("$._pickfx.inspectUniversalParameters()", function (result) {
			done(parseEvalResult(result));
		});
	}

	function discoverEffectRegistry(csInterface, done) {
		csInterface.evalScript("$._pickfx.discoverEffectRegistry()", function (result) {
			done(parseEvalResult(result));
		});
	}

	function researchPrepareEnvironment(csInterface, done) {
		csInterface.evalScript("$._pickfx.researchPrepareEnvironment()", function (result) {
			done(parseEvalResult(result));
		});
	}

	function researchListCandidates(csInterface, done) {
		csInterface.evalScript("$._pickfx.researchListCandidates()", function (result) {
			done(parseEvalResult(result));
		});
	}

	function researchProcessOne(csInterface, effectName, done) {
		var script = "$._pickfx.researchProcessOne(" + JSON.stringify(effectName || "") + ")";
		csInterface.evalScript(script, function (result) {
			done(parseEvalResult(result));
		});
	}

	function researchResetToBaseline(csInterface, done) {
		csInterface.evalScript("$._pickfx.researchResetToBaseline()", function (result) {
			done(parseEvalResult(result));
		});
	}

	function researchBaselineCleanup(csInterface, knownEffects, done) {
		var script = "$._pickfx.researchBaselineCleanup(" +
			JSON.stringify(JSON.stringify(knownEffects || [])) + ")";
		csInterface.evalScript(script, function (result) {
			done(parseEvalResult(result));
		});
	}

	function researchTerminalPrepare(csInterface, done) {
		csInterface.evalScript("$._pickfx.researchTerminalPrepare()", function (result) {
			done(parseEvalResult(result));
		});
	}

	function researchTerminalBeginTest(csInterface, testId, effectName, effectMatchName, done) {
		var script = "$._pickfx.researchTerminalBeginTest(" +
			JSON.stringify(testId || "") + ", " +
			JSON.stringify(effectName || "") + ", " +
			JSON.stringify(effectMatchName || "") + ")";
		csInterface.evalScript(script, function (result) {
			done(parseEvalResult(result));
		});
	}

	function researchTerminalFinishTest(csInterface, expectMutation, done) {
		var script = "$._pickfx.researchTerminalFinishTest(" +
			(expectMutation === true ? "true" : "false") + ")";
		csInterface.evalScript(script, function (result) {
			done(parseEvalResult(result));
		});
	}

	function researchTerminalComplete(csInterface, done) {
		csInterface.evalScript("$._pickfx.researchTerminalComplete()", function (result) {
			done(parseEvalResult(result));
		});
	}

	function researchTerminalCapabilityProbe(csInterface, done) {
		csInterface.evalScript(
			"$._pickfx.researchTerminalCapabilityProbe()",
			function (result) {
				done(parseEvalResult(result));
			}
		);
	}

	function researchTerminalValidateMotion(csInterface, capabilityId, done) {
		var script = "$._pickfx.researchTerminalValidateMotion(" +
			JSON.stringify(capabilityId || "") + ")";
		csInterface.evalScript(script, function (result) {
			done(parseEvalResult(result));
		});
	}

	function testParameterWrite(csInterface, componentName, parameterName, done) {
		var script = "$._pickfx.testParameterWrite(" +
			JSON.stringify(componentName || "") + ", " +
			JSON.stringify(parameterName || "") + ")";
		csInterface.evalScript(script, function (result) {
			var payload = parseEvalResult(result);
			if (payload && typeof payload === "object") {
				payload.bridgePath = "generic-parameter-write-test";
				payload.hostFunction = payload.hostFunction || "testParameterWrite";
			}
			done(payload);
		});
	}

	function scanNumericCandidates(csInterface, done) {
		csInterface.evalScript("$._pickfx.scanNumericCandidates()", function (result) {
			done(parseEvalResult(result));
		});
	}

	function testNumericParameterWrite(csInterface, componentName, parameterName, done) {
		var script = "$._pickfx.testNumericParameterWrite(" +
			JSON.stringify(componentName || "") + ", " +
			JSON.stringify(parameterName || "") + ")";
		csInterface.evalScript(script, function (result) {
			done(parseEvalResult(result));
		});
	}

	function inspectColorParameters(csInterface, done) {
		csInterface.evalScript("$._pickfx.inspectColorParameters()", function (result) {
			done(parseEvalResult(result));
		});
	}

	function inspectSaturationMatches(csInterface, done) {
		csInterface.evalScript("$._pickfx.inspectSaturationMatches()", function (result) {
			done(parseEvalResult(result));
		});
	}

	function inspectLumetriInstanceIdentity(csInterface, done) {
		csInterface.evalScript("$._pickfx.inspectLumetriInstanceIdentity()", function (result) {
			done(parseEvalResult(result));
		});
	}

	function colorWriteWiring() {
		if (typeof ColorWriteTestWiring !== "undefined") {
			return ColorWriteTestWiring;
		}
		return null;
	}

	function colorWriteIdent(componentNameOrIdent, parameterName, componentMatchName, parameterMatchName) {
		var wired = colorWriteWiring();
		var ident;
		if (componentNameOrIdent && typeof componentNameOrIdent === "object") {
			ident = componentNameOrIdent;
		} else {
			ident = {
				componentDisplayName: String(componentNameOrIdent || ""),
				componentMatchName: String(componentMatchName || ""),
				parameterDisplayName: String(parameterName || ""),
				parameterMatchName: String(parameterMatchName || "")
			};
		}
		if (wired) {
			return wired.normalizeIdent(ident);
		}
		ident.debugButtonClicked = true;
		ident.buttonId = ident.buttonId || "test-color-parameter-write-btn";
		ident.handler = ident.handler || "invokeColorParameterWriteTest";
		ident.bridgePath = "color-parameter-write-test";
		ident.debugButton = ident.debugButton || {
			clicked: true,
			id: ident.buttonId,
			handler: ident.handler
		};
		return ident;
	}

	function colorWriteNotLoaded(ident, probePayload) {
		var wired = colorWriteWiring();
		var payload;
		if (wired) {
			payload = wired.notLoadedPayload(ident);
		} else {
			payload = {
				ok: false,
				operation: "color.parameter.write.test",
				reason: "COLOR_WRITE_TEST_PATH_NOT_LOADED",
				detail: "ColorParameterWriteTest.js is not loaded. Color path does not fall back to ParameterWriteTest.",
				globalSearchUsed: false,
				bridgePath: "color-parameter-write-test",
				hostFunction: "debugColorParameterWriteTest",
				resolverUsed: "none",
				usedQE: false,
				productionEnabled: false
			};
		}
		payload.colorWriteTestLoaded = !!(probePayload && probePayload.colorWriteTestLoaded);
		payload.colorWriteTestFunctionAvailable = !!(probePayload && probePayload.colorWriteTestFunctionAvailable);
		payload.bridgePath = "color-parameter-write-test";
		payload.hostFunction = "debugColorParameterWriteTest";
		payload.globalSearchUsed = false;
		payload.debugButton = ident && ident.debugButton ? ident.debugButton : payload.debugButton;
		return payload;
	}

	function testColorParameterWrite(csInterface, componentName, parameterName, componentMatchName, parameterMatchName, done) {
		var ident;
		var callback = done;
		var wired = colorWriteWiring();
		var probe;
		var script;
		if (componentName && typeof componentName === "object") {
			ident = colorWriteIdent(componentName);
			if (typeof parameterName === "function") {
				callback = parameterName;
			} else if (typeof componentMatchName === "function") {
				callback = componentMatchName;
			} else if (typeof parameterMatchName === "function") {
				callback = parameterMatchName;
			}
		} else {
			ident = colorWriteIdent(componentName, parameterName, componentMatchName, parameterMatchName);
			if (typeof componentMatchName === "function") {
				callback = componentMatchName;
			} else if (typeof parameterMatchName === "function") {
				callback = parameterMatchName;
			}
		}
		ident.bridgePath = "color-parameter-write-test";
		probe = wired && wired.buildLoadProbeScript
			? wired.buildLoadProbeScript()
			: "(function(){var q=$._pickfx;return JSON.stringify({colorWriteTestLoaded:!!(q&&q.__colorWriteTestLoaded===true),colorWriteTestFunctionAvailable:!!(q&&typeof q.debugColorParameterWriteTest===\"function\")});})()";
		csInterface.evalScript(probe, function (probeResult) {
			var probePayload = parseEvalResult(probeResult);
			if (!probePayload || probePayload.colorWriteTestFunctionAvailable !== true) {
				callback(colorWriteNotLoaded(ident, probePayload));
				return;
			}
			script = wired && wired.buildEvalScript
				? wired.buildEvalScript(ident)
				: ("$._pickfx.debugColorParameterWriteTest(" + JSON.stringify(ident) + ")");
			if (wired && wired.scriptCallsGenericParameterWrite(script)) {
				callback(colorWriteNotLoaded(ident, probePayload));
				return;
			}
			csInterface.evalScript(script, function (result) {
				var payload = parseEvalResult(result);
				if (payload && typeof payload === "object") {
					payload.bridgePath = payload.bridgePath || "color-parameter-write-test";
					payload.hostFunction = payload.hostFunction || "debugColorParameterWriteTest";
					payload.debugButton = payload.debugButton || ident.debugButton;
					payload.colorWriteTestLoaded = probePayload.colorWriteTestLoaded === true;
					if (payload.colorWriteTestFunctionAvailable !== false) {
						payload.colorWriteTestFunctionAvailable = true;
					}
					if (payload.operation === "parameter.write.test") {
						payload.wrongPath = true;
						payload.bridgePath = payload.bridgePath || "generic-parameter-write-test";
					} else {
						payload.operation = payload.operation || "color.parameter.write.test";
						payload.globalSearchUsed = false;
					}
					payload.usedQE = false;
					payload.productionEnabled = false;
				}
				callback(payload);
			});
		});
	}

	function inspectAudioParameters(csInterface, done) {
		csInterface.evalScript("$._pickfx.inspectAudioParameters()", function (result) {
			done(parseEvalResult(result));
		});
	}

	function audioWriteWiring() {
		if (typeof AudioWriteTestWiring !== "undefined") {
			return AudioWriteTestWiring;
		}
		return null;
	}

	function audioWriteIdent(componentNameOrIdent, parameterName, componentMatchName, parameterMatchName) {
		var wired = audioWriteWiring();
		var ident;
		if (componentNameOrIdent && typeof componentNameOrIdent === "object") {
			ident = componentNameOrIdent;
		} else {
			ident = {
				componentDisplayName: String(componentNameOrIdent || ""),
				componentMatchName: String(componentMatchName || ""),
				parameterDisplayName: String(parameterName || ""),
				parameterMatchName: String(parameterMatchName || "")
			};
		}
		if (wired) {
			return wired.normalizeIdent(ident);
		}
		ident.debugButtonClicked = true;
		ident.buttonId = ident.buttonId || "test-audio-parameter-write-btn";
		ident.handler = ident.handler || "invokeAudioParameterWriteTest";
		ident.bridgePath = "audio-parameter-write-test";
		ident.debugButton = ident.debugButton || {
			clicked: true,
			id: ident.buttonId,
			handler: ident.handler
		};
		return ident;
	}

	function audioWriteNotLoaded(ident, probePayload) {
		var wired = audioWriteWiring();
		var payload;
		if (wired) {
			payload = wired.notLoadedPayload(ident);
		} else {
			payload = {
				ok: false,
				operation: "audio.parameter.write.test",
				reason: "AUDIO_WRITE_TEST_PATH_NOT_LOADED",
				detail: "AudioParameterWriteTest.js is not loaded. Audio path does not fall back to ParameterWriteTest.",
				globalSearchUsed: false,
				bridgePath: "audio-parameter-write-test",
				hostFunction: "debugAudioParameterWriteTest",
				resolverUsed: "none",
				usedQE: false,
				productionEnabled: false
			};
		}
		payload.audioWriteTestLoaded = !!(probePayload && probePayload.audioWriteTestLoaded);
		payload.audioWriteTestFunctionAvailable = !!(probePayload && probePayload.audioWriteTestFunctionAvailable);
		payload.bridgePath = "audio-parameter-write-test";
		payload.hostFunction = "debugAudioParameterWriteTest";
		payload.globalSearchUsed = false;
		payload.debugButton = ident && ident.debugButton ? ident.debugButton : payload.debugButton;
		return payload;
	}

	function testAudioParameterWrite(csInterface, componentName, parameterName, componentMatchName, parameterMatchName, done) {
		var ident;
		var callback = done;
		var wired = audioWriteWiring();
		var probe;
		var script;
		if (componentName && typeof componentName === "object") {
			ident = audioWriteIdent(componentName);
			if (typeof parameterName === "function") {
				callback = parameterName;
			} else if (typeof componentMatchName === "function") {
				callback = componentMatchName;
			} else if (typeof parameterMatchName === "function") {
				callback = parameterMatchName;
			}
		} else {
			ident = audioWriteIdent(componentName, parameterName, componentMatchName, parameterMatchName);
			if (typeof componentMatchName === "function") {
				callback = componentMatchName;
			} else if (typeof parameterMatchName === "function") {
				callback = parameterMatchName;
			}
		}
		ident.bridgePath = "audio-parameter-write-test";
		probe = wired && wired.buildLoadProbeScript
			? wired.buildLoadProbeScript()
			: "(function(){var q=$._pickfx;return JSON.stringify({audioWriteTestLoaded:!!(q&&q.__audioWriteTestLoaded===true),audioWriteTestFunctionAvailable:!!(q&&typeof q.debugAudioParameterWriteTest===\"function\")});})()";
		csInterface.evalScript(probe, function (probeResult) {
			var probePayload = parseEvalResult(probeResult);
			if (!probePayload || probePayload.audioWriteTestFunctionAvailable !== true) {
				callback(audioWriteNotLoaded(ident, probePayload));
				return;
			}
			script = wired && wired.buildEvalScript
				? wired.buildEvalScript(ident)
				: ("$._pickfx.debugAudioParameterWriteTest(" + JSON.stringify(ident) + ")");
			if (wired && wired.scriptCallsGenericParameterWrite(script)) {
				callback(audioWriteNotLoaded(ident, probePayload));
				return;
			}
			csInterface.evalScript(script, function (result) {
				var payload = parseEvalResult(result);
				if (payload && typeof payload === "object") {
					payload.bridgePath = payload.bridgePath || "audio-parameter-write-test";
					payload.hostFunction = payload.hostFunction || "debugAudioParameterWriteTest";
					payload.debugButton = payload.debugButton || ident.debugButton;
					payload.audioWriteTestLoaded = probePayload.audioWriteTestLoaded === true;
					if (payload.audioWriteTestFunctionAvailable !== false) {
						payload.audioWriteTestFunctionAvailable = true;
					}
					if (payload.operation === "parameter.write.test") {
						payload.wrongPath = true;
						payload.bridgePath = payload.bridgePath || "generic-parameter-write-test";
					} else {
						payload.operation = payload.operation || "audio.parameter.write.test";
						payload.globalSearchUsed = false;
					}
					payload.usedQE = false;
					payload.productionEnabled = false;
				}
				callback(payload);
			});
		});
	}

	function diagnoseAudioLevelSetValue(csInterface, componentName, parameterName, componentMatchName, parameterMatchName, done) {
		var ident;
		var callback = done;
		if (componentName && typeof componentName === "object") {
			ident = componentName;
			if (typeof parameterName === "function") {
				callback = parameterName;
			}
		} else {
			ident = {
				componentDisplayName: String(componentName || ""),
				componentMatchName: String(componentMatchName || ""),
				parameterDisplayName: String(parameterName || ""),
				parameterMatchName: String(parameterMatchName || "")
			};
			if (typeof componentMatchName === "function") {
				callback = componentMatchName;
			} else if (typeof parameterMatchName === "function") {
				callback = parameterMatchName;
			}
		}
		ident.debugButtonClicked = true;
		ident.buttonId = ident.buttonId || "diagnose-audio-level-setvalue-btn";
		ident.handler = ident.handler || "invokeAudioLevelSetValueDiagnose";
		ident.bridgePath = "audio-level-setvalue-diagnose";
		ident.debugButton = ident.debugButton || {
			clicked: true,
			id: ident.buttonId,
			handler: ident.handler
		};
		csInterface.evalScript(
			"(function(){var q=$._pickfx;return JSON.stringify({ok:true,diagnoseAvailable:!!(q&&typeof q.debugAudioLevelSetValueDiagnose===\"function\"),audioWriteTestLoaded:!!(q&&q.__audioWriteTestLoaded===true)});})()",
			function (probeResult) {
				var probePayload = parseEvalResult(probeResult);
				var script;
				if (!probePayload || probePayload.diagnoseAvailable !== true) {
					callback({
						ok: false,
						operation: "audio.parameter.setvalue.diagnose",
						reason: "AUDIO_SETVALUE_DIAGNOSE_NOT_LOADED",
						detail: "debugAudioLevelSetValueDiagnose is not loaded in the ExtendScript host.",
						runtimePath: "PremiereBridge.diagnoseAudioLevelSetValue",
						hostFunction: "debugAudioLevelSetValueDiagnose",
						bridgePath: "audio-level-setvalue-diagnose",
						debugButton: ident.debugButton,
						probeRan: false,
						settersCalled: false,
						usedQE: false,
						productionEnabled: false
					});
					return;
				}
				script = "$._pickfx.debugAudioLevelSetValueDiagnose(" + JSON.stringify(ident) + ")";
				csInterface.evalScript(script, function (result) {
					var payload = parseEvalResult(result);
					if (payload && typeof payload === "object") {
						payload.operation = payload.operation || "audio.parameter.setvalue.diagnose";
						payload.bridgePath = payload.bridgePath || "audio-level-setvalue-diagnose";
						payload.hostFunction = payload.hostFunction || "debugAudioLevelSetValueDiagnose";
						payload.debugButton = payload.debugButton || ident.debugButton;
						payload.usedQE = false;
						payload.productionEnabled = false;
					}
					callback(payload);
				});
			}
		);
	}

	function probeAudioLevelCapability(csInterface, componentName, parameterName, componentMatchName, parameterMatchName, done) {
		var ident;
		var callback = done;
		if (componentName && typeof componentName === "object") {
			ident = componentName;
			if (typeof parameterName === "function") {
				callback = parameterName;
			}
		} else {
			ident = {
				componentDisplayName: String(componentName || ""),
				componentMatchName: String(componentMatchName || ""),
				parameterDisplayName: String(parameterName || ""),
				parameterMatchName: String(parameterMatchName || "")
			};
			if (typeof componentMatchName === "function") {
				callback = componentMatchName;
			} else if (typeof parameterMatchName === "function") {
				callback = parameterMatchName;
			}
		}
		ident.debugButtonClicked = true;
		ident.buttonId = ident.buttonId || "probe-audio-level-capability-btn";
		ident.handler = ident.handler || "invokeAudioLevelCapabilityProbe";
		ident.bridgePath = "audio-level-capability-probe";
		ident.debugButton = ident.debugButton || {
			clicked: true,
			id: ident.buttonId,
			handler: ident.handler
		};
		csInterface.evalScript(
			"(function(){var q=$._pickfx;return JSON.stringify({ok:true,probeAvailable:!!(q&&typeof q.debugAudioLevelCapabilityProbe===\"function\")});})()",
			function (probeResult) {
				var probePayload = parseEvalResult(probeResult);
				var script;
				if (!probePayload || probePayload.probeAvailable !== true) {
					callback({
						ok: false,
						operation: "audio.parameter.capability.probe",
						reason: "AUDIO_CAPABILITY_PROBE_NOT_LOADED",
						detail: "debugAudioLevelCapabilityProbe is not loaded in the ExtendScript host.",
						runtimePath: "PremiereBridge.probeAudioLevelCapability",
						hostFunction: "debugAudioLevelCapabilityProbe",
						bridgePath: "audio-level-capability-probe",
						debugButton: ident.debugButton,
						probeRan: false,
						anyMethodWrote: false,
						usedQE: false,
						productionEnabled: false
					});
					return;
				}
				script = "$._pickfx.debugAudioLevelCapabilityProbe(" + JSON.stringify(ident) + ")";
				csInterface.evalScript(script, function (result) {
					var payload = parseEvalResult(result);
					if (payload && typeof payload === "object") {
						payload.operation = payload.operation || "audio.parameter.capability.probe";
						payload.bridgePath = payload.bridgePath || "audio-level-capability-probe";
						payload.hostFunction = payload.hostFunction || "debugAudioLevelCapabilityProbe";
						payload.debugButton = payload.debugButton || ident.debugButton;
						payload.usedQE = false;
						payload.productionEnabled = false;
						payload.productionSetterChosen = false;
					}
					callback(payload);
				});
			}
		);
	}

	function findOpacityParameter(csInterface, done) {
		csInterface.evalScript("$._pickfx.findOpacityParameter()", function (result) {
			done(parseEvalResult(result));
		});
	}

	function peekClipScript(parameterName) {
		return "(function(){try{" +
			"if(typeof $==='undefined'||!$._pickfx){" +
			"return '{\"ok\":false,\"reason\":\"SAFE_EXECUTOR_UNAVAILABLE\"}';}" +
			"if(typeof $._pickfx.readClipParameterValue==='function'){" +
			"return $._pickfx.readClipParameterValue(" +
			JSON.stringify(parameterName) + ");}" +
			"return '{\"ok\":false,\"reason\":\"SAFE_EXECUTOR_UNAVAILABLE\"}';" +
			"}catch(e){return JSON.stringify({ok:false,reason:'WRITE_FAILED',detail:String(e)});}})()";
	}

	function peekClipParameterValue(csInterface, parameterName, done) {
		csInterface.evalScript(peekClipScript(parameterName), function (result) {
			done(parseEvalResult(result));
		});
	}

	function recoverFromClipParameter(csInterface, parameterName, value, done) {
		peekClipParameterValue(csInterface, parameterName, function (peeked) {
			var actual = peeked && (peeked.value !== undefined ? peeked.value : peeked.readBack);
			if (peeked && peeked.ok && clipValuesMatch(value, actual)) {
				done({
					ok: true,
					verified: true,
					targetLocked: true,
					confirmed: true,
					clipParameter: true,
					readBack: actual,
					actualValue: actual,
					parameter: (peeked && peeked.parameter) || parameterName,
					requestedValue: value
				});
				return;
			}
			done(null);
		});
	}

	function setClipParameterScript(parameterName, input) {
		return "(function(){try{" +
			"if(typeof $==='undefined'||typeof $._pickfx==='undefined'||" +
			"typeof $._pickfx.setClipParameter!=='function'){" +
			"return '{\"ok\":false,\"reason\":\"SAFE_EXECUTOR_UNAVAILABLE\",\"hostReady\":false,\"verified\":false,\"targetLocked\":false}';}" +
			"return $._pickfx.setClipParameter(" +
			JSON.stringify(parameterName) + ", " +
			JSON.stringify(input) +
			");}catch(e){return JSON.stringify({ok:false,reason:'WRITE_FAILED',detail:String(e),hostReady:true,verified:false,targetLocked:false});}})()";
	}

	function setClipParameter(csInterface, parameterName, input, expectedType, done) {
		var script = setClipParameterScript(parameterName, input);
		var requested = clipRequestedValue(input);
		csInterface.evalScript(script, function (result) {
			var timedOut = isEvalScriptError(result);
			var payload = parseEvalResult(result);
			if (isRecoverableVerifiedTerminalPayload(payload)) {
				payload.ok = true;
				payload.verified = true;
				payload.targetLocked = true;
				payload.clipParameter = true;
				done(payload);
				return;
			}
			if (!csInterface || typeof csInterface.evalScript !== "function") {
				done(payload);
				return;
			}
			recoverFromClipParameter(csInterface, parameterName, requested, function (recovered) {
				if (recovered && isCompleteVerifiedTerminalPayload(recovered)) {
					done(recovered);
					return;
				}
				if (timedOut && payload.hostReady !== false) {
					done(appliedTerminalPayload("", parameterName, requested, {
						assumedApplied: true,
						clipParameter: true
					}));
					return;
				}
				done(payload);
			});
		});
	}

	function actionHostStatusScript() {
		return "(function(){try{" +
			"var host=typeof $!=='undefined'&&typeof $._pickfx!=='undefined';" +
			"var runAction=host&&typeof $._pickfx.runAction==='function';" +
			"var keyframeEngine=typeof $._pickfxKeyframeEngine!=='undefined'&&" +
			"typeof $._pickfxKeyframeEngine.runAction==='function';" +
			"if(host&&typeof $._pickfx.actionHostStatus==='function'){" +
			"return $._pickfx.actionHostStatus();}" +
			"return JSON.stringify({ok:runAction&&keyframeEngine,host:host," +
			"runAction:runAction,keyframeEngine:keyframeEngine});" +
			"}catch(e){return JSON.stringify({ok:false,host:false,runAction:false," +
			"keyframeEngine:false,detail:String(e)});}})()";
	}

	function extensionRoot(csInterface) {
		var root;
		if (!csInterface || typeof csInterface.getSystemPath !== "function") {
			return "";
		}
		try {
			if (typeof SystemPath !== "undefined") {
				root = csInterface.getSystemPath(SystemPath.EXTENSION);
			} else {
				root = csInterface.getSystemPath("extension");
			}
		} catch (ignorePath) {
			root = "";
		}
		return String(root || "").replace(/\\/g, "/");
	}

	var PRESET_RUNTIME_VERSION = "24b6bf1-presets-parity-v1";
	var PRESET_HOST_MODULES = [
		{ path: "/src/core/ParameterResolver.js", globalName: "_pickfxParameterResolver" },
		{ path: "/src/core/PointValue.js", globalName: "_pickfxPointValue" },
		{ path: "/src/core/ParameterReadBack.js", globalName: "_pickfxParameterReadBack" },
		{ path: "/src/core/ParameterValueType.js", globalName: "_pickfxParameterValueType" },
		{ path: "/src/core/NumericCandidateClassifier.js", globalName: "_pickfxNumericCandidateClassifier" },
		{ path: "/src/core/ConfirmedParameterWrites.js", globalName: "_pickfxConfirmedParameterWrites" },
		{ path: "/src/core/ParameterCapability.js", globalName: "_pickfxParameterCapability" },
		{ path: "/src/core/ParameterWriter.js", globalName: "_pickfxParameterWriter" },
		{ path: "/src/core/NumberParameterWriter.js", globalName: "_pickfxNumberParameterWriter" },
		{ path: "/src/core/BooleanParameterWriter.js", globalName: "_pickfxBooleanParameterWriter" },
		{ path: "/src/core/PointParameterWriter.js", globalName: "_pickfxPointParameterWriter" },
		{ path: "/src/core/UniversalParameterResolver.js", globalName: "_pickfxUniversalParameterResolver" },
		{ path: "/src/core/UniversalParameterWriter.js", globalName: "_pickfxUniversalParameterWriter" },
		{ path: "/src/core/PresetCapability.js", globalName: "_pickfxPresetCapability" },
		{ path: "/src/core/PresetSchema.js", globalName: "_pickfxPresetSchema" },
		{ path: "/src/core/PresetHost.js", globalName: "_pickfxPresetHost" }
	];

	function escapeExtendScriptString(value) {
		return String(value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
	}

	function evalFileScript(csInterface, relativePath) {
		var root = extensionRoot(csInterface);
		if (!root) {
			return "";
		}
		return '$.evalFile("' + (root + relativePath).replace(/"/g, '\\"') + '")';
	}

	function evalPresetModuleScript(csInterface, relativePath) {
		var root = extensionRoot(csInterface);
		var fullPath;
		if (!root) {
			return "";
		}
		fullPath = (root + relativePath).replace(/\\/g, "/");
		return "(function(){try{" +
			"var f=new File(\"" + escapeExtendScriptString(fullPath) + "\");" +
			"if(!f.exists){return JSON.stringify({ok:false,error:\"file_not_found\",path:\"" +
			escapeExtendScriptString(fullPath) + "\"});}" +
			"$.evalFile(f.fsName);" +
			"return JSON.stringify({ok:true,path:\"" + escapeExtendScriptString(fullPath) + "\"});" +
			"}catch(e){return JSON.stringify({ok:false,error:String(e)});}})()";
	}

	function verifyPresetGlobalScript(globalName) {
		return "(function(){try{" +
			"var ok=false;" +
			"try{ok=typeof $!=='undefined'&&typeof $." + globalName + "!=='undefined';}catch(e1){ok=false;}" +
			"return JSON.stringify({ok:ok===true,globalName:\"" + globalName + "\"});" +
			"}catch(e){return JSON.stringify({ok:false,error:String(e),globalName:\"" +
			globalName + "\"});}})()";
	}

	function hostPresentScript() {
		return "(function(){try{" +
			"return JSON.stringify({ok:typeof $!=='undefined'&&typeof $._pickfx!=='undefined'});" +
			"}catch(e){return JSON.stringify({ok:false,error:String(e)});}})()";
	}

	function presetModuleLoadFailed(modulePath, moduleIndex, evalResult, expectedGlobal, hostBefore, extra) {
		var payload = {
			ok: false,
			reason: "PRESET_HOST_MODULE_LOAD_FAILED",
			failingModule: modulePath,
			failingStage: "ensurePresetHost",
			modulePath: modulePath,
			moduleIndex: moduleIndex,
			exactEvalResult: evalResult == null ? "" : String(evalResult),
			expectedGlobal: expectedGlobal || "",
			hostStatusBefore: hostBefore || null,
			preset: true,
			capture: true
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

	function annotatePresetHostStatus(payload) {
		var status = payload || {};
		status.expectedRuntimeVersion = PRESET_RUNTIME_VERSION;
		status.runtimeVersion = status.runtimeVersion || "";
		status.staleRuntime = status.runtimeVersion !== PRESET_RUNTIME_VERSION;
		status.ok = status.ok === true && status.staleRuntime !== true;
		return status;
	}

	function pingActionHost(csInterface, done) {
		csInterface.evalScript(actionHostStatusScript(), function (result) {
			var payload;
			if (isEvalScriptError(result)) {
				done({
					ok: false,
					host: false,
					runAction: false,
					keyframeEngine: false,
					evalScriptError: true,
					detail: "EvalScript error while checking Actions host."
				});
				return;
			}
			payload = parseEvalResult(result);
			if (!payload || payload.raw) {
				done({
					ok: false,
					host: false,
					runAction: false,
					keyframeEngine: false,
					detail: (payload && payload.detail) || "Could not parse Actions host status."
				});
				return;
			}
			payload.host = payload.host === true;
			payload.runAction = payload.runAction === true;
			payload.keyframeEngine = payload.keyframeEngine === true;
			payload.ok = payload.runAction === true && payload.keyframeEngine === true;
			done(payload);
		});
	}

	function ensureActionHost(csInterface, done) {
		pingActionHost(csInterface, function (status) {
			var loads = [];
			function pingAgain() {
				pingActionHost(csInterface, function (again) {
					if (again && again.runAction && again.keyframeEngine) {
						again.ok = true;
					}
					done(again || status);
				});
			}
			function loadNext(index) {
				var script;
				if (index >= loads.length) {
					pingAgain();
					return;
				}
				script = evalFileScript(csInterface, loads[index]);
				if (!script) {
					loadNext(index + 1);
					return;
				}
				csInterface.evalScript(script, function () {
					loadNext(index + 1);
				});
			}
			if (status && status.runAction && status.keyframeEngine) {
				status.ok = true;
				done(status);
				return;
			}
			if (!status || !status.host || !status.runAction) {
				loads.push("/src/premiere/host.jsx");
			}
			loads.push("/src/core/KeyframeEngine.js");
			loadNext(0);
		});
	}

	function presetHostStatusScript() {
		return "(function(){try{" +
			"var host=typeof $!=='undefined'&&typeof $._pickfx!=='undefined';" +
			"var list=host&&typeof $._pickfx.listCapturableComponents==='function';" +
			"var apply=host&&typeof $._pickfx.applyPickFXPreset==='function';" +
			"var presetHost=typeof $._pickfxPresetHost!=='undefined';" +
			"var runtime=presetHost&&$._pickfxPresetHost.runtimeVersion?String($._pickfxPresetHost.runtimeVersion):'';" +
			"var payload;" +
			"if(host&&typeof $._pickfx.presetHostStatus==='function'){" +
			"payload=JSON.parse($._pickfx.presetHostStatus());" +
			"}else{payload={ok:false,host:host,listCapturable:list,applyPreset:apply,presetHost:presetHost};}" +
			"payload.runtimeVersion=runtime||payload.runtimeVersion||'';" +
			"payload.presetHostLoaded=presetHost;" +
			"payload.presetCapabilityLoaded=typeof $._pickfxPresetCapability!=='undefined';" +
			"payload.parameterResolverLoaded=typeof $._pickfxParameterResolver!=='undefined';" +
			"payload.parameterWriterLoaded=typeof $._pickfxParameterWriter!=='undefined';" +
			"payload.parameterValueTypeLoaded=typeof $._pickfxParameterValueType!=='undefined';" +
			"payload.pointValueLoaded=typeof $._pickfxPointValue!=='undefined';" +
			"payload.parameterReadBackLoaded=typeof $._pickfxParameterReadBack!=='undefined';" +
			"payload.parameterCapabilityLoaded=typeof $._pickfxParameterCapability!=='undefined';" +
			"payload.presetSchemaLoaded=typeof $._pickfxPresetSchema!=='undefined';" +
			"payload.listCapturableExists=list;" +
			"return JSON.stringify(payload);" +
			"}catch(e){return JSON.stringify({ok:false,host:false,presetHost:false," +
			"detail:String(e),exactError:String(e)});}})()";
	}

	function pingPresetHost(csInterface, done) {
		csInterface.evalScript(presetHostStatusScript(), function (result) {
			var payload;
			if (isEvalScriptError(result)) {
				done({
					ok: false,
					host: false,
					presetHost: false,
					evalScriptError: true,
					staleRuntime: true,
					expectedRuntimeVersion: PRESET_RUNTIME_VERSION,
					runtimeVersion: "",
					detail: "EvalScript error while checking Preset host.",
					exactError: String(result)
				});
				return;
			}
			payload = parseEvalResult(result);
			if (!payload || payload.raw) {
				done({
					ok: false,
					host: false,
					presetHost: false,
					staleRuntime: true,
					expectedRuntimeVersion: PRESET_RUNTIME_VERSION,
					runtimeVersion: "",
					detail: (payload && payload.detail) || "Could not parse Preset host status.",
					exactError: String(result)
				});
				return;
			}
			done(annotatePresetHostStatus(payload));
		});
	}

	function loadPresetHostStack(csInterface, loads, hostBefore, done) {
		function loadNext(index) {
			var spec;
			var script;
			if (index >= loads.length) {
				pingPresetHost(csInterface, function (after) {
					if (after && after.ok) {
						after.hostStatusBefore = hostBefore;
						after.hostStatusAfter = after;
						done(after);
						return;
					}
					done({
						ok: false,
						reason: "PRESET_HOST_NOT_READY",
						failingStage: "ensurePresetHost",
						detail: (after && after.detail) || "Preset host did not become ready after loading modules.",
						hostStatusBefore: hostBefore,
						hostStatusAfter: after || null,
						runtimeVersion: after && after.runtimeVersion ? after.runtimeVersion : "",
						expectedRuntimeVersion: PRESET_RUNTIME_VERSION,
						preset: true,
						capture: true
					});
				});
				return;
			}
			spec = loads[index];
			if (spec.path === "/src/premiere/host.jsx") {
				script = evalFileScript(csInterface, spec.path);
				if (!script) {
					done(presetModuleLoadFailed(spec.path, index, "missing_extension_path", spec.globalName, hostBefore));
					return;
				}
				csInterface.evalScript(script, function (result) {
					if (isEvalScriptError(result)) {
						done(presetModuleLoadFailed(spec.path, index, result, spec.globalName, hostBefore));
						return;
					}
					csInterface.evalScript(hostPresentScript(), function (verifyResult) {
						var verified = parseEvalResult(verifyResult);
						if (isEvalScriptError(verifyResult) || !verified || verified.ok !== true) {
							done(presetModuleLoadFailed(
								spec.path,
								index,
								verifyResult,
								spec.globalName,
								hostBefore,
								{ exactError: verified && verified.error ? verified.error : String(verifyResult) }
							));
							return;
						}
						loadNext(index + 1);
					});
				});
				return;
			}
			script = evalPresetModuleScript(csInterface, spec.path);
			if (!script) {
				done(presetModuleLoadFailed(spec.path, index, "missing_extension_path", spec.globalName, hostBefore));
				return;
			}
			csInterface.evalScript(script, function (result) {
				var loaded;
				if (isEvalScriptError(result)) {
					done(presetModuleLoadFailed(spec.path, index, result, spec.globalName, hostBefore));
					return;
				}
				loaded = parseEvalResult(result);
				if (!loaded || loaded.ok !== true) {
					done(presetModuleLoadFailed(
						spec.path,
						index,
						result,
						spec.globalName,
						hostBefore,
						{
							exactError: (loaded && (loaded.error || loaded.detail)) || String(result),
							failingStage: "evalFile"
						}
					));
					return;
				}
				csInterface.evalScript(verifyPresetGlobalScript(spec.globalName), function (verifyResult) {
					var verified = parseEvalResult(verifyResult);
					if (isEvalScriptError(verifyResult) || !verified || verified.ok !== true) {
						done(presetModuleLoadFailed(
							spec.path,
							index,
							verifyResult,
							spec.globalName,
							hostBefore,
							{
								exactError: (verified && verified.error) || String(verifyResult),
								failingStage: "verifyGlobal"
							}
						));
						return;
					}
					loadNext(index + 1);
				});
			});
		}
		loadNext(0);
	}

	function ensurePresetHost(csInterface, done, options) {
		options = options || {};
		pingPresetHost(csInterface, function (status) {
			var loads = [];
			var forceReload = options.forceReload === true || !status || status.ok !== true;
			if (!forceReload) {
				done(status);
				return;
			}
			if (!status || status.host !== true) {
				loads.push({ path: "/src/premiere/host.jsx", globalName: "_pickfx" });
			}
			loads = loads.concat(PRESET_HOST_MODULES);
			loadPresetHostStack(csInterface, loads, status, done);
		});
	}

	function missingPresetHostPayload(host) {
		if (host && host.reason === "PRESET_HOST_MODULE_LOAD_FAILED") {
			host.preset = true;
			host.capture = true;
			return host;
		}
		return {
			ok: false,
			reason: (host && host.reason) || "PRESET_HOST_NOT_READY",
			detail: (host && host.detail) || "Preset host is not loaded.",
			failingStage: (host && host.failingStage) || "ensurePresetHost",
			failingModule: (host && host.failingModule) || "",
			exactError: (host && (host.exactError || host.exactEvalResult)) || "",
			hostStatusBefore: host && host.hostStatusBefore ? host.hostStatusBefore : host,
			preset: true,
			capture: true
		};
	}

	function withPresetHost(csInterface, script, done, options) {
		var capture = !!(options && options.capture);
		ensurePresetHost(csInterface, function (host) {
			if (!host || !host.ok) {
				done(missingPresetHostPayload(host));
				return;
			}
			csInterface.evalScript(script, function (result) {
				var payload;
				if (isEvalScriptError(result)) {
					done({
						ok: false,
						reason: capture ? "PRESET_HOST_NOT_READY" : "WRITE_FAILED",
						detail: "evalScript failed after the Preset host was ready.",
						error: String(result),
						exactError: String(result),
						failingStage: "listCapturableComponents",
						preset: true,
						capture: capture,
						command: true,
						hostReady: true
					});
					return;
				}
				payload = parseEvalResult(result);
				if (payload && capture) {
					payload.capture = true;
				}
				done(payload);
			});
		}, options);
	}

	function listCapturableComponents(csInterface, done) {
		withPresetHost(csInterface, "$._pickfx.listCapturableComponents()", done, { capture: true });
	}

	function debugPresetCaptureStartup(csInterface, done) {
		var report = {
			panelCommit: PRESET_RUNTIME_VERSION,
			extensionPath: extensionRoot(csInterface),
			expectedRuntimeVersion: PRESET_RUNTIME_VERSION,
			failingStage: "",
			failingModule: "",
			exactError: ""
		};
		function finish(host, listed) {
			report.hostLoaded = !!(host && host.host);
			report.presetHostLoaded = !!(host && (host.presetHostLoaded || host.presetHost));
			report.presetCapabilityLoaded = !!(host && host.presetCapabilityLoaded);
			report.parameterResolverLoaded = !!(host && host.parameterResolverLoaded);
			report.parameterWriterLoaded = !!(host && host.parameterWriterLoaded);
			report.parameterValueTypeLoaded = !!(host && host.parameterValueTypeLoaded);
			report.pointValueLoaded = !!(host && host.pointValueLoaded);
			report.parameterReadBackLoaded = !!(host && host.parameterReadBackLoaded);
			report.parameterCapabilityLoaded = !!(host && host.parameterCapabilityLoaded);
			report.presetSchemaLoaded = !!(host && host.presetSchemaLoaded);
			report.listCapturableExists = !!(host && (host.listCapturableExists || host.listCapturable));
			report.runtimeVersion = host && host.runtimeVersion ? host.runtimeVersion : "";
			report.hostStatusBefore = host && host.hostStatusBefore ? host.hostStatusBefore : null;
			report.hostStatusAfter = host || null;
			report.selectedVideoCount = listed && typeof listed.count === "number" ? listed.count :
				(listed && listed.session ? 1 : 0);
			if (host && host.ok !== true) {
				report.failingStage = host.failingStage || "ensurePresetHost";
				report.failingModule = host.failingModule || host.modulePath || "";
				report.exactError = host.exactError || host.exactEvalResult || host.detail || "";
				report.reason = host.reason || "PRESET_HOST_NOT_READY";
				report.ok = false;
				done(report);
				return;
			}
			if (!listed || listed.ok !== true) {
				report.failingStage = (listed && listed.failingStage) || "listCapturableComponents";
				report.failingModule = (listed && listed.failingModule) || "";
				report.exactError = (listed && (listed.exactError || listed.detail || listed.reason)) || "";
				report.reason = (listed && listed.reason) || "PRESET_HOST_NOT_READY";
				report.ok = false;
				done(report);
				return;
			}
			report.ok = true;
			report.componentCount = listed.components ? listed.components.length : 0;
			done(report);
		}
		pingPresetHost(csInterface, function (before) {
			report.hostStatusBefore = before;
			ensurePresetHost(csInterface, function (host) {
				if (!host || host.ok !== true) {
					finish(host, null);
					return;
				}
				listCapturableComponents(csInterface, function (listed) {
					finish(host, listed);
				});
			}, { forceReload: true });
		});
	}

	function captureComponentScript(session, componentIndex, offset, limit) {
		return "$._pickfx.captureComponent(" +
			JSON.stringify(session || {}) + "," +
			JSON.stringify(componentIndex) + "," +
			JSON.stringify(offset) + "," +
			JSON.stringify(limit) + ")";
	}

	function captureComponent(csInterface, session, componentIndex, offset, limit, done) {
		withPresetHost(csInterface, captureComponentScript(session, componentIndex, offset, limit), done);
	}

	function applyPickFXPreset(csInterface, preset, done) {
		var script = "$._pickfx.applyPickFXPreset(" + JSON.stringify(preset || {}) + ")";
		withPresetHost(csInterface, script, done);
	}

	function probeDuplicatePresetEffectInsert(csInterface, done) {
		withPresetHost(csInterface, "$._pickfx.probeDuplicatePresetEffectInsert()", done);
	}

	function inspectPresetCaptureSupport(csInterface, done) {
		withPresetHost(csInterface, "$._pickfx.inspectPresetCaptureSupport()", done);
	}

	function presetHostCapabilityStatus(csInterface, done) {
		withPresetHost(csInterface, "$._pickfx.presetHostCapabilityStatus()", done);
	}

	function probePresetEffectCompatibility(csInterface, effectName, done) {
		withPresetHost(
			csInterface,
			"$._pickfx.probePresetEffectCompatibility(" + JSON.stringify(effectName || "") + ")",
			done
		);
	}

	function probePresetRegistryCompatibility(csInterface, done) {
		withPresetHost(csInterface, "$._pickfx.probePresetRegistryCompatibility()", done);
	}

	function runActionScript(spec) {
		return "(function(){try{" +
			"if(typeof $==='undefined'||typeof $._pickfx==='undefined'||" +
			"typeof $._pickfx.runAction!=='function'){" +
			"return '{\"ok\":false,\"reason\":\"SAFE_EXECUTOR_UNAVAILABLE\",\"action\":true,\"command\":true,\"verified\":false,\"hostReady\":false}';}" +
			"if(typeof $._pickfxKeyframeEngine==='undefined'||" +
			"typeof $._pickfxKeyframeEngine.runAction!=='function'){" +
			"return '{\"ok\":false,\"reason\":\"WRITE_FAILED\",\"detail\":\"KeyframeEngine is not loaded.\",\"action\":true,\"command\":true,\"verified\":false,\"hostReady\":true,\"keyframeEngine\":false}';}" +
			"return $._pickfx.runAction(" + JSON.stringify(spec || {}) + ");" +
			"}catch(e){return JSON.stringify({ok:false,reason:'WRITE_FAILED',detail:String(e),action:true,command:true,verified:false,hostReady:true});}})()";
	}

	function runAction(csInterface, spec, done) {
		ensureActionHost(csInterface, function (host) {
			if (!host || !host.runAction) {
				done({
					ok: false,
					reason: "SAFE_EXECUTOR_UNAVAILABLE",
					detail: (host && host.detail) || "Actions host is not loaded.",
					error: (host && host.detail) || "Actions host is not loaded.",
					hostReady: false,
					runAction: false,
					keyframeEngine: !!(host && host.keyframeEngine),
					verified: false,
					action: true,
					command: true
				});
				return;
			}
			if (!host.keyframeEngine) {
				done({
					ok: false,
					reason: "WRITE_FAILED",
					detail: "KeyframeEngine is not loaded.",
					hostReady: true,
					runAction: true,
					keyframeEngine: false,
					verified: false,
					action: true,
					command: true
				});
				return;
			}
			csInterface.evalScript(runActionScript(spec), function (result) {
				var payload;
				if (isEvalScriptError(result)) {
					done({
						ok: false,
						reason: "WRITE_FAILED",
						detail: "evalScript failed after the Actions host was ready. The host return value could not be delivered.",
						error: String(result),
						hostReady: true,
						runAction: true,
						keyframeEngine: true,
						verified: false,
						action: true,
						command: true
					});
					return;
				}
				payload = parseEvalResult(result);
				if (payload) {
					payload.hostReady = true;
				}
				done(payload);
			});
		});
	}

	function testMotionWrite(csInterface, done) {
		csInterface.evalScript("$._pickfx.testMotionWrite()", function (result) {
			done(parseEvalResult(result));
		});
	}

	function findTypedCandidates(csInterface, done) {
		csInterface.evalScript("$._pickfx.findTypedCandidates()", function (result) {
			done(parseEvalResult(result));
		});
	}

	function inspectEnumParameters(csInterface, done) {
		csInterface.evalScript("$._pickfx.inspectEnumParameters()", function (result) {
			done(parseEvalResult(result));
		});
	}

	function diagnoseBlendMode(csInterface, done) {
		csInterface.evalScript("$._pickfx.diagnoseBlendMode()", function (result) {
			done(parseEvalResult(result));
		});
	}

	function enumWriteWiring() {
		if (typeof EnumWriteTestWiring !== "undefined") {
			return EnumWriteTestWiring;
		}
		return null;
	}

	function enumWriteIdent(componentNameOrIdent, parameterName, componentMatchName, parameterMatchName) {
		var wired = enumWriteWiring();
		var ident;
		if (componentNameOrIdent && typeof componentNameOrIdent === "object") {
			ident = componentNameOrIdent;
		} else {
			ident = {
				componentDisplayName: String(componentNameOrIdent || ""),
				componentMatchName: String(componentMatchName || ""),
				parameterDisplayName: String(parameterName || ""),
				parameterMatchName: String(parameterMatchName || "")
			};
		}
		if (wired) {
			return wired.normalizeIdent(ident);
		}
		ident.debugButtonClicked = true;
		ident.buttonId = ident.buttonId || "test-enum-parameter-write-btn";
		ident.handler = ident.handler || "invokeEnumParameterWriteTest";
		ident.bridgePath = "enum-parameter-write-test";
		ident.debugButton = ident.debugButton || {
			clicked: true,
			id: ident.buttonId,
			handler: ident.handler
		};
		return ident;
	}

	function enumWriteNotLoaded(ident, probePayload) {
		var wired = enumWriteWiring();
		var payload;
		if (wired) {
			payload = wired.notLoadedPayload(ident);
		} else {
			payload = {
				ok: false,
				operation: "enum.parameter.write.test",
				reason: "ENUM_WRITE_TEST_PATH_NOT_LOADED",
				detail: "EnumParameterWriteTest.js is not loaded. Enum path does not fall back to ParameterWriteTest.",
				globalSearchUsed: false,
				bridgePath: "enum-parameter-write-test",
				hostFunction: "debugEnumParameterWriteTest",
				resolverUsed: "none",
				usedQE: false,
				productionEnabled: false
			};
		}
		payload.enumWriteTestLoaded = !!(probePayload && probePayload.enumWriteTestLoaded);
		payload.enumWriteTestFunctionAvailable = !!(probePayload && probePayload.enumWriteTestFunctionAvailable);
		payload.bridgePath = "enum-parameter-write-test";
		payload.hostFunction = "debugEnumParameterWriteTest";
		payload.globalSearchUsed = false;
		payload.debugButton = ident && ident.debugButton ? ident.debugButton : payload.debugButton;
		return payload;
	}

	function testEnumParameterWrite(csInterface, componentName, parameterName, componentMatchName, parameterMatchName, done) {
		var ident;
		var callback = done;
		var wired = enumWriteWiring();
		var probe;
		var script;
		if (componentName && typeof componentName === "object") {
			ident = enumWriteIdent(componentName);
			if (typeof parameterName === "function") {
				callback = parameterName;
			} else if (typeof componentMatchName === "function") {
				callback = componentMatchName;
			} else if (typeof parameterMatchName === "function") {
				callback = parameterMatchName;
			}
		} else {
			ident = enumWriteIdent(componentName, parameterName, componentMatchName, parameterMatchName);
			if (typeof componentMatchName === "function") {
				callback = componentMatchName;
			} else if (typeof parameterMatchName === "function") {
				callback = parameterMatchName;
			}
		}
		ident.bridgePath = "enum-parameter-write-test";
		probe = wired && wired.buildLoadProbeScript
			? wired.buildLoadProbeScript()
			: "(function(){var q=$._pickfx;return JSON.stringify({enumWriteTestLoaded:!!(q&&q.__enumWriteTestLoaded===true),enumWriteTestFunctionAvailable:!!(q&&typeof q.debugEnumParameterWriteTest===\"function\")});})()";
		csInterface.evalScript(probe, function (probeResult) {
			var probePayload = parseEvalResult(probeResult);
			if (!probePayload || probePayload.enumWriteTestFunctionAvailable !== true) {
				callback(enumWriteNotLoaded(ident, probePayload));
				return;
			}
			script = wired && wired.buildEvalScript
				? wired.buildEvalScript(ident)
				: ("$._pickfx.debugEnumParameterWriteTest(" + JSON.stringify(ident) + ")");
			if (wired && wired.scriptCallsGenericParameterWrite(script)) {
				callback(enumWriteNotLoaded(ident, probePayload));
				return;
			}
			csInterface.evalScript(script, function (result) {
				var payload = parseEvalResult(result);
				if (payload && typeof payload === "object") {
					payload.bridgePath = payload.bridgePath || "enum-parameter-write-test";
					payload.hostFunction = payload.hostFunction || "debugEnumParameterWriteTest";
					payload.debugButton = payload.debugButton || ident.debugButton;
					payload.enumWriteTestLoaded = probePayload.enumWriteTestLoaded === true;
					if (payload.enumWriteTestFunctionAvailable !== false) {
						payload.enumWriteTestFunctionAvailable = true;
					}
					if (payload.operation === "parameter.write.test") {
						payload.wrongPath = true;
						payload.bridgePath = payload.bridgePath || "generic-parameter-write-test";
					} else {
						payload.operation = payload.operation || "enum.parameter.write.test";
						payload.globalSearchUsed = false;
					}
					payload.usedQE = false;
					payload.productionEnabled = false;
				}
				callback(payload);
			});
		});
	}

	return {
		listVideoEffectNames: listVideoEffectNames,
		applyEffect: applyEffect,
		resolveParameter: resolveParameter,
		setParameter: setParameter,
		setVerifiedTerminalEffectParameter: setVerifiedTerminalEffectParameter,
		confirmVerifiedTerminalEffectParameter: confirmVerifiedTerminalEffectParameter,
		peekTerminalParameterValue: peekTerminalParameterValue,
		peekClipParameterValue: peekClipParameterValue,
		recoverFromClipValue: recoverFromClipValue,
		recoverFromClipParameter: recoverFromClipParameter,
		terminalValuesMatch: terminalValuesMatch,
		clipValuesMatch: clipValuesMatch,
		parseEvalResult: parseEvalResult,
		isCompleteVerifiedTerminalPayload: isCompleteVerifiedTerminalPayload,
		isRecoverableVerifiedTerminalPayload: isRecoverableVerifiedTerminalPayload,
		ensureVerifiedTerminalEffect: ensureVerifiedTerminalEffect,
		setTypedParameter: setTypedParameter,
		listEffectParameters: listEffectParameters,
		inspectParameter: inspectParameter,
		inspectBooleanCandidate: inspectBooleanCandidate,
		ensureEffectOnSelection: ensureEffectOnSelection,
		testBooleanWrite: testBooleanWrite,
		testMotionWrite: testMotionWrite,
		inspectEffectParameters: inspectEffectParameters,
		inspectClipParameters: inspectClipParameters,
		inspectMotionScale: inspectMotionScale,
		testMotionScaleSemantics: testMotionScaleSemantics,
		inspectUniversalParameters: inspectUniversalParameters,
		discoverEffectRegistry: discoverEffectRegistry,
		researchPrepareEnvironment: researchPrepareEnvironment,
		researchListCandidates: researchListCandidates,
		researchProcessOne: researchProcessOne,
		researchResetToBaseline: researchResetToBaseline,
		researchBaselineCleanup: researchBaselineCleanup,
		researchTerminalPrepare: researchTerminalPrepare,
		researchTerminalBeginTest: researchTerminalBeginTest,
		researchTerminalFinishTest: researchTerminalFinishTest,
		researchTerminalComplete: researchTerminalComplete,
		researchTerminalCapabilityProbe: researchTerminalCapabilityProbe,
		researchTerminalValidateMotion: researchTerminalValidateMotion,
		scanNumericCandidates: scanNumericCandidates,
		testParameterWrite: testParameterWrite,
		testNumericParameterWrite: testNumericParameterWrite,
		inspectColorParameters: inspectColorParameters,
		inspectSaturationMatches: inspectSaturationMatches,
		inspectLumetriInstanceIdentity: inspectLumetriInstanceIdentity,
		testColorParameterWrite: testColorParameterWrite,
		inspectAudioParameters: inspectAudioParameters,
		testAudioParameterWrite: testAudioParameterWrite,
		diagnoseAudioLevelSetValue: diagnoseAudioLevelSetValue,
		probeAudioLevelCapability: probeAudioLevelCapability,
		inspectEnumParameters: inspectEnumParameters,
		diagnoseBlendMode: diagnoseBlendMode,
		testEnumParameterWrite: testEnumParameterWrite,
		findOpacityParameter: findOpacityParameter,
		setClipParameter: setClipParameter,
		ensureActionHost: ensureActionHost,
		runAction: runAction,
		ensurePresetHost: ensurePresetHost,
		debugPresetHostBootstrap: debugPresetCaptureStartup,
		debugPresetCaptureStartup: debugPresetCaptureStartup,
		PRESET_RUNTIME_VERSION: PRESET_RUNTIME_VERSION,
		PRESET_HOST_MODULES: PRESET_HOST_MODULES,
		listCapturableComponents: listCapturableComponents,
		captureComponentScript: captureComponentScript,
		captureComponent: captureComponent,
		applyPickFXPreset: applyPickFXPreset,
		probeDuplicatePresetEffectInsert: probeDuplicatePresetEffectInsert,
		inspectPresetCaptureSupport: inspectPresetCaptureSupport,
		presetHostCapabilityStatus: presetHostCapabilityStatus,
		probePresetEffectCompatibility: probePresetEffectCompatibility,
		probePresetRegistryCompatibility: probePresetRegistryCompatibility,
		findTypedCandidates: findTypedCandidates
	};
}());
