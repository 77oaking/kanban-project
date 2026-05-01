/**
 * Lightweight Zod validator. Pass schemas for body/query/params; whichever is
 * present is parsed and replaces the original (so downstream handlers get the
 * coerced types).
 */
export function validate({ body, query, params } = {}) {
  return (req, _res, next) => {
    try {
      if (body) req.body = body.parse(req.body);
      if (query) req.query = query.parse(req.query);
      if (params) req.params = { ...req.params, ...params.parse(req.params) };
      next();
    } catch (err) {
      next(err);
    }
  };
}
