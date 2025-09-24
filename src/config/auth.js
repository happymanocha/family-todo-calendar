/**
 * Authentication Configuration
 */

const authConfig = {
    // JWT Configuration
    jwt: {
        secret: process.env.JWT_SECRET || 'minocha-family-organizer-secret-2024',
        expiresIn: '24h',
        refreshExpiresIn: '7d'
    },

    // Session Configuration
    session: {
        defaultExpiry: 24 * 60 * 60 * 1000, // 24 hours
        rememberMeExpiry: 30 * 24 * 60 * 60 * 1000, // 30 days
        cookieName: 'minocha_session'
    },

    // Security Configuration
    security: {
        saltRounds: 12,
        maxLoginAttempts: 5,
        lockoutDuration: 15 * 60 * 1000, // 15 minutes
        passwordMinLength: 6
    },

    // Family Members Configuration
    familyMembers: {
        'happymanocha@gmail.com': {
            id: 'happy',
            name: 'Happy',
            role: 'admin',
            avatar: 'H'
        },
        'joelminocha@gmail.com': {
            id: 'joel',
            name: 'Joel',
            role: 'member',
            avatar: 'J'
        },
        'upalmonika@gmail.com': {
            id: 'monika',
            name: 'Monika',
            role: 'member',
            avatar: 'M'
        },
        'kiaanminocha@gmail.com': {
            id: 'kiaan',
            name: 'Kiaan',
            role: 'member',
            avatar: 'K'
        }
    }
};

module.exports = authConfig;