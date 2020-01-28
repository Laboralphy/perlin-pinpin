import Cartography from './libs/cartography';
import {Vector} from './libs/geometry';

async function runCarto() {
	const oCanvas = document.querySelector('canvas');
	const oContext = oCanvas.getContext('2d');

	oContext.fillStyle = 'rgb(0, 0, 0)';
	oContext.fillRect(0, 0, oCanvas.width, oCanvas.height);

	const c = new Cartography({
		seed: 0,
		palette: 'assets/data/palette.json',
		cellSize: 25,
		tileSize: 128,
		worker: '../dist/worker.js',
		brushes: 'assets/data/brushes.json',
		names: 'assets/data/town-fr.json'
	});

	const vView = new Vector(0, 0);

	await c.start();
	await c.view(oCanvas, vView,true);
}

function main() {
	runCarto();
}


window.addEventListener('load', main);