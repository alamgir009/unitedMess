const Meal = require('../models/Meal.model');
const User = require('../models/User.model');

/**
 * Create a meal
 * @param {Object} mealBody
 * @returns {Promise<Meal>}
 */
const createMeal = async (mealBody) => {
    // return Meal.create(mealBody);
    const {user} = mealBody;
    mealBody.mealCount = mealBody.type === 'both' ? 2 : 1;
    const newMeal = await Meal.create(mealBody);
    await User.findByIdAndUpdate(user,{
    $push:{meals:newMeal._id}},{new:true})
    return newMeal;

};

/**
 * Query for meals
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const queryMeals = async (filter, options) => {
    const meals = await Meal.find(filter).sort({ date: -1 });
    return meals;
};

/**
 * Get meal by id
 * @param {ObjectId} id
 * @returns {Promise<Meal>}
 */
const getMealById = async (id) => {
    return Meal.findById(id);
};

/**
 * Update meal by id
 * @param {ObjectId} mealId
 * @param {Object} updateBody
 * @returns {Promise<Meal>}
 */
const updateMealById = async (mealId, updateBody) => {
    const meal = await getMealById(mealId);
    if (!meal) {
        throw new Error('Meal not found');
    }
    Object.assign(meal, updateBody);
    await meal.save();
    return meal;
};

/**
 * Delete meal by id
 * @param {ObjectId} mealId
 * @returns {Promise<Meal>}
 */
const deleteMealById = async (mealId, userId) => {
    const meal = await getMealById(mealId);
    if (!meal) {
        throw new Error('Meal not found');
    }
    await User.findByIdAndUpdate(userId,{$pull:{meals:mealId}},{new:true})
    await Meal.findByIdAndDelete(mealId);
    return meal;
};

module.exports = {
    createMeal,
    queryMeals,
    getMealById,
    updateMealById,
    deleteMealById,
};
