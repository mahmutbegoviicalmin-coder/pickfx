var TypedCandidateClassifier = (function () {
	function trim(value) {
		return String(value || "").replace(/^\s+|\s+$/g, "");
	}

	function caps(param) {
		return (param && param.domCapabilities) ? param.domCapabilities : {};
	}

	function hasGetValue(param) {
		var c = caps(param);
		if (c.hasGetValue === true) {
			return true;
		}
		if (c.hasGetValue === false) {
			return false;
		}
		return param && param.value !== undefined;
	}

	function hasSetValue(param) {
		var c = caps(param);
		if (c.hasSetValue === true) {
			return true;
		}
		if (c.hasSetValue === false) {
			return false;
		}
		return !!(param && param.writable);
	}

	function displayNameOf(param) {
		return trim(param && param.displayName);
	}

	function hasStableIdentity(param) {
		return !!displayNameOf(param);
	}

	var VISIBILITY_FLAG_NAMES = [
		"hidden", "isHidden", "hiddenInUI", "isHiddenInUI", "elided", "isElided",
		"visible", "isVisible", "showInUI", "includeInUI",
		"internal", "isInternal", "system", "isSystem",
		"control", "isControl", "group", "isGroup",
		"separator", "isSeparator", "folder", "isFolder",
		"container", "isContainer",
		"userFacing", "isUserFacing", "userParam", "isUserParam",
		"enabled", "isEnabled", "active", "isActive",
		"propertyFlags", "flags", "attributes", "access", "uiFlags"
	];

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

	function booleanField(record) {
		if (!record) {
			return undefined;
		}
		if (record.typeofValue === "boolean") {
			return record.value === true;
		}
		if (record.value === true) {
			return true;
		}
		if (record.value === false) {
			return false;
		}
		return undefined;
	}

	function stringField(record) {
		if (!record) {
			return "";
		}
		if (record.typeofValue === "string" && record.value != null) {
			return String(record.value);
		}
		if (typeof record.value === "string") {
			return record.value;
		}
		return "";
	}

	function collectedEvidence(param) {
		var found = {};
		var missing = [];
		var i;
		var name;
		var rec;
		var flag;
		for (i = 0; i < VISIBILITY_FLAG_NAMES.length; i++) {
			name = VISIBILITY_FLAG_NAMES[i];
			rec = fieldRecord(param, name);
			flag = booleanField(rec);
			if (flag !== undefined) {
				found[name] = flag;
			} else if (stringField(rec)) {
				found[name] = stringField(rec);
			} else {
				missing.push(name);
			}
		}
		return { found: found, missing: missing };
	}

	function classifyUserFacing(param) {
		var evidence = collectedEvidence(param);
		var found = evidence.found;
		var hidden = found.hidden === true || found.isHidden === true ||
			found.hiddenInUI === true || found.isHiddenInUI === true ||
			found.elided === true || found.isElided === true;
		var internal = found.internal === true || found.isInternal === true ||
			found.system === true || found.isSystem === true;
		var control = found.control === true || found.isControl === true ||
			found.group === true || found.isGroup === true ||
			found.separator === true || found.isSeparator === true ||
			found.folder === true || found.isFolder === true ||
			found.container === true || found.isContainer === true;
		var user = found.userFacing === true || found.isUserFacing === true ||
			found.userParam === true || found.isUserParam === true;
		var visible = found.visible === true || found.isVisible === true ||
			found.showInUI === true || found.includeInUI === true;
		var access = "";
		if (typeof found.access === "string") {
			access = found.access.toLowerCase();
		}
		if (typeof found.flags === "string") {
			access = access || found.flags.toLowerCase();
		}
		if (typeof found.uiFlags === "string") {
			access = access || found.uiFlags.toLowerCase();
		}
		if (access === "internal" || access === "hidden" || access === "system") {
			internal = true;
		}
		if (access === "control" || access === "group") {
			control = true;
		}
		if (access === "user" || access === "userfacing") {
			user = true;
		}

		if (hidden || internal) {
			return {
				userFacingCandidate: false,
				confidence: "high",
				reason: "INTERNAL_PARAMETER_METADATA",
				visibilityEvidence: evidence
			};
		}
		if (control) {
			return {
				userFacingCandidate: false,
				confidence: "high",
				reason: "CONTROL_PARAMETER_METADATA",
				visibilityEvidence: evidence
			};
		}
		if (user || visible) {
			return {
				userFacingCandidate: true,
				confidence: "high",
				reason: "EXPLICIT_USER_PARAMETER_METADATA",
				visibilityEvidence: evidence
			};
		}
		return {
			userFacingCandidate: "unknown",
			confidence: "low",
			reason: "INSUFFICIENT_METADATA",
			visibilityEvidence: evidence
		};
	}

	function typeHintOf(param) {
		if (param && param.typeHint) {
			return String(param.typeHint);
		}
		if (param && param.metadata && param.metadata.typeHint) {
			return String(param.metadata.typeHint);
		}
		return "";
	}

	function looksEnumType(param) {
		var type = param && param.type;
		var hint = typeHintOf(param);
		var c = caps(param);
		if (type === "enum" || hint === "enum") {
			return true;
		}
		return !!(c.hasItems || c.hasValueNames || c.hasOptions ||
			c.hasGetItem || c.hasGetListItem || c.hasGetValueName);
	}

	function looksBooleanType(param) {
		if (!param) {
			return false;
		}
		if (param.type === "boolean") {
			return true;
		}
		return typeof param.value === "boolean";
	}

	function realOptions(param) {
		var list = [];
		var source;
		var i;
		var option;
		var valueOk;
		var labelOk;
		if (!param) {
			return [];
		}
		source = param.options;
		if (!source || !source.length) {
			source = param.metadata && param.metadata.options;
		}
		if (!source || !source.length) {
			return [];
		}
		if (param.optionValuesGuessed) {
			return [];
		}
		for (i = 0; i < source.length; i++) {
			option = source[i];
			if (option === undefined || option === null) {
				return [];
			}
			if (typeof option === "string" || typeof option === "number" || typeof option === "boolean") {
				list.push({ value: option, label: String(option) });
				continue;
			}
			valueOk = option.value !== undefined && option.value !== null;
			labelOk = trim(option.label) !== "";
			if (!valueOk || !labelOk) {
				return [];
			}
			if (option.incomplete || option.guessedIndex) {
				return [];
			}
			list.push({
				value: option.value,
				label: String(option.label)
			});
		}
		return list;
	}

	function optionDefect(param) {
		var source;
		var i;
		var option;
		var sawIncompleteValue = false;
		var sawIncompleteLabel = false;
		if (param && param.optionValuesGuessed) {
			return "OPTION_VALUES_GUESSED";
		}
		source = param && (param.options || (param.metadata && param.metadata.options));
		if (!source || !source.length) {
			return "NO_ENUM_OPTIONS";
		}
		for (i = 0; i < source.length; i++) {
			option = source[i];
			if (option === undefined || option === null) {
				sawIncompleteValue = true;
				continue;
			}
			if (typeof option === "string" || typeof option === "number" || typeof option === "boolean") {
				continue;
			}
			if (option.guessedIndex || option.incomplete && option.value === undefined) {
				return "OPTION_VALUES_GUESSED";
			}
			if (option.value === undefined || option.value === null) {
				sawIncompleteValue = true;
			}
			if (!trim(option.label) && typeof option !== "string") {
				sawIncompleteLabel = true;
			}
		}
		if (sawIncompleteValue) {
			return "OPTIONS_MISSING_VALUES";
		}
		if (sawIncompleteLabel) {
			return "OPTIONS_MISSING_LABELS";
		}
		return "";
	}

	function classify(param) {
		var name = displayNameOf(param);
		var type = param && param.type;
		var booleanLooking = looksBooleanType(param);
		var enumLooking = looksEnumType(param);
		var options;
		var defect;
		var result = {
			typedCandidate: "none",
			safeForBooleanWrite: false,
			safeForEnumWrite: false,
			safeForWrite: false,
			userFacingCandidate: "unknown",
			confidence: "low",
			reason: "",
			options: []
		};
		var facing;

		if (booleanLooking) {
			result.typedCandidate = "boolean";
			if (typeof param.value === "number") {
				result.reason = "NUMBER_NOT_BOOLEAN";
				return result;
			}
			if (type !== "boolean") {
				result.reason = "NOT_BOOLEAN";
				return result;
			}
			if (!name) {
				result.reason = "EMPTY_DISPLAY_NAME";
				return result;
			}
			if (!hasStableIdentity(param)) {
				result.reason = "NO_STABLE_IDENTITY";
				return result;
			}
			if (!hasGetValue(param)) {
				result.reason = "NO_GET_VALUE";
				return result;
			}
			if (!hasSetValue(param)) {
				result.reason = "NO_SET_VALUE";
				return result;
			}
			result.safeForBooleanWrite = true;
			result.safeForWrite = true;
			result.writeReason = "DISPLAY_PARAMETER_WITH_WRITABLE_DOM";
			facing = classifyUserFacing(param);
			result.userFacingCandidate = facing.userFacingCandidate;
			result.confidence = facing.confidence;
			result.reason = facing.reason;
			result.visibilityEvidence = facing.visibilityEvidence;
			return result;
		}

		if (enumLooking) {
			result.typedCandidate = "enum";
			if (!name) {
				result.reason = "EMPTY_DISPLAY_NAME";
				return result;
			}
			if (!hasStableIdentity(param)) {
				result.reason = "NO_STABLE_IDENTITY";
				return result;
			}
			if (!hasGetValue(param)) {
				result.reason = "NO_GET_VALUE";
				return result;
			}
			if (!hasSetValue(param)) {
				result.reason = "NO_SET_VALUE";
				return result;
			}
			if (type !== "enum" && typeHintOf(param) !== "enum") {
				defect = optionDefect(param);
				result.reason = defect || "NOT_ENUM";
				return result;
			}
			options = realOptions(param);
			if (!options.length) {
				result.reason = optionDefect(param) || "NO_ENUM_OPTIONS";
				return result;
			}
			result.options = options;
			result.safeForEnumWrite = true;
			result.safeForWrite = true;
			result.writeReason = "DISPLAY_PARAMETER_WITH_WRITABLE_DOM";
			facing = classifyUserFacing(param);
			result.userFacingCandidate = facing.userFacingCandidate;
			result.confidence = facing.confidence;
			result.reason = facing.reason;
			result.visibilityEvidence = facing.visibilityEvidence;
			return result;
		}

		return result;
	}

	function compactRow(effectName, param, classified) {
		var row = {
			effect: effectName || "",
			parameter: displayNameOf(param) || "",
			type: param && param.type ? param.type : "unknown",
			value: param ? param.value : undefined,
			safe: false,
			safeForWrite: false,
			userFacingCandidate: classified ? classified.userFacingCandidate : "unknown",
			confidence: classified ? classified.confidence : "low",
			reason: classified ? classified.reason : ""
		};
		if (param) {
			row.displayName = param.displayName;
			row.index = param.index;
			row.writable = param.writable;
			if (param.raw) {
				row.raw = param.raw;
			}
			if (param.domCapabilities) {
				row.domCapabilities = param.domCapabilities;
			}
			if (param.identity) {
				row.identity = param.identity;
			}
			if (param.metadata) {
				row.metadata = param.metadata;
			}
			if (param.objectKeys) {
				row.objectKeys = param.objectKeys;
			}
			if (param.forInKeys) {
				row.forInKeys = param.forInKeys;
			}
			if (param.ownPropertyNames) {
				row.ownPropertyNames = param.ownPropertyNames;
			}
			if (param.prototypeChain) {
				row.prototypeChain = param.prototypeChain;
			}
			if (param.candidateMetadata) {
				row.candidateMetadata = param.candidateMetadata;
			}
			if (param.reflection) {
				row.reflection = param.reflection;
			}
		}
		if (classified && classified.visibilityEvidence) {
			row.visibilityEvidence = classified.visibilityEvidence;
		}
		if (classified && classified.writeReason) {
			row.writeReason = classified.writeReason;
		}
		if (classified && classified.safeForBooleanWrite) {
			row.safe = true;
			row.safeForWrite = true;
			if (!row.identity) {
				row.identity = { displayName: displayNameOf(param) };
			}
			return row;
		}
		if (classified && classified.safeForEnumWrite) {
			row.safe = true;
			row.safeForWrite = true;
			row.options = classified.options;
			return row;
		}
		row.reason = classified ? classified.reason : "NOT_ENUM";
		return row;
	}

	function report(entries) {
		var booleanCandidates = [];
		var enumCandidates = [];
		var rejected = [];
		var i;
		var entry;
		var classified;
		var row;
		if (!entries || !entries.length) {
			return {
				ok: true,
				booleanCandidates: [],
				enumCandidates: [],
				rejected: [],
				settersCalled: false,
				usedQE: false
			};
		}
		for (i = 0; i < entries.length; i++) {
			entry = entries[i];
			classified = classify(entry.param);
			if (classified.typedCandidate === "none") {
				continue;
			}
			row = compactRow(entry.effect, entry.param, classified);
			if (classified.safeForBooleanWrite) {
				booleanCandidates.push(row);
			} else if (classified.safeForEnumWrite) {
				enumCandidates.push(row);
			} else {
				rejected.push({
					effect: row.effect,
					parameter: row.parameter,
					reason: classified.reason
				});
			}
		}
		return {
			ok: true,
			booleanCandidates: booleanCandidates,
			enumCandidates: enumCandidates,
			rejected: rejected,
			settersCalled: false,
			usedQE: false
		};
	}

	return {
		classify: classify,
		classifyUserFacing: classifyUserFacing,
		realOptions: realOptions,
		report: report
	};
}());

if (typeof $ !== "undefined") {
	$._pickfxTypedCandidateClassifier = TypedCandidateClassifier;
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = TypedCandidateClassifier;
}
