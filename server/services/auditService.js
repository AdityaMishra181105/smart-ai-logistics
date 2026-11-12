const AuditLog = require('../models/AuditLog');

/**
 * Creates a new centralized audit log record.
 */
const logAudit = async ({
  user = null,
  userName = 'System',
  role = 'SYSTEM',
  action,
  module,
  referenceId = '',
  description = '',
  status = 'SUCCESS',
  metadata = {},
}) => {
  try {
    let uId = null;
    let uName = userName;
    let uRole = role;

    if (user) {
      if (typeof user === 'object') {
        uId = user._id || user.id;
        uName = user.name || user.email || userName;
        uRole = user.role || role;
      } else {
        uId = user;
      }
    }

    const log = new AuditLog({
      user: uId,
      userName: uName,
      role: uRole,
      action,
      module,
      referenceId,
      description,
      status,
      metadata,
    });

    await log.save();
    console.log(`[AuditService] Logged Action: ${action} (${module}) ref: ${referenceId}`);
    return log;
  } catch (err) {
    console.error('[AuditService] Creation error:', err.message);
  }
};

module.exports = {
  logAudit,
};
