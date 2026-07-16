const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const rbacModel = require('../models/rbacModel');

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';
const JWT_EXPIRE = '7d';

class UserService {
    async registerUser(data, ip) {
        const existingUser = await db.queryAll(
            'SELECT id FROM tbl_users WHERE email = ? OR username = ?',
            [data.email, data.username]
        );

        if (existingUser.length > 0) {
            throw new Error('Email or username already exists');
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);
        const userRole = await db.select('tbl_roles', 'id', 'role_name = ?', ['User']);

        const userData = {
            username: data.username,
            email: data.email,
            password: hashedPassword,
            first_name: data.firstName || '',
            last_name: data.lastName || '',
            role_id: userRole.id,
            status: 'active',
        };

        // Start transaction
        await db.beginTransaction();

        try {
            const result = await db.insert('tbl_users', userData);

            await db.logActivity(
                result.insert_id,
                'user_registered',
                'user',
                result.insert_id,
                'New user registered',
                ip
            );

            // Commit transaction
            await db.commit();
            return { id: result.insert_id, username: data.username, email: data.email };
        } catch (error) {
            // Rollback transaction on failure
            await db.rollback();
            throw error;
        }
    }

    async authenticateUser(email, password, ip) {
        const user = await db.select('tbl_users', '*', 'email = ?', [email]);
        if (!user) {
            throw new Error('Invalid email or password');
        }

        if (user.status !== 'active') {
            throw new Error('Account is inactive or suspended');
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            throw new Error('Invalid email or password');
        }

        const userWithRole = await db.queryAll(
            `SELECT u.id, u.username, u.email, u.first_name, u.last_name, 
              u.profile_image, r.role_name, r.id as role_id
       FROM tbl_users u
       JOIN tbl_roles r ON u.role_id = r.id
       WHERE u.id = ?`,
            [user.id]
        );

        const permissions = await rbacModel.getUserPermissions(user.id);
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                username: user.username,
                role: userWithRole[0].role_name,
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRE }
        );

        await db.beginTransaction();
        try {
            await db.update('tbl_users', { last_login: new Date() }, 'id = ?', [user.id]);
            await db.logActivity(user.id, 'user_login', 'user', user.id, 'User logged in', ip);
            await db.commit();

            return {
                token,
                user: {
                    id: userWithRole[0].id,
                    username: userWithRole[0].username,
                    email: userWithRole[0].email,
                    firstName: userWithRole[0].first_name,
                    lastName: userWithRole[0].last_name,
                    profileImage: userWithRole[0].profile_image,
                    role: userWithRole[0].role_name,
                },
                permissions: permissions.map((p) => p.permission_name),
            };
        } catch (error) {
            await db.rollback();
            throw error;
        }
    }

    async getUserProfile(userId) {
        const user = await db.queryAll(
            `SELECT u.id, u.username, u.email, u.first_name, u.last_name, 
              u.phone, u.profile_image, u.bio, u.twitter_url, u.facebook_url, u.linkedin_url,
              u.status, u.last_login, u.created_at, r.role_name
       FROM tbl_users u
       JOIN tbl_roles r ON u.role_id = r.id
       WHERE u.id = ?`,
            [userId]
        );

        if (!user || user.length === 0) return null;
        const permissions = await rbacModel.getUserPermissions(userId);
        return {
            user: user[0],
            permissions: permissions.map((p) => p.permission_name),
        };
    }

    async updateProfile(userId, data, ip) {
        const updateData = {};
        if (data.firstName) updateData.first_name = data.firstName;
        if (data.lastName) updateData.last_name = data.lastName;
        if (data.phone) updateData.phone = data.phone;
        if (data.bio) updateData.bio = data.bio;
        if (data.profileImage) updateData.profile_image = data.profileImage;
        if (data.twitter_url) updateData.twitter_url = data.twitter_url;
        if (data.facebook_url) updateData.facebook_url = data.facebook_url;
        if (data.linkedin_url) updateData.linkedin_url = data.linkedin_url;

        await db.beginTransaction();
        try {
            await db.update('tbl_users', updateData, 'id = ?', [userId]);
            await db.logActivity(userId, 'update_profile', 'user', userId, 'User updated profile', ip);
            await db.commit();
            return true;
        } catch (error) {
            await db.rollback();
            throw error;
        }
    }

    async changePassword(userId, currentPassword, newPassword, ip) {
        const user = await db.select('tbl_users', '*', 'id = ?', [userId]);
        const passwordMatch = await bcrypt.compare(currentPassword, user.password);
        if (!passwordMatch) {
            throw new Error('Current password is incorrect');
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.beginTransaction();
        try {
            await db.update('tbl_users', { password: hashedPassword }, 'id = ?', [userId]);
            await db.logActivity(userId, 'change_password', 'user', userId, 'User changed password', ip);
            await db.commit();
            return true;
        } catch (error) {
            await db.rollback();
            throw error;
        }
    }

    async forgotPassword(email, ip) {
        const user = await db.select('tbl_users', '*', 'email = ?', [email]);
        if (!user) return null;

        const resetToken = jwt.sign(
            { id: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        await db.beginTransaction();
        try {
            await db.logActivity(user.id, 'password_reset_requested', 'user', user.id, 'Password reset requested', ip);
            await db.commit();
            return resetToken;
        } catch (error) {
            await db.rollback();
            throw error;
        }
    }

    async resetPassword(token, newPassword, ip) {
        const decoded = jwt.verify(token, JWT_SECRET);
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.beginTransaction();
        try {
            await db.update('tbl_users', { password: hashedPassword }, 'id = ?', [decoded.id]);
            await db.logActivity(decoded.id, 'password_reset', 'user', decoded.id, 'Password reset completed', ip);
            await db.commit();
            return true;
        } catch (error) {
            await db.rollback();
            throw error;
        }
    }

    async logout(userId, ip) {
        await db.beginTransaction();
        try {
            await db.logActivity(userId, 'user_logout', 'user', userId, 'User logged out', ip);
            await db.commit();
            return true;
        } catch (error) {
            await db.rollback();
            throw error;
        }
    }
}

module.exports = new UserService();
