var BooleanCandidateInspect = (function () {
	var EXTRA_IDENTITY_NAMES = [
		"matchName", "name", "internalName", "propertyName",
		"keyName", "key", "id", "identifier"
	];

	var USER_FACING_FLAG_NAMES = [
		"isUserFacing", "userFacing", "isVisible", "visible"
	];

	var INTERNAL_FLAG_NAMES = [
		"isHidden", "hidden", "isInternal", "internal", "system"
	];

	var REPORT_NAMES = [
		"matchName", "name", "internalName", "propertyName", "keyName", "key",
		"id", "identifier", "index",
		"dataType", "valueType", "propertyValueType", "type", "keyType",
		"isHidden", "hidden", "isInternal", "internal", "system",
		"isControl", "isGroup", "isSeparator", "isFolder",
		"isUserFacing", "userFacing", "isVisible", "visible"
	];

	function trim(value) {
		return String(value || "").replace(/^\s+|\s+$/g, "");
	}

	function caps(param) {
		return (param && param.domCapabilities) ? param.domCapabilities : {};
	}

	function accessors(param) {
		return (param && param.accessorDescriptors) ? param.accessorDescriptors : {};
	}

	function fieldRecord(param, name) {
		var rec;
		if (!param) {
			return null;
		}
		if (param.raw && param.raw[name]) {
			return param.raw[name];
		}
		if (param.candidateMetadata && param.candidateMetadata[name]) {
			rec = param.candidateMetadata[name];
			if (rec && rec.found !== false && rec.typeofValue && rec.typeofValue !== "undefined") {
				return rec;
			}
		}
		if (param.identity && param.identity[name]) {
			return param.identity[name];
		}
		return null;
	}

	function recordExists(rec) {
		if (!rec) {
			return false;
		}
		if (rec.found === false) {
			return false;
		}
		if (rec.exists === false) {
			return false;
		}
		if (rec.typeofValue === "undefined") {
			return false;
		}
		if (rec.typeofValue && rec.typeofValue !== "undefined") {
			return true;
		}
		if (rec.value !== undefined) {
			return true;
		}
		if (rec.exists === true) {
			return true;
		}
		return false;
	}

	function identityValue(rec) {
		if (!recordExists(rec)) {
			return undefined;
		}
		if (rec.typeofValue === "function") {
			return undefined;
		}
		if (typeof rec.value === "string") {
			if (trim(rec.value) !== "") {
				return rec.value;
			}
			return undefined;
		}
		if (typeof rec.value === "number" && isFinite(rec.value)) {
			return rec.value;
		}
		return undefined;
	}

	function booleanField(rec) {
		if (!recordExists(rec)) {
			return undefined;
		}
		if (rec.typeofValue === "boolean") {
			return rec.value === true;
		}
		if (rec.value === true) {
			return true;
		}
		if (rec.value === false) {
			return false;
		}
		return undefined;
	}

	function collectExposedFields(param) {
		var exposed = {};
		var i;
		var name;
		var rec;
		if (!param) {
			return exposed;
		}
		for (i = 0; i < REPORT_NAMES.length; i++) {
			name = REPORT_NAMES[i];
			rec = fieldRecord(param, name);
			if (recordExists(rec)) {
				exposed[name] = rec;
			}
		}
		return exposed;
	}

	function extraIdentityFields(param) {
		var found = {};
		var i;
		var name;
		var rec;
		var value;
		for (i = 0; i < EXTRA_IDENTITY_NAMES.length; i++) {
			name = EXTRA_IDENTITY_NAMES[i];
			rec = fieldRecord(param, name);
			value = identityValue(rec);
			if (value !== undefined) {
				found[name] = value;
			}
		}
		return found;
	}

	function hasAnyBooleanTrue(param, names) {
		var i;
		var flag;
		for (i = 0; i < names.length; i++) {
			flag = booleanField(fieldRecord(param, names[i]));
			if (flag === true) {
				return true;
			}
		}
		return false;
	}

	function hasGetValue(param) {
		var c = caps(param);
		var a = accessors(param);
		if (c.hasGetValue === true) {
			return true;
		}
		if (a.getValue && a.getValue.available === true) {
			return true;
		}
		if (c.hasGetValue === false) {
			return false;
		}
		return param && param.value !== undefined;
	}

	function hasSetValue(param) {
		var c = caps(param);
		var a = accessors(param);
		if (c.hasSetValue === true) {
			return true;
		}
		if (a.setValue && a.setValue.available === true) {
			return true;
		}
		if (c.hasSetValue === false) {
			return false;
		}
		return !!(param && param.writable);
	}

	function displayNameOf(param) {
		var fromIdentity;
		if (!param) {
			return "";
		}
		if (trim(param.displayName)) {
			return trim(param.displayName);
		}
		if (trim(param.parameter)) {
			return trim(param.parameter);
		}
		fromIdentity = identityValue(fieldRecord(param, "displayName"));
		if (fromIdentity !== undefined) {
			return trim(fromIdentity);
		}
		return "";
	}

	function matchCount(param) {
		if (!param) {
			return undefined;
		}
		if (typeof param.displayNameMatchCount === "number" && isFinite(param.displayNameMatchCount)) {
			return param.displayNameMatchCount;
		}
		return undefined;
	}

	function conclude(param) {
		var name = displayNameOf(param);
		var extra = extraIdentityFields(param);
		var extraCount = 0;
		var key;
		var uniqueCount = matchCount(param);
		var type = param && param.type;
		var booleanType = type === "boolean";
		var explicitUser = hasAnyBooleanTrue(param, USER_FACING_FLAG_NAMES);
		var explicitInternal = hasAnyBooleanTrue(param, INTERNAL_FLAG_NAMES);
		var resolvable = name !== "";
		var unique = uniqueCount === undefined || uniqueCount === 1;
		var safeToResolve = resolvable && unique;
		var hasExtraIdentity = false;
		var reason;
		var safeWrite = false;

		for (key in extra) {
			if (extra.hasOwnProperty(key)) {
				extraCount += 1;
			}
		}
		hasExtraIdentity = extraCount > 0;

		if (!booleanType) {
			reason = "NOT_BOOLEAN";
		} else if (!resolvable) {
			reason = "EMPTY_DISPLAY_NAME";
		} else if (uniqueCount !== undefined && uniqueCount > 1) {
			reason = "AMBIGUOUS_DISPLAY_NAME";
			safeToResolve = false;
		} else if (!hasGetValue(param)) {
			reason = "NO_GET_VALUE";
		} else if (!hasSetValue(param)) {
			reason = "NO_SET_VALUE";
		} else if (explicitInternal) {
			reason = "EXPLICIT_INTERNAL_FLAG";
		} else if (!hasExtraIdentity && !explicitUser) {
			reason = "BOOLEAN_SETVALUE_DISPLAYNAME_ONLY";
		} else if (!hasExtraIdentity) {
			reason = "NO_STABLE_IDENTITY_BEYOND_DISPLAY_NAME";
		} else if (!explicitUser) {
			reason = "NO_EXPLICIT_USER_FACING_FLAG";
		} else {
			safeWrite = true;
			reason = "SAFE_BOOLEAN_WRITE_CANDIDATE";
		}

		return {
			hasStableIdentity: hasExtraIdentity,
			hasExplicitUserFacingFlag: explicitUser,
			hasExplicitInternalFlag: explicitInternal,
			safeToResolveByDisplayName: safeToResolve,
			safeBooleanWriteCandidate: safeWrite,
			reason: reason,
			resolvableByExistingDisplayNameResolver: resolvable
		};
	}

	function inspect(param) {
		return {
			exposedFields: collectExposedFields(param),
			conclusions: conclude(param)
		};
	}

	return {
		conclude: conclude,
		collectExposedFields: collectExposedFields,
		inspect: inspect
	};
}());

if (typeof $ !== "undefined") {
	$._pickfxBooleanCandidateInspect = BooleanCandidateInspect;
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = BooleanCandidateInspect;
}
