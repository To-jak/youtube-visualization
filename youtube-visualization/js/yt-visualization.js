/* IGR204 Data vizualisation project
*
* -----------------------------------
* by:
*   Jean-Jules BIGEARD
*   Julien GUEGUAN
*   Thomas JACQUEMIN
*   Tina REY
*   Brice TAYART
*/

// Loading Data /////////////////////////////////////////////////
/************************************************************
* LOADING DATA
*
* Data is laoded here from a csv (preprocessing from original file done
* offline in Python)
* 
* Upon completion and loading:
* - data is stored in global variable 'dataset' for further access
* - initialization functions are called once
* - drawing functions are called to update the viz
************************************************************/

var parseDate = d3.timeParse("%Y-%m-%d");
var parseTime = d3.timeParse("%H:%M:%S")

let dataset = [];
function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}
d3.csv('data/clean_data.csv')
    .row((d, i) => {
        function parseTags(tags) {
            // remove leading "[' trailing']" and split
            out = []
            if (tags) out = tags.slice(2, -2).split("', '").filter(onlyUnique);
            return out
        }
        return {
            category: d.category ? d.category : "", // map undefined to ""
            category_id: +d.category_id,
            channel_title: d.channel_title,
            comment_count: +d.comment_count,
            description: d.description,
            dislikes: +d.dislikes,
            likes: +d.likes,
            publish_date: parseDate(d.publish_date),
            publish_time: parseTime(d.publish_time),
            tags: parseTags(d.tags),
            thumbnail_link: d.thumbnail_link,
            title: d.title,
            trending_date: parseDate(d.trending_date),
            views: +d.views,
            trend_duration: +d.trend_duration,
            publish_to_trend: +d.publish_to_trend,
            publish_to_trend_last: +d.publish_to_trend_last

        }
    })
    .get((error, rows) => {
        console.log(error)
        console.log("loaded " + rows.length + " rows");
        if (rows.length > 0) {
            console.log('First row:', rows[0])
            console.log('Last row:', rows[rows.length - 1])
        }

        dataset = rows;
  
        
        init_all();
        redraw_all();
        
        
    });

function init_all(){
    init_timeline_range();
    init_trend_heatmap();
    init_leaderboard();
    init_time_graph();
    get_tags();
    init_layout_cloud();
}

function redraw_all(){
    draw_cat_analysis();
    draw_trend_heatmap();
    draw_leaderboard();
    draw_time_graph();
    draw_word_cloud();
}

// Category Time Graph /////////////////////////////////////////////////


let timeGraph = {
    svg_height: document.getElementById("CategoryTimeGraph").clientHeight,
    svg_width: document.getElementById("CategoryTimeGraph").clientWidth,
    margin: { top: 10, right: 30, bottom: 30, left: 60 },
}

// Define the div element for the tooltip
var time_tooltip = d3.select("body").append("div")
    .attr("class", "cat-tooltip")
    .style("opacity", 0);

// set the dimensions and margins of the graph

timeGraph['width'] = timeGraph.svg_width - timeGraph.margin.left - timeGraph.margin.right,
timeGraph['height'] = timeGraph.svg_height - timeGraph.margin.top - timeGraph.margin.bottom;

// append the svg object to the #CategroryTimeGraph div of the page
var timeGraph_svg = d3.select("#CategoryTimeGraph")
    .append("svg")
    .attr("width", timeGraph.width + timeGraph.margin.left + timeGraph.margin.right)
    .attr("height", timeGraph.height + timeGraph.margin.top + timeGraph.margin.bottom)
    .append("g")
    .attr("transform",
        "translate(" + timeGraph.margin.left + "," + timeGraph.margin.top + ")");


// getting first and last date from the data
var firstDate = d3.min(dataset.filter(filter_by_time), function (d) { return d.trending_date }) //new Date(2017, 7, 1) 
var lastDate = d3.max(dataset.filter(filter_by_time), function (d) { return d.trending_date })

console.log("first date:" + firstDate)
console.log("last date:" + lastDate)

// Add X axis --> it is a date format
var x = d3.scaleTime()
    .domain([firstDate, lastDate])
    .range([0, timeGraph.width]).nice();

// Add X axis
timeGraph_svg.append("g")
    .classed("x-timegraph", true)
    .attr("transform", "translate(0," + timeGraph.height + ")")
    .call(d3.axisBottom(x));

// Add Y axis
var y = d3.scaleLinear()
    .domain([0, 1000])
    .range([timeGraph.height, 0]).nice();

timeGraph_svg.append("g")
    .classed("y-timegraph", true)
    .call(d3.axisLeft(y));

