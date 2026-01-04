import sqlite3

conn = sqlite3.connect('toolinc_system.db')
c = conn.cursor()

print('=== MANUFACTURER ACCOUNTS ===')
c.execute('SELECT email, name, company FROM users WHERE role="manufacturer"')
for row in c.fetchall():
    print(f'Email: {row[0]}')
    print(f'Name: {row[1]}')  
    print(f'Company: {row[2]}')
    print(f'Password: password123')
    print('---')

print('\n=== RETAILER ACCOUNTS ===')
c.execute('SELECT email, name, company FROM users WHERE role="retailer"')
for row in c.fetchall():
    print(f'Email: {row[0]}')
    print(f'Name: {row[1]}')
    print(f'Company: {row[2]}')
    print(f'Password: password123')
    print('---')

print('\n=== DATABASE STATS ===')
c.execute('SELECT COUNT(*) FROM products')
print(f'Total products: {c.fetchone()[0]}')

c.execute('SELECT COUNT(*) FROM users')
print(f'Total users: {c.fetchone()[0]}')

conn.close()
