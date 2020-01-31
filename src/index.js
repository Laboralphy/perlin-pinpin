import Game from './Game';

async function main() {
	const g = new Game();
	await g.init();
	g.start();
	window.GAME = g;
}


window.addEventListener('load', main);