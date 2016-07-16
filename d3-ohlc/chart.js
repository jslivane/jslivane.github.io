// https://developer.mozilla.org/en-US/docs/Web/SVG
var lang = 'ko';
var div_tooltip;
var date_format_1 = d3.timeFormat("%-m.%-d");
var date_format_2 = d3.timeFormat("%Y.%-m.%-d");
var date_format_year = d3.timeFormat("%Y");
var time_format_1 = d3.timeFormat("%H:%M.%S");
var chart_margin = {top: 80, right: 80, bottom: 80, left: 80};

if (!Math.log10) Math.log10 = function(t){ return Math.log(t)/Math.LN10; };

function isUpDay(d, data) {
    if(d.c > d.o) {
        return true;

    } else if (d.c == d.o) {
        var p = data[d.no - 1];
        return (p == undefined) ? false : (d.o > p.c);

    }

}

function isDownDay(d, data) {
    if(d.c < d.o) {
        return true;

    } else if (d.c == d.o) {
        var p = data[d.no - 1];
        return (p == undefined) ? true : (d.o <= p.c);

    }
}

function chart() {
    var xScale = d3.scaleLinear(),
        yScale = d3.scaleLinear(),
        yBarScale = d3.scaleLinear(),
        yTransform = y_transform();

    var rectangleWidth = 1;

    var ohlc = function(selection) {
        var series, bars;

        selection.each(function (data) {
            series = d3.select(this).selectAll('.ohlc-series')
                .data([data])
                .enter().append('g').classed('ohlc-series', true);

            bars = series.selectAll('.bar')
                .data(data, function(d){ return d.no; })
                .enter()
                .append('g')
                .classed('bar', true)
                .classed('up-day', function(d){ return isUpDay(d, data); })
                .classed('down-day', function(d){ return isDownDay(d, data); });

            highLowLines(bars, xScale, yScale, yTransform);
            candleRects(bars, xScale, yScale, yTransform, rectangleWidth);
            volumeRects(bars, xScale, yBarScale, rectangleWidth);

            bars.on("mouseover", function(d){ show_tooltip(d, data); })
                .on("mouseout", function(d){ hide_tooltip(); });

            bars.exit().remove();

            series.exit().remove();

        });

    }

    ohlc.xScale = function (value) {
        if (!arguments.length) return xScale;
        xScale = value;
        return ohlc;
    };

    ohlc.yScale = function (value) {
        if (!arguments.length) return yScale;
        yScale = value;
        return ohlc;
    };

    ohlc.yBarScale = function (value) {
        if (!arguments.length) return yBarScale;
        yBarScale = value;
        return ohlc;
    };

    ohlc.yTransform = function (value) {
        if (!arguments.length) return yTransform;
        yTransform = value;
        return ohlc;
    };

    ohlc.rectangleWidth = function (value) {
        if (!arguments.length) return rectangleWidth;
        rectangleWidth = value;
        return ohlc;
    };

    return ohlc;

}

function show_tooltip(d, data){
    var p = (d.no > 0 ? (data ? data[d.no - 1] : undefined) : undefined);

    var x = d3.event.screenX <= ($(window).width() / 2) ? (d3.event.pageX + 20) : (d3.event.pageX - 160);
    var y = (d3.event.pageY - 28);

    div_tooltip.transition()
        .duration(200)
        .style("opacity", .9);

    div_tooltip.html("<b>" + date_format_2(d.d) + "</b><br/>" +
        (lang == 'ko' ? '시가' : 'Open') + " : "  + d.o.format_currency() + "<br/>" +
        (lang == 'ko' ? '고가' : 'High') + " : <sup>"  + d.h.format_currency() + "</sup><br/>" +
        (lang == 'ko' ? '저가' : 'Low') + " : <sub>"  + d.l.format_currency() + "</sub><br/>" +
        (lang == 'ko' ? '종가' : 'Close') + " : <b>"  + d.c.format_currency() + "</b>" +
        (p && p.c > 0 ? " (" + (d.c / p.c * 100).toFixed(0) + "%)" : "" ) + "<br/>" +
        (lang == 'ko' ? '거래량' : 'Volume') + " : "  + d.v.format_currency() +
        (p && p.v > 0 ? " (" + (d.v / p.v * 100).toFixed(0) + "%)" : "" ))
        .style("left", x + "px")
        .style("top", y + "px");
}

