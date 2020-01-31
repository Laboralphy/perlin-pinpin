import Geometry from './libs/geometry'
import osge from './libs/osge';
import Cartography from './libs/cartography';
import Indicators from './Indicators';
import THINKERS from './thinkers';
import DATA from './data/index';
import * as CARTOGRAPHY_CONSTS from './libs/cartography/consts';

import ImageLoader from './libs/image-loader';

const Vector = Geometry.Vector;
const SpriteLayer = osge.SpriteLayer;
const COLLISION_DISTANCE = 512;

class Game extends osge.Game {
    constructor() {
        super();
        this._lastEntityId = 0;
        this._carto = null;
        this.state = {
        	time: 0,
        	input: {
        		keys: {},
			},
            entities: [],
			player: null,
            view: new Vector()
        };
        this._spriteLayer = null;
        this._collidingEntities = [];
    }

    get carto() {
    	return this._carto;
	}

	onClick(event) {
		let p = this.mouse.add(this.carto._view);
    	if (event.shiftKey) {
			this.state.player.data.input.fire = new Vector(p);
		} else {
			this.state.cursor.data.position.set(p);
			this.state.player.data.destination.set(p);
		}
	}

	onKeyUp(event) {
		this.state.input.keys[event.keys] = true;
	}

	onKeyDown(event) {
		this.state.input.keys[event.keys] = false;
	}

	processThinker(entity) {
		this.processCollidingSprites(entity);
		entity.thinker.think(entity);
		entity.data.thought = true;
		entity.sprite.visible = true;
    }

	async createEntity(sResRef, vPosition) {
    	let bp0 = DATA['blueprints/' + sResRef];
    	if (bp0 === undefined) {
    		throw new Error('this blueprint does not exist : "' + sResRef + '"');
		}
    	let blueprint = Object.assign({
			"angle": 0,                   // angle de cap
			"angleSpeed": 0,              // amplitude d emofication de l'angle
			"position": new Vector(vPosition.x, vPosition.y),     // position actuelle
			"destination": new Vector(),  // position vers laquelle on se dirige
			"enginePower": 0,             // inc/dec de la vitesse du moteur
			"speed": 0,                   // vitesse actuelle
			"maxSpeed": 0,                // vitesse max
			"sprite": Object.assign({}, DATA['tiles/' + bp0.tileset]),
			"thinker": "",
			"repulse": new Vector(),
			"sector": {
				x: 0,
				y: 0
			},
			"input": {
				"keys": {},
			}
		}, bp0);
    	blueprint.sprite.ref = new Vector(blueprint.sprite.ref.x, blueprint.sprite.ref.y);
		let id = ++this._lastEntityId;
		let sprite = new osge.Sprite();
		await sprite.define(blueprint.sprite);
		sprite.z = bp0.z || 0;
		if (!(blueprint.thinker in THINKERS)) {
			throw new Error('this thinker does not exist : "' + blueprint.thinker);
		}
		const oThinker = THINKERS[blueprint.thinker];

		let oEntity = {
			id,
			sprite,
            thinker: oThinker,
			data: blueprint,
			game: this
		};
		return oEntity;
	}

	linkEntity(entity) {
		this._spriteLayer.add(entity.sprite);
		this.state.entities.push(entity);
		if (entity.data.collision === 1) {
			this._collidingEntities.push(entity);
		}
		return entity;
	}

	destroyEntity(entity) {
    	let i = this.state.entities.indexOf(entity);
		if (i >= 0) {
			this.state.entities.splice(i, 1);
		}
		this._spriteLayer.remove(entity.sprite);
		if (entity.data.collision === 1) {
			i = this._collidingEntities.indexOf(entity);
			if (i >= 0) {
				this._collidingEntities.splice(i, 1);
			}
		}
	}


    async init() {
        await super.init();

		const oCanvas = document.querySelector('canvas');
		const oContext = oCanvas.getContext('2d');

		this.canvas(oCanvas);

		oContext.fillStyle = 'rgb(0, 0, 0)';
		oContext.fillRect(0, 0, oCanvas.width, oCanvas.height);

		const c = new Cartography({
			seed: 0,
			preload: 2,
			palette: DATA.palette,
			cellSize: 25,
			tileSize: 256,
			worker: '../dist/worker.js',
			brushes: DATA.brushes,
			names: DATA.towns_fr,
			physicGridSize: 16,
			scale: 2
		});

		this._carto = c;
		this._spriteLayer = new SpriteLayer();


		const vView = new Vector(0, 0);
		await c.start();

		// il faut trouver le point de départ du sprite-joueur
		const oStartingTile = await c.findTile(CARTOGRAPHY_CONSTS.FIND_TILE_COAST_NEAR_DIRECTION, {x: 0, y: 0, a: 4});

        // création du joueur
		this.state.player = await this.createEntity(
			'blimp',
			new Vector(oStartingTile.x * 256, oStartingTile.y * 256)
		); // link below
		this.linkEntity(this.state.player);
		this.domevents.on(oCanvas, 'click', event => this.onClick(event));
		this.domevents.on(document, 'keydown', event => this.onKeyUp(event));
		this.domevents.on(document, 'keyup', event => this.onKeyDown(event));

        // création du sprite curseur de destination
		this.state.cursor = await this.createEntity('cursor', new Vector(0, 0));
		this.linkEntity(this.state.cursor);
    }

    sortSprite(e1, e2) {
		const z = e1.z - e2.z;
		return z === 0
			? e1.position.y - e2.position.y
			: z;
	}

	/**
	 * renvoie la liste des entités qui sont pas loin de l'entité spécifiée
	 * @param entity
	 */
	processCollidingSprites(entity) {
		if (entity.data.collision !== 1) {
			return;
		}
		const entitySector = entity.data.sector;
		const xm = entitySector.x;
		const ym = entitySector.y;
		const xEnt = entity.data.position.x;
		const yEnt = entity.data.position.y;
		const aColliders = this._collidingEntities.filter(e => {
			if (e.data.collision !== 1) throw "WTF";
			if (e === entity) {
				return false;
			} else {
				const otherSector = e.data.sector;
				const xe = otherSector.x;
				const ye = otherSector.y;
				return Math.abs(xm - xe) <= 1 &&
					Math.abs(ym - ye) <= 1 &&
					Geometry.Helper.squareDistance(
						xEnt,
						yEnt,
						e.data.position.x,
						e.data.position.y,
					) < COLLISION_DISTANCE;
			}
		});
		const repulse = entity.data.repulse;
		const pEntity = entity.data.position;
		aColliders.forEach(other => {
			const pOther = other.data.position;
			let r;
			if (pOther.x === pEntity.x && pOther.y === pEntity.y) {
				r = new Vector(1, 0);
			} else {
				r = pOther.sub(pEntity).scale(0.1);
			}
			repulse.translate(r.neg());
			other.data.repulse.translate(r);
		});
	}

    update() {
        super.update();
        let state = this.state;
        let entities = state.entities;
		entities.forEach(th => {
			th.data.repulse.set(0, 0);
		});
		entities.forEach(th => {
			this.processThinker(th)
		});
        // tous les sprites doivent etre relatifs à ce point de vue
		let p = state.player.data.position;
		entities.forEach(e => {
			e.sprite.position.set(e.data.position.sub(p));
		});
		++this.state.time;
		state.player.sprite.position.set(0, 0);
		state.view.set(p);
    }

    render() {
    	const v = this.state.view;
    	const c = this.carto;
		c.view(this.renderCanvas, v);
		c.renderTiles();
		this._spriteLayer.sort(this.sortSprite);
    	super.render();
	}
}

export default Game;