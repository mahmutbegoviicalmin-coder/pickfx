var BlendModeDiagnostic = (function () {
	var OPERATION = "blendmode.parameter.diagnose";
	var OPACITY_DISPLAY = "Opacity";
	var OPACITY_MATCH = "AE.ADBE Opacity";
	var BLEND_MODE_DISPLAY = "Blend Mode";
	var MAX_DEPTH = 8;
	var MAX_CHILDREN = 128;
	var NESTED_COLLECTION_NAMES = ["properties", "children"];
	var FALLBACK_COLLECTION_NAMES = ["parameters"];
	var NOT_EXPOSED = "BLEND_MODE_NOT_EXPOSED_AS_COMPONENT_PARAM";
	var METADATA_UNAVAILABLE = "BLEND_MODE_ENUM_METADATA_UNAVAILABLE";
	var METADATA_AVAILABLE = "BLEND_MODE_ENUM_METADATA_AVAILABLE";
	var READ_METHOD_NAMES = [
		"getValue", "getValueAtTime", "getKeys", "isTimeVarying", "areKeyframesSupported",
		"getValueNames", "getOptions", "getItems", "getItem", "getListItem", "getValueName",
		"getColorValue", "property"
	];
	var WRITE_METHOD_NAMES = [
		"setValue", "setValueAtKey", "addKey", "setTimeVarying", "setColorValue",
		"setInterpolationTypeAtKey", "removeKey"
	];
	var METADATA_FIELD_NAMES = [
		"items", "valueNames", "options", "enumItems", "listItems"
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

	function hasExposed(obj, name) {
		try {
			return obj[name] !== undefined && obj[name] !== null;
		} catch (e) {
			return false;
		}
	}

	function jsonSafe(value) {
		if (value === undefined) {
			return undefined;
		}
		if (value === null) {
			return null;
		}
		if (typeof value === "number" || typeof value === "boolean" || typeof value === "string") {
			return value;
		}
		try {
			return String(value);
		} catch (e) {
			return null;
		}
	}

	function parentLabel(parentInfo) {
		if (!parentInfo) {
			return "";
		}
		return parentInfo.parameterDisplayName || "";
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

	function probeMetadataSource(param, name) {
		var out = {
			name: name,
			typeofValue: typeOfFn(param, name),
			present: false,
			read: null,
			error: null
		};
		var raw;
		var i;
		var list;
		try {
			if (hasFn(param, name)) {
				out.present = true;
				if (name === "getItem" || name === "getListItem" || name === "getValueName") {
					out.called = false;
					out.note = "indexed getter; not invoked without a live option index";
					return out;
				}
				try {
					raw = param[name]();
					out.called = true;
					out.read = jsonSafe(raw);
					if (raw && typeof raw !== "string" && typeof raw !== "number" && raw.length !== undefined) {
						list = [];
						for (i = 0; i < raw.length && i < 64; i++) {
							list.push(jsonSafe(raw[i]));
						}
						out.read = list;
						out.length = raw.length;
					}
				} catch (callErr) {
					out.called = true;
					out.error = String(callErr);
				}
				return out;
			}
			if (hasExposed(param, name)) {
				out.present = true;
				raw = param[name];
				if (raw && typeof raw !== "string" && typeof raw !== "number" && raw.length !== undefined) {
					list = [];
					for (i = 0; i < raw.length && i < 64; i++) {
						list.push(jsonSafe(raw[i]));
					}
					out.read = list;
					out.length = raw.length;
				} else {
					out.read = jsonSafe(raw);
				}
			}
		} catch (e) {
			out.error = String(e);
		}
		return out;
	}

	function extractEnumMetadata(param) {
		var sources = {
			items: probeMetadataSource(param, "items"),
			valueNames: probeMetadataSource(param, "valueNames"),
			options: probeMetadataSource(param, "options"),
			enumItems: probeMetadataSource(param, "enumItems"),
			listItems: probeMetadataSource(param, "listItems"),
			getItem: probeMetadataSource(param, "getItem"),
			getListItem: probeMetadataSource(param, "getListItem"),
			getValueName: probeMetadataSource(param, "getValueName"),
			getValueNames: probeMetadataSource(param, "getValueNames"),
			getOptions: probeMetadataSource(param, "getOptions"),
			getItems: probeMetadataSource(param, "getItems")
		};
		var options = [];
		var res = resolver();
		if (res && res.inspectRealEnumOptions) {
			try {
				options = res.inspectRealEnumOptions(param) || [];
			} catch (ignoreOpts) {
				options = [];
			}
		}
		return {
			sources: sources,
			options: options,
			hasSafeOptions: !!(options && options.length >= 2),
			optionCount: options ? options.length : 0
		};
	}

	function collectMethods(param) {
		var out = [];
		var i;
		var name;
		for (i = 0; i < READ_METHOD_NAMES.length; i++) {
			name = READ_METHOD_NAMES[i];
			out.push({
				name: name,
				typeofValue: typeOfFn(param, name),
				writable: false
			});
		}
		for (i = 0; i < WRITE_METHOD_NAMES.length; i++) {
			name = WRITE_METHOD_NAMES[i];
			out.push({
				name: name,
				typeofValue: typeOfFn(param, name),
				writable: true,
				invoked: false
			});
		}
		return out;
	}

	function collectFields(param) {
		var out = {};
		var i;
		var name;
		for (i = 0; i < METADATA_FIELD_NAMES.length; i++) {
			name = METADATA_FIELD_NAMES[i];
			out[name] = {
				typeofValue: typeOfFn(param, name),
				present: hasExposed(param, name)
			};
		}
		return out;
	}

	function slimReflection(dump) {
		if (!dump) {
			return undefined;
		}
		return {
			objectClass: dump.reflection ? dump.reflection.objectClass : undefined,
			constructorName: dump.reflection ? dump.reflection.constructorName : undefined,
			objectKeys: dump.objectKeys || [],
			ownPropertyNames: dump.ownPropertyNames || [],
			forInKeys: dump.forInKeys || [],
			candidateMetadata: dump.candidateMetadata || {}
		};
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

	function childAlreadyPresent(node, child) {
		var i;
		var existing;
		for (i = 0; i < (node && node.children ? node.children.length : 0); i++) {
			existing = node.children[i];
			if (existing && existing._param === child) {
				return true;
			}
		}
		return false;
	}

	function inspectNode(res, component, param, diagnosticIndex, parentInfo, depth, outNodes) {
		var displayName;
		var matchName;
		var getValue;
		var getErr;
		var detected;
		var node;
		var dump;
		var c;
		var names;
		var collection;
		var childCount;
		var childBase;
		var i;
		var child;
		var childParent;
		var walked;
		var timeVarying;
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
		if (typeof ParameterValueType !== "undefined" && ParameterValueType.detectLive) {
			detected = ParameterValueType.detectLive(param, getValue);
		} else if (typeof ParameterValueType !== "undefined" && ParameterValueType.detect) {
			detected = ParameterValueType.detect(getValue);
		} else {
			detected = { type: typeof getValue, value: getValue };
		}
		timeVarying = { available: hasFn(param, "isTimeVarying"), value: false };
		if (timeVarying.available) {
			try {
				timeVarying.value = !!param.isTimeVarying();
			} catch (tvErr) {
				timeVarying.error = String(tvErr);
			}
		}
		node = {
			displayName: displayName,
			matchName: matchName,
			componentDisplayName: component.displayName,
			componentMatchName: component.matchName,
			parent: parentLabel(parentInfo),
			group: parentLabel(parentInfo),
			hierarchyPath: joinHierarchy(parentInfo, displayName),
			diagnosticIndex: diagnosticIndex,
			depth: depth,
			runtimeType: detected && detected.type ? detected.type : (getErr ? "error" : "unknown"),
			typeofGetValue: typeOfFn(param, "getValue"),
			typeofSetValue: typeOfFn(param, "setValue"),
			currentValue: jsonSafe(detected ? detected.value : getValue),
			valueShape: detected ? detected.valueShape : undefined,
			hasGetValue: hasFn(param, "getValue"),
			hasSetValue: hasFn(param, "setValue"),
			isTimeVarying: timeVarying.value === true,
			getError: getErr === true,
			availableMethods: collectMethods(param),
			metadataFields: collectFields(param),
			hasGetValueNames: hasFn(param, "getValueNames"),
			hasValueNames: hasExposed(param, "valueNames"),
			hasItems: hasExposed(param, "items"),
			hasOptions: hasExposed(param, "options"),
			hasGetItems: hasFn(param, "getItems"),
			hasGetOptions: hasFn(param, "getOptions"),
			enumMetadata: extractEnumMetadata(param),
			isBlendModeDisplayName: displayName === BLEND_MODE_DISPLAY,
			isComponentParam: hasFn(param, "getValue") === true,
			children: [],
			_param: param
		};
		if (res.inspectHostObject) {
			try {
				dump = res.inspectHostObject(param, res.inspectParamCandidates ? res.inspectParamCandidates() : []);
				node.reflection = slimReflection(dump);
			} catch (ignoreDump) {}
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
					hierarchyPath: joinHierarchy(parentInfo, displayName)
				};
				for (i = 0; i < childCount; i++) {
					child = res.collectionItem(collection.collection, i, childBase);
					if (!child || childAlreadyPresent(node, child)) {
						continue;
					}
					node.children.push(inspectNode(res, component, child, i, childParent, depth + 1, outNodes));
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
						hierarchyPath: joinHierarchy(parentInfo, displayName)
					};
					for (i = 0; i < childCount; i++) {
						child = res.collectionItem(collection.collection, i, childBase);
						if (!child || childAlreadyPresent(node, child)) {
							continue;
						}
						node.children.push(inspectNode(res, component, child, i, childParent, depth + 1, outNodes));
					}
				}
			}
			inspectNumProperties(res, component, param, node, diagnosticIndex, depth, outNodes);
		}
		outNodes.push(publicNode(node));
		return node;
	}

	function inspectNumProperties(res, component, param, node, diagnosticIndex, depth, outNodes) {
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
			hierarchyPath: node.hierarchyPath || node.displayName || ""
		};
		limit = n < MAX_CHILDREN ? n : MAX_CHILDREN;
		for (i = 0; i < limit; i++) {
			try {
				child = param.property(i + base);
			} catch (ignoreChild) {
				child = undefined;
			}
			if (!child || childAlreadyPresent(node, child)) {
				continue;
			}
			node.children.push(inspectNode(res, component, child, i, childParent, depth + 1, outNodes));
		}
	}

	function publicNode(node) {
		var row;
		if (!node) {
			return null;
		}
		row = {
			displayName: node.displayName,
			matchName: node.matchName,
			componentDisplayName: node.componentDisplayName,
			componentMatchName: node.componentMatchName,
			parent: node.parent || "",
			group: node.group || "",
			hierarchyPath: node.hierarchyPath || "",
			diagnosticIndex: node.diagnosticIndex,
			depth: node.depth,
			runtimeType: node.runtimeType,
			typeofGetValue: node.typeofGetValue,
			typeofSetValue: node.typeofSetValue,
			currentValue: node.currentValue,
			valueShape: node.valueShape,
			hasGetValue: node.hasGetValue === true,
			hasSetValue: node.hasSetValue === true,
			isTimeVarying: node.isTimeVarying === true,
			getError: node.getError === true,
			availableMethods: node.availableMethods,
			metadataFields: node.metadataFields,
			hasGetValueNames: node.hasGetValueNames === true,
			hasValueNames: node.hasValueNames === true,
			hasItems: node.hasItems === true,
			hasOptions: node.hasOptions === true,
			hasGetItems: node.hasGetItems === true,
			hasGetOptions: node.hasGetOptions === true,
			enumMetadata: node.enumMetadata,
			isBlendModeDisplayName: node.isBlendModeDisplayName === true,
			isComponentParam: node.isComponentParam === true,
			reflection: node.reflection,
			childCount: node.children ? node.children.length : 0
		};
		return row;
	}

	function blendIdentity(node) {
		return {
			componentDisplayName: node.componentDisplayName,
			componentMatchName: node.componentMatchName,
			parameterDisplayName: node.displayName,
			parameterMatchName: node.matchName,
			parent: node.parent,
			group: node.group,
			hierarchyPath: node.hierarchyPath,
			runtimeType: node.runtimeType,
			typeofGetValue: node.typeofGetValue,
			typeofSetValue: node.typeofSetValue,
			currentValue: node.currentValue,
			valueShape: node.valueShape,
			hasGetValue: node.hasGetValue,
			hasSetValue: node.hasSetValue,
			isTimeVarying: node.isTimeVarying,
			availableMethods: node.availableMethods,
			metadataFields: node.metadataFields,
			hasGetValueNames: node.hasGetValueNames,
			hasValueNames: node.hasValueNames,
			hasItems: node.hasItems,
			hasOptions: node.hasOptions,
			hasGetItems: node.hasGetItems,
			hasGetOptions: node.hasGetOptions,
			enumMetadata: node.enumMetadata,
			isComponentParam: node.isComponentParam,
			reflection: node.reflection
		};
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
			readOnly: true,
			nodes: [],
			blendModeMatches: []
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

	function findOpacityComponents(res, trackItem) {
		var components;
		var countInfo;
		var indexBase;
		var i;
		var component;
		var displayName;
		var matchName;
		var matched;
		try {
			components = trackItem.components;
		} catch (compErr) {
			return { error: String(compErr), matched: [] };
		}
		countInfo = res.collectionCount(components);
		if (countInfo.count < 0) {
			return { error: "Could not read components.", matched: [] };
		}
		indexBase = res.collectionIndexBase(components, countInfo.count);
		matched = [];
		for (i = 0; i < countInfo.count; i++) {
			component = res.collectionItem(components, i, indexBase);
			displayName = res.readString(component, "displayName") || "";
			matchName = res.readString(component, "matchName") || "";
			if (displayName === OPACITY_DISPLAY && matchName === OPACITY_MATCH) {
				matched.push({
					component: component,
					displayName: displayName,
					matchName: matchName
				});
			}
		}
		return { matched: matched };
	}

	function diagnose(trackItem) {
		var res = resolver();
		var mediaType;
		var opacity;
		var fakeRoot;
		var nodes;
		var i;
		var blendMatches;
		var componentParams;
		var withMeta;
		var outcome;
		var note;
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
		opacity = findOpacityComponents(res, trackItem);
		if (opacity.error) {
			return fail("EFFECT_NOT_FOUND", opacity.error);
		}
		if (!opacity.matched.length) {
			return {
				ok: true,
				operation: OPERATION,
				readOnly: true,
				usedQE: false,
				productionEnabled: false,
				settersCalled: false,
				writesPerformed: false,
				outcome: NOT_EXPOSED,
				reason: NOT_EXPOSED,
				detail: 'No component with displayName "Opacity" and matchName "AE.ADBE Opacity". Blend Mode is not exposed as a ComponentParam on this clip.',
				opacityFound: false,
				nodeCount: 0,
				blendModeMatchCount: 0,
				blendModeComponentParamCount: 0,
				blendModeMatches: [],
				nodes: [],
				confirmation: "LIVE_PREMIERE_READ"
			};
		}
		if (opacity.matched.length > 1) {
			return fail("PARAMETER_NOT_FOUND", "Opacity / AE.ADBE Opacity is ambiguous across " + opacity.matched.length + " components.", {
				opacityFound: true,
				opacityMatchCount: opacity.matched.length
			});
		}
		nodes = [];
		fakeRoot = {
			displayName: opacity.matched[0].displayName,
			matchName: opacity.matched[0].matchName
		};
		try {
			fakeRoot.properties = opacity.matched[0].component.properties;
		} catch (ignoreProps) {}
		try {
			if (!fakeRoot.properties) {
				fakeRoot.children = opacity.matched[0].component.children;
			}
		} catch (ignoreChildren) {}
		try {
			if (typeof opacity.matched[0].component.numProperties === "number") {
				fakeRoot.numProperties = opacity.matched[0].component.numProperties;
				if (hasFn(opacity.matched[0].component, "property")) {
					fakeRoot.property = function (index) {
						return opacity.matched[0].component.property(index);
					};
				}
			}
		} catch (ignoreNum) {}
		inspectNode(
			res,
			{ displayName: OPACITY_DISPLAY, matchName: OPACITY_MATCH },
			fakeRoot,
			0,
			null,
			0,
			nodes
		);
		blendMatches = [];
		componentParams = [];
		withMeta = [];
		for (i = 0; i < nodes.length; i++) {
			if (!nodes[i] || nodes[i].isBlendModeDisplayName !== true) {
				continue;
			}
			if (nodes[i].displayName === nodes[i].componentDisplayName &&
					nodes[i].matchName === nodes[i].componentMatchName &&
					nodes[i].hasGetValue !== true) {
				continue;
			}
			if (nodes[i].isComponentParam === true) {
				componentParams.push(nodes[i]);
				if (nodes[i].enumMetadata && nodes[i].enumMetadata.hasSafeOptions === true) {
					withMeta.push(nodes[i]);
				}
			}
			blendMatches.push(blendIdentity(nodes[i]));
		}
		if (!componentParams.length) {
			outcome = NOT_EXPOSED;
			note = "No ComponentParam with displayName === \"Blend Mode\" was found under Opacity / AE.ADBE Opacity.";
		} else if (!withMeta.length) {
			outcome = METADATA_UNAVAILABLE;
			note = "Blend Mode is exposed as a ComponentParam, but inspectRealEnumOptions did not return at least two complete {value,label} options.";
		} else {
			outcome = METADATA_AVAILABLE;
			note = "Blend Mode ComponentParam exposes safely enumerable {value,label} options.";
		}
		return {
			ok: true,
			operation: OPERATION,
			readOnly: true,
			usedQE: false,
			productionEnabled: false,
			settersCalled: false,
			writesPerformed: false,
			outcome: outcome,
			reason: outcome,
			detail: note,
			opacityFound: true,
			component: {
				displayName: OPACITY_DISPLAY,
				matchName: OPACITY_MATCH
			},
			clip: {
				name: res.readString(trackItem, "name") || "",
				mediaType: mediaType
			},
			nodeCount: nodes.length,
			blendModeMatchCount: blendMatches.length,
			blendModeComponentParamCount: componentParams.length,
			blendModeMatches: blendMatches,
			nodes: nodes,
			enumDiscoverNote: "Inspect Enum Parameters reports candidateCount 0 because Blend Mode without complete enum metadata is classified ENUM_LIKE_NUMBER with candidate:false, not as a writable enum candidate.",
			confirmation: "LIVE_PREMIERE_READ"
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
		result = diagnose(selected.trackItem);
		if (typeof $._pickfx.jsonSafeParamResult === "function") {
			return JSON.stringify($._pickfx.jsonSafeParamResult(result));
		}
		return JSON.stringify(result);
	}

	return {
		OPERATION: OPERATION,
		NOT_EXPOSED: NOT_EXPOSED,
		METADATA_UNAVAILABLE: METADATA_UNAVAILABLE,
		METADATA_AVAILABLE: METADATA_AVAILABLE,
		diagnose: diagnose,
		hostDebugRun: hostDebugRun
	};
}());

if (typeof $ !== "undefined") {
	$._pickfxBlendModeDiagnostic = BlendModeDiagnostic;
	if ($._pickfx) {
		$._pickfx.diagnoseBlendMode = BlendModeDiagnostic.hostDebugRun;
	}
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = BlendModeDiagnostic;
}
