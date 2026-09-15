var EffectIndexState = (function () {
	var STATES = {
		IDLE: "idle",
		LOADING: "loading",
		READY: "ready",
		FAILED: "failed"
	};
	var DEFAULT_MAX_ATTEMPTS = 4;

	function create(options) {
		options = options || {};
		return {
			status: STATES.IDLE,
			attempt: 0,
			maxAttempts: typeof options.maxAttempts === "number"
				? options.maxAttempts
				: DEFAULT_MAX_ATTEMPTS,
			names: [],
			error: "",
			reason: ""
		};
	}

	function begin(state) {
		return {
			status: STATES.LOADING,
			attempt: (state && state.attempt ? state.attempt : 0) + 1,
			maxAttempts: state && state.maxAttempts ? state.maxAttempts : DEFAULT_MAX_ATTEMPTS,
			names: (state && state.names) || [],
			error: "",
			reason: ""
		};
	}

	function succeed(state, names) {
		return {
			status: STATES.READY,
			attempt: state && state.attempt ? state.attempt : 1,
			maxAttempts: state && state.maxAttempts ? state.maxAttempts : DEFAULT_MAX_ATTEMPTS,
			names: names || [],
			error: "",
			reason: ""
		};
	}

	function fail(state, error, reason) {
		var attempt = state && state.attempt ? state.attempt : 1;
		var maxAttempts = state && state.maxAttempts ? state.maxAttempts : DEFAULT_MAX_ATTEMPTS;
		var retryable = attempt < maxAttempts;
		return {
			status: retryable ? STATES.LOADING : STATES.FAILED,
			attempt: attempt,
			maxAttempts: maxAttempts,
			names: (state && state.names) || [],
			error: error ? String(error) : "Could not load effect index.",
			reason: reason ? String(reason) : "EFFECT_INDEX_UNAVAILABLE",
			retryable: retryable
		};
	}

	function view(state, options) {
		var catalogReady = !!(options && options.catalogReady);
		if (!state || state.status === STATES.IDLE || state.status === STATES.LOADING) {
			return {
				kind: "loading",
				message: "Loading effects…",
				showError: false
			};
		}
		if (state.status === STATES.READY) {
			return {
				kind: "ready",
				message: "",
				showError: false
			};
		}
		if (catalogReady) {
			return {
				kind: "ready",
				message: "",
				showError: false,
				catalogFallback: true
			};
		}
		return {
			kind: "failed",
			message: "Could not load effect index.",
			showError: true
		};
	}

	function shouldRetry(state) {
		return !!(state && state.status === STATES.LOADING && state.retryable === true);
	}

	function isReady(state) {
		return !!(state && state.status === STATES.READY);
	}

	function isFailed(state) {
		return !!(state && state.status === STATES.FAILED);
	}

	function isLoading(state) {
		return !state || state.status === STATES.IDLE || state.status === STATES.LOADING;
	}

	return {
		STATES: STATES,
		DEFAULT_MAX_ATTEMPTS: DEFAULT_MAX_ATTEMPTS,
		create: create,
		begin: begin,
		succeed: succeed,
		fail: fail,
		view: view,
		shouldRetry: shouldRetry,
		isReady: isReady,
		isFailed: isFailed,
		isLoading: isLoading
	};
}());

if (typeof module !== "undefined" && module.exports) {
	module.exports = EffectIndexState;
}
