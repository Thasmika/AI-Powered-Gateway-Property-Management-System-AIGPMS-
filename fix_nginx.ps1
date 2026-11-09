python scratch/ec2_connect.py
if ($LASTEXITCODE -ne 0) { throw "ec2_connect failed" }

echo "Uploading fixed Nginx configuration..."
scp -i my_temp_key -o StrictHostKeyChecking=no nginx.conf ubuntu@16.16.92.52:~
if ($LASTEXITCODE -ne 0) { throw "scp failed" }

echo "Applying configuration on server and restarting Nginx..."
ssh -i my_temp_key -o StrictHostKeyChecking=no ubuntu@16.16.92.52 "sudo mv ~/nginx.conf /etc/nginx/sites-available/aigpms && sudo systemctl restart nginx"
if ($LASTEXITCODE -ne 0) { throw "ssh failed" }

echo "Nginx fixed successfully! Uploaded photos should now load correctly."
