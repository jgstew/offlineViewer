"use strict";

function ArrayReader(input) {
	var _view = new DataView(input);
	var _offset = 0;
	
	function getUint8() {
		return _view.getUint8(_offset++);
	}
	
	function getFloat32() {
		var value = _view.getFloat32(_offset, false);
		_offset+=4;
		return value;	
	}
	
	this.ReadCompressedInt = function() {
		var i = 0;
		var b;
		do {
			b = getUint8();
			i = (i << 7) | (b & 127);
		} while (b < 128);
		
		return i;
	};
	
	this.ReadBigEndianSingle = function() {
		return getFloat32();
	};
	
	this.ReadBigEndianUInt16 = function() {
		var b0 = getUint8();
		var b1 = getUint8();
		
		return (b1 | b0 << 8);
	};		
}

function parsePhotoSynthBinFile(data) {

	var input = new ArrayReader(data);
	var versionMajor  = input.ReadBigEndianUInt16();
	var versionMinor  = input.ReadBigEndianUInt16();

	if (versionMajor != 1 || versionMinor != 0) {
		return false;
	}

	var nbImages = input.ReadCompressedInt();
	
	var infos = [];
	for (var i=0; i<nbImages; ++i) {							
		var nbInfo = input.ReadCompressedInt();
		for (var j=0; j<nbInfo; j++) {
			var vertexIndex = input.ReadCompressedInt();
			var range       = input.ReadCompressedInt();
			infos.push([i, vertexIndex, range]);
		}
	}

	var nbVertices = input.ReadCompressedInt();	
	var vertsArray = new Float32Array(nbVertices * 3);
	var colsArray  = new Float32Array(nbVertices * 3); //TODO: Uint8Array
	var viewList   = new Array(nbVertices);

	for (var i=0; i<nbVertices; i++) {
		vertsArray[i*3+0] = input.ReadBigEndianSingle(); //x
		vertsArray[i*3+1] = input.ReadBigEndianSingle(); //y
		vertsArray[i*3+2] = input.ReadBigEndianSingle(); //z

		var color = input.ReadBigEndianUInt16();
		var r = (((color >> 11) * 255) / 31) & 0xff;
		var g = ((((color >> 5) & 63) * 255) / 63) & 0xff;
		var b = (((color & 31) * 255) / 31) & 0xff;
		colsArray[i*3+0] = r/255; //TODO: remove /255 for Uint8
		colsArray[i*3+1] = g/255;
		colsArray[i*3+2] = b/255;
		
		viewList[i] = [];
	}
	
	for (var i=0; i<infos.length; ++i) {
		var info = infos[i]; //[pictureIndex, vertexIndex, range]
		for (var j=info[1]; j<info[1]+info[2]; ++j)
			viewList[j].push(info[0]);
	}
	
	var nbTracks = 0;
	for (var i=0; i<viewList.length; ++i) {
		if (viewList[i].length > 2)
			nbTracks++;
	}

	return {
		"nbTracks": nbTracks,
		"nbVertices": nbVertices,
		"positions": vertsArray,
		"colors": colsArray,
		"viewList": viewList
	};
}

self.onmessage = function(evt) {
	if (evt.data.type == "parsePhotoSynthBinFile") {
		var result = parsePhotoSynthBinFile(evt.data.response);
		result.coordSystemIndex = evt.data.coordSystemIndex;
		result.binFileIndex = evt.data.binFileIndex;
		result.type = "loadPhotoSynthBinFile";
		self.postMessage(result, [result.positions.buffer, result.colors.buffer]);
	}
};