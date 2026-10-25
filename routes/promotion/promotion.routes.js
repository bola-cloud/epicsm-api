const express = require("express");
const router = express.Router({ mergeParams: true });
const PromotionController = require("./promotion.controller");


router
    .route('/')
    .get(PromotionController.getPromotion)
    .post(PromotionController.createPromotion)
    .put(PromotionController.updatePromotion)
    .delete(PromotionController.deletePromotion);

router
    .route('/:id')
    .delete(PromotionController.deletePromotion);

module.exports = router;