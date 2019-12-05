// cribbed from https://gist.github.com/fffaraz/9d9170b57791c28ccda9255b48315168
// https://en.wikipedia.org/wiki/Domain_Name_System#DNS_message_format

import dgram from 'dgram';  //@@node.js


const DNS = Object.freeze({
  flags({ qr, opcode, aa, tc, rd, ra, rcode }) {
    return packBits([[qr, 1], [opcode, 4], [aa, 1], [tc, 1],
		     [rd, 1], [ra, 1], [0 /*z*/, 3], [rcode, 4]]);
  },

  header({ id, flags, qd_count, an_count, ns_count, ar_count }) {
    return packShorts([id, flags, qd_count, an_count, ns_count, ar_count ]);
  },

  question1(header, { name, qtype, qclass }) {
    const namep = lengthPrefixed(name);
    const q = packShorts([qtype, qclass]);
    const msg = new Uint8Array(header.length + namep.length + q.length);
    msg.set(header);
    msg.set(namep, header.length);
    msg.set(q, header.length + namep.length);
    return msg;
  },

  decode(msg) {
    const headerFields = 6;
    const [id, flagBits, qd_count, an_count, ns_count, ar_count] = unpackShorts(msg, headerFields);
    const [qr, opcode, aa, tc, rd, ra, rcode] = unpackBits(flagBits, [1, 4, 1, 1,
								      1, 1, 3, 4]);
    const flags = { qr, opcode, aa, tc, rd, ra, rcode };

    const questions = [];
    let offset = headerFields * 2;
    for (let ix = 0; ix < qd_count; ix++) {
      const { name, count } = unpackName(msg, offset);
      offset += count;
      const [ qtype, qclass ] = unpackShorts(msg.slice(offset), 2);
      offset += 2 * 2;
      questions.push({ name, qtype, qclass });
    }

    const answers = [];
    for (let ix = 0; ix < an_count; ix++) {
      const { name, count } = unpackName(msg, offset);
      offset += count;
      const [ qtype, qclass, ttl_hi, ttl_lo, data_len ] = unpackShorts(msg.slice(offset), 5);
      const ttl = ttl_hi << 0x10 | ttl_lo;
      offset += 5 * 2;
      let rdata;
      if (qtype === T_A) {
	rdata = msg.slice(offset, offset + data_len);
	offset += data_len;
      } else {
	const { name, count } = unpackName(msg, offset);
	rdata = name;
	offset += count;
      }
      answers.push({ name, qtype, qclass, ttl, data_len, rdata });
    }

    return {
      header: { id, flags, qd_count, an_count, ns_count, ar_count },
      questions, answers
    };
  }
});


function packBits(parts) {
  let out = 0x00;
  let shift = 0;
  for (const [val, bits] of parts) {
    const mask = (1 << bits) - 1;
    out = out | ((val & mask) << shift);
    shift += bits;
  }
  return out;
}

function unpackBits(short, parts) {
  let out = [];
  let shift = 0;
  const strap = [...parts].reverse();
  for (const bits of strap) {
    const mask = (1 << bits) - 1;
    const val = (short >> shift) & mask;
    out.push(val);
    shift += bits;
  }
  return out.reverse();
}

function packShorts(fields) {
  const buf = new Uint8Array(fields.length * 2);
  let ix = 0;
  for (const field of fields) {
    const hiByte = (field >> 8) & 0xff;
    const loByte = field & 0xff;
    buf[ix] = hiByte;
    buf[ix + 1] = loByte;
    ix += 2;
  }
  return buf;
}

function unpackShorts(buf, qty) {
  const out = [];
  for (let ix = 0; ix < qty; ix++) {
    const hiByte = buf[ix * 2];
    const loByte = buf[ix * 2 + 1];
    out.push(hiByte <<8 | loByte);
  }
  return out;
}


function lengthPrefixed(dotted) {
  const encoder = new TextEncoder();
  const nullChar = String.fromCharCode(0);
  // ISSUE: assume labels are < 192 chars
  const prefix = label => String.fromCharCode(label.length) + label;
  return encoder.encode(dotted.split('.').map(prefix).join('') + nullChar);
}

function unpackName(buf, offset) {
  let name = '';
  let count = 1;
  let jumped = false;

  while (buf[offset] != 0) {
    if (buf[offset] >= 0xc0) { // name compression
      offset = (buf[offset] - 0xc0) * 0x100 + buf[offset + 1];
      offset -= 1;
      jumped = true;
    } else {
      name += String.fromCharCode(buf[offset]);
    }
    offset++;
    if (!jumped) {
      count++;
    }
  }
  if (jumped) {
    count++;
  }

  const labels = [];
  for (let ix=0; ix < name.length; ix++) {
    const n = name.charCodeAt(ix);
    labels.push(name.slice(ix + 1, ix + 1 + n));
    ix += n;
  }
  const out = { name: labels.join('.'), count };
  // console.log(out);
  return out;
}


function ngethostbyname(sock, server, id, hostname, query_type) {
  const port = 53;
  const address = server;

  const header = DNS.header({
    id,
    flags: DNS.flags({
      qr: 0,     // query
      opcode: 0, // standard query
      aa: 0,     // Not Authoritative
      tc: 0,     // not truncated
      rd: 1,     // Recursion Desired
      ra: 0,     // Recursion not available
      rcode: 0,
    }),
    qd_count: 1, // 1 question
    an_count: 0,
    ns_count: 0,
    ar_count: 0,
  });

  const q1 = DNS.question1(header, { name: hostname, qtype: query_type, qclass: 1 /* internet */ });
  console.log('Sending packet...');
  sock.send(q1, port, address, (err) => {
    if (err) {
      console.error('error!', err);
    }
  });
  sock.on('message', (msg, rinfo) => {
    console.log('raw:', msg);
    const response = DNS.decode(msg);
    console.log('response:', response);
    const ip4 = Array.from(response.answers[0].rdata);
    const ip4s = ip4.map(b => b.toString()).join('.');
    console.log(ip4, ip4s);
  });
}

const T_A = 1; // IPv4 address

function main({ process }) {
  const dns_servers = ["208.67.222.222",
		       "208.67.220.220"];
  const hostname = "ip4.me";
  const sock = dgram.createSocket('udp4'); //UDP packet for DNS queries

  ngethostbyname(sock, dns_servers[0], process.pid, hostname, T_A);
}

main({ process });
