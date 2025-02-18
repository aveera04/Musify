# filepath: /workspaces/Musify/toy/connection_test.py
from pymongo import MongoClient
import ssl
import os
from dotenv import load_dotenv

load_dotenv()


# Replace <db_password> with your actual password.
connection_string = os.getenv("MONGODB_URI")

try:
    client = MongoClient(connection_string, tls=True, ssl_cert_reqs=ssl.CERT_REQUIRED)
    # Attempt to retrieve server information. This will force a connection.
    info = client.server_info()
    print("Connection successful!")
    print(info)
except Exception as e:
    print("An error occurred:", e)