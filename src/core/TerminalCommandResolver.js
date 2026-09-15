var TerminalCommandResolver = (function () {
	var NUMBER_TOKEN = /^[+-]?(?:\d+\.?\d*|\d*\.\d+)$/;
	var FEATURE_FLAG_KEY = "pickfx.terminalResolver.enabled";
	var EFFECT_AMBIGUITY_MARGIN = 18;
	var PARAMETER_CONFIDENCE_GAP = 30;
	var MAX_CANDIDATES = 10;
	var CONFIDENCE_MODEL_VERSION = "phase5-parameter-confidence-20260822";
	var GENERIC_PARAMETER_HINTS = {
		amount: 80,
		intensity: 65,
		strength: 65,
		radius: 55
	};

	function trim(value) {
		return String(value || "").replace(/^\s+|\s+$/g, "");
	}

	function tokens(value) {
		var normalized = String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ");
		var raw = normalized.split(/\s+/);
		var out = [];
		var i;
		for (i = 0; i < raw.length; i++) {
			if (raw[i]) {
				out.push(raw[i]);
			}
		}
		return out;
	}

	function normalize(value) {
		return tokens(value).join(" ");
	}

	function copy(value) {
		return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
	}

	function addEvidence(evidence, code, delta, detail) {
		evidence.push({
			code: code,
			delta: delta,
			detail: detail || ""
		});
	}

	function isSelectorLike(parameter) {
		var name = normalize(parameter && parameter.displayName);
		var enumMetadata = parameter && parameter.enumMetadata;
		if (/(^| )(mode|type|dimensions)( |$)/.test(name) ||
				/(^| )color space( |$)/.test(name)) {
			return true;
		}
		return !!(
			enumMetadata &&
			enumMetadata !== "unavailable" &&
			enumMetadata !== "none"
		);
	}

	function isColorLikeNumeric(parameter) {
		return !!(
			parameter &&
			typeof parameter.currentValue === "number" &&
			isFinite(parameter.currentValue) &&
			Math.abs(parameter.currentValue) > 1000000000000000
		);
	}

	function parameterNameCounts(effect) {
		var counts = {};
		var parameters = effect && effect.parameters ? effect.parameters : [];
		var name;
		var i;
		for (i = 0; i < parameters.length; i++) {
			name = normalize(parameters[i] && parameters[i].displayName);
			if (name) {
				counts[name] = (counts[name] || 0) + 1;
			}
		}
		return counts;
	}

	function parseNumberToken(token) {
		var value;
		if (!NUMBER_TOKEN.test(String(token || ""))) {
			return null;
		}
		value = Number(token);
		return typeof value === "number" && isFinite(value) ? value : null;
	}

	function parse(input) {
		var raw = trim(input);
		var parts;
		var last;
		var value;
		var query;
		if (!raw) {
			return { ok: false, reason: "EMPTY_INPUT", query: "", value: null, hasValue: false };
		}
		parts = raw.split(/\s+/);
		last = parts[parts.length - 1];
		value = parseNumberToken(last);
		if (value !== null) {
			if (parts.length === 1) {
				return {
					ok: false,
					reason: "EFFECT_NAME_REQUIRED",
					query: "",
					value: value,
					hasValue: true
				};
			}
			query = trim(parts.slice(0, parts.length - 1).join(" "));
			if (!query) {
				return {
					ok: false,
					reason: "EFFECT_NAME_REQUIRED",
					query: "",
					value: value,
					hasValue: true
				};
			}
			return {
				ok: true,
				type: "effect",
				raw: raw,
				query: query,
				normalizedQuery: normalize(query),
				value: value,
				hasValue: true
			};
		}
		return {
			ok: true,
			type: "effect",
			raw: raw,
			query: raw,
			normalizedQuery: normalize(raw),
			value: null,
			hasValue: false
		};
	}

	function levenshtein(a, b) {
		var rows = [];
		var i;
		var j;
		var cost;
		if (a === b) {
			return 0;
		}
		if (!a.length) {
			return b.length;
		}
		if (!b.length) {
			return a.length;
		}
		for (i = 0; i <= a.length; i++) {
			rows[i] = [i];
		}
		for (j = 0; j <= b.length; j++) {
			rows[0][j] = j;
		}
		for (i = 1; i <= a.length; i++) {
			for (j = 1; j <= b.length; j++) {
				cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
				rows[i][j] = Math.min(
					rows[i - 1][j] + 1,
					rows[i][j - 1] + 1,
					rows[i - 1][j - 1] + cost
				);
			}
		}
		return rows[a.length][b.length];
	}

	function similarity(a, b) {
		var maxLength = Math.max(a.length, b.length);
		if (!maxLength) {
			return 1;
		}
		return 1 - (levenshtein(a, b) / maxLength);
	}

	function containsToken(list, wanted) {
		var i;
		for (i = 0; i < list.length; i++) {
			if (list[i] === wanted) {
				return true;
			}
		}
		return false;
	}

	function tokenPrefixExists(list, wanted) {
		var i;
		for (i = 0; i < list.length; i++) {
			if (list[i].indexOf(wanted) === 0 || wanted.indexOf(list[i]) === 0) {
				return true;
			}
		}
		return false;
	}

	function bestTokenSimilarity(wanted, candidates) {
		var best = 0;
		var current;
		var i;
		for (i = 0; i < candidates.length; i++) {
			current = similarity(wanted, candidates[i]);
			if (current > best) {
				best = current;
			}
		}
		return best;
	}

	function scoreName(query, entry) {
		var q = normalize(query);
		var name = normalize(entry && (entry.displayName || entry.name || entry.premiereName));
		var queryTokens = tokens(q);
		var nameTokens = tokens(name);
		var allExact = true;
		var allPrefix = true;
		var allFuzzy = true;
		var similarityTotal = 0;
		var currentSimilarity;
		var coverage;
		var i;
		if (!q || !name) {
			return null;
		}
		if (q === name) {
			return { score: 1000, reason: "exact" };
		}
		for (i = 0; i < queryTokens.length; i++) {
			if (!containsToken(nameTokens, queryTokens[i])) {
				allExact = false;
			}
			if (!tokenPrefixExists(nameTokens, queryTokens[i])) {
				allPrefix = false;
			}
			currentSimilarity = bestTokenSimilarity(queryTokens[i], nameTokens);
			similarityTotal += currentSimilarity;
			if (currentSimilarity < 0.72) {
				allFuzzy = false;
			}
		}
		coverage = nameTokens.length ? queryTokens.length / nameTokens.length : 0;
		if (allExact) {
			return {
				score: 850 + Math.round(Math.min(1, coverage) * 40),
				reason: "token"
			};
		}
		if (allPrefix) {
			return {
				score: 740 + Math.round(Math.min(1, coverage) * 35),
				reason: "token-prefix"
			};
		}
		if (name.indexOf(q) !== -1) {
			return { score: 700, reason: "partial" };
		}
		if (allFuzzy && queryTokens.length) {
			currentSimilarity = similarityTotal / queryTokens.length;
			if (currentSimilarity >= 0.78) {
				return {
					score: 500 + Math.round(currentSimilarity * 100),
					reason: "fuzzy"
				};
			}
		}
		return null;
	}

	function compareMatches(a, b) {
		var aName;
		var bName;
		if (a.score !== b.score) {
			return b.score - a.score;
		}
		aName = normalize(a.entry.displayName || a.entry.name);
		bName = normalize(b.entry.displayName || b.entry.name);
		if (aName < bName) {
			return -1;
		}
		if (aName > bName) {
			return 1;
		}
		return 0;
	}

	function publicCandidate(match) {
		return {
			type: match.entry.type || "video-effect",
			displayName: match.entry.displayName || match.entry.name || "",
			premiereName: match.entry.premiereName || match.entry.displayName || match.entry.name || "",
			matchName: match.entry.matchName || null,
			score: match.score,
			matchReason: match.reason
		};
	}

	function matchEntries(query, entries) {
		var matches = [];
		var ambiguous = [];
		var scored;
		var top;
		var second;
		var i;
		for (i = 0; i < (entries ? entries.length : 0); i++) {
			scored = scoreName(query, entries[i]);
			if (scored) {
				matches.push({
					entry: entries[i],
					score: scored.score,
					reason: scored.reason
				});
			}
		}
		matches.sort(compareMatches);
		if (!matches.length) {
			return { ok: false, reason: "NOT_FOUND", candidates: [] };
		}
		top = matches[0];
		second = matches.length > 1 ? matches[1] : null;
		if (top.reason === "exact" || !second || top.score - second.score > EFFECT_AMBIGUITY_MARGIN) {
			return {
				ok: true,
				entry: top.entry,
				score: top.score,
				matchReason: top.reason,
				candidates: [publicCandidate(top)]
			};
		}
		for (i = 0; i < matches.length && ambiguous.length < MAX_CANDIDATES; i++) {
			if (top.score - matches[i].score <= EFFECT_AMBIGUITY_MARGIN) {
				ambiguous.push(publicCandidate(matches[i]));
			}
		}
		return {
			ok: false,
			reason: "AMBIGUOUS_EFFECT",
			candidates: ambiguous
		};
	}

	function isEligibleNumeric(parameter) {
		var name = trim(parameter && parameter.displayName);
		if (!parameter || parameter.valueType !== "number" || !name) {
			return false;
		}
		if (name.charAt(0) === "_") {
			return false;
		}
		if (parameter.hasGetValue !== true || parameter.hasSetValue !== true ||
				parameter.isTimeVarying === true) {
			return false;
		}
		return typeof parameter.currentValue === "number" && isFinite(parameter.currentValue);
	}

	function buildPromotionIndex(manifest) {
		var index = {
			pairs: [],
			byEffectMatchName: {},
			byEffectDisplayName: {}
		};
		var pairs = manifest && manifest.pairs ? manifest.pairs : [];
		var pair;
		var matchKey;
		var displayKey;
		var i;
		for (i = 0; i < pairs.length; i++) {
			pair = copy(pairs[i]);
			if (!pair ||
					pair.verified !== true ||
					pair.promotionStatus !== "promoted") {
				continue;
			}
			index.pairs.push(pair);
			matchKey = normalize(pair.effectMatchName);
			displayKey = normalize(pair.effectDisplayName);
			if (matchKey) {
				if (!index.byEffectMatchName[matchKey]) {
					index.byEffectMatchName[matchKey] = [];
				}
				index.byEffectMatchName[matchKey].push(pair);
			}
			if (displayKey) {
				if (!index.byEffectDisplayName[displayKey]) {
					index.byEffectDisplayName[displayKey] = [];
				}
				index.byEffectDisplayName[displayKey].push(pair);
			}
		}
		return index;
	}

	function promotionIndexFrom(options) {
		if (options && options.promotionIndex) {
			return options.promotionIndex;
		}
		return buildPromotionIndex(
			options && (options.promotionManifest || options.promotion)
		);
	}

	function promotedPairFor(effect, parameter, options) {
		var index = promotionIndexFrom(options);
		var byMatch = index.byEffectMatchName[
			normalize(effect && effect.matchName)
		] || [];
		var byDisplay = index.byEffectDisplayName[
			normalize(effect && effect.displayName)
		] || [];
		var pairs = byMatch.length ? byMatch : byDisplay;
		var pair;
		var i;
		for (i = 0; i < pairs.length; i++) {
			pair = pairs[i];
			if (pair.parameterIndex === parameter.index &&
					normalize(pair.parameterDisplayName) ===
						normalize(parameter.displayName)) {
				return pair;
			}
		}
		return null;
	}

	function buildValidationIndex(validationRun) {
		var index = {};
		var results = validationRun && validationRun.results
			? validationRun.results
			: [];
		var result;
		var key;
		var i;
		for (i = 0; i < results.length; i++) {
			result = results[i];
			key = normalize(result && result.effectDisplayName) + "::" +
				String(result && result.parameterIndex) + "::" +
				normalize(result && result.parameterDisplayName);
			index[key] = result;
		}
		return index;
	}

	function validationResultFor(effect, parameter, options) {
		var index = options && options.validationIndex
			? options.validationIndex
			: buildValidationIndex(options && options.validationRun);
		var key = normalize(effect && effect.displayName) + "::" +
			String(parameter && parameter.index) + "::" +
			normalize(parameter && parameter.displayName);
		return index[key] || null;
	}

	function parameterScoreDetails(effect, parameter, promoted) {
		var effectTokens = tokens(effect && effect.displayName);
		var parameterTokens = tokens(parameter && parameter.displayName);
		var sectionTokens = tokens(parameter && parameter.inferredSection);
		var seenOverlap = {};
		var evidence = [];
		var score = 0;
		var hint;
		var i;
		var token;
		if (promoted) {
			score += 2000;
			addEvidence(
				evidence,
				"PROMOTED_PAIR",
				2000,
				"Live-validated pair " +
					String(effect && effect.displayName) + "::" +
					String(parameter && parameter.index) + "::" +
					String(parameter && parameter.displayName)
			);
		}
		for (i = 0; i < parameterTokens.length; i++) {
			token = parameterTokens[i];
			if (containsToken(effectTokens, token) && !seenOverlap[token]) {
				score += 120;
				seenOverlap[token] = true;
				addEvidence(
					evidence,
					"EFFECT_PARAMETER_TOKEN_MATCH",
					120,
					'Shared token "' + token + '".'
				);
			}
			hint = GENERIC_PARAMETER_HINTS[token];
			if (hint) {
				score += hint;
				addEvidence(
					evidence,
					"PARAMETER_SEMANTIC_HINT",
					hint,
					'Semantic token "' + token + '".'
				);
			}
		}
		for (i = 0; i < sectionTokens.length; i++) {
			if (containsToken(effectTokens, sectionTokens[i])) {
				score += 20;
				addEvidence(
					evidence,
					"SECTION_EFFECT_TOKEN_MATCH",
					20,
					'Section token "' + sectionTokens[i] + '".'
				);
			}
		}
		addEvidence(
			evidence,
			"WRITABLE_NUMERIC_API",
			0,
			"Registry reports numeric read/write accessors and a finite value."
		);
		if (!parameter.matchName) {
			addEvidence(
				evidence,
				"PARAMETER_MATCH_NAME_MISSING",
				0,
				"Parameter matchName is unavailable."
			);
		}
		if (!parameter.inferredSection) {
			addEvidence(
				evidence,
				"SECTION_METADATA_MISSING",
				0,
				"Parameter section metadata is unavailable."
			);
		}
		return {
			score: score,
			evidence: evidence
		};
	}

	function parameterScore(effect, parameter) {
		return parameterScoreDetails(effect, parameter, null).score;
	}

	function parameterSafetyReason(effect, parameter, nameCounts, validation) {
		var effectName = normalize(effect && effect.displayName);
		var parameterName = normalize(parameter && parameter.displayName);
		if (isSelectorLike(parameter)) {
			return "SELECTOR_METADATA_REQUIRED";
		}
		if (isColorLikeNumeric(parameter)) {
			return "TYPED_COLOR_METADATA_REQUIRED";
		}
		if (parameterName && nameCounts[parameterName] > 1) {
			return "DUPLICATE_PARAMETER_NAME";
		}
		if (effectName === "lumetri color") {
			return "INSTANCE_IDENTITY_REQUIRED";
		}
		if (effectName === "motion" || effectName === "opacity") {
			return "BASELINE_COMPONENT_NOT_APPLY_TESTED";
		}
		if (validation && validation.status === "failed") {
			return "LIVE_VALIDATION_FAILED";
		}
		if (validation &&
				(validation.status === "manual_review" ||
					validation.status === "unsupported")) {
			return validation.reason || "LIVE_VALIDATION_NOT_PROMOTABLE";
		}
		return "";
	}

	function confidenceScore(tier, score, gap) {
		if (tier === "promoted") {
			return 0.99;
		}
		if (tier === "exact") {
			return 0.94;
		}
		if (tier === "section") {
			return 0.92;
		}
		if (tier === "unique") {
			return 0.9;
		}
		if (tier === "scored") {
			return Math.min(
				0.95,
				0.7 +
					Math.min(0.15, Math.max(0, gap || 0) / 300) +
					Math.min(0.1, Math.max(0, score || 0) / 2000)
			);
		}
		return Math.min(0.69, Math.max(0, (score || 0) / 1000));
	}

	function publicParameterCandidate(candidate) {
		var candidateConfidence = typeof candidate.confidenceScore === "number"
			? candidate.confidenceScore
			: (
				candidate.eligible
					? confidenceScore(
						candidate.promoted ? "promoted" : "ambiguous",
						candidate.score
					)
					: 0
			);
		return {
			index: candidate.parameter.index,
			displayName: candidate.parameter.displayName,
			valueType: candidate.parameter.valueType,
			inferredSection: candidate.parameter.inferredSection || null,
			score: candidate.score,
			eligible: candidate.eligible === true,
			rejectionReason: candidate.rejectionReason || "",
			promoted: !!candidate.promoted,
			confidenceScore: candidateConfidence,
			decision: candidate.decision ||
				(candidate.eligible
					? "competing-candidate"
					: "blocked-by-safety-gate"),
			evidence: copy(candidate.evidence || []),
			reasons: copy(candidate.evidence || [])
		};
	}

	function compareParameterCandidates(a, b) {
		if (a.score !== b.score) {
			return b.score - a.score;
		}
		if (a.parameter.index !== b.parameter.index) {
			return a.parameter.index - b.parameter.index;
		}
		return normalize(a.parameter.displayName) <
			normalize(b.parameter.displayName) ? -1 : 1;
	}

	function resolveNumericParameter(effect, options) {
		var candidates = [];
		var eligible = [];
		var promoted = [];
		var tied = [];
		var parameters = effect && effect.parameters ? effect.parameters : [];
		var nameCounts = parameterNameCounts(effect);
		var promotedPair;
		var validation;
		var details;
		var rejectionReason;
		var blocking;
		var top;
		var second;
		var gap;
		var i;
		for (i = 0; i < parameters.length; i++) {
			if (isEligibleNumeric(parameters[i])) {
				promotedPair = promotedPairFor(effect, parameters[i], options);
				validation = validationResultFor(
					effect,
					parameters[i],
					options
				);
				details = parameterScoreDetails(
					effect,
					parameters[i],
					promotedPair
				);
				rejectionReason = parameterSafetyReason(
					effect,
					parameters[i],
					nameCounts,
					validation
				);
				candidates.push({
					parameter: parameters[i],
					score: details.score,
					evidence: details.evidence,
					promoted: promotedPair,
					validation: validation,
					eligible: !rejectionReason,
					rejectionReason: rejectionReason
				});
			}
		}
		candidates.sort(compareParameterCandidates);
		if (!candidates.length) {
			return {
				ok: false,
				reason: "NO_NUMERIC_PARAMETER",
				decision: "no-numeric-candidate",
				confidenceScore: 0,
				candidates: [],
				competingCandidates: []
			};
		}
		for (i = 0; i < candidates.length; i++) {
			if (candidates[i].eligible) {
				eligible.push(candidates[i]);
				if (candidates[i].promoted) {
					promoted.push(candidates[i]);
				}
			}
		}
		if (promoted.length === 1) {
			top = promoted[0];
			top.confidenceScore = confidenceScore("promoted");
			top.decision = "resolved";
			return {
				ok: true,
				parameter: top.parameter,
				confidence: "promoted",
				confidenceTier: "promoted",
				confidenceScore: confidenceScore("promoted"),
				decision: "resolved",
				score: top.score,
				reasons: copy(top.evidence),
				candidates: [publicParameterCandidate(top)],
				competingCandidates: candidates
					.filter(function (candidate) { return candidate !== top; })
					.map(publicParameterCandidate)
			};
		}
		if (!eligible.length) {
			return {
				ok: false,
				reason: "AMBIGUOUS_PARAMETER",
				decision: "fail-closed",
				confidenceTier: "ambiguous",
				confidenceScore: 0,
				reasons: [{
					code: "ALL_NUMERIC_CANDIDATES_BLOCKED",
					delta: 0,
					detail: "Registry evidence cannot prove a safe numeric target."
				}],
				candidates: candidates.slice(0, MAX_CANDIDATES)
					.map(publicParameterCandidate),
				competingCandidates: candidates.map(publicParameterCandidate)
			};
		}
		eligible.sort(compareParameterCandidates);
		top = eligible[0];
		second = eligible.length > 1 ? eligible[1] : null;
		blocking = null;
		for (i = 0; i < candidates.length; i++) {
			if (!candidates[i].eligible &&
					candidates[i].score >=
						top.score - PARAMETER_CONFIDENCE_GAP) {
				blocking = candidates[i];
				break;
			}
		}
		if (blocking) {
			return {
				ok: false,
				reason: "AMBIGUOUS_PARAMETER",
				decision: "fail-closed",
				confidenceTier: "ambiguous",
				confidenceScore: confidenceScore("ambiguous", top.score),
				reasons: [{
					code: "BLOCKED_COMPETING_CANDIDATE",
					delta: 0,
					detail: blocking.rejectionReason
				}],
				candidates: candidates.slice(0, MAX_CANDIDATES)
					.map(publicParameterCandidate),
				competingCandidates: candidates.map(publicParameterCandidate)
			};
		}
		if (eligible.length === 1) {
			addEvidence(
				top.evidence,
				"UNIQUE_ELIGIBLE_NUMERIC",
				0,
				"Exactly one numeric parameter remains after safety gates."
			);
			top.confidenceScore = confidenceScore("unique");
			top.decision = "resolved";
			return {
				ok: true,
				parameter: top.parameter,
				confidence: "unique",
				confidenceTier: "unique",
				confidenceScore: confidenceScore("unique"),
				decision: "resolved",
				score: top.score,
				reasons: copy(top.evidence),
				candidates: [publicParameterCandidate(top)],
				competingCandidates: candidates
					.filter(function (candidate) { return candidate !== top; })
					.map(publicParameterCandidate)
			};
		}
		gap = top.score - second.score;
		if (top.score > 0 && gap >= PARAMETER_CONFIDENCE_GAP) {
			addEvidence(
				top.evidence,
				"CONFIDENCE_GAP",
				gap,
				"Top candidate leads the next eligible candidate by " +
					String(gap) + " points."
			);
			top.confidenceScore = confidenceScore(
				"scored",
				top.score,
				gap
			);
			top.decision = "resolved";
			return {
				ok: true,
				parameter: top.parameter,
				confidence: "scored",
				confidenceTier: "scored",
				confidenceScore: confidenceScore(
					"scored",
					top.score,
					gap
				),
				decision: "resolved",
				score: top.score,
				reasons: copy(top.evidence),
				candidates: [publicParameterCandidate(top)],
				competingCandidates: candidates
					.filter(function (candidate) { return candidate !== top; })
					.map(publicParameterCandidate)
			};
		}
		for (i = 0; i < candidates.length && tied.length < MAX_CANDIDATES; i++) {
			if (top.score - candidates[i].score < PARAMETER_CONFIDENCE_GAP) {
				tied.push(publicParameterCandidate(candidates[i]));
			}
		}
		return {
			ok: false,
			reason: "AMBIGUOUS_PARAMETER",
			decision: "fail-closed",
			confidenceTier: "ambiguous",
			confidenceScore: confidenceScore("ambiguous", top.score),
			reasons: [{
				code: "INSUFFICIENT_CONFIDENCE_GAP",
				delta: gap,
				detail: "Top candidates are separated by fewer than " +
					String(PARAMETER_CONFIDENCE_GAP) + " points."
			}],
			candidates: tied,
			competingCandidates: candidates.map(publicParameterCandidate)
		};
	}

	function resolveParameterQuery(effect, parameterQuery, options) {
		var query = normalize(parameterQuery);
		var sectionQuery = normalize(options && options.section);
		var parameters = effect && effect.parameters ? effect.parameters : [];
		var nameCounts = parameterNameCounts(effect);
		var candidates = [];
		var validation;
		var rejectionReason;
		var parameter;
		var name;
		var section;
		var combined;
		var score;
		var evidence;
		var exactName;
		var sectionMatch;
		var promoted;
		var top;
		var second;
		var i;
		if (!query) {
			return {
				ok: false,
				reason: "PARAMETER_QUERY_REQUIRED",
				decision: "fail-closed",
				candidates: []
			};
		}
		for (i = 0; i < parameters.length; i++) {
			parameter = parameters[i];
			if (!isEligibleNumeric(parameter)) {
				continue;
			}
			name = normalize(parameter.displayName);
			section = normalize(parameter.inferredSection);
			combined = normalize(section + " " + name);
			exactName = name === query;
			sectionMatch = !!(
				section &&
				(
					(sectionQuery && section === sectionQuery && exactName) ||
					combined === query
				)
			);
			if (!exactName && !sectionMatch) {
				continue;
			}
			score = sectionMatch ? 1200 : 1000;
			evidence = [];
			addEvidence(
				evidence,
				sectionMatch
					? "SECTION_PLUS_PARAMETER_EXACT"
					: "PARAMETER_NAME_EXACT",
				score,
				sectionMatch
					? "Section and parameter identity match exactly."
					: "Parameter displayName matches exactly."
			);
			promoted = promotedPairFor(effect, parameter, options);
			if (promoted) {
				score += 2000;
				addEvidence(
					evidence,
					"PROMOTED_PAIR",
					2000,
					"Pair has passed controlled live validation."
				);
			}
			validation = validationResultFor(effect, parameter, options);
			rejectionReason = parameterSafetyReason(
				effect,
				parameter,
				nameCounts,
				validation
			);
			if (sectionMatch &&
					rejectionReason === "DUPLICATE_PARAMETER_NAME") {
				rejectionReason = "";
				addEvidence(
					evidence,
					"SECTION_DISAMBIGUATES_DUPLICATE_NAME",
					0,
					"Section metadata identifies one duplicate displayName."
				);
			}
			candidates.push({
				parameter: parameter,
				score: score,
				evidence: evidence,
				promoted: promoted,
				validation: validation,
				eligible: !rejectionReason,
				rejectionReason: rejectionReason,
				sectionMatch: sectionMatch
			});
		}
		candidates.sort(compareParameterCandidates);
		if (!candidates.length) {
			return {
				ok: false,
				reason: "PARAMETER_NOT_FOUND",
				decision: "fail-closed",
				confidenceTier: "ambiguous",
				confidenceScore: 0,
				candidates: [],
				competingCandidates: []
			};
		}
		top = candidates[0];
		second = candidates.length > 1 ? candidates[1] : null;
		if (!top.eligible ||
				(second && second.score === top.score)) {
			return {
				ok: false,
				reason: "AMBIGUOUS_PARAMETER",
				decision: "fail-closed",
				confidenceTier: "ambiguous",
				confidenceScore: 0,
				reasons: [{
					code: !top.eligible
						? "EXACT_MATCH_BLOCKED"
						: "DUPLICATE_EXACT_MATCH",
					delta: 0,
					detail: top.rejectionReason ||
						"More than one parameter has the same exact identity."
				}],
				candidates: candidates.map(publicParameterCandidate),
				competingCandidates: candidates.map(publicParameterCandidate)
			};
		}
		top.confidenceScore = confidenceScore(
			top.promoted
				? "promoted"
				: (top.sectionMatch ? "section" : "exact")
		);
		top.decision = "resolved";
		return {
			ok: true,
			parameter: top.parameter,
			confidence: top.promoted
				? "promoted"
				: (top.sectionMatch ? "section" : "exact"),
			confidenceTier: top.promoted
				? "promoted"
				: (top.sectionMatch ? "section" : "exact"),
			confidenceScore: confidenceScore(
				top.promoted
					? "promoted"
					: (top.sectionMatch ? "section" : "exact")
			),
			decision: "resolved",
			score: top.score,
			reasons: copy(top.evidence),
			candidates: [publicParameterCandidate(top)],
			competingCandidates: candidates
				.filter(function (candidate) { return candidate !== top; })
				.map(publicParameterCandidate)
		};
	}

	function resolveNamed(effectQuery, parameterQuery, value, registry, options) {
		var effectMatch;
		var parameterMatch;
		var effect;
		if (!registry ||
				!registry.effects ||
				typeof registry.effects.length !== "number") {
			return {
				ok: false,
				reason: "REGISTRY_UNAVAILABLE"
			};
		}
		effectMatch = matchEntries(effectQuery, registry.effects);
		if (!effectMatch.ok) {
			return {
				ok: false,
				type: "effect",
				reason: effectMatch.reason === "AMBIGUOUS_EFFECT"
					? "AMBIGUOUS_EFFECT"
					: "EFFECT_NOT_FOUND",
				query: effectQuery,
				candidates: effectMatch.candidates
			};
		}
		effect = effectMatch.entry;
		parameterMatch = resolveParameterQuery(
			effect,
			parameterQuery,
			options
		);
		if (!parameterMatch.ok) {
			return {
				ok: false,
				type: "effect",
				reason: parameterMatch.reason,
				query: effectQuery,
				parameterQuery: parameterQuery,
				resolvedEffect: resolvedEffectShape(effect),
				candidates: parameterMatch.candidates,
				competingCandidates:
					parameterMatch.competingCandidates || [],
				confidenceScore: parameterMatch.confidenceScore || 0,
				reasons: parameterMatch.reasons || []
			};
		}
		return {
			ok: true,
			type: "effect",
			query: effectQuery,
			parameterQuery: parameterQuery,
			value: value,
			hasValue: typeof value === "number" && isFinite(value),
			resolvedEffect: resolvedEffectShape(effect),
			parameter: {
				index: parameterMatch.parameter.index,
				displayName: parameterMatch.parameter.displayName,
				valueType: parameterMatch.parameter.valueType,
				inferredSection:
					parameterMatch.parameter.inferredSection || null,
				confidence: parameterMatch.confidence,
				confidenceTier: parameterMatch.confidenceTier,
				confidenceScore: parameterMatch.confidenceScore,
				score: parameterMatch.score,
				reasons: parameterMatch.reasons
			},
			competingCandidates: parameterMatch.competingCandidates,
			execution: {
				type: "effect",
				action: "apply-and-set",
				requiresWrite: true,
				requiresReadBack: true,
				writerPath: "CommandExecutor.run"
			}
		};
	}

	function resolveWithParameter(input, registry, options) {
		var parsed = parse(input);
		var query;
		var normalizedQuery;
		var effects;
		var effect;
		var effectName;
		var remainder;
		var matches = [];
		var i;
		if (!parsed.ok || !parsed.hasValue) {
			return resolve(input, registry, options);
		}
		query = parsed.query;
		normalizedQuery = normalize(query);
		effects = registry && registry.effects ? registry.effects : [];
		for (i = 0; i < effects.length; i++) {
			effect = effects[i];
			effectName = normalize(effect.displayName);
			if (normalizedQuery === effectName) {
				matches.push({
					effect: effect,
					nameLength: effectName.length + 1,
					parameterQuery: "",
					exact: true
				});
			} else if (normalizedQuery.indexOf(effectName + " ") === 0) {
				matches.push({
					effect: effect,
					nameLength: effectName.length,
					parameterQuery: trim(
						normalizedQuery.substring(effectName.length)
					),
					exact: false
				});
			}
		}
		matches.sort(function (a, b) {
			if (a.nameLength !== b.nameLength) {
				return b.nameLength - a.nameLength;
			}
			if (a.exact !== b.exact) {
				return a.exact ? -1 : 1;
			}
			return 0;
		});
		if (!matches.length || !matches[0].parameterQuery) {
			return resolve(input, registry, options);
		}
		effect = matches[0].effect;
		remainder = matches[0].parameterQuery;
		return resolveNamed(
			effect.displayName,
			remainder,
			parsed.value,
			registry,
			options
		);
	}

	function compareConfidence(a, b) {
		var aScore = a && typeof a.confidenceScore === "number"
			? a.confidenceScore
			: 0;
		var bScore = b && typeof b.confidenceScore === "number"
			? b.confidenceScore
			: 0;
		return bScore - aScore;
	}

	function explain(result) {
		var reasons = result && (
			result.reasons ||
			(result.parameter && result.parameter.reasons)
		) || [];
		var out = [];
		var i;
		if (!result) {
			return "No resolver result.";
		}
		out.push(
			result.ok === true
				? "Resolved."
				: "Fail closed: " + String(result.reason || "AMBIGUOUS_PARAMETER") + "."
		);
		if (typeof result.confidenceScore === "number") {
			out.push(
				"Confidence " +
					String(Math.round(result.confidenceScore * 100) / 100) +
					"."
			);
		}
		for (i = 0; i < reasons.length; i++) {
			out.push(
				String(reasons[i].code) +
					(reasons[i].detail
						? ": " + String(reasons[i].detail)
						: "")
			);
		}
		return out.join(" ");
	}

	function invalidValueSuffix(raw, entries) {
		var parts = trim(raw).split(/\s+/);
		var prefix;
		var matched;
		if (parts.length < 2 || parseNumberToken(parts[parts.length - 1]) !== null) {
			return null;
		}
		prefix = trim(parts.slice(0, parts.length - 1).join(" "));
		matched = matchEntries(prefix, entries);
		if (!matched.ok || matched.matchReason !== "exact") {
			return null;
		}
		return {
			query: prefix,
			rawValue: parts[parts.length - 1],
			entry: matched.entry
		};
	}

	function resolvedEffectShape(effect) {
		return {
			type: "video-effect",
			name: effect.displayName,
			displayName: effect.displayName,
			premiereName: effect.premiereName || effect.displayName,
			matchName: effect.matchName || null
		};
	}

	function resolveTransition(input, registry) {
		var parsed = typeof input === "string" ? parse(input) : input;
		var transitions = registry && registry.transitions ? registry.transitions : [];
		var matched;
		if (!parsed || !parsed.ok) {
			return parsed || { ok: false, reason: "EMPTY_INPUT" };
		}
		if (!transitions.length) {
			return {
				ok: false,
				type: "transition",
				reason: "TRANSITION_UNSUPPORTED",
				query: parsed.query,
				candidates: []
			};
		}
		matched = matchEntries(parsed.query, transitions);
		if (!matched.ok) {
			return {
				ok: false,
				type: "transition",
				reason: matched.reason === "AMBIGUOUS_EFFECT" ? "AMBIGUOUS_TRANSITION" : "TRANSITION_NOT_FOUND",
				query: parsed.query,
				candidates: matched.candidates
			};
		}
		return {
			ok: true,
			type: "transition",
			query: parsed.query,
			value: parsed.value,
			hasValue: parsed.hasValue,
			resolvedTransition: matched.entry,
			execution: {
				type: "transition",
				action: "apply",
				supported: false
			}
		};
	}

	function resolve(input, registry, options) {
		var parsed = parse(input);
		var effectMatch;
		var parameterMatch;
		var invalidValue;
		var effect;
		if (!parsed.ok) {
			return parsed;
		}
		if (!registry || !registry.effects || typeof registry.effects.length !== "number") {
			return {
				ok: false,
				reason: "REGISTRY_UNAVAILABLE",
				query: parsed.query,
				value: parsed.value
			};
		}
		effectMatch = matchEntries(parsed.query, registry.effects);
		if (!effectMatch.ok) {
			invalidValue = effectMatch.reason === "NOT_FOUND"
				? invalidValueSuffix(parsed.raw, registry.effects)
				: null;
			if (invalidValue) {
				return {
					ok: false,
					type: "effect",
					reason: "INVALID_VALUE",
					query: invalidValue.query,
					rawValue: invalidValue.rawValue,
					value: null,
					hasValue: true,
					resolvedEffect: resolvedEffectShape(invalidValue.entry),
					candidates: []
				};
			}
			return {
				ok: false,
				type: "effect",
				reason: effectMatch.reason === "AMBIGUOUS_EFFECT" ? "AMBIGUOUS_EFFECT" : "EFFECT_NOT_FOUND",
				query: parsed.query,
				value: parsed.value,
				hasValue: parsed.hasValue,
				candidates: effectMatch.candidates,
				transitionSupport: registry.transitionSupport || {
					available: false,
					reason: "TRANSITION_REGISTRY_UNAVAILABLE"
				}
			};
		}
		effect = effectMatch.entry;
		if (!parsed.hasValue) {
			return {
				ok: true,
				type: "effect",
				query: parsed.query,
				value: null,
				hasValue: false,
				resolvedEffect: resolvedEffectShape(effect),
				parameter: null,
				execution: {
					type: "effect",
					action: "apply",
					requiresWrite: false,
					requiresReadBack: false
				}
			};
		}
		parameterMatch = resolveNumericParameter(effect, options);
		if (!parameterMatch.ok) {
			return {
				ok: false,
				type: "effect",
				reason: parameterMatch.reason,
				query: parsed.query,
				value: parsed.value,
				hasValue: true,
				resolvedEffect: resolvedEffectShape(effect),
				candidates: parameterMatch.candidates,
				competingCandidates:
					parameterMatch.competingCandidates || [],
				confidenceTier:
					parameterMatch.confidenceTier || "ambiguous",
				confidenceScore:
					parameterMatch.confidenceScore || 0,
				decision: parameterMatch.decision || "fail-closed",
				reasons: parameterMatch.reasons || []
			};
		}
		return {
			ok: true,
			type: "effect",
			query: parsed.query,
			value: parsed.value,
			hasValue: true,
			resolvedEffect: resolvedEffectShape(effect),
			parameter: {
				index: parameterMatch.parameter.index,
				displayName: parameterMatch.parameter.displayName,
				valueType: parameterMatch.parameter.valueType,
				inferredSection: parameterMatch.parameter.inferredSection || null,
				confidence: parameterMatch.confidence,
				confidenceTier: parameterMatch.confidenceTier,
				confidenceScore: parameterMatch.confidenceScore,
				score: parameterMatch.score,
				reasons: parameterMatch.reasons
			},
			competingCandidates:
				parameterMatch.competingCandidates || [],
			confidenceTier: parameterMatch.confidenceTier,
			confidenceScore: parameterMatch.confidenceScore,
			decision: parameterMatch.decision,
			execution: {
				type: "effect",
				action: "apply-and-set",
				requiresWrite: true,
				requiresReadBack: true,
				writerPath: "CommandExecutor.run"
			}
		};
	}

	function isFeatureEnabled(options) {
		var stored;
		if (options && options.explicit === true) {
			return true;
		}
		try {
			if (options && options.storage && typeof options.storage.getItem === "function") {
				stored = options.storage.getItem(FEATURE_FLAG_KEY);
				return stored === "true";
			}
		} catch (ignoreStorage) {}
		return false;
	}

	return {
		FEATURE_FLAG_KEY: FEATURE_FLAG_KEY,
		FEATURE_ENABLED_BY_DEFAULT: false,
		CONFIDENCE_MODEL_VERSION: CONFIDENCE_MODEL_VERSION,
		normalize: normalize,
		tokens: tokens,
		parseNumberToken: parseNumberToken,
		parse: parse,
		scoreName: scoreName,
		matchEntries: matchEntries,
		isEligibleNumeric: isEligibleNumeric,
		isSelectorLike: isSelectorLike,
		isColorLikeNumeric: isColorLikeNumeric,
		parameterScore: parameterScore,
		parameterScoreDetails: parameterScoreDetails,
		buildPromotionIndex: buildPromotionIndex,
		buildValidationIndex: buildValidationIndex,
		resolveParameterQuery: resolveParameterQuery,
		resolveNamed: resolveNamed,
		resolveWithParameter: resolveWithParameter,
		compareConfidence: compareConfidence,
		explain: explain,
		invalidValueSuffix: invalidValueSuffix,
		resolveNumericParameter: resolveNumericParameter,
		resolveTransition: resolveTransition,
		resolve: resolve,
		isFeatureEnabled: isFeatureEnabled
	};
}());

if (typeof module !== "undefined" && module.exports) {
	module.exports = TerminalCommandResolver;
}
