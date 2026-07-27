/**
 * Public API surface exposed to macros and other modules (e.g. APIdb.pokemonMatchup()).
 */
import { getEffectiveTypeMatchups, POKEROLE } from "../helpers/config.mjs";

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
		return getEffectiveTypeMatchups(targetactor);
	}

}

