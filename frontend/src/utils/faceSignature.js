export const createFaceSignatureFromVideo = (videoElement) => {
  const canvas = document.createElement("canvas");
  const width = 64;
  const height = 64;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(videoElement, 0, 0, width, height);
  const data = ctx.getImageData(0, 0, width, height).data;

  const cells = [];
  const blockSize = 8;
  for (let by = 0; by < 8; by += 1) {
    for (let bx = 0; bx < 8; bx += 1) {
      let sum = 0;
      let count = 0;
      for (let y = by * blockSize; y < (by + 1) * blockSize; y += 1) {
        for (let x = bx * blockSize; x < (bx + 1) * blockSize; x += 1) {
          const idx = (y * width + x) * 4;
          const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          sum += gray;
          count += 1;
        }
      }
      cells.push(sum / count);
    }
  }

  const mean = cells.reduce((acc, val) => acc + val, 0) / cells.length;
  return cells.map((v) => (v >= mean ? 1 : 0)).join(",");
};

