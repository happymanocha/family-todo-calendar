/**
 * Riddle Lambda Handlers
 * AWS Lambda handlers for riddle endpoints
 */

const RiddleController = require('../controllers/RiddleController');
const {
  lambdaWrapper,
  getAuthenticatedUser,
  parseBody,
  successResponse,
  errorResponse,
} = require('../utils/lambda-utils');

/**
 * Wrapper to convert Express-style controller to Lambda handler
 */
const wrapController = (controllerMethod) => {
  return lambdaWrapper(async (event) => {
    // Get authenticated user
    const user = getAuthenticatedUser(event);

    // Mock Express request object
    const req = {
      user,
      params: event.pathParameters || {},
      body: parseBody(event.body),
      headers: event.headers || {},
      query: event.queryStringParameters || {},
    };

    // Mock Express response object
    let statusCode = 200;
    let responseData = null;

    const res = {
      status: (code) => {
        statusCode = code;
        return res;
      },
      json: (data) => {
        responseData = data;
        return res;
      },
    };

    // Mock Express next function
    const next = (error) => {
      if (error) {
        throw error;
      }
    };

    // Call the controller
    await controllerMethod(req, res, next);

    // Return appropriate response based on status code
    if (statusCode >= 200 && statusCode < 300) {
      return successResponse(
        responseData?.data || responseData,
        responseData?.message || 'Success',
        statusCode
      );
    }
    return errorResponse(
      responseData?.message || 'Error',
      statusCode,
      responseData?.code || 'ERROR'
    );
  });
};

/**
 * Get today's riddle
 */
module.exports.getTodaysRiddle = wrapController(RiddleController.getTodaysRiddle);

/**
 * Reveal answer
 */
module.exports.revealAnswer = wrapController(RiddleController.revealAnswer);

/**
 * Get hint
 */
module.exports.getHint = wrapController(RiddleController.getHint);

/**
 * Mark as solved
 */
module.exports.markSolved = wrapController(RiddleController.markSolved);
