import Random from "../random";
import CharRegistry from './CharRegistry';

const MAX_TRIES = 1024;

class NameCrafter {

    constructor() {
        this._pattern = 3;
        this._initReg = new CharRegistry();
        this._finalReg = {};
        this._midReg = {};
        this._random = new Random();
        this._list = null;
    }

    /**
     * reglages initiaux (a faire avant setList)
     * - pattern : longueurs des pattern, conditionne la ressemblance des mots généré avec les mot de la liste
     *      = 1: les mots générés ne ressemble pas trop à ceux de la liste, mais c'est le seul moyen d'en avoir si la liste est court
     *      = 2: les mots générés ressemblent à ceux de la liste
     *      = 3: idéal pour les liste très grandes
     */

    get pattern() {
        return this._pattern;
    }

    set pattern(value) {
        if (this._list === null) {
            this._pattern = value;
        } else {
            throw new Error('name crafter : the pattern value must be set before the list property');
        }
    }

    get random() {
        return this._random;
    }

    set random(value) {
        this._random = value;
    }

    get list() {
        return this._list;
    }

    set list(value) {
        this.setList(value);
    }

    /**
     * Définir la liste des noms parmis lesquels s'inspirer pour créer un nouveau nom
     * @param l {Array}
     */
    setList(l) {
        this._list = l;
        l.forEach(s => this.addWord(s));
    }

    /**
     * pioche au hasard une entrée dans le registre
     * @param oReg
     * @return {*}
     */
    rndPick(oReg) {
        const x = this._random.roll(0, oReg.sum - 1);
        return oReg.pick(x);
    }

    addWord(word) {
        const n = this._pattern;
        const ri = this._initReg;
        const rm = this._midReg;
        const rf = this._finalReg;
        ri.addEntry(word.substr(0, n));
        word = word.replace(/[^a-z]+/gi, '');
        if (word.length > n) {
            for (let i = 0; i < word.length - n; ++i) {
                let letter = word.charAt(i + n);
                let pattern = word.substr(i, n);
                if (!(pattern in rm)) {
                    rm[pattern] = new CharRegistry();
                }
                rm[pattern].addEntry(letter);
            }
        }
        const sBeforeFin = word.substr(-n - 1, n);
        if (!(sBeforeFin in rf)) {
            rf[sBeforeFin] = new CharRegistry();
        }
        rf[sBeforeFin].addEntry(word.substr(-1));
    }

    generate(nLength) {
        const n = this._pattern;
        const ri = this._initReg;
        const rm = this._midReg;
        const rf = this._finalReg;
        let nTries = MAX_TRIES;
        while(--nTries > 0) {
            let sPattern = this.rndPick(ri);
            let sResult = sPattern;
            while (sResult.length < (nLength - 1)) {
                let p = rm[sPattern] ? this.rndPick(rm[sPattern]) : '';
                if (p) {
                    sResult += p;
                    sPattern = sResult.substr(-n);
                } else {
                    sPattern = '';
                    break;
                }
            }
            if (rf[sPattern]) {
                sResult += this.rndPick(rf[sPattern]);
            } else {
                continue;
            }
            if (this._list.indexOf(sResult) >= 0) {
                continue;
            }
            return sResult;
        }
        throw new Error('could not generate any name after ' + MAX_TRIES + ' tries... the initial list may be two small...');
    }
}

export default NameCrafter;