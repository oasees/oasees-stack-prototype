import sqlite3

def create_agentDB():
    conn = sqlite3.connect('agent.db')
    try:
        conn.execute('''CREATE TABLE AGENT
             (ACCOUNT TEXT PRIMARY KEY     NOT NULL,
             SECRET_KEY     TEXT    NOT NULL,
             DEVICE_NAME       TEXT    NOT NULL,
             DAO_HASH    TEXT    NOT NULL,
             IPFS_HOST   TEXT   NOT NULL,
             BLOCK_CHAIN_IP TEXT    NOT NULL);''')
        conn.commit()
    except sqlite3.OperationalError:
        pass
    finally:
        conn.close()

def oasees_agent_info_get():
    conn = sqlite3.connect('agent.db')
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT ACCOUNT, SECRET_KEY, DEVICE_NAME, DAO_HASH, IPFS_HOST, BLOCK_CHAIN_IP FROM AGENT LIMIT 1;")
        account = cursor.fetchone()
        if(account):
            return account[0], account[1], account[2], account[3], account[4], account[5]
        else:
            return None,None,None,None,None,None
    except sqlite3.Error as e:
        print(f"Error retrieving the first account: {e}")
        return None
    finally:
        conn.close()

def insert_account_secret_key(account, secret_key, device_name, dao_hash, ipfs_host, block_chain_ip):
    conn = sqlite3.connect('agent.db')
    try:
        conn.execute("INSERT INTO AGENT (ACCOUNT, SECRET_KEY, DEVICE_NAME, DAO_HASH, IPFS_HOST, BLOCK_CHAIN_IP) VALUES (?, ?, ?, ?, ?, ?);",
                     (account, secret_key, device_name, dao_hash, ipfs_host, block_chain_ip))
        conn.commit()
    except sqlite3.IntegrityError:
        print("Account already exists!")
    finally:
        conn.close()

def update_dao_hash(dao_hash):
    conn = sqlite3.connect('agent.db')
    account, _, _, _, _, _ = oasees_agent_info_get()

    try:
        conn.execute("UPDATE AGENT SET DAO_HASH = ? WHERE ACCOUNT = ?;", (dao_hash, account))
        conn.commit()
    except sqlite3.Error as e:
        print(f"Error updating DAO hash: {e}")
    finally:
        conn.close()