import os
import shutil
import tempfile
import pytest
from io import BytesIO
from app.storage.base import LocalStorage, get_storage_backend

@pytest.fixture
def temp_storage_dir():
    temp_dir = tempfile.mkdtemp()
    yield temp_dir
    shutil.rmtree(temp_dir)

def test_local_storage_upload_exists_delete(temp_storage_dir):
    storage = LocalStorage(base_path=temp_storage_dir)
    file_content = b"Hello, World!"
    file_obj = BytesIO(file_content)
    
    # 1. upload
    dest_path = "test_dir/hello.txt"
    uploaded_path = storage.upload(file_obj, dest_path)
    assert uploaded_path == dest_path
    
    # 2. exists
    assert storage.exists(dest_path) is True
    
    # 3. read (verify content physically)
    full_path = os.path.join(temp_storage_dir, dest_path)
    with open(full_path, "rb") as f:
        content = f.read()
    assert content == file_content
    
    # 4. safe delete
    assert storage.delete(dest_path) is True
    assert storage.exists(dest_path) is False
    # Double delete should safely return False
    assert storage.delete(dest_path) is False

def test_driver_selection():
    storage = get_storage_backend("local", {"LOCAL_STORAGE_PATH": "./custom_storage"})
    assert isinstance(storage, LocalStorage)
    assert storage.base_path == "./custom_storage"
    
    with pytest.raises(ValueError, match="Unknown storage driver: unknown"):
        get_storage_backend("unknown", {})
