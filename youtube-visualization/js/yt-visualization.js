// Utils /////////////////////////////////////////////////
var parseTrendingDate = d3.timeParse("%Y.%d.%m");
var parsePublishDate = d3.timeParse("%Y-%m-%dT%H:%M:%S.000Z")

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

d3.csv('data/FRvideos.csv')
    .row((d, i) => {
        return {
            category: category_id_to_name[+d.category_id],
            channel_title: d.channel_title,
            comment_count: +d.comment_count,
            description: d.description,
            dislikes: +d.dislikes,
            likes: +d.likes,
            publish_time: parsePublishDate(d.publish_time),
            tags: d.tags.split("\"|\""),
            thumbnail_link: d.thumbnail_link,
            title: d.title,
            trending_date: parseTrendingDate(d.trending_date),
            views: +d.views
        }
    })
    .get((error, rows) => {
        console.log("loaded " + rows.length + " rows");
        if (rows.length > 0) {
            console.log('First row:', rows[0])
            console.log('Last row:', rows[rows.length - 1])
        }

        dataset = rows;
        
        draw_cat_analysis();
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

// Tag Trends /////////////////////////////////////////////////

// Word Cloud /////////////////////////////////////////////////

// Leaderboard /////////////////////////////////////////////////

// Timeline /////////////////////////////////////////////////