var SafeNumericTestValue = (function () {
	var EPSILON = 0.0001;

	function finiteNumber(value) {
		return typeof value === "number" && isFinite(value);
	}

	function limitsOf(meta) {
		var min;
		var max;
		if (!meta) {
			return {};
		}
		if (finiteNumber(meta.min)) {
			min = meta.min;
		} else if (finiteNumber(meta.minValue)) {
			min = meta.minValue;
		}
		if (finiteNumber(meta.max)) {
			max = meta.max;
		} else if (finiteNumber(meta.maxValue)) {
			max = meta.maxValue;
		}
		return { min: min, max: max };
	}

	function inRange(value, limits) {
		if (finiteNumber(limits.min) && value < limits.min) {
			return false;
		}
		if (finiteNumber(limits.max) && value > limits.max) {
			return false;
		}
		return true;
	}

	function generate(current, meta) {
		var limits = limitsOf(meta);
		var candidate;
		if (!finiteNumber(current)) {
			return { ok: false, reason: "NO_SAFE_TEST_VALUE" };
		}
		if (current === 0) {
			candidate = 1;
		} else if (current === 1) {
			candidate = 2;
		} else {
			candidate = current + 1;
		}
		if (!inRange(candidate, limits)) {
			if (finiteNumber(current - 1) && current - 1 !== current && inRange(current - 1, limits)) {
				candidate = current - 1;
			} else if (finiteNumber(limits.min) && limits.min !== current && inRange(limits.min, limits)) {
				candidate = limits.min;
			} else if (finiteNumber(limits.max) && limits.max !== current && inRange(limits.max, limits)) {
				candidate = limits.max;
			} else {
				return { ok: false, reason: "NO_SAFE_TEST_VALUE" };
			}
		}
		if (candidate === current || !inRange(candidate, limits)) {
			return { ok: false, reason: "NO_SAFE_TEST_VALUE" };
		}
		return { ok: true, value: candidate };
	}

	function verify(requested, actual) {
		if (!finiteNumber(requested) || !finiteNumber(actual)) {
			return false;
		}
		if (requested === actual) {
			return true;
		}
		return Math.abs(actual - requested) <= EPSILON;
	}

	return {
		EPSILON: EPSILON,
		generate: generate,
		verify: verify,
		limitsOf: limitsOf
	};
}());

if (typeof $ !== "undefined") {
	$._pickfxSafeNumericTestValue = SafeNumericTestValue;
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = SafeNumericTestValue;
}
