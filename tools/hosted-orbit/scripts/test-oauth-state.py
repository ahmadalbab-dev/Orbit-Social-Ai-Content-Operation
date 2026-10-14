import sqlite3
from pathlib import Path
c = sqlite3.connect(':memory:')
c.executescript(Path('drizzle/0000_misty_may_parker.sql').read_text())
c.execute('INSERT INTO oauth_state VALUES (?,?,?,?,?)', ('hash','owner','meta','browser',1000))
query='DELETE FROM oauth_state WHERE hash=? AND user_id=? AND provider=? AND browser_hash=? AND expires_at>? RETURNING hash'
for args in [('hash','other','meta','browser',100),('hash','owner','threads','browser',100),('hash','owner','meta','wrong',100),('hash','owner','meta','browser',1100)]:
    assert c.execute(query,args).fetchone() is None
assert c.execute(query,('hash','owner','meta','browser',100)).fetchone()==('hash',)
assert c.execute(query,('hash','owner','meta','browser',100)).fetchone() is None
print('State expiry, ownership and one-time consumption passed')
