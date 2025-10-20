/**
 * Sorting Utilities
 * Provides flexible sorting capabilities for API responses
 */

/**
 * Sort orders
 */
const SortOrder = {
    ASC: 'asc',
    DESC: 'desc',
    ASCENDING: 'ascending',
    DESCENDING: 'descending'
};

/**
 * Normalize sort order to 'asc' or 'desc'
 * @param {string} order Sort order
 * @returns {string} Normalized order ('asc' or 'desc')
 */
const normalizeSortOrder = (order) => {
    if (!order) return 'asc';

    const normalized = order.toLowerCase().trim();

    if (normalized === 'desc' || normalized === 'descending' || normalized === '-1' || normalized === 'down') {
        return 'desc';
    }

    return 'asc';
};

/**
 * Parse sort parameter from query string
 * Supports multiple formats:
 * - sort=field (ascending)
 * - sort=-field (descending)
 * - sort=field:asc
 * - sort=field1,-field2 (multiple fields)
 *
 * @param {string} sortParam Sort parameter from query
 * @returns {Array} Array of sort objects [{field, order}]
 */
const parseSortParam = (sortParam) => {
    if (!sortParam) return [];

    const sorts = [];
    const fields = sortParam.split(',').map(f => f.trim()).filter(f => f);

    for (const field of fields) {
        let fieldName = field;
        let order = 'asc';

        // Handle -field format
        if (field.startsWith('-')) {
            fieldName = field.substring(1);
            order = 'desc';
        }
        // Handle field:order format
        else if (field.includes(':')) {
            const parts = field.split(':');
            fieldName = parts[0].trim();
            order = normalizeSortOrder(parts[1]);
        }

        if (fieldName) {
            sorts.push({ field: fieldName, order });
        }
    }

    return sorts;
};

/**
 * Sort array of objects by multiple fields
 * @param {Array} items Array to sort
 * @param {Array} sortFields Array of {field, order} objects
 * @returns {Array} Sorted array
 */
const sortByFields = (items, sortFields) => {
    if (!Array.isArray(items) || items.length === 0) {
        return items;
    }

    if (!sortFields || sortFields.length === 0) {
        return items;
    }

    return [...items].sort((a, b) => {
        for (const { field, order } of sortFields) {
            const aVal = getNestedValue(a, field);
            const bVal = getNestedValue(b, field);

            const comparison = compareValues(aVal, bVal);

            if (comparison !== 0) {
                return order === 'desc' ? -comparison : comparison;
            }
        }
        return 0;
    });
};

/**
 * Get nested object value by dot notation path
 * @param {Object} obj Object to get value from
 * @param {string} path Dot notation path (e.g., 'user.name')
 * @returns {*} Value at path
 */
const getNestedValue = (obj, path) => {
    return path.split('.').reduce((current, key) => {
        return current?.[key];
    }, obj);
};

/**
 * Compare two values for sorting
 * Handles strings, numbers, dates, booleans, null, undefined
 * @param {*} a First value
 * @param {*} b Second value
 * @returns {number} -1, 0, or 1
 */
const compareValues = (a, b) => {
    // Handle null/undefined
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;

    // Handle dates
    if (a instanceof Date && b instanceof Date) {
        return a.getTime() - b.getTime();
    }

    // Handle numbers
    if (typeof a === 'number' && typeof b === 'number') {
        return a - b;
    }

    // Handle booleans
    if (typeof a === 'boolean' && typeof b === 'boolean') {
        return a === b ? 0 : a ? 1 : -1;
    }

    // Handle strings (case-insensitive)
    const aStr = String(a).toLowerCase();
    const bStr = String(b).toLowerCase();

    if (aStr < bStr) return -1;
    if (aStr > bStr) return 1;
    return 0;
};

/**
 * Parse sorting parameters from request
 * @param {Object} req Express request object
 * @param {Object} options Parsing options
 * @returns {Array} Array of sort objects
 */
const parseSortingParams = (req, options = {}) => {
    const {
        defaultSort = [],
        allowedFields = null,
        sortParam = 'sort'
    } = options;

    const sortQuery = req.query[sortParam];

    if (!sortQuery) {
        return defaultSort;
    }

    const sorts = parseSortParam(sortQuery);

    // Filter by allowed fields if specified
    if (allowedFields && Array.isArray(allowedFields)) {
        return sorts.filter(s => allowedFields.includes(s.field));
    }

    return sorts;
};

/**
 * Sorting middleware
 * Attaches parsed sort parameters to request
 */
const sortingMiddleware = (options = {}) => {
    return (req, res, next) => {
        const sorts = parseSortingParams(req, options);
        req.sort = sorts;
        next();
    };
};

/**
 * Create sortable response with metadata
 * @param {Array} data Array of items
 * @param {Array} sortFields Applied sort fields
 * @returns {Object} Response with sort metadata
 */
const createSortableResponse = (data, sortFields = []) => {
    return {
        success: true,
        data,
        sort: {
            applied: sortFields.map(s => `${s.field}:${s.order}`),
            fields: sortFields
        }
    };
};

/**
 * Validate sort fields against allowed list
 * @param {Array} sortFields Sort fields to validate
 * @param {Array} allowedFields Allowed field names
 * @returns {Object} Validation result {valid: boolean, invalidFields: []}
 */
const validateSortFields = (sortFields, allowedFields) => {
    const invalidFields = sortFields
        .map(s => s.field)
        .filter(field => !allowedFields.includes(field));

    return {
        valid: invalidFields.length === 0,
        invalidFields
    };
};

module.exports = {
    SortOrder,
    normalizeSortOrder,
    parseSortParam,
    sortByFields,
    getNestedValue,
    compareValues,
    parseSortingParams,
    sortingMiddleware,
    createSortableResponse,
    validateSortFields
};
