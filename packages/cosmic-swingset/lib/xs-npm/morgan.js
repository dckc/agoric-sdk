const byToken = {
  method: req => req.method,
  url: req => req.path, // ISSUE: full url?
  status: req => req.status,
  res: (req, key) => req.headers[key],
  'response-time': res => '???',  // ISSUE: response time
};

const pattern = /(?<prefix>[^:]*)(:(?<token>[-a-z]+)(\[(?<key>[^\]]+)\])?)?/g;

export default function morgan(format) {
  return function morganHandler(req, _res, next) {
    const out = [];
    for (const { groups: g } of format.matchAll(pattern)) {
      out.push(g.prefix);
      const decode = byToken[g.token];
      if (typeof decode === 'function') {
	out.push(decode(req, g.key));
      }
    };
    console.log(out.join(''));
    next();
  };
}