function hide_tooltip(){
    div_tooltip.transition()
        .duration(200)
        .style("opacity", 1e-6);
}

function getTicksIntervalByRectangleWidth(r) {
    if(r >= 20) {
        return 1;
    } else if (r >= 10) {
        return 2;
    } else if (r >= 3) {
        return 5;
    } else if (r >= 1) {
        return 10;
    } else {
        return 20;
    }
}

function draw_chart(chart_id, data, w, h, data_x_annotate, chart_name) {
    var w = w || $(window).width() * 0.95;
    //w = (w < chart_width_min) ? chart_width_min : w;
    var h = h || $(window).height() * 0.8;
    //h = (h < chart_height_min) ? chart_height_min : h;
    var width = w - chart_margin.left - chart_margin.right,
        height = h - chart_margin.top - chart_margin.bottom;

    var hv = h * 0.1;

    var rectangleWidth = 1, rectangleMargin = 1;
    var l = data.length + 1;
    if(l * (rectangleWidth * 2 + rectangleMargin) < width) {
        rectangleWidth = parseInt((parseInt(width / l) - rectangleMargin) / 2);
    }

    if(rectangleWidth < 1) {
        rectangleWidth = 1;
        rectangleMargin = 1;
        width = l * (rectangleWidth * 2 + rectangleMargin);
    }

    var xScale = d3.scaleLinear()
        .domain([-1, data.length])
        .range([0, width]);

    var yScale = d3.scaleLinear()
        .domain([d3.min(data, function(d) { return d.l; }),
            d3.max(data, function(d) { return d.h; })])
        .range([height - hv, 0]);

    var yBarScale = d3.scaleLinear()
        .domain([0, d3.max(data, function (d){ return d.v; })]).nice()
        .range([height, height - hv]);

    var xAxisTicksInterval = getTicksIntervalByRectangleWidth(rectangleWidth);

    var xAxis = d3.axisBottom(xScale)
        .ticks(data.length / xAxisTicksInterval)
        .tickFormat(function(d) { return (d in data ? date_format_1(data[d].d) : ""); });

    var yAxis = d3.axisLeft(yScale);

    var yBarAxis = d3.axisRight(yBarScale)
        .ticks(4);

    // Create series and bind x and y scales
    var series = chart()
                .xScale(xScale)
                .yScale(yScale)
                .yBarScale(yBarScale)
                .rectangleWidth(rectangleWidth);;

    // Create svg element
    var svg = d3.select(chart_id).append('svg').classed('chart', true)
        .attr('width', width + chart_margin.left + chart_margin.right)
        .attr('height', height + chart_margin.top + chart_margin.bottom);

    // Create chart
    var g = svg.append('g')
        .attr('transform', 'translate(' + chart_margin.left + ',' + chart_margin.top + ')');

    // Create plot area
    var plotAreaId = 'plotAreaClip' + chart_id;
    var plotArea = g.append('g');
    plotArea.append('clipPath')
        .attr('id', plotAreaId)
        .append('rect')
        .attr('width', width)
        .attr('height', height);
    plotArea.attr('clip-path', 'url(#' + plotAreaId + ')');

    // Watermark
    var watermark = 'jslivane';
    plotArea.append('text')
        .classed('watermark', true)
        .attr('transform', 'translate(' + (width / 2 - 40) + ',' + (height / 2 - 10) + ')')
        .text(watermark);


    // Draw axes
    g.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis);

    g.append('g')
        .attr('class', 'y axis')
        .call(yAxis);

    g.append('g')
        .attr('class', 'y bar axis')
        .attr('transform', 'translate(' + width + ',0)')
        .call(yBarAxis);

    if(data_x_annotate) { // x축에 표시할 데이터
        var xAxisAnnotate = x_annotate().axis(xAxis).translate([0, height]);
        g.append('g')
            .attr('class', 'x axis annotate')
            .attr('transform', 'translate(0,' + height + ')')
            .datum(data_x_annotate)
            .call(xAxisAnnotate);
    }

    var xYearAxisAnnotate = x_year_annotate().axis(xAxis).translate([0, height]);
    g.append('g')
        .attr('class', 'x axis annotate')
        .attr('transform', 'translate(0,' + height + ')')
        .datum(data)
        .call(xYearAxisAnnotate);

    // Draw gridlines
    var gl = gridLines()
        .xScale(xScale)
        .yScale(yScale)
        .yBarScale(yBarScale)
        .xTicks(xAxis.ticks()[0])   // linear scale axis
        .yTicks(yAxis.ticks());     // log scale axis

    plotArea.call(gl);

    // Chart Description
    var chart_desc = (chart_name || '');
    plotArea.append('text')
        .classed('description', true)
        .attr('transform', 'translate(10,20)')
