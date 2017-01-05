"use strict";

function ArrayWriter(arrayBuffer) {
	
	var _v = new DataView(arrayBuffer);
	var _offset = 0;
	
	this.writeUchar = function(val) {
		_v.setUint8(_offset, val);
		_offset++;
	};
	
	this.writeFloat = function(val) {
		_v.setFloat32(_offset, val, true);
		_offset += 4;
	};
}

function PhotoSynthViewer(div) {
	
	var _div        = div;
	var _container  = div.getElementsByClassName("canvas-container")[0];
	var _controller = div.getElementsByClassName("canvas-controller")[0];
	var _width      = 675;//Element.getWidth(_container);
	var _height     = 585;//Element.getHeight(_container);
	var _that       = this;
	
	var _renderer;
	var _scene;
	var _planes = [];
	var _particleSystems = [];
	var _lines;
	var _pointCloudMaterial;
	var _camerasFrustrumMaterial;
	var _loader;
	var _worker;
	var _displayCameraPlanes = false;
	var _cameraPlaneMaterials = [];
	var _requestAnimFrameId;
		
	var _navigation = [];
	_navigation["back"] = _controller.getElementsByClassName("navigation-back")[0];
	_navigation["play"] = _controller.getElementsByClassName("navigation-play")[0];
	_navigation["next"] = _controller.getElementsByClassName("navigation-next")[0];	
	_navigation["direction"]  = {
		"right" : _controller.getElementsByClassName("navigation-directions-right")[0],
		"left"  : _controller.getElementsByClassName("navigation-directions-left")[0],
		"in"    : _controller.getElementsByClassName("navigation-directions-in")[0],
		"out"   : _controller.getElementsByClassName("navigation-directions-out")[0]
	};	
	_navigation["minus"]      = _controller.getElementsByClassName("navigation-minus")[0];
	_navigation["plus"]       = _controller.getElementsByClassName("navigation-plus")[0];
	_navigation["help"]       = _controller.getElementsByClassName("navigation-help")[0];
	_navigation["mode"] = {
		"activated"  : _controller.getElementsByClassName("navigation-mode")[0],
		"3dview"     : _controller.getElementsByClassName("threedview")[0].parentNode,
		"overhead"   : _controller.getElementsByClassName("overhead")[0].parentNode,
		"2dview"     : _controller.getElementsByClassName("two2view")[0].parentNode,
		"pointcloud" : _controller.getElementsByClassName("pointcloud")[0].parentNode
	};
	_navigation["fullscreen"] = _controller.getElementsByClassName("navigation-fullscreen")[0];

	(function() {
		var url = "ps1/build/js/PhotoSynthParser.js";
		var xhr = new XMLHttpRequest();
		xhr.open("GET", url, false); //sorry about that
		xhr.onload = function() {		
			window.URL = window.URL || window.webkitURL;
			var bb = new Blob([xhr.responseText], {type: "text/javascript"});
			var workerURL = window.URL.createObjectURL(bb);
			try {
				_worker = new Worker(workerURL);
			}
			catch(err) {
				console.log(err);
			}
		};
		xhr.send();
	})();
	
	//camera
	var _camera;
	var _qx   = new THREE.Quaternion(1.0, 0.0, 0.0, 0.0);
	var _fov  = 45;
	var _near = 0.1;
	var _far  = 2000;
	var _prevCameraPosition;
	var _prevCameraRotation;
	var _isCameraTopView = false;
	
	this.getCamera = function() {
		return _camera;
	};
	
	this.getLoader = function() {
		return _loader;
	};
	
	this.dispose = function() {
		if (_requestAnimFrameId) {
			// Stop rendering loop.
			cancelAnimationFrame(_requestAnimFrameId);
			_requestAnimFrameId = null;
		}
		if (_worker) {
			_worker.terminate();
		}
	};
	
	this.toggleTopView = function() {
		if (_isCameraTopView) {
			moveCameraTo(_prevCameraPosition, _prevCameraRotation, {
				onComplete : function() {
					_isCameraTopView = false;
				}
			});
		}
		else {
			_prevCameraPosition = _camera.position.clone();
			_prevCameraRotation = new THREE.Quaternion(); _prevCameraRotation.copy(_camera.quaternion); //TODO: Three.js I need clone() on Quaternion too!
			moveCameraTo(new THREE.Vector3(0, 0, 10), new THREE.Quaternion(0, 0, 0 ,1), {
				onComplete : function() {
					_isCameraTopView = true;
				}
			});
		}
	};
	
	this.setPointSize = function(pointSize) {
		_pointCloudMaterial.size = pointSize;
	};
	
	this.setCamerasPlaneVisibility = function(isLoaded) {
		_displayCameraPlanes = isLoaded;
	};
	
	this.setCamerasFrustrumVisibility = function(isVisible) {
		_lines.visible = isVisible;
	};
	
	this.setCamera = function(coordSystemIndex, cameraIndex) {
		var cam = _loader.getCamera(coordSystemIndex, cameraIndex);
		_camera.position = new THREE.Vector3(cam.position[0], cam.position[1], cam.position[2]);
		_camera.quaternion = new THREE.Quaternion(cam.orientation[0], cam.orientation[1], cam.orientation[2], cam.orientation[3]);
		_camera.quaternion.multiply(_qx);
		setDirectionsButtonsStatus(coordSystemIndex, cameraIndex);
		
		_prevCameraPosition = _camera.position.clone();
		_prevCameraRotation = new THREE.Quaternion(); _prevCameraRotation.copy(_camera.quaternion); //TODO: Three.js I need clone() on Quaternion too!
	};
	
	this.moveToCamera = function(coordSystemIndex, cameraIndex, options) {
		var cam = _loader.getCamera(coordSystemIndex, cameraIndex);
		var dstPosition = new THREE.Vector3(cam.position[0], cam.position[1], cam.position[2]);
		var dstRotation = new THREE.Quaternion(cam.orientation[0], cam.orientation[1], cam.orientation[2], cam.orientation[3]);
		dstRotation.multiply(_qx);
		
		moveCameraTo(dstPosition, dstRotation, options);
	};
	
	function selectMode(mode) {
		
		//desactivating all mode
		_navigation.mode["3dview"].className = "";
		_navigation.mode["overhead"].className = "";
		_navigation.mode["2dview"].className = "";
		_navigation.mode["pointcloud"].className = "";
		
		//activating the selected mdoe
		_navigation.mode[mode].className = "activated";
		var activatedMode = _navigation.mode["activated"];
		activatedMode.setAttribute("mode", mode);
		activatedMode.src = "ps1/images/navigation/bar/" + mode + ".png";
		
		if (mode == "overhead") {
			if (!_isCameraTopView) {
				_prevCameraPosition = _camera.position.clone();
				_prevCameraRotation = new THREE.Quaternion(); _prevCameraRotation.copy(_camera.quaternion); //TODO: Three.js I need clone() on Quaternion too!
				moveCameraTo(new THREE.Vector3(0, 0, 10), new THREE.Quaternion(0, 0, 0 ,1), {
					onComplete : function() {
						_isCameraTopView = true;
					}
				});
			}
		}
		else if (mode == "3dview") {		
			for (var i=0; i<_planes.length; ++i) {
				_planes[i].visible = true;
			}
			
			moveCameraTo(_prevCameraPosition, _prevCameraRotation, {
				onComplete : function() {
					_isCameraTopView = false;
				}
			});
		}
		else if (mode == "pointcloud") {			
			for (var i=0; i<_planes.length; ++i) {
				_planes[i].visible = false;
			}
			
			moveCameraTo(_prevCameraPosition, _prevCameraRotation, {
				onComplete : function() {
					_isCameraTopView = false;
				}
			});
		}
	}
	
	function setDirectionsButtonsStatus(coordSystemIndex, cameraIndex) {
		var cam = _loader.getCamera(coordSystemIndex, cameraIndex);
		if (!cam.n) {
			setDirectionsButtonStatus("left",  false, coordSystemIndex, -1);
			setDirectionsButtonStatus("right", false, coordSystemIndex, -1);
			setDirectionsButtonStatus("in",    false, coordSystemIndex, -1);
			setDirectionsButtonStatus("out",   false, coordSystemIndex, -1);
		}
		else {
			setDirectionsButtonStatus("left",  cam.n[0] != -1, coordSystemIndex, cam.n[0]);
			setDirectionsButtonStatus("right", cam.n[1] != -1, coordSystemIndex, cam.n[1]);
			setDirectionsButtonStatus("in",    cam.n[2] != -1, coordSystemIndex, cam.n[2]);
			setDirectionsButtonStatus("out",   cam.n[3] != -1, coordSystemIndex, cam.n[3]);
		}
		/*
		if (cam.e && _cameraPlaneMaterials.length > 0) {
			for (var i=0; i<_cameraPlaneMaterials.length; ++i)
				_cameraPlaneMaterials[i].opacity = 0.0;
			for (var i=0; i<cam.e.length; ++i) {
				_cameraPlaneMaterials[cam.e[i]].opacity = 0.3;
			}
			if (_cameraPlaneMaterials[cameraIndex].opacity)
				_cameraPlaneMaterials[cameraIndex].opacity = 1.0;
		}
		else if (_cameraPlaneMaterials.length > 0){
			for (var i=0; i<_cameraPlaneMaterials.length; ++i)
				_cameraPlaneMaterials[i].opacity = 0.0;
			if (_cameraPlaneMaterials[cameraIndex].opacity)	
				_cameraPlaneMaterials[cameraIndex].opacity = 1.0;
		}
		*/
	}
	
	function setDirectionsButtonStatus(buttonName, status, coordSystemIndex, dstCamIndex) {
		
		var button = _navigation["direction"][buttonName];
		
		if (status) {
			button.src = "ps1/images/navigation/directions/" + buttonName + ".available.png";
			button.activated = true;
			button.onclick = function() {
				setDirectionsButtonsStatus(coordSystemIndex, dstCamIndex);
				_that.moveToCamera(coordSystemIndex, dstCamIndex);
			};			
		}
		else {			
			button.src = "ps1/images/navigation/directions/" + buttonName + ".png";
			button.activated = false;
			button.onclick = function() {};
		}
	}
	
	this.getCoordSystemAsBundle = function(metadataLoader, coordSystemIndex) {
		
		var coordSystem = metadataLoader.getCoordSystem(coordSystemIndex);
		var nbVertices = metadataLoader.getNbTracks(coordSystemIndex);
		var nbCameras   = coordSystem.cameras.length;
		
		var output = "";
		output += "# Bundle file v0.3\n";
		output += nbCameras + " " + nbVertices + "\n";
		
		var projections = [];
		for (var i=0; i<nbCameras; ++i) {
			
			var cam = coordSystem.cameras[i];
			var thumb = metadataLoader.getJsonInfo().thumbs[i]; // ??? mapping ???
			if (cam !== undefined && thumb.original_width) {
				
				var hd = {width: thumb.original_width, height: thumb.original_width}
				var focal = Math.max(hd.width, hd.height)*cam.focal;
				
				var K = new THREE.Matrix4(-focal,     0, 0.5*hd.width -0.5, 0,
											   0, focal, 0.5*hd.height-0.5, 0,
											   0,     0,                 1, 0,
											   0,     0,                 0, 1);
				
				var camOrientation = new THREE.Quaternion(cam.orientation[0], cam.orientation[1], cam.orientation[2], cam.orientation[3]);
				camOrientation.multiply(_qx);
				camOrientation.inverse();
				var center = new THREE.Vector3(cam.position[0], cam.position[1], cam.position[2]);
				var t = center.clone().applyQuaternion(camOrientation).multiplyScalar(-1); // -R.C
				
				var Rt = new THREE.Matrix4();
				Rt.compose(t, camOrientation, new THREE.Vector3(1, 1, 1));
				
				output += focal + " " + cam.distort[0] + " " + cam.distort[1] + "\n"; //f k1 k2
				output += Rt.n11 + " " + Rt.n12 + " " + Rt.n13 + "\n"; //R[0]
				output += Rt.n21 + " " + Rt.n22 + " " + Rt.n23 + "\n"; //R[1]
				output += Rt.n31 + " " + Rt.n32 + " " + Rt.n33 + "\n"; //R[2]
				output += Rt.n14 + " " + Rt.n24 + " " + Rt.n34 + "\n"; //t
				
				var P = K;
				P.multiply(Rt); //P = K[Rt]
				P.multiplyScalar(-1);
				P.n44 = 1.0;
				
				projections.push(P);
			}
			else {
				output += "0 0 0\n";  //f k1 k2
				output += "0 0 0\n";  //R[0]
				output += "0 0 0\n";  //R[1]
				output += "0 0 0\n";  //R[2]
				output += "0 0 0\n";  //t
				
				projections.push(42); // ;-)
			}
		}
		
		var featureIndex = 0;
		for (var i=0; i<coordSystem.nbBinFiles; ++i) {
			var binFile = coordSystem.binFiles[i];
			
			for (var j=0; j<binFile.positions.length/3; ++j) {
				
				var viewList = binFile.viewList[j];
				var nbViewpoints = viewList.length;
				
				if (nbViewpoints > 2) {
				
					var posx   = binFile.positions[j*3+0];
					var posy   = binFile.positions[j*3+1];
					var posz   = binFile.positions[j*3+2];
					var colorr = binFile.colors[j*3+0];
					var colorg = binFile.colors[j*3+1];
					var colorb = binFile.colors[j*3+2];
					
					output += posx + " " + posy + " " + posz + "\n";
					output += Math.round(colorr*255) + " " + Math.round(colorg*255) + " " + Math.round(colorb*255) + "\n";
					output += nbViewpoints + " ";
					
					for (var k=0; k<nbViewpoints; ++k) {
						var pictureIndex = coordSystem.cameraIndex[viewList[k]];
						var p = new THREE.Vector4(posx, posy, posz, 1).applyMatrix4(projections[pictureIndex]);
						var x = p.x/p.z;
						var y = p.y/p.z;
						
						output += pictureIndex + " " + featureIndex + " " + x + " " + y + " ";
						featureIndex++;
					}
					output += "\n";
				}
			}
		}
		return output;
	};
	
	this.getCoordSystemAsPly = function(metadataLoader, coordSystemIndex, withCamera) {
		
		var coordSystem = metadataLoader.getCoordSystem(coordSystemIndex);
		var nbVertices  = metadataLoader.getNbVertices(coordSystemIndex);
		if (withCamera)
			nbVertices += 2*metadataLoader.getNbCameras(coordSystemIndex);
		var start = new Date();
		var header = "";
		header += "ply\n";
		header += "format binary_little_endian 1.0\n";
		header += "comment Created using PhotoSynthWebGL Viewer from http://www.visual-experiments.com\n";
		header += "comment PhotoSynth downloaded from: http://photosynth.net/view.aspx?cid=" + metadataLoader.getSoapInfo().guid + "\n";
		header += "element vertex " + nbVertices + "\n";
		header += "property float x\n";
		header += "property float y\n";
		header += "property float z\n";
		header += "property uchar red\n";
		header += "property uchar green\n";
		header += "property uchar blue\n";
		header += "property uchar alpha\n";
		header += "element face 0\n";
		header += "property list uchar int vertex_indices\n";
		header += "end_header\n";
		
		var output = new ArrayBuffer(nbVertices*16); //3 float + 4 uchar
		var writer = new ArrayWriter(output);
		for (var i=0; i<coordSystem.nbBinFiles; ++i) {
			var binFile = coordSystem.binFiles[i];
			for (var j=0; j<binFile.positions.length/3; ++j) {
				var posx   = binFile.positions[j*3+0];
				var posy   = binFile.positions[j*3+1];
				var posz   = binFile.positions[j*3+2];
				var colorr = binFile.colors[j*3+0];
				var colorg = binFile.colors[j*3+1];
				var colorb = binFile.colors[j*3+2];
				writer.writeFloat(posx);
				writer.writeFloat(posy);
				writer.writeFloat(posz);
				writer.writeUchar(Math.floor(colorr*255));
				writer.writeUchar(Math.floor(colorg*255));
				writer.writeUchar(Math.floor(colorb*255));
				writer.writeUchar(255);
			}
		}
		
		if (withCamera) {
			var cameraIndex = 0;
			
			var offset = new THREE.Vector3(0.0, 0.0, -0.05);
			
			for (var i=0; i<coordSystem.cameras.length; ++i) {
				if (coordSystem.cameras[i] !== undefined) {
					var cam = metadataLoader.getCamera(coordSystemIndex, i);
					var pos = new THREE.Vector3(cam.position[0], cam.position[1], cam.position[2]);
					
					writer.writeFloat(pos.x);
					writer.writeFloat(pos.y);
					writer.writeFloat(pos.z);
					if ((cameraIndex % 2) == 0) {
						writer.writeUchar(0);
						writer.writeUchar(255);
						writer.writeUchar(0);
						writer.writeUchar(255);
					}
					else {
						writer.writeUchar(255);
						writer.writeUchar(0);
						writer.writeUchar(0);
						writer.writeUchar(255);
					}
					var camOrientation = new THREE.Quaternion(cam.orientation[0], cam.orientation[1], cam.orientation[2], cam.orientation[3]);
					camOrientation.multiply(_qx);
					var p = offset.clone().applyQuaternion(camOrientation).add(pos); //p = cam.position + camOriFixed * offset
					writer.writeFloat(p.x);
					writer.writeFloat(p.y);
					writer.writeFloat(p.z);
					writer.writeUchar(255);
					writer.writeUchar(255);
					writer.writeUchar(0);
					writer.writeUchar(255);
					cameraIndex++;
				}
			}
		}
		return {
			"header": header,
			"content": output
		};
	};
	
	function moveCameraTo(dstPosition, dstRotation, options) {
		var options    = options || {};
		var onUpdate   = options.onUpdate   || function() {};
		var onComplete = options.onComplete || function() {};
		
		var srcPosition = new THREE.Vector3(_camera.position.x, _camera.position.y, _camera.position.z);
		var srcRotation = new THREE.Quaternion(_camera.quaternion.x, _camera.quaternion.y, _camera.quaternion.z, _camera.quaternion.w);
		
		new Fx(_camera, {
			transition: Fx.Transitions.Quint.easeOut,
			onApply: function(elt, percent) {
				var src = new THREE.Vector3(srcPosition.x, srcPosition.y, srcPosition.z);
				var dst = new THREE.Vector3(dstPosition.x, dstPosition.y, dstPosition.z);
				_camera.position = src.multiplyScalar(1-percent).add(dst.multiplyScalar(percent)); //src*(1-p) + dst*p
				THREE.Quaternion.slerp(srcRotation, dstRotation, _camera.quaternion, percent);
				onUpdate();
			},
			onComplete : function() {
				_camera.position   = dstPosition;
				_camera.quaternion = dstRotation;
				onComplete();
			}
		});	
	}
	
	var _imgLoading = '<img src="ps1/images/loading.gif" alt="" />';
	
	function animate() {
		_requestAnimFrameId = window.requestAnimationFrame(animate);
		_renderer.render(_scene, _camera);
	}		
	
	function setupScene() {
		_camera   = new THREE.PerspectiveCamera(_fov, _width / _height, _near, _far); //fov ratio near far
		_camera.position.z = 20;
		_camera.useTarget = false;
		
		_scene    = new THREE.Scene();
		
		_renderer = new THREE.WebGLRenderer();
		_renderer.setSize(_width, _height);
		_container.appendChild(_renderer.domElement);
		
		Event.observe(_renderer.domElement, "mousemove", function(event) {
			//console.log("mouse move");
		});
		
		Event.observe(_renderer.domElement, "mousedown", function(event) {
			//console.log("mouse down");
		});
		
		Event.observe(_renderer.domElement, "mouseup", function(event) {
			//console.log("mouse up");
		});
		
		Event.observe(_renderer.domElement, "keydown", function(event) {
			//console.log("keydown");
		});
		
		Event.observe(_renderer.domElement, "keyup", function(event) {
			//console.log("keyup");
		});
		
		_navigation["minus"].addEventListener("click", function() {
			var currentFov = _camera.fov;
			var dstFov = Math.min(currentFov+10, 180);
			new Fx(_camera, {
				transition: Fx.Transitions.Quint.easeOut,
				onApply: function(elt, percent) {
					_camera.fov = currentFov*(1-percent) + dstFov*percent; //src*(1-p) + dst*p
					_camera.updateProjectionMatrix();
				},
				onComplete : function() {
					_camera.fov = dstFov;
					_camera.updateProjectionMatrix();
				}
			});
		}, false);
		
		_navigation["plus"].addEventListener("click", function() {
			var currentFov = _camera.fov;
			var dstFov = Math.max(currentFov-10, 0);
			new Fx(_camera, {
				transition: Fx.Transitions.Quint.easeOut,
				onApply: function(elt, percent) {
					_camera.fov = currentFov*(1-percent) + dstFov*percent; //src*(1-p) + dst*p
					_camera.updateProjectionMatrix();
				},
				onComplete : function() {
					_camera.fov = dstFov;
					_camera.updateProjectionMatrix();
				}
			});
		}, false);
		
		_navigation["mode"]["3dview"].addEventListener("click", function() {
			selectMode("3dview");
		}, false);
		
		_navigation["mode"]["overhead"].addEventListener("click", function() {
			selectMode("overhead");
		}, false);
		
		_navigation["mode"]["2dview"].addEventListener("click", function() {
			selectMode("2dview");
		}, false);
		
		_navigation["mode"]["pointcloud"].addEventListener("click", function() {
			selectMode("pointcloud");
		}, false);
				
		_pointCloudMaterial = new THREE.ParticleBasicMaterial({
			size: 0.0125,
			vertexColors : true
		});
		
		_camerasFrustrumMaterial = new THREE.LineBasicMaterial({ 
			color: 0xffffff, 
			opacity: 1, 
			linewidth: 3, 
			vertexColors: false
		});
		animate();
	}
	
	setupScene();
	
	function getIndexOfFirstCamera(metadataLoader, coordSystemIndex) {
		var coordSystem = metadataLoader.getCoordSystem(coordSystemIndex);
		var firstCameraIndex = -1;
		for (var i=0; i<coordSystem.cameras.length; ++i) {
			if (coordSystem.cameras[i] !== undefined) {
				if (firstCameraIndex == -1) 
					firstCameraIndex = i;
			}
		}
		return firstCameraIndex;
	}
	
	function displayCoordSystem(metadataLoader, coordSystemIndex) {
		initCoordSystem(metadataLoader, coordSystemIndex);
		var coordSystem = metadataLoader.getCoordSystem(coordSystemIndex);
		for (var i=0; i<coordSystem.nbBinFiles; ++i) {
			updateCoordSystem(metadataLoader, coordSystemIndex, i);
		}
	}
	
	function initCoordSystem(metadataLoader, coordSystemIndex) {
		clearScene();
		_particleSystems = new Array(metadataLoader.getNbBinFiles(coordSystemIndex));
		drawCamerasFrustrum(metadataLoader, coordSystemIndex);
		if (_displayCameraPlanes)
			createCameraPlanes(metadataLoader, coordSystemIndex);
	}
	
	function drawCamerasFrustrum(metadataLoader, coordSystemIndex) {
	
		var nbCameras = metadataLoader.getNbCameras(coordSystemIndex);
		var coordSystem = metadataLoader.getCoordSystem(coordSystemIndex);
		
		var distanceFromCamera = 0.2;
		var geometry = new THREE.Geometry();
		
		for (var i=0; i<coordSystem.cameras.length; ++i) {
			if (coordSystem.cameras[i] !== undefined) {
				var cam = coordSystem.cameras[i];
				var thumb  = metadataLoader.getJsonInfo().thumbs[i];
				
				var width  = thumb.width;
				var height = thumb.height;
				var focalLength = cam.focal*Math.max(width, height);
				var aspectRatio = width / height;
				var fovy = 2.0 * Math.atan(height / (2.0*focalLength));
				var planeHeight = 2 * distanceFromCamera * Math.tan(fovy*0.5);
				var planeWidth  = planeHeight * aspectRatio;
				
				var pos = new THREE.Vector3(cam.position[0], cam.position[1], cam.position[2]);
				var rot = new THREE.Quaternion(cam.orientation[0], cam.orientation[1], cam.orientation[2], cam.orientation[3]);
				rot.multiply(_qx);
				/*
					C --- D
					|     |
					F --- E
				*/
				var c = new THREE.Vector3(-planeWidth/2,  planeHeight/2, -distanceFromCamera).applyQuaternion(rot).add(pos);
				var d = new THREE.Vector3( planeWidth/2,  planeHeight/2, -distanceFromCamera).applyQuaternion(rot).add(pos);
				var e = new THREE.Vector3( planeWidth/2, -planeHeight/2, -distanceFromCamera).applyQuaternion(rot).add(pos);
				var f = new THREE.Vector3(-planeWidth/2, -planeHeight/2, -distanceFromCamera).applyQuaternion(rot).add(pos);
				
				geometry.vertices.push(c);
				geometry.vertices.push(d);
				geometry.vertices.push(d);
				geometry.vertices.push(e);
				geometry.vertices.push(e);
				geometry.vertices.push(f);
				geometry.vertices.push(f);
				geometry.vertices.push(c);
				
				geometry.vertices.push(pos);
				geometry.vertices.push(c);
				geometry.vertices.push(pos);
				geometry.vertices.push(d);
				geometry.vertices.push(pos);
				geometry.vertices.push(e);
				geometry.vertices.push(pos);
				geometry.vertices.push(f);
			}
		}
		_lines =  new THREE.Line(geometry, _camerasFrustrumMaterial, THREE.LinePieces);
		_lines.visible = false;
		_scene.add(_lines); //TODO: update
	}
	
	function createCameraPlanes(metadataLoader, coordSystemIndex) {
		_cameraPlaneMaterials = [];
		var nbCameras = metadataLoader.getNbCameras(coordSystemIndex);
		var coordSystem = metadataLoader.getCoordSystem(coordSystemIndex);
		
		var distanceFromCamera = 0.2;
		
		for (var i=0; i<coordSystem.cameras.length; ++i) {
			if (coordSystem.cameras[i] !== undefined) {
				(function(index) {
					var thumb = metadataLoader.getJsonInfo().thumbs[index];
					var img = new Image();
					img.crossOrigin = '';
					img.onload = function() {
						var cam = coordSystem.cameras[index];
						var planeNormal = new THREE.Vector3(cam.plane[0], cam.plane[1], cam.plane[2]);
						var planeDist = cam.plane[3];
						
						var pos = new THREE.Vector3(cam.position[0], cam.position[1], cam.position[2]);
						var rot = new THREE.Quaternion(cam.orientation[0], cam.orientation[1], cam.orientation[2], cam.orientation[3]);
						rot.multiply(_qx);
						
						var viewDirection = new THREE.Vector3(0.0, 0.0, -1.0).applyQuaternion(rot);
						//var viewDirection = rot.multiplyVector3(new THREE.Vector3(0.0, 0.0, -1.0), new THREE.Vector3());
						
						//Plane/Ray intersection: http://gmc.yoyogames.com/index.php?showtopic=270743
						var denom = planeNormal.dot(viewDirection);
						var nom   = planeNormal.dot(pos) + planeDist;
						var t     = -(nom/denom);
						//distanceFromCamera = t;
						
						var width  = thumb.width;
						var height = thumb.height;
						var focalLength = cam.focal*Math.max(width, height);
						var aspectRatio = width / height;
						var fovy = 2.0 * Math.atan(height / (2.0*focalLength));
						var planeHeight = 2 * distanceFromCamera * Math.tan(fovy*0.5);
						var planeWidth  = planeHeight * aspectRatio;
						
						var tex = new THREE.Texture(this);
						tex.needsUpdate = true;
						var plane = new THREE.PlaneGeometry(planeWidth, planeHeight, 1, 1);
						var mat = new THREE.MeshBasicMaterial({map: tex, depthTest: false});
						var mesh = new THREE.Mesh(plane, mat);
						_cameraPlaneMaterials[index] = mat;
						
						var move = new THREE.Vector3(0,  0, -distanceFromCamera)
						//var planePos = new THREE.Vector3(); planePos.add(pos, rot.multiplyVector3(move, new THREE.Vector3()));
						var planePos = move.applyQuaternion(rot).add(pos);						
						
						mesh.position = planePos;
						mesh.quaternion = rot;
						mesh.doubleSided = true;
						_scene.add(mesh); //TODO: update
						_planes.push(mesh);
					};
					img.src = thumb.url;
				})(i);
			}
		}
	}
	
	function updateCoordSystem(metadataLoader, coordSystemIndex, binFileIndex) {
		var coordSystem = metadataLoader.getCoordSystem(coordSystemIndex);
		coordSystem.pointClouds[binFileIndex] = new THREE.Geometry();
		
		var pointCloud = coordSystem.pointClouds[binFileIndex];
		for (var i=0; i<coordSystem.binFiles[binFileIndex].positions.length/3; ++i) {
			var vertex = new THREE.Vector3(coordSystem.binFiles[binFileIndex].positions[i*3+0],
										   coordSystem.binFiles[binFileIndex].positions[i*3+1],
										   coordSystem.binFiles[binFileIndex].positions[i*3+2]);
			pointCloud.vertices.push(vertex);
			var color = new THREE.Color(0xffffff);
			color.setRGB(coordSystem.binFiles[binFileIndex].colors[i*3+0], 
						 coordSystem.binFiles[binFileIndex].colors[i*3+1], 
						 coordSystem.binFiles[binFileIndex].colors[i*3+2]);
			pointCloud.colors.push(color);
		}		
		_particleSystems[binFileIndex] = new THREE.ParticleSystem(pointCloud, _pointCloudMaterial);
		_scene.add(_particleSystems[binFileIndex]); //TODO: update child
	}
	
	function clearScene() {
		for (var i=0; i<_particleSystems.length; ++i)
			_scene.remove(_particleSystems[i]);
		_particleSystems = [];
		
		if (_lines) {
			_scene.remove(_lines);
		}
		_lines = undefined;
		
		
		for (var i=0; i<_planes.length; ++i)
			_scene.remove(_planes[i]);
		_planes = [];
	}	
	
	this.load = function(root_url) {
		
		var loaderInfo = _div.getElementsByClassName("loader-info")[0];
		loaderInfo.innerHTML = _imgLoading;
		
		var infoPanel = _div.getElementsByClassName("info-panel")[0];
		infoPanel.innerHTML = "";
		
		_loader = new PhotoSynthMetadataLoader(root_url, _worker, {
			onComplete : function() {
				loaderInfo.innerHTML = "Loaded";
			},
			onProgress : function(loader) {
				if (loader.state == 0) {
					loaderInfo.innerHTML = "Loading Soap " + _imgLoading;
				}
				else if (loader.state == 1) {
					loaderInfo.innerHTML = "Loading Json " + _imgLoading;
				}
				else if (loader.state == 2) {
					loaderInfo.innerHTML = "Loading Collection " + _imgLoading;
				}
				else if (loader.state == 3) {
					
					var ul = new Element("ul", {"class": "acc"});
					
					for (var i=0; i<loader.getNbCoordSystems(); ++i) {
						
						var nbCameras        = loader.getNbCameras(i);
						var approxNbVertices = loader.getNbBinFiles(i) * 5000;
						
						if (nbCameras > 2) {
							var li = new Element("li");
							var h3 = new Element("h3");
							var span = new Element("span", {"class": "right"});
							
							span.appendChild(document.createTextNode(nbCameras + " images ~" + approxNbVertices/1000+"k vertices"));
							h3.appendChild(document.createTextNode("Coord system " + i + ":"));
							h3.appendChild(span);
							li.appendChild(h3);
							
							var divAccSection = new Element("div", {"class" : "acc-section" });
							var divAccContent = new Element("div", {"class" : "acc-content"});
							var approxSize1 = loader.getNbBinFiles(i) * 83;
							approxSize1 = (approxSize1 < 1024) ? approxSize1 + "ko" : Math.round(approxSize1/10)/100+"Mo";
							var input1 = new Element("input", { type: "button", 'class': 'load', value : "Load (~"+approxSize1+")" });
							/*
							var approxSize2 = loader.getNbBinFiles(i) * 83 + loader.getNbCameras(i) * 50;
							approxSize2 = (approxSize2 < 1024) ? approxSize2 + "ko" : Math.round(approxSize2/10)/100+"Mo";
							var input2 = new Element("input", { type: "button", 'class': 'load', value : "Load with images (~"+approxSize2+")" });
							*/
							divAccContent.appendChild(input1);
							//divAccContent.appendChild(document.createTextNode(" - "));
							//divAccContent.appendChild(input2);
							divAccSection.appendChild(divAccContent);
							li.appendChild(divAccSection);
							
							(function(div_elt) {
								Event.observe(input1, "click", function(index) {
									return function() {
										initCoordSystem(loader, index);
										loader.loadCoordSystem(index, {
											onStart : function() {
												var firstCameraIndex = getIndexOfFirstCamera(loader, index);
												if (firstCameraIndex != -1)
													_that.setCamera(index, firstCameraIndex);
											},
											onProgress : function(loader, coordSystemIndex, binFileIndex, percent) {
												div_elt.innerHTML = Math.round(percent*100)+"%";
												updateCoordSystem(loader, coordSystemIndex, binFileIndex);
											},
											onComplete : function() {
												div_elt.innerHTML = "";
												
												var span = div_elt.parentNode.parentNode.getElementsByTagName("h3")[0].getElementsByTagName("span")[0];
												span.innerHTML = "";
												var nbCameras  = loader.getNbCameras(index);
												var nbVertices = loader.getNbVertices(index);
												if (nbVertices > 1000) 
													nbVertices = Math.round(nbVertices/1000)+"k";
												span.appendChild(document.createTextNode(" (" + nbCameras + " images, " + nbVertices + " vertices) "));
												
												var p = new Element("p", {'class': 'download'});
												p.appendChild(document.createTextNode("Download ply: "));
												
												var div0 = document.createElement("div");
												div0.setAttribute("class", "download");
												div0.addEventListener("click", function() {
													var result = _that.getCoordSystemAsPly(loader, index, false);
													var header = new Blob([result.header], {type: "text/plain"});
													var content = new Blob([new DataView(result.content)]);
													var file = new Blob([header, content], {type: "text/plain;charset=utf-8"});
													saveAs(file, "coord_system_" + index + ".ply");
													result = undefined;
												}, false);
												p.appendChild(div0);
												
												p.appendChild(document.createTextNode(", with cameras: "));
												var div1 = document.createElement("div");
												div1.setAttribute("class", "download");
												div1.addEventListener("click", function() {
													var result = _that.getCoordSystemAsPly(loader, index, true);
													var header = new Blob([result.header], {type: "text/plain"});
													var content = new Blob([new DataView(result.content)]);
													var file = new Blob([header, content], {type: "text/plain;charset=utf-8"});
													saveAs(file, "coord_system_" + index + "_with_cameras.ply");
													result = undefined;
												}, false);
												p.appendChild(div1);
												
												p.appendChild(document.createTextNode(", bundle.out: "));
												var div2 = document.createElement("div");
												div2.setAttribute("class", "download");
												div2.addEventListener("click", function() {
													var file = new Blob([_that.getCoordSystemAsBundle(loader, index)], {type: "text/plain;charset=utf-8"});
													saveAs(file, "bundle_" + index + ".out");
												}, false);
												p.appendChild(div2);
												
												div_elt.appendChild(p);
												
												var coordSystem = loader.getCoordSystem(index);
												var divCoverflow = new Element("div", {'class': 'imageflow', 'id': 'coverflow_'+index});
												for (var i=0; i<coordSystem.cameras.length; ++i) {
													if (coordSystem.cameras[i] !== undefined) {
														var img = new Element("img", {alt: "", src: _loader.getJsonInfo().thumbs[i].url, index: i});
														divCoverflow.appendChild(img);
													}
												}
												div_elt.appendChild(divCoverflow);
												var coverflow = new ImageFlow();
												coverflow.init({
													ImageFlowID:'coverflow_'+index , 
													reflections: false, 
													onClick: function() {
														var camIndex = this.getAttribute('index');
														_that.moveToCamera(index, camIndex, {
															onComplete: function() {
																_isCameraTopView = false;
																setDirectionsButtonsStatus(index, camIndex);
															}
														});
													}
												});
											}
										});
									}
								}(i));
							})(divAccContent)
							
							ul.appendChild(li);
						}
					}
					infoPanel.appendChild(ul);
					new Accordion(ul, {
						onChange : function(index) {
							if (_loader.isCoordSystemLoaded(index)) {
								displayCoordSystem(loader, index);
								var firstCameraIndex = getIndexOfFirstCamera(loader, index);
								if (firstCameraIndex != -1)
									_that.setCamera(index, firstCameraIndex);
							}
						}
					});
				}
			}
		});
	};
}