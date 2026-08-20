/*global $ */

// Official Premiere DOM only. Not QE.
// Loaded into ExtendScript via $.evalFile from the CEP host bootstrap.
$._pickfxParameterResolver = {
	lines: [],

	resetLog: function () {
		$._pickfxParameterResolver.lines = [];
	},

	log: function (message) {
		var line = String(message);
		$._pickfxParameterResolver.lines.push(line);
		try {
			$.writeln("[PickFX ParameterResolver] " + line);
		} catch (ignore) {}
	},

	readString: function (obj, key) {
		try {
			if (obj && obj[key] !== undefined && obj[key] !== null) {
				return String(obj[key]);
			}
		} catch (ignore) {}
		return null;
	},

	collectionCount: function (col) {
		try {
			if (col && typeof col.numItems === "number") {
				return { count: col.numItems, via: "numItems" };
			}
		} catch (ignoreNumItems) {}
		try {
			if (col && typeof col.length === "number") {
				return { count: col.length, via: "length" };
			}
		} catch (ignoreLength) {}
		return { count: -1, via: "" };
	},

	collectionIndexBase: function (col, count) {
		var zero;
		var one;
		if (count <= 0) {
			return 0;
		}
		try {
			zero = col[0];
		} catch (ignoreZero) {
			zero = undefined;
		}
		try {
			one = col[1];
		} catch (ignoreOne) {
			one = undefined;
		}
		if (zero !== undefined && zero !== null) {
			return 0;
		}
		if (one !== undefined && one !== null) {
			return 1;
		}
		return 0;
	},

	collectionItem: function (col, index, indexBase) {
		try {
			return col[index + indexBase];
		} catch (e) {
			return undefined;
		}
	},

	inferType: function (param, value) {
		var t = typeof value;
		if (t === "number") {
			return "number";
		}
		if (t === "boolean") {
			return "boolean";
		}
		if (t === "string") {
			return "string";
		}
		try {
			if (param && typeof param.getColorValue === "function") {
				param.getColorValue();
				return "color";
			}
		} catch (ignoreColor) {}
		return "unknown";
	},

	hasFunction: function (obj, name) {
		try {
			return !!(obj && typeof obj[name] === "function");
		} catch (ignore) {
			return false;
		}
	},

	readRaw: function (obj, key) {
		try {
			if (obj && obj[key] !== undefined && obj[key] !== null) {
				return obj[key];
			}
		} catch (ignore) {}
		return undefined;
	},

	readFiniteNumber: function (value) {
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
	},

	tryCall: function (obj, name) {
		if (!$._pickfxParameterResolver.hasFunction(obj, name)) {
			return undefined;
		}
		try {
			return obj[name]();
		} catch (ignore) {
			return undefined;
		}
	},

	readNamedNumber: function (obj, names) {
		var i;
		var name;
		var raw;
		var n;
		for (i = 0; i < names.length; i++) {
			name = names[i];
			raw = $._pickfxParameterResolver.readRaw(obj, name);
			n = $._pickfxParameterResolver.readFiniteNumber(raw);
			if (n !== undefined) {
				return n;
			}
			n = $._pickfxParameterResolver.readFiniteNumber(
				$._pickfxParameterResolver.tryCall(obj, name)
			);
			if (n !== undefined) {
				return n;
			}
		}
		return undefined;
	},

	readNamedString: function (obj, names) {
		var i;
		var raw;
		var text;
		for (i = 0; i < names.length; i++) {
			raw = $._pickfxParameterResolver.readRaw(obj, names[i]);
			if (raw === undefined) {
				raw = $._pickfxParameterResolver.tryCall(obj, names[i]);
			}
			if (raw === undefined || raw === null) {
				continue;
			}
			try {
				text = String(raw);
			} catch (ignore) {
				continue;
			}
			if (text && text !== "[object Object]") {
				return text;
			}
		}
		return "";
	},

	indexValue: function (value, index) {
		try {
			return value[index];
		} catch (ignore) {
			return undefined;
		}
	},

	readNumericVector: function (value) {
		var zero;
		var one;
		var two;
		var three;
		var x;
		var y;
		var z;
		if (value === undefined || value === null) {
			return null;
		}
		zero = $._pickfxParameterResolver.readFiniteNumber($._pickfxParameterResolver.indexValue(value, 0));
		one = $._pickfxParameterResolver.readFiniteNumber($._pickfxParameterResolver.indexValue(value, 1));
		two = $._pickfxParameterResolver.readFiniteNumber($._pickfxParameterResolver.indexValue(value, 2));
		three = $._pickfxParameterResolver.readFiniteNumber($._pickfxParameterResolver.indexValue(value, 3));
		if (zero !== undefined && one !== undefined) {
			if (three !== undefined) {
				return [zero, one, two, three];
			}
			if (two !== undefined) {
				return [zero, one, two];
			}
			return [zero, one];
		}
		if (one !== undefined && two !== undefined && zero === undefined) {
			if (three !== undefined) {
				return [one, two, three];
			}
			return [one, two];
		}
		x = $._pickfxParameterResolver.readFiniteNumber($._pickfxParameterResolver.readRaw(value, "x"));
		y = $._pickfxParameterResolver.readFiniteNumber($._pickfxParameterResolver.readRaw(value, "y"));
		z = $._pickfxParameterResolver.readFiniteNumber($._pickfxParameterResolver.readRaw(value, "z"));
		if (x !== undefined && y !== undefined) {
			if (z !== undefined) {
				return [x, y, z];
			}
			return [x, y];
		}
		return null;
	},

	readColorValue: function (value) {
		var vector;
		var red;
		var green;
		var blue;
		var alpha;
		if (value === undefined || value === null) {
			return null;
		}
		red = $._pickfxParameterResolver.readFiniteNumber($._pickfxParameterResolver.readRaw(value, "red"));
		if (red === undefined) {
			red = $._pickfxParameterResolver.readFiniteNumber($._pickfxParameterResolver.readRaw(value, "r"));
		}
		green = $._pickfxParameterResolver.readFiniteNumber($._pickfxParameterResolver.readRaw(value, "green"));
		if (green === undefined) {
			green = $._pickfxParameterResolver.readFiniteNumber($._pickfxParameterResolver.readRaw(value, "g"));
		}
		blue = $._pickfxParameterResolver.readFiniteNumber($._pickfxParameterResolver.readRaw(value, "blue"));
		if (blue === undefined) {
			blue = $._pickfxParameterResolver.readFiniteNumber($._pickfxParameterResolver.readRaw(value, "b"));
		}
		alpha = $._pickfxParameterResolver.readFiniteNumber($._pickfxParameterResolver.readRaw(value, "alpha"));
		if (alpha === undefined) {
			alpha = $._pickfxParameterResolver.readFiniteNumber($._pickfxParameterResolver.readRaw(value, "a"));
		}
		if (red !== undefined && green !== undefined && blue !== undefined) {
			return {
				r: red,
				g: green,
				b: blue,
				a: alpha !== undefined ? alpha : 255
			};
		}
		vector = $._pickfxParameterResolver.readNumericVector(value);
		if (vector && vector.length === 4) {
			return { y: vector[0], r: vector[1], g: vector[2], b: vector[3] };
		}
		if (vector && vector.length === 3) {
			return { r: vector[0], g: vector[1], b: vector[2], a: 255 };
		}
		return null;
	},

	normalizeTypeHint: function (hint) {
		var s = String(hint || "").toLowerCase();
		if (!s) {
			return "";
		}
		if (s.indexOf("color") !== -1 || s.indexOf("colour") !== -1) {
			return "color";
		}
		if (s.indexOf("bool") !== -1 || s.indexOf("checkbox") !== -1) {
			return "boolean";
		}
		if (
			s.indexOf("enum") !== -1 ||
			s.indexOf("popup") !== -1 ||
			s.indexOf("dropdown") !== -1 ||
			s.indexOf("menu") !== -1
		) {
			return "enum";
		}
		if (s.indexOf("angle") !== -1 || s.indexOf("degree") !== -1 || s.indexOf("radian") !== -1) {
			return "angle";
		}
		if (
			s.indexOf("3d") !== -1 ||
			s.indexOf("threed") !== -1 ||
			s.indexOf("three_d") !== -1 ||
			s.indexOf("point3") !== -1
		) {
			return "point3d";
		}
		if (
			s.indexOf("2d") !== -1 ||
			s.indexOf("twod") !== -1 ||
			s.indexOf("two_d") !== -1 ||
			s.indexOf("point2") !== -1 ||
			s.indexOf("spatial") !== -1
		) {
			return "point2d";
		}
		if (
			s.indexOf("one_d") !== -1 ||
			s.indexOf("oned") !== -1 ||
			s.indexOf("slider") !== -1 ||
			s.indexOf("scalar") !== -1 ||
			s.indexOf("float") !== -1 ||
			s.indexOf("number") !== -1 ||
			s === "int" ||
			s.indexOf("integer") !== -1
		) {
			return "number";
		}
		return "";
	},

	readTypeHint: function (param) {
		return $._pickfxParameterResolver.normalizeTypeHint(
			$._pickfxParameterResolver.readNamedString(param, [
				"dataType",
				"valueType",
				"propertyValueType",
				"paramType",
				"keyType",
				"type"
			])
		);
	},

	readUnit: function (param, value) {
		var text = $._pickfxParameterResolver.readNamedString(param, [
			"units",
			"unit",
			"unitsText",
			"unitText",
			"unitsString",
			"displayUnits"
		]);
		if (!text && value && typeof value === "object") {
			text = $._pickfxParameterResolver.readNamedString(value, [
				"units",
				"unit",
				"unitsText",
				"unitText"
			]);
		}
		return text;
	},

	unitIsAngle: function (unit) {
		var s = String(unit || "").toLowerCase();
		return !!(s && (
			s.indexOf("deg") !== -1 ||
			s.indexOf("rad") !== -1 ||
			s.indexOf("angle") !== -1
		));
	},

	readEnumOptions: function (param) {
		var names = ["items", "valueNames", "enumItems", "listItems", "options", "values"];
		var getters = ["getItem", "getListItem", "getValueName", "getOption", "getOptionName"];
		var countNames = ["numItems", "numberOfItems", "itemCount", "numOptions", "length"];
		var options = [];
		var i;
		var n;
		var col;
		var count;
		var item;
		var label;
		var getter;
		var indexBase;

		for (i = 0; i < names.length; i++) {
			col = $._pickfxParameterResolver.readRaw(param, names[i]);
			if (col === undefined) {
				col = $._pickfxParameterResolver.tryCall(param, names[i]);
			}
			if (col === undefined || col === null) {
				continue;
			}
			count = $._pickfxParameterResolver.collectionCount(col);
			if (count.count > 0 && count.count < 64) {
				indexBase = $._pickfxParameterResolver.collectionIndexBase(col, count.count);
				for (n = 0; n < count.count; n++) {
					item = $._pickfxParameterResolver.collectionItem(col, n, indexBase);
					label = $._pickfxParameterResolver.readString(item, "displayName");
					if (!label) {
						label = $._pickfxParameterResolver.readString(item, "name");
					}
					if (!label && (typeof item === "string" || typeof item === "number")) {
						label = String(item);
					}
					if (label) {
						options.push({ value: n, label: label });
					}
				}
				if (options.length) {
					return options;
				}
			}
		}

		count = $._pickfxParameterResolver.readNamedNumber(param, countNames);
		if (count === undefined || count < 2 || count > 64) {
			return [];
		}
		for (i = 0; i < getters.length; i++) {
			getter = getters[i];
			if (!$._pickfxParameterResolver.hasFunction(param, getter)) {
				continue;
			}
			options = [];
			for (n = 0; n < count; n++) {
				try {
					item = param[getter](n);
				} catch (ignoreZero) {
					try {
						item = param[getter](n + 1);
					} catch (ignoreOne) {
						item = undefined;
					}
				}
				label = "";
				if (typeof item === "string" || typeof item === "number") {
					label = String(item);
				} else {
					label = $._pickfxParameterResolver.readString(item, "displayName") ||
						$._pickfxParameterResolver.readString(item, "name") ||
						"";
				}
				if (label) {
					options.push({ value: n, label: label });
				}
			}
			if (options.length) {
				return options;
			}
		}
		return [];
	},

	inspectOptionFields: function (item) {
		var value;
		var label;
		if (item === undefined || item === null) {
			return null;
		}
		if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
			return { value: item, label: String(item) };
		}
		value = $._pickfxParameterResolver.readRaw(item, "value");
		if (value === undefined) {
			value = $._pickfxParameterResolver.readRaw(item, "itemValue");
		}
		if (value === undefined) {
			value = $._pickfxParameterResolver.readRaw(item, "data");
		}
		label = $._pickfxParameterResolver.readString(item, "label") ||
			$._pickfxParameterResolver.readString(item, "displayName") ||
			$._pickfxParameterResolver.readString(item, "name") ||
			$._pickfxParameterResolver.readString(item, "valueName") ||
			"";
		if (value === undefined || value === null) {
			if (label) {
				return { label: label, incomplete: true };
			}
			return null;
		}
		if (!label) {
			try {
				label = String(value);
			} catch (ignoreLabel) {
				return { value: value, incomplete: true };
			}
		}
		return { value: value, label: label };
	},

	inspectRealEnumOptions: function (param) {
		var names = ["items", "valueNames", "enumItems", "listItems", "options", "values"];
		var getters = ["getItem", "getListItem", "getValueName", "getValueNames", "getItems", "getOptions"];
		var options;
		var i;
		var n;
		var col;
		var count;
		var item;
		var parsed;
		var getter;
		var indexBase;
		var complete;

		if (!param) {
			return [];
		}

		for (i = 0; i < names.length; i++) {
			col = $._pickfxParameterResolver.readRaw(param, names[i]);
			if (col === undefined && $._pickfxParameterResolver.hasFunction(param, names[i])) {
				col = $._pickfxParameterResolver.tryCall(param, names[i]);
			}
			if (col === undefined || col === null) {
				continue;
			}
			if (typeof col === "string" || typeof col === "number") {
				continue;
			}
			count = $._pickfxParameterResolver.collectionCount(col);
			if (count.count <= 0 || count.count >= 64) {
				continue;
			}
			indexBase = $._pickfxParameterResolver.collectionIndexBase(col, count.count);
			options = [];
			complete = true;
			for (n = 0; n < count.count; n++) {
				item = $._pickfxParameterResolver.collectionItem(col, n, indexBase);
				parsed = $._pickfxParameterResolver.inspectOptionFields(item);
				if (!parsed || parsed.incomplete) {
					complete = false;
					break;
				}
				options.push({ value: parsed.value, label: parsed.label });
			}
			if (complete && options.length) {
				return options;
			}
		}

		for (i = 0; i < getters.length; i++) {
			getter = getters[i];
			if (!$._pickfxParameterResolver.hasFunction(param, getter)) {
				continue;
			}
			options = [];
			complete = true;
			for (n = 0; n < 64; n++) {
				try {
					item = param[getter](n);
				} catch (ignoreArg) {
					item = undefined;
				}
				if (item === undefined) {
					break;
				}
				parsed = $._pickfxParameterResolver.inspectOptionFields(item);
				if (!parsed || parsed.incomplete) {
					complete = false;
					break;
				}
				options.push({ value: parsed.value, label: parsed.label });
			}
			if (complete && options.length >= 2) {
				return options;
			}
		}

		return [];
	},

	serializeDetectedValue: function (type, value, colorValue) {
		var vector;
		if (type === "color") {
			return colorValue || $._pickfxParameterResolver.readColorValue(value);
		}
		if (type === "point2d" || type === "point3d") {
			vector = $._pickfxParameterResolver.readNumericVector(value);
			return vector || value;
		}
		if (type === "boolean") {
			if (typeof value === "boolean") {
				return value;
			}
			if (value === 1 || value === "true") {
				return true;
			}
			if (value === 0 || value === "false") {
				return false;
			}
		}
		if (typeof value === "number" || typeof value === "boolean" || typeof value === "string") {
			return value;
		}
		vector = $._pickfxParameterResolver.readNumericVector(value);
		if (vector) {
			return vector;
		}
		return undefined;
	},

	describeParameter: function (param, index) {
		var displayName;
		var writable;
		var value;
		var colorValue;
		var typeHint;
		var unit;
		var options;
		var vector;
		var type;
		var min;
		var max;
		var meta;

		displayName = $._pickfxParameterResolver.readString(param, "displayName");
		writable = false;
		value = undefined;
		colorValue = null;
		type = "unknown";

		if (!param) {
			return {
				displayName: displayName,
				index: index,
				type: "unknown",
				writable: false,
				value: undefined
			};
		}

		try {
			writable = typeof param.setValue === "function";
		} catch (ignoreWritable) {}
		try {
			if (!writable && typeof param.setColorValue === "function") {
				writable = true;
			}
		} catch (ignoreColorWrite) {}

		try {
			value = param.getValue();
		} catch (ignoreValue) {
			value = undefined;
		}

		if ($._pickfxParameterResolver.hasFunction(param, "getColorValue")) {
			try {
				colorValue = $._pickfxParameterResolver.readColorValue(param.getColorValue());
			} catch (ignoreColor) {
				colorValue = null;
			}
		}

		typeHint = $._pickfxParameterResolver.readTypeHint(param);
		unit = $._pickfxParameterResolver.readUnit(param, value);
		options = $._pickfxParameterResolver.readEnumOptions(param);
		vector = $._pickfxParameterResolver.readNumericVector(value);
		min = $._pickfxParameterResolver.readNamedNumber(param, [
			"min", "minValue", "minimum", "sliderMin", "getMin", "getMinimum"
		]);
		max = $._pickfxParameterResolver.readNamedNumber(param, [
			"max", "maxValue", "maximum", "sliderMax", "getMax", "getMaximum"
		]);

		if (typeof value === "boolean" || typeHint === "boolean") {
			type = "boolean";
		} else if (typeof value === "number") {
			type = "number";
			if (typeHint === "angle" || $._pickfxParameterResolver.unitIsAngle(unit)) {
				type = "angle";
			} else if (typeHint === "enum" || options.length) {
				type = "enum";
			}
		} else if (typeof value === "string") {
			type = (typeHint === "enum" || options.length) ? "enum" : "string";
		} else if (colorValue || typeHint === "color") {
			type = "color";
		} else if (typeHint) {
			type = typeHint;
		} else if (options.length) {
			type = "enum";
		} else if (vector && vector.length >= 3) {
			type = "point3d";
		} else if (vector && vector.length === 2) {
			type = "point2d";
		}

		if ((type === "point2d" || type === "number") && vector && vector.length >= 3 && !colorValue) {
			type = "point3d";
		}
		if (type === "point3d" && vector && vector.length === 2) {
			type = "point2d";
		}

		meta = {
			displayName: displayName,
			index: index,
			type: type,
			writable: writable,
			value: $._pickfxParameterResolver.serializeDetectedValue(type, value, colorValue)
		};
		if (min !== undefined) {
			meta.min = min;
		}
		if (max !== undefined) {
			meta.max = max;
		}
		if (unit) {
			meta.unit = unit;
		}
		if (type === "point2d" || type === "point3d") {
			meta.dimensions = type === "point3d" ? 3 : 2;
		}
		if (options.length) {
			meta.options = options;
			if (type === "unknown" || type === "number" || type === "string") {
				meta.type = "enum";
			}
		}
		return meta;
	},

	inspectSafeValue: function (value) {
		var t;
		var out;
		var color;
		var vector;
		try {
			t = typeof value;
		} catch (typeErr) {
			return { typeofValue: "threw", error: String(typeErr) };
		}
		out = { typeofValue: t };
		if (value === undefined) {
			return out;
		}
		if (value === null) {
			out.value = null;
			return out;
		}
		if (t === "number" || t === "boolean" || t === "string") {
			out.value = value;
			return out;
		}
		color = $._pickfxParameterResolver.readColorValue(value);
		if (color) {
			out.value = color;
			out.shape = "color";
			return out;
		}
		vector = $._pickfxParameterResolver.readNumericVector(value);
		if (vector) {
			out.value = vector;
			out.shape = "vector";
			return out;
		}
		try {
			out.stringValue = String(value);
		} catch (stringErr) {
			out.stringValueError = String(stringErr);
		}
		try {
			if (value && value.constructor && value.constructor.name) {
				out.constructorName = String(value.constructor.name);
			}
		} catch (ignoreCtor) {}
		return out;
	},

	inspectHas: function (obj, name) {
		try {
			return typeof obj[name] !== "undefined";
		} catch (ignore) {
			return false;
		}
	},

	inspectStringList: function (values, maxCount) {
		var out = [];
		var i;
		var n;
		var max = maxCount || 200;
		if (!values) {
			return out;
		}
		try {
			n = values.length;
		} catch (ignoreLen) {
			return out;
		}
		if (n > max) {
			n = max;
		}
		for (i = 0; i < n; i++) {
			try {
				out.push(String(values[i]));
			} catch (ignoreItem) {}
		}
		return out;
	},

	inspectHasOwnName: function (obj, name) {
		try {
			return Object.prototype.hasOwnProperty.call(obj, name);
		} catch (ignore) {
			return false;
		}
	},

	inspectGetPrototype: function (obj) {
		try {
			if (typeof Object.getPrototypeOf === "function") {
				return Object.getPrototypeOf(obj);
			}
		} catch (ignoreGet) {}
		try {
			return obj.__proto__;
		} catch (ignoreProto) {}
		return undefined;
	},

	inspectObjectClass: function (obj) {
		try {
			return String(Object.prototype.toString.call(obj));
		} catch (ignore) {
			return "unknown";
		}
	},

	inspectTryObjectKeys: function (obj) {
		var keys;
		try {
			if (typeof Object.keys !== "function") {
				return { available: false, keys: [], reason: "Object.keys is not a function" };
			}
			keys = Object.keys(obj);
			return { available: true, keys: $._pickfxParameterResolver.inspectStringList(keys) };
		} catch (err) {
			return { available: true, keys: [], threw: true, error: String(err) };
		}
	},

	inspectTryOwnPropertyNames: function (obj) {
		var names;
		try {
			if (typeof Object.getOwnPropertyNames !== "function") {
				return { available: false, keys: [], reason: "Object.getOwnPropertyNames is not a function" };
			}
			names = Object.getOwnPropertyNames(obj);
			return { available: true, keys: $._pickfxParameterResolver.inspectStringList(names) };
		} catch (err) {
			return { available: true, keys: [], threw: true, error: String(err) };
		}
	},

	inspectTryForInKeys: function (obj) {
		var keys = [];
		var seen = {};
		var key;
		try {
			for (key in obj) {
				try {
					key = String(key);
					if (!seen[key]) {
						seen[key] = true;
						keys.push(key);
						if (keys.length >= 200) {
							break;
						}
					}
				} catch (ignoreKey) {}
			}
			return { keys: keys };
		} catch (err) {
			return { keys: keys, threw: true, error: String(err) };
		}
	},

	inspectNameSet: function () {
		return {};
	},

	inspectAddNames: function (set, names, source) {
		var i;
		var name;
		if (!set || !names) {
			return;
		}
		for (i = 0; i < names.length; i++) {
			name = String(names[i]);
			if (!set[name]) {
				set[name] = { sources: [source] };
			} else {
				set[name].sources.push(source);
			}
		}
	},

	inspectPrototypeChain: function (obj) {
		var chain = [];
		var current = obj;
		var proto;
		var depth = 0;
		var objectKeys;
		var ownNames;
		var forInKeys;
		var ctorName;
		var node;
		while (current && depth < 8) {
			proto = $._pickfxParameterResolver.inspectGetPrototype(current);
			if (!proto || proto === current) {
				break;
			}
			try {
				if (proto === Object.prototype) {
					chain.push({
						depth: depth + 1,
						objectClass: $._pickfxParameterResolver.inspectObjectClass(proto),
						constructorName: "Object",
						skipped: "Object.prototype"
					});
					break;
				}
			} catch (ignoreObjectProto) {}
			objectKeys = $._pickfxParameterResolver.inspectTryObjectKeys(proto);
			ownNames = $._pickfxParameterResolver.inspectTryOwnPropertyNames(proto);
			forInKeys = $._pickfxParameterResolver.inspectTryForInKeys(proto);
			ctorName = null;
			try {
				if (proto.constructor && proto.constructor.name) {
					ctorName = String(proto.constructor.name);
				}
			} catch (ignoreCtor) {}
			node = {
				depth: depth + 1,
				objectClass: $._pickfxParameterResolver.inspectObjectClass(proto),
				constructorName: ctorName,
				getPrototypeOfAvailable: typeof Object.getPrototypeOf === "function",
				objectKeys: objectKeys.keys,
				forInKeys: forInKeys.keys,
				ownPropertyNames: ownNames.keys
			};
			if (objectKeys.reason || objectKeys.error) {
				node.objectKeysError = objectKeys.reason || objectKeys.error;
			}
			if (ownNames.reason || ownNames.error) {
				node.ownPropertyNamesError = ownNames.reason || ownNames.error;
			}
			if (forInKeys.error) {
				node.forInError = forInKeys.error;
			}
			chain.push(node);
			current = proto;
			depth++;
		}
		return chain;
	},

	inspectReadIfPresent: function (obj, name, discovered) {
		var present = false;
		var own = false;
		var report;
		var field;
		own = $._pickfxParameterResolver.inspectHasOwnName(obj, name);
		if (own || (discovered && discovered[name])) {
			present = true;
		}
		if (!present) {
			return { found: false };
		}
		field = $._pickfxParameterResolver.inspectRawField(obj, name);
		report = {
			found: true,
			own: own,
			sources: discovered && discovered[name] ? discovered[name].sources : ["hasOwnProperty"]
		};
		if (!field) {
			report.exists = false;
			report.typeofValue = "undefined";
			return report;
		}
		report.exists = field.exists;
		report.typeofValue = field.typeofValue;
		if (field.value !== undefined) {
			report.value = field.value;
		}
		if (field.error) {
			report.error = field.error;
		}
		return report;
	},

	inspectHostObject: function (obj, candidateNames) {
		var objectKeys;
		var ownNames;
		var forInKeys;
		var discovered;
		var prototypeChain;
		var candidateMetadata;
		var i;
		var name;
		var ctorName;
		var dump;
		if (!obj) {
			return {
				objectKeys: [],
				forInKeys: [],
				prototypeChain: [],
				candidateMetadata: {},
				reflection: { available: false, reason: "object is null/undefined" }
			};
		}
		objectKeys = $._pickfxParameterResolver.inspectTryObjectKeys(obj);
		ownNames = $._pickfxParameterResolver.inspectTryOwnPropertyNames(obj);
		forInKeys = $._pickfxParameterResolver.inspectTryForInKeys(obj);
		discovered = $._pickfxParameterResolver.inspectNameSet();
		$._pickfxParameterResolver.inspectAddNames(discovered, objectKeys.keys, "Object.keys");
		$._pickfxParameterResolver.inspectAddNames(discovered, ownNames.keys, "Object.getOwnPropertyNames");
		$._pickfxParameterResolver.inspectAddNames(discovered, forInKeys.keys, "for-in");
		prototypeChain = $._pickfxParameterResolver.inspectPrototypeChain(obj);
		for (i = 0; i < prototypeChain.length; i++) {
			if (prototypeChain[i].skipped) {
				continue;
			}
			$._pickfxParameterResolver.inspectAddNames(discovered, prototypeChain[i].objectKeys, "prototype.Object.keys:" + prototypeChain[i].depth);
			$._pickfxParameterResolver.inspectAddNames(discovered, prototypeChain[i].ownPropertyNames, "prototype.getOwnPropertyNames:" + prototypeChain[i].depth);
			$._pickfxParameterResolver.inspectAddNames(discovered, prototypeChain[i].forInKeys, "prototype.for-in:" + prototypeChain[i].depth);
		}
		candidateMetadata = {};
		for (i = 0; i < candidateNames.length; i++) {
			name = candidateNames[i];
			candidateMetadata[name] = $._pickfxParameterResolver.inspectReadIfPresent(obj, name, discovered);
		}
		ctorName = null;
		try {
			if (obj.constructor && obj.constructor.name) {
				ctorName = String(obj.constructor.name);
			}
		} catch (ignoreCtor) {}
		dump = {
			objectKeys: objectKeys.keys,
			forInKeys: forInKeys.keys,
			ownPropertyNames: ownNames.keys,
			prototypeChain: prototypeChain,
			candidateMetadata: candidateMetadata,
			reflection: {
				objectClass: $._pickfxParameterResolver.inspectObjectClass(obj),
				constructorName: ctorName,
				objectKeysAvailable: objectKeys.available,
				ownPropertyNamesAvailable: ownNames.available,
				getPrototypeOfAvailable: typeof Object.getPrototypeOf === "function"
			}
		};
		if (objectKeys.reason || objectKeys.error) {
			dump.reflection.objectKeysError = objectKeys.reason || objectKeys.error;
		}
		if (ownNames.reason || ownNames.error) {
			dump.reflection.ownPropertyNamesError = ownNames.reason || ownNames.error;
		}
		if (forInKeys.error) {
			dump.reflection.forInError = forInKeys.error;
		}
		return dump;
	},

	inspectParamCandidates: function () {
		return [
			"name", "matchName", "internalName", "propertyName", "identifier", "id",
			"key", "keyName", "keyType", "dataType", "valueType", "propertyValueType",
			"type", "paramType", "streamType",
			"items", "valueNames", "options", "enumItems", "listItems",
			"getItem", "getListItem", "getValueName", "getValueNames", "getItems", "getOptions",
			"hidden", "isHidden", "hiddenInUI", "isHiddenInUI", "elided", "isElided",
			"visible", "isVisible", "showInUI", "includeInUI",
			"internal", "isInternal", "system", "isSystem",
			"control", "isControl", "group", "isGroup",
			"separator", "isSeparator", "folder", "isFolder",
			"container", "isContainer",
			"userFacing", "isUserFacing", "userParam", "isUserParam",
			"enabled", "isEnabled", "active", "isActive",
			"propertyFlags", "flags", "attributes", "access", "uiFlags"
		];
	},

	inspectComponentCandidates: function () {
		return ["displayName", "matchName", "name", "properties"];
	},


	inspectRawField: function (obj, name) {
		var raw;
		var t;
		try {
			raw = obj[name];
		} catch (probeErr) {
			return { exists: "threw", error: String(probeErr) };
		}
		if (raw === undefined) {
			return undefined;
		}
		try {
			t = typeof raw;
		} catch (typeErr) {
			return { exists: true, typeofValue: "threw", error: String(typeErr) };
		}
		if (t === "function") {
			return { exists: true, typeofValue: "function" };
		}
		return {
			exists: true,
			typeofValue: t,
			value: $._pickfxParameterResolver.inspectSafeValue(raw)
		};
	},

	inspectDomCapabilities: function (param) {
		return {
			hasGetValue: $._pickfxParameterResolver.hasFunction(param, "getValue"),
			hasSetValue: $._pickfxParameterResolver.hasFunction(param, "setValue"),
			hasGetColorValue: $._pickfxParameterResolver.hasFunction(param, "getColorValue"),
			hasSetColorValue: $._pickfxParameterResolver.hasFunction(param, "setColorValue"),
			hasItems: $._pickfxParameterResolver.inspectHas(param, "items"),
			hasValueNames: $._pickfxParameterResolver.inspectHas(param, "valueNames"),
			hasOptions: $._pickfxParameterResolver.inspectHas(param, "options"),
			hasGetItem: $._pickfxParameterResolver.hasFunction(param, "getItem"),
			hasGetListItem: $._pickfxParameterResolver.hasFunction(param, "getListItem"),
			hasGetValueName: $._pickfxParameterResolver.hasFunction(param, "getValueName")
		};
	},

	inspectAccessorDescriptors: function (param) {
		var names = ["getValue", "setValue", "getColorValue", "setColorValue"];
		var out = {
			settersInvoked: false,
			setColorValueInvoked: false,
			descriptorGettersInvoked: false
		};
		var i;
		var name;
		var rec;
		var desc;
		var proto;
		var depth;
		var hasDesc;
		if (!param) {
			return out;
		}
		for (i = 0; i < names.length; i++) {
			name = names[i];
			rec = { name: name, invoked: false };
			try {
				rec.typeofValue = typeof param[name];
			} catch (typeErr) {
				rec.typeofValue = "threw";
				rec.error = String(typeErr);
				out[name] = rec;
				continue;
			}
			rec.available = rec.typeofValue === "function";
			hasDesc = false;
			desc = null;
			try {
				if (typeof Object.getOwnPropertyDescriptor !== "function") {
					rec.descriptorInspection = "Object.getOwnPropertyDescriptor unavailable";
				} else {
					desc = Object.getOwnPropertyDescriptor(param, name);
					if (desc) {
						hasDesc = true;
						rec.own = true;
					} else {
						proto = param;
						depth = 0;
						while (!hasDesc && proto && depth < 8) {
							proto = $._pickfxParameterResolver.inspectGetPrototype(proto);
							if (!proto) {
								break;
							}
							desc = Object.getOwnPropertyDescriptor(proto, name);
							if (desc) {
								hasDesc = true;
								rec.own = false;
								rec.prototypeDepth = depth + 1;
							}
							depth += 1;
						}
					}
				}
			} catch (descErr) {
				rec.descriptorError = String(descErr);
			}
			if (hasDesc && desc) {
				rec.descriptor = {
					enumerable: desc.enumerable === true,
					configurable: desc.configurable === true
				};
				if (desc.get !== undefined || desc.set !== undefined) {
					rec.descriptor.kind = "accessor";
					rec.descriptor.hasGet = typeof desc.get === "function";
					rec.descriptor.hasSet = typeof desc.set === "function";
				} else {
					rec.descriptor.kind = "data";
					rec.descriptor.writable = desc.writable === true;
					rec.descriptor.valueType = typeof desc.value;
					rec.descriptor.valueIsFunction = typeof desc.value === "function";
				}
			}
			out[name] = rec;
		}
		return out;
	},

	inspectRaw: function (param, getValueResult) {
		var raw = {};
		var names;
		var i;
		var name;
		var field;
		if (getValueResult) {
			raw.getValue = getValueResult;
		}
		names = [
			"displayName", "matchName", "name", "internalName", "propertyName",
			"keyName", "key", "id", "identifier",
			"dataType", "valueType", "propertyValueType", "type", "keyType",
			"min", "max", "minValue", "maxValue", "minimum", "maximum",
			"units", "unit", "unitsText", "unitText", "unitsString", "displayUnits",
			"items", "valueNames", "options", "enumItems", "listItems", "values",
			"numItems", "numberOfItems", "itemCount", "numOptions", "length",
			"hidden", "isHidden", "hiddenInUI", "isHiddenInUI", "elided", "isElided",
			"visible", "isVisible", "showInUI", "includeInUI",
			"internal", "isInternal", "system", "isSystem",
			"control", "isControl", "group", "isGroup",
			"separator", "isSeparator", "folder", "isFolder",
			"container", "isContainer",
			"userFacing", "isUserFacing", "userParam", "isUserParam",
			"enabled", "isEnabled", "active", "isActive",
			"propertyFlags", "flags", "attributes", "access", "uiFlags"
		];
		for (i = 0; i < names.length; i++) {
			name = names[i];
			field = $._pickfxParameterResolver.inspectRawField(param, name);
			if (field) {
				raw[name] = field;
			}
		}
		return raw;
	},

	inspectIdentity: function (param) {
		var names = [
			"displayName", "matchName", "name", "internalName",
			"propertyName", "keyName", "key", "id", "identifier"
		];
		var identity = {};
		var i;
		var name;
		var field;
		var hasAny = false;
		for (i = 0; i < names.length; i++) {
			name = names[i];
			field = $._pickfxParameterResolver.inspectRawField(param, name);
			if (field) {
				identity[name] = field;
				hasAny = true;
			}
		}
		return hasAny ? identity : undefined;
	},

	inspectComponentParam: function (param, index) {
		var described;
		var getValueResult;
		var value;
		var report;
		var metadata;
		var identity;
		var dump;
		described = $._pickfxParameterResolver.describeParameter(param, index);
		try {
			value = param.getValue();
			getValueResult = $._pickfxParameterResolver.inspectSafeValue(value);
		} catch (getErr) {
			getValueResult = { threw: true, error: String(getErr) };
		}
		report = {
			displayName: described.displayName,
			index: described.index,
			type: described.type,
			writable: described.writable,
			value: described.value,
			raw: $._pickfxParameterResolver.inspectRaw(param, getValueResult),
			domCapabilities: $._pickfxParameterResolver.inspectDomCapabilities(param)
		};
		metadata = {};
		if (described.min !== undefined) {
			metadata.min = described.min;
		}
		if (described.max !== undefined) {
			metadata.max = described.max;
		}
		if (described.unit) {
			metadata.unit = described.unit;
		}
		if (described.dimensions !== undefined) {
			metadata.dimensions = described.dimensions;
		}
		if (described.options && described.options.length) {
			metadata.options = described.options;
		}
		if (metadata.min !== undefined || metadata.max !== undefined || metadata.unit ||
				metadata.dimensions !== undefined || (metadata.options && metadata.options.length)) {
			report.metadata = metadata;
		}
		identity = $._pickfxParameterResolver.inspectIdentity(param);
		if (identity) {
			report.identity = identity;
		} else if (!described.displayName) {
			report.identity = {};
		}
		try {
			dump = $._pickfxParameterResolver.inspectHostObject(
				param,
				$._pickfxParameterResolver.inspectParamCandidates()
			);
			report.objectKeys = dump.objectKeys;
			report.forInKeys = dump.forInKeys;
			report.ownPropertyNames = dump.ownPropertyNames;
			report.prototypeChain = dump.prototypeChain;
			report.candidateMetadata = dump.candidateMetadata;
			report.reflection = dump.reflection;
		} catch (dumpErr) {
			report.objectKeys = [];
			report.forInKeys = [];
			report.prototypeChain = [];
			report.candidateMetadata = { error: String(dumpErr) };
		}
		report.accessorDescriptors = $._pickfxParameterResolver.inspectAccessorDescriptors(param);
		return report;
	},

	inspectParameter: function (trackItem, effectName, parameterName) {
		var wantedParam = String(parameterName || "");
		var listed;
		var wantedEffect = String(effectName || "");
		var components;
		var countInfo;
		var indexBase;
		var i;
		var component;
		var displayName;
		var matchName;
		var matchedComponent;
		var props;
		var propertyCount;
		var propertyBase;
		var param;
		var paramName;
		var described;
		var report;
		var found;
		var displayNameMatchCount;

		listed = $._pickfxParameterResolver.listParameters(trackItem, wantedEffect);
		if (!listed || !listed.ok) {
			return listed;
		}

		try {
			components = trackItem.components;
		} catch (compErr) {
			return $._pickfxParameterResolver.fail("EFFECT_NOT_FOUND", String(compErr));
		}
		countInfo = $._pickfxParameterResolver.collectionCount(components);
		indexBase = $._pickfxParameterResolver.collectionIndexBase(components, countInfo.count);
		matchedComponent = null;
		for (i = 0; i < countInfo.count; i++) {
			component = $._pickfxParameterResolver.collectionItem(components, i, indexBase);
			displayName = $._pickfxParameterResolver.readString(component, "displayName");
			matchName = $._pickfxParameterResolver.readString(component, "matchName");
			if (displayName === wantedEffect || matchName === wantedEffect) {
				matchedComponent = component;
				break;
			}
		}
		if (!matchedComponent) {
			return $._pickfxParameterResolver.fail(
				"EFFECT_NOT_FOUND",
				'No component with displayName or matchName "' + wantedEffect + '".'
			);
		}

		found = null;
		displayNameMatchCount = 0;
		try {
			props = matchedComponent.properties;
		} catch (propsErr) {
			return $._pickfxParameterResolver.fail("PARAMETER_NOT_FOUND", String(propsErr));
		}
		propertyCount = $._pickfxParameterResolver.collectionCount(props);
		propertyBase = $._pickfxParameterResolver.collectionIndexBase(props, propertyCount.count);
		for (i = 0; i < propertyCount.count; i++) {
			param = $._pickfxParameterResolver.collectionItem(props, i, propertyBase);
			paramName = $._pickfxParameterResolver.readString(param, "displayName");
			if (paramName === wantedParam) {
				displayNameMatchCount += 1;
				if (!found) {
					found = { param: param, index: i };
				}
			}
		}
		if (!found) {
			return $._pickfxParameterResolver.fail(
				"PARAMETER_NOT_FOUND",
				'No property with displayName "' + wantedParam + '".'
			);
		}

		described = $._pickfxParameterResolver.inspectComponentParam(found.param, found.index);
		report = {
			ok: true,
			effect: listed.effect.displayName || wantedEffect,
			parameter: wantedParam,
			displayName: described.displayName,
			index: described.index,
			type: described.type,
			writable: described.writable,
			value: described.value,
			raw: described.raw,
			domCapabilities: described.domCapabilities,
			displayNameMatchCount: displayNameMatchCount,
			matchedByDisplayName: true
		};
		if (described.metadata) {
			report.metadata = described.metadata;
		}
		if (described.identity) {
			report.identity = described.identity;
		}
		if (described.objectKeys) {
			report.objectKeys = described.objectKeys;
		}
		if (described.forInKeys) {
			report.forInKeys = described.forInKeys;
		}
		if (described.ownPropertyNames) {
			report.ownPropertyNames = described.ownPropertyNames;
		}
		if (described.prototypeChain) {
			report.prototypeChain = described.prototypeChain;
		}
		if (described.candidateMetadata) {
			report.candidateMetadata = described.candidateMetadata;
		}
		if (described.reflection) {
			report.reflection = described.reflection;
		}
		if (described.accessorDescriptors) {
			report.accessorDescriptors = described.accessorDescriptors;
		}
		return report;
	},

	inspectBooleanCandidate: function (trackItem, effectName, parameterName) {
		var wantedParam = String(parameterName || "").replace(/^\s+|\s+$/g, "");
		var inspected;
		var facing;
		var classified;

		if (!wantedParam) {
			inspected = $._pickfxParameterResolver.fail(
				"PARAMETER_NOT_FOUND",
				"Parameter displayName is required."
			);
			inspected.settersCalled = false;
			inspected.setColorValueCalled = false;
			inspected.usedQE = false;
			return inspected;
		}

		inspected = $._pickfxParameterResolver.inspectParameter(trackItem, effectName, wantedParam);
		if (!inspected) {
			return {
				ok: false,
				reason: "PARAMETER_NOT_FOUND",
				detail: "inspectParameter returned empty.",
				settersCalled: false,
				setColorValueCalled: false,
				usedQE: false
			};
		}
		if (!inspected.ok) {
			inspected.settersCalled = false;
			inspected.setColorValueCalled = false;
			inspected.usedQE = false;
			return inspected;
		}

		if (typeof $._pickfxTypedCandidateClassifier !== "undefined" &&
				$._pickfxTypedCandidateClassifier.classifyUserFacing) {
			facing = $._pickfxTypedCandidateClassifier.classifyUserFacing(inspected);
			if (facing && facing.visibilityEvidence) {
				inspected.visibilityEvidence = facing.visibilityEvidence;
			}
		}

		if (typeof $._pickfxBooleanCandidateInspect !== "undefined") {
			if ($._pickfxBooleanCandidateInspect.inspect) {
				classified = $._pickfxBooleanCandidateInspect.inspect(inspected);
				if (classified) {
					if (classified.exposedFields) {
						inspected.exposedFields = classified.exposedFields;
					}
					if (classified.conclusions) {
						inspected.conclusions = classified.conclusions;
					}
				}
			} else if ($._pickfxBooleanCandidateInspect.conclude) {
				inspected.conclusions = $._pickfxBooleanCandidateInspect.conclude(inspected);
			}
		}

		inspected.settersCalled = false;
		inspected.setColorValueCalled = false;
		inspected.usedQE = false;
		return inspected;
	},

	inspectEffectParameters: function (trackItem, effectName) {
		var wantedEffect = String(effectName || "");
		var listed;
		var components;
		var countInfo;
		var indexBase;
		var i;
		var component;
		var displayName;
		var matchName;
		var matchedComponent;
		var props;
		var propertyCount;
		var propertyBase;
		var param;
		var rows;
		var componentHost;
		var propertiesInfo;

		listed = $._pickfxParameterResolver.listParameters(trackItem, wantedEffect);
		if (!listed || !listed.ok) {
			return listed;
		}

		try {
			components = trackItem.components;
		} catch (compErr) {
			return $._pickfxParameterResolver.fail("EFFECT_NOT_FOUND", String(compErr));
		}
		countInfo = $._pickfxParameterResolver.collectionCount(components);
		indexBase = $._pickfxParameterResolver.collectionIndexBase(components, countInfo.count);
		matchedComponent = null;
		for (i = 0; i < countInfo.count; i++) {
			component = $._pickfxParameterResolver.collectionItem(components, i, indexBase);
			displayName = $._pickfxParameterResolver.readString(component, "displayName");
			matchName = $._pickfxParameterResolver.readString(component, "matchName");
			if (displayName === wantedEffect || matchName === wantedEffect) {
				matchedComponent = component;
				break;
			}
		}
		if (!matchedComponent) {
			return $._pickfxParameterResolver.fail(
				"EFFECT_NOT_FOUND",
				'No component with displayName or matchName "' + wantedEffect + '".'
			);
		}

		try {
			props = matchedComponent.properties;
		} catch (propsErr) {
			return $._pickfxParameterResolver.fail("PARAMETER_NOT_FOUND", String(propsErr));
		}
		propertyCount = $._pickfxParameterResolver.collectionCount(props);
		propertyBase = $._pickfxParameterResolver.collectionIndexBase(props, propertyCount.count);
		rows = [];
		for (i = 0; i < propertyCount.count; i++) {
			try {
				param = $._pickfxParameterResolver.collectionItem(props, i, propertyBase);
				rows.push($._pickfxParameterResolver.inspectComponentParam(param, i));
			} catch (ignoreProperty) {}
		}

		try {
			componentHost = $._pickfxParameterResolver.inspectHostObject(
				matchedComponent,
				$._pickfxParameterResolver.inspectComponentCandidates()
			);
			propertiesInfo = {
				typeofValue: typeof props
			};
			try {
				propertiesInfo.count = propertyCount.count;
			} catch (ignoreCount) {}
			componentHost.propertiesCollection = propertiesInfo;
		} catch (componentDumpErr) {
			componentHost = { error: String(componentDumpErr) };
		}

		return {
			ok: true,
			effect: listed.effect.displayName || wantedEffect,
			componentHost: componentHost,
			parameters: rows
		};
	},

	fail: function (reason, detail) {
		$._pickfxParameterResolver.log("FAIL reason=" + reason + " detail=" + detail);
		return {
			ok: false,
			reason: reason,
			detail: String(detail),
			log: $._pickfxParameterResolver.lines.slice(0)
		};
	},

	resolve: function (trackItem, effectName, parameterName) {
		var wantedEffect = String(effectName || "");
		var wantedParam = String(parameterName || "").replace(/^\s+|\s+$/g, "");
		var mediaType;
		var components;
		var countInfo;
		var indexBase;
		var i;
		var component;
		var displayName;
		var matchName;
		var displayMatch;
		var matchNameMatch;
		var matchedComponent;
		var matchedComponentIndex;
		var props;
		var propertyCount;
		var propertyBase;
		var param;
		var paramName;
		var matchedParam;
		var matchedParamIndex;
		var value;

		$._pickfxParameterResolver.resetLog();
		$._pickfxParameterResolver.log("effect search name=" + wantedEffect);
		$._pickfxParameterResolver.log("parameter search name=" + wantedParam);

		if (!wantedParam) {
			return $._pickfxParameterResolver.fail(
				"PARAMETER_NOT_FOUND",
				"Parameter displayName is required."
			);
		}

		if (!trackItem) {
			return $._pickfxParameterResolver.fail(
				"NO_VIDEO_SELECTION",
				"No TrackItem was provided."
			);
		}

		$._pickfxParameterResolver.log("selected clip name=" + $._pickfxParameterResolver.readString(trackItem, "name"));
		mediaType = $._pickfxParameterResolver.readString(trackItem, "mediaType");
		$._pickfxParameterResolver.log("selected clip mediaType=" + mediaType);

		if (mediaType !== "Video") {
			return $._pickfxParameterResolver.fail(
				"NO_VIDEO_SELECTION",
				"TrackItem.mediaType is " + String(mediaType) + ", expected Video."
			);
		}

		try {
			components = trackItem.components;
		} catch (compErr) {
			return $._pickfxParameterResolver.fail(
				"EFFECT_NOT_FOUND",
				"TrackItem.components threw: " + String(compErr)
			);
		}

		if (components === undefined || components === null) {
			return $._pickfxParameterResolver.fail(
				"EFFECT_NOT_FOUND",
				"TrackItem.components is " + String(components) + "."
			);
		}

		countInfo = $._pickfxParameterResolver.collectionCount(components);
		if (countInfo.count < 0) {
			return $._pickfxParameterResolver.fail(
				"EFFECT_NOT_FOUND",
				"Could not read components.numItems or components.length."
			);
		}

		indexBase = $._pickfxParameterResolver.collectionIndexBase(components, countInfo.count);
		$._pickfxParameterResolver.log("componentCount=" + countInfo.count + " via=" + countInfo.via);

		displayMatch = null;
		matchNameMatch = null;

		for (i = 0; i < countInfo.count; i++) {
			component = $._pickfxParameterResolver.collectionItem(components, i, indexBase);
			displayName = $._pickfxParameterResolver.readString(component, "displayName");
			matchName = $._pickfxParameterResolver.readString(component, "matchName");
			$._pickfxParameterResolver.log("component[" + i + "] displayName=" + displayName + " matchName=" + matchName);

			if (!displayMatch && displayName === wantedEffect) {
				displayMatch = { component: component, index: i, displayName: displayName, matchName: matchName };
			}
			if (!matchNameMatch && matchName === wantedEffect) {
				matchNameMatch = { component: component, index: i, displayName: displayName, matchName: matchName };
			}
		}

		if (displayMatch) {
			matchedComponent = displayMatch.component;
			matchedComponentIndex = displayMatch.index;
			displayName = displayMatch.displayName;
			matchName = displayMatch.matchName;
		} else if (matchNameMatch) {
			matchedComponent = matchNameMatch.component;
			matchedComponentIndex = matchNameMatch.index;
			displayName = matchNameMatch.displayName;
			matchName = matchNameMatch.matchName;
		} else {
			return $._pickfxParameterResolver.fail(
				"EFFECT_NOT_FOUND",
				'No component with displayName or matchName "' + wantedEffect + '".'
			);
		}

		$._pickfxParameterResolver.log("matched effect displayName=" + displayName);
		$._pickfxParameterResolver.log("matched effect matchName=" + matchName);
		$._pickfxParameterResolver.log("component index=" + matchedComponentIndex);

		try {
			props = matchedComponent.properties;
		} catch (propsErr) {
			return $._pickfxParameterResolver.fail(
				"PARAMETER_NOT_FOUND",
				"Component.properties threw: " + String(propsErr)
			);
		}

		if (props === undefined || props === null) {
			return $._pickfxParameterResolver.fail(
				"PARAMETER_NOT_FOUND",
				"Component.properties is " + String(props) + "."
			);
		}

		propertyCount = $._pickfxParameterResolver.collectionCount(props);
		if (propertyCount.count < 0) {
			return $._pickfxParameterResolver.fail(
				"PARAMETER_NOT_FOUND",
				"Could not read properties.numItems or properties.length."
			);
		}

		propertyBase = $._pickfxParameterResolver.collectionIndexBase(props, propertyCount.count);
		$._pickfxParameterResolver.log("property count=" + propertyCount.count + " via=" + propertyCount.via);

		matchedParam = null;
		matchedParamIndex = -1;

		for (i = 0; i < propertyCount.count; i++) {
			param = $._pickfxParameterResolver.collectionItem(props, i, propertyBase);
			paramName = $._pickfxParameterResolver.readString(param, "displayName");
			$._pickfxParameterResolver.log("property[" + i + "] displayName=" + paramName);
			if (!matchedParam && paramName && paramName === wantedParam) {
				matchedParam = param;
				matchedParamIndex = i;
			}
		}

		if (!matchedParam) {
			return $._pickfxParameterResolver.fail(
				"PARAMETER_NOT_FOUND",
				'No property with displayName "' + wantedParam + '".'
			);
		}

		$._pickfxParameterResolver.log("matched parameter displayName=" + wantedParam);
		$._pickfxParameterResolver.log("property index=" + matchedParamIndex);

		try {
			value = matchedParam.getValue();
		} catch (getErr) {
			return $._pickfxParameterResolver.fail(
				"PARAMETER_NOT_FOUND",
				"Matched parameter getValue() threw: " + String(getErr)
			);
		}

		$._pickfxParameterResolver.log("old value=" + value + " typeof=" + (typeof value));

		return {
			ok: true,
			effect: {
				displayName: displayName,
				matchName: matchName,
				index: matchedComponentIndex
			},
			parameter: {
				displayName: $._pickfxParameterResolver.readString(matchedParam, "displayName"),
				index: matchedParamIndex,
				value: value,
				type: $._pickfxParameterResolver.inferType(matchedParam, value)
			},
			log: $._pickfxParameterResolver.lines.slice(0),
			_component: matchedComponent,
			_param: matchedParam
		};
	},

	listParameters: function (trackItem, effectName) {
		var wantedEffect = String(effectName || "");
		var mediaType;
		var components;
		var countInfo;
		var indexBase;
		var i;
		var component;
		var displayName;
		var matchName;
		var displayMatch;
		var matchNameMatch;
		var matchedComponent;
		var matchedComponentIndex;
		var props;
		var propertyCount;
		var propertyBase;
		var param;
		var parameters;

		$._pickfxParameterResolver.resetLog();
		$._pickfxParameterResolver.log("listParameters effect search name=" + wantedEffect);

		if (!trackItem) {
			return $._pickfxParameterResolver.fail(
				"NO_VIDEO_SELECTION",
				"No TrackItem was provided."
			);
		}

		$._pickfxParameterResolver.log("selected clip name=" + $._pickfxParameterResolver.readString(trackItem, "name"));
		mediaType = $._pickfxParameterResolver.readString(trackItem, "mediaType");
		$._pickfxParameterResolver.log("selected clip mediaType=" + mediaType);

		if (mediaType !== "Video") {
			return $._pickfxParameterResolver.fail(
				"NO_VIDEO_SELECTION",
				"TrackItem.mediaType is " + String(mediaType) + ", expected Video."
			);
		}

		try {
			components = trackItem.components;
		} catch (compErr) {
			return $._pickfxParameterResolver.fail(
				"EFFECT_NOT_FOUND",
				"TrackItem.components threw: " + String(compErr)
			);
		}

		if (components === undefined || components === null) {
			return $._pickfxParameterResolver.fail(
				"EFFECT_NOT_FOUND",
				"TrackItem.components is " + String(components) + "."
			);
		}

		countInfo = $._pickfxParameterResolver.collectionCount(components);
		if (countInfo.count < 0) {
			return $._pickfxParameterResolver.fail(
				"EFFECT_NOT_FOUND",
				"Could not read components.numItems or components.length."
			);
		}

		indexBase = $._pickfxParameterResolver.collectionIndexBase(components, countInfo.count);
		displayMatch = null;
		matchNameMatch = null;

		for (i = 0; i < countInfo.count; i++) {
			component = $._pickfxParameterResolver.collectionItem(components, i, indexBase);
			displayName = $._pickfxParameterResolver.readString(component, "displayName");
			matchName = $._pickfxParameterResolver.readString(component, "matchName");
			if (!displayMatch && displayName === wantedEffect) {
				displayMatch = { component: component, index: i, displayName: displayName, matchName: matchName };
			}
			if (!matchNameMatch && matchName === wantedEffect) {
				matchNameMatch = { component: component, index: i, displayName: displayName, matchName: matchName };
			}
		}

		if (displayMatch) {
			matchedComponent = displayMatch.component;
			matchedComponentIndex = displayMatch.index;
			displayName = displayMatch.displayName;
			matchName = displayMatch.matchName;
		} else if (matchNameMatch) {
			matchedComponent = matchNameMatch.component;
			matchedComponentIndex = matchNameMatch.index;
			displayName = matchNameMatch.displayName;
			matchName = matchNameMatch.matchName;
		} else {
			return $._pickfxParameterResolver.fail(
				"EFFECT_NOT_FOUND",
				'No component with displayName or matchName "' + wantedEffect + '".'
			);
		}

		try {
			props = matchedComponent.properties;
		} catch (propsErr) {
			return $._pickfxParameterResolver.fail(
				"PARAMETER_NOT_FOUND",
				"Component.properties threw: " + String(propsErr)
			);
		}

		if (props === undefined || props === null) {
			return {
				ok: true,
				effect: {
					displayName: displayName,
					matchName: matchName,
					index: matchedComponentIndex
				},
				parameters: [],
				log: $._pickfxParameterResolver.lines.slice(0)
			};
		}

		propertyCount = $._pickfxParameterResolver.collectionCount(props);
		if (propertyCount.count < 0) {
			return {
				ok: true,
				effect: {
					displayName: displayName,
					matchName: matchName,
					index: matchedComponentIndex
				},
				parameters: [],
				log: $._pickfxParameterResolver.lines.slice(0)
			};
		}

		propertyBase = $._pickfxParameterResolver.collectionIndexBase(props, propertyCount.count);
		parameters = [];

		for (i = 0; i < propertyCount.count; i++) {
			try {
				param = $._pickfxParameterResolver.collectionItem(props, i, propertyBase);
				parameters.push($._pickfxParameterResolver.describeParameter(param, i));
			} catch (ignoreProperty) {}
		}

		return {
			ok: true,
			effect: {
				displayName: displayName,
				matchName: matchName,
				index: matchedComponentIndex
			},
			parameters: parameters,
			log: $._pickfxParameterResolver.lines.slice(0)
		};
	},

	scanTypedCandidates: function (trackItem) {
		var mediaType;
		var components;
		var countInfo;
		var indexBase;
		var i;
		var component;
		var effectName;
		var props;
		var propertyCount;
		var propertyBase;
		var p;
		var param;
		var inspected;
		var snapshot;
		var entries;
		var classifier;

		if (typeof $._pickfxTypedCandidateClassifier !== "undefined") {
			classifier = $._pickfxTypedCandidateClassifier;
		} else if (typeof TypedCandidateClassifier !== "undefined") {
			classifier = TypedCandidateClassifier;
		} else {
			return {
				ok: false,
				reason: "WRITE_FAILED",
				detail: "TypedCandidateClassifier is not loaded.",
				booleanCandidates: [],
				enumCandidates: [],
				rejected: [],
				settersCalled: false,
				usedQE: false
			};
		}

		if (!trackItem) {
			return {
				ok: false,
				reason: "NO_VIDEO_SELECTION",
				detail: "No TrackItem was provided.",
				booleanCandidates: [],
				enumCandidates: [],
				rejected: [],
				settersCalled: false,
				usedQE: false
			};
		}

		mediaType = $._pickfxParameterResolver.readString(trackItem, "mediaType");
		if (mediaType !== "Video") {
			return {
				ok: false,
				reason: "NO_VIDEO_SELECTION",
				detail: "TrackItem.mediaType is " + String(mediaType) + ", expected Video.",
				booleanCandidates: [],
				enumCandidates: [],
				rejected: [],
				settersCalled: false,
				usedQE: false
			};
		}

		try {
			components = trackItem.components;
		} catch (compErr) {
			return {
				ok: false,
				reason: "EFFECT_NOT_FOUND",
				detail: String(compErr),
				booleanCandidates: [],
				enumCandidates: [],
				rejected: [],
				settersCalled: false,
				usedQE: false
			};
		}

		countInfo = $._pickfxParameterResolver.collectionCount(components);
		if (countInfo.count < 0) {
			return {
				ok: false,
				reason: "EFFECT_NOT_FOUND",
				detail: "Could not read components.",
				booleanCandidates: [],
				enumCandidates: [],
				rejected: [],
				settersCalled: false,
				usedQE: false
			};
		}

		indexBase = $._pickfxParameterResolver.collectionIndexBase(components, countInfo.count);
		entries = [];
		for (i = 0; i < countInfo.count; i++) {
			component = $._pickfxParameterResolver.collectionItem(components, i, indexBase);
			effectName = $._pickfxParameterResolver.readString(component, "displayName") ||
				$._pickfxParameterResolver.readString(component, "matchName") ||
				"";
			try {
				props = component.properties;
			} catch (ignoreProps) {
				continue;
			}
			propertyCount = $._pickfxParameterResolver.collectionCount(props);
			if (propertyCount.count < 0) {
				continue;
			}
			propertyBase = $._pickfxParameterResolver.collectionIndexBase(props, propertyCount.count);
			for (p = 0; p < propertyCount.count; p++) {
				try {
					param = $._pickfxParameterResolver.collectionItem(props, p, propertyBase);
					inspected = $._pickfxParameterResolver.inspectComponentParam(param, p);
					snapshot = {
						displayName: inspected.displayName,
						index: inspected.index,
						type: inspected.type,
						value: inspected.value,
						writable: inspected.writable,
						identity: inspected.identity,
						raw: inspected.raw,
						domCapabilities: inspected.domCapabilities,
						metadata: inspected.metadata,
						objectKeys: inspected.objectKeys,
						forInKeys: inspected.forInKeys,
						ownPropertyNames: inspected.ownPropertyNames,
						prototypeChain: inspected.prototypeChain,
						candidateMetadata: inspected.candidateMetadata,
						reflection: inspected.reflection,
						options: $._pickfxParameterResolver.inspectRealEnumOptions(param),
						typeHint: $._pickfxParameterResolver.readTypeHint(param)
					};
					entries.push({
						effect: effectName,
						param: snapshot
					});
				} catch (ignoreParam) {}
			}
		}

		return classifier.report(entries);
	},

	findMotionComponent: function (trackItem) {
		var mediaType;
		var components;
		var countInfo;
		var indexBase;
		var i;
		var component;
		var displayName;
		var matchName;
		var preferred;
		var named;

		if (!trackItem) {
			return $._pickfxParameterResolver.fail(
				"NO_VIDEO_SELECTION",
				"No TrackItem was provided."
			);
		}
		mediaType = $._pickfxParameterResolver.readString(trackItem, "mediaType");
		if (mediaType !== "Video") {
			return $._pickfxParameterResolver.fail(
				"NO_VIDEO_SELECTION",
				"TrackItem.mediaType is " + String(mediaType) + ", expected Video."
			);
		}
		try {
			components = trackItem.components;
		} catch (compErr) {
			return $._pickfxParameterResolver.fail(
				"PARAMETER_NOT_FOUND",
				"TrackItem.components threw: " + String(compErr)
			);
		}
		countInfo = $._pickfxParameterResolver.collectionCount(components);
		if (countInfo.count < 0) {
			return $._pickfxParameterResolver.fail(
				"PARAMETER_NOT_FOUND",
				"Could not read components."
			);
		}
		indexBase = $._pickfxParameterResolver.collectionIndexBase(components, countInfo.count);
		preferred = null;
		named = null;
		for (i = 0; i < countInfo.count; i++) {
			component = $._pickfxParameterResolver.collectionItem(components, i, indexBase);
			displayName = $._pickfxParameterResolver.readString(component, "displayName") || "";
			matchName = $._pickfxParameterResolver.readString(component, "matchName") || "";
			if (displayName !== "Motion") {
				continue;
			}
			if (!named) {
				named = { component: component, displayName: displayName, matchName: matchName };
			}
			if (matchName === "AE.ADBE Motion") {
				preferred = { component: component, displayName: displayName, matchName: matchName };
				break;
			}
		}
		if (preferred) {
			return {
				ok: true,
				effect: {
					displayName: preferred.displayName,
					matchName: preferred.matchName
				},
				_component: preferred.component
			};
		}
		if (named) {
			return {
				ok: true,
				effect: {
					displayName: named.displayName,
					matchName: named.matchName
				},
				_component: named.component
			};
		}
		return $._pickfxParameterResolver.fail(
			"PARAMETER_NOT_FOUND",
			'No component with displayName "Motion".'
		);
	},

	resolveMotionParameter: function (trackItem, parameterName) {
		var wanted = String(parameterName || "").replace(/^\s+|\s+$/g, "");
		var motion;
		var component;
		var props;
		var propertyCount;
		var propertyBase;
		var i;
		var param;
		var paramName;
		var matched;

		if (!wanted) {
			return $._pickfxParameterResolver.fail(
				"PARAMETER_NOT_FOUND",
				"Parameter displayName is required."
			);
		}
		motion = $._pickfxParameterResolver.findMotionComponent(trackItem);
		if (!motion || !motion.ok) {
			return motion || $._pickfxParameterResolver.fail(
				"PARAMETER_NOT_FOUND",
				'No component with displayName "Motion".'
			);
		}
		component = motion._component;
		try {
			props = component.properties;
		} catch (propsErr) {
			return $._pickfxParameterResolver.fail(
				"PARAMETER_NOT_FOUND",
				"Component.properties threw: " + String(propsErr)
			);
		}
		propertyCount = $._pickfxParameterResolver.collectionCount(props);
		if (propertyCount.count < 0) {
			return $._pickfxParameterResolver.fail(
				"PARAMETER_NOT_FOUND",
				'No property with displayName "' + wanted + '".'
			);
		}
		propertyBase = $._pickfxParameterResolver.collectionIndexBase(props, propertyCount.count);
		matched = null;
		for (i = 0; i < propertyCount.count; i++) {
			param = $._pickfxParameterResolver.collectionItem(props, i, propertyBase);
			paramName = $._pickfxParameterResolver.readString(param, "displayName") || "";
			if (paramName === wanted) {
				matched = { param: param, paramName: paramName };
				break;
			}
		}
		if (!matched) {
			return $._pickfxParameterResolver.fail(
				"PARAMETER_NOT_FOUND",
				'No property with displayName "' + wanted + '".'
			);
		}
		return {
			ok: true,
			effect: motion.effect,
			parameter: {
				displayName: matched.paramName
			},
			_component: component,
			_param: matched.param
		};
	},

	resolveClipParameter: function (trackItem, parameterName) {
		var wanted = String(parameterName || "").replace(/^\s+|\s+$/g, "");
		var wantedNorm;
		var mediaType;
		var components;
		var countInfo;
		var indexBase;
		var i;
		var p;
		var component;
		var componentDisplay;
		var componentMatch;
		var props;
		var propertyCount;
		var propertyBase;
		var param;
		var paramName;
		var exact;
		var folded;
		var chosen;

		function norm(value) {
			return String(value || "").replace(/^\s+|\s+$/g, "").toLowerCase();
		}

		if (!wanted) {
			return $._pickfxParameterResolver.fail(
				"PARAMETER_NOT_FOUND",
				"Parameter displayName is required."
			);
		}
		if (!trackItem) {
			return $._pickfxParameterResolver.fail(
				"NO_VIDEO_SELECTION",
				"No TrackItem was provided."
			);
		}
		mediaType = $._pickfxParameterResolver.readString(trackItem, "mediaType");
		if (mediaType !== "Video") {
			return $._pickfxParameterResolver.fail(
				"NO_VIDEO_SELECTION",
				"TrackItem.mediaType is " + String(mediaType) + ", expected Video."
			);
		}
		try {
			components = trackItem.components;
		} catch (compErr) {
			return $._pickfxParameterResolver.fail(
				"EFFECT_NOT_FOUND",
				"TrackItem.components threw: " + String(compErr)
			);
		}
		countInfo = $._pickfxParameterResolver.collectionCount(components);
		if (countInfo.count < 0) {
			return $._pickfxParameterResolver.fail(
				"EFFECT_NOT_FOUND",
				"Could not read components."
			);
		}
		indexBase = $._pickfxParameterResolver.collectionIndexBase(components, countInfo.count);
		wantedNorm = norm(wanted);
		exact = [];
		folded = [];
		for (i = 0; i < countInfo.count; i++) {
			component = $._pickfxParameterResolver.collectionItem(components, i, indexBase);
			componentDisplay = $._pickfxParameterResolver.readString(component, "displayName") || "";
			componentMatch = $._pickfxParameterResolver.readString(component, "matchName") || "";
			try {
				props = component.properties;
			} catch (ignoreProps) {
				continue;
			}
			propertyCount = $._pickfxParameterResolver.collectionCount(props);
			if (propertyCount.count < 0) {
				continue;
			}
			propertyBase = $._pickfxParameterResolver.collectionIndexBase(props, propertyCount.count);
			for (p = 0; p < propertyCount.count; p++) {
				param = $._pickfxParameterResolver.collectionItem(props, p, propertyBase);
				paramName = $._pickfxParameterResolver.readString(param, "displayName") || "";
				if (!paramName) {
					continue;
				}
				if (paramName === wanted) {
					exact.push({
						param: param,
						paramName: paramName,
						component: component,
						componentDisplay: componentDisplay,
						componentMatch: componentMatch
					});
				} else if (norm(paramName) === wantedNorm) {
					folded.push({
						param: param,
						paramName: paramName,
						component: component,
						componentDisplay: componentDisplay,
						componentMatch: componentMatch
					});
				}
			}
		}
		if (exact.length > 1) {
			return $._pickfxParameterResolver.fail(
				"PARAMETER_NOT_FOUND",
				'Parameter displayName "' + wanted + '" is ambiguous across ' + exact.length + " components."
			);
		}
		chosen = exact.length === 1 ? exact[0] : null;
		if (!chosen && folded.length === 1) {
			chosen = folded[0];
		} else if (!chosen && folded.length > 1) {
			return $._pickfxParameterResolver.fail(
				"PARAMETER_NOT_FOUND",
				'Parameter displayName "' + wanted + '" is ambiguous across ' + folded.length + " components."
			);
		}
		if (!chosen) {
			return $._pickfxParameterResolver.fail(
				"PARAMETER_NOT_FOUND",
				'No property with displayName "' + wanted + '".'
			);
		}
		return {
			ok: true,
			effect: {
				displayName: chosen.componentDisplay,
				matchName: chosen.componentMatch
			},
			parameter: {
				displayName: chosen.paramName
			},
			_component: chosen.component,
			_param: chosen.param
		};
	},

	resolveParameter: function (trackItem, effectName, parameterName) {
		return $._pickfxParameterResolver.resolve(trackItem, effectName, parameterName);
	}
};
