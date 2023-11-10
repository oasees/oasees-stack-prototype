import sqlite3



def create_contract_infoDB():


	conn = sqlite3.connect('contracts_info.db')

	try:
		conn.execute('''CREATE TABLE CONTRACT_INFO
			 (CONTRACT_NAME TEXT PRIMARY KEY     NOT NULL,
			 IPFS_HASH TEXT    NOT NULL);''')


		conn.commit()

	except sqlite3.OperationalError:
		pass


	conn.close()


def insert(contract_name,ipfs_hash):

	conn = sqlite3.connect('contracts_info.db')

	try:

		conn.execute("INSERT INTO CONTRACT_INFO (CONTRACT_NAME,IPFS_HASH) VALUES ({}, {})".format("\""+contract_name+"\"","\""+ipfs_hash+"\""));

		conn.commit()
		conn.close()


	except sqlite3.OperationalError as e:
		pass
	except sqlite3.IntegrityError as e:
		pass 


	return True


def get_ipfs_hash(contract_name):


	conn = sqlite3.connect('contracts_info.db')

	cursor = conn.execute("SELECT IPFS_HASH FROM CONTRACT_INFO WHERE CONTRACT_NAME = {}".format("\""+contract_name+"\""))

	_token="",
	_port=""
	

	ipfs_hash=None


	for row in cursor:
		ipfs_hash = row[0]


	conn.close()


	return ipfs_hash


# def main():
# 	create_contract_infoDB()
# 	# insert("Marketplace","dlldldld")
# 	ipfs_hash = get_ipfs_hash("Marketplace")
# 	print(ipfs_hash)


# if __name__ == '__main__':
# 	main()