timeGraph_svg.append("text")
    .style("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("x", -timeGraph.height / 2)
    .attr("y", "-15%")
    .style("font-size", "13px")
    .style("font-family", "Arial, Helvetica, sans-serif")
    .text("number of videos")

function calcDate(date1,date2) {
    var diff = Math.floor(date1.getTime() - date2.getTime());
    var day = 1000 * 60 * 60 * 24;

    var days = Math.floor(diff/day);
    var months = Math.floor(days/31);
    var years = Math.floor(months/12);

    return {days: days, months: months, years: years}
    }

category_color = d3.scaleOrdinal([`#c52ead`, `#6a45b1`, `#e33e58`, `#ff5733`, `#59b92d`,
                                  `#07d5e9`, `#de9533`, `#1c4394`, '#9c5607', '#DE1704',
                                  '#066135', '#330029', '#B8860B', '#83243a', '#152763',
                                  '7c3c21'])
function init_time_graph() {
    unique_categories.forEach(d => category_color(d))
}

function draw_time_graph() {

    // getting first and last date from the data
    filtered_dataset = dataset.filter(filter_by_time).filter(filter_by_category)
    var firstDate = d3.min(filtered_dataset, function (d) { return d.trending_date }) //new Date(2017, 7, 1) 
    var lastDate = d3.max(filtered_dataset, function (d) { return d.trending_date })

    // Add X axis --> it is a date format
    var x = d3.scaleTime()
        .domain([firstDate, lastDate])
        .range([0, timeGraph.width]).nice();

    diff_date = calcDate(lastDate, firstDate)

    time_range = d3.timeMonth

    if(diff_date['months'] < 5) {time_range = d3.timeWeek}
    if(diff_date['months'] < 2) {time_range = d3.timeDay}

    // histogram to bin the values along time
    var histogram = d3.histogram()
        .value(function (d) { return d.trending_date; })
        .domain(x.domain())
        .thresholds(x.ticks(time_range));

    // Grouping by categories
    var cat_data = d3.nest()
        .key(function (d) { return d.category; })
        .entries(filtered_dataset)

    // Applying histogram to each category
    hist_dict = {}
    max_count_along_categories = 0
    cat_data.forEach(element => {
        bins = histogram(element.values)
        line = bins.map(element => ({ date: element.x0, nb_videos: element.length }))
        max_count_category = d3.max(line, function (d) { return d.nb_videos })
        if (max_count_category > max_count_along_categories) {
            max_count_along_categories = max_count_category
        }
        hist_dict[element.key] = line
    });

    // Add X axis
    timeGraph_svg.select("g.x-timegraph")
    .transition()
    .call(d3.axisBottom(x));

    // Add Y axis
    var y = d3.scaleLinear()
        .domain([0, max_count_along_categories])
        .range([timeGraph.height, 0]).nice();

    timeGraph_svg.select("g.y-timegraph")
        .transition()
        .call(d3.axisLeft(y));

    time_graph_data = d3.entries(hist_dict)

    var timeLines = timeGraph_svg.selectAll(".timeline").data(time_graph_data, d => d.key)
    timeLines.exit().remove()

    // D3 line applied to the values
    var Line = d3.line().x(function (d) { return x(d.date) })
    .y(function (d) { return y(d.nb_videos) })

    // Add New Line
    timeLines.enter().append("g").attr("class", "timeline")
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 2.5)
    .append("path")
    .attr("fill", "none")
    .attr("stroke", function (d) {
        return category_color(d.key)
    })
    .attr("stroke-width", 2.5)
    .attr("d", function (d) {
        return Line(d.value)
    })
    .on("mouseover", function (d) {
        time_tooltip.transition()
            .duration(100)
            .style("opacity", .9);
        time_tooltip.html("<div class=\"tooltip-header\">" + d.key + "</div>")
            .style("left", (d3.event.pageX) + "px")
            .style("top", (d3.event.pageY - 28) + "px");
    })
    .on("mousemove", function (d) {
        time_tooltip.html("<div class=\"tooltip-header\">" + d.key + "</div>")
            .style("left", (d3.event.pageX) + "px")
            .style("top", (d3.event.pageY - 28) + "px");
    })
    .on("mouseout", function (d) {
        time_tooltip.transition()
            .duration(200)
            .style("opacity", 0);
    });

    // Update the line
    timeLines.select("path")
    .attr("d", function (d) {
        return Line(d.value)
    })
}

// Category Analysis /////////////////////////////////////////////////

// Define the div element for the tooltip
var cat_tooltip = d3.select("body").append("div")
    .attr("class", "cat-tooltip")
    .style("opacity", 0);

let catAnalysis = {
    height: document.getElementById("CategoryAnalysis").clientHeight,
    width: document.getElementById("CategoryAnalysis").clientWidth
}

