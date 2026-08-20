var MotionScaleDiscover = (function () {
	var OPERATION = "motion.scale.discover";
	var MAX_DEPTH = 4;
	var MAX_CHILDREN = 32;
	var NESTED_COLLECTION_NAMES = ["properties", "children", "parameters", "items"];

	function resolver() {
		if (typeof $._pickfxParameterResolver !== "undefined") {
			return $._pickfxParameterResolver;
		}
		return null;
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

	function fail(reason, detail) {
		return {
			ok: false,
			operation: OPERATION,
			reason: reason || "EFFECT_NOT_FOUND",
			detail: detail ? String(detail) : "",
			settersCalled: false,
			usedQE: false,
			confirmation: "LIVE_PREMIERE_READ"
		};
	}

	function isMotionComponent(displayName, matchName) {
		return displayName === "Motion" || matchName === "AE.ADBE Motion";
	}

	function readCollection(res, owner, collectionName) {
		var col;
		var countInfo;
		var indexBase;
		var probe;
		try {
			col = owner[collectionName];
		} catch (e) {
			return {
				name: collectionName,
				available: false,
				error: String(e)
			};
		}
		if (col === undefined || col === null) {
			return {
				name: collectionName,
				available: false
			};
		}
		probe = {
			name: collectionName,
			available: true,
			typeofValue: typeOfFn(owner, collectionName)
		};
		countInfo = res.collectionCount(col);
		probe.count = countInfo.count;
		probe.countVia = countInfo.via;
		if (countInfo.count < 0) {
			return probe;
		}
		indexBase = res.collectionIndexBase(col, countInfo.count);
		probe.indexBase = indexBase;
		probe.collection = col;
		probe.indexBaseDiagnostic = indexBase;
		return probe;
	}

	function inspectNumPropertiesChildren(res, component, param, snapshot, diagnosticIndex, depth) {
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
		if (snapshot.children && snapshot.children.length) {
			snapshot.nestedCollections.push({
				name: "numProperties",
				available: true,
				count: n,
				countVia: "numProperties",
				skippedWalk: "children already collected from a nested collection"
			});
			return;
		}
		snapshot.nestedCollections.push({
			name: "numProperties/property()",
			available: true,
			count: n,
			countVia: "numProperties"
		});
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
		snapshot.nestedCollections[snapshot.nestedCollections.length - 1].indexBaseDiagnostic = base;
		childParent = {
			parameterDisplayName: snapshot.parameterDisplayName,
			parameterMatchName: snapshot.parameterMatchName,
			collectionName: "numProperties/property()",
			diagnosticIndex: diagnosticIndex
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
			snapshot.children.push(inspectNode(res, component, child, i, childParent, depth + 1));
		}
	}

	function inspectNode(res, component, param, diagnosticIndex, parentInfo, depth) {
		var displayName;
		var matchName;
		var getValue;
		var getErr;
		var detected;
		var dump;
		var identity;
		var raw;
		var snapshot;
		var c;
		var collection;
		var childCount;
		var childBase;
		var i;
		var child;
		var childParent;
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
		if (typeof ParameterValueType !== "undefined" && ParameterValueType.detect) {
			detected = ParameterValueType.detect(getValue);
		} else {
			detected = { type: typeof getValue, value: getValue };
		}
		identity = res.inspectIdentity ? res.inspectIdentity(param) : undefined;
		dump = null;
		try {
			if (res.inspectHostObject) {
				dump = res.inspectHostObject(param, res.inspectParamCandidates ? res.inspectParamCandidates() : []);
			}
		} catch (ignoreDump) {}
		if (res.inspectSafeValue) {
			try {
				raw = res.inspectRaw ? res.inspectRaw(param, res.inspectSafeValue(getValue)) : null;
			} catch (ignoreRaw) {
				raw = null;
			}
		} else if (res.inspectRaw) {
			try {
				raw = res.inspectRaw(param, { value: detected ? detected.value : getValue });
			} catch (ignoreRaw2) {
				raw = null;
			}
		}
		snapshot = {
			componentDisplayName: component.displayName,
			componentMatchName: component.matchName,
			parameterDisplayName: displayName,
			parameterMatchName: matchName,
			runtimeTypeofGetValue: getErr ? "error" : (getValue === undefined && !hasFn(param, "getValue") ? "undefined" : typeof getValue),
			currentValue: detected ? detected.value : getValue,
			valueShape: detected ? detected.valueShape : undefined,
			runtimeType: detected && detected.type ? detected.type : (getErr ? "error" : "unknown"),
			hasGetValue: hasFn(param, "getValue"),
			hasSetValue: hasFn(param, "setValue"),
			hasGetValueAtTime: hasFn(param, "getValueAtTime"),
			hasSetValueAtKey: hasFn(param, "setValueAtKey"),
			areKeyframesSupported: callBool(param, "areKeyframesSupported"),
			isTimeVarying: callBool(param, "isTimeVarying"),
			parent: parentInfo || null,
			diagnosticIndex: diagnosticIndex,
			identity: identity,
			objectKeys: dump ? dump.objectKeys : [],
			ownPropertyNames: dump ? dump.ownPropertyNames : [],
			forInKeys: dump ? dump.forInKeys : [],
			prototypeChain: dump ? dump.prototypeChain : [],
			candidateMetadata: dump ? dump.candidateMetadata : {},
			reflection: dump ? dump.reflection : undefined,
			raw: raw,
			getError: getErr === true,
			children: [],
			nestedCollections: [],
			settersCalled: false
		};
		try {
			if (param.parentProperty) {
				snapshot.parentFromHost = {
					parameterDisplayName: res.readString(param.parentProperty, "displayName") || "",
					parameterMatchName: res.readString(param.parentProperty, "matchName") || ""
				};
			}
		} catch (ignoreParent) {}
		if (depth >= MAX_DEPTH) {
			snapshot.recursionStopped = true;
			return snapshot;
		}
		for (c = 0; c < NESTED_COLLECTION_NAMES.length; c++) {
			collection = readCollection(res, param, NESTED_COLLECTION_NAMES[c]);
			if (!collection.available) {
				if (collection.error) {
					snapshot.nestedCollections.push({
						name: collection.name,
						available: false,
						error: collection.error
					});
				}
				continue;
			}
			snapshot.nestedCollections.push({
				name: collection.name,
				available: true,
				typeofValue: collection.typeofValue,
				count: collection.count,
				countVia: collection.countVia,
				indexBaseDiagnostic: collection.indexBaseDiagnostic
			});
			if (!collection.collection || collection.count < 0) {
				continue;
			}
			childCount = collection.count < MAX_CHILDREN ? collection.count : MAX_CHILDREN;
			childBase = collection.indexBase;
			childParent = {
				parameterDisplayName: displayName,
				parameterMatchName: matchName,
				collectionName: collection.name,
				diagnosticIndex: diagnosticIndex
			};
			for (i = 0; i < childCount; i++) {
				child = res.collectionItem(collection.collection, i, childBase);
				if (!child) {
					continue;
				}
				snapshot.children.push(inspectNode(res, component, child, i, childParent, depth + 1));
			}
		}
		inspectNumPropertiesChildren(res, component, param, snapshot, diagnosticIndex, depth);
		return snapshot;
	}

	function findByDisplayName(nodes, wanted) {
		var i;
		var found;
		if (!nodes) {
			return null;
		}
		for (i = 0; i < nodes.length; i++) {
			if (nodes[i] && nodes[i].parameterDisplayName === wanted) {
				return nodes[i];
			}
			found = findByDisplayName(nodes[i].children, wanted);
			if (found) {
				return found;
			}
		}
		return null;
	}

	function isTwoElementValue(node) {
		var shape;
		var val;
		if (!node) {
			return false;
		}
		if (node.runtimeType === "point") {
			return true;
		}
		shape = node.valueShape;
		if (shape && (shape.kind === "point" || (shape.kind === "array" && shape.length === 2))) {
			return true;
		}
		val = node.currentValue;
		try {
			if (val && typeof val.length === "number" && val.length === 2 &&
					typeof val[0] === "number" && typeof val[1] === "number") {
				return true;
			}
		} catch (ignore) {}
		return false;
	}

	function twoElementParams(nodes, out) {
		var i;
		var node;
		if (!nodes) {
			return;
		}
		for (i = 0; i < nodes.length; i++) {
			node = nodes[i];
			if (!node) {
				continue;
			}
			if (isTwoElementValue(node)) {
				out.push({
					parameterDisplayName: node.parameterDisplayName,
					parameterMatchName: node.parameterMatchName,
					currentValue: node.currentValue,
					runtimeType: node.runtimeType,
					valueShape: node.valueShape,
					parent: node.parent
				});
			}
			twoElementParams(node.children, out);
		}
	}

	function topLevelNames(nodes) {
		var out = [];
		var i;
		for (i = 0; i < (nodes ? nodes.length : 0); i++) {
			if (nodes[i]) {
				out.push({
					parameterDisplayName: nodes[i].parameterDisplayName,
					parameterMatchName: nodes[i].parameterMatchName,
					runtimeType: nodes[i].runtimeType,
					currentValue: nodes[i].currentValue,
					hasSetValue: nodes[i].hasSetValue,
					childCount: nodes[i].children ? nodes[i].children.length : 0
				});
			}
		}
		return out;
	}

	function childNames(node) {
		var out = [];
		var i;
		if (!node || !node.children) {
			return out;
		}
		for (i = 0; i < node.children.length; i++) {
			out.push({
				parameterDisplayName: node.children[i].parameterDisplayName,
				parameterMatchName: node.children[i].parameterMatchName,
				runtimeType: node.children[i].runtimeType,
				currentValue: node.children[i].currentValue,
				hasSetValue: node.children[i].hasSetValue,
				isTimeVarying: node.children[i].isTimeVarying,
				parent: node.children[i].parent
			});
		}
		return out;
	}

	function compactNode(node) {
		if (!node) {
			return null;
		}
		return {
			componentDisplayName: node.componentDisplayName,
			componentMatchName: node.componentMatchName,
			parameterDisplayName: node.parameterDisplayName,
			parameterMatchName: node.parameterMatchName,
			runtimeTypeofGetValue: node.runtimeTypeofGetValue,
			runtimeType: node.runtimeType,
			currentValue: node.currentValue,
			valueShape: node.valueShape,
			hasGetValue: node.hasGetValue,
			hasSetValue: node.hasSetValue,
			hasGetValueAtTime: node.hasGetValueAtTime,
			hasSetValueAtKey: node.hasSetValueAtKey,
			areKeyframesSupported: node.areKeyframesSupported,
			isTimeVarying: node.isTimeVarying,
			parent: node.parent,
			parentFromHost: node.parentFromHost,
			diagnosticIndex: node.diagnosticIndex,
			childCount: node.children ? node.children.length : 0,
			nestedCollections: node.nestedCollections,
			identity: node.identity
		};
	}

	function buildAnswers(parameters, scaleNode, uniformNode) {
		var children = childNames(scaleNode);
		var two = isTwoElementValue(scaleNode);
		var representation;
		var separate = children.length > 0;
		if (!scaleNode) {
			representation = "Scale was not found as a live Motion property.";
		} else if (children.length > 0) {
			representation = "Scale exposes nested child properties. Those children are the live second-dimension candidates.";
		} else if (two) {
			representation = "No nested child parameter was found. Scale.getValue() is a 2-element array.";
		} else {
			representation = "No nested child parameter was found. Scale.getValue() is a single value. See comparison.topLevelDisplayNames for siblings.";
		}
		return {
			separateSecondScaleParameter: separate,
			secondScaleDisplayName: children.length ? children[0].parameterDisplayName : null,
			secondScaleDisplayNames: children,
			secondScaleRuntimeType: children.length ? children[0].runtimeType : (two ? (scaleNode && scaleNode.runtimeType) : null),
			secondScaleCurrentValue: children.length ? children[0].currentValue : (two ? (scaleNode && scaleNode.currentValue) : null),
			secondScaleHasSetValue: children.length ? children[0].hasSetValue : null,
			secondScaleTimeVarying: children.length ? children[0].isTimeVarying : (scaleNode ? scaleNode.isTimeVarying : null),
			secondScaleIsChildOrGroup: children.length > 0,
			scaleFound: !!scaleNode,
			uniformScaleFound: !!uniformNode,
			scaleValueIsTwoElementArray: two,
			howSecondDimensionIsRepresented: representation
		};
	}

	function discover(trackItem) {
		var res = resolver();
		var mediaType;
		var components;
		var countInfo;
		var indexBase;
		var i;
		var component;
		var displayName;
		var matchName;
		var props;
		var propertyCount;
		var propertyBase;
		var p;
		var param;
		var componentInfo;
		var parameters;
		var scaleNode;
		var uniformNode;
		var twoValues;
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
		componentInfo = null;
		parameters = [];
		for (i = 0; i < countInfo.count; i++) {
			component = res.collectionItem(components, i, indexBase);
			displayName = res.readString(component, "displayName") || "";
			matchName = res.readString(component, "matchName") || "";
			if (!isMotionComponent(displayName, matchName)) {
				continue;
			}
			componentInfo = {
				displayName: displayName,
				matchName: matchName,
				diagnosticIndex: i
			};
			try {
				props = component.properties;
			} catch (propsErr) {
				return fail("EFFECT_NOT_FOUND", "Motion Component.properties threw: " + String(propsErr));
			}
			propertyCount = res.collectionCount(props);
			if (propertyCount.count < 0) {
				return fail("EFFECT_NOT_FOUND", "Could not read Motion properties.");
			}
			propertyBase = res.collectionIndexBase(props, propertyCount.count);
			for (p = 0; p < propertyCount.count; p++) {
				param = res.collectionItem(props, p, propertyBase);
				if (!param) {
					continue;
				}
				parameters.push(inspectNode(res, componentInfo, param, p, null, 0));
			}
			break;
		}
		if (!componentInfo) {
			return fail("PARAMETER_NOT_FOUND", 'No component with displayName "Motion".');
		}
		scaleNode = findByDisplayName(parameters, "Scale");
		uniformNode = findByDisplayName(parameters, "Uniform Scale");
		twoValues = [];
		twoElementParams(parameters, twoValues);
		return {
			ok: true,
			operation: OPERATION,
			clip: {
				name: res.readString(trackItem, "name") || "",
				mediaType: mediaType
			},
			component: {
				displayName: componentInfo.displayName,
				matchName: componentInfo.matchName
			},
			parameters: parameters,
			comparison: {
				scale: compactNode(scaleNode),
				uniformScale: compactNode(uniformNode),
				scaleChildren: childNames(scaleNode),
				topLevelDisplayNames: topLevelNames(parameters),
				twoElementValues: twoValues
			},
			answers: buildAnswers(parameters, scaleNode, uniformNode),
			settersCalled: false,
			usedQE: false,
			confirmation: "LIVE_PREMIERE_READ"
		};
	}

	return {
		discover: discover,
		buildAnswers: buildAnswers
	};
}());

if (typeof $ !== "undefined") {
	$._pickfxMotionScaleDiscover = MotionScaleDiscover;
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = MotionScaleDiscover;
}
