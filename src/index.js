import Voronoi from './libs/voronoi';
import pcg from './libs/pcg';


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
		const h = Math.abs(pcg(g.x, g.y));
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


function index() {
	const oCanvas = document.querySelector('#canvas');
	const oContext = oCanvas.getContext('2d');
	oContext.fillStyle = '#CCC';
	
	const v = new Voronoi();
	const AMP = 8;

	for (let y = -3; y < 13; ++y) {
		for (let x = -3; x < 13; ++x) {

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

	//aPoints.forEach(p => oContext.fillRect(p.x, p.y, 1, 1));
/*
	const aTest = [];
	for (let y = 0; y < 10; ++y) {
		const row = [];
		for (let x = 0; x < 10; ++x) {
			 row.push(pcg(x, y, 777));
		}
		aTest.push(row);
	}

	console.log(aTest);
*/
	console.log('done');
}

window.addEventListener('load', index);
