import sqlite3

def view_schema():
    conn = sqlite3.connect('gs1_system.db')
    cursor = conn.cursor()
    
    print("=" * 60)
    print("DATABASE SCHEMA: gs1_system.db")
    print("=" * 60)
    
    # Get all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cursor.fetchall()
    
    for table in tables:
        table_name = table[0]
        print(f"\n📋 TABLE: {table_name}")
        print("-" * 40)
        
        # Get table schema
        cursor.execute(f"PRAGMA table_info({table_name})")
        columns = cursor.fetchall()
        
        for col in columns:
            cid, name, type_, notnull, default_val, pk = col
            pk_str = " [PRIMARY KEY]" if pk else ""
            nn_str = " NOT NULL" if notnull else ""
            print(f"  • {name}: {type_}{pk_str}{nn_str}")
        
        # Get row count
        cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
        count = cursor.fetchone()[0]
        print(f"\n  📊 Rows: {count}")
        
        # Show sample data if exists
        if count > 0:
            cursor.execute(f"SELECT * FROM {table_name} LIMIT 2")
            rows = cursor.fetchall()
            print(f"  📄 Sample Data:")
            for row in rows:
                print(f"     {row}")
    
    conn.close()

if __name__ == "__main__":
    view_schema()
