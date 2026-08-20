var ParameterCapability = (function () {
	var WRITE = {
		NUMBER: "NUMBER",
		BOOLEAN: "BOOLEAN",
		POINT: "POINT",
		COLOR: "COLOR",
		ENUM: "ENUM",
		STRING: "STRING",
		UNSUPPORTED: "UNSUPPORTED",
		TIME_VARYING_UNSUPPORTED: "TIME_VARYING_UNSUPPORTED"
	};

	var STATUS = {
		DISCOVERED: "DISCOVERED",
		READABLE: "READABLE",
		WRITABLE_CANDIDATE: "WRITABLE_CANDIDATE",
		CANDIDATE: "CANDIDATE",
		WRITE_TESTED: "WRITE_TESTED",
		WRITE_CONFIRMED: "WRITE_CONFIRMED",
		MULTICLIP_CONFIRMED: "MULTICLIP_CONFIRMED",
		PRODUCTION_ENABLED: "PRODUCTION_ENABLED",
		ENUM_LIKE_NUMBER: "ENUM_LIKE_NUMBER",
		UNSUPPORTED: "UNSUPPORTED",
		UNKNOWN: "UNKNOWN",
		REJECTED: "REJECTED",
		TIME_VARYING_UNSUPPORTED: "TIME_VARYING_UNSUPPORTED"
	};

	function provenTypes() {
		var types = { number: true, point: true };
		types["boolean"] = true;
		return types;
	}

	function writeCapabilityFor(type, timeVarying) {
		if (timeVarying === true) {
			return WRITE.TIME_VARYING_UNSUPPORTED;
		}
		if (type === "number" || type === "angle") {
			return WRITE.NUMBER;
		}
		if (type === "boolean") {
			return WRITE.BOOLEAN;
		}
		if (type === "point") {
			return WRITE.POINT;
		}
		if (type === "color") {
			return WRITE.COLOR;
		}
		if (type === "enum") {
			return WRITE.ENUM;
		}
		if (type === "string") {
			return WRITE.STRING;
		}
		return WRITE.UNSUPPORTED;
	}

	function numericClassifier() {
		if (typeof NumericCandidateClassifier !== "undefined" && NumericCandidateClassifier.classify) {
			return NumericCandidateClassifier;
		}
		if (typeof $ !== "undefined" && $._pickfxNumericCandidateClassifier) {
			return $._pickfxNumericCandidateClassifier;
		}
		return null;
	}

	function classify(snapshot) {
		var type = snapshot && snapshot.runtimeType ? snapshot.runtimeType : "unknown";
		var readable = !!(snapshot && snapshot.hasGetValue && snapshot.getError !== true);
		var hasSetValue = !!(snapshot && snapshot.hasSetValue);
		var timeVarying = !!(snapshot && snapshot.timeVarying === true);
		var keyframeSupported = !!(snapshot && snapshot.areKeyframesSupported === true);
		var writeCapability = writeCapabilityFor(type, timeVarying);
		var writableCandidate = false;
		var status;
		var confirmed;
		var enabledWriter = false;
		var numeric;
		var cls = numericClassifier();
		var productionEnabled = false;
		var reason;

		if (timeVarying) {
			status = STATUS.TIME_VARYING_UNSUPPORTED;
		} else if (type === "unknown" || type === "error") {
			status = STATUS.UNKNOWN;
		} else if (type === "color" || type === "enum" || type === "string") {
			status = readable ? STATUS.DISCOVERED : STATUS.UNSUPPORTED;
			if (readable && !hasSetValue) {
				status = STATUS.READABLE;
			}
		} else if (provenTypes()[type] || type === "angle") {
			enabledWriter = hasSetValue && readable;
			writableCandidate = enabledWriter;
			status = writableCandidate ? STATUS.WRITABLE_CANDIDATE : (readable ? STATUS.READABLE : STATUS.DISCOVERED);
		} else {
			status = STATUS.UNKNOWN;
		}

		if ((type === "number" || type === "angle") && cls && cls.classify) {
			numeric = cls.classify(snapshot);
			reason = numeric.reason;
			productionEnabled = numeric.productionEnabled === true;
			if (numeric.status === "ENUM_LIKE_NUMBER") {
				status = STATUS.ENUM_LIKE_NUMBER;
				writableCandidate = false;
				enabledWriter = false;
				writeCapability = WRITE.UNSUPPORTED;
			} else if (numeric.status === "REJECTED") {
				status = numeric.reason === "TIME_VARYING" ? STATUS.TIME_VARYING_UNSUPPORTED : STATUS.REJECTED;
				writableCandidate = false;
				enabledWriter = false;
				if (numeric.reason === "TIME_VARYING") {
					writeCapability = WRITE.TIME_VARYING_UNSUPPORTED;
				}
			} else if (numeric.status === "UNSUPPORTED") {
				status = STATUS.UNSUPPORTED;
				writableCandidate = false;
				enabledWriter = false;
			} else if (numeric.status === "UNKNOWN") {
				status = STATUS.UNKNOWN;
				writableCandidate = false;
				enabledWriter = false;
			} else if (numeric.status === "CANDIDATE") {
				status = STATUS.WRITABLE_CANDIDATE;
				writableCandidate = true;
				enabledWriter = false;
			} else if (numeric.status === "WRITE_TESTED") {
				status = STATUS.WRITE_TESTED;
				writableCandidate = false;
				enabledWriter = false;
			} else if (numeric.status === "WRITE_CONFIRMED") {
				status = STATUS.WRITE_CONFIRMED;
				writableCandidate = false;
				enabledWriter = false;
			} else if (numeric.status === "PRODUCTION_ENABLED") {
				status = numeric.registryStatus || STATUS.WRITE_CONFIRMED;
				writableCandidate = false;
				enabledWriter = hasSetValue && readable;
				productionEnabled = true;
			}
		} else if (!timeVarying && typeof ConfirmedParameterWrites !== "undefined" && ConfirmedParameterWrites.lookup) {
			confirmed = ConfirmedParameterWrites.lookup(
				snapshot && snapshot.componentDisplayName,
				snapshot && snapshot.displayName,
				type === "angle" ? "number" : type
			);
			if (confirmed && confirmed.status) {
				status = confirmed.status;
				productionEnabled = confirmed.productionEnabled === true;
				enabledWriter = productionEnabled && hasSetValue && readable;
				writableCandidate = !productionEnabled && writableCandidate;
			}
		}

		if (writeCapability === WRITE.COLOR || writeCapability === WRITE.ENUM || writeCapability === WRITE.STRING) {
			enabledWriter = false;
		}
		if (writeCapability === WRITE.TIME_VARYING_UNSUPPORTED || writeCapability === WRITE.UNSUPPORTED) {
			enabledWriter = false;
			writableCandidate = false;
		}

		return {
			readable: readable,
			writable: enabledWriter,
			writableCandidate: writableCandidate,
			keyframeSupported: keyframeSupported,
			timeVarying: timeVarying,
			type: type,
			writeCapability: writeCapability,
			status: status,
			hasSetValue: hasSetValue,
			productionEnabled: productionEnabled,
			reason: reason
		};
	}

	function emptyTypeBucket() {
		return {
			count: 0,
			discovered: 0,
			candidate: 0,
			confirmed: 0,
			productionEnabled: 0,
			parameters: []
		};
	}

	function matrixFromParameters(parameters) {
		var capabilities = {
			number: emptyTypeBucket(),
			point: emptyTypeBucket(),
			color: emptyTypeBucket(),
			string: emptyTypeBucket(),
			unknown: emptyTypeBucket()
		};
		capabilities["boolean"] = emptyTypeBucket();
		capabilities["enum"] = emptyTypeBucket();
		var confirmedWrites = [];
		var unsupported = [];
		var unknown = [];
		var confirmedProduction = [];
		var writeCandidates = [];
		var testedCandidates = [];
		var rejected = [];
		var i;
		var row;
		var bucket;
		var typeKey;

		parameters = parameters || [];
		for (i = 0; i < parameters.length; i++) {
			row = parameters[i];
			if (!row) {
				continue;
			}
			typeKey = row.runtimeType || row.type || "unknown";
			if (typeKey === "angle") {
				typeKey = "number";
			}
			if (!capabilities[typeKey]) {
				typeKey = "unknown";
			}
			bucket = capabilities[typeKey];
			bucket.count += 1;
			bucket.discovered += 1;
			bucket.parameters.push(row);
			if (row.status === STATUS.CANDIDATE || row.status === STATUS.WRITABLE_CANDIDATE) {
				bucket.candidate += 1;
				writeCandidates.push(row);
			}
			if (row.status === STATUS.WRITE_CONFIRMED || row.status === STATUS.MULTICLIP_CONFIRMED ||
					row.status === STATUS.PRODUCTION_ENABLED || row.productionEnabled === true) {
				bucket.confirmed += 1;
			}
			if (row.productionEnabled === true || row.status === STATUS.PRODUCTION_ENABLED) {
				bucket.productionEnabled += 1;
				confirmedProduction.push(row);
			} else if (row.status === STATUS.WRITE_TESTED) {
				testedCandidates.push(row);
			} else if (row.status === STATUS.WRITE_CONFIRMED && row.productionEnabled !== true) {
				testedCandidates.push(row);
			}
			if (row.status === STATUS.WRITE_CONFIRMED || row.status === STATUS.MULTICLIP_CONFIRMED) {
				confirmedWrites.push(row);
			} else if (row.status === STATUS.UNKNOWN || typeKey === "unknown") {
				unknown.push(row);
			} else if (row.status === STATUS.REJECTED || row.status === STATUS.ENUM_LIKE_NUMBER) {
				rejected.push(row);
			} else if (row.writeCapability === WRITE.UNSUPPORTED || row.writeCapability === WRITE.COLOR ||
					row.writeCapability === WRITE.ENUM || row.writeCapability === WRITE.STRING ||
					row.status === STATUS.UNSUPPORTED || row.status === STATUS.TIME_VARYING_UNSUPPORTED) {
				unsupported.push(row);
			}
		}

		return {
			capabilities: capabilities,
			confirmedWrites: confirmedWrites,
			unsupported: unsupported,
			unknown: unknown,
			confirmedProduction: confirmedProduction,
			writeCandidates: writeCandidates,
			testedCandidates: testedCandidates,
			rejected: rejected
		};
	}

	return {
		WRITE: WRITE,
		STATUS: STATUS,
		classify: classify,
		writeCapabilityFor: writeCapabilityFor,
		matrixFromParameters: matrixFromParameters
	};
}());

if (typeof $ !== "undefined") {
	$._pickfxParameterCapability = ParameterCapability;
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = ParameterCapability;
}
