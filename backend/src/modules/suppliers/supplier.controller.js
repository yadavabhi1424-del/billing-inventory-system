import { v4 as uuidv4 } from "uuid";
import { AppError }      from "../../middleware/errorHandler.js";
import { masterPool }    from "../../config/masterDatabase.js";

const getAllSuppliers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, isActive = "true" } = req.query;
    const offset     = (parseInt(page) - 1) * parseInt(limit);
    const conditions = ["1=1"];
    const params     = [];

    if (isActive !== "all") { conditions.push("s.isActive = ?"); params.push(isActive === "true" ? 1 : 0); }
    if (search) { conditions.push("(s.name LIKE ? OR s.phone LIKE ? OR s.email LIKE ?)"); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }

    const where = conditions.join(" AND ");

    const [suppliers] = await req.db.execute(
      `SELECT s.*,
              COUNT(DISTINCT p.product_id) as productCount,
              COUNT(DISTINCT po.po_id)     as orderCount
       FROM suppliers s
       LEFT JOIN products        p  ON p.supplier_id  = s.supplier_id AND p.isActive = TRUE
       LEFT JOIN purchase_orders po ON po.supplier_id = s.supplier_id
       WHERE ${where} GROUP BY s.supplier_id ORDER BY s.name ASC
       LIMIT ${parseInt(limit)} OFFSET ${offset}`,
      params
    );

    const [[{ total }]] = await req.db.execute(
      `SELECT COUNT(*) as total FROM suppliers s WHERE ${where}`, params
    );

    const allIds = suppliers.map(s => s.supplier_id);
    if (allIds.length > 0) {
      const placeholders = allIds.map(() => '?').join(',');
      try {
        const [masterData] = await masterPool.execute(
          `SELECT supplier_id, db_name, owner_name, owner_email FROM suppliers 
           WHERE supplier_id IN (${placeholders}) OR db_name IN (${placeholders})`,
          [...allIds, ...allIds]
        );
        // Map both GUIDs and DB Names to ensure foolproof lookups
        const masterMap = masterData.reduce((acc, row) => ({ 
          ...acc, 
          [row.supplier_id]: row,
          [row.db_name]: row 
        }), {});

        suppliers.forEach(s => {
          const m = masterMap[s.supplier_id];
          if (m) {
            s.contactPerson = m.owner_name || s.contactPerson || 'Owner';
            s.email = m.owner_email || s.email || '—';
            s.is_network = 1;
          } else {
            s.contactPerson = s.contactPerson || '—';
            s.email = s.email || '—';
          }
        });
      } catch (e) {
        console.error("Master override failed:", e);
      }
    }

    res.json({
      success: true, data: suppliers,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) { next(error); }
};

const getSupplierById = async (req, res, next) => {
  try {
    const [rows] = await req.db.execute(
      "SELECT * FROM suppliers WHERE supplier_id = ?", [req.params.id]
    );
    if (rows.length === 0) return next(new AppError("Supplier not found.", 404));

    const [products] = await req.db.execute(
      `SELECT product_id, name, sku, stock, sellingPrice
       FROM products WHERE supplier_id = ? AND isActive = TRUE ORDER BY name ASC`,
      [req.params.id]
    );

    const [orders] = await req.db.execute(
      `SELECT po_id, poNumber, totalAmount, status, createdAt
       FROM purchase_orders WHERE supplier_id = ? ORDER BY createdAt DESC LIMIT 5`,
      [req.params.id]
    );

    res.json({ success: true, data: { ...rows[0], products, recentOrders: orders } });
  } catch (error) { next(error); }
};

const createSupplier = async (req, res, next) => {
  try {
    const { name, contactPerson, email, phone, address, city, state,
            pincode, gstin, bankName, bankAccount, ifscCode, paymentTerms, notes } = req.body;

    if (!name || !phone) return next(new AppError("Supplier name and phone are required.", 400));

    const supplierId = uuidv4();
    await req.db.execute(
      `INSERT INTO suppliers
        (supplier_id, name, contactPerson, email, phone, address, city, state,
         pincode, gstin, bankName, bankAccount, ifscCode, paymentTerms, notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [supplierId, name, contactPerson || null, email || null, phone,
       address || null, city || null, state || null, pincode || null,
       gstin || null, bankName || null, bankAccount || null,
       ifscCode || null, paymentTerms || "30 days", notes || null]
    );

    res.status(201).json({
      success: true, message: "Supplier created successfully.",
      data: { supplier_id: supplierId, name },
    });
  } catch (error) { next(error); }
};

const updateSupplier = async (req, res, next) => {
  try {
    const { name, contactPerson, email, phone, address, city, state,
            pincode, gstin, bankName, bankAccount, ifscCode,
            paymentTerms, notes, isActive } = req.body;

    const [existing] = await req.db.execute(
      "SELECT supplier_id FROM suppliers WHERE supplier_id = ?", [req.params.id]
    );
    if (existing.length === 0) return next(new AppError("Supplier not found.", 404));

    await req.db.execute(
      `UPDATE suppliers SET
        name          = COALESCE(?, name),
        contactPerson = COALESCE(?, contactPerson),
        email         = COALESCE(?, email),
        phone         = COALESCE(?, phone),
        address       = COALESCE(?, address),
        city          = COALESCE(?, city),
        state         = COALESCE(?, state),
        pincode       = COALESCE(?, pincode),
        gstin         = COALESCE(?, gstin),
        bankName      = COALESCE(?, bankName),
        bankAccount   = COALESCE(?, bankAccount),
        ifscCode      = COALESCE(?, ifscCode),
        paymentTerms  = COALESCE(?, paymentTerms),
        notes         = COALESCE(?, notes),
        isActive      = COALESCE(?, isActive)
       WHERE supplier_id = ?`,
      [name || null, contactPerson || null, email || null, phone || null,
       address || null, city || null, state || null, pincode || null,
       gstin || null, bankName || null, bankAccount || null,
       ifscCode || null, paymentTerms || null, notes || null,
       isActive !== undefined ? isActive : null, req.params.id]
    );

    res.json({ success: true, message: "Supplier updated successfully." });
  } catch (error) { next(error); }
};

const deleteSupplier = async (req, res, next) => {
  try {
    await req.db.execute(
      "UPDATE suppliers SET isActive = FALSE WHERE supplier_id = ?", [req.params.id]
    );
    res.json({ success: true, message: "Supplier deactivated." });
  } catch (error) { next(error); }
};

export { getAllSuppliers, getSupplierById, createSupplier, updateSupplier, deleteSupplier };