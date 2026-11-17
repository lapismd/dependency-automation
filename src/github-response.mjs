/** Retain only safe failure context; never expose request credentials or bodies. */
export function httpResponseError(url, response) {
  const coordinate = new URL(url);
  const numeric = (name) => {
    const value = response.headers?.get?.(name);
    return /^\d{1,12}$/.test(value ?? "") ? Number(value) : undefined;
  };
  const rateLimit = {};
  for (const [key, header] of [
    ["limit", "x-ratelimit-limit"],
    ["remaining", "x-ratelimit-remaining"],
    ["reset", "x-ratelimit-reset"],
    ["retryAfter", "retry-after"],
  ]) {
    const value = numeric(header);
    if (value !== undefined) rateLimit[key] = value;
  }
  const exhausted =
    response.status === 429 ||
    (response.status === 403 &&
      (rateLimit.remaining === 0 || rateLimit.retryAfter !== undefined));
  const error = Object.assign(
    new Error(
      `Request failed (${response.status}): ${coordinate.origin}${coordinate.pathname}`,
    ),
    {
      code: exhausted ? "HTTP_RATE_LIMIT" : "HTTP_REQUEST_FAILED",
      status: response.status,
    },
  );
  if (Object.keys(rateLimit).length) error.rateLimit = rateLimit;
  const requestId = response.headers?.get?.("x-github-request-id");
  if (
    /^[a-fA-F0-9]{1,16}(?::[a-fA-F0-9]{1,16}){3,5}$/.test(requestId ?? "") &&
    requestId.length <= 100
  )
    error.requestId = requestId;
  return error;
}
