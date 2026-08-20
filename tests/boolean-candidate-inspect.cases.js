(function () {
	var Inspect = BooleanCandidateInspect;
	var typical;
	var conclusions;
	var exposed;
	var classified;

	typical = {
		effect: "Motion",
		parameter: "Uniform Scale",
		displayName: "Uniform Scale",
		type: "boolean",
		value: true,
		writable: true,
		displayNameMatchCount: 1,
		matchedByDisplayName: true,
		identity: {
			displayName: { exists: true, typeofValue: "string", value: "Uniform Scale" }
		},
		raw: {
			displayName: { exists: true, typeofValue: "string", value: "Uniform Scale" }
		},
		domCapabilities: {
			hasGetValue: true,
			hasSetValue: true
		}
	};

	conclusions = Inspect.conclude(typical);
	assertEq("typical hasStableIdentity", conclusions.hasStableIdentity, false);
	assertEq("typical hasExplicitUserFacingFlag", conclusions.hasExplicitUserFacingFlag, false);
	assertEq("typical hasExplicitInternalFlag", conclusions.hasExplicitInternalFlag, false);
	assertEq("typical safeToResolveByDisplayName", conclusions.safeToResolveByDisplayName, true);
	assertEq("typical resolvableByExistingDisplayNameResolver", conclusions.resolvableByExistingDisplayNameResolver, true);
	assertEq("typical safeBooleanWriteCandidate", conclusions.safeBooleanWriteCandidate, false);
	assertEq("typical reason", conclusions.reason, "BOOLEAN_SETVALUE_DISPLAYNAME_ONLY");

	exposed = Inspect.collectExposedFields(typical);
	assertEq("typical exposed has no matchName", exposed.matchName, undefined);
	assertEq("typical exposed has no isUserFacing", exposed.isUserFacing, undefined);
	assertEq("typical exposed has no type field", exposed.type, undefined);
	assert("typical exposed only live fields", !exposed.displayName);

	classified = Inspect.conclude({
		displayName: "Uniform Scale",
		type: "boolean",
		value: true,
		writable: true,
		domCapabilities: { hasGetValue: true, hasSetValue: true }
	});
	assert("boolean+setValue+displayName is not a write candidate", classified.safeBooleanWriteCandidate === false);
	assertEq("boolean+setValue+displayName still resolvable", classified.resolvableByExistingDisplayNameResolver, true);

	classified = Inspect.conclude({
		displayName: "Uniform Scale",
		type: "boolean",
		value: true,
		writable: true,
		domCapabilities: { hasGetValue: true, hasSetValue: true },
		raw: {
			matchName: { exists: true, typeofValue: "string", value: "ADBE Uniform Scale" }
		}
	});
	assertEq("extra identity without user facing", classified.hasStableIdentity, true);
	assertEq("extra identity still not write-safe", classified.safeBooleanWriteCandidate, false);
	assertEq("extra identity reason", classified.reason, "NO_EXPLICIT_USER_FACING_FLAG");

	classified = Inspect.conclude({
		displayName: "Uniform Scale",
		type: "boolean",
		value: true,
		writable: true,
		domCapabilities: { hasGetValue: true, hasSetValue: true },
		raw: {
			isUserFacing: { exists: true, typeofValue: "boolean", value: true }
		}
	});
	assertEq("user facing without extra identity", classified.hasExplicitUserFacingFlag, true);
	assertEq("user facing still not write-safe", classified.safeBooleanWriteCandidate, false);
	assertEq("user facing reason", classified.reason, "NO_STABLE_IDENTITY_BEYOND_DISPLAY_NAME");

	classified = Inspect.conclude({
		displayName: "Uniform Scale",
		type: "boolean",
		value: true,
		writable: true,
		domCapabilities: { hasGetValue: true, hasSetValue: true },
		raw: {
			matchName: { exists: true, typeofValue: "string", value: "ADBE Uniform Scale" },
			isUserFacing: { exists: true, typeofValue: "boolean", value: true }
		}
	});
	assertEq("identity+userFacing is write-safe", classified.safeBooleanWriteCandidate, true);
	assertEq("identity+userFacing reason", classified.reason, "SAFE_BOOLEAN_WRITE_CANDIDATE");
	assertEq("identity+userFacing stable", classified.hasStableIdentity, true);
	assertEq("identity+userFacing flag", classified.hasExplicitUserFacingFlag, true);

	classified = Inspect.conclude({
		displayName: "Uniform Scale",
		type: "boolean",
		value: true,
		writable: true,
		domCapabilities: { hasGetValue: true, hasSetValue: true },
		raw: {
			matchName: { exists: true, typeofValue: "string", value: "ADBE Uniform Scale" },
			isUserFacing: { exists: true, typeofValue: "boolean", value: true },
			isInternal: { exists: true, typeofValue: "boolean", value: true }
		}
	});
	assertEq("internal flag blocks write", classified.safeBooleanWriteCandidate, false);
	assertEq("internal flag reported", classified.hasExplicitInternalFlag, true);
	assertEq("internal flag reason", classified.reason, "EXPLICIT_INTERNAL_FLAG");

	classified = Inspect.conclude({
		displayName: "",
		type: "boolean",
		value: true,
		writable: true,
		domCapabilities: { hasGetValue: true, hasSetValue: true }
	});
	assertEq("empty displayName resolvable", classified.resolvableByExistingDisplayNameResolver, false);
	assertEq("empty displayName safeToResolve", classified.safeToResolveByDisplayName, false);
	assertEq("empty displayName reason", classified.reason, "EMPTY_DISPLAY_NAME");
	assert("empty displayName not write-safe", classified.safeBooleanWriteCandidate === false);

	classified = Inspect.conclude({
		displayName: "Uniform Scale",
		type: "boolean",
		value: true,
		writable: true,
		displayNameMatchCount: 2,
		domCapabilities: { hasGetValue: true, hasSetValue: true }
	});
	assertEq("ambiguous displayName", classified.safeToResolveByDisplayName, false);
	assertEq("ambiguous still resolvable by existing resolver", classified.resolvableByExistingDisplayNameResolver, true);
	assertEq("ambiguous reason", classified.reason, "AMBIGUOUS_DISPLAY_NAME");
	assert("ambiguous not write-safe", classified.safeBooleanWriteCandidate === false);

	classified = Inspect.conclude({
		displayName: "Amount",
		type: "number",
		value: 80,
		writable: true,
		domCapabilities: { hasGetValue: true, hasSetValue: true }
	});
	assertEq("number not boolean", classified.reason, "NOT_BOOLEAN");
	assert("number not write-safe", classified.safeBooleanWriteCandidate === false);

	classified = Inspect.conclude({
		displayName: "Uniform Scale",
		type: "boolean",
		value: true,
		writable: false,
		domCapabilities: { hasGetValue: true, hasSetValue: false }
	});
	assertEq("no setValue reason", classified.reason, "NO_SET_VALUE");

	classified = Inspect.conclude({
		displayName: "Uniform Scale",
		type: "boolean",
		value: true,
		index: 4,
		identity: {
			displayName: { exists: true, typeofValue: "string", value: "Uniform Scale" }
		},
		domCapabilities: { hasGetValue: true, hasSetValue: true }
	});
	assertEq("walk index is not stable identity", classified.hasStableIdentity, false);
	assertEq("walk index still resolvable by displayName", classified.resolvableByExistingDisplayNameResolver, true);

	exposed = Inspect.collectExposedFields({
		raw: {
			hidden: { exists: true, typeofValue: "boolean", value: false },
			matchName: { found: false, typeofValue: "undefined" },
			type: { exists: true, typeofValue: "number", value: 1 }
		},
		candidateMetadata: {
			isVisible: { found: false }
		}
	});
	assert("exposed includes hidden", !!exposed.hidden);
	assertEq("exposed hidden value", exposed.hidden.value, false);
	assertEq("exposed omits missing matchName", exposed.matchName, undefined);
	assertEq("exposed omits missing isVisible", exposed.isVisible, undefined);
	assert("exposed includes live type", !!exposed.type);

	classified = Inspect.conclude({
		displayName: "Uniform Scale",
		type: "boolean",
		value: true,
		writable: true,
		raw: {
			name: { exists: true, typeofValue: "function" }
		},
		domCapabilities: { hasGetValue: true, hasSetValue: true }
	});
	assertEq("function name is not identity", classified.hasStableIdentity, false);
}());
