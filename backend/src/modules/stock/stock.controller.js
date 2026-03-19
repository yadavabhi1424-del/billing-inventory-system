import { v4 as uuidv4 } from "uuid";
import { pool }          from "../../config/database.js";
import { AppError }      from "../../middleware/errorHandler.js";

const getMovements = async (req, res, next) => {
  try {
    const { page = 1, limit = 30, productId, type, startDate, endDate } = req.query;
    const offset     = (parseInt(page) - 1) * parseInt(limit);
    const conditions = ["1=1"];
    const params     = [];

    if (productId) { conditions.push("sm.product_id = ?");       params.push(productId); }
    if (type)      { conditions.push("sm.type = ?");              params.push(type); }
    if (startDate) { conditions.push("DATE(sm.createdAt) >= ?");  params.push(startDate); }
    if (endDate)   { conditions.push("DATE(sm.createdAt) <= ?");  params.push(endDate); }

    const where = conditions.join(" AND ");

    const [movements] = await pool.execute(
      `SELECT sm.*, p.name as productName, p.sku as productSku,
              p.unit as productUnit, u.name as userName
       FROM stock_movements sm
       LEFT JOIN products p ON p.product_id = sm.product_id
       LEFT JOIN users    u ON u.user_id    = sm.user_id
       WHERE ${where} ORDER BY sm.createdAt DESC
       LIMIT ${parseInt(limit)} OFFSET ${offset}`,
      params
    );

    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) as total FROM stock_movements sm WHERE ${where}`, params
    );

    res.json({
      success: true, data: movements,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) { next(error); }
};

const adjustStock = async (req, res, next) => {
  try {
    const { productId, type, quantity, reason } = req.body;

    if (!productId || !type || quantity === undefined)
      return next(new AppError("productId, type and quantity are required.", 400));

    const validTypes = ["ADJUSTMENT", "DAMAGE", "RETURN_IN", "RETURN_OUT", "TRANSFER", "PURCHASE"];
    if (!validTypes.includes(type))
      return next(new AppError(`Invalid type. Use: ${validTypes.join(", ")}`, 400));

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [[product]] = await conn.execute(
        "SELECT product_id, name, stock FROM products WHERE product_id = ? AND isActive = TRUE",
        [productId]
      );
      if (!product) throw new AppError("Product not found.", 404);

      const qty      = parseInt(quantity);
      const outTypes = ["DAMAGE", "RETURN_OUT"];
      const delta    = outTypes.includes(type) ? -Math.abs(qty) : Math.abs(qty);
      const newStock = product.stock + delta;

      if (newStock < 0)
        throw new AppError(`Cannot reduce stock below 0. Current stock: ${product.stock}`, 400);

      await conn.execute("UPDATE products SET stock = ? WHERE product_id = ?", [newStock, productId]);
      await conn.execute(
        `INSERT INTO stock_movements
          (movement_id, product_id, user_id, type, quantity, reason, balanceBefore, balanceAfter)
         VALUES (?,?,?,?,?,?,?,?)`,
        [uuidv4(), productId, req.user.user_id, type, delta,
         reason || `Manual ${type.toLowerCase()}`, product.stock, newStock]
      );

      await conn.commit();
      res.status(201).json({
        success: true, message: "Stock adjusted successfully.",
        data: { productName: product.name, previousStock: product.stock, adjustment: delta, newStock },
      });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (error) { next(error); }
};

const bulkAdjust = async (req, res, next) => {
  try {
    const { adjustments, reason } = req.body;
    if (!adjustments?.length)
      return next(new AppError("Adjustments array is required.", 400));

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      let count = 0;
      for (const adj of adjustments) {
        const [[product]] = await conn.execute(
          "SELECT product_id, stock FROM products WHERE product_id = ?", [adj.productId]
        );
        if (!product) continue;

        const delta = adj.newStock - product.stock;
        await conn.execute("UPDATE products SET stock = ? WHERE product_id = ?", [adj.newStock, adj.productId]);
        await conn.execute(
          `INSERT INTO stock_movements
            (movement_id, product_id, user_id, type, quantity, reason, balanceBefore, balanceAfter)
           VALUES (?,?,?,'ADJUSTMENT',?,?,?,?)`,
          [uuidv4(), adj.productId, req.user.user_id, delta,
           reason || "Physical stock count", product.stock, adj.newStock]
        );
        count++;
      }

      await conn.commit();
      res.json({ success: true, message: `${count} products adjusted successfully.` });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (error) { next(error); }
};

export { getMovements, adjustStock, bulkAdjust };