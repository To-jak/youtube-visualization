// Utils /////////////////////////////////////////////////
var parseDate = d3.timeParse("%Y-%m-%d");
var parseTime = d3.timeParse("%H:%M:%S")

var category_id_to_name = {
    1: "Film & Animation",
    2: "Autos & Vehicles",
    10: "Music",
    15: "Pets & Animals",
    17: "Sports",
    18: "Short Movies",
    19: "Travel & Events",
    20: "Gaming",
    21: "Videoblogging",
    22: "People & Blogs",
    23: "Comedy",
    24: "Entertainment",
    25: "News & Politics",
    26: "Howto & Style",
    27: "Education",
    28: "Science & Technology",
    30: "Movies",
    31: "Anime/Animation",
    32: "Action/Adventure",
    33: "Classics",
    34: "Comedy",
    35: "Documentary",
    36: "Drama",
    37: "Family",
    38: "Foreign",
    39: "Horror",
    40: "Sci-Fi/Fantasy",
    41: "Thriller",
    42: "Shorts",
    43: "Shows",
    44: "Trailers"
}

// Loading Data /////////////////////////////////////////////////

let dataset = [];
function onlyUnique(value, index, self) { 
    return self.indexOf(value) === index;
}
d3.csv('data/clean_data.csv')
    .row((d, i) => {
        function parseTags(tags){
            // remove leading "[' trailing']" and split
            out = []
            if (tags) out =  tags.slice(2,-2).split("', '").filter(onlyUnique);
            return out
        }
        return {
            category: d.category?d.category:"", // map undefined to ""
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
        init_timeline_range();
        init_trend_heatmap();

        draw_cat_analysis();
        draw_trend_heatmap();
        draw_leaderboard();
    });

// Category Time Graph /////////////////////////////////////////////////

// Category Analysis /////////////////////////////////////////////////

function draw_cat_analysis() {

    // Get height and width of the HTML container
    var height = document.getElementById("CategoryAnalysis").clientHeight
    var width = document.getElementById("CategoryAnalysis").clientWidth

    console.log(height, width)

    var cat_an = d3.select("#CategoryAnalysis")
        .append("svg")
        .attr("viewBox", "0 0 " + width + " " + height)
        .attr("transform", "translate(0, 0)")

    var categories = d3.nest()
        .key(function (d) { return d.category; })
        .entries(dataset);

    var radiusScale = d3.scaleSqrt().domain([1, 10000]).range([10, 60])

    var simulation = d3.forceSimulation()
        .force("x", d3.forceX(width / 2).strength(0.05))
        .force("y", d3.forceY(height / 2).strength(0.05))
        .force("collide", d3.forceCollide(function (d) {
            return radiusScale(d.values.length) + 20
        }))

    console.log(categories[0].values.length)

    var circles = cat_an.selectAll(".category")
        .data(categories)
        .enter().append("circle")
        .attr("class", "category")
        .attr("r", function (d) {
            return radiusScale(d.values.length)
        })
        .attr("fill", "lightblue")
        .attr("cx", 100)
        .attr("cy", 300)

    simulation.nodes(categories)
        .on('tick', ticked)

    function ticked() {
        circles.attr("cx", function (d) {
            return d.x
        })
            .attr("cy", function (d) {
                return d.y
            })
    }
}

// Leaderboard /////////////////////////////////////////////////
function draw_leaderboard() {

    // Get height and width of the HTML container
    var height = document.getElementById("Leaderboard").clientHeight
    var width = document.getElementById("Leaderboard").clientWidth

    console.log(height, width)

    var top_channel = d3.nest()
        .key(function (d) {
            //for (var i = 0; i < 10; i++) {
            return d.channel_title;
            })
        .entries(dataset);

    console.log("ranking = " + top_channel.length + " data")

    var svg_table = d3.select("#Leaderboard")
        .append("svg")
        .attr("viewBox", "0 0 " + width + " " + height)
        .attr("transform", "translate(0, 0)")
        .append("table")
        .style("border-collapse", "collapse")
        .style("border", "2px black solid");
    
    var logo_trophee = d3.select('#Leaderboard')
        .append('svg')
        .selectAll("image")
        .data([0])
        .enter()
        .append("svg:image")
        .attr('x', 10)
        .attr('y', 10)
        .attr('width', 30)
        .attr('height', 30)
        .attr("xlink:href", "https://image.freepik.com/vecteurs-libre/trophee-or-plaque-signaletique-du-gagnant-du-concours_68708-545.jpg")

	var thead = svg_table.append('thead')
	var tbody = svg_table.append('tbody')

  // headers
	thead.append('tr')
        .selectAll('th')
	    .append('th')
        .text("LEADERBOARD")
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
	var cells = rows.selectAll('td')
        .enter()
        .append('td')
        .text(function (d) { return d.value })
        .style("border", "1px black solid")
        .style("padding", "5px")
        .on("mouseover", function(){  d3.select(this).style("background-color", "powderblue")})
        .on("mouseout", function(){ d3.select(this).style("background-color", "white")})
        .style("font-size", "12px")

}

// Tag Trends /////////////////////////////////////////////////
/*
This is the code for the heatmap on the top left of the screen
Main functions:
init_trend_heatmap() called once to initialize some values from dataset
draw_trend_heatmap() called to update the drawing according to selection
*/

var trend = {
    height: document.getElementById("TagTrends").clientHeight,
    width: document.getElementById("TagTrends").clientWidth,
    margins: {top:8, bottom:18, left:120, right:8}};
trend.in_height = trend.height - trend.margins.top - trend.margins.bottom;
trend.in_width =  trend.height - trend.margins.left - trend.margins.right;

let svg_trend = d3.select("#TagTrends")
    .append("svg")
    .attr("width",trend.width)
    .attr("height",trend.height)
    .append("g")
    .attr("transform",
    "translate(" + trend.margins.left + "," + trend.margins.top + ")");    

// Init function called once to initialize some values
var unique_categories = [];
var max_duration = -1;

trend.xscale = d3.scaleBand();
trend.yscale = d3.scaleBand();
//trend.cat_scale = d3.scaleOrdinal();

function init_trend_heatmap(){
    // largest trending duration (for scale)
    max_duration = d3.max(
        dataset,
        d=>d.trend_duration
    );
    duration_range = [...Array(max_duration).keys()].map(i => i+1)
    unique_categories = Array.from(new Set(
        Array.from(dataset,d=>d.category)
    ));
    ii_categories = [...Array(unique_categories.length).keys()]


    // Build X scales and axis:
    trend.xscale
        .range([ 0, trend.in_width ])
        .domain(duration_range)
        .padding(0.05);
    svg_trend.append("g")
        .attr("transform", "translate(0," + trend.in_height + ")")
        .call(d3.axisBottom(trend.xscale));

    // Build Y scales and axis:
    console.log("unique_categories")
    console.log(unique_categories)
    //trend.cat_scale.domain(unique_categories).range(ii_categories)
    trend.yscale
        .range([trend.in_height, 0])
        .domain(unique_categories)
        .padding(0.05);
    svg_trend.append("g")
        .call(d3.axisLeft(trend.yscale));

}

// create a tooltip
trend.tooltip = d3.select(".grid-container")
    .append("div")
    .style("opacity", 0)
    .attr("class", "tooltip")
    .style("background-color", "white")
    .style("border", "solid")
    .style("border-width", "2px")
    .style("border-radius", "5px")
    .style("padding", "5px")
    .style("z-index",9)


// Three function that change the tooltip when user hover / move / leave a cell
trend.mouseover = function(d) {
        trend.tooltip.style("opacity", 1)
    }
trend.mousemove = function(d, key) {
        let mouse = d3.mouse(d3.event.currentTarget); 
        trend.tooltip
        .style("left", (mouse[0]+70) + "px")
        .style("top", (mouse[1]) + "px")
        .html(d.category+"<br>"+
            "Trending for "+d.trend_duration+"days<br>"+
            key+" is "+d[key])

    }
trend.mouseleave = function(d) {
        trend.tooltip.style("opacity", 0)
    }

function draw_trend_heatmap(){

    // Reduction on the dataset
    // Define some functions to access metrics of interest
    function countFcn(v) {return v.length};
    function cumulViews(v) {return d3.sum(v,d=>d.views)};
    function cumulLikes(v) {return d3.sum(v,d=>d.likes)};
    function cumulDislikes(v) {return d3.sum(v,d=>d.dislikes)};
    function avgViews(v) {return d3.mean(v,d=>d.views)};
    function avgLikes(v) {return d3.mean(v,d=>d.likes)};
    function avgDislikes(v) {return d3.mean(v,d=>d.dislikes)};
    function allStats(v){
        stats={count: countFcn(v),
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
    function custom_reduction(map, category_name){
        arr = Array.from(
            map.keys(),
            k=> {obj={category:category_name, trend_duration:k , ...map.get(k)}; return obj}
            )
        return arr
    }
    let flat_metrics = Array.from(
            trendMetrics.keys(),
            k=> custom_reduction(trendMetrics.get(k),k)
        );
    flat_metrics = [].concat.apply([], flat_metrics);    

    // Now, to the map!
    metric="count"
    
    // Build color scale
    var myColor = d3.scaleSequential(d3.interpolateYlGnBu)
    .domain([0 , 1000]);//d3.max(flat_metrics,d=>d[metric])]);
    


    console.log(flat_metrics)
    console.log(trend.xscale.bandwidth() )
    console.log(trend.yscale.bandwidth() )
    //Heatmap
    boxes = svg_trend.selectAll()
        .data(flat_metrics, function(d) {return d.category+'|'+d.trend_duration;});
    
    boxes.style("fill", function(d) { return myColor(d[metric])} );
    boxes.enter()
        .append("rect")
        .attr("x", function(d) {
            return trend.xscale(d.trend_duration)
            })
        .attr("y", function(d) {
            return trend.yscale(d.category)
            })
        .attr("width", trend.xscale.bandwidth() )
        .attr("height", trend.yscale.bandwidth() )
        .style("fill", function(d) { return myColor(d[metric])} );/*
        .on("mouseover", trend.mouseover)
        .on("mousemove", d=> trend.mousemove(d,metric))
        .on("mouseleave", trend.mouseleave);*/
    boxes.exit().remove;
}


// Word Cloud /////////////////////////////////////////////////


// Timeline /////////////////////////////////////////////////

// This scale is used to map slider values to dates
// range is left undecided until some data hase been loaded
SLIDE_MAX = 1000
date_scale = d3.scaleTime().range([0, SLIDE_MAX]);
var date_range = [0,0];
date_formatter = d3.timeFormat("%x");// %x is locale format for dates

function filter_by_time(d){
    // Filter data entries with .filter(filter_by_time)
    let c1 = d.publish_date >= date_range[0];
    let c2 = d.publish_date <= date_range[1];
    return  c1 && c2
}

function init_timeline_range(){
    // Call upon loading the dataset to set the scale range
    date_scale.domain(d3.extent(dataset, d => d.publish_date));
    slider.range(0,SLIDE_MAX);
}

var slider = createD3RangeSlider(0, SLIDE_MAX, "#slider-container");

slider.onChange(function(newRange){
    date_range = [date_scale.invert(newRange.begin), date_scale.invert(newRange.end)];

    d3.select("#range-label")
        .html(date_formatter(date_range[0]) + " &mdash; " + date_formatter(date_range[1]));

    draw_trend_heatmap();
    });
