var ParameterValueResolver = (function () {
	function fail(reason, status, extra) {
		var result = {
			ok: false,
			reason: reason,
			status: status
		};
		var key;
		if (extra) {
			for (key in extra) {
				if (extra.hasOwnProperty(key)) {
					result[key] = extra[key];
				}
			}
		}
		return result;
	}

	function resolve(parameterMetadata, rawValue) {
		var parsed;
		if (typeof ParameterValueParser === "undefined") {
			return fail("INVALID_VALUE", "Invalid value.");
		}
		parsed = ParameterValueParser.parse(parameterMetadata, rawValue);
		if (!parsed || !parsed.ok) {
			return parsed || fail("INVALID_VALUE", "Invalid value.");
		}
		if (parsed.type === "number" || parsed.type === "angle") {
			return {
				ok: true,
				write: true,
				type: parsed.type,
				value: parsed.value,
				displayValue: parsed.value
			};
		}
		if (parsed.type === "boolean") {
			return {
				ok: true,
				write: true,
				type: "boolean",
				value: parsed.value,
				displayValue: parsed.value
			};
		}
		if (parsed.type === "enum") {
			if (!parameterMetadata.options || !parameterMetadata.options.length) {
				return fail("PARAMETER_NOT_WRITABLE", "Parameter is not writable.", {
					type: "enum",
					value: parsed.value
				});
			}
			return {
				ok: true,
				write: true,
				type: "enum",
				value: parsed.value,
				displayValue: ParameterValueParser.enumLabel(parameterMetadata, parsed.value)
			};
		}
		return fail("UNSUPPORTED_TYPE", "Parameter type not writable yet.", {
			type: parsed.type,
			value: parsed.value
		});
	}

	return {
		resolve: resolve
	};
}());
