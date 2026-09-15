(function () {
	var startCount = passed + failed;
	var Registry = TerminalCapabilityRegistry;
	var Clip = TerminalClipCapability;
	var Motion = TerminalMotionCapability;
	var Transition = TerminalTransitionCapability;
	var Harness = TerminalCapabilityResearchHarness;
	var resolved;
	var routed;
	var speed;
	var transitionCalls = 0;
	var discovery;
	var originalLookup;
	var originalWrite;
	var originalResolver;
	var liveValue = 100;
	var writeCalls = [];
	var motionResult;
	var harnessResult;
	var cleanupResult;
	var order = [];
	var i;

	resolved = Registry.resolve("speed 200%");
	assertEq("phase6 speed classification", resolved.type, "CLIP_PROPERTY");
	assertEq("phase6 speed property", resolved.property, "SPEED");
	assertEq("phase6 speed percent value", resolved.value, 200);
	assertEq("phase6 speed remains unsupported", resolved.ok, false);
	assertEq(
		"phase6 speed fail closed reason",
		resolved.reason,
		"NO_PROVEN_PUBLIC_WRITE_API"
	);

	resolved = Registry.resolve("opacity 50%");
	assertEq("phase6 opacity classification", resolved.type, "MOTION");
	assertEq("phase6 opacity value", resolved.value, 50);
	assertEq("phase6 opacity property", resolved.property, "OPACITY");

	resolved = Registry.resolve("scale 120%");
	assertEq("phase6 scale percentage parses", resolved.value, 120);
	assertEq("phase6 scale capability id", resolved.capabilityId, "motion.scale");

	resolved = Registry.resolve("rotation 15");
	assertEq("phase6 rotation parses", resolved.value, 15);
	assertEq("phase6 rotation property", resolved.property, "ROTATION");

	resolved = Registry.resolve("position x 100 y 50");
	assertEq("phase6 position parses x", resolved.x, 100);
	assertEq("phase6 position parses y", resolved.y, 50);
	assertEq("phase6 position type", resolved.valueType, "point");

	resolved = Registry.resolve("anchor point x 0.55 y 0.5");
	assertEq("phase6 anchor point parses", resolved.property, "ANCHOR_POINT");
	assertEq("phase6 anchor point y", resolved.y, 0.5);

	resolved = Registry.resolve("position 100 50");
	assertEq("phase6 position grammar fail closed", resolved.ok, false);
	assertEq("phase6 invalid position reason", resolved.reason, "INVALID_VALUE");

	resolved = Registry.resolve("scale height 120%");
	assertEq("phase6 unsupported property classified", resolved.type, "MOTION");
	assertEq("phase6 unsupported property blocked", resolved.ok, false);
	assertEq("phase6 unsupported property reason", resolved.reason, "UNSUPPORTED");

	resolved = Registry.resolve("opacity fifty");
	assertEq("phase6 malformed percent blocked", resolved.reason, "INVALID_VALUE");

	resolved = Registry.resolve("cross dissolve 20 frames", {
		transitionRegistry: {
			transitions: [{
				displayName: "Cross Dissolve",
				type: "video",
				safelyApplicable: false
			}]
		}
	});
	assertEq("phase6 transition classification", resolved.type, "TRANSITION");
	assertEq("phase6 transition duration parses", resolved.durationFrames, 20);
	assertEq("phase6 unvalidated transition blocked", resolved.ok, false);

	resolved = Registry.resolve("cross dissolve twenty frames", {
		transitionRegistry: {
			transitions: [{
				displayName: "Cross Dissolve",
				safelyApplicable: true
			}]
		}
	});
	assertEq("phase6 invalid transition duration", resolved.reason, "INVALID_VALUE");

	resolved = Registry.resolve("blur", {
		effectRegistry: { effects: [] },
		effectResolver: {
			resolve: function () {
				return {
					ok: false,
					reason: "AMBIGUOUS_EFFECT",
					candidates: ["Blur", "Fast Blur"]
				};
			}
		}
	});
	assertEq("phase6 effect ambiguity preserved", resolved.type, "EFFECT");
	assertEq("phase6 effect ambiguity reason", resolved.reason, "AMBIGUOUS_EFFECT");

	routed = Registry.route(
		Registry.resolve("rotation 15"),
		{
			MOTION: function (resolution) {
				return {
					ok: true,
					id: resolution.capabilityId
				};
			}
		}
	);
	assertEq("phase6 capability routing", routed.id, "motion.rotation");

	routed = Registry.route(Registry.resolve("speed 200%"), {});
	assertEq("phase6 missing route fails closed", routed.reason, "CAPABILITY_UNSUPPORTED");

	speed = Clip.inspect({
		getSpeed: function () {
			return 1.5;
		},
		isSpeedReversed: function () {
			return false;
		}
	});
	assertEq("phase6 speed readback supported", speed.readSupported, true);
	assertEq("phase6 speed multiplier readback", speed.readBack.multiplier, 1.5);
	assertEq("phase6 speed percent readback", speed.readBack.percent, 150);
	assertEq("phase6 speed write remains off", speed.writeSupported, false);
	assertEq("phase6 speed inspect does not mutate", speed.settersCalled, false);

	discovery = Transition.discover(
		{},
		{},
		{
			getVideoTransitionList: function () {
				transitionCalls += 1;
			}
		},
		{
			addTransition: function () {
				transitionCalls += 1;
			}
		}
	);
	assertEq("phase6 transition discovery is read only", transitionCalls, 0);
	assertEq("phase6 transition discovery possible", discovery.discoveryPossible, false);
	assertEq("phase6 transition discovered count", discovery.counts.discovered, 0);
	assertEq("phase6 transition writes absent", discovery.writesPerformed, false);

	originalLookup = ConfirmedParameterWrites.lookup;
	originalWrite = ConfirmedParameterWrites.write;
	originalResolver = $._pickfxParameterResolver;
	ConfirmedParameterWrites.lookup = function () {
		return { productionEnabled: true };
	};
	ConfirmedParameterWrites.write = function (trackItem, name, input) {
		writeCalls.push(input.value);
		liveValue = input.value;
		return {
			ok: true,
			verified: true,
			settersCalled: true,
			actualValue: liveValue
		};
	};
	$._pickfxParameterResolver = {
		resolveMotionParameter: function () {
			return {
				ok: true,
				_param: {
					getValue: function () {
						return liveValue;
					}
				}
			};
		}
	};
	motionResult = Motion.validate({}, "motion.scale");
	assertEq("phase6 motion live transaction passes", motionResult.ok, true);
	assertEq("phase6 motion write verified", motionResult.verifiedTest, true);
	assertEq("phase6 motion cleanup verified", motionResult.verifiedRestore, true);
	assertEq("phase6 motion baseline restored", liveValue, 100);
	assertEq("phase6 motion uses safe writer twice", writeCalls.length, 2);
	assertEq(
		"phase6 motion safe writer path",
		motionResult.writerPath,
		"ConfirmedParameterWrites.write"
	);
	ConfirmedParameterWrites.lookup = originalLookup;
	ConfirmedParameterWrites.write = originalWrite;
	$._pickfxParameterResolver = originalResolver;

	Harness.run({
		now: function () {
			return "test";
		},
		effectsSummary: {
			totalEffects: 134,
			productionReadyPairs: 36,
			changed: false
		},
		transitionCapability: Transition,
		prepare: function (done) {
			done({
				ok: true,
				sequence: "PickFX Research",
				clip: "PickFX Research Clip.mp4"
			});
		},
		probe: function (done) {
			done({
				ok: true,
				writesPerformed: false,
				speed: speed,
				transition: discovery
			});
		},
		validateMotion: function (id, done) {
			order.push(id);
			done({
				ok: true,
				capabilityId: id,
				property: id,
				commandExample: id + " 1",
				fingerprintRestored: true,
				productionUntouched: true
			});
		},
		complete: function (done) {
			done({ ok: true, productionUntouched: true });
		}
	}, function (result) {
		harnessResult = result;
	});
	assertEq("phase6 harness passes", harnessResult.ok, true);
	assertEq("phase6 harness validates five motion capabilities", order.length, 5);
	assertEq("phase6 harness writes sequentially", order[0], "motion.opacity");
	assertEq("phase6 harness effects unchanged", harnessResult.artifacts.capabilityAudit.effects.unchanged, true);
	assertEq("phase6 harness production flag off", harnessResult.safety.productionFeatureFlag, false);
	assertEq("phase6 harness cleanup failures zero", harnessResult.safety.cleanupFailures, 0);
	assertEq("phase6 transition registry remains empty", harnessResult.artifacts.transitionRegistry.transitions.length, 0);
	assert(
		"phase6 capability markdown reports feature flag",
		harnessResult.artifacts.capabilityMarkdown.indexOf(
			"pickfx.terminalResolver.enabled`: false"
		) !== -1
	);

	order = [];
	Harness.run({
		now: function () {
			return "test";
		},
		transitionCapability: Transition,
		prepare: function (done) {
			done({ ok: true });
		},
		probe: function (done) {
			done({
				ok: true,
				speed: speed,
				transition: discovery
			});
		},
		validateMotion: function (id, done) {
			order.push(id);
			done({
				ok: false,
				capabilityId: id,
				reason: "CLEANUP_FAILED",
				stopRun: true,
				productionUntouched: true
			});
		},
		complete: function (done) {
			done({ ok: true });
		}
	}, function (result) {
		cleanupResult = result;
	});
	assertEq("phase6 cleanup failure stops run", order.length, 1);
	assertEq("phase6 cleanup failure counted", cleanupResult.safety.cleanupFailures, 1);
	assertEq("phase6 cleanup failure fails run", cleanupResult.ok, false);

	if (typeof fs !== "undefined" &&
			typeof path !== "undefined" &&
			typeof __pickfxRoot === "string") {
		var panelSource = fs.readFileSync(path.join(
			__pickfxRoot,
			"src/panel/js/panel.js"
		), "utf8");
		var promotionBefore = fs.readFileSync(path.join(
			__pickfxRoot,
			"src/data/terminal-registry.promotion.json"
		), "utf8");
		var storedPromotion = JSON.parse(promotionBefore);
		var storedCapabilityAudit = JSON.parse(
			fs.readFileSync(path.join(
				__pickfxRoot,
				"src/data/terminal-capability-audit.json"
			), "utf8")
		);
		var storedValidation = JSON.parse(
			fs.readFileSync(path.join(
				__pickfxRoot,
				"src/data/terminal-mvp-validation.json"
			), "utf8")
		);
		var storedTransitions = JSON.parse(
			fs.readFileSync(path.join(
				__pickfxRoot,
				"src/data/transition-registry.research.json"
			), "utf8")
		);
		assert(
			"phase6 panel keeps terminal resolver default off",
			panelSource.indexOf(
				"enabledByDefault: false"
			) !== -1
		);
		assert(
			"phase6 capability path does not alter promotion manifest",
			storedPromotion.pairCount === 36 &&
				storedPromotion.effectCount === 36
		);
		assertEq(
			"phase6 stored capability audit has five motion passes",
			storedCapabilityAudit.motionSummary.passed,
			5
		);
		assertEq(
			"phase6 stored live validation passed",
			storedValidation.ok,
			true
		);
		assertEq(
			"phase6 stored live validation cleanup failures",
			storedValidation.safety.cleanupFailures,
			0
		);
		assertEq(
			"phase6 stored transition registry remains read only",
			storedTransitions.readOnly,
			true
		);
		assertEq(
			"phase6 stored transition registry has no fabricated entries",
			storedTransitions.transitions.length,
			0
		);
	}

	for (i = 1; i < order.length; i++) {
		assert(
			"phase6 validation order is deterministic " + i,
			order[i] !== order[i - 1]
		);
	}

	print("Terminal capability tests: " +
		((passed + failed) - startCount));
}());
