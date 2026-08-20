var NumberParameterWriter = (function () {
	function set(trackItem, componentName, parameterName, value) {
		if (typeof $._pickfxParameterWriter === "undefined" || !$._pickfxParameterWriter.set) {
			return {
				ok: false,
				effect: String(componentName || ""),
				parameter: String(parameterName || ""),
				reason: "WRITE_FAILED",
				detail: "ParameterWriter.set is not loaded.",
				type: "number"
			};
		}
		return $._pickfxParameterWriter.set(trackItem, componentName, parameterName, value);
	}

	return {
		set: set
	};
}());

if (typeof $ !== "undefined") {
	$._pickfxNumberParameterWriter = NumberParameterWriter;
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = NumberParameterWriter;
}
