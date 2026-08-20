(function () {
	var liveGaussianBlur23 = {
		ok: true,
		meta: {
			command: "Gaussian Blur 23",
			routedAs: "effect-numeric"
		},
		payload: {
			ok: true,
			verified: true,
			effect: "Gaussian Blur",
			parameter: "Amount",
			value: 23,
			requestedValue: 23,
			actualValue: 23,
			oldValue: 20,
			readBack: 23,
			type: "number",
			method: "setValue(value, true)"
		}
	};
	var clipScale = {
		ok: true,
		payload: {
			ok: true,
			verified: true,
			parameter: "Scale",
			requestedValue: 111,
			actualValue: 111,
			originalValue: 100,
			readBack: 111
		}
	};
	var originalZero = {
		payload: {
			originalValue: 0,
			oldValue: 11
		}
	};

	assertEq(
		"effect numeric oldValue is original when originalValue absent",
		SmokeRestore.originalFromPayload(liveGaussianBlur23.payload),
		20
	);
	assertEq(
		"effect numeric write result uses oldValue",
		SmokeRestore.originalFromWriteResult(liveGaussianBlur23),
		20
	);
	assertEq(
		"Gaussian Blur 23 restore query from oldValue",
		SmokeRestore.restoreQuery("Gaussian Blur", liveGaussianBlur23),
		"Gaussian Blur 20"
	);
	assert(
		"oldValue restore is not skipped",
		SmokeRestore.restoreQuery("Gaussian Blur", liveGaussianBlur23) !== null
	);
	assertEq(
		"clip originalValue still preferred",
		SmokeRestore.originalFromWriteResult(clipScale),
		100
	);
	assertEq(
		"originalValue 0 is not treated as absent",
		SmokeRestore.originalFromWriteResult(originalZero),
		0
	);
	assertEq(
		"originalValue wins over oldValue",
		SmokeRestore.originalFromPayload({ originalValue: 100, oldValue: 20 }),
		100
	);
	assertEq(
		"missing both returns undefined",
		SmokeRestore.originalFromPayload({ ok: true, readBack: 23 }),
		undefined
	);
	assertEq(
		"missing original skips restore query",
		SmokeRestore.restoreQuery("Gaussian Blur", { payload: { ok: true } }),
		null
	);
}());
