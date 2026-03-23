import { v4 as uuidv4 } from "uuid";
import { AppError }      from "../../middleware/errorHandler.js";

const getAllProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, categoryId,
            supplierId, lowStock, isActive = "true" } = req.query;

    const offset     = (parseInt(page) - 1) * parseInt(limit);
    const conditions = ["1=1"];
    const params     = [];

    if (isActive !== "all") { conditions.push("p.isActive = ?"); params.push(isActive === "true" ? 1 : 0); }
    if (categoryId)         { conditions.push("p.category_id = ?"); params.push(categoryId); }
    if (supplierId)         { conditions.push("p.supplier_id = ?"); params.push(supplierId); }
    if (lowStock === "true"){ conditions.push("p.stock <= p.minStockLevel"); }
    if (search)             { conditions.push("(p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)"); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }

    const where = conditions.join(" AND ");

    const [products] = await req.db.execute(
      `SELECT p.*, c.name as categoryName, c.color as categoryColor,
              s.name as supplierName, (p.stock <= p.minStockLevel) as isLowStock
       FROM products p
       LEFT JOIN categories c ON c.category_id = p.category_id
       LEFT JOIN suppliers  s ON s.supplier_id  = p.supplier_id
       WHERE ${where} ORDER BY p.name ASC
       LIMIT ${parseInt(limit)} OFFSET ${offset}`,
      params
    );

    const [[{ total }]] = await req.db.execute(
      `SELECT COUNT(*) as total FROM products p WHERE ${where}`, params
    );

    res.json({
      success: true, data: products,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) { next(error); }
};

