"use strict";
// maybe split into init and update function
// add filters

function initTimeline(data, years) {
	// empty div
	const chart = d3.select("#timeline .charts");
	chart.selectAll("*").remove();

	var margin = { top: 25, right: 20, bottom: 40, left: 40 }, //read clockwise from top
		width = parseInt(chart.style("width"), 10) - margin.left - margin.right,
		height = parseInt(chart.style("height"), 10) - margin.top - margin.bottom;

	var g = chart
		.append("svg")
		.attr("height", height + margin.top + margin.bottom)
		.attr("width", width + margin.left + margin.right)
		.attr("id", "svg-timeline")
		.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")")
		.attr("id", "g-timeline");

	var minDate = parseDate(years[0] - 1 + "-06-30");
	var maxDate = parseDate(years[1] + "-06-30");

	// create time scale and x axis
	var xScale = d3
		.scaleTime()
		.domain([minDate, maxDate]) // data space
		.range([0, width]); // display space

	var xAxis = d3
		.axisBottom(xScale)
		.tickFormat(formatYear)
		.ticks(d3.timeYear.every(1))
		.tickPadding([5]);

	// draw axis into svg
	g.append("g")
		.attr("transform", "translate(0, " + (height + 4) + ")")
		.attr("class", "xaxis")
		.call(xAxis);

	// SWITCH BETWEEN TIMELINES ------------------------------------------------
	const gBars = g
		.append("g")
		.classed("hidden", !d3.select("#timeline-bars").property("checked"));

	const gLines = g
		.append("g")
		.attr("id", "gLines")
		.classed("hidden", !d3.select("#timeline-lines").property("checked"));

	d3.select("#timeline")
		.selectAll("input")
		.on("change", function() {
			gLines.classed(
				"hidden",
				!d3.select("#timeline-lines").property("checked")
			);
			gBars.classed("hidden", !d3.select("#timeline-bars").property("checked"));
		});

	// STACKED RECTANGLES BAR CHART --------------------------------------------

	var agtHeight = 1,
		agtSpacing = 0;

	// calculate agtWidth
	var agtWidth = width / (years[1] - years[0]);

	// Group agreements by Year (create an array of objects whose key is the
	// year and value is an array of objects (one per agreement))
	var dataByYear = d3
		.nest()
		.key(function(d) {
			return d.year;
		})
		.sortKeys(d3.ascending)
		.sortValues(function(a, b) {
			return a.date > b.date;
		})
		.entries(data);

	for (var i = 0; i < dataByYear.length; i++) {
		var rects = gBars
			.selectAll("rect .y" + i)
			.data(dataByYear[i].values)
			.enter()
			.append("rect")
			.classed("y" + i, true)
			.classed("agtTimelineBlock", true)
			.attr("id", d => "rect" + d.id)
			.attr("x", function(d) {
				return xScale(parseYear(d.year)) - agtWidth / 2;
			})
			.attr("y", function(d, i) {
				return height - (agtHeight + agtSpacing) * i;
			})
			.attr("width", agtWidth)
			.attr("height", agtHeight);

		rects
			.on("click", function(d) {
				selectedAgt.clickOn(d);
				event.stopPropagation();
			})
			.on("mouseover", onmouseover)
			.on("mouseout", onmouseout);
	} // end for loop (years)

	// add count at the top of each bar
	var text = gBars
		.append("g")
		.selectAll("text .count")
		.data(dataByYear) //yrCounts format: [Year, yrCount]
		.enter()
		.append("text")
		.attr("class", "count")
		.attr("x", function(d) {
			return xScale(parseYear(d.key));
		})
		.attr("y", function(d) {
			return height - d.values.length * (agtHeight + agtSpacing);
		})
		.text(function(d) {
			return d.values.length;
		});

	// LINE CHART --------------------------------------------------------------

	var tooltip = gLines
		.append("g")
		.attr("transform", "translate(-100,-100)")
		.attr("id", "tooltip")
		.style("pointer-events", "none");

	tooltip
		.append("circle")
		.attr("class", "tooltipCircle")
		.attr("r", 3);

	tooltip
		.append("text")
		.attr("class", "tooltipText")
		.attr("y", -12);

	var dataLines = d3
		.nest()
		.key(d => d.year)
		.rollup(function(v) {
			var arr = [];
			codes.forEach(function(code) {
				arr.push([code, d3.sum(v, d => d[code] > 0)]);
			});
			return arr;
		})
		.entries(data);

	var flatDataLines = [];

	for (var year = years[0]; year <= years[1]; year++) {
		var index = dataLines.findIndex(function(d) {
			return d.key == year;
		});
		if (index == -1) {
			codes.forEach(function(code) {
				flatDataLines.push({
					year: year,
					code: code,
					count: 0
				});
			});
		} else {
			dataLines[index].value.forEach(function(arr) {
				flatDataLines.push({
					year: year,
					code: arr[0],
					count: arr[1]
				});
			});
		}
	}

	dataLines = d3
		.nest()
		.key(function(d) {
			return d.code;
		})
		.entries(flatDataLines);

	var maxCount = d3.max(flatDataLines, d => d.count);

	var yLines = d3
		.scaleLinear()
		.domain([0, maxCount])
		.range([height, 0]);

	var yAxis = d3
		.axisLeft(yLines)
		.tickFormat(d3.format("d"))
		.tickPadding([5]);

	// draw axis into svg
	gLines
		.append("g")
		.attr("class", "yaxis")
		.call(yAxis);

	// define line generator
	var line = d3
		.line()
		.x(d => xScale(parseYear(d.year))) // set the x values for the line generator
		.y(d => yLines(d.count)); // set the y values for the line generator

	// draw lines
	var lines1 = gLines
		.selectAll(".codeline")
		.data(dataLines)
		.enter()
		.append("path")
		.datum(d =>
			d.values.sort(function(a, b) {
				return d3.ascending(a.year, b.year);
			})
		)
		.attr("d", line)
		.classed("codeLine", true)
		.attr("id", function(d) {
			return "line" + d[0].code;
		})
		.style("stroke", d => codeColour(d[0].code));

	// BAD SOLUTION
	if (dataByYear.length > 1) {
		// compute voronoi diagram for better mouseover interaction
		const delaunay = d3.Delaunay.from(
			flatDataLines,
			d => xScale(parseYear(d.year)), // x accessor
			d => yLines(d.count)
		); // y accessor

		const voronoi = delaunay.voronoi([0, 0, width, height]);

		// draw (invisible) voronoi diagram
		gLines
			.append("g")
			.selectAll("path")
			.data(flatDataLines)
			.enter()
			.append("path")
			.attr("d", function(d, i) {
				return voronoi.renderCell(i);
			})
			.classed("voronoiCell", true)
			.on("mouseover", mouseover)
			.on("mouseout", mouseout);

		//Voronoi mouseover and mouseout functions
		function mouseover(d) {
			lines1.classed("background", true);
			d3.select("#line" + d.code)
				.classed("background", false)
				.moveToFront();

			tooltip.moveToFront();

			tooltip.attr(
				"transform",
				"translate(" + xScale(parseYear(d.year)) + "," + yLines(d.count) + ")"
			);
			tooltip
				.select(".tooltipCircle")
				.style("fill", codeColour(d.code))
				.attr("r", 5);
			tooltip.select(".tooltipText").text(codesLong[d.code] + ": " + d.count);
		}

		function mouseout(d) {
			lines1.classed("background", false);
			tooltip.attr("transform", "translate(-100,-100)");
		}
	}
}
