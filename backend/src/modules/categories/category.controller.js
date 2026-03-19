import { v4 as uuidv4 } from "uuid";
import { pool }          from "../../config/database.js";
import { AppError }      from "../../middleware/errorHandler.js";

const getAllCategories = async (req, res, next) => {
  try {
    const [categories] = await pool.execute(
      `SELECT c.*, COUNT(p.product_id) as productCount
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.category_id AND p.isActive = TRUE
       WHERE c.isActive = TRUE
       GROUP BY c.category_id
       ORDER BY c.name ASC`
    );
    res.json({ success: true, data: categories });
  } catch (error) { next(error); }
};

const getCategoryById = async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM categories WHERE category_id = ?", [req.params.id]
    );
    if (rows.length === 0) return next(new AppError("Category not found.", 404));
    res.json({ success: true, data: rows[0] });
  } catch (error) { next(error); }
};

const createCategory = async (req, res, next) => {
  try {
    const { name, description, color, icon } = req.body;
    if (!name) return next(new AppError("Category name is required.", 400));

    const categoryId = uuidv4();
    await pool.execute(
      `INSERT INTO categories (category_id, name, description, color, icon)
       VALUES (?, ?, ?, ?, ?)`,
      [categoryId, name, description || null, color || "#6366f1", icon || null]
    );

    res.status(201).json({
      success: true, message: "Category created.",
      data: { category_id: categoryId, name },
    });
  } catch (error) { next(error); }
};

const updateCategory = async (req, res, next) => {
  try {
    const { name, description, color, icon, isActive } = req.body;

    const [existing] = await pool.execute(
      "SELECT category_id FROM categories WHERE category_id = ?", [req.params.id]
    );
    if (existing.length === 0) return next(new AppError("Category not found.", 404));

    await pool.execute(
      `UPDATE categories SET
        name        = COALESCE(?, name),
        description = COALESCE(?, description),
        color       = COALESCE(?, color),
        icon        = COALESCE(?, icon),
        isActive    = COALESCE(?, isActive)
       WHERE category_id = ?`,
      [name || null, description || null, color || null,
       icon || null, isActive !== undefined ? isActive : null, req.params.id]
    );

    res.json({ success: true, message: "Category updated." });
  } catch (error) { next(error); }
};

const deleteCategory = async (req, res, next) => {
  try {
    const [[{ count }]] = await pool.execute(
      "SELECT COUNT(*) as count FROM products WHERE category_id = ? AND isActive = TRUE",
      [req.params.id]
    );
    if (count > 0)
      return next(new AppError(`Cannot delete. ${count} products use this category.`, 400));

    await pool.execute(
      "UPDATE categories SET isActive = FALSE WHERE category_id = ?", [req.params.id]
    );
    res.json({ success: true, message: "Category deleted." });
  } catch (error) { next(error); }
};

export { getAllCategories, getCategoryById, createCategory, updateCategory, deleteCategory };