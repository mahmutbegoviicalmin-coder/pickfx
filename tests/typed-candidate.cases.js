(function () {
	var Classifier = TypedCandidateClassifier;
	var classified;
	var report;

	classified = Classifier.classify({
		displayName: "Uniform Scale",
		type: "boolean",
		value: true,
		writable: true,
		domCapabilities: { hasGetValue: true, hasSetValue: true }
	});
	assert("safe boolean", classified.typedCandidate === "boolean" && classified.safeForBooleanWrite);
	assertEq("Uniform Scale userFacing unknown", classified.userFacingCandidate, "unknown");
	assertEq("Uniform Scale insufficient", classified.reason, "INSUFFICIENT_METADATA");
	assert("Uniform Scale still writable", classified.safeForWrite === true);

	classified = Classifier.classify({
		displayName: "Controls",
		type: "boolean",
		value: true,
		writable: true,
		domCapabilities: { hasGetValue: true, hasSetValue: true }
	});
	assertEq("Controls name is not internal by itself", classified.userFacingCandidate, "unknown");
	assertEq("Controls name insufficient", classified.reason, "INSUFFICIENT_METADATA");
	assert("Controls still a write candidate", classified.safeForBooleanWrite);

	classified = Classifier.classify({
		displayName: "Error occurred",
		type: "boolean",
		value: true,
		writable: true,
		domCapabilities: { hasGetValue: true, hasSetValue: true }
	});
	assertEq("Error occurred name is not internal by itself", classified.userFacingCandidate, "unknown");

	classified = Classifier.classify({
		displayName: "Uniform Scale",
		type: "boolean",
		value: true,
		writable: true,
		domCapabilities: { hasGetValue: true, hasSetValue: true },
		raw: { hidden: { exists: true, typeofValue: "boolean", value: true } }
	});
	assertEq("hidden flag is internal", classified.userFacingCandidate, false);
	assertEq("hidden flag reason", classified.reason, "INTERNAL_PARAMETER_METADATA");
	assert("hidden still listed as write-capable", classified.safeForWrite);

	classified = Classifier.classify({
		displayName: "Controls",
		type: "boolean",
		value: true,
		writable: true,
		domCapabilities: { hasGetValue: true, hasSetValue: true },
		raw: { isControl: { exists: true, typeofValue: "boolean", value: true } }
	});
	assertEq("isControl flag", classified.userFacingCandidate, false);
	assertEq("isControl reason", classified.reason, "CONTROL_PARAMETER_METADATA");

	classified = Classifier.classify({
		displayName: "Uniform Scale",
		type: "boolean",
		value: true,
		writable: true,
		domCapabilities: { hasGetValue: true, hasSetValue: true },
		raw: { isUserFacing: { exists: true, typeofValue: "boolean", value: true } }
	});
	assertEq("explicit userFacing", classified.userFacingCandidate, true);
	assertEq("explicit userFacing reason", classified.reason, "EXPLICIT_USER_PARAMETER_METADATA");

	classified = Classifier.classify({
		displayName: "",
		type: "boolean",
		value: true,
		writable: true,
		domCapabilities: { hasGetValue: true, hasSetValue: true }
	});
	assertEq("unnamed boolean reason", classified.reason, "EMPTY_DISPLAY_NAME");
	assert("unnamed boolean not safe", !classified.safeForBooleanWrite);

	classified = Classifier.classify({
		displayName: "Amount",
		type: "number",
		value: 1,
		writable: true,
		domCapabilities: { hasGetValue: true, hasSetValue: true }
	});
	assertEq("number 1 is not boolean", classified.typedCandidate, "none");
	assert("number 1 not boolean-write", !classified.safeForBooleanWrite);

	classified = Classifier.classify({
		displayName: "Enabled",
		type: "boolean",
		value: 1,
		writable: true,
		domCapabilities: { hasGetValue: true, hasSetValue: true }
	});
	assertEq("boolean type with number value", classified.reason, "NUMBER_NOT_BOOLEAN");

	classified = Classifier.classify({
		displayName: "Blend Mode",
		type: "enum",
		value: 1,
		writable: true,
		domCapabilities: { hasGetValue: true, hasSetValue: true },
		options: [
			{ value: 0, label: "Normal" },
			{ value: 1, label: "Screen" }
		]
	});
	assert("safe enum", classified.safeForEnumWrite && classified.options.length === 2);
	assertEq("safe enum first label", classified.options[0].label, "Normal");

	classified = Classifier.classify({
		displayName: "Edge Behavior",
		type: "enum",
		value: 1,
		writable: true,
		domCapabilities: { hasGetValue: true, hasSetValue: true },
		options: []
	});
	assertEq("enum without options", classified.reason, "NO_ENUM_OPTIONS");
	assert("enum without options not safe", !classified.safeForEnumWrite);

	classified = Classifier.classify({
		displayName: "Edge Behavior",
		type: "number",
		value: 1,
		writable: true,
		domCapabilities: { hasGetValue: true, hasSetValue: true }
	});
	assertEq("number with no enum APIs", classified.typedCandidate, "none");

	classified = Classifier.classify({
		displayName: "Mode",
		type: "enum",
		value: 1,
		writable: true,
		optionValuesGuessed: true,
		options: [
			{ value: 0, label: "A" },
			{ value: 1, label: "B" }
		],
		domCapabilities: { hasGetValue: true, hasSetValue: true }
	});
	assertEq("guessed enum values", classified.reason, "OPTION_VALUES_GUESSED");

	classified = Classifier.classify({
		displayName: "Mode",
		type: "enum",
		value: 1,
		writable: true,
		options: [{ label: "Screen" }, { label: "Normal" }],
		domCapabilities: { hasGetValue: true, hasSetValue: true }
	});
	assertEq("options missing values", classified.reason, "OPTIONS_MISSING_VALUES");

	classified = Classifier.classify({
		displayName: "Enabled",
		type: "boolean",
		value: true,
		writable: true,
		domCapabilities: { hasGetValue: true, hasSetValue: false }
	});
	assertEq("boolean no setValue", classified.reason, "NO_SET_VALUE");

	classified = Classifier.classify({
		displayName: "Enabled",
		type: "boolean",
		value: true,
		writable: true,
		domCapabilities: { hasGetValue: false, hasSetValue: true }
	});
	assertEq("boolean no getValue", classified.reason, "NO_GET_VALUE");

	report = Classifier.report([
		{
			effect: "Gaussian Blur",
			param: {
				displayName: "",
				type: "boolean",
				value: true,
				writable: true,
				domCapabilities: { hasGetValue: true, hasSetValue: true }
			}
		},
		{
			effect: "Some Effect",
			param: {
				displayName: "Blend Mode",
				type: "enum",
				value: 1,
				writable: true,
				options: [
					{ value: 0, label: "Normal" },
					{ value: 1, label: "Screen" }
				],
				domCapabilities: { hasGetValue: true, hasSetValue: true }
			}
		},
		{
			effect: "Some Effect",
			param: {
				displayName: "Use Layer",
				type: "boolean",
				value: false,
				writable: true,
				domCapabilities: { hasGetValue: true, hasSetValue: true }
			}
		}
	]);
	assertEq("report boolean count", report.booleanCandidates.length, 1);
	assertEq("report enum count", report.enumCandidates.length, 1);
	assertEq("report rejected count", report.rejected.length, 1);
	assertEq("report rejected reason", report.rejected[0].reason, "EMPTY_DISPLAY_NAME");
	assertEq("report settersCalled", report.settersCalled, false);
	assertEq("named boolean parameter", report.booleanCandidates[0].parameter, "Use Layer");
	assertEq("named boolean userFacing", report.booleanCandidates[0].userFacingCandidate, "unknown");
	assertEq("named boolean reason", report.booleanCandidates[0].reason, "INSUFFICIENT_METADATA");
}());
