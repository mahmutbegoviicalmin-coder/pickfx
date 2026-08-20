var ColorParameterDiscover = (function () {
	var OPERATION = "color.parameter.discover";
	var MAX_DEPTH = 8;
	var MAX_CHILDREN = 128;
	var NESTED_COLLECTION_NAMES = ["properties", "children"];
	var FALLBACK_COLLECTION_NAMES = ["parameters"];

	function resolver() {
		if (typeof $._pickfxParameterResolver !== "undefined") {
			return $._pickfxParameterResolver;
		}
		return null;
	}

	function fold(value) {
		return String(value || "").replace(/^\s+|\s+$/g, "").toLowerCase();
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

	function hasExposed(obj, name) {
		try {
			return obj[name] !== undefined && obj[name] !== null;
		} catch (e) {
			return false;
		}
	}

	function callBool(obj, name) {
		try {
			if (typeof obj[name] !== "function") {
				return { available: false, typeofValue: typeOfFn(obj, name) };
			}
			return { available: true, typeofValue: "function", value: !!obj[name]() };
		} catch (e) {
			return { available: true, typeofValue: "function", error: String(e) };
		}
	}

	function fail(reason, detail, extra) {
		var payload = {
			ok: false,
			operation: OPERATION,
			reason: reason || "EFFECT_NOT_FOUND",
			detail: detail ? String(detail) : "",
			usedQE: false,
			productionEnabled: false,
			settersCalled: false,
			writesPerformed: false,
			parameters: [],
			candidates: [],
			rejected: []
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

	function looksLikeColorComponent(displayName, matchName) {
		var d = fold(displayName);
		var m = fold(matchName);
		if (d.indexOf("lumetri") !== -1 || m.indexOf("lumetri") !== -1) {
			return {
				matched: true,
				reason: d.indexOf("lumetri") !== -1 ? "displayName contains lumetri" : "matchName contains lumetri"
			};
		}
		if (d === "color") {
			return {
				matched: true,
				reason: "displayName is Color"
			};
		}
		if (d === "lumetri color") {
			return {
				matched: true,
				reason: "displayName is Lumetri Color"
			};
		}
		return { matched: false, reason: "" };
	}

	function detectValue(param, getValue) {
		if (typeof ParameterValueType !== "undefined" && ParameterValueType.detectLive) {
			return ParameterValueType.detectLive(param, getValue);
		}
		if (typeof ParameterValueType !== "undefined" && ParameterValueType.detect) {
			return ParameterValueType.detect(getValue);
		}
		return { type: typeof getValue, value: getValue };
	}

	function liveLimits(param) {
		var limits = {};
		try {
			if (typeof param.min === "number" && isFinite(param.min)) {
				limits.min = param.min;
			}
		} catch (ignoreMin) {}
		try {
			if (typeof param.max === "number" && isFinite(param.max)) {
				limits.max = param.max;
			}
		} catch (ignoreMax) {}
		try {
			if (limits.min === undefined && typeof param.minValue === "number" && isFinite(param.minValue)) {
				limits.min = param.minValue;
			}
		} catch (ignoreMinValue) {}
		try {
			if (limits.max === undefined && typeof param.maxValue === "number" && isFinite(param.maxValue)) {
				limits.max = param.maxValue;
			}
		} catch (ignoreMaxValue) {}
		return limits;
	}

	function parentLabel(parentInfo) {
		if (!parentInfo) {
			return "";
		}
		if (parentInfo.parameterDisplayName) {
			return parentInfo.parameterDisplayName;
		}
		return "";
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

	function looksLikeBasicCorrection(label) {
		return fold(label) === "basic correction";
	}

	function pathHasBasicCorrection(path) {
		var parts;
		var i;
		path = String(path || "");
		parts = path.split(" / ");
		for (i = 0; i < parts.length; i++) {
			if (looksLikeBasicCorrection(parts[i])) {
				return true;
			}
		}
		return false;
	}

	function typeSpecificReason(snapshot, classified) {
		var type = snapshot && snapshot.runtimeType ? snapshot.runtimeType : "unknown";
		var shape = snapshot && snapshot.valueShape ? snapshot.valueShape : null;
		var reason = classified && classified.reason ? classified.reason : "";
		var status = classified && classified.status ? classified.status : "";
		if (reason === "UNSUPPORTED_TYPE" || status === "UNSUPPORTED") {
			if (type === "color") {
				return "COLOR_VALUE";
			}
			if (type === "point") {
				return "POINT_VALUE";
			}
			if (type === "boolean") {
				return "BOOLEAN_VALUE";
			}
			if (type === "string") {
				return "STRING_VALUE";
			}
		}
		if (type === "unknown" || status === "UNKNOWN" || reason === "UNKNOWN") {
			if (shape && shape.kind === "array") {
				return "ARRAY_VALUE";
			}
			if (shape && shape.kind === "object") {
				return "OBJECT_VALUE";
			}
		}
		return reason || status || "UNSUPPORTED_TYPE";
	}

	function isNumericEligibleStatus(classified) {
		if (!classified) {
			return false;
		}
		if (classified.candidate === true) {
			return true;
		}
		return classified.status === "CANDIDATE" ||
			classified.status === "WRITE_TESTED" ||
			classified.status === "WRITE_CONFIRMED" ||
			classified.status === "PRODUCTION_ENABLED";
	}

	function classifySnapshot(snapshot) {
		var classified;
		var reason;
		var generated;
		var limits;
		if (typeof NumericCandidateClassifier === "undefined" || !NumericCandidateClassifier.classify) {
			return {
				classification: "UNKNOWN",
				reason: "UNKNOWN",
				candidate: false,
				productionEnabled: false
			};
		}
		classified = NumericCandidateClassifier.classify(snapshot);
		if (isNumericEligibleStatus(classified)) {
			limits = {};
			if (snapshot && typeof snapshot.min === "number") {
				limits.min = snapshot.min;
			}
			if (snapshot && typeof snapshot.max === "number") {
				limits.max = snapshot.max;
			}
			if (typeof SafeNumericTestValue !== "undefined" && SafeNumericTestValue.generate) {
				generated = SafeNumericTestValue.generate(snapshot.currentValue, limits);
				if (!generated || generated.ok !== true) {
					return {
						classification: "NO_SAFE_TEST_VALUE",
						reason: "NO_SAFE_TEST_VALUE",
						candidate: false,
						productionEnabled: false,
						status: "REJECTED"
					};
				}
			}
			return {
				classification: "NUMERIC_CANDIDATE",
				reason: undefined,
				candidate: true,
				productionEnabled: false,
				status: "CANDIDATE",
				writeCapability: "NUMBER"
			};
		}
		reason = typeSpecificReason(snapshot, classified);
		return {
			classification: reason,
			reason: reason,
			candidate: false,
			productionEnabled: false,
			status: classified.status || "REJECTED",
			writeCapability: classified.writeCapability
		};
	}

	function publicSnapshot(node) {
		var row;
		var classified;
		if (!node) {
			return null;
		}
		classified = classifySnapshot(node);
		row = {
			displayName: node.displayName,
			matchName: node.matchName,
			componentDisplayName: node.componentDisplayName,
			componentMatchName: node.componentMatchName,
			runtimeType: node.runtimeType,
			value: node.currentValue,
			currentValue: node.currentValue,
			valueShape: node.valueShape,
			parent: node.parent || "",
			group: node.group || node.parent || "",
			parentMatchName: node.parentMatchName || "",
			hierarchyPath: node.hierarchyPath || "",
			diagnosticIndex: node.diagnosticIndex,
			hasGetValue: node.hasGetValue === true,
			hasSetValue: node.hasSetValue === true,
			hasGetValueAtTime: node.hasGetValueAtTime === true,
			hasSetValueAtKey: node.hasSetValueAtKey === true,
			hasGetColorValue: node.hasGetColorValue === true,
			hasSetColorValue: node.hasSetColorValue === true,
			timeVarying: node.timeVarying === true,
			typeofGetValue: node.typeofGetValue,
			typeofSetValue: node.typeofSetValue,
			getError: node.getError === true,
			identity: node.identity,
			classification: classified.classification,
			reason: classified.reason,
			candidate: classified.candidate === true,
			productionEnabled: false,
			enumLike: node.enumLike === true,
			classifierUsed: "NumericCandidateClassifier.classify",
			writesPerformed: false
		};
		if (node.min !== undefined) {
			row.min = node.min;
		}
		if (node.max !== undefined) {
			row.max = node.max;
		}
		if (node.typeMetadata) {
			row.typeMetadata = node.typeMetadata;
		}
		if (node.raw) {
			row.raw = node.raw;
		}
		if (node.reflection) {
			row.reflection = node.reflection;
		}
		return row;
	}

	function readCollection(res, owner, collectionName) {
		var col;
		var countInfo;
		var indexBase;
		try {
			col = owner[collectionName];
		} catch (e) {
			return { name: collectionName, available: false, error: String(e) };
		}
		if (col === undefined || col === null) {
			return { name: collectionName, available: false };
		}
		countInfo = res.collectionCount(col);
		if (countInfo.count < 0) {
			return {
				name: collectionName,
				available: true,
				count: countInfo.count,
				countVia: countInfo.via
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

	function childAlreadyPresent(node, displayName, matchName) {
		var i;
		var child;
		for (i = 0; i < (node && node.children ? node.children.length : 0); i++) {
			child = node.children[i];
			if (child && child.displayName === displayName && (child.matchName || "") === (matchName || "")) {
				return true;
			}
		}
		return false;
	}

	function addUniqueChild(res, component, parentNode, child, index, childParent, depth, outLeaves) {
		var displayName;
		var matchName;
		var childNode;
		if (!child || !parentNode) {
			return;
		}
		displayName = res.readString(child, "displayName") || "";
		matchName = res.readString(child, "matchName") || "";
		if (childAlreadyPresent(parentNode, displayName, matchName)) {
			return;
		}
		childNode = inspectNode(res, component, child, index, childParent, depth + 1, outLeaves);
		parentNode.children.push(childNode);
	}

	function inspectNumPropertiesChildren(res, component, param, node, diagnosticIndex, depth, outLeaves) {
		var n;
		var zero;
		var one;
		var base;
		var i;
		var child;
		var childParent;
		var limit;
		try {
			n = param.numProperties;
		} catch (ignoreN) {
			return;
		}
		if (typeof n !== "number" || !isFinite(n) || n <= 0) {
			return;
		}
		if (!hasFn(param, "property")) {
			return;
		}
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
			parameterDisplayName: node.displayName,
			parameterMatchName: node.matchName,
			collectionName: "numProperties/property()",
			diagnosticIndex: diagnosticIndex,
			hierarchyPath: node.hierarchyPath || node.displayName || ""
		};
		limit = n < MAX_CHILDREN ? n : MAX_CHILDREN;
		for (i = 0; i < limit; i++) {
			try {
				child = param.property(i + base);
			} catch (ignoreChild) {
				child = undefined;
			}
			if (!child) {
				continue;
			}
			addUniqueChild(res, component, node, child, i, childParent, depth, outLeaves);
		}
	}

	function inspectNode(res, component, param, diagnosticIndex, parentInfo, depth, outLeaves) {
		var displayName;
		var matchName;
		var getValue;
		var getErr;
		var detected;
		var limits;
		var timeVarying;
		var node;
		var identity;
		var dump;
		var raw;
		var c;
		var names;
		var collection;
		var childCount;
		var childBase;
		var i;
		var child;
		var childParent;
		var walked;
		displayName = res.readString(param, "displayName") || "";
		matchName = res.readString(param, "matchName") || "";
		getErr = false;
		getValue = undefined;
		try {
			if (hasFn(param, "getValue")) {
				getValue = param.getValue();
			}
		} catch (e) {
			getErr = true;
			getValue = undefined;
		}
		detected = detectValue(param, getValue);
		limits = liveLimits(param);
		timeVarying = callBool(param, "isTimeVarying");
		identity = {
			componentDisplayName: component.displayName,
			componentMatchName: component.matchName,
			parameterDisplayName: displayName,
			parameterMatchName: matchName
		};
		node = {
			displayName: displayName,
			matchName: matchName,
			componentDisplayName: component.displayName,
			componentMatchName: component.matchName,
			runtimeType: detected && detected.type ? detected.type : (getErr ? "error" : "unknown"),
			currentValue: detected ? detected.value : getValue,
			valueShape: detected ? detected.valueShape : undefined,
			hasGetValue: hasFn(param, "getValue"),
			hasSetValue: hasFn(param, "setValue"),
			hasGetValueAtTime: hasFn(param, "getValueAtTime"),
			hasSetValueAtKey: hasFn(param, "setValueAtKey"),
			hasGetColorValue: hasFn(param, "getColorValue"),
			hasSetColorValue: hasFn(param, "setColorValue"),
			hasItems: hasExposed(param, "items"),
			hasValueNames: hasExposed(param, "valueNames"),
			hasOptions: hasExposed(param, "options"),
			hasEnumItems: hasExposed(param, "enumItems"),
			hasListItems: hasExposed(param, "listItems"),
			hasGetItem: hasFn(param, "getItem"),
			hasGetListItem: hasFn(param, "getListItem"),
			hasGetValueName: hasFn(param, "getValueName"),
			hasGetValueNames: hasFn(param, "getValueNames"),
			hasGetOptions: hasFn(param, "getOptions"),
			timeVarying: timeVarying.value === true,
			isTimeVarying: timeVarying.value === true,
			typeofGetValue: typeOfFn(param, "getValue"),
			typeofSetValue: typeOfFn(param, "setValue"),
			getError: getErr === true,
			parent: parentLabel(parentInfo),
			group: parentLabel(parentInfo),
			parentMatchName: parentInfo && parentInfo.parameterMatchName ? parentInfo.parameterMatchName : "",
			hierarchyPath: joinHierarchy(parentInfo, displayName),
			diagnosticIndex: diagnosticIndex,
			identity: identity,
			children: [],
			_param: param
		};
		if (limits.min !== undefined) {
			node.min = limits.min;
		}
		if (limits.max !== undefined) {
			node.max = limits.max;
		}
		node.typeMetadata = {
			runtimeType: node.runtimeType,
			valueShape: node.valueShape,
			min: node.min,
			max: node.max,
			typeofGetValue: node.typeofGetValue,
			typeofSetValue: node.typeofSetValue
		};
		if (typeof NumericCandidateClassifier !== "undefined" && NumericCandidateClassifier.hasEnumLikeMetadata) {
			node.enumLike = NumericCandidateClassifier.hasEnumLikeMetadata(node);
		}
		try {
			if (res.inspectHostObject) {
				dump = res.inspectHostObject(param, res.inspectParamCandidates ? res.inspectParamCandidates() : []);
				if (dump) {
					node.reflection = {
						objectKeys: dump.objectKeys,
						ownPropertyNames: dump.ownPropertyNames,
						forInKeys: dump.forInKeys,
						candidateMetadata: dump.candidateMetadata
					};
				}
			}
		} catch (ignoreDump) {}
		if (res.inspectRaw) {
			try {
				raw = res.inspectRaw(param, detected);
				if (raw) {
					node.raw = raw;
				}
			} catch (ignoreRaw) {}
		}
		if (depth < MAX_DEPTH) {
			walked = false;
			names = NESTED_COLLECTION_NAMES;
			for (c = 0; c < names.length; c++) {
				collection = readCollection(res, param, names[c]);
				if (!collection.available || !collection.collection || collection.count < 0) {
					continue;
				}
				childCount = collection.count < MAX_CHILDREN ? collection.count : MAX_CHILDREN;
				childBase = collection.indexBase;
				childParent = {
					parameterDisplayName: displayName,
					parameterMatchName: matchName,
					collectionName: collection.name,
					diagnosticIndex: diagnosticIndex,
					hierarchyPath: joinHierarchy(parentInfo, displayName)
				};
				for (i = 0; i < childCount; i++) {
					child = res.collectionItem(collection.collection, i, childBase);
					if (!child) {
						continue;
					}
					addUniqueChild(res, component, node, child, i, childParent, depth, outLeaves);
				}
				if (node.children.length) {
					walked = true;
				}
			}
			if (!walked) {
				for (c = 0; c < FALLBACK_COLLECTION_NAMES.length; c++) {
					collection = readCollection(res, param, FALLBACK_COLLECTION_NAMES[c]);
					if (!collection.available || !collection.collection || collection.count < 0) {
						continue;
					}
					childCount = collection.count < MAX_CHILDREN ? collection.count : MAX_CHILDREN;
					childBase = collection.indexBase;
					childParent = {
						parameterDisplayName: displayName,
						parameterMatchName: matchName,
						collectionName: collection.name,
						diagnosticIndex: diagnosticIndex,
						hierarchyPath: joinHierarchy(parentInfo, displayName)
					};
					for (i = 0; i < childCount; i++) {
						child = res.collectionItem(collection.collection, i, childBase);
						if (!child) {
							continue;
						}
						addUniqueChild(res, component, node, child, i, childParent, depth, outLeaves);
					}
				}
			}
			inspectNumPropertiesChildren(res, component, param, node, diagnosticIndex, depth, outLeaves);
		}
		if (isLeafParam(node)) {
			outLeaves.push(node);
		}
		return node;
	}

	function isLeafParam(node) {
		if (!node) {
			return false;
		}
		if (node.children && node.children.length && !node.hasGetValue && !node.hasSetValue) {
			return false;
		}
		return true;
	}

	function normalizeIdentity(componentHint, parameterName, parameterMatchName) {
		if (componentHint && typeof componentHint === "object" &&
				(componentHint.componentDisplayName || componentHint.componentMatchName ||
					componentHint.parameterDisplayName || componentHint.parameter ||
					componentHint.component)) {
			return {
				componentDisplayName: trimmed(componentHint.componentDisplayName || componentHint.component || ""),
				componentMatchName: trimmed(componentHint.componentMatchName || ""),
				parameterDisplayName: trimmed(componentHint.parameterDisplayName || componentHint.parameter || parameterName || ""),
				parameterMatchName: trimmed(componentHint.parameterMatchName || parameterMatchName || "")
			};
		}
		return {
			componentDisplayName: trimmed(componentHint),
			componentMatchName: "",
			parameterDisplayName: trimmed(parameterName),
			parameterMatchName: trimmed(parameterMatchName)
		};
	}

	function componentMatchesIdentity(displayName, matchName, ident) {
		var wantDisplay;
		var wantMatch;
		if (!ident) {
			return false;
		}
		wantDisplay = trimmed(ident.componentDisplayName);
		wantMatch = trimmed(ident.componentMatchName);
		if (!wantDisplay && !wantMatch) {
			return false;
		}
		if (wantDisplay && wantMatch) {
			return displayName === wantDisplay && matchName === wantMatch;
		}
		if (wantMatch) {
			return matchName === wantMatch;
		}
		return displayName === wantDisplay || matchName === wantDisplay;
	}

	function selectComponents(trackItem, ident) {
		var res = resolver();
		var components;
		var countInfo;
		var indexBase;
		var i;
		var component;
		var displayName;
		var matchName;
		var selected;
		if (!res || !trackItem || !ident) {
			return [];
		}
		try {
			components = trackItem.components;
		} catch (compErr) {
			return [];
		}
		countInfo = res.collectionCount(components);
		if (countInfo.count < 0) {
			return [];
		}
		indexBase = res.collectionIndexBase(components, countInfo.count);
		selected = [];
		for (i = 0; i < countInfo.count; i++) {
			component = res.collectionItem(components, i, indexBase);
			displayName = res.readString(component, "displayName") || "";
			matchName = res.readString(component, "matchName") || "";
			if (!componentMatchesIdentity(displayName, matchName, ident)) {
				continue;
			}
			selected.push({
				component: component,
				displayName: displayName,
				matchName: matchName
			});
		}
		return selected;
	}

	function selectParameter(leaves, ident) {
		var wantName = ident ? trimmed(ident.parameterDisplayName) : "";
		var wantMatch = ident ? trimmed(ident.parameterMatchName) : "";
		var matches = [];
		var i;
		var leaf;
		var paramName;
		var paramMatch;
		if (!wantName && !wantMatch) {
			return null;
		}
		for (i = 0; i < (leaves ? leaves.length : 0); i++) {
			leaf = leaves[i];
			if (!leaf || !leaf._param) {
				continue;
			}
			if (leaf.displayName === leaf.componentDisplayName &&
					leaf.matchName === leaf.componentMatchName &&
					!leaf.hasGetValue && !leaf.hasSetValue) {
				continue;
			}
			paramName = leaf.displayName || "";
			paramMatch = leaf.matchName || "";
			if (wantMatch) {
				if (paramMatch === wantMatch && (!wantName || paramName === wantName)) {
					matches.push(leaf);
				}
				continue;
			}
			if (wantName && paramName === wantName) {
				matches.push(leaf);
			}
		}
		if (matches.length === 1) {
			return matches[0];
		}
		if (matches.length > 1) {
			return { ambiguous: true, matchCount: matches.length };
		}
		return null;
	}

	function inspectComponent(res, component, outLeaves) {
		var displayName = res.readString(component, "displayName") || "";
		var matchName = res.readString(component, "matchName") || "";
		var fakeRoot;
		var colorMatch = looksLikeColorComponent(displayName, matchName);
		fakeRoot = {
			displayName: displayName,
			matchName: matchName,
			properties: undefined
		};
		try {
			fakeRoot.properties = component.properties;
		} catch (ignoreProps) {}
		try {
			if (!fakeRoot.properties) {
				fakeRoot.children = component.children;
			}
		} catch (ignoreChildren) {}
		try {
			if (typeof component.numProperties === "number") {
				fakeRoot.numProperties = component.numProperties;
				if (hasFn(component, "property")) {
					fakeRoot.property = function (index) {
						return component.property(index);
					};
				}
			}
		} catch (ignoreNum) {}
		inspectNode(
			res,
			{ displayName: displayName, matchName: matchName },
			fakeRoot,
			0,
			null,
			0,
			outLeaves
		);
		return {
			displayName: displayName,
			matchName: matchName,
			colorRelated: colorMatch.matched,
			matchedBy: colorMatch.reason,
			nested: fakeRoot
		};
	}

	function inspectTrackItem(trackItem) {
		var res = resolver();
		var mediaType;
		var components;
		var countInfo;
		var indexBase;
		var i;
		var component;
		var displayName;
		var matchName;
		var colorMatch;
		var clipComponents;
		var matched;
		var leaves;
		var componentLeaves;
		var inspected;
		var leafIndex;
		if (!res) {
			return fail("EFFECT_NOT_FOUND", "ParameterResolver is not loaded.");
		}
		if (!trackItem) {
			return fail("NO_VIDEO_SELECTION", "No TrackItem was provided.");
		}
		mediaType = res.readString(trackItem, "mediaType");
		if (mediaType !== "Video") {
			return fail("NO_VIDEO_SELECTION", "TrackItem.mediaType is " + String(mediaType) + ", expected Video.");
		}
		try {
			components = trackItem.components;
		} catch (compErr) {
			return fail("EFFECT_NOT_FOUND", "TrackItem.components threw: " + String(compErr));
		}
		countInfo = res.collectionCount(components);
		if (countInfo.count < 0) {
			return fail("EFFECT_NOT_FOUND", "Could not read components.");
		}
		indexBase = res.collectionIndexBase(components, countInfo.count);
		clipComponents = [];
		matched = [];
		leaves = [];
		for (i = 0; i < countInfo.count; i++) {
			component = res.collectionItem(components, i, indexBase);
			displayName = res.readString(component, "displayName") || "";
			matchName = res.readString(component, "matchName") || "";
			colorMatch = looksLikeColorComponent(displayName, matchName);
			clipComponents.push({
				displayName: displayName,
				matchName: matchName,
				colorRelated: colorMatch.matched,
				matchedBy: colorMatch.reason
			});
			if (!colorMatch.matched) {
				continue;
			}
			componentLeaves = [];
			inspected = inspectComponent(res, component, componentLeaves);
			inspected._component = component;
			matched.push(inspected);
			for (leafIndex = 0; leafIndex < componentLeaves.length; leafIndex++) {
				leaves.push(componentLeaves[leafIndex]);
			}
		}
		return {
			ok: matched.length > 0,
			operation: OPERATION,
			usedQE: false,
			productionEnabled: false,
			settersCalled: false,
			clip: {
				name: res.readString(trackItem, "name") || "",
				mediaType: mediaType
			},
			clipComponents: clipComponents,
			matchedComponents: matched,
			_leaves: leaves,
			writesPerformed: false
		};
	}

	function parameterIdentityKey(row) {
		return String(row && row.displayName ? row.displayName : "") + "\0" + String(row && row.matchName ? row.matchName : "");
	}

	function annotateUniqueness(rows) {
		var counts = {};
		var i;
		var key;
		for (i = 0; i < (rows ? rows.length : 0); i++) {
			key = parameterIdentityKey(rows[i]);
			counts[key] = (counts[key] || 0) + 1;
		}
		for (i = 0; i < (rows ? rows.length : 0); i++) {
			key = parameterIdentityKey(rows[i]);
			rows[i].matchCountForName = counts[key];
			rows[i].unambiguous = counts[key] === 1;
		}
	}

	function collectSections(parameters) {
		var seen = {};
		var out = [];
		var i;
		var name;
		var path;
		for (i = 0; i < (parameters ? parameters.length : 0); i++) {
			name = (parameters[i] && (parameters[i].parent || parameters[i].group)) || "";
			path = (parameters[i] && parameters[i].hierarchyPath) || "";
			if (!name) {
				continue;
			}
			if (seen.hasOwnProperty(name)) {
				continue;
			}
			seen[name] = true;
			out.push({
				displayName: name,
				sampleHierarchy: path
			});
		}
		return out;
	}

	function buildReport(inspected) {
		var parameters = [];
		var candidates = [];
		var rejected = [];
		var i;
		var row;
		var primary;
		var nested;
		if (!inspected || inspected.ok !== true) {
			if (inspected && inspected.clipComponents) {
				inspected.reason = inspected.reason || "EFFECT_NOT_FOUND";
				inspected.detail = inspected.detail || "No Color/Lumetri component was found on the selected clip.";
				inspected.parameters = [];
				inspected.candidates = [];
				inspected.rejected = [];
				inspected.usedQE = false;
				inspected.productionEnabled = false;
				inspected.settersCalled = false;
				inspected.writesPerformed = false;
			}
			return inspected;
		}
		for (i = 0; i < inspected._leaves.length; i++) {
			row = publicSnapshot(inspected._leaves[i]);
			if (!row) {
				continue;
			}
			if (!row.displayName && row.classification === "EMPTY_DISPLAY_NAME") {
				rejected.push(row);
				parameters.push(row);
				continue;
			}
			if (row.displayName === row.componentDisplayName &&
					row.matchName === row.componentMatchName &&
					!row.hasGetValue && !row.hasSetValue) {
				continue;
			}
			parameters.push(row);
			if (row.candidate === true) {
				candidates.push(row);
			} else {
				rejected.push(row);
			}
		}
		annotateUniqueness(parameters);
		annotateUniqueness(candidates);
		annotateUniqueness(rejected);
		primary = inspected.matchedComponents[0];
		nested = [];
		for (i = 0; i < inspected.matchedComponents.length; i++) {
			nested.push({
				displayName: inspected.matchedComponents[i].displayName,
				matchName: inspected.matchedComponents[i].matchName,
				matchedBy: inspected.matchedComponents[i].matchedBy
			});
		}
		return {
			ok: true,
			operation: OPERATION,
			usedQE: false,
			productionEnabled: false,
			settersCalled: false,
			writesPerformed: false,
			classifierUsed: "NumericCandidateClassifier.classify",
			clip: inspected.clip,
			component: {
				displayName: primary.displayName,
				matchName: primary.matchName,
				matchedBy: primary.matchedBy
			},
			components: nested,
			sections: collectSections(parameters),
			clipComponents: inspected.clipComponents,
			parameters: parameters,
			candidates: candidates,
			unambiguousCandidates: (function () {
				var list = [];
				var n;
				for (n = 0; n < candidates.length; n++) {
					if (candidates[n].unambiguous === true) {
						list.push(candidates[n]);
					}
				}
				return list;
			}()),
			ambiguousCandidates: (function () {
				var list = [];
				var n;
				for (n = 0; n < candidates.length; n++) {
					if (candidates[n].unambiguous !== true) {
						list.push(candidates[n]);
					}
				}
				return list;
			}()),
			rejected: rejected,
			confirmation: "LIVE_PREMIERE_READ"
		};
	}

	function resolutionMeta(ident, extra) {
		var chosen = extra || {};
		return {
			resolverUsed: "ColorParameterDiscover.resolve",
			globalSearchUsed: false,
			componentResolution: {
				requestedDisplayName: ident ? ident.componentDisplayName : "",
				requestedMatchName: ident ? ident.componentMatchName : "",
				resolved: chosen.resolved === true,
				resolvedDisplayName: chosen.resolvedDisplayName || "",
				resolvedMatchName: chosen.resolvedMatchName || ""
			},
			parameterResolution: {
				requestedDisplayName: ident ? ident.parameterDisplayName : "",
				requestedMatchName: ident ? ident.parameterMatchName : "",
				scope: "component",
				globalSearchUsed: false,
				matchesInsideComponent: chosen.matchesInsideComponent === undefined ? 0 : chosen.matchesInsideComponent
			}
		};
	}

	function resolveFail(reason, detail, ident, extra) {
		var payload = {
			ok: false,
			reason: reason || "PARAMETER_NOT_FOUND",
			detail: detail ? String(detail) : "",
			identity: ident,
			operation: "color.parameter.discover"
		};
		var meta = resolutionMeta(ident, extra);
		payload.resolverUsed = meta.resolverUsed;
		payload.globalSearchUsed = false;
		payload.componentResolution = meta.componentResolution;
		payload.parameterResolution = meta.parameterResolution;
		if (extra && extra.matchCount !== undefined) {
			payload.matchCount = extra.matchCount;
		}
		if (extra && extra.componentMatchCount !== undefined) {
			payload.componentMatchCount = extra.componentMatchCount;
		}
		return payload;
	}

	function inspect(trackItem) {
		return buildReport(inspectTrackItem(trackItem));
	}

	function resolve(trackItem, componentHint, parameterName, parameterMatchName) {
		var res = resolver();
		var ident = normalizeIdentity(componentHint, parameterName, parameterMatchName);
		var mediaType;
		var selected;
		var leaves;
		var leaf;
		var snapshot;
		var chosen;
		var payload;
		var meta;
		if (!res) {
			return resolveFail("EFFECT_NOT_FOUND", "ParameterResolver is not loaded.", ident);
		}
		if (!trackItem) {
			return resolveFail("NO_VIDEO_SELECTION", "No TrackItem was provided.", ident);
		}
		mediaType = res.readString(trackItem, "mediaType");
		if (mediaType !== "Video") {
			return resolveFail("NO_VIDEO_SELECTION", "TrackItem.mediaType is " + String(mediaType) + ", expected Video.", ident);
		}
		if (!ident.componentDisplayName && !ident.componentMatchName) {
			return resolveFail(
				"NO_SAFE_IDENTITY",
				"Color write resolution requires component identity. Parameter displayName alone is not used.",
				ident
			);
		}
		if (!ident.parameterDisplayName && !ident.parameterMatchName) {
			return resolveFail("PARAMETER_NOT_FOUND", "Parameter displayName is required.", ident);
		}
		selected = selectComponents(trackItem, ident);
		if (!selected.length) {
			return resolveFail(
				"PARAMETER_NOT_FOUND",
				'No component matching displayName "' + ident.componentDisplayName +
					'" and matchName "' + ident.componentMatchName + '".',
				ident,
				{ matchCount: 0, componentMatchCount: 0, matchesInsideComponent: 0 }
			);
		}
		if (selected.length > 1) {
			return resolveFail(
				"PARAMETER_NOT_FOUND",
				'Component identity "' + ident.componentDisplayName + '" / "' +
					ident.componentMatchName + '" is ambiguous across ' + selected.length + " components.",
				ident,
				{ matchCount: selected.length, componentMatchCount: selected.length, matchesInsideComponent: 0 }
			);
		}
		chosen = selected[0];
		leaves = [];
		inspectComponent(res, chosen.component, leaves);
		leaf = selectParameter(leaves, ident);
		if (leaf && leaf.ambiguous) {
			return resolveFail(
				"PARAMETER_NOT_FOUND",
				'Parameter displayName "' + ident.parameterDisplayName +
					'" is ambiguous across ' + leaf.matchCount + ' parameters inside component "' +
					chosen.displayName + '" / "' + chosen.matchName + '".',
				ident,
				{
					resolved: true,
					resolvedDisplayName: chosen.displayName,
					resolvedMatchName: chosen.matchName,
					matchCount: leaf.matchCount,
					matchesInsideComponent: leaf.matchCount
				}
			);
		}
		if (!leaf || !leaf._param) {
			return resolveFail(
				"PARAMETER_NOT_FOUND",
				'No parameter with displayName "' + ident.parameterDisplayName +
					'" inside component "' + chosen.displayName + '" / "' + chosen.matchName + '".',
				ident,
				{
					resolved: true,
					resolvedDisplayName: chosen.displayName,
					resolvedMatchName: chosen.matchName,
					matchesInsideComponent: 0
				}
			);
		}
		snapshot = publicSnapshot(leaf);
		payload = {
			ok: true,
			effect: {
				displayName: chosen.displayName,
				matchName: chosen.matchName
			},
			parameter: {
				displayName: leaf.displayName,
				matchName: leaf.matchName || ""
			},
			identity: {
				componentDisplayName: chosen.displayName,
				componentMatchName: chosen.matchName,
				parameterDisplayName: leaf.displayName,
				parameterMatchName: leaf.matchName || ""
			},
			snapshot: snapshot,
			_param: leaf._param,
			_component: chosen.component
		};
		meta = resolutionMeta(ident, {
			resolved: true,
			resolvedDisplayName: chosen.displayName,
			resolvedMatchName: chosen.matchName,
			matchesInsideComponent: 1
		});
		payload.resolverUsed = meta.resolverUsed;
		payload.globalSearchUsed = false;
		payload.componentResolution = meta.componentResolution;
		payload.parameterResolution = meta.parameterResolution;
		return payload;
	}

	function uniqueStrings(values) {
		var seen = {};
		var out = [];
		var i;
		var value;
		for (i = 0; i < (values ? values.length : 0); i++) {
			value = values[i] === undefined || values[i] === null ? "" : String(values[i]);
			if (seen.hasOwnProperty(value)) {
				continue;
			}
			seen[value] = true;
			out.push(value);
		}
		return out;
	}

	function saturationMatchRow(leaf, matchIndex) {
		var row = publicSnapshot(leaf);
		var parent = leaf.parent || "";
		var group = leaf.group || parent;
		var path = leaf.hierarchyPath || "";
		if (!row) {
			row = {};
		}
		row.displayName = leaf.displayName;
		row.matchName = leaf.matchName || "";
		row.runtimeType = leaf.runtimeType;
		row.currentValue = leaf.currentValue;
		row.valueShape = leaf.valueShape;
		row.parent = parent;
		row.group = group;
		row.parentMatchName = leaf.parentMatchName || "";
		row.hierarchyPath = path;
		row.hasGetValue = leaf.hasGetValue === true;
		row.hasSetValue = leaf.hasSetValue === true;
		row.hasGetValueAtTime = leaf.hasGetValueAtTime === true;
		row.hasSetValueAtKey = leaf.hasSetValueAtKey === true;
		row.timeVarying = leaf.timeVarying === true;
		row.diagnosticIndex = leaf.diagnosticIndex;
		row.matchIndex = matchIndex;
		row.parameterMatchNameAvailable = trimmed(leaf.matchName) !== "";
		row.isBasicCorrectionSaturation = looksLikeBasicCorrection(parent) || pathHasBasicCorrection(path);
		row.identity = {
			componentDisplayName: leaf.componentDisplayName,
			componentMatchName: leaf.componentMatchName,
			parameterDisplayName: leaf.displayName,
			parameterMatchName: leaf.matchName || "",
			parent: parent,
			group: group,
			hierarchyPath: path
		};
		if (leaf.raw) {
			row.raw = leaf.raw;
		}
		if (leaf.reflection) {
			row.reflection = leaf.reflection;
		}
		if (leaf.typeMetadata) {
			row.typeMetadata = leaf.typeMetadata;
		}
		return row;
	}

	function inspectSaturationMatches(trackItem) {
		var res = resolver();
		var ident = {
			componentDisplayName: "Lumetri Color",
			componentMatchName: "AE.ADBE Lumetri",
			parameterDisplayName: "Saturation",
			parameterMatchName: ""
		};
		var mediaType;
		var selected;
		var chosen;
		var leaves;
		var matches;
		var i;
		var leaf;
		var rows;
		var parents;
		var groups;
		var paths;
		var matchNames;
		var usableMatchNames;
		var basicCount;
		var parentDifferentiates;
		var groupDifferentiates;
		var hierarchyDifferentiates;
		if (!res) {
			return {
				ok: false,
				operation: "color.saturation.matches",
				reason: "EFFECT_NOT_FOUND",
				detail: "ParameterResolver is not loaded.",
				usedQE: false,
				productionEnabled: false,
				settersCalled: false,
				writesPerformed: false,
				matchCount: 0,
				matches: []
			};
		}
		if (!trackItem) {
			return {
				ok: false,
				operation: "color.saturation.matches",
				reason: "NO_VIDEO_SELECTION",
				detail: "No TrackItem was provided.",
				usedQE: false,
				productionEnabled: false,
				settersCalled: false,
				writesPerformed: false,
				component: {
					displayName: ident.componentDisplayName,
					matchName: ident.componentMatchName
				},
				matchCount: 0,
				matches: []
			};
		}
		mediaType = res.readString(trackItem, "mediaType");
		if (mediaType !== "Video") {
			return {
				ok: false,
				operation: "color.saturation.matches",
				reason: "NO_VIDEO_SELECTION",
				detail: "TrackItem.mediaType is " + String(mediaType) + ", expected Video.",
				usedQE: false,
				productionEnabled: false,
				settersCalled: false,
				writesPerformed: false,
				component: {
					displayName: ident.componentDisplayName,
					matchName: ident.componentMatchName
				},
				matchCount: 0,
				matches: []
			};
		}
		selected = selectComponents(trackItem, ident);
		if (!selected.length) {
			return {
				ok: false,
				operation: "color.saturation.matches",
				reason: "EFFECT_NOT_FOUND",
				detail: 'No component matching displayName "Lumetri Color" and matchName "AE.ADBE Lumetri".',
				usedQE: false,
				productionEnabled: false,
				settersCalled: false,
				writesPerformed: false,
				component: {
					displayName: ident.componentDisplayName,
					matchName: ident.componentMatchName
				},
				matchCount: 0,
				matches: []
			};
		}
		if (selected.length > 1) {
			return {
				ok: false,
				operation: "color.saturation.matches",
				reason: "EFFECT_NOT_FOUND",
				detail: "Lumetri Color / AE.ADBE Lumetri is ambiguous across " + selected.length + " components.",
				usedQE: false,
				productionEnabled: false,
				settersCalled: false,
				writesPerformed: false,
				component: {
					displayName: ident.componentDisplayName,
					matchName: ident.componentMatchName
				},
				matchCount: 0,
				matches: []
			};
		}
		chosen = selected[0];
		leaves = [];
		inspectComponent(res, chosen.component, leaves);
		matches = [];
		for (i = 0; i < leaves.length; i++) {
			leaf = leaves[i];
			if (!leaf || !leaf._param) {
				continue;
			}
			if (leaf.displayName === leaf.componentDisplayName &&
					leaf.matchName === leaf.componentMatchName &&
					!leaf.hasGetValue && !leaf.hasSetValue) {
				continue;
			}
			if (leaf.displayName !== ident.parameterDisplayName) {
				continue;
			}
			matches.push(leaf);
		}
		rows = [];
		parents = [];
		groups = [];
		paths = [];
		matchNames = [];
		basicCount = 0;
		for (i = 0; i < matches.length; i++) {
			rows.push(saturationMatchRow(matches[i], i));
			parents.push(matches[i].parent || "");
			groups.push(matches[i].group || matches[i].parent || "");
			paths.push(matches[i].hierarchyPath || "");
			matchNames.push(matches[i].matchName || "");
			if (rows[i].isBasicCorrectionSaturation) {
				basicCount += 1;
			}
		}
		usableMatchNames = [];
		for (i = 0; i < matchNames.length; i++) {
			if (trimmed(matchNames[i])) {
				usableMatchNames.push(matchNames[i]);
			}
		}
		parentDifferentiates = uniqueStrings(parents).length > 1;
		groupDifferentiates = uniqueStrings(groups).length > 1;
		hierarchyDifferentiates = uniqueStrings(paths).length > 1;
		return {
			ok: true,
			operation: "color.saturation.matches",
			usedQE: false,
			productionEnabled: false,
			settersCalled: false,
			writesPerformed: false,
			component: {
				displayName: chosen.displayName,
				matchName: chosen.matchName
			},
			requestedIdentity: ident,
			matchCount: rows.length,
			matches: rows,
			parameterMatchNameAvailable: usableMatchNames.length > 0,
			usableParameterMatchNames: uniqueStrings(usableMatchNames),
			parentDifferentiates: parentDifferentiates,
			groupDifferentiates: groupDifferentiates,
			hierarchyDifferentiates: hierarchyDifferentiates,
			basicCorrectionMatchCount: basicCount,
			chosen: false,
			resolverWouldBeAmbiguous: rows.length !== 1,
			confirmation: "LIVE_PREMIERE_READ"
		};
	}

	function candidatesOf(trackItem) {
		var report = inspect(trackItem);
		return report;
	}

	return {
		OPERATION: OPERATION,
		SATURATION_OPERATION: "color.saturation.matches",
		inspect: inspect,
		inspectSaturationMatches: inspectSaturationMatches,
		resolve: resolve,
		classifySnapshot: classifySnapshot,
		looksLikeColorComponent: looksLikeColorComponent,
		candidatesOf: candidatesOf
	};
}());

if (typeof $ !== "undefined") {
	$._pickfxColorParameterDiscover = ColorParameterDiscover;
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = ColorParameterDiscover;
}
