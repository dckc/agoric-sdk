// cribbed from https://gist.github.com/fffaraz/9d9170b57791c28ccda9255b48315168
// https://en.wikipedia.org/wiki/Domain_Name_System#DNS_message_format
// https://tools.ietf.org/html/rfc8427

import assert from 'assert';
import dgram from 'dgram';  //@@node.js


const RR = {
  A: 1, // IPv4 address
  AAAA: 28, // IPv6 address
}


const DNS = Object.freeze({
  flags({ QR, Opcode, AA, TC, RD, RA, RCODE }) {
    return packBits([[QR, 1], [Opcode, 4], [AA, 1], [TC, 1],
		     [RD, 1], [RA, 1], [0 /*z*/, 3], [RCODE, 4]]);
  },

  header({ ID, flags, QDCOUNT, ANCOUNT, NSCOUNT, ARCOUNT }) {
    return packShorts([ID, flags, QDCOUNT, ANCOUNT, NSCOUNT, ARCOUNT ]);
  },

  question1(header, { QNAME, QTYPE, QCLASS }) {
    const namep = lengthPrefixed(QNAME);
    const q = packShorts([QTYPE, QCLASS]);
    const msg = new Uint8Array(header.length + namep.length + q.length);
    msg.set(header);
    msg.set(namep, header.length);
    msg.set(q, header.length + namep.length);
    return msg;
  },

  decode(msg) {
    const headerFields = 6;
    const [ID, flagBits, QDCOUNT, ANCOUNT, NSCOUNT, ARCOUNT] = unpackShorts(msg, headerFields);
    const [QR, Opcode, AA, TC, RD, RA, _z, RCODE] = unpackBits(flagBits, [1, 4, 1, 1,
									  1, 1, 3, 4]);
    const flags = { QR, Opcode, AA, TC, RD, RA, RCODE };

    const questionRRs = [];
    let offset = headerFields * 2;
    for (let ix = 0; ix < QDCOUNT; ix++) {
      const { name, count } = unpackName(msg, offset);
      offset += count;
      const [ TYPE, CLASS ] = unpackShorts(msg.slice(offset), 2);
      offset += 2 * 2;
      questionRRs.push({ NAME: name, TYPE, CLASS });
    }

    const answerRRs = [];
    for (let ix = 0; ix < ANCOUNT; ix++) {
      const { name, count } = unpackName(msg, offset);
      offset += count;
      const [ TYPE, CLASS, ttl_hi, ttl_lo, data_len ] = unpackShorts(msg.slice(offset), 5);
      const TTL = ttl_hi << 0x10 | ttl_lo;
      offset += 5 * 2;
      let rdata;
      if (TYPE === RR.A) {
	const b4 = msg.slice(offset, offset + data_len);
	const rdataA = Array.from(b4).map(b => b.toString()).join('.');
	rdata = { rdataA };
	offset += data_len;
      } else {
	const raw = msg.slice(offset, offset + data_len);
	const hex = b => ('0' + b.toString(16)).slice(-2);
	const rdataHEX = Array.from(raw).map(hex).join('');
	rdata = { rdataHEX };
	offset += count;
      }
      answerRRs.push({ NAME: name, TYPE, CLASS, TTL, ...rdata });
    }

    return {
      header: { ID, ...flags, QDCOUNT, ANCOUNT, NSCOUNT, ARCOUNT },
      questionRRs, answerRRs
    };
  }
});


function packBits(parts) {
  let out = 0x00;
  let shift = 0;
  const strap = [...parts].reverse();
  for (const [val, bits] of strap) {
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
      assert(name.length < 64);
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


function ngethostbyname(sock, server, ID, hostname, query_type) {
  const port = 53;
  const address = server;

  const header = DNS.header({
    ID,
    flags: DNS.flags({
      QR: 0,     // query
      Opcode: 0, // standard query
      AA: 0,     // Not Authoritative
      TC: 0,     // not truncated
      RD: 1,     // Recursion Desired
      RA: 0,     // Recursion not available
      RCODE: 0,
    }),
    QDCOUNT: 1, // 1 question
    ANCOUNT: 0,
    NSCOUNT: 0,
    ARCOUNT: 0,
  });

  const q1 = DNS.question1(header, { QNAME: hostname, QTYPE: query_type, QCLASS: 1 /* internet */ });
  // console.log('decode Q:', DNS.decode(q1));
  console.log('Sending packet...');
  sock.send(q1, port, address, (err) => {
    if (err) {
      console.error('error!', err);
    }
  });
  sock.on('message', (msg, rinfo) => {
    console.log('raw:', msg);
    const response = DNS.decode(msg);
    // console.log('response:', response);
    console.log(response.answerRRs);
  });
}

function main({ process }) {
  const dns_servers = ["208.67.222.222",
		       "208.67.220.220"];
  const hostname = "ip6.me";
  const sock = dgram.createSocket('udp4'); //UDP packet for DNS queries

  ngethostbyname(sock, dns_servers[0], process.pid, hostname, RR.AAAA);
}

main({ process });
