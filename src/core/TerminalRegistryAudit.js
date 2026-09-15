var TerminalRegistryAudit = (function () {
	var SCHEMA_VERSION = 1;
	var ARTIFACT_TYPE = "pickfx-terminal-registry-audit";
	var CLASSIFIER_VERSION = "phase4b-terminal-audit-20260822-02";
	var BASELINE_COMPONENTS = {
		motion: true,
		opacity: true
	};
	var PREVALIDATED = {
		effectDisplayName: "Gaussian Blur",
		effectMatchName: "AE.Impact_Blur_FX",
		parameterDisplayName: "Amount",
		parameterIndex: 5,
		requestedValue: 30,
		readBack: 30,
		reference: "phase4-gaussian-blur-30"
	};

	function trim(value) {
		return String(value === undefined || value === null ? "" : value)
			.replace(/^\s+|\s+$/g, "");
	}

	function fold(value) {
		return trim(value).toLowerCase().replace(/\s+/g, " ");
	}

	function clone(value) {
		return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
	}

	function compareNames(a, b) {
		var af = fold(a);
		var bf = fold(b);
		if (af < bf) {
			return -1;
		}
		if (af > bf) {
			return 1;
		}
		return 0;
	}

	function uniqueNames(values) {
		var byFold = {};
		var names = [];
		var value;
		var key;
		var i;
		for (i = 0; i < (values ? values.length : 0); i++) {
			value = trim(values[i] && values[i].premiereName
				? values[i].premiereName
				: (values[i] && values[i].displayName
					? values[i].displayName
					: values[i]));
			key = fold(value);
			if (!value || byFold.hasOwnProperty(key)) {
				continue;
			}
			byFold[key] = value;
			names.push(value);
		}
		names.sort(compareNames);
		return names;
	}

	function diffNames(oldNames, registryNames) {
		var oldUnique = uniqueNames(oldNames);
		var registryUnique = uniqueNames(registryNames);
		var oldMap = {};
		var registryMap = {};
		var overlap = [];
		var onlyOld = [];
		var onlyRegistry = [];
		var i;
		var key;
		for (i = 0; i < oldUnique.length; i++) {
			oldMap[fold(oldUnique[i])] = oldUnique[i];
		}
		for (i = 0; i < registryUnique.length; i++) {
			registryMap[fold(registryUnique[i])] = registryUnique[i];
		}
		for (i = 0; i < oldUnique.length; i++) {
			key = fold(oldUnique[i]);
			if (registryMap.hasOwnProperty(key)) {
				overlap.push(registryMap[key]);
			} else {
				onlyOld.push(oldUnique[i]);
			}
		}
		for (i = 0; i < registryUnique.length; i++) {
			key = fold(registryUnique[i]);
			if (!oldMap.hasOwnProperty(key)) {
				onlyRegistry.push(registryUnique[i]);
			}
		}
		overlap.sort(compareNames);
		onlyOld.sort(compareNames);
		onlyRegistry.sort(compareNames);
		return {
			oldEffects: oldUnique,
			registryEffects: registryUnique,
			overlap: overlap,
			onlyOld: onlyOld,
			onlyRegistry: onlyRegistry,
			oldCount: oldUnique.length,
			registryCount: registryUnique.length,
			overlapCount: overlap.length,
			onlyOldCount: onlyOld.length,
			onlyRegistryCount: onlyRegistry.length
		};
	}

	function confirmedModule(options) {
		if (options && options.confirmedWrites) {
			return options.confirmedWrites;
		}
		return typeof ConfirmedParameterWrites !== "undefined"
			? ConfirmedParameterWrites
			: null;
	}

	function resolverModule(options) {
		if (options && options.resolver) {
			return options.resolver;
		}
		return typeof TerminalCommandResolver !== "undefined"
			? TerminalCommandResolver
			: null;
	}

	function oldWriteComponents(confirmed) {
		var rows = confirmed && typeof confirmed.all === "function"
			? confirmed.all()
			: [];
		var names = [];
		var i;
		for (i = 0; i < rows.length; i++) {
			names.push(rows[i] && rows[i].componentDisplayName);
		}
		return uniqueNames(names);
	}

	function parameterNameCounts(effect) {
		var counts = {};
		var parameters = effect && effect.parameters ? effect.parameters : [];
		var key;
		var i;
		for (i = 0; i < parameters.length; i++) {
			key = fold(parameters[i] && parameters[i].displayName);
			if (key) {
				counts[key] = (counts[key] || 0) + 1;
			}
		}
		return counts;
	}

	function confirmedEntry(confirmed, effect, parameter) {
		var entry;
		if (!confirmed || typeof confirmed.lookup !== "function") {
			return null;
		}
		entry = confirmed.lookup(
			effect && effect.displayName,
			parameter && parameter.displayName
		);
		return entry && entry.productionEnabled === true ? entry : null;
	}

	function isPrevalidated(effect, parameter) {
		return !!(
			effect &&
			parameter &&
			effect.displayName === PREVALIDATED.effectDisplayName &&
			effect.matchName === PREVALIDATED.effectMatchName &&
			parameter.displayName === PREVALIDATED.parameterDisplayName &&
			parameter.index === PREVALIDATED.parameterIndex
		);
	}

	function isLikelyEnumParameterName(value) {
		var normalized = fold(value);
		return /(^| )(mode|type|dimensions)( |$)/.test(normalized) ||
			/(^| )color space( |$)/.test(normalized);
	}

	function classifyParameter(effect, parameter, context) {
		var name = trim(parameter && parameter.displayName);
		var nameKey = fold(name);
		var type = parameter && parameter.valueType
			? String(parameter.valueType)
			: "unknown";
		var confirmed = confirmedEntry(context.confirmed, effect, parameter);
		var selected = context.selectedParameter;
		var selectedHere = !!(
			selected &&
			selected.index === parameter.index &&
			selected.displayName === parameter.displayName
		);
		var result = {
			id: effect.displayName + "::" + String(parameter.index) + "::" + name,
			effectDisplayName: effect.displayName,
			effectPremiereName: effect.premiereName || effect.displayName,
			effectMatchName: effect.matchName || null,
			parameterIndex: parameter.index,
			parameterDisplayName: name,
			parameterMatchName: parameter.matchName || null,
			valueType: type,
			currentValue: clone(parameter.currentValue),
			hasGetValue: parameter.hasGetValue === true,
			hasSetValue: parameter.hasSetValue === true,
			isTimeVarying: parameter.isTimeVarying === true,
			areKeyframesSupported: parameter.areKeyframesSupported,
			enumMetadata: parameter.enumMetadata,
			inferredSection: parameter.inferredSection || null,
			intraEffectNameCount: nameKey
				? (context.nameCounts[nameKey] || 0)
				: 0,
			apiWritableCandidate: !!(
				parameter.hasGetValue === true &&
				parameter.hasSetValue === true &&
				parameter.isTimeVarying !== true
			),
			writable: !!confirmed,
			writableEvidence: confirmed
				? {
					status: confirmed.status,
					productionEnabled: true,
					writeCapability: confirmed.writeCapability,
					writeMethod: confirmed.writeMethod || confirmed.method,
					verificationMethod: confirmed.verificationMethod
				}
				: null,
			terminalSafety: "",
			terminalReason: "",
			terminalSelected: selectedHere,
			resolverResult: clone(context.resolutionSummary),
			prevalidated: false,
			liveTestPlanned: false
		};

		if (!name) {
			result.terminalSafety = "manual_review";
			result.terminalReason = "EMPTY_DISPLAY_NAME";
		} else if (context.confirmed &&
				typeof context.confirmed.isBlockedName === "function" &&
				context.confirmed.isBlockedName(name)) {
			result.terminalSafety = "unsupported";
			result.terminalReason = "BLOCKED_PARAMETER_NAME";
		} else if (parameter.hasGetValue !== true) {
			result.terminalSafety = "unsupported";
			result.terminalReason = "NO_GET_VALUE";
		} else if (parameter.hasSetValue !== true) {
			result.terminalSafety = "unsupported";
			result.terminalReason = "NO_SET_VALUE";
		} else if (parameter.isTimeVarying === true) {
			result.terminalSafety = "unsupported";
			result.terminalReason = "TIME_VARYING_UNSUPPORTED";
		} else if (type === "object") {
			result.terminalSafety = "unsupported";
			result.terminalReason = "OBJECT_REQUIRES_TYPED_WRITER";
		} else if (type === "string") {
			result.terminalSafety = "unsupported";
			result.terminalReason = "STRING_WRITER_UNSUPPORTED";
		} else if (type === "boolean") {
			result.terminalSafety = "manual_review";
			result.terminalReason = "BOOLEAN_REQUIRES_LIVE_TYPED_AUDIT";
		} else if (type !== "number") {
			result.terminalSafety = "manual_review";
			result.terminalReason = "UNKNOWN_PARAMETER_TYPE";
		} else if (name.charAt(0) === "_") {
			result.terminalSafety = "manual_review";
			result.terminalReason = "INTERNAL_PARAMETER";
		} else if (Math.abs(Number(parameter.currentValue)) > 1000000000000000) {
			result.terminalSafety = "manual_review";
			result.terminalReason = "COLOR_LIKE_NUMERIC_REQUIRES_TYPED_AUDIT";
		} else if (isLikelyEnumParameterName(name)) {
			result.terminalSafety = "manual_review";
			result.terminalReason = "ENUM_LIKE_NAME_REQUIRES_METADATA";
		} else if (BASELINE_COMPONENTS[fold(effect.displayName)]) {
			result.terminalSafety = "manual_review";
			result.terminalReason = "BASELINE_COMPONENT_NOT_APPLY_TESTED";
		} else if (effect.displayName === "Lumetri Color") {
			result.terminalSafety = "manual_review";
			result.terminalReason = "LUMETRI_REQUIRES_INSTANCE_IDENTITY";
		} else if (result.intraEffectNameCount > 1) {
			result.terminalSafety = "ambiguous";
			result.terminalReason = "INTRA_EFFECT_PARAMETER_NAME_COLLISION";
		} else if (selectedHere) {
			result.terminalSafety = "safe_terminal";
			result.terminalReason = context.resolutionSummary &&
				context.resolutionSummary.confidence === "unique"
				? "UNIQUE_NUMERIC_PARAMETER"
				: "DETERMINISTIC_SCORED_PARAMETER";
		} else {
			result.terminalSafety = "ambiguous";
			result.terminalReason = context.resolutionSummary &&
				context.resolutionSummary.reason
				? context.resolutionSummary.reason
				: "NOT_SELECTED_BY_MINIMAL_TERMINAL_SYNTAX";
		}

		if (result.terminalSafety === "safe_terminal") {
			if (isPrevalidated(effect, parameter)) {
				result.prevalidated = true;
				result.liveTestPlanned = false;
			} else {
				result.liveTestPlanned = true;
			}
		}
		return result;
	}

	function resolutionForEffect(resolver, effect) {
		var resolved;
		if (!resolver || typeof resolver.resolveNumericParameter !== "function") {
			return {
				selectedParameter: null,
				summary: { ok: false, reason: "RESOLVER_UNAVAILABLE" }
			};
		}
		resolved = resolver.resolveNumericParameter(effect);
		if (!resolved || resolved.ok !== true) {
			return {
				selectedParameter: null,
				summary: {
					ok: false,
					reason: (resolved && resolved.reason) || "NO_NUMERIC_PARAMETER",
					candidates: clone(resolved && resolved.candidates)
				}
			};
		}
		return {
			selectedParameter: resolved.parameter,
			summary: {
				ok: true,
				parameterIndex: resolved.parameter.index,
				parameterDisplayName: resolved.parameter.displayName,
				confidence: resolved.confidence,
				score: resolved.score,
				candidates: clone(resolved.candidates)
			}
		};
	}

	function emptySummary() {
		return {
			totalEffects: 0,
			totalParameters: 0,
			apiWritableCandidates: 0,
			writable: 0,
			safeTerminal: 0,
			liveTestsPlanned: 0,
			prevalidated: 0,
			ambiguous: 0,
			unsupported: 0,
			manualReview: 0,
			byValueType: {
				number: 0,
				"boolean": 0,
				"enum": 0,
				object: 0,
				string: 0,
				unknown: 0
			},
			byReason: {}
		};
	}

	function addSummary(summary, row) {
		var type = summary.byValueType.hasOwnProperty(row.valueType)
			? row.valueType
			: "unknown";
		summary.totalParameters += 1;
		summary.byValueType[type] += 1;
		if (row.apiWritableCandidate) {
			summary.apiWritableCandidates += 1;
		}
		if (row.writable) {
			summary.writable += 1;
		}
		if (row.terminalSafety === "safe_terminal") {
			summary.safeTerminal += 1;
		} else if (row.terminalSafety === "ambiguous") {
			summary.ambiguous += 1;
		} else if (row.terminalSafety === "unsupported") {
			summary.unsupported += 1;
		} else {
			summary.manualReview += 1;
		}
		if (row.liveTestPlanned) {
			summary.liveTestsPlanned += 1;
		}
		if (row.prevalidated) {
			summary.prevalidated += 1;
		}
		summary.byReason[row.terminalReason] =
			(summary.byReason[row.terminalReason] || 0) + 1;
	}

	function audit(registry, oldRuntimeEffects, options) {
		var resolver = resolverModule(options);
		var confirmed = confirmedModule(options);
		var effects = registry && registry.effects ? registry.effects : [];
		var registryNames = [];
		var writeComponents = oldWriteComponents(confirmed);
		var effectRows = [];
		var flatParameters = [];
		var summary = emptySummary();
		var resolution;
		var context;
		var parameterRows;
		var effect;
		var row;
		var i;
		var p;
		for (i = 0; i < effects.length; i++) {
			registryNames.push(effects[i] && effects[i].displayName);
		}
		for (i = 0; i < effects.length; i++) {
			effect = effects[i];
			resolution = resolutionForEffect(resolver, effect);
			context = {
				resolutionSummary: resolution.summary,
				selectedParameter: resolution.selectedParameter,
				nameCounts: parameterNameCounts(effect),
				confirmed: confirmed
			};
			parameterRows = [];
			for (p = 0; p < (effect.parameters ? effect.parameters.length : 0); p++) {
				row = classifyParameter(effect, effect.parameters[p], context);
				parameterRows.push(row);
				flatParameters.push(row);
				addSummary(summary, row);
			}
			effectRows.push({
				type: effect.type,
				displayName: effect.displayName,
				premiereName: effect.premiereName || effect.displayName,
				matchName: effect.matchName || null,
				matchNameAvailable: effect.matchNameAvailable === true,
				parameterCount: parameterRows.length,
				oldApplyOverlap: uniqueNames(oldRuntimeEffects).indexOf(effect.displayName) !== -1,
				oldWriteOverlap: writeComponents.indexOf(effect.displayName) !== -1,
				resolverResult: clone(resolution.summary),
				parameters: parameterRows
			});
		}
		effectRows.sort(function (a, b) {
			return compareNames(a.displayName, b.displayName);
		});
		summary.totalEffects = effectRows.length;
		return {
			schemaVersion: SCHEMA_VERSION,
			artifactType: ARTIFACT_TYPE,
			classifierVersion: CLASSIFIER_VERSION,
			generatedAt: options && options.generatedAt
				? String(options.generatedAt)
				: "",
			sourceRegistry: clone(registry && registry.sourceRegistry),
			runtimeApplyDiff: diffNames(oldRuntimeEffects || [], registryNames),
			productionWriteDiff: diffNames(writeComponents, registryNames),
			oldProductionWriteComponents: writeComponents,
			prevalidatedReference: clone(PREVALIDATED),
			summary: summary,
			effects: effectRows,
			parameters: flatParameters
		};
	}

	function validate(auditArtifact) {
		var sum;
		if (!auditArtifact ||
				auditArtifact.schemaVersion !== SCHEMA_VERSION ||
				auditArtifact.artifactType !== ARTIFACT_TYPE ||
				!auditArtifact.summary ||
				!auditArtifact.effects ||
				!auditArtifact.parameters) {
			return { ok: false, reason: "AUDIT_INVALID" };
		}
		sum = auditArtifact.summary.safeTerminal +
			auditArtifact.summary.ambiguous +
			auditArtifact.summary.unsupported +
			auditArtifact.summary.manualReview;
		if (sum !== auditArtifact.summary.totalParameters ||
				auditArtifact.parameters.length !== auditArtifact.summary.totalParameters ||
				auditArtifact.effects.length !== auditArtifact.summary.totalEffects) {
			return {
				ok: false,
				reason: "AUDIT_COUNT_MISMATCH",
				classified: sum,
				total: auditArtifact.summary.totalParameters
			};
		}
		return {
			ok: true,
			effectCount: auditArtifact.summary.totalEffects,
			parameterCount: auditArtifact.summary.totalParameters
		};
	}

	return {
		SCHEMA_VERSION: SCHEMA_VERSION,
		ARTIFACT_TYPE: ARTIFACT_TYPE,
		CLASSIFIER_VERSION: CLASSIFIER_VERSION,
		PREVALIDATED: clone(PREVALIDATED),
		normalize: fold,
		uniqueNames: uniqueNames,
		diffNames: diffNames,
		isLikelyEnumParameterName: isLikelyEnumParameterName,
		classifyParameter: classifyParameter,
		audit: audit,
		validate: validate
	};
}());

if (typeof module !== "undefined" && module.exports) {
	module.exports = TerminalRegistryAudit;
}
