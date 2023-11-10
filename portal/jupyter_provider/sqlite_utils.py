import sqlite3



def create_accountDB():


	conn = sqlite3.connect('accounts.db')

	try:
		conn.execute('''CREATE TABLE ACCOUNTS
			 (ID TEXT PRIMARY KEY     NOT NULL,
			 TOKEN           TEXT    NOT NULL,
			 DAO_STORAGE_HASH     TEXT    NOT NULL,
			 PORT TEXT NOT NULL);''')


		conn.commit()

	except sqlite3.OperationalError:
		pass


	conn.close()


def insert(_id,token,port,dao_storage_hash):

	conn = sqlite3.connect('accounts.db')

	try:

		conn.execute("INSERT INTO ACCOUNTS (ID,TOKEN,PORT,DAO_STORAGE_HASH) VALUES ({}, {} ,{},{})".format("\""+_id+"\"","\""+token+"\"","\""+port+"\"","\""+dao_storage_hash+"\""));

		conn.commit()
		conn.close()


	except sqlite3.OperationalError as e:
		pass
	except sqlite3.IntegrityError as e:
		pass 


	return True


def get_token(_id):


	conn = sqlite3.connect('accounts.db')

	cursor = conn.execute("SELECT TOKEN , PORT ,DAO_STORAGE_HASH FROM ACCOUNTS WHERE ID = {}".format("\""+_id+"\""))

	_token=""
	_port=""
	_dao_storage_address=""
	
	for row in cursor:
		_token,_port,_dao_storage_hash = row


	conn.close()


	return _token,_port,_dao_storage_hash


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
