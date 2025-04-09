# Port Scanner & File Manager

A web-based port scanner and file management system that allows you to:
- Scan for open ports on a target host
- View and download files through open ports
- Manage file sharing between devices

[![GitHub](https://img.shields.io/badge/GitHub-Repository-blue)](https://github.com/anushasconsole/PortSpy.git)

## Setup Instructions

1. Install Node.js if not already installed
   - Download from: https://nodejs.org/
   - Install the LTS version

2. Set up the server:
   ```bash
   # Navigate to the project directory
   cd PortScanner

   # Install dependencies
   npm install

   # Create a shared_files directory
   mkdir shared_files

   # Place files you want to share in the shared_files directory
   # Example:
   # cp /path/to/your/file.txt shared_files/
   ```

3. Start the server:
   ```bash
   node server/index.js
   ```

4. Access the application:
   - Open browser and go to `http://localhost:3000`
   - Enter target host and port range
   - Click "Start Scan"
   - Select open ports to access files

## Features

- Port scanning with customizable range
- Real-time scan results
- File browsing through open ports
- Secure file downloads
- User-friendly interface

## Security Notes

1. This setup is for local network use only
2. Be careful with port scanning as it may be detected as suspicious activity
3. Only share files that you have permission to distribute
4. Consider using a firewall to restrict access to specific IP addresses

## Troubleshooting

1. Connection Issues:
   - Verify both devices are on the same network
   - Check firewall settings
   - Confirm correct IP address

2. File Access:
   - Ensure files are in shared_files directory
   - Check file permissions
   - Verify port is open

3. Download Problems:
   - Check port status
   - Verify file permissions
   - Check server logs

## Repository
Find this project on GitHub: [PortSpy](https://github.com/anushasconsole/PortSpy.git) 