let catAnalysisSVG = d3.select("#CategoryAnalysis")
    .append("svg")
    .attr("width", catAnalysis.width)
    .attr("height", catAnalysis.height)
    .append("g")
    .attr("transform", "translate(" + catAnalysis.width / 2 + "," + catAnalysis.height / 2 + ")")
var defs = catAnalysisSVG.append('defs');

let selected_categories = new Set();

// Scales
var radiusScale = d3.scaleSqrt().domain([1, 10000]).range([10, 120])
var textScale = d3.scaleSqrt().domain([1, 10000]).range([5, 30])
var likeRatioColor = d3.scaleSequential(d3.interpolateYlGn).domain([0, 30])

// LINEAR GRADIENT for legend
var linearGradient = defs.append("linearGradient")
    .attr("id", "linear-gradient")
    //Horizontal gradient
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "100%")
    .attr("y2", "0%");

//Set the color for the start (0%)
linearGradient.append("stop")
    .attr("offset", "0%")
    .attr("stop-color", likeRatioColor(0));

//Set the color for the end (100%)
linearGradient.append("stop")
    .attr("offset", "100%")
    .attr("stop-color", likeRatioColor(30));

catAnalysisSVG.append("rect")
.attr("x", -catAnalysis.width/3)
.attr("y", (-catAnalysis.height/2 + 5))
.attr("width", 100)
.attr("height", 10)
.style("fill", "url(#linear-gradient)");

catAnalysisSVG.append("text")
.attr("class", "legend")
.attr("x", -catAnalysis.width/3)
.attr("y", (-catAnalysis.height/2 + 30))
.style("font-size", "12px")
.style("font-family", "Arial, Helvetica, sans-serif")
.text("Likes Ratio");

catAnalysisSVG.append("text")
.attr("class", "legend")
.attr("x", -catAnalysis.width/3 - 12)
.attr("y", (-catAnalysis.height/2 + 15))
.style("font-size", "12px")
.style("font-family", "Arial, Helvetica, sans-serif")
.text("0");

catAnalysisSVG.append("text")
.attr("class", "legend")
.attr("x", -catAnalysis.width/3 + 102)
.attr("y", (-catAnalysis.height/2 + 15))
.style("font-size", "12px")
.style("font-family", "Arial, Helvetica, sans-serif")
.text("30+");

// Force simulation
var simulation = d3.forceSimulation()
    .force("x", d3.forceX().strength(0.005))
    .force("y", d3.forceY().strength(0.005))
    .force("collide", d3.forceCollide(function (d) {
        return radiusScale(d.value['nb_videos']) + 5
    }))
    .on('tick', ticked)

function ticked() {
    catAnalysisSVG.selectAll("g")
        .attr("transform", function (d) { return 'translate(' + d.x + ' ' + d.y + ')'; })
}



let cat_data

