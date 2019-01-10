Array.prototype.shuffle = function() {
    for (let i = this.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this[i], this[j]] = [this[j], this[i]];
    }
};

const tileWidth = 64;
const tileHeight = 32;
const halfTileWidth = tileWidth / 2;
const halfTileHeight = tileHeight / 2;
const moveSpeed = 0.05;
const extraGridPerimeterTiles = 10;

let camera = { x: 0, y: 0 };
let player = { x: 0, y: 0 };

let canvas = document.getElementById('output');
canvas.width = 1024;
canvas.height = 576;

let context = canvas.getContext('2d');

let keyStates = {};
var sprites;

const mapWidth = 100;
const mapHeight = 100;
var map = [[]];

window.onkeydown = window.onkeyup = function (ev) {
	keyStates[ev.key] = (ev.type == 'keydown');
};

async function loadImage(imagePath) {
	return new Promise(function (resolve, reject) {
		var image = document.createElement('img');
		image.onload = ev => resolve(image);
		image.src = imagePath;
	});
}

function initMap() {
	for (let y = 0; y < mapHeight; y++) {
		map[y] = map[y] || [];
		for (let x = 0; x < mapWidth; x++) {
			map[y][x] = 1;
			// map[y][x] = (x < 1 || y < 1 || x >= mapWidth - 1 || y >= mapHeight - 1) ;//Math.random() > 0.9 ? 1 : 0;
		}
	}
	map[0][0] = 0;
	let visitedCells = {};
	var current = { x: 0, y: 0, xPartition: 0, yPartition: 0, parent: null };
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
			if ((frontier.x < 0) || (frontier.y < 0) || (frontier.x >= mapWidth) || (frontier.y >= mapHeight) || visitedCells[frontier.x + ':' + frontier.y]) {
				continue;
			}
			nextFrontier = frontier;
		}
		if (nextFrontier == null) {
			current = current.parent;
			continue;
		}
		map[nextFrontier.y][nextFrontier.x] = 0;
		map[nextFrontier.yPartition][nextFrontier.xPartition] = 0;
		current = nextFrontier;
	}

	// Clear out the starting zone.
	map[1][1] = map[0][1] = map[1][0] = 0;
}

async function start() {
	sprites = await loadImage('sprites.png');
	initMap();
	tick();
}

start();

function handleInput() {
	// Camera
	if (keyStates['w']) {
		camera.y -= moveSpeed * 50;
	}
	if (keyStates['s']) {
		camera.y += moveSpeed * 50;
	}
	if (keyStates['a']) {
		camera.x -= moveSpeed * 50;
	}
	if (keyStates['d']) {
		camera.x += moveSpeed * 50;
	}

	var xMove = 0;
	var yMove = 0;

	// Player
	if (keyStates['ArrowUp']) {
		yMove -= moveSpeed;
	}
	if (keyStates['ArrowDown']) {
		yMove += moveSpeed;
	}
	if (keyStates['ArrowLeft']) {
		xMove -= moveSpeed;
	}
	if (keyStates['ArrowRight']) {
		xMove += moveSpeed;
	}

	// Needs to be smaller than the unit length blocks to avoid getting stuck.
	// TODO: Stick this on the Player object as (width, height).
	const playerSize = 0.9;

	let x0 = Math.floor((player.x + xMove));
	let x1 = Math.floor((player.x + xMove + playerSize));
	let y0 = Math.floor((player.y + yMove));
	let y1 = Math.floor((player.y + yMove + playerSize));

	// TODO: Collisions with entities.
	function doesIntersect(box0, box1) {
		return !((box0.x + box0.w < box1.x) // Box 0 is left of Box 1
			|| (box0.x > box1.x + box1.w) // Box 0 is right of Box 1
			|| (box0.y + box0.h < box1.y) // Box 0 is above of Box 1
			|| (box0.y > box1.y + box1.h)); // Box 0 is below of Box 1
	}

	var hasIntersected = false;
	for (let y = y0; y <= y1; y++) {
		for (let x = x0; x <= x1; x++) {
			if (!areCoordinateInMapRange(x, y) || (map[y][x] != 0)) {
				hasIntersected = true;
				break;
			}
		}
	}

	if (!hasIntersected) {
		player.x += xMove;
		player.y += yMove;
	}
}

