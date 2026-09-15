var ActionRegistry = (function () {
	var DEFAULTS = {
		zoomAmount: 10,
		durationFrames: 10,
		fadeDurationFrames: 10
	};

	function trim(value) {
		return String(value || "").replace(/^\s+|\s+$/g, "");
	}

	function normalize(value) {
		return trim(value).toLowerCase().replace(/\s+/g, " ");
	}

	function decorate(action) {
		if (!action) {
			return action;
		}
		action.kind = "action";
		action.type = "action";
		action.displayName = action.name;
		action.premiereName = action.name;
		return action;
	}

	var ENTRIES = [
		decorate({
			id: "zoom-in",
			name: "Zoom In",
			keywords: ["zoom", "zoom in", "punch in", "scale up", "punch"],
			description: "Animate Scale up from the current value.",
			category: "motion",
			execution: "keyframe",
			componentMatchName: "AE.ADBE Motion",
			componentDisplayName: "Motion",
			parameterDisplayName: "Scale",
			valuePlan: "current-to-current-plus",
			amount: DEFAULTS.zoomAmount,
			durationFrames: DEFAULTS.durationFrames,
			anchor: "start",
			batch: true,
			keyframes: true
		}),
		decorate({
			id: "zoom-out",
			name: "Zoom Out",
			keywords: ["zoom", "zoom out", "scale down"],
			description: "Animate Scale down to the current value.",
			category: "motion",
			execution: "keyframe",
			componentMatchName: "AE.ADBE Motion",
			componentDisplayName: "Motion",
			parameterDisplayName: "Scale",
			valuePlan: "current-plus-to-current",
			amount: DEFAULTS.zoomAmount,
			durationFrames: DEFAULTS.durationFrames,
			anchor: "start",
			batch: true,
			keyframes: true
		}),
		decorate({
			id: "fade-in",
			name: "Fade In",
			keywords: ["fade", "fade in"],
			description: "Animate Opacity from 0 to the current value.",
			category: "opacity",
			execution: "keyframe",
			componentMatchName: "AE.ADBE Opacity",
			componentDisplayName: "Opacity",
			parameterDisplayName: "Opacity",
			valuePlan: "zero-to-current",
			amount: 0,
			durationFrames: DEFAULTS.fadeDurationFrames,
			anchor: "start",
			batch: true,
			keyframes: true
		}),
		decorate({
			id: "fade-out",
			name: "Fade Out",
			keywords: ["fade", "fade out"],
			description: "Animate Opacity from the current value to 0.",
			category: "opacity",
			execution: "keyframe",
			componentMatchName: "AE.ADBE Opacity",
			componentDisplayName: "Opacity",
			parameterDisplayName: "Opacity",
			valuePlan: "current-to-zero",
			amount: 0,
			durationFrames: DEFAULTS.fadeDurationFrames,
			anchor: "end",
			batch: true,
			keyframes: true
		}),
		decorate({
			id: "set-scale",
			name: "Set Scale",
			keywords: ["scale", "set scale", "zoom"],
			description: "Set Motion Scale to a value.",
			category: "motion",
			execution: "set-parameter",
			componentMatchName: "AE.ADBE Motion",
			componentDisplayName: "Motion",
			parameterDisplayName: "Scale",
			valuePlan: "",
			amount: 0,
			durationFrames: 0,
			anchor: "",
			batch: true,
			keyframes: false
		})
	];

	function all() {
		return ENTRIES.slice(0);
	}

	function findById(id) {
		var wanted = trim(id);
		var i;
		if (!wanted) {
			return null;
		}
		for (i = 0; i < ENTRIES.length; i++) {
			if (ENTRIES[i].id === wanted) {
				return ENTRIES[i];
			}
		}
		return null;
	}

	function findByName(name) {
		var wanted = normalize(name);
		var i;
		if (!wanted) {
			return null;
		}
		for (i = 0; i < ENTRIES.length; i++) {
			if (normalize(ENTRIES[i].name) === wanted) {
				return ENTRIES[i];
			}
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
		if (a.action.name < b.action.name) {
			return -1;
		}
		if (a.action.name > b.action.name) {
			return 1;
		}
		return 0;
	}

	function match(query, action) {
		var q = normalize(query);
		var name = normalize(action.name);
		var keywords = action.keywords || [];
		var i;
		var keyword;
		var rest;

		if (!q) {
			return null;
		}

		if (name === q) {
			return { rank: 1, score: 1000, reason: "exact" };
		}

		for (i = 0; i < keywords.length; i++) {
			keyword = normalize(keywords[i]);
			if (keyword === q) {
				if (name.indexOf(q) === 0 || name.split(" ").indexOf(q) !== -1) {
					return { rank: 1, score: 990, reason: "keyword-name" };
				}
				return { rank: 1, score: 980, reason: "keyword" };
			}
		}

		if (name.indexOf(q) === 0) {
			return { rank: 2, score: 900, reason: "name-prefix" };
		}

		for (i = 0; i < keywords.length; i++) {
			keyword = normalize(keywords[i]);
			if (keyword.indexOf(q) !== 0 || keyword === q) {
				continue;
			}
			rest = keyword.slice(q.length);
			if (rest.charAt(0) === " " && keyword.split(" ")[0] === q) {
				continue;
			}
			return { rank: 3, score: 800, reason: "keyword-prefix" };
		}

		if (q.length >= 4 && name.indexOf(q) !== -1) {
			return { rank: 5, score: 600, reason: "contains" };
		}

		return null;
	}

	function search(query) {
		var results = [];
		var i;
		var found;
		var q = normalize(query);

		if (!q) {
			return [];
		}

		for (i = 0; i < ENTRIES.length; i++) {
			found = match(q, ENTRIES[i]);
			if (found) {
				results.push({
					action: ENTRIES[i],
					rank: found.rank,
					score: found.score,
					reason: found.reason
				});
			}
		}

		results.sort(compareResults);
		return results;
	}

	function hostSpec(action) {
		if (!action) {
			return null;
		}
		return {
			actionId: action.id,
			actionName: action.name,
			componentMatchName: action.componentMatchName || "",
			componentDisplayName: action.componentDisplayName || "",
			parameterDisplayName: action.parameterDisplayName || "",
			parameterMatchName: action.parameterMatchName || "",
			valuePlan: action.valuePlan || "",
			amount: action.amount,
			durationFrames: action.durationFrames,
			anchor: action.anchor || "start"
		};
	}

	return {
		DEFAULTS: DEFAULTS,
		all: all,
		findById: findById,
		findByName: findByName,
		search: search,
		hostSpec: hostSpec,
		normalize: normalize
	};
}());

if (typeof $ !== "undefined") {
	$._pickfxActionRegistry = ActionRegistry;
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = ActionRegistry;
}
