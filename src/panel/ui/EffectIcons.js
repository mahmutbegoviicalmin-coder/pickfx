var EffectIcons = (function () {
	var SW = "1.45";

	function svg(inner) {
		return '<svg class="icon-svg" viewBox="0 0 16 16" fill="none" aria-hidden="true">' + inner + "</svg>";
	}

	function stroke(d) {
		return '<path d="' + d + '" stroke="currentColor" stroke-width="' + SW + '" stroke-linecap="round" stroke-linejoin="round" fill="none"/>';
	}

	function fill(d) {
		return '<path d="' + d + '" fill="currentColor"/>';
	}

	function circle(cx, cy, r, filled) {
		return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" ' +
			(filled ? 'fill="currentColor"' : 'stroke="currentColor" stroke-width="' + SW + '" fill="none"') +
			"/>";
	}

	var MARKUP = {
		blur: svg(
			fill("M8 2.7c2.15 2.4 3.35 4 3.35 6.05A3.35 3.35 0 1 1 4.65 8.75C4.65 6.7 5.85 5.1 8 2.7Z") +
			'<path d="M6.55 9.15c.35 1.1 1.45 1.7 2.55 1.35" stroke="#171717" stroke-width="1.1" stroke-linecap="round" fill="none"/>'
		),
		brightness: svg(
			circle(8, 8, 2.35, true) +
			stroke("M8 1.85v1.45M8 12.7v1.45M1.85 8h1.45M12.7 8h1.45M3.55 3.55l1.05 1.05M11.4 11.4l1.05 1.05M12.45 3.55l-1.05 1.05M4.6 11.4l-1.05 1.05")
		),
		contrast: svg(
			circle(8, 8, 5) +
			'<path d="M8 3a5 5 0 0 0 0 10V3Z" fill="currentColor"/>'
		),
		temperature: svg(
			stroke("M8 2.35c-.85 0-1.5.65-1.5 1.5v5.2a2.55 2.55 0 1 0 3 0V3.85c0-.85-.65-1.5-1.5-1.5Z") +
			fill("M8 9.15a1.35 1.35 0 1 0 0 2.7 1.35 1.35 0 0 0 0-2.7Z") +
			stroke("M10.35 4.2h1.35M10.35 5.7h1.35")
		),
		saturation: svg(
			fill("M8 2.45c2.3 2.5 3.5 4.15 3.5 6.15A3.5 3.5 0 1 1 4.5 8.6C4.5 6.6 5.7 4.95 8 2.45Z")
		),
		color: svg(
			circle(6.15, 6.35, 3.15) +
			circle(9.85, 6.35, 3.15) +
			circle(8, 10.05, 3.15)
		),
		lumetri: svg(
			circle(5.4, 6.2, 2.55) +
			circle(10.6, 6.2, 2.55) +
			circle(8, 10.55, 2.55) +
			circle(5.4, 6.2, 0.85, true) +
			circle(10.6, 6.2, 0.85, true) +
			circle(8, 10.55, 0.85, true)
		),
		opacity: svg(
			'<rect x="3.1" y="4.85" width="6.6" height="6.6" rx="1" stroke="currentColor" stroke-width="' + SW + '" fill="none"/>' +
			'<rect x="6.3" y="3.15" width="6.6" height="6.6" rx="1" stroke="currentColor" stroke-width="' + SW + '" fill="currentColor" fill-opacity="0.28"/>'
		),
		scale: svg(
			'<rect x="3.15" y="5.35" width="6.2" height="6.2" rx="1" stroke="currentColor" stroke-width="' + SW + '" fill="none"/>' +
			stroke("M9.45 3.2h3.35V6.55M12.8 3.2L8.85 7.15")
		),
		rotation: svg(
			stroke("M12.15 8.2A4.15 4.15 0 1 1 8.15 4.1") +
			fill("M12.35 2.85l.15 3.15-3.05-.85 2.9-2.3Z")
		),
		crop: svg(
			stroke("M3.35 2.55v7.1h7.1") +
			stroke("M12.65 13.45V6.35H5.55") +
			stroke("M3.35 5.15H2.2M10.45 13.45v1.1")
		),
		position: svg(
			circle(8, 8, 2.05) +
			stroke("M8 2.2v3.05M8 10.75v3.05M2.2 8h3.05M10.75 8h3.05")
		),
		anchor: svg(
			circle(8, 8, 1.55, true) +
			stroke("M8 2.35v3.15M8 10.5v3.15M2.35 8h3.15M10.5 8h3.15") +
			circle(8, 8, 3.35)
		),
		motion: svg(
			stroke("M2.55 8h6.35") +
			fill("M8.15 5.35L12.45 8 8.15 10.65V5.35Z") +
			stroke("M13.25 4.85v6.3")
		),
		transform: svg(
			'<rect x="3.05" y="5.55" width="6.35" height="6.35" rx="1" stroke="currentColor" stroke-width="' + SW + '" fill="none"/>' +
			stroke("M9.2 3.15h3.65V6.8M12.85 3.15l-4 4")
		),
		sharpen: svg(
			fill("M8 2.35L13.35 13.2H2.65L8 2.35Z") +
			'<path d="M8 6.2v3.55" stroke="#171717" stroke-width="1.2" stroke-linecap="round"/>'
		),
		distortion: svg(
			stroke("M2.35 5.15c1.7-2.1 3.2 2.2 5.65 0s3.95 2.2 5.65 0") +
			stroke("M2.35 10.85c1.7-2.1 3.2 2.2 5.65 0s3.95 2.2 5.65 0")
		),
		noise: svg(
			circle(4.2, 4.35, 0.95, true) +
			circle(8.15, 3.55, 0.7, true) +
			circle(11.7, 4.7, 0.95, true) +
			circle(5.55, 7.85, 0.75, true) +
			circle(9.85, 7.25, 1, true) +
			circle(3.85, 11.05, 0.7, true) +
			circle(7.45, 11.35, 0.9, true) +
			circle(11.55, 10.55, 0.75, true)
		),
		keying: svg(
			'<rect x="3.2" y="6.15" width="9.6" height="4.15" rx="2.05" stroke="currentColor" stroke-width="' + SW + '" fill="none"/>' +
			circle(6.15, 8.25, 0.85, true)
		),
		light: svg(
			fill("M8 2.2l1.15 3.15 3.3.25-2.55 2.1.8 3.2L8 9.25 5.3 10.9l.8-3.2-2.55-2.1 3.3-.25L8 2.2Z")
		),
		stylize: svg(
			stroke("M3.35 12.55l6.7-8.35 2.15 1.75-6.7 8.35H3.35v-1.75Z") +
			stroke("M8.55 5.55l1.85 1.5")
		),
		vr: svg(
			stroke("M2.55 6.05h10.9v3.7c0 .85-.7 1.55-1.55 1.55H9.55L8 10.15 6.45 11.3H4.1c-.85 0-1.55-.7-1.55-1.55V6.05Z") +
			circle(5.85, 8, 1, true) +
			circle(10.15, 8, 1, true)
		),
		audio: svg(
			fill("M3.15 6.05v3.9l-1.2 1.15V4.9L3.15 6.05Z") +
			fill("M4.45 4.55h1.7v6.9H4.45z") +
			stroke("M8.35 5.55c1.35.85 1.35 4.05 0 4.9") +
			stroke("M10.55 4.15c2.2 1.45 2.2 6.25 0 7.7")
		),
		transition: svg(
			'<path d="M3.15 3.15h9.7v9.7H3.15z" stroke="currentColor" stroke-width="' + SW + '" fill="none"/>' +
			fill("M3.15 3.15h9.7L3.15 12.85V3.15Z")
		),
		generic: svg(
			'<path d="M8 2.55 13.2 8 8 13.45 2.8 8 8 2.55Z" stroke="currentColor" stroke-width="' + SW + '" stroke-linejoin="round" fill="none"/>' +
			'<rect x="8.35" y="8.35" width="3.15" height="3.15" rx="0.45" fill="currentColor"/>'
		)
	};

	function mark() {
		return svg(
			'<circle cx="8" cy="8" r="7.25" fill="#2a2a2a" stroke="rgba(255,255,255,0.08)" stroke-width="0.75"/>' +
			'<path d="M9.05 2.35L4.35 8.55h3L6.7 13.65l4.95-6.7H8.7L9.05 2.35Z" fill="#a1a1a6"/>'
		);
	}

	function bolt() {
		return mark();
	}

	function search() {
		return svg(circle(6.85, 6.85, 4.15) + stroke("M10.05 10.05L13.25 13.25"));
	}

	function gear() {
		return svg(
			circle(8, 8, 2) +
			stroke("M8 2.55v1.25M8 12.2v1.25M2.55 8h1.25M12.2 8h1.25M4.15 4.15l.9.9M10.95 10.95l.9.9M11.85 4.15l-.9.9M5.05 10.95l-.9.9")
		);
	}

	function ellipsis() {
		return svg(
			'<circle cx="3.5" cy="8" r="1" fill="currentColor"/>' +
			'<circle cx="8" cy="8" r="1" fill="currentColor"/>' +
			'<circle cx="12.5" cy="8" r="1" fill="currentColor"/>'
		);
	}

	function clock() {
		return svg(circle(8, 8, 5) + stroke("M8 5.15v3.05l2.15 1.3"));
	}

	function heart(filled) {
		var star = "M8 2.9l1.25 2.9 3.2.35-2.4 2.15.7 3.15L8 10.05l-2.75 1.5.7-3.15-2.4-2.15 3.2-.35L8 2.9Z";
		if (filled) {
			return svg('<path d="' + star + '" fill="currentColor"/>');
		}
		return svg('<path d="' + star + '" stroke="currentColor" stroke-width="' + SW + '" stroke-linejoin="round" fill="none"/>');
	}

	function fxMark() {
		return bolt();
	}

	function parameter() {
		return svg(stroke("M3.3 8h9.4") + stroke("M6.15 5.55v4.9") + stroke("M10.4 6.35v3.3"));
	}

	function check() {
		return svg('<path class="check-path" d="M3.4 8.2l2.8 2.8 6.4-6.45" stroke="currentColor" stroke-width="' + SW + '" stroke-linecap="round" stroke-linejoin="round" fill="none"/>');
	}

	function custom() {
		return svg(
			stroke("M4.05 3.85h7.9c.7 0 1.2.5 1.2 1.2v5.9c0 .7-.5 1.2-1.2 1.2H4.05c-.7 0-1.2-.5-1.2-1.2V5.05c0-.7.5-1.2 1.2-1.2Z") +
			stroke("M6.2 8h3.6M8 6.2v3.6")
		);
	}

	function info() {
		return svg(circle(8, 8, 5) + stroke("M8 7.25v3.35M8 5.2v.15"));
	}

	function library() {
		return svg(
			stroke("M3.35 3.2h9.3v9.6H3.35z") +
			stroke("M3.35 6.15h9.3") +
			stroke("M3.35 9.1h9.3")
		);
	}

	function back() {
		return svg(stroke("M9.6 3.55L4.85 8 9.6 12.45"));
	}

	function plus() {
		return svg(stroke("M8 3.55v8.9M3.55 8h8.9"));
	}

	function category(name) {
		return MARKUP[name] || MARKUP.generic;
	}

	return {
		category: category,
		mark: bolt,
		search: search,
		gear: gear,
		ellipsis: ellipsis,
		clock: clock,
		heart: heart,
		fxMark: fxMark,
		parameter: parameter,
		check: check,
		custom: custom,
		info: info,
		library: library,
		back: back,
		plus: plus
	};
}());

if (typeof module !== "undefined" && module.exports) {
	module.exports = EffectIcons;
}
