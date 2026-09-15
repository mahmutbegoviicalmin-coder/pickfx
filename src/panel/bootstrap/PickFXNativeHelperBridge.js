var PickFXNativeHelperBridge = (function () {
	var COMMAND = "OPEN_PICKFX_LAUNCHER";
	var ARROW_UP = "PALETTE_ARROW_UP";
	var ARROW_DOWN = "PALETTE_ARROW_DOWN";
	var CAPTURE_ARROWS = "CAPTURE_PALETTE_ARROWS";
	var RELEASE_ARROWS = "RELEASE_PALETTE_ARROWS";
	var KEY_EVENT = "com.pickfx.palette.key";
	var CAPTURE_EVENT = "com.pickfx.palette.capture";
	var OWNER_PIPE_MESSAGE = "PICKFX_OWNER_PIPE\n";
	var MAX_LINE_LENGTH = 128;
	var STATES = {
		IDLE: "IDLE",
		STARTING: "STARTING",
		RUNNING: "RUNNING",
		STOPPING: "STOPPING",
		STOPPED: "STOPPED",
		FAILED: "FAILED"
	};
	var HELPER_RELATIVE_PATH =
		"/src/native-helper/macos/build/PickFX Global Helper.app/Contents/MacOS/PickFXGlobalHelper";

	function defaultProcessApi() {
		return typeof window !== "undefined" &&
			window.cep &&
			window.cep.process
			? window.cep.process
			: null;
	}

	function defaultLauncher() {
		return typeof PickFXGlobalLauncher !== "undefined"
			? PickFXGlobalLauncher
			: null;
	}

	function normalizeExtensionPath(value) {
		var path = String(value || "");
		if (path.indexOf("file://") === 0) {
			path = path.substring(7);
			try {
				path = decodeURI(path);
			} catch (ignoreDecode) {}
		}
		return path.replace(/\/+$/, "");
	}

	function looksWindows(value) {
		var text = String(value || "").toLowerCase();
		return text.indexOf("win32") !== -1 ||
			text.indexOf("win64") !== -1 ||
			text.indexOf("windows") !== -1;
	}

	function looksMac(value) {
		var text = String(value || "").toLowerCase();
		if (looksWindows(text)) {
			return false;
		}
		return text.indexOf("mac") !== -1 || text.indexOf("darwin") !== -1;
	}

	function isWindowsDrivePath(executablePath) {
		var path = String(executablePath || "");
		return /^[a-zA-Z]:[\\/]/.test(path) || /^\/[a-zA-Z]\//.test(path);
	}

	function canStartHelper(csInterface, executablePath) {
		var info;
		var nav;
		if (isWindowsDrivePath(executablePath)) {
			return false;
		}
		if (csInterface && typeof csInterface.getOSInformation === "function") {
			try {
				info = csInterface.getOSInformation();
				if (looksWindows(info)) {
					return false;
				}
				if (looksMac(info)) {
					return true;
				}
			} catch (ignoreOs) {}
		}
		if (typeof process !== "undefined" && process.platform) {
			if (process.platform === "win32") {
				return false;
			}
			if (process.platform === "darwin") {
				return true;
			}
		}
		if (typeof navigator !== "undefined") {
			nav = (navigator.userAgentData && navigator.userAgentData.platform) ||
				navigator.platform ||
				"";
			if (looksWindows(nav)) {
				return false;
			}
			if (looksMac(nav)) {
				return true;
			}
		}
		return true;
	}

	function helperPath(csInterface) {
		var root;
		if (!csInterface ||
				typeof csInterface.getSystemPath !== "function" ||
				typeof SystemPath === "undefined") {
			return "";
		}
		root = csInterface.getSystemPath(SystemPath.EXTENSION);
		root = normalizeExtensionPath(root);
		return root ? root + HELPER_RELATIVE_PATH : "";
	}

	function create(options) {
		var settings = options || {};
		var csInterface = settings.csInterface;
		var processApi = settings.processApi || defaultProcessApi();
		var launcher = settings.launcher || defaultLauncher();
		var executablePath = settings.helperPath || helperPath(csInterface);
		var logger = settings.logger;
		var processId = null;
		var lineBuffer = "";
		var discardingOversizedLine = false;
		var state = STATES.IDLE;
		var startAttempted = false;
		var terminationAttempted = false;
		var terminationPid = null;
		var ownerPipeEstablished = false;
		var onPaletteKey = settings.onPaletteKey;

		function diagnostic(level, code, detail) {
			var method;
			if (typeof logger === "function") {
				logger(level, code, detail);
				return;
			}
			if (typeof console === "undefined") {
				return;
			}
			method = level === "error" ? "error" : "warn";
			if (typeof console[method] === "function") {
				console[method]("[PickFXNativeHelperBridge] " + code, detail || "");
			}
		}

		function acceptsCallbacks() {
			return state === STATES.RUNNING;
		}

		function clearParser() {
			lineBuffer = "";
			discardingOversizedLine = false;
		}

		function dispatchAppEvent(type, data) {
			var event;
			if (!csInterface || typeof csInterface.dispatchEvent !== "function") {
				return false;
			}
			try {
				event = typeof CSEvent === "function"
					? new CSEvent(type, "APPLICATION")
					: { type: type, scope: "APPLICATION" };
				event.data = typeof data === "string" ? data : JSON.stringify(data || {});
				csInterface.dispatchEvent(event);
				return true;
			} catch (error) {
				diagnostic("error", "PALETTE_EVENT_THREW", String(error));
				return false;
			}
		}

		function processPaletteArrow(line) {
			if (typeof onPaletteKey === "function") {
				try {
					onPaletteKey(line);
				} catch (error) {
					diagnostic("error", "PALETTE_KEY_CALLBACK_THREW", String(error));
				}
			}
			return dispatchAppEvent(KEY_EVENT, line);
		}

		function processLine(line) {
			var result;
			if (!acceptsCallbacks()) {
				return false;
			}
			if (line === ARROW_UP || line === ARROW_DOWN) {
				processPaletteArrow(line);
				return true;
			}
			if (line !== COMMAND) {
				return false;
			}
			if (!launcher ||
				typeof launcher.enabled !== "function" ||
				launcher.enabled() !== true) {
				diagnostic("warn", "COMMAND_IGNORED_LAUNCHER_DISABLED");
				return false;
			}
			if (typeof launcher.openOrFocus !== "function") {
				diagnostic("error", "OPEN_OR_FOCUS_UNAVAILABLE");
				return false;
			}
			try {
				result = launcher.openOrFocus(csInterface);
				diagnostic(
					result && result.ok ? "info" : "error",
					"OPEN_OR_FOCUS_RESULT",
					result
				);
				return !!(result && result.ok);
			} catch (error) {
				diagnostic("error", "OPEN_OR_FOCUS_THREW", String(error));
				return false;
			}
		}

		function consumeStdout(chunk) {
			if (!acceptsCallbacks()) {
				return;
			}
			var text = typeof chunk === "string" ? chunk : String(chunk || "");
			var i;
			var character;
			for (i = 0; i < text.length; i++) {
				character = text.charAt(i);
				if (character === "\n") {
					if (!discardingOversizedLine) {
						processLine(lineBuffer);
					}
					clearParser();
				} else if (!discardingOversizedLine) {
					if (lineBuffer.length >= MAX_LINE_LENGTH) {
						lineBuffer = "";
						discardingOversizedLine = true;
					} else {
						lineBuffer += character;
					}
				}
			}
		}

		function handleExit(pid) {
			if (!acceptsCallbacks()) {
				return;
			}
			if (processId !== pid) {
				return;
			}
			processId = null;
			ownerPipeEstablished = false;
			state = STATES.STOPPED;
			clearParser();
			diagnostic("warn", "HELPER_EXITED", { pid: pid });
		}

		function terminateStartedProcess(pid, reason, finalState) {
			var result;
			var completedState = finalState || STATES.STOPPED;
			if (terminationAttempted) {
				return {
					ok: true,
					alreadyAttempted: true,
					pid: terminationPid
				};
			}
			terminationAttempted = true;
			terminationPid = pid;
			state = STATES.STOPPING;
			processId = null;
			ownerPipeEstablished = false;
			clearParser();
			try {
				result = processApi.terminate(pid);
			} catch (error) {
				state = STATES.FAILED;
				diagnostic("error", "HELPER_TERMINATE_THREW", String(error));
				return {
					ok: false,
					reason: "HELPER_TERMINATE_THREW",
					pid: pid
				};
			}
			if (result && result.err) {
				state = STATES.FAILED;
				diagnostic("error", "HELPER_TERMINATE_FAILED", {
					pid: pid,
					reason: reason,
					result: result
				});
				return {
					ok: false,
					reason: "HELPER_TERMINATE_FAILED",
					pid: pid,
					result: result
				};
			}
			state = completedState;
			return { ok: true, pid: pid, result: result };
		}

		function failStartedProcess(pid, code, detail) {
			var cleanup;
			diagnostic("error", code, detail);
			cleanup = terminateStartedProcess(pid, code, STATES.FAILED);
			return { ok: false, reason: code, cleanup: cleanup };
		}

		function start() {
			var created;
			var pid;
			var stdoutRegistration;
			var quitRegistration;
			var stdinResult;
			if (state === STATES.RUNNING || state === STATES.STARTING) {
				return { ok: true, alreadyRunning: true, pid: processId };
			}
			if (startAttempted) {
				return { ok: false, reason: "START_ALREADY_ATTEMPTED" };
			}
			startAttempted = true;
			if (!processApi ||
				typeof processApi.createProcess !== "function" ||
				typeof processApi.stdout !== "function" ||
				typeof processApi.onquit !== "function" ||
				typeof processApi.stdin !== "function" ||
				typeof processApi.terminate !== "function") {
				state = STATES.FAILED;
				diagnostic("error", "CEP_PROCESS_API_UNAVAILABLE");
				return { ok: false, reason: "CEP_PROCESS_API_UNAVAILABLE" };
			}
			if (!executablePath || executablePath.charAt(0) !== "/") {
				diagnostic("error", "HELPER_PATH_NOT_ABSOLUTE", executablePath);
				state = STATES.FAILED;
				return { ok: false, reason: "HELPER_PATH_NOT_ABSOLUTE" };
			}
			if (!canStartHelper(csInterface, executablePath)) {
				diagnostic("error", "HELPER_UNSUPPORTED_PLATFORM", executablePath);
				state = STATES.FAILED;
				return { ok: false, reason: "HELPER_UNSUPPORTED_PLATFORM" };
			}

			state = STATES.STARTING;
			try {
				created = processApi.createProcess(executablePath);
			} catch (error) {
				state = STATES.FAILED;
				diagnostic("error", "HELPER_START_THREW", String(error));
				return { ok: false, reason: "HELPER_START_THREW" };
			}

			pid = created && Number(created.data);
			if (!created || created.err || !isFinite(pid) || pid <= 0) {
				state = STATES.FAILED;
				diagnostic("error", "HELPER_START_FAILED", created);
				return { ok: false, reason: "HELPER_START_FAILED", result: created };
			}

			processId = pid;
			try {
				stdoutRegistration = processApi.stdout(pid, consumeStdout);
			} catch (stdoutError) {
				return failStartedProcess(pid, "STDOUT_REGISTRATION_THREW", String(stdoutError));
			}
			if (stdoutRegistration && stdoutRegistration.err) {
				return failStartedProcess(pid, "STDOUT_REGISTRATION_FAILED", stdoutRegistration);
			}

			try {
				quitRegistration = processApi.onquit(pid, function () {
					handleExit(pid);
				});
			} catch (quitError) {
				return failStartedProcess(pid, "ONQUIT_REGISTRATION_THREW", String(quitError));
			}
			if (quitRegistration && quitRegistration.err) {
				return failStartedProcess(pid, "ONQUIT_REGISTRATION_FAILED", quitRegistration);
			}

			if (typeof processApi.stderr === "function") {
				try {
					processApi.stderr(pid, function (chunk) {
						if (!acceptsCallbacks()) {
							return;
						}
						diagnostic("warn", "HELPER_STDERR", String(chunk || "").slice(0, 512));
					});
				} catch (stderrError) {
					diagnostic("warn", "STDERR_REGISTRATION_THREW", String(stderrError));
				}
			}

			try {
				stdinResult = processApi.stdin(pid, OWNER_PIPE_MESSAGE);
			} catch (stdinError) {
				return failStartedProcess(pid, "STDIN_OWNER_PIPE_THREW", String(stdinError));
			}
			if (stdinResult && stdinResult.err) {
				return failStartedProcess(pid, "STDIN_OWNER_PIPE_FAILED", stdinResult);
			}

			ownerPipeEstablished = true;
			state = STATES.RUNNING;
			diagnostic("info", "HELPER_STARTED", {
				pid: pid,
				executablePath: executablePath,
				ownerPipeEstablished: ownerPipeEstablished
			});
			return { ok: true, pid: pid, executablePath: executablePath };
		}

		function send(command) {
			var text = String(command || "");
			var result;
			if (!text) {
				return { ok: false, reason: "EMPTY_COMMAND" };
			}
			if (state !== STATES.RUNNING || processId === null) {
				return { ok: false, reason: "HELPER_NOT_RUNNING" };
			}
			if (text.charAt(text.length - 1) !== "\n") {
				text += "\n";
			}
			try {
				result = processApi.stdin(processId, text);
			} catch (error) {
				diagnostic("error", "STDIN_WRITE_THREW", String(error));
				return { ok: false, reason: "STDIN_WRITE_THREW" };
			}
			if (result && result.err) {
				diagnostic("error", "STDIN_WRITE_FAILED", result);
				return { ok: false, reason: "STDIN_WRITE_FAILED", result: result };
			}
			return { ok: true, command: String(command || "").replace(/\n+$/, "") };
		}

		function stop() {
			var pid = processId;
			var termination;
			if (state === STATES.STOPPING ||
					state === STATES.STOPPED ||
					state === STATES.FAILED ||
					pid === null) {
				clearParser();
				return {
					ok: true,
					alreadyStopped: true,
					state: state,
					pid: terminationPid
				};
			}
			termination = terminateStartedProcess(pid, "BOOTSTRAP_STOP", STATES.STOPPED);
			return {
				ok: termination.ok,
				pid: pid,
				state: state,
				reason: termination.reason
			};
		}

		function status() {
			return {
				state: state,
				running: state === STATES.RUNNING && processId !== null,
				pid: processId,
				executablePath: executablePath,
				startAttempted: startAttempted,
				terminationAttempted: terminationAttempted,
				terminationPid: terminationPid,
				ownerPipeEstablished: ownerPipeEstablished,
				bufferedCharacters: lineBuffer.length,
				discardingOversizedLine: discardingOversizedLine
			};
		}

		return {
			start: start,
			stop: stop,
			send: send,
			status: status,
			consumeStdout: consumeStdout
		};
	}

	return {
		COMMAND: COMMAND,
		ARROW_UP: ARROW_UP,
		ARROW_DOWN: ARROW_DOWN,
		CAPTURE_ARROWS: CAPTURE_ARROWS,
		RELEASE_ARROWS: RELEASE_ARROWS,
		KEY_EVENT: KEY_EVENT,
		CAPTURE_EVENT: CAPTURE_EVENT,
		OWNER_PIPE_MESSAGE: OWNER_PIPE_MESSAGE,
		MAX_LINE_LENGTH: MAX_LINE_LENGTH,
		STATES: STATES,
		HELPER_RELATIVE_PATH: HELPER_RELATIVE_PATH,
		normalizeExtensionPath: normalizeExtensionPath,
		helperPath: helperPath,
		canStartHelper: canStartHelper,
		create: create
	};
}());

if (typeof module !== "undefined" && module.exports) {
	module.exports = PickFXNativeHelperBridge;
}
