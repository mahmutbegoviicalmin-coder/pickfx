var PresetCapture = (function () {
	var PAGE_SIZE = 20;

	function schema() {
		return typeof PresetSchema !== "undefined" ? PresetSchema : null;
	}

	function defaultChecked(component) {
		var api = schema();
		if (!component || component.captureStatus === "unsupported" || component.kind === "unsupported") {
			return false;
		}
		if (api && api.isIntrinsicComponent(component.matchName, component.displayName)) {
			return false;
		}
		if (component.kind === "intrinsic") {
			return false;
		}
		return component.supportedParameterCount > 0 || component.captureStatus === "full" ||
			component.captureStatus === "partial";
	}

	function summary(components) {
		var effects = 0;
		var parameters = 0;
		var skipped = 0;
		var i;
		var row;
		for (i = 0; i < (components || []).length; i++) {
			row = components[i];
			if (!row || row.captureStatus === "unsupported") {
				continue;
			}
			effects += 1;
			parameters += (row.parameters && row.parameters.length) ? row.parameters.length : 0;
			skipped += (row.skipped && row.skipped.length) ? row.skipped.length : 0;
		}
		return {
			effects: effects,
			parameters: parameters,
			skipped: skipped
		};
	}

	function captureStatusCopy(component) {
		if (!component) {
			return "Not supported";
		}
		if (component.kind === "intrinsic") {
			return "Built-in component";
		}
		if (component.captureStatus === "unsupported" || component.kind === "unsupported") {
			return component.limitation || "Cannot reproduce safely";
		}
		if (component.skippedCount > 0 || component.captureStatus === "partial") {
			return "Partially supported";
		}
		return "Fully supported";
	}

	function parameterLine(component) {
		var supported = component && typeof component.supportedParameterCount === "number"
			? component.supportedParameterCount
			: 0;
		var skipped = component && typeof component.skippedCount === "number"
			? component.skippedCount
			: 0;
		var line = supported + (supported === 1 ? " supported parameter" : " supported parameters");
		if (component && component.kind === "intrinsic") {
			return "Built-in component";
		}
		if (component && (component.captureStatus === "unsupported" || component.kind === "unsupported")) {
			return component.limitation || "Cannot reproduce safely";
		}
		if (skipped) {
			return line + " · " + skipped + " skipped";
		}
		return line;
	}

	function pageComponent(csInterface, session, componentIndex, offset, collected, skippedCollected, done) {
		if (typeof PremiereBridge === "undefined" || !PremiereBridge.captureComponent) {
			done({
				ok: false,
				reason: "WRITE_FAILED",
				detail: "Capture is not available."
			});
			return;
		}
		PremiereBridge.captureComponent(
			csInterface,
			session,
			componentIndex,
			offset,
			PAGE_SIZE,
			function (page) {
				var next;
				var skipped;
				if (!page || !page.ok) {
					done(page || {
						ok: false,
						reason: "WRITE_FAILED",
						detail: "Capture failed."
					});
					return;
				}
				next = collected.concat(page.parameters || []);
				skipped = skippedCollected.concat(page.skipped || []);
				if (page.hasMore === true) {
					pageComponent(
						csInterface,
						session,
						componentIndex,
						typeof page.nextOffset === "number" ? page.nextOffset : offset + PAGE_SIZE,
						next,
						skipped,
						done
					);
					return;
				}
				done({
					ok: true,
					component: page.component,
					parameters: next,
					skipped: skipped
				});
			}
		);
	}

	function captureComponents(csInterface, session, selectedIndexes, done) {
		var queue = (selectedIndexes || []).slice();
		var captured = [];

		function next() {
			var index;
			if (!queue.length) {
				done({
					ok: true,
					session: session,
					components: captured
				});
				return;
			}
			index = queue.shift();
			pageComponent(csInterface, session, index, 0, [], [], function (page) {
				var component;
				if (!page || !page.ok) {
					done(page);
					return;
				}
				component = page.component || {};
				component.parameters = page.parameters || [];
				component.skipped = page.skipped || [];
				if (component.parameters.length && component.skipped.length) {
					component.captureStatus = "partial";
				} else if (component.parameters.length) {
					component.captureStatus = "full";
				} else {
					component.captureStatus = "unsupported";
				}
				if (component.captureStatus !== "unsupported") {
					captured.push(component);
				}
				next();
			});
		}

		next();
	}

	function listComponents(csInterface, done) {
		if (typeof PremiereBridge === "undefined" || !PremiereBridge.listCapturableComponents) {
			done({
				ok: false,
				reason: "WRITE_FAILED",
				detail: "Capture is not available."
			});
			return;
		}
		PremiereBridge.listCapturableComponents(csInterface, done);
	}

	function assemble(name, components, options) {
		var api = schema();
		if (!api) {
			return { ok: false, reason: "INVALID_PRESET", detail: "Preset schema is not loaded." };
		}
		return api.build({
			name: name,
			components: components,
			now: options && options.now,
			clock: options && options.clock,
			token: options && options.token,
			id: options && options.id
		});
	}

	return {
		PAGE_SIZE: PAGE_SIZE,
		defaultChecked: defaultChecked,
		summary: summary,
		captureStatusCopy: captureStatusCopy,
		parameterLine: parameterLine,
		listComponents: listComponents,
		captureComponents: captureComponents,
		assemble: assemble
	};
}());

if (typeof module !== "undefined" && module.exports) {
	module.exports = PresetCapture;
}