//        .attr('transform', 'translate(' + (width * 3 / 4) + ',20)')
        .text(chart_desc);

    // Draw the series.
    plotArea.append('g')
        .attr('class', 'series')
        .datum(data)
        .call(series);
}

function draw_chart_log(chart_id, data, w, h, data_x_annotate, chart_name, chart_desc, rotate) {
    var w = w || $(window).width() * 0.95;
    //w = (w < chart_width_min) ? chart_width_min : w;
    var h = h || $(window).height() * 0.8;
    //h = (h < chart_height_min) ? chart_height_min : h;
    var width = w - chart_margin.left - chart_margin.right,
        height = h - chart_margin.top - chart_margin.bottom;

    var hv = h * 0.1;

    var rectangleWidth = 1, rectangleMargin = 1;
    var l = data.length + 1;
    if(l * (rectangleWidth * 2 + rectangleMargin) < width) {
        rectangleWidth = parseInt((parseInt(width / l) - rectangleMargin) / 2);
    }

    if(rectangleWidth < 1) {
        rectangleWidth = 1;
        rectangleMargin = 1;
        width = l * (rectangleWidth * 2 + rectangleMargin);
    }

    var nice_log_range = get_nice_log_range(data),
        log_range = d3.range(nice_log_range.start, nice_log_range.stop, nice_log_range.step);

    //console.info(nice_log_range);

    var xScale = d3.scaleLinear()
        .domain([-1, data.length])
        .range([0, width]);

    var yScale = d3.scaleLog().base(10)
        .domain([0.8, 10])
        .range([height - hv, 0]);

    var yBarScale = d3.scaleLinear()
        .domain([0, d3.max(data, function (d) { return d.v; }) ]).nice()
        .range([height, height - hv]);

    var yTransform = y_transform()
        .start(nice_log_range.start)
        .step(nice_log_range.step);

    var xAxisTicksInterval = getTicksIntervalByRectangleWidth(rectangleWidth);

    var xAxis = d3.axisBottom(xScale)
        .ticks(data.length / xAxisTicksInterval)
        .tickFormat(function(d) { return (d in data ? date_format_1(data[d].d) : ""); });

    var yAxis = d3.axisLeft(yScale)
        .tickValues(d3.range(1, log_range.length, 1))
        .tickFormat(function(d) { return log_range[d].format_currency(); });

    var yBarAxis = d3.axisRight(yBarScale)
        .ticks(4);

    // Create series and bind x and y scales
    var series = chart()
                .xScale(xScale)
                .yScale(yScale)
                .yBarScale(yBarScale)
                .yTransform(yTransform)
                .rectangleWidth(rectangleWidth);

    // Create svg element
    var svg = d3.select(chart_id).append('svg')
        .classed('chart', true);

    if(rotate != undefined){
//        svg.attr('width', height + chart_margin.left + chart_margin.right)
        svg.attr('width', height + chart_margin.right)
            .attr('height', width + chart_margin.top + chart_margin.bottom);

    } else {
        svg.attr('width', width + chart_margin.left + chart_margin.right)
            .attr('height', height + chart_margin.top + chart_margin.bottom);

    }

    // Create chart
    var g = svg.append('g');

    if(rotate != undefined){
//        g.attr('transform', 'translate(' + chart_margin.left + ',' + chart_margin.top + ') rotate(' + rotate + ') translate(-' + (width) + ',0)');
        g.attr('transform', 'translate(' + chart_margin.left + ',' + chart_margin.top + ') rotate(' + rotate + ') translate(0,-' + (height -  chart_margin.left * 0.4) + ')');
    } else {
        g.attr('transform', 'translate(' + chart_margin.left + ',' + chart_margin.top + ')');
    }

    // Create plot area
    var plotAreaId = 'plotAreaClip' + chart_id;
    var plotArea = g.append('g');
    plotArea.append('clipPath')
        .attr('id', plotAreaId)
        .append('rect')
        .attr('width', width)
        .attr('height', height);
    plotArea.attr('clip-path', 'url(#' + plotAreaId + ')');


    // Watermark
    var watermark = 'jslivane';
    plotArea.append('text')
        .classed('watermark', true)
        .attr('transform', 'translate(' + (width / 2 - 40) + ',' + (height / 2 - 10) + ')')
        .text(watermark);


    // Draw axes
    g.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis);

    g.append('g')
        .attr('class', 'y axis')    //.attr('transform', 'translate(' + width + ',0)')
        .call(yAxis);

    g.append('g')
        .attr('class', 'y bar axis')
        .attr('transform', 'translate(' + width + ',0)')
        .call(yBarAxis);

    if(data_x_annotate) { // x축에 표시할 데이터
        var xAxisAnnotate = x_annotate().axis(xAxis).translate([0, height]);
        g.append('g')
            .attr('class', 'x axis annotate')
            .attr('transform', 'translate(0,' + height + ')')
            .datum(data_x_annotate)
            .call(xAxisAnnotate);
    }

    var xYearAxisAnnotate = x_year_annotate().axis(xAxis).translate([0, height]);
    g.append('g')
        .attr('class', 'x axis annotate')
        .attr('transform', 'translate(0,' + height + ')')
        .datum(data)
        .call(xYearAxisAnnotate);


    // Draw gridlines
    var gl = gridLines()
        .xScale(xScale)
        .yScale(yScale)
        .yBarScale(yBarScale)
        .xTicks(xAxis.ticks()[0])       // linear scale axis
        .yTicks(yAxis.ticks());         // log scale axis

    plotArea.call(gl);

    // Chart Description
    var chart_desc = (chart_name || '');
    plotArea.append('text')
        .classed('description', true)
        .attr('transform', 'translate(10,20)')
