var PickFXLauncherRuntime = (function () {
	function fail(reason, status) {
		return {
			ok: false,
			command: true,
			productionTerminal: true,
			reason: reason,
			status: status || reason,
			verified: false
		};
	}

	function execute(query, deps) {
		var entitlement = deps && deps.entitlement;
		var registry = deps && deps.registry;
		var registryData = deps && deps.registryData;
		var executor = deps && deps.executor;
		var done = deps && deps.done;
		var resolution;
		if (typeof done !== "function") {
			return fail("CALLBACK_REQUIRED");
		}
		if (!entitlement ||
				typeof entitlement.globalLauncherEnabled !== "function" ||
				!entitlement.globalLauncherEnabled(entitlement.currentRecord())) {
			done(fail("LAUNCHER_DISABLED", "PickFX launcher is not available."));
			return false;
		}
		if (!registry || typeof registry.resolve !== "function" || !registryData) {
			done(fail("REGISTRY_UNAVAILABLE", "Production registry is unavailable."));
			return false;
		}
		if (!executor || typeof executor.dispatch !== "function") {
			done(fail("SAFE_EXECUTOR_UNAVAILABLE", "Verified executor is unavailable."));
			return false;
		}
		resolution = registry.resolve(query, registryData);
		if (!resolution || resolution.ok !== true || resolution.productionVerified !== true) {
			done(fail(
				(resolution && resolution.reason) || "COMMAND_NOT_PROMOTED",
				(resolution && (resolution.detail || resolution.status)) ||
					"No executable command found."
			));
			return false;
		}
		executor.dispatch(
			deps.csInterface,
			resolution,
			{
				featureEnabled: true,
				entitlementState: entitlement.currentState()
			},
			done
		);
		return true;
	}

	return {
		execute: execute
	};
}());

if (typeof module !== "undefined" && module.exports) {
	module.exports = PickFXLauncherRuntime;
}
