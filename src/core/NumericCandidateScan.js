var NumericCandidateScan = (function () {
	var OPERATION = "numeric.candidate.scan";
	var WRITE_METHOD = "ComponentParam.setValue(value, true)";

	function emptyNumberSummary() {
		return {
			discovered: 0,
			candidate: 0,
			confirmed: 0,
			productionEnabled: 0
		};
	}

	function classifier() {
		if (typeof NumericCandidateClassifier !== "undefined" && NumericCandidateClassifier.classify) {
			return NumericCandidateClassifier;
		}
		if (typeof $ !== "undefined" && $._pickfxNumericCandidateClassifier) {
			return $._pickfxNumericCandidateClassifier;
		}
		return null;
	}

	function inspectFn() {
		if (typeof UniversalParameterInspect !== "undefined" && UniversalParameterInspect.inspect) {
			return UniversalParameterInspect;
		}
		if (typeof $ !== "undefined" && $._pickfxUniversalParameterInspect) {
			return $._pickfxUniversalParameterInspect;
		}
		return null;
	}

	function rowFrom(snapshot, classified) {
		classified = classified || {};
		return {
			component: snapshot.componentDisplayName || "",
			componentMatchName: snapshot.componentMatchName || "",
			parameter: snapshot.displayName || "",
			parameterMatchName: snapshot.matchName || "",
			runtimeType: snapshot.runtimeType || snapshot.type || "unknown",
			currentValue: snapshot.currentValue !== undefined ? snapshot.currentValue : snapshot.value,
			hasGetValue: snapshot.hasGetValue === true,
			hasSetValue: snapshot.hasSetValue === true,
			timeVarying: snapshot.timeVarying === true,
			status: classified.status || snapshot.status || "DISCOVERED",
			reason: classified.reason || snapshot.rejectionReason,
			productionEnabled: classified.productionEnabled === true || snapshot.productionEnabled === true,
			writeMethod: WRITE_METHOD,
			writable: classified.productionEnabled === true || snapshot.productionEnabled === true,
			writableCandidate: classified.candidate === true || classified.status === "CANDIDATE",
			diagnosticIndex: snapshot.diagnosticIndex
		};
	}

	function emptyPromotion() {
		return {
			confirmedProduction: [],
			writeCandidates: [],
			testedCandidates: [],
			unknown: [],
			unsupported: [],
			rejected: []
		};
	}

	function attach(inspected) {
		var cls = classifier();
		var promotion = emptyPromotion();
		var numberSummary = emptyNumberSummary();
		var parameters;
		var i;
		var snapshot;
		var classified;
		var row;
		var type;
		if (!inspected || !inspected.ok) {
			return inspected;
		}
		parameters = inspected.parameters || [];
		for (i = 0; i < parameters.length; i++) {
			snapshot = parameters[i];
			if (!snapshot) {
				continue;
			}
			classified = cls && cls.classify ? cls.classify(snapshot) : {
				status: snapshot.status || "DISCOVERED",
				reason: snapshot.rejectionReason,
				candidate: snapshot.writableCandidate === true,
				productionEnabled: snapshot.productionEnabled === true
			};
			row = rowFrom(snapshot, classified);
			type = snapshot.runtimeType || snapshot.type || "unknown";
			if (type === "angle") {
				type = "number";
			}
			if (type === "number") {
				numberSummary.discovered += 1;
				if (classified.status === "CANDIDATE") {
					numberSummary.candidate += 1;
				}
				if (classified.status === "WRITE_CONFIRMED" || classified.status === "WRITE_TESTED" ||
						classified.status === "PRODUCTION_ENABLED" || classified.registryStatus === "MULTICLIP_CONFIRMED" ||
						classified.registryStatus === "WRITE_CONFIRMED") {
					numberSummary.confirmed += 1;
				}
				if (classified.productionEnabled === true) {
					numberSummary.productionEnabled += 1;
				}
			}
			if (classified.productionEnabled === true || classified.status === "PRODUCTION_ENABLED") {
				promotion.confirmedProduction.push(row);
			} else if (classified.status === "WRITE_TESTED" || classified.status === "WRITE_CONFIRMED") {
				promotion.testedCandidates.push(row);
			} else if (classified.status === "CANDIDATE") {
				promotion.writeCandidates.push(row);
			} else if (classified.status === "UNKNOWN") {
				promotion.unknown.push(row);
			} else if (classified.status === "UNSUPPORTED") {
				promotion.unsupported.push(row);
			} else if (classified.status === "REJECTED" || classified.status === "ENUM_LIKE_NUMBER") {
				promotion.rejected.push(row);
			} else if (snapshot.status === "UNKNOWN" || type === "unknown") {
				promotion.unknown.push(row);
			} else if (snapshot.writeCapability === "COLOR" || snapshot.writeCapability === "ENUM" ||
					snapshot.writeCapability === "STRING" || snapshot.writeCapability === "UNSUPPORTED" ||
					snapshot.status === "TIME_VARYING_UNSUPPORTED") {
				promotion.unsupported.push(row);
			} else if (snapshot.status === "WRITABLE_CANDIDATE") {
				promotion.writeCandidates.push(row);
			}
		}
		inspected.promotion = promotion;
		inspected.confirmedProduction = promotion.confirmedProduction;
		inspected.writeCandidates = promotion.writeCandidates;
		inspected.testedCandidates = promotion.testedCandidates;
		inspected.rejected = promotion.rejected;
		if (!inspected.capabilities) {
			inspected.capabilities = {};
		}
		if (!inspected.capabilities.number) {
			inspected.capabilities.number = {
				count: numberSummary.discovered,
				parameters: []
			};
		}
		inspected.capabilities.number.discovered = numberSummary.discovered;
		inspected.capabilities.number.candidate = numberSummary.candidate;
		inspected.capabilities.number.confirmed = numberSummary.confirmed;
		inspected.capabilities.number.productionEnabled = numberSummary.productionEnabled;
		inspected.settersCalled = false;
		inspected.usedQE = false;
		return inspected;
	}

	function scan(trackItem) {
		var inspector = inspectFn();
		var inspected;
		if (!inspector || !inspector.inspect) {
			return {
				ok: false,
				operation: OPERATION,
				reason: "EFFECT_NOT_FOUND",
				detail: "UniversalParameterInspect is not loaded.",
				settersCalled: false,
				usedQE: false
			};
		}
		inspected = inspector.inspect(trackItem);
		if (!inspected) {
			return {
				ok: false,
				operation: OPERATION,
				reason: "EFFECT_NOT_FOUND",
				settersCalled: false,
				usedQE: false
			};
		}
		inspected = attach(inspected);
		inspected.operation = OPERATION;
		inspected.settersCalled = false;
		inspected.usedQE = false;
		inspected.writeMethod = WRITE_METHOD;
		return inspected;
	}

	function scanMany(trackItems) {
		var inspector = inspectFn();
		var inspected;
		if (!inspector || !inspector.inspectMany) {
			return scan(trackItems && trackItems[0]);
		}
		inspected = inspector.inspectMany(trackItems || []);
		if (!inspected) {
			return {
				ok: false,
				operation: OPERATION,
				reason: "EFFECT_NOT_FOUND",
				settersCalled: false,
				usedQE: false
			};
		}
		inspected = attach(inspected);
		inspected.operation = OPERATION;
		inspected.settersCalled = false;
		inspected.usedQE = false;
		return inspected;
	}

	return {
		scan: scan,
		scanMany: scanMany,
		attach: attach
	};
}());

if (typeof $ !== "undefined") {
	$._pickfxNumericCandidateScan = NumericCandidateScan;
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = NumericCandidateScan;
}
