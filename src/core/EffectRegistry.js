var EffectRegistry = (function () {
	var rawEffects = [];
	var uniqueEffects = [];

	// QE getVideoEffectList() can return duplicate display names
	// (Transform ×2, Noise (Legacy) ×2). Raw discovery keeps every
	// entry. Search/display use unique premiereName values.

	function makeEffect(name) {
		return {
			name: name,
			premiereName: name,
			type: "video-effect"
		};
	}

	function loadFromNames(names) {
		var seen = {};
		var i;
		var name;
		var entry;

		rawEffects = [];
		uniqueEffects = [];

		if (!names || !names.length) {
			return;
		}

		for (i = 0; i < names.length; i++) {
			name = String(names[i]);
			entry = makeEffect(name);
			rawEffects.push(entry);

			if (!seen.hasOwnProperty(name)) {
				seen[name] = true;
				uniqueEffects.push(entry);
			}
		}
	}

	function duplicateSummary() {
		var counts = {};
		var duplicates = [];
		var i;
		var name;

		for (i = 0; i < rawEffects.length; i++) {
			name = rawEffects[i].premiereName;
			counts[name] = (counts[name] || 0) + 1;
		}

		for (name in counts) {
			if (counts.hasOwnProperty(name) && counts[name] > 1) {
				duplicates.push({ name: name, count: counts[name] });
			}
		}

		return duplicates;
	}

	return {
		loadFromNames: loadFromNames,
		getRawEffects: function () {
			return rawEffects.slice();
		},
		getEffects: function () {
			return uniqueEffects.slice();
		},
		rawCount: function () {
			return rawEffects.length;
		},
		uniqueCount: function () {
			return uniqueEffects.length;
		},
		duplicateSummary: duplicateSummary,
		findByPremiereName: function (premiereName) {
			var i;
			for (i = 0; i < uniqueEffects.length; i++) {
				if (uniqueEffects[i].premiereName === premiereName) {
					return uniqueEffects[i];
				}
			}
			return null;
		}
	};
}());
