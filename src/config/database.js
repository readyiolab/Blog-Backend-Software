const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");
const { dbHost, dbPort, dbName, dbPass, dbUser } = require("./dotenvConfig");

class Database {
  constructor() {
    this.host = dbHost;
    this.port = dbPort;
    this.username = dbUser;
    this.password = dbPass;
    this.database = dbName;
    this.pool = null;
    this.transConn = null; // Used for transactions

    this.connect();
  }

  async connect() {
    const config = {
      host: this.host,
      port: this.port,
      user: this.username,
      password: this.password,
      database: this.database,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000
    };

    if (this.host.includes("rds.amazonaws.com")) {
      const sslPath = path.resolve(__dirname, "../../global-bundle.pem");
      if (fs.existsSync(sslPath)) {
        config.ssl = {
          rejectUnauthorized: false,
          ca: fs.readFileSync(sslPath)
        };
        console.log("Using SSL for RDS connection.");
      }
    }

    try {
      this.pool = mysql.createPool(config);
      console.log("Database connection pool created successfully!");
    } catch (err) {
      console.error("Database Pool Creation Error:", err);
    }
  }

  async ensureConnection() {
    if (!this.pool) {
      await this.connect();
    }
  }

  /**
   * Helper to get the correct connection to use.
   * If a transaction is active, returns the transaction connection.
   * Otherwise returns the pool for direct execution.
   */
  getConn() {
    return this.transConn || this.pool;
  }

  async select(tbl_name, column = "*", where = "", params = [], print = false) {
    await this.ensureConnection();
    let wr = "";
    if (where !== "") {
      wr = `WHERE ${where}`;
    }
    const sql = `SELECT ${column} FROM ${tbl_name} ${wr} LIMIT 1`;
    if (print) {
      console.log(sql, params);
    }
    const [rows] = await this.getConn().execute(sql, params);
    return rows[0];
  }

  async selectAll(
    tbl_name,
    column = "*",
    where = "",
    params = [],
    orderby = "",
    print = false
  ) {
    await this.ensureConnection();
    let wr = "";
    if (where !== "") {
      wr = `WHERE ${where}`;
    }
    const sql = `SELECT ${column} FROM ${tbl_name} ${wr} ${orderby}`;
    if (print) {
      console.log(sql, params);
    }
    const [rows] = await this.getConn().execute(sql, params);
    return rows;
  }

  async insert(tbl_name, data, print = false) {
    await this.ensureConnection();
    const sql = `INSERT INTO ${tbl_name} SET ?`;
    if (print) {
      console.log(sql, data);
    }
    const [result] = await this.getConn().query(sql, data);
    return {
      status: true,
      insert_id: result.insertId,
      affected_rows: result.affectedRows,
      info: result.info,
    };
  }

  async update(table_name, form_data, where = "", params = [], print = false) {
    await this.ensureConnection();
    let whereSQL = "";
    if (where !== "") {
      whereSQL = ` WHERE ${where}`;
    }
    const sql = `UPDATE ${table_name} SET ? ${whereSQL}`;
    if (print) {
      console.log(sql, [form_data, ...params]);
    }
    const [result] = await this.getConn().query(sql, [form_data, ...params]);
    return {
      status: true,
      affected_rows: result.affectedRows,
      info: result.info,
    };
  }

  async delete(tbl_name, where = "", params = [], print = false) {
    await this.ensureConnection();
    let whereSQL = "";
    if (where !== "") {
      whereSQL = ` WHERE ${where}`;
    }
    const sql = `DELETE FROM ${tbl_name} ${whereSQL}`;
    if (print) {
      console.log(sql, params);
    }
    const [result] = await this.getConn().execute(sql, params);
    return {
      status: true,
      info: result.info,
    };
  }

  async query(sql, params = [], print = false) {
    await this.ensureConnection();
    if (print) {
      console.log(sql, params);
    }
    const [result] = await this.getConn().query(sql, params);
    return {
      status: true,
      affectedRows: result.affectedRows,
      info: result.info,
    };
  }

  async queryAll(sql, params = [], print = false) {
    await this.ensureConnection();
    if (print) {
      console.log(sql, params);
    }
    const [rows] = await this.getConn().query(sql, params);
    return rows;
  }

  // Transaction Methods
  async beginTransaction() {
    await this.ensureConnection();
    if (this.transConn) {
      throw new Error("A transaction is already in progress on this singleton instance.");
    }
    this.transConn = await this.pool.getConnection();
    return await this.transConn.beginTransaction();
  }

  async commit() {
    if (!this.transConn) {
      throw new Error("No active transaction to commit.");
    }
    try {
      await this.transConn.commit();
    } finally {
      this.transConn.release();
      this.transConn = null;
    }
  }

  async rollback() {
    if (!this.transConn) {
      return; // Nothing to rollback
    }
    try {
      await this.transConn.rollback();
    } finally {
      this.transConn.release();
      this.transConn = null;
    }
  }

