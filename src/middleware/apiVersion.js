/**
 * API Versioning Middleware
 * Handles API version routing and compatibility
 */

/**
 * Extract API version from request
 * Supports version in URL path, header, and query parameter
 * Priority: URL > Header > Query > Default
 *
 * @param {Object} req Express request object
 * @returns {string} API version (e.g., 'v1', 'v2')
 */
const extractVersion = (req) => {
    // 1. Check URL path: /api/v1/todos or /v1/api/todos
    const pathMatch = req.path.match(/\/v(\d+)\//);
    if (pathMatch) {
        return `v${pathMatch[1]}`;
    }

    // 2. Check Accept-Version header
    const headerVersion = req.headers['accept-version'] || req.headers['api-version'];
    if (headerVersion) {
        return headerVersion.startsWith('v') ? headerVersion : `v${headerVersion}`;
    }

    // 3. Check query parameter: ?version=1 or ?api_version=v1
    const queryVersion = req.query.version || req.query.api_version;
    if (queryVersion) {
        return queryVersion.startsWith('v') ? queryVersion : `v${queryVersion}`;
    }

    // 4. Default version
    return process.env.DEFAULT_API_VERSION || 'v1';
};

/**
 * API version middleware
 * Attaches version info to request and validates supported versions
 */
const versionMiddleware = (options = {}) => {
    const {
        supportedVersions = ['v1'],
        defaultVersion = 'v1',
        deprecatedVersions = [],
        headerName = 'X-API-Version'
    } = options;

    return (req, res, next) => {
        // Extract version from request
        const version = extractVersion(req);

        // Validate version is supported
        if (!supportedVersions.includes(version)) {
            return res.status(400).json({
                success: false,
                message: `API version ${version} is not supported`,
                code: 'UNSUPPORTED_API_VERSION',
                supportedVersions,
                currentVersion: version
            });
        }

        // Attach version to request
        req.apiVersion = version;

        // Set response header with API version
        res.setHeader(headerName, version);

        // Warn if using deprecated version
        if (deprecatedVersions.includes(version)) {
            res.setHeader('X-API-Deprecated', 'true');
            res.setHeader('X-API-Deprecation-Info', `Version ${version} is deprecated. Please upgrade to ${supportedVersions[supportedVersions.length - 1]}`);
        }

        next();
    };
};

/**
 * Version-specific route handler
 * Routes requests to different handlers based on API version
 *
 * @param {Object} handlers Version-specific handlers { v1: handler1, v2: handler2 }
 * @param {Function} defaultHandler Optional default handler
 */
const versionedRoute = (handlers, defaultHandler = null) => {
    return (req, res, next) => {
        const version = req.apiVersion || 'v1';
        const handler = handlers[version] || defaultHandler;

        if (!handler) {
            return res.status(501).json({
                success: false,
                message: `Endpoint not implemented for ${version}`,
                code: 'VERSION_NOT_IMPLEMENTED',
                version
            });
        }

        return handler(req, res, next);
    };
};

/**
 * Require specific API version
 * Ensures request is using a specific version
 *
 * @param {string|Array} requiredVersion Required version(s)
 */
const requireVersion = (requiredVersion) => {
    const versions = Array.isArray(requiredVersion) ? requiredVersion : [requiredVersion];

    return (req, res, next) => {
        const currentVersion = req.apiVersion || 'v1';

        if (!versions.includes(currentVersion)) {
            return res.status(400).json({
                success: false,
                message: `This endpoint requires API version ${versions.join(' or ')}`,
                code: 'VERSION_MISMATCH',
                requiredVersions: versions,
                currentVersion
            });
        }

        next();
    };
};

/**
 * API version deprecation warning middleware
 * Adds deprecation warnings to responses
 */
const deprecationWarning = (version, sunsetDate = null, replacementVersion = null) => {
    return (req, res, next) => {
        if (req.apiVersion === version) {
            res.setHeader('Deprecation', 'true');

            if (sunsetDate) {
                res.setHeader('Sunset', sunsetDate);
            }

            if (replacementVersion) {
                res.setHeader('Link', `</api/${replacementVersion}>; rel="successor-version"`);
            }

            // Add deprecation info to response
            const originalJson = res.json.bind(res);
            res.json = (body) => {
                if (body && typeof body === 'object') {
                    body._deprecation = {
                        message: `API version ${version} is deprecated`,
                        sunsetDate,
                        upgradeToVersion: replacementVersion,
                        currentVersion: version
                    };
                }
                return originalJson(body);
            };
        }

        next();
    };
};

module.exports = {
    extractVersion,
    versionMiddleware,
    versionedRoute,
    requireVersion,
    deprecationWarning
};
