const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"]
        }
    }
}));

// Enable CORS for all routes
app.use(cors());

// Enable gzip compression
app.use(compression());

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from the current directory
app.use(express.static(__dirname, {
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
        // Set cache headers for static assets
        if (process.env.NODE_ENV === 'development') {
            // No caching in development
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        } else if (path.endsWith('.css') || path.endsWith('.js')) {
            res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
        } else if (path.endsWith('.html')) {
            res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour
        }
    }
}));

// API Routes (for future expansion)
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Family Todo Calendar Server is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// API endpoint to get server info
app.get('/api/info', (req, res) => {
    res.json({
        name: 'Family Todo & Calendar App',
        description: 'Complete family organization app with task and meeting management',
        features: [
            'Task workflow management',
            'Meeting scheduling with time ranges',
            'Family member assignments',
            '5 beautiful themes with dark mode',
            'Monthly calendar view',
            'Smart reminders',
            'Local storage persistence'
        ],
        technology: {
            frontend: 'Vanilla HTML5, CSS3, JavaScript',
            backend: 'Node.js with Express',
            storage: 'Client-side LocalStorage'
        }
    });
});

// Serve the main application
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle client-side routing (SPA fallback)
app.get('*', (req, res) => {
    // For any route that doesn't match static files or API, serve index.html
    if (!req.path.startsWith('/api/')) {
        res.sendFile(path.join(__dirname, 'index.html'));
    } else {
        res.status(404).json({ error: 'API endpoint not found' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`
🚀 Family Todo & Calendar Server is running!

📍 Local URL: http://localhost:${PORT}
🌐 Network: Available on your local network
📱 Mobile-friendly: Works on all devices
🎨 Features: 5 themes, dark mode, calendar view

API Endpoints:
• GET /api/health - Server health check
• GET /api/info - Application information

💡 Tips:
• Open http://localhost:${PORT} in your browser
• Use 'npm run dev' for development with auto-restart
• Use 'npm start' for production

🏠 Perfect for organizing your family's tasks and meetings!
    `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('👋 Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('👋 Received SIGINT, shutting down gracefully...');
    process.exit(0);
});

module.exports = app;