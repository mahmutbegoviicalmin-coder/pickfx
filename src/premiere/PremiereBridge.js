var PremiereBridge = (function () {
	function parseEvalResult(result) {
		if (result === EvalScript_ErrMessage) {
			return {
				ok: false,
				error: "EvalScript error. host.jsx may not be loaded."
			};
		}

		try {
			return JSON.parse(result);
		} catch (e) {
			return {
				ok: false,
				error: "Could not parse ExtendScript JSON.",
				raw: result
			};
		}
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

	function setClipParameter(csInterface, parameterName, input, expectedType, done) {
		var script = "$._pickfx.setClipParameter(" +
			JSON.stringify(parameterName) + ", " +
			JSON.stringify(input) + ")";
		csInterface.evalScript(script, function (result) {
			done(parseEvalResult(result));
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
		findTypedCandidates: findTypedCandidates
	};
}());
