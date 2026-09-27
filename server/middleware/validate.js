/**
 * Reusable Request Validation Middleware:
 * Ye middleware Zod schema ko accept karta hai aur incoming request body, query params, ya route params ko validate karta hai.
 *
 * Kyu zaroori hai?
 * 1. Controller tak sirf sanitized aur validated data hi pahunchta hai.
 * 2. Database par koi bhi invalid query hit hi nahi hoti (fast-fail pattern).
 * 3. Agar data schema se match nahi karta to turant 400 Bad Request centralized error handler ko forward ho jata hai.
 */
export const validate = (schema, source = 'body') => {
  return async (req, res, next) => {
    try {
      const dataToValidate = req[source];
      // Zod parseAsync data ko check aur sanitize karta hai
      const validatedData = await schema.parseAsync(dataToValidate);
      req.validatedData = validatedData;
      next();
    } catch (error) {
      // Error ko global error handler middleware ko forward karo
      next(error);
    }
  };
};

export default validate;
