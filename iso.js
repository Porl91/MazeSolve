Array.prototype.shuffle = function() {
    for (let i = this.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this[i], this[j]] = [this[j], this[i]];
    }
};

{
	class GridNode {
		constructor(x, y) {
			this.x = x || 0;
			this.y = y || 0;
			this.parent = null;
			this.distanceFromStart = Number.POSITIVE_INFINITY; // 'g'
			this.estimatedCompletionDistance = Number.POSITIVE_INFINITY; // 'f'
		}
		getNeighbours() {
			return [
				new GridNode(this.x - 1, this.y, this),
				new GridNode(this.x, this.y - 1, this),
				new GridNode(this.x + 1, this.y, this),
				new GridNode(this.x, this.y + 1, this)
			];
		}
		getIdentifier() {
			return this.x + ':' + this.y;
		}
		getPathToStart() {
			let current = this;
			let path = [];
			while (current != null) {
				path.push(current);
				current = current.parent;
			}
			path.reverse();
			return path;
		}
	}

	// Testing: http://jsfiddle.net/4c3avkyo/7/
	class NodeScores {
		constructor(scoreComparer) {
			this.map = {};
			this.highestKey = null;
			this.lowestKey = null;
			this.scoreComparer = scoreComparer;
		}
		add(key, node) {
			if ((this.highestKey == null)
				|| (!!this.map[this.highestKey]
					&& this.scoreComparer(node, this.map[this.highestKey])) > 0)
				this.highestKey = key;
			if ((this.lowestKey == null)
				|| (!!this.map[this.lowestKey]
					&& this.scoreComparer(node, this.map[this.lowestKey])) < 0)
				this.lowestKey = key;
			this.map[key] = node;
		}
		remove(key) {
			if (this.highestKey == key) {
				this.highestKey = null;
			}
			if (this.lowestKey == key) {
				this.lowestKey = null;
			}
			if (this.map[key]) {
				delete this.map[key];
			}
			for (let nodeKey of Object.keys(this.map)) {
				if ((this.highestKey == null)
					|| (!!this.map[nodeKey]
						&& this.scoreComparer(this.map[nodeKey], this.map[this.highestKey])) > 0)
					this.highestKey = nodeKey;
				if ((this.lowestKey == null)
					|| (!!this.map[nodeKey]
						&& this.scoreComparer(this.map[nodeKey], this.map[this.lowestKey])) < 0)
					this.lowestKey = nodeKey;
			}
		}
		get(key) {
			return this.map[key] || null;
		}
		keyExists(key) {
			return !!this.map[key];
		}
		lowest() {
			return this.map[this.lowestKey] || null;
		}
		highest() {
			return this.map[this.highestKey] || null;
		}
		empty() {
			return Object.keys(this.map).length == 0;
		}
	}

	class AStarPathFinder {
		getRoute(doesCellObstruct, startPoint, endPoint) {
			let start = new GridNode(startPoint.x, startPoint.y);
			let end = new GridNode(endPoint.x, endPoint.y);
			let openSet = new NodeScores((a, b) => a.estimatedCompletionDistance > b.estimatedCompletionDistance);
			openSet.add(start.getIdentifier(), start);

			let closedSet = {};

			start.distanceFromStart = 0;
			start.estimatedCompletionDistance = this.getDistanceHeuristic(start, end);

			while (!openSet.empty()) {
				let current = openSet.lowest();
				if (current.getIdentifier() == end.getIdentifier())
					return current.getPathToStart();

				openSet.remove(current.getIdentifier());
				closedSet[current.getIdentifier()] = 1;

				for (let neighbour of current.getNeighbours()) {
					if (closedSet[neighbour.getIdentifier()]) {
						continue;
					}

					if (doesCellObstruct(neighbour)) {
						continue;
					}

					// Neighbour's overall score from the start node.
					let neighbourDistanceFromStart = current.distanceFromStart
						+ this.getDistanceBetweenNodes(current, neighbour);

					if (!openSet.keyExists(neighbour.getIdentifier())) {
						openSet.add(neighbour.getIdentifier(), neighbour);
					} else if (neighbourDistanceFromStart >= neighbour.distanceFromStart) {
						continue;
					}

					neighbour.parent = current;
					neighbour.distanceFromStart = neighbourDistanceFromStart;
					neighbour.estimatedCompletionDistance = neighbour.distanceFromStart
						+ this.getDistanceHeuristic(neighbour, end);
				}
			}

			return [];
		}
		getDistanceHeuristic(node0, node1) {
			return Math.abs(node0.x - node1.x) + Math.abs(node0.y - node1.y); // Manhattan distance.
		}
		getDistanceBetweenNodes(node0, node1) {
			return 1; // Hard-coded to 1. Nodes and their 4 neighbours are adjacent.
		}
	}

	window.AStarPathFinder = AStarPathFinder;
}

