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
	var classified;
	var controls;
	var sharedFs;
	var accountIds;
	var i;
	var panelSource;

	var USER_A = "11111111-1111-4111-8111-111111111111";
	var USER_B = "22222222-2222-4222-8222-222222222222";

	function scopedStorage(userId, fs, extra) {
		var options = extra || {};
		options.fs = fs || memoryFs();
		options.userId = userId || USER_A;
		if (!options.userDataPath) {
			options.userDataPath = "/tmp";
		}
		return options;
	}

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

	storage = scopedStorage(USER_A, memoryFs(), { directory: "/tmp/PickFX/users/" + USER_A + "/presets" });
	saved = PresetStore.save(preset.preset, storage);
	assert("save writes a valid preset", saved.ok === true);
	saved = PresetStore.save(samplePreset("talking head clean", { token: "cd34ef" }).preset, storage);
	assert("duplicate case-insensitive names do not overwrite", saved.ok === false && saved.reason === "NAME_CONFLICT");
	saved = PresetStore.save(samplePreset("talking head clean", { token: "cd34ef" }).preset, {
		fs: storage.fs,
		directory: storage.directory,
		userDataPath: storage.userDataPath,
		replaceId: preset.preset.id,
		userId: USER_A
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

	saved = PresetStore.save(preset.preset, { fs: failingFs(), directory: "/tmp/PickFX/presets", userDataPath: "/tmp", userId: USER_A });
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
			matchName: options.matchName || "",
			_value: value,
			_writes: [],
			numKeys: options.actualKeys || 0,
			getKeys: function () {
				var keys = [];
				var k;
				for (k = 0; k < (options.actualKeys || 0); k++) {
					keys.push(k);
				}
				return keys;
			},
			isTimeVarying: function () {
				return options.keyframed === true || (options.actualKeys || 0) > 0;
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
		if (!$._pickfxParameterWriter) {
			$._pickfxParameterWriter = {};
		}
		$._pickfxParameterWriter.writeResolved = function (param, value, kind) {
			var actual;
			if (!param || typeof param.setValue !== "function") {
				return { ok: false, reason: "NOT_WRITABLE", type: kind };
			}
			try {
				param.setValue(value, true);
			} catch (setTwoErr) {
				try {
					param.setValue(value);
				} catch (setOneErr) {
					return { ok: false, reason: "WRITE_FAILED", type: kind, detail: String(setOneErr) };
				}
			}
			try {
				actual = param.getValue();
			} catch (readErr) {
				return { ok: false, reason: "VALUE_NOT_VERIFIED", type: kind };
			}
			if (kind === "point" && actual && actual.length === 2 && value && value.length === 2) {
				if (actual[0] !== value[0] || actual[1] !== value[1]) {
					return { ok: false, reason: "VALUE_NOT_VERIFIED", type: kind };
				}
			} else if (actual !== value) {
				return { ok: false, reason: "VALUE_NOT_VERIFIED", type: kind };
			}
			return { ok: true, verified: true, type: kind, actualValue: actual };
		};
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
				qeOptions.addCalls.push(effect && effect.name ? effect.name : item.name);
				if (qeOptions.mutateOnAdd) {
					next = item.components.numItems;
					item.components[next] = makeComponent(
						effect && effect.name ? effect.name : "Gaussian Blur",
						effect && effect.name === "Gaussian Blur" ? "AE.ADBE Gaussian Blur" : "",
						[
							makeParam("Blurriness", 0),
							makeParam("Exposure", 0),
							makeParam("Brightness", 0)
						]
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
	assert("time-varying without keys stays capturable", parsed.components[0].supportedParameterCount === 1);
	assert("time-varying without keys is not marked animated", parsed.components[0].keyframedCount === 0);

	keyframedParam = makeParam("Scale", 100, { actualKeys: 2 });
	clipA = makeClip({
		name: "Talking",
		components: [makeComponent("Motion", "AE.ADBE Motion", [keyframedParam])]
	});
	installHostMocks([clipA]);
	parsed = JSON.parse(PresetHost.listCapturableComponents());
	assert("actual keys are counted as animation", parsed.components[0].keyframedCount === 1);
	parsed = JSON.parse(PresetHost.captureComponent(parsed.session, 0, 0, 20));
	assert("actual keys are skipped with animation reason", parsed.skipped.length === 1 &&
		parsed.skipped[0].reason === "ANIMATION_REPLAY_NOT_YET_VERIFIED");
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

	assert("preset capability module loaded", typeof PresetCapability !== "undefined");
	assert("production types include number boolean point", PresetCapability.isProductionType("number") &&
		PresetCapability.isProductionType("boolean") && PresetCapability.isProductionType("point") &&
		PresetCapability.isProductionType("angle"));
	assert("color remains a production stub", PresetCapability.pickfxWriterSupportsType("color") === false);
	assert("enum remains a production stub", PresetCapability.pickfxWriterSupportsType("enum") === false);

	clipA = makeClip({
		name: "Talking",
		components: [
			makeComponent("Motion", "AE.ADBE Motion", [
				makeParam("Position", [0.5, 0.5]),
				makeParam("Scale", 100),
				makeParam("Rotation", 12)
			]),
			makeComponent("Opacity", "AE.ADBE Opacity", [makeParam("Opacity", 80)]),
			makeComponent("Gaussian Blur", "AE.ADBE Gaussian Blur", [
				makeParam("Blurriness", 12),
				makeParam("Repeat Edge Pixels", true)
			]),
			makeComponent("S_Glow", "S_Glow", [makeParam("Brightness", 40)]),
			makeComponent("Lumetri Color", "AE.ADBE Lumetri", [
				makeParam("Exposure", 0.25),
				makeParam("Contrast", 10)
			])
		]
	});
	installHostMocks([clipA]);
	parsed = JSON.parse(PresetHost.listCapturableComponents());
	assert("generic capture has no effect allowlist", parsed.ok === true && parsed.components.length === 5);
	assert("motion is intrinsic and checkable", parsed.components[0].kind === "intrinsic" &&
		parsed.components[0].captureStatus !== "unsupported" &&
		parsed.components[0].supportedParameterCount >= 3);
	assert("opacity is intrinsic and checkable", parsed.components[1].kind === "intrinsic" &&
		parsed.components[1].captureStatus !== "unsupported" &&
		parsed.components[1].supportedParameterCount >= 1);
	assert("gaussian blur numbers and booleans capture", parsed.components[2].captureStatus === "full" &&
		parsed.components[2].supportedParameterCount === 2);
	assert("unknown third-party effect captures generically", parsed.components[3].displayName === "S_Glow" &&
		parsed.components[3].captureStatus === "full");
	assert("lumetri numeric parameters capture", parsed.components[4].supportedParameterCount >= 2);
	assert("motion stays unchecked by default while remaining selectable",
		PresetCapture.defaultChecked(parsed.components[0]) === false &&
		PresetCapture.isReplayable(parsed.components[0]) === true);
	assert("opacity stays unchecked by default while remaining selectable",
		PresetCapture.defaultChecked(parsed.components[1]) === false &&
		PresetCapture.isReplayable(parsed.components[1]) === true);
	assert("effects stay checked by default", PresetCapture.defaultChecked(parsed.components[2]) === true);
	assert("save requires a valid name and replayable selection",
		PresetCapture.canSave("", parsed.components, { "2": true }) === false &&
		PresetCapture.canSave("Look", parsed.components, { "0": false, "2": true }) === true &&
		PresetCapture.canSave("Look", parsed.components, { "0": false }) === false);

	parsed = JSON.parse(PresetHost.inspectPresetCaptureSupport());
	row = parsed.components[2].parameters[0];
	assert("parity diagnostic compares pickfx and preset capability", parsed.ok === true &&
		row.displayName === "Blurriness" &&
		row.pickfxRead === true &&
		row.pickfxWrite === true &&
		row.pickfxVerify === true &&
		row.presetCapture === true &&
		row.parityBug !== true);

	classified = PresetCapability.classify(
		makeParam("Blurriness", 12),
		"Blurriness",
		"",
		"Gaussian Blur",
		"AE.ADBE Gaussian Blur"
	);
	assert("capability parity keeps production number writes", classified.pickfxWrite === true &&
		classified.presetCapture === true &&
		classified.reason === "SUPPORTED");
	classified = PresetCapability.classify(
		makeParam("Fill", { r: 1, g: 0, b: 0 }),
		"Fill",
		"",
		"Fill",
		"AE.ADBE Fill"
	);
	assert("color stays unsupported because pickfx writer is a stub", classified.presetCapture === false &&
		classified.reason === "UNSUPPORTED_TYPE" &&
		classified.parityBug !== true);

	controls = {
		displayName: "Controls",
		matchName: "",
		properties: { numItems: 1 },
		getValue: function () {
			throw new Error("group");
		}
	};
	controls.properties[0] = makeParam("Blurriness", 18);
	clipA = makeClip({
		name: "Talking",
		components: [makeComponent("Gaussian Blur", "AE.ADBE Gaussian Blur", [controls])]
	});
	clipA.components[0].properties[0] = controls;
	installHostMocks([clipA]);
	parsed = JSON.parse(PresetHost.listCapturableComponents());
	assert("controls groups are walked for nested leaves", parsed.components[0].supportedParameterCount === 1);

	blurParam = makeParam("Position", [0.4, 0.6]);
	blurParam.properties = { numItems: 2 };
	blurParam.properties[0] = makeParam("X", 0.4);
	blurParam.properties[1] = makeParam("Y", 0.6);
	clipA = makeClip({
		name: "Talking",
		components: [makeComponent("Motion", "AE.ADBE Motion", [blurParam])]
	});
	installHostMocks([clipA]);
	parsed = JSON.parse(PresetHost.captureComponent(
		JSON.parse(PresetHost.listCapturableComponents()).session,
		0,
		0,
		20
	));
	assert("point leaf with nested properties still captures the leaf", parsed.parameters.length === 1 &&
		parsed.parameters[0].type === "point" &&
		parsed.parameters[0].value[0] === 0.4);

	qeOptions = {
		mapCalls: [],
		addCalls: [],
		mutateOnAdd: true
	};
	clipA = makeClip({
		name: "Talking",
		components: [makeComponent("Motion", "AE.ADBE Motion", [makeParam("Scale", 100)])]
	});
	installHostMocks([clipA], qeOptions);
	parsed = JSON.parse(PresetHost.applyPreset(PresetSchema.build({
		name: "Order Look",
		clock: 1,
		token: "aa11bb",
		components: [
			{
				order: 0,
				kind: "effect",
				displayName: "Lumetri Color",
				matchName: "AE.ADBE Lumetri",
				premiereName: "Lumetri Color",
				parameters: [{ order: 0, displayName: "Exposure", type: "number", value: 0.5 }]
			},
			{
				order: 1,
				kind: "effect",
				displayName: "Gaussian Blur",
				matchName: "AE.ADBE Gaussian Blur",
				premiereName: "Gaussian Blur",
				parameters: [{ order: 0, displayName: "Blurriness", type: "number", value: 22 }]
			}
		]
	}).preset));
	assert("effect order apply does not alphabetize adds", qeOptions.addCalls.join(",") === "Lumetri Color,Gaussian Blur");
	assert("clean-target apply verifies stored parameters", parsed.ok === true);

	clipA = makeClip({
		name: "Talking",
		components: [makeComponent("Motion", "AE.ADBE Motion", [makeParam("Scale", 100)])]
	});
	installHostMocks([clipA]);
	parsed = JSON.parse(PresetHost.applyPreset(PresetSchema.build({
		name: "Motion Look",
		clock: 1,
		token: "cc22dd",
		components: [{
			order: 0,
			kind: "intrinsic",
			displayName: "Motion",
			matchName: "AE.ADBE Motion",
			parameters: [{ order: 0, displayName: "Scale", type: "number", value: 80 }]
		}]
	}).preset));
	assert("motion intrinsic writes through production writer", parsed.ok === true &&
		clipA.components[0].properties[0]._value === 80);

	saved = PresetStore.save(samplePreset("Account A Look").preset, { fs: memoryFs(), userDataPath: "/tmp" });
	assert("missing user id does not fall back to global storage", saved.ok === false &&
		saved.reason === "PRESET_USER_SCOPE_UNAVAILABLE");

	sharedFs = memoryFs();
	saved = PresetStore.save(samplePreset("Account A Look", { token: "a1a1a1" }).preset, scopedStorage(USER_A, sharedFs));
	assert("account a can save", saved.ok === true);
	listed = PresetStore.list(scopedStorage(USER_B, sharedFs));
	assert("account b cannot see account a presets", listed.ok === true && listed.presets.length === 0);
	listed = PresetStore.list(scopedStorage(USER_A, sharedFs));
	assert("account a still sees its own presets", listed.ok === true && listed.presets.length === 1);

	(function signedInSaveFlow() {
		var dirs = { "/tmp": true };
		var files = {};
		var created = [];
		var nestedFs = {
			makedir: function (path) {
				var key = String(path || "").replace(/\/+$/, "");
				var parent = key.replace(/\/[^/]+$/, "");
				created.push(key);
				if (dirs[key]) {
					return { err: 1 };
				}
				if (parent && parent !== key && !dirs[parent]) {
					return { err: 3 };
				}
				dirs[key] = true;
				return { err: 0 };
			},
			readdir: function (dir) {
				var key = String(dir || "").replace(/\/+$/, "");
				var names = [];
				var prefix = key + "/";
				var fileKey;
				if (!dirs[key]) {
					return { err: 1, data: [] };
				}
				for (fileKey in files) {
					if (files.hasOwnProperty(fileKey) && fileKey.indexOf(prefix) === 0) {
						names.push(fileKey.slice(prefix.length));
					}
				}
				return { err: 0, data: names };
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
			deleteFile: function (path) {
				delete files[path];
				return { err: 0 };
			}
		};
		var saveOptions;
		var first;
		var replaced;
		function panelSaveOptions(replaceId) {
			var options = {
				fs: nestedFs,
				userId: USER_A,
				userDataPath: "/tmp",
				csInterface: {
					getSystemPath: function () {
						return "/tmp";
					}
				}
			};
			if (replaceId) {
				options.replaceId = replaceId;
			}
			return options;
		}
		saveOptions = panelSaveOptions();
		first = PresetStore.save(samplePreset("Signed In Look", { token: "aa11bb" }).preset, saveOptions);
		assert("signed-in save writes with userId", first.ok === true);
		assert("mkdir creates PickFX before users", created.indexOf("/tmp/PickFX") !== -1 &&
			created.indexOf("/tmp/PickFX/users") !== -1 &&
			created.indexOf("/tmp/PickFX") < created.indexOf("/tmp/PickFX/users"));
		assert("mkdir creates user folder before presets",
			created.indexOf("/tmp/PickFX/users/" + USER_A) !== -1 &&
			created.indexOf("/tmp/PickFX/users/" + USER_A + "/presets") !== -1 &&
			created.indexOf("/tmp/PickFX/users/" + USER_A) <
				created.indexOf("/tmp/PickFX/users/" + USER_A + "/presets"));
		replaced = PresetStore.save(samplePreset("Signed In Look", { token: "cc33dd" }).preset, panelSaveOptions(first.preset.id));
		assert("signed-in replaceId save reuses existing folders", replaced.ok === true &&
			replaced.preset.id === first.preset.id);
	}());

	if (typeof fs !== "undefined" && typeof path !== "undefined" && typeof __pickfxRoot !== "undefined") {
		panelSource = fs.readFileSync(path.join(__pickfxRoot, "src/panel/js/panel.js"), "utf8");
		assert("panel save passes presetStoreOptions via captureSaveOptions",
			panelSource.indexOf("PresetStore.save(built.preset, captureSaveOptions(replaceId))") !== -1);
		assert("captureSaveOptions starts from presetStoreOptions",
			panelSource.indexOf("function captureSaveOptions(replaceId)") !== -1 &&
			panelSource.indexOf("var options = presetStoreOptions();") !== -1);
	}
	accountIds = [];
	if (PanelEntitlement.onAccountChange) {
		PanelEntitlement.onAccountChange(function (id) {
			accountIds.push(id);
		});
	}
	PanelEntitlement.setCurrent({
		sessionToken: "token-a",
		userId: USER_A,
		productAccess: true,
		verifiedAt: Date.now()
	});
	PanelEntitlement.setCurrent({
		sessionToken: "token-b",
		userId: USER_B,
		productAccess: true,
		verifiedAt: Date.now()
	});
	assert("account switch notifies listeners", accountIds.join(",") === USER_A + "," + USER_B);
	PanelEntitlement.onAccountChange(null);
	PanelEntitlement.setCurrent(null);

	app = previousApp;
	qe = previousQE;
	$._pickfx = previousPickfx;
	$._pickfxQE = previousPickfxQE;
	$._pickfxParameterResolver = previousResolver;

	print("presets: " + ((passed + failed) - startCount) + " assertions");
}());