  // Utility Methods
  generateSlug(text) {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async getPublishedArticles(limit, offset) {
    const sql = `
      SELECT 
        a.id, a.title, a.slug, a.excerpt, a.content,
        a.featured_image, a.featured_image_alt,
        a.meta_title, a.meta_description, a.meta_keywords,
        a.canonical_url, a.views_count, a.reading_time,
        a.is_featured, a.is_trending, a.published_at,
        c.category_name, c.slug as category_slug,
        u.id as author_id, u.username as author_name, u.first_name, u.last_name
      FROM tbl_articles a
      JOIN tbl_categories c ON a.category_id = c.id
      JOIN tbl_users u ON a.author_id = u.id
      WHERE a.status = 'published'
      ORDER BY a.published_at DESC
      LIMIT ? OFFSET ?
    `;
    return await this.queryAll(sql, [limit, offset]);
  }

  async getCategories() {
    const sql = `
      SELECT
        c.id,
        c.category_name,
        c.slug,
        c.description,
        c.status,
        c.display_order,
        COUNT(a.id) AS article_count
      FROM tbl_categories c
      LEFT JOIN tbl_articles a ON a.category_id = c.id
      WHERE c.status = 'active'
      GROUP BY c.id, c.category_name, c.slug, c.description, c.status, c.display_order
      ORDER BY COALESCE(c.display_order, 999999), c.category_name ASC
    `;

    return this.queryAll(sql);
  }

  async getArticleByIdForAdmin(articleId) {
    const sql = `
      SELECT
        a.id,
        a.title,
        a.slug,
        a.excerpt,
        a.content,
        a.featured_image,
        a.featured_image_alt,
        a.category_id,
        a.sub_category_id,
        a.status,
        a.meta_title,
        a.meta_description,
        a.meta_keywords,
        a.canonical_url,
        a.views_count,
        a.is_featured,
        a.is_trending,
        a.published_at,
        a.created_at,
        a.updated_at,
        c.category_name,
        u.username AS author_name
      FROM tbl_articles a
      JOIN tbl_categories c ON c.id = a.category_id
      JOIN tbl_users u ON u.id = a.author_id
      WHERE a.id = ?
      LIMIT 1
    `;

    const rows = await this.queryAll(sql, [articleId]);
    return rows[0] || null;
  }

  async getArticlesForAdmin({ limit, offset, status = null, authorId = null }) {
    const filters = [];
    const params = [];

    if (status) {
      filters.push("a.status = ?");
      params.push(status);
    }

    if (authorId) {
      filters.push("a.author_id = ?");
      params.push(authorId);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

    const listSql = `
      SELECT
        a.id,
        a.title,
        a.slug,
        a.excerpt,
        a.status,
        a.views_count,
        a.published_at,
        a.created_at,
        a.updated_at,
        a.category_id,
        c.category_name,
        u.id AS author_id,
        u.username AS author_name
      FROM tbl_articles a
      JOIN tbl_categories c ON c.id = a.category_id
      JOIN tbl_users u ON u.id = a.author_id
      ${whereClause}
      ORDER BY a.updated_at DESC
      LIMIT ? OFFSET ?
    `;

    const countSql = `
      SELECT COUNT(*) AS count
      FROM tbl_articles a
      ${whereClause}
    `;

    const rows = await this.queryAll(listSql, [...params, limit, offset]);
    const totalRows = await this.queryAll(countSql, params);

    return {
      rows,
      totalCount: totalRows[0]?.count || 0,
    };
  }

  async getArticlesByCategory(slug, limit, offset) {
    const sql = `
      SELECT
        a.id, a.title, a.slug, a.excerpt, a.featured_image,
        a.published_at, a.views_count,
        c.category_name, c.slug AS category_slug,
        u.username AS author_name
      FROM tbl_articles a
      JOIN tbl_categories c ON c.id = a.category_id
      JOIN tbl_users u ON u.id = a.author_id
      WHERE c.slug = ? AND a.status = 'published'
      ORDER BY a.published_at DESC
      LIMIT ? OFFSET ?
    `;

    return this.queryAll(sql, [slug, limit, offset]);
  }

  async searchArticles(searchTerm, limit, offset) {
    const likeTerm = `%${searchTerm}%`;
    const sql = `
      SELECT
        a.id, a.title, a.slug, a.excerpt, a.status,
        a.published_at, a.created_at,
        c.category_name,
        u.username AS author_name
      FROM tbl_articles a
      JOIN tbl_categories c ON c.id = a.category_id
      JOIN tbl_users u ON u.id = a.author_id
      WHERE a.status = 'published'
        AND (
          a.title LIKE ?
          OR a.excerpt LIKE ?
          OR a.content LIKE ?
        )
      ORDER BY a.published_at DESC, a.created_at DESC
      LIMIT ? OFFSET ?
    `;

    return this.queryAll(sql, [likeTerm, likeTerm, likeTerm, limit, offset]);
  }

  async getTrendingArticles(limit) {
    const sql = `
      SELECT id, title, slug, excerpt, featured_image, views_count, published_at
      FROM tbl_articles
      WHERE status = 'published'
      ORDER BY is_trending DESC, views_count DESC, published_at DESC
      LIMIT ?
    `;

    return this.queryAll(sql, [limit]);
  }

  async getFeaturedArticles(limit) {
    const sql = `
      SELECT id, title, slug, excerpt, featured_image, views_count, published_at
      FROM tbl_articles
      WHERE status = 'published'
      ORDER BY is_featured DESC, published_at DESC
      LIMIT ?
    `;

    return this.queryAll(sql, [limit]);
  }

  async isSlugExists(slug, excludeId = null) {
    const sql = excludeId
      ? "SELECT id FROM tbl_articles WHERE slug = ? AND id != ? LIMIT 1"
      : "SELECT id FROM tbl_articles WHERE slug = ? LIMIT 1";
    const params = excludeId ? [slug, excludeId] : [slug];
    const rows = await this.queryAll(sql, params);
    return rows.length > 0;
  }

  async getDashboardStatsForUser(user) {
    const userId = user.id;
    const role = user.role;
    const isPrivileged = role === "Admin" || role === "Editor";

    const articleCountSql = isPrivileged
      ? "SELECT COUNT(*) AS count FROM tbl_articles"
      : "SELECT COUNT(*) AS count FROM tbl_articles WHERE author_id = ?";
    const pendingCountSql = isPrivileged
      ? "SELECT COUNT(*) AS count FROM tbl_articles WHERE status = 'pending'"
      : "SELECT COUNT(*) AS count FROM tbl_articles WHERE author_id = ? AND status = 'pending'";
    const viewsSql = isPrivileged
      ? "SELECT COALESCE(SUM(views_count), 0) AS count FROM tbl_articles"
      : "SELECT COALESCE(SUM(views_count), 0) AS count FROM tbl_articles WHERE author_id = ?";

    const params = isPrivileged ? [] : [userId];
    const [articles, pending, views] = await Promise.all([
      this.queryAll(articleCountSql, params),
      this.queryAll(pendingCountSql, params),
      this.queryAll(viewsSql, params),
    ]);

    const result = {
      total_articles: articles[0]?.count || 0,
      pending_articles: pending[0]?.count || 0,
      total_views: views[0]?.count || 0,
      total_comments: 0,
      total_users: 0,
    };

    if (isPrivileged) {
      const [comments, users] = await Promise.all([
        this.queryAll("SELECT COUNT(*) AS count FROM tbl_comments WHERE status = 'pending'"),
        this.queryAll("SELECT COUNT(*) AS count FROM tbl_users WHERE status = 'active'"),
      ]);

      result.total_comments = comments[0]?.count || 0;
      result.total_users = users[0]?.count || 0;
    }

    return result;
  }

  async getCommentsForAdmin() {
    const sql = `
      SELECT
        c.id,
        c.article_id,
        c.user_id,
        c.comment_text,
        c.status,
        c.created_at,
        u.username,
        a.title AS article_title
      FROM tbl_comments c
      LEFT JOIN tbl_users u ON u.id = c.user_id
      JOIN tbl_articles a ON a.id = c.article_id
      ORDER BY c.created_at DESC
    `;

    return this.queryAll(sql);
  }

  async getCommentsByArticle(articleId) {
    const sql = `
      SELECT
        c.id,
        c.article_id,
        c.user_id,
        c.comment_text,
        c.status,
        c.created_at,
        u.username,
        u.first_name,
        u.last_name
      FROM tbl_comments c
      LEFT JOIN tbl_users u ON u.id = c.user_id
      WHERE c.article_id = ? AND c.status = 'approved'
      ORDER BY c.created_at DESC
    `;
    return this.queryAll(sql, [articleId]);
  }

  async getActivityLogs(limit = 100) {
    const sql = `
      SELECT
        l.id,
        l.user_id,
        l.action,
        l.entity_type,
        l.entity_id,
        l.description,
        l.ip_address,
        l.created_at,
        u.username
      FROM tbl_activity_logs l
      LEFT JOIN tbl_users u ON u.id = l.user_id
      ORDER BY l.created_at DESC
      LIMIT ?
    `;

    return this.queryAll(sql, [limit]);
  }

  async getRoles() {
    return this.queryAll(
      "SELECT id, role_name, description FROM tbl_roles ORDER BY id ASC"
    );
  }

  async incrementArticleViews(articleId) {
    const sql = 'UPDATE tbl_articles SET views_count = views_count + 1 WHERE id = ?';
    await this.query(sql, [articleId]);
  }

  async logActivity(
    userId,
    action,
    entityType = null,
    entityId = null,
    description = null,
    ipAddress = null
  ) {
    const data = {
      user_id: userId,
      action: action,
      entity_type: entityType,
      entity_id: entityId,
      description: description,
      ip_address: ipAddress,
    };
    try {
      return await this.insert("tbl_activity_logs", data);
    } catch (err) {
      console.error("Error logging activity:", err);
      return null;
    }
  }

  async subscribeNewsletter(email, firstName) {
    const data = {
      email,
      first_name: firstName,
      status: 'active',
      is_verified: true, // Auto-verify for now as requested
      verified_at: new Date()
    };
    return await this.insert("tbl_newsletter_subscribers", data);
  }
}

const db = new Database();
module.exports = db;