function draw_cat_analysis() {

    simulation.stop()

    cat_data = d3.nest()
        .key(function (d) { return d.category; })
        .rollup(function (leaves) {
            category_summary = {
                'nb_videos': leaves.length,
                'total_views': d3.sum(leaves, function (d) { return d.views }),
                'total_likes': d3.sum(leaves, function (d) { return d.likes }),
                'total_dislikes': d3.sum(leaves, function (d) { return d.dislikes })
            }

            category_summary['like_ratio'] = category_summary['total_likes'] / category_summary['total_dislikes']

            return category_summary
        })
        .entries(dataset.filter(filter_by_time));

    // Apply classic force after a potential resize
    simulation.nodes(cat_data)
    .force("collide", d3.forceCollide(function (d) {
        return radiusScale(d.value['nb_videos']) + 5
    }))

    var maxRatio = d3.max(cat_data, function (d) { return d.value['like_ratio']; });

    var data_bond = catAnalysisSVG.selectAll("g").data(cat_data, d => d.key)

    data_bond.exit().remove()

    data_bond.select("circle")
        .attr("fill", function (d) {
            return likeRatioColor(d.value['like_ratio'])
        })
        .attr("r", function (d) {
            return radiusScale(d.value['nb_videos'])
        })

    data_bond.select("text")
        .attr('font-size', function (d) {
            return textScale(d.value['nb_videos'])
        })

    var new_circles_g = data_bond.enter().append("g").attr("transform", "translate(0,0)")
        .classed("selected", function(d){
            return selected_categories.has(d.category)
        })
        .classed("not-selected", function(d){
            return selected_categories.size != 0 && !selected_categories.has(d.category)
        })
        .on("mouseover", function (d) {
            cat_tooltip.transition()
                .duration(100)
                .style("opacity", .9);
        })
        .on("mousemove", function (d) {
            cat_tooltip.html("<div class=\"tooltip-header\" style=\"color: " + category_color(d.key) + "\">" + d.key + "</div>"
                + "<div class=\"tooltip-content\">"
                + "Videos: <b>" + d.value['nb_videos'].toLocaleString() + "</b><br/>"
                + "Views: <b>" + d.value['total_views'].toLocaleString() + "</b><br/>"
                + "------------------</br>"
                + "<i class=\"fa fa-thumbs-up\" aria-hidden=\"true\"></i> <b>" + d.value['total_likes'].toLocaleString() + "</b><br/>"
                + "<i class=\"fa fa-thumbs-down\" aria-hidden=\"true\"></i> <b>" + d.value['total_dislikes'].toLocaleString() + "</b><br/>"
                + "Like ratio: <b>" + d.value['like_ratio'].toLocaleString() + "</b><br/></div>")
                .style("left", (d3.event.pageX) + 20 + "px")
                .style("top", (d3.event.pageY - 30) + "px");
        })
        .on("mouseout", function (d) {
            cat_tooltip.transition()
                .duration(200)
                .style("opacity", 0);
        })
        .on("click", function (d) {
            if (!d3.select(this).classed("selected")) {
                if (selected_categories.size == 0) {
                    catAnalysisSVG.selectAll("g").classed("not-selected", true)
                }
                selected_categories.add(d.key)
                d3.select(this).classed("not-selected", false)
                d3.select(this).classed("selected", true)
                d3.select(this.childNodes[0]).attr('fill-opacity', 1)
                console.log(selected_categories)
            } else {
                selected_categories.delete(d.key)
                d3.select(this).classed("not-selected", true)
                if (selected_categories.size == 0) {
                    catAnalysisSVG.selectAll("g").classed("not-selected", false)
                }
                d3.select(this).classed("selected", false);
                console.log(selected_categories)
            }

            draw_trend_heatmap();
            draw_time_graph();
            draw_leaderboard();
        });

    // Circles
    new_circles_g.append("circle")
        .attr("class", "category-circle")
        .attr("r", function (d) {
            return radiusScale(d.value['nb_videos'])
        })
        .attr("fill", function (d) {
            return likeRatioColor(d.value['like_ratio'])
        })

    new_circles_g.append("text")
        .attr("class", "category-circle-text")
        .attr('text-anchor', 'middle')
        .attr("x", 0)
        .attr("y", 0)
        .attr('font-size', function (d) {
            return textScale(d.value['nb_videos'])
        })
        .attr('font-style', 'bold')
        .attr('pointer-events', 'none')
        .text(function (d) {
            return d.key.split(' ')[0];
        });

    simulation.nodes(cat_data)
        .alpha(0.5).restart();
}

function resize_categories() {

    var current_max_size = d3.max(cat_data, d => d.value['nb_videos'])

    var temp_radiusScale = d3.scaleSqrt().domain([1, current_max_size]).range([10, 120])
    var temp_textScale = d3.scaleSqrt().domain([1, current_max_size]).range([5, 30])

    catAnalysisSVG.selectAll("circle")
        .transition()
        .attr("r", function (d) {
            return temp_radiusScale(d.value['nb_videos'])
        })

    catAnalysisSVG.selectAll(".category-circle-text")
    .transition()
        .attr('font-size', function (d) {
            return temp_textScale(d.value['nb_videos'])
        })

    simulation.nodes(cat_data)
    .force("collide", d3.forceCollide(function (d) {
        return temp_radiusScale(d.value['nb_videos']) + 5
    })).alpha(0.5).restart()
}

/************************************************************
* LEADERBOARD
************************************************************/

// global variable
var leaderboard={
    height : document.getElementById("Leaderboard").clientHeight,
    width : document.getElementById("Leaderboard").clientWidth,
    group_variable : "views",
    tooltip_string : "views",
    tbody : undefined
};

// Drop down callback
function dropdownLeaderboardCB() {
    leaderboard.group_variable = d3.select(this).property('value');
    leaderboard.tooltip_string =  leaderboard.group_variable //d3.select(this).property('text');
    if (leaderboard.tooltip_string == "comment_count"){
        leaderboard.tooltip_string  = "comments"
    }

    draw_leaderboard();
}
// Mouse callbacks for tooltip update
leaderboard.mouseover = function () { cat_tooltip.style("opacity", .9) }
leaderboard.mousemove = function (d) {
    console.log(leaderboard['tooltip_string'])
    cat_tooltip.html("<div class=\"tooltip-content\">" +"<b>" + d.value.value + "</b> <b>" + leaderboard.tooltip_string )
    .style("left", (d3.event.pageX) + 20 + "px")
    .style("top", (d3.event.pageY - 30) + "px"); 
}
leaderboard.mouseleave = function () { cat_tooltip.style("opacity", 0) }

