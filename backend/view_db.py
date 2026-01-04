"""
Simple Database Viewer for TOOL Inc
"""

import sqlite3

DATABASE = 'toolinc_system.db'

print("\n" + "="*80)
print(" " * 25 + "TOOL Inc DATABASE VIEWER")
print("="*80 + "\n")

conn = sqlite3.connect(DATABASE)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

# Show all tables
print("📋 ALL TABLES:")
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
tables = [row[0] for row in cursor.fetchall()]
for table in tables:
    cursor.execute(f"SELECT COUNT(*) FROM {table}")
    count = cursor.fetchone()[0]
    print(f"  • {table:30} ({count} rows)")

print("\n" + "-"*80)
print("👥 USERS:")
print("-"*80)
cursor.execute("SELECT id, name, email, role FROM users")
for row in cursor.fetchall():
    print(f"  ID {row['id']}: {row['name']} ({row['email']}) - {row['role'].upper()}")

print("\n" + "-"*80)
print("📦 PRODUCTS (with MRP):")
print("-"*80)
cursor.execute("SELECT id, product_name, mrp_per_item, status FROM products LIMIT 10")
for row in cursor.fetchall():
    mrp = f"₹{row['mrp_per_item']}" if row['mrp_per_item'] else "No MRP"
    print(f"  ID {row['id']}: {row['product_name']} - {mrp} - {row['status']}")

print("\n" + "-"*80)
print("🎁 DONATIONS:")
print("-"*80)
cursor.execute('''
    SELECT d.id, d.quantity, d.market_price_per_unit, d.goodwill_tokens_earned,
           p.product_name, u.name as ngo_name, d.status
    FROM donations d
    JOIN products p ON d.product_id = p.id
    JOIN users u ON d.ngo_id = u.id
    LIMIT 10
''')
donations = cursor.fetchall()
if donations:
    for row in donations:
        print(f"  Donation #{row['id']}:")
        print(f"    Product: {row['product_name']}")
        print(f"    Quantity: {row['quantity']} units @ ₹{row['market_price_per_unit']}")
        print(f"    GOODWILL: {row['goodwill_tokens_earned']}")
        print(f"    NGO: {row['ngo_name']}")
        print(f"    Status: {row['status']}")
        print()
else:
    print("  No donations yet\n")

print("-"*80)
print("🪙 GOODWILL TOKEN BALANCES:")
print("-"*80)
cursor.execute('''
    SELECT u.name, u.role, g.balance, g.total_earned
    FROM goodwill_tokens g
    JOIN users u ON g.user_id = u.id
    WHERE g.total_earned > 0
''')
balances = cursor.fetchall()
if balances:
    for row in balances:
        print(f"  {row['name']} ({row['role']}): {row['balance']} GOODWILL (earned {row['total_earned']} total)")
else:
    print("  No tokens earned yet\n")

conn.close()

print("\n" + "="*80)
print("✅ Database viewed successfully!")
print("="*80 + "\n")
