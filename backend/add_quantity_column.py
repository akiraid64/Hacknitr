import sqlite3

# Add quantity column to products table
conn = sqlite3.connect('toolinc_system.db', timeout=30.0)
cursor = conn.cursor()

try:
    # Try to add quantity column
    cursor.execute("ALTER TABLE products ADD COLUMN quantity INTEGER DEFAULT 1")
    conn.commit()
    print("✅ Added quantity column to products table")
except sqlite3.OperationalError as e:
    if "duplicate column name" in str(e).lower():
        print("ℹ️  Quantity column already exists")
    else:
        print(f"❌ Error: {e}")
finally:
    conn.close()