function init_leaderboard(){
    console.log("==== LEADERBOARD INIT ====")
    console.log("size = " + leaderboard.height + " x " + leaderboard.width)

    // Add dropdown button menu
    var leaderboard_filter = [["by views", "views"],["by likes", "likes"], ["by comments","comment_count"], ["by dislikes","dislikes"]]
    var my_dropdown_menu = 
        d3.select("#selectButton")
            .on("change", dropdownLeaderboardCB)
            .attr('x', 200)
            .attr('y', 50)
            .attr("class","dropdown")
        .selectAll('myOptions')
        .data(leaderboard_filter)
        .enter()
        .append('option')
        .text(function (d) { return d[0]; }) // text showed in the menu
        .attr("value", function (d) { return d[1]; }) // corresponding value returned by the button

    var logo_trophee = d3.select('#Leaderboard')
    .append("div")
    .style("margin-top", "5px")
    .html("<i class=\"fa fa-trophy\" aria-hidden=\"true\"></i>")

     // create table
     var table = d3.select("#Leaderboard")
     .append("center")
     .append('table')
     .style("border-collapse", "collapse")
     .style("border", "2px black solid")
     .style("text-anchor", "middle")
     .attr("x", "5")
     .attr("y", "5")
     .attr("width", "200")
     .attr("height", "100")

    var thead = table.append('thead');
    var tbody = table.append('tbody');
    leaderboard.tbody = tbody;

    // headers
    var title = ["LEADERBOARD"]
    thead.append('tr')
        .selectAll('th')
        .data(title)
        .enter()
            .append('th')
                .text(function (d) { return d; })
                .style("border", "1px black solid")
                .style("padding", "5px")
                .style("background-color", "lightgray")
                .style("font-weight", "bold")
                .style("text-transform", "uppercase")
}

function draw_leaderboard() {

    console.log("==== LEADERBOARD ====")
    console.log('leaderboard.tooltip_string ='+leaderboard.tooltip_string)
    // group videos by channel
    let sort_attribute = leaderboard.group_variable;
    let filtered_dataset = dataset.filter(filter_by_time).filter(filter_by_category)

    var channel_map = d3.rollup(
        filtered_dataset,
        v => d3.sum(v, d=> d[sort_attribute]),
        d => d.channel_title);
    channel_grouped = Array.from(channel_map.keys(),
        function(k){return{key:k, value:channel_map.get(k)}})

    // sort channel by views 
    channel_grouped.sort(function(x, y){ return d3.descending(x.value, y.value)})
 
    var top_channel = []
    for (i=0;i<20 && i<channel_grouped.length;i++) { 
        top_channel[i] = channel_grouped[i]
    }
    console.log("top 10 channel by "+sort_attribute+" = ", top_channel)

    tbody = leaderboard.tbody;

    // update on table is hard to figure out... delete and use d3.selection.enter
    tbody.selectAll('tr').data([]).exit().remove();
    // data
    var rows = tbody.selectAll('tr')
        .data(top_channel)
        .enter()
        .append('tr');

    var columns = ["key"]
    var cells = rows.selectAll('td')
        .data(function (row) { return columns.map(function (column) { return { value: row } }) })
        .enter()
            .append('td')
                .text(function (d) { return d.value.key })
                .style("border", "1px black solid")
                .style("padding", "5px")
                .style("font-size", "12px")
                .style("text-anchor", "middle")  
            .on("mouseover", function () { 
                d3.select(this).style("background-color", "powderblue")
                leaderboard.mouseover() })
            .on("mouseout", function () { 
                d3.select(this).style("background-color", "white") })
            .on("mousemove", d => leaderboard.mousemove(d))
            .on("mouseleave", leaderboard.mouseleave());
    console.log("=================")
}

/************************************************************
* TREND HEATMAP CODE
* 
* This is the code for the heatmap on the top left of the screen
* The main functions:
* init_trend_heatmap() called once to initialize some values from dataset
* draw_trend_heatmap() called to update the drawing according to selection
* 
* The object 'trend' contains global variables that are linked to the thrend heatmap
************************************************************/

//temporary placeholders for dev
// function init_trend_heatmap() { } 
// function draw_trend_heatmap() { }

var trend = {
    panel_heigth: document.getElementById("TagTrends").clientHeight,
    svg_width: document.getElementById("TagTrends").clientWidth,
    margin: { top: 8, bottom: 18, left: 120, right: 8 },
    current_metric: "count"
};

var metrics = ["count",
    "total_views", "total_dislikes", "total_dislikes",
    "avg_views", "avg_likes", "avg_dislikes",
    "likes_per_view", "dislikes_per_view", "like_ratio"]