const getProductById = async (req, res, next) => {
  try {
    const [rows] = await req.db.execute(
      `SELECT p.*, c.name as categoryName, s.name as supplierName, s.phone as supplierPhone
       FROM products p
       LEFT JOIN categories c ON c.category_id = p.category_id
       LEFT JOIN suppliers  s ON s.supplier_id  = p.supplier_id
       WHERE p.product_id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return next(new AppError("Product not found.", 404));
    res.json({ success: true, data: rows[0] });
  } catch (error) { next(error); }
};

const getProductBySku = async (req, res, next) => {
  try {
    const [rows] = await req.db.execute(
      `SELECT p.*, c.name as categoryName
       FROM products p
       LEFT JOIN categories c ON c.category_id = p.category_id
       WHERE (p.sku = ? OR p.barcode = ?) AND p.isActive = TRUE`,
      [req.params.sku, req.params.sku]
    );
    if (rows.length === 0) return next(new AppError("Product not found.", 404));
    res.json({ success: true, data: rows[0] });
  } catch (error) { next(error); }
};

const getLowStockProducts = async (req, res, next) => {
  try {
    const [products] = await req.db.execute(
      `SELECT p.*, c.name as categoryName, s.name as supplierName, s.phone as supplierPhone
       FROM products p
       LEFT JOIN categories c ON c.category_id = p.category_id
       LEFT JOIN suppliers  s ON s.supplier_id  = p.supplier_id
       WHERE p.stock <= p.minStockLevel AND p.isActive = TRUE
       ORDER BY (p.stock - p.minStockLevel) ASC`
    );
    res.json({ success: true, data: products, count: products.length });
  } catch (error) { next(error); }
};

const createProduct = async (req, res, next) => {
  try {
    const { name, sku, barcode, description, categoryId, supplierId, unit,
            costPrice, sellingPrice, mrp, taxRate, taxType, stock,
            minStockLevel, maxStockLevel, location, expiryDate } = req.body;

    if (!name || !sku || !categoryId || sellingPrice === undefined)
      return next(new AppError("Name, SKU, category and selling price are required.", 400));

    const productId    = uuidv4();
    const image        = req.file ? req.file.filename : null;
    const initialStock = parseInt(stock) || 0;

    const conn = await req.db.getConnection();
    try {
      await conn.beginTransaction();

      await conn.execute(
        `INSERT INTO products
          (product_id, name, sku, barcode, description, category_id, supplier_id,
           unit, costPrice, sellingPrice, mrp, taxRate, taxType, stock,
           minStockLevel, maxStockLevel, location, image, expiryDate)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [productId, name, sku, barcode || null, description || null,
         categoryId, supplierId || null, unit || "pcs",
         parseFloat(costPrice) || 0, parseFloat(sellingPrice),
         mrp ? parseFloat(mrp) : null,
         parseFloat(taxRate) || 0, taxType || "GST",
         initialStock, parseInt(minStockLevel) || 10,
         maxStockLevel ? parseInt(maxStockLevel) : null,
         location || null, image, expiryDate || null]
      );

      if (initialStock > 0) {
        await conn.execute(
          `INSERT INTO stock_movements
            (movement_id, product_id, user_id, type, quantity, reason, balanceBefore, balanceAfter)
           VALUES (?, ?, ?, 'ADJUSTMENT', ?, 'Initial stock', 0, ?)`,
          [uuidv4(), productId, req.user.user_id, initialStock, initialStock]
        );
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    res.status(201).json({
      success: true, message: "Product created successfully.",
      data: { product_id: productId, name, sku },
    });
  } catch (error) { next(error); }
};

const updateProduct = async (req, res, next) => {
  try {
    const {
      name, barcode, description, categoryId,
      supplierId, unit, costPrice, sellingPrice,
      mrp, taxRate, taxType, minStockLevel,
      maxStockLevel, location, isActive,
      expiryDate, stock,
    } = req.body;

    const [existing] = await req.db.execute(
      "SELECT product_id, stock FROM products WHERE product_id = ?",
      [req.params.id]
    );

    if (existing.length === 0) {
      return next(new AppError("Product not found.", 404));
    }

    // Stock can only increase — prevent decrease
    const currentStock = existing[0].stock;
    const newStock     = stock !== undefined ? parseInt(stock) : currentStock;

    if (newStock < currentStock) {
      return next(new AppError(
        `Stock cannot be decreased from ${currentStock} to ${newStock}. Use stock adjustment instead.`,
        400
      ));
    }

    await req.db.execute(
      `UPDATE products SET
        name          = COALESCE(?, name),
        barcode       = COALESCE(?, barcode),
        description   = COALESCE(?, description),
        category_id   = COALESCE(?, category_id),
        supplier_id   = COALESCE(?, supplier_id),
        unit          = COALESCE(?, unit),
        costPrice     = COALESCE(?, costPrice),
        sellingPrice  = COALESCE(?, sellingPrice),
        mrp           = COALESCE(?, mrp),
        taxRate       = COALESCE(?, taxRate),
        taxType       = COALESCE(?, taxType),
        minStockLevel = COALESCE(?, minStockLevel),
        maxStockLevel = COALESCE(?, maxStockLevel),
        location      = COALESCE(?, location),
        isActive      = COALESCE(?, isActive),
        expiryDate    = COALESCE(?, expiryDate),
        stock         = ?
       WHERE product_id = ?`,
      [
        name || null, barcode || null, description || null,
        categoryId || null, supplierId || null, unit || null,
        costPrice     ? parseFloat(costPrice)     : null,
        sellingPrice  ? parseFloat(sellingPrice)  : null,
        mrp           ? parseFloat(mrp)           : null,
        taxRate       !== undefined ? parseFloat(taxRate) : null,
        taxType       || null,
        minStockLevel ? parseInt(minStockLevel)   : null,
        maxStockLevel ? parseInt(maxStockLevel)   : null,
        location      || null,
        isActive      !== undefined ? isActive    : null,
        expiryDate    || null,
        newStock,
        req.params.id,
      ]
    );

    // Log stock movement if stock changed
    if (newStock > currentStock) {
      const { v4: uuidv4 } = await import('uuid');
      await req.db.execute(
        `INSERT INTO stock_movements
          (movement_id, product_id, user_id, type,
           quantity, reason, balanceBefore, balanceAfter)
         VALUES (?, ?, ?, 'ADJUSTMENT', ?, 'Manual stock update via edit', ?, ?)`,
        [
          uuidv4(), req.params.id, req.user.user_id,
          newStock - currentStock, currentStock, newStock,
        ]
      );
    }

    res.json({ success: true, message: "Product updated successfully." });
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    await req.db.execute(
      "UPDATE products SET isActive = FALSE WHERE product_id = ?", [req.params.id]
    );
    res.json({ success: true, message: "Product deactivated." });
  } catch (error) { next(error); }
};

export { getAllProducts, getProductById, getProductBySku,
         getLowStockProducts, createProduct, updateProduct, deleteProduct };