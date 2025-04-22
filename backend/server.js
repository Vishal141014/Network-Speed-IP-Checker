/**
 * Network Speed & IP Checker - Backend Server
 * Simple Express server to serve the frontend and handle speed test requests
 * (Modified for Vercel deployment)
 */

const express = require('express');
const path = require('path');
const crypto = require('crypto');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors({
  origin: '*', // Allow all origins for testing purposes
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON request bodies
app.use(express.json());

// Parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true }));

// For Vercel: Handle API routes
if (process.env.VERCEL) {
  app.use('/api/speedtest', express.Router());
}

// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Route to serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Endpoint to generate a random file for download speed testing
app.get('/api/speedtest/download', (req, res) => {
    // Get the requested file size from query parameters, default to 5MB
    const size = parseInt(req.query.size) || 5 * 1024 * 1024; // 5MB default
    const maxSize = 10 * 1024 * 1024; // 10MB max to avoid Vercel limits
    
    // Ensure we don't exceed resource limits on Vercel
    const actualSize = Math.min(size, maxSize);
    
    // Set appropriate headers
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment; filename="speedtest.bin"');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Generate and send random data
    const chunkSize = 256 * 1024; // 256KB chunks for better performance on serverless
    let sent = 0;
    
    function sendChunk() {
        if (sent >= actualSize) {
            res.end();
            return;
        }
        
        const remainingBytes = actualSize - sent;
        const currentChunkSize = Math.min(chunkSize, remainingBytes);
        const buffer = crypto.randomBytes(currentChunkSize);
        
        // Check if client is still connected
        if (!res.writableEnded) {
            res.write(buffer);
            sent += currentChunkSize;
            
            // Use setImmediate for non-serverless, process.nextTick for serverless
            if (process.env.VERCEL) {
                process.nextTick(sendChunk);
            } else {
                setImmediate(sendChunk);
            }
        }
    }
    
    sendChunk();
});

// Endpoint to measure upload speed
app.post('/api/speedtest/upload', (req, res) => {
    // Simply acknowledge the upload
    res.json({
        success: true,
        message: 'Upload received',
        timestamp: new Date().toISOString()
    });
});

// Endpoint for ping test
app.get('/api/speedtest/ping', (req, res) => {
    res.json({
        timestamp: new Date().toISOString()
    });
});

// Start the server (only when not running on Vercel)
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Open http://localhost:${PORT} in your browser`);
    });
}

// Export the app for Vercel
module.exports = app; 