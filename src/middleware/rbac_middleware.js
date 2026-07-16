const jwt = require("jsonwebtoken");
const db = require("../config/database");
const rbacModel = require("../models/rbacModel");

const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";

// Verify JWT Token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "No token provided",
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

// Optional Verify JWT Token (allows guest actions)
const optionalVerifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    // If token is invalid, we treat it as no token for optional routes
    req.user = null;
    next();
  }
};

// Check if user has permission
const checkPermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;

      // Get user with role info
      const user = await db.select(
        "tbl_users",
        "*",
        "id = ?",
        [userId]
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Check if user is inactive
      if (user.status === "inactive" || user.status === "suspended") {
        return res.status(403).json({
          success: false,
          message: "User account is inactive or suspended",
        });
      }

      // Get user permissions
      const permissions = await rbacModel.getUserPermissions(userId);
      const hasPermission = permissions.some(
        (p) => p.permission_name === requiredPermission
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `Permission denied: ${requiredPermission} required`,
        });
      }

      next();
    } catch (error) {
      console.error("Permission check error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error during permission check",
      });
    }
  };
};

// Check if user has one of multiple roles
const checkRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;

      const userWithRole = await rbacModel.getUserRole(userId);
      if (!userWithRole || userWithRole.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User role not found",
        });
      }

      const userRole = userWithRole[0].role_name;

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: `Access denied: requires one of roles: ${allowedRoles.join(", ")}`,
        });
      }

      next();
    } catch (error) {
      console.error("Role check error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error during role check",
      });
    }
  };
};

// Verify ownership (for editing own content)
const verifyOwnership = (resourceName = "article") => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;
      const resourceId = req.params.id;

      let tableName = "tbl_articles";
      let ownerField = "author_id";

      if (resourceName === "comment") {
        tableName = "tbl_comments";
        ownerField = "user_id";
      } else if (resourceName === "profile") {
        tableName = "tbl_users";
        ownerField = "id";
      }

      const resource = await db.select(tableName, "*", "id = ?", [resourceId]);

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: `${resourceName} not found`,
        });
      }

      // Allow if user is owner or admin
      const userWithRole = await rbacModel.getUserRole(userId);
      const roleName = userWithRole[0]?.role_name;
      const isPrivileged = roleName === "Admin" || roleName === "Editor";
      const isOwner = resource[ownerField] === userId;

      if (!isPrivileged && !isOwner) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to perform this action",
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      console.error("Ownership verification error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error during ownership verification",
      });
    }
  };
};

// Combine middleware functions
const authorize = (requiredPermission) => {
  return checkPermission(requiredPermission);
};

const authorizeRole = (...roles) => {
  return checkRole(...roles);
};

module.exports = {
  verifyToken,
  optionalVerifyToken,
  checkPermission,
  checkRole,
  verifyOwnership,
  authorize,
  authorizeRole,
};
