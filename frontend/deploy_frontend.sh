#!/bin/bash
set -e

echo "Extracting frontend..."
sudo rm -rf /var/www/aigpms/frontend
sudo mkdir -p /var/www/aigpms/frontend
sudo unzip -o ~/dist.zip -d /var/www/aigpms/frontend/ || true

echo "Setting permissions..."
sudo chown -R ubuntu:ubuntu /var/www/aigpms/frontend

echo "Updating Nginx configuration..."
cat << 'EOF' | sudo tee /etc/nginx/sites-available/aigpms
server {
    listen 80;
    server_name _;

    root /var/www/aigpms/frontend;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:8000/uploads/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

sudo systemctl restart nginx
echo "Frontend deployed successfully!"
