// squared distance to the nearest zero along one row or column (felzenszwalb & huttenlocher,
// "distance transforms of sampled functions")
function edt1d(f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array) {
  v[0] = 0
  z[0] = -Infinity
  z[1] = Infinity
  const cut = (q: number, k: number) =>
    (f[q]! + q * q - f[v[k]!]! - v[k]! * v[k]!) / (2 * (q - v[k]!))
  for (let q = 1, k = 0; q < n; q++) {
    let s = cut(q, k)
    while (s <= z[k]!) s = cut(q, --k)
    v[++k] = q
    z[k] = s
    z[k + 1] = Infinity
  }
  for (let q = 0, k = 0; q < n; q++) {
    while (z[k + 1]! < q) k++
    d[q] = (q - v[k]!) ** 2 + f[v[k]!]!
  }
}

export function edt(grid: Float64Array, w: number, h: number) {
  const n = Math.max(w, h)
  const [f, d, z, v] = [
    new Float64Array(n),
    new Float64Array(n),
    new Float64Array(n + 1),
    new Int32Array(n),
  ]
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = grid[y * w + x]!
    edt1d(f, h, d, v, z)
    for (let y = 0; y < h; y++) grid[y * w + x] = d[y]!
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = grid[y * w + x]!
    edt1d(f, w, d, v, z)
    for (let x = 0; x < w; x++) grid[y * w + x] = d[x]!
  }
}
