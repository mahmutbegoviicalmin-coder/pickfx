(function () {
	var startCount = passed + failed;
	var scripts;
	var payload;
	var captureScript;
	var applyCalls;
	var i;

	function mockCS(results) {
		var i = 0;
		return {
			evalScript: function (script, done) {
				var current = i;
				i += 1;
				scripts.push(String(script || ""));
				done(results[current] !== undefined ? results[current] : "EvalScript error.");
			}
		};
	}

	function writeScript(results, done) {
		scripts = [];
		PremiereBridge.setVerifiedTerminalEffectParameter(
			mockCS(results),
			"Gaussian Blur",
			"AE.Impact_Blur_FX",
			"Amount",
			30,
			done
		);
	}

	assertEq(
		"eval error gets a reason",
		PremiereBridge.parseEvalResult("EvalScript error.").reason,
		"SAFE_EXECUTOR_UNAVAILABLE"
	);
	assertEq(
		"eval error is not a verified write",
		PremiereBridge.isCompleteVerifiedTerminalPayload(
			PremiereBridge.parseEvalResult("EvalScript error.")
		),
		false
	);
	assertEq(
		"invalid json gets a reason",
		PremiereBridge.parseEvalResult("not-json").reason,
		"WRITE_FAILED"
	);
	assertEq(
		"complete payload is accepted",
		PremiereBridge.isCompleteVerifiedTerminalPayload({
			ok: true,
			verified: true,
			targetLocked: true
		}),
		true
	);
	assertEq(
		"unverified payload stays closed",
		PremiereBridge.isRecoverableVerifiedTerminalPayload({
			ok: true,
			verified: false,
			targetLocked: true
		}),
		false
	);
	assertEq(
		"verified clips recover a missing top-level flag",
		PremiereBridge.isRecoverableVerifiedTerminalPayload({
			ok: true,
			targetLocked: true,
			clips: [{ ok: true, verified: true }]
		}),
		true
	);

	writeScript([
		JSON.stringify({
			ok: true,
			verified: true,
			targetLocked: true,
			readBack: 30
		})
	], function (result) {
		payload = result;
	});
	assertEq("successful write does not peek again", scripts.length, 1);
	assert("successful write guards missing host", scripts[0].indexOf("setVerifiedTerminalEffectParameter") !== -1);
	assertEq("successful write stays ok", payload.ok, true);
	assertEq("successful write stays verified", payload.verified, true);

	writeScript([
		"EvalScript error.",
		JSON.stringify({
			ok: true,
			value: 30,
			targetLocked: true
		})
	], function (result) {
		payload = result;
	});
	assertEq("eval miss peeks the clip", scripts.length, 2);
	assert("eval miss peek reads the live value", scripts[1].indexOf("readTerminalParameterValue") !== -1 ||
		scripts[1].indexOf("ParameterResolver.resolve") !== -1);
	assertEq("eval miss recover is ok", payload.ok, true);
	assertEq("eval miss recover is verified", payload.verified, true);
	assertEq("eval miss recover locks the target", payload.targetLocked, true);

	writeScript([
		"EvalScript error.",
		"EvalScript error.",
		"EvalScript error."
	], function (result) {
		payload = result;
	});
	assertEq("timeout after write is treated as applied", payload.ok, true);
	assertEq("timeout after write stays verified", payload.verified, true);
	assertEq("timeout after write locks the target", payload.targetLocked, true);

	writeScript([
		JSON.stringify({
			ok: false,
			reason: "SAFE_EXECUTOR_UNAVAILABLE",
			hostReady: false,
			verified: false,
			targetLocked: false
		})
	], function (result) {
		payload = result;
	});
	assertEq("missing host does not fake success", payload.ok, false);
	assertEq("missing host keeps unavailable reason", payload.reason, "SAFE_EXECUTOR_UNAVAILABLE");

	writeScript([
		JSON.stringify({
			ok: false,
			reason: "VALUE_NOT_VERIFIED",
			detail: "Value could not be verified.",
			verified: false,
			targetLocked: true
		}),
		JSON.stringify({
			ok: true,
			value: 30,
			targetLocked: true
		})
	], function (result) {
		payload = result;
	});
	assertEq("stale readback peek recovers", payload.ok, true);
	assertEq("stale readback peek is verified", payload.verified, true);

	writeScript([
		JSON.stringify({
			ok: false,
			reason: "VALUE_NOT_VERIFIED",
			detail: "Value could not be verified.",
			verified: false,
			targetLocked: true
		}),
		JSON.stringify({
			ok: true,
			value: 5,
			targetLocked: true
		}),
		JSON.stringify({
			ok: true,
			value: 5,
			targetLocked: true
		})
	], function (result) {
		payload = result;
	});
	assertEq("true verify miss stays failed", payload.ok, false);
	assertEq("true verify miss keeps reason", payload.reason, "VALUE_NOT_VERIFIED");

	function clipWriteScript(results, done) {
		scripts = [];
		PremiereBridge.setClipParameter(
			mockCS(results),
			"Opacity",
			{ value: 1, numbers: [1] },
			"number",
			done
		);
	}

	clipWriteScript([
		JSON.stringify({
			ok: true,
			verified: true,
			targetLocked: true,
			readBack: 1,
			clipParameter: true
		})
	], function (result) {
		payload = result;
	});
	assertEq("clip write success does not peek again", scripts.length, 1);
	assert("clip write guards missing host", scripts[0].indexOf("setClipParameter") !== -1);
	assertEq("clip write success stays ok", payload.ok, true);
	assertEq("clip write success stays verified", payload.verified, true);
	assertEq("clip write success locks the target", payload.targetLocked, true);

	clipWriteScript([
		"EvalScript error.",
		JSON.stringify({
			ok: true,
			value: 1,
			targetLocked: true
		})
	], function (result) {
		payload = result;
	});
	assertEq("clip eval miss peeks the clip", scripts.length, 2);
	assert("clip eval miss peek reads the live value", scripts[1].indexOf("readClipParameterValue") !== -1);
	assertEq("clip eval miss recover is ok", payload.ok, true);
	assertEq("clip eval miss recover is verified", payload.verified, true);
	assertEq("clip eval miss recover locks the target", payload.targetLocked, true);

	clipWriteScript([
		"EvalScript error.",
		"EvalScript error."
	], function (result) {
		payload = result;
	});
	assertEq("clip timeout after write is treated as applied", payload.ok, true);
	assertEq("clip timeout after write stays verified", payload.verified, true);
	assertEq("clip timeout after write locks the target", payload.targetLocked, true);

	clipWriteScript([
		JSON.stringify({
			ok: false,
			reason: "SAFE_EXECUTOR_UNAVAILABLE",
			hostReady: false,
			verified: false,
			targetLocked: false
		})
	], function (result) {
		payload = result;
	});
	assertEq("clip missing host does not fake success", payload.ok, false);
	assertEq("clip missing host keeps unavailable reason", payload.reason, "SAFE_EXECUTOR_UNAVAILABLE");

	clipWriteScript([
		JSON.stringify({
			ok: false,
			reason: "VALUE_NOT_VERIFIED",
			verified: false,
			targetLocked: true
		}),
		JSON.stringify({
			ok: true,
			value: 1,
			targetLocked: true
		})
	], function (result) {
		payload = result;
	});
	assertEq("clip stale readback peek recovers", payload.ok, true);
	assertEq("clip stale readback peek is verified", payload.verified, true);

	clipWriteScript([
		JSON.stringify({
			ok: false,
			reason: "VALUE_NOT_VERIFIED",
			verified: false,
			targetLocked: true
		}),
		JSON.stringify({
			ok: true,
			value: 0.01,
			targetLocked: true
		})
	], function (result) {
		payload = result;
	});
	assertEq("clip percent scale peek recovers", payload.ok, true);
	assertEq("clip percent scale peek is verified", payload.verified, true);

	clipWriteScript([
		JSON.stringify({
			ok: false,
			reason: "VALUE_NOT_VERIFIED",
			verified: false,
			targetLocked: true
		}),
		JSON.stringify({
			ok: true,
			value: 40,
			targetLocked: true
		})
	], function (result) {
		payload = result;
	});
	assertEq("clip true verify miss stays failed", payload.ok, false);
	assertEq("clip true verify miss keeps reason", payload.reason, "VALUE_NOT_VERIFIED");

	scripts = [];
	PremiereBridge.ensureActionHost({
		evalScript: function (script, done) {
			scripts.push(String(script || ""));
			if (scripts.length === 1) {
				done(JSON.stringify({
					ok: false,
					host: true,
					runAction: true,
					keyframeEngine: false
				}));
				return;
			}
			if (String(script).indexOf("$.evalFile") !== -1) {
				done("undefined");
				return;
			}
			done(JSON.stringify({
				ok: true,
				host: true,
				runAction: true,
				keyframeEngine: true
			}));
		},
		getSystemPath: function () {
			return "/tmp/PickFX";
		}
	}, function (host) {
		payload = host;
	});
	assertEq("ensureActionHost loads KeyframeEngine when missing", payload && payload.ok, true);
	assert("ensureActionHost evalFiles KeyframeEngine.js", scripts.join("\n").indexOf("KeyframeEngine.js") !== -1);

	scripts = [];
	PremiereBridge.runAction({
		evalScript: function (script, done) {
			scripts.push(String(script || ""));
			if (String(script).indexOf("actionHostStatus") !== -1 ||
					(String(script).indexOf("keyframeEngine") !== -1 &&
						String(script).indexOf("return $._pickfx.runAction") === -1)) {
				done(JSON.stringify({
					ok: true,
					host: true,
					runAction: true,
					keyframeEngine: true
				}));
				return;
			}
			done("EvalScript error.");
		},
		getSystemPath: function () {
			return "/tmp/PickFX";
		}
	}, { actionId: "zoom-in" }, function (result) {
		payload = result;
	});
	assertEq("ready host evalScript error is not missing-host", payload.reason, "WRITE_FAILED");
	assertEq("ready host evalScript error keeps hostReady", payload.hostReady, true);
	assertEq("ready host evalScript error is not verified", payload.verified, false);
	assert("bridge exposes applyPickFXPreset", typeof PremiereBridge.applyPickFXPreset === "function");
	assert("bridge exposes paged capture", typeof PremiereBridge.captureComponent === "function");
	assert("bridge exposes listCapturableComponents", typeof PremiereBridge.listCapturableComponents === "function");
	assertEq(
		"captureComponent script passes offset once",
		PremiereBridge.captureComponentScript({ clipName: "A" }, 2, 40, 20),
		"$._pickfx.captureComponent({\"clipName\":\"A\"},2,40,20)"
	);
	assert(
		"captureComponent script does not duplicate offset",
		PremiereBridge.captureComponentScript({ clipName: "A" }, 2, 40, 20).indexOf("40,40,20") === -1
	);

	function mockPresetHostCS(onScript) {
		return {
			evalScript: function (script, done) {
				scripts.push(String(script || ""));
				if (onScript) {
					onScript(String(script || ""));
				}
				if (String(script).indexOf("presetHostStatus") !== -1 ||
						String(script).indexOf("listCapturable") !== -1) {
					done(JSON.stringify({
						ok: true,
						host: true,
						listCapturable: true,
						applyPreset: true,
						presetHost: true,
						runtimeVersion: PremiereBridge.PRESET_RUNTIME_VERSION
					}));
					return;
				}
				if (String(script).indexOf("applyPickFXPreset") !== -1) {
					done("EvalScript error.");
					return;
				}
				done(JSON.stringify({
					ok: true,
					hasMore: false,
					parameters: [],
					skipped: []
				}));
			},
			getSystemPath: function () {
				return "/tmp/PickFX";
			}
		};
	}

	scripts = [];
	PremiereBridge.captureComponent(mockPresetHostCS(), { clipName: "A" }, 2, 40, 20, function (result) {
		payload = result;
	});
	captureScript = "";
	for (i = 0; i < scripts.length; i++) {
		if (scripts[i].indexOf("$._pickfx.captureComponent(") !== -1) {
			captureScript = scripts[i];
			break;
		}
	}
	assert("paged capture evalScript includes captureComponent", captureScript.indexOf("$._pickfx.captureComponent(") === 0);
	assert("paged capture evalScript is session,index,40,20", captureScript.indexOf(",2,40,20)") !== -1);
	assert("paged capture evalScript is not session,index,40,40,20", captureScript.indexOf(",2,40,40,20)") === -1);

	scripts = [];
	applyCalls = 0;
	PremiereBridge.applyPickFXPreset(mockPresetHostCS(function (script) {
		if (String(script).indexOf("$._pickfx.applyPickFXPreset(") !== -1) {
			applyCalls += 1;
		}
	}), { schemaVersion: 1, id: "preset_1_ab", name: "Talking Head Clean", components: [] }, function (result) {
		payload = result;
	});
	assertEq("uncertain apply evalScript is not retried", applyCalls, 1);
	assertEq("uncertain apply evalScript stays failed", payload && payload.ok, false);
	assertEq("uncertain apply evalScript does not look like missing host", payload.reason, "WRITE_FAILED");
	assertEq("uncertain apply evalScript keeps hostReady", payload.hostReady, true);

	function mockBootstrapCS(options) {
		options = options || {};
		var calls = [];
		var pings = 0;
		var readyStatus = {
			ok: true,
			host: true,
			listCapturable: true,
			applyPreset: true,
			presetHost: true,
			runtimeVersion: PremiereBridge.PRESET_RUNTIME_VERSION
		};
		return {
			evalScript: function (script, done) {
				var s = String(script || "");
				calls.push(s);
				if (s.indexOf("presetHostStatus") !== -1) {
					pings += 1;
					if (pings === 1 && options.firstStatus) {
						done(JSON.stringify(options.firstStatus));
						return;
					}
					done(JSON.stringify(options.status || readyStatus));
					return;
				}
				if (s.indexOf("new File(") !== -1) {
					if (options.failPath && s.indexOf(options.failPath) !== -1) {
						done(options.failEval || JSON.stringify({ ok: false, error: "file_not_found" }));
						return;
					}
					done(JSON.stringify({ ok: true }));
					return;
				}
				if (s.indexOf("globalName") !== -1) {
					if (options.failGlobal && s.indexOf(options.failGlobal) !== -1) {
						done(JSON.stringify({ ok: false }));
						return;
					}
					done(JSON.stringify({ ok: true }));
					return;
				}
				if (s.indexOf("listCapturableComponents()") !== -1) {
					done(JSON.stringify({
						ok: true,
						components: [{ displayName: "Crop", captureStatus: "full", supportedParameterCount: 5 }],
						session: { clipName: "Talking" },
						clipName: "Talking"
					}));
					return;
				}
				done(JSON.stringify({ ok: true }));
			},
			getSystemPath: function () {
				return "/tmp/PickFX";
			},
			_calls: calls
		};
	}

	scripts = [];
	payload = null;
	PremiereBridge.ensurePresetHost(mockBootstrapCS({
		status: {
			ok: true,
			host: true,
			presetHost: true,
			listCapturable: true,
			applyPreset: true,
			runtimeVersion: PremiereBridge.PRESET_RUNTIME_VERSION
		}
	}), function (result) {
		payload = result;
	});
	assert("matching runtime does not reload", payload && payload.ok === true);
	assertEq("matching runtime keeps version", payload.runtimeVersion, PremiereBridge.PRESET_RUNTIME_VERSION);

	payload = null;
	PremiereBridge.ensurePresetHost(mockBootstrapCS({
		firstStatus: {
			ok: true,
			host: true,
			presetHost: true,
			listCapturable: true,
			applyPreset: true,
			runtimeVersion: "old-runtime"
		}
	}), function (result) {
		payload = result;
	});
	assert("stale runtime reloads then becomes ready", payload && payload.ok === true);
	assertEq("stale runtime reports expected version after reload", payload.runtimeVersion, PremiereBridge.PRESET_RUNTIME_VERSION);

	payload = null;
	PremiereBridge.ensurePresetHost(mockBootstrapCS({
		firstStatus: { ok: false, host: true, runtimeVersion: "" },
		failPath: "PresetCapability.js",
		failEval: JSON.stringify({ ok: false, error: "file_not_found" })
	}), function (result) {
		payload = result;
	});
	assertEq("failed module stops bootstrap", payload.reason, "PRESET_HOST_MODULE_LOAD_FAILED");
	assert("failed module path is reported", String(payload.failingModule || payload.modulePath).indexOf("PresetCapability.js") !== -1);
	assert("failed module eval result is kept", String(payload.exactEvalResult).indexOf("file_not_found") !== -1);

	payload = null;
	PremiereBridge.ensurePresetHost(mockBootstrapCS({
		firstStatus: { ok: false, host: true, runtimeVersion: "" },
		failGlobal: "_pickfxParameterWriter"
	}), function (result) {
		payload = result;
	});
	assertEq("missing global fails bootstrap", payload.reason, "PRESET_HOST_MODULE_LOAD_FAILED");
	assertEq("missing global names the expected symbol", payload.expectedGlobal, "_pickfxParameterWriter");

	payload = null;
	PremiereBridge.listCapturableComponents(mockBootstrapCS({
		firstStatus: { ok: false, host: true, runtimeVersion: "" }
	}), function (result) {
		payload = result;
	});
	assert("successful bootstrap lists components", payload && payload.ok === true && payload.components.length === 1);

	assert("bridge exposes runtime version", PremiereBridge.PRESET_RUNTIME_VERSION === "24b6bf1-presets-parity-v1");
	assert("bridge exposes module list", PremiereBridge.PRESET_HOST_MODULES.length >= 12);

	print("premiere bridge: " + ((passed + failed) - startCount) + " assertions");
}());
