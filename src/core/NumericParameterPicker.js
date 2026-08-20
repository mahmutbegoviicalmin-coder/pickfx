var NumericParameterPicker = (function () {
	function tokens(name) {
		return String(name || "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
	}

	function isWritableNumeric(param) {
		if (!param || param.writable === false) {
			return false;
		}
		if (param.type !== "number") {
			return false;
		}
		if (typeof param.value !== "number" || !isFinite(param.value)) {
			return false;
		}
		return true;
	}

	function score(effectName, param) {
		var effectTokens = tokens(effectName);
		var lastToken = effectTokens.length ? effectTokens[effectTokens.length - 1] : "";
		var name = String(param.displayName || "").toLowerCase();
		var result = 0;

		if (name && effectTokens.indexOf(name) !== -1) {
			result += 100;
			if (name === lastToken) {
				result += 20;
			}
		}
		if (name === "amount") {
			result += 50;
		}

		return result;
	}

	function pick(effectName, parameters) {
		var best = null;
		var bestScore = -1;
		var i;
		var param;
		var paramScore;

		if (!parameters || !parameters.length) {
			return null;
		}

		for (i = 0; i < parameters.length; i++) {
			param = parameters[i];
			if (!isWritableNumeric(param)) {
				continue;
			}
			paramScore = score(effectName, param);
			if (paramScore > bestScore) {
				bestScore = paramScore;
				best = param;
			}
		}

		return best;
	}

	return {
		pick: pick
	};
}());
