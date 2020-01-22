import Voronoi from './libs/voronoi';
import Perlin from './libs/perlin';
import Rainbow from './libs/rainbow';
import Random from './libs/random';
import PixelProcessor from './libs/pixel-processor';
import pcghash from './libs/pcghash';


const COLORS = [
	'red', 'green', 'blue', 'yellow', 'gray', 'purple', 'cyan'
];


function debugVoronoi(context, v, index) {
	const pVor = v.germs[index];
	console.log(pVor);

	context.strokeStyle = '#CCC';
	let xMin = pVor.region[0].x;
	let yMin = pVor.region[0].y;
	let xMax = pVor.region[1].x;
	let yMax = pVor.region[1].y;
	context.strokeRect(xMin, yMin, xMax - xMin + 1, yMax - yMin + 1);

	context.fillStyle = 'red';
	context.fillRect(pVor.x, pVor.y, 2, 2);

	pVor.nearest.forEach(n => {
		context.fillStyle = 'blue';
		context.fillRect(n.x, n.y, 2, 2);
		context.fillStyle = '#070';
		const m = n.median;
		context.fillRect(m.x, m.y, 2, 2);
	});
}

function drawCell(context, v, index) {
	return new Promise((resolve, reject) => {
		const aPoints = v.getCellPoints(index);
		const g = v.germs[index];
		const h = Math.abs(pcghash(g.x, g.y));
		const sColor = COLORS[h % COLORS.length];
		requestAnimationFrame(() => {
			aPoints.forEach(({x, y, d}) => {
				context.fillStyle = sColor;
				context.fillRect(x, y, 1, 1);
				context.fillStyle = 'rgba(0, 0, 0, ' + d + ')';
				context.fillRect(x, y, 1, 1)
			});
			resolve(true);
		});
	});
}

async function drawCells(context, v) {
	for (let i = 0; i < v.germs.length; ++i) {
		await drawCell(context, v, i);
	}
}


function runVoronoi() {
	const oCanvas = document.querySelector('#canvas');
	const oContext = oCanvas.getContext('2d');
	oContext.fillStyle = '#CCC';

	const v = new Voronoi();
	const AMP = 8;

	for (let y = 0; y < 6; ++y) {
		for (let x = 0; x < 4; ++x) {

			const xOfs = Math.floor(Math.random() * AMP * 2 - AMP);
			const yOfs = Math.floor(Math.random() * AMP * 2 - AMP);
			if (y % 2 === 0) {
				v.addPoint(x * 50 + xOfs, y * 50 + yOfs, x >= 0 && y >= 0 && x <= 10 && y <= 10);
			} else {
				v.addPoint(x * 50 + 25 + xOfs, y * 50 + yOfs, x >= 0 && y >= 0 && x <= 10 && y <= 10);
			}
		}
	}

	v.computeNearest(6);

	drawCells(oContext, v);

	console.log('done');
}

function generateWhiteNoise(w, h) {
	let r, a = [], rand = new Random();
	for (let x, y = 0; y < h; ++y) {
		r = [];
		for (x = 0; x < w; ++x) {
			r[x] = rand.rand();
		}
		a[y] = r;
	}
	return a;
}


function runPerlin() {
	const oCanvas = document.querySelector('#canvas');
	const oContext = oCanvas.getContext('2d');
	const p = new Perlin();
	const wn = generateWhiteNoise(64, 64);
	const pn = Perlin.generate(wn, 6);
	const gradient = Rainbow.gradient({
		0: '#004',
		25: 'blue',
		50: 'cyan',
		60: 'yellow',
		75: 'green',
		95: 'gray',
		100: 'white'
	}).map(c => Rainbow.parse(c));
	console.log(gradient);
	const gd = Perlin.colorize(pn, gradient);
	PixelProcessor.process(oCanvas, ({x, y, color}) => {
		if (x < 64 && y < 64) {
			const c = gd[y * 64 + x];
			color.r = c.r;
			color.g = c.g;
			color.b = c.b;
			color.a = 255;
		}

		// color.a missing ?
		// color.a bad range value ?
		// bad parameter destructuration
		// bad graphic data format
		// color.a bad range value ?
		// ignorage de gradient (recalcul)

	});
}

window.addEventListener('load', runVoronoi);
