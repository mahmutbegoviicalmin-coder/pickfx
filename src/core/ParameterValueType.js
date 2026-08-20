var ParameterValueType = (function () {
	function constructorNameOf(value) {
		try {
			if (value && value.constructor && value.constructor.name) {
				return String(value.constructor.name);
			}
		} catch (ignore) {}
		return "";
	}

	function shapeOf(value) {
		var t;
		var length;
		if (value === undefined) {
			return { kind: "undefined" };
		}
		if (value === null) {
			return { kind: "null" };
		}
		try {
			t = typeof value;
		} catch (typeErr) {
			return { kind: "error", error: String(typeErr) };
		}
		if (t !== "object") {
			return { kind: t };
		}
		try {
			if (typeof value.length === "number") {
				length = value.length;
				return {
					kind: "array",
					length: length,
					constructorName: constructorNameOf(value)
				};
			}
		} catch (ignoreLen) {}
		return {
			kind: "object",
			constructorName: constructorNameOf(value)
		};
	}

	function arrayLength(value) {
		try {
			if (value && typeof value.length === "number") {
				return value.length;
			}
		} catch (ignore) {}
		return undefined;
	}

	function detect(value) {
		var t;
		var point;
		var r;
		var g;
		var b;
		var shape;
		var len;
		if (value === undefined) {
			return { type: "unknown", value: value, valueShape: shapeOf(value) };
		}
		if (value === null) {
			return { type: "unknown", value: null, valueShape: shapeOf(value) };
		}
		try {
			t = typeof value;
		} catch (typeErr) {
			return { type: "error", error: String(typeErr), valueShape: { kind: "error" } };
		}
		if (t === "number") {
			if (!isFinite(value)) {
				return { type: "unknown", value: value, valueShape: shapeOf(value) };
			}
			return { type: "number", value: value, valueShape: shapeOf(value) };
		}
		if (t === "boolean") {
			return { type: "boolean", value: value, valueShape: shapeOf(value) };
		}
		if (t === "string") {
			return { type: "string", value: value, valueShape: shapeOf(value) };
		}
		if (t === "object") {
			shape = shapeOf(value);
			try {
				r = value.r !== undefined ? value.r : value.red;
				g = value.g !== undefined ? value.g : value.green;
				b = value.b !== undefined ? value.b : value.blue;
				if (typeof r === "number" && typeof g === "number" && typeof b === "number") {
					return {
						type: "color",
						value: value,
						valueShape: { kind: "color", constructorName: shape.constructorName }
					};
				}
			} catch (ignoreColor) {}
			len = arrayLength(value);
			if (len !== undefined && len !== 2) {
				return {
					type: "unknown",
					value: value,
					valueShape: shape
				};
			}
			if (typeof PointValue !== "undefined" && PointValue.inspect) {
				point = PointValue.inspect(value);
				if (point && point.ok) {
					return {
						type: "point",
						value: [point.x, point.y],
						shape: point.shape,
						valueShape: { kind: "point", shape: point.shape, constructorName: point.constructorName },
						constructorName: point.constructorName
					};
				}
			}
			return { type: "unknown", value: value, valueShape: shape };
		}
		return { type: "unknown", value: value, valueShape: shapeOf(value) };
	}

	function readLiveEnumOptions(param) {
		if (typeof $ !== "undefined" && $._pickfxParameterResolver && $._pickfxParameterResolver.inspectRealEnumOptions) {
			try {
				return $._pickfxParameterResolver.inspectRealEnumOptions(param) || [];
			} catch (ignore) {
				return [];
			}
		}
		return [];
	}

	function detectLive(param, value) {
		var detected = detect(value);
		var options;
		if (!detected) {
			detected = { type: "unknown", value: value, valueShape: shapeOf(value) };
		}
		options = readLiveEnumOptions(param);
		if (options && options.length >= 2 && (detected.type === "number" || detected.type === "string")) {
			detected = {
				type: "enum",
				value: detected.value,
				valueShape: detected.valueShape,
				options: options
			};
		}
		return detected;
	}

	function normalize(type, rawValue) {
		var wanted = String(type || "unknown");
		var point;
		if (wanted === "number" || wanted === "angle") {
			if (typeof rawValue === "number" && isFinite(rawValue)) {
				return { ok: true, type: wanted, value: rawValue };
			}
			return { ok: false, reason: "INVALID_VALUE", type: wanted };
		}
		if (wanted === "boolean") {
			if (rawValue === true || rawValue === false) {
				return { ok: true, type: "boolean", value: rawValue };
			}
			return { ok: false, reason: "INVALID_VALUE", type: "boolean" };
		}
		if (wanted === "point") {
			if (typeof PointValue === "undefined" || !PointValue.normalize) {
				return { ok: false, reason: "UNSUPPORTED_TYPE", type: "point" };
			}
			point = PointValue.normalize(rawValue);
			return point;
		}
		if (wanted === "string") {
			return { ok: true, type: "string", value: String(rawValue) };
		}
		return { ok: false, reason: "UNSUPPORTED_TYPE", type: wanted };
	}

	function parse(type, userInput) {
		var wanted = String(type || "unknown");
		var metadata;
		if (wanted === "number" || wanted === "angle" || wanted === "boolean" || wanted === "enum" || wanted === "color") {
			if (typeof ParameterValueParser === "undefined" || !ParameterValueParser.parse) {
				return { ok: false, reason: "UNSUPPORTED_TYPE", type: wanted };
			}
			metadata = { type: wanted };
			return ParameterValueParser.parse(metadata, userInput);
		}
		if (wanted === "point") {
			if (typeof PointValue === "undefined" || !PointValue.parse) {
				return { ok: false, reason: "UNSUPPORTED_TYPE", type: "point" };
			}
			return PointValue.parse(userInput);
		}
		return { ok: false, reason: "UNSUPPORTED_TYPE", type: wanted };
	}

	function verify(type, requested, actual, extra) {
		var wanted = String(type || "unknown");
		if (wanted === "number" || wanted === "angle" || wanted === "boolean" || wanted === "enum") {
			if (typeof ParameterEngine !== "undefined" && ParameterEngine.verify) {
				return ParameterEngine.verify(wanted, requested, actual, extra);
			}
		}
		if (wanted === "point") {
			if (typeof PointValue !== "undefined" && PointValue.verify) {
				return PointValue.verify(requested, actual, extra && extra.epsilon);
			}
			return { ok: false, reason: "UNSUPPORTED_TYPE", type: "point", requested: requested, actual: actual };
		}
		return { ok: false, reason: "UNSUPPORTED_TYPE", type: wanted, requested: requested, actual: actual };
	}

	return {
		detect: detect,
		detectLive: detectLive,
		shapeOf: shapeOf,
		normalize: normalize,
		parse: parse,
		verify: verify,
		detectParameterValueType: detect,
		normalizeParameterValue: normalize,
		parseParameterValue: parse,
		verifyParameterValue: verify
	};
}());

if (typeof $ !== "undefined") {
	$._pickfxParameterValueType = ParameterValueType;
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = ParameterValueType;
}
