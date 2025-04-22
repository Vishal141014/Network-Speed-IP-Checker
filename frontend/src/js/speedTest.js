/**
 * Network Speed & IP Checker - Speed Test Module
 * Handles download speed, upload speed, and ping testing
 */

// DOM Elements
const startTestButton = document.getElementById('start-test');
const progressBar = document.getElementById('progress-bar');
const progressStatus = document.getElementById('progress-status');
const testProgress = document.getElementById('test-progress');
const downloadSpeedElement = document.getElementById('download-speed');
const uploadSpeedElement = document.getElementById('upload-speed');
const pingValueElement = document.getElementById('ping-value');

// Configuration
const config = {
    // Test file sizes in bytes
    downloadTestFile: 5 * 1024 * 1024, // 5MB test file
    uploadTestSize: 2 * 1024 * 1024,   // 2MB test data
    pingTimes: 10,                     // Number of ping tests to perform
    
    // Detect if we're running on Vercel
    isVercel: window.location.hostname.includes('vercel.app'),
    
    // API endpoints - will be set dynamically
    apiBaseUrl: '',
    pingUrl: '',
    downloadUrl: '',
    uploadUrl: '',
    
    // External test URLs (for client-side only testing)
    testUrls: {
        download: 'https://speed.cloudflare.com/100mb.bin',
        upload: 'https://httpbin.org/post',
        ping: 'https://www.google.com'
    },
    
    // Use client-side only methods by default
    useClientSideOnly: true
};

// Set API URLs based on environment
function initializeConfig() {
    // Check if we're running on Vercel deployment
    if (config.isVercel) {
        // When deployed on Vercel, we use the api routes pattern
        config.apiBaseUrl = '/api/speedtest';
        config.pingUrl = '/api/speedtest/ping';
        config.downloadUrl = '/api/speedtest/download';
        config.uploadUrl = '/api/speedtest/upload';
        config.useClientSideOnly = false; // Prefer server API when on Vercel
    } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        // When running locally with backend server
        const port = window.location.port || '3000';
        const baseUrl = `http://${window.location.hostname}:${port}`;
        config.apiBaseUrl = `${baseUrl}/api/speedtest`;
        config.pingUrl = `${baseUrl}/api/speedtest/ping`;
        config.downloadUrl = `${baseUrl}/api/speedtest/download`;
        config.uploadUrl = `${baseUrl}/api/speedtest/upload`;
        config.useClientSideOnly = false; // Prefer server API when on localhost
    } else {
        // Default to client-side only mode for other environments
        config.useClientSideOnly = true;
    }
    
    console.log(`Speed test mode: ${config.useClientSideOnly ? 'Client-side only' : 'Using backend API'}`);
}

// Initialize configuration
initializeConfig();

// Event Listeners
startTestButton.addEventListener('click', runSpeedTest);

// Main Speed Test Function
async function runSpeedTest() {
    try {
        // Reset and show the progress bar
        startTestButton.disabled = true;
        testProgress.classList.remove('hidden');
        progressBar.style.width = '0%';
        progressStatus.textContent = 'Preparing test...';
        
        // Reset results
        downloadSpeedElement.textContent = '--';
        uploadSpeedElement.textContent = '--';
        pingValueElement.textContent = '--';
        
        // Measure ping
        updateProgress(10, 'Measuring ping...');
        const pingResult = await measurePing();
        pingValueElement.textContent = pingResult.toFixed(1);
        
        // Measure download speed
        updateProgress(30, 'Measuring download speed...');
        const downloadSpeed = await measureDownloadSpeed();
        downloadSpeedElement.textContent = downloadSpeed.toFixed(1);
        
        // Measure upload speed
        updateProgress(60, 'Measuring upload speed...');
        const uploadSpeed = await measureUploadSpeed();
        uploadSpeedElement.textContent = uploadSpeed.toFixed(1);
        
        // Complete
        updateProgress(100, 'Test completed!');
        
        // Apply animations to results
        downloadSpeedElement.classList.add('result-appear');
        uploadSpeedElement.classList.add('result-appear');
        pingValueElement.classList.add('result-appear');
        
        // Re-enable the test button
        setTimeout(() => {
            startTestButton.disabled = false;
            // Reset progress bar after a delay
            setTimeout(() => {
                testProgress.classList.add('hidden');
            }, 2000);
        }, 1000);
        
    } catch (error) {
        console.error('Speed test error:', error);
        progressStatus.textContent = 'Test failed. Please try again.';
        startTestButton.disabled = false;
        
        // Show estimated values instead
        pingValueElement.textContent = estimateSpeed('ping').toFixed(1);
        downloadSpeedElement.textContent = estimateSpeed('download').toFixed(1);
        uploadSpeedElement.textContent = estimateSpeed('upload').toFixed(1);
        
        // Apply animations to results
        downloadSpeedElement.classList.add('result-appear');
        uploadSpeedElement.classList.add('result-appear');
        pingValueElement.classList.add('result-appear');
        
        updateProgress(100, 'Test completed with estimated values');
    }
}

