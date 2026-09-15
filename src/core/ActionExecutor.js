var ActionExecutor = (function () {
	function fail(reason, status, extra) {
		var payload = {
			ok: false,
			command: true,
			action: true,
			reason: typeof ParameterEngine !== "undefined" && ParameterEngine.normalizeReason
				? ParameterEngine.normalizeReason(reason)
				: reason,
			status: status,
			verified: false
		};
		var key;
		if (extra) {
			for (key in extra) {
				if (extra.hasOwnProperty(key)) {
					payload[key] = extra[key];
				}
			}
		}
		if (!payload.status && typeof ParameterEngine !== "undefined" && ParameterEngine.statusFor) {
			payload.status = ParameterEngine.statusFor(payload.reason);
		}
		return payload;
	}

	function denyIfInactive(done) {
		if (typeof PanelEntitlement === "undefined" ||
				typeof PanelEntitlement.isCustomerGateActive !== "function" ||
				!PanelEntitlement.isCustomerGateActive() ||
				PanelEntitlement.productAccess()) {
			return false;
		}
		done(fail("ENTITLEMENT_INACTIVE", "PickFX access is inactive."));
		return true;
	}

	function shape(payload, spec) {
		if (!payload) {
			return fail("WRITE_FAILED", "Could not run action.", {
				actionId: spec && spec.actionId
			});
		}
		payload.command = true;
		payload.action = true;
		if (spec) {
			if (!payload.actionId) {
				payload.actionId = spec.actionId;
			}
			if (!payload.effect) {
				payload.effect = spec.actionName || spec.actionId;
			}
			if (!payload.parameter && spec.parameterDisplayName) {
				payload.parameter = spec.parameterDisplayName;
			}
		}
		if (!payload.ok && !payload.status && typeof ParameterEngine !== "undefined" && ParameterEngine.statusFor) {
			payload.status = ParameterEngine.statusFor(payload.reason);
		}
		return payload;
	}

	function run(csInterface, action, done) {
		var spec;
		if (denyIfInactive(done)) {
			return;
		}
		if (!action || !action.id) {
			done(fail("WRITE_FAILED", "Action not found."));
			return;
		}
		if (action.execution === "set-parameter") {
			done(fail("WRITE_FAILED", "Set Scale uses the existing parameter writer.", {
				actionId: action.id,
				uiKind: "set-parameter"
			}));
			return;
		}
		if (typeof ActionRegistry === "undefined" || !ActionRegistry.hostSpec) {
			done(fail("WRITE_FAILED", "Action registry is not loaded.", { actionId: action.id }));
			return;
		}
		spec = ActionRegistry.hostSpec(action);
		if (typeof PremiereBridge === "undefined" || typeof PremiereBridge.runAction !== "function") {
			done(fail("WRITE_FAILED", "Could not run action.", { actionId: action.id }));
			return;
		}
		PremiereBridge.runAction(csInterface, spec, function (payload) {
			done(shape(payload, spec));
		});
	}

	return {
		run: run
	};
}());

if (typeof module !== "undefined" && module.exports) {
	module.exports = ActionExecutor;
}
