const byToken = {
  method: req => req.method,
  url: req => req.path, // ISSUE: full url?
  status: (_, res) => res.statusCode,
  res: (req, res, key) => req.headers[key],
  'response-time': res => '???', // ISSUE: response time
};

const pattern = /(?<prefix>[^:]*)(:(?<token>[-a-z]+)(\[(?<key>[^\]]+)\])?)?/g;

function onFinished(res, fn) {
  // As in xs-node-api/http.js, we assume handlers that impact
  // reponses are synchronous.
  Promise.resolve(null).then(fn);
}

export default function morgan(format) {
  return function logMessage(req, res, next) {
    onFinished(req, () => {
      const out = [];
      for (const { groups: g } of format.matchAll(pattern)) {
        out.push(g.prefix);
        const decode = byToken[g.token];
        if (typeof decode === 'function') {
          out.push(decode(req, res, g.key));
        }
      }
      console.log(out.join(''));
      next();
    });
  };
}
