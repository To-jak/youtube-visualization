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
}

function redraw_all(){
    draw_cat_analysis();
    draw_trend_heatmap();
    draw_leaderboard();
    draw_time_graph();
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

function draw_time_graph() {

    // getting first and last date from the data
    filtered_dataset = dataset.filter(filter_by_time).filter(filter_by_category)
    var firstDate = d3.min(filtered_dataset, function (d) { return d.trending_date }) //new Date(2017, 7, 1) 
    var lastDate = d3.max(filtered_dataset, function (d) { return d.trending_date })

    console.log("first date:" + firstDate)
    console.log("last date:" + lastDate)

    console.log(calcDate(lastDate, firstDate))

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

    console.log(time_graph_data)

    var timeLines = timeGraph_svg.selectAll(".timeline").data(time_graph_data)

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
    .attr("stroke", "steelblue")
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

let selected_categories = new Set();

// Scales
var radiusScale = d3.scaleSqrt().domain([1, 10000]).range([10, 120])
var textScale = d3.scaleSqrt().domain([1, 10000]).range([5, 30])
var likeRatioColor = d3.scaleSequential(d3.interpolateGreens).domain([0, 20])

// Force simulation
var simulation = d3.forceSimulation()
    .force("x", d3.forceX().strength(0.005))
    .force("y", d3.forceY().strength(0.005))
    .force("collide", d3.forceCollide(function (d) {
        return radiusScale(d.value['nb_videos']) + 10
    }))
    .on('tick', ticked)

function ticked() {
    catAnalysisSVG.selectAll("g")
        .attr("transform", function (d) { return 'translate(' + d.x + ' ' + d.y + ')'; })
}

function filter_by_category(d) {
    // Filter data entries with .filter(filter_by_category)
    if (selected_categories.size == 0) {
        return true
    }
    else{
        return selected_categories.has(d.category)
    }
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
        return radiusScale(d.value['nb_videos']) + 10
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
            cat_tooltip.html("<div class=\"tooltip-header\">" + d.key + "</div>"
                + "<div class=\"tooltip-content\">"
                + "Videos: <b>" + d.value['nb_videos'].toLocaleString() + "</b><br/>"
                + "Views: <b>" + d.value['total_views'].toLocaleString() + "</b><br/>"
                + "<i class=\"fa fa-thumbs-up\" aria-hidden=\"true\"></i> <b>" + d.value['total_likes'].toLocaleString() + "</b><br/>"
                + "<i class=\"fa fa-thumbs-down\" aria-hidden=\"true\"></i> <b>" + d.value['total_dislikes'].toLocaleString() + "</b><br/></div>")
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
                if (selected_categories.size == 0) {
                    catAnalysisSVG.selectAll("g").classed("not-selected", false)
                }
                d3.select(this).classed("selected", false);
                console.log(selected_categories)
            }

            draw_trend_heatmap();
            draw_time_graph();
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
        .alpha(0.2).restart();
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

    catAnalysisSVG.selectAll("text")
    .transition()
        .attr('font-size', function (d) {
            return temp_textScale(d.value['nb_videos'])
        })

    simulation.nodes(cat_data)
    .force("collide", d3.forceCollide(function (d) {
        return temp_radiusScale(d.value['nb_videos']) + 10
    })).alpha(0.2).restart()
}

// Leaderboard /////////////////////////////////////////////////
function draw_leaderboard() {

    console.log("==== LEADERBOARD ====")

    // Get height and width of the HTML container
    var height = document.getElementById("Leaderboard").clientHeight
    var width = document.getElementById("Leaderboard").clientWidth
    console.log("size = " + height + " x " + width)

    // Add dropdown button menu
    var leaderboard_filter = [["by views", "views"],["by likes", "likes"], ["by comments","comment_count"], ["by dislikes","dislikes"]]
    var my_dropdown_menu = 
        d3.select("#selectButton")
            .attr('x', 200)
            .attr('y', 50)
        .selectAll('myOptions')
        .data(leaderboard_filter)
        .enter()
        .append('option')
            .text(function (d) { return d[0]; }) // text showed in the menu
            .attr("value", function (d) { return d[1]; }) // corresponding value returned by the button

    // group videos by channel
    channel_grouped = d3.nest()
        .key(function(d){ return d.channel_title })
        .rollup(function(video_by_channel){ return d3.sum(video_by_channel, function(d){ return d.views})})
        .entries(dataset.filter(filter_by_time))

    console.log("channel_grouped = ", channel_grouped)

    // sort channel by views 
    console.log("before sort = ", channel_grouped[0])
    channel_grouped.sort(function(x, y){ return d3.descending(x.value, y.value)})
    console.log("after sort  = ", channel_grouped[0])
    var top_channel = []
    for (i=0;i<20;i++) { 
        top_channel[i] = (i+1) + ". " + channel_grouped[i].key
    }
    console.log("top 10 channel by views = ", top_channel)

    var logo_trophee = d3.select('#Leaderboard')
        .append('svg')
        .attr("width", 35)
        .attr("height", 35)
        .selectAll("image")
        .data([0])
        .enter()
        .append("svg:image")
        .attr('x', 5)
        .attr('y', 5)
        .attr('width', 30)
        .attr('height', 30)
        .attr("xlink:href", "https://image.freepik.com/vecteurs-libre/trophee-or-plaque-signaletique-du-gagnant-du-concours_68708-545.jpg")

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

    var thead = table.append('thead')
    var tbody = table.append('tbody')

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

    // data
    var rows = tbody.selectAll('tr')
        .data(top_channel)
        .enter()
        .append('tr')

    var columns = ["key"]
    var cells = rows.selectAll('td')
        .data(function (row) { return columns.map(function (column) { return { value: row } }) })
        .enter()
        .append('td')
        .text(function (d) { return d.value })
        .style("border", "1px black solid")
        .style("padding", "5px")
        .on("mouseover", function () { d3.select(this).style("background-color", "powderblue") })
        .on("mouseout", function () { d3.select(this).style("background-color", "white") })
        .style("font-size", "12px")
        .style("text-anchor", "middle")  
    

    // A function that update the Table
    function update(selected_filter) {
        console.log("___ update leaderboard ___")

        // filter data
        var data_filtered = d3.nest()
            .key(function(d){ return d.channel_title })
            .rollup(function(video_by_channel){ return d3.sum(video_by_channel, function(d){ return d[selected_filter]})})
            .entries(dataset.filter(filter_by_time))//tbody.data())
        // sort channel
        data_filtered.sort(function(x, y){ return d3.descending(x.value, y.value)})
        var top_channel = []
        for (i=0;i<20;i++) { 
            top_channel[i] = (i+1) + ". " + data_filtered[i].key
        }
        console.log("new top = ", top_channel)
        // Give these new data to update table
        tbody.data(top_channel).enter()
    }    

    // When the button is changed, run the updateChart function
    d3.select("#selectButton").on("change", function(d) {
        var selected_filter = d3.select(this).property("value") // recover the option that has been chosen
        update(selected_filter) // run the updateChart function with this selected option
    })


    console.log("=================")

    return table

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
    svg_height: document.getElementById("TagTrends").clientHeight,
    svg_width: document.getElementById("TagTrends").clientWidth,
    margin: { top: 8, bottom: 18, left: 120, right: 8 },
    current_metric: "count"
};
trend.height = trend.svg_height - trend.margin.top - trend.margin.bottom;
trend.width = trend.svg_width - trend.margin.left - trend.margin.right;

var metrics = ["count",
    "total_views", "total_dislikes", "total_dislikes",
    "avg_views", "avg_likes", "avg_dislikes",
    "likes_per_view", "dislikes_per_view", "like_ratio"]


// Init function called once to initialize some values
var select_trend = d3.select("#TagTrends")
    .append("select");
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
    console.log("unique_categories")
    console.log(unique_categories)
    //trend.cat_scale.domain(unique_categories).range(ii_categories)
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
        flat_metrics.filter(is_cat_selected),
        d=>d[metric]);
    var trendColors = d3.scaleSequential(d3.interpolateYlGnBu)
    .domain([0 , metric_extent[1]]);//d3.max(flat_metrics,d=>d[metric])]);
    
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
            .style("fill-opacity", d=>is_cat_selected(d)?1:.2 )
            .style("stroke-opacity", d=>is_cat_selected(d)?.5:0 )
        .on("mouseover", trend.mouseover)
        .on("mousemove", d => trend.mousemove(d))
        .on("mouseleave", trend.mouseleave);
    boxes.style("fill", function(d) { return trendColors(d[metric])} )
        .style("fill-opacity", d=>is_cat_selected(d)?1:.2 )
        .style("stroke-opacity", d=>is_cat_selected(d)?.5:0 )

}


// Word Cloud /////////////////////////////////////////////////


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
SLIDER_RATE_LIMIT_MS = 0 //no limit
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
slider.onChange(function (newRange) {
    date_range = [date_scale.invert(newRange.begin), date_scale.invert(newRange.end)];

    date_formatter = d3.timeFormat("%x");// %x is locale format for dates
    d3.select("#range-label")
        .html(date_formatter(date_range[0]) + " &mdash; " + date_formatter(date_range[1]));

    const now = +new Date();
    if (now - last_slider_change > SLIDER_RATE_LIMIT_MS) { // 50Hz seconds
        last_slider_change = now;
        draw_time_graph();
        draw_trend_heatmap();
        draw_cat_analysis();
    }
});


/************************************************************
* UTILITY AND FILTERING FUNCTIONS
*
* These are generic functions used in all sections to filter data
************************************************************/

function is_cat_selected(d){
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