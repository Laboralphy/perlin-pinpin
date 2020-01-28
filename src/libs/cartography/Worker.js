import WorldGenerator from './WorldGenerator';
import Webworkio from 'webworkio';
import {fetchJSON} from'../fetch-json';
import Names from '../names';

class Worker {
    async actionInit(options) {

        const palette = await fetchJSON(options.palette);
        const names = await fetchJSON(options.names);

        this._wg = new WorldGenerator({
            seed: options.seed,
            palette,
            cache: 256,
            tileSize: 128,
            vorCellSize: 25,
            vorClusterSize: 4,
            names
        });
    }

    actionOptions(options) {
        console.log('worker options', options);
    }

    constructor() {
        this._wg = null;
        let wwio = new Webworkio();
        wwio.worker();

        wwio.on('init', async (options, cb) => {
            this.actionInit(options);
            cb(true);
        });

        wwio.on('options', (options) => {
            this.actionOptions(options);
        });

        wwio.on('tile', ({x, y}, cb) => {
            cb({ tile: this._wg.computeTile(x, y) });
        });

        this._wwio = wwio;
    }
}

export default Worker;
