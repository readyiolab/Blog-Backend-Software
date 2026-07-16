const articleService = require('../services/articleService');
const { clearCache } = require('../middleware/cache_middleware');

// Get all published articles
exports.getAllArticles = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { articles, totalCount } = await articleService.getAllArticles(limit, offset);

    res.json({
      success: true,
      data: articles,
      pagination: {
        currentPage: page,
        limit,
        totalRecords: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({ success: false, message: 'Error fetching articles' });
  }
};

exports.getAdminArticles = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status || null;

    const { articles, totalCount } = await articleService.getAdminArticles({
      limit,
      offset,
      status,
    });

    res.json({
      success: true,
      data: articles,
      pagination: {
        currentPage: page,
        limit,
        totalRecords: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching admin articles:', error);
    res.status(500).json({ success: false, message: 'Error fetching articles' });
  }
};

// Get user's own articles
exports.getMyArticles = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { articles, totalCount } = await articleService.getMyArticles(req.user.id, limit, offset);

    res.json({
      success: true,
      data: articles,
      pagination: {
        currentPage: page,
        limit,
        totalRecords: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching my articles:', error);
    res.status(500).json({ success: false, message: 'Error fetching my articles' });
  }
};

// Get single article by slug
exports.getArticleBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const article = await articleService.getArticleDetails(slug);

    if (!article) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }

    res.json({ success: true, data: article });
  } catch (error) {
    console.error('Error fetching article:', error);
    res.status(500).json({ success: false, message: 'Error fetching article' });
  }
};

exports.getArticleById = async (req, res) => {
  try {
    const article = await articleService.getArticleById(req.params.id, req.user);

    if (!article) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }

    res.json({ success: true, data: article });
  } catch (error) {
    console.error('Error fetching article by id:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Error fetching article' });
  }
};

// Get articles by category
exports.getArticlesByCategory = async (req, res) => {
  try {
    const { slug } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const articles = await articleService.getArticlesByCategory(slug, limit, offset);

    res.json({
      success: true,
      data: articles,
      pagination: {
        currentPage: page,
        limit,
        totalPages: Math.ceil(articles.length / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching category articles:', error);
    res.status(500).json({ success: false, message: 'Error fetching category articles' });
  }
};

// Search articles
exports.searchArticles = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.status(400).json({ success: false, message: 'Search query must be at least 2 characters' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const articles = await articleService.searchArticles(q, limit, offset);
    res.json({ success: true, data: articles });
  } catch (error) {
    console.error('Error searching articles:', error);
    res.status(500).json({ success: false, message: 'Error searching articles' });
  }
};

// Get trending articles
exports.getTrendingArticles = async (req, res) => {
  try {
    const articles = await articleService.getTrendingArticles(10);
    res.json({ success: true, data: articles });
  } catch (error) {
    console.error('Error fetching trending articles:', error);
    res.status(500).json({ success: false, message: 'Error fetching trending articles' });
  }
};

// Get featured articles
exports.getFeaturedArticles = async (req, res) => {
  try {
    const articles = await articleService.getFeaturedArticles(5);
    res.json({ success: true, data: articles });
  } catch (error) {
    console.error('Error fetching featured articles:', error);
    res.status(500).json({ success: false, message: 'Error fetching featured articles' });
  }
};

// Create article
exports.createArticle = async (req, res) => {
  try {
    const { title, excerpt, content, categoryId, subCategoryId, imageUrl } = req.body;
    if (!title || !content || !categoryId) {
      return res.status(400).json({ success: false, message: 'Title, content, and category are required' });
    }

    const result = await articleService.createArticle(req.body, req.user.id);

    // Clear all cache to ensure lists are updated
    await clearCache('*');

    res.status(201).json({
      success: true,
      message: 'Article created successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error creating article:', error);
    res.status(500).json({ success: false, message: 'Error creating article' });
  }
};

// Edit article
exports.editArticle = async (req, res) => {
  try {
    const { id } = req.params;
    await articleService.updateArticle(id, req.body, req.user.id);
    await clearCache('*');
    res.json({ success: true, message: 'Article updated successfully' });
  } catch (error) {
    console.error('Error updating article:', error);
    res.status(500).json({ success: false, message: 'Error updating article' });
  }
};

// Delete article
exports.deleteArticle = async (req, res) => {
  try {
    const { id } = req.params;
    await articleService.deleteArticle(id, req.user.id);
    await clearCache('*');
    res.json({ success: true, message: 'Article deleted successfully' });
  } catch (error) {
    console.error('Error deleting article:', error);
    res.status(error.message.includes('admins') ? 403 : 500).json({
      success: false,
      message: error.message || 'Error deleting article',
    });
  }
};

// Publish article
exports.publishArticle = async (req, res) => {
  try {
    const { id } = req.params;
    await articleService.publishArticle(id, req.user.id);
    await clearCache('*');
    res.json({ success: true, message: 'Article published successfully' });
  } catch (error) {
    console.error('Error publishing article:', error);
    res.status(500).json({ success: false, message: 'Error publishing article' });
  }
};

module.exports = exports;
