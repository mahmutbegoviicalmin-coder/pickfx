var NumericCandidateClassifier = (function () {
	var ENUM_FIELDS = ["items", "valueNames", "options", "enumItems", "listItems"];
	var ENUM_FNS = ["getItem", "getListItem", "getValueName", "getValueNames", "getOptions"];
	var WRITE_METHOD = "ComponentParam.setValue(value, true)";

	function fold(value) {
		return String(value || "").replace(/^\s+|\s+$/g, "").toLowerCase();
	}

	function trimmed(value) {
		return String(value || "").replace(/^\s+|\s+$/g, "");
	}

	function isScaleHeight(name) {
		return fold(name) === "scale height";
	}

	function isBlendMode(name) {
		return fold(name) === "blend mode";
	}

	function isTimeRemapping(snapshot) {
		return fold(snapshot && snapshot.displayName) === "time remapping" ||
			fold(snapshot && snapshot.componentDisplayName) === "time remapping";
	}

	function hasEnumLikeMetadata(snapshot) {
		var i;
		var field;
		var flag;
		if (!snapshot) {
			return false;
		}
		if (snapshot.runtimeType === "enum" || snapshot.type === "enum") {
			return true;
		}
		if (snapshot.enumLike === true) {
			return true;
		}
		for (i = 0; i < ENUM_FIELDS.length; i++) {
			field = ENUM_FIELDS[i];
			flag = "has" + field.charAt(0).toUpperCase() + field.slice(1);
			if (snapshot[flag] === true) {
				return true;
			}
			if (snapshot[field] !== undefined && snapshot[field] !== null) {
				return true;
			}
		}
		for (i = 0; i < ENUM_FNS.length; i++) {
			field = ENUM_FNS[i];
			flag = "has" + field.charAt(0).toUpperCase() + field.slice(1);
			if (snapshot[flag] === true) {
				return true;
			}
			if (snapshot["typeof" + field.charAt(0).toUpperCase() + field.slice(1)] === "function") {
				return true;
			}
		}
		return false;
	}

	function registryLookup(snapshot) {
		var type;
		if (typeof ConfirmedParameterWrites === "undefined" || !ConfirmedParameterWrites.lookup) {
			return null;
		}
		type = snapshot && snapshot.runtimeType === "angle" ? "number" : (snapshot && snapshot.runtimeType);
		return ConfirmedParameterWrites.lookup(
			snapshot && snapshot.componentDisplayName,
			snapshot && snapshot.displayName,
			type === "number" || type === "boolean" || type === "point" ? type : undefined
		);
	}

	function result(status, reason, extra) {
		var payload = {
			status: status,
			reason: reason,
			candidate: status === "CANDIDATE",
			productionEnabled: false,
			writeMethod: WRITE_METHOD,
			writeCapability: status === "CANDIDATE" || status === "WRITE_CONFIRMED" ||
				status === "PRODUCTION_ENABLED" || status === "WRITE_TESTED" ? "NUMBER" : "UNSUPPORTED"
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

	function classify(snapshot) {
		var displayName = snapshot ? trimmed(snapshot.displayName) : "";
		var componentName = snapshot ? trimmed(snapshot.componentDisplayName) : "";
		var type = snapshot && snapshot.runtimeType ? snapshot.runtimeType : "unknown";
		var current = snapshot ? snapshot.currentValue : undefined;
		var confirmed;
		var productionEnabled;

		if (!displayName) {
			return result("REJECTED", "EMPTY_DISPLAY_NAME");
		}
		if (!componentName) {
			return result("REJECTED", "NO_SAFE_IDENTITY");
		}
		if (isScaleHeight(displayName)) {
			return result("REJECTED", "PARAMETER_NOT_FOUND", {
				detail: "Scale Height is not a Premiere ComponentParam."
			});
		}
		if (isTimeRemapping(snapshot)) {
			return result("UNSUPPORTED", "UNSUPPORTED_TYPE");
		}
		if (isBlendMode(displayName) || hasEnumLikeMetadata(snapshot)) {
			return result("ENUM_LIKE_NUMBER", "ENUM_LIKE_NUMBER");
		}
		if (snapshot && snapshot.getError === true) {
			return result("REJECTED", "NO_GET_VALUE");
		}
		if (!(snapshot && snapshot.hasGetValue === true)) {
			return result("REJECTED", "NO_GET_VALUE");
		}
		if (!(snapshot && snapshot.hasSetValue === true)) {
			return result("REJECTED", "NO_SET_VALUE");
		}
		if (snapshot && snapshot.timeVarying === true) {
			return result("REJECTED", "TIME_VARYING", {
				writeCapability: "TIME_VARYING_UNSUPPORTED",
				timeVarying: true
			});
		}
		if (type === "color" || type === "point" || type === "string" || type === "boolean" || type === "enum") {
			return result("UNSUPPORTED", "UNSUPPORTED_TYPE");
		}
		if (type === "unknown" || type === "error") {
			return result("UNKNOWN", "UNKNOWN");
		}
		if (type !== "number" && type !== "angle") {
			return result("UNSUPPORTED", "UNSUPPORTED_TYPE");
		}
		if (current !== undefined && typeof current !== "number") {
			return result("UNSUPPORTED", "UNSUPPORTED_TYPE");
		}

		confirmed = registryLookup(snapshot);
		productionEnabled = !!(confirmed && confirmed.productionEnabled === true);
		if (productionEnabled) {
			return result("PRODUCTION_ENABLED", undefined, {
				candidate: false,
				productionEnabled: true,
				registryStatus: confirmed.status,
				writeCapability: "NUMBER"
			});
		}
		if (confirmed && confirmed.status === "WRITE_TESTED") {
			return result("WRITE_TESTED", undefined, {
				candidate: false,
				productionEnabled: false,
				writeCapability: "NUMBER"
			});
		}
		if (confirmed && (confirmed.status === "WRITE_CONFIRMED" || confirmed.status === "MULTICLIP_CONFIRMED")) {
			return result("WRITE_CONFIRMED", undefined, {
				candidate: false,
				productionEnabled: false,
				registryStatus: confirmed.status,
				writeCapability: "NUMBER"
			});
		}
		return result("CANDIDATE", undefined, {
			candidate: true,
			productionEnabled: false,
			writeCapability: "NUMBER"
		});
	}

	return {
		classify: classify,
		hasEnumLikeMetadata: hasEnumLikeMetadata,
		isScaleHeight: isScaleHeight,
		isBlendMode: isBlendMode
	};
}());

if (typeof $ !== "undefined") {
	$._pickfxNumericCandidateClassifier = NumericCandidateClassifier;
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = NumericCandidateClassifier;
}
