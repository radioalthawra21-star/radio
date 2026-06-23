const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { newsDepartmentOnly } = require('../middleware/newsDepartment');
const { processPipeline, runSingleStage, checkAIConfig, getAIModels } = require('../controllers/editorialPipelineController');

router.post('/process', protect, newsDepartmentOnly, processPipeline);
router.post('/stage', protect, newsDepartmentOnly, runSingleStage);
router.get('/ai-config', protect, newsDepartmentOnly, checkAIConfig);
router.get('/ai-models', protect, newsDepartmentOnly, getAIModels);

module.exports = router;
