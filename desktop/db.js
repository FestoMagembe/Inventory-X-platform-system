const sqlite3 = require('sqlite3').verbose();
const { app } = require('electron');
const path = require('path');

// Database file path
const dbPath = path.join(app.getPath('userData'), 'inventory.db');

// Initialize database connection
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Database connection error:', err);
    } else {
        console.log('Connected to SQLite database');
        initializeTables();
    }
});

// Create tables if they don't exist
function initializeTables() {
    db.serialize(() => {
        // Products table
        db.run(`CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            category TEXT,
            quantity INTEGER DEFAULT 0,
            min_quantity INTEGER DEFAULT 5,
            price REAL,
            cost REAL,
            barcode TEXT UNIQUE,
            image_path TEXT,
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        // Users table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT,
            role TEXT CHECK(role IN ('admin', 'employee')) DEFAULT 'employee',
            last_login TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        // Inventory transactions
        db.run(`CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER,
            type TEXT CHECK(type IN ('in', 'out')),
            quantity INTEGER,
            notes TEXT,
            user_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(product_id) REFERENCES products(id),
            FOREIGN KEY(user_id) REFERENCES users(id)
        )`);

        // Create default admin user if none exists
        db.get("SELECT COUNT(*) as count FROM users WHERE role = 'admin'", (err, row) => {
            if (err) {
                console.error('Error checking admin users:', err);
                return;
            }

            if (row.count === 0) {
                const defaultAdmin = {
                    email: 'admin@inventory.com',
                    password_hash: '$2a$10$N9qo8uLOickgx2ZMRZoMy.MQDqShxs6mYwU7.ceTni3Z6BhqR6E/m', // "password123"
                    full_name: 'System Administrator',
                    role: 'admin'
                };

                db.run(
                    "INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)",
                    [defaultAdmin.email, defaultAdmin.password_hash, defaultAdmin.full_name, defaultAdmin.role],
                    (err) => {
                        if (err) {
                            console.error('Error creating default admin:', err);
                        } else {
                            console.log('Default admin user created');
                        }
                    }
                );
            }
        });
    });
}

// Database operations
module.exports = {
    // Product operations
    getAllProducts: (callback) => {
        db.all("SELECT * FROM products ORDER BY name", callback);
    },

    getProductById: (id, callback) => {
        db.get("SELECT * FROM products WHERE id = ?", [id], callback);
    },

    addProduct: (product, callback) => {
        const { name, description, category, quantity, min_quantity, price, cost, barcode } = product;
        db.run(
            "INSERT INTO products (name, description, category, quantity, min_quantity, price, cost, barcode) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [name, description, category, quantity, min_quantity, price, cost, barcode],
            callback
        );
    },

    // Report generation
    generateInventoryReport: (callback) => {
        db.all(`
            SELECT 
                p.id,
                p.name,
                p.quantity,
                p.min_quantity,
                p.price,
                (p.quantity * p.price) as total_value,
                CASE WHEN p.quantity <= p.min_quantity THEN 1 ELSE 0 END as is_low_stock
            FROM products p
            ORDER BY is_low_stock DESC, p.name
        `, callback);
    },

    // Close database connection
    close: () => {
        db.close();
    }
};