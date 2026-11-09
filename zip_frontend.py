import zipfile
import os

def zipdir(path, ziph, root_dir):
    for root, dirs, files in os.walk(path):
        for file in files:
            file_path = os.path.join(root, file)
            arcname = os.path.relpath(file_path, root_dir)
            ziph.write(file_path, arcname)

print('Zipping frontend...')
with zipfile.ZipFile('dist.zip', 'w', zipfile.ZIP_DEFLATED) as zipf:
    zipdir('frontend/dist', zipf, 'frontend/dist')

print('Frontend zipped successfully.')
