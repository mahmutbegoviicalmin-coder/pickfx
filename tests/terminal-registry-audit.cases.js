(function () {
	var startCount = passed + failed;
	var generated;
	var audit;
	var valid;
	var registryNames;
	var gaussian;
	var amount;
	var totalClassified;
	var productionDiff;

	function effectByName(artifact, name) {
		var i;
		for (i = 0; i < artifact.effects.length; i++) {
			if (artifact.effects[i].displayName === name) {
				return artifact.effects[i];
			}
		}
		return null;
	}

	function parameterByName(effect, name) {
		var i;
		for (i = 0; i < effect.parameters.length; i++) {
			if (effect.parameters[i].parameterDisplayName === name) {
				return effect.parameters[i];
			}
		}
		return null;
	}

	if (typeof fs !== "undefined" && typeof path !== "undefined" &&
			typeof __pickfxRoot === "string") {
		generated = JSON.parse(fs.readFileSync(
			path.join(__pickfxRoot, "src/data/terminal-registry.generated.json"),
			"utf8"
		));
		registryNames = generated.effects.map(function (effect) {
			return effect.displayName;
		});
		audit = TerminalRegistryAudit.audit(
			generated,
			registryNames,
			{
				resolver: TerminalCommandResolver,
				confirmedWrites: ConfirmedParameterWrites,
				generatedAt: "2026-08-22T20:39:00.000Z"
			}
		);
		valid = TerminalRegistryAudit.validate(audit);

		assertEq("terminal audit validates exhaustive artifact", valid.ok, true);
		assertEq("terminal audit records 134 effects", audit.summary.totalEffects, 134);
		assertEq("terminal audit records every parameter", audit.summary.totalParameters, 2434);
		assertEq("terminal audit flat list is complete", audit.parameters.length, 2434);
		totalClassified = audit.summary.safeTerminal +
			audit.summary.ambiguous +
			audit.summary.unsupported +
			audit.summary.manualReview;
		assertEq("terminal audit classifies every parameter once", totalClassified, 2434);
		assertEq("terminal audit records known production-write rows", audit.summary.writable, 32);
		assertEq("runtime diff overlaps complete identical index", audit.runtimeApplyDiff.overlapCount, 134);
		assertEq("runtime diff has no fabricated registry-only effect", audit.runtimeApplyDiff.onlyRegistryCount, 0);
		productionDiff = audit.productionWriteDiff;
		assertEq("old production write surface has four components", productionDiff.oldCount, 4);
		assertEq("production write overlap has four components", productionDiff.overlapCount, 4);
		assertEq("registry adds 130 effect identities beyond old write surface", productionDiff.onlyRegistryCount, 130);

		gaussian = effectByName(audit, "Gaussian Blur");
		amount = parameterByName(gaussian, "Amount");
		assert("terminal audit includes Gaussian Blur", !!gaussian);
		assert("terminal audit includes Gaussian Amount", !!amount);
		assertEq("Gaussian Amount is safe terminal parameter", amount.terminalSafety, "safe_terminal");
		assertEq("Gaussian Amount records completed reference", amount.prevalidated, true);
		assertEq("Gaussian Amount is not scheduled again", amount.liveTestPlanned, false);
		assertEq(
			"all other planned rows equal audit live count",
			audit.parameters.filter(function (row) {
				return row.liveTestPlanned === true;
			}).length,
			audit.summary.liveTestsPlanned
		);
		assert(
			"boolean parameters require manual review",
			audit.parameters.some(function (row) {
				return row.valueType === "boolean" &&
					row.terminalSafety === "manual_review";
			})
		);
		assert(
			"object parameters remain unsupported",
			audit.parameters.some(function (row) {
				return row.valueType === "object" &&
					row.terminalSafety === "unsupported";
			})
		);
		assert(
			"ambiguous numeric parameters are not live planned",
			audit.parameters.every(function (row) {
				return row.terminalSafety !== "ambiguous" ||
					row.liveTestPlanned !== true;
			})
		);
		assertEq(
			"selector-like numeric names require enum metadata",
			TerminalRegistryAudit.isLikelyEnumParameterName("Camera Mode"),
			true
		);
		assertEq(
			"numeric amount is not treated as enum-like",
			TerminalRegistryAudit.isLikelyEnumParameterName("Blur Amount"),
			false
		);
		assert(
			"selector-like numeric rows are excluded from safe terminal set",
			audit.parameters.every(function (row) {
				return !TerminalRegistryAudit.isLikelyEnumParameterName(
					row.parameterDisplayName
				) || row.terminalSafety !== "safe_terminal";
			})
		);
		assertEq(
			"validation plan excludes prevalidated Gaussian transaction",
			TerminalExhaustiveHarness.buildPlan(audit).tests.some(function (test) {
				return test.effectDisplayName === "Gaussian Blur" &&
					test.parameterDisplayName === "Amount";
			}),
			false
		);
	}

	print("terminal registry audit tests " + ((passed + failed) - startCount));
}());
