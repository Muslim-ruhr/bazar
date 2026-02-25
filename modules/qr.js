(function () {
  "use strict";

  function createQrMatrixV3L(text) {
    const encoder = new TextEncoder();
    const input = encoder.encode(String(text || ""));
    const maxBytes = 53;
    if (!input.length || input.length > maxBytes) return null;

    const dataCodewordsCount = 55;
    const eccCodewordsCount = 15;
    const size = 29;
    const alignCenter = 22;

    const bits = [];
    bits.push(0, 1, 0, 0);
    for (let i = 7; i >= 0; i -= 1) bits.push((input.length >> i) & 1);
    for (const b of input) for (let i = 7; i >= 0; i -= 1) bits.push((b >> i) & 1);
    const maxDataBits = dataCodewordsCount * 8;
    const terminator = Math.min(4, maxDataBits - bits.length);
    for (let i = 0; i < terminator; i += 1) bits.push(0);
    while (bits.length % 8 !== 0) bits.push(0);

    const data = [];
    for (let i = 0; i < bits.length; i += 8) {
      let v = 0;
      for (let j = 0; j < 8; j += 1) v = (v << 1) | bits[i + j];
      data.push(v);
    }
    const pads = [0xec, 0x11];
    for (let i = data.length; i < dataCodewordsCount; i += 1) data.push(pads[i % 2]);

    const gfExp = new Uint16Array(512);
    const gfLog = new Uint16Array(256);
    let x = 1;
    for (let i = 0; i < 255; i += 1) {
      gfExp[i] = x;
      gfLog[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (let i = 255; i < 512; i += 1) gfExp[i] = gfExp[i - 255];
    const gfMul = (a, b) => (a === 0 || b === 0 ? 0 : gfExp[gfLog[a] + gfLog[b]]);
    const polyMul = (a, b) => {
      const out = new Array(a.length + b.length - 1).fill(0);
      for (let i = 0; i < a.length; i += 1) for (let j = 0; j < b.length; j += 1) out[i + j] ^= gfMul(a[i], b[j]);
      return out;
    };

    let gen = [1];
    for (let i = 0; i < eccCodewordsCount; i += 1) gen = polyMul(gen, [1, gfExp[i]]);

    const msg = data.concat(new Array(eccCodewordsCount).fill(0));
    for (let i = 0; i < data.length; i += 1) {
      const coef = msg[i];
      if (coef === 0) continue;
      for (let j = 0; j < gen.length; j += 1) msg[i + j] ^= gfMul(gen[j], coef);
    }
    const codewords = data.concat(msg.slice(msg.length - eccCodewordsCount));

    const modules = Array.from({ length: size }, () => Array(size).fill(null));
    const isFn = Array.from({ length: size }, () => Array(size).fill(false));
    const setFn = (r, c, dark) => {
      if (r < 0 || c < 0 || r >= size || c >= size) return;
      modules[r][c] = !!dark;
      isFn[r][c] = true;
    };

    const drawFinder = (r, c) => {
      for (let y = -1; y <= 7; y += 1) {
        for (let x2 = -1; x2 <= 7; x2 += 1) {
          const rr = r + y;
          const cc = c + x2;
          if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue;
          const border = y === -1 || y === 7 || x2 === -1 || x2 === 7;
          const ring = y === 0 || y === 6 || x2 === 0 || x2 === 6;
          const core = y >= 2 && y <= 4 && x2 >= 2 && x2 <= 4;
          setFn(rr, cc, !border && (ring || core));
        }
      }
    };

    const drawAlign = (centerR, centerC) => {
      for (let y = -2; y <= 2; y += 1) {
        for (let x2 = -2; x2 <= 2; x2 += 1) {
          const rr = centerR + y;
          const cc = centerC + x2;
          const border = Math.abs(y) === 2 || Math.abs(x2) === 2;
          const dot = y === 0 && x2 === 0;
          setFn(rr, cc, border || dot);
        }
      }
    };

    drawFinder(0, 0);
    drawFinder(0, size - 7);
    drawFinder(size - 7, 0);
    drawAlign(alignCenter, alignCenter);

    for (let i = 8; i < size - 8; i += 1) {
      setFn(6, i, i % 2 === 0);
      setFn(i, 6, i % 2 === 0);
    }
    setFn(size - 8, 8, true);

    for (let i = 0; i < 9; i += 1) if (i !== 6) {
      setFn(8, i, false);
      setFn(i, 8, false);
    }
    for (let i = size - 8; i < size; i += 1) {
      setFn(8, i, false);
      setFn(i, 8, false);
    }

    const bitStream = [];
    for (const cw of codewords) for (let i = 7; i >= 0; i -= 1) bitStream.push((cw >> i) & 1);

    let bitIdx = 0;
    let upward = true;
    for (let col = size - 1; col > 0; col -= 2) {
      if (col === 6) col -= 1;
      for (let rowStep = 0; rowStep < size; rowStep += 1) {
        const row = upward ? size - 1 - rowStep : rowStep;
        for (let offset = 0; offset < 2; offset += 1) {
          const c = col - offset;
          if (isFn[row][c]) continue;
          modules[row][c] = bitIdx < bitStream.length ? bitStream[bitIdx] === 1 : false;
          bitIdx += 1;
        }
      }
      upward = !upward;
    }

    const maskFns = [
      (r, c) => (r + c) % 2 === 0,
      (r, c) => r % 2 === 0,
      (r, c) => c % 3 === 0,
      (r, c) => (r + c) % 3 === 0,
      (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
      (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
      (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
      (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0
    ];

    const calcPenalty = (grid) => {
      let p = 0;
      for (let r = 0; r < size; r += 1) {
        let runColor = grid[r][0];
        let runLen = 1;
        for (let c = 1; c < size; c += 1) {
          if (grid[r][c] === runColor) runLen += 1;
          else {
            if (runLen >= 5) p += 3 + (runLen - 5);
            runColor = grid[r][c];
            runLen = 1;
          }
        }
        if (runLen >= 5) p += 3 + (runLen - 5);
      }
      for (let c = 0; c < size; c += 1) {
        let runColor = grid[0][c];
        let runLen = 1;
        for (let r = 1; r < size; r += 1) {
          if (grid[r][c] === runColor) runLen += 1;
          else {
            if (runLen >= 5) p += 3 + (runLen - 5);
            runColor = grid[r][c];
            runLen = 1;
          }
        }
        if (runLen >= 5) p += 3 + (runLen - 5);
      }
      for (let r = 0; r < size - 1; r += 1) for (let c = 0; c < size - 1; c += 1) {
        const v = grid[r][c];
        if (v === grid[r][c + 1] && v === grid[r + 1][c] && v === grid[r + 1][c + 1]) p += 3;
      }
      let dark = 0;
      for (let r = 0; r < size; r += 1) for (let c = 0; c < size; c += 1) if (grid[r][c]) dark += 1;
      const total = size * size;
      p += Math.floor(Math.abs((dark * 100) / total - 50) / 5) * 10;
      return p;
    };

    const applyMask = (base, maskId) =>
      base.map((row, r) => row.map((v, c) => (isFn[r][c] ? v : (maskFns[maskId](r, c) ? !v : v))));

    const formatBits = (maskId) => {
      const data5 = (0b01 << 3) | maskId;
      let bitsVal = data5 << 10;
      const g = 0x537;
      for (let i = 14; i >= 10; i -= 1) if ((bitsVal >> i) & 1) bitsVal ^= g << (i - 10);
      return ((data5 << 10) | (bitsVal & 0x3ff)) ^ 0x5412;
    };

    const drawFormatBits = (grid, bitsVal) => {
      const bit = (i) => ((bitsVal >> i) & 1) === 1;
      const a = [[8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8], [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]];
      const b = [[size - 1, 8], [size - 2, 8], [size - 3, 8], [size - 4, 8], [size - 5, 8], [size - 6, 8], [size - 7, 8], [size - 8, 8], [8, size - 8], [8, size - 7], [8, size - 6], [8, size - 5], [8, size - 4], [8, size - 3], [8, size - 2]];
      for (let i = 0; i < 15; i += 1) {
        const [r1, c1] = a[i];
        const [r2, c2] = b[i];
        grid[r1][c1] = bit(i);
        grid[r2][c2] = bit(i);
      }
    };

    let bestGrid = null;
    let bestPenalty = Infinity;
    for (let maskId = 0; maskId < 8; maskId += 1) {
      const g = applyMask(modules, maskId);
      drawFormatBits(g, formatBits(maskId));
      const p = calcPenalty(g);
      if (p < bestPenalty) {
        bestPenalty = p;
        bestGrid = g;
      }
    }
    return bestGrid;
  }

  function qrMatrixToPngDataUrl(matrix) {
    if (!matrix || !matrix.length) return "";
    const size = matrix.length;
    const modulePx = 8;
    const margin = 2;
    const canvasSize = (size + margin * 2) * modulePx;
    const canvas = document.createElement("canvas");
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000000";
    for (let r = 0; r < size; r += 1) for (let c = 0; c < size; c += 1) {
      if (!matrix[r][c]) continue;
      ctx.fillRect((c + margin) * modulePx, (r + margin) * modulePx, modulePx, modulePx);
    }
    return canvas.toDataURL("image/png");
  }

  window.BazarQR = { createQrMatrixV3L, qrMatrixToPngDataUrl };
})();
