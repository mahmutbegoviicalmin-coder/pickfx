var PickFXEntitlementClient = (function () {
	function installationId(csInterface) {
		return PanelEntitlement.getOrCreateInstallationId(csInterface);
	}

	function applyCached(csInterface) {
		var cached = PanelEntitlement.loadCachedSession(null, csInterface);
		if (cached) {
			PanelEntitlement.setCurrent(cached);
		}
		return cached;
	}

	async function revalidate(csInterface) {
		var cached = PanelEntitlement.currentRecord() ||
			PanelEntitlement.loadCachedSession(null, csInterface);
		var res;
		var body = {};
		if (!cached || !cached.sessionToken) {
			PanelEntitlement.clearCachedSession(null, csInterface);
			return null;
		}
		try {
			res = await fetch(
				PanelEntitlement.apiBase() +
					"/api/panel/entitlement?installation_id=" +
					encodeURIComponent(installationId(csInterface)),
				{
					headers: {
						Authorization: "Bearer " + cached.sessionToken
					}
				}
			);
			try {
				body = await res.json();
			} catch (ignoreJson) {}
			if (res.ok && body && body.entitlement) {
				return PanelEntitlement.saveCachedSession(
					PanelEntitlement.recordFromServer(
						cached.sessionToken,
						body,
						(body.user && body.user.email) || body.email || cached.email
					),
					null,
					csInterface
				);
			}
			if (res.status === 401 || res.status === 403) {
				PanelEntitlement.clearCachedSession(null, csInterface);
				return null;
			}
			if (PanelEntitlement.canUseStaleCache(cached)) {
				PanelEntitlement.setCurrent(cached);
				return cached;
			}
			return cached;
		} catch (ignoreNet) {
			if (PanelEntitlement.canUseStaleCache(cached)) {
				PanelEntitlement.setCurrent(cached);
			}
			return cached;
		}
	}

	return {
		applyCached: applyCached,
		revalidate: revalidate
	};
}());

if (typeof module !== "undefined" && module.exports) {
	module.exports = PickFXEntitlementClient;
}
