const Office = require('../models/Office');
const { User } = require('../models/User');

const getOffices = async (req, res) => {
  try {
    const query = {};
    if (req.user.role === 'manager') {
      query.department = req.user.department;
    }
    const offices = await Office.find(query)
      .populate('manager', 'name email department')
      .populate('employees', 'name email department jobTitle role supervisedBy')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: { offices } });
  } catch (error) {
    console.error('Error fetching offices:', error.message);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

const createOffice = async (req, res) => {
  try {
    const { name, department, description, employeeIds } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'يرجى إدخال اسم المكتب' });
    }

    // Department managers are restricted to creating offices within their own department
    let officeDepartment = department;
    if (req.user.role === 'manager') {
      if (!req.user.department) {
        return res.status(400).json({ success: false, message: 'لا يوجد قسم مرتبط بحسابك' });
      }
      officeDepartment = req.user.department;
    }

    if (!officeDepartment) {
      return res.status(400).json({ success: false, message: 'يرجى اختيار القسم' });
    }
    const office = await Office.create({
      name: name.trim(),
      department: officeDepartment,
      description: description || '',
      employees: Array.isArray(employeeIds) ? employeeIds : [],
      createdBy: req.user._id
    });

    if (Array.isArray(employeeIds) && employeeIds.length > 0) {
      await User.updateMany(
        { _id: { $in: employeeIds } },
        { $set: { supervisedBy: office.manager || null } }
      );
    }

    const populated = await office.populate([
      { path: 'manager', select: 'name email department' },
      { path: 'employees', select: 'name email department jobTitle role supervisedBy' }
    ]);
    res.status(201).json({ success: true, message: 'تم إنشاء المكتب بنجاح', data: { office: populated } });
  } catch (error) {
    console.error('Error creating office:', error.message);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

const updateOffice = async (req, res) => {
  try {
    const { name, department, description, manager, employeeIds } = req.body;
    const office = await Office.findById(req.params.id);
    if (!office) {
      return res.status(404).json({ success: false, message: 'المكتب غير موجود' });
    }
    if (name) office.name = name.trim();
    if (department) office.department = department;
    if (description !== undefined) office.description = description;

    const managerChanged = manager !== undefined && String(manager || '') !== String(office.manager || '');
    if (manager !== undefined) office.manager = manager || null;

    if (Array.isArray(employeeIds)) {
      const oldEmpIds = office.employees.map(id => id.toString());
      const newEmpIds = employeeIds.map(id => id.toString());
      const removedIds = oldEmpIds.filter(id => !newEmpIds.includes(id));
      const addedIds = newEmpIds.filter(id => !oldEmpIds.includes(id));

      office.employees = employeeIds;

      if (removedIds.length > 0) {
        await User.updateMany(
          { _id: { $in: removedIds } },
          { $set: { supervisedBy: null } }
        );
      }

      const newManager = manager !== undefined ? manager : office.manager;
      if (addedIds.length > 0 && newManager) {
        await User.updateMany(
          { _id: { $in: addedIds } },
          { $set: { supervisedBy: newManager } }
        );
      }
    }

    if (managerChanged) {
      await User.updateMany(
        { _id: { $in: office.employees } },
        { $set: { supervisedBy: manager || null } }
      );
    }

    await office.save();
    const populated = await office.populate([
      { path: 'manager', select: 'name email department' },
      { path: 'employees', select: 'name email department jobTitle role supervisedBy' }
    ]);
    res.json({ success: true, message: 'تم تحديث المكتب بنجاح', data: { office: populated } });
  } catch (error) {
    console.error('Error updating office:', error.message);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

const deleteOffice = async (req, res) => {
  try {
    const office = await Office.findById(req.params.id);
    if (!office) {
      return res.status(404).json({ success: false, message: 'المكتب غير موجود' });
    }
    if (office.employees && office.employees.length > 0) {
      await User.updateMany(
        { _id: { $in: office.employees } },
        { $set: { supervisedBy: null } }
      );
    }
    await office.deleteOne();
    res.json({ success: true, message: 'تم حذف المكتب بنجاح' });
  } catch (error) {
    console.error('Error deleting office:', error.message);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

const assignEmployeesToOffice = async (req, res) => {
  try {
    const { employeeIds } = req.body;
    const office = await Office.findById(req.params.id);
    if (!office) {
      return res.status(404).json({ success: false, message: 'المكتب غير موجود' });
    }

    // Department managers can only assign employees within their own department
    if (req.user.role === 'manager' && office.department !== req.user.department) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك إدارة مكتب من قسم آخر' });
    }

    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({ success: false, message: 'يرجى تحديد موظفين' });
    }

    const existingEmpIds = office.employees.map(id => id.toString());
    const newIds = employeeIds.filter(id => !existingEmpIds.includes(id.toString()));

    if (newIds.length === 0) {
      return res.json({ success: true, message: 'جميع الموظفين معينين بالفعل', data: { office } });
    }

    // Validate all employees are in the same department and have employee role
    const users = await User.find({ _id: { $in: newIds } });
    const validIds = [];
    for (const user of users) {
      if (user.department === office.department && user.role === 'employee') {
        validIds.push(user._id);
      }
    }

    if (validIds.length === 0) {
      return res.status(400).json({ success: false, message: 'لا يوجد موظفين صالحين للتعيين في هذا المكتب' });
    }

    office.employees = [...existingEmpIds, ...validIds.map(id => id.toString())];
    await office.save();

    // If office has a manager, set supervisedBy for newly assigned employees
    if (office.manager) {
      await User.updateMany(
        { _id: { $in: validIds } },
        { $set: { supervisedBy: office.manager } }
      );
    }

    const populated = await office.populate([
      { path: 'manager', select: 'name email department' },
      { path: 'employees', select: 'name email department jobTitle role supervisedBy' }
    ]);
    res.json({ success: true, message: `تم نقل ${validIds.length} موظف(ين) إلى المكتب`, data: { office: populated } });
  } catch (error) {
    console.error('Error assigning employees to office:', error.message);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

const removeEmployeeFromOffice = async (req, res) => {
  try {
    const { employeeId } = req.body;
    const office = await Office.findById(req.params.id);
    if (!office) {
      return res.status(404).json({ success: false, message: 'المكتب غير موجود' });
    }

    if (req.user.role === 'manager' && office.department !== req.user.department) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك إدارة مكتب من قسم آخر' });
    }

    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'يرجى تحديد الموظف' });
    }

    const empIdStr = employeeId.toString();
    const empIndex = office.employees.findIndex(id => id.toString() === empIdStr);
    if (empIndex === -1) {
      return res.status(400).json({ success: false, message: 'الموظف غير معين في هذا المكتب' });
    }

    office.employees.splice(empIndex, 1);
    await office.save();

    // Clear supervisedBy if the office has a manager
    if (office.manager) {
      await User.findByIdAndUpdate(employeeId, { $set: { supervisedBy: null } });
    }

    const populated = await office.populate([
      { path: 'manager', select: 'name email department' },
      { path: 'employees', select: 'name email department jobTitle role supervisedBy' }
    ]);
    res.json({ success: true, message: 'تم إزالة الموظف من المكتب', data: { office: populated } });
  } catch (error) {
    console.error('Error removing employee from office:', error.message);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

module.exports = { getOffices, createOffice, updateOffice, deleteOffice, assignEmployeesToOffice, removeEmployeeFromOffice };
