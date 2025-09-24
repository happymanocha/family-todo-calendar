/**
 * Minocha's Organizer - Production Server
 * Uses the new MVC architecture
 */

const app = require('./app');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

/**
 * Start the server
 */
const server = app.listen(PORT, HOST, () => {
    console.log(`
🚀 Minocha's Organizer Server Running!

📍 Environment: ${process.env.NODE_ENV || 'development'}
🌐 Server: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}
📱 Mobile-friendly: Responsive design works on all devices
🎨 Features: MVC architecture, API layer, OpenAPI docs

🔗 Important URLs:
• Main App: http://localhost:${PORT}/
• Login: http://localhost:${PORT}/login
• Logout: http://localhost:${PORT}/logout
• API Docs: http://localhost:${PORT}/api-docs
• API Health: http://localhost:${PORT}/api/health
• API Info: http://localhost:${PORT}/api/info

📊 API Endpoints:
• Authentication: /api/auth/*
• Todos/Tasks: /api/todos/*
• Statistics: /api/todos/statistics
• Upcoming: /api/todos/upcoming
• Search: /api/todos/search

🏗️ Architecture:
• MVC Pattern with Service Layer
• RESTful API with OpenAPI 3.0 docs
• JWT Authentication & Authorization
• Input validation with Joi schemas
• Comprehensive error handling
• Request logging & monitoring
• Security headers with Helmet
• CORS & compression enabled

🔐 Demo Credentials:
• happymanocha@gmail.com / family
• joelminocha@gmail.com / family
• upalmonika@gmail.com / family
• kiaanminocha@gmail.com / family

💡 Development Commands:
• npm run dev - Original server
• npm run dev:new - New MVC server
• npm run docs - Show API docs URL
• npm run routes - List all routes

🏠 Perfect for organizing your family's tasks and meetings!
    `);
});

/**
 * Handle server errors
 */
server.on('error', (error) => {
    if (error.syscall !== 'listen') {
        throw error;
    }

    const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;

    switch (error.code) {
        case 'EACCES':
            console.error(`❌ ${bind} requires elevated privileges`);
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(`❌ ${bind} is already in use`);
            process.exit(1);
            break;
        default:
            throw error;
    }
});

/**
 * Handle server listening
 */
server.on('listening', () => {
    const addr = server.address();
    const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
    console.log(`✅ Server listening on ${bind}`);
});

module.exports = server;