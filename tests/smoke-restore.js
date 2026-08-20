var SmokeRestore = (function () {
	function originalFromPayload(payload) {
		if (!payload || typeof payload !== "object") {
			return undefined;
		}
		if (payload.originalValue !== undefined) {
			return payload.originalValue;
		}
		if (payload.oldValue !== undefined) {
			return payload.oldValue;
		}
		return undefined;
	}

	function originalFromWriteResult(result) {
		if (!result) {
			return undefined;
		}
		if (result.payload) {
			return originalFromPayload(result.payload);
		}
		return originalFromPayload(result);
	}

	function isFiniteNumber(value) {
		return typeof value === "number" && isFinite(value);
	}

	function restoreQuery(commandStem, result) {
		var original = originalFromWriteResult(result);
		if (!isFiniteNumber(original)) {
			return null;
		}
		return String(commandStem || "").replace(/^\s+|\s+$/g, "") + " " + original;
	}

	return {
		originalFromPayload: originalFromPayload,
		originalFromWriteResult: originalFromWriteResult,
		restoreQuery: restoreQuery
	};
}());
