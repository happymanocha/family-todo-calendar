/**
 * Riddle Routes
 */

const express = require('express');
const router = express.Router();
const RiddleController = require('../controllers/RiddleController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/today', RiddleController.getTodaysRiddle);
router.get('/answer', RiddleController.revealAnswer);
router.get('/hint/:hintNumber', RiddleController.getHint);
router.post('/solve', RiddleController.markSolved);

module.exports = router;
