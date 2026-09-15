(function () {
	var registry;
	var normalized;
	var env;
	var record;
	var store;
	var saved;
	var hooks;
	var writes;
	var researchFp;
	var productionFp;
	var applied;
	var removed;
	var inspectReport;
	var candidates;
	var researchClip;

	function memoryStore(initial) {
		var data = initial || null;
		return {
			save: function (value) {
				data = JSON.parse(JSON.stringify(value));
			},
			load: function () {
				return data ? JSON.parse(JSON.stringify(data)) : null;
			},
			get: function () {
				return data;
			}
		};
	}

	function baseHooks(overrides) {
		var h = {
			now: function () {
				return "2026-08-22T00:00:00.000Z";
			},
			fingerprintResearch: function () {
				return researchFp;
			},
			fingerprintProduction: function () {
				return productionFp;
			},
			apply: function (name) {
				applied.push(name);
				researchFp = JSON.stringify({
					components: [
						{ componentIndex: 0, displayName: "Opacity", matchName: "AE.ADBE Opacity" },
						{ componentIndex: 1, displayName: "Motion", matchName: "AE.ADBE Motion" },
						{ componentIndex: 2, displayName: name, matchName: "AE.Impact_Blur_FX" }
					]
				});
				return { ok: true };
			},
			inspect: function () {
				return inspectReport;
			},
			removeAdded: function () {
				removed += 1;
				researchFp = JSON.stringify({
					components: [
						{ componentIndex: 0, displayName: "Opacity", matchName: "AE.ADBE Opacity" },
						{ componentIndex: 1, displayName: "Motion", matchName: "AE.ADBE Motion" }
					]
				});
				return { ok: true };
			},
			setValue: function () {
				writes.setValue += 1;
			},
			applyProduction: function () {
				writes.applyProduction += 1;
			}
		};
		var key;
		overrides = overrides || {};
		for (key in overrides) {
			if (overrides.hasOwnProperty(key)) {
				h[key] = overrides[key];
			}
		}
		return h;
	}

	function resetSession() {
		writes = { setValue: 0, applyProduction: 0, commandExecutor: 0 };
		applied = [];
		removed = 0;
		researchFp = JSON.stringify({
			components: [
				{ componentIndex: 0, displayName: "Opacity", matchName: "AE.ADBE Opacity" },
				{ componentIndex: 1, displayName: "Motion", matchName: "AE.ADBE Motion" }
			]
		});
		productionFp = JSON.stringify({ sequence: "Edit", clip: "A-Roll" });
		inspectReport = {
			ok: true,
			components: [
				{ componentIndex: 0, displayName: "Opacity", matchName: "AE.ADBE Opacity", matchNameAvailable: true, parameterCount: 1, parameters: [] },
				{ componentIndex: 1, displayName: "Motion", matchName: "AE.ADBE Motion", matchNameAvailable: true, parameterCount: 1, parameters: [] },
				{
					componentIndex: 2,
					displayName: "Gaussian Blur",
					matchName: "AE.Impact_Blur_FX",
					matchNameAvailable: true,
					parameterCount: 2,
					parameters: [
						{
							index: 0,
							displayName: "Blurriness",
							valueType: "number",
							currentValue: 0,
							hasGetValue: true,
							hasSetValue: true,
							isTimeVarying: false,
							areKeyframesSupported: true,
							neighborContext: { previous: null, next: { index: 1, displayName: "Repeat Edge Pixels" } }
						},
						{
							index: 1,
							displayName: "Repeat Edge Pixels",
							valueType: "boolean",
							currentValue: false,
							hasGetValue: true,
							hasSetValue: true,
							neighborContext: { previous: { index: 0, displayName: "Blurriness" }, next: null }
						}
					]
				}
			]
		};
	}

	resetSession();

	normalized = EffectRegistryBuilder.normalizeCandidates([
		" Gaussian Blur ",
		"Gaussian Blur",
		"Lumetri Color",
		"",
		null,
		{ displayName: "Crop" }
	]);
	assertEq("1 unique count", normalized.totalUnique, 3);
	assertEq("1 first trimmed", normalized.candidates[0].displayName, "Gaussian Blur");
	assertEq("1 status pending", normalized.candidates[0].status, "pending");
	assertEq("2 duplicate names", normalized.duplicateNames.length, 1);
	assertEq("2 duplicate gaussian", normalized.duplicateNames[0], "Gaussian Blur");

	researchClip = EffectRegistryBuilder.resolveResearchVideoClip([{
		name: "PickFX Research Clip",
		mediaType: "Video"
	}]);
	assertEq("research clip exact base name matches", researchClip.ok, true);
	assertEq("research clip exact base name count", researchClip.matchCount, 1);

	researchClip = EffectRegistryBuilder.resolveResearchVideoClip([{
		name: "PickFX Research Clip.mp4",
		mediaType: "Video"
	}]);
	assertEq("research clip recognized mp4 extension matches", researchClip.ok, true);
	assertEq("research clip mp4 preserves actual TrackItem name", researchClip.clip.name, "PickFX Research Clip.mp4");

	researchClip = EffectRegistryBuilder.resolveResearchVideoClip([{
		name: "Wrong PickFX Research Clip.mp4",
		mediaType: "Video"
	}]);
	assertEq("research clip wrong base name rejected", researchClip.ok, false);
	assertEq("research clip wrong base match count", researchClip.matchCount, 0);

	researchClip = EffectRegistryBuilder.resolveResearchVideoClip([{
		name: "PickFX Research Clip",
		mediaType: "Video"
	}, {
		name: "PickFX Research Clip.mp4",
		mediaType: "Video"
	}]);
	assertEq("research clip duplicate matching clips rejected", researchClip.ok, false);
	assertEq("research clip duplicate matching count", researchClip.matchCount, 2);

	researchClip = EffectRegistryBuilder.resolveResearchVideoClip([{
		name: "PickFX Research Clip.mp4",
		mediaType: "Audio"
	}]);
	assertEq("research clip audio-only matching item rejected", researchClip.ok, false);
	assertEq("research clip audio-only match count", researchClip.matchCount, 0);

	assertEq(
		"research clip unrecognized final extension is not normalized",
		EffectRegistryBuilder.matchesResearchClipName("PickFX Research Clip.txt"),
		false
	);

	resetSession();
	record = EffectRegistryBuilder.processOne({ displayName: "Gaussian Blur" }, baseHooks());
	assertEq("3 discovered status", record.status, "discovered");
	assertEq("3 matchName", record.matchName, "AE.Impact_Blur_FX");
	assertEq("3 param 0", record.parameters[0].displayName, "Blurriness");
	assertEq("3 valueType", record.parameters[0].valueType, "number");
	assertEq("3 previous null", record.parameters[0].previousParameter, null);
	assertEq("3 next name", record.parameters[0].nextParameter.displayName, "Repeat Edge Pixels");

	resetSession();
	inspectReport.components[2].matchName = null;
	inspectReport.components[2].matchNameAvailable = false;
	record = EffectRegistryBuilder.processOne({ displayName: "Mystery" }, baseHooks({
		apply: function (name) {
			applied.push(name);
			researchFp = JSON.stringify({
				components: [
					{ componentIndex: 0, displayName: "Opacity", matchName: "AE.ADBE Opacity" },
					{ componentIndex: 1, displayName: "Motion", matchName: "AE.ADBE Motion" },
					{ componentIndex: 2, displayName: name, matchName: null }
				]
			});
			return { ok: true };
		}
	}));
	assertEq("4 missing matchName", record.matchName, null);
	assertEq("4 matchNameAvailable", record.matchNameAvailable, false);

	resetSession();
	inspectReport.components[2].parameters = [];
	inspectReport.components[2].parameterCount = 0;
	record = EffectRegistryBuilder.processOne({ displayName: "Gaussian Blur" }, baseHooks());
	assertEq("5 missing parameter count", record.parameterCount, 0);
	assertEq("5 missing parameter list", record.parameters.length, 0);

	resetSession();
	record = EffectRegistryBuilder.processOne({ displayName: "Gaussian Blur" }, baseHooks({
		inspect: function () {
			throw new Error("getValue exploded");
		}
	}));
	assertEq("6 parameter read failure", record.status, "parameter_read_failed");
	assertEq("6 stage", record.error.stage, "inspect");

	resetSession();
	inspectReport.components[2].parameters = [{
		index: 0,
		displayName: "Kernel",
		valueType: "object",
		currentValue: { constructorName: "Object", stringValue: "[object Object]" },
		hasGetValue: true,
		hasSetValue: true,
		neighborContext: { previous: null, next: null }
	}];
	inspectReport.components[2].parameterCount = 1;
	record = EffectRegistryBuilder.processOne({ displayName: "Weird FX" }, baseHooks());
	assertEq("7 object type", record.parameters[0].valueType, "object");
	assertEq("7 object not numeric", record.parameters[0].valueType === "number", false);
	assertEq("7 object summary ctor", record.parameters[0].currentValue.constructorName, "Object");

	resetSession();
	record = EffectRegistryBuilder.processOne({ displayName: "NoSuchFX" }, baseHooks({
		apply: function () {
			return { ok: false, errorType: "APPLY_FAILED", message: "addVideoEffect failed." };
		}
	}));
	assertEq("8 apply failure", record.status, "apply_failed");
	assertEq("8 recoverable", record.error.recoverable, true);

	resetSession();
	record = EffectRegistryBuilder.processOne({ displayName: "Slow FX" }, baseHooks({
		timedOut: true
	}));
	assertEq("9 timeout", record.status, "timeout");
	assertEq("9 timeout cleanup attempted", removed >= 1, true);

	resetSession();
	record = EffectRegistryBuilder.processOne({ displayName: "Gaussian Blur" }, baseHooks({
		removeAdded: function () {
			removed += 1;
			return { ok: false, message: "Component.remove unavailable." };
		}
	}));
	assertEq("10 cleanup failure", record.status, "cleanup_failed");
	assertEq("10 stopRun", record.stopRun, true);
	assertEq("10 recoverable", record.error.recoverable, false);

	resetSession();
	record = EffectRegistryBuilder.processOne({ displayName: "Gaussian Blur" }, baseHooks());
	assertEq("11 cleanup success", record.status, "discovered");
	assertEq("11 removed once", removed, 1);
	assertEq("11 research restored", JSON.parse(researchFp).components.length, 2);

	candidates = EffectRegistryBuilder.normalizeCandidates(["Gaussian Blur", "Lumetri Color", "Crop"]).candidates;
	registry = EffectRegistryBuilder.createRegistry(candidates, { generatedAt: "2026-08-22T00:00:00.000Z" });
	store = memoryStore();
	resetSession();
	record = EffectRegistryBuilder.processOne({ displayName: "Gaussian Blur" }, baseHooks());
	EffectRegistryBuilder.mergeRecord(registry, record);
	registry.cursor = 1;
	EffectRegistryBuilder.incrementalSave(store, registry);
	saved = store.load();
	assertEq("12 incremental saved", saved.effects.length, 1);
	assertEq("12 saved name", saved.effects[0].displayName, "Gaussian Blur");

	assertEq("13 resume index", EffectRegistryBuilder.nextResumeIndex(saved, candidates), 1);

	resetSession();
	hooks = baseHooks();
	record = EffectRegistryBuilder.processOne({ displayName: "Gaussian Blur" }, hooks);
	assertEq("14 setValueCalls", writes.setValue, 0);
	assertEq("14 applyProduction", writes.applyProduction, 0);
	assertEq("14 discovered anyway", record.status, "discovered");

	assertEq("15 builder source", EffectRegistryBuilder.SOURCE.indexOf("Research Registry Builder") !== -1, true);
	assertEq("15 not production EffectRegistry", typeof EffectRegistryBuilder.loadFromNames, "undefined");

	normalized = EffectRegistryBuilder.normalizeCandidates("not-a-list");
	assertEq("16 malformed ok", normalized.ok, false);
	assertEq("16 malformed flag", normalized.malformed, true);

	normalized = EffectRegistryBuilder.normalizeCandidates([]);
	assertEq("17 empty ok", normalized.ok, true);
	assertEq("17 empty flag", normalized.empty, true);
	assertEq("17 empty count", normalized.candidates.length, 0);

	env = EffectRegistryBuilder.validateEnvironment({ available: false });
	assertEq("18 no env reason", env.reason, "RESEARCH_ENVIRONMENT_UNAVAILABLE");
	assertEq("18 no env ok", env.ok, false);

	env = EffectRegistryBuilder.validateEnvironment({
		available: true,
		researchSequenceName: "PickFX Research",
		researchSequenceId: "seq-research",
		researchClipExists: true,
		researchClipName: "PickFX Research Clip",
		clipCount: 1,
		productionSequenceId: "seq-edit",
		productionSequenceName: "A-Roll",
		productionClipIsResearchTarget: false
	});
	assertEq("19 isolation ok", env.ok, true);
	assertEq("19 isolated", env.isolated, true);

	env = EffectRegistryBuilder.validateEnvironment({
		available: true,
		researchSequenceName: "PickFX Research",
		researchSequenceId: "seq-edit",
		researchClipExists: true,
		clipCount: 1,
		productionSequenceId: "seq-edit",
		productionSequenceName: "A-Roll",
		productionClipIsResearchTarget: true
	});
	assertEq("19 production blocked", env.ok, false);

	registry = EffectRegistryBuilder.createRegistry(candidates, { generatedAt: "2026-08-22T00:00:00.000Z" });
	assertEq("20 schema ok", EffectRegistryBuilder.validateSchema(registry).ok, true);
	registry.schemaVersion = 99;
	assertEq("20 schema rejects bad version", EffectRegistryBuilder.validateSchema(registry).ok, false);

	assertEq("enum default unavailable", EffectRegistryBuilder.mapParameter({
		index: 0,
		displayName: "Mode",
		valueType: "string",
		currentValue: "Normal"
	}).enumMetadata, "unavailable");

	(function () {
		var staleLoadedFlag = false;
		var hostWithPrepareOnly = {
			$: {
				_pickfx: {
					researchPrepareEnvironment: function () {}
				}
			}
		};
		var hostWithGlobalBuilder = {
			$: {
				_pickfx: {
					researchPrepareEnvironment: function () {}
				}
			},
			EffectRegistryBuilder: EffectRegistryBuilder
		};
		var hostWithDollarBuilder = {
			$: {
				_pickfxEffectRegistryBuilder: EffectRegistryBuilder,
				_pickfx: {
					researchPrepareEnvironment: function () {}
				}
			}
		};
		var prepareOnlyProbe = EffectRegistryBuilder.hostLoadProbe(hostWithPrepareOnly, staleLoadedFlag);
		var globalProbe = EffectRegistryBuilder.hostLoadProbe(hostWithGlobalBuilder, staleLoadedFlag);
		var dollarProbe = EffectRegistryBuilder.hostLoadProbe(hostWithDollarBuilder, staleLoadedFlag);

		assertEq("prepare-only does not mark builder loaded", prepareOnlyProbe.EffectRegistryBuilderLoaded, false);
		assertEq("prepare-only does not mark host function from prepare alone", prepareOnlyProbe.EffectRegistryBuilderHostFunctionAvailable, false);
		assert("stale loaded=false still recognizes global builder", EffectRegistryBuilder.recognizeBuilderLoaded(hostWithGlobalBuilder, staleLoadedFlag) === true);
		assertEq("global builder Loaded true despite stale false", globalProbe.EffectRegistryBuilderLoaded, true);
		assertEq("global builder HostFunctionAvailable matches Loaded", globalProbe.EffectRegistryBuilderHostFunctionAvailable, true);
		assert("stale loaded=false still recognizes $ builder", EffectRegistryBuilder.recognizeBuilderLoaded(hostWithDollarBuilder, staleLoadedFlag) === true);
		assertEq("dollar builder Loaded true despite stale false", dollarProbe.EffectRegistryBuilderLoaded, true);
		assertEq("dollar builder HostFunctionAvailable matches Loaded", dollarProbe.EffectRegistryBuilderHostFunctionAvailable, true);
		assert("isHostBuilderAPI accepts real builder", EffectRegistryBuilder.isHostBuilderAPI(EffectRegistryBuilder) === true);
		assert("isHostBuilderAPI rejects empty object", EffectRegistryBuilder.isHostBuilderAPI({}) === false);
	}());

	assert("host files list builder", EffectRegistryBuilder.REQUIRED_HOST_FILES.indexOf("/src/core/EffectRegistryBuilder.js") !== -1);
	assert("host files list baseline cleanup", EffectRegistryBuilder.REQUIRED_HOST_FILES.indexOf("/src/core/ResearchBaselineCleanup.js") !== -1);
	assert("host files list research jsx", EffectRegistryBuilder.REQUIRED_HOST_FILES.indexOf("/src/premiere/research-registry-host.jsx") !== -1);
	if (typeof fs !== "undefined" && typeof path !== "undefined" && typeof __pickfxRoot === "string") {
		(function () {
			var panelSrc = fs.readFileSync(path.join(__pickfxRoot, "src/panel/js/panel.js"), "utf8");
			var hostSrc = fs.readFileSync(path.join(__pickfxRoot, "src/premiere/research-registry-host.jsx"), "utf8");
			var bootstrapSrc = fs.readFileSync(path.join(__pickfxRoot, "src/premiere/host.jsx"), "utf8");
			var panelHtml = fs.readFileSync(path.join(__pickfxRoot, "src/panel/index.html"), "utf8");
			var extraStart = panelSrc.indexOf("var extraHost = [");
			var extraEnd = panelSrc.indexOf("];", extraStart);
			var extraBlock = extraStart !== -1 && extraEnd !== -1 ? panelSrc.slice(extraStart, extraEnd) : "";
			assert("panel extraHost includes EffectRegistryBuilder.js", extraBlock.indexOf("/src/core/EffectRegistryBuilder.js") !== -1);
			assert("panel extraHost includes ResearchBaselineCleanup.js", extraBlock.indexOf("/src/core/ResearchBaselineCleanup.js") !== -1);
			assert("panel extraHost includes research-registry-host.jsx", extraBlock.indexOf("/src/premiere/research-registry-host.jsx") !== -1);
			assert("builder extraHost before research host", extraBlock.indexOf("/src/core/EffectRegistryBuilder.js") < extraBlock.indexOf("/src/premiere/research-registry-host.jsx"));
			assert("baseline cleanup extraHost before research host", extraBlock.indexOf("/src/core/ResearchBaselineCleanup.js") < extraBlock.indexOf("/src/premiere/research-registry-host.jsx"));
			assert("research host evals EffectRegistryBuilder.js", hostSrc.indexOf("EffectRegistryBuilder.js") !== -1);
			assert("research host reads builder source", hostSrc.indexOf("evalCoreSource(\"EffectRegistryBuilder.js\"") !== -1);
			assert("panel retries builder after extraHost", panelSrc.indexOf("ensureResearchBuilderLoaded") !== -1);
			assert("panel evalHostSource loads builder", panelSrc.indexOf("evalHostSource(\"/src/core/EffectRegistryBuilder.js\"") !== -1);
			var builderSrc = fs.readFileSync(path.join(__pickfxRoot, "src/core/EffectRegistryBuilder.js"), "utf8");
			assert("builder has no null-byte string (ExtendScript parse)", builderSrc.indexOf("\\0") === -1);
			assert("builder quotes reserved boolean property", builderSrc.indexOf('"boolean": 0') !== -1);
			assert("builder has no unquoted boolean property", !/(^|\\n)\\s*boolean\\s*:/.test(builderSrc));
			assert("host loadProbe Loaded uses apiOk", hostSrc.indexOf("EffectRegistryBuilderLoaded: apiOk") !== -1);
			assert("host loadProbe HostFunctionAvailable uses apiOk", hostSrc.indexOf("EffectRegistryBuilderHostFunctionAvailable: apiOk") !== -1);
			assert("host bootstrap exposes runtime marker", bootstrapSrc.indexOf("2026-08-22-RUNTIME-VERIFY-01") !== -1);
			assert("research host exposes runtime marker", hostSrc.indexOf("2026-08-22-RUNTIME-VERIFY-01") !== -1);
			assert("panel exposes runtime marker", panelSrc.indexOf("2026-08-22-RUNTIME-VERIFY-01") !== -1);
			assert("panel cache-busts current implementation", panelHtml.indexOf("panel.js?v=json2-extendscript-v1") !== -1);
			assert("probe distinguishes file not found", hostSrc.indexOf('"file_not_found"') !== -1);
			assert("probe distinguishes file read failure", hostSrc.indexOf('"file_read_failed"') !== -1);
			assert("probe distinguishes evaluation failure", hostSrc.indexOf('"evaluation_failed"') !== -1);
			assert("probe distinguishes evaluated API missing", hostSrc.indexOf('"evaluated_api_missing"') !== -1);
			assert("probe distinguishes successful load", hostSrc.indexOf('"loaded"') !== -1);
			assert("probe reports exact builder evaluation error", hostSrc.indexOf("builderEvalError") !== -1);
			assert("panel reports actual extension path", panelSrc.indexOf("panelExtensionPath") !== -1);
		}());
	}
}());