var select_trend = d3.select("#TagTrends")
    .append("select")
        .attr("class", "dropdown")
        .attr("id", "trend_dropdown");
trend.svg_height =  trend.panel_heigth - document.getElementById("trend_dropdown").offsetHeight,
trend.height = trend.svg_height - trend.margin.top - trend.margin.bottom;
trend.width = trend.svg_width - trend.margin.left - trend.margin.right;

var svg_trend = d3.select("#TagTrends")
    .append("svg").attr("width", trend.svg_width)
    .attr("height", trend.svg_height)
    .append("g")
    .attr("transform",
        "translate(" + trend.margin.left + "," + trend.margin.top + ")");
var unique_categories = [];
var max_duration = -1;

trend.xscale = d3.scaleBand();
trend.yscale = d3.scaleBand();

// Init function called once to initialize some values
function init_trend_heatmap() {
    // Set-up graphic elements
    select_trend
        .attr("class", "dropdown")
        .attr("id", "trend_dropdown")
        .on("change", dropdownChange)
        .selectAll("option")
        .data(metrics)
        .enter()
        .append("option")
        .attr("value", d => d)
        .text(d => d.replace(/_/g, " "));

    // largest trending duration (for scale)
    max_duration = d3.max(
        dataset,
        d => d.trend_duration
    );
    duration_range = [...Array(max_duration).keys()].map(i => i + 1)
    unique_categories = Array.from(new Set(
        Array.from(dataset, d => d.category)
    ));
    ii_categories = [...Array(unique_categories.length).keys()]


    // Build X scales and axis:
    trend.xscale
        .range([0, trend.width])
        .domain(duration_range)
        .padding(0.05);
    svg_trend.append("g")
        .attr("transform", "translate(0," + trend.height + ")")
        .call(d3.axisBottom(trend.xscale));

    // Build Y scales and axis:
    trend.yscale
        .range([trend.height, 0])
        .domain(unique_categories)
        .padding(0.05);
    svg_trend.append("g")
        .call(d3.axisLeft(trend.yscale));

}

// Drop down callback
function dropdownChange() {
    trend.current_metric = d3.select(this).property('value');
    console.log("current metric is now " + trend.current_metric)
    draw_trend_heatmap();
}

// Mouse callbacks for tootip update
trend.mouseover = function (d) {
    cat_tooltip.style("opacity", .9)
}
trend.mousemove = function (d) {
    let mouse = d3.mouse(d3.event.currentTarget);
    cat_tooltip
        .html(
            "<div class=\"tooltip-header\">" + d.category + "</div>" +
            "<div class=\"tooltip-content\">" +
            "<b>" + d.count + "</b> videos have been trending for <b>" + d.trend_duration + "</b> days<br>" +
            "Total views : <b>" + d.total_views + "</b><br>" +
            "Total likes : <b>" + d.total_likes + "</b><br>" +
            "Total dislikes : <b>" + d.total_dislikes + "</b><br>" +
            "Avg views per video : <b>" + d.avg_views.toFixed(0) + "</b><br>" +
            "Avg likes per video : <b>" + d.avg_likes.toFixed(0) + "</b><br>" +
            "Avg dislikes per video : <b>" + d.avg_dislikes.toFixed(0) + "</b><br>" +
            "Avg likes per view : <b>" + d.likes_per_view.toFixed(3) + "</b><br>" +
            "Avg dislikes per view : <b>" + d.dislikes_per_view.toFixed(3) + "</b><br>" +
            "Ratio of likes among reactions : <b>" + d.like_ratio.toFixed(3) + "</b>")
        .style("left", (d3.event.pageX) + "px")
        .style("top", (d3.event.pageY + 70) + "px")
}
trend.mouseleave = function (d) {
    cat_tooltip.style("opacity", 0)
}

