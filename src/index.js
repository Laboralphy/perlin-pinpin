import Cartography from './libs/cartography';
import {Vector} from './libs/geometry';

async function runCarto() {
	const oCanvas = document.querySelector('canvas');
	const oContext = oCanvas.getContext('2d');

	oContext.fillStyle = 'rgb(0, 0, 0)';
	oContext.fillRect(0, 0, oCanvas.width, oCanvas.height);

	const c = new Cartography({
		seed: 0,
		preload: 0,
		palette: document.baseURI + 'assets/data/palette.json',
		cellSize: 25,
		tileSize: 256,
		worker: '../dist/worker.js',
		brushes: document.baseURI + 'assets/data/brushes.json',
		names: document.baseURI + 'assets/data/towns-fr.json',
		scale: 2
	});

	const vView = new Vector(-1792, 0);

	await c.start();
	await c.view(oCanvas, vView,true);

	document.addEventListener('keydown', event => {
		let b = false;
		console.log(event.key);
		switch (event.key) {
			case 'ArrowRight':
				vView.x += 24;
				b = true;
				break;

			case 'ArrowLeft':
				vView.x -= 24;
				b = true;
				break;

			case 'ArrowUp':
				vView.y -= 24;
				b = true;
				break;

			case 'ArrowDown':
				vView.y += 24;
				b = true;
				break;
		}
		if (b) {
			c.view(oCanvas, vView);
			c.renderTiles();
		}
	})
}

function main() {
	runCarto();
}


window.addEventListener('load', main);