class Player {
	constructor() {
		this.x = 0.5;
		this.y = 0.5;
		this.halfWidth = 0.45;
		this.halfHeight = 0.45;
		this.route = null;
		this.targetPosition = null;
	}

	setRoute(route) {
		this.route = route.reverse();
	}

	update(move) {
		if (this.route) {
			if (!this.targetPosition) {
				let targetCell = this.route.pop();
				if (!targetCell) {
					this.route = null;
					return;
				}
				this.targetPosition = {
					x: (targetCell.x + 0.499), 
					y: (targetCell.y + 0.499)
				};
			}
			let distanceSqr = Math.pow(this.targetPosition.x - this.x, 2) + Math.pow(this.targetPosition.y - this.y, 2);
			if (distanceSqr < 0.01) {
				this.targetPosition = null;
			} else {
				let dir = {
					x: (this.targetPosition.x - this.x),
					y: (this.targetPosition.y - this.y)
				};
				let invLength = 1 / Math.sqrt(Math.pow(dir.x, 2) + Math.pow(dir.y, 2));
				let xDelta = (dir.x * invLength) * 0.05;
				let yDelta = (dir.y * invLength) * 0.05;
				move(xDelta, yDelta);
			}
		}
	}
}

class Game {
	constructor() {
		this.tileWidth = 64;
		this.tileHeight = 32;
		this.halfTileWidth = this.tileWidth / 2;
		this.halfTileHeight = this.tileHeight / 2;
		this.moveSpeed = 0.1;
		this.extraGridPerimeterTiles = 10;

		this.canvas = document.getElementById('output');
		this.canvas.width = 1920;
		this.canvas.height = 640;

		this.context = this.canvas.getContext('2d');

		this.camera = { 
			x: parseFloat(localStorage.getItem('xCam')) || (-this.canvas.width / 2), 
			y: parseFloat(localStorage.getItem('yCam')) || (-this.canvas.height / 2)
		};

		this.player = new Player();
		
		this.keyStates = {};
		this.spritesheet = null;
		
		this.mapWidth = 20;
		this.mapHeight = 20;
		this.map = [[]];
		this.mapExit = null;
	}

	async start() {
		this.attachEventListeners();
		this.spritesheet = await this.loadImage('sprites.png');
		this.initMap();
		this.initEntities();
		this.tick();
	}

	attachEventListeners() {
		window.onkeydown = window.onkeyup = (ev) => {
			this.keyStates[ev.key] = (ev.type == 'keydown');
		};
	}

	async loadImage(imagePath) {
		return new Promise(function (resolve, reject) {
			var image = document.createElement('img');
			image.onload = ev => resolve(image);
			image.src = imagePath;
		});
	}

	tick(delta) {
		this.handleInput();
		this.player.update((xDelta, yDelta) => {
			this.movePlayer(xDelta, 0);
			this.movePlayer(0, yDelta);
		});
		this.drawGrid();
		window.requestAnimationFrame((delta) => this.tick(delta));
	}

