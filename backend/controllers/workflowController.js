const Workflow = require('../models/Workflow');
const { AuditLog, AuditAction } = require('../models/AuditLog');

const createWorkflow = async (req, res) => {
  try {
    const { name, description, stages } = req.body;
    if (!name || !stages || stages.length === 0) {
      return res.status(400).json({ success: false, message: 'الاسم والمراحل مطلوبة' });
    }
    const workflow = await Workflow.create({
      name, description, stages,
      createdBy: req.user._id
    });
    await AuditLog.logAction({
      user: req.user._id, userRole: req.user.role,
      userDepartment: req.user.department,
      action: AuditAction.CREATE, entity: 'Workflow',
      entityId: workflow._id,
      details: { name, stageCount: stages.length }
    });
    res.status(201).json({ success: true, message: 'تم إنشاء سير العمل', data: { workflow } });
  } catch (error) {
    console.error('Error creating workflow:', error.message);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

const getWorkflows = async (req, res) => {
  try {
    const { isActive } = req.query;
    const query = {};
    if (isActive !== undefined) query.isActive = isActive === 'true';
    const workflows = await Workflow.find(query)
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: { workflows } });
  } catch (error) {
    console.error('Error fetching workflows:', error.message);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

const getWorkflowById = async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id).populate('createdBy', 'name');
    if (!workflow) {
      return res.status(404).json({ success: false, message: 'سير العمل غير موجود' });
    }
    res.json({ success: true, data: { workflow } });
  } catch (error) {
    console.error('Error fetching workflow:', error.message);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

const updateWorkflow = async (req, res) => {
  try {
    const { name, description, stages, isActive } = req.body;
    const workflow = await Workflow.findById(req.params.id);
    if (!workflow) {
      return res.status(404).json({ success: false, message: 'سير العمل غير موجود' });
    }
    if (name) workflow.name = name;
    if (description !== undefined) workflow.description = description;
    if (stages) workflow.stages = stages;
    if (isActive !== undefined) workflow.isActive = isActive;
    await workflow.save();
    await AuditLog.logAction({
      user: req.user._id, userRole: req.user.role,
      userDepartment: req.user.department,
      action: AuditAction.UPDATE, entity: 'Workflow',
      entityId: workflow._id,
      details: { updates: { name, isActive } }
    });
    res.json({ success: true, message: 'تم تحديث سير العمل', data: { workflow } });
  } catch (error) {
    console.error('Error updating workflow:', error.message);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

const deleteWorkflow = async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id);
    if (!workflow) {
      return res.status(404).json({ success: false, message: 'سير العمل غير موجود' });
    }
    workflow.isActive = false;
    await workflow.save();
    await AuditLog.logAction({
      user: req.user._id, userRole: req.user.role,
      userDepartment: req.user.department,
      action: AuditAction.DELETE, entity: 'Workflow',
      entityId: workflow._id,
      details: { name: workflow.name, deactivated: true }
    });
    res.json({ success: true, message: 'تم تعطيل سير العمل' });
  } catch (error) {
    console.error('Error deleting workflow:', error.message);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

module.exports = { createWorkflow, getWorkflows, getWorkflowById, updateWorkflow, deleteWorkflow };
