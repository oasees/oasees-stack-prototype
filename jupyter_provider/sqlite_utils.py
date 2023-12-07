import sqlite3



def create_accountDB():


	conn = sqlite3.connect('accounts.db')

	try:
		conn.execute('''CREATE TABLE ACCOUNTS
			 (ID TEXT PRIMARY KEY     NOT NULL,
			 IPFS_HASH     TEXT    NOT NULL);''')


		conn.commit()

	except sqlite3.OperationalError:
		pass


	conn.close()


def insert(_id,ipfs_hash):

	conn = sqlite3.connect('accounts.db')

	try:

		conn.execute("INSERT INTO ACCOUNTS (ID,IPFS_HASH) VALUES ({}, {})".format("\""+_id+"\"","\""+ipfs_hash+"\""));

		conn.commit()
		conn.close()


	except sqlite3.OperationalError as e:
		pass
	except sqlite3.IntegrityError as e:
		pass 


	return True


def get_hash_fromDb(_id):


	conn = sqlite3.connect('accounts.db')

	cursor = conn.execute("SELECT IPFS_HASH FROM ACCOUNTS WHERE ID = {}".format("\""+_id+"\""))

	ipfs_hash=""
	
	for row in cursor:
		ipfs_hash = row[0]


	conn.close()


	return ipfs_hash


def exists(_id):
	conn = sqlite3.connect('accounts.db')

	cursor = conn.execute("SELECT CASE WHEN EXISTS (SELECT 1 FROM ACCOUNTS WHERE ID = {}) THEN 1 ELSE 0 END;".format("\""+_id+"\""))
	
	ans = ""
	for row in cursor:
		ans = row[0]



	conn.close
	return ans


def count():

	conn =sqlite3.connect('accounts.db')
	cursor = conn.execute("SELECT COUNT(*) FROM ACCOUNTS;")
	c=0
	for row in cursor:
		c=row[0]

	conn.close()
	return c