	initMap() {
		for (let y = 0; y < this.mapHeight; y++) {
			this.map[y] = this.map[y] || [];
			for (let x = 0; x < this.mapWidth; x++) {
				this.map[y][x] = 1;
			}
		}
		this.map[0][0] = 2;
		let visitedCells = {};
		var current = { x: 1, y: 1, xPartition: 0, yPartition: 0, parent: null };
		while (current != null) {
			if (!visitedCells[current.x + ':' + current.y]) {
				visitedCells[current.x + ':' + current.y] = 1;
			}
			let frontiers = [
				{ x: current.x - 2, y: current.y, xPartition: current.x - 1, yPartition: current.y, parent: current },
				{ x: current.x + 2, y: current.y, xPartition: current.x + 1, yPartition: current.y, parent: current },
				{ x: current.x, y: current.y - 2, xPartition: current.x, yPartition: current.y - 1, parent: current },
				{ x: current.x, y: current.y + 2, xPartition: current.x, yPartition: current.y + 1, parent: current }
			];
			frontiers.shuffle();
			var nextFrontier = null;
			for (const frontier of frontiers) {
				if ((frontier.x < 0) || (frontier.y < 0) || (frontier.x >= this.mapWidth - 1) || (frontier.y >= this.mapHeight - 1) || visitedCells[frontier.x + ':' + frontier.y]) {
					continue;
				}
				nextFrontier = frontier;
			}
			if (nextFrontier == null) {
				current = current.parent;
				continue;
			}
			this.map[nextFrontier.y][nextFrontier.x] = 0;
			this.map[nextFrontier.yPartition][nextFrontier.xPartition] = 0;
			current = nextFrontier;
		}

		[...new Array(this.mapHeight).keys()].forEach(_ => this.map[_][this.mapWidth - 1] = 0);
		[...new Array(this.mapWidth).keys()].forEach(_ => this.map[this.mapHeight - 1][_] = 0);
		
		if (Math.random() > 0.5) {
			while (true) {
				var y = (Math.random() * (this.mapHeight - 2)) | 0;
				if (this.map[y][this.mapWidth - 3] == 0) {
					this.mapExit = { x: this.mapWidth - 3, y: y };
					this.map[y][this.mapWidth - 2] = 3;
					break;
				}
			}
		} else {
			while (true) {
				var x = (Math.random() * (this.mapWidth - 2)) | 0;
				if (this.map[this.mapWidth - 3][x] == 0) {
					this.mapExit = { x: x, y: this.mapWidth - 3 };
					this.map[this.mapWidth - 2][x] = 3;
					break;
				}
			}
		}
		
		// Clear out the starting zone.
		this.map[1][1] = this.map[0][1] = this.map[1][0] = 0;

		let mapStart = {
			x: Math.floor(this.player.x / this.halfTileWidth), 
			y: Math.floor(this.player.y / this.tileHeight)
		};
		let route = new AStarPathFinder().getRoute(node => !this.areCoordinateInMapRange(node.x, node.y) || (this.map[node.y][node.x] == 1), mapStart, this.mapExit);
		
		for (const node of route.slice(1)) {
			this.map[node.y][node.x] = 4;
		}
	}

	initEntities() {
		let mapStart = {
			x: Math.floor(this.player.x / this.halfTileWidth), 
			y: Math.floor(this.player.y / this.tileHeight)
		};
		let route = new AStarPathFinder().getRoute(node => !this.areCoordinateInMapRange(node.x, node.y) || (this.map[node.y][node.x] == 1), mapStart, this.mapExit);
		this.player.setRoute(route.slice(1));
	}

	updateSaveCamera() {
		localStorage.setItem('xCam', this.camera.x);
		localStorage.setItem('yCam', this.camera.y);
	}

	handleInput() {
		// Camera
		if (this.keyStates['w']) {
			this.camera.y -= this.moveSpeed * 50;
			this.updateSaveCamera();
		}
		if (this.keyStates['s']) {
			this.camera.y += this.moveSpeed * 50;
			this.updateSaveCamera();
		}
		if (this.keyStates['a']) {
			this.camera.x -= this.moveSpeed * 50;
			this.updateSaveCamera();
		}
		if (this.keyStates['d']) {
			this.camera.x += this.moveSpeed * 50;
			this.updateSaveCamera();
		}
	
		var xMove = 0;
		var yMove = 0;
	
		// Player
		if (this.keyStates['ArrowUp']) {
			yMove -= this.moveSpeed;
		}
		if (this.keyStates['ArrowDown']) {
			yMove += this.moveSpeed;
		}
		if (this.keyStates['ArrowLeft']) {
			xMove -= this.moveSpeed;
		}
		if (this.keyStates['ArrowRight']) {
			xMove += this.moveSpeed;
		}

		this.movePlayer(xMove, 0);
		this.movePlayer(0, yMove);
		
		// TODO: Collisions with entities.
		function doesIntersect(box0, box1) {
			return !((box0.x + box0.w < box1.x) // Box 0 is left of Box 1
				|| (box0.x > box1.x + box1.w) // Box 0 is right of Box 1
				|| (box0.y + box0.h < box1.y) // Box 0 is above of Box 1
				|| (box0.y > box1.y + box1.h)); // Box 0 is below of Box 1
		}
	}

	movePlayer(xDelta, yDelta) {
		if ((xDelta != 0.0) && (yDelta != 0.0)) {
			throw 'Can\'t move the Player in both directions at once';
		}
		
		// Margin applied to the movement delta to keep us out of collided cells during position correction for collision response.
		const margin = 0.01;

		let x0 = Math.floor((this.player.x + xDelta - this.player.halfWidth));
		let x1 = Math.floor((this.player.x + xDelta + this.player.halfWidth));
		let y0 = Math.floor((this.player.y + yDelta - this.player.halfHeight));
		let y1 = Math.floor((this.player.y + yDelta + this.player.halfHeight));

		var xCorrected = false;
		var yCorrected = false;
		for (let y = y0; y <= y1; y++) {
			for (let x = x0; x <= x1; x++) {
				if (!this.areCoordinateInMapRange(x, y) || (this.map[y][x] == 1)) {
					if (!xCorrected) {
						if (xDelta != 0) {
							xCorrected = true;
						}
						if (xDelta > 0) {
							xDelta = (x - this.player.halfWidth) - this.player.x - margin;
						} else if (xDelta < 0) {
							xDelta = (x + this.player.halfWidth + 1) - this.player.x + margin;
						}
					}
					if (!yCorrected) {
						if (yDelta != 0) {
							yCorrected = true;
						}
						if (yDelta > 0) {
							yDelta = (y - this.player.halfHeight) - this.player.y - margin;
						} else if (yDelta < 0) {
							yDelta = (y + this.player.halfHeight + 1) - this.player.y + margin;
						}
					}
				}
			}
		}
	
		this.player.x += xDelta;
		this.player.y += yDelta;
	}

