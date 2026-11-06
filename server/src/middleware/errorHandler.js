export const notFound = (_req, res) =>
  res.status(404).json({ success: false, error: { message: 'Route not found.' } });

export const errorHandler = (err, _req, res, _next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    success: false,
    error: { message: status >= 500 ? 'Something went wrong.' : err.message, details: err.details },
  });
};
