var TerminalEffectDiscovery = (function () {
	var SCHEMA_VERSION = 1;
	var STATUS = {
		PRODUCTION_READY: "PRODUCTION_READY",
		DISCOVERED_NOT_VALIDATED: "DISCOVERED_NOT_VALIDATED",
		AMBIGUOUS: "AMBIGUOUS",
		MANUAL_REVIEW: "MANUAL_REVIEW",
		UNSUPPORTED: "UNSUPPORTED",
		FAILED: "FAILED"
	};
	var RAW_TO_DISPLAY = {
		PRODUCTION_READY: STATUS.PRODUCTION_READY,
		VALIDATED_BUT_NOT_PROMOTED: STATUS.DISCOVERED_NOT_VALIDATED,
		NOT_VALIDATED: STATUS.DISCOVERED_NOT_VALIDATED,
		AMBIGUOUS: STATUS.AMBIGUOUS,
		MANUAL_REVIEW: STATUS.MANUAL_REVIEW,
		UNSUPPORTED: STATUS.UNSUPPORTED,
		FAILED: STATUS.FAILED
	};

	function trim(value) {
		return String(value === undefined || value === null ? "" : value)
			.replace(/^\s+|\s+$/g, "");
	}

	function normalize(value) {
		return trim(value)
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, " ")
			.replace(/^\s+|\s+$/g, "")
			.replace(/\s+/g, " ");
	}

	function copy(value) {
		return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
	}

	function parameterKey(effectName, index, parameterName) {
		return normalize(effectName) + "::" +
			String(index) + "::" +
			normalize(parameterName);
	}

	function indexProduction(productionRegistry) {
		var index = {};
		var effects = productionRegistry && productionRegistry.effects
			? productionRegistry.effects
			: [];
		var effect;
		var parameter;
		var i;
		var j;
		for (i = 0; i < effects.length; i++) {
			effect = effects[i];
			if (!effect || !effect.parameters) {
				continue;
			}
			for (j = 0; j < effect.parameters.length; j++) {
				parameter = effect.parameters[j];
				if (!parameter) {
					continue;
				}
				index[parameterKey(
					effect.matchName || effect.displayName,
					parameter.index,
					parameter.displayName
				)] = parameter;
				index[parameterKey(
					effect.displayName,
					parameter.index,
					parameter.displayName
				)] = parameter;
			}
		}
		return index;
	}

	function indexReadiness(readinessAudit) {
		var index = {};
		var effects = readinessAudit && readinessAudit.effects
			? readinessAudit.effects
			: [];
		var effect;
		var parameter;
		var i;
		var j;
		for (i = 0; i < effects.length; i++) {
			effect = effects[i];
			if (!effect || !effect.parameters) {
				continue;
			}
			for (j = 0; j < effect.parameters.length; j++) {
				parameter = effect.parameters[j];
				index[parameterKey(
					effect.matchName || effect.displayName,
					parameter.index,
					parameter.displayName
				)] = parameter;
				index[parameterKey(
					effect.displayName,
					parameter.index,
					parameter.displayName
				)] = parameter;
			}
		}
		return index;
	}

	function displayStatus(rawStatus, productionEntry) {
		if (productionEntry) {
			return STATUS.PRODUCTION_READY;
		}
		return RAW_TO_DISPLAY[rawStatus] || STATUS.DISCOVERED_NOT_VALIDATED;
	}

	function kindLabel(parameter) {
		if (parameter.productionStatus === STATUS.PRODUCTION_READY) {
			return parameter.valueType === "boolean" ? "Toggle" : "Parameter";
		}
		if (parameter.productionStatus === STATUS.AMBIGUOUS) {
			return "Ambiguous";
		}
		if (parameter.productionStatus === STATUS.MANUAL_REVIEW) {
			return "Manual review";
		}
		if (parameter.productionStatus === STATUS.UNSUPPORTED) {
			return "Unsupported";
		}
		if (parameter.productionStatus === STATUS.FAILED) {
			return "Failed";
		}
		return "Not validated";
	}

	function overlayParameter(effect, parameter, productionIndex, readinessIndex) {
		var ready = productionIndex[parameterKey(
			effect.matchName || effect.displayName,
			parameter.index,
			parameter.displayName
		)] || productionIndex[parameterKey(
			effect.displayName,
			parameter.index,
			parameter.displayName
		)] || null;
		var readiness = readinessIndex[parameterKey(
			effect.matchName || effect.displayName,
			parameter.index,
			parameter.displayName
		)] || readinessIndex[parameterKey(
			effect.displayName,
			parameter.index,
			parameter.displayName
		)] || null;
		var validationStatus = readiness && readiness.currentStatus
			? readiness.currentStatus
			: (ready ? "PRODUCTION_READY" : "NOT_VALIDATED");
		var productionStatus = displayStatus(validationStatus, ready);
		var executable = productionStatus === STATUS.PRODUCTION_READY;
		return {
			effectDisplayName: effect.displayName,
			effectPremiereName: effect.premiereName || effect.displayName,
			componentMatchName: effect.matchName || null,
			parameterDisplayName: parameter.displayName || "",
			parameterIndex: parameter.index,
			parameterMatchName: parameter.matchName || null,
			valueType: parameter.valueType || "unknown",
			discoveredValue: parameter.currentValue,
			hasGetValue: parameter.hasGetValue === true,
			hasSetValue: parameter.hasSetValue === true,
			productionStatus: productionStatus,
			validationStatus: validationStatus,
			writable: executable,
			executable: executable,
			currentValue: null,
			applied: false,
			kindLabel: kindLabel({
				productionStatus: productionStatus,
				valueType: parameter.valueType
			})
		};
	}

	function customerParameter(effect, parameter) {
		return {
			effectDisplayName: effect.displayName,
			effectPremiereName: effect.premiereName || effect.displayName,
			componentMatchName: effect.matchName || null,
			parameterDisplayName: parameter.displayName || "",
			parameterIndex: parameter.index,
			parameterMatchName: parameter.matchName || null,
			valueType: parameter.valueType || "number",
			discoveredValue: null,
			hasGetValue: parameter.hasGetValue !== false,
			hasSetValue: parameter.hasSetValue !== false,
			productionStatus: STATUS.PRODUCTION_READY,
			validationStatus: "PRODUCTION_READY",
			writable: true,
			executable: true,
			currentValue: null,
			applied: false,
			kindLabel: parameter.valueType === "boolean" ? "Toggle" : "Parameter"
		};
	}

	function sortCustomerParameters(effect, parameters) {
		var defaultIndex = effect && typeof effect.defaultParameterIndex === "number"
			? effect.defaultParameterIndex
			: (parameters[0] ? parameters[0].parameterIndex : 0);
		parameters.sort(function (a, b) {
			if (a.parameterIndex === defaultIndex && b.parameterIndex !== defaultIndex) {
				return -1;
			}
			if (b.parameterIndex === defaultIndex && a.parameterIndex !== defaultIndex) {
				return 1;
			}
			return a.parameterIndex - b.parameterIndex;
		});
		return parameters;
	}

	function buildCustomer(productionRegistry) {
		var source = productionRegistry && productionRegistry.effects
			? productionRegistry.effects
			: [];
		var capabilities = productionRegistry && productionRegistry.capabilities
			? copy(productionRegistry.capabilities)
			: [];
		var effects = [];
		var converted;
		var effect;
		var parameter;
		var i;
		var j;
		if (!productionRegistry || !productionRegistry.effects) {
			return {
				ok: false,
				reason: "PRODUCTION_REGISTRY_UNAVAILABLE",
				customerFacing: true,
				source: "production"
			};
		}
		for (i = 0; i < source.length; i++) {
			effect = source[i];
			converted = [];
			if (!effect || !effect.parameters) {
				continue;
			}
			for (j = 0; j < effect.parameters.length; j++) {
				parameter = effect.parameters[j];
				if (!parameter ||
						parameter.productionReady !== true ||
						parameter.status !== "PRODUCTION_READY") {
					continue;
				}
				converted.push(customerParameter(effect, parameter));
			}
			if (!converted.length) {
				continue;
			}
			effects.push({
				type: "video-effect",
				displayName: effect.displayName,
				name: effect.displayName,
				premiereName: effect.premiereName || effect.displayName,
				matchName: effect.matchName || null,
				parameterCount: converted.length,
				parameters: sortCustomerParameters(effect, converted)
			});
		}
		return {
			ok: true,
			customerFacing: true,
			source: "production",
			schemaVersion: SCHEMA_VERSION,
			effects: effects,
			capabilities: capabilities,
			speed: [],
			transitions: [],
			counts: summarize(effects, capabilities)
		};
	}

	function isCustomerCatalog(catalog) {
		return !!(catalog && catalog.customerFacing === true && catalog.source === "production");
	}

	function overlayEffect(effect, productionIndex, readinessIndex) {
		var parameters = [];
		var source = effect.parameters || [];
		var i;
		for (i = 0; i < source.length; i++) {
			parameters.push(overlayParameter(
				effect,
				source[i],
				productionIndex,
				readinessIndex
			));
		}
		return {
			type: "video-effect",
			displayName: effect.displayName,
			name: effect.displayName,
			premiereName: effect.premiereName || effect.displayName,
			matchName: effect.matchName || null,
			parameterCount: parameters.length,
			parameters: parameters
		};
	}

	function summarize(effects, capabilities) {
		var executable = 0;
		var readonly = 0;
		var displayed = 0;
		var i;
		var j;
		for (i = 0; i < effects.length; i++) {
			displayed += effects[i].parameters.length;
			for (j = 0; j < effects[i].parameters.length; j++) {
				if (effects[i].parameters[j].executable) {
					executable += 1;
				} else {
					readonly += 1;
				}
			}
		}
		return {
			searchableEffects: effects.length,
			displayedParameters: displayed,
			executableParameters: executable,
			readOnlyParameters: readonly,
			motionCapabilities: capabilities ? capabilities.length : 0
		};
	}

	function build(researchRegistry, productionRegistry, readinessAudit) {
		var productionIndex = indexProduction(productionRegistry);
		var readinessIndex = indexReadiness(readinessAudit);
		var source = researchRegistry && researchRegistry.effects
			? researchRegistry.effects
			: [];
		var effects = [];
		var capabilities = productionRegistry && productionRegistry.capabilities
			? copy(productionRegistry.capabilities)
			: [];
		var i;
		if (!researchRegistry || !researchRegistry.effects) {
			return {
				ok: false,
				reason: "RESEARCH_REGISTRY_UNAVAILABLE"
			};
		}
		for (i = 0; i < source.length; i++) {
			effects.push(overlayEffect(source[i], productionIndex, readinessIndex));
		}
		return {
			ok: true,
			schemaVersion: SCHEMA_VERSION,
			effects: effects,
			capabilities: capabilities,
			counts: summarize(effects, capabilities)
		};
	}

	function hasCommandValue(input) {
		var parsed;
		var text = trim(input);
		if (!text) {
			return false;
		}
		if (/\b(?:x\s*-?\d+(?:\.\d+)?\s+y\s*-?\d+(?:\.\d+)?)\s*$/i.test(text)) {
			return true;
		}
		if (typeof TerminalCommandResolver !== "undefined" &&
				TerminalCommandResolver.parse) {
			parsed = TerminalCommandResolver.parse(text);
			return !!(parsed && parsed.hasValue);
		}
		return /-?\d+(?:\.\d+)?\s*%?\s*$/.test(text);
	}

	function commandQuery(input) {
		var parsed;
		if (typeof TerminalCommandResolver !== "undefined" &&
				TerminalCommandResolver.parse) {
			parsed = TerminalCommandResolver.parse(trim(input));
			if (parsed && parsed.query) {
				return parsed.query;
			}
		}
		return trim(input);
	}

	function preferredAmbiguousEntry(candidates, effects) {
		var executable = [];
		var effect;
		var i;
		var j;
		for (i = 0; i < (candidates || []).length; i++) {
			for (j = 0; j < effects.length; j++) {
				if (normalize(effects[j].displayName) ===
						normalize(candidates[i].displayName) &&
						effects[j].parameters.some(function (parameter) {
							return parameter.executable === true;
						})) {
					executable.push(effects[j]);
					break;
				}
			}
		}
		if (executable.length === 1) {
			return executable[0];
		}
		return null;
	}

	function matchEffect(query, effects) {
		var tokens;
		var prefix;
		var matched;
		var preferred;
		var i;
		if (!query || typeof TerminalCommandResolver === "undefined" ||
				!TerminalCommandResolver.matchEntries) {
			return { ok: false, reason: "RESOLVER_UNAVAILABLE", candidates: [] };
		}
		tokens = query.split(/\s+/);
		for (i = tokens.length; i > 0; i--) {
			prefix = tokens.slice(0, i).join(" ");
			matched = TerminalCommandResolver.matchEntries(prefix, effects);
			if (matched.ok) {
				return {
					ok: true,
					entry: matched.entry,
					matchReason: matched.matchReason,
					remainder: trim(tokens.slice(i).join(" ")),
					candidates: matched.candidates || []
				};
			}
			if (matched.reason === "AMBIGUOUS_EFFECT" && i === tokens.length) {
				preferred = preferredAmbiguousEntry(matched.candidates, effects);
				if (preferred) {
					return {
						ok: true,
						entry: preferred,
						matchReason: "fuzzy-unique-production",
						remainder: "",
						candidates: matched.candidates || []
					};
				}
				return {
					ok: false,
					reason: "AMBIGUOUS_EFFECT",
					candidates: matched.candidates || []
				};
			}
		}
		return {
			ok: false,
			reason: "EFFECT_NOT_FOUND",
			candidates: matched && matched.candidates ? matched.candidates : []
		};
	}

	function filterParameters(parameters, remainder) {
		var matches;
		var i;
		if (!remainder) {
			return parameters.slice(0);
		}
		if (typeof TerminalCommandResolver === "undefined" ||
				!TerminalCommandResolver.scoreName) {
			matches = [];
			for (i = 0; i < parameters.length; i++) {
				if (normalize(parameters[i].parameterDisplayName).indexOf(
						normalize(remainder)
					) !== -1) {
					matches.push(parameters[i]);
				}
			}
			return matches;
		}
		matches = [];
		for (i = 0; i < parameters.length; i++) {
			if (TerminalCommandResolver.scoreName(remainder, {
					displayName: parameters[i].parameterDisplayName,
					name: parameters[i].parameterDisplayName
				})) {
				matches.push(parameters[i]);
			}
		}
		return matches;
	}

	function motionBrowse(input, catalog) {
		var parsed;
		var capability;
		var i;
		if (typeof TerminalCapabilityRegistry === "undefined" ||
				!TerminalCapabilityRegistry.resolve) {
			return null;
		}
		parsed = TerminalCapabilityRegistry.resolve(input);
		if (!parsed || parsed.type !== "MOTION") {
			return null;
		}
		for (i = 0; i < (catalog.capabilities || []).length; i++) {
			if (catalog.capabilities[i].id === parsed.capabilityId) {
				capability = catalog.capabilities[i];
				break;
			}
		}
		if (!capability) {
			return null;
		}
		if (parsed.ok) {
			return { kind: "command", query: trim(input) };
		}
		return {
			kind: "motion-browser",
			ok: true,
			executable: false,
			capability: capability,
			parameters: [{
				effectDisplayName: capability.displayName,
				effectPremiereName: capability.displayName,
				componentMatchName: capability.componentMatchName,
				parameterDisplayName: capability.parameterDisplayName,
				parameterIndex: 0,
				parameterMatchName: null,
				valueType: capability.valueType,
				discoveredValue: null,
				productionStatus: STATUS.PRODUCTION_READY,
				validationStatus: "PRODUCTION_READY",
				writable: true,
				executable: true,
				currentValue: null,
				applied: false,
				kindLabel: "Parameter"
			}]
		};
	}

	function browse(input, catalog) {
		var query = trim(input);
		var motion;
		var matched;
		var parameters;
		if (!catalog || !catalog.ok) {
			return {
				ok: false,
				kind: "unavailable",
				reason: "DISCOVERY_UNAVAILABLE"
			};
		}
		if (!query) {
			return { ok: true, kind: "empty" };
		}
		if (hasCommandValue(query)) {
			return { ok: true, kind: "command", query: query };
		}
		motion = motionBrowse(query, catalog);
		if (motion) {
			return motion;
		}
		matched = matchEffect(query, catalog.effects);
		if (!matched.ok) {
			return {
				ok: false,
				kind: matched.reason === "AMBIGUOUS_EFFECT" ? "choices" : "not-found",
				reason: matched.reason,
				status: isCustomerCatalog(catalog)
					? (matched.reason === "AMBIGUOUS_EFFECT"
						? "Multiple effects match. Choose one."
						: "No result.")
					: undefined,
				candidates: matched.candidates || []
			};
		}
		parameters = filterParameters(matched.entry.parameters, matched.remainder);
		if (isCustomerCatalog(catalog) && matched.remainder && !parameters.length) {
			return {
				ok: false,
				kind: "not-found",
				reason: "PARAMETER_NOT_FOUND",
				status: "No executable parameter found.",
				effect: matched.entry,
				filter: matched.remainder,
				parameters: [],
				candidates: []
			};
		}
		return {
			ok: true,
			kind: "effect-browser",
			executable: false,
			effect: matched.entry,
			filter: matched.remainder || "",
			matchReason: matched.matchReason,
			parameters: parameters,
			parameterCount: matched.entry.parameters.length
		};
	}

	function formatValue(value, valueType) {
		if (value === undefined || value === null || value === "") {
			return "—";
		}
		if (valueType === "boolean") {
			return value === true || value === "true" ? "On" : "Off";
		}
		if (typeof value === "number" && isFinite(value)) {
			return String(value);
		}
		if (value && typeof value.length === "number" && value.length >= 2 &&
				typeof value[0] === "number") {
			return "x " + String(value[0]) + " y " + String(value[1]);
		}
		return "—";
	}

	function displayValue(parameter, options) {
		var applied = options && options.applied;
		if (applied !== true) {
			return options && options.unknown ? "—" : "Not applied";
		}
		if (!parameter || parameter.currentValue === null ||
				parameter.currentValue === undefined) {
			return "—";
		}
		return formatValue(parameter.currentValue, parameter.valueType);
	}

	function applyLiveValues(browser, listed) {
		var live = listed && listed.parameters ? listed.parameters : [];
		var byIndex = {};
		var byName = {};
		var parameter;
		var liveParam;
		var i;
		if (!browser || !browser.parameters) {
			return browser;
		}
		if (!listed || listed.ok !== true) {
			for (i = 0; i < browser.parameters.length; i++) {
				browser.parameters[i].applied = false;
				browser.parameters[i].currentValue = null;
			}
			browser.applied = false;
			return browser;
		}
		for (i = 0; i < live.length; i++) {
			liveParam = live[i];
			if (!liveParam) {
				continue;
			}
			if (typeof liveParam.index === "number") {
				byIndex[String(liveParam.index)] = liveParam;
			}
			if (liveParam.displayName) {
				byName[normalize(liveParam.displayName)] = liveParam;
			}
		}
		for (i = 0; i < browser.parameters.length; i++) {
			parameter = browser.parameters[i];
			liveParam = byIndex[String(parameter.parameterIndex)] ||
				byName[normalize(parameter.parameterDisplayName)];
			parameter.applied = true;
			if (liveParam && liveParam.currentValue !== undefined) {
				parameter.currentValue = liveParam.currentValue;
			} else {
				parameter.currentValue = null;
			}
		}
		browser.applied = true;
		return browser;
	}

	function writeGuard(input, catalog, productionResolution) {
		var view;
		var query;
		if (productionResolution && productionResolution.ok === true &&
				productionResolution.productionVerified === true) {
			return {
				allow: true,
				executable: true,
				resolution: productionResolution
			};
		}
		if (isCustomerCatalog(catalog) && hasCommandValue(input)) {
			return {
				allow: false,
				executable: false,
				fallthrough: false,
				reason: (productionResolution && productionResolution.reason) ||
					"PARAMETER_NOT_FOUND",
				status: "No executable parameter found."
			};
		}
		if (!hasCommandValue(input)) {
			return { allow: false, executable: false, fallthrough: true };
		}
		query = commandQuery(input);
		view = browse(query, catalog);
		if (view && view.kind === "effect-browser" &&
				view.parameters && view.parameters.length === 1 &&
				view.parameters[0].executable !== true) {
			return {
				allow: false,
				executable: false,
				fallthrough: false,
				reason: "PARAMETER_NOT_VALIDATED",
				status: "Not validated for editing yet",
				parameter: view.parameters[0],
				effect: view.effect
			};
		}
		if (view && view.kind === "effect-browser" && view.filter &&
				view.parameters && view.parameters.length &&
				view.parameters.every(function (parameter) {
					return parameter.executable !== true;
				})) {
			return {
				allow: false,
				executable: false,
				fallthrough: false,
				reason: "PARAMETER_NOT_VALIDATED",
				status: "Not validated for editing yet",
				parameter: view.parameters[0],
				effect: view.effect
			};
		}
		if (productionResolution && productionResolution.ok === false &&
				productionResolution.reason &&
				productionResolution.reason !== "EMPTY_INPUT" &&
				productionResolution.reason !== "REGISTRY_UNAVAILABLE") {
			return {
				allow: false,
				executable: false,
				fallthrough: false,
				reason: productionResolution.reason,
				status: productionResolution.detail || productionResolution.reason
			};
		}
		return { allow: false, executable: false, fallthrough: true };
	}

	function canDispatch(parameter) {
		return !!(parameter &&
			parameter.executable === true &&
			parameter.writable === true &&
			parameter.productionStatus === STATUS.PRODUCTION_READY);
	}

	return {
		SCHEMA_VERSION: SCHEMA_VERSION,
		STATUS: STATUS,
		normalize: normalize,
		build: build,
		buildCustomer: buildCustomer,
		isCustomerCatalog: isCustomerCatalog,
		browse: browse,
		hasCommandValue: hasCommandValue,
		displayValue: displayValue,
		formatValue: formatValue,
		applyLiveValues: applyLiveValues,
		writeGuard: writeGuard,
		canDispatch: canDispatch,
		kindLabel: kindLabel
	};
}());

if (typeof module !== "undefined" && module.exports) {
	module.exports = TerminalEffectDiscovery;
}
