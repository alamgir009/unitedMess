import { fmt } from './currency.helper';

/**
 * Build the human-readable meal-rate formula shown under the Meal Rate card.
 *
 * With guests:    "(14,797 − 4×60) ÷ 318"
 * Without guests: "14,797 ÷ 322"
 *
 * @param {{totalMarket:number,totalGuest:number,totalOwnMeals:number,guestMealRate:number}|null} stats
 * @returns {string|undefined} undefined hides the sub-label
 */
export const buildMealRateFormula = (stats) => {
    if (!stats) return undefined;

    const market = Number(stats.totalMarket) || 0;
    const guests = Number(stats.totalGuest) || 0;
    const rate = Number(stats.guestMealRate) || 0;
    const ownMeals = Number(stats.totalOwnMeals) || 0;

    if (market <= 0 || ownMeals <= 0) return undefined;

    if (guests > 0 && rate > 0) {
        return `(${fmt(market)} − ${fmt(guests)}×${fmt(rate)}) ÷ ${fmt(ownMeals)}`;
    }

    return `${fmt(market)} ÷ ${fmt(ownMeals)}`;
};
