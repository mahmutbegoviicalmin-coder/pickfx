var EffectSearch = (function () {
	var MAX_RESULTS = 25;
	var FUZZY_MIN_QUERY_LENGTH = 3;
	var FUZZY_MIN_SIMILARITY = 0.75;
	var HIDE_FUZZY_WHEN_STRONG_COUNT = 2;
	var SPECIALIZED_MODIFIERS = {
		vr: true,
		legacy: true,
		ultra: true,
		advanced: true,
		hdr: true,
		stereo: true,
		stereoscopic: true
	};
	var SOFT_SPECIALIZED = {
		bokeh: true,
		camera: true,
		channel: true,
		compound: true,
		focus: true,
		unsharp: true,
		lens: true,
		radial: true
	};

	function normalize(value) {
		return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
	}

	function words(value) {
		return normalize(value).split(/[^a-z0-9]+/).filter(Boolean);
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

	function aliasTargets(query, aliases) {
		if (!aliases || !aliases.hasOwnProperty(query)) {
			return [];
		}
		return aliases[query] || [];
	}

	function modifierPenalty(nameWords) {
		var penalty = 0;
		var i;
		var token;
		for (i = 0; i < nameWords.length; i++) {
			token = nameWords[i];
			if (SPECIALIZED_MODIFIERS[token]) {
				penalty += 4;
			} else if (SOFT_SPECIALIZED[token]) {
				penalty += 1;
			}
		}
		return penalty;
	}

	function bestWordSimilarity(query, nameWords) {
		var best = 0;
		var i;
		var token;
		var distance;
		var similarity;
		var maxLen;

		for (i = 0; i < nameWords.length; i++) {
			token = nameWords[i];
			maxLen = Math.max(query.length, token.length);
			if (!maxLen) {
				continue;
			}
			distance = levenshtein(query, token);
			similarity = 1 - (distance / maxLen);
			if (similarity > best) {
				best = similarity;
			}
		}

		return best;
	}

	function match(query, effect, aliases) {
		var name = normalize(effect.name);
		var q = normalize(query);
		var nameWords;
		var i;
		var targets;
		var similarity;
		var exactWord = false;
		var wordPrefix = false;
		var matchedTokenLength = 0;
		var lastTokenExact = false;

		if (!q) {
			return null;
		}

		nameWords = words(effect.name);

		function finish(rank, score, reason) {
			return {
				rank: rank,
				score: score,
				reason: reason,
				modifierPenalty: modifierPenalty(nameWords),
				lastTokenExact: lastTokenExact ? 1 : 0,
				matchedTokenLength: matchedTokenLength,
				tokenCount: nameWords.length
			};
		}

		if (nameWords.length) {
			lastTokenExact = nameWords[nameWords.length - 1] === q;
		}

		if (name === q) {
			matchedTokenLength = q.length;
			return finish(1, 1000, "exact");
		}

		targets = aliasTargets(q, aliases);
		for (i = 0; i < targets.length; i++) {
			if (normalize(targets[i]) === name) {
				matchedTokenLength = q.length;
				return finish(1, 980, "alias");
			}
		}

		for (i = 0; i < nameWords.length; i++) {
			if (nameWords[i] === q) {
				exactWord = true;
				matchedTokenLength = Math.max(matchedTokenLength, nameWords[i].length);
			} else if (nameWords[i].indexOf(q) === 0) {
				wordPrefix = true;
				matchedTokenLength = Math.max(matchedTokenLength, nameWords[i].length);
			}
		}

		if (exactWord) {
			return finish(2, 900, "exact-word");
		}

		if (wordPrefix) {
			return finish(3, 800, "word-prefix");
		}

		if (name.indexOf(q) === 0) {
			matchedTokenLength = nameWords.length ? nameWords[0].length : name.length;
			return finish(4, 700, "prefix");
		}

		if (name.indexOf(q) !== -1) {
			if (q.length >= 3) {
				return finish(5, 600, "contains");
			}
			return null;
		}

		if (q.length < FUZZY_MIN_QUERY_LENGTH) {
			return null;
		}

		similarity = bestWordSimilarity(q, nameWords);
		if (similarity >= FUZZY_MIN_SIMILARITY) {
			return finish(6, Math.round(similarity * 400), "fuzzy");
		}

		return null;
	}

	function compareResults(a, b) {
		if (a.rank !== b.rank) {
			return a.rank - b.rank;
		}
		if (a.modifierPenalty !== b.modifierPenalty) {
			return a.modifierPenalty - b.modifierPenalty;
		}
		if (a.lastTokenExact !== b.lastTokenExact) {
			return b.lastTokenExact - a.lastTokenExact;
		}
		if (a.matchedTokenLength !== b.matchedTokenLength) {
			return b.matchedTokenLength - a.matchedTokenLength;
		}
		if (a.score !== b.score) {
			return b.score - a.score;
		}
		if (a.effect.name < b.effect.name) {
			return -1;
		}
		if (a.effect.name > b.effect.name) {
			return 1;
		}
		return 0;
	}

	function search(query, effects, aliases) {
		var results = [];
		var i;
		var found;
		var q = normalize(query);
		var strongCount;
		var filtered;

		if (!q || !effects || !effects.length) {
			return [];
		}

		for (i = 0; i < effects.length; i++) {
			found = match(q, effects[i], aliases);
			if (found) {
				results.push({
					effect: effects[i],
					rank: found.rank,
					score: found.score,
					reason: found.reason,
					modifierPenalty: found.modifierPenalty,
					lastTokenExact: found.lastTokenExact,
					matchedTokenLength: found.matchedTokenLength,
					tokenCount: found.tokenCount
				});
			}
		}

		strongCount = 0;
		for (i = 0; i < results.length; i++) {
			if (results[i].reason !== "fuzzy") {
				strongCount++;
			}
		}

		if (strongCount >= HIDE_FUZZY_WHEN_STRONG_COUNT) {
			filtered = [];
			for (i = 0; i < results.length; i++) {
				if (results[i].reason !== "fuzzy") {
					filtered.push(results[i]);
				}
			}
			results = filtered;
		}

		results.sort(compareResults);
		return results.slice(0, MAX_RESULTS);
	}

	return {
		normalize: normalize,
		search: search
	};
}());
