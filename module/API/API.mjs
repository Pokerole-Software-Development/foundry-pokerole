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
	        const effectiveTypes = targetactor.getEffectiveTypes?.() ?? {
			type1: targetactor.system.type1,
			type2: targetactor.system.type2,
			type3: targetactor.system.type3,
			hasThirdType: targetactor.system.hasThirdType
		};
	        const matchups = effectiveTypes.hasThirdType
	        ? getTripleTypeMatchups(effectiveTypes.type1, effectiveTypes.type2, effectiveTypes.type3)
	        : getDualTypeMatchups(effectiveTypes.type1, effectiveTypes.type2);
			return matchups;
		}

}
