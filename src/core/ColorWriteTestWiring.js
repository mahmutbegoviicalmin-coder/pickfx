var ColorWriteTestWiring = (function () {
	var BUTTON_ID = "test-color-parameter-write-btn";
	var HANDLER = "invokeColorParameterWriteTest";
	var BRIDGE_METHOD = "testColorParameterWrite";
	var BRIDGE_PATH = "color-parameter-write-test";
	var GENERIC_BRIDGE_METHOD = "testParameterWrite";
	var GENERIC_BRIDGE_PATH = "generic-parameter-write-test";
	var HOST_FUNCTION = "debugColorParameterWriteTest";
	var GENERIC_HOST_FUNCTION = "testParameterWrite";
	var OPERATION = "color.parameter.write.test";
	var RESOLVER_USED = "ColorParameterDiscover.resolve";
	var NOT_LOADED = "COLOR_WRITE_TEST_PATH_NOT_LOADED";

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
			detail: "ColorParameterWriteTest.js is not loaded in the ExtendScript host. Color path does not fall back to ParameterWriteTest or UniversalParameterResolver.",
			globalSearchUsed: false,
			colorWriteTestLoaded: false,
			colorWriteTestFunctionAvailable: false,
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
		return "(function(){var q=$._pickfx;return JSON.stringify({ok:true,operation:\"color.parameter.write.test.probe\",colorWriteTestLoaded:!!(q&&q.__colorWriteTestLoaded===true),colorWriteTestFunctionAvailable:!!(q&&typeof q.debugColorParameterWriteTest===\"function\"),genericHostFunctionAvailable:!!(q&&typeof q.testParameterWrite===\"function\"),hostFunction:(q&&typeof q.debugColorParameterWriteTest===\"function\")?\"debugColorParameterWriteTest\":\"missing\"});})()";
	}

	function scriptCallsGenericParameterWrite(script) {
		script = String(script || "");
		return script.indexOf("$._pickfx.testParameterWrite(") !== -1 ||
			script.indexOf("$._pickfx.testParameterWrite ") !== -1;
	}

	function hostFunctionFromScript(script) {
		script = String(script || "");
		if (script.indexOf("$._pickfx.debugColorParameterWriteTest(") !== -1) {
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
			result.colorWriteTestLoaded = $._pickfx.__colorWriteTestLoaded === true;
			result.colorWriteTestFunctionAvailable = typeof $._pickfx.debugColorParameterWriteTest === "function";
		} else {
			result.colorWriteTestLoaded = typeof ColorParameterWriteTest !== "undefined";
			result.colorWriteTestFunctionAvailable = typeof ColorParameterWriteTest !== "undefined" &&
				typeof ColorParameterWriteTest.hostDebugRun === "function";
		}
		return result;
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
		debugButton: debugButton
	};
}());

if (typeof $ !== "undefined") {
	$._pickfxColorWriteTestWiring = ColorWriteTestWiring;
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = ColorWriteTestWiring;
}
