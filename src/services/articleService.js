const db = require('../config/database');
const { cloudinary } = require('../config/cloudinary');


class ArticleService {
    async getAdminArticles({ limit, offset, status }) {
        const { rows, totalCount } = await db.getArticlesForAdmin({ limit, offset, status });
        return {
            articles: rows,
            totalCount
        };
    }

    async getAllArticles(limit, offset) {
        const articles = await db.getPublishedArticles(limit, offset);
        const totalCount = await db.queryAll(
            "SELECT COUNT(*) as count FROM tbl_articles WHERE status = 'published'"
        );
        return {
            articles,
            totalCount: totalCount[0].count
        };
    }

    async getMyArticles(userId, limit, offset) {
        const articles = await db.queryAll(
            `SELECT 
        a.id, a.title, a.slug, a.excerpt, a.content,
        a.featured_image, a.featured_image_alt,
        a.meta_title, a.meta_description, a.meta_keywords,
        a.canonical_url, a.views_count, a.reading_time,
        a.is_featured, a.is_trending, a.published_at, a.status,
        c.category_name, c.slug as category_slug,
        u.id as author_id, u.username as author_name, u.username, u.first_name, u.last_name
      FROM tbl_articles a
      JOIN tbl_categories c ON a.category_id = c.id
      JOIN tbl_users u ON a.author_id = u.id
      WHERE a.author_id = ?
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?`,
            [userId, limit, offset]
        );
        const totalCount = await db.queryAll(
            "SELECT COUNT(*) as count FROM tbl_articles WHERE author_id = ?",
            [userId]
        );
        return {
            articles,
            totalCount: totalCount[0].count
        };
    }

    async getArticleDetails(slug) {
        let article = [];
        try {
            article = await db.queryAll(
                `SELECT a.*, c.category_name, c.slug as category_slug, 
                   u.username, u.first_name, u.last_name, u.profile_image as author_image,
                   u.bio as author_bio, u.twitter_url, u.facebook_url, u.linkedin_url
            FROM tbl_articles a
            LEFT JOIN tbl_categories c ON a.category_id = c.id
            LEFT JOIN tbl_users u ON a.author_id = u.id
            WHERE a.slug = ? AND a.status = 'published'`,
                [slug]
            );
        } catch (err) {
            console.warn('Primary article details query failed, trying fallback query:', err.message);
            article = await db.queryAll(
                `SELECT a.*, c.category_name, c.slug as category_slug, 
                   u.username, u.first_name, u.last_name, u.profile_image as author_image,
                   u.bio as author_bio
            FROM tbl_articles a
            LEFT JOIN tbl_categories c ON a.category_id = c.id
            LEFT JOIN tbl_users u ON a.author_id = u.id
            WHERE a.slug = ? AND a.status = 'published'`,
                [slug]
            );
        }

        if (!article || article.length === 0) return null;

        let tags = [];
        try {
            tags = await db.queryAll(
                `SELECT t.id, t.tag_name, t.slug
           FROM tbl_tags t
           JOIN tbl_article_tags at ON t.id = at.tag_id
           WHERE at.article_id = ?`,
                [article[0].id]
            );
        } catch (err) {
            console.error('Error fetching tags for article:', err);
        }

        let gallery = [];
        try {
            gallery = await db.queryAll(
                "SELECT id, image_url, alt_text, caption FROM tbl_gallery WHERE article_id = ? ORDER BY display_order",
                [article[0].id]
            );
        } catch (err) {
            console.error('Error fetching gallery for article:', err);
        }

        try {
            await db.incrementArticleViews(article[0].id);
        } catch (err) {
            console.error('Error incrementing article views:', err);
        }

        return {
            ...article[0],
            tags,
            gallery
        };
    }

    async getArticleById(articleId, currentUser) {
        const article = await db.getArticleByIdForAdmin(articleId);
        if (!article) {
            return null;
        }

        const isPrivileged = currentUser.role === 'Admin' || currentUser.role === 'Editor';
        if (!isPrivileged && article.author_id !== currentUser.id) {
            const error = new Error('You do not have access to this article');
            error.statusCode = 403;
            throw error;
        }

        return article;
    }

    async getArticlesByCategory(slug, limit, offset) {
        return await db.getArticlesByCategory(slug, limit, offset);
    }

    async searchArticles(searchTerm, limit, offset) {
        return await db.searchArticles(searchTerm, limit, offset);
    }

    async getTrendingArticles(limit) {
        return await db.getTrendingArticles(limit);
    }

    async getFeaturedArticles(limit) {
        return await db.getFeaturedArticles(limit);
    }

