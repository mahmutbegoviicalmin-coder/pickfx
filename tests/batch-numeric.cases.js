(function () {
	var Batch = BatchNumericExecutor;
	var result;
	var writtenClip;
	var state;

	function makeClip(name, flags) {
		flags = flags || {};
		return {
			name: name,
			hasEffect: flags.hasEffect !== false,
			applyOk: flags.applyOk !== false,
			write: flags.write || {
				ok: true,
				verified: true,
				parameter: "Amount",
				readBack: flags.value !== undefined ? flags.value : 50,
				actualValue: flags.value !== undefined ? flags.value : 50,
				reason: flags.writeReason
			}
		};
	}

	function hooksFor(clips) {
		var map = {};
		var i;
		for (i = 0; i < clips.length; i++) {
			map[clips[i].name] = clips[i];
		}
		return {
			getSelectedVideoClips: function () {
				if (!clips.length) {
					return { ok: false, clips: [] };
				}
				return { ok: true, clips: clips };
			},
			effectExists: function (item) {
				return !!(map[item.name] && map[item.name].hasEffect);
			},
			applyEffect: function (item) {
				var row = map[item.name];
				if (!row || !row.applyOk) {
					return { ok: false, reason: "EFFECT_NOT_FOUND", detail: "apply failed" };
				}
				row.hasEffect = true;
				return { ok: true };
			},
			writeNumeric: function (item, effectName, parameterName, value) {
				var row = map[item.name];
				if (!row) {
					return { ok: false, reason: "WRITE_FAILED", detail: "missing clip" };
				}
				if (row.write) {
					row.write.requestedValue = value;
					return row.write;
				}
				return {
					ok: true,
					verified: true,
					parameter: parameterName,
					readBack: value,
					actualValue: value
				};
			}
		};
	}

	result = Batch.run({
		effectName: "Gaussian Blur",
		parameterName: "Amount",
		value: 50
	}, hooksFor([]));
	assertEq("no selection reason", result.reason, "NO_VIDEO_SELECTION");
	assertEq("no selection selectedCount", result.selectedCount, 0);
	assertEq("no selection ok", result.ok, false);

	result = Batch.run({
		effectName: "Gaussian Blur",
		parameterName: "Amount",
		value: 50
	}, hooksFor([makeClip("Clip A", { hasEffect: true, value: 50 })]));
	assertEq("one clip ok", result.ok, true);
	assertEq("one clip selected", result.selectedCount, 1);
	assertEq("one clip successful", result.successfulCount, 1);
	assertEq("one clip failed", result.failedCount, 0);
	assertEq("one clip verifiedCount", result.verifiedCount, 1);
	assertEq("one clip batch flag", result.batch, false);
	assertEq("one clip name", result.clips[0].clip, "Clip A");
	assertEq("one clip existed", result.clips[0].effectAlreadyExisted, true);
	assertEq("one clip applied", result.clips[0].effectApplied, false);
	assertEq("one clip verified", result.clips[0].verified, true);

	result = Batch.run({
		effectName: "Gaussian Blur",
		parameterName: "Amount",
		value: 50
	}, hooksFor([
		makeClip("A", { hasEffect: true, value: 50 }),
		makeClip("B", { hasEffect: true, value: 50 }),
		makeClip("C", { hasEffect: true, value: 50 })
	]));
	assertEq("all successful ok", result.ok, true);
	assertEq("all successful count", result.successfulCount, 3);
	assertEq("all successful failed", result.failedCount, 0);
	assertEq("all successful batch", result.batch, true);

	state = [
		makeClip("Good1", { hasEffect: true, value: 50 }),
		makeClip("Bad", { hasEffect: true, write: { ok: false, reason: "PARAMETER_NOT_FOUND", detail: "missing" } }),
		makeClip("Good2", { hasEffect: true, value: 50 })
	];
	result = Batch.run({
		effectName: "Gaussian Blur",
		parameterName: "Amount",
		value: 50
	}, hooksFor(state));
	assertEq("mixed ok", result.ok, false);
	assertEq("mixed successful", result.successfulCount, 2);
	assertEq("mixed failed", result.failedCount, 1);
	assertEq("mixed reason", result.reason, "PARAMETER_NOT_FOUND");
	assertEq("mixed continues after failure", result.clips.length, 3);
	assertEq("mixed last still ran", result.clips[2].ok, true);

	result = Batch.run({
		effectName: "Gaussian Blur",
		parameterName: "Amount",
		value: 50
	}, hooksFor([
		makeClip("X", { hasEffect: true, write: { ok: false, reason: "WRITE_FAILED", detail: "no" } }),
		makeClip("Y", { hasEffect: true, write: { ok: false, reason: "WRITE_FAILED", detail: "no" } })
	]));
	assertEq("all failures ok", result.ok, false);
	assertEq("all failures successful", result.successfulCount, 0);
	assertEq("all failures failed", result.failedCount, 2);

	result = Batch.run({
		effectName: "Gaussian Blur",
		parameterName: "Amount",
		value: 80
	}, hooksFor([makeClip("Has Blur", { hasEffect: true, value: 80 })]));
	assertEq("already exists applied false", result.clips[0].effectApplied, false);
	assertEq("already exists existed true", result.clips[0].effectAlreadyExisted, true);

	result = Batch.run({
		effectName: "Gaussian Blur",
		parameterName: "Amount",
		value: 50
	}, hooksFor([makeClip("Needs Blur", { hasEffect: false, applyOk: true, value: 50 })]));
	assertEq("missing then apply ok", result.ok, true);
	assertEq("missing then apply existed", result.clips[0].effectAlreadyExisted, false);
	assertEq("missing then apply applied", result.clips[0].effectApplied, true);

	result = Batch.run({
		effectName: "Gaussian Blur",
		parameterName: "Amount",
		value: 50
	}, hooksFor([makeClip("Locked", { hasEffect: false, applyOk: false })]));
	assertEq("apply failure ok", result.ok, false);
	assertEq("apply failure reason", result.clips[0].reason, "EFFECT_NOT_FOUND");
	assertEq("apply failure applied", result.clips[0].effectApplied, false);

	result = Batch.run({
		effectName: "Gaussian Blur",
		parameterName: "Amount",
		value: 50
	}, {
		getSelectedVideoClips: function () {
			return { ok: true, clips: [{ name: "Ghost" }] };
		},
		effectExists: function () {
			return false;
		},
		applyEffect: function () {
			return { ok: true };
		},
		writeNumeric: function () {
			return { ok: true, verified: true, parameter: "Amount", readBack: 50 };
		}
	});
	assertEq("apply lie not assumed", result.ok, false);
	assertEq("apply lie reason", result.clips[0].reason, "EFFECT_NOT_FOUND");
	assertEq("apply lie applied flag", result.clips[0].effectApplied, true);
	assertEq("apply lie did not write", result.clips[0].parameterResolved, false);

	result = Batch.run({
		effectName: "Gaussian Blur",
		parameterName: "",
		value: 50
	}, hooksFor([makeClip("A", { hasEffect: true })]));
	assertEq("empty parameter reason", result.clips[0].reason, "PARAMETER_NOT_FOUND");

	result = Batch.run({
		effectName: "Gaussian Blur",
		parameterName: "Amount",
		value: 50
	}, hooksFor([makeClip("A", { hasEffect: true, write: { ok: false, reason: "WRITE_FAILED", detail: "setValue threw" } })]));
	assertEq("write failure reason", result.clips[0].reason, "WRITE_FAILED");
	assertEq("write failure verified", result.clips[0].verified, false);

	writtenClip = Batch.fromWriterResult({
		ok: true,
		verified: false,
		reason: "VALUE_NOT_VERIFIED",
		detail: "Value could not be verified.",
		parameter: "Amount",
		readBack: 12
	}, { name: "A" }, { existed: true, applied: false, requestedValue: 50 });
	assertEq("verify failure reason", writtenClip.reason, "VALUE_NOT_VERIFIED");
	assertEq("verify failure ok", writtenClip.ok, false);
	assertEq("verify failure verified", writtenClip.verified, false);

	result = Batch.run({
		effectName: "Gaussian Blur",
		parameterName: "Amount",
		value: 50
	}, hooksFor([makeClip("A", {
		hasEffect: true,
		write: { ok: true, verified: false, reason: "VALUE_NOT_VERIFIED", parameter: "Amount", readBack: 12 }
	})]));
	assertEq("verify failure batch reason", result.reason, "VALUE_NOT_VERIFIED");
	assertEq("verify failure not counted successful", result.successfulCount, 0);

	result = Batch.toCommandPayload(result, {
		effect: "Gaussian Blur",
		parameter: "Amount",
		value: 50,
		status: "Value could not be verified."
	});
	assertEq("command payload command", result.command, true);
	assertEq("command payload not ok", result.ok, false);
	assert("command payload keeps clips", result.clips && result.clips.length === 1);

	assertEq("selectedCountOf clips array", Batch.selectedCountOf({ clips: [{}, {}, {}] }), 3);
	assertEq("selectedCountOf selectedCount field", Batch.selectedCountOf({ selectedCount: 3 }), 3);
	assertEq("isBatchResult three clips", Batch.isBatchResult({ selectedCount: 3, clips: [{}, {}, {}] }), true);
	assertEq("isBatchResult one clip", Batch.isBatchResult({ selectedCount: 1, batch: false }), false);

	result = Batch.summarize({
		effect: "Gaussian Blur",
		parameter: "Amount",
		requestedValue: 40
	}, [
		{ clip: "A", ok: true, verified: true, requestedValue: 40, actualValue: 40 },
		{ clip: "B", ok: true, verified: true, requestedValue: 40, actualValue: 40 },
		{ clip: "C", ok: true, verified: true, requestedValue: 40, actualValue: 40 }
	]);
	assertEq("gaussian 40 selected", result.selectedCount, 3);
	assertEq("gaussian 40 successful", result.successfulCount, 3);
	assertEq("gaussian 40 failed", result.failedCount, 0);
	assertEq("gaussian 40 batch", result.batch, true);
	result = Batch.toCommandPayload(result, {
		effect: "Gaussian Blur",
		parameter: "Amount",
		value: 40
	});
	assertEq("gaussian 40 command ok", result.ok, true);
	assertEq("gaussian 40 command command", result.command, true);
	assertEq("gaussian 40 command clips", result.clips.length, 3);
	assertEq("single-clip footer unchanged", Batch.formatSuccessFooter({
		ok: true,
		command: true,
		effect: "Gaussian Blur",
		parameter: "Amount",
		value: 40,
		selectedCount: 1
	}), "✓ Gaussian Blur · Amount 40");
	assertEq("batch footer includes clip count", Batch.formatSuccessFooter(result), "✓ Gaussian Blur · Amount 40 · 3 clips");
}());

