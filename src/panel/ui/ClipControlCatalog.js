var ClipControlCatalog = (function () {
	function trim(value) {
		return String(value == null ? "" : value).replace(/^\s+|\s+$/g, "");
	}

	function normalize(value) {
		return trim(value).toLowerCase().replace(/\s+/g, " ");
	}

	function productionReady(entry) {
		return !!(entry &&
			entry.productionReady === true &&
			entry.writerPath === "ConfirmedParameterWrites.write");
	}

	function executableSpec(spec) {
		return !!(spec &&
			spec.type === "MOTION" &&
			spec.executionSupported === true &&
			spec.id &&
			spec.id.indexOf("clip.speed") === -1);
	}

	function itemFromCapability(entry, spec) {
		var displayName = trim((entry && entry.displayName) || (spec && spec.parameterDisplayName) || "");
		var commandName = trim((entry && entry.names && entry.names[0]) ||
			(spec && spec.names && spec.names[0]) ||
			displayName);
		var valueType = (entry && entry.valueType) || (spec && spec.valueType) || "number";
		var parameterName = trim((entry && entry.parameterDisplayName) || displayName);
		if (!displayName || !commandName) {
			return null;
		}
		return {
			kind: "clip-control",
			type: "clip-control",
			name: displayName,
			displayName: displayName,
			premiereName: displayName,
			capabilityId: (entry && entry.id) || (spec && spec.id) || "",
			commandName: commandName,
			valueType: valueType,
			parameters: [{
				displayName: parameterName,
				parameterDisplayName: parameterName,
				valueType: valueType,
				executable: true,
				writable: true
			}]
		};
	}

	function list(productionRegistry) {
		var items = [];
		var seen = {};
		var capabilities = productionRegistry && productionRegistry.capabilities
			? productionRegistry.capabilities
			: [];
		var specs = typeof TerminalCapabilityRegistry !== "undefined" &&
			TerminalCapabilityRegistry.entries
			? TerminalCapabilityRegistry.entries("MOTION")
			: [];
		var i;
		var item;
		var spec;

		for (i = 0; i < capabilities.length; i++) {
			if (!productionReady(capabilities[i])) {
				continue;
			}
			spec = typeof TerminalCapabilityRegistry !== "undefined" &&
				TerminalCapabilityRegistry.definition
				? TerminalCapabilityRegistry.definition(capabilities[i].id)
				: null;
			if (spec && !executableSpec(spec)) {
				continue;
			}
			item = itemFromCapability(capabilities[i], spec);
			if (!item || seen[normalize(item.displayName)]) {
				continue;
			}
			seen[normalize(item.displayName)] = true;
			items.push(item);
		}

		if (items.length) {
			return items;
		}

		for (i = 0; i < specs.length; i++) {
			if (!executableSpec(specs[i])) {
				continue;
			}
			item = itemFromCapability(null, specs[i]);
			if (!item || seen[normalize(item.displayName)]) {
				continue;
			}
			seen[normalize(item.displayName)] = true;
			items.push(item);
		}
		return items;
	}

	function find(name, productionRegistry) {
		var wanted = normalize(name);
		var items = list(productionRegistry);
		var i;
		for (i = 0; i < items.length; i++) {
			if (normalize(items[i].displayName) === wanted ||
					normalize(items[i].commandName) === wanted ||
					normalize(items[i].premiereName) === wanted) {
				return items[i];
			}
		}
		return null;
	}

	function has(name, productionRegistry) {
		return !!find(name, productionRegistry);
	}

	function applyQuery(effect, valueText) {
		var raw = trim(valueText);
		var parts;
		if (!effect || effect.kind !== "clip-control" || !raw) {
			return "";
		}
		if (effect.valueType === "point") {
			if (/^x\s+/i.test(raw)) {
				return trim(effect.commandName + " " + raw);
			}
			parts = raw.split(/[\s,]+/).filter(Boolean);
			if (parts.length >= 2) {
				return trim(effect.commandName + " x " + parts[0] + " y " + parts[1]);
			}
			return "";
		}
		return trim(effect.commandName + " " + raw);
	}

	return {
		list: list,
		find: find,
		has: has,
		applyQuery: applyQuery
	};
}());

if (typeof module !== "undefined" && module.exports) {
	module.exports = ClipControlCatalog;
}