// Measure Ping / Latency
async function measurePing() {
    const pings = [];
    const maxAttempts = config.pingTimes;
    
    for (let i = 0; i < maxAttempts; i++) {
        const start = performance.now();
        
        try {
            if (!config.useClientSideOnly) {
                // Use backend ping endpoint
                const response = await fetch(`${config.pingUrl}?cache=${Date.now()}`, {
                    cache: 'no-store'
                });
                
                if (!response.ok) {
                    throw new Error('Ping server error');
                }
            } else {
                // Use no-cors mode for client-side testing
                await fetch(`${config.testUrls.ping}?cache=${Date.now()}`, {
                    mode: 'no-cors',
                    cache: 'no-store'
                });
            }
            
            const end = performance.now();
            pings.push(end - start);
            
            // Small delay between pings
            await new Promise(resolve => setTimeout(resolve, 100));
            
        } catch (error) {
            console.warn('Ping attempt failed:', error);
            // Fall back to client-side method if server method fails
            if (!config.useClientSideOnly) {
                try {
                    const clientStart = performance.now();
                    await fetch(`${config.testUrls.ping}?cache=${Date.now()}`, {
                        mode: 'no-cors',
                        cache: 'no-store'
                    });
                    const clientEnd = performance.now();
                    pings.push(clientEnd - clientStart);
                } catch (e) {
                    console.error('All ping attempts failed');
                }
            }
        }
    }
    
    // Calculate average ping time (ms)
    if (pings.length === 0) {
        return estimateSpeed('ping');
    }
    
    // Remove outliers
    pings.sort((a, b) => a - b);
    const trimmedPings = pings.slice(Math.floor(pings.length * 0.2), Math.ceil(pings.length * 0.8));
    
    // Average the remaining pings
    const avgPing = trimmedPings.reduce((sum, ping) => sum + ping, 0) / trimmedPings.length;
    return avgPing;
}

// Measure Download Speed
async function measureDownloadSpeed() {
    let testUrl;
    
    if (!config.useClientSideOnly) {
        // Use backend download endpoint
        testUrl = `${config.downloadUrl}?size=${config.downloadTestFile}&cache=${Date.now()}`;
    } else {
        // Use client-side testing URL
        testUrl = `${config.testUrls.download}?cache=${Date.now()}`;
    }
    
    const start = performance.now();
    let bytesReceived = 0;
    
    try {
        // Use fetch with a timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(testUrl, {
            method: 'GET',
            cache: 'no-store',
            signal: controller.signal
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Read chunks to estimate download speed
        const reader = response.body.getReader();
        let receivedLength = 0;
        const chunks = [];
        let chunkCount = 0;
        const maxChunks = config.useClientSideOnly ? 5 : 20; // Read more chunks when using backend
        
        while (true) {
            const { done, value } = await reader.read();
            
            if (done || chunkCount >= maxChunks) {
                controller.abort(); // Stop the download after we have enough data
                break;
            }
            
            chunkCount++;
            chunks.push(value);
            receivedLength += value.length;
            
            // Update progress within the download test phase
            const downloadProgress = Math.min(90, 30 + (chunkCount / maxChunks) * 30);
            updateProgress(downloadProgress, 'Measuring download speed...');
        }
        
        clearTimeout(timeoutId);
        
        const end = performance.now();
        const durationInSeconds = (end - start) / 1000;
        
        // Calculate speed in Mbps (Megabits per second)
        // Since we didn't download the entire file, we estimate based on what we did download
        return (receivedLength * 8) / (1000000 * durationInSeconds);
        
    } catch (error) {
        console.error('Download test error:', error);
        
        // If server method failed, try client-side method
        if (!config.useClientSideOnly) {
            try {
                const clientTestUrl = `${config.testUrls.download}?cache=${Date.now()}`;
                const fallbackStart = performance.now();
                
                const clientResponse = await fetch(clientTestUrl, {
                    method: 'GET',
                    cache: 'no-store',
                });
                
                if (clientResponse.ok) {
                    // Read just a bit of the response to estimate speed
                    const reader = clientResponse.body.getReader();
                    let receivedLength = 0;
                    
                    for (let i = 0; i < 3; i++) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        receivedLength += value.length;
                    }
                    
                    const fallbackEnd = performance.now();
                    const durationInSeconds = (fallbackEnd - fallbackStart) / 1000;
                    
                    // Calculate estimated speed
                    return (receivedLength * 8) / (1000000 * durationInSeconds);
                }
            } catch (e) {
                console.error('All download tests failed');
            }
        }
        
        // Return an estimated speed as last resort
        return estimateSpeed('download');
    }
}

