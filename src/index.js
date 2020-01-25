import Cartography from './libs/cartography';
import Random from "./libs/random";
import Perlin from "./libs/perlin";
import Rainbow from "./libs/rainbow";
import PixelProcessor from "./libs/pixel-processor";

const COLORS = {
	abyss: '#dec673',
	depth: '#efd69c',
	shallow: '#d6a563',
	shore: '#572507',
	land: '#d2a638',
	highland: '#b97735',
	summit: '#efce8c'
};

function _buildGradient(oPalette) {
	return Rainbow.gradient({
		0: oPalette.abyss,
		40: oPalette.depth,
		48: oPalette.shallow,
		50: oPalette.shore,
		55: oPalette.land,
		75: oPalette.highland,
		99: oPalette.summit
	})
		.map(x => Rainbow.parse(x))
		.map(x => x.r | x.g << 8 | x.b << 16 | 0xFF000000);
}

function _buildGradientRGB(oPalette) {
	return Rainbow.gradient({
		0: oPalette.abyss,
		40: oPalette.depth,
		48: oPalette.shallow,
		50: oPalette.shore,
		55: oPalette.land,
		75: oPalette.highland,
		99: oPalette.summit
	})
		.map(x => Rainbow.parse(x));
}

const PALETTE = _buildGradient(COLORS);
const PALETTE_RPB = _buildGradientRGB(COLORS);


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
		await drawCell(context, v, p[i].points, PALETTE_RPB[p[i].index % PALETTE_RPB.length]);
	}
}


function drawStructure(structure) {
	const oCanvas = document.querySelector('canvas');
	const oContext = oCanvas.getContext('2d');
	console.log(structure);
	structure.cells.forEach(m => {
		const cvs = document.createElement('canvas');
		cvs.width = cvs.height = m.size;
		const ctx = cvs.getContext('2d');
		PixelProcessor.process(cvs, pp => {
			const fHeight = m.heightmap[pp.y][pp.x];
			let oColor = PALETTE_RPB[Math.min(PALETTE_RPB.length - 1, fHeight * PALETTE_RPB.length | 0)];
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


function createTileCanvas(heightmap) {
	const cvs = document.createElement('canvas');
	cvs.width = cvs.height = heightmap.length;
	const ctx = cvs.getContext('2d');
	PixelProcessor.process(cvs, pp => {
		const fHeight = heightmap[pp.y][pp.x];
		let oColor = PALETTE_RPB[Math.min(PALETTE_RPB.length - 1, fHeight * PALETTE_RPB.length | 0)];
		if (fHeight < 0) {
			pp.color.a = 0;
		} else {
			pp.color.r = oColor.r;
			pp.color.g = oColor.g;
			pp.color.b = oColor.b;
			pp.color.a = 255;
		}
	});
	return cvs;
}



async function runCarto() {
	const oCanvas = document.querySelector('canvas');
	const oContext = oCanvas.getContext('2d');
	oContext.fillStyle = 'rgb(0, 0, 0)';
	oContext.fillRect(0, 0, oCanvas.width, oCanvas.height);

	const c = new Cartography({
		seed: 0,
		PALETTE: PALETTE
	});
	c.view.width = 1024;
	c.view.height = 768;
	c.metrics.voronoiCellSize = 25;
	c.metrics.voronoiClusterSize = 4;

	let structure = c.computeVoronoiHeightMap(0, 1);

	drawStructure(structure);

	const drawTile = (xTile, yTile, xCanvas, yCanvas) => new Promise(resolve => {
		const {heightmap} = c.computeTile(xTile, yTile);
		const cvs = createTileCanvas(heightmap);
		requestAnimationFrame(() => {
			oContext.drawImage(cvs, xCanvas, yCanvas);
			resolve(true);
		});
	});

	oCanvas.addEventListener('click', async oEvent => {
		const x = oEvent.offsetX;
		const y = oEvent.offsetY;

		for (let yi = -2; yi <= 3; ++yi) {
			for (let xi = -3; xi <= 3; ++xi) {
				await drawTile(x + xi, y + yi, xi * 128 + 512 , yi * 128 + 256);
			}
		}
	});
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