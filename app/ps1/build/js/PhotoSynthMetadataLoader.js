"use strict";

function SoapInfo() {
	this.succeeded;
	this.collectionType; //"synth" or "pano"
	this.dzcUrl;
	this.jsonUrl;
	this.collectionRoot;
	this.privacyLevel;
	this.guid;
}

function JsonInfo() {
	this.version;
	this.thumbs;
}

function PhotoSynthMetadataLoader(root_url, worker, options) {
	var _onComplete = options.onComplete || function() {};
	var _onProgress = options.onProgress || function() {};
	var _onError    = options.onError    || function() {};
	var _soapInfo   = new SoapInfo();
	var _jsonInfo   = new JsonInfo();
	
	const LOADING_SOAP       = 0;
	const LOADING_JSON       = 1;
	const LOADING_COLLECTION = 2;
	const LOADED             = 3;
	const ERROR              = 4;
	
	var _coords = [];	
	var _state  = LOADING_SOAP;
	var _that   = this;
	var _worker = worker;
	
	this.__defineGetter__("state", function(){
		return _state;
	});	
	
	this.getSoapInfo = function() {
		return _soapInfo;
	};
	
	this.getJsonInfo = function() {
		return _jsonInfo;
	};
	
	this.getWorker = function() {
		return _worker;
	};	
	
	this.getNbCoordSystems = function() {
		return _coords.length;
	};
	
	this.getCoordSystem = function(coordSystemIndex) {
		return _coords[coordSystemIndex];
	};
	
	this.getNbBinFiles = function(coordSystemIndex) {
		return _coords[coordSystemIndex].nbBinFiles;
	};

	this.getBinFile = function(coordSystemIndex, binFileIndex) {
		return _coords[coordSystemIndex].binFiles[binFileIndex];
	};
	
	this.getNbVertices = function(coordSystemIndex) {
		var coordSystem = _coords[coordSystemIndex];
		var nbVertices = 0;
		for (var i=0; i<coordSystem.nbBinFiles; ++i) {
			nbVertices += coordSystem.binFiles[i].positions.length;
		}
		return nbVertices/3;
	};
	
	this.getNbTracks = function(coordSystemIndex) {
		var coordSystem = _coords[coordSystemIndex];
		var nbTracks = 0;
		for (var i=0; i<coordSystem.nbBinFiles; ++i)
			nbTracks += coordSystem.binFiles[i].nbTracks;
		return nbTracks;
	};
	
	this.getNbCameras = function(coordSystemIndex) {
		var coordSystem = _coords[coordSystemIndex];
		var nbCameras = 0;
		for (var i=0; i<coordSystem.cameras.length; ++i)
			if (coordSystem.cameras[i] !== undefined)
				nbCameras++;
		return nbCameras;
	};
	
	this.getCamera = function(coordSystemIndex, cameraIndex) {
		return _coords[coordSystemIndex].cameras[cameraIndex];
	};
	
	this.loadCoordSystem = function(coordSystemIndex, options) {
		new PhotoSynthLoader(_that, coordSystemIndex, options);
	};
	
	this.isCoordSystemLoaded = function(coordSystemIndex) {
		var coordSystem = _coords[coordSystemIndex];
		var isLoaded = true;
		for (var i=0; i<coordSystem.binFiles.length; ++i) {
			if (coordSystem.binFiles[i] == undefined) {
				isLoaded = false;
			}
		}
		return isLoaded;
	};
	
	loadMetadata(root_url);
	
    function loadMetadata(root_url) {
		_state = LOADING_SOAP;
		_onProgress(_that);
		parseProperties(root_url, function() {
			parseSoap(root_url, function() {
				_state = LOADING_JSON;
				_onProgress(_that);
				parseJson(root_url, function() {
					_state = LOADING_COLLECTION;
					_onProgress(_that);
					parseCollection(root_url, function() {
						_state = LOADED;
						_onProgress(_that);
						_onComplete(_that);
					});
				});
			});
		});
	}
	
	function getNbImage(obj) {
		var nbImage = 0;
		while(obj[nbImage]) {
			nbImage++;
		}
		return nbImage;
	}
	
	function parseCollection(root_url, onCollectionParsed) {
		var xhr = new XMLHttpRequest();
		xhr.open("GET", root_url + "collection/metadata.dsc", true);
		xhr.overrideMimeType('text/xml');
		xhr.onreadystatechange = function() {
			if (xhr.readyState == 4) {
				var xml = xhr.responseXML;
				var items = xml.getElementsByTagName("I");
				for (var i=0; i<items.length; ++i) {
					var item = items[i];
					var source_url = item.getAttribute("Source");
					var size = item.getElementsByTagName("Size")[0];
					if (source_url) {
						var image_id = source_url.replace(".dzi", "").split("/image/")[1];
						for (var j=0; j<_jsonInfo.thumbs.length; ++j) {
							var thumb = _jsonInfo.thumbs[j];
							if (thumb.id == image_id) {
								thumb.original_width = parseInt(size.getAttribute("Width"), 10);
								thumb.original_height = parseInt(size.getAttribute("Height"), 10);
								thumb.original_dzi = thumb.root_url + "0.dzi";
							}
						}
					}
				}
				onCollectionParsed();
			}
		};
		xhr.send();
	}

	function parseProperties(root_url, onPropertiesParsed) {
		PS.Utils.Request(root_url + "properties.json", {
			onComplete: function(xhr) {
				var json = JSON.parse(xhr.responseText);
				_soapInfo.guid = json.Id;
				onPropertiesParsed();
			}
		});
	}
	
	function parseSoap(root_url, onSoapParsed) {
		var xhr = new XMLHttpRequest();		
		xhr.open("GET", root_url + "soap.xml", true);
		xhr.overrideMimeType('text/xml');
		xhr.onreadystatechange = function() {
			if (xhr.readyState == 4) {
				var xml = xhr.responseXML;
				_soapInfo.succeeded      = xml.getElementsByTagName("Result")[0].firstChild.nodeValue == "OK";
				_soapInfo.collectionType = xml.getElementsByTagName("CollectionType")[0].firstChild.nodeValue == "Synth" ? "synth" : "pano";
				_soapInfo.dzcUrl         = xml.getElementsByTagName("DzcUrl")[0].firstChild.nodeValue.replace("http://", "https://");
				_soapInfo.jsonUrl        = xml.getElementsByTagName("JsonUrl")[0].firstChild.nodeValue.replace("http://", "https://");
				_soapInfo.collectionRoot = xml.getElementsByTagName("CollectionRoot")[0].firstChild.nodeValue.replace("http://", "https://");
				_soapInfo.privacyLevel   = xml.getElementsByTagName("PrivacyLevel")[0].firstChild.nodeValue;
				onSoapParsed();	
			}
		};
		xhr.send();
	}
	
	function createArray(node) {
		var a = [];	
		if (node) {
			for (var i=0; i<node.length; ++i) {
				a.push(node[i]);
			}
		}
		return a;
	}
	
	function parseJson(root_url, onJsonParsed) {
		
		PS.Utils.Request(root_url + "0.json", {
			onComplete: function(xhr) {
				var result = JSON.parse(xhr.responseText);
				
				_jsonInfo.version = result["_json_synth"];
				
				var root;
				for (var guid in result["l"]) {
					root = result["l"][guid];
				}
				
				var nbPicture = parseInt(root["_num_images"], 10);
				var nbCoordSystem = parseInt(root["_num_coord_systems"], 10);
				
				var thumbs = root["image_map"];
				
				//Retrieve thumb information
				var thumbnails = [];
				for (var i=0; i<nbPicture; ++i) {
					// convert
					// http://cdn2.ps1.photosynth.net/image/m01001200-AeoNiv6FgiM_files/thumb.jpg
					// to
					// _root_url + images/m01001200-AeoNiv6FgiM/thumb.jpg
					var thumb = thumbs[i];
					var thumb_id =  thumb["u"].replace("_files/thumb.jpg", "").split("/image/")[1];
					thumbnails.push({
						"id": thumb_id,
						"url": root_url + "images/" + thumb_id + "/thumb.jpg",
						"root_url": root_url + "images/" + thumb_id + "/",
						"width":  parseInt(thumb["d"][0], 10),
						"height": parseInt(thumb["d"][1], 10)
					});
				}
				
				_jsonInfo.thumbs = thumbnails;
				
				//Retrieve CoordSystem information
				_coords = [];
				for (var i=0; i<nbCoordSystem; ++i) {
					var current = root["x"][i];
					if (!current["k"]) {
						_coords.push({
							"cameras"     : [],
							"nbBinFiles"  : 0,
							"binFiles"    : [],
							"pointClouds" : []
						});
					}
					else {
						var nbBinFiles = current["k"][1];
						var images = current["r"];
						
						//tricky part: we allocate an array of N picture but some of them may not be registered in this coords system
						var cameras = new Array(nbPicture);
						var cameraIndexInDataset = [];
						for (var j=0; j<getNbImage(images); ++j) {
							var infos = images[j]["j"];
							
							var index = parseInt(infos[0], 10);
							var x     = parseFloat(infos[1]);
							var y     = parseFloat(infos[2]);
							var z     = parseFloat(infos[3]);
							var qx    = parseFloat(infos[4]);
							var qy    = parseFloat(infos[5]);
							var qz    = parseFloat(infos[6]);
							var squaredqw = 1-qx*qx-qy*qy-qz*qz;
							var qw    = squaredqw > 1e-6 ? Math.sqrt(squaredqw) : 0;
							var ratio = parseFloat(infos[7]);
							var focal = parseFloat(infos[8]);
							
							var distorts = images[j]["f"];
							var distort1 = 0; 
							var distort2 = 0;
							if (distorts) {
								distort1 = parseFloat(distorts[0]);
								distort2 = parseFloat(distorts[1]);
							}
							
							var e = createArray(images[j]["e"]);
							var n = createArray(images[j]["n"]);
							var q = createArray(images[j]["q"]);
							var plane = images[j]["p"];	
							var px = parseFloat(plane[0]);
							var py = parseFloat(plane[1]);
							var squaredpz = 1-px*px-py*py;
							var pz = squaredpz > 1e-6 ? Math.sqrt(squaredpz) : 0;
							var pw = parseFloat(plane[2]);
							
							cameraIndexInDataset.push(index);
							
							cameras[index] = {
								"position"    : [x, y, z],
								"orientation" : [qx, qy, qz, qw],
								"ratio"       : ratio,
								"focal"       : focal,
								"distort"     : [distort1, distort2],
								"plane"       : [px, py, pz, pw],
								"e"           : e,
								"n"           : n,
								"q"           : q
							};
						}
						_coords.push({
							"cameras"     : cameras,
							"nbBinFiles"  : nbBinFiles,
							"binFiles"    : new Array(nbBinFiles),
							"pointClouds" : new Array(nbBinFiles),
							"cameraIndex" : cameraIndexInDataset
						});
					}
				}
				onJsonParsed();
			}
		});
	}
}