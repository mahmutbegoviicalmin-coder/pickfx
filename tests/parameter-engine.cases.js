var Parser = ParameterValueParser;
var Resolver = ParameterValueResolver;
var Engine = ParameterEngine;
var Picker = NumericParameterPicker;

var failed = 0;
var passed = 0;

function assert(name, condition, detail) {
	if (condition) {
		passed += 1;
		return;
	}
	failed += 1;
	print("FAIL " + name + (detail ? " — " + detail : ""));
}

function assertEq(name, actual, expected) {
	if (actual === expected) {
		passed += 1;
		return;
	}
	failed += 1;
	print("FAIL " + name + " — expected " + JSON.stringify(expected) + ", got " + JSON.stringify(actual));
}

if (typeof print !== "function") {
	print = function (msg) {
		console.log(msg);
	};
}

(function () {
	var cases = [80, 50, -10, 12.5];
	var i;
	var parsed;
	for (i = 0; i < cases.length; i++) {
		parsed = Parser.parse({ type: "number", displayName: "Amount" }, String(cases[i]));
		assert("number parse " + cases[i], parsed.ok && parsed.type === "number" && parsed.value === cases[i]);
	}
}());

(function () {
	var truthy = ["true", "on", "yes", "TRUE"];
	var falsy = ["false", "off", "no", "OFF"];
	var i;
	var parsed;
	for (i = 0; i < truthy.length; i++) {
		parsed = Parser.parse({ type: "boolean", displayName: "Enabled" }, truthy[i]);
		assert("boolean " + truthy[i], parsed.ok && parsed.value === true);
	}
	for (i = 0; i < falsy.length; i++) {
		parsed = Parser.parse({ type: "boolean", displayName: "Enabled" }, falsy[i]);
		assert("boolean " + falsy[i], parsed.ok && parsed.value === false);
	}
	parsed = Parser.parse({ type: "boolean", displayName: "Enabled" }, "maybe");
	assertEq("invalid boolean reason", parsed.ok, false);
	assertEq("invalid boolean code", parsed.reason, "INVALID_VALUE");
}());

(function () {
	var meta = {
		type: "enum",
		displayName: "Blend Mode",
		options: [
			{ label: "Normal", value: 0 },
			{ label: "Screen", value: 1 }
		]
	};
	var parsed;
	parsed = Parser.parse(meta, "Screen");
	assert("enum Screen", parsed.ok && parsed.value === 1);
	parsed = Parser.parse(meta, "screen");
	assert("enum screen", parsed.ok && parsed.value === 1);
	parsed = Parser.parse(meta, "SCREEN");
	assert("enum SCREEN", parsed.ok && parsed.value === 1);
	parsed = Parser.parse(meta, "1");
	assert("enum 1", parsed.ok && parsed.value === 1);
	parsed = Parser.parse(meta, "NonexistentOption");
	assertEq("invalid enum ok", parsed.ok, false);
	assertEq("invalid enum reason", parsed.reason, "ENUM_OPTION_NOT_FOUND");
	parsed = Parser.parse({ type: "enum", displayName: "Blend Mode", options: [] }, "Screen");
	assertEq("enum without options", parsed.reason, "PARAMETER_NOT_WRITABLE");
}());

(function () {
	var parsed;
	parsed = Parser.parse({ type: "number", displayName: "Amount", max: 100 }, "150");
	assertEq("150 with max=100 ok", parsed.ok, false);
	assertEq("150 with max=100 reason", parsed.reason, "VALUE_OUT_OF_RANGE");
	parsed = Parser.parse({ type: "number", displayName: "Amount" }, "9999");
	assert("9999 with no max", parsed.ok && parsed.value === 9999);
	assert("engine inRange 150/100", Engine.inRange({ max: 100 }, 150) === false);
	assert("engine inRange 9999/none", Engine.inRange({}, 9999) === true);
}());

(function () {
	var result;
	result = Engine.verify("number", 80, 80);
	assert("verify 80 vs 80", result.ok);
	result = Engine.verify("number", 80, 79.999999);
	assert("verify 80 vs 79.999999", result.ok);
	result = Engine.verify("number", 80, 79);
	assert("verify 80 vs 79 fails", !result.ok && result.reason === "VALUE_NOT_VERIFIED");
	result = Engine.verify("boolean", true, true);
	assert("verify true vs true", result.ok);
	result = Engine.verify("boolean", true, false);
	assert("verify true vs false fails", !result.ok);
	result = Engine.verify("boolean", true, 1);
	assert("verify true vs 1", result.ok);
	result = Engine.verify("enum", 1, 1, { expectedLabel: "Screen" });
	assert("verify enum value", result.ok);
	result = Engine.verify("enum", 1, "Screen", { expectedLabel: "Screen" });
	assert("verify enum label", result.ok);
	result = Engine.verify("color", { r: 1 }, { r: 1 });
	assertEq("verify color unsupported", result.reason, "UNSUPPORTED_TYPE");
}());

(function () {
	var resolved;
	resolved = Resolver.resolve({ type: "number", displayName: "Amount" }, "80");
	assert("resolver number write", resolved.ok && resolved.write && resolved.value === 80);
	resolved = Resolver.resolve({ type: "boolean", displayName: "Enabled" }, "on");
	assert("resolver boolean write", resolved.ok && resolved.write && resolved.value === true);
	resolved = Resolver.resolve({
		type: "enum",
		displayName: "Blend Mode",
		options: [{ label: "Screen", value: 1 }]
	}, "screen");
	assert("resolver enum write", resolved.ok && resolved.write && resolved.value === 1 && resolved.displayValue === "Screen");
	resolved = Resolver.resolve({ type: "color", displayName: "Fill" }, "#ff0000");
	assertEq("resolver color unsupported", resolved.reason, "UNSUPPORTED_TYPE");
	resolved = Resolver.resolve({ type: "point2d", displayName: "Point" }, "10, 20");
	assertEq("resolver point2d unsupported", resolved.reason, "UNSUPPORTED_TYPE");
}());

(function () {
	var allowed;
	allowed = Engine.canWrite({ displayName: "", type: "boolean", writable: true, value: true });
	assertEq("empty displayName not addressable", allowed.reason, "PARAMETER_NOT_FOUND");
	allowed = Engine.canWrite({ displayName: "Amount", type: "number", writable: true });
	assert("amount writable", allowed.ok);
	allowed = Engine.canWrite({ displayName: "Mode", type: "enum", writable: true, options: [] });
	assertEq("enum without options not writable", allowed.reason, "PARAMETER_NOT_WRITABLE");
	allowed = Engine.canWrite({ displayName: "Fill", type: "color", writable: true });
	assertEq("color unsupported", allowed.reason, "UNSUPPORTED_TYPE");
}());

(function () {
	var picked = Picker.pick("Gaussian Blur", [
		{ displayName: "Amount", type: "number", writable: true, value: 80 },
		{ displayName: "", type: "boolean", writable: true, value: true },
		{ displayName: "Edge Behavior", type: "number", writable: true, value: 1 }
	]);
	assertEq("picker Amount", picked && picked.displayName, "Amount");
}());

assertEq("alias OUT_OF_RANGE", Engine.normalizeReason("OUT_OF_RANGE"), "VALUE_OUT_OF_RANGE");
assertEq("alias VERIFY_FAILED", Engine.normalizeReason("VERIFY_FAILED"), "VALUE_NOT_VERIFIED");
assertEq("alias TYPE_NOT_WRITABLE", Engine.normalizeReason("TYPE_NOT_WRITABLE"), "UNSUPPORTED_TYPE");
