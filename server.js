//
// todo: handle server disconnects as per https://github.com/felixge/node-mysql#server-disconnects,
// https://github.com/felixge/node-mysql#error-handling,
// and try-catching
//

//
// setup a listener and attach a content server to it
//

//var hostname = 'localhost';
console.log('Server starting');
var port = process.env.PORT || 1338;  // for Heroku runtime compatibility
var staticPath = './code';
//var events = require('events').EventEmitter;

//var step = require('step');

//var mysqlQ = require('mysql-queues');
//var transaction = mysqlConnection.createQueue();
//transaction.query...
//var creatingNewEntity = false;

var geoip = require('geoip-lite');
var queryString = require('querystring');
var server = require('http').createServer(requestHandler);
var static = require('node-static'); 
staticContentServer = new static.Server(staticPath, { cache: false });

function requestHandler(request, response) {

    //
    // IP to Geolocation translation package
    // Note that for proper utilization, it should only check
    // the IP upon a new TCP connection, not every http request
    //
    // var geo = geoip.lookup(request.connection.remoteAddress);
    // console.log(request.connection.remoteAddress, geo);
    //

    function apiError(textMessage)
    {
        textMessage = 'API Error: ' + textMessage;
        console.log(textMessage);
        response.writeHead(400, textMessage);
        response.end();
    }

    function confirmParamInApiRequest(postObject, paramName)
    {
        if (!postObject[paramName])
        {
            apiError('The API parameter ' + paramName + ' is required in this API request, but not included in it.')
            return false;
        }
        else
            return true;
    }

    function handleLevel1(postObject)
    {
        switch (postObject.command)
        {
            case 'data':
                if (confirmParamInApiRequest(postObject, 'apiKey'))
                {
                    // here need to extract all identifiers and start the real handling -
                    // entering the data into the database
                    response.writeHead(200, null);
                    response.end();
                }
                break;
            case undefined:
               apiError('no command specified in the request.');
                break;
            default:
                apiError('command ' + postObject.command + ' is not supported.');
        }
    }

	var sourceIP = request.headers['x-forwarded-for'];
		if (!sourceIP)
		{
			sourceIP = request.connection.remoteAddress
			//console.log(JSON.stringify(request.headers));	
		}
		
	if (request.method == 'GET')
	{
        //
        // a UI client page load
        // delegated to node-static for serving it
        //
		
		//console.log('UI Served to ' + request.connection.remoteAddress) // This is just the proxy address. In a hosted environment (e.g. Heroku) it just returns the hosting service proxy address, which varies as there is typically proxy load balancing.
		
		console.log('UI Served to ' + sourceIP);
	
		staticContentServer.serve(request, response, function (err, res) {
			if (err) { 
				console.error("Error serving " + staticPath + request.url + " - " + err.message);
				response.writeHead(err.status, err.headers);
				response.end(); }
			else
				console.log("Served " + staticPath + request.url)});
	}				
    if (request.method == 'POST')
    {
		
		console.log('Handling post request from ' + sourceIP);
        //console.log('Request headers are:' + JSON.stringify(request.headers));
		
		if (request.url == '/metrics')
		{
			console.log('Got metrics from client');
			response.writeHead(200, null);
            response.end();			
		}
        //
        // handle uploading new data
        // not delegated to node-static,
        // so we handle parsing and  responding ourselves
        //
		
        //request.setEncoding("utf8");
        var data = '';

        request.on('data', function(chunk) {
            data += chunk.toString();
        });

        request.on('end', function() {
            var postObject = queryString.parse(data);
            //console.log('data', data);
            console.log('received post data :' + JSON.stringify(postObject));
            
			/*
			switch(postObject.version)
            {
                case undefined:
                    apiError('an  API version is not specified in the client request');
                    break;
                 case '0.1':
                    handleLevel1(postObject);
                    break;
                default:
                    apiError('the API version specified by the client request is not supported');
            }
			*/
        });
    }
}
		
server.listen(port, null, null, function(){ 
	console.log('Server listening on' + ': '  + port);});

	
