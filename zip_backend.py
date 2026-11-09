import zipfile
import os

def zipdir(path, ziph, exclude_dirs=None, exclude_exts=None, exclude_files=None, root_dir=None):
    if exclude_dirs is None: exclude_dirs = []
    if exclude_exts is None: exclude_exts = []
    if exclude_files is None: exclude_files = []
    if root_dir is None: root_dir = path
    
    for root, dirs, files in os.walk(path):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        for file in files:
            if not any(file.endswith(ext) for ext in exclude_exts) and file not in exclude_files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, root_dir)
                ziph.write(file_path, arcname)

print('Re-zipping backend (excluding .env)...')
with zipfile.ZipFile('backend.zip', 'w', zipfile.ZIP_DEFLATED) as zipf:
    zipdir('backend', zipf, 
           exclude_dirs=['.venv', '__pycache__', '.pytest_cache', 'uploads', 'jose'],
           exclude_exts=['.db', '.zip', '.pem'],
           exclude_files=['.env'])

print('Backend zipped successfully.')