//        .attr('transform', 'translate(' + (width * 3 / 4) + ',20)')
        .text(chart_desc);

    // Draw the series.
    plotArea.append('g')
        .attr('class', 'series')
        .datum(data)
        .call(series);

}

function highLowLines(bars, xScale, yScale, yTransform) {
    var line = d3.line()
                .x(function (d) { return d.x; })
                .y(function (d) { return d.y; });

    var paths = bars
        .selectAll('.high-low-line')
        .data(function (d) { return [d]; })
        .enter().append('path');

    paths.classed('high-low-line', true)
    .attr('d', function (d) {
        return line([
            { x: xScale(d.no), y: yScale(yTransform(d.h)) },
            { x: xScale(d.no), y: yScale(yTransform(d.l)) }
        ]);
    });

    paths.exit().remove();
}


function candleRects(bars, xScale, yScale, yTransform, rectangleWidth) {
    var rect = bars.selectAll('rect').data(function (d) {
        return [d];
    }).enter().append('rect');

    rect.attr('x', function (d) {
        return xScale(d.no) - rectangleWidth;
    })
        .attr('y', function (d) {
            return d.c > d.o ? yScale(yTransform(d.c)) : yScale(yTransform(d.o));
        })
        .attr('width', rectangleWidth * 2)
        .attr('height', function (d) {
            if (d.c == d.o) {
                return 0.5;

            } else {
                return d.c > d.o ?
                    yScale(yTransform(d.o)) - yScale(yTransform(d.c)) :
                    yScale(yTransform(d.c)) - yScale(yTransform(d.o));
            }
        });

    rect.exit().remove();

};

function volumeRects(bars, xScale, yBarScale, rectangleWidth) {
    var rect = bars.selectAll('.volume').data(function (d) {
        return [d];
    }).enter().append('rect');

    rect.classed('volume', true)
        .attr('x', function (d) {
            return xScale(d.no) - rectangleWidth;
        })
        .attr('y', function (d) {
            return yBarScale(d.v);
        })
        .attr('width', rectangleWidth * 2)
        .attr('height', function (d) {
            return yBarScale(d.v);
        });
};

