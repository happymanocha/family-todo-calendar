/**
 * User Test Fixtures
 * Reusable test data for user-related tests
 */

module.exports = {
  validUser: {
    id: 'user-test-001',
    email: 'test@example.com',
    name: 'Test User',
    password: 'password123',
    role: 'member',
    familyId: 'family-test-001',
    isActive: true,
    createdAt: new Date().toISOString(),
  },

  adminUser: {
    id: 'user-admin-001',
    email: 'admin@example.com',
    name: 'Admin User',
    password: 'adminpass123',
    role: 'admin',
    familyId: 'family-test-001',
    isActive: true,
    createdAt: new Date().toISOString(),
  },

  inactiveUser: {
    id: 'user-inactive-001',
    email: 'inactive@example.com',
    name: 'Inactive User',
    password: 'password123',
    role: 'member',
    familyId: 'family-test-001',
    isActive: false,
    createdAt: new Date().toISOString(),
  },

  lockedUser: {
    id: 'user-locked-001',
    email: 'locked@example.com',
    name: 'Locked User',
    password: 'password123',
    role: 'member',
    familyId: 'family-test-001',
    isActive: true,
    loginAttempts: 5,
    lockedUntil: Date.now() + 15 * 60 * 1000, // 15 minutes from now
    createdAt: new Date().toISOString(),
  },

  createUser: (overrides = {}) => ({
    id: `user-${Date.now()}`,
    email: `test-${Date.now()}@example.com`,
    name: 'Test User',
    password: 'password123',
    role: 'member',
    familyId: 'family-test-001',
    isActive: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  }),
};