function tick(delta) {
	handleInput();
	drawGrid();
	window.requestAnimationFrame(tick);
}

function areCoordinateInMapRange(xTile, yTile) {
	return (xTile >= 0) && (yTile >= 0) && (xTile < mapWidth) && (yTile < mapHeight);
}

function drawGrid() {
	context.fillStyle = '#000';
	context.fillRect(0, 0, canvas.width, canvas.height);
	let xTileStart = Math.floor(camera.x / halfTileWidth);
	let yTileStart = Math.floor(camera.y / tileHeight);
	let horizontalTiles = canvas.width / halfTileWidth;
	let verticalTiles = canvas.height / tileHeight;
	let sprites = [];
	for (let y = yTileStart - extraGridPerimeterTiles; y < yTileStart + verticalTiles + extraGridPerimeterTiles + 10; y++) {
		for (let x = xTileStart - extraGridPerimeterTiles; x < xTileStart + horizontalTiles + extraGridPerimeterTiles + 10; x++) {
			let xScreen = x * halfTileWidth;
			let yScreen = y * tileHeight + (x & 1) * halfTileHeight;
			let mapCoords = getMapCoordsForScreenCoords(xScreen, yScreen);
			if (areCoordinateInMapRange(mapCoords.x, mapCoords.y) && (map[mapCoords.y][mapCoords.x] == 1)) {
				sprites.push({
					xScreen: xScreen,
					yScreen: yScreen,
					xSprite: 0,
					ySprite: 0
				});
			}
		}
	}

	let iso = getIsometricCoordsForScreenCoords(player.x, player.y);
	sprites.push({
		xScreen: iso.x * halfTileWidth,
		yScreen: iso.y * tileHeight,
		xSprite: 64,
		ySprite: 0
	});

	sprites.sort((a, b) => a.yScreen - b.yScreen);

	for (const sprite of sprites) {
		drawImage(sprite.xScreen - camera.x, sprite.yScreen - camera.y, sprite.xSprite, sprite.ySprite);
	}
}

function drawTile(x, y, colour) {
	context.fillStyle = colour;
	context.save();
	context.translate(x, y);
	context.beginPath();
	context.moveTo(0, halfTileHeight - 1);
	context.lineTo(halfTileWidth - 1, 0);
	context.lineTo(halfTileWidth, 0);
	context.lineTo(halfTileWidth + 1, 0);
	context.lineTo(tileWidth, halfTileHeight - 1);
	context.lineTo(halfTileWidth + 1, tileHeight - 1);
	context.lineTo(halfTileWidth, tileHeight - 1);
	context.lineTo(halfTileWidth - 1, tileHeight - 1);
	context.closePath();
	context.fill();
	context.restore();
}

function drawImage(xScreen, yScreen, xSprite, ySprite) {
	context.drawImage(sprites, xSprite, ySprite, 64, 64, xScreen, yScreen, 64, 64);
}

function getIsometricCoordsForScreenCoords(xCart, yCart) {
	return {
		x: (xCart - yCart),
		y: (xCart + yCart) / 2
	};
}

function getMapCoordsForCartesianCoords(xCart, yCart) {
	return {
		x: Math.floor(xCart / halfTileWidth),
		y: Math.floor(yCart / tileHeight)
	};
}

function getMapCoordsForScreenCoords(xScreen, yScreen) {
	return {
		x: Math.floor((xScreen / halfTileWidth + yScreen / halfTileHeight) / 2),
		y: Math.floor((yScreen / halfTileHeight - (xScreen / halfTileWidth)) / 2)
	};
}