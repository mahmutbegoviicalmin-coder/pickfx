var EnumWriteTestWiring = (function () {
	var BUTTON_ID = "test-enum-parameter-write-btn";
	var HANDLER = "invokeEnumParameterWriteTest";
	var BRIDGE_METHOD = "testEnumParameterWrite";
	var BRIDGE_PATH = "enum-parameter-write-test";
	var GENERIC_BRIDGE_METHOD = "testParameterWrite";
	var GENERIC_BRIDGE_PATH = "generic-parameter-write-test";
	var HOST_FUNCTION = "debugEnumParameterWriteTest";
	var GENERIC_HOST_FUNCTION = "testParameterWrite";
	var OPERATION = "enum.parameter.write.test";
	var RESOLVER_USED = "EnumParameterDiscover.resolve";
	var NOT_LOADED = "ENUM_WRITE_TEST_PATH_NOT_LOADED";

	function copyKeys(fromObj, intoObj) {
		var key;
		fromObj = fromObj || {};
		intoObj = intoObj || {};
		for (key in fromObj) {
			if (fromObj.hasOwnProperty(key) && fromObj[key] !== undefined) {
				intoObj[key] = fromObj[key];
			}
		}
		return intoObj;
	}

	function debugButton(ident) {
		ident = ident || {};
		if (ident.debugButton && typeof ident.debugButton === "object") {
			return {
				clicked: ident.debugButton.clicked !== false,
				id: ident.debugButton.id || ident.buttonId || BUTTON_ID,
				handler: ident.debugButton.handler || ident.handler || HANDLER
			};
		}
		return {
			clicked: ident.debugButtonClicked !== false,
			id: ident.buttonId || BUTTON_ID,
			handler: ident.handler || HANDLER
		};
	}

	function normalizeIdent(ident) {
		var next = {};
		ident = ident || {};
		next.componentDisplayName = String(ident.componentDisplayName || ident.component || "");
		next.componentMatchName = String(ident.componentMatchName || "");
		next.parameterDisplayName = String(ident.parameterDisplayName || ident.parameter || "");
		next.parameterMatchName = String(ident.parameterMatchName || "");
		next.debugButtonClicked = true;
		next.buttonId = BUTTON_ID;
		next.handler = HANDLER;
		next.bridgePath = BRIDGE_PATH;
		next.debugButton = debugButton(ident);
		next.debugButton.clicked = true;
		next.debugButton.id = BUTTON_ID;
		next.debugButton.handler = HANDLER;
		return next;
	}

	function notLoadedPayload(ident) {
		var payload;
		ident = normalizeIdent(ident);
		payload = {
			ok: false,
			operation: OPERATION,
			reason: NOT_LOADED,
			detail: "EnumParameterWriteTest.js is not loaded in the ExtendScript host. Enum path does not fall back to ParameterWriteTest, NumericCandidateClassifier writes, or UniversalParameterResolver.",
			globalSearchUsed: false,
			enumWriteTestLoaded: false,
			enumWriteTestFunctionAvailable: false,
			hostFunction: HOST_FUNCTION,
			bridgePath: BRIDGE_PATH,
			debugButton: ident.debugButton,
			debugButtonClicked: true,
			buttonId: BUTTON_ID,
			handler: HANDLER,
			resolverUsed: "none",
			usedQE: false,
			productionEnabled: false,
			verified: false,
			settersCalled: false
		};
		copyKeys(ident, payload);
		payload.ok = false;
		payload.operation = OPERATION;
		payload.reason = NOT_LOADED;
		payload.globalSearchUsed = false;
		payload.bridgePath = BRIDGE_PATH;
		payload.hostFunction = HOST_FUNCTION;
		payload.debugButton = ident.debugButton;
		return payload;
	}

	function buildEvalScript(ident) {
		return "$._pickfx." + HOST_FUNCTION + "(" + JSON.stringify(normalizeIdent(ident)) + ")";
	}

	function buildLoadProbeScript() {
		return "(function(){var q=$._pickfx;return JSON.stringify({ok:true,operation:\"enum.parameter.write.test.probe\",enumWriteTestLoaded:!!(q&&q.__enumWriteTestLoaded===true),enumWriteTestFunctionAvailable:!!(q&&typeof q.debugEnumParameterWriteTest===\"function\"),genericHostFunctionAvailable:!!(q&&typeof q.testParameterWrite===\"function\"),hostFunction:(q&&typeof q.debugEnumParameterWriteTest===\"function\")?\"debugEnumParameterWriteTest\":\"missing\"});})()";
	}

	function scriptCallsGenericParameterWrite(script) {
		script = String(script || "");
		return script.indexOf("$._pickfx.testParameterWrite(") !== -1 ||
			script.indexOf("$._pickfx.testParameterWrite ") !== -1;
	}

	function hostFunctionFromScript(script) {
		script = String(script || "");
		if (script.indexOf("$._pickfx.debugEnumParameterWriteTest(") !== -1) {
			return HOST_FUNCTION;
		}
		if (scriptCallsGenericParameterWrite(script)) {
			return GENERIC_HOST_FUNCTION;
		}
		return "unknown";
	}

	function attachTrace(result, ident) {
		var button;
		ident = normalizeIdent(ident);
		button = ident.debugButton;
		result = result || {};
		result.operation = OPERATION;
		result.globalSearchUsed = false;
		result.productionEnabled = false;
		result.usedQE = false;
		result.bridgePath = BRIDGE_PATH;
		result.hostFunction = HOST_FUNCTION;
		result.debugButton = button;
		result.debugButtonClicked = true;
		result.buttonId = BUTTON_ID;
		result.handler = HANDLER;
		result.resolverUsed = result.resolverUsed || RESOLVER_USED;
		if (typeof $ !== "undefined" && $._pickfx) {
			result.enumWriteTestLoaded = $._pickfx.__enumWriteTestLoaded === true;
			result.enumWriteTestFunctionAvailable = typeof $._pickfx.debugEnumParameterWriteTest === "function";
		} else {
			result.enumWriteTestLoaded = typeof EnumParameterWriteTest !== "undefined";
			result.enumWriteTestFunctionAvailable = typeof EnumParameterWriteTest !== "undefined" &&
				typeof EnumParameterWriteTest.hostDebugRun === "function";
		}
		return result;
	}

	function requiredDebugModules() {
		var discover = typeof EnumParameterDiscover !== "undefined"
			? EnumParameterDiscover
			: (typeof $ !== "undefined" ? $._pickfxEnumParameterDiscover : undefined);
		var writer = typeof EnumParameterWriteTest !== "undefined"
			? EnumParameterWriteTest
			: (typeof $ !== "undefined" ? $._pickfxEnumParameterWriteTest : undefined);
		return [
			{
				name: "NumericCandidateClassifier",
				ok: typeof NumericCandidateClassifier !== "undefined" &&
					typeof NumericCandidateClassifier.hasEnumLikeMetadata === "function"
			},
			{
				name: "ParameterCapability",
				ok: typeof ParameterCapability !== "undefined" &&
					typeof ParameterCapability.classify === "function"
			},
			{
				name: "EnumWriteTestWiring",
				ok: true
			},
			{
				name: "EnumParameterDiscover",
				ok: !!(discover && typeof discover.inspect === "function")
			},
			{
				name: "EnumParameterWriteTest",
				ok: !!(writer && typeof writer.hostDebugRun === "function")
			}
		];
	}

	function probeDebugLoad() {
		var modules = requiredDebugModules();
		var missing = [];
		var i;
		var discover = typeof EnumParameterDiscover !== "undefined"
			? EnumParameterDiscover
			: (typeof $ !== "undefined" ? $._pickfxEnumParameterDiscover : undefined);
		for (i = 0; i < modules.length; i++) {
			if (!modules[i].ok) {
				missing.push(modules[i].name);
			}
		}
		return {
			ok: missing.length === 0,
			operation: "enum.debug.load.probe",
			missing: missing,
			modules: modules,
			inspectEnumParametersCallable: !!(discover && typeof discover.inspect === "function"),
			hostInspectCallable: typeof $ !== "undefined" && $._pickfx &&
				typeof $._pickfx.inspectEnumParameters === "function"
		};
	}

	return {
		BUTTON_ID: BUTTON_ID,
		HANDLER: HANDLER,
		BRIDGE_METHOD: BRIDGE_METHOD,
		BRIDGE_PATH: BRIDGE_PATH,
		GENERIC_BRIDGE_METHOD: GENERIC_BRIDGE_METHOD,
		GENERIC_BRIDGE_PATH: GENERIC_BRIDGE_PATH,
		HOST_FUNCTION: HOST_FUNCTION,
		GENERIC_HOST_FUNCTION: GENERIC_HOST_FUNCTION,
		OPERATION: OPERATION,
		RESOLVER_USED: RESOLVER_USED,
		NOT_LOADED: NOT_LOADED,
		normalizeIdent: normalizeIdent,
		notLoadedPayload: notLoadedPayload,
		buildEvalScript: buildEvalScript,
		buildLoadProbeScript: buildLoadProbeScript,
		scriptCallsGenericParameterWrite: scriptCallsGenericParameterWrite,
		hostFunctionFromScript: hostFunctionFromScript,
		attachTrace: attachTrace,
		debugButton: debugButton,
		probeDebugLoad: probeDebugLoad,
		REQUIRED_EXTRA_HOST_FILES: [
			"/src/core/NumericCandidateClassifier.js",
			"/src/core/ParameterCapability.js",
			"/src/core/EnumWriteTestWiring.js",
			"/src/core/EnumParameterDiscover.js",
			"/src/core/EnumParameterWriteTest.js"
		]
	};
}());

if (typeof $ !== "undefined") {
	$._pickfxEnumWriteTestWiring = EnumWriteTestWiring;
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = EnumWriteTestWiring;
}
