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
