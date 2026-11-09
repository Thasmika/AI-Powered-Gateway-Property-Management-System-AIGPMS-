python scratch/ec2_connect.py
if ($LASTEXITCODE -ne 0) { throw "ec2_connect failed" }

echo "Uploading files..."
scp -i my_temp_key -o StrictHostKeyChecking=no dist.zip backend.zip ubuntu@16.16.92.52:~
if ($LASTEXITCODE -ne 0) { throw "scp failed" }

echo "Refreshing EC2 connect key..."
python scratch/ec2_connect.py
if ($LASTEXITCODE -ne 0) { throw "ec2_connect failed before ssh" }

echo "Extracting on server..."
ssh -i my_temp_key -o StrictHostKeyChecking=no ubuntu@16.16.92.52 "sudo rm -rf /var/www/aigpms/frontend/* && sudo unzip -o ~/dist.zip -d /var/www/aigpms/frontend/ && sudo unzip -o ~/backend.zip -d /var/www/aigpms/backend/ && sudo chown -R ubuntu:www-data /var/www/aigpms && sudo systemctl restart aigpms-backend"
if ($LASTEXITCODE -ne 0) { throw "ssh failed" }

echo "Deployment complete!"
