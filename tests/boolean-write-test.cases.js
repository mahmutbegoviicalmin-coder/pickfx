(function () {
	var Test = BooleanWriteTest;
	var classified;
	var requested;
	var validated;

	assert("true is strict boolean", Test.isStrictBoolean(true));
	assert("false is strict boolean", Test.isStrictBoolean(false));
	assert("1 is not strict boolean", Test.isStrictBoolean(1) === false);
	assert("0 is not strict boolean", Test.isStrictBoolean(0) === false);
	assert("string true is not strict boolean", Test.isStrictBoolean("true") === false);

	assert("verify true===true", Test.verifyBooleanEqual(true, true));
	assert("verify false===false", Test.verifyBooleanEqual(false, false));
	assert("verify true!==false", Test.verifyBooleanEqual(true, false) === false);
	assert("verify 0 is not false", Test.verifyBooleanEqual(0, false) === false);
	assert("verify 1 is not true", Test.verifyBooleanEqual(1, true) === false);
	assert("verify 'true' is not true", Test.verifyBooleanEqual("true", true) === false);

	requested = Test.requestedFromOriginal(true);
	assert("toggle true -> false", requested.ok && requested.requestedValue === false);
	requested = Test.requestedFromOriginal(false);
	assert("toggle false -> true", requested.ok && requested.requestedValue === true);
	requested = Test.requestedFromOriginal(1);
	assertEq("0/1 original rejected", requested.ok, false);
	assertEq("0/1 original stage", requested.stage, "ORIGINAL_TYPE");
	requested = Test.requestedFromOriginal(0);
	assertEq("0 original rejected", requested.ok, false);

	classified = Test.classifyVerification(true, false, false, true);
	assert("success write+restore", classified.ok && classified.writeVerified && classified.restoreVerified);

	classified = Test.classifyVerification(true, false, false, false);
	assert("restore mismatch fails overall", classified.ok === false && classified.writeVerified === true && classified.restoreVerified === false);

	classified = Test.classifyVerification(true, false, true, true);
	assert("write mismatch fails overall", classified.ok === false && classified.writeVerified === false);

	classified = Test.classifyVerification(true, false, 0, true);
	assert("0 is not a successful write", classified.writeVerified === false && classified.ok === false);

	classified = Test.classifyVerification(false, true, 1, false);
	assert("1 is not a successful write", classified.writeVerified === false && classified.ok === false);

	validated = Test.validateCandidate({
		effect: "Motion",
		parameter: "Uniform Scale",
		type: "boolean",
		value: true
	});
	assert("valid boolean candidate", validated.ok && validated.parameter === "Uniform Scale" && validated.type === "boolean");

	validated = Test.validateCandidate({
		effect: "Motion",
		parameter: "Uniform Scale",
		type: "number",
		value: true
	});
	assertEq("non-boolean type rejected", validated.ok, false);
	assertEq("non-boolean type stage", validated.stage, "VALIDATE_TYPE");

	validated = Test.validateCandidate({
		effect: "Gaussian Blur",
		parameter: "",
		type: "boolean",
		value: true
	});
	assertEq("empty displayName rejected", validated.ok, false);
	assertEq("empty displayName stage", validated.stage, "VALIDATE_DISPLAY_NAME");

	validated = Test.validateCandidate(null);
	assertEq("missing candidate rejected", validated.stage, "VALIDATE_CANDIDATE");

	validated = Test.validateCandidate({
		effect: "Motion",
		displayName: "Uniform Scale",
		type: "boolean"
	});
	assert("displayName alias accepted", validated.ok && validated.parameter === "Uniform Scale");

	assertEq("method constant", Test.METHOD, "setValue(value, true)");
}());
