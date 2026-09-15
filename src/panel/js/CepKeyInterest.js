var PickFXCepKeyInterest = (function () {
	/**
	 * CEP registerKeyEventsInterest uses OS virtual key codes, not
	 * KeyboardEvent.key / .code / Windows-style JS keyCode.
	 *
	 * Verified from MacOSX15.4.sdk HIToolbox/Events.h:
	 *   kVK_ANSI_P=0x23 (35), kVK_Return=0x24 (36), kVK_Space=0x31 (49),
	 *   kVK_Escape=0x35 (53), kVK_ANSI_KeypadEnter=0x4C (76),
	 *   kVK_LeftArrow=0x7B (123), kVK_RightArrow=0x7C (124),
	 *   kVK_DownArrow=0x7D (125), kVK_UpArrow=0x7E (126)
	 */
	var MAC = {
		A: 0,
		P: 35,
		RETURN: 36,
		TAB: 48,
		SPACE: 49,
		ESCAPE: 53,
		KEYPAD_ENTER: 76,
		LEFT: 123,
		RIGHT: 124,
		DOWN: 125,
		UP: 126
	};
	var WIN = {
		RETURN: 13,
		ESCAPE: 27,
		SPACE: 32,
		LEFT: 37,
		UP: 38,
		RIGHT: 39,
		DOWN: 40,
		P: 80
	};
	var MAC_LETTERS = {
		a: 0, s: 1, d: 2, f: 3, h: 4, g: 5, z: 6, x: 7, c: 8, v: 9,
		b: 11, q: 12, w: 13, e: 14, r: 15, y: 16, t: 17, o: 31, u: 32,
		i: 34, p: 35, l: 37, j: 38, k: 40, n: 45, m: 46
	};
	var WIN_LETTERS = {
		a: 65, b: 66, c: 67, d: 68, e: 69, f: 70, g: 71, h: 72, i: 73,
		j: 74, k: 75, l: 76, m: 77, n: 78, o: 79, p: 80, q: 81, r: 82,
		s: 83, t: 84, u: 85, v: 86, w: 87, x: 88, y: 89, z: 90
	};
	var last = {
		ok: false,
		platform: "",
		payload: "[]",
		interests: [],
		combo: null
	};
	var DEFAULT_COMBO = {
		key: "p",
		shiftKey: true,
		ctrlKey: false,
		altKey: false,
		metaKey: false
	};

	function isMac(csInterface) {
		var info;
		if (csInterface && typeof csInterface.getOSInformation === "function") {
			try {
				info = String(csInterface.getOSInformation() || "").toLowerCase();
				if (info.indexOf("win") !== -1) {
					return false;
				}
				if (info.indexOf("mac") !== -1 || info.indexOf("darwin") !== -1) {
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
			info = String(
				(navigator.userAgentData && navigator.userAgentData.platform) ||
					navigator.platform ||
					navigator.userAgent ||
					""
			).toLowerCase();
			if (info.indexOf("win") !== -1) {
				return false;
			}
			return info.indexOf("mac") !== -1 || info.indexOf("darwin") !== -1;
		}
		return false;
	}

	function keyOnly(keyCode) {
		return { keyCode: keyCode };
	}

	function keyWith(keyCode, mods) {
		var row = { keyCode: keyCode };
		if (mods.ctrlKey) {
			row.ctrlKey = true;
		}
		if (mods.altKey) {
			row.altKey = true;
		}
		if (mods.shiftKey) {
			row.shiftKey = true;
		}
		if (mods.metaKey) {
			row.metaKey = true;
		}
		return row;
	}

	function paletteInterests(mac) {
		if (mac) {
			return [
				keyOnly(MAC.UP),
				keyOnly(MAC.DOWN),
				keyOnly(MAC.LEFT),
				keyOnly(MAC.RIGHT),
				keyOnly(MAC.RETURN),
				keyOnly(MAC.KEYPAD_ENTER),
				keyOnly(MAC.ESCAPE)
			];
		}
		return [
			keyOnly(WIN.UP),
			keyOnly(WIN.DOWN),
			keyOnly(WIN.LEFT),
			keyOnly(WIN.RIGHT),
			keyOnly(WIN.RETURN),
			keyOnly(WIN.ESCAPE)
		];
	}

	function letterCode(letter, mac) {
		letter = String(letter || "").toLowerCase();
		if (mac) {
			return MAC_LETTERS[letter] !== undefined ? MAC_LETTERS[letter] : MAC.P;
		}
		return WIN_LETTERS[letter] !== undefined ? WIN_LETTERS[letter] : WIN.P;
	}

	function spaceCode(mac) {
		return mac ? MAC.SPACE : WIN.SPACE;
	}

	function panelFocusInterests(mac) {
		var space = spaceCode(mac);
		if (mac) {
			return [keyWith(space, { metaKey: true })];
		}
		return [keyWith(space, { ctrlKey: true })];
	}

	function launcherInterests(combo, mac) {
		var letter;
		var code;
		var mods;
		if (!combo || combo.disabled === true || combo.cleared === true) {
			return [];
		}
		mods = {
			ctrlKey: !!combo.ctrlKey,
			altKey: !!combo.altKey,
			shiftKey: !!combo.shiftKey,
			metaKey: !!combo.metaKey
		};
		if (combo.key === " " || combo.code === "Space") {
			return [keyWith(spaceCode(mac), mods)];
		}
		letter = combo.key && String(combo.key).length === 1
			? String(combo.key).toLowerCase()
			: (combo.code && /^Key[A-Z]$/.test(combo.code) ? combo.code.slice(3).toLowerCase() : "p");
		code = letterCode(letter, mac);
		return [keyWith(code, mods)];
	}

	function build(options) {
		var csInterface = options && options.csInterface;
		var mac = isMac(csInterface);
		var list = [];
		if (!options || options.palette !== false) {
			list = list.concat(paletteInterests(mac));
		}
		if (!options || options.panelFocus !== false) {
			list = list.concat(panelFocusInterests(mac));
		}
		if (options && options.launcher === true) {
			list = list.concat(launcherInterests(options.combo, mac));
		}
		return {
			mac: mac,
			interests: list,
			payload: JSON.stringify(list)
		};
	}

	function currentCs() {
		return typeof CSInterface !== "undefined" ? new CSInterface() : null;
	}

	function nativeRegister(csInterface, payload) {
		var returned;
		if (typeof window !== "undefined" && window.__adobe_cep__ &&
				typeof window.__adobe_cep__.registerKeyEventsInterest === "function") {
			returned = window.__adobe_cep__.registerKeyEventsInterest(payload);
			return { ok: true, returned: returned, via: "__adobe_cep__" };
		}
		if (csInterface && typeof csInterface.registerKeyEventsInterest === "function") {
			returned = csInterface.registerKeyEventsInterest(payload);
			return { ok: true, returned: returned, via: "CSInterface" };
		}
		return { ok: false, reason: "CEP_KEY_INTEREST_UNAVAILABLE" };
	}

	function apply(csInterface, options) {
		var built;
		var result;
		options = options || {};
		options.csInterface = csInterface || options.csInterface || currentCs();
		if (options.combo != null) {
			last.combo = options.combo;
		} else if (!last.combo) {
			last.combo = DEFAULT_COMBO;
		}
		if (options.launcher === true) {
			options.combo = last.combo;
		}
		built = build(options);
		last.platform = built.mac ? "mac" : "win";
		last.mac = built.mac;
		last.payload = built.payload;
		last.interests = built.interests;
		try {
			result = nativeRegister(options.csInterface, built.payload);
			last.ok = result.ok === true;
			last.returned = result.returned;
			if (!result.ok) {
				last.error = result.reason || "REGISTER_FAILED";
			} else {
				last.error = "";
			}
		} catch (err) {
			last.ok = false;
			last.error = String(err);
		}
		return {
			ok: last.ok,
			skipped: false,
			platform: last.platform,
			payload: last.payload,
			interests: last.interests,
			error: last.error,
			returned: last.returned,
			osGlobal: false,
			registered: last.ok,
			launcher: !!(options && options.launcher === true)
		};
	}

	return {
		MAC: MAC,
		WIN: WIN,
		MAC_DOWN: MAC.DOWN,
		isMac: isMac,
		paletteInterests: paletteInterests,
		launcherInterests: launcherInterests,
		build: build,
		apply: apply,
		status: function () {
			return last;
		}
	};
}());

if (typeof module !== "undefined" && module.exports) {
	module.exports = PickFXCepKeyInterest;
}
