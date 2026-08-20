var PointValue = (function () {
	var NUMBER_TOKEN = /^[+-]?(?:\d+\.?\d*|\d*\.\d+)$/;

	function trim(value) {
		return String(value || "").replace(/^\s+|\s+$/g, "");
	}

	function fail(reason, detail) {
		return {
			ok: false,
			reason: reason || "INVALID_VALUE",
			detail: detail ? String(detail) : ""
		};
	}

	function asFiniteNumber(value) {
		var n;
		if (typeof value === "number" && isFinite(value)) {
			return value;
		}
		if (typeof value === "string" && value !== "") {
			n = Number(value);
			if (isFinite(n)) {
				return n;
			}
		}
		return undefined;
	}

	function readIndex(value, index) {
		try {
			if (value && value[index] !== undefined && value[index] !== null) {
				return asFiniteNumber(value[index]);
			}
		} catch (ignore) {}
		return undefined;
	}

	function readKey(value, key) {
		try {
			if (value && value[key] !== undefined && value[key] !== null) {
				return asFiniteNumber(value[key]);
			}
		} catch (ignore) {}
		return undefined;
	}

	function hasColorKeys(value) {
		var r;
		var g;
		var b;
		if (!value || typeof value !== "object") {
			return false;
		}
		r = readKey(value, "r");
		if (r === undefined) {
			r = readKey(value, "red");
		}
		g = readKey(value, "g");
		if (g === undefined) {
			g = readKey(value, "green");
		}
		b = readKey(value, "b");
		if (b === undefined) {
			b = readKey(value, "blue");
		}
		return r !== undefined && g !== undefined && b !== undefined;
	}

	function constructorNameOf(value) {
		try {
			if (value && value.constructor && value.constructor.name) {
				return String(value.constructor.name);
			}
		} catch (ignore) {}
		try {
			return Object.prototype.toString.call(value);
		} catch (ignoreToString) {}
		return "";
	}

	function inspect(value) {
		var zero;
		var one;
		var two;
		var x;
		var y;
		var z;
		var t;
		if (value === undefined || value === null) {
			return { ok: false, type: "unknown", reason: "not a point" };
		}
		try {
			t = typeof value;
		} catch (typeErr) {
			return { ok: false, type: "error", reason: String(typeErr) };
		}
		if (t === "number" || t === "boolean" || t === "string") {
			return { ok: false, type: t, reason: "not a point" };
		}
		if (hasColorKeys(value)) {
			return { ok: false, type: "color", reason: "color keys present" };
		}
		zero = readIndex(value, 0);
		one = readIndex(value, 1);
		two = readIndex(value, 2);
		if (zero !== undefined && one !== undefined && two === undefined) {
			return {
				ok: true,
				type: "point",
				dimensions: 2,
				shape: "index0",
				x: zero,
				y: one,
				constructorName: constructorNameOf(value)
			};
		}
		if (zero === undefined && one !== undefined && two !== undefined && readIndex(value, 3) === undefined) {
			return {
				ok: true,
				type: "point",
				dimensions: 2,
				shape: "index1",
				x: one,
				y: two,
				constructorName: constructorNameOf(value)
			};
		}
		x = readKey(value, "x");
		y = readKey(value, "y");
		z = readKey(value, "z");
		if (x !== undefined && y !== undefined && z === undefined) {
			return {
				ok: true,
				type: "point",
				dimensions: 2,
				shape: "xy",
				x: x,
				y: y,
				constructorName: constructorNameOf(value)
			};
		}
		return {
			ok: false,
			type: "unknown",
			constructorName: constructorNameOf(value),
			reason: "value is not a 2D numeric pair"
		};
	}

	function normalize(rawValue) {
		var x;
		var y;
		if (!rawValue || typeof rawValue !== "object") {
			return fail("INVALID_VALUE", "Point value is not an object.");
		}
		if (typeof rawValue.x === "number" && typeof rawValue.y === "number") {
			x = rawValue.x;
			y = rawValue.y;
		} else if (rawValue.length === 2) {
			x = asFiniteNumber(rawValue[0]);
			y = asFiniteNumber(rawValue[1]);
		} else {
			return fail("INVALID_VALUE", "Point value is missing x/y.");
		}
		if (x === undefined || y === undefined) {
			return fail("INVALID_VALUE", "Point coordinates must be finite numbers.");
		}
		return {
			ok: true,
			type: "point",
			value: [x, y]
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

	function parse(userInput) {
		var text = trim(userInput);
		var named;
		var parts;
		var nums;
		var i;
		var n;
		var token;
		if (!text) {
			return fail("INVALID_VALUE", "Empty point value.");
		}
		named = /^\s*x\s+([+-]?(?:\d+\.?\d*|\d*\.\d+))\s+y\s+([+-]?(?:\d+\.?\d*|\d*\.\d+))\s*$/i.exec(text);
		if (named) {
			return {
				ok: true,
				type: "point",
				value: [Number(named[1]), Number(named[2])]
			};
		}
		parts = text.split(/[\s,]+/);
		nums = [];
		for (i = 0; i < parts.length; i++) {
			token = parts[i];
			if (!token) {
				continue;
			}
			n = parseNumberToken(token);
			if (n === null) {
				return fail("INVALID_VALUE", "Point coordinates must be numbers.");
			}
			nums.push(n);
		}
		if (nums.length < 2) {
			return fail("INVALID_VALUE", "Point value is missing a coordinate.");
		}
		if (nums.length > 2) {
			return fail("INVALID_VALUE", "Point value has extra coordinates.");
		}
		return {
			ok: true,
			type: "point",
			value: [nums[0], nums[1]]
		};
	}

	function verify(requested, actual, epsilon) {
		var want;
		var got;
		var eps = typeof epsilon === "number" && isFinite(epsilon) ? epsilon : 0.0001;
		var dx;
		var dy;
		want = normalize(requested);
		if (!want.ok) {
			return { ok: false, reason: "VALUE_NOT_VERIFIED", type: "point", requested: requested, actual: actual };
		}
		got = inspect(actual);
		if (!got.ok) {
			return { ok: false, reason: "VALUE_NOT_VERIFIED", type: "point", requested: want.value, actual: actual };
		}
		dx = Math.abs(want.value[0] - got.x);
		dy = Math.abs(want.value[1] - got.y);
		if (dx <= eps && dy <= eps) {
			return {
				ok: true,
				type: "point",
				requested: want.value,
				actual: [got.x, got.y]
			};
		}
		return {
			ok: false,
			reason: "VALUE_NOT_VERIFIED",
			type: "point",
			requested: want.value,
			actual: [got.x, got.y]
		};
	}

	function pairFrom(point) {
		var x;
		var y;
		if (!point || typeof point !== "object") {
			return null;
		}
		if (typeof point.length === "number" && point.length === 2) {
			x = asFiniteNumber(point[0]);
			y = asFiniteNumber(point[1]);
		} else if (typeof point.x === "number" && typeof point.y === "number") {
			x = point.x;
			y = point.y;
		}
		if (x === undefined || y === undefined) {
			return null;
		}
		return [x, y];
	}

	function toWriteValue(original, point) {
		var inspected;
		var pair;
		pair = pairFrom(point);
		if (!pair) {
			return fail("INVALID_VALUE", "Write point must be a 2-element array.");
		}
		inspected = inspect(original);
		if (!inspected.ok) {
			return fail("UNSUPPORTED_TYPE", inspected.reason || "Live value is not a point.");
		}
		if (inspected.shape !== "index0") {
			return fail("UNSUPPORTED_TYPE", "Live point is not a 2-element array.");
		}
		return { ok: true, value: [pair[0], pair[1]], shape: "index0" };
	}

	function jsonPoint(value) {
		var inspected = inspect(value);
		if (!inspected.ok) {
			return value;
		}
		return [inspected.x, inspected.y];
	}

	return {
		inspect: inspect,
		normalize: normalize,
		parse: parse,
		verify: verify,
		toWriteValue: toWriteValue,
		pairFrom: pairFrom,
		jsonPoint: jsonPoint
	};
}());

if (typeof $ !== "undefined") {
	$._pickfxPointValue = PointValue;
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = PointValue;
}
