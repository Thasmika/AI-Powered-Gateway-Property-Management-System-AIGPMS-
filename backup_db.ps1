# Backup Hosted Database Script
# This script connects to the live server (16.16.92.52) and downloads the SQLite database.
# It saves the backup into the 'backups' folder with a timestamp.

$serverIp = "16.16.92.52"
$user = "ubuntu"
$remoteDbPath = "/var/www/aigpms/backend/aigpms.db"
$keyPath = "my_temp_key"
$backupDir = "backups"

# Ensure backups directory exists
if (-not (Test-Path -Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
    Write-Host "Created $backupDir folder."
}

# Generate timestamp for the filename
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$localBackupPath = "$backupDir\aigpms_backup_$timestamp.db"

Write-Host "Starting backup from $serverIp..."
Write-Host "Refreshing temporary EC2 SSH key..."
python scratch/ec2_connect.py | Out-Null

Write-Host "Downloading database to $localBackupPath"

# Run SCP command to download the file
scp -i $keyPath -o StrictHostKeyChecking=no "$user@$serverIp`:$remoteDbPath" $localBackupPath

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database backup successful!"
    Write-Host "File saved to: $(Resolve-Path $localBackupPath)"
} else {
    Write-Host "❌ Failed to download the database. Please check your connection and SSH key." -ForegroundColor Red
}
