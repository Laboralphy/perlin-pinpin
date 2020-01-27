import Cartography from './libs/cartography';
import TileRenderer from "./libs/cartography/TileRenderer";
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


// function drawCell(context, v, points, sColor) {
// 	return new Promise((resolve, reject) => {
// 		requestAnimationFrame(() => {
// 			points.forEach(({x, y, d}) => {
// 				context.fillStyle = sColor;
// 				context.fillRect(x, y, 1, 1);
// 				context.fillStyle = 'rgba(0, 0, 0, ' + d + ')';
// 				context.fillRect(x, y, 1, 1)
// 			});
// 			resolve(true);
// 		});
// 	});
// }
//
// async function drawCells(context, v) {
// 	const p = v.germs;
// 	for (let i = 0; i < p.length; ++i) {
// 		await drawCell(context, v, p[i].points, PALETTE_RPB[p[i].index % PALETTE_RPB.length]);
// 	}
// }


// function createTileCanvas(colorMap) {
// 	const cvs = document.createElement('canvas');
// 	cvs.width = cvs.height = colorMap.length;
// 	const ctx = cvs.getContext('2d');
// 	PixelProcessor.process(cvs, pp => {
// 		const nColor = colorMap[pp.y][pp.x];
// 		if (nColor < 0) {
// 			pp.color.a = 0;
// 		} else {
// 			let oColor = Rainbow.parse(nColor);
// 			pp.color.r = oColor.r;
// 			pp.color.g = oColor.g;
// 			pp.color.b = oColor.b;
// 			pp.color.a = 255;
// 		}
// 	});
// 	return cvs;
// }


function drawStructure(structure) {
	const oCanvas = document.querySelector('canvas');
	const oContext = oCanvas.getContext('2d');
	structure.cells.forEach(m => {
		const cvs = document.createElement('canvas');
		cvs.width = cvs.height = m.size;
		const ctx = cvs.getContext('2d');
		PixelProcessor.process(cvs, pp => {
			const fHeight = m.heightMap[pp.y][pp.x];
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



async function runCarto() {

	const oCanvas = document.querySelector('canvas');
	const oContext = oCanvas.getContext('2d');
	oContext.fillStyle = 'rgb(0, 0, 0)';
	oContext.fillRect(0, 0, oCanvas.width, oCanvas.height);

	const c = new Cartography({
		seed: 0,
		palette: PALETTE,
		vorCellSize: 25,
		vorClusterSize: 4,
		tileSize: 128
	});
	const tr = new TileRenderer({
		size: 128
	});
	console.log('loading sceneries');
	try {
		await tr.loadSceneries({
			s11: 'assets/graphics/sceneries/s-wave-1.png',
			s23: 'assets/graphics/sceneries/s-grass-1.png',
			s33: 'assets/graphics/sceneries/s-tree-1.png',
			s55: 'assets/graphics/sceneries/s-mountain-1.png'
		});
	} catch (e) {
		console.error(e.message);
	}

	console.log('loading sceneries : done');
	c.view.width = 1024;
	c.view.height = 768;

	let structure = c.computeVoronoiHeightMap(0, 1);

	drawStructure(structure);

	const drawTile = (xTile, yTile, xCanvas, yCanvas) => new Promise(resolve => {
		const oTileData = c.computeTile(xTile, yTile);
		tr.render(oTileData);
		requestAnimationFrame(() => {
			// oContext.strokeStyle = 'red';
			// oContext.strokeRect(xCanvas, yCanvas, 128, 128);
			oContext.drawImage(tr.canvas, xCanvas, yCanvas);
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

function main() {
	runCarto();
}


window.addEventListener('load', main);