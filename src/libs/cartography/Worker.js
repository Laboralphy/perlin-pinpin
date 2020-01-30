import WorldGenerator from './WorldGenerator';
import Webworkio from 'webworkio';
import {fetchJSON} from'../fetch-json';
import Names from '../names';

class Worker {

    log(...args) {
        console.log('[ww]', ...args);
    }

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
        vorClusterSize,
        scale
    }) {
      this.log('fetching palette', palette);
      const aPalette = await fetchJSON(palette);
      this.log('fetching names', names);
      const aNames = await fetchJSON(names);

      this.log('creating world generator');
      this._wg = new WorldGenerator({
        seed,
        palette: aPalette,
        cache,
        tileSize,
        vorCellSize,
        vorClusterSize,
        names: aNames,
        scale
      });
      return true;
    }

    actionOptions(options) {
        console.log('worker options', options);
    }

    constructor() {
        this._wg = null;
        let wwio = new Webworkio();
        wwio.worker();
        wwio.on('init', async (options, cb) => {
          try {
            await this.actionInit(options);
            cb({status: 'done'});
          } catch (e) {
            cb({status: 'error', error: e.message});
          }
        });

        wwio.on('options', (options) => {
            this.actionOptions(options);
        });

        wwio.on('tile', ({x, y}, cb) => {
            cb(this._wg.computeTile(x, y));
        });

        this._wwio = wwio;
    }
}

export default Worker;
