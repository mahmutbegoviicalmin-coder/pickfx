var EffectExecutor = (function () {
	function applyEffect(csInterface, premiereName, done) {
		var indexed = EffectRegistry.findByPremiereName(premiereName);

		if (!indexed) {
			done({
				ok: false,
				effect: premiereName || "",
				applied: 0,
				failed: 0,
				errors: [{ reason: "Effect is not in the local Effect Index." }],
				status: "Effect is not in the local Effect Index."
			});
			return;
		}

		PremiereBridge.applyEffect(csInterface, indexed.premiereName, done);
	}

	return {
		applyEffect: applyEffect
	};
}());
