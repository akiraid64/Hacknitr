import sqlite3
import os

DATABASE_NAME = "toolinc_system.db"

from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_NAME", DATABASE_NAME)

def get_db():
    conn = sqlite3.connect(DATABASE_URL, timeout=30.0)
    conn.execute('PRAGMA journal_mode=WAL')
    conn.row_factory = sqlite3.Row
    return conn

def create_database():
    conn = get_db()
    cursor = conn.cursor()
    
    # Enable foreign keys
    cursor.execute("PRAGMA foreign_keys = ON")
    
    # 1. Users Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('manufacturer', 'retailer', 'ngo', 'admin')),
        
        -- Common fields
        company_name TEXT,
        phone TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        pincode TEXT,
        wallet_address TEXT,
        
        -- Manufacturer specific
        gstin TEXT,
        
        -- Retailer specific
        store_type TEXT,
        gps_latitude REAL,
        gps_longitude REAL,
        tool_token_balance REAL DEFAULT 0,
        
        -- NGO specific
        darpan_id TEXT,
        fcra_number TEXT,
        certificate_12a TEXT,
        certificate_80g TEXT,
        registration_number TEXT,
        is_verified BOOLEAN DEFAULT 0,
        verification_date TEXT,
        verification_method TEXT,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    
    # 2. Products Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        manufacturer_id INTEGER NOT NULL,
        
        -- Identifiers
        product_name TEXT NOT NULL,
        gtin TEXT,
        batch_id TEXT NOT NULL,
        manufacturer_gstin TEXT,
        
        -- Product Info
        product_category TEXT,
        brand TEXT,
        
        -- Quantities
        item_count INTEGER,
        quantity_manufactured INTEGER,
        quantity_in_stock INTEGER,
        remaining_quantity INTEGER,
        
        -- Dates
        manufacturing_date DATE,
        expiry_date DATE,
        shelf_life_days INTEGER,
        
        -- Specs
        weight_per_item_kg REAL,
        total_weight_kg REAL,
        
        -- QR Code
        qr_code_url TEXT UNIQUE,
        qr_code_image_path TEXT,
        
        -- Pricing
        mrp_per_item REAL,
        wholesale_price REAL,
        
        -- Supply Chain Tracking
        current_retailer_id INTEGER,
        
        -- Lifecycle Status
        status TEXT DEFAULT 'created' CHECK(status IN (
            'created', 'shipped', 'received', 'in_stock', 'selling', 
            'expiring_soon', 'donated', 'recycled', 'disposed'
        )),
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (manufacturer_id) REFERENCES users(id),
        FOREIGN KEY (current_retailer_id) REFERENCES users(id)
    )
    ''')

    
    # 3. Donations Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS donations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        retailer_id INTEGER NOT NULL,
        ngo_id INTEGER,
        product_id INTEGER,
        
        quantity INTEGER NOT NULL,
        donation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'completed', 'verified')),
        
        -- Verification
        qr_code_scanned BOOLEAN DEFAULT 0,
        gps_lat REAL,
        gps_long REAL,
        
        -- Token Calculation
        market_price_per_unit REAL,
        total_value_inr REAL, 
        goodwill_tokens_earned REAL,
        
        FOREIGN KEY (retailer_id) REFERENCES users(id),
        FOREIGN KEY (ngo_id) REFERENCES users(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
    )
    ''')
    
    # 4. Supply Chain Events (History)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS supply_chain_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        actor_id INTEGER,
        event_type TEXT NOT NULL,
        location TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT,
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (actor_id) REFERENCES users(id)
    )
    ''')
    
    # 5. GOODWILL Tokens
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS goodwill_tokens (
        user_id INTEGER PRIMARY KEY,
        balance REAL DEFAULT 0.0,
        total_earned REAL DEFAULT 0.0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    ''')
    
    # 6. Inventory Table (Retailer warehouse tracking)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        retailer_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        batch_id TEXT NOT NULL,
        current_quantity INTEGER DEFAULT 0,
        sold_quantity INTEGER DEFAULT 0,
        received_quantity INTEGER DEFAULT 0,
        days_to_expiry INTEGER,
        expiry_alert_level TEXT DEFAULT 'healthy' CHECK(expiry_alert_level IN ('healthy', 'warning', 'critical')),
        section TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (retailer_id) REFERENCES users(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
    )
    ''')
    
    # 7. Sales Table (For AI prediction training)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        retailer_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        batch_id TEXT,
        gtin TEXT,
        quantity_sold INTEGER DEFAULT 1,
        unit_price REAL,
        total_price REAL,
        sale_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        sale_date DATE,
        day_of_week INTEGER,
        is_weekend BOOLEAN DEFAULT 0,
        month INTEGER,
        weather_condition TEXT,
        temperature_celsius REAL,
        FOREIGN KEY (retailer_id) REFERENCES users(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
    )
    ''')
    
    # 8. Festivals Table (For demand forecasting)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS festivals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        date DATE NOT NULL,
        type TEXT,
        religion TEXT,
        demand_impact_percent INTEGER,
        impact_category TEXT CHECK(impact_category IN ('low', 'medium', 'high', 'very_high')),
        affected_categories TEXT,
        is_public_holiday BOOLEAN DEFAULT 0
    )
    ''')
    
    # 9. Sessions Table (Authentication)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        session_token TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    ''')
    
    # 15. AI Recommendations Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS ai_recommendations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        retailer_id INTEGER NOT NULL,
        recommendation_type TEXT NOT NULL CHECK(recommendation_type IN ('discount', 'bundle')),
        product_ids TEXT NOT NULL,
        discount_percentage REAL NOT NULL,
        reason TEXT NOT NULL,
        context TEXT,
        created_at TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        FOREIGN KEY (retailer_id) REFERENCES users(id)
    )
    ''')
    
    conn.commit()
    conn.close()
    print("✅ Database initialized successfully")

def get_user_by_token(token):
    """Get user information by session token"""
    conn = sqlite3.connect(DATABASE_NAME, timeout=30.0)
    conn.execute('PRAGMA journal_mode=WAL')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT u.id, u.email, u.role, u.name 
        FROM users u
        JOIN sessions s ON u.id = s.user_id
        WHERE s.session_token = ? AND s.expires_at > datetime('now')
    ''', (token,))
    
    user = cursor.fetchone()
    conn.close()
    
    if user:
        return dict(user)
    return None

