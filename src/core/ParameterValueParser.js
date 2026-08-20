var ParameterValueParser = (function () {
	var NUMBER_TOKEN = /^[+-]?(?:\d+\.?\d*|\d*\.\d+)$/;
	var BOOLEAN_VALUES = {
		true: true,
		false: false,
		on: true,
		off: false,
		yes: true,
		no: false
	};
	var HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
	var RGB_COLOR = /^rgba?\(\s*([+-]?(?:\d+\.?\d*|\d*\.\d+))\s*,\s*([+-]?(?:\d+\.?\d*|\d*\.\d+))\s*,\s*([+-]?(?:\d+\.?\d*|\d*\.\d+))(?:\s*,\s*([+-]?(?:\d+\.?\d*|\d*\.\d+)))?\s*\)$/i;

	function trim(value) {
		return String(value || "").replace(/^\s+|\s+$/g, "");
	}

	function normalize(value) {
		return trim(value).toLowerCase();
	}

	function fail(reason, status) {
		return {
			ok: false,
			reason: reason,
			status: status
		};
	}

	function ok(type, value) {
		return {
			ok: true,
			type: type,
			value: value
		};
	}

	function parseNumberToken(token) {
		var n;
		if (!NUMBER_TOKEN.test(String(token))) {
			return null;
		}
		n = Number(token);
		if (!isFinite(n)) {
			return null;
		}
		return n;
	}

	function inRange(metadata, value) {
		if (!metadata || typeof value !== "number" || !isFinite(value)) {
			return true;
		}
		if (typeof metadata.min === "number" && isFinite(metadata.min) && value < metadata.min) {
			return false;
		}
		if (typeof metadata.max === "number" && isFinite(metadata.max) && value > metadata.max) {
			return false;
		}
		return true;
	}

	function parseNumber(metadata, rawValue) {
		var n = parseNumberToken(trim(rawValue));
		if (n === null) {
			return fail("INVALID_VALUE", "Invalid value.");
		}
		if (!inRange(metadata, n)) {
			return fail("VALUE_OUT_OF_RANGE", "Value out of range.");
		}
		return ok("number", n);
	}

	function parseAngle(metadata, rawValue) {
		var parsed = parseNumber(metadata, rawValue);
		if (!parsed.ok) {
			return parsed;
		}
		return ok("angle", parsed.value);
	}

	function parseBoolean(rawValue) {
		var key = normalize(rawValue);
		if (!BOOLEAN_VALUES.hasOwnProperty(key)) {
			return fail("INVALID_VALUE", "Invalid value.");
		}
		return ok("boolean", BOOLEAN_VALUES[key]);
	}

	function parseEnum(metadata, rawValue) {
		var wanted = normalize(rawValue);
		var options = (metadata && metadata.options) ? metadata.options : [];
		var i;
		var option;
		var label;
		var value;
		if (!wanted) {
			return fail("INVALID_VALUE", "Invalid value.");
		}
		if (!options.length) {
			return fail("PARAMETER_NOT_WRITABLE", "Parameter is not writable.");
		}
		for (i = 0; i < options.length; i++) {
			option = options[i];
			if (option === undefined || option === null) {
				continue;
			}
			if (typeof option === "string" || typeof option === "number") {
				label = String(option);
				value = option;
			} else {
				label = option.label == null ? "" : String(option.label);
				value = option.value;
			}
			if (normalize(label) === wanted) {
				return ok("enum", value !== undefined ? value : i);
			}
			if (value !== undefined && normalize(String(value)) === wanted) {
				return ok("enum", value);
			}
		}
		return fail("ENUM_OPTION_NOT_FOUND", "Enum option not found.");
	}

	function hexChannel(text) {
		return parseInt(text, 16);
	}

	function expandShortHex(channel) {
		return hexChannel(channel + channel);
	}

	function channelOk(n) {
		return typeof n === "number" && isFinite(n) && n >= 0 && n <= 255;
	}

	function parseColor(rawValue) {
		var text = trim(rawValue);
		var match;
		var hex;
		var r;
		var g;
		var b;
		var a;
		match = HEX_COLOR.exec(text);
		if (match) {
			hex = match[1].toLowerCase();
			if (hex.length === 3 || hex.length === 4) {
				r = expandShortHex(hex.charAt(0));
				g = expandShortHex(hex.charAt(1));
				b = expandShortHex(hex.charAt(2));
				a = hex.length === 4 ? expandShortHex(hex.charAt(3)) : 255;
			} else {
				r = hexChannel(hex.substring(0, 2));
				g = hexChannel(hex.substring(2, 4));
				b = hexChannel(hex.substring(4, 6));
				a = hex.length === 8 ? hexChannel(hex.substring(6, 8)) : 255;
			}
			return ok("color", { r: r, g: g, b: b, a: a });
		}
		match = RGB_COLOR.exec(text);
		if (match) {
			r = Number(match[1]);
			g = Number(match[2]);
			b = Number(match[3]);
			a = match[4] === undefined ? 255 : Number(match[4]);
			if (a >= 0 && a <= 1 && String(match[4] || "").indexOf(".") !== -1) {
				a = Math.round(a * 255);
			}
			if (!channelOk(r) || !channelOk(g) || !channelOk(b) || !channelOk(a)) {
				return fail("INVALID_VALUE", "Invalid value.");
			}
			return ok("color", { r: r, g: g, b: b, a: a });
		}
		return fail("INVALID_VALUE", "Invalid value.");
	}

	function parsePoint(rawValue, dimensions, type) {
		var parts = trim(rawValue).split(/\s*,\s*/);
		var nums = [];
		var i;
		var n;
		if (parts.length !== dimensions) {
			return fail("INVALID_VALUE", "Invalid value.");
		}
		for (i = 0; i < parts.length; i++) {
			n = parseNumberToken(parts[i]);
			if (n === null) {
				return fail("INVALID_VALUE", "Invalid value.");
			}
			nums.push(n);
		}
		if (type === "point3d") {
			return ok(type, { x: nums[0], y: nums[1], z: nums[2] });
		}
		return ok("point2d", { x: nums[0], y: nums[1] });
	}

	function parse(parameterMetadata, rawValue) {
		var type;
		var text = trim(rawValue);
		if (!parameterMetadata) {
			return fail("PARAMETER_NOT_FOUND", "Parameter not found.");
		}
		if (!text) {
			return fail("INVALID_VALUE", "Invalid value.");
		}
		type = parameterMetadata.type || "unknown";
		if (type === "number") {
			return parseNumber(parameterMetadata, text);
		}
		if (type === "angle") {
			return parseAngle(parameterMetadata, text);
		}
		if (type === "boolean") {
			return parseBoolean(text);
		}
		if (type === "enum") {
			return parseEnum(parameterMetadata, text);
		}
		if (type === "color") {
			return parseColor(text);
		}
		if (type === "point2d") {
			return parsePoint(text, 2, "point2d");
		}
		if (type === "point3d") {
			return parsePoint(text, 3, "point3d");
		}
		return fail("UNSUPPORTED_TYPE", "Parameter type not writable yet.");
	}

	function matchNamedParameter(leftover, parameters) {
		var q = trim(leftover);
		var qn = normalize(q);
		var best = null;
		var bestLen = -1;
		var i;
		var param;
		var name;
		var nn;
		var remainder;

		if (!qn || !parameters || !parameters.length) {
			return null;
		}

		for (i = 0; i < parameters.length; i++) {
			param = parameters[i];
			name = trim(param && param.displayName);
			nn = normalize(name);
			if (!nn || nn.length < bestLen) {
				continue;
			}
			if (qn === nn) {
				best = { parameter: param, rawValue: "" };
				bestLen = nn.length;
			} else if (qn.indexOf(nn + " ") === 0) {
				remainder = trim(q.substring(name.length));
				best = { parameter: param, rawValue: remainder };
				bestLen = nn.length;
			}
		}

		return best;
	}

	function enumLabel(metadata, optionValue) {
		var options = (metadata && metadata.options) ? metadata.options : [];
		var i;
		var option;
		var label;
		var value;
		for (i = 0; i < options.length; i++) {
			option = options[i];
			if (option === undefined || option === null) {
				continue;
			}
			if (typeof option === "string" || typeof option === "number") {
				label = String(option);
				value = option;
			} else {
				label = option.label == null ? "" : String(option.label);
				value = option.value;
			}
			if (value === optionValue || String(value) === String(optionValue)) {
				return label || String(optionValue);
			}
		}
		return optionValue === undefined || optionValue === null ? "" : String(optionValue);
	}

	return {
		parse: parse,
		matchNamedParameter: matchNamedParameter,
		enumLabel: enumLabel
	};
}());
