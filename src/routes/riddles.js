/**
 * Riddle Routes
 */

const express = require('express');
const router = express.Router();
const RiddleController = require('../controllers/RiddleController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.get('/today', RiddleController.getTodaysRiddle);
router.get('/answer', RiddleController.revealAnswer);
router.get('/hint/:hintNumber', RiddleController.getHint);
router.post('/solve', RiddleController.markSolved);

module.exports = router;
