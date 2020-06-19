/**
 * Error codes that can be returned when calling the JSON RPC API
 */
module.exports = {
    BUDGET_NOT_AUTHORIZED: 50403, // You are not authorized to view that budget
    BUDGET_NOT_FOUND: 50404,  // That budget does not exist

    // Defined by the JSON RPC standard:
    INVALID_PARAMS: -32602,
};
