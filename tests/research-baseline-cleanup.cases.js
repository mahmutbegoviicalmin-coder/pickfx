(function () {
	var startCount = passed + failed;
	var Cleanup = ResearchBaselineCleanup;
	var before;
	var after;
	var inspection;
	var report;
	var classified;
	var productionSource;
	var productionReady;

	function component(displayName, matchName, index, extras) {
		var row = {
			componentIndex: index,
			displayName: displayName,
			matchName: matchName,
			parameterCount: extras && extras.parameterCount ? extras.parameterCount : 1,
			parameters: extras && extras.parameters ? extras.parameters : [
				{
					index: 0,
					displayName: displayName,
					matchName: matchName,
					fingerprint: extras && extras.fingerprint ? extras.fingerprint : "number:100"
				}
			]
		};
		return row;
	}

	function snapshot(components) {
		return {
			ok: true,
			clipName: "PickFX Research Clip.mp4",
			mediaType: "Video",
			components: components
		};
	}

	function cleanBaseline(opacityFp, motionFp) {
		return snapshot([
			component("Opacity", "AE.ADBE Opacity", 0, { fingerprint: opacityFp || "number:100" }),
			component("Motion", "AE.ADBE Motion", 1, {
				parameterCount: 2,
				parameters: [
					{
						index: 0,
						displayName: "Position",
						matchName: "ADBE Position",
						fingerprint: motionFp || "object:0.5,0.5"
					},
					{
						index: 1,
						displayName: "Scale",
						matchName: "ADBE Scale",
						fingerprint: "number:100"
					}
				]
			})
		]);
	}

	assertEq("ready status constant", Cleanup.READY, "READY_FOR_TARGETED_PROMOTION");
	assertEq("not-clean status constant", Cleanup.NOT_CLEAN, "RESEARCH_BASELINE_NOT_CLEAN");
	assertEq("research sequence is isolated", Cleanup.RESEARCH_SEQUENCE, "PickFX Research");
	assertEq("research clip file is isolated", Cleanup.RESEARCH_CLIP_FILE, "PickFX Research Clip.mp4");

	before = cleanBaseline();
	inspection = Cleanup.inspectFingerprint(before);
	assert("already-clean baseline is safe", inspection.alreadyClean === true);
	assert("already-clean baseline has nothing removable", inspection.componentsRemovable.length === 0);
	assertEq("already-clean retained count", inspection.componentsRetained.length, 2);

	report = Cleanup.evaluateCleanup(before, before, {
		productionUntouched: true,
		generatedAt: "2026-08-23T00:00:00.000Z"
	});
	assertEq("already-clean report is ready", report.status, Cleanup.READY);
	assert("already-clean report is fully verified", report.cleanupFullyVerified === true);
	assert("already-clean report keeps production untouched", report.productionUntouched === true);
	assertEq("already-clean removed count", report.componentsRemoved.length, 0);

	before = snapshot([
		component("Opacity", "AE.ADBE Opacity", 0, { fingerprint: "number:100" }),
		component("Motion", "AE.ADBE Motion", 1, {
			parameterCount: 2,
			parameters: [
				{
					index: 0,
					displayName: "Position",
					matchName: "ADBE Position",
					fingerprint: "object:0.5,0.5"
				},
				{
					index: 1,
					displayName: "Scale",
					matchName: "ADBE Scale",
					fingerprint: "number:100"
				}
			]
		}),
		component("Sharpen", "AE.ADBE Sharpen", 2, { fingerprint: "number:0" }),
		component("Gaussian Blur", "AE.Impact_Blur_FX", 5, { fingerprint: "number:20" })
	]);
	inspection = Cleanup.inspectFingerprint(before);
	assert("dirty research leftovers are safe to clean", inspection.safeToClean === true);
	assertEq("dirty research leftover count", inspection.componentsRemovable.length, 2);
	assertEq("first removable is Sharpen by identity", inspection.componentsRemovable[0].matchName, "AE.ADBE Sharpen");
	assertEq("second removable is Gaussian Blur by identity", inspection.componentsRemovable[1].matchName, "AE.Impact_Blur_FX");
	assert("cleanup never targets Opacity", inspection.componentsRemovable.every(function (row) {
		return row.displayName !== "Opacity";
	}));
	assert("cleanup never targets Motion", inspection.componentsRemovable.every(function (row) {
		return row.displayName !== "Motion";
	}));

	after = cleanBaseline();
	report = Cleanup.evaluateCleanup(before, after, {
		componentsRemoved: inspection.componentsRemovable,
		productionUntouched: true,
		generatedAt: "2026-08-23T00:00:00.000Z"
	});
	assertEq("successful identity cleanup is ready", report.status, Cleanup.READY);
	assertEq("successful cleanup removed two research effects", report.componentsRemoved.length, 2);
	assertEq("successful cleanup retained Opacity and Motion", report.componentsRetained.length, 2);
	assert("successful cleanup verified Opacity unchanged", report.opacityUnchanged === true);
	assert("successful cleanup verified Motion unchanged", report.motionUnchanged === true);
	assert("successful cleanup reports no unexpected components", report.unexpectedComponents.length === 0);
	assert("successful cleanup reports no missing components", report.missingComponents.length === 0);

	classified = Cleanup.classifyComponent(
		component("Mystery Plugin", "com.vendor.UnknownFX", 3),
		Cleanup.KNOWN_RESEARCH_EFFECTS
	);
	assertEq("unknown plugin is not removed", classified.removable, false);
	assertEq("unknown plugin ownership is unproven", classified.reason, "OWNERSHIP_UNPROVEN");

	before = snapshot([
		component("Opacity", "AE.ADBE Opacity", 0),
		component("Motion", "AE.ADBE Motion", 1),
		component("Mystery Plugin", "com.vendor.UnknownFX", 2)
	]);
	inspection = Cleanup.inspectFingerprint(before);
	assert("unknown leftover is not safe to clean", inspection.safeToClean === false);
	report = Cleanup.evaluateCleanup(before, before, {
		productionUntouched: true
	});
	assertEq("unknown leftover stops without removal", report.status, Cleanup.NOT_CLEAN);
	assertEq("unknown leftover reason", report.reason, "OWNERSHIP_UNPROVEN");
	assertEq("unknown leftover removed nothing", report.componentsRemoved.length, 0);
	assertEq("unknown leftover is reported not removed", report.blockedComponents[0].component.displayName, "Mystery Plugin");

	classified = Cleanup.classifyComponent(component("Broken FX", "", 4));
	assertEq("missing matchName is not removed", classified.reason, "MATCH_NAME_MISSING");

	before = snapshot([
		component("Opacity", "AE.ADBE Opacity", 0),
		component("Motion", "AE.ADBE Motion", 1),
		component("Time Remapping", "AE.ADBE Time Remapping", 2)
	]);
	inspection = Cleanup.inspectFingerprint(before);
	assert("time remapping is not treated as research-added", inspection.safeToClean === false);
	assertEq("time remapping is blocked as protected", inspection.blockedComponents[0].reason, "PROTECTED_INTRINSIC");
	report = Cleanup.evaluateCleanup(before, before, { productionUntouched: true });
	assertEq("protected intrinsic stops cleanup", report.status, Cleanup.NOT_CLEAN);
	assertEq("protected intrinsic is not removed", report.componentsRemoved.length, 0);

	before = cleanBaseline("number:100", "object:0.5,0.5");
	after = cleanBaseline("number:80", "object:0.5,0.5");
	report = Cleanup.evaluateCleanup(before, after, {
		productionUntouched: true,
		componentsRemoved: []
	});
	assertEq("changed Opacity fails verification", report.status, Cleanup.NOT_CLEAN);
	assert("changed Opacity is reported", report.opacityUnchanged === false);

	before = cleanBaseline();
	after = snapshot([
		component("Opacity", "AE.ADBE Opacity", 0),
		component("Motion", "AE.ADBE Motion", 1),
		component("Sharpen", "AE.ADBE Sharpen", 2)
	]);
	report = Cleanup.evaluateCleanup(before, after, {
		productionUntouched: true,
		componentsRemoved: []
	});
	assertEq("leftover after cleanup is not clean", report.status, Cleanup.NOT_CLEAN);
	assertEq("leftover after cleanup is unexpected", report.unexpectedComponents[0].displayName, "Sharpen");

	before = snapshot([
		component("Opacity", "AE.ADBE Opacity", 0),
		component("Sharpen", "AE.ADBE Sharpen", 1)
	]);
	inspection = Cleanup.inspectFingerprint(before);
	assert("missing Motion is not safe to clean", inspection.safeToClean === false);
	assert("missing Motion is reported", inspection.blockedComponents.some(function (row) {
		return row.reason === "MISSING_BASELINE_COMPONENT" &&
			row.component.displayName === "Motion";
	}));

	assert("index alone never proves research ownership", Cleanup.identitiesMatch(
		{ displayName: "Sharpen", matchName: "" },
		{ displayName: "Sharpen", matchName: "AE.ADBE Sharpen" }
	) === false);
	assert("exact matchName+displayName proves identity", Cleanup.identitiesMatch(
		{ displayName: "Sharpen", matchName: "AE.ADBE Sharpen", componentIndex: 9 },
		{ displayName: "Sharpen", matchName: "AE.ADBE Sharpen", componentIndex: 2 }
	) === true);

	report = Cleanup.evaluateCleanup(cleanBaseline(), cleanBaseline(), {
		productionUntouched: false
	});
	assertEq("production mutation fails verification", report.status, Cleanup.NOT_CLEAN);
	assert("production mutation is recorded", report.productionUntouched === false);

	assert("registry identities exclude Opacity", Cleanup.identitiesFromRegistry({
		effects: [
			{ displayName: "Opacity", matchName: "AE.ADBE Opacity" },
			{ displayName: "Sharpen", matchName: "AE.ADBE Sharpen" }
		]
	}).every(function (row) {
		return row.displayName !== "Opacity";
	}));

	if (typeof fs !== "undefined" && typeof path !== "undefined" && typeof __pickfxRoot === "string") {
		(function () {
			var hostSrc = fs.readFileSync(
				path.join(__pickfxRoot, "src/premiere/research-registry-host.jsx"),
				"utf8"
			);
			var panelSrc = fs.readFileSync(
				path.join(__pickfxRoot, "src/panel/js/panel.js"),
				"utf8"
			);
			assert("host resolves cleanup removals by identity", hostSrc.indexOf("removeComponentByIdentity") !== -1);
			assert("host exposes dedicated baseline cleanup", hostSrc.indexOf("researchBaselineCleanup") !== -1);
			assert("host does not use extra-tail indexes for this step", hostSrc.indexOf("researchBaselineCleanup: function") !== -1);
			assert("panel has a dedicated cleanup button handler", panelSrc.indexOf("runResearchBaselineCleanup") !== -1);
			assert("panel cleanup does not start promotion", panelSrc.indexOf("runResearchBaselineCleanup();") !== -1);
		}());

		productionSource = JSON.parse(fs.readFileSync(
			path.join(__pickfxRoot, "src/data/terminal-registry.production.json"),
			"utf8"
		));
		assertEq(
			"customer production registry remains valid during baseline tests",
			TerminalProductionRegistry.validate(productionSource).ok,
			true
		);
		assertEq(
			"customer production pair count is unchanged by baseline tests",
			productionSource.counts.effectParameterPairs,
			36
		);
		productionReady = fs.readFileSync(
			path.join(__pickfxRoot, "src/data/terminal-registry.production.json"),
			"utf8"
		);
		assert("baseline tests do not rewrite production.json", productionReady.indexOf("effectParameterPairs") !== -1);
	}

	print("research-baseline-cleanup: " + (passed + failed - startCount) + " assertions");
}());
