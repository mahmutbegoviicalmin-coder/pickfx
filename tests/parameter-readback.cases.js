(function () {
	var startCount = passed + failed;
	var api = ParameterReadBack;
	var reads;
	var result;
	var sleeps;

	function paramFrom(values) {
		reads = 0;
		return {
			getValue: function () {
				var value = values[Math.min(reads, values.length - 1)];
				reads += 1;
				return value;
			}
		};
	}

	result = api.verifyWithRetry(paramFrom([20]), 20, function (requested, actual) {
		return { ok: requested === actual };
	}, { sleep: function () {} });
	assertEq("immediate verified read succeeds", result.ok, true);
	assertEq("immediate verified uses one read", result.readBackAttempts, 1);
	assertEq("immediate verified is not stale", result.staleBeforeVerify, false);
	assertEq("immediate verified value", result.value, 20);

	sleeps = 0;
	result = api.verifyWithRetry(paramFrom([0, 0, 20]), 20, function (requested, actual) {
		return { ok: requested === actual };
	}, {
		maxAttempts: 4,
		delayMs: 16,
		sleep: function () {
			sleeps += 1;
		}
	});
	assertEq("stale then verified succeeds", result.ok, true);
	assertEq("stale then verified uses three reads", result.readBackAttempts, 3);
	assertEq("stale then verified flagged", result.staleBeforeVerify, true);
	assertEq("stale then verified slept twice", sleeps, 2);
	assertEq("stale then verified value", result.value, 20);

	result = api.verifyWithRetry(paramFrom([5, 5, 5, 5]), 20, function (requested, actual) {
		return { ok: requested === actual };
	}, { maxAttempts: 4, sleep: function () {} });
	assertEq("persistent mismatch fails closed", result.ok, false);
	assertEq("persistent mismatch reason", result.reason, "VALUE_NOT_VERIFIED");
	assertEq("persistent mismatch keeps actual", result.value, 5);
	assertEq("persistent mismatch attempts", result.readBackAttempts, 4);

	print("parameter read-back: " + ((passed + failed) - startCount) + " assertions");
}());
