var UniversalParameterResolver = (function () {
	function fail(reason, detail, extra) {
		var payload = {
			ok: false,
			reason: reason || "PARAMETER_NOT_FOUND",
			detail: detail ? String(detail) : ""
		};
		var key;
		if (extra) {
			for (key in extra) {
				if (extra.hasOwnProperty(key)) {
					payload[key] = extra[key];
				}
			}
		}
		return payload;
	}

	function resolver() {
		if (typeof $._pickfxParameterResolver !== "undefined") {
			return $._pickfxParameterResolver;
		}
		return null;
	}

	function fold(value) {
		return String(value || "").replace(/^\s+|\s+$/g, "").toLowerCase();
	}

	function componentMatches(componentDisplay, componentMatch, hint) {
		var wanted;
		if (!hint) {
			return true;
		}
		wanted = String(hint);
		if (componentDisplay === wanted || componentMatch === wanted) {
			return true;
		}
		return false;
	}

	function resolve(trackItem, parameterName, componentHint) {
		var res = resolver();
		var wanted = String(parameterName || "").replace(/^\s+|\s+$/g, "");
		var wantedFold;
		var mediaType;
		var components;
		var countInfo;
		var indexBase;
		var i;
		var p;
		var component;
		var componentDisplay;
		var componentMatch;
		var props;
		var propertyCount;
		var propertyBase;
		var param;
		var paramName;
		var paramMatch;
		var exact;
		var folded;
		var chosen;

		if (!res) {
			return fail("PARAMETER_NOT_FOUND", "ParameterResolver is not loaded.");
		}
		if (!wanted) {
			return fail("PARAMETER_NOT_FOUND", "Parameter displayName is required.");
		}
		if (!trackItem) {
			return fail("NO_VIDEO_SELECTION", "No TrackItem was provided.");
		}
		mediaType = res.readString(trackItem, "mediaType");
		if (mediaType !== "Video") {
			return fail("NO_VIDEO_SELECTION", "TrackItem.mediaType is " + String(mediaType) + ", expected Video.");
		}
		try {
			components = trackItem.components;
		} catch (compErr) {
			return fail("PARAMETER_NOT_FOUND", "TrackItem.components threw: " + String(compErr));
		}
		countInfo = res.collectionCount(components);
		if (countInfo.count < 0) {
			return fail("PARAMETER_NOT_FOUND", "Could not read components.");
		}
		indexBase = res.collectionIndexBase(components, countInfo.count);
		wantedFold = fold(wanted);
		exact = [];
		folded = [];
		for (i = 0; i < countInfo.count; i++) {
			component = res.collectionItem(components, i, indexBase);
			componentDisplay = res.readString(component, "displayName") || "";
			componentMatch = res.readString(component, "matchName") || "";
			if (!componentMatches(componentDisplay, componentMatch, componentHint)) {
				continue;
			}
			try {
				props = component.properties;
			} catch (ignoreProps) {
				continue;
			}
			propertyCount = res.collectionCount(props);
			if (propertyCount.count < 0) {
				continue;
			}
			propertyBase = res.collectionIndexBase(props, propertyCount.count);
			for (p = 0; p < propertyCount.count; p++) {
				param = res.collectionItem(props, p, propertyBase);
				paramName = res.readString(param, "displayName") || "";
				paramMatch = res.readString(param, "matchName") || "";
				if (!paramName) {
					continue;
				}
				if (paramName === wanted || (paramMatch && paramMatch === wanted)) {
					exact.push({
						param: param,
						paramName: paramName,
						paramMatch: paramMatch,
						component: component,
						componentDisplay: componentDisplay,
						componentMatch: componentMatch
					});
				} else if (fold(paramName) === wantedFold) {
					folded.push({
						param: param,
						paramName: paramName,
						paramMatch: paramMatch,
						component: component,
						componentDisplay: componentDisplay,
						componentMatch: componentMatch
					});
				}
			}
		}
		if (exact.length > 1) {
			return fail(
				"PARAMETER_NOT_FOUND",
				'Parameter displayName "' + wanted + '" is ambiguous across ' + exact.length + " components.",
				{ matchCount: exact.length }
			);
		}
		chosen = exact.length === 1 ? exact[0] : null;
		if (!chosen && folded.length === 1) {
			chosen = folded[0];
		} else if (!chosen && folded.length > 1) {
			return fail(
				"PARAMETER_NOT_FOUND",
				'Parameter displayName "' + wanted + '" is ambiguous across ' + folded.length + " components.",
				{ matchCount: folded.length }
			);
		}
		if (!chosen) {
			return fail("PARAMETER_NOT_FOUND", 'No property with displayName "' + wanted + '".');
		}
		return {
			ok: true,
			effect: {
				displayName: chosen.componentDisplay,
				matchName: chosen.componentMatch
			},
			parameter: {
				displayName: chosen.paramName,
				matchName: chosen.paramMatch || ""
			},
			identity: {
				componentDisplayName: chosen.componentDisplay,
				componentMatchName: chosen.componentMatch,
				parameterDisplayName: chosen.paramName,
				parameterMatchName: chosen.paramMatch || ""
			},
			_component: chosen.component,
			_param: chosen.param
		};
	}

	return {
		resolve: resolve
	};
}());

if (typeof $ !== "undefined") {
	$._pickfxUniversalParameterResolver = UniversalParameterResolver;
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = UniversalParameterResolver;
}
