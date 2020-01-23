import Cartography from './libs/cartography';
import Random from "./libs/random";
import Perlin from "./libs/perlin";
import Rainbow from "./libs/rainbow";
import PixelProcessor from "./libs/pixel-processor";


const COLORS = Rainbow.gradient({
	0: '#006',
	15: 'blue',
	20: 'cyan',
	25: 'yellow',
	75: 'green',
	95: 'gray',
	100: 'white'
}).map(c => Rainbow.parse(c));

function drawCell(context, v, points, sColor) {
	return new Promise((resolve, reject) => {
		requestAnimationFrame(() => {
			points.forEach(({x, y, d}) => {
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
	const p = v.germs;
	for (let i = 0; i < p.length; ++i) {
		await drawCell(context, v, p[i].points, COLORS[p[i].index % COLORS.length]);
	}
}


function drawStructure(structure) {
	const oCanvas = document.querySelector('canvas');
	const oContext = oCanvas.getContext('2d');

	structure.maps.forEach(m => {
		const cvs = document.createElement('canvas');
		cvs.width = cvs.height = m.size;
		const ctx = cvs.getContext('2d');
		PixelProcessor.process(cvs, pp => {
			const fHeight = m.map[pp.y][pp.x];
			let oColor = COLORS[Math.min(COLORS.length - 1, fHeight * COLORS.length | 0)];
			//pp.color.r =pp.color.g =pp.color.b =pp.color.a = 255;
			if (fHeight < 0) {
				pp.color.a = 0;
			} else {
				pp.color.r = oColor.r;
				pp.color.g = oColor.g;
				pp.color.b = oColor.b;
				pp.color.a = 255;
			}
		});
		oContext.drawImage(cvs, m.offset.x, m.offset.y);
	});
}

async function runCarto() {
	const oCanvas = document.querySelector('canvas');
	const oContext = oCanvas.getContext('2d');
	oContext.fillStyle = 'rgb(0, 0, 0)';
	oContext.fillRect(0, 0, oCanvas.width, oCanvas.height);

	const c = new Cartography();
	c.view.width = 1024;
	c.view.height = 768;
	c.metrics.voronoiCellSize = 25;
	c.metrics.voronoiClusterSize = 4;

	let structure = c.computeBaseHeightMap(0, 0);

	drawStructure(structure);

	structure = c.computeBaseHeightMap(1, 0);

	drawStructure(structure);

	structure = c.computeBaseHeightMap(1, 1);

	drawStructure(structure);

	structure = c.computeBaseHeightMap(0, 1);

	drawStructure(structure);



	/*
	structure.maps.forEach(m => {
		const cvs = document.createElement('canvas');
		cvs.width = cvs.height = m.size;
		const ctx = cvs.getContext('2d');
		PixelProcessor.process(cvs, pp => {
			const fHeight = m.map[pp.y][pp.x];
			pp.color.r = pp.color.g = pp.color.b = pp.color.a = fHeight * 255 | 0;
		});
		ctx.drawImage(cvs, m.offset.x, m.offset.y);
		ctx.strokeStyle = 'rgba(255, 128, 128, 0.5)';
		ctx.strokeRect(0, 0, m.size, m.size);
	});

	 */


	/*

	await renderView(c, 2, 0);
	await renderView(c, 2, 1);
	await renderView(c, 3, 0);
	await renderView(c, 3, 1);
	await renderView(c, 4, 0);
	await renderView(c, 4, 1);
	await renderView(c, 5, 0);
	await renderView(c, 5, 1);
	await renderView(c, 6, 0);
	await renderView(c, 6, 1);

	 */


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
	const w = 80;
	const h = 80;
	const wn = generateWhiteNoise(w, h);
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
	const gd = Perlin.colorize(pn, gradient);
	PixelProcessor.process(oCanvas, ({x, y, color}) => {
		if (x < w && y < h) {
			const c = gd[y * w + x];
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


function main() {
	runCarto();
}


window.addEventListener('load', main);