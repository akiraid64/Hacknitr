import sqlite3
from datetime import datetime
from typing import Optional, List, Dict
import hashlib
import secrets

DATABASE_PATH = "gs1_system.db"


def get_db_connection():
    """Create a database connection"""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_database():
    """Initialize the database with required tables"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('manufacturer', 'retailer')),
            name TEXT,
            company TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Products table (for manufacturers)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            gtin TEXT NOT NULL,
            batch_id TEXT NOT NULL,
            expiry_date TEXT NOT NULL,
            digital_link_url TEXT NOT NULL,
            product_name TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)
    
    # Scans table (for retailers)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            product_gtin TEXT NOT NULL,
            batch_id TEXT,
            expiry_date TEXT,
            days_remaining INTEGER,
            scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)
    
    # Sessions table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)
    
    conn.commit()
    conn.close()
    print("✅ Database initialized successfully")


def hash_password(password: str) -> str:
    """Hash a password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()


def generate_token() -> str:
    """Generate a secure random token"""
    return secrets.token_urlsafe(32)


# User management functions
def create_user(email: str, password: str, role: str, name: str = None, company: str = None) -> Optional[int]:
    """Create a new user"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        password_hash = hash_password(password)
        
        cursor.execute(
            "INSERT INTO users (email, password_hash, role, name, company) VALUES (?, ?, ?, ?, ?)",
            (email, password_hash, role, name, company)
        )
        
        user_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return user_id
    except sqlite3.IntegrityError:
        return None


def verify_user(email: str, password: str) -> Optional[Dict]:
    """Verify user credentials and return user data"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    password_hash = hash_password(password)
    
    cursor.execute(
        "SELECT * FROM users WHERE email = ? AND password_hash = ?",
        (email, password_hash)
    )
    
    user = cursor.fetchone()
    conn.close()
    
    if user:
        return dict(user)
    return None


def get_user_by_id(user_id: int) -> Optional[Dict]:
    """Get user by ID"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    conn.close()
    
    if user:
        return dict(user)
    return None


def get_user_by_token(token: str) -> Optional[Dict]:
    """Get user by session token"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT u.* FROM users u
        JOIN sessions s ON u.id = s.user_id
        WHERE s.token = ? AND s.expires_at > datetime('now')
    """, (token,))
    
    user = cursor.fetchone()
    conn.close()
    
    if user:
        return dict(user)
    return None


# Session management
def create_session(user_id: int) -> str:
    """Create a new session and return token"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    token = generate_token()
    expires_at = datetime.now().replace(hour=23, minute=59, second=59).isoformat()
    
    cursor.execute(
        "INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)",
        (user_id, token, expires_at)
    )
    
    conn.commit()
    conn.close()
    return token


def delete_session(token: str):
    """Delete a session (logout)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM sessions WHERE token = ?", (token,))
    conn.commit()
    conn.close()


# Product management (Manufacturers)
def create_product(user_id: int, gtin: str, batch_id: str, expiry_date: str, 
                   digital_link_url: str, product_name: str = None) -> int:
    """Create a new product"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO products (user_id, gtin, batch_id, expiry_date, digital_link_url, product_name)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (user_id, gtin, batch_id, expiry_date, digital_link_url, product_name))
    
    product_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return product_id


def get_user_products(user_id: int, limit: int = 50) -> List[Dict]:
    """Get all products for a user"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM products 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT ?
    """, (user_id, limit))
    
    products = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return products


# Scan management (Retailers)
def create_scan(user_id: int, product_gtin: str, batch_id: str, 
                expiry_date: str, days_remaining: int) -> int:
    """Record a scan"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO scans (user_id, product_gtin, batch_id, expiry_date, days_remaining)
        VALUES (?, ?, ?, ?, ?)
    """, (user_id, product_gtin, batch_id, expiry_date, days_remaining))
    
    scan_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return scan_id


def get_user_scans(user_id: int, limit: int = 50) -> List[Dict]:
    """Get all scans for a user"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM scans 
        WHERE user_id = ? 
        ORDER BY scanned_at DESC 
        LIMIT ?
    """, (user_id, limit))
    
    scans = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return scans


# Initialize database on module import
init_database()
