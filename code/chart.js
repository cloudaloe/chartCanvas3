//
// the real stuff
//

chart = new Object(); 		// container for chart properties
timeframe = new Object();	// container for time frame properties
//xAxisHeight=20;
//yAxisWidth=40;
var metrics = new Object();
var chartEngagementStartTime = null;
var gameOver = false;
var reportMetricsUsingAjax = new XMLHttpRequest();
var showDataDetail = true;
var progressStage = 'notInitiated'

function seriesReady()
{
	initTimeframe();
	initChart();
}

function initChart()
{
    //
    //  translate value pairs to screen coordinates
    //
    function calcPlot(layer, drawBox, data, style)
    {
        for (i=0; i<data.length-1; i++)
        {
            data[i].plotX = chartBox.widthScaler(data[i].x);
            data[i].plotY = chartBox.heightScaler(data[i].y);
            data[i+1].plotX = chartBox.widthScaler(data[i+1].x);
            data[i+1].plotY = chartBox.heightScaler(data[i+1].y);
        }
    }

    //
    // draw a serie
    //
    function plot(layer, drawBox, data, style, color)
    {
        var thickness = style == 'highlighted' ? 1.5 : 1;
		
		console.log(color);
        for (i=0; i<data.length-1; i++)
        {
            line(layer, data[i].plotX, data[i].plotY, data[i+1].plotX, data[i+1].plotY, thickness, color);
        }
    }

    function line(layer, x , y, toX, toY, thickness, color)
    {
        var line = new Kinetic.Line({
            points: [ x, y, toX, toY],
            stroke: color,
            strokeWidth: thickness,
            lineCap: "mitter",
            lineJoin: "mitter"
        });
        layer.add(line);
    }

    function draw(layer)
    {

        //
        //  plot each serie, and prepare it for event capture
        //
       for (serie=0; serie<series.numOf; serie++)
       {
           calcPlot(layer, chartBoxRect, series.series[serie].data);
           plot(layer, chartBoxRect, series.series[serie].data, "not highlighted", "hsla(" + String(39+serie*2) + ", 100%, 50%, 1)");
           //plot(layer, chartBoxRect, series.series[serie].data, "not highlighted", "hsla(39, 100%, 50%," + String(1-(serie/15)) + ")");
		   //plot(layer, chartBoxRect, series.series[serie].data, "not highlighted", "orange");
        }

        layer.draw();

        function drawAxes()
        {
            var xAxis = d3.svg.axis().scale(widthScaler).orient("bottom");
            chart.svgElem.append("g")
                .attr("class","Axis")
                .attr("transform", "translate(0," + (height) + ")")
                .call(xAxis);

            var yAxis = d3.svg.axis().scale(heightScaler).orient("right");
            chart.svgElem.append("g")
                .attr("class","Axis")
                .attr("transform", "translate(" + (width) + ",0)")
                .call(yAxis);

        }

        //drawAxes();
    }

	var chartArea = document.getElementById('chartContainer');
	var width = parseFloat(getComputedStyle(chartArea).width);
	var height = parseFloat(getComputedStyle(chartArea).height);

    chartBoxFactor = 4/5;
    var chartBox = {
            width: width * chartBoxFactor,
            height: height * chartBoxFactor,
            x: width * (1-(chartBoxFactor))/2,
            y: height * (1-(chartBoxFactor))/2,
     };

    var chartBoxRect = new Kinetic.Rect($.extend(chartBox,{
        fill: "hsl(240, 20%, 95%)",
        stroke: "black",
        strokeWidth: 0.01
    }));

	//
    // just explicitly  calculate  dimensions
    // that could otherwise be spontaneously used inline
    //
    chartBox.startX = chartBox.x;
    chartBox.startY= chartBox.y;
    chartBox.endX = chartBox.startX+chartBox.width;
    chartBox.endY = chartBox.startY+chartBox.height;

    //
    //  construct scales that would be used for
    //  projecting data values to chart space pixels.
    //
    //  the arguments are the target pixel range
    //
    chartBox.widthScaler = d3.time.scale();
    chartBox.widthScaler.range([chartBox.startX, chartBox.endX]);
    chartBox.widthScaler.domain([timeframe.min, timeframe.max]);

    chartBox.heightScaler = d3.scale.linear();
    chartBox.heightScaler.range([chartBox.endY, chartBox.startY]);
    chartBox.heightScaler.domain([0, Math.max(series.series[0].max, series.series[1].max)]);

    var stage = new Kinetic.Stage({container: chartArea ,height: height, width: width});
			
    var layer = new Kinetic.Layer();

    var circle = new Kinetic.Circle({
        radius: 2,
        fill: "hsla(50, 50%, 50%, 1)",
        stroke: "hsla(50, 50%, 50%, 1)",
        strokeWidth: 0
    });

	// init the background 
	var backgroundLayer = new Kinetic.Layer();
	
	var fillHeight = 0;
	var fillColorSalt = 1;
	
	var background = new Kinetic.Rect({
	  x: 0,
	  y: stage.getHeight() - fillHeight + 1,
	  width: stage.getWidth(),
	  height: fillHeight,
	  fill: "hsla(39, 100%, 50%, 1)",
	  stroke: "hsla(39, 100%, 50%, 1)",
	  strokeWidth: 1,
	  offset: {
		x: 0,
		y: 0
	  }
	});

	backgroundLayer.add(background);
	stage.add(backgroundLayer);

	var mouseMoves = 0;
    chartBoxRect.on('mousemove', function() {
        //
        // find datum closest to mouse position, out of all series.
        // note that lines between datums do not count here,
        // only datums.
        //
        // for that datum, highlight it with a small bulky dot, and highlight its series
        //  by making it appear thicker.
        //

		if (!chartEngagementStartTime)
		{
			chartEngagementStartTime = new Date();
			metrics["timeToEngage"] = (chartEngagementStartTime.getTime() - startTime.getTime())/1000;
				console.log('time to first chart engagement was ' + metrics["timeToEngage"] + ' seconds');
		}
			
        layer.remove(circle);
        var pos = stage.getMousePosition();
        //console.log('x: ' + chartBox.widthScaler.invert(pos.x) + ', y: ' + chartBox.heightScaler.invert(pos.y));

        function dist(x0, y0, x1, y1)  { return Math.sqrt(Math.pow(Math.abs(x0-x1),2) + Math.pow(Math.abs(y0-y1),2)); };

        var minDistanceSerie = null;
        var minDistance = Infinity;
        var minDistanceElem = null;

        for (serie=0; serie<series.numOf; serie++)
        {
            for (elem=0; elem<series.series[serie].data.length; elem++)
            {
                    var distance = dist(series.series[serie].data[elem].plotX,  series.series[serie].data[elem].plotY,  pos.x, pos.y);
                    if (distance < minDistance)
                    {
                        minDistance =  distance;
                        minDistanceElem = elem;
                        minDistanceSerie = serie;
                    }
            }
        }
        //console.log( minDistance, minDistanceElem, minDistanceSerie, series.series[minDistanceSerie].data[minDistanceElem]);

        circle.setX(series.series[minDistanceSerie].data[minDistanceElem].plotX);
        circle.setY(series.series[minDistanceSerie].data[minDistanceElem].plotY);
        layer.add(circle);

        //plot(layer, chartBox, series.series[minDistanceSerie].data, 'highlighted');

		if (showDataDetail)
		{
			//
			// show datum details in a bottom box.
			// by adding it as html there
			//
			var dataDetail = '<div id=dataDetailInner>';
			dataDetail += '<p align=center style="margin-top:0em; margin-bottom:0em">' +  series.series[minDistanceSerie].data[minDistanceElem].x.toString() + '</p>';
			dataDetail += '<p align=center style="margin-top:0em; margin-bottom:0em; font-weight:bold">' + parseInt(series.series[minDistanceSerie].data[minDistanceElem].y) + '</p>';
			dataDetail += '</div>';
			// center the text lines inside the containing box, just for now
			document.getElementById('dataDetail').innerHTML = dataDetail;
			document.getElementById('dataDetailInner').style.paddingTop = ($('#dataDetail').height()-$('#dataDetailInner').height())/2 + 'px';
		}

		layer.draw();

		//
		// game effects...
		//
		
		if (!gameOver)
		{
			
			//
			// Adjust the humble feedback box per progress
			//
			var progress = fillHeight/stage.getHeight();
			if (progress>0.25)
			{
				if (progressStage != '0.25')
				{
					showDataDetail = false; // from now, the data detail box will not be used for data, but for feedback.
					document.getElementById('dataDetail').innerHTML = '<p style="color:#EEE; font-weight:bold; font-size:13.5"; align=center>Way to Go! Keep Going!</p>';			
					var feedbackBox = d3.select("#dataDetail");							
					feedbackBox.transition().style("background-color","orange").duration(100).ease("linear");		
				}
				progressStage = '0.25';
			}
			if (progress>0.85)
			{
				if (progressStage != '0.85')
				{
					showDataDetail = false; // from now, the data detail box will not be used for data, but for feedback.
					document.getElementById('dataDetail').innerHTML = '<p style="color:#EEE; font-weight:bold; font-size:13.5"; align=center>Just A Bit More!</p>';			
					var feedbackBox = d3.select("#dataDetail");							
					feedbackBox.transition().style("background-color","orange").duration(100).ease("linear");		
				}
				progressStage = '0.85';
			}
			//feedbackBox.style("color","orange");
			//feedbackBox.style("display", "inherit");
			//feedbackBox.transition().style("margin-top", "10%").duration(1).ease("cubic-in-out");
			
					
			mouseMoves += 1;
				
			if (mouseMoves > 20)
			{
				
				//fillHeight += ((fillHeight+5)/stage.getHeight())*10
				fillHeight += Math.sin((fillHeight)/stage.getHeight()*Math.PI)*2+1;
				
				/*
				if (fillHeight >= stage.getHeight()/2)	   			
					fillHeight += 3;
				else
					fillHeight += 1;
				*/
						
				if (fillHeight > stage.getHeight())	   			
					fillHeight = stage.getHeight();
					
				background.transitionTo({ 
					y: stage.getHeight() - fillHeight,
					height: fillHeight,
					duration: 0.01,
					easing: "ease-in",
					callback: function(){
						if (fillHeight >= stage.getHeight())
						{
							gameOver = true;
							//background.setFill('blue');
							//background.sjaetStroke('blue');
							
														metrics["mouseMoves"] = mouseMoves;
							console.log('you won');
							var endTime = new Date();
							metrics["engagmentToCompletionTime"] = (endTime.getTime() - startTime.getTime())/1000;
							console.log('time from chart engagement to completion was ' + metrics["engagmentToCompletionTime"] + ' seconds');
							
							var score = Math.pow((10 / metrics["engagmentToCompletionTime"]),2) * 1000;
							
							showDataDetail = false; // from now, the data detail box will not be used for data, but for feedback.

							var dataDetail = '<div id=dataDetailInner>';
							dataDetail += '<p style="color:#EEE; font-weight:bold; font-size:13.5; margin-top:0em; margin-bottom:0em"; align=center>You Won!</p><table style="color:#EEE; font-size:13.5; margin-top:0em; margin-bottom:0em" align=center><tr><td>your score is </td><td style="font-style:italic">' + Math.floor(score) + ' </td><td>out of 1000</td></tr></table>';
							dataDetail += '</div>';

							document.getElementById('dataDetail').innerHTML = dataDetail;
							document.getElementById('dataDetailInner').style.paddingTop = ($('#dataDetail').height()-$('#dataDetailInner').height())/2 + 'px';
		
							var feedbackBox = d3.select("#dataDetail");							
							feedbackBox.transition().style("background-color","hsla(37, 100%, 50%, 1)").duration(1000).ease("linear");	
							
							//
							// Report metrics to server
							//
							console.log(JSON.stringify(metrics));
							//reportMetricsUsingAjax.open('POST', window.location.protocol + '//' + window.location.host + '/metrics');
							reportMetricsUsingAjax.open('POST', '/metrics');
							reportMetricsUsingAjax.setRequestHeader('Content-Type', 'application/json');
							reportMetricsUsingAjax.onreadystatechange = function () {
								if (reportMetricsUsingAjax.readyState == 4 && reportMetricsUsingAjax.status == 200) 
								{
									// readyState values can be found at http://www.w3schools.com/ajax/ajax_xmlhttprequest_onreadystatechange.asp
									console.log('Metrics sent to server');
								}
							};
							reportMetricsUsingAjax.send(JSON.stringify(metrics));
						}
						else
						{
							// 'slowly' drop down a bit, after each movement,
							// to provide incentive to keep going
							background.transitionTo({ 
								y: stage.getHeight() - fillHeight+10,
								height: fillHeight-10,
								duration: 0.7,
								easing: "ease-in"});
						}
					}
				});
			}
				
			//backgroundLayer.draw();
		}
	});

    /*
	chartBoxRect.on("mouseover", function() {
        //chartRect.setFill("hsl(240,15%,93%)");
        this.setFill("black");
		 layer.draw();
        });

    chartBoxRect.on("mouseout", function() {
        this.setFill("hsl(240,20%,95%)");
        layer.draw();
    });
	*/
    
    // add the shape to the layer
	layer.add(chartBoxRect);

	// add the layer to the stage
	stage.add(layer);
    draw(layer, chartBox);
    document.getElementById('dataDetail').innerHTML = '<p color=#fff; align=center>position over the chart for details here</p>';
	
	var startTime = new Date();
}

	function initTimeframe()
	{
	timeframe.min = Math.min(series.series[0].minDate, series.series[1].minDate);
	timeframe.max = Math.max(series.series[0].maxDate, series.series[1].maxDate);
	//console.log("timeframe:");
	//console.dir(timeframe);
	}
