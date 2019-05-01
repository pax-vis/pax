function mouseoverCountry(that, d) {
	var polygon = d3.select(that);

	polygon.classed("hover", true).moveToFront();

	// add tooltip with country name
	var tooltip = d3
		.select("#tooltipMap")
		.attr(
			"transform",
			"translate(" +
				d3.zoomTransform(svg.node()).apply(projection(d3.geoCentroid(d))) +
				")"
		);
	tooltip.select(".tooltipText").text(d.properties.name);

	// select all glyph containers
	var dots_con = d3.select("#dots" + d.id).selectAll(".glyphContainer");

	// grow circles and change colour
	dots_con
		.selectAll("circle")
		.transition()
		.duration(200)
		.attr("r", rCircle * 2)
		.style("fill", "#888");

	// grow flower petals
	dots_con
		.selectAll("path")
		.data(d => petalData(d))
		.enter()
		.append("path")
		.classed("petal", true)
		.attr("d", arc_mini)
		.style("fill", d => d.colour)
		.transition()
		.duration(200)
		.attr("d", arc);
}

function mouseoutCountry(that, d) {
	d3.select(that).classed("hover", false);

	// hide tooltip
	d3.select("#tooltipMap").attr("transform", "translate(-100, -100)");

	// shrink dots again
	d3.select("#dots" + d.id)
		.selectAll("circle")
		.transition()
		.duration(200)
		.attr("r", rCircle)
		.style("fill", null);

	// delete petals again
	d3.select("#dots" + d.id)
		.selectAll(".petal")
		.remove();
}

function clickCountry(con, data, world) {
	// white 70% opaque rectangle to cover entire map
	var bgRect = d3.select("#popG").append("g");
	bgRect
		.append("rect")
		.attr("height", h_map)
		.attr("width", w_map)
		.attr("id", "bgRect")
		.on("mouseover", function() {
			d3.select("#closeButton").classed("hover", true);
		})
		.on("mouseout", function() {
			d3.select("#closeButton").classed("hover", false);
		})
		.on("click", function() {
			d3.select("#popG")
				.selectAll("*")
				.remove();

			// hide controls
			d3.select("#popupControlsG").attr("transform", "translate(-100, -100)");
		});

	// (X) button to close
	bgRect
		.append("circle")
		.attr("id", "closeButton")
		.attr("cx", w_map - 40)
		.attr("cy", 40)
		.attr("r", 30);

	bgRect
		.selectAll("line")
		.data([[[0, 30], [0, 30]], [[0, 30], [30, 0]]])
		.enter()
		.append("line")
		.classed("closeButtonLines", true)
		.attr("transform", "translate(" + (w_map - 55) + "," + 25 + ")")
		.attr("x1", d => d[0][0])
		.attr("x2", d => d[0][1])
		.attr("y1", d => d[1][0])
		.attr("y2", d => d[1][1]);

	// filter for selected country only
	var con_data = data;
	// var con_data = data.filter(function(d) {
	// 	return d.con.indexOf(con) != -1;
	// });

	var splitByProcess = false;

	// split agreements into circles by peace process
	if (splitByProcess) {
		var con_data_process = d3
			.nest()
			.key(d => d.processid)
			.entries(con_data);

		// calculate circle pack for each peace process separately
		con_data_process.forEach(function(pr, i) {
			// list of all countries involved in the PP
			pr.cons = new Set(
				pr.values
					.map(d => d.con)
					.reduce(function(a, b) {
						return a.concat(b);
					})
			);

			// circle pack
			d3.packSiblings(
				pr.values.map(function(d) {
					d.r = glyphR;
					return d;
				})
			);
			pr.outercircle = d3.packEnclose(pr.values);
			pr.r = pr.outercircle.r * 1.2;
		});

		d3.packSiblings(con_data_process);

		// draw circles
		// g for each big circle
		var g = d3
			.select("#popG")
			.selectAll("g")
			.data(con_data_process)
			.enter()
			.append("g")
			.attr("transform", function(d) {
				return (
					"translate(" + (0.5 * w_map + d.x) + "," + (0.5 * h_map + d.y) + ")"
				);
			});

		// draw big background circle
		g.append("circle")
			.attr("x", 0)
			.attr("y", 0)
			.attr("r", d => d.outercircle.r)
			.classed("popupBgCircle", true);

		// g for each agreement, positioned correctly
		var glyph = g
			.selectAll(".popupGlyph")
			.data(d => d.values)
			.enter()
			.append("g")
			.classed("popupGlyph", true)
			.attr("transform", d => "translate(" + d.x + "," + d.y + ")");
	}

	// do not split by process
	else {
		// g centered in svg for all the popup stuff
		var popG = d3
			.select("#popG")
			.append("g")
			.attr("transform", function(d) {
				return "translate(" + 0.5 * w_map + "," + 0.5 * h_map + ")";
			});

		var bgG = popG.append("g").attr("id", "popupBgG");
		var spiralG = popG.append("g").attr("id", "popupSpiralG");
		var glyphG = popG.append("g").attr("id", "popupGlyphG");

		// d3.packSiblings(
		// 	con_data.map(function(d) {
		// 		d.r = glyphR;
		// 		return d;
		// 	})
		// );

		// SPIRAL -------------------------------------------

		var start = 0,
			end = 1,
			numSpirals = 20, // 1 = a half turn
			spiralRadius = numSpirals * glyphR * 1.1;

		var theta = function(r) {
			return numSpirals * Math.PI * r;
		};

		var radius = d3
			.scaleLinear()
			.domain([start, end])
			.range([10, spiralRadius]);

		var points = d3.range(start, end + 0.001, (end - start) / 1000);

		var spiral = d3
			.radialLine()
			.curve(d3.curveCardinal)
			.angle(theta)
			.radius(radius);

		var path = spiralG
			.append("path")
			.datum(points)
			.attr("id", "spiral")
			.attr("d", spiral)
			.style("fill", "none")
			.style("stroke", "none");

		var spiralLength = path.node().getTotalLength();

		// --------------------------------------------------

		// g for each agreement, positioned correctly
		var glyph = glyphG
			.selectAll(".popupGlyph")
			.data(con_data.sort(sortByDate))
			.enter()
			.append("g")
			.classed("popupGlyph", true)
			.attr("transform", function(d, i) {
				var posOnPath = path.node().getPointAtLength(i * delta);
				return "translate(" + posOnPath.x + "," + posOnPath.y + ")";
			});

		var tr = parseTransform(glyph.last().attr("transform")).translate;
		var outercircle_r =
			Math.sqrt(Math.pow(+tr[0], 2) + Math.pow(+tr[1], 2)) + glyphR;

		// show controls
		d3.select("#popupControlsG").attr(
			"transform",
			"translate(" + (w_map / 2 + (80 + outercircle_r)) + "," + h_map / 2 + ")"
		);

		// draw big background circle
		bgG
			.append("circle")
			.attr("x", 0)
			.attr("y", 0)
			.attr("r", outercircle_r)
			.classed("popupBgCircle", true);

		// calculate path for visible part of spiral and draw
		var len = con_data.length * delta;
		var locs = d3.range(0, len, delta / 2).map(function(d) {
			var pt = path.node().getPointAtLength(d);
			return [pt.x, pt.y];
		});

		var lineGenerator = d3.line().curve(d3.curveCardinal);
		var pathData = lineGenerator(locs);

		var path = bgG
			.append("path")
			.attr("d", pathData)
			.classed("popupBackgroundSpiral", true);

		// heading
		popG
			.append("text")
			.attr("x", 0)
			.attr("y", d3.min([-30 - outercircle_r, -160]))
			.classed("popupHeading", true)
			.text("Agreements signed by " + con);
	}

	// draw invisible circle for info on mouseover
	glyph
		.append("circle")
		.attr("fill", "transparent")
		.classed("glyphHighlightCircle", true)
		.attr("id", d => "glyph" + d.id)
		.attr("r", glyphR)
		.on("mouseover", onmouseover)
		.on("mouseout", onmouseout)
		.on("click", function(d) {
			selectedAgt.clickOn(d);
			event.stopPropagation();
		});

	// draw centre circle for each agreement
	glyph
		.append("circle")
		.attr("r", glyphR * 0.15)
		.classed("popupGlyphCircle", true);

	// add petals
	glyph
		.selectAll(".petal")
		.data(d => petalData(d))
		.enter()
		.append("path")
		.classed("popupGlyphPetal", true)
		.attr("d", arc)
		.style("fill", d => d.colour);
}

