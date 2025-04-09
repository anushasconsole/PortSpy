/**
 * 
 * @description Express server for port scanning and file serving
 */

const express = require('express');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Serve the web interface
app.get('/', (req, res) => {
    try {
        const indexPath = path.join(__dirname, '../public/index.html');
        if (!fs.existsSync(indexPath)) {
            console.error('index.html not found at:', indexPath);
            res.status(404).send('Web interface not found. Please check if public/index.html exists.');
            return;
        }
        res.sendFile(indexPath);
    } catch (error) {
        console.error('Error serving index.html:', error);
        res.status(500).send('Error loading the page');
    }
});

// List available files
app.get('/files', (req, res) => {
    try {
        const sharedFilesDir = path.join(__dirname, '../shared_files');
        if (!fs.existsSync(sharedFilesDir)) {
            fs.mkdirSync(sharedFilesDir);
        }
        const files = fs.readdirSync(sharedFilesDir);
        res.json({ files });
    } catch (error) {
        console.error('Error listing files:', error);
        res.status(500).json({ error: 'Failed to list files' });
    }
});

// Download file through specific port
app.get('/download/:port/:filename', (req, res) => {
    const { port, filename } = req.params;
    const sharedFilesDir = path.join(__dirname, '../shared_files');
    const filePath = path.join(sharedFilesDir, filename);

    try {
        // Validate port number
        const portNum = parseInt(port);
        if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
            return res.status(400).json({ error: 'Invalid port number' });
        }

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Set headers for file download
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.setHeader('Content-Type', 'application/octet-stream');
        
        // Stream the file
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);

        fileStream.on('error', (err) => {
            console.error('Error streaming file:', err);
            res.status(500).json({ error: 'Error downloading file' });
        });
    } catch (error) {
        console.error('Error in download endpoint:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Handle port scanning requests
app.post('/scan', (req, res) => {
    const { host, portLow, portHigh } = req.body;
    console.log('Received scan request for:', { host, portLow, portHigh });

    try {
        // Validate port range
        const low = parseInt(portLow);
        const high = parseInt(portHigh);
        if (isNaN(low) || isNaN(high) || low < 1 || high > 65535 || low > high) {
            return res.status(400).json({ error: 'Invalid port range' });
        }

        // Update config.json with the new port range
        const configPath = path.join(__dirname, '../config.json');
        const config = require(configPath);
        config.range.low = portLow.toString();
        config.range.high = portHigh.toString();
        fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
        console.log('Updated config.json with new port range');

        // Run the Python scanner
        const pythonProcess = spawn('python', ['src/scanner.py'], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let output = '';
        let openPorts = [];

        // Send the host input
        pythonProcess.stdin.write(host + '\n');
        console.log('Sent host input to Python process');

        // Handle scanner output
        pythonProcess.stdout.on('data', (data) => {
            const outputStr = data.toString();
            output += outputStr;
            console.log('Scanner output:', outputStr);
            
            // Parse open ports from output
            const lines = outputStr.split('\n');
            lines.forEach(line => {
                if (line.includes('Port') && line.includes('Open')) {
                    const portMatch = line.match(/\d+/);
                    if (portMatch) {
                        const port = parseInt(portMatch[0]);
                        if (!isNaN(port)) {
                            openPorts.push(port);
                            console.log('Found open port:', port);
                        }
                    }
                }
            });
        });

        // Handle errors
        pythonProcess.stderr.on('data', (data) => {
            const errorStr = data.toString();
            console.error('Scanner error:', errorStr);
            res.status(500).json({ 
                error: 'Scanner error occurred: ' + errorStr,
                openPorts: [] 
            });
        });

        // Handle completion
        pythonProcess.on('close', (code) => {
            console.log(`Scanner process exited with code ${code}`);
            console.log('Final open ports:', openPorts);
            res.json({ 
                openPorts: openPorts || [],
                message: openPorts.length > 0 ? 'Found open ports' : 'No open ports found'
            });
        });

        // Handle process errors
        pythonProcess.on('error', (err) => {
            console.error('Failed to start Python process:', err);
            res.status(500).json({ 
                error: 'Failed to start scanner: ' + err.message,
                openPorts: [] 
            });
        });

    } catch (error) {
        console.error('Error in scan endpoint:', error);
        res.status(500).json({ 
            error: 'Internal server error: ' + error.message,
            openPorts: [] 
        });
    }
});

// Start the server
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log('Server accessible from other devices on the network');
    console.log('Checking if public directory exists...');
    const publicDir = path.join(__dirname, '../public');
    if (!fs.existsSync(publicDir)) {
        console.error('Public directory not found! Creating it...');
        fs.mkdirSync(publicDir);
    }
    console.log('Public directory exists at:', publicDir);
    
    // Create shared_files directory if it doesn't exist
    const sharedFilesDir = path.join(__dirname, '../shared_files');
    if (!fs.existsSync(sharedFilesDir)) {
        console.log('Creating shared_files directory...');
        fs.mkdirSync(sharedFilesDir);
    }
    console.log('Shared files directory exists at:', sharedFilesDir);
});