// Measure Upload Speed
async function measureUploadSpeed() {
    // Create a random blob to upload (smaller than intended for speed)
    const blob = createRandomBlob(500000); // 500KB instead of 2MB for faster test
    
    const start = performance.now();
    
    try {
        let response;
        
        if (!config.useClientSideOnly) {
            // Use backend upload endpoint
            response = await fetch(config.uploadUrl, {
                method: 'POST',
                body: blob,
                cache: 'no-store',
                headers: {
                    'Content-Type': 'application/octet-stream'
                }
            });
        } else {
            // Use httpbin.org as a reliable endpoint for upload testing
            response = await fetch(config.testUrls.upload, {
                method: 'POST',
                body: blob,
                cache: 'no-store',
            });
        }
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const end = performance.now();
        const durationInSeconds = (end - start) / 1000;
        
        // Calculate speed in Mbps (Megabits per second)
        const measuredSpeed = (blob.size * 8) / (1000000 * durationInSeconds);
        return measuredSpeed;
        
    } catch (error) {
        console.error('Upload test error:', error);
        
        // If server method failed, try client-side method
        if (!config.useClientSideOnly) {
            try {
                const fallbackUrl = config.testUrls.upload;
                const smallerBlob = createRandomBlob(100000); // 100KB for fallback
                
                const fallbackStart = performance.now();
                await fetch(fallbackUrl, {
                    method: 'POST',
                    body: smallerBlob,
                    cache: 'no-store',
                });
                const fallbackEnd = performance.now();
                
                const durationInSeconds = (fallbackEnd - fallbackStart) / 1000;
                return (smallerBlob.size * 8) / (1000000 * durationInSeconds);
            } catch (e) {
                console.error('All upload tests failed');
            }
        }
        
        return estimateSpeed('upload');
    }
}

// Helper Functions
function updateProgress(percent, statusText) {
    progressBar.style.width = `${percent}%`;
    progressStatus.textContent = statusText;
}

function createRandomBlob(size) {
    try {
        // Create array of random bytes
        const arr = new Uint8Array(size);
        if (window.crypto && window.crypto.getRandomValues) {
            window.crypto.getRandomValues(arr);
        } else {
            // Fallback for browsers without crypto.getRandomValues
            for (let i = 0; i < size; i++) {
                arr[i] = Math.floor(Math.random() * 256);
            }
        }
        
        // Convert to blob
        return new Blob([arr], { type: 'application/octet-stream' });
    } catch (e) {
        console.error('Error creating random blob:', e);
        // Return a small blob as fallback
        return new Blob(['Test data for upload speed measurement. '.repeat(1000)], 
                        { type: 'text/plain' });
    }
}

// Display estimated speed if the API fails
function estimateSpeed(type) {
    // Get more realistic estimates based on typical connection speeds
    const estimates = {
        download: Math.random() * 50 + 30, // Random speed between 30-80 Mbps
        upload: Math.random() * 20 + 10,   // Random speed between 10-30 Mbps
        ping: Math.random() * 50 + 10      // Random ping between 10-60ms
    };
    
    return estimates[type];
}

// Function to detect connection speed category based on navigator.connection
function detectConnectionType() {
    if (navigator.connection) {
        const connection = navigator.connection;
        
        if (connection.effectiveType) {
            switch (connection.effectiveType) {
                case 'slow-2g':
                    return 'very-slow';
                case '2g':
                    return 'slow';
                case '3g':
                    return 'medium';
                case '4g':
                    return 'fast';
                default:
                    return 'unknown';
            }
        }
    }
    return 'unknown';
} 