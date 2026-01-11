#!/bin/bash

# Build the project
echo "Building project..."
pnpm run build

# Deploy to server
echo "Deploying to server..."
scp -i /home/ubuntu/manus-shift-app-key.pem -r dist/* ec2-user@18.182.7.110:/tmp/shift-app-dist/

# Clean old files and move new files on server
ssh -i /home/ubuntu/manus-shift-app-key.pem ec2-user@18.182.7.110 << 'ENDSSH'
# Remove old files
sudo rm -rf /usr/share/nginx/html/*

# Move new files
sudo mv /tmp/shift-app-dist/* /usr/share/nginx/html/

# Clean temp directory
rm -rf /tmp/shift-app-dist

# Reload nginx
sudo systemctl reload nginx

echo "Deployment completed!"
ENDSSH

echo "Deployment finished successfully!"
