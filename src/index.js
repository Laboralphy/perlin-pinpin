import Voronoi from './voronoi'


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
		context.fillStyle = COLORS[index % COLORS.length];
		requestAnimationFrame(() => {
			aPoints.forEach(({x, y}) => context.fillRect(x, y, 1, 1));
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
	const AMP = 9;

	for (let y = -1; y < 11; ++y) {
		for (let x = -1; x < 11; ++x) {

			const xOfs = Math.random() * AMP * 2 - AMP;
			const yOfs = Math.random() * AMP * 2 - AMP;
			if (y % 2 === 0) {
				v.addPoint(x * 50 + xOfs, y * 50 + yOfs, x >= 0 && y >= 0 && x <= 10 && y <= 10);
			} else {
				v.addPoint(x * 50 + 25 + xOfs, y * 50 + yOfs, x >= 0 && y >= 0 && x <= 10 && y <= 10);
			}
		}
	}

	v.computeNearest(6);



	//const aPoints = v.getCellPoints(55);
	//console.log(aPoints);

	drawCells(oContext, v);

	//aPoints.forEach(p => oContext.fillRect(p.x, p.y, 1, 1));

	console.log('done');
}

window.addEventListener('load', index);
