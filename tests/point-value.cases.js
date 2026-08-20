(function () {
	var parsed;
	var verified;
	var writeValue;
	var detected;

	parsed = PointValue.parse("100 200");
	assert("point parse spaces", parsed.ok && parsed.value[0] === 100 && parsed.value[1] === 200);
	parsed = PointValue.parse("100, 200");
	assert("point parse commas", parsed.ok && parsed.value[0] === 100 && parsed.value[1] === 200);
	parsed = PointValue.parse("x 100 y 200");
	assert("point parse named axes", parsed.ok && parsed.value[0] === 100 && parsed.value[1] === 200);
	parsed = PointValue.parse("-15 12.5");
	assert("point parse negative decimal", parsed.ok && parsed.value[0] === -15 && parsed.value[1] === 12.5);
	parsed = PointValue.parse("0.6 0.5");
	assert("point parse premiere tuple", parsed.ok && parsed.value[0] === 0.6 && parsed.value[1] === 0.5);
	parsed = PointValue.parse("100");
	assertEq("partial point reason", parsed.reason, "INVALID_VALUE");
	parsed = PointValue.parse("100 200 300");
	assertEq("extra point reason", parsed.reason, "INVALID_VALUE");
	parsed = PointValue.parse("left 200");
	assertEq("invalid point token", parsed.reason, "INVALID_VALUE");
	parsed = PointValue.parse("abc 0.5");
	assertEq("invalid point abc", parsed.reason, "INVALID_VALUE");

	assert("inspect xy", PointValue.inspect({ x: 10, y: 20 }).ok === true && PointValue.inspect({ x: 10, y: 20 }).shape === "xy");
	assert("inspect index0", PointValue.inspect([30, 40]).ok === true && PointValue.inspect([30, 40]).shape === "index0");
	assert("inspect index1", PointValue.inspect({ 1: 5, 2: 6 }).ok === true && PointValue.inspect({ 1: 5, 2: 6 }).shape === "index1");
	assert("inspect number not point", PointValue.inspect(120).ok === false);
	assert("inspect boolean not point", PointValue.inspect(true).ok === false);
	assert("inspect color not point", PointValue.inspect({ r: 1, g: 2, b: 3 }).ok === false);

	verified = PointValue.verify([100, 200], [100, 200]);
	assert("point verify exact array", verified.ok === true);
	verified = PointValue.verify([100, 200], [100.00001, 200]);
	assert("point verify tolerance x", verified.ok === true);
	verified = PointValue.verify([100, 200], [100, 200.00001]);
	assert("point verify tolerance y", verified.ok === true);
	verified = PointValue.verify([100, 200], [1, 2]);
	assertEq("point verify fail", verified.reason, "VALUE_NOT_VERIFIED");
	verified = PointValue.verify({ x: 100, y: 200 }, [100, 200]);
	assert("point verify xy requested against array", verified.ok === true);

	writeValue = PointValue.toWriteValue({ x: 0, y: 0 }, [8, 9]);
	assertEq("write xy live rejected", writeValue.reason, "UNSUPPORTED_TYPE");
	writeValue = PointValue.toWriteValue([0, 0], [8, 9]);
	assert("write index0 returns new array", writeValue.ok && writeValue.value[0] === 8 && writeValue.value[1] === 9);
	assert("write index0 does not mutate original", writeValue.value !== [0, 0] && writeValue.shape === "index0");
	writeValue = PointValue.toWriteValue([0, 0], { x: 8, y: 9 });
	assert("write accepts xy input via pairFrom", writeValue.ok && writeValue.value[0] === 8 && writeValue.value[1] === 9);

	detected = ParameterValueType.detect(80);
	assertEq("detect number", detected.type, "number");
	detected = ParameterValueType.detect(true);
	assertEq("detect boolean", detected.type, "boolean");
	detected = ParameterValueType.detect({ x: 1, y: 2 });
	assertEq("detect point from xy", detected.type, "point");
	detected = ParameterValueType.detect([0.5, 0.5]);
	assert("detect point from array", detected.type === "point" && detected.value[0] === 0.5 && detected.value[1] === 0.5);
	detected = ParameterValueType.detect("hello");
	assertEq("detect string", detected.type, "string");
	detected = ParameterValueType.detect({ r: 1, g: 2, b: 3 });
	assertEq("detect color from keys", detected.type, "color");

	parsed = ParameterValueType.parse("point", "720 540");
	assert("type parse point", parsed.ok && parsed.value[0] === 720 && parsed.value[1] === 540);
	parsed = ParameterValueType.parse("number", "120");
	assert("type parse number preserves", parsed.ok && parsed.value === 120);
	verified = ParameterValueType.verify("number", 50, 50.00001);
	assert("type verify number", verified.ok === true);
	verified = ParameterValueType.verify("point", [1, 2], [1, 2]);
	assert("type verify point array", verified.ok === true);
	verified = ParameterValueType.verify("color", { r: 1, g: 2, b: 3 }, { r: 1, g: 2, b: 3 });
	assertEq("unsupported color verify", verified.reason, "UNSUPPORTED_TYPE");
}());
