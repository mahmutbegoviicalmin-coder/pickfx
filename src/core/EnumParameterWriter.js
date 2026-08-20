var EnumParameterWriter = (function () {
	function set(trackItem, componentName, parameterName) {
		return {
			ok: false,
			verified: false,
			effect: String(componentName || ""),
			parameter: String(parameterName || ""),
			reason: "UNSUPPORTED_TYPE",
			detail: "Enum writes are not confirmed.",
			type: "enum",
			writeCapability: "ENUM",
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
	$._pickfxEnumParameterWriter = EnumParameterWriter;
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = EnumParameterWriter;
}
