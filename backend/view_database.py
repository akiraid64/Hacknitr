"""
Quick Database Viewer for TOOL Inc
View all tables and data
"""

import sqlite3
import json
from datetime import datetime

DATABASE = 'toolinc_system.db'

def view_table(table_name, limit=10):
    """View contents of a table"""
    print(f"\n{'='*80}")
    print(f"TABLE: {table_name}")
    print('='*80)
    
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        # Get column names
        cursor.execute(f"PRAGMA table_info({table_name})")
        columns = [col[1] for col in cursor.fetchall()]
        print(f"Columns: {', '.join(columns)}\n")
        
        # Get row count
        cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
        total = cursor.fetchone()[0]
        print(f"Total rows: {total}\n")
        
        # Get data
        cursor.execute(f"SELECT * FROM {table_name} LIMIT {limit}")
        rows = cursor.fetchall()
        
        if rows:
            for i, row in enumerate(rows, 1):
                print(f"Row {i}:")
                for col in columns:
                    value = row[col]
                    # Truncate long strings
                    if isinstance(value, str) and len(value) > 100:
                        value = value[:100] + "..."
                    print(f"  {col}: {value}")
                print()
        else:
            print("No data in table\n")
            
    except sqlite3.Error as e:
        print(f"Error: {e}\n")
    finally:
        conn.close()


def show_summary():
    """Show database summary"""
    print("\n" + "="*80)
    print(" " * 25 + "TOOL Inc DATABASE SUMMARY")
    print("="*80 + "\n")
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Get all table names
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = [row[0] for row in cursor.fetchall()]
    
    print(f"Total tables: {len(tables)}\n")
    
    # Count rows in each table
    for table in tables:
        try:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            print(f"  {table:30} {count:>5} rows")
        except:
            pass
    
    conn.close()
    print()


def view_donations():
    """View donation details with related info"""
    print(f"\n{'='*80}")
    print("DONATION DETAILS")
    print('='*80 + "\n")
    
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT 
            d.id as donation_id,
            d.donation_date,
            d.quantity,
            d.market_price_per_unit,
            d.total_value_inr,
            d.goodwill_tokens_earned,
            d.status,
            p.product_name,
            r.name as retailer_name,
            n.name as ngo_name
        FROM donations d
        JOIN products p ON d.product_id = p.id
        JOIN users r ON d.retailer_id = r.id
        JOIN users n ON d.ngo_id = n.id
        ORDER BY d.donation_date DESC
        LIMIT 10
    ''')
    
    donations = cursor.fetchall()
    
    if donations:
        for donation in donations:
            print(f"Donation #{donation['donation_id']}")
            print(f"  Date: {donation['donation_date']}")
            print(f"  Product: {donation['product_name']}")
            print(f"  Quantity: {donation['quantity']}")
            print(f"  Price/unit: ₹{donation['market_price_per_unit']}")
            print(f"  Total Value: ₹{donation['total_value_inr']}")
            print(f"  GOODWILL Earned: {donation['goodwill_tokens_earned']}")
            print(f"  Retailer: {donation['retailer_name']}")
            print(f"  NGO: {donation['ngo_name']}")
            print(f"  Status: {donation['status']}")
            print()
    else:
        print("No donations yet\n")
    
    conn.close()


def view_token_balances():
    """View user token balances"""
    print(f"\n{'='*80}")
    print("GOODWILL TOKEN BALANCES")
    print('='*80 + "\n")
    
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT 
            u.name,
            u.role,
            g.balance,
            g.total_earned
        FROM goodwill_tokens g
        JOIN users u ON g.user_id = u.id
        WHERE g.balance > 0 OR g.total_earned > 0
        ORDER BY g.total_earned DESC
    ''')
    
    balances = cursor.fetchall()
    
    if balances:
        for bal in balances:
            print(f"{bal['name']} ({bal['role']})")
            print(f"  Current Balance: {bal['balance']} GOODWILL")
            print(f"  Total Earned: {bal['total_earned']} GOODWILL")
            print()
    else:
        print("No token balances yet\n")
    
    conn.close()


if __name__ == "__main__":
    print("\n" + "="*80)
    print(" " * 20 + "🔍 TOOL Inc DATABASE VIEWER")
    print("="*80)
    
    # Show summary
    show_summary()
    
    # Show key tables
    print("\n" + "-"*80)
    print("KEY TABLES:")
    print("-"*80)
    
    view_table("users", limit=5)
    view_table("products", limit=5)
    view_donations()
    view_token_balances()
    
    print("\n" + "="*80)
    print("To view specific tables, run:")
    print("  python view_database.py")
    print("\nOr use SQLite Browser: https://sqlitebrowser.org/")
    print("="*80 + "\n")
