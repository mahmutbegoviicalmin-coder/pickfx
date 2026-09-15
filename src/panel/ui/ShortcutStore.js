var ShortcutStore = (function () {
	var KEY = "pickfx.launcherShortcut.v1";
	var FILE_NAME = "launcher-shortcut.json";
	var CHANGED_EVENT = "com.pickfx.shortcut.changed";

	function defaultCombo() {
		return {
			key: "p",
			code: "KeyP",
			keyCode: 80,
			macKeyCode: 35,
			ctrlKey: false,
			altKey: false,
			shiftKey: true,
			metaKey: false,
			disabled: false
		};
	}

	function disabledCombo() {
		return {
			key: "",
			code: "",
			keyCode: 0,
			macKeyCode: 0,
			ctrlKey: false,
			altKey: false,
			shiftKey: false,
			metaKey: false,
			disabled: true,
			cleared: true
		};
	}

	function isDisabled(combo) {
		return !!(combo && (combo.disabled === true || combo.cleared === true || !combo.key));
	}

	function clone(combo) {
		var next = defaultCombo();
		var key;
		if (!combo) {
			return next;
		}
		if (combo.disabled === true || combo.cleared === true) {
			return disabledCombo();
		}
		for (key in next) {
			if (next.hasOwnProperty(key) && combo[key] !== undefined) {
				next[key] = combo[key];
			}
		}
		next.disabled = false;
		return next;
	}

	function memoryStorage() {
		var map = {};
		return {
			getItem: function (key) {
				return map.hasOwnProperty(key) ? map[key] : null;
			},
			setItem: function (key, value) {
				map[key] = String(value);
			},
			removeItem: function (key) {
				delete map[key];
			}
		};
	}

	function localStorageBackend() {
		try {
			if (typeof window !== "undefined" && window.localStorage) {
				return window.localStorage;
			}
		} catch (ignoreLocal) {}
		return null;
	}

	function filePath(csInterface) {
		var root;
		if (!csInterface || typeof csInterface.getSystemPath !== "function") {
			return "";
		}
		try {
			root = csInterface.getSystemPath(SystemPath.USER_DATA);
		} catch (ignorePath) {
			return "";
		}
		if (!root) {
			return "";
		}
		return String(root).replace(/\\/g, "/") + "/PickFX/" + FILE_NAME;
	}

	function readFile(path) {
		var result;
		if (!path || typeof window === "undefined" || !window.cep || !window.cep.fs ||
				typeof window.cep.fs.readFile !== "function") {
			return null;
		}
		try {
			result = window.cep.fs.readFile(path);
			if (result && result.err === 0) {
				return result.data;
			}
		} catch (ignoreRead) {}
		return null;
	}

	function writeFile(path, contents) {
		var folder;
		var result;
		if (!path || typeof window === "undefined" || !window.cep || !window.cep.fs) {
			return false;
		}
		try {
			folder = path.replace(/\/[^\/]+$/, "");
			if (typeof window.cep.fs.makedir === "function") {
				window.cep.fs.makedir(folder);
			}
			result = window.cep.fs.writeFile(path, contents);
			return !!(result && result.err === 0);
		} catch (ignoreWrite) {
			return false;
		}
	}

	function parse(raw) {
		var parsed;
		if (!raw) {
			return null;
		}
		try {
			parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
		} catch (ignoreParse) {
			return null;
		}
		if (!parsed) {
			return null;
		}
		if (parsed.disabled === true || parsed.cleared === true) {
			return disabledCombo();
		}
		if (!parsed.key) {
			return null;
		}
		return clone(parsed);
	}

	function load(options) {
		var storage = (options && options.storage) || localStorageBackend();
		var csInterface = options && options.csInterface;
		var fromFile = parse(readFile(filePath(csInterface)));
		var fromStorage;
		if (fromFile) {
			return fromFile;
		}
		if (storage && typeof storage.getItem === "function") {
			fromStorage = parse(storage.getItem(KEY));
			if (fromStorage) {
				return fromStorage;
			}
		}
		return defaultCombo();
	}

	function save(combo, options) {
		var next = clone(combo);
		var storage = (options && options.storage) || localStorageBackend();
		var csInterface = options && options.csInterface;
		var encoded = JSON.stringify(next);
		if (storage && typeof storage.setItem === "function") {
			storage.setItem(KEY, encoded);
		}
		writeFile(filePath(csInterface), encoded);
		return next;
	}

	function clear(options) {
		return save(disabledCombo(), options);
	}

	function reset(options) {
		return save(defaultCombo(), options);
	}

	return {
		KEY: KEY,
		CHANGED_EVENT: CHANGED_EVENT,
		defaultCombo: defaultCombo,
		disabledCombo: disabledCombo,
		isDisabled: isDisabled,
		clone: clone,
		memoryStorage: memoryStorage,
		load: load,
		save: save,
		clear: clear,
		reset: reset
	};
}());

if (typeof module !== "undefined" && module.exports) {
	module.exports = ShortcutStore;
}
