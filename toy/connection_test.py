# filepath: /workspaces/Musify/toy/connection_test.py
from pymongo import MongoClient
import ssl

# Replace <db_password> with your actual password.
connection_string = "mongodb+srv://shantanur502:RDdJjBr8eSvdn7tu@musify.fil51.mongodb.net/?retryWrites=true&w=majority&appName=Musify"

try:
    client = MongoClient(connection_string, tls=True, ssl_cert_reqs=ssl.CERT_REQUIRED)
    # Attempt to retrieve server information. This will force a connection.
    info = client.server_info()
    print("Connection successful!")
    print(info)
except Exception as e:
    print("An error occurred:", e)