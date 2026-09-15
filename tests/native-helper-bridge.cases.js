(function () {
	var startCount = passed + failed;
	var Bridge = PickFXNativeHelperBridge;

	function mockProcess(options) {
		var settings = options || {};
		var state = {
			createCalls: 0,
			stdinCalls: 0,
			terminateCalls: 0,
			stdoutCallback: null,
			stderrCallback: null,
			quitCallback: null
		};
		state.api = {
			createProcess: function (executablePath) {
				state.createCalls += 1;
				state.executablePath = executablePath;
				if (settings.throwOnCreate) {
					throw new Error("create failed");
				}
				return settings.createResult || { err: 0, data: 4101 };
			},
			stdout: function (pid, callback) {
				state.stdoutCallback = callback;
				return settings.stdoutResult || { err: 0 };
			},
			stderr: function (pid, callback) {
				state.stderrCallback = callback;
				return { err: 0 };
			},
			onquit: function (pid, callback) {
				state.quitCallback = callback;
				return settings.onquitResult || { err: 0 };
			},
			stdin: function (pid, data) {
				state.stdinCalls += 1;
				state.stdinPid = pid;
				state.stdinData = data;
				if (settings.throwOnStdin) {
					throw new Error("stdin failed");
				}
				return settings.stdinResult || { err: 0 };
			},
			terminate: function () {
				state.terminateCalls += 1;
				if (settings.callbacksDuringTerminate) {
					if (state.stdoutCallback) {
						state.stdoutCallback("OPEN_PICKFX_LAUNCHER\n");
					}
					if (state.stderrCallback) {
						state.stderrCallback("HELPER_TERMINATED_CLEANLY\n");
					}
					if (state.quitCallback) {
						state.quitCallback();
					}
				}
				if (settings.throwOnTerminate) {
					throw new Error("terminate failed");
				}
				return settings.terminateResult || { err: 0 };
			}
		};
		return state;
	}

	function setup(options) {
		var settings = options || {};
		var process = mockProcess(settings.process);
		var enabled = settings.enabled !== false;
		var opened = 0;
		var receivedCs = null;
		var csInterface = { id: "existing-cs-interface" };
		var launcher = {
			enabled: function () {
				return enabled;
			},
			openOrFocus: function (cs) {
				opened += 1;
				receivedCs = cs;
				return { ok: true, action: "OPEN_OR_FOCUS" };
			}
		};
		var bridge = Bridge.create({
			csInterface: csInterface,
			processApi: process.api,
			launcher: launcher,
			helperPath: "/absolute/PickFXGlobalHotkeyPOC",
			logger: function () {}
		});
		return {
			bridge: bridge,
			process: process,
			launcher: launcher,
			csInterface: csInterface,
			opened: function () {
				return opened;
			},
			receivedCs: function () {
				return receivedCs;
			},
			setEnabled: function (value) {
				enabled = value;
			}
		};
	}

	(function () {
		assertEq(
			"native bridge normalizes CEP file URL path",
			Bridge.normalizeExtensionPath("file:///Users/test/PickFX%20Extension/"),
			"/Users/test/PickFX Extension"
		);
		assertEq(
			"native bridge preserves absolute filesystem path",
			Bridge.normalizeExtensionPath("/Users/test/PickFX/"),
			"/Users/test/PickFX"
		);
	}());

	(function () {
		var test = setup();
		test.bridge.start();
		test.process.stdoutCallback("OPEN_PICKFX_LAUNCHER\n");
		assertEq("native bridge exact command opens launcher once", test.opened(), 1);
	}());

	(function () {
		var test = setup();
		var result;
		test.csInterface.getOSInformation = function () {
			return "Windows 10 64-bit";
		};
		test.bridge = Bridge.create({
			csInterface: test.csInterface,
			processApi: test.process.api,
			launcher: test.launcher,
			helperPath: "/absolute/PickFXGlobalHelper",
			logger: function () {}
		});
		result = test.bridge.start();
		assertEq("native bridge does not spawn helper on Windows", result.ok, false);
		assertEq("native bridge Windows skip reason", result.reason, "HELPER_UNSUPPORTED_PLATFORM");
		assertEq("native bridge Windows createProcess skipped", test.process.createCalls, 0);
	}());

	(function () {
		var test = setup();
		test.bridge.start();
		test.process.stdoutCallback("UNKNOWN\n");
		assertEq("native bridge unknown line does nothing", test.opened(), 0);
	}());

	(function () {
		var keys = [];
		var events = [];
		var test = setup();
		test.csInterface.dispatchEvent = function (event) {
			events.push(event);
		};
		test.bridge = Bridge.create({
			csInterface: test.csInterface,
			processApi: test.process.api,
			launcher: test.launcher,
			helperPath: "/absolute/PickFXGlobalHotkeyPOC",
			logger: function () {},
			onPaletteKey: function (line) {
				keys.push(line);
			}
		});
		test.bridge.start();
		test.process.stdoutCallback("PALETTE_ARROW_DOWN\nPALETTE_ARROW_UP\n");
		assertEq("native bridge arrow down does not open launcher", test.opened(), 0);
		assertEq("native bridge delivers helper arrow commands", keys.join(","), "PALETTE_ARROW_DOWN,PALETTE_ARROW_UP");
		assertEq("native bridge dispatches arrow CSXS events", events.length, 2);
		assertEq("native bridge arrow event type", events[0] && events[0].type, Bridge.KEY_EVENT);
		assertEq("native bridge arrow event data", events[0] && events[0].data, Bridge.ARROW_DOWN);
	}());

	(function () {
		var test = setup();
		var result;
		test.bridge.start();
		result = test.bridge.send(Bridge.CAPTURE_ARROWS);
		assertEq("native bridge send capture succeeds", result.ok, true);
		assertEq("native bridge send writes capture command", test.process.stdinData, Bridge.CAPTURE_ARROWS + "\n");
		assertEq("native bridge send uses helper pid", test.process.stdinPid, test.bridge.status().pid);
		result = test.bridge.send(Bridge.RELEASE_ARROWS);
		assertEq("native bridge send release succeeds", result.ok, true);
		assertEq("native bridge send writes release command", test.process.stdinData, Bridge.RELEASE_ARROWS + "\n");
	}());

	(function () {
		var test = setup();
		var result = test.bridge.send(Bridge.CAPTURE_ARROWS);
		assertEq("native bridge send before start fails closed", result.ok, false);
		assertEq("native bridge send before start reason", result.reason, "HELPER_NOT_RUNNING");
	}());

	(function () {
		var test = setup();
		test.bridge.start();
		test.process.stdoutCallback("OPEN_PICKFX_");
		assertEq("native bridge incomplete command does not open", test.opened(), 0);
		test.process.stdoutCallback("LAUNCHER\n");
		assertEq("native bridge split command opens exactly once", test.opened(), 1);
	}());

	(function () {
		var test = setup();
		test.bridge.start();
		test.process.stdoutCallback(
			"OPEN_PICKFX_LAUNCHER\nOPEN_PICKFX_LAUNCHER\nUNKNOWN\n"
		);
		assertEq("native bridge parses multiple complete lines independently", test.opened(), 2);
	}());

	(function () {
		var test = setup();
		var oversized = new Array(Bridge.MAX_LINE_LENGTH + 3).join("X");
		test.bridge.start();
		test.process.stdoutCallback("OPEN_PICKFX_PICKFX_LAUNCHER\n");
		test.process.stdoutCallback(oversized + "OPEN_PICKFX_LAUNCHER\n");
		assertEq("native bridge malformed and oversized lines do nothing", test.opened(), 0);
	}());

	(function () {
		var test = setup();
		test.bridge.start();
		test.bridge.start();
		assertEq("native bridge duplicate start creates one helper", test.process.createCalls, 1);
		assertEq("native bridge duplicate start creates one owner pipe", test.process.stdinCalls, 1);
	}());

	(function () {
		var test = setup();
		var result = test.bridge.start();
		assertEq("native bridge owner pipe write succeeds", result.ok, true);
		assertEq("native bridge writes one fixed owner token", test.process.stdinData, Bridge.OWNER_PIPE_MESSAGE);
		assertEq("native bridge owner pipe uses helper pid", test.process.stdinPid, result.pid);
		assertEq("native bridge records owner pipe established", test.bridge.status().ownerPipeEstablished, true);
	}());

	(function () {
		var test = setup();
		test.bridge.start();
		assertEq("native bridge records running helper", test.bridge.status().running, true);
		assertEq("native bridge enters RUNNING after startup", test.bridge.status().state, Bridge.STATES.RUNNING);
		test.process.quitCallback();
		assertEq("native bridge helper exit clears process state", test.bridge.status().running, false);
		assertEq("native bridge helper exit enters STOPPED", test.bridge.status().state, Bridge.STATES.STOPPED);
	}());

	(function () {
		var test = setup();
		test.bridge.start();
		test.process.stdoutCallback("OPEN_PICKFX_LAUNCHER\n");
		assertEq(
			"native bridge passes bootstrap CSInterface to existing openOrFocus",
			test.receivedCs(),
			test.csInterface
		);
	}());

	(function () {
		var test = setup({ enabled: false });
		test.bridge.start();
		test.process.stdoutCallback("OPEN_PICKFX_LAUNCHER\n");
		assertEq("native bridge entitlement gate blocks opening", test.opened(), 0);
	}());

	(function () {
		var test = setup({
			process: {
				createResult: { err: 3, data: -1 }
			}
		});
		var result;
		var threw = false;
		try {
			result = test.bridge.start();
		} catch (error) {
			threw = true;
		}
		assertEq("native bridge startup failure does not throw", threw, false);
		assertEq("native bridge startup failure is reported", result.ok, false);
		assertEq("native bridge startup failure leaves no process", test.bridge.status().running, false);
	}());

	(function () {
		var test = setup();
		test.bridge.start();
		test.process.stderrCallback("OPEN_PICKFX_LAUNCHER\n");
		assertEq("native bridge stderr is never treated as protocol", test.opened(), 0);
	}());

	(function () {
		var test = setup();
		test.bridge.start();
		test.bridge.stop();
		assertEq("native bridge stop terminates helper once", test.process.terminateCalls, 1);
		assertEq("native bridge stop clears process state", test.bridge.status().running, false);
		assertEq("native bridge controlled stop enters STOPPED", test.bridge.status().state, Bridge.STATES.STOPPED);
		test.bridge.stop();
		assertEq("native bridge repeated stop is idempotent", test.process.terminateCalls, 1);
	}());

	(function () {
		var test = setup();
		test.bridge.start();
		test.bridge.stop();
		test.process.stdoutCallback("OPEN_PICKFX_LAUNCHER\n");
		test.process.stderrCallback("OPEN_PICKFX_LAUNCHER\n");
		test.process.quitCallback();
		assertEq("native bridge callbacks after shutdown do not open launcher", test.opened(), 0);
		assertEq("native bridge callbacks after shutdown do not change state", test.bridge.status().state, Bridge.STATES.STOPPED);
		assertEq("native bridge callbacks after shutdown do not terminate again", test.process.terminateCalls, 1);
	}());

	(function () {
		var test = setup({
			process: {
				callbacksDuringTerminate: true
			}
		});
		test.bridge.start();
		test.bridge.stop();
		assertEq("native bridge launcher command during STOPPING does nothing", test.opened(), 0);
		assertEq("native bridge synchronous shutdown callbacks are harmless", test.bridge.status().state, Bridge.STATES.STOPPED);
		assertEq("native bridge synchronous shutdown terminates once", test.process.terminateCalls, 1);
	}());

	(function () {
		var test = setup({
			process: {
				terminateResult: { err: 1 }
			}
		});
		var result;
		test.bridge.start();
		result = test.bridge.stop();
		assertEq("native bridge terminate failure is reported", result.ok, false);
		assertEq("native bridge terminate failure enters FAILED", test.bridge.status().state, Bridge.STATES.FAILED);
		test.bridge.stop();
		assertEq("native bridge terminate failure is never retried implicitly", test.process.terminateCalls, 1);
	}());

	(function () {
		var test = setup({
			process: {
				stdoutResult: { err: 1 }
			}
		});
		var result = test.bridge.start();
		assertEq("native bridge callback registration failure is reported", result.ok, false);
		assertEq("native bridge callback registration failure terminates once", test.process.terminateCalls, 1);
		assertEq("native bridge callback registration failure enters FAILED", test.bridge.status().state, Bridge.STATES.FAILED);
	}());

	(function () {
		var test = setup({
			process: {
				stdinResult: { err: 1 }
			}
		});
		var result = test.bridge.start();
		assertEq("native bridge owner pipe failure is reported", result.ok, false);
		assertEq("native bridge owner pipe failure terminates failed startup once", test.process.terminateCalls, 1);
		assertEq("native bridge owner pipe failure enters FAILED", test.bridge.status().state, Bridge.STATES.FAILED);
		assertEq("native bridge owner pipe failure is not established", test.bridge.status().ownerPipeEstablished, false);
	}());

	(function () {
		var test = setup();
		test.bridge.start();
		test.bridge.stop();
		test.process.quitCallback();
		test.bridge.stop();
		assertEq("native bridge lifecycle callbacks cannot duplicate cleanup", test.process.terminateCalls, 1);
	}());

	(function () {
		var test = setup();
		test.bridge.start();
		test.bridge.stop();
		test.bridge.start();
		assertEq("native bridge starts at most once per bootstrap renderer", test.process.createCalls, 1);
	}());

	(function () {
		var source = fs.readFileSync(
			path.join(__pickfxRoot, "src/panel/bootstrap/PickFXNativeHelperBridge.js"),
			"utf8"
		);
		assert(
			"native bridge delegates opening only to existing openOrFocus",
			source.indexOf("launcher.openOrFocus(csInterface)") !== -1 &&
			source.indexOf("requestOpenExtension") === -1
		);
		assert(
			"native bridge protocol does not evaluate or execute stdout",
			source.indexOf("eval(") === -1 &&
			source.indexOf("Function(") === -1 &&
			source.indexOf("exec(") === -1
		);
		assert(
			"native bridge exposes explicit lifecycle states",
			source.indexOf("STATES.STOPPING") !== -1 &&
			source.indexOf("acceptsCallbacks") !== -1 &&
			source.indexOf("terminationAttempted") !== -1
		);
		assert(
			"native bridge represents CEP stdin owner lifetime",
			source.indexOf("processApi.stdin(pid, OWNER_PIPE_MESSAGE)") !== -1 &&
			source.indexOf("ownerPipeEstablished = true") !== -1
		);
		assert(
			"native bridge uses production helper path",
			source.indexOf("/src/native-helper/macos/build/PickFX Global Helper.app/Contents/MacOS/PickFXGlobalHelper") !== -1 &&
			source.indexOf("/global-hotkey-poc/") === -1
		);
	}());

	(function () {
		var bootstrapHtml = fs.readFileSync(
			path.join(__pickfxRoot, "src/panel/bootstrap/host.html"),
			"utf8"
		);
		var bootstrapApp = fs.readFileSync(
			path.join(__pickfxRoot, "src/panel/bootstrap/app.js"),
			"utf8"
		);
		assert(
			"bootstrap loads owner-pipe bridge before app",
			bootstrapHtml.indexOf("PickFXNativeHelperBridge.js") !== -1 &&
			bootstrapHtml.indexOf("PickFXNativeHelperBridge.js") < bootstrapHtml.indexOf("app.js")
		);
		assert(
			"bootstrap starts one tracked helper through bridge",
			bootstrapApp.indexOf("PickFXNativeHelperBridge.create") !== -1 &&
			bootstrapApp.indexOf("nativeHelperBridge.start()") !== -1
		);
		assert(
			"bootstrap starts helper for any active product session",
			bootstrapApp.indexOf("paletteHelperEnabled") !== -1 &&
			bootstrapApp.indexOf("ENABLE_LAUNCHER_HOTKEY") !== -1 &&
			bootstrapApp.indexOf("DISABLE_LAUNCHER_HOTKEY") !== -1
		);
		assert(
			"bootstrap never terminates helper during renderer teardown",
			bootstrapApp.indexOf("beforeunload") === -1 &&
			bootstrapApp.indexOf("\"unload\"") === -1 &&
			bootstrapApp.indexOf("pagehide") === -1 &&
			bootstrapApp.indexOf("ApplicationBeforeQuit") === -1 &&
			bootstrapApp.indexOf("applicationBeforeQuit") === -1 &&
			bootstrapApp.indexOf("location.reload") === -1
		);
		assert(
			"bootstrap lifecycle never calls bridge stop or CEP terminate",
			bootstrapApp.indexOf("nativeHelperBridge.stop") === -1 &&
			bootstrapApp.indexOf(".terminate(") === -1
		);
		assert(
			"bootstrap polls helper trigger file as stdout fallback",
			bootstrapApp.indexOf("launcher-trigger") !== -1 &&
			bootstrapApp.indexOf("consumeTrigger") !== -1
		);
		assert(
			"bootstrap forwards panel arrow capture to helper stdin",
			bootstrapApp.indexOf("com.pickfx.palette.capture") !== -1 &&
			bootstrapApp.indexOf("CAPTURE_PALETTE_ARROWS") !== -1 &&
			bootstrapApp.indexOf("RELEASE_PALETTE_ARROWS") !== -1
		);
	}());

	(function () {
		var helperSource = fs.readFileSync(
			path.join(__pickfxRoot, "src/native-helper/macos/Sources/main.swift"),
			"utf8"
		);
		assert(
			"production helper preserves exact launcher stdout protocol",
			helperSource.indexOf('fputs("OPEN_PICKFX_LAUNCHER\\n", stdout)') !== -1
		);
		assert(
			"production helper writes a trigger file for later keypresses",
			helperSource.indexOf("launcher-trigger") !== -1 &&
			helperSource.indexOf("writeTriggerFile") !== -1
		);
		assert(
			"production helper exits from blocking stdin EOF",
			helperSource.indexOf("read(STDIN_FILENO") !== -1 &&
			helperSource.indexOf('finishAfterOwnerPipe("HELPER_STDIN_EOF")') !== -1
		);
		assert(
			"production helper preserves exact Carbon shortcut constants",
			helperSource.indexOf("kVK_ANSI_P") !== -1 &&
			helperSource.indexOf("controlKey | shiftKey") !== -1
		);
		assert(
			"production helper captures palette arrows from owner stdin",
			helperSource.indexOf("CAPTURE_PALETTE_ARROWS") !== -1 &&
			helperSource.indexOf("RELEASE_PALETTE_ARROWS") !== -1 &&
			helperSource.indexOf("kVK_UpArrow") !== -1 &&
			helperSource.indexOf("kVK_DownArrow") !== -1
		);
		assert(
			"production helper can disable Control+Shift+P without stopping arrows",
			helperSource.indexOf("ENABLE_LAUNCHER_HOTKEY") !== -1 &&
			helperSource.indexOf("DISABLE_LAUNCHER_HOTKEY") !== -1 &&
			helperSource.indexOf("disableLauncherHotKey") !== -1
		);
		assert(
			"production helper emits palette arrow stdout without opening launcher",
			helperSource.indexOf('sendPaletteArrow("PALETTE_ARROW_DOWN")') !== -1 &&
			helperSource.indexOf('sendPaletteArrow("PALETTE_ARROW_UP")') !== -1
		);
		assert(
			"production helper uses a C tap callback so Control+Shift+P cannot crash it",
			helperSource.indexOf("private func arrowTapCallback") !== -1 &&
			helperSource.indexOf("callback: arrowTapCallback") !== -1 &&
			helperSource.indexOf("kVK_ANSI_P") !== -1
		);
		assert(
			"production helper watches palette-capture and writes palette-arrow",
			helperSource.indexOf("palette-capture") !== -1 &&
			helperSource.indexOf("palette-arrow") !== -1 &&
			helperSource.indexOf("startCaptureFileWatcher") !== -1
		);
	}());

	print("native helper bridge: " + ((passed + failed) - startCount) + " assertions");
}());
