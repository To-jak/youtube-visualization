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
            if (tags) out = tags.slice(2, -2).split("', '").filter(onlyUnique);
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

var selected_categories = new Set();;

// Define the div element for the tooltip
var cat_tooltip = d3.select("body").append("div")
    .attr("class", "cat-tooltip")
    .style("opacity", 0);

function draw_cat_analysis() {

    // Get height and width of the HTML container
    var height = document.getElementById("CategoryAnalysis").clientHeight
    var width = document.getElementById("CategoryAnalysis").clientWidth

    var catAnalysisSVG = d3.select("#CategoryAnalysis")
        .append("svg")
        .attr("viewBox", "0 0 " + width + " " + height)
        .attr("transform", "translate(0, 0)")

    var cat_data = d3.nest()
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
        .entries(dataset);

    // Scales
    var radiusScale = d3.scaleSqrt().domain([1, 10000]).range([5, 120])
    var textScale = d3.scaleSqrt().domain([1, 10000]).range([5, 30])

    var maxRatio = d3.max(cat_data, function(d) { return d.value['like_ratio'];} );
    var likeRatioColor = d3.scaleSequential(d3.interpolateGreens).domain([0, maxRatio])

    var circles_g = catAnalysisSVG.selectAll("g")
        .data(cat_data).enter().append("g").attr("transform", "translate(0,0)")
        .classed("selected", false)
        .on("mouseover", function (d) {
            cat_tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            cat_tooltip.html("<div class=\"tooltip-header\">" + d.key + "</div>"
                + "<div class=\"tooltip-content\">"
                + "Videos: " + d.value['nb_videos'] + "<br/>"
                + "Views: " + d.value['total_views'] + "<br/>"
                + "<i class=\"fa fa-thumbs-up\" aria-hidden=\"true\"></i>" + d.value['total_likes'] + "<br/>"
                + "<i class=\"fa fa-thumbs-down\" aria-hidden=\"true\"></i>" + d.value['total_dislikes'] + "<br/></div>")
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        })
        .on("mouseout", function (d) {
            cat_tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        })
        .on("click", function(d){
            if (!d3.select(this).classed("selected") ){
                if(selected_categories.size == 0) {
                    catAnalysisSVG.selectAll("g").classed("not-selected", true)
                }
                selected_categories.add(d.key)    
                d3.select(this).classed("not-selected", false)
                d3.select(this).classed("selected", true)
               console.log(selected_categories)
            }else{
                selected_categories.delete(d.key)
                if(selected_categories.size == 0) {
                    catAnalysisSVG.selectAll("g").classed("not-selected", false)
                }
               d3.select(this).classed("selected", false);
               console.log(selected_categories)
            }});

    // Circles
    circles_g.append("circle")
        .attr("class", "category-circle")
        .attr("r", function (d) {
            return radiusScale(d.value['nb_videos'])
        })
        .attr("fill", function(d) {
            return likeRatioColor(d.value['like_ratio'])
        })

    circles_g.append("text")
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

    // Force simulation
    var simulation = d3.forceSimulation()
        .force("x", d3.forceX(width / 2).strength(0.05))
        .force("y", d3.forceY(height / 2).strength(0.05))
        .force("collide", d3.forceCollide(function (d) {
            return radiusScale(d.value['nb_videos']) + 10
        }))

    simulation.nodes(cat_data)
        .on('tick', ticked)

    function ticked() {
        circles_g.attr("x", function (d) { return d.x })
            .attr("transform", function (d) { return 'translate(' + d.x + ' ' + d.y + ')'; })
    }
}