function sortGlyphsBy(sortingFunction, that) {
	d3.selectAll(".popupSortButtons .selected").classed("selected", false);
	d3.select(that).classed("selected", true);

	d3.selectAll(".popupGlyph")
		.sort(sortingFunction)
		.transition()
		.duration(100)
		.attr("transform", function(d, i) {
			var posOnPath = d3
				.select(".popupBackgroundSpiral")
				.node()
				.getPointAtLength(i * delta);
			return "translate(" + posOnPath.x + "," + posOnPath.y + ")";
		});
}

function sortByDate(a, b) {
	return a.date > b.date;
}

function sortByNCodes(a, b) {
	var scoreA = 0;
	var scoreB = 0;
	codes.forEach(function(code) {
		scoreA = a[code] > 0 ? scoreA + 1 : scoreA;
		scoreB = b[code] > 0 ? scoreB + 1 : scoreB;
	});
	return scoreA < scoreB;
}

function sortByCode(a, b, code) {
	return a[code] < b[code];
}

function petalData(d) {
	var activeCodes = [];
	for (var i = 0; i < codes.length; i++) {
		if (d[codes[i]]) {
			activeCodes.push(codes[i]);
		}
	}
	if (!activeCodes.length) {
		return [];
	} else {
		var incr = tau / codes.length;
		var obj = [];
		for (var i = 0; i < codes.length; i++) {
			if (activeCodes.includes(codes[i])) {
				obj.push({
					startAngle: i * incr,
					endAngle: (i + 1) * incr,
					colour: codeColour(codes[i])
				});
			}
		}
		return obj;
	}
}

var arc = d3
	.arc()
	.innerRadius(0)
	.outerRadius(glyphR * 0.8)
	.cornerRadius(5);

var arc_mini = d3
	.arc()
	.innerRadius(0)
	.outerRadius(1)
	.cornerRadius(5);
