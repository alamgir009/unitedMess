const { settingService } = require("../../../services")
const { sendSuccessResponse } = require("../../../utils/helpers/response.helper")


const updateGuestMealCharge = async (req, res) => {
    const guestMealCharge = await settingService.updateGuestMealCharge(req.body);
    sendSuccessResponse(res, 200, 'Guest meal charge updated', guestMealCharge);
}

const updateCookingCharge = async (req, res) => {
    const cookingCharge = await settingService.updateCookingCharge(req.body);
    sendSuccessResponse(res, 200, 'Cooking charge updated', cookingCharge)
}

const updateWaterBill = async(req, res) => {
    const waterBill = await settingService.updateWaterBill(req.body);
    sendSuccessResponse(res, 200, 'Water bill updated', waterBill)

}

const updateGasBillCharge = async(req, res) => {
    const gasBill = await settingService.updateGasBillCharge(req.body);
    sendSuccessResponse(res, 200, 'Gas bill updated', gasBill)
}


module.exports = {
    updateGuestMealCharge,
    updateCookingCharge,
    updateWaterBill,
    updateGasBillCharge
}