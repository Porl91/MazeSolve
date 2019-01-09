const tileWidth = 64;
const tileHeight = 32;
const halfTileWidth = tileWidth / 2;
const halfTileHeight = tileHeight / 2;
const moveSpeed = 1;
const extraGridPerimeterTiles = 10;

let camera = { x: 0, y: 0 };

let canvas = document.getElementById('output');
canvas.width = 512;
canvas.height = 512;

let context = canvas.getContext('2d');

let keyStates = {};
var sprites;

window.onkeydown = window.onkeyup = function(ev) {
    keyStates[ev.key] = (ev.type == 'keydown');
};

async function loadImage(imagePath) {
    return new Promise(function(resolve, reject) {
        var image = document.createElement('img');
        image.onload = ev => resolve(image);
        image.src = imagePath;
    });
}

async function start() {
    sprites = await loadImage('sprites.png');
    tick();
}

start();

function handleInput() {
    if (keyStates['w']) {
        camera.y -= moveSpeed;
    }
    if (keyStates['s']) {
        camera.y += moveSpeed;
    }
    if (keyStates['a']) {
        camera.x -= moveSpeed;
    }
    if (keyStates['d']) {
        camera.x += moveSpeed;
    }
}

function tick(delta) {
    handleInput();
    drawGrid();
    window.requestAnimationFrame(tick);
}

function drawGrid() {
    context.fillStyle = '#000';
    context.fillRect(0, 0, canvas.width, canvas.height);
    let xTileStart = Math.floor(camera.x / halfTileWidth);
    let yTileStart = Math.floor(camera.y / tileHeight);
    let tilesToRender = [];
    for (let y = yTileStart - extraGridPerimeterTiles; y < yTileStart + extraGridPerimeterTiles + 10; y++) {
        for (let x = xTileStart - extraGridPerimeterTiles; x < xTileStart + extraGridPerimeterTiles + 10; x++) {
            let xScreen = x * halfTileWidth;
            let yScreen = y * tileHeight + (x & 1) * halfTileHeight;
            let map = getMapForScreenCoords(
                xScreen,
                yScreen
            );
            //if ((map.x + map.y) % 4 == 0) {
                drawImage(xScreen - camera.x, yScreen - camera.y - 64);
            //}
            tilesToRender.push({
                xScreen: xScreen - camera.x, 
                yScreen: yScreen - camera.y - 64
            });
            //  else {
            //     let col = '#fff';
            //     if (map.x < 0 || map.y < 0 || map.x > 5 || map.y > 5) {
            //         col = '#0f0';
            //     }
            //     drawTile(xScreen - camera.x, yScreen - camera.y, col);
            // }
        }
    }
    tilesToRender.sort((a, b) => a.yScreen - b.yScreen);

    for (const tile of tilesToRender) {
        drawImage(tile.xScreen, tile.yScreen);
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

function drawImage(x, y) {
    context.drawImage(sprites, 0, 0, 64, 64, x, y, 64, 64);
}

function getMapForScreenCoords(xScreen, yScreen) {
    return {
        x: Math.floor((xScreen / halfTileWidth + yScreen / halfTileHeight) / 2),
        y: Math.floor((yScreen / halfTileHeight - (xScreen / halfTileWidth)) / 2)
    };
}