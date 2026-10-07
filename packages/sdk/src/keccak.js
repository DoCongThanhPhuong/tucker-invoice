// Pure zero-dependency Keccak-256 implementation (FIPS 202 Keccak[c=512, r=1088])
const RC = [
  0x0000000000000001n, 0x0000000000008082n, 0x800000000000808an, 0x8000000080008000n,
  0x000000000000808bn, 0x0000000080000001n, 0x8000000080008081n, 0x8000000000008009n,
  0x000000000000008an, 0x0000000000000088n, 0x0000000080008009n, 0x000000008000000an,
  0x000000008000808bn, 0x800000000000008bn, 0x8000000000008089n, 0x8000000000008003n,
  0x8000000000008002n, 0x8000000000000080n, 0x000000000000800an, 0x800000008000000an,
  0x8000000080008081n, 0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n,
];

const RHO = [
  [0, 36, 3, 41, 18],
  [1, 44, 10, 45, 2],
  [62, 6, 43, 15, 61],
  [28, 55, 25, 21, 56],
  [27, 20, 39, 8, 14],
];

function rotl(x, n) {
  const bn = BigInt(n);
  return ((x << bn) | (x >> (64n - bn))) & 0xffffffffffffffffn;
}

export function keccak256(input) {
  const bytes = typeof input === "string" ? Buffer.from(input, "utf8") : Buffer.from(input);
  const rate = 136; // 1088 / 8
  const paddingLength = rate - (bytes.length % rate);
  const padded = Buffer.alloc(bytes.length + paddingLength);
  bytes.copy(padded);
  padded[bytes.length] = 0x01; // Keccak-256 padding domain
  padded[padded.length - 1] |= 0x80;

  const state = Array.from({length: 5}, () => Array(5).fill(0n));

  for (let offset = 0; offset < padded.length; offset += rate) {
    for (let i = 0; i < rate / 8; i++) {
      const x = i % 5;
      const y = Math.floor(i / 5);
      state[x][y] ^= padded.readBigUInt64LE(offset + i * 8);
    }

    // 24 rounds of Keccak-f[1600]
    for (let r = 0; r < 24; r++) {
      // Theta
      const C = Array(5);
      for (let x = 0; x < 5; x++) {
        C[x] = state[x][0] ^ state[x][1] ^ state[x][2] ^ state[x][3] ^ state[x][4];
      }
      const D = Array(5);
      for (let x = 0; x < 5; x++) {
        D[x] = C[(x + 4) % 5] ^ rotl(C[(x + 1) % 5], 1);
      }
      for (let x = 0; x < 5; x++) {
        for (let y = 0; y < 5; y++) {
          state[x][y] ^= D[x];
        }
      }

      // Rho and Pi
      const B = Array.from({length: 5}, () => Array(5).fill(0n));
      for (let x = 0; x < 5; x++) {
        for (let y = 0; y < 5; y++) {
          B[y][(2 * x + 3 * y) % 5] = rotl(state[x][y], RHO[x][y]);
        }
      }

      // Chi
      for (let x = 0; x < 5; x++) {
        for (let y = 0; y < 5; y++) {
          state[x][y] = (B[x][y] ^ ((~B[(x + 1) % 5][y]) & B[(x + 2) % 5][y])) & 0xffffffffffffffffn;
        }
      }

      // Iota
      state[0][0] ^= RC[r];
    }
  }

  // Squeeze 256 bits (32 bytes)
  const out = Buffer.alloc(32);
  for (let i = 0; i < 4; i++) {
    const x = i % 5;
    const y = Math.floor(i / 5);
    out.writeBigUInt64LE(state[x][y], i * 8);
  }
  return "0x" + out.toString("hex");
}
