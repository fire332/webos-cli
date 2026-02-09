/*
 * Minimal request-compatible wrapper using fetch.
 * Supports request(url).pipe(...), request.get(url, cb), request.head(url, cb).
 */

const { PassThrough, Readable } = require("stream");

function headersToObject(headers) {
  const out = {};
  if (!headers) {
    return out;
  }
  for (const [key, value] of headers.entries()) {
    out[key.toLowerCase()] = value;
  }
  return out;
}

function toResponse(res) {
  return {
    statusCode: res.status,
    statusMessage: res.statusText,
    headers: headersToObject(res.headers),
  };
}

function streamFromFetch(url, options) {
  const stream = new PassThrough();
  fetch(url, options)
    .then((res) => {
      if (!res.body) {
        stream.end();
        return;
      }
      const readable = Readable.fromWeb(res.body);
      readable.on("error", (err) => {
        stream.emit("error", err);
      });
      readable.pipe(stream);
    })
    .catch((err) => {
      stream.emit("error", err);
    });
  return stream;
}

function request(url, cb) {
  if (typeof cb === "function") {
    return request.get(url, cb);
  }
  return streamFromFetch(url);
}

request.get = function get(url, cb) {
  fetch(url)
    .then(async (res) => {
      const body = await res.text();
      cb(null, toResponse(res), body);
    })
    .catch((err) => cb(err));
};

request.head = function head(url, cb) {
  fetch(url, { method: "HEAD" })
    .then((res) => cb(null, toResponse(res)))
    .catch((err) => cb(err));
};

module.exports = request;
