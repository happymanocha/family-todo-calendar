/**
 * Pagination Utilities
 * Provides comprehensive pagination support for API responses
 */

/**
 * Calculate pagination metadata
 * @param {number} total Total number of items
 * @param {number} page Current page number (1-indexed)
 * @param {number} limit Items per page
 * @returns {Object} Pagination metadata
 */
const calculatePagination = (total, page = 1, limit = 20) => {
    // Ensure positive integers
    const currentPage = Math.max(1, parseInt(page) || 1);
    const itemsPerPage = Math.max(1, Math.min(100, parseInt(limit) || 20)); // Max 100 items per page
    const totalItems = Math.max(0, parseInt(total) || 0);

    // Calculate derived values
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    const offset = (currentPage - 1) * itemsPerPage;
    const hasNextPage = currentPage < totalPages;
    const hasPrevPage = currentPage > 1;

    return {
        currentPage,
        totalPages,
        itemsPerPage,
        totalItems,
        offset,
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? currentPage + 1 : null,
        prevPage: hasPrevPage ? currentPage - 1 : null
    };
};

/**
 * Generate pagination links for HATEOAS
 * @param {string} baseUrl Base URL for links
 * @param {Object} pagination Pagination metadata
 * @param {Object} queryParams Additional query parameters
 * @returns {Object} Pagination links
 */
const generatePaginationLinks = (baseUrl, pagination, queryParams = {}) => {
    const { currentPage, totalPages, hasNextPage, hasPrevPage, itemsPerPage } = pagination;

    // Build query string helper
    const buildQuery = (page) => {
        const params = new URLSearchParams({
            ...queryParams,
            page: page.toString(),
            limit: itemsPerPage.toString()
        });
        return `${baseUrl}?${params.toString()}`;
    };

    const links = {
        self: buildQuery(currentPage),
        first: buildQuery(1),
        last: buildQuery(totalPages)
    };

    if (hasNextPage) {
        links.next = buildQuery(currentPage + 1);
    }

    if (hasPrevPage) {
        links.prev = buildQuery(currentPage - 1);
    }

    return links;
};

/**
 * Paginate array of items
 * @param {Array} items Array of items to paginate
 * @param {number} page Current page
 * @param {number} limit Items per page
 * @returns {Array} Paginated items
 */
const paginateArray = (items, page = 1, limit = 20) => {
    const pagination = calculatePagination(items.length, page, limit);
    const { offset, itemsPerPage } = pagination;

    const paginatedItems = items.slice(offset, offset + itemsPerPage);

    return {
        data: paginatedItems,
        pagination
    };
};

/**
 * Create paginated response object
 * @param {Array} data Response data
 * @param {number} total Total count
 * @param {number} page Current page
 * @param {number} limit Items per page
 * @param {string} baseUrl Base URL for links (optional)
 * @param {Object} queryParams Query parameters for links (optional)
 * @returns {Object} Paginated response
 */
const createPaginatedResponse = (data, total, page, limit, baseUrl = null, queryParams = {}) => {
    const pagination = calculatePagination(total, page, limit);

    const response = {
        success: true,
        data,
        pagination: {
            page: pagination.currentPage,
            limit: pagination.itemsPerPage,
            total: pagination.totalItems,
            totalPages: pagination.totalPages,
            hasNext: pagination.hasNextPage,
            hasPrev: pagination.hasPrevPage
        }
    };

    // Add HATEOAS links if baseUrl provided
    if (baseUrl) {
        response.links = generatePaginationLinks(baseUrl, pagination, queryParams);
    }

    return response;
};

/**
 * Parse pagination parameters from request
 * @param {Object} req Express request object
 * @param {Object} defaults Default values
 * @returns {Object} Parsed pagination parameters
 */
const parsePaginationParams = (req, defaults = {}) => {
    const {
        defaultPage = 1,
        defaultLimit = 20,
        maxLimit = 100
    } = defaults;

    let page = parseInt(req.query.page) || defaultPage;
    let limit = parseInt(req.query.limit) || defaultLimit;

    // Ensure positive values
    page = Math.max(1, page);
    limit = Math.max(1, Math.min(maxLimit, limit));

    return { page, limit };
};

/**
 * Pagination middleware
 * Attaches pagination parameters to request
 */
const paginationMiddleware = (defaults = {}) => {
    return (req, res, next) => {
        const { page, limit } = parsePaginationParams(req, defaults);
        req.pagination = { page, limit };
        next();
    };
};

/**
 * Cursor-based pagination helper
 * For efficient pagination of large datasets
 *
 * @param {Array} items Array of items
 * @param {string} cursor Current cursor (item ID)
 * @param {number} limit Items per page
 * @param {string} cursorField Field to use as cursor
 * @returns {Object} Cursor-paginated response
 */
const cursorPaginate = (items, cursor = null, limit = 20, cursorField = 'id') => {
    const itemsPerPage = Math.max(1, Math.min(100, parseInt(limit) || 20));

    let startIndex = 0;
    if (cursor) {
        startIndex = items.findIndex(item => item[cursorField] === cursor) + 1;
        if (startIndex === 0) {
            // Cursor not found, start from beginning
            startIndex = 0;
        }
    }

    const paginatedItems = items.slice(startIndex, startIndex + itemsPerPage);
    const hasMore = startIndex + itemsPerPage < items.length;

    const nextCursor = hasMore && paginatedItems.length > 0
        ? paginatedItems[paginatedItems.length - 1][cursorField]
        : null;

    return {
        data: paginatedItems,
        cursor: {
            next: nextCursor,
            hasMore
        }
    };
};

module.exports = {
    calculatePagination,
    generatePaginationLinks,
    paginateArray,
    createPaginatedResponse,
    parsePaginationParams,
    paginationMiddleware,
    cursorPaginate
};
