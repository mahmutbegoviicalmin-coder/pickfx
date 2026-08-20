var RecentStore = (function () {
	var KEY = "pickfx.recent";
	var MAX = 8;

	function trim(value) {
		return String(value || "").replace(/^\s+|\s+$/g, "");
	}

	function asEntry(item) {
		if (!item) {
			return null;
		}
		if (typeof item === "string") {
			item = trim(item);
			if (!item) {
				return null;
			}
			return {
				kind: "effect",
				name: item,
				query: "",
				parameter: "",
				title: item
			};
		}
		if (typeof item !== "object") {
			return null;
		}
		var name = trim(item.name);
		var query = trim(item.query);
		var kind;
		if (!name && !query) {
			return null;
		}
		if (item.kind === "effect") {
			kind = "effect";
		} else if (item.kind === "command" || query) {
			kind = "command";
		} else {
			kind = "effect";
		}
		if (kind === "command" && !query) {
			kind = "effect";
		}
		return {
			kind: kind,
			name: name,
			query: query,
			parameter: trim(item.parameter),
			value: item.value,
			title: trim(item.title) || query || name
		};
	}

	function identity(entry) {
		if (!entry) {
			return "";
		}
		if (entry.kind === "command" && entry.query) {
			return "q:" + entry.query.toLowerCase();
		}
		return "n:" + String(entry.name || "").toLowerCase();
	}

	function load() {
		var parsed;
		var out = [];
		var i;
		var entry;
		try {
			parsed = JSON.parse(window.localStorage.getItem(KEY) || "[]");
		} catch (ignore) {
			parsed = [];
		}
		if (!parsed || !parsed.length) {
			return out;
		}
		for (i = 0; i < parsed.length; i++) {
			entry = asEntry(parsed[i]);
			if (entry) {
				out.push(entry);
			}
		}
		return out;
	}

	function save(entries) {
		window.localStorage.setItem(KEY, JSON.stringify(entries));
	}

	function add(item) {
		var entry = asEntry(item);
		var entries;
		var key;
		if (!entry) {
			return load();
		}
		key = identity(entry);
		entries = load().filter(function (row) {
			return identity(row) !== key;
		});
		entries.unshift(entry);
		if (entries.length > MAX) {
			entries = entries.slice(0, MAX);
		}
		save(entries);
		return entries;
	}

	return {
		list: load,
		add: add
	};
}());
