import os
from pathlib import Path
import logging

# Get the base directory path
BASE_DIR = Path(__file__).resolve().parent.parent

# Update the service account file path
SERVICE_ACCOUNT_FILE = os.path.join(BASE_DIR, 'service_account.json')

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
import io

SCOPES = ['https://www.googleapis.com/auth/drive']
# SERVICE_ACCOUNT_FILE = './service_account.json'  # Corrected path

credentials = service_account.Credentials.from_service_account_file(
    SERVICE_ACCOUNT_FILE, scopes=SCOPES
)
service = build('drive', 'v3', credentials=credentials)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def upload_to_drive(file_obj, file_name, folder_id):
    """
    Uploads a file-like object to Google Drive under the specified folder_id.
    Returns the file ID of the uploaded file.
    """
    try:
        logger.info(f"Starting upload for file: {file_name}")
        
        # Verify file object
        if not file_obj:
            logger.error("No file object provided")
            return None
            
        # Verify folder exists first
        try:
            folder = service.files().get(fileId=folder_id).execute()
            logger.info(f"Found folder: {folder['name']}")
        except Exception as e:
            logger.error(f"Folder not found or not accessible: {folder_id}")
            logger.error(str(e))
            return None

        # Convert Django InMemoryUploadedFile to stream
        file_stream = io.BytesIO(file_obj.read())
        file_obj.seek(0)  # Reset pointer
        
        # Get correct mimetype
        mimetype = getattr(file_obj, 'content_type', 'application/octet-stream')
        
        media = MediaIoBaseUpload(
            file_stream,
            mimetype=mimetype,
            resumable=True
        )
        
        file_metadata = {
            'name': file_name,
            'parents': [folder_id]
        }
        
        logger.info(f"Attempting to upload file to Google Drive folder: {folder_id}")
        
        uploaded_file = service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id'
        ).execute()

        file_id = uploaded_file.get('id')
        if file_id:
            logger.info(f"File uploaded successfully with ID: {file_id}")
            return file_id
        else:
            logger.error("File upload succeeded but no ID was returned")
            return None

    except Exception as e:
        logger.error(f"Error uploading file: {str(e)}")
        return None