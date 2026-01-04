"""
TOOL Inc Seed Data Generator
Populates the database with realistic test data for development and testing
"""

import sqlite3
import hashlib
import secrets
from datetime import datetime, timedelta
import random

DATABASE_NAME = 'toolinc_system.db'

def hash_password(password):
    """Simple password hashing for demo purposes"""
    return hashlib.sha256(password.encode()).hexdigest()

def seed_database():
    conn = sqlite3.connect(DATABASE_NAME)
    cursor = conn.cursor()
    
    print("\n🌱 Seeding TOOL Inc Database with Test Data...")
    print("=" * 80)
    
    # ========================================================================
    # SEED 1: Users
    # ========================================================================
    print("\n1️⃣  Creating test users...")
    
    users_data = [
        # Manufacturers
        {
            'email': 'factory@britannia.com',
            'password': 'password123',
            'role': 'manufacturer',
            'name': 'Britannia Industries',
            'company_name': 'Britannia Industries Ltd',
            'phone': '+91-9876543210',
            'address': '14th Floor, Building 10-C, DLF Cyber City',
            'city': 'Gurugram',
            'state': 'Haryana',
            'pincode': '122002',
            'gstin': '06AABCB2341M1Z0',
            'wallet_address': '0xABCDEF1234567890'
        },
        {
            'email': 'amul@factory.in',
            'password': 'password123',
            'role': 'manufacturer',
            'name': 'Amul Dairy',
            'company_name': 'Gujarat Cooperative Milk Marketing Federation',
            'phone': '+91-9876543211',
            'address': 'Anand-Sojitra Road',
            'city': 'Anand',
            'state': 'Gujarat',
            'pincode': '388001',
            'gstin': '24AAAAG0140K1ZL',
            'wallet_address': '0x1234567890ABCDEF'
        },
        
        # Retailers
        {
            'email': 'bigbazaar@retail.com',
            'password': 'password123',
            'role': 'retailer',
            'name': 'Big Bazaar Andheri',
            'company_name': 'Future Retail Limited',
            'phone': '+91-9876543212',
            'address': 'Infinity Mall, Andheri West',
            'city': 'Mumbai',
            'state': 'Maharashtra',
            'pincode': '400053',
            'gps_latitude': 19.1267,
            'gps_longitude': 72.8264,
            'tool_token_balance': 0,
            'wallet_address': '0xRETAILER1234567'
        },
        {
            'email': 'dmart@retail.com',
            'password': 'password123',
            'role': 'retailer',
            'name': 'DMart Powai',
            'company_name': 'Avenue Supermarts Limited',
            'phone': '+91-9876543213',
            'address': 'Hiranandani Gardens',
            'city': 'Mumbai',
            'state': 'Maharashtra',
            'pincode': '400076',
            'gps_latitude': 19.1176,
            'gps_longitude': 72.9060,
            'tool_token_balance': 0,
            'wallet_address': '0xDMART1234567890'
        },
        
        # NGOs
        {
            'email': 'akshaya@ngo.org',
            'password': 'password123',
            'role': 'ngo',
            'name': 'Akshaya Patra Foundation',
            'company_name': 'The Akshaya Patra Foundation',
            'phone': '+91-9876543214',
            'address': 'Koramangala',
            'city': 'Bangalore',
            'state': 'Karnataka',
            'pincode': '560034',
            'gps_latitude': 12.9352,
            'gps_longitude': 77.6245,
            'registration_number': 'NGO123456789',
            'fcra_number': 'FCRA/094610076',
            'certificate_12a': '12A/2000/123',
            'certificate_80g': '80G/2001/456',
            'is_verified': 1,
            'verification_date': datetime.now().isoformat(),
            'verification_method': 'gemini_grounding',
            'tool_token_balance': 0
        },
        
        # Admin
        {
            'email': 'admin@toolinc.io',
            'password': 'admin123',
            'role': 'admin',
            'name': 'System Administrator',
            'company_name': 'TOOL Inc',
            'phone': '+91-9999999999'
        }
    ]
    
    user_ids = {}
    for user in users_data:
        password_hash = hash_password(user.pop('password'))
        
        columns = list(user.keys()) + ['password_hash']
        values = list(user.values()) + [password_hash]
        placeholders = ','.join(['?'] * len(columns))
        
        cursor.execute(f'''
            INSERT INTO users ({','.join(columns)})
            VALUES ({placeholders})
        ''', values)
        
        user_id = cursor.lastrowid
        user_ids[user['email']] = user_id
        print(f"   ✅ Created {user['role']}: {user['name']}")
    
    # ========================================================================
    # SEED 2: Products (Batches)
    # ========================================================================
    print("\n2️⃣  Creating product batches...")
    
    products_data = [
        {
            'batch_id': 'BRIT-BREAD-001',
            'gtin': '8901063111110',
            'manufacturer_id': user_ids['factory@britannia.com'],
            'manufacturer_gstin': '06AABCB2341M1Z0',
            'product_name': 'Britannia Bread 400g',
            'product_category': 'Bakery',
            'brand': 'Britannia',
            'item_count': 100,
            'weight_per_item_kg': 0.4,
            'total_weight_kg': 40.0,
            'manufacturing_date': (datetime.now() - timedelta(days=5)).date().isoformat(),
            'expiry_date': (datetime.now() + timedelta(days=2)).date().isoformat(),
            'shelf_life_days': 7,
            'qr_code_url': 'https://toolinc.io/qr/BRIT-BREAD-001',
            'mrp_per_item': 40.0,
            'wholesale_price': 32.0,
            'status': 'in_stock',
            'current_retailer_id': user_ids['bigbazaar@retail.com'],
            'remaining_quantity': 45
        },
        {
            'batch_id': 'AMUL-BUTTER-002',
            'gtin': '8901430002011',
            'manufacturer_id': user_ids['amul@factory.in'],
            'manufacturer_gstin': '24AAAAG0140K1ZL',
            'product_name': 'Amul Butter 100g',
            'product_category': 'Dairy',
            'brand': 'Amul',
            'item_count': 200,
            'weight_per_item_kg': 0.1,
            'total_weight_kg': 20.0,
            'manufacturing_date': (datetime.now() - timedelta(days=10)).date().isoformat(),
            'expiry_date': (datetime.now() + timedelta(days=5)).date().isoformat(),
            'shelf_life_days': 15,
            'qr_code_url': 'https://toolinc.io/qr/AMUL-BUTTER-002',
            'mrp_per_item': 50.0,
            'wholesale_price': 42.0,
            'status': 'in_stock',
            'current_retailer_id': user_ids['dmart@retail.com'],
            'remaining_quantity': 152
        },
        {
            'batch_id': 'BRIT-BISCUITS-003',
            'gtin': '8901063222220',
            'manufacturer_id': user_ids['factory@britannia.com'],
            'manufacturer_gstin': '06AABCB2341M1Z0',
            'product_name': 'Parle-G Biscuits 200g',
            'product_category': 'Bakery',
            'brand': 'Britannia',
            'item_count': 150,
            'weight_per_item_kg': 0.2,
            'total_weight_kg': 30.0,
            'manufacturing_date': (datetime.now() - timedelta(days=2)).date().isoformat(),
            'expiry_date': (datetime.now() + timedelta(days=20)).date().isoformat(),
            'shelf_life_days': 22,
            'qr_code_url': 'https://toolinc.io/qr/BRIT-BISCUITS-003',
            'mrp_per_item': 15.0,
            'wholesale_price': 12.0,
            'status': 'in_stock',
            'current_retailer_id': user_ids['bigbazaar@retail.com'],
            'remaining_quantity': 142
        }
    ]
    
    product_ids = {}
    for product in products_data:
        columns = list(product.keys())
        values = list(product.values())
        placeholders = ','.join(['?'] * len(columns))
        
        cursor.execute(f'''
            INSERT INTO products ({','.join(columns)})
            VALUES ({placeholders})
        ''', values)
        
        product_id = cursor.lastrowid
        product_ids[product['batch_id']] = product_id
        print(f"   ✅ Created batch: {product['batch_id']} ({product['product_name']})")
    
    # ========================================================================
    # SEED 3: Inventory
    # ========================================================================
    print("\n3️⃣  Adding inventory records...")
    
    inventory_data = [
        {
            'retailer_id': user_ids['bigbazaar@retail.com'],
            'product_id': product_ids['BRIT-BREAD-001'],
            'batch_id': 'BRIT-BREAD-001',
            'current_quantity': 45,
            'sold_quantity': 55,
            'days_to_expiry': 2,
            'expiry_alert_level': 'critical',
            'section': 'Bakery'
        },
        {
            'retailer_id': user_ids['dmart@retail.com'],
            'product_id': product_ids['AMUL-BUTTER-002'],
            'batch_id': 'AMUL-BUTTER-002',
            'current_quantity': 152,
            'sold_quantity': 48,
            'days_to_expiry': 5,
            'expiry_alert_level': 'warning',
            'section': 'Refrigerated'
        },
        {
            'retailer_id': user_ids['bigbazaar@retail.com'],
            'product_id': product_ids['BRIT-BISCUITS-003'],
            'batch_id': 'BRIT-BISCUITS-003',
            'current_quantity': 142,
            'sold_quantity': 8,
            'days_to_expiry': 20,
            'expiry_alert_level': 'healthy',
            'section': 'Dry'
        }
    ]
    
    for item in inventory_data:
        columns = list(item.keys())
        values = list(item.values())
        placeholders = ','.join(['?'] * len(columns))
        
        cursor.execute(f'''
            INSERT INTO inventory ({','.join(columns)})
            VALUES ({placeholders})
        ''', values)
        print(f"   ✅ Added inventory for batch {item['batch_id']} at retailer")
    
    # ========================================================================
    # SEED 4: Sales (last 7 days)
    # ========================================================================
    print("\n4️⃣  Creating sales records...")
    
    # Generate realistic sales data
    sales_count = 0
    for day in range(7):
        sale_date = datetime.now() - timedelta(days=day)
        num_sales = random.randint(5, 15)  # 5-15 sales per day
        
        for _ in range(num_sales):
            product = random.choice(list(product_ids.keys()))
            retailer = random.choice(['bigbazaar@retail.com', 'dmart@retail.com'])
            
            cursor.execute('''
                INSERT INTO sales (
                    retailer_id, product_id, batch_id, gtin,
                    quantity_sold, unit_price, total_price,
                    sale_timestamp, sale_date, day_of_week,
                    is_weekend, month,
                    weather_condition, temperature_celsius
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                user_ids[retailer],
                product_ids[product],
                product,
                '8901063111110',
                1,
                40.0,
                40.0,
                sale_date.isoformat(),
                sale_date.date().isoformat(),
                sale_date.weekday(),
                sale_date.weekday() >= 5,
                sale_date.month,
                random.choice(['Sunny', 'Cloudy', 'Rainy']),
                random.uniform(20, 35)
            ))
            sales_count += 1
    
    print(f"   ✅ Created {sales_count} sales records over last 7 days")
    
    # ========================================================================
    # SEED 5: Festivals
    # ========================================================================
    print("\n5️⃣  Adding festival data...")
    
    festivals_data = [
        {
            'name': 'Diwali',
            'date': '2026-10-20',
            'type': 'National',
            'religion': 'Hindu',
            'demand_impact_percent': 45,
            'impact_category': 'very_high',
            'affected_categories': '["Sweets", "Dairy", "Snacks"]',
            'is_public_holiday': 1
        },
        {
            'name': 'Holi',
            'date': '2026-03-14',
            'type': 'National',
            'religion': 'Hindu',
            'demand_impact_percent': 40,
            'impact_category': 'very_high',
            'affected_categories': '["Beverages", "Sweets", "Snacks"]',
            'is_public_holiday': 1
        },
        {
            'name': 'Christmas',
            'date': '2026-12-25',
            'type': 'National',
            'religion': 'Christian',
            'demand_impact_percent': 30,
            'impact_category': 'high',
            'affected_categories': '["Bakery", "Dairy", "Beverages"]',
            'is_public_holiday': 1
        }
    ]
    
    for festival in festivals_data:
        columns = list(festival.keys())
        values = list(festival.values())
        placeholders = ','.join(['?'] * len(columns))
        
        cursor.execute(f'''
            INSERT INTO festivals ({','.join(columns)})
            VALUES ({placeholders})
        ''', values)
        print(f"   ✅ Added festival: {festival['name']}")
    
    # ========================================================================
    # SEED 6: Sessions
    # ========================================================================
    print("\n6️⃣  Creating active sessions...")
    
    for email in ['factory@britannia.com', 'bigbazaar@retail.com', 'akshaya@ngo.org']:
        session_token = secrets.token_urlsafe(32)
        expires = datetime.now() + timedelta(days=7)
        
        cursor.execute('''
            INSERT INTO sessions (user_id, session_token, expires_at)
            VALUES (?, ?, ?)
        ''', (user_ids[email], session_token, expires.isoformat()))
        print(f"   ✅ Created session for {email}")
    
    # Commit all changes
    conn.commit()
    
    # Show summary
    print("\n" + "=" * 80)
    print("✅ Seed data creation completed successfully!")
    print("\n📊 Database Summary:")
    
    cursor.execute("SELECT COUNT(*) FROM users")
    print(f"   👥  Users: {cursor.fetchone()[0]}")
    
    cursor.execute("SELECT COUNT(*) FROM products")
    print(f"   📦  Products: {cursor.fetchone()[0]}")
    
    cursor.execute("SELECT COUNT(*) FROM inventory")
    print(f"   🏪  Inventory Records: {cursor.fetchone()[0]}")
    
    cursor.execute("SELECT COUNT(*) FROM sales")
    print(f"   💰  Sales: {cursor.fetchone()[0]}")
    
    cursor.execute("SELECT COUNT(*) FROM festivals")
    print(f"   🎉  Festivals: {cursor.fetchone()[0]}")
    
    cursor.execute("SELECT COUNT(*) FROM sessions")
    print(f"   🔐  Active Sessions: {cursor.fetchone()[0]}")
    
    print("\n🎯 Test Accounts Created:")
    print("   Manufacturer: factory@britannia.com / password123")
    print("   Retailer:     bigbazaar@retail.com / password123")
    print("   NGO:          akshaya@ngo.org / password123")
    print("   Admin:        admin@toolinc.io / admin123")
    
    print("\n" + "=" * 80)
    
    conn.close()

if __name__ == "__main__":
    seed_database()
    print("\n💡 Next step: Run view_db.py to see the populated database!")
