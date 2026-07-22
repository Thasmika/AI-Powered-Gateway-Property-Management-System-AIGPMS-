#!/bin/bash
set -e

echo "Updating system..."
sudo apt-get update
sudo apt-get upgrade -y

echo "Installing required packages..."
sudo apt-get install -y python3-pip python3-venv nginx postgresql-client

echo "Creating AIGPMS directory structure..."
sudo mkdir -p /var/www/aigpms/backend
sudo chown -R ubuntu:ubuntu /var/www/aigpms

echo "Setting up Python virtual environment..."
cd /var/www/aigpms/backend
python3 -m venv venv

echo "Basic setup complete! Ready to receive backend code."
