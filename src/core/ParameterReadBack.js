var ParameterReadBack = (function () {
	var DEFAULT_ATTEMPTS = 4;
	var DEFAULT_DELAY_MS = 20;

	function defaultSleep(ms) {
		try {
			if (typeof $ !== "undefined" && typeof $.sleep === "function") {
				$.sleep(ms);
			}
		} catch (ignoreSleep) {}
	}

	function read(param) {
		try {
			return { ok: true, value: param.getValue() };
		} catch (err) {
			return { ok: false, error: String(err) };
		}
	}

	function isVerified(result) {
		return !!(result && result.ok === true);
	}

	function verifyWithRetry(param, requested, verifyFn, options) {
		var maxAttempts;
		var delayMs;
		var sleeper;
		var attempts;
		var i;
		var got;
		var verified;
		options = options || {};
		maxAttempts = typeof options.maxAttempts === "number" && options.maxAttempts > 0
			? options.maxAttempts
			: DEFAULT_ATTEMPTS;
		delayMs = typeof options.delayMs === "number" && options.delayMs >= 0
			? options.delayMs
			: DEFAULT_DELAY_MS;
		sleeper = typeof options.sleep === "function" ? options.sleep : defaultSleep;
		attempts = [];
		got = { ok: false };
		verified = { ok: false };
		for (i = 0; i < maxAttempts; i++) {
			if (i > 0) {
				sleeper(delayMs);
			}
			got = read(param);
			if (!got.ok) {
				attempts.push({ ok: false, error: got.error });
				continue;
			}
			try {
				verified = verifyFn(requested, got.value) || { ok: false };
			} catch (verifyErr) {
				verified = { ok: false, error: String(verifyErr) };
			}
			attempts.push({
				ok: isVerified(verified),
				value: got.value
			});
			if (isVerified(verified)) {
				return {
					ok: true,
					value: got.value,
					verified: verified,
					attempts: attempts,
					readBackAttempts: attempts.length,
					staleBeforeVerify: attempts.length > 1
				};
			}
		}
		return {
			ok: false,
			reason: "VALUE_NOT_VERIFIED",
			value: got && got.ok ? got.value : undefined,
			error: got && !got.ok ? got.error : undefined,
			verified: verified,
			attempts: attempts,
			readBackAttempts: attempts.length,
			staleBeforeVerify: attempts.length > 1
		};
	}

	return {
		DEFAULT_ATTEMPTS: DEFAULT_ATTEMPTS,
		DEFAULT_DELAY_MS: DEFAULT_DELAY_MS,
		read: read,
		verifyWithRetry: verifyWithRetry
	};
}());

if (typeof $ !== "undefined") {
	$._pickfxParameterReadBack = ParameterReadBack;
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = ParameterReadBack;
}
