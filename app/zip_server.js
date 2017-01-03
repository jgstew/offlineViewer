var http = require('http');
var StreamZip = require('node-stream-zip');
var detect = require('detect-port');

var zips = {};
var max_num_opened_zip = 2;
var num_opened_zip = 0;

function GetZipStream(path, onReady, onError) {
	if (path in zips) {
		// Return existing zip stream and update access time.
		zips[path].latest_access_time = Date.now();
		onReady(zips[path]);
	} else {
		// Create new zip stream and delete previously opened ones if too many are opened.		
		num_opened_zip++;
		if (num_opened_zip > max_num_opened_zip) {
			// Delete item with oldest latest_access_time.
			var oldest_access_time = Date.now();
			var oldest_zip_entry = null;
			for (var zip in zips) {
				if (zips[zip].latest_access_time < oldest_access_time) {
					oldest_access_time = zips[zip].latest_access_time;
					oldest_zip_entry = zip;
				}
			}
			delete zips[oldest_zip_entry];
		}
		zips[path] = {
			slash: '/',
			latest_access_time: Date.now(),
			zip: new StreamZip({
				file: path,
				storeEntries: true
			})
		};
		zips[path].zip.on('ready', function() {
			if (path.indexOf(".zip") != -1) {
				// This is a zip file and not a .pano				
				try {
					this.entryDataSync('properties.json');
				} catch (e) {
					// Official ps2 zip file do not contain properties.json file and are using '\\' instead of '/' for path separator.
					// Unofficial ps2 zip file do contain a properties.json file and are using normal '/' for path separator.
					zips[path].slash = "\\";
				}
			}
			onReady(zips[path]);
		});
        zips[path].zip.on('error', function(err) {
        	onError(err);
        });		
	}
}

var server = http.createServer(function(request, response) {
	var responseStreamOpen = true;
	response.on('finish', () => {
	  responseStreamOpen = false;
	});

	var decodedURL = decodeURI(request.url);

	var extension = "";
	if (decodedURL.includes('.pano')) {
		extension = '.pano';
	} else {
		extension = '.zip';
	}
	var splitPath = decodedURL.split(extension);
	var archivePath = splitPath[0].substr(1) + extension;
	GetZipStream(archivePath, function(zip_obj) {
		var splitSubPath = splitPath[1].split('/');
		var entryPath = "";
		if (splitSubPath.length < 3) {
			entryPath = splitSubPath.join('');
		} else {
			entryPath = splitSubPath.join(zip_obj.slash).substr(1);
		}
		
		try {
			zip_obj.zip.stream(entryPath, function(err, stm) {
				pipeResponse(stm);
			});			
		} catch (e) {
			serveError();
		}
		
	}, function() {
		serveError();
	});

    function pipeResponse(stm) {
        if (stm) {
        	if (responseStreamOpen) {
				response.setHeader('Access-Control-Allow-Origin', '*');
            	stm.pipe(response);
            }
        } else {
			serveError();
        }
    }

    function serveError(){
        if (responseStreamOpen) {
	    	response.writeHead(404, {
	            "Content-Type": "text/plain"
	        });
	        response.write("404 Error");
	        response.end();
    	}
    }
});

var port = 8000;

detect(port, (err, _port) => {
  global.sharedObj = {port: _port};
    server.listen(_port);
});
