import { getTripleTypeMatchups, getDualTypeMatchups, POKEROLE } from "../helpers/config.mjs";

export class APIdb {
    /**
	 * @class API
	 */

	/**
	 * test
	 *
	 * @returns {string}
	 */
	static get mondongo() {
		return "mondongo"
	}
    /**
     * @param {object} targetactor 
	 * @returns {{weak: [], doubleWeak: [], resist: [], doubleResist: [], immune: []}} 
     * Get weak/resistances for an actor
	 */
	static pokemonMatchup(targetactor) {
        const matchups = targetactor.system.hasThirdType
        ? getTripleTypeMatchups(targetactor.system.type1, targetactor.system.type2, targetactor.system.type3)
        : getDualTypeMatchups(targetactor.system.type1, targetactor.system.type2);
		return matchups;
	}

}

