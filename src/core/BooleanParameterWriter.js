var BooleanParameterWriter = (function () {
	function set(trackItem, componentName, parameterName, value) {
		if (typeof $._pickfxParameterWriter === "undefined" || !$._pickfxParameterWriter.setTyped) {
			return {
				ok: false,
				effect: String(componentName || ""),
				parameter: String(parameterName || ""),
				reason: "UNSUPPORTED_TYPE",
				detail: "Typed writer is not loaded.",
				type: "boolean"
			};
		}
		return $._pickfxParameterWriter.setTyped(trackItem, componentName, parameterName, value, "boolean", "");
	}

	return {
		set: set
	};
}());

if (typeof $ !== "undefined") {
	$._pickfxBooleanParameterWriter = BooleanParameterWriter;
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = BooleanParameterWriter;
}
