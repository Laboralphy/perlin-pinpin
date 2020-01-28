import WorldGenerator from './WorldGenerator';
import Webworkio from 'webworkio';
import {fetchJSON} from'../fetch-json';
import Names from '../names';

class Worker {
    /**
     * Initialisation des options
     * palette {url}
     * names {url}
     * seed {number}
     *
     * @param options
     * @returns {Promise<void>}
     */
    async actionInit({
        palette,
        names,
        seed,
        cache,
        tileSize,
        vorCellSize,
        vorClusterSize
    }) {

        const aPalette = await fetchJSON(palette);
        const aNames = await fetchJSON(names);

        this._wg = new WorldGenerator({
            seed,
            palette: aPalette,
            cache,
            tileSize,
            vorCellSize,
            vorClusterSize,
            names: aNames
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
