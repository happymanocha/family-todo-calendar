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
            id: 'happy', // Backward compatibility ID
            uniqueId: 'usr-a1b2c3d4-e5f6-7890-abcd-ef1234567890', // Proper UUID
            name: 'Happy',
            role: 'admin',
            avatar: 'H',
            email: 'happymanocha@gmail.com',
            phone: '+1-234-567-8900',
            createdAt: '2024-01-01T00:00:00.000Z'
        },
        'joelminocha@gmail.com': {
            id: 'joel', // Backward compatibility ID
            uniqueId: 'usr-b2c3d4e5-f6g7-8901-bcde-f23456789012', // Proper UUID
            name: 'Joel',
            role: 'member',
            avatar: 'J',
            email: 'joelminocha@gmail.com',
            phone: '+1-234-567-8901',
            createdAt: '2024-01-01T00:00:00.000Z'
        },
        'upalmonika@gmail.com': {
            id: 'monika', // Backward compatibility ID
            uniqueId: 'usr-c3d4e5f6-g7h8-9012-cdef-345678901234', // Proper UUID
            name: 'Monika',
            role: 'member',
            avatar: 'M',
            email: 'upalmonika@gmail.com',
            phone: '+1-234-567-8902',
            createdAt: '2024-01-01T00:00:00.000Z'
        },
        'kiaanminocha@gmail.com': {
            id: 'kiaan', // Backward compatibility ID
            uniqueId: 'usr-d4e5f6g7-h8i9-0123-defg-456789012345', // Proper UUID
            name: 'Kiaan',
            role: 'member',
            avatar: 'K',
            email: 'kiaanminocha@gmail.com',
            phone: '+1-234-567-8903',
            createdAt: '2024-01-01T00:00:00.000Z'
        }
    }
};

module.exports = authConfig;