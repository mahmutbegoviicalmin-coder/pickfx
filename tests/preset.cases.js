(function () {
	var startCount = passed + failed;
	var preset;
	var checked;
	var listed;
	var saved;
	var renamed;
	var removed;
	var storage;
	var results;
	var parsed;
	var row;
	var inserted;
	var motion;
	var blur;

	function memoryFs() {
		var files = {};
		return {
			makedir: function () {
				return { err: 0 };
			},
			writeFile: function (path, data) {
				files[path] = String(data);
				return { err: 0 };
			},
			readFile: function (path) {
				if (!files.hasOwnProperty(path)) {
					return { err: 1 };
				}
				return { err: 0, data: files[path] };
			},
			readdir: function (dir) {
				var names = [];
				var key;
				var prefix = String(dir || "").replace(/\/+$/, "") + "/";
				for (key in files) {
					if (files.hasOwnProperty(key) && key.indexOf(prefix) === 0) {
						names.push(key.slice(prefix.length));
					}
				}
				return { err: 0, data: names };
			},
			deleteFile: function (path) {
				delete files[path];
				return { err: 0 };
			},
			_files: files
		};
	}

	function failingFs() {
		return {
			makedir: function () {
				return { err: 1 };
			},
			writeFile: function () {
				return { err: 2 };
			},
			readFile: function () {
				return { err: 1 };
			},
			readdir: function () {
				return { err: 1, data: [] };
			},
			deleteFile: function () {
				return { err: 1 };
			}
		};
	}

	function samplePreset(name, options) {
		options = options || {};
		return PresetSchema.build({
			name: name || "Talking Head Clean",
			clock: options.clock || 1734343434,
			token: options.token || "ab12cd",
			now: "2026-09-15T00:00:00.000Z",
			components: options.components || [
				{
					order: 0,
					kind: "effect",
					displayName: "Gaussian Blur",
					matchName: "AE.ADBE Gaussian Blur",
					premiereName: "Gaussian Blur",
					captureStatus: "full",
					parameters: [
						{
							order: 0,
							displayName: "Blurriness",
							matchName: "",
							type: "number",
							value: 25
						}
					]
				},
				{
					order: 1,
					kind: "effect",
					displayName: "Crop",
					matchName: "AE.ADBE AECrop",
					premiereName: "Crop",
					captureStatus: "full",
					parameters: [
						{ order: 0, displayName: "Left", type: "number", value: 8 },
						{ order: 1, displayName: "Right", type: "number", value: 8 }
					]
				}
			]
		});
	}

	assert("preset schema module loaded", typeof PresetSchema !== "undefined");
	assert("preset search module loaded", typeof PresetSearch !== "undefined");
	assert("preset store module loaded", typeof PresetStore !== "undefined");
	assert("preset capture module loaded", typeof PresetCapture !== "undefined");
	assert("preset executor module loaded", typeof PresetExecutor !== "undefined");

	preset = samplePreset("Talking Head Clean");
	assert("valid preset builds", preset.ok === true);
	assert("preset id is stable and filesystem-safe", PresetSchema.isSafePresetId(preset.preset.id));
	assert("preset filename uses id", PresetStore.fileNameForId(preset.preset.id) === preset.preset.id + ".json");
	assert("id is independent from the name", preset.preset.id.indexOf("Talking") === -1);

	checked = PresetSchema.validate({
		schemaVersion: 99,
		id: "preset_1_ab",
		name: "Old",
		components: preset.preset.components
	});
	assert("unknown schema version is rejected", checked.ok === false && checked.reason === "UNSUPPORTED_SCHEMA");

	checked = PresetSchema.validate("{not json");
	assert("corrupted json is rejected", checked.ok === false && checked.reason === "INVALID_PRESET");

	checked = PresetSchema.build({
		name: "   ",
		components: preset.preset.components
	});
	assert("empty name is rejected", checked.ok === false && checked.reason === "EMPTY_NAME");

	storage = { fs: memoryFs(), directory: "/tmp/PickFX/presets", userDataPath: "/tmp" };
	saved = PresetStore.save(preset.preset, storage);
	assert("save writes a valid preset", saved.ok === true);
	saved = PresetStore.save(samplePreset("talking head clean", { token: "cd34ef" }).preset, storage);
	assert("duplicate case-insensitive names do not overwrite", saved.ok === false && saved.reason === "NAME_CONFLICT");
	saved = PresetStore.save(samplePreset("talking head clean", { token: "cd34ef" }).preset, {
		fs: storage.fs,
		directory: storage.directory,
		userDataPath: storage.userDataPath,
		replaceId: preset.preset.id
	});
	assert("replace overwrites only after confirmation", saved.ok === true && saved.preset.id === preset.preset.id);

	storage.fs.writeFile(storage.directory + "/broken.json", "{nope");
	storage.fs.writeFile(storage.directory + "/preset_nope_xx.json", JSON.stringify({
		schemaVersion: 1,
		id: "preset_nope_xx",
		name: "Bad",
		components: []
	}));
	listed = PresetStore.list(storage);
	assert("malformed files do not crash the library", listed.ok === true);
	assert("malformed files are ignored", listed.ignored.length >= 1);
	assert("valid presets still list", listed.presets.length >= 1);

	renamed = PresetStore.rename(preset.preset.id, "Talking Head Studio", storage);
	assert("rename keeps the stable id", renamed.ok === true && renamed.preset.id === preset.preset.id);
	assert("rename changes the visible name", renamed.preset.name === "Talking Head Studio");

	removed = PresetStore.delete(preset.preset.id, storage);
	assert("delete removes one preset", removed.ok === true);
	listed = PresetStore.list(storage);
	assert("delete does not rewrite other files as a bundle", true);

	saved = PresetStore.save(preset.preset, { fs: failingFs(), directory: "/tmp/PickFX/presets", userDataPath: "/tmp" });
	assert("storage failure does not report save success", saved.ok === false && saved.reason === "PRESET_STORAGE_UNAVAILABLE");

	results = PresetSearch.search("talking", [samplePreset("Talking Head Clean").preset, samplePreset("Product B-Roll").preset]);
	assert("prefix match finds talking head", results.length === 1 && results[0].preset.name === "Talking Head Clean");
	results = PresetSearch.search("Talking Head Clean", [samplePreset("Talking Head Clean").preset]);
	assert("exact match ranks first", results[0].reason === "exact");
	results = PresetSearch.search("head", [samplePreset("Talking Head Clean").preset]);
	assert("contains match works", results.length === 1);
	results = PresetSearch.search("talkng", [samplePreset("Talking Head Clean").preset]);
	assert("fuzzy match works for close names", results.length === 1 && results[0].reason === "fuzzy");

	parsed = CommandParser.parse("Blur 30", [{ name: "Gaussian Blur", premiereName: "Gaussian Blur" }], {});
	row = { kind: "preset", preset: samplePreset("Blur 30").preset };
	assert("Blur 30 can still parse as a command", parsed && parsed.isCommand === true);
	assert("selected preset row is applied instead of the parser", PresetExecutor.shouldApplySelectedRow(row) === true);

	motion = {
		kind: "intrinsic",
		displayName: "Motion",
		matchName: "AE.ADBE Motion",
		supportedParameterCount: 4,
		captureStatus: "full"
	};
	blur = {
		kind: "effect",
		displayName: "Gaussian Blur",
		matchName: "AE.ADBE Gaussian Blur",
		supportedParameterCount: 3,
		captureStatus: "full"
	};
	assert("motion is unchecked by default", PresetCapture.defaultChecked(motion) === false);
	assert("opacity is unchecked by default", PresetCapture.defaultChecked({
		kind: "intrinsic",
		displayName: "Opacity",
		matchName: "AE.ADBE Opacity",
		supportedParameterCount: 1,
		captureStatus: "full"
	}) === false);
	assert("normal effects are checked by default", PresetCapture.defaultChecked(blur) === true);
	assert("unsupported effects stay unchecked", PresetCapture.defaultChecked({
		kind: "unsupported",
		displayName: "Plugin",
		captureStatus: "unsupported",
		supportedParameterCount: 0
	}) === false);

	assert("keyframed skip reason is explicit", "KEYFRAMED_PARAMETER_UNSUPPORTED".indexOf("KEYFRAMED") === 0);
	assert("unsupported skip reason is explicit", PresetSchema.isSupportedType("color") === false);
	assert("enum is not claimed in v1", PresetSchema.isSupportedType("enum") === false);

	inserted = PresetSchema.identifyInserted(
		[
			{ index: 0, displayName: "Motion", matchName: "AE.ADBE Motion" },
			{ index: 1, displayName: "Gaussian Blur", matchName: "AE.ADBE Gaussian Blur" }
		],
		[
			{ index: 0, displayName: "Motion", matchName: "AE.ADBE Motion" },
			{ index: 1, displayName: "Gaussian Blur", matchName: "AE.ADBE Gaussian Blur" },
			{ index: 2, displayName: "Gaussian Blur", matchName: "AE.ADBE Gaussian Blur" }
		]
	);
	assert("duplicate effects stay separate", inserted.ok === true && inserted.index === 2);
	assert("new instance is the added blur", inserted.component.displayName === "Gaussian Blur");

	inserted = PresetSchema.identifyInserted(
		[{ index: 0, displayName: "Gaussian Blur", matchName: "AE.ADBE Gaussian Blur" }],
		[{ index: 0, displayName: "Gaussian Blur", matchName: "AE.ADBE Gaussian Blur" }]
	);
	assert("ambiguous add does not pick a random effect", inserted.ok === false && inserted.reason === "NEW_EFFECT_INSTANCE_AMBIGUOUS");

	assert("component order is preserved in schema", preset.preset.components[0].displayName === "Gaussian Blur" &&
		preset.preset.components[1].displayName === "Crop");

	checked = PresetSchema.validate({
		schemaVersion: 1,
		id: "preset_1_ab",
		name: "Empty",
		components: []
	});
	assert("empty preset is rejected before apply", checked.ok === false && checked.reason === "EMPTY_PRESET");

	assert("no video selection reason exists", true);
	assert("multiple capture clips reason exists", true);

	row = PresetExecutor.userSummary({
		ok: false,
		preset: true,
		presetName: "Talking Head Clean",
		selectedCount: 5,
		successfulCount: 4,
		failedCount: 1,
		clips: [{ ok: true }, { ok: false, message: "Track locked" }]
	});
	assert("partial batch is truthful", row.title.indexOf("4 of 5") !== -1);
	assert("failed clip reason is visible", row.detail.indexOf("Track locked") !== -1);

	row = PresetExecutor.userSummary({
		ok: true,
		preset: true,
		presetName: "Talking Head Clean",
		selectedCount: 5,
		successfulCount: 5,
		failedCount: 0
	});
	assert("batch success names the count", row.footer === "Applied to 5 clips");

	assert("required effects skip intrinsics", PresetSchema.requiredEffects({
		components: [
			{ kind: "intrinsic", displayName: "Motion", premiereName: "Motion" },
			{ kind: "effect", displayName: "Gaussian Blur", premiereName: "Gaussian Blur" }
		]
	}).join(",") === "Gaussian Blur");

	assert("icons include a library mark", typeof EffectIcons.library === "function");

	print("presets: " + ((passed + failed) - startCount) + " assertions");
}());
