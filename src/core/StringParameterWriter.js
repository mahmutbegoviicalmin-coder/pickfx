var StringParameterWriter = (function () {
	function set(trackItem, componentName, parameterName) {
		return {
			ok: false,
			verified: false,
			effect: String(componentName || ""),
			parameter: String(parameterName || ""),
			reason: "UNSUPPORTED_TYPE",
			detail: "String writes are not confirmed.",
			type: "string",
			writeCapability: "STRING",
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
	$._pickfxStringParameterWriter = StringParameterWriter;
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = StringParameterWriter;
}
