var EffectCatalogBrowse = (function () {
	var GROUPS = [
		{ id: "blur", title: "Blur", cats: { blur: true } },
		{ id: "sharpen", title: "Sharpen", cats: { sharpen: true } },
		{ id: "color", title: "Color", cats: {
			color: true, temperature: true, saturation: true, brightness: true
		} },
		{ id: "lumetri", title: "Lumetri", cats: { lumetri: true } },
		{ id: "contrast", title: "Contrast", cats: { contrast: true } },
		{ id: "distortion", title: "Distort", cats: { distortion: true } },
		{ id: "light", title: "Light", cats: { light: true } },
		{ id: "noise", title: "Noise", cats: { noise: true } },
		{ id: "stylize", title: "Stylize", cats: { stylize: true } },
		{ id: "transform", title: "Transform", cats: {
			transform: true, motion: true, scale: true, rotation: true,
			crop: true, anchor: true, position: true, opacity: true
		} },
		{ id: "keying", title: "Keying", cats: { keying: true } },
		{ id: "vr", title: "Immersive / VR", cats: { vr: true } },
		{ id: "audio", title: "Audio", cats: { audio: true } },
		{ id: "transition", title: "Transition", cats: { transition: true } },
		{ id: "other", title: "Other", cats: { generic: true } }
	];

	function effectName(effect) {
		return String((effect && (effect.name || effect.displayName || effect.premiereName)) || "");
	}

	function categoryOf(effect) {
		if (typeof EffectIconResolver !== "undefined" && EffectIconResolver.resolve) {
			return EffectIconResolver.resolve(effectName(effect));
		}
		return "generic";
	}

	function groupIdFor(category) {
		var i;
		for (i = 0; i < GROUPS.length; i++) {
			if (GROUPS[i].cats[category]) {
				return GROUPS[i].id;
			}
		}
		return "other";
	}

	function compareNames(a, b) {
		return effectName(a).localeCompare(effectName(b));
	}

	function group(effects) {
		var buckets = {};
		var sections = [];
		var clip = [];
		var i;
		var effect;
		var id;
		var section;

		for (i = 0; i < GROUPS.length; i++) {
			buckets[GROUPS[i].id] = [];
		}
		for (i = 0; i < (effects || []).length; i++) {
			effect = effects[i];
			if (!effect) {
				continue;
			}
			if (effect.kind === "clip-control") {
				clip.push(effect);
				continue;
			}
			id = groupIdFor(categoryOf(effect));
			if (!buckets[id]) {
				buckets[id] = [];
			}
			buckets[id].push(effect);
		}
		if (clip.length) {
			clip.sort(compareNames);
			sections.push({
				id: "clip",
				title: "Clip",
				effects: clip
			});
		}
		for (i = 0; i < GROUPS.length; i++) {
			section = buckets[GROUPS[i].id] || [];
			if (!section.length) {
				continue;
			}
			section.sort(compareNames);
			sections.push({
				id: GROUPS[i].id,
				title: GROUPS[i].title,
				effects: section
			});
		}
		return sections;
	}

	return {
		GROUPS: GROUPS,
		categoryOf: categoryOf,
		groupIdFor: groupIdFor,
		group: group
	};
}());

if (typeof module !== "undefined" && module.exports) {
	module.exports = EffectCatalogBrowse;
}
