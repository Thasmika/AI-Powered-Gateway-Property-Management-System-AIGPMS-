python scratch/ec2_connect.py
if ($LASTEXITCODE -ne 0) { throw "ec2_connect failed" }

echo "Running migrations on server..."
ssh -i my_temp_key -o StrictHostKeyChecking=no ubuntu@16.16.92.52 "cd /var/www/aigpms/backend && sudo venv/bin/python create_tables.py && sudo systemctl restart aigpms-backend"
if ($LASTEXITCODE -ne 0) { throw "ssh failed" }

echo "Migration complete!"
