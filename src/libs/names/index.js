import NameCrafter from '../name-crafter';
import {fetchJSON} from '../fetch-json';


const DATA = {
    towns: null,
};

function setLists(oLists) {
    for (let type in oLists) {
        if (oLists.hasOwnProperty(type)) {
            const nc = new NameCrafter();
            nc.pattern = 3;
            nc.list = oLists[type];
            DATA[type] = nc;
        }
    }
}

function generateTownName(seed) {
    const nc = DATA.towns;
    const r = nc.random;
    r.seed(seed);
    const nLength = r.roll(1, 4) + r.roll(1, 4) + r.roll(1, 4);
    const sName = nc.generate(nLength);
    return sName.substr(0, 1) + sName.substr(1).toLowerCase();
}

export default {
    generateTownName,
    setLists
}