function gridLines() {
   var xScale = d3.scaleLinear(),
       yScale = d3.scaleLinear(),
       yBarScale = d3.scaleLinear(),
       xTicks = 10, xTickStep = undefined,
       yTicks = 10, yTickStep = undefined,
       yBarTicks = 10, yBarTickStep = undefined;

   var xLines = function (data, grid) {
       var xlines = grid.selectAll('.x')
           .data(data)
           .enter()
           .append('line')
           .classed('x', true)
           .attr('x1', function(d) { return xScale(d); })
           .attr('x2', function(d) { return xScale(d); })
           .attr('y1', (yScale.range()[0] + yBarScale.range()[0] - yBarScale.range()[1]))
           .attr('y2', yScale.range()[1]);
       xlines.exit().remove();
    };

   var yLines = function (data, grid) {
       var yLines = grid.selectAll('.y')
           .data(data)
           .enter()
           .append('line')
           .classed('y', true)
           .attr('x1', xScale.range()[0])
           .attr('x2', xScale.range()[1])
           .attr('y1', function(d) { return yScale(d); })
           .attr('y2', function(d) { return yScale(d); });
       yLines.exit().remove();
   };

   var gridlines = function (selection) {
       var grid, xTickData, yTickData;

       selection.each(function () {
           xTickData = xTickStep ? xScale.ticks(xTicks, xTickStep) : xScale.ticks(xTicks);
           yTickData = yTickStep ? yScale.ticks(yTicks, yTickStep) : yScale.ticks(yTicks);

           var filteredYTickData = $(yTickData).filter(function(i, v){ return v >= 1});

           grid = d3.select(this).selectAll('.gridlines')
               .data([[xTickData, filteredYTickData]])
               .enter()
               .append('g')
               .classed('gridlines', true);

           xLines(xTickData, grid);
           yLines(filteredYTickData, grid);

           grid.exit().remove();
       });
   };

   gridlines.xScale = function (value) {
        if (!arguments.length) {
            return xScale;
        }
        xScale = value;
        return gridlines;
   };

   gridlines.yScale = function (value) {
        if (!arguments.length) {
            return yScale;
        }
        yScale = value;
        return gridlines;
   };

   gridlines.yBarScale = function (value) {
        if (!arguments.length) {
            return yBarScale;
        }
        yBarScale = value;
        return gridlines;
   };

   gridlines.xTicks = function (value, step) {
        if (!arguments.length) {
            return xTicks;
        }
        xTicks = value;
        xTickStep = step;
        return gridlines;
   };

   gridlines.yTicks = function (value, step) {
        if (!arguments.length) {
            return yTicks;
        }
        yTicks = value;
        yTickStep = step;
        return gridlines;
   };

   return gridlines;
}

function get_nice_log_range(data) {
//    var log_stop = d3.max(data, function (d) { return d.h; });
    var log_stop = d3.max(data, function (d) { return d.h; });
    var log_start = d3.min(data, function (d) { return d.l; });

    // https://github.com/mbostock/d3/blob/master/src/scale/linear.js
//    var log_span = log_stop - log_start;
//    var log_step = Math.pow(10, Math.floor(Math.log(log_span / 10) / Math.LN10))
//
//    var log_err = 10 / log_span * log_step;
//    if (log_err <= .15) log_step *= 10;
//    else if (log_err <= .35) log_step *= 5;
//    else if (log_err <= .75) log_step *= 2;
//
//    log_start = Math.ceil(log_start / log_step) * log_step;
//    log_stop = Math.floor(log_stop / log_step) * log_step + log_step * .5;

    var log_step = (log_stop - log_start) / 9;
    var log_step_digit = Math.round(Math.log10(log_step));

    log_step = Math.ceil(log_step / Math.pow(10, log_step_digit)) * Math.pow(10, log_step_digit);
    log_stop = Math.ceil(log_stop / log_step) * log_step + log_step;
    log_start = Math.round(log_start / log_step) * log_step - log_step;

    return {start: log_start, step: log_step, stop: log_stop};

}

function y_transform() {
    // 선형 또는 로그 스케일에 따른 사전변환
   var start = 0;  // linear(0) / log(log_start)
   var step = 1;   // linear(1) / log(log_step)

   var transform = function(v) {
       return (v - start) / step;
   };

   transform.xScale = function (value) {
        if (!arguments.length) {
            return xScale;
        }
        xScale = value;
        return transform;
   };

   transform.start = function (value) {
        if (!arguments.length) return start;
        start = value;
        return transform;
   };

   transform.step = function (value) {
        if (!arguments.length) return step;
        step = value;
        return transform;
   };

   return transform;
}

