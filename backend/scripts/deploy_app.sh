#!/bin/bash
set -e

echo "Ensuring unzip is installed..."
sudo apt-get install -y unzip

echo "Extracting backend..."
sudo rm -rf /var/www/aigpms/backend/*
sudo unzip -o ~/backend.zip -d /var/www/aigpms/backend/ || true

echo "Setting up permissions..."
sudo chown -R ubuntu:ubuntu /var/www/aigpms/backend

echo "Installing python requirements..."
cd /var/www/aigpms/backend
# Recreate venv since we cleared the folder
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install gunicorn

echo "Running Database Migrations/Creation..."
# This uses the RDS database url from .env
python -c "from app.database.session import engine, Base; import app.models; Base.metadata.create_all(bind=engine)"
python -c "from app.database.session import SessionLocal; from app.database.init_db import init_db; db = SessionLocal(); init_db(db); db.close()"

echo "Setting up SystemD Service..."
cat << 'EOF' | sudo tee /etc/systemd/system/aigpms-backend.service
[Unit]
Description=Gunicorn daemon for AIGPMS Backend
After=network.target

[Service]
User=ubuntu
Group=www-data
WorkingDirectory=/var/www/aigpms/backend
Environment="PATH=/var/www/aigpms/backend/venv/bin"
ExecStart=/var/www/aigpms/backend/venv/bin/gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:8000

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable aigpms-backend
sudo systemctl restart aigpms-backend

echo "Setting up Nginx..."
cat << 'EOF' | sudo tee /etc/nginx/sites-available/aigpms
server {
    listen 80;
    server_name _;

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/aigpms /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo systemctl restart nginx

echo "Deployment of backend complete!"
