document.addEventListener('DOMContentLoaded', () => {
    const scanButton = document.getElementById('scanButton');
    const hostInput = document.getElementById('host');
    const portLowInput = document.getElementById('portLow');
    const portHighInput = document.getElementById('portHigh');
    const resultsDiv = document.getElementById('results');
    const statusDiv = document.getElementById('scanningStatus');
    const scanTimeDiv = document.getElementById('scanTime');
    const selectedPortSelect = document.getElementById('selectedPort');
    const connectButton = document.getElementById('connectButton');
    const fileBrowserStatusDiv = document.getElementById('fileBrowserStatus');
    const fileListDiv = document.getElementById('fileList');

    let openPorts = [];
    let currentHost = '';
    let isFileServerPage = false;

    // Port scanning functionality
    scanButton.addEventListener('click', async () => {
        const host = hostInput.value;
        const portLow = parseInt(portLowInput.value);
        const portHigh = parseInt(portHighInput.value);

        if (!host) {
            alert('Please enter a host to scan');
            return;
        }

        if (portLow > portHigh) {
            alert('Starting port must be less than ending port');
            return;
        }

        // Save the current host
        currentHost = host;

        // Reset file browser
        selectedPortSelect.innerHTML = '<option value="">-- Select a Port --</option>';
        selectedPortSelect.disabled = true;
        connectButton.disabled = true;
        fileListDiv.innerHTML = '';
        fileBrowserStatusDiv.textContent = '';

        // Disable the scan button and show scanning status
        scanButton.disabled = true;
        statusDiv.textContent = 'Scanning in progress...';
        resultsDiv.innerHTML = '';
        scanTimeDiv.textContent = '';
        openPorts = [];

        try {
            const startTime = Date.now();
            const response = await fetch('/scan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    host,
                    portLow,
                    portHigh
                })
            });

            const data = await response.json();
            const endTime = Date.now();
            const scanTime = (endTime - startTime) / 1000;

            // Display results
            if (data.error) {
                statusDiv.textContent = `Error: ${data.error}`;
                console.error('Scan error:', data.error);
            } else {
                statusDiv.textContent = data.message || 'Scan completed!';
            }

            // Display open ports
            if (data.openPorts && data.openPorts.length > 0) {
                openPorts = data.openPorts;
                data.openPorts.forEach(port => {
                    const portElement = document.createElement('div');
                    portElement.className = 'port-item port-open';
                    portElement.textContent = `Port ${port}`;
                    portElement.dataset.port = port;
                    portElement.addEventListener('click', () => selectPort(port));
                    resultsDiv.appendChild(portElement);
                });

                // Populate the port dropdown for file browser
                openPorts.forEach(port => {
                    const option = document.createElement('option');
                    option.value = port;
                    option.textContent = `Port ${port}`;
                    selectedPortSelect.appendChild(option);
                });
                selectedPortSelect.disabled = false;
                connectButton.disabled = false;
            } else {
                const noPortsElement = document.createElement('div');
                noPortsElement.className = 'port-item port-closed';
                noPortsElement.textContent = 'No open ports found';
                resultsDiv.appendChild(noPortsElement);
            }

            scanTimeDiv.textContent = `Scan completed in ${scanTime.toFixed(2)} seconds`;
        } catch (error) {
            console.error('Network error:', error);
            statusDiv.textContent = 'Error during scan: ' + error.message;
            const errorElement = document.createElement('div');
            errorElement.className = 'port-item port-closed';
            errorElement.textContent = 'Error occurred during scan';
            resultsDiv.appendChild(errorElement);
        } finally {
            scanButton.disabled = false;
        }
    });

    // Function to select a port from the scan results
    function selectPort(port) {
        // Remove selected class from all ports
        document.querySelectorAll('.port-item').forEach(item => {
            item.classList.remove('port-selected');
        });
        
        // Add selected class to the clicked port
        const selectedItem = document.querySelector(`.port-item[data-port="${port}"]`);
        if (selectedItem) {
            selectedItem.classList.add('port-selected');
        }
        
        // Set the dropdown value
        selectedPortSelect.value = port;
    }

    // Connect to file server button click handler
    connectButton.addEventListener('click', () => {
        const selectedPort = selectedPortSelect.value;
        
        if (!selectedPort) {
            fileBrowserStatusDiv.textContent = 'Please select a port first';
            return;
        }
        
        if (!currentHost) {
            fileBrowserStatusDiv.textContent = 'Host not set. Please scan first';
            return;
        }
        
        // Check if the port can serve files
        connectToFileServer(currentHost, selectedPort);
    });

    // Function to connect to file server and display files
    async function connectToFileServer(host, port) {
        fileBrowserStatusDiv.textContent = `Connecting to file server at ${host}:${port}...`;
        fileListDiv.innerHTML = '';
        
        try {
            // Fetch available files from our server
            const response = await fetch('/files');
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            // Create file browser UI
            fileListDiv.innerHTML = `
                <div class="file-browser-header">
                    <button id="backButton" class="back-button">← Back</button>
                    <h3>Available Files</h3>
                </div>
                <div class="file-list-container">
                    ${data.files.length > 0 ? 
                        data.files.map(file => `
                            <div class="file-item">
                                <span class="file-name">${file}</span>
                                <button class="download-button" data-file="${file}" data-port="${port}">
                                    Download
                                </button>
                            </div>
                        `).join('') :
                        '<div class="no-files">No files available</div>'
                    }
                </div>
            `;
            
            fileBrowserStatusDiv.textContent = `Connected to file server at ${host}:${port}`;
            
            // Add event listeners
            document.getElementById('backButton').addEventListener('click', () => {
                fileListDiv.innerHTML = '';
                fileBrowserStatusDiv.textContent = 'Select a port and connect to browse files';
            });

            // Add download button event listeners
            document.querySelectorAll('.download-button').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const filename = e.target.dataset.file;
                    const port = e.target.dataset.port;
                    await downloadFile(filename, port);
                });
            });
        } catch (error) {
            console.error('Error connecting to file server:', error);
            fileBrowserStatusDiv.textContent = `Error connecting to file server: ${error.message}`;
        }
    }

    // Function to download a file
    async function downloadFile(filename, port) {
        try {
            const response = await fetch(`/download/${port}/${filename}`);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to download file');
            }

            // Create a blob from the response
            const blob = await response.blob();
            
            // Create a download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            
            // Cleanup
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            fileBrowserStatusDiv.textContent = `Downloaded ${filename} successfully`;
        } catch (error) {
            console.error('Error downloading file:', error);
            fileBrowserStatusDiv.textContent = `Error downloading file: ${error.message}`;
        }
    }
});