var PaletteKeyboard = (function () {
	var JS = {
		up: 38,
		down: 40,
		enter: 13,
		escape: 27
	};
	var MAC = {
		up: 126,
		down: 125,
		enter: 36,
		keypadEnter: 76,
		escape: 53
	};

	function text(value) {
		return String(value == null ? "" : value);
	}

	function eventKey(event) {
		var key = event && event.key != null ? text(event.key) : "";
		var code = event && event.code != null ? text(event.code) : "";
		var hasModernIdentity =
			(key && key !== "Unidentified") ||
			(code && code !== "Unidentified");
		if (key === "ArrowUp" || key === "Up" || code === "ArrowUp") {
			return "ArrowUp";
		}
		if (key === "ArrowDown" || key === "Down" || code === "ArrowDown") {
			return "ArrowDown";
		}
		if (key === "Enter" || key === "NumpadEnter" ||
				code === "Enter" || code === "NumpadEnter") {
			return "Enter";
		}
		if (key === "Escape" || key === "Esc" || code === "Escape") {
			return "Escape";
		}
		if (event) {
			if (event.keyCode === JS.up || event.which === JS.up ||
					event.keyCode === MAC.up || event.which === MAC.up) {
				return "ArrowUp";
			}
			if (event.keyCode === JS.down || event.which === JS.down ||
					event.keyCode === MAC.down || event.which === MAC.down) {
				return "ArrowDown";
			}
			if (event.keyCode === JS.enter || event.which === JS.enter) {
				return "Enter";
			}
			if (event.keyCode === JS.escape || event.which === JS.escape) {
				return "Escape";
			}
			if (!hasModernIdentity) {
				if (event.keyCode === MAC.enter || event.which === MAC.enter ||
						event.keyCode === MAC.keypadEnter || event.which === MAC.keypadEnter) {
					return "Enter";
				}
				if (event.keyCode === MAC.escape || event.which === MAC.escape) {
					return "Escape";
				}
			}
		}
		return key;
	}

	function isArrowUp(event) {
		return eventKey(event) === "ArrowUp";
	}

	function isArrowDown(event) {
		return eventKey(event) === "ArrowDown";
	}

	function isArrow(event) {
		var key = eventKey(event);
		return key === "ArrowUp" || key === "ArrowDown";
	}

	function isEnter(event) {
		return eventKey(event) === "Enter";
	}

	function isEscape(event) {
		return eventKey(event) === "Escape";
	}

	function isPaletteNav(event) {
		var key = eventKey(event);
		return key === "ArrowUp" || key === "ArrowDown" ||
			key === "Enter" || key === "Escape";
	}

	function consume(event) {
		if (!event) {
			return;
		}
		if (event.preventDefault) {
			event.preventDefault();
		}
		if (event.stopPropagation) {
			event.stopPropagation();
		}
		if (event.stopImmediatePropagation) {
			event.stopImmediatePropagation();
		}
	}

	function interest(keyCode) {
		return {
			keyCode: keyCode,
			ctrlKey: false,
			altKey: false,
			shiftKey: false,
			metaKey: false
		};
	}

	function interests() {
		return [
			interest(JS.up),
			interest(JS.down),
			interest(JS.enter),
			interest(JS.escape),
			interest(MAC.up),
			interest(MAC.down),
			interest(MAC.enter),
			interest(MAC.keypadEnter),
			interest(MAC.escape)
		];
	}

	function context(options) {
		var mode = options && options.mode ? options.mode : "search";
		var active = options && options.activeElement ? options.activeElement : null;
		var valueInput = options && options.valueInput ? options.valueInput : null;
		var choiceList = !!(options && options.choiceList);
		var recording = !!(options && options.recording);
		var settingsOpen = !!(options && options.settingsOpen);
		if (recording) {
			return "record";
		}
		if (settingsOpen) {
			return "settings";
		}
		if (mode === "value" && choiceList) {
			return "choice";
		}
		if (mode === "value" && valueInput && active === valueInput) {
			return "value";
		}
		if (mode === "value") {
			return "value";
		}
		if (mode === "parameters") {
			return "parameters";
		}
		return "search";
	}

	function actionFor(event, ctx) {
		var key = eventKey(event);
		if (ctx === "record") {
			return "";
		}
		if (ctx === "settings") {
			return key === "Escape" ? "CLOSE_SETTINGS" : "";
		}
		if (ctx === "value") {
			if (key === "Enter") {
				return "APPLY_VALUE";
			}
			if (key === "Escape") {
				return "ESCAPE";
			}
			if (key === "ArrowUp" || key === "ArrowDown") {
				return "IGNORE_VALUE_ARROW";
			}
			return "";
		}
		if (key === "ArrowDown") {
			return "MOVE_DOWN";
		}
		if (key === "ArrowUp") {
			return "MOVE_UP";
		}
		if (key === "Enter") {
			return "ACTIVATE";
		}
		if (key === "Escape") {
			return "ESCAPE";
		}
		return "";
	}

	return {
		JS: JS,
		MAC: MAC,
		eventKey: eventKey,
		isArrowUp: isArrowUp,
		isArrowDown: isArrowDown,
		isArrow: isArrow,
		isEnter: isEnter,
		isEscape: isEscape,
		isPaletteNav: isPaletteNav,
		consume: consume,
		interests: interests,
		context: context,
		actionFor: actionFor
	};
}());

if (typeof module !== "undefined" && module.exports) {
	module.exports = PaletteKeyboard;
}