	drawGrid() {
		this.context.fillStyle = '#000';
		this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
		
		let xTileStart = Math.floor(this.camera.x / this.halfTileWidth);
		let yTileStart = Math.floor(this.camera.y / this.tileHeight);
		let horizontalTiles = Math.floor(this.canvas.width / this.halfTileWidth);
		let verticalTiles = Math.floor(this.canvas.height / this.tileHeight);
		let sprites = [];
		for (let y = yTileStart - this.extraGridPerimeterTiles; y < yTileStart + verticalTiles + this.extraGridPerimeterTiles; y++) {
			for (let x = xTileStart - this.extraGridPerimeterTiles; x < xTileStart + horizontalTiles + this.extraGridPerimeterTiles; x++) {
				let xScreen = x * this.halfTileWidth;
				let yScreen = y * this.tileHeight + (x & 1) * this.halfTileHeight;
				let mapCoords = this.getMapCoordsForScreenCoords(xScreen, yScreen);
				if (this.areCoordinateInMapRange(mapCoords.x, mapCoords.y)) {
					let tileId = this.map[mapCoords.y][mapCoords.x];
					if (tileId > 0) {
						var ySprite = (tileId - 1) * 64;
						sprites.push({
							xScreen: xScreen,
							yScreen: yScreen,
							xSprite: 0,
							ySprite: ySprite
						});
					}	
				}
			}
		}
	
		let iso = this.getIsometricCoordsForScreenCoords(
			this.player.x - this.player.halfWidth, 
			this.player.y - this.player.halfHeight
		);
		sprites.push({
			xScreen: iso.x * this.halfTileWidth,
			yScreen: iso.y * this.tileHeight,
			xSprite: 64,
			ySprite: 0
		});
	
		sprites.sort((a, b) => a.yScreen - b.yScreen);
	
		for (const sprite of sprites) {
			this.drawImage(
				sprite.xScreen - this.camera.x, 
				sprite.yScreen - this.camera.y, 
				sprite.xSprite, 
				sprite.ySprite
			);
		}
	}
	
	drawTile(x, y, colour) {
		this.context.fillStyle = colour;
		this.context.save();
		this.context.translate(x, y);
		this.context.beginPath();
		this.context.moveTo(0, this.halfTileHeight - 1);
		this.context.lineTo(this.halfTileWidth - 1, 0);
		this.context.lineTo(this.halfTileWidth, 0);
		this.context.lineTo(this.halfTileWidth + 1, 0);
		this.context.lineTo(this.tileWidth, this.halfTileHeight - 1);
		this.context.lineTo(this.halfTileWidth + 1, this.tileHeight - 1);
		this.context.lineTo(this.halfTileWidth, this.tileHeight - 1);
		this.context.lineTo(this.halfTileWidth - 1, this.tileHeight - 1);
		this.context.closePath();
		this.context.fill();
		this.context.restore();
	}
	
	drawImage(xScreen, yScreen, xSprite, ySprite) {
		this.context.drawImage(this.spritesheet, xSprite, ySprite, 64, 64, xScreen, yScreen, 64, 64);
	}
	
	getIsometricCoordsForScreenCoords(xCart, yCart) {
		return {
			x: (xCart - yCart),
			y: (xCart + yCart) / 2
		};
	}
	
	getMapCoordsForCartesianCoords(xCart, yCart) {
		return {
			x: Math.floor(xCart / this.halfTileWidth),
			y: Math.floor(yCart / this.tileHeight)
		};
	}
	
	getMapCoordsForScreenCoords(xScreen, yScreen) {
		return {
			x: Math.floor((xScreen / this.halfTileWidth + yScreen / this.halfTileHeight) / 2),
			y: Math.floor((yScreen / this.halfTileHeight - (xScreen / this.halfTileWidth)) / 2)
		};
	}

	areCoordinateInMapRange(xTile, yTile) {
		return (xTile >= 0) && (yTile >= 0) && (xTile < this.mapWidth) && (yTile < this.mapHeight);
	}
}

new Game().start();