def create_user(email, password, role, name, company=None, wallet_address=None):
    """Create a new user and return user_id"""
    import hashlib
    from datetime import datetime
    
    conn = sqlite3.connect(DATABASE_NAME, timeout=30.0)
    conn.execute('PRAGMA journal_mode=WAL')
    cursor = conn.cursor()
    
    # Hash password
    password_hash = hashlib.sha256(password.encode()).hexdigest()
    
    try:
        cursor.execute('''
            INSERT INTO users (email, password_hash, role, name, company_name, wallet_address, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (email, password_hash, role, name, company, wallet_address, datetime.now().isoformat()))
        
        conn.commit()
        user_id = cursor.lastrowid
        conn.close()
        return user_id
    except sqlite3.IntegrityError:
        conn.close()
        return None  # Email already exists

def create_session(user_id):
    """Create a new session for user and return token"""
    import secrets
    from datetime import datetime, timedelta
    
    conn = sqlite3.connect(DATABASE_NAME, timeout=30.0)
    conn.execute('PRAGMA journal_mode=WAL')
    cursor = conn.cursor()
    
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now() + timedelta(days=7)
    
    cursor.execute('''
        INSERT INTO sessions (user_id, session_token, expires_at)
        VALUES (?, ?, ?)
    ''', (user_id, token, expires_at.isoformat()))
    
    conn.commit()
    conn.close()
    return token

def create_product(user_id, gtin, batch_id, expiry_date, digital_link_url, 
                   product_name, gstin, manufacturing_date, weight_kg, item_count):
    """Create a new product/batch and return product_id"""
    conn = sqlite3.connect(DATABASE_NAME, timeout=30.0)
    conn.execute('PRAGMA journal_mode=WAL')
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO products (
            manufacturer_id, gtin, batch_id, expiry_date, qr_code_url,
            product_name, manufacturer_gstin, manufacturing_date, 
            total_weight_kg, item_count, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'created')
    ''', (user_id, gtin, batch_id, expiry_date, digital_link_url, 
          product_name, gstin, manufacturing_date, weight_kg, item_count))
    
    conn.commit()
    product_id = cursor.lastrowid
    conn.close()
    return product_id

def create_scan(user_id, product_gtin, batch_id, expiry_date, days_remaining):
    """Record a retailer scan event"""
    from datetime import datetime
    
    conn = sqlite3.connect(DATABASE_NAME, timeout=30.0)  # 30 second timeout
    conn.execute('PRAGMA journal_mode=WAL')  # Better concurrency
    cursor = conn.cursor()
    
    try:
        # First, try to find existing product by GTIN and batch
        cursor.execute('''
            SELECT id FROM products 
            WHERE gtin = ? AND batch_id = ?
            LIMIT 1
        ''', (product_gtin, batch_id))
        
        result = cursor.fetchone()
        
        if result:
            product_id = result[0]
        else:
            # Create a placeholder product entry
            cursor.execute('''
                INSERT INTO products (
                    manufacturer_id, gtin, batch_id, expiry_date, 
                    product_name, status, manufacturing_date
                ) VALUES (?, ?, ?, ?, ?, 'scanned', ?)
            ''', (user_id, product_gtin, batch_id, expiry_date, 
                  f'Product {product_gtin[:8]}', datetime.now().isoformat()))
            product_id = cursor.lastrowid
        
        # Now insert the scan event with product_id
        cursor.execute('''
            INSERT INTO supply_chain_events (
                actor_id, product_id, event_type, metadata, timestamp
            ) VALUES (?, ?, ?, ?, ?)
        ''', (user_id, product_id, 'scan', 
              f'GTIN:{product_gtin}|Batch:{batch_id}|Expiry:{expiry_date}|Days:{days_remaining}',
              datetime.now().isoformat()))
        
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def get_retailer_inventory(user_id):
    """Get all products scanned by retailer with full details"""
    conn = sqlite3.connect(DATABASE_NAME, timeout=30.0)
    conn.execute('PRAGMA journal_mode=WAL')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT DISTINCT
                p.id as product_id,
                p.product_name,
                p.gtin,
                p.batch_id,
                p.expiry_date,
                p.manufacturing_date,
                p.total_weight_kg,
                p.item_count,
                p.manufacturer_gstin,
                p.status,
                CAST(julianday(p.expiry_date) - julianday('now') AS INTEGER) as days_remaining
            FROM products p
            INNER JOIN supply_chain_events sce ON sce.product_id = p.id
            WHERE sce.actor_id = ? AND sce.event_type = 'scan'
            ORDER BY days_remaining ASC
        ''', (user_id,))
        
        products = [dict(row) for row in cursor.fetchall()]
        return products
    finally:
        conn.close()

if __name__ == "__main__":
    create_database()
