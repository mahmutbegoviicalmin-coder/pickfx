var ColorParameterWriter = (function () {
	function set(trackItem, componentName, parameterName) {
		return {
			ok: false,
			verified: false,
			effect: String(componentName || ""),
			parameter: String(parameterName || ""),
			reason: "UNSUPPORTED_TYPE",
			detail: "Color writes are not confirmed.",
			type: "color",
			writeCapability: "COLOR",
			status: "UNSUPPORTED",
			settersCalled: false,
			usedQE: false
		};
	}

	return {
		set: set
	};
}());

if (typeof $ !== "undefined") {
	$._pickfxColorParameterWriter = ColorParameterWriter;
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = ColorParameterWriter;
}
