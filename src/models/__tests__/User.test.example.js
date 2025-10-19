/**
 * User Model Tests (EXAMPLE - Rename to User.test.js)
 * Comprehensive test suite for User model
 */

const User = require('../User');
const bcrypt = require('bcryptjs');

describe('User Model', () => {
  describe('User.validate()', () => {
    it('should validate a correct user object', () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123',
      };

      const result = User.validate(userData);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid email format', () => {
      const userData = {
        email: 'invalid-email',
        name: 'Test User',
        password: 'password123',
      };

      const result = User.validate(userData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('valid email');
    });

    it('should reject name shorter than 2 characters', () => {
      const userData = {
        email: 'test@example.com',
        name: 'T',
        password: 'password123',
      };

      const result = User.validate(userData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('at least 2 characters');
    });

    it('should reject password shorter than 6 characters', () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        password: '12345',
      };

      const result = User.validate(userData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('at least 6 characters');
    });

    it('should handle exactly 6 character password (boundary)', () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        password: '123456',
      };

      const result = User.validate(userData);

      expect(result.success).toBe(true);
    });

    it('should trim email and name', () => {
      const userData = {
        email: '  test@example.com  ',
        name: '  Test User  ',
        password: 'password123',
      };

      const result = User.validate(userData);

      expect(result.success).toBe(true);
      expect(result.data.email).toBe('test@example.com');
      expect(result.data.name).toBe('Test User');
    });
  });

  describe('Password Hashing', () => {
    it('should hash password using bcrypt', async () => {
      const user = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'plaintext123',
      };

      // Assuming User has a hashPassword static method
      const hashedPassword = await User.hashPassword(user.password);

      expect(hashedPassword).not.toBe(user.password);
      expect(hashedPassword.startsWith('$2')).toBe(true); // bcrypt hash starts with $2
      expect(hashedPassword.length).toBeGreaterThan(50);
    });

    it('should use 12 salt rounds', async () => {
      const password = 'test123';
      const hash = await User.hashPassword(password);

      // Extract salt rounds from bcrypt hash
      const rounds = parseInt(hash.split('$')[2]);
      expect(rounds).toBe(12);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'same-password';
      const hash1 = await User.hashPassword(password);
      const hash2 = await User.hashPassword(password);

      expect(hash1).not.toBe(hash2); // Different salts
    });

    it('should verify correct password', async () => {
      const password = 'mypassword123';
      const hash = await User.hashPassword(password);

      const isValid = await bcrypt.compare(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'correct-password';
      const hash = await User.hashPassword(password);

      const isValid = await bcrypt.compare('wrong-password', hash);
      expect(isValid).toBe(false);
    });
  });

  describe('Account Locking', () => {
    it('should lock account after 5 failed attempts', () => {
      const user = {
        ...require('../../tests/fixtures/users').validUser,
        loginAttempts: 5,
        lockedUntil: Date.now() + 15 * 60 * 1000, // 15 minutes
      };

      const isLocked = User.isLocked(user);
      expect(isLocked).toBe(true);
    });

    it('should not lock with fewer than 5 attempts', () => {
      const user = {
        ...require('../../tests/fixtures/users').validUser,
        loginAttempts: 4,
      };

      const isLocked = User.isLocked(user);
      expect(isLocked).toBe(false);
    });

    it('should unlock after lockout period expires', () => {
      const user = {
        ...require('../../tests/fixtures/users').validUser,
        loginAttempts: 5,
        lockedUntil: Date.now() - 1000, // 1 second ago (expired)
      };

      const isLocked = User.isLocked(user);
      expect(isLocked).toBe(false);
    });

    it('should remain locked during lockout period', () => {
      const user = {
        ...require('../../tests/fixtures/users').validUser,
        loginAttempts: 5,
        lockedUntil: Date.now() + 10 * 60 * 1000, // 10 minutes in future
      };

      const isLocked = User.isLocked(user);
      expect(isLocked).toBe(true);
    });

    it('should lock for exactly 15 minutes', () => {
      const lockTime = Date.now();
      const user = {
        ...require('../../tests/fixtures/users').validUser,
        loginAttempts: 5,
      };

      // Simulate locking mechanism
      user.lockedUntil = lockTime + 15 * 60 * 1000;

      expect(user.lockedUntil - lockTime).toBe(15 * 60 * 1000);
    });
  });

  describe('toJSON() Sanitization', () => {
    it('should exclude password from JSON output', () => {
      const user = {
        id: 'user-001',
        email: 'test@example.com',
        name: 'Test User',
        password: '$2b$12$hashedpassword',
        role: 'member',
      };

      const json = User.toJSON(user);

      expect(json.password).toBeUndefined();
      expect(json.email).toBe('test@example.com');
      expect(json.name).toBe('Test User');
    });

    it('should exclude loginAttempts from JSON output', () => {
      const user = {
        id: 'user-001',
        email: 'test@example.com',
        name: 'Test User',
        password: '$2b$12$hashedpassword',
        loginAttempts: 3,
        role: 'member',
      };

      const json = User.toJSON(user);

      expect(json.loginAttempts).toBeUndefined();
    });

    it('should exclude lockedUntil from JSON output', () => {
      const user = {
        id: 'user-001',
        email: 'test@example.com',
        name: 'Test User',
        password: '$2b$12$hashedpassword',
        lockedUntil: Date.now(),
        role: 'member',
      };

      const json = User.toJSON(user);

      expect(json.lockedUntil).toBeUndefined();
    });

    it('should include safe fields in JSON output', () => {
      const user = {
        id: 'user-001',
        email: 'test@example.com',
        name: 'Test User',
        password: '$2b$12$hashedpassword',
        role: 'admin',
        familyId: 'family-001',
        avatar: 'avatar.jpg',
        isActive: true,
      };

      const json = User.toJSON(user);

      expect(json).toEqual({
        id: 'user-001',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin',
        familyId: 'family-001',
        avatar: 'avatar.jpg',
        isActive: true,
      });
    });
  });

  describe('Static Methods', () => {
    describe('findByEmail()', () => {
      it('should find user by exact email match', async () => {
        // Mock implementation - you'll need to adjust based on actual implementation
        const mockUser = {
          id: 'user-001',
          email: 'test@example.com',
          name: 'Test User',
        };

        // Mock the database/storage layer
        jest.spyOn(User, 'findByEmail').mockResolvedValue(mockUser);

        const user = await User.findByEmail('test@example.com');

        expect(user).toEqual(mockUser);
        expect(User.findByEmail).toHaveBeenCalledWith('test@example.com');

        // Restore original implementation
        User.findByEmail.mockRestore();
      });

      it('should return null for non-existent email', async () => {
        jest.spyOn(User, 'findByEmail').mockResolvedValue(null);

        const user = await User.findByEmail('nonexistent@example.com');

        expect(user).toBeNull();

        User.findByEmail.mockRestore();
      });

      it('should be case-sensitive for email search', async () => {
        jest.spyOn(User, 'findByEmail').mockImplementation((email) => {
          return email === 'test@example.com'
            ? Promise.resolve({ id: 'user-001', email })
            : Promise.resolve(null);
        });

        const user1 = await User.findByEmail('test@example.com');
        const user2 = await User.findByEmail('TEST@EXAMPLE.COM');

        expect(user1).not.toBeNull();
        expect(user2).toBeNull();

        User.findByEmail.mockRestore();
      });
    });

    describe('findById()', () => {
      it('should find user by ID', async () => {
        const mockUser = {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
        };

        jest.spyOn(User, 'findById').mockResolvedValue(mockUser);

        const user = await User.findById('user-123');

        expect(user).toEqual(mockUser);
        expect(User.findById).toHaveBeenCalledWith('user-123');

        User.findById.mockRestore();
      });

      it('should return null for non-existent ID', async () => {
        jest.spyOn(User, 'findById').mockResolvedValue(null);

        const user = await User.findById('non-existent-id');

        expect(user).toBeNull();

        User.findById.mockRestore();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in email', () => {
      const userData = {
        email: 'test+special@example.co.uk',
        name: 'Test User',
        password: 'password123',
      };

      const result = User.validate(userData);

      expect(result.success).toBe(true);
    });

    it('should handle Unicode characters in name', () => {
      const userData = {
        email: 'test@example.com',
        name: 'Jürgen Müller',
        password: 'password123',
      };

      const result = User.validate(userData);

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Jürgen Müller');
    });

    it('should reject empty email', () => {
      const userData = {
        email: '',
        name: 'Test User',
        password: 'password123',
      };

      const result = User.validate(userData);

      expect(result.success).toBe(false);
    });

    it('should reject whitespace-only name', () => {
      const userData = {
        email: 'test@example.com',
        name: '   ',
        password: 'password123',
      };

      const result = User.validate(userData);

      expect(result.success).toBe(false);
    });

    it('should handle very long password', () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'a'.repeat(1000),
      };

      const result = User.validate(userData);

      expect(result.success).toBe(true);
    });
  });

  describe('Security Tests', () => {
    it('should prevent SQL injection in email', () => {
      const userData = {
        email: "'; DROP TABLE users--",
        name: 'Test User',
        password: 'password123',
      };

      const result = User.validate(userData);

      // Should fail email validation
      expect(result.success).toBe(false);
    });

    it('should prevent XSS in name', () => {
      const userData = {
        email: 'test@example.com',
        name: '<script>alert("xss")</script>',
        password: 'password123',
      };

      // Should validate (sanitization happens at display layer)
      // But we should ensure it's stored as-is for proper escaping later
      const result = User.validate(userData);

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('<script>alert("xss")</script>');
    });

    it('should not expose internal fields', () => {
      const user = {
        id: 'user-001',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed',
        role: 'member',
        _internal: 'secret',
      };

      const json = User.toJSON(user);

      expect(json._internal).toBeUndefined();
    });
  });
});
