/**
 * View Controller
 * Handles frontend routing and view management
 */

const path = require('path');

class ViewController {
    /**
     * @desc    Serve login page
     * @route   GET /login
     * @access  Public
     */
    static serveLogin(req, res) {
        res.sendFile(path.join(__dirname, '../../public/login.html'));
    }

    /**
     * @desc    Serve logout page
     * @route   GET /logout
     * @access  Public
     */
    static serveLogout(req, res) {
        res.sendFile(path.join(__dirname, '../../public/logout.html'));
    }

    /**
     * @desc    Serve main application
     * @route   GET /
     * @access  Public
     */
    static serveApp(req, res) {
        res.sendFile(path.join(__dirname, '../../public/index.html'));
    }

    /**
     * @desc    Handle client-side routing
     * @route   GET /*
     * @access  Public
     */
    static handleSPA(req, res) {
        // For client-side routing, serve the main app
        // The frontend will handle the routing
        res.sendFile(path.join(__dirname, '../../public/index.html'));
    }

    /**
     * @desc    Serve 404 page
     * @route   GET /404
     * @access  Public
     */
    static serve404(req, res) {
        res.status(404).send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>404 - Page Not Found | Minocha's Organizer</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        font-family: 'Inter', sans-serif;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                    }
                    .container {
                        text-align: center;
                        background: rgba(255, 255, 255, 0.1);
                        backdrop-filter: blur(10px);
                        padding: 3rem;
                        border-radius: 20px;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                    }
                    h1 { font-size: 4rem; margin-bottom: 1rem; }
                    h2 { font-size: 1.5rem; margin-bottom: 2rem; opacity: 0.9; }
                    .btn {
                        display: inline-block;
                        padding: 12px 24px;
                        background: rgba(255, 255, 255, 0.2);
                        color: white;
                        text-decoration: none;
                        border-radius: 8px;
                        transition: all 0.3s ease;
                        margin: 0 10px;
                    }
                    .btn:hover {
                        background: rgba(255, 255, 255, 0.3);
                        transform: translateY(-2px);
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>404</h1>
                    <h2>Page Not Found</h2>
                    <p style="margin-bottom: 2rem;">The page you're looking for doesn't exist.</p>
                    <a href="/" class="btn">Go Home</a>
                    <a href="/login" class="btn">Login</a>
                </div>
            </body>
            </html>
        `);
    }
}

module.exports = ViewController;