function x_annotate() {
    // x축에 표시
    // https://github.com/andredumas/techan.js/blob/master/src/plot/axisannotation.js
    var axis = d3.axisBottom(),
        translate = [0, 0];

    var annotation = function(selection) {
        var scale = axis.scale(), texts, paths, point = 4, height = 14, width = 70, y = 45;
        selection.each(function (data) {
            paths = d3.select(this).selectAll('path.annotate')
                .data(data)
                .enter().append('path').classed('annotate', true);

            paths.attr('d', function(d) {
                var w = 0, pt = point;
                if(width/2 < point) pt = width/2;
                else w = width/2 - point
                return ['M', scale(d.no), 0,
                      'l', -pt, y - height + point,
                      'l', -w, 0,
                      'l', 0, height,
                      'l', width, 0,
                      'l', 0, -height,
                      'l', -w, 0
                    ].join(' '); });

            paths.exit().remove();

            texts = d3.select(this).selectAll('text.annotate')
                .data(data)
                .enter().append('text').classed('annotate', true);

            texts
                .attr('x', function(d) { return scale(d.no); })
                .attr('y', function(d) { return y; })
                .text(function(d){ return date_format_2(d.d); });

            texts.exit().remove();

        });

    }

    annotation.axis = function(value) {
        if(!arguments.length) return axis;
        axis = value;
        return annotation;
    };

    annotation.translate = function(value) {
        if(!arguments.length) return translate;
        translate = value;
        return annotation;
    };

    return annotation;
}


function x_year_annotate() {
    // x축에 표시
    // https://github.com/andredumas/techan.js/blob/master/src/plot/axisannotation.js
    var axis = d3.axisBottom(),
        translate = [0, 0];

    var annotation = function(selection) {
        var scale = axis.scale(), texts, year = undefined, y = 30;
        selection.each(function (data) {
            var filtered_data = [];

            $(data).each(function(i, d){
                var _y = date_format_year(d.d);
                if(year != _y) {
                    filtered_data.push(d);
                    year = _y;
                }
            });

            texts = d3.select(this).selectAll('text.year.annotate')
                .data(filtered_data)
                .enter().append('text').classed('year annotate', true);

            texts
                .attr('x', function(d, i) { return scale(d.no) + i * 30; }) // 연도가 겹쳐 표시되지 않도록 (i * 30만큼 띄움)
                .attr('y', function(d) { return y; })
                .text(function(d){ return date_format_year(d.d); });

            texts.exit().remove();

        });

    }

    annotation.axis = function(value) {
        if(!arguments.length) return axis;
        axis = value;
        return annotation;
    };

    annotation.translate = function(value) {
        if(!arguments.length) return translate;
        translate = value;
        return annotation;
    };

    return annotation;
}


function save_chart_as_png(chart_id, filename) {
    save_chart_as_img(chart_id, filename, 'image/png', 1.0);
}

function save_chart_as_jpg(chart_id, filename) {
    save_chart_as_img(chart_id, filename, 'image/jpeg', 1.0);
}

function save_chart_as_img(chart_id, filename, imgType, imgEncoderOptions) {
    if($(chart_id + "_svg").length == 0) {
        $("body").append("<div id='" + chart_id + "_svg' style='display:none;'></div>")

    }

    imgType = imgType || 'image/png';
    imgEncoderOptions = imgEncoderOptions || 1.0;


    var svg = d3.select(chart_id).select("svg")[0][0]; // FIXME
    var rec = svg.getBoundingClientRect();

    var styles = getStyles(document);
    var html = getSources(svg, styles)

    // https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/btoa
    var imgsrc = 'data:image/svg+xml;base64,'+ btoa(unescape(encodeURIComponent(html)));
    var img = '<img src="' + imgsrc + '">';
    $(chart_id + "_svg").html(img);

    if($(chart_id + "_canvas").length == 0) {
        $("body").append("<canvas id='" + chart_id + "_canvas' width='" + rec.width + "' height='" + rec.height + "' style='display:none;'></canvas>")

    }

    var canvas = document.querySelector(chart_id + "_canvas"),
        context = canvas.getContext("2d");

    if($(chart_id + "_png").length == 0) {
        $("body").append("<div id='" + chart_id + "_png' style='display:none;'></div>")

    }

    var image = new Image;
    image.src = imgsrc;
    image.onload = function() {
      context.drawImage(image, 0, 0);

      var canvasdata = canvas.toDataURL(imgType, imgEncoderOptions);

      var pngimg = '<img src="' + canvasdata + '">';
      d3.select(chart_id + "_png").html(pngimg);

      var a = document.createElement("a");
      a.download = filename;
      a.href = canvasdata;
      a.click();
    };
}