// Leaderboard /////////////////////////////////////////////////
function draw_leaderboard() {

    console.log("==== LEADERBOARD ====")

    // Get height and width of the HTML container
    var height = document.getElementById("Leaderboard").clientHeight
    var width  = document.getElementById("Leaderboard").clientWidth
    console.log("size = "+ height+" x "+ width)

    // group videos by channel
    views_by_channel = d3.nest()
        .key(function(d){ return d.channel_title })
        .rollup(function(video_by_channel){ return d3.sum(video_by_channel, function(d){ return d.views})})
        .entries(dataset)

    console.log("views_by_channel = ", views_by_channel)

    // sort channel by views 
    console.log("before sort = ", views_by_channel[0])
    views_by_channel.sort(function(x, y){ return d3.descending(x.value, y.value)})
    console.log("after sort  = ", views_by_channel[0])
    var top_channel = []
    for (i=0;i<10;i++) { 
        top_channel[i] = views_by_channel[i].key
    }
    console.log("top 10 channel by views = ", top_channel)

    // create table
    var svg_table = d3.select("#Leaderboard")
        .append("svg")
        .attr("viewBox", "0 0 " + width + " " + height)
        .attr("transform", "translate(0, 0)")
    
    /*var logo_trophee = d3.select('#Leaderboard')
        .append('svg')
        .selectAll("image")
        .data([0])
        .enter()
        .append("svg:image")
        .attr('x', 10)
        .attr('y', 10)
        .attr('width', 30)
        .attr('height', 30)
        .attr("xlink:href", "https://image.freepik.com/vecteurs-libre/trophee-or-plaque-signaletique-du-gagnant-du-concours_68708-545.jpg")*/

    var table = svg_table.select("body")
        .append('table')
        .style("border-collapse", "collapse")
        .style("border", "2px black solid")      
        .attr("x", "200")
        .attr("y", "200")
	var thead = table.append('thead')
	var tbody = table.append('tbody')

    var title = "LEADERBOARD"

    // headers
	thead.append('tr')
        .selectAll('th')
        .append('th')
        .data(title)
        .enter()
        .text(function(d) { return d; })
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

    rows.selectAll('td')
        .data(function(d){ return titles.map(function(i) { return { 'value': d[i] }; }); })
        .enter()
        .append('td')
        .text(function (d) { 
            console.log(d.value); 
            return d.value })
        .style("border", "1px black solid")
        .style("padding", "5px")
        .on("mouseover", function(){ d3.select(this).style("background-color", "powderblue")})
        .on("mouseout" , function(){ d3.select(this).style("background-color", "white")})
        .style("font-size", "12px")

}

// Tag Trends /////////////////////////////////////////////////
/*
This is the code for the heatmap on the top left of the screen
Main functions:
init_trend_heatmap() called once to initialize some values from dataset
draw_trend_heatmap() called to update the drawing according to selection
*/

//temporary placeholders
// function init_trend_heatmap() { } 
// function draw_trend_heatmap() { }

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
trend.tooltip = d3.select("body")
    .append("div")
    .style("opacity", 0)
    .attr("class", "tooltip")
    .style("background-color", "white")
    .style("border", "solid")
    .style("border-width", "2px")
    .style("border-radius", "5px")
    .style("padding", "5px")


// Three function that change the tooltip when user hover / move / leave a cell
trend.mouseover = function(d) {
        cat_tooltip.style("opacity", .9)
    }
trend.mousemove = function(d) {
    let mouse = d3.mouse(d3.event.currentTarget); 
    cat_tooltip
        .html(
            "<div class=\"tooltip-header\">" + d.category + "</div>"+
            "<div class=\"tooltip-content\">"+
            "<b>" +  d.count + "</b> videos have been trending for <b>"+d.trend_duration+"</b> days<br>"+
            "Total views : <b>"+ d.total_views+"</b><br>"+
            "Total likes : <b>"+ d.total_likes+"</b><br>"+
            "Total dislikes : <b>"+ d.total_dislikes+"</b>")
        .style("left", (d3.event.pageX) + "px")
        .style("top", (d3.event.pageY+70) + "px")
    }
trend.mouseleave = function(d) {
        cat_tooltip.style("opacity", 0)
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
        .style("fill", function(d) { return myColor(d[metric])} )
        .on("mouseover", trend.mouseover)
        .on("mousemove", d=> trend.mousemove(d))
        .on("mouseleave", trend.mouseleave);
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

function filter_by_time(d) {
    // Filter data entries with .filter(filter_by_time)
    let c1 = d.publish_date >= date_range[0];
    let c2 = d.publish_date <= date_range[1];
    return  c1 && c2
}

function init_timeline_range() {
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
