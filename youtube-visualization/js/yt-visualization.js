// Utils /////////////////////////////////////////////////
var parseDate = d3.timeParse("%Y.%d.%m");
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
        function parseTags(tags) {
            out = []
            if (tags) out = tags.slice(2, -2).split("', '").filter(onlyUnique);
            return out
        }
        // remove leading "[' trailing']" and split
        return {
            category: d.category,
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

        draw_cat_analysis();
        draw_trend_heatmap();
        draw_leaderboard();
    });

// Category Time Graph /////////////////////////////////////////////////

// Category Analysis /////////////////////////////////////////////////

var selected_categories = new Set();;
function draw_cat_analysis() {

    // Define the div element for the tooltip
    var cat_tooltip = d3.select("body").append("div")
        .attr("class", "cat-tooltip")
        .style("opacity", 0);

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
function draw_trend_heatmap() { }
/*
// TODO REPLACE BY ACTUAL FILTER ON CATEGORIES
function draw_trend_heatmap(){
    let height = document.getElementById("TagTrends").clientHeight
    let width = document.getElementById("TagTrends").clientWidth
    let margin_left = 20;
    let margin_top = 20;
    let svg_svg_trend = d3.select("#Leaderboard")
        .append("svg")
        .attr("width",width)
        .attr("height",height)
        .append("g")
        .attr("transform",
        "translate(" + h_margin + "," + v_margin + ")");

    // Build X scales and axis:
    d3.select("#road").selectAll("option")
    .data(d3.map(data, function(d){return d.roadname;}).keys())
    .enter()

    var y = d3.scaleBand()
        .range([ height-2*v_margin, 0 ])
        .domain(myVars)
        .padding(0.01);
    svg.append("g")
    .   call(d3.axisLeft(y));

}
*/

// Word Cloud /////////////////////////////////////////////////


// Timeline /////////////////////////////////////////////////

// This scale is used to map slider values to dates
// range is left undecided until some data hase been loaded
SLIDE_MAX = 1000
time_scale = d3.scaleTime().range([0, SLIDE_MAX]);
var time_range = [0, 0];
date_formatter = d3.timeFormat("%x");// %x is locale format for dates

function filter_by_time(d) {
    // Filter data entries with .filter(filter_by_time)
    let c1 = d.publish_time >= time_scale(time_range[0]);
    let c2 = d.publish_time <= time_scale(time_range[1]);
    return c1 && c2
}

function init_timeline_range() {
    // Call upon loading the dataset to set the scale range
    tmp = d3.extent(dataset, d => d.publish_time);
    console.log(tmp);
    time_scale.domain(d3.extent(dataset, d => d.publish_time));
    slider.range(0, SLIDE_MAX);


}

var slider = createD3RangeSlider(0, SLIDE_MAX, "#slider-container");

slider.onChange(function (newRange) {
    time_range = [time_scale.invert(newRange.begin), time_scale.invert(newRange.end)];


    d3.select("#range-label")
        .html(date_formatter(time_range[0]) + " &mdash; " + date_formatter(time_range[1]));

    //update_all();

});
