const express = require('express');
const historyController = require('../controllers/historyController');
const router = express.Router();

router.post('/', historyController.saveSearch); // CREATE
router.get('/', historyController.getAllHistory); // READ All
router.get('/:id', historyController.getHistoryById); // READ One
router.put('/:id', historyController.updateHistoryNotes); // UPDATE Notes
router.delete('/:id', historyController.deleteHistory); // DELETE

module.exports = router;