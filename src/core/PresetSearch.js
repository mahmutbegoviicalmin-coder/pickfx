var PresetSearch = (function () {
	var FUZZY_MIN_QUERY_LENGTH = 3;
	var FUZZY_MIN_SIMILARITY = 0.75;

	function normalize(value) {
		if (typeof EffectSearch !== "undefined" && EffectSearch.normalize) {
			return EffectSearch.normalize(value);
		}
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

	function similarity(a, b) {
		var longest;
		var distance;
		if (!a || !b) {
			return 0;
		}
		longest = Math.max(a.length, b.length);
		if (!longest) {
			return 0;
		}
		distance = levenshtein(a, b);
		return 1 - (distance / longest);
	}

	function bestWordSimilarity(q, nameWords) {
		var best = 0;
		var i;
		var score;
		for (i = 0; i < nameWords.length; i++) {
			score = similarity(q, nameWords[i]);
			if (score > best) {
				best = score;
			}
		}
		return best;
	}

	function match(query, preset) {
		var q = normalize(query);
		var name = normalize(preset && preset.name);
		var nameWords;
		var score;
		if (!q || !name) {
			return null;
		}
		if (name === q) {
			return { rank: 1, score: 1000, reason: "exact" };
		}
		if (name.indexOf(q) === 0) {
			return { rank: 2, score: 800, reason: "prefix" };
		}
		nameWords = words(name);
		if (nameWords.indexOf(q) !== -1) {
			return { rank: 3, score: 750, reason: "word" };
		}
		if (name.indexOf(q) !== -1) {
			return { rank: 4, score: 600, reason: "contains" };
		}
		if (q.length < FUZZY_MIN_QUERY_LENGTH) {
			return null;
		}
		score = bestWordSimilarity(q, nameWords);
		if (score >= FUZZY_MIN_SIMILARITY) {
			return { rank: 5, score: Math.round(score * 400), reason: "fuzzy" };
		}
		return null;
	}

	function compareResults(a, b) {
		if (a.rank !== b.rank) {
			return a.rank - b.rank;
		}
		if (a.score !== b.score) {
			return b.score - a.score;
		}
		if (a.preset.name < b.preset.name) {
			return -1;
		}
		if (a.preset.name > b.preset.name) {
			return 1;
		}
		return 0;
	}

	function search(query, presets) {
		var results = [];
		var i;
		var found;
		if (!normalize(query) || !presets || !presets.length) {
			return [];
		}
		for (i = 0; i < presets.length; i++) {
			found = match(query, presets[i]);
			if (found) {
				results.push({
					preset: presets[i],
					rank: found.rank,
					score: found.score,
					reason: found.reason,
					kind: "preset"
				});
			}
		}
		results.sort(compareResults);
		return results;
	}

	function subtitle(preset) {
		var count = 0;
		if (typeof PresetSchema !== "undefined" && PresetSchema.effectCount) {
			count = PresetSchema.effectCount(preset);
		} else if (preset && preset.components) {
			count = preset.components.length;
		}
		return "PickFX Preset · " + count + (count === 1 ? " effect" : " effects");
	}

	return {
		normalize: normalize,
		search: search,
		subtitle: subtitle
	};
}());

if (typeof module !== "undefined" && module.exports) {
	module.exports = PresetSearch;
}