    async createArticle(data, userId) {
        let slug = db.generateSlug(data.title);
        let counter = 1;
        while (await db.isSlugExists(slug)) {
            slug = `${db.generateSlug(data.title)}-${counter}`;
            counter++;
        }

        const user = await db.queryAll(
            `SELECT u.*, r.role_name FROM tbl_users u
       JOIN tbl_roles r ON u.role_id = r.id WHERE u.id = ?`,
            [userId]
        );

        let status = 'draft';
        if (user[0].role_name === 'Admin' || user[0].role_name === 'Editor') {
            status = data.status === 'draft' ? 'draft' : 'published';
        } else if (user[0].role_name === 'Reporter') {
            status = data.status === 'draft' ? 'draft' : 'pending';
        } else if (user[0].role_name === 'Author') {
            status = data.status === 'published' ? 'published' : 'draft';
        }

        const articleData = {
            title: data.title,
            slug,
            excerpt: data.excerpt || '',
            content: data.content,
            featured_image: data.imageUrl || null,
            category_id: data.categoryId,
            sub_category_id: data.subCategoryId || null,
            author_id: userId,
            status,
            meta_title: data.title.substring(0, 160),
            meta_description: data.excerpt ? data.excerpt.substring(0, 160) : '',
        };

        await db.beginTransaction();
        try {
            const result = await db.insert('tbl_articles', articleData);

            await db.logActivity(
                userId,
                'create_article',
                'article',
                result.insert_id,
                `Created article: ${data.title}`
            );

            await db.commit();
            return { id: result.insert_id, slug, status };
        } catch (error) {
            await db.rollback();
            throw error;
        }
    }

    async updateArticle(id, data, userId) {
        const updateData = {};
        if (data.title) {
            updateData.title = data.title;
            let slug = db.generateSlug(data.title);
            let counter = 1;
            while (await db.isSlugExists(slug, id)) {
                slug = `${db.generateSlug(data.title)}-${counter}`;
                counter++;
            }
            updateData.slug = slug;
            updateData.meta_title = data.title.substring(0, 160);
        }
        if (data.excerpt) updateData.excerpt = data.excerpt;
        if (data.content) updateData.content = data.content;
        if (data.categoryId) updateData.category_id = data.categoryId;
        if (data.subCategoryId) updateData.sub_category_id = data.subCategoryId;
        if (data.imageUrl) updateData.featured_image = data.imageUrl;
        if (data.status) updateData.status = data.status;
        if (data.metaTitle) updateData.meta_title = data.metaTitle.substring(0, 160);
        if (data.metaDescription) updateData.meta_description = data.metaDescription.substring(0, 160);

        await db.beginTransaction();
        try {
            // If updating image, delete old one from Cloudinary
            if (data.imageUrl) {
                const oldArticle = await db.select('tbl_articles', 'featured_image', 'id = ?', [id]);
                if (oldArticle && oldArticle.featured_image &&
                    oldArticle.featured_image !== data.imageUrl &&
                    oldArticle.featured_image.includes('cloudinary.com')) {

                    const urlParts = oldArticle.featured_image.split('/');
                    const filenameWithExt = urlParts[urlParts.length - 1];
                    const publicId = filenameWithExt.split('.')[0];
                    await cloudinary.uploader.destroy(`blog-images/${publicId}`);
                }
            }

            await db.update('tbl_articles', updateData, 'id = ?', [id]);
            await db.logActivity(userId, 'edit_article', 'article', id, 'Updated article');
            await db.commit();
            return true;
        } catch (error) {
            await db.rollback();
            throw error;
        }
    }

    async deleteArticle(id, userId) {
        const article = await db.select('tbl_articles', '*', 'id = ?', [id]);
        if (article.status === 'published') {
            const user = await db.queryAll(
                `SELECT r.role_name FROM tbl_users u
         JOIN tbl_roles r ON u.role_id = r.id WHERE u.id = ?`,
                [userId]
            );
            if (user[0].role_name !== 'Admin' && user[0].role_name !== 'Editor') {
                throw new Error('Only admins and editors can delete published articles');
            }
        }

        await db.beginTransaction();
        try {
            // Delete image from Cloudinary if it exists
            if (article.featured_image && article.featured_image.includes('cloudinary.com')) {
                const urlParts = article.featured_image.split('/');
                const filenameWithExt = urlParts[urlParts.length - 1];
                const publicId = filenameWithExt.split('.')[0];
                // folder is 'blog-images'
                await cloudinary.uploader.destroy(`blog-images/${publicId}`);
            }

            await db.delete('tbl_articles', 'id = ?', [id]);
            await db.logActivity(userId, 'delete_article', 'article', id, 'Deleted article');
            await db.commit();
            return true;
        } catch (error) {
            await db.rollback();
            throw error;
        }
    }

    async publishArticle(id, userId) {
        await db.beginTransaction();
        try {
            await db.update(
                'tbl_articles',
                { status: 'published', published_at: new Date() },
                'id = ?',
                [id]
            );
            await db.logActivity(userId, 'publish_article', 'article', id, 'Published article');
            await db.commit();
            return true;
        } catch (error) {
            await db.rollback();
            throw error;
        }
    }

    async getUserArticles(userId, limit, offset) {
        return await db.queryAll(
            `SELECT id, title, slug, status, views_count, published_at, created_at
       FROM tbl_articles
       WHERE author_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
            [userId, limit, offset]
        );
    }
}

module.exports = new ArticleService();
