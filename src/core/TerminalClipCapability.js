var TerminalClipCapability = (function () {
	var CAPABILITY_ID = "clip.speed";
	var PUBLIC_READ_METHOD = "TrackItem.getSpeed()";
	var PUBLIC_WRITE_METHOD = "";

	function methodType(object, name) {
		try {
			return object ? typeof object[name] : "undefined";
		} catch (error) {
			return "error: " + String(error);
		}
	}

	function readSpeed(trackItem) {
		var value;
		if (!trackItem || methodType(trackItem, "getSpeed") !== "function") {
			return {
				ok: false,
				reason: "SPEED_READ_UNAVAILABLE"
			};
		}
		try {
			value = trackItem.getSpeed();
		} catch (error) {
			return {
				ok: false,
				reason: "SPEED_READ_FAILED",
				error: String(error)
			};
		}
		if (typeof value !== "number" || !isFinite(value)) {
			return {
				ok: false,
				reason: "SPEED_READ_FAILED",
				value: value
			};
		}
		return {
			ok: true,
			multiplier: value,
			percent: value * 100
		};
	}

	function inspect(trackItem) {
		var read = readSpeed(trackItem);
		return {
			ok: !!trackItem,
			operation: "terminal.clip.speed.inspect",
			capabilityId: CAPABILITY_ID,
			property: "SPEED",
			readSupported: read.ok === true,
			writeSupported: false,
			publicReadMethod: PUBLIC_READ_METHOD,
			publicWriteMethod: PUBLIC_WRITE_METHOD,
			readBack: read,
			surface: {
				getSpeed: methodType(trackItem, "getSpeed"),
				isSpeedReversed:
					methodType(trackItem, "isSpeedReversed"),
				setSpeed: methodType(trackItem, "setSpeed"),
				playbackRate:
					methodType(trackItem, "playbackRate")
			},
			evidence: {
				codebaseWriter: "NOT_FOUND",
				documentedPublicSetter: "NOT_AVAILABLE",
				undocumentedQESetterAllowed: false,
				reason:
					"PickFX does not use undocumented QE speed setters."
			},
			settersCalled: false,
			usedQE: false
		};
	}

	function unsupportedWrite() {
		return {
			ok: false,
			command: true,
			operation: "terminal.clip.speed.write",
			capabilityId: CAPABILITY_ID,
			property: "SPEED",
			reason: "UNSUPPORTED_OPERATION",
			detail: "NO_PROVEN_PUBLIC_WRITE_API",
			readSupported: true,
			writeSupported: false,
			verified: false,
			settersCalled: false,
			usedQE: false
		};
	}

	return {
		CAPABILITY_ID: CAPABILITY_ID,
		PUBLIC_READ_METHOD: PUBLIC_READ_METHOD,
		PUBLIC_WRITE_METHOD: PUBLIC_WRITE_METHOD,
		readSpeed: readSpeed,
		inspect: inspect,
		unsupportedWrite: unsupportedWrite
	};
}());

if (typeof $ !== "undefined") {
	$._pickfxTerminalClipCapability =
		TerminalClipCapability;
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = TerminalClipCapability;
}
