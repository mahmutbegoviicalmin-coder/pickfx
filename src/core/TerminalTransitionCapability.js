var TerminalTransitionCapability = (function () {
	var POLICY =
		"UNDOCUMENTED_TRANSITION_MUTATION_APIS_NOT_ALLOWED";
	var PROJECT_METHODS = [
		"getVideoTransitionList",
		"getAudioTransitionList",
		"getVideoTransitionByName",
		"getAudioTransitionByName"
	];
	var TRACK_METHODS = [
		"getTransitionAt",
		"addTransition"
	];
	var OFFICIAL_SURFACES = [
		"transitions",
		"videoTransitions",
		"audioTransitions",
		"inTransition",
		"outTransition"
	];

	function surfaceType(object, name) {
		try {
			return object ? typeof object[name] : "undefined";
		} catch (error) {
			return "error: " + String(error);
		}
	}

	function inspectNames(object, names) {
		var output = [];
		var i;
		for (i = 0; i < names.length; i++) {
			output.push({
				name: names[i],
				type: surfaceType(object, names[i])
			});
		}
		return output;
	}

	function discover(trackItem, sequence, qeProject, qeClip) {
		var projectSurface = inspectNames(
			qeProject,
			PROJECT_METHODS
		);
		var qeClipSurface = inspectNames(qeClip, TRACK_METHODS);
		var trackItemSurface = inspectNames(
			trackItem,
			OFFICIAL_SURFACES
		);
		var sequenceSurface = inspectNames(
			sequence,
			OFFICIAL_SURFACES
		);
		return {
			ok: true,
			operation: "terminal.transition.read-only-discovery",
			readOnly: true,
			writesPerformed: false,
			settersCalled: false,
			usedQE: !!qeProject,
			policy: POLICY,
			discoveryPossible: false,
			discoveryReason:
				"Premiere exposes no documented CEP transition catalog API used by PickFX.",
			transitions: [],
			counts: {
				discovered: 0,
				video: 0,
				audio: 0,
				safelyApplicable: 0
			},
			durationSupport: {
				supported: false,
				reason: "NO_DOCUMENTED_VALIDATED_API"
			},
			alignmentSupport: {
				supported: false,
				reason: "NO_DOCUMENTED_VALIDATED_API"
			},
			removalSupport: {
				supported: false,
				reason: "NO_DOCUMENTED_VALIDATED_API"
			},
			surfaces: {
				qeProject: projectSurface,
				qeClip: qeClipSurface,
				officialTrackItem: trackItemSurface,
				officialSequence: sequenceSurface
			},
			limitations: [
				"QE transition methods are undocumented and unsupported by Adobe.",
				"PickFX has no existing validated transition listing, application, read-back, duration, alignment, or removal path.",
				"The current research target defines one exact clip, not a validated two-clip edit point."
			]
		};
	}

	function registryFromDiscovery(discovery) {
		return {
			schemaVersion: 1,
			generatedAt: "",
			source:
				"PickFX Phase 6 read-only CEP capability discovery",
			readOnly: true,
			policy: POLICY,
			discovery: {
				possible: !!(
					discovery &&
					discovery.discoveryPossible === true
				),
				reason: discovery
					? discovery.discoveryReason
					: "NOT_RUN"
			},
			transitions: discovery && discovery.transitions
				? discovery.transitions
				: [],
			counts: discovery && discovery.counts
				? discovery.counts
				: {
					discovered: 0,
					video: 0,
					audio: 0,
					safelyApplicable: 0
				},
			durationSupport: discovery &&
				discovery.durationSupport
				? discovery.durationSupport
				: {
					supported: false,
					reason: "NOT_RUN"
				},
			alignmentSupport: discovery &&
				discovery.alignmentSupport
				? discovery.alignmentSupport
				: {
					supported: false,
					reason: "NOT_RUN"
				},
			limitations: discovery && discovery.limitations
				? discovery.limitations
				: []
		};
	}

	function unsupportedValidation() {
		return {
			ok: false,
			operation: "terminal.transition.live-validation",
			reason: "TRANSITION_UNSUPPORTED",
			detail:
				"No documented, existing PickFX-safe transition mutation API was discovered.",
			liveValidationAttempted: false,
			writesPerformed: false,
			cleanupFailures: 0,
			settersCalled: false
		};
	}

	return {
		POLICY: POLICY,
		PROJECT_METHODS: PROJECT_METHODS,
		TRACK_METHODS: TRACK_METHODS,
		OFFICIAL_SURFACES: OFFICIAL_SURFACES,
		surfaceType: surfaceType,
		discover: discover,
		registryFromDiscovery: registryFromDiscovery,
		unsupportedValidation: unsupportedValidation
	};
}());

if (typeof $ !== "undefined") {
	$._pickfxTerminalTransitionCapability =
		TerminalTransitionCapability;
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = TerminalTransitionCapability;
}
