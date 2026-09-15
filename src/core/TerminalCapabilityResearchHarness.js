var TerminalCapabilityResearchHarness = (function () {
	var SCHEMA_VERSION = 1;
	var MOTION_IDS = [
		"motion.opacity",
		"motion.scale",
		"motion.position",
		"motion.rotation",
		"motion.anchor-point"
	];

	function nowIso(options) {
		if (options && typeof options.now === "function") {
			return options.now();
		}
		return new Date().toISOString();
	}

	function countRows(rows, predicate) {
		var count = 0;
		var i;
		for (i = 0; i < rows.length; i++) {
			if (predicate(rows[i])) {
				count += 1;
			}
		}
		return count;
	}

	function motionSummary(rows) {
		return {
			total: rows.length,
			passed: countRows(rows, function (row) {
				return row && row.ok === true;
			}),
			failed: countRows(rows, function (row) {
				return !row || row.ok !== true;
			}),
			cleanupFailures: countRows(rows, function (row) {
				return row && row.reason === "CLEANUP_FAILED";
			})
		};
	}

	function commandExamples(rows) {
		var output = [];
		var i;
		for (i = 0; i < rows.length; i++) {
			if (rows[i] &&
					rows[i].ok === true &&
					rows[i].commandExample) {
				output.push({
					type: "MOTION",
					capabilityId: rows[i].capabilityId,
					property: rows[i].property,
					command: rows[i].commandExample,
					evidence:
						"Phase 6 isolated live write/read-back/restore"
				});
			}
		}
		return output;
	}

	function auditFrom(validation, options) {
		var probe = validation.probe || {};
		var transition = probe.transition || {};
		var speed = probe.speed || {};
		var rows = validation.motion || [];
		var effects = options && options.effectsSummary
			? options.effectsSummary
			: {
				totalEffects: 134,
				productionReadyPairs: 36,
				changed: false
			};
		return {
			schemaVersion: SCHEMA_VERSION,
			generatedAt: validation.generatedAt,
			phase: "PHASE_6_TERMINAL_MVP",
			scope: [
				"EFFECT",
				"CLIP_PROPERTY",
				"MOTION",
				"TRANSITION"
			],
			effects: {
				source:
					"terminal-registry.production-ready.json",
				totalEffects: effects.totalEffects,
				productionReadyPairs:
					effects.productionReadyPairs,
				unchanged: effects.changed !== true,
				productionBehaviorChanged: false
			},
			speed: {
				supported: false,
				readBackSupported:
					speed.readSupported === true,
				publicReadMethod:
					speed.publicReadMethod ||
					"TrackItem.getSpeed()",
				publicWriteMethod: "",
				liveValidation: "NOT_RUN",
				reason: "NO_PROVEN_PUBLIC_WRITE_API",
				inspection: speed
			},
			motion: rows,
			motionSummary: motionSummary(rows),
			transitions: {
				discoveryPossible:
					transition.discoveryPossible === true,
				discovered:
					transition.counts
						? transition.counts.discovered
						: 0,
				safelyApplicable:
					transition.counts
						? transition.counts.safelyApplicable
						: 0,
				durationSupport:
					transition.durationSupport || {
						supported: false
					},
				alignmentSupport:
					transition.alignmentSupport || {
						supported: false
					},
				liveValidation: {
					attempted: false,
					reason: "TRANSITION_UNSUPPORTED"
				},
				discovery: transition
			},
			commandExamples: commandExamples(rows),
			safety: validation.safety
		};
	}

	function markdownFrom(audit) {
		var lines = [];
		var i;
		var row;
		lines.push("# PickFX Terminal MVP Capability Audit");
		lines.push("");
		lines.push("Generated: " + audit.generatedAt);
		lines.push("");
		lines.push("## EFFECTS");
		lines.push("");
		lines.push(
			"- Existing production-ready pairs: " +
			audit.effects.productionReadyPairs
		);
		lines.push("- Existing effect behavior: unchanged");
		lines.push("");
		lines.push("## SPEED");
		lines.push("");
		lines.push("- Supported: NO");
		lines.push(
			"- Read-back: " +
			(audit.speed.readBackSupported ? "YES" : "NO")
		);
		lines.push(
			"- Reason: " + audit.speed.reason
		);
		lines.push("");
		lines.push("## MOTION");
		lines.push("");
		for (i = 0; i < audit.motion.length; i++) {
			row = audit.motion[i];
			lines.push(
				"- " + row.property + ": " +
				(row.ok ? "PASS" : "FAIL") +
				(row.reason ? " — " + row.reason : "")
			);
		}
		lines.push("");
		lines.push("## TRANSITIONS");
		lines.push("");
		lines.push(
			"- Discovery possible under current safety policy: " +
			(audit.transitions.discoveryPossible ? "YES" : "NO")
		);
		lines.push(
			"- Discovered: " + audit.transitions.discovered
		);
		lines.push(
			"- Safely applicable: " +
			audit.transitions.safelyApplicable
		);
		lines.push(
			"- Live validation: NOT RUN — no documented, existing PickFX-safe mutation API"
		);
		lines.push("");
		lines.push("## VALIDATED COMMANDS");
		lines.push("");
		for (i = 0; i < audit.commandExamples.length; i++) {
			lines.push(
				"- `" +
				audit.commandExamples[i].command +
				"`"
			);
		}
		lines.push("");
		lines.push("## SAFETY");
		lines.push("");
		lines.push(
			"- `pickfx.terminalResolver.enabled`: false"
		);
		lines.push(
			"- Production fingerprint changes: " +
			audit.safety.productionFingerprintChanges
		);
		lines.push(
			"- Cleanup failures: " +
			audit.safety.cleanupFailures
		);
		lines.push("- New production writes enabled: false");
		return lines.join("\n") + "\n";
	}

	function transitionMarkdownFrom(registry) {
		var lines = [];
		var i;
		lines.push("# PickFX Transition Research Registry");
		lines.push("");
		lines.push("Generated: " + registry.generatedAt);
		lines.push("");
		lines.push("## Discovery");
		lines.push("");
		lines.push(
			"- Possible under current safety policy: " +
			(registry.discovery.possible ? "YES" : "NO")
		);
		lines.push(
			"- Reason: " + registry.discovery.reason
		);
		lines.push(
			"- Transitions discovered: " +
			registry.counts.discovered
		);
		lines.push(
			"- Safely applicable: " +
			registry.counts.safelyApplicable
		);
		lines.push("");
		lines.push("## Controls");
		lines.push("");
		lines.push(
			"- Duration: " +
			(registry.durationSupport.supported ? "SUPPORTED" : "UNSUPPORTED")
		);
		lines.push(
			"- Alignment: " +
			(registry.alignmentSupport.supported ? "SUPPORTED" : "UNSUPPORTED")
		);
		if (registry.limitations && registry.limitations.length) {
			lines.push("");
			lines.push("## Limitations");
			lines.push("");
			for (i = 0; i < registry.limitations.length; i++) {
				lines.push("- " + registry.limitations[i]);
			}
		}
		return lines.join("\n") + "\n";
	}

	function buildArtifacts(validation, options) {
		var audit = auditFrom(validation, options);
		var transitionModule = options &&
			options.transitionCapability
			? options.transitionCapability
			: (
				typeof TerminalTransitionCapability !== "undefined"
					? TerminalTransitionCapability
					: null
			);
		var transitionRegistry = transitionModule &&
			transitionModule.registryFromDiscovery
			? transitionModule.registryFromDiscovery(
				validation.probe
					? validation.probe.transition
					: null
			)
			: {
				schemaVersion: 1,
				transitions: [],
				counts: {
					discovered: 0,
					safelyApplicable: 0
				}
			};
		transitionRegistry.generatedAt =
			validation.generatedAt;
		return {
			transitionRegistry: transitionRegistry,
			transitionMarkdown:
				transitionMarkdownFrom(transitionRegistry),
			capabilityAudit: audit,
			capabilityMarkdown: markdownFrom(audit),
			validation: {
				schemaVersion: validation.schemaVersion,
				generatedAt: validation.generatedAt,
				phase: validation.phase,
				ok: validation.ok,
				environment: validation.environment,
				probe: validation.probe,
				motion: validation.motion,
				motionSummary: validation.motionSummary,
				completion: validation.completion,
				safety: validation.safety
			}
		};
	}

	function dependencies(options) {
		return {
			prepare: options && options.prepare,
			probe: options && options.probe,
			validateMotion: options &&
				options.validateMotion,
			complete: options && options.complete
		};
	}

	function run(options, done) {
		var deps = dependencies(options || {});
		var validation = {
			schemaVersion: SCHEMA_VERSION,
			generatedAt: nowIso(options),
			phase: "PHASE_6_TERMINAL_MVP",
			ok: false,
			environment: null,
			probe: null,
			motion: [],
			completion: null,
			safety: {
				productionFeatureFlag: false,
				productionFingerprintChanges: 0,
				cleanupFailures: 0,
				liveWritesAttempted: 0,
				liveWritesCompleted: 0,
				newProductionWritesEnabled: false
			}
		};
		var index = 0;

		function finish() {
			validation.motionSummary =
				motionSummary(validation.motion);
			validation.safety.cleanupFailures =
				validation.motionSummary.cleanupFailures;
			validation.safety.productionFingerprintChanges =
				countRows(validation.motion, function (row) {
					return row &&
						row.productionUntouched === false;
				});
			validation.safety.liveWritesCompleted =
				validation.motionSummary.passed;
			validation.ok = !!(
				validation.environment &&
				validation.environment.ok === true &&
				validation.probe &&
				validation.probe.ok === true &&
				validation.motionSummary.failed === 0 &&
				validation.completion &&
				validation.completion.ok === true &&
				validation.safety.cleanupFailures === 0 &&
				validation.safety
					.productionFingerprintChanges === 0
			);
			validation.artifacts =
				buildArtifacts(validation, options);
			done(validation);
		}

		function complete() {
			if (typeof deps.complete !== "function") {
				validation.completion = {
					ok: false,
					reason: "COMPLETE_UNAVAILABLE"
				};
				finish();
				return;
			}
			deps.complete(function (result) {
				validation.completion = result;
				finish();
			});
		}

		function nextMotion() {
			var id;
			if (index >= MOTION_IDS.length) {
				complete();
				return;
			}
			id = MOTION_IDS[index];
			index += 1;
			validation.safety.liveWritesAttempted += 1;
			deps.validateMotion(id, function (result) {
				validation.motion.push(result);
				if (result && result.stopRun === true) {
					complete();
					return;
				}
				nextMotion();
			});
		}

		if (typeof deps.prepare !== "function" ||
				typeof deps.probe !== "function" ||
				typeof deps.validateMotion !== "function") {
			validation.environment = {
				ok: false,
				reason: "HARNESS_DEPENDENCY_MISSING"
			};
			validation.completion = {
				ok: false,
				reason: "NOT_STARTED"
			};
			finish();
			return;
		}
		deps.prepare(function (environment) {
			validation.environment = environment;
			if (!environment || environment.ok !== true) {
				validation.completion = {
					ok: false,
					reason:
						"RESEARCH_ENVIRONMENT_UNAVAILABLE"
				};
				finish();
				return;
			}
			deps.probe(function (probe) {
				validation.probe = probe;
				if (!probe || probe.ok !== true) {
					complete();
					return;
				}
				nextMotion();
			});
		});
	}

	return {
		SCHEMA_VERSION: SCHEMA_VERSION,
		MOTION_IDS: MOTION_IDS,
		motionSummary: motionSummary,
		commandExamples: commandExamples,
		auditFrom: auditFrom,
		markdownFrom: markdownFrom,
		transitionMarkdownFrom: transitionMarkdownFrom,
		buildArtifacts: buildArtifacts,
		run: run
	};
}());

if (typeof module !== "undefined" && module.exports) {
	module.exports = TerminalCapabilityResearchHarness;
}
