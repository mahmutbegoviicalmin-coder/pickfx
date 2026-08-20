var SpeedOperation = (function () {
	function trim(value) {
		return String(value || "").replace(/^\s+|\s+$/g, "");
	}

	function normalize(value) {
		return trim(value).toLowerCase();
	}

	function isSpeedCommand(nameQuery) {
		var key = normalize(nameQuery);
		return key === "speed" || key === "clip speed";
	}

	function unsupportedWrite() {
		return {
			ok: false,
			command: true,
			reason: "UNSUPPORTED_OPERATION",
			status: "This operation is not writable.",
			operation: "speed.write",
			readSupported: true,
			writeSupported: false,
			detail: "NO_PROVEN_PUBLIC_WRITE_API",
			confirmation: {
				codebase: "NOT_FOUND",
				documentedApi: "NO_SETSPEED",
				livePremiere: "NOT_CONFIRMED"
			}
		};
	}

	return {
		isSpeedCommand: isSpeedCommand,
		unsupportedWrite: unsupportedWrite
	};
}());

if (typeof $ !== "undefined") {
	$._pickfxSpeedOperation = SpeedOperation;
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = SpeedOperation;
}
