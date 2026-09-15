var TerminalKeyboardShortcut = (function () {
	var SPACE_KEY_CODE = 32;
	var P_KEY_CODE = 80;
	var MAC_P_NATIVE_KEY_CODE = 35;
	var SCOPE = "FOCUSED_CEP_PANEL_ONLY";
	var LAUNCHER_SCOPE = "PREMIERE_FOREGROUND_CEP";
	var MAC_LETTER_CODES = {
		a: 0, s: 1, d: 2, f: 3, h: 4, g: 5, z: 6, x: 7, c: 8, v: 9,
		b: 11, q: 12, w: 13, e: 14, r: 15, y: 16, t: 17, o: 31, u: 32,
		i: 34, p: 35, l: 37, j: 38, k: 40, n: 45, m: 46
	};
	var WIN_LETTER_CODES = {
		a: 65, b: 66, c: 67, d: 68, e: 69, f: 70, g: 71, h: 72, i: 73,
		j: 74, k: 75, l: 76, m: 77, n: 78, o: 79, p: 80, q: 81, r: 82,
		s: 83, t: 84, u: 85, v: 86, w: 87, x: 88, y: 89, z: 90
	};
	var MOD_ONLY = {
		Shift: true, Control: true, Alt: true, Meta: true, OS: true,
		AltGraph: true, CapsLock: true, NumLock: true, ScrollLock: true
	};

	function platformName(value) {
		var text = String(value || "").toLowerCase();
		if (text.indexOf("mac") !== -1 || text.indexOf("darwin") !== -1) {
			return "mac";
		}
		return "windows";
	}

	function shortcutLabel(platform) {
		return platformName(platform) === "mac" ? "⌘ Space" : "Ctrl Space";
	}

	function shortcutHint(platform) {
		return shortcutLabel(platform) + " to focus PickFX";
	}

	function defaultLauncherCombo() {
		if (typeof ShortcutStore !== "undefined" && ShortcutStore.defaultCombo) {
			return ShortcutStore.defaultCombo();
		}
		return {
			key: "p",
			code: "KeyP",
			keyCode: P_KEY_CODE,
			macKeyCode: MAC_P_NATIVE_KEY_CODE,
			ctrlKey: false,
			altKey: false,
			shiftKey: true,
			metaKey: false
		};
	}

	function letterOf(combo) {
		var key = combo && combo.key ? String(combo.key).toLowerCase() : "";
		if (key.length === 1 && key >= "a" && key <= "z") {
			return key;
		}
		if (combo && combo.code && /^Key[A-Z]$/.test(combo.code)) {
			return combo.code.slice(3).toLowerCase();
		}
		return "";
	}

	function normalizeCombo(combo) {
		var next = defaultLauncherCombo();
		var letter;
		if (!combo) {
			return next;
		}
		if (combo.disabled === true || combo.cleared === true) {
			return {
				key: "",
				code: "",
				keyCode: 0,
				macKeyCode: 0,
				ctrlKey: false,
				altKey: false,
				shiftKey: false,
				metaKey: false,
				disabled: true
			};
		}
		next.key = combo.key ? String(combo.key).toLowerCase() : next.key;
		next.code = combo.code || next.code;
		next.keyCode = typeof combo.keyCode === "number" ? combo.keyCode : next.keyCode;
		next.macKeyCode = typeof combo.macKeyCode === "number" ? combo.macKeyCode : next.macKeyCode;
		next.ctrlKey = !!combo.ctrlKey;
		next.altKey = !!combo.altKey;
		next.shiftKey = !!combo.shiftKey;
		next.metaKey = !!combo.metaKey;
		letter = letterOf(next);
		if (letter) {
			if (WIN_LETTER_CODES[letter] !== undefined) {
				next.keyCode = next.keyCode || WIN_LETTER_CODES[letter];
			}
			if (MAC_LETTER_CODES[letter] !== undefined) {
				next.macKeyCode = MAC_LETTER_CODES[letter];
			}
		}
		if (next.key === " " || next.code === "Space") {
			next.key = " ";
			next.code = "Space";
			next.keyCode = SPACE_KEY_CODE;
			next.macKeyCode = 49;
		}
		return next;
	}

	function hasModifier(combo) {
		return !!(combo && (combo.ctrlKey || combo.altKey || combo.shiftKey || combo.metaKey));
	}

	function validateCombo(combo, platform) {
		var next = combo ? normalizeCombo(combo) : null;
		var letter;
		if (!next || !next.key) {
			return { ok: false, reason: "EMPTY" };
		}
		if (MOD_ONLY[combo && combo.key]) {
			return { ok: false, reason: "MODIFIER_ONLY" };
		}
		if (next.key === "escape" || next.code === "Escape" || next.keyCode === 27) {
			return { ok: false, reason: "RESERVED" };
		}
		if (!hasModifier(next) && next.key.length === 1) {
			return { ok: false, reason: "NEEDS_MODIFIER" };
		}
		if (isOpenShortcut({
			key: next.key,
			code: next.code,
			keyCode: next.keyCode,
			metaKey: next.metaKey,
			ctrlKey: next.ctrlKey,
			altKey: next.altKey,
			shiftKey: next.shiftKey
		}, platform)) {
			return { ok: false, reason: "CONFLICT_PANEL_FOCUS" };
		}
		letter = letterOf(next);
		if (letter === "p" && next.shiftKey && !next.metaKey && !next.ctrlKey && !next.altKey) {
			return { ok: true, combo: next };
		}
		return { ok: true, combo: next };
	}

	function formatCombo(combo, platform) {
		var mac = platformName(platform) === "mac";
		var parts = [];
		var key;
		var letter;
		combo = normalizeCombo(combo);
		if (combo.disabled) {
			return "";
		}
		if (mac) {
			if (combo.ctrlKey) {
				parts.push("⌃");
			}
			if (combo.altKey) {
				parts.push("⌥");
			}
			if (combo.shiftKey) {
				parts.push("⇧");
			}
			if (combo.metaKey) {
				parts.push("⌘");
			}
		} else {
			if (combo.ctrlKey) {
				parts.push("Ctrl");
			}
			if (combo.altKey) {
				parts.push("Alt");
			}
			if (combo.shiftKey) {
				parts.push("Shift");
			}
			if (combo.metaKey) {
				parts.push("Win");
			}
		}
		letter = letterOf(combo);
		if (combo.key === " " || combo.code === "Space") {
			key = "Space";
		} else if (letter) {
			key = letter.toUpperCase();
		} else if (combo.key) {
			key = String(combo.key).length === 1
				? String(combo.key).toUpperCase()
				: String(combo.key);
		} else {
			key = "";
		}
		if (mac) {
			return parts.join("") + (parts.length && key ? " " : "") + key;
		}
		parts.push(key);
		return parts.join(" + ");
	}

	function launcherShortcutLabel(platform, combo) {
		if (combo && (combo.disabled === true || combo.cleared === true)) {
			return "None";
		}
		if (combo) {
			return formatCombo(combo, platform);
		}
		return "⇧ P";
	}

	function launcherShortcutHint() {
		return "Open PickFX";
	}

	function fromEvent(event) {
		if (!event) {
			return null;
		}
		return normalizeCombo({
			key: event.key,
			code: event.code,
			keyCode: event.keyCode || event.which,
			ctrlKey: !!event.ctrlKey,
			altKey: !!event.altKey,
			shiftKey: !!event.shiftKey,
			metaKey: !!event.metaKey
		});
	}

	function isSpace(event) {
		var key = event && event.key;
		var code = event && event.code;
		return !!(
			event &&
			(event.keyCode === SPACE_KEY_CODE ||
				event.which === SPACE_KEY_CODE ||
				key === " " ||
				key === "Spacebar" ||
				code === "Space")
		);
	}

	function isOpenShortcut(event, platform) {
		if (!isSpace(event) || (event && (event.altKey || event.shiftKey))) {
			return false;
		}
		if (platformName(platform) === "mac") {
			return !!(event.metaKey && !event.ctrlKey);
		}
		return !!(event.ctrlKey && !event.metaKey);
	}

	function isP(event) {
		var key = event && event.key;
		var code = event && event.code;
		return !!(
			event &&
			(event.keyCode === P_KEY_CODE ||
				event.which === P_KEY_CODE ||
				event.keyCode === MAC_P_NATIVE_KEY_CODE ||
				event.which === MAC_P_NATIVE_KEY_CODE ||
				key === "p" ||
				key === "P" ||
				code === "KeyP")
		);
	}

	function sameFlag(a, b) {
		return !!a === !!b;
	}

	function matchesCombo(event, combo) {
		var next;
		var letter;
		var eventLetter;
		if (!event || !combo) {
			return false;
		}
		next = normalizeCombo(combo);
		if (!sameFlag(event.ctrlKey, next.ctrlKey) ||
				!sameFlag(event.altKey, next.altKey) ||
				!sameFlag(event.shiftKey, next.shiftKey) ||
				!sameFlag(event.metaKey, next.metaKey)) {
			return false;
		}
		letter = letterOf(next);
		eventLetter = event.key ? String(event.key).toLowerCase() : "";
		if (letter) {
			return eventLetter === letter ||
				event.code === next.code ||
				event.keyCode === next.keyCode ||
				event.which === next.keyCode ||
				event.keyCode === next.macKeyCode ||
				event.which === next.macKeyCode;
		}
		if (next.key === " ") {
			return isSpace(event);
		}
		return event.keyCode === next.keyCode ||
			event.which === next.keyCode ||
			event.code === next.code ||
			eventLetter === String(next.key).toLowerCase();
	}

	function isLauncherShortcut(event, platform, combo) {
		if (combo && (combo.disabled === true || combo.cleared === true)) {
			return false;
		}
		if (combo) {
			return matchesCombo(event, combo);
		}
		if (!isP(event) || !event || !event.shiftKey || event.altKey) {
			return false;
		}
		return !event.metaKey && !event.ctrlKey;
	}

	function isEscape(event) {
		return !!(
			event &&
			(event.key === "Escape" || event.keyCode === 27 || event.which === 27)
		);
	}

	function isArrow(event) {
		var key = event && event.key;
		return key === "ArrowUp" || key === "ArrowDown" ||
			key === "Up" || key === "Down" ||
			(event && (event.keyCode === 38 || event.keyCode === 40));
	}

	function isEnter(event) {
		return !!(
			event &&
			(event.key === "Enter" || event.keyCode === 13 || event.which === 13)
		);
	}

	function panelFocusInterests() {
		return [
			{
				keyCode: SPACE_KEY_CODE,
				ctrlKey: false,
				altKey: false,
				shiftKey: false,
				metaKey: true
			},
			{
				keyCode: SPACE_KEY_CODE,
				ctrlKey: true,
				altKey: false,
				shiftKey: false,
				metaKey: false
			}
		];
	}

	function launcherInterests(combo) {
		var next;
		var list;
		if (combo && (combo.disabled === true || combo.cleared === true)) {
			return [];
		}
		next = combo ? normalizeCombo(combo) : defaultLauncherCombo();
		list = [
			{
				keyCode: next.keyCode,
				ctrlKey: next.ctrlKey,
				altKey: next.altKey,
				shiftKey: next.shiftKey,
				metaKey: next.metaKey
			}
		];
		if (typeof next.macKeyCode === "number" && next.macKeyCode !== next.keyCode) {
			list.push({
				keyCode: next.macKeyCode,
				ctrlKey: next.ctrlKey,
				altKey: next.altKey,
				shiftKey: next.shiftKey,
				metaKey: next.metaKey
			});
		}
		return list;
	}

	function paletteInterests() {
		if (typeof PaletteKeyboard !== "undefined" && PaletteKeyboard.interests) {
			return PaletteKeyboard.interests();
		}
		return [
			{ keyCode: 38, ctrlKey: false, altKey: false, shiftKey: false, metaKey: false },
			{ keyCode: 40, ctrlKey: false, altKey: false, shiftKey: false, metaKey: false },
			{ keyCode: 13, ctrlKey: false, altKey: false, shiftKey: false, metaKey: false },
			{ keyCode: 27, ctrlKey: false, altKey: false, shiftKey: false, metaKey: false },
			{ keyCode: 126, ctrlKey: false, altKey: false, shiftKey: false, metaKey: false },
			{ keyCode: 125, ctrlKey: false, altKey: false, shiftKey: false, metaKey: false },
			{ keyCode: 36, ctrlKey: false, altKey: false, shiftKey: false, metaKey: false },
			{ keyCode: 76, ctrlKey: false, altKey: false, shiftKey: false, metaKey: false },
			{ keyCode: 53, ctrlKey: false, altKey: false, shiftKey: false, metaKey: false }
		];
	}

	function interests(options) {
		var list = [];
		if (!options || options.panelFocus !== false) {
			list = list.concat(panelFocusInterests());
		}
		if (!options || options.palette !== false) {
			list = list.concat(paletteInterests());
		}
		if (options && options.launcher === true) {
			list = list.concat(launcherInterests(options.combo));
		}
		return list;
	}

	function register(csInterface, options) {
		var next;
		var payload;
		var launcher;
		if (typeof PickFXCepKeyInterest !== "undefined" && PickFXCepKeyInterest.apply) {
			next = {
				palette: !options || options.palette !== false,
				panelFocus: !options || options.panelFocus !== false,
				launcher: !!(options && options.launcher === true)
			};
			if (options && options.combo != null) {
				next.combo = options.combo;
			}
			next.source = (options && options.source) || "TerminalKeyboardShortcut.register";
			return PickFXCepKeyInterest.apply(csInterface, next);
		}
		next = interests(options);
		payload = next.length ? JSON.stringify(next) : "";
		launcher = !!(options && options.launcher === true);
		if (!csInterface ||
				typeof csInterface.registerKeyEventsInterest !== "function") {
			return {
				ok: false,
				reason: "CEP_KEY_INTEREST_UNAVAILABLE",
				scope: launcher ? LAUNCHER_SCOPE : SCOPE,
				global: false,
				launcher: launcher,
				osGlobal: false
			};
		}
		try {
			csInterface.registerKeyEventsInterest(payload);
			return {
				ok: true,
				scope: launcher ? LAUNCHER_SCOPE : SCOPE,
				global: false,
				launcher: launcher,
				osGlobal: false,
				interests: next
			};
		} catch (error) {
			return {
				ok: false,
				reason: "CEP_KEY_INTEREST_REGISTRATION_FAILED",
				detail: String(error),
				scope: launcher ? LAUNCHER_SCOPE : SCOPE,
				global: false,
				launcher: launcher,
				osGlobal: false
			};
		}
	}

	function handle(event, platform, handlers, combo) {
		handlers = handlers || {};
		if (isLauncherShortcut(event, platform, combo) && handlers.openLauncher) {
			if (event.preventDefault) {
				event.preventDefault();
			}
			if (event.stopPropagation) {
				event.stopPropagation();
			}
			handlers.openLauncher();
			return {
				handled: true,
				action: "OPEN_LAUNCHER",
				scope: LAUNCHER_SCOPE
			};
		}
		if (isOpenShortcut(event, platform)) {
			if (event.preventDefault) {
				event.preventDefault();
			}
			if (event.stopPropagation) {
				event.stopPropagation();
			}
			if (handlers.focusAndSelect) {
				handlers.focusAndSelect();
			}
			return {
				handled: true,
				action: "FOCUS_AND_SELECT",
				scope: SCOPE
			};
		}
		return { handled: false, action: "" };
	}

	return {
		SPACE_KEY_CODE: SPACE_KEY_CODE,
		P_KEY_CODE: P_KEY_CODE,
		MAC_P_NATIVE_KEY_CODE: MAC_P_NATIVE_KEY_CODE,
		SCOPE: SCOPE,
		LAUNCHER_SCOPE: LAUNCHER_SCOPE,
		platformName: platformName,
		shortcutLabel: shortcutLabel,
		shortcutHint: shortcutHint,
		launcherShortcutLabel: launcherShortcutLabel,
		launcherShortcutHint: launcherShortcutHint,
		defaultLauncherCombo: defaultLauncherCombo,
		normalizeCombo: normalizeCombo,
		validateCombo: validateCombo,
		formatCombo: formatCombo,
		fromEvent: fromEvent,
		matchesCombo: matchesCombo,
		isOpenShortcut: isOpenShortcut,
		isLauncherShortcut: isLauncherShortcut,
		isEscape: isEscape,
		isArrow: isArrow,
		isEnter: isEnter,
		interests: interests,
		panelFocusInterests: panelFocusInterests,
		paletteInterests: paletteInterests,
		launcherInterests: launcherInterests,
		register: register,
		handle: handle
	};
}());

if (typeof module !== "undefined" && module.exports) {
	module.exports = TerminalKeyboardShortcut;
}
