var PresetExecutor = (function () {
	function schema() {
		return typeof PresetSchema !== "undefined" ? PresetSchema : null;
	}

	function shouldApplySelectedRow(row) {
		return !!(row && row.kind === "preset" && row.preset);
	}

	function userSummary(payload) {
		var name = payload && payload.presetName ? String(payload.presetName) : "Preset";
		var selected = payload && payload.selectedCount ? payload.selectedCount : 0;
		var okCount = payload && payload.successfulCount ? payload.successfulCount : 0;
		var failed = payload && payload.failedCount ? payload.failedCount : 0;
		var firstFailure = "";
		var i;
		if (payload && payload.clips) {
			for (i = 0; i < payload.clips.length; i++) {
				if (payload.clips[i] && payload.clips[i].ok !== true) {
					firstFailure = payload.clips[i].message || payload.clips[i].reason || "";
					break;
				}
			}
		}
		if (payload && payload.ok && selected > 1) {
			return {
				title: "Applied " + name,
				detail: "Applied to " + okCount + " clips",
				footer: "Applied to " + okCount + " clips"
			};
		}
		if (payload && payload.ok) {
			return {
				title: "Applied " + name,
				detail: "",
				footer: "Applied " + name
			};
		}
		if (okCount > 0 && failed > 0) {
			return {
				title: "Applied to " + okCount + " of " + selected + " clips",
				detail: failed + (failed === 1 ? " clip failed" : " clips failed") +
					(firstFailure ? ": " + firstFailure : ""),
				footer: "Applied to " + okCount + " of " + selected + " clips"
			};
		}
		return null;
	}

	function apply(csInterface, preset, done) {
		var api = schema();
		var checked;
		if (typeof PanelEntitlement !== "undefined" &&
				typeof PanelEntitlement.isCustomerGateActive === "function" &&
				PanelEntitlement.isCustomerGateActive() &&
				!PanelEntitlement.productAccess()) {
			done({
				ok: false,
				preset: true,
				command: true,
				reason: "ENTITLEMENT_INACTIVE",
				status: "PickFX access is inactive."
			});
			return;
		}
		if (!api) {
			done({
				ok: false,
				preset: true,
				command: true,
				reason: "INVALID_PRESET",
				status: "Couldn't apply that look."
			});
			return;
		}
		checked = api.validate(preset);
		if (!checked.ok) {
			checked.preset = true;
			checked.command = true;
			checked.status = checked.reason === "UNSUPPORTED_SCHEMA"
				? "This preset can’t be used in this version."
				: (checked.reason === "EMPTY_PRESET" ? "This preset is empty." : "Couldn't apply that look.");
			done(checked);
			return;
		}
		if (typeof PremiereBridge === "undefined" || !PremiereBridge.applyPickFXPreset) {
			done({
				ok: false,
				preset: true,
				command: true,
				reason: "WRITE_FAILED",
				status: "Couldn't apply that look."
			});
			return;
		}
		PremiereBridge.applyPickFXPreset(csInterface, checked.preset, function (payload) {
			if (!payload) {
				done({
					ok: false,
					preset: true,
					command: true,
					reason: "WRITE_FAILED",
					status: "Couldn't apply that look."
				});
				return;
			}
			payload.preset = true;
			payload.command = true;
			payload.presetId = checked.preset.id;
			payload.presetName = checked.preset.name;
			done(payload);
		});
	}

	return {
		shouldApplySelectedRow: shouldApplySelectedRow,
		userSummary: userSummary,
		apply: apply
	};
}());

if (typeof module !== "undefined" && module.exports) {
	module.exports = PresetExecutor;
}
