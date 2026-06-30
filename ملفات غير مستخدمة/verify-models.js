try {
  const { User } = require('./models/User');
  console.log('User model:', typeof User, 'has findOne:', typeof User.findOne);
  const { Settings } = require('./models/Settings');
  console.log('Settings model:', typeof Settings, 'has initializeDefaults:', typeof Settings.initializeDefaults);
  const Department = require('./models/Department');
  console.log('Department model:', typeof Department, 'has findOne:', typeof Department.findOne);
} catch (e) {
  console.error('Error during require:', e);
}
