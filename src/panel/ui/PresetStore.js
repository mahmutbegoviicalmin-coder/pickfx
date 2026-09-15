var PresetStore = (function () {
	var DIRECTORY = "PickFX/presets";
	var ERR_OK = 0;

	function trim(value) {
		return String(value || "").replace(/^\s+|\s+$/g, "");
	}

	function schema() {
		if (typeof PresetSchema !== "undefined") {
			return PresetSchema;
		}
		if (typeof $ !== "undefined" && $._pickfxPresetSchema) {
			return $._pickfxPresetSchema;
		}
		return null;
	}

	function cepFs() {
		try {
			if (typeof window !== "undefined" && window.cep && window.cep.fs) {
				return window.cep.fs;
			}
		} catch (ignore) {}
		return null;
	}

	function joinPath(root, suffix) {
		var base = String(root || "").replace(/\\/g, "/").replace(/\/+$/, "");
		var rest = String(suffix || "").replace(/\\/g, "/").replace(/^\/+/, "");
		if (!base) {
			return "";
		}
		return rest ? base + "/" + rest : base;
	}

	function userDataRoot(csInterface) {
		var root;
		if (!csInterface || typeof csInterface.getSystemPath !== "function") {
			return "";
		}
		try {
			root = typeof SystemPath !== "undefined"
				? csInterface.getSystemPath(SystemPath.USER_DATA)
				: csInterface.getSystemPath("userData");
		} catch (ignorePath) {
			return "";
		}
		return String(root || "").replace(/\\/g, "/");
	}

	function presetsDirectory(csInterface) {
		return joinPath(userDataRoot(csInterface), DIRECTORY);
	}

	function fileNameForId(id) {
		var api = schema();
		if (!api || !api.isSafePresetId(id)) {
			return "";
		}
		return id + ".json";
	}

	function filePathForId(csInterface, id) {
		var dir = presetsDirectory(csInterface);
		var name = fileNameForId(id);
		if (!dir || !name) {
			return "";
		}
		return joinPath(dir, name);
	}

	function fsApi(options) {
		return (options && options.fs) || cepFs();
	}

	function storageStatus(options) {
		var fs = fsApi(options);
		var csInterface = options && options.csInterface;
		var root = options && options.userDataPath ? options.userDataPath : userDataRoot(csInterface);
		if (!fs || typeof fs.writeFile !== "function" || typeof fs.readFile !== "function") {
			return {
				ok: false,
				reason: "PRESET_STORAGE_UNAVAILABLE",
				detail: "PickFX cannot save presets in this environment."
			};
		}
		if (!root && !(options && options.directory)) {
			return {
				ok: false,
				reason: "PRESET_STORAGE_UNAVAILABLE",
				detail: "PickFX cannot find a user-data folder for presets."
			};
		}
		return {
			ok: true,
			directory: (options && options.directory) || joinPath(root, DIRECTORY)
		};
	}

	function mkdir(fs, path) {
		if (!path || !fs) {
			return false;
		}
		try {
			if (typeof fs.makedir === "function") {
				fs.makedir(path);
			}
			return true;
		} catch (ignore) {
			return false;
		}
	}

	function ensureDirectory(options) {
		var status = storageStatus(options);
		var fs = fsApi(options);
		var dir;
		var parent;
		if (!status.ok) {
			return status;
		}
		dir = status.directory;
		parent = dir.replace(/\/presets$/, "");
		mkdir(fs, parent);
		mkdir(fs, dir);
		return status;
	}

	function readPath(fs, path) {
		var result;
		if (!path || !fs || typeof fs.readFile !== "function") {
			return null;
		}
		try {
			result = fs.readFile(path);
			if (result && result.err === ERR_OK) {
				return result.data;
			}
		} catch (ignoreRead) {}
		return null;
	}

	function writePath(fs, path, contents) {
		var result;
		if (!path || !fs || typeof fs.writeFile !== "function") {
			return false;
		}
		try {
			result = fs.writeFile(path, contents);
			return !!(result && result.err === ERR_OK);
		} catch (ignoreWrite) {
			return false;
		}
	}

	function deletePath(fs, path) {
		if (!path || !fs) {
			return false;
		}
		try {
			if (typeof fs.deleteFile === "function") {
				return fs.deleteFile(path).err === ERR_OK;
			}
		} catch (ignoreDelete) {}
		return false;
	}

	function listFileNames(fs, dir) {
		var result;
		var names = [];
		var i;
		if (!fs) {
			return names;
		}
		try {
			if (typeof fs.readdir === "function") {
				result = fs.readdir(dir);
				if (result && result.err === ERR_OK && result.data && result.data.length) {
					for (i = 0; i < result.data.length; i++) {
						names.push(String(result.data[i]));
					}
				}
			}
		} catch (ignoreList) {}
		return names;
	}

	function parseAndValidate(raw) {
		var api = schema();
		var parsed;
		if (!api) {
			return { ok: false, reason: "INVALID_PRESET", detail: "Preset schema is not loaded." };
		}
		if (!raw) {
			return { ok: false, reason: "INVALID_PRESET", detail: "Preset file is empty." };
		}
		try {
			parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
		} catch (parseErr) {
			return { ok: false, reason: "INVALID_PRESET", detail: "Preset JSON is malformed." };
		}
		return api.validate(parsed);
	}

	function list(options) {
		var status = ensureDirectory(options);
		var fs = fsApi(options);
		var names;
		var i;
		var name;
		var id;
		var raw;
		var checked;
		var presets = [];
		var ignored = [];
		if (!status.ok) {
			return {
				ok: false,
				reason: status.reason,
				detail: status.detail,
				presets: [],
				ignored: []
			};
		}
		names = listFileNames(fs, status.directory);
		for (i = 0; i < names.length; i++) {
			name = names[i];
			if (!/\.json$/i.test(name) || name === "index.json") {
				continue;
			}
			id = name.replace(/\.json$/i, "");
			raw = readPath(fs, joinPath(status.directory, name));
			checked = parseAndValidate(raw);
			if (checked.ok && checked.preset && checked.preset.id === id) {
				presets.push(checked.preset);
			} else {
				ignored.push({
					file: name,
					reason: (checked && checked.reason) || "INVALID_PRESET"
				});
			}
		}
		presets.sort(function (a, b) {
			if (a.name.toLowerCase() < b.name.toLowerCase()) {
				return -1;
			}
			if (a.name.toLowerCase() > b.name.toLowerCase()) {
				return 1;
			}
			return 0;
		});
		return {
			ok: true,
			presets: presets,
			ignored: ignored,
			directory: status.directory
		};
	}

	function get(id, options) {
		var status = storageStatus(options);
		var fs = fsApi(options);
		var path;
		var checked;
		if (!status.ok) {
			return status;
		}
		path = joinPath(status.directory, fileNameForId(id));
		if (!path) {
			return { ok: false, reason: "INVALID_PRESET", detail: "Preset id is invalid." };
		}
		checked = parseAndValidate(readPath(fs, path));
		if (!checked.ok) {
			return checked;
		}
		return checked;
	}

	function findByName(name, presets) {
		var api = schema();
		var i;
		for (i = 0; i < (presets || []).length; i++) {
			if (api && api.namesEqual(presets[i].name, name)) {
				return presets[i];
			}
		}
		return null;
	}

	function save(preset, options) {
		var api = schema();
		var status;
		var fs;
		var checked;
		var existing;
		var listed;
		var path;
		var encoded;
		if (!api) {
			return { ok: false, reason: "INVALID_PRESET", detail: "Preset schema is not loaded." };
		}
		checked = api.validate(preset);
		if (!checked.ok) {
			return checked;
		}
		status = ensureDirectory(options);
		if (!status.ok) {
			return {
				ok: false,
				reason: "PRESET_STORAGE_UNAVAILABLE",
				detail: status.detail || "PickFX cannot save presets in this environment."
			};
		}
		listed = list(options);
		existing = findByName(checked.preset.name, listed.presets);
		if (existing && existing.id !== checked.preset.id && !(options && options.replaceId === existing.id)) {
			return {
				ok: false,
				reason: "NAME_CONFLICT",
				detail: "A preset with that name already exists.",
				existing: existing
			};
		}
		if (options && options.replaceId) {
			checked.preset.id = options.replaceId;
			if (existing && existing.id === options.replaceId && existing.createdAt) {
				checked.preset.createdAt = existing.createdAt;
			}
		}
		fs = fsApi(options);
		path = joinPath(status.directory, fileNameForId(checked.preset.id));
		try {
			encoded = JSON.stringify(checked.preset);
		} catch (serErr) {
			return { ok: false, reason: "INVALID_PRESET", detail: "Preset could not be serialized." };
		}
		if (!writePath(fs, path, encoded)) {
			return {
				ok: false,
				reason: "PRESET_STORAGE_UNAVAILABLE",
				detail: "PickFX could not write the preset file."
			};
		}
		return { ok: true, preset: checked.preset, path: path };
	}

	function rename(id, newName, options) {
		var current = get(id, options);
		var next;
		if (!current.ok) {
			return current;
		}
		next = current.preset;
		next.name = schema().normalizeName(newName);
		next.updatedAt = (options && options.now) || new Date().toISOString();
		return save(next, options);
	}

	function remove(id, options) {
		var status = storageStatus(options);
		var path;
		if (!status.ok) {
			return {
				ok: false,
				reason: "PRESET_STORAGE_UNAVAILABLE",
				detail: status.detail
			};
		}
		path = joinPath(status.directory, fileNameForId(id));
		if (!path) {
			return { ok: false, reason: "INVALID_PRESET", detail: "Preset id is invalid." };
		}
		if (!deletePath(fsApi(options), path)) {
			return {
				ok: false,
				reason: "PRESET_STORAGE_UNAVAILABLE",
				detail: "PickFX could not delete the preset file."
			};
		}
		return { ok: true, id: id };
	}

	return {
		DIRECTORY: DIRECTORY,
		storageStatus: storageStatus,
		list: list,
		get: get,
		save: save,
		rename: rename,
		delete: remove,
		findByName: findByName,
		fileNameForId: fileNameForId,
		presetsDirectory: presetsDirectory
	};
}());

if (typeof module !== "undefined" && module.exports) {
	module.exports = PresetStore;
}