// Main update function
function draw_trend_heatmap() {
    /*
    Here, the data is first processed to give an array that gives a list of statistics
    for each category and each trend duration. The output is an array with attributes
    category and trend_duration used as keys to map on a 2D grid and with a list of
    metrics computed on all videaos that share the two key attributes
    */

    // Reduction on the dataset
    // Define some functions to compute metrics of interest
    function countFcn(v) { return v.length };
    function cumulViews(v) { return d3.sum(v, d => d.views) };
    function cumulLikes(v) { return d3.sum(v, d => d.likes) };
    function cumulDislikes(v) { return d3.sum(v, d => d.dislikes) };
    function avgViews(v) { return d3.mean(v, d => d.views) };
    function avgLikes(v) { return d3.mean(v, d => d.likes) };
    function avgDislikes(v) { return d3.mean(v, d => d.dislikes) };
    function allStats(v) {
        stats = {
            count: countFcn(v),
            total_views: cumulViews(v),
            total_likes: cumulLikes(v),
            total_dislikes: cumulDislikes(v),
            avg_views: avgViews(v),
            avg_likes: avgLikes(v),
            avg_dislikes: avgDislikes(v)
        };
        return stats;
    }

    // Make a 2 level nested list with those metrics
    var trendMetrics = d3.rollup(
        dataset.filter(filter_by_time),
        allStats,
        d => d.category,
        d => d.trend_duration);

    // Make it a flat array
    // This may be ugly but hey, this is my second time with JavaScript...
    function custom_reduction(map, category_name) {
        arr = Array.from(
            map.keys(),
            k => { obj = { category: category_name, trend_duration: k, ...map.get(k) }; return obj }
        )
        return arr
    }
    let flat_metrics = Array.from(
        trendMetrics.keys(),
        k => custom_reduction(trendMetrics.get(k), k)
    );
    flat_metrics = [].concat.apply([], flat_metrics);

    flat_metrics = Array.from(flat_metrics,
        function (d) {
            out = {
                ...d,
                likes_per_view: d.total_likes / d.total_views,
                dislikes_per_view: d.total_dislikes / d.total_views,
                like_ratio: (d.total_likes + .5) / (d.total_likes + d.total_dislikes + 1)
            };
            return out;
        })

    // Preprocesing is over. Now, to the heatmap!

    // Currently selected metric (from the dropdown list)
    let metric = trend.current_metric;
    
    // Build color scale (range spans selected categories only)
    metric_extent = d3.extent(
        flat_metrics.filter(filter_by_category),
        d=>d[metric]);
    var trendColors =
        d3.scaleSequential(d3.interpolateYlGnBu)
            .domain([0 , metric_extent[1]]);
    
    // Draw the heatmap 
    function keyfcn(d){return d.category+'|'+d.trend_duration;}
  
    boxes = svg_trend.selectAll("rect")
        .data(flat_metrics, function(d) {d?keyfcn(d):this.id});
    boxes.exit().remove();  
    boxes.enter()
        .append("rect")
            .attr("class","heatmap_rect")
            .attr("id",keyfcn)
            .attr("x", function (d) {
                return trend.xscale(d.trend_duration)
            })
            .attr("y", function (d) {
                return trend.yscale(d.category)
            })
            .attr("width", trend.xscale.bandwidth() )
            .attr("height", trend.yscale.bandwidth() )
            .style("fill", function(d) { return trendColors(d[metric])} )
            .style("fill-opacity", d=>filter_by_category(d)?1:.2 )
            .style("stroke-opacity", d=>filter_by_category(d)?.5:0 )
        .on("mouseover", trend.mouseover)
        .on("mousemove", d => trend.mousemove(d))
        .on("mouseleave", trend.mouseleave);
    boxes.style("fill", function(d) { return trendColors(d[metric])} )
        .style("fill-opacity", d=>filter_by_category(d)?1:.2 )
        .style("stroke-opacity", d=>filter_by_category(d)?.5:0 )

}


// Word Cloud /////////////////////////////////////////////////

// Get height and width of the HTML container
var svg_height = document.getElementById("WordCloud").clientHeight //.offsetWidth * 0.95
var svg_width = document.getElementById("WordCloud").clientWidth

// set the dimensions and margins of the graph
var margin = { top: 10, right: 30, bottom: 30, left: 60 },
    width = svg_width - margin.left - margin.right,
    height = svg_height - margin.top - margin.bottom;

// append the svg object to the #WordCloud div of the page
var svg_wc = d3.select("#WordCloud")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + width / 2 + ", " + height / 2 + ")") // Centrage du groupe

var words_cloud_material = [];

function get_tags(){
        var tags = d3.nest()
        .key(function(d){return d.tags;})
          .entries(dataset);
    
        var list_arr_tags = [];
          tags.forEach(function(element) {
            list_arr_tags.push(element) ;
        });
    
        var list_tags = [];
        list_arr_tags.forEach(function(element) {
            element.values[0].tags.forEach(function(word){
                list_tags.push(word)
            })
        });
    
        list_tags.forEach(function(tag){
            words_cloud_material.push({"text": tag, "size": 10})
        });

        words_cloud_material = d3.nest().key(function(d){return d.text;}).rollup(function(leaves) {return leaves.length; })
        .entries(words_cloud_material).sort(function(x, y){ return d3.descending(x.value, y.value)})

       words_cloud_material.length = 20;
        
        words_cloud_material.forEach(function(element){
            element["text"]=element.key
            element["size"]=element.value
        })
    }


    const fontFamily = "Open Sans",
        fontScale = d3.scaleLinear().range([20, 120]), // Construction d'une échelle linéaire continue qui va d'une font de 20px à 120px
        fillScale = d3.scaleOrdinal(d3.schemeCategory10); // Construction d'une échelle discrète composée de 10 couleurs différentes

