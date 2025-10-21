/**
 * Riddle Lambda Handlers
 * AWS Lambda handlers for riddle endpoints
 */

const RiddleController = require('../controllers/RiddleController');

/**
 * Wrapper to convert Express-style controller to Lambda handler
 */
const wrapController = (controllerMethod) => {
  return async (event) => {
    // Mock Express request object
    const req = {
      user: event.requestContext.authorizer || {},
      params: event.pathParameters || {},
      body: event.body ? JSON.parse(event.body) : {},
      headers: event.headers || {},
    };

    // Mock Express response object
    let statusCode = 200;
    let responseBody = {};

    const res = {
      status: (code) => {
        statusCode = code;
        return res;
      },
      json: (data) => {
        responseBody = data;
        return res;
      },
    };

    // Mock Express next function
    const next = (error) => {
      if (error) {
        statusCode = error.statusCode || 500;
        responseBody = {
          success: false,
          message: error.message || 'Internal server error',
        };
      }
    };

    // Call the controller
    await controllerMethod(req, res, next);

    // Return Lambda response
    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify(responseBody),
    };
  };
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
