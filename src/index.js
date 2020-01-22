import Cartography from './libs/cartography';
import pcghash from "./libs/pcghash";



const COLORS = [
	'red', 'green', 'blue', 'yellow', 'gray', 'purple', 'cyan'
];

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
	const p = v.getAllPoints();
	console.log(p);
	for (let i = 0; i < p.length; ++i) {
		await drawCell(context, v, p[i].points, COLORS[p[i].index % COLORS.length]);
	}
}

async function renderView(c, x_rpv, y_rpv) {
	const v = c.computeVoronoiCluster(x_rpv, y_rpv);
	const oCanvas = document.querySelector('canvas');
	const oContext = oCanvas.getContext('2d');


	await drawCells(oContext, v);

	oContext.fillStyle = 'rgba(255, 255, 255, 0.5)';
	const vp = c.view.points();
	const xStart = c.rpg_rpt(c.rpv_rpg(x_rpv));
	const yStart = c.rpg_rpt(c.rpv_rpg(y_rpv));
	oContext.fillRect(
		xStart + c.rpe_rpt(vp[0].x),
		yStart + c.rpe_rpt(vp[0].y),
		c.rpe_rpt(vp[1].x - vp[0].x + 1),
		c.rpe_rpt(vp[1].y - vp[0].y + 1)
	);
	oContext.fillRect(
		c.rpg_rpt(c.rpv_rpg(x_rpv)),
		c.rpg_rpt(c.rpv_rpg(y_rpv)),
		c.rpv_rpg(c.rpg_rpt(1)),
		c.rpv_rpg(c.rpg_rpt(1))
	);
}

async function runCarto() {
	const c = new Cartography();
	c.view.width = 1024;
	c.view.height = 768;
	c.metrics.voronoiClusterSize = 1;
	await renderView(c, 0, 0);
	await renderView(c, 1, 0);
	await renderView(c, 0, 1);
	await renderView(c, 1, 1);
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
}



function main() {
	runCarto();
}


window.addEventListener('load', main);