var EffectIconResolver = (function () {
	var RULES = [
		{ category: "temperature", words: ["temperature", "thermometer"] },
		{ category: "saturation", words: ["saturation", "vibrance"] },
		{ category: "opacity", words: ["opacity"] },
		{ category: "scale", words: ["scale"] },
		{ category: "rotation", words: ["rotation", "rotate"] },
		{ category: "crop", words: ["crop"] },
		{ category: "anchor", words: ["anchor"] },
		{ category: "position", words: ["position"] },
		{ category: "motion", words: ["motion"] },
		{ category: "lumetri", words: ["lumetri"] },
		{ category: "brightness", words: ["brightness"] },
		{ category: "vr", words: ["vr"] },
		{ category: "keying", words: ["key", "keying", "matte", "garbage"] },
		{ category: "transition", words: ["transition", "dissolve", "wipe", "push", "slide", "iris"] },
		{ category: "audio", words: ["audio", "eq", "reverb", "deesser"] },
		{ category: "sharpen", words: ["sharpen", "unsharp", "antialias"] },
		{ category: "blur", words: ["blur", "bokeh", "defocus", "gaussian"] },
		{ category: "contrast", words: ["contrast", "levels", "curves", "gamma"] },
		{ category: "color", words: ["color", "tint", "hue", "extract", "limiter", "balance", "rgb", "cmyk", "exposure", "highlights", "shadows", "whites", "blacks"] },
		{ category: "distortion", words: ["distort", "distortion", "lens", "warp", "twirl", "ripple", "bulge", "spherize", "pinch", "wave"] },
		{ category: "noise", words: ["noise", "grain", "dust", "scratch"] },
		{ category: "transform", words: ["transform", "corner", "3d", "reframe"] },
		{ category: "light", words: ["light", "lighting", "glow", "flare", "shadow", "highlight", "lensflare"] },
		{ category: "stylize", words: ["stylize", "mosaic", "posterize", "emboss", "oil", "find", "edges", "brush"] }
	];

	function tokens(name) {
		return String(name || "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
	}

	function resolve(name) {
		var nameTokens = tokens(name);
		var i;
		var j;
		var rule;
		var word;

		for (i = 0; i < RULES.length; i++) {
			rule = RULES[i];
			for (j = 0; j < rule.words.length; j++) {
				word = rule.words[j];
				if (nameTokens.indexOf(word) !== -1) {
					return rule.category;
				}
			}
		}

		return "generic";
	}

	return {
		resolve: resolve
	};
}());
