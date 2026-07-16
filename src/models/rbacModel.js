const db = require('../config/database');

class RBACModel {
    async getUserPermissions(userId) {
        const sql = `
      SELECT DISTINCT p.permission_name, p.module
      FROM tbl_users u
      JOIN tbl_roles r ON u.role_id = r.id
      JOIN tbl_role_permissions rp ON r.id = rp.role_id
      JOIN tbl_permissions p ON rp.permission_id = p.id
      WHERE u.id = ?
    `;
        return await db.queryAll(sql, [userId]);
    }

    async hasPermission(userId, permissionName) {
        const permissions = await this.getUserPermissions(userId);
        return permissions.some(p => p.permission_name === permissionName);
    }

    async getUserRole(userId) {
        const sql = `
      SELECT r.role_name, r.id
      FROM tbl_users u
      JOIN tbl_roles r ON u.role_id = r.id
      WHERE u.id = ?
    `;
        return await db.queryAll(sql, [userId]);
    }
}

module.exports = new RBACModel();
