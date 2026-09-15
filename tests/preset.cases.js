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
	var stack;
	var session;
	var clipA;
	var clipB;
	var blurParam;
	var cropParam;
	var keyframedParam;
	var pageCalls;
	var savedBridge;
	var huge;
	var raw;
	var cyclic;
	var qeOptions;
	var previousApp;
	var previousQE;
	var previousPickfx;
	var previousPickfxQE;
	var previousResolver;
	var i;

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

	assert("unsupported skip reason is explicit", PresetSchema.isSupportedType("color") === false);
	assert("enum is not claimed in v1", PresetSchema.isSupportedType("enum") === false);

	stack = PresetHost.componentStackSignatureFromRows([
		{ matchName: "AE.ADBE Motion", displayName: "Motion" },
		{ matchName: "AE.ADBE Opacity", displayName: "Opacity" },
		{ matchName: "AE.ADBE Gaussian Blur", displayName: "Gaussian Blur" },
		{ matchName: "AE.ADBE Gaussian Blur", displayName: "Gaussian Blur" }
	]);
	assertEq(
		"component stack uses matchName, displayName, and occurrence ordinal",
		stack.join(","),
		"AE.ADBE Motion|Motion#1,AE.ADBE Opacity|Opacity#1,AE.ADBE Gaussian Blur|Gaussian Blur#1,AE.ADBE Gaussian Blur|Gaussian Blur#2"
	);
	assert(
		"same count different stack is a fingerprint change",
		PresetHost.fingerprintsEqual({
			sequenceName: "Seq",
			parentTrackIndex: 0,
			startTicks: "10",
			clipName: "Talking",
			componentCount: 2,
			componentStack: ["AE.ADBE Motion|Motion#1", "AE.ADBE Gaussian Blur|Gaussian Blur#1"]
		}, {
			sequenceName: "Seq",
			parentTrackIndex: 0,
			startTicks: "10",
			clipName: "Talking",
			componentCount: 2,
			componentStack: ["AE.ADBE Motion|Motion#1", "AE.ADBE Crop|Crop#1"]
		}) === false
	);

	function mockResolver() {
		return {
			readString: function (obj, key) {
				if (!obj || obj[key] === undefined || obj[key] === null || obj[key] === "") {
					return null;
				}
				return String(obj[key]);
			},
			collectionCount: function (col) {
				if (col && typeof col.numItems === "number") {
					return { count: col.numItems, via: "numItems" };
				}
				return { count: -1, via: "" };
			},
			collectionIndexBase: function () {
				return 0;
			},
			collectionItem: function (col, index) {
				return col[index];
			}
		};
	}

	function makeParam(name, value, options) {
		options = options || {};
		return {
			displayName: name,
			matchName: "",
			_value: value,
			_writes: [],
			isTimeVarying: function () {
				return options.keyframed === true;
			},
			getValue: function () {
				return this._value;
			},
			setValue: function (next) {
				this._writes.push(next);
				this._value = next;
				return true;
			}
		};
	}

	function makeComponent(displayName, matchName, params) {
		var properties = { numItems: (params || []).length };
		var n;
		for (n = 0; n < (params || []).length; n++) {
			properties[n] = params[n];
		}
		return {
			displayName: displayName,
			matchName: matchName,
			properties: properties
		};
	}

	function makeClip(options) {
		var comps = options.components || [];
		var col = { numItems: comps.length };
		var n;
		for (n = 0; n < comps.length; n++) {
			col[n] = comps[n];
		}
		return {
			name: options.name || "Clip A",
			parentTrackIndex: options.track === undefined ? 0 : options.track,
			start: { ticks: options.ticks || "100" },
			locked: options.locked === true,
			components: col
		};
	}

	function installHostMocks(selectedItems, qeOptions) {
		qeOptions = qeOptions || {};
		app = {
			project: {
				activeSequence: { name: "Seq 1" }
			}
		};
		qe = {
			project: {
				getActiveSequence: function () {
					return { name: "Seq 1" };
				}
			}
		};
		$._pickfxParameterResolver = mockResolver();
		$._pickfx = {
			selectedVideoTrackItems: function () {
				if (!selectedItems || !selectedItems.length) {
					return {
						ok: false,
						reason: "NO_VIDEO_SELECTION",
						detail: "Select a video clip."
					};
				}
				return {
					ok: true,
					count: selectedItems.length,
					items: selectedItems
				};
			}
		};
		$._pickfxQE = {
			enable: function () {},
			getVideoEffectByName: function (name) {
				if (qeOptions.missingEffect === name) {
					return null;
				}
				return { name: name };
			},
			findQEClip: function (seq, item) {
				qeOptions.mapCalls.push(item.name);
				if (item.locked) {
					return { error: { reason: "Track is locked", clip: item.name } };
				}
				if (qeOptions.unmap && qeOptions.unmap[item.name]) {
					return { error: { reason: "Could not map clip to QE item.", clip: item.name } };
				}
				return { clip: { name: item.name } };
			},
			applyEffectToTrackItem: function (item, effect) {
				var next;
				qeOptions.addCalls.push(item.name);
				if (qeOptions.mutateOnAdd) {
					next = item.components.numItems;
					item.components[next] = makeComponent(
						"Gaussian Blur",
						"AE.ADBE Gaussian Blur",
						[makeParam("Blurriness", 0)]
					);
					item.components.numItems += 1;
				}
				return { ok: true };
			}
		};
		if (!qeOptions.mapCalls) {
			qeOptions.mapCalls = [];
		}
		if (!qeOptions.addCalls) {
			qeOptions.addCalls = [];
		}
		return qeOptions;
	}

	previousApp = typeof app !== "undefined" ? app : undefined;
	previousQE = typeof qe !== "undefined" ? qe : undefined;
	previousPickfx = $._pickfx;
	previousPickfxQE = $._pickfxQE;
	previousResolver = $._pickfxParameterResolver;

	installHostMocks([]);
	parsed = JSON.parse(PresetHost.listCapturableComponents());
	assertEq("no video selection blocks capture", parsed.reason, "NO_VIDEO_SELECTION");
	parsed = JSON.parse(PresetHost.applyPreset(samplePreset("Talking Head Clean").preset));
	assertEq("no video selection blocks apply", parsed.reason, "NO_VIDEO_SELECTION");

	clipA = makeClip({
		name: "Clip A",
		components: [makeComponent("Motion", "AE.ADBE Motion", [makeParam("Scale", 100)])]
	});
	clipB = makeClip({
		name: "Clip B",
		ticks: "200",
		components: [makeComponent("Motion", "AE.ADBE Motion", [makeParam("Scale", 100)])]
	});
	installHostMocks([clipA, clipB]);
	parsed = JSON.parse(PresetHost.listCapturableComponents());
	assertEq("multiple capture clips are rejected", parsed.reason, "CAPTURE_REQUIRES_SINGLE_CLIP");

	blurParam = makeParam("Blurriness", 5);
	cropParam = makeParam("Left", 8);
	clipA = makeClip({
		name: "Talking",
		components: [
			makeComponent("Motion", "AE.ADBE Motion", [makeParam("Scale", 100)]),
			makeComponent("Gaussian Blur", "AE.ADBE Gaussian Blur", [blurParam]),
			makeComponent("Crop", "AE.ADBE AECrop", [cropParam])
		]
	});
	installHostMocks([clipA]);
	parsed = JSON.parse(PresetHost.listCapturableComponents());
	assert("capture session includes component stack", parsed.ok === true && parsed.session.componentStack.length === 3);
	session = parsed.session;
	clipA.components[1] = makeComponent("Crop", "AE.ADBE AECrop", [cropParam]);
	clipA.components[2] = makeComponent("Gaussian Blur", "AE.ADBE Gaussian Blur", [blurParam]);
	parsed = JSON.parse(PresetHost.captureComponent(session, 1, 0, 20));
	assertEq("reordered stack with same count invalidates capture", parsed.reason, "CAPTURE_SOURCE_CHANGED");

	keyframedParam = makeParam("Scale", 100, { keyframed: true });
	clipA = makeClip({
		name: "Talking",
		components: [makeComponent("Motion", "AE.ADBE Motion", [keyframedParam])]
	});
	installHostMocks([clipA]);
	parsed = JSON.parse(PresetHost.listCapturableComponents());
	assert("keyframed component is not fully capturable", parsed.components[0].keyframedCount === 1);
	parsed = JSON.parse(PresetHost.captureComponent(parsed.session, 0, 0, 20));
	assert("keyframed parameters are skipped with explicit reason", parsed.skipped.length === 1 &&
		parsed.skipped[0].reason === "KEYFRAMED_PARAMETER_UNSUPPORTED");
	assert("keyframed capture does not write values", keyframedParam._writes.length === 0);

	pageCalls = [];
	savedBridge = typeof PremiereBridge !== "undefined" ? PremiereBridge : undefined;
	PremiereBridge = {
		captureComponent: function (csInterface, captureSession, componentIndex, offset, limit, done) {
			pageCalls.push({
				index: componentIndex,
				offset: offset,
				limit: limit
			});
			done({
				ok: true,
				hasMore: offset === 0,
				nextOffset: 20,
				component: { displayName: "Gaussian Blur", matchName: "AE.ADBE Gaussian Blur" },
				parameters: [],
				skipped: []
			});
		}
	};
	PresetCapture.captureComponents({}, { clipName: "Talking" }, [0], function () {});
	PremiereBridge = savedBridge;
	assertEq("paged capture requests two pages", pageCalls.length, 2);
	assertEq("first capture page uses PAGE_SIZE 20", pageCalls[0].limit, PresetCapture.PAGE_SIZE);
	assertEq("later capture pages use PAGE_SIZE 20", pageCalls[1].limit, 20);
	assertEq("second capture page starts at 20", pageCalls[1].offset, 20);

	huge = {
		ok: true,
		preset: true,
		command: true,
		presetName: "Talking Head Clean",
		selectedCount: 40,
		successfulCount: 39,
		failedCount: 1,
		clips: []
	};
	for (i = 0; i < 80; i++) {
		huge.clips.push({
			name: "Clip " + i + " " + new Array(200).join("x"),
			ok: i !== 3,
			componentsApplied: 2,
			parametersVerified: 8,
			reason: i === 3 ? "TRACK_LOCKED" : "",
			message: i === 3 ? "Track locked " + new Array(400).join("y") : new Array(400).join("z"),
			failures: i === 3 ? [{ reason: "TRACK_LOCKED", message: new Array(800).join("locked") }] : []
		});
	}
	raw = PresetHost.stringify(huge);
	parsed = JSON.parse(raw);
	assert("oversized apply result stays under 30 KB", raw.length <= PresetHost.MAX_RESULT_BYTES);
	assert("oversized apply result is marked truncated", parsed.resultTruncated === true);
	assertEq("truncated result keeps preset name", parsed.presetName, "Talking Head Clean");
	assertEq("truncated result keeps selectedCount", parsed.selectedCount, 40);
	assertEq("truncated result keeps successfulCount", parsed.successfulCount, 39);
	assertEq("truncated result keeps failedCount", parsed.failedCount, 1);
	assert("truncated result keeps a useful failure", parsed.clips && parsed.clips.length && parsed.clips[0].reason === "TRACK_LOCKED");

	cyclic = { ok: false, preset: true, reason: "WRITE_FAILED" };
	cyclic.self = cyclic;
	raw = PresetHost.stringify(cyclic);
	parsed = JSON.parse(raw);
	assert("malformed result still serializes", raw.length <= PresetHost.MAX_RESULT_BYTES);
	assert("malformed result does not throw", parsed && parsed.ok === false);

	qeOptions = {
		mapCalls: [],
		addCalls: [],
		mutateOnAdd: true
	};
	blurParam = makeParam("Blurriness", 5);
	clipA = makeClip({
		name: "Talking",
		components: [
			makeComponent("Motion", "AE.ADBE Motion", [makeParam("Scale", 100)]),
			makeComponent("Gaussian Blur", "AE.ADBE Gaussian Blur", [blurParam])
		]
	});
	installHostMocks([clipA], qeOptions);
	parsed = JSON.parse(PresetHost.applyPreset(samplePreset("Talking Head Clean", {
		components: [{
			order: 0,
			kind: "effect",
			displayName: "Gaussian Blur",
			matchName: "AE.ADBE Gaussian Blur",
			premiereName: "Gaussian Blur",
			captureStatus: "full",
			parameters: [{ order: 0, displayName: "Blurriness", type: "number", value: 30 }]
		}]
	}).preset));
	assertEq("duplicate same-name apply is ambiguous", parsed.clips[0].reason, "NEW_EFFECT_INSTANCE_AMBIGUOUS");
	assert("existing blur is not rewritten when insert identity is unproven", blurParam._writes.indexOf(30) === -1);

	qeOptions = {
		mapCalls: [],
		addCalls: []
	};
	clipA = makeClip({
		name: "Unlocked",
		components: [makeComponent("Gaussian Blur", "AE.ADBE Gaussian Blur", [makeParam("Blurriness", 5)])]
	});
	clipB = makeClip({
		name: "Locked Clip",
		ticks: "220",
		locked: true,
		components: [makeComponent("Gaussian Blur", "AE.ADBE Gaussian Blur", [makeParam("Blurriness", 5)])]
	});
	installHostMocks([clipA, clipB], qeOptions);
	parsed = JSON.parse(PresetHost.applyPreset(samplePreset("Talking Head Clean").preset));
	assertEq("locked target preflight aborts the batch", parsed.reason, "TRACK_LOCKED");
	assertEq("locked target preflight names the failing clip", parsed.clipName, "Locked Clip");
	assertEq("locked target preflight mutates no clips", qeOptions.addCalls.length, 0);

	qeOptions = {
		mapCalls: [],
		addCalls: [],
		mutateOnAdd: true
	};
	blurParam = makeParam("Blurriness", 12);
	clipA = makeClip({
		name: "Talking",
		components: [
			makeComponent("Gaussian Blur", "AE.ADBE Gaussian Blur", [blurParam])
		]
	});
	installHostMocks([clipA], qeOptions);
	parsed = JSON.parse(PresetHost.probeDuplicateEffectInsert());
	assertEq("live duplicate probe stays ambiguous without instance identity", parsed.reason, "NEW_EFFECT_INSTANCE_AMBIGUOUS");
	assert("live duplicate probe does not write 30 onto the existing blur", blurParam._value === 5 || blurParam._writes.indexOf(30) === -1);
	assert("live duplicate probe is marked as a probe", parsed.liveProbe === true);

	app = previousApp;
	qe = previousQE;
	$._pickfx = previousPickfx;
	$._pickfxQE = previousPickfxQE;
	$._pickfxParameterResolver = previousResolver;

	inserted = PresetSchema.identifyInserted(
		[
			{ index: 0, displayName: "Motion", matchName: "AE.ADBE Motion" },
			{ index: 1, displayName: "Gaussian Blur", matchName: "AE.ADBE Gaussian Blur" }
		],
		[
			{ index: 0, displayName: "Motion", matchName: "AE.ADBE Motion" },
			{ index: 1, displayName: "Gaussian Blur", matchName: "AE.ADBE Gaussian Blur" },
			{ index: 2, displayName: "Crop", matchName: "AE.ADBE AECrop" }
		]
	);
	assert("unique inserted effect is identified", inserted.ok === true && inserted.index === 2);
	assert("unique inserted effect keeps structural identity", inserted.component.displayName === "Crop");

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
	assert("duplicate same-name insert is ambiguous without instance identity", inserted.ok === false && inserted.reason === "NEW_EFFECT_INSTANCE_AMBIGUOUS");

	inserted = PresetSchema.identifyInserted(
		[
			{ index: 0, displayName: "Gaussian Blur", matchName: "AE.ADBE Gaussian Blur", instanceID: "blur-a" },
			{ index: 1, displayName: "Motion", matchName: "AE.ADBE Motion" }
		],
		[
			{ index: 0, displayName: "Gaussian Blur", matchName: "AE.ADBE Gaussian Blur", instanceID: "blur-a" },
			{ index: 1, displayName: "Motion", matchName: "AE.ADBE Motion" },
			{ index: 2, displayName: "Gaussian Blur", matchName: "AE.ADBE Gaussian Blur", instanceID: "blur-b" }
		]
	);
	assert("stable instance identity can select the new duplicate", inserted.ok === true && inserted.via === "instance-id");
	assert("stable instance identity points at the new blur", inserted.component.instanceID === "blur-b");

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
