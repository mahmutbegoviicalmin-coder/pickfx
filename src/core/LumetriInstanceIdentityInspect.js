var LumetriInstanceIdentityInspect = (function () {
	var OPERATION = "lumetri.instance.identity.inspect";
	var LUMETRI_DISPLAY = "Lumetri Color";
	var LUMETRI_MATCH = "AE.ADBE Lumetri";
	var UNAVAILABLE = "unavailable";
	var MAX_DEPTH = 8;
	var MAX_CHILDREN = 160;
	var MAX_ENUM_KEYS = 80;
	var MAX_REFLECT = 120;
	var NESTED_COLLECTION_NAMES = ["properties", "children"];
	var FALLBACK_COLLECTION_NAMES = ["parameters"];
	var CORE_PARAM_NAMES = [
		"Temperature", "Tint", "Exposure", "Contrast",
		"Highlights", "Shadows", "Whites", "Blacks", "Saturation"
	];
	var FORBIDDEN_CALL_NAMES = [
		"setValue", "setValueAtKey", "addKey", "setColorValue",
		"setTimeVarying", "setInterpolationTypeAtKey", "removeKey",
		"removeKeyRange", "setSelected", "enableQE"
	];
	var COMPONENT_IDENTITY_FIELDS = [
		"displayName", "matchName", "name", "instanceName",
		"instanceID", "instanceId", "id", "guid", "uuid", "UUID",
		"nodeId", "nodeID", "objectID", "objectId", "identifier",
		"uniqueId", "uniqueID", "effectId", "effectID",
		"componentId", "componentID", "index", "type", "mediaType",
		"enabled", "disabled", "selected", "focused", "active",
		"parent", "group", "hierarchyPath", "properties", "children",
		"numProperties", "length", "numItems"
	];
	var COMPONENT_READ_CALLS = [
		"getDisplayName", "getMatchName", "getParamCount",
		"isSelected", "getId", "toString", "valueOf"
	];
	var PARAM_IDENTITY_FIELDS = [
		"displayName", "matchName", "name", "instanceName",
		"id", "guid", "uuid", "identifier", "index", "propertyIndex",
		"type", "dataType", "propertyType", "propertyValueType",
		"parent", "group", "hierarchyPath", "propertyGroup"
	];
	var PARAM_READ_CALLS = [
		"getValue", "isTimeVarying", "areKeyframesSupported", "toString", "valueOf"
	];
	var EFFECT_CONTROLS_FIELD_NAMES = [
		"getFocusedComponent", "getSelectedComponent", "getSelectedEffect",
		"getActiveEffect", "getEffectControlsSelection", "selectedComponent",
		"focusedComponent", "activeComponent", "selectedEffect", "focusedEffect"
	];
	var EFFECT_CONTROLS_METHOD_NAMES = [
		"getFocusedComponent", "getSelectedComponent", "getSelectedEffect",
		"getActiveEffect", "getEffectControlsSelection"
	];

	function resolver() {
		if (typeof $._pickfxParameterResolver !== "undefined") {
			return $._pickfxParameterResolver;
		}
		return null;
	}

	function trimmed(value) {
		return String(value || "").replace(/^\s+|\s+$/g, "");
	}

	function typeOfFn(obj, name) {
		try {
			return typeof obj[name];
		} catch (e) {
			return "threw:" + String(e);
		}
	}

	function hasFn(obj, name) {
		return typeOfFn(obj, name) === "function";
	}

	function jsonSafe(value, depth) {
		var t;
		var i;
		var key;
		var out;
		if (depth === undefined) {
			depth = 0;
		}
		if (value === undefined) {
			return { jsonType: "undefined", value: UNAVAILABLE };
		}
		if (value === null) {
			return { jsonType: "null", value: null };
		}
		try {
			t = typeof value;
		} catch (typeErr) {
			return { jsonType: "error", error: String(typeErr) };
		}
		if (t === "string" || t === "boolean") {
			return { jsonType: t, value: value };
		}
		if (t === "number") {
			if (isNaN(value)) {
				return { jsonType: "number", note: "NaN" };
			}
			return { jsonType: "number", value: value };
		}
		if (t === "function") {
			return { jsonType: "function" };
		}
		if (t !== "object") {
			return { jsonType: t, stringValue: safeString(value) };
		}
		if (depth >= 2) {
			return {
				jsonType: "object",
				constructorName: constructorName(value),
				stringValue: safeString(value)
			};
		}
		out = {
			jsonType: "object",
			constructorName: constructorName(value),
			stringValue: safeString(value),
			fieldCount: 0
		};
		try {
			if (typeof value.length === "number" && value.length >= 0 && value.length < 32) {
				out.isArrayLike = true;
				out.length = value.length;
				out.items = [];
				for (i = 0; i < value.length; i++) {
					out.items.push(jsonSafe(value[i], depth + 1));
				}
			}
		} catch (ignoreArr) {}
		try {
			out.fields = {};
			for (key in value) {
				if (out.fieldCount >= 12) {
					break;
				}
				try {
					if (typeof value[key] === "function") {
						out.fields[String(key)] = { jsonType: "function" };
					} else {
						out.fields[String(key)] = jsonSafe(value[key], depth + 1);
					}
					out.fieldCount += 1;
				} catch (ignoreField) {}
			}
		} catch (ignoreEnum) {}
		return out;
	}

	function primitiveOrUnavailable(value) {
		if (value === undefined || value === null) {
			return UNAVAILABLE;
		}
		if (typeof value === "string" || typeof value === "boolean") {
			return value;
		}
		if (typeof value === "number") {
			if (isNaN(value)) {
				return UNAVAILABLE;
			}
			return value;
		}
		return jsonSafe(value, 0);
	}

	function safeString(value) {
		try {
			return String(value);
		} catch (e) {
			return "(throw) " + String(e);
		}
	}

	function constructorName(value) {
		try {
			if (value && value.constructor && value.constructor.name) {
				return String(value.constructor.name);
			}
		} catch (ignore) {}
		return UNAVAILABLE;
	}

	function fail(reason, detail, extra) {
		var payload = {
			ok: false,
			operation: OPERATION,
			reason: reason || "EFFECT_NOT_FOUND",
			detail: detail ? String(detail) : "",
			readOnly: true,
			usedQE: false,
			productionEnabled: false,
			settersCalled: false,
			writesPerformed: false,
			chosen: false,
			lumetriInstances: [],
			parameterComparison: [],
			saturationIdentities: [],
			effectControlsProbes: {},
			identityComparison: {},
			officialAdobeApi: officialAdobeApi()
		};
		var key;
		if (extra) {
			for (key in extra) {
				if (extra.hasOwnProperty(key)) {
					payload[key] = extra[key];
				}
			}
		}
		return payload;
	}

	function probeField(obj, name) {
		var value;
		var t;
		if (!obj) {
			return { name: name, exists: false, value: UNAVAILABLE };
		}
		try {
			value = obj[name];
		} catch (probeErr) {
			return { name: name, exists: "threw", error: String(probeErr), value: UNAVAILABLE };
		}
		if (value === undefined) {
			return { name: name, exists: false, value: UNAVAILABLE };
		}
		try {
			t = typeof value;
		} catch (typeErr) {
			return { name: name, exists: true, typeofValue: "threw", error: String(typeErr), value: UNAVAILABLE };
		}
		if (t === "function") {
			return { name: name, exists: true, typeofValue: "function", called: false, value: UNAVAILABLE };
		}
		return {
			name: name,
			exists: true,
			typeofValue: t,
			value: primitiveOrUnavailable(value)
		};
	}

	function probeFields(obj, names) {
		var out = {};
		var i;
		for (i = 0; i < names.length; i++) {
			out[names[i]] = probeField(obj, names[i]);
		}
		return out;
	}

	function callReadOnly(obj, name) {
		var t = typeOfFn(obj, name);
		var result;
		if (t !== "function") {
			return {
				name: name,
				exists: t !== "undefined" && t.indexOf("threw:") !== 0,
				typeofValue: t,
				called: false,
				value: UNAVAILABLE
			};
		}
		try {
			result = obj[name]();
			return {
				name: name,
				exists: true,
				typeofValue: "function",
				called: true,
				value: primitiveOrUnavailable(result)
			};
		} catch (e) {
			return {
				name: name,
				exists: true,
				typeofValue: "function",
				called: true,
				error: String(e),
				value: UNAVAILABLE
			};
		}
	}

	function enumerableKeys(obj) {
		var keys = [];
		var key;
		try {
			for (key in obj) {
				keys.push(String(key));
				if (keys.length >= MAX_ENUM_KEYS) {
					break;
				}
			}
		} catch (e) {
			return { available: false, error: String(e), keys: [] };
		}
		return { available: true, keys: keys, count: keys.length };
	}

	function objectKeysSafe(obj) {
		var keys;
		try {
			if (typeof Object.keys !== "function") {
				return { available: false, reason: "Object.keys unavailable", keys: [] };
			}
			keys = Object.keys(obj);
			return { available: true, keys: keys.slice(0, MAX_ENUM_KEYS), count: keys.length };
		} catch (e) {
			return { available: false, error: String(e), keys: [] };
		}
	}

	function ownPropertyNamesSafe(obj) {
		var names;
		try {
			if (typeof Object.getOwnPropertyNames !== "function") {
				return { available: false, reason: "Object.getOwnPropertyNames unavailable", names: [] };
			}
			names = Object.getOwnPropertyNames(obj);
			return { available: true, names: names.slice(0, MAX_ENUM_KEYS), count: names.length };
		} catch (e) {
			return { available: false, error: String(e), names: [] };
		}
	}

	function inspectReflect(obj) {
		var out = { available: false, properties: [], methods: [] };
		var i;
		var n;
		var item;
		try {
			if (!obj || !obj.reflect) {
				out.reason = "reflect unavailable";
				return out;
			}
			out.available = true;
			try {
				out.name = obj.reflect.name !== undefined ? String(obj.reflect.name) : UNAVAILABLE;
			} catch (nameErr) {
				out.name = UNAVAILABLE;
				out.nameError = String(nameErr);
			}
			try {
				n = obj.reflect.properties ? obj.reflect.properties.length : 0;
				for (i = 0; i < n && i < MAX_REFLECT; i++) {
					item = obj.reflect.properties[i];
					out.properties.push(item && item.name !== undefined ? String(item.name) : safeString(item));
				}
			} catch (propErr) {
				out.propertiesError = String(propErr);
			}
			try {
				n = obj.reflect.methods ? obj.reflect.methods.length : 0;
				for (i = 0; i < n && i < MAX_REFLECT; i++) {
					item = obj.reflect.methods[i];
					out.methods.push(item && item.name !== undefined ? String(item.name) : safeString(item));
				}
			} catch (methodErr) {
				out.methodsError = String(methodErr);
			}
		} catch (e) {
			out.error = String(e);
		}
		return out;
	}

	function inspectPrototype(obj) {
		var proto;
		var out = { available: false };
		try {
			if (typeof Object.getPrototypeOf !== "function") {
				out.reason = "Object.getPrototypeOf unavailable";
				return out;
			}
			proto = Object.getPrototypeOf(obj);
			if (!proto) {
				out.reason = "prototype is null";
				return out;
			}
			out.available = true;
			out.constructorName = constructorName(proto);
			out.stringValue = safeString(proto);
			out.objectKeys = objectKeysSafe(proto);
		} catch (e) {
			out.error = String(e);
		}
		return out;
	}

	function inspectRuntime(obj) {
		var dump;
		var out = {
			typeofObject: UNAVAILABLE,
			constructorName: constructorName(obj),
			toString: UNAVAILABLE,
			valueOf: UNAVAILABLE,
			stringRepresentation: UNAVAILABLE
		};
		try {
			out.typeofObject = typeof obj;
		} catch (typeErr) {
			out.typeofObject = "threw:" + String(typeErr);
		}
		try {
			out.stringRepresentation = String(obj);
		} catch (strErr) {
			out.stringRepresentation = UNAVAILABLE;
			out.stringRepresentationError = String(strErr);
		}
		if (hasFn(obj, "toString")) {
			out.toString = callReadOnly(obj, "toString");
		} else {
			out.toString = { exists: false, value: UNAVAILABLE };
		}
		if (hasFn(obj, "valueOf")) {
			out.valueOf = callReadOnly(obj, "valueOf");
		} else {
			out.valueOf = { exists: false, value: UNAVAILABLE };
		}
		if (typeof $._pickfxParameterResolver !== "undefined" &&
				typeof $._pickfxParameterResolver.inspectHostObject === "function") {
			try {
				dump = $._pickfxParameterResolver.inspectHostObject(obj, COMPONENT_IDENTITY_FIELDS);
				if (dump) {
					out.hostObjectDump = {
						objectKeys: dump.objectKeys || [],
						forInKeys: dump.forInKeys || [],
						ownPropertyNames: dump.ownPropertyNames || [],
						reflection: dump.reflection || null
					};
				}
			} catch (ignoreDump) {}
		}
		return out;
	}

	function callableMethods(obj, extraNames) {
		var names = {};
		var out = [];
		var keys;
		var i;
		var name;
		var t;
		function add(n) {
			if (n && !names.hasOwnProperty(n)) {
				names[n] = true;
			}
		}
		keys = enumerableKeys(obj);
		if (keys.available) {
			for (i = 0; i < keys.keys.length; i++) {
				add(keys.keys[i]);
			}
		}
		if (extraNames) {
			for (i = 0; i < extraNames.length; i++) {
				add(extraNames[i]);
			}
		}
		for (i = 0; i < FORBIDDEN_CALL_NAMES.length; i++) {
			add(FORBIDDEN_CALL_NAMES[i]);
		}
		for (name in names) {
			if (!names.hasOwnProperty(name)) {
				continue;
			}
			t = typeOfFn(obj, name);
			out.push({
				name: name,
				typeofValue: t,
				callable: t === "function",
				forbidden: indexOfName(FORBIDDEN_CALL_NAMES, name) !== -1,
				called: false
			});
		}
		return out;
	}

	function indexOfName(list, name) {
		var i;
		for (i = 0; i < list.length; i++) {
			if (list[i] === name) {
				return i;
			}
		}
		return -1;
	}

	function compareRefs(a, b) {
		var out = {
			strictEqual: UNAVAILABLE,
			looseEqual: UNAVAILABLE,
			toStringEqual: UNAVAILABLE
		};
		try {
			out.strictEqual = a === b;
		} catch (strictErr) {
			out.strictEqual = UNAVAILABLE;
			out.strictEqualError = String(strictErr);
		}
		try {
			out.looseEqual = a == b;
		} catch (looseErr) {
			out.looseEqual = UNAVAILABLE;
			out.looseEqualError = String(looseErr);
		}
		try {
			out.toStringA = safeString(a);
			out.toStringB = safeString(b);
			out.toStringEqual = out.toStringA === out.toStringB;
		} catch (strErr) {
			out.toStringEqual = UNAVAILABLE;
			out.toStringError = String(strErr);
		}
		return out;
	}

	function readCollection(res, obj, collectionName) {
		var col;
		var countInfo;
		var indexBase;
		try {
			col = obj[collectionName];
		} catch (e) {
			return { name: collectionName, available: false, error: String(e) };
		}
		if (col === undefined || col === null) {
			return { name: collectionName, available: false, value: UNAVAILABLE };
		}
		if (!res) {
			return {
				name: collectionName,
				available: true,
				count: col.length !== undefined ? col.length : -1,
				countVia: "length",
				indexBase: 0,
				collection: col
			};
		}
		countInfo = res.collectionCount(col);
		if (countInfo.count < 0) {
			return {
				name: collectionName,
				available: true,
				count: -1,
				countVia: countInfo.via,
				collection: col
			};
		}
		indexBase = res.collectionIndexBase(col, countInfo.count);
		return {
			name: collectionName,
			available: true,
			count: countInfo.count,
			countVia: countInfo.via,
			indexBase: indexBase,
			collection: col
		};
	}

	function collectionItem(res, collection, index, indexBase) {
		if (res && res.collectionItem) {
			return res.collectionItem(collection, index, indexBase);
		}
		try {
			return collection[index + (indexBase || 0)];
		} catch (e) {
			return undefined;
		}
	}

	function joinHierarchy(parentInfo, displayName) {
		var prefix = parentInfo && parentInfo.hierarchyPath ? String(parentInfo.hierarchyPath) : "";
		var name = trimmed(displayName);
		if (!name) {
			return prefix;
		}
		if (!prefix) {
			return name;
		}
		return prefix + " / " + name;
	}

	function parentLabel(parentInfo) {
		if (!parentInfo) {
			return "";
		}
		return parentInfo.parameterDisplayName || "";
	}

	function isLumetriComponent(displayName, matchName) {
		return displayName === LUMETRI_DISPLAY && matchName === LUMETRI_MATCH;
	}

	function inspectParamNode(res, componentIndex, param, parameterIndex, parentInfo, depth, outLeaves) {
		var displayName;
		var matchName;
		var empty;
		if (!param) {
			empty = {
				componentIndex: componentIndex,
				parameterIndex: parameterIndex,
				displayName: UNAVAILABLE,
				matchName: UNAVAILABLE,
				runtimeType: UNAVAILABLE,
				currentValue: UNAVAILABLE,
				parent: parentLabel(parentInfo) || "",
				group: parentLabel(parentInfo) || "",
				hierarchyPath: joinHierarchy(parentInfo, ""),
				identityFields: {},
				children: [],
				hasGetValue: false,
				hasSetValue: false
			};
			outLeaves.push(empty);
			return empty;
		}
		var getValue = UNAVAILABLE;
		var getErr = null;
		var node;
		var names;
		var c;
		var collection;
		var childCount;
		var childBase;
		var i;
		var child;
		var childParent;
		var n;
		var base;
		var zero;
		var one;
		displayName = res ? (res.readString(param, "displayName") || "") : (param && param.displayName ? String(param.displayName) : "");
		matchName = res ? (res.readString(param, "matchName") || "") : (param && param.matchName ? String(param.matchName) : "");
		if (hasFn(param, "getValue")) {
			try {
				getValue = param.getValue();
			} catch (e) {
				getErr = String(e);
				getValue = UNAVAILABLE;
			}
		}
		node = {
			componentIndex: componentIndex,
			parameterIndex: parameterIndex,
			displayName: displayName || UNAVAILABLE,
			matchName: matchName === "" ? "" : (matchName || UNAVAILABLE),
			runtimeType: getErr ? "error" : (getValue === UNAVAILABLE && !hasFn(param, "getValue") ? UNAVAILABLE : typeof getValue),
			currentValue: getErr ? UNAVAILABLE : primitiveOrUnavailable(getValue),
			getValueError: getErr,
			parent: parentLabel(parentInfo) || "",
			group: parentLabel(parentInfo) || "",
			hierarchyPath: joinHierarchy(parentInfo, displayName),
			identityFields: probeFields(param, PARAM_IDENTITY_FIELDS),
			readCalls: {},
			children: []
		};
		for (i = 0; i < PARAM_READ_CALLS.length; i++) {
			if (PARAM_READ_CALLS[i] === "getValue" && getValue !== UNAVAILABLE && !getErr) {
				node.readCalls.getValue = {
					name: "getValue",
					exists: true,
					typeofValue: "function",
					called: true,
					value: primitiveOrUnavailable(getValue)
				};
			} else {
				node.readCalls[PARAM_READ_CALLS[i]] = callReadOnly(param, PARAM_READ_CALLS[i]);
			}
		}
		node.hasGetValue = hasFn(param, "getValue");
		node.hasSetValue = hasFn(param, "setValue");
		if (depth < MAX_DEPTH) {
			names = NESTED_COLLECTION_NAMES;
			for (c = 0; c < names.length; c++) {
				collection = readCollection(res, param, names[c]);
				if (!collection.available || !collection.collection || collection.count < 0) {
					continue;
				}
				childCount = collection.count < MAX_CHILDREN ? collection.count : MAX_CHILDREN;
				childBase = collection.indexBase || 0;
				childParent = {
					parameterDisplayName: displayName,
					parameterMatchName: matchName,
					hierarchyPath: joinHierarchy(parentInfo, displayName)
				};
				for (i = 0; i < childCount; i++) {
					child = collectionItem(res, collection.collection, i, childBase);
					if (!child) {
						continue;
					}
					node.children.push(inspectParamNode(res, componentIndex, child, i, childParent, depth + 1, outLeaves));
				}
			}
			if (!node.children.length) {
				for (c = 0; c < FALLBACK_COLLECTION_NAMES.length; c++) {
					collection = readCollection(res, param, FALLBACK_COLLECTION_NAMES[c]);
					if (!collection.available || !collection.collection || collection.count < 0) {
						continue;
					}
					childCount = collection.count < MAX_CHILDREN ? collection.count : MAX_CHILDREN;
					childBase = collection.indexBase || 0;
					childParent = {
						parameterDisplayName: displayName,
						parameterMatchName: matchName,
						hierarchyPath: joinHierarchy(parentInfo, displayName)
					};
					for (i = 0; i < childCount; i++) {
						child = collectionItem(res, collection.collection, i, childBase);
						if (!child) {
							continue;
						}
						node.children.push(inspectParamNode(res, componentIndex, child, i, childParent, depth + 1, outLeaves));
					}
				}
			}
			try {
				n = param.numProperties;
			} catch (ignoreN) {
				n = undefined;
			}
			if (typeof n === "number" && isFinite(n) && n > 0 && hasFn(param, "property") && !node.children.length) {
				zero = undefined;
				one = undefined;
				try {
					zero = param.property(0);
				} catch (ignoreZero) {}
				try {
					one = param.property(1);
				} catch (ignoreOne) {}
				base = (zero !== undefined && zero !== null) ? 0 : 1;
				childParent = {
					parameterDisplayName: displayName,
					parameterMatchName: matchName,
					hierarchyPath: joinHierarchy(parentInfo, displayName)
				};
				childCount = n < MAX_CHILDREN ? n : MAX_CHILDREN;
				for (i = 0; i < childCount; i++) {
					try {
						child = param.property(i + base);
					} catch (ignoreChild) {
						child = undefined;
					}
					if (!child) {
						continue;
					}
					node.children.push(inspectParamNode(res, componentIndex, child, i, childParent, depth + 1, outLeaves));
				}
			}
		}
		if (!node.children.length) {
			outLeaves.push(node);
		} else if (node.hasGetValue) {
			outLeaves.push(node);
		}
		return node;
	}

	function inspectComponentIdentity(res, component, componentIndex, componentsCol, indexBase) {
		var displayName;
		var matchName;
		var instanceNameField;
		var refetched;
		var leaves = [];
		var tree;
		var props;
		var i;
		var core;
		var saturations;
		var leaf;
		displayName = res ? (res.readString(component, "displayName") || "") : (component.displayName || "");
		matchName = res ? (res.readString(component, "matchName") || "") : (component.matchName || "");
		instanceNameField = probeField(component, "instanceName");
		props = readCollection(res, component, "properties");
		if (props.available && props.collection && props.count >= 0) {
			tree = [];
			for (i = 0; i < props.count && i < MAX_CHILDREN; i++) {
				tree.push(inspectParamNode(
					res,
					componentIndex,
					collectionItem(res, props.collection, i, props.indexBase),
					i,
					null,
					0,
					leaves
				));
			}
		} else {
			tree = [];
		}
		core = [];
		saturations = [];
		for (i = 0; i < leaves.length; i++) {
			leaf = leaves[i];
			if (!leaf) {
				continue;
			}
			if (indexOfName(CORE_PARAM_NAMES, leaf.displayName) !== -1) {
				core.push({
					componentIndex: componentIndex,
					parameterIndex: leaf.parameterIndex,
					displayName: leaf.displayName,
					matchName: leaf.matchName === "" ? "" : (leaf.matchName || UNAVAILABLE),
					currentValue: leaf.currentValue,
					hierarchyPath: leaf.hierarchyPath || UNAVAILABLE,
					parent: leaf.parent || "",
					group: leaf.group || "",
					runtimeType: leaf.runtimeType,
					identityFields: leaf.identityFields
				});
			}
			if (leaf.displayName === "Saturation") {
				saturations.push({
					componentIndex: componentIndex,
					parameterIndex: leaf.parameterIndex,
					displayName: leaf.displayName,
					matchName: leaf.matchName === "" ? "" : (leaf.matchName || UNAVAILABLE),
					currentValue: leaf.currentValue,
					hierarchyPath: leaf.hierarchyPath || UNAVAILABLE,
					parent: leaf.parent || "",
					group: leaf.group || "",
					runtimeType: leaf.runtimeType,
					identityFields: leaf.identityFields,
					note: "Saturation identity uses parent/group/hierarchyPath/matchName; displayName alone is not unique."
				});
			}
		}
		refetched = undefined;
		try {
			refetched = collectionItem(res, componentsCol, componentIndex, indexBase);
		} catch (ignoreRefetch) {}
		return {
			lumetriOrdinal: 0,
			componentIndex: componentIndex,
			displayName: displayName || UNAVAILABLE,
			matchName: matchName || UNAVAILABLE,
			instanceName: instanceNameField.exists ? instanceNameField.value : UNAVAILABLE,
			instanceNameExists: instanceNameField.exists === true,
			identityFields: probeFields(component, COMPONENT_IDENTITY_FIELDS),
			readCalls: (function () {
				var calls = {};
				var n;
				for (n = 0; n < COMPONENT_READ_CALLS.length; n++) {
					calls[COMPONENT_READ_CALLS[n]] = callReadOnly(component, COMPONENT_READ_CALLS[n]);
				}
				return calls;
			}()),
			runtime: inspectRuntime(component),
			reflect: inspectReflect(component),
			prototype: inspectPrototype(component),
			enumerableKeys: enumerableKeys(component),
			objectKeys: objectKeysSafe(component),
			ownPropertyNames: ownPropertyNamesSafe(component),
			callableMethods: callableMethods(component, COMPONENT_READ_CALLS.concat(FORBIDDEN_CALL_NAMES)),
			propertyCount: props.available ? props.count : UNAVAILABLE,
			propertyCountVia: props.available ? props.countVia : UNAVAILABLE,
			refetchSameIndex: refetched === undefined ? { available: false } : compareRefs(component, refetched),
			coreParameters: core,
			saturationParameters: saturations,
			parameterLeaves: leaves,
			parameterTreeCount: tree.length
		};
	}

	function uniqueValues(rows, getter) {
		var seen = {};
		var out = [];
		var i;
		var value;
		for (i = 0; i < rows.length; i++) {
			value = getter(rows[i]);
			value = value === undefined || value === null ? "" : String(value);
			if (seen.hasOwnProperty(value)) {
				continue;
			}
			seen[value] = true;
			out.push(value);
		}
		return out;
	}

	function fieldDifferentiates(instances, fieldName) {
		var values = uniqueValues(instances, function (row) {
			var probed = row.identityFields && row.identityFields[fieldName];
			if (!probed) {
				return "";
			}
			if (probed.exists !== true) {
				return "";
			}
			return probed.value;
		});
		var usable = [];
		var i;
		for (i = 0; i < values.length; i++) {
			if (values[i] && values[i] !== UNAVAILABLE) {
				usable.push(values[i]);
			}
		}
		return {
			field: fieldName,
			distinctValues: values,
			differentiates: usable.length > 1
		};
	}

	function buildParameterComparison(instances) {
		var rows = [];
		var p;
		var i;
		var name;
		var matches;
		var inst;
		var c;
		for (p = 0; p < CORE_PARAM_NAMES.length; p++) {
			name = CORE_PARAM_NAMES[p];
			matches = [];
			for (i = 0; i < instances.length; i++) {
				inst = instances[i];
				for (c = 0; c < inst.coreParameters.length; c++) {
					if (inst.coreParameters[c].displayName === name) {
						matches.push({
							lumetriOrdinal: inst.lumetriOrdinal,
							componentIndex: inst.coreParameters[c].componentIndex,
							parameterIndex: inst.coreParameters[c].parameterIndex,
							displayName: inst.coreParameters[c].displayName,
							matchName: inst.coreParameters[c].matchName === "" ? "" : (inst.coreParameters[c].matchName || UNAVAILABLE),
							currentValue: inst.coreParameters[c].currentValue,
							hierarchyPath: inst.coreParameters[c].hierarchyPath || UNAVAILABLE,
							parent: inst.coreParameters[c].parent || "",
							group: inst.coreParameters[c].group || ""
						});
					}
				}
			}
			rows.push({
				parameter: name,
				matchCount: matches.length,
				uniqueByDisplayName: false,
				matches: matches
			});
		}
		return rows;
	}

	function collectSaturationIdentities(instances) {
		var out = [];
		var i;
		var s;
		for (i = 0; i < instances.length; i++) {
			for (s = 0; s < instances[i].saturationParameters.length; s++) {
				out.push({
					lumetriOrdinal: instances[i].lumetriOrdinal,
					componentIndex: instances[i].saturationParameters[s].componentIndex,
					parameterIndex: instances[i].saturationParameters[s].parameterIndex,
					displayName: instances[i].saturationParameters[s].displayName,
					matchName: instances[i].saturationParameters[s].matchName,
					currentValue: instances[i].saturationParameters[s].currentValue,
					parent: instances[i].saturationParameters[s].parent || "",
					group: instances[i].saturationParameters[s].group || "",
					hierarchyPath: instances[i].saturationParameters[s].hierarchyPath || UNAVAILABLE,
					runtimeType: instances[i].saturationParameters[s].runtimeType,
					identityFields: instances[i].saturationParameters[s].identityFields
				});
			}
		}
		return out;
	}

	function probeEffectControls(trackItem) {
		var probes = {
			officialApi: "none documented for Effect Controls row selection",
			sequenceGetSelection: { available: false, value: UNAVAILABLE, note: "Returns TrackItems, not effect-component rows." },
			projectViewSelection: { available: false, value: UNAVAILABLE },
			trackItemIsSelected: { available: false, value: UNAVAILABLE },
			componentIsSelected: [],
			appFields: {},
			sequenceFields: {},
			qeTouched: false
		};
		var seq;
		var selection;
		var i;
		var component;
		var selectedCall;
		try {
			if (typeof app !== "undefined" && app.project && app.project.activeSequence) {
				seq = app.project.activeSequence;
				try {
					selection = seq.getSelection();
					probes.sequenceGetSelection = {
						available: true,
						typeofValue: typeof selection,
						length: selection && selection.length !== undefined ? selection.length : UNAVAILABLE,
						itemMediaTypes: [],
						note: "Sequence.getSelection returns selected TrackItems. It does not expose the focused Effect Controls component."
					};
					if (selection && selection.length) {
						for (i = 0; i < selection.length && i < 8; i++) {
							probes.sequenceGetSelection.itemMediaTypes.push({
								index: i,
								mediaType: probeField(selection[i], "mediaType").value,
								name: probeField(selection[i], "name").value,
								constructorName: constructorName(selection[i])
							});
						}
					}
				} catch (selErr) {
					probes.sequenceGetSelection = { available: "threw", error: String(selErr), value: UNAVAILABLE };
				}
				probes.sequenceFields = probeFields(seq, EFFECT_CONTROLS_FIELD_NAMES);
			}
		} catch (seqErr) {
			probes.sequenceGetSelection.error = String(seqErr);
		}
		try {
			if (typeof app !== "undefined" && typeof app.getCurrentProjectViewSelection === "function") {
				probes.projectViewSelection = callReadOnly(app, "getCurrentProjectViewSelection");
				probes.projectViewSelection.note = "Project panel selection, not Effect Controls.";
			} else {
				probes.projectViewSelection = { available: false, value: UNAVAILABLE, note: "app.getCurrentProjectViewSelection unavailable" };
			}
		} catch (projErr) {
			probes.projectViewSelection = { available: "threw", error: String(projErr), value: UNAVAILABLE };
		}
		if (trackItem) {
			if (hasFn(trackItem, "isSelected")) {
				probes.trackItemIsSelected = callReadOnly(trackItem, "isSelected");
				probes.trackItemIsSelected.note = "TrackItem selection, not Effect Controls component selection.";
			} else {
				probes.trackItemIsSelected = probeField(trackItem, "isSelected");
			}
			try {
				if (trackItem.components) {
					for (i = 0; i < (trackItem.components.length || trackItem.components.numItems || 0) && i < 32; i++) {
						try {
							component = trackItem.components[i];
						} catch (ignoreItem) {
							component = undefined;
						}
						if (!component) {
							continue;
						}
						selectedCall = hasFn(component, "isSelected")
							? callReadOnly(component, "isSelected")
							: probeField(component, "isSelected");
						probes.componentIsSelected.push({
							componentIndex: i,
							displayName: probeField(component, "displayName").value,
							matchName: probeField(component, "matchName").value,
							isSelected: selectedCall,
							selected: probeField(component, "selected"),
							focused: probeField(component, "focused"),
							active: probeField(component, "active")
						});
					}
				}
			} catch (compSelErr) {
				probes.componentIsSelectedError = String(compSelErr);
			}
		}
		try {
			if (typeof app !== "undefined") {
				probes.appFields = probeFields(app, EFFECT_CONTROLS_FIELD_NAMES);
				probes.appMethods = {};
				for (i = 0; i < EFFECT_CONTROLS_METHOD_NAMES.length; i++) {
					probes.appMethods[EFFECT_CONTROLS_METHOD_NAMES[i]] = {
						typeofValue: typeOfFn(app, EFFECT_CONTROLS_METHOD_NAMES[i]),
						called: false
					};
				}
			}
		} catch (appErr) {
			probes.appFieldsError = String(appErr);
		}
		try {
			probes.qeExists = typeof qe !== "undefined";
		} catch (qeErr) {
			probes.qeExists = false;
			probes.qeProbeError = String(qeErr);
		}
		probes.qeTouched = false;
		probes.conclusion = "No official CEP/UXP API documents Effect Controls component/row focus. Live probes below report whatever the host actually exposes; missing fields are unavailable, not assumed.";
		return probes;
	}

	function officialAdobeApi() {
		return {
			source: "Adobe official Premiere CEP/ExtendScript and UXP documentation, inspected 2026-08-19",
			cepComponent: {
				documentedAttributes: ["displayName", "matchName", "properties"],
				documentedIdentity: "matchName uniquely identifies the effect plug-in, not a clip instance",
				notDocumented: [
					"unique id", "guid", "instance id", "instanceName", "effect UUID",
					"stable user-intent component index", "parent/group identity",
					"Effect Controls selection", "object identity that survives enumeration"
				],
				docs: "https://ppro-scripting.docsforadobe.dev/sequence/component/"
			},
			cepComponentParam: {
				documentedAttributes: ["displayName"],
				documentedMethods: [
					"getValue", "getValueAtTime", "getValueAtKey", "getColorValue", "getKeys",
					"isTimeVarying", "areKeyframesSupported",
					"setValue", "setValueAtKey", "setColorValue", "addKey", "removeKey",
					"removeKeyRange", "setTimeVarying", "setInterpolationTypeAtKey",
					"findNearestKey", "findNextKey", "findPreviousKey"
				],
				notDocumented: ["matchName", "id", "guid", "parent", "group", "hierarchyPath", "propertyIndex identity"],
				docs: "https://ppro-scripting.docsforadobe.dev/sequence/componentparam/"
			},
			cepTrackItem: {
				documentedSelection: "TrackItem.isSelected / Sequence.getSelection select clips, not Effect Controls rows",
				documentedId: "TrackItem.nodeId is documented on TrackItem, not on Component",
				docs: "https://ppro-scripting.docsforadobe.dev/item/trackitem/"
			},
			uxpComponent: {
				documentedMethods: ["getDisplayName()", "getMatchName()", "getParam(index)", "getParamCount()"],
				noInstanceId: true,
				paramIndexNote: "UXP: Parameter indexes are zero-based, and the actual is defined exclusively by the component itself. That documents plugin-defined parameter order, not Lumetri instance identity and not Effect Controls selection.",
				docs: "https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/component"
			},
			uxpComponentParam: {
				documentedProperties: ["displayName"],
				documentedMethods: [
					"getValueAtTime", "getStartValue", "getKeyframePtr", "getKeyframeListAsTickTimes",
					"isTimeVarying", "areKeyframesSupported", "createKeyframe",
					"createSetValueAction", "createAddKeyframeAction", "createSetTimeVaryingAction",
					"findNearestKeyframe", "findNextKeyframe", "findPreviousKeyframe"
				],
				notDocumented: ["matchName", "id", "guid", "parent", "group", "instance identity"],
				docs: "https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/componentparam"
			},
			uxpVideoComponentChain: {
				documentedMethods: [
					"getComponentAtIndex(componentIndex)", "getComponentCount()",
					"createAppendComponentAction", "createInsertComponentAction", "createRemoveComponentAction"
				],
				indexSemantics: "Index addresses a position in the component chain. Adobe does not document that this index equals the user's focused Effect Controls row, or that it is a stable unique instance id across reordering.",
				docs: "https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/videocomponentchain"
			},
			uxpSelection: {
				sequenceGetSelection: "Returns TrackItemSelection (clips), not a selected effect/component",
				videoClipTrackItemGetIsSelected: "Clip selection only",
				projectItemGetId: "ProjectItem.getId() exists; Component has no getId()",
				propertiesApi: "Properties.getProperties(owner) is a named key/value bag on Project/Sequence/etc, not Component instance identity",
				docs: "https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/sequence"
			},
			extendscriptFrozen: "Premiere 23.0 scripting changelog: no further ExtendScript API improvements planned; future work is UXP.",
			uxpImprovesInstanceIdentity: false,
			uxpStillOnlyDisplayNameMatchNameIndex: true
		};
	}

	function buildConclusions(instances, saturations, effectControls, pairwise) {
		var differentiating = [];
		var i;
		var field;
		var probe;
		var anyComponentSelectedApi = false;
		var satParents;
		var satPaths;
		var satMatches;
		for (i = 0; i < COMPONENT_IDENTITY_FIELDS.length; i++) {
			field = fieldDifferentiates(instances, COMPONENT_IDENTITY_FIELDS[i]);
			if (field.differentiates) {
				differentiating.push(field);
			}
		}
		if (effectControls && effectControls.componentIsSelected) {
			for (i = 0; i < effectControls.componentIsSelected.length; i++) {
				probe = effectControls.componentIsSelected[i];
				if (probe && probe.isSelected && probe.isSelected.exists === true && probe.isSelected.typeofValue === "function") {
					anyComponentSelectedApi = true;
				}
				if (probe && probe.isSelected && probe.isSelected.value === true) {
					anyComponentSelectedApi = true;
				}
			}
		}
		satParents = uniqueValues(saturations, function (row) { return row.parent; });
		satPaths = uniqueValues(saturations, function (row) { return row.hierarchyPath; });
		satMatches = uniqueValues(saturations, function (row) { return row.matchName; });
		return {
			chosen: false,
			autoSelectedIndex: UNAVAILABLE,
			officialUniqueInstanceIdentity: differentiating.length ? "UNDOCUMENTED_LIVE_FIELD_DIFFERS" : "not found on documented or probed fields",
			differentiatingIdentityFields: differentiating,
			effectControlsSelectionDetectable: anyComponentSelectedApi,
			componentIndexDocumentedAsUserIntent: false,
			componentIndexCanAddressInstance: true,
			componentIndexNote: "trackItem.components[index] / UXP getComponentAtIndex(index) can target a specific chain position. Adobe does not document that position as the user's focused Lumetri, and reordering effects changes it.",
			pairwiseReferenceEquality: pairwise,
			saturationDisplayNameUnique: saturations.length <= 1,
			saturationParentDifferentiates: satParents.length > 1,
			saturationHierarchyDifferentiates: satPaths.length > 1,
			saturationMatchNameDifferentiates: (function () {
				var usable = [];
				var n;
				for (n = 0; n < satMatches.length; n++) {
					if (satMatches[n] && satMatches[n] !== UNAVAILABLE) {
						usable.push(satMatches[n]);
					}
				}
				return usable.length > 1;
			}()),
			parameterIndexProvenIdentity: false,
			parameterIndexNote: "Do not treat parameterIndex as semantic identity unless Adobe documents it or live values uniquely and stably identify the intended Saturation. UXP only says indexes are defined by the component itself.",
			safestAutomaticTarget: instances.length === 1
				? "single Lumetri instance is unambiguous by displayName+matchName"
				: (instances.length === 0 ? "no Lumetri instance" : "none"),
			userVisibleSelectionWouldBeTargetable: instances.length > 1
		};
	}

	function inspect(trackItem) {
		var res = resolver();
		var mediaType;
		var components;
		var countInfo;
		var indexBase;
		var i;
		var j;
		var component;
		var displayName;
		var matchName;
		var instances;
		var allComponents;
		var inspected;
		var saturations;
		var comparison;
		var pairwise;
		var effectControls;
		var conclusions;
		if (!trackItem) {
			return fail("NO_VIDEO_SELECTION", "No TrackItem was provided.");
		}
		mediaType = res ? res.readString(trackItem, "mediaType") : (trackItem.mediaType || "");
		if (mediaType !== "Video") {
			return fail("NO_VIDEO_SELECTION", "TrackItem.mediaType is " + String(mediaType) + ", expected Video.");
		}
		try {
			components = trackItem.components;
		} catch (compErr) {
			return fail("EFFECT_NOT_FOUND", "TrackItem.components threw: " + String(compErr));
		}
		if (res) {
			countInfo = res.collectionCount(components);
			indexBase = res.collectionIndexBase(components, countInfo.count);
		} else {
			countInfo = { count: components && components.length ? components.length : 0, via: "length" };
			indexBase = 0;
		}
		if (countInfo.count < 0) {
			return fail("EFFECT_NOT_FOUND", "Could not read components.");
		}
		allComponents = [];
		instances = [];
		for (i = 0; i < countInfo.count; i++) {
			component = collectionItem(res, components, i, indexBase);
			displayName = res ? (res.readString(component, "displayName") || "") : (component && component.displayName ? String(component.displayName) : "");
			matchName = res ? (res.readString(component, "matchName") || "") : (component && component.matchName ? String(component.matchName) : "");
			allComponents.push({
				componentIndex: i,
				displayName: displayName || UNAVAILABLE,
				matchName: matchName || UNAVAILABLE,
				isLumetri: isLumetriComponent(displayName, matchName)
			});
			if (!isLumetriComponent(displayName, matchName)) {
				continue;
			}
			inspected = inspectComponentIdentity(res, component, i, components, indexBase);
			inspected.lumetriOrdinal = instances.length + 1;
			instances.push(inspected);
		}
		pairwise = [];
		for (i = 0; i < instances.length; i++) {
			for (j = i + 1; j < instances.length; j++) {
				pairwise.push({
					a: instances[i].lumetriOrdinal,
					b: instances[j].lumetriOrdinal,
					componentIndexA: instances[i].componentIndex,
					componentIndexB: instances[j].componentIndex,
					reference: compareRefs(
						collectionItem(res, components, instances[i].componentIndex, indexBase),
						collectionItem(res, components, instances[j].componentIndex, indexBase)
					),
					displayNameEqual: instances[i].displayName === instances[j].displayName,
					matchNameEqual: instances[i].matchName === instances[j].matchName,
					instanceNameEqual: instances[i].instanceName === instances[j].instanceName,
					toStringEqual: instances[i].runtime && instances[j].runtime
						? instances[i].runtime.stringRepresentation === instances[j].runtime.stringRepresentation
						: UNAVAILABLE
				});
			}
		}
		comparison = buildParameterComparison(instances);
		saturations = collectSaturationIdentities(instances);
		effectControls = probeEffectControls(trackItem);
		conclusions = buildConclusions(instances, saturations, effectControls, pairwise);
		return {
			ok: true,
			operation: OPERATION,
			readOnly: true,
			usedQE: false,
			productionEnabled: false,
			settersCalled: false,
			writesPerformed: false,
			forbiddenCallsInvoked: [],
			chosen: false,
			autoSelectedIndex: UNAVAILABLE,
			clip: {
				name: res ? (res.readString(trackItem, "name") || "") : (trackItem.name || ""),
				mediaType: mediaType,
				nodeId: probeField(trackItem, "nodeId").value
			},
			componentCount: countInfo.count,
			componentIndexBase: indexBase,
			allComponents: allComponents,
			lumetriCount: instances.length,
			lumetriInstances: instances,
			identityComparison: {
				displayNameUnique: uniqueValues(instances, function (row) { return row.displayName; }).length === instances.length && instances.length > 0,
				matchNameUnique: uniqueValues(instances, function (row) { return row.matchName; }).length === instances.length && instances.length > 0,
				instanceNameUnique: uniqueValues(instances, function (row) { return row.instanceName; }).length === instances.length && instances.length > 0,
				displayNames: uniqueValues(instances, function (row) { return row.displayName; }),
				matchNames: uniqueValues(instances, function (row) { return row.matchName; }),
				instanceNames: uniqueValues(instances, function (row) { return row.instanceName; }),
				pairwise: pairwise
			},
			parameterComparison: comparison,
			saturationIdentities: saturations,
			effectControlsProbes: effectControls,
			officialAdobeApi: officialAdobeApi(),
			conclusions: conclusions,
			confirmation: "READ_ONLY_PREMIERE_INSPECT",
			note: "This diagnostic never writes, never calls setValue/setValueAtKey/addKey, never uses QE, and never chooses first/last/index as the intended Lumetri."
		};
	}

	function hostDebugRun() {
		var selected;
		var result;
		if (typeof $ === "undefined" || !$._pickfx || typeof $._pickfx.firstSelectedVideoTrackItem !== "function") {
			return JSON.stringify(fail("WRITE_FAILED", "host.jsx firstSelectedVideoTrackItem is not available."));
		}
		selected = $._pickfx.firstSelectedVideoTrackItem();
		if (!selected || !selected.ok) {
			return JSON.stringify(fail(
				(selected && selected.reason) || "NO_VIDEO_SELECTION",
				(selected && selected.detail) || "No selected video TrackItem."
			));
		}
		result = inspect(selected.trackItem);
		if (typeof $._pickfx.jsonSafeParamResult === "function") {
			return JSON.stringify($._pickfx.jsonSafeParamResult(result));
		}
		return JSON.stringify(result);
	}

	return {
		OPERATION: OPERATION,
		UNAVAILABLE: UNAVAILABLE,
		LUMETRI_DISPLAY: LUMETRI_DISPLAY,
		LUMETRI_MATCH: LUMETRI_MATCH,
		CORE_PARAM_NAMES: CORE_PARAM_NAMES,
		inspect: inspect,
		hostDebugRun: hostDebugRun,
		officialAdobeApi: officialAdobeApi
	};
}());

if (typeof $ !== "undefined") {
	$._pickfxLumetriInstanceIdentityInspect = LumetriInstanceIdentityInspect;
	if ($._pickfx) {
		$._pickfx.inspectLumetriInstanceIdentity = LumetriInstanceIdentityInspect.hostDebugRun;
	}
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = LumetriInstanceIdentityInspect;
}