(function () {
	var previousBridge = typeof PremiereBridge !== "undefined" ? PremiereBridge : undefined;
	var payload;

	PremiereBridge = {
		listEffectParameters: function (csInterface, effectName, done) {
			done({
				ok: true,
				effect: { displayName: effectName },
				parameters: [{ displayName: "Amount", type: "number", writable: true, value: 0 }]
			});
		},
		setParameter: function (csInterface, effectName, parameterName, value, done) {
			done({
				ok: true,
				batch: true,
				command: true,
				effect: "Gaussian Blur",
				parameter: "Amount",
				requestedValue: value,
				value: value,
				actualValue: value,
				verified: true,
				summary: { selected: 3, successful: 3, failed: 0 },
				selectedCount: 3,
				successfulCount: 3,
				failedCount: 0,
				verifiedCount: 3,
				clips: [
					{ clip: "A", ok: true, requestedValue: value, actualValue: value, verified: true },
					{ clip: "B", ok: true, requestedValue: value, actualValue: value, verified: true },
					{ clip: "C", ok: true, requestedValue: value, actualValue: value, verified: true }
				],
				debugSelection: {
					rawCount: 3,
					rawVia: "length",
					indexBase: 0,
					videoCount: 3,
					videoItems: [
						{ name: "A", mediaType: "Video", selected: true },
						{ name: "B", mediaType: "Video", selected: true },
						{ name: "C", mediaType: "Video", selected: true }
					]
				},
				runtime: {
					path: "batch",
					videoCount: 3,
					enteredBatchExecutor: true,
					setParameterReceived: "all selected video TrackItems",
					loopedClips: 3
				}
			});
		}
	};

	CommandExecutor.run(null, { name: "Gaussian Blur", premiereName: "Gaussian Blur" }, 40, "", function (result) {
		payload = result;
	});

	assertEq("executor batch ok", payload.ok, true);
	assertEq("executor batch command", payload.command, true);
	assertEq("executor batch selectedCount", payload.selectedCount, 3);
	assertEq("executor entered batch", payload.runtime.commandExecutorEnteredBatch, true);
	assertEq("executor footer", BatchNumericExecutor.formatSuccessFooter(payload), "✓ Gaussian Blur · Amount 40 · 3 clips");
	assertEq("executor clip A verified", payload.clips[0].verified, true);
	assertEq("executor clip C ok", payload.clips[2].ok, true);

	if (previousBridge !== undefined) {
		PremiereBridge = previousBridge;
	}
}());