function init_layout_cloud(){
    // Calcul du domain d'entrée de notre fontScale
    // L'objectif est que la plus petite occurence d'un mot soit associée à une font de 20px
    // La plus grande occurence d'un mot est associée à une font de 120px
    let minSize = d3.min(words_cloud_material, d => d.size);
    let maxSize = d3.max(words_cloud_material, d => d.size);
    

    // Nous projettons le domaine [plus_petite_occurence, plus_grande_occurence] vers le range [20, 120]
    // Ainsi les mots les moins fréquents seront plus petits et les plus fréquents plus grands
    fontScale.domain([minSize, maxSize]);

    d3.layout.cloud()
        .size([svg_width, svg_height])
        .words(words_cloud_material)
        .padding(1)
        .rotate(function() {
            return ~~(Math.random() * 2) * 45;
        })
        .spiral("rectangular")
        .font(fontFamily)
        .fontSize(d => fontScale(d.size))
        .on("end", draw_word_cloud)
        .start();

    }

function draw_word_cloud() {
    
    svg_wc.selectAll("text")
            .data(words_cloud_material)
            .enter().append("text") // Ajout de chaque mot avec ses propriétés
                .style("font-size", d => d.size + "px")
                .style("font-family", fontFamily)
                .style("fill", d => fillScale(d.size))
                .attr("text-anchor", "middle")
                .attr("transform", d => "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")")
                .text(d => d.key);
}



/************************************************************
* TIMELINE
*
* This code handles the time slider at the bottom of the screen to
* select data according to the pucblish date
*
* Slider from https://rasmusfonseca.github.io/d3RangeSlider/
************************************************************/

// This scale is used to map slider values to dates
// range is left undecided until some data hase been loaded
SLIDER_RATE_LIMIT_MS = 40 //25 Hz
SLIDE_MAX = 1000
date_scale = d3.scaleTime().range([0, SLIDE_MAX]);

// Global variable updated upon slider use and slider object
var date_range = [0, 0];
var slider = createD3RangeSlider(0, SLIDE_MAX, "#slider-container");

// Init function, call upon loading the dataset to set the scale range
function init_timeline_range() {
    date_range = d3.extent(dataset, d => d.trending_date);
    date_scale.domain(date_range);
    slider.range(0, SLIDE_MAX);
}

// Change function called upon slider change. It calls refresh functions
last_slider_change=new Date();
need_refresh = false;
timer_running = false;
slider.onChange(function (newRange) {
    date_range = [date_scale.invert(newRange.begin), date_scale.invert(newRange.end)];

    date_formatter = d3.timeFormat("%x");// %x is locale format for dates
    d3.select("#range-label")
        .html(date_formatter(date_range[0]) + " &mdash; " + date_formatter(date_range[1]));

    if (SLIDER_RATE_LIMIT_MS != 0){
        // rate limit: use a timer to avoid drawing too often
        if (timer_running){
            need_refresh=true;
        } else {
            timer_running=true;
            need_refresh=false;
            draw_time_graph();//draw_refresh();
            refresh_timer = setTimeout(
                function (){
                    if (need_refresh){draw_time_graph();/*draw_refresh();*/}
                    timer_running=false;
                },
                SLIDER_RATE_LIMIT_MS
            )
        }
    }else{
        draw_time_graph();//draw_refresh();
    }
    draw_refresh();
});
function draw_refresh(){
        t0 = performance.now()
        //draw_time_graph();
        t1 = performance.now()
        draw_trend_heatmap();
        t2 = performance.now()
        draw_cat_analysis();
        t3 = performance.now()
        if (leaderboard.tbody) {draw_leaderboard()};
        t4 = performance.now()
        console.log("Call to draw_time_graph took " + (t1 - t0) + " milliseconds.")
        console.log("Call to draw_trend_heatmap took " + (t2 - t1) + " milliseconds.")
        console.log("Call to draw_cat_analysis took " + (t3 - t2) + " milliseconds.")
        console.log("Call to draw_leaderboard took " + (t4 - t3) + " milliseconds.")
}

/************************************************************
* UTILITY AND FILTERING FUNCTIONS
*
* These are generic functions used in all sections to filter data
************************************************************/

function filter_by_category(d){
    // Return true if this entry in in one of the selected categories
    // Caveat: if no category is selected, keep all
    return (selected_categories.size==0) ? true : selected_categories.has(d.category);
}

function filter_by_time(d) {
    // Filter data entries with .filter(filter_by_time)
    let c1 = d.trending_date >= date_range[0];
    let c2 = d.trending_date <= date_range[1];
    return  c1 && c2
}