function save_chart_as_svg(chart_id, filename) {
    var svg = d3.select(chart_id).select("svg")[0][0]; // FIXME
    var styles = getStyles(document);
    var html = getSources(svg, styles)

    var svgdata = "data:image/svg+xml," + html;

    var a = document.createElement("a");
    a.download = filename;
    a.href = svgdata;
    a.click();
}

function getStyles(doc) {
    var styles = "",
        styleSheets = doc.styleSheets; // https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleSheet

    if (styleSheets) {
        for (var i = 0; i < styleSheets.length; i++) {
            processStyleSheet(styleSheets[i]);
        }
    }

    function processStyleSheet(ss) {
        if (ss.cssRules) { // https://developer.mozilla.org/en-US/docs/Web/API/CSSRule
            for (var i = 0; i < ss.cssRules.length; i++) {
                var rule = ss.cssRules[i];
                if (rule.type === 3) { // CSSRule.IMPORT_RULE
                    // Import Rule
                    processStyleSheet(rule.styleSheet);
                } else {
                    // hack for illustrator crashing on descendent selectors
                    if (rule.selectorText) { // https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleRule
                        if (rule.selectorText.indexOf(">") === -1) {
                            styles += "\n" + rule.cssText;
                        }
                    }
                }
            }
        }
    }

    // webfont : @import url(http://fonts.googleapis.com/earlyaccess/nanumgothic.css
    // styles = "@font-face { font-family: 'Nanum Gothic'; src: url(http://fonts.gstatic.com/ea/nanumgothic/v5/NanumGothic-Regular.woff) format('woff');}\n" + styles;
    styles = "@font-face { font-family: 'Nanum Gothic'; src: local('Nanum Gothic'), local('Apple SD Gothic Neo'), local('Malgun Gothic');}\n" + styles;

    return styles;
}

function getSources(svg, styles) {
    var prefix = {
        xmlns: "http://www.w3.org/2000/xmlns/",
        xlink: "http://www.w3.org/1999/xlink",
        svg: "http://www.w3.org/2000/svg"
    }

    styles = (styles === undefined) ? "" : styles;

    svg.setAttribute("version", "1.1");

    var defsEl = document.createElement("defs");
    svg.insertBefore(defsEl, svg.firstChild);

    var styleEl = document.createElement("style")
    defsEl.appendChild(styleEl);
    styleEl.setAttribute("type", "text/css");

    // removing attributes so they aren't doubled up
    svg.removeAttribute("xmlns");
    svg.removeAttribute("xlink");

    // These are needed for the svg
    if (!svg.hasAttributeNS(prefix.xmlns, "xmlns")) {
        svg.setAttributeNS(prefix.xmlns, "xmlns", prefix.svg);
    }

    if (!svg.hasAttributeNS(prefix.xmlns, "xmlns:xlink")) {
        svg.setAttributeNS(prefix.xmlns, "xmlns:xlink", prefix.xlink);
    }

    return (new XMLSerializer()).serializeToString(svg).replace('</style>', '<![CDATA[' + styles + ']]></style>');

}

function parse_date_1(d) {
    return new Date(Number(d.substring(0,4)), Number(d.substring(4,6)) - 1, Number(d.substring(6,8)))
}


function parse_datetime_1(d, t) {
    return new Date(Number(d.substring(0,4)), Number(d.substring(4,6)) - 1, Number(d.substring(6,8)), Number(t.substring(0,2)), Number(t.substring(2,4)), Number(t.substring(4,6)))
}

// http://stackoverflow.com/questions/149055/how-can-i-format-numbers-as-money-in-javascript
function format_currency(v) {
    if(!v) return '';
    var re = '\\d(?=(\\d{3})+$)';
    return v.toFixed(0).replace(new RegExp(re, 'g'), '$&,');
}

// http://stackoverflow.com/questions/149055/how-can-i-format-numbers-as-money-in-javascript
Number.prototype.format_currency = function(n, x) {
    var re = '\\d(?=(\\d{' + (x || 3) + '})+' + (n > 0 ? '\\.' : '$') + ')';
    return this.toFixed(Math.max(0, ~~n)).replace(new RegExp(re, 'g'), '$&,');
};

$(document).ready(function() {
    div_tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);


});