"use strict";

Photosynth.PS1Viewer = function(container, options) {
	var _container = container;
	var _that = this;
	var _options = options || {};	
	var _viewer;	
	
	this.load = function(root_url) {
		var elements = root_url.split(".zip")[0].split("/");
		elements = elements[elements.length-1].split("\\");
		var guid = elements[elements.length-1];
		
		console.log(root_url + " -> " + guid);
		
		CreateHtmlComponents(_container);
		_viewer = new PhotoSynthViewer(document.getElementById("gui"));
		_viewer.load(root_url, guid);
	};
	
	function CreateHtmlComponents(parent) {
		
		var parentDiv = document.createElement("div");
		parentDiv.style.backgroundColor = "black";
		parentDiv.style.width = "100%";
		parentDiv.style.height = "100%"; // 560px
		
		var gui = document.createElement("div");
		gui.setAttribute("id", "gui");
		
		var div = document.createElement("div");
		div.setAttribute("style", "width: 675px; height: 585px; float: left");
		
		var loaderInfo = document.createElement("div");
		loaderInfo.setAttribute("class", "loader-info");
		
		var canvasContainer = document.createElement("div");
		canvasContainer.setAttribute("class", "canvas-container");
		
		var canvasController = document.createElement("div");
		canvasController.setAttribute("class", "canvas-controller");
		
		{ //canvasController content
			
			
			var photosynthModePanel;
			var photosynthHelpPanel;
			
			{  //photosynth mode panel
			
				var parentPanel = document.createElement("div");
				parentPanel.setAttribute("class", "photosynth-panel");
				parentPanel.setAttribute("style", "display: none;");
				
				photosynthModePanel = parentPanel;
				
				var top = document.createElement("div");
				top.setAttribute("class", "top");
				
				var ul = document.createElement("ul");
				
				//3dview
				{
					var li = document.createElement("li");
					var div1 = document.createElement("div");
					div1.setAttribute("class", "icon threedview");
					
					li.appendChild(div1);
					li.appendChild(document.createTextNode("3D view"));
					li.setAttribute("class", "activated");
					ul.appendChild(li);
				}
				//overhead
				{
					var li = document.createElement("li");
					var div1 = document.createElement("div");
					div1.setAttribute("class", "icon overhead");
					
					li.appendChild(div1);
					li.appendChild(document.createTextNode("Overhead"));
					ul.appendChild(li);
				}
				//2dview
				{
					var li = document.createElement("li");
					var div1 = document.createElement("div");
					div1.setAttribute("class", "icon two2view");
					
					li.appendChild(div1);
					li.appendChild(document.createTextNode("2D view"));
					ul.appendChild(li);
				}
				//point cloud
				{
					var li = document.createElement("li");
					var div1 = document.createElement("div");
					div1.setAttribute("class", "icon pointcloud");
					
					li.appendChild(div1);
					li.appendChild(document.createTextNode("Point Cloud"));
					ul.appendChild(li);	
				}
				top.appendChild(ul);
				parentPanel.appendChild(top);
				
				var bottom = document.createElement("div");
				bottom.setAttribute("class", "bottom");
				parentPanel.appendChild(bottom);
				
				canvasController.appendChild(parentPanel);
			}
			
			{ //PhotoSynth help panel
			
				var parentHelp = document.createElement("div");
				parentHelp.setAttribute("class", "photosynth-help");
				
				photosynthHelpPanel = parentHelp;
				
				{
					var a = document.createElement("a");
					a.setAttribute("class", "close");
					a.appendChild(document.createTextNode("X"));
					a.addEventListener("click", function(parent) {
						return function() {
							parent.style.display = "none";
						}
					}(parentHelp), false);
					parentHelp.appendChild(a);
				}
				{
					var input = document.createElement("input");
					input.setAttribute("type", "checkbox");
					parentHelp.appendChild(input);
				}
				{
					var a = document.createElement("a");
					a.setAttribute("class", "info");
					a.setAttribute("href", "http://photosynth.net/about.aspx");
					a.setAttribute("target", "_blank");
					a.appendChild(document.createTextNode("More Info"));
					parentHelp.appendChild(a);
				}
				canvasController.appendChild(parentHelp);
			}			
			
			var navigationPanel = document.createElement("div");
			navigationPanel.setAttribute("style", "margin-left: 140px; height: 89px; width: 415px; display: block; position: relative; top: 0px;");
			{			
				{ //img back
					var img = document.createElement("img");
					img.setAttribute("src", "ps1/images/navigation/bar/back.png");
					img.setAttribute("style", "position: absolute; top: 38px; left: 15px;");
					img.setAttribute("class", "navigation-back");
					img.setAttribute("activated", false);
					img.addEventListener("mouseover", function() {
						if (this.activated)
							this.src = "ps1/images/navigation/bar/back.hover.png";
						else
							this.src = "ps1/images/navigation/bar/back.png";
					}, false);
					img.addEventListener("mouseout", function() {
						if (this.activated)
							this.src = "ps1/images/navigation/bar/back.available.png";
						else
							this.src = "ps1/images/navigation/bar/back.png";
					}, false);
					navigationPanel.appendChild(img);
				}
				
				{ //img play
					var img = document.createElement("img");
					img.setAttribute("src", "ps1/images/navigation/bar/play.png");
					img.setAttribute("style", "position: absolute; top: 38px; left: 45px;");
					img.setAttribute("class", "navigation-play");
					img.addEventListener("mouseover", function() {
						this.src = "ps1/images/navigation/bar/play.hover.png";
					}, false);
					img.addEventListener("mouseout", function() {
						this.src = "ps1/images/navigation/bar/play.png";
					}, false);					
					img.addEventListener("click", function() {
						console.log("play button pressed");
					}, false);
					navigationPanel.appendChild(img);
				}
				
				{ //img next
					var img = document.createElement("img");
					img.setAttribute("src", "ps1/images/navigation/bar/next.png");
					img.setAttribute("style", "position: absolute; top: 38px; left: 75px;");
					img.setAttribute("class", "navigation-next");
					img.addEventListener("mouseover", function() {
						this.src = "ps1/images/navigation/bar/next.hover.png";
					}, false);
					img.addEventListener("mouseout", function() {
						this.src = "ps1/images/navigation/bar/next.png";
					}, false);					
					img.addEventListener("click", function() {
						console.log("next button pressed");
					}, false);
					navigationPanel.appendChild(img);
				}
		
				{ //img navigation
					var img = document.createElement("img");
					img.setAttribute("style", "position: absolute; top: 19px; left: 113px;");
					img.setAttribute("src", "ps1/images/navigation/directions/background.rounded.png");
					navigationPanel.appendChild(img);
				}		
				
				{ //img navigation left
					var img = document.createElement("img");
					img.setAttribute("src", "ps1/images/navigation/directions/left.png");
					img.setAttribute("style", "position: absolute; top: 34px; left: 134px;");
					img.setAttribute("class", "navigation-directions-left");
					img.setAttribute("activated", false);
					img.setAttribute("alt", "Next Image Left [left arrow]");
					img.addEventListener("mouseover", function() {
						if (this.activated)
							this.src = "ps1/images/navigation/directions/left.hover.png";
						else
							this.src = "ps1/images/navigation/directions/left.png";
					}, false);
					img.addEventListener("mouseout", function() {
						if (this.activated)
							this.src = "ps1/images/navigation/directions/left.available.png";
						else
							this.src = "ps1/images/navigation/directions/left.png";
					}, false);
					navigationPanel.appendChild(img);
				}
				
				{ //img navigation right
					var img = document.createElement("img");
					img.setAttribute("src", "ps1/images/navigation/directions/right.png");
					img.setAttribute("style", "position: absolute; top: 34px; left: 188px;");
					img.setAttribute("class", "navigation-directions-right");
					img.setAttribute("activated", false);
					img.setAttribute("alt", "Next Image Right [right arrow]");
					img.addEventListener("mouseover", function() {
						if (this.activated)
							this.src = "ps1/images/navigation/directions/right.hover.png";
						else
							this.src = "ps1/images/navigation/directions/right.png";
					}, false);
					img.addEventListener("mouseout", function() {
						if (this.activated)
							this.src = "ps1/images/navigation/directions/right.available.png";
						else
							this.src = "ps1/images/navigation/directions/right.png";
					}, false);
					navigationPanel.appendChild(img);
				}	
				
				{ //img navigation in (up)
					var img = document.createElement("img");
					img.setAttribute("src", "ps1/images/navigation/directions/in.png");
					img.setAttribute("style", "position: absolute; top: 29px; left: 161px;");
					img.setAttribute("class", "navigation-directions-in");
					img.setAttribute("activated", false);
					img.setAttribute("alt", "Next Image In [down arrow]");
					img.addEventListener("mouseover", function() {
						if (this.activated)
							this.src = "ps1/images/navigation/directions/in.hover.png";
						else
							this.src = "ps1/images/navigation/directions/in.png";
					}, false);
					img.addEventListener("mouseout", function() {
						if (this.activated)
							this.src = "ps1/images/navigation/directions/in.available.png";
						else
							this.src = "ps1/images/navigation/directions/in.png";
					}, false);
					navigationPanel.appendChild(img);
				}
				
				{ //img navigation out (down)
					var img = document.createElement("img");
					img.setAttribute("src", "ps1/images/navigation/directions/out.png");
					img.setAttribute("style", "position: absolute; top: 49px; left: 155px;");
					img.setAttribute("class", "navigation-directions-out");
					img.setAttribute("activated", false);
					img.setAttribute("alt", "Next Image Out [down arrow]");
					img.addEventListener("mouseover", function() {
						if (this.activated)
							this.src = "ps1/images/navigation/directions/out.hover.png";
						else
							this.src = "ps1/images/navigation/directions/out.png";
					}, false);
					img.addEventListener("mouseout", function() {
						if (this.activated)
							this.src = "ps1/images/navigation/directions/out.available.png";
						else
							this.src = "ps1/images/navigation/directions/out.png";
					}, false);
					navigationPanel.appendChild(img);
				}
				
				{ //img minus
					var img = document.createElement("img");
					img.setAttribute("src", "ps1/images/navigation/bar/minus.png");
					img.setAttribute("style", "position: absolute; top: 38px; left: 245px;");
					img.setAttribute("class", "navigation-minus");
					img.addEventListener("mouseover", function() {
						this.src = "ps1/images/navigation/bar/minus.hover.png";
					}, false);
					img.addEventListener("mouseout", function() {
						this.src = "ps1/images/navigation/bar/minus.png";
					}, false);
					navigationPanel.appendChild(img);
				}
				
				{ //img plus
					var img = document.createElement("img");
					img.setAttribute("src", "ps1/images/navigation/bar/plus.png");
					img.setAttribute("style", "position: absolute; top: 38px; left: 275px;");
					img.setAttribute("class", "navigation-plus");
					img.addEventListener("mouseover", function() {
						this.src = "ps1/images/navigation/bar/plus.hover.png";
					}, false);
					img.addEventListener("mouseout", function() {
						this.src = "ps1/images/navigation/bar/plus.png";
					}, false);
					navigationPanel.appendChild(img);
				}
				
				{ //img help
					var img = document.createElement("img");
					img.setAttribute("src", "ps1/images/navigation/bar/help.png");
					img.setAttribute("style", "position: absolute; top: 38px; left: 310px;");
					img.setAttribute("class", "navigation-help");
					img.addEventListener("mouseover", function() {
						this.src = "ps1/images/navigation/bar/help.hover.png";
					}, false);
					img.addEventListener("mouseout", function() {
						this.src = "ps1/images/navigation/bar/help.png";
					}, false);
					img.addEventListener("click", function() {
						photosynthHelpPanel.style.display = "block";
					}, false);
					navigationPanel.appendChild(img);
				}
				
				{ //img mode
					var img = document.createElement("img");
					img.setAttribute("src", "ps1/images/navigation/bar/3dview.png");
					img.setAttribute("style", "position: absolute; top: 38px; left: 345px;");
					img.setAttribute("class", "navigation-mode");
					img.setAttribute("mode", "3dview");
					img.addEventListener("mouseover", function() {
						this.src = "ps1/images/navigation/bar/" + this.getAttribute("mode") + ".hover.png";
					}, false);
					img.addEventListener("mouseout", function() {
						this.src = "ps1/images/navigation/bar/" + this.getAttribute("mode") + ".png";
					}, false);
					img.addEventListener("click", function() {
						if (photosynthModePanel.style.display == "none")
							photosynthModePanel.style.display = "block";
						else
							photosynthModePanel.style.display = "none";
					}, false);
					navigationPanel.appendChild(img);
				}	
				
				{ //img fullscreen
					var img = document.createElement("img");
					img.setAttribute("src", "ps1/images/navigation/bar/fullscreen.png");
					img.setAttribute("style", "position: absolute; top: 38px; left: 375px;");
					img.setAttribute("class", "navigation-fullscreen1");
					img.addEventListener("mouseover", function() {
						this.src = "ps1/images/navigation/bar/fullscreen.hover.png";
					}, false);
					img.addEventListener("mouseout", function() {
						this.src = "ps1/images/navigation/bar/fullscreen.png";
					}, false);					
					img.addEventListener("click", function() {
						document.getElementsByTagName("body")[0].webkitRequestFullscreen();
					}, false);
					navigationPanel.appendChild(img);
				}
			}
			canvasController.appendChild(navigationPanel);
			
			var p = document.createElement("p");
			p.setAttribute("style", "color: white");
			p.appendChild(document.createTextNode("Point size: "));
			
			var range = document.createElement("input");
			range.setAttribute("type", "range");
			range.setAttribute("min", "0.0125");
			range.setAttribute("max", "0.1");
			range.setAttribute("step", "0.0125");
			range.setAttribute("style", "vertical-align: middle");
			range.addEventListener("change", function() {
				_viewer.setPointSize(this.value);
			}, false);
			p.appendChild(range);
			
			p.appendChild(document.createTextNode(" | display camera frustums: "));
			
			var checkbox = document.createElement("input");
			checkbox.setAttribute("type", "checkbox");
			checkbox.setAttribute("style", "vertical-align: middle");
			checkbox.addEventListener("change", function() {
				_viewer.setCamerasFrustrumVisibility(this.checked);
			}, false);			
			p.appendChild(checkbox);
			
			p.appendChild(document.createTextNode(" | load camera planes: "));
			
			var checkbox2 = document.createElement("input");
			checkbox2.setAttribute("type", "checkbox");
			checkbox2.setAttribute("style", "vertical-align: middle");
			checkbox2.addEventListener("change", function() {
				_viewer.setCamerasPlaneVisibility(this.checked);
			}, false);			
			p.appendChild(checkbox2);
			
			/*
			p.appendChild(document.createTextNode(" | "));
			
			var button = document.createElement("input");
			button.setAttribute("type", "button");
			button.setAttribute("value", "Top View");
			button.addEventListener("click", function() {
				_viewer.toggleTopView();
			}, false);
			p.appendChild(button);
			*/
			canvasController.appendChild(p);
		}
		
		div.appendChild(loaderInfo);
		div.appendChild(canvasContainer);
		div.appendChild(canvasController);
		gui.appendChild(div);
		
		var infoPanel = document.createElement("div");
		infoPanel.setAttribute("class", "info-panel");
		
		gui.appendChild(infoPanel);
		parentDiv.appendChild(gui);
		parent.appendChild(parentDiv);
	}
	
	this.dispose = function() {
		_viewer.dispose();
		_container.innerHTML = "";
		_viewer = null;
	};
};