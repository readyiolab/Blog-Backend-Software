const db = require('../models/database');
const { cloudinary } = require('../config/cloudinary');
const { clearCache } = require('../middleware/cache_middleware');

exports.getAllCategories = async (req, res) => {
    try {
        const categories = await db.getCategories();
        res.json({ success: true, data: categories });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getCategoryBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const category = await db.select('tbl_categories', '*', 'slug = ?', [slug]);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }
        res.json({ success: true, data: category });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createCategory = async (req, res) => {
    try {
        const { category_name, description, display_order, status, icon } = req.body;

        if (!category_name) {
            return res.status(400).json({ success: false, message: 'Category name is required' });
        }

        const slug = db.generateSlug(category_name);
        const existing = await db.select('tbl_categories', 'id', 'slug = ?', [slug]);
        if (existing) {
            return res.status(409).json({ success: false, message: 'Category already exists' });
        }

        const result = await db.insert('tbl_categories', {
            category_name,
            slug,
            description: description || '',
            display_order: display_order ?? null,
            status: status || 'active',
            icon: icon || null,
        });

        await db.logActivity(req.user.id, 'create_category', 'category', result.insert_id, `Created category: ${category_name}`, req.ip);
        await clearCache('*');
        res.status(201).json({ success: true, data: { id: result.insert_id, slug } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const current = await db.select('tbl_categories', '*', 'id = ?', [id]);

        if (!current) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        const nextName = req.body.category_name || current.category_name;
        const nextSlug = db.generateSlug(nextName);
        const duplicate = await db.queryAll(
            'SELECT id FROM tbl_categories WHERE slug = ? AND id != ? LIMIT 1',
            [nextSlug, id]
        );

        if (duplicate.length > 0) {
            return res.status(409).json({ success: false, message: 'Another category already uses this slug' });
        }

        if (req.body.icon) {
            if (current.icon && current.icon !== req.body.icon && current.icon.includes('cloudinary.com')) {
                const urlParts = current.icon.split('/');
                const filenameWithExt = urlParts[urlParts.length - 1];
                const publicId = filenameWithExt.split('.')[0];
                await cloudinary.uploader.destroy(`blog-images/${publicId}`);
            }
        }

        await db.update('tbl_categories', {
            category_name: nextName,
            slug: nextSlug,
            description: req.body.description ?? current.description,
            display_order: req.body.display_order ?? current.display_order,
            status: req.body.status || current.status,
            icon: req.body.icon ?? current.icon,
        }, 'id = ?', [id]);

        await db.logActivity(req.user.id, 'update_category', 'category', id, `Updated category: ${nextName}`, req.ip);
        await clearCache('*');
        res.json({ success: true, message: 'Category updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await db.select('tbl_categories', '*', 'id = ?', [id]);

        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        // Delete icon from Cloudinary if it exists
        if (category.icon && category.icon.includes('cloudinary.com')) {
            const urlParts = category.icon.split('/');
            const filenameWithExt = urlParts[urlParts.length - 1];
            const publicId = filenameWithExt.split('.')[0];
            await cloudinary.uploader.destroy(`blog-images/${publicId}`);
        }

        await db.delete('tbl_categories', 'id = ?', [id]);
        await db.logActivity(req.user.id, 'delete_category', 'category', id, `Deleted category: ${category.category_name}`, req.ip);
        await clearCache('*');
        res.json({ success: true, message: 'Category deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
