// Shelf logo generator using SDF-based corner rounding
// 1. Define the sharp shape as a polygon
// 2. Compute signed distance field on a grid
// 3. Extract contour at sdf = -cornerR (eroded shape = rounded convex corners)
// 4. Scale back to compensate for erosion
// 5. Output as SVG path

const fs = require('fs')

const R = 12, d = R / 3, cx = 16, cy = 16
const CORNER_R = parseFloat(process.argv[2] || '0.4')      // rounding radius in SVG units
const GRID = parseInt(process.argv[3] || '1024')            // grid resolution
const TAIL_ONSET = parseFloat(process.argv[4] || '0.85')    // t value where tail warp starts (0-1)
const TAIL_RATE = parseFloat(process.argv[5] || '3')         // ease-out power (higher = sharper)
const END_OFFSET = parseFloat(process.argv[6] || '0.3')     // mouth opening in radians
const VIEWBOX = { x: 3, y: 3, w: 26, h: 26 }           // slightly larger than shape

const N_circ = 120
const N_spiral = 120
const θ_gap = 0.03

// --- Generate sharp polygon ---

const circEnd = 2 * Math.PI - END_OFFSET
const polygon = []

// Outer circle CW
for (let i = 0; i <= N_circ; i++) {
    const θ = circEnd * i / N_circ
    polygon.push([cx + R * Math.cos(θ), cy + R * Math.sin(θ)])
}

// Straight line to junction
polygon.push([cx + d, cy])

// Spiral CCW
// TAIL_SHORTEN warps the radial parameter near t=1 so the spiral
// reaches full radius earlier, shortening the tail without affecting
// the rest of the curve. Uses a smooth power ramp in the last portion.
const θ1 = 2 * Math.PI - END_OFFSET
const tailStart = TAIL_ONSET
let lastSpiralAngle = θ_gap  // track where spiral actually ends
// Use extra points in the tail region to handle high TAIL_RATE without jumps
const N_tail_extra = Math.ceil(N_spiral * 2)  // extra density in tail
const totalSpiralSteps = N_spiral + N_tail_extra
let prevTW = -1
for (let i = 0; i <= totalSpiralSteps; i++) {
    const t = i / totalSpiralSteps
    let tW = t
    if (t > tailStart) {
        const u = (t - tailStart) / (1 - tailStart)
        tW = tailStart + (1 - tailStart) * (1 - Math.pow(1 - u, TAIL_RATE))
    }
    // Skip near-duplicate points (tW saturated)
    if (tW - prevTW < 0.0001 && i < totalSpiralSteps) continue
    prevTW = tW
    const θ = θ_gap + (θ1 - θ_gap) * tW
    const rBase = tW * tW  // use tW consistently for radius
    const r = d + (R - d) * Math.min(rBase, 1)
    polygon.push([cx + r * Math.cos(θ), cy - r * Math.sin(θ)])
    lastSpiralAngle = θ
}

// Return: retrace outer circle backward from spiral's actual end angle to 0
// Convert spiral's CCW angle to CW angle for the outer circle
const tailCWAngle = 2 * Math.PI - lastSpiralAngle
const N_return = Math.max(4, Math.ceil(N_circ * tailCWAngle / (2 * Math.PI)))
for (let i = 1; i <= N_return; i++) {
    const θ = tailCWAngle * (1 - i / N_return)  // CW from tail back to 0
    polygon.push([cx + R * Math.cos(θ), cy + R * Math.sin(θ)])
}

// --- Point-in-polygon (winding number) ---
function windingNumber(px, py, poly) {
    let wn = 0
    for (let i = 0; i < poly.length; i++) {
        const [x1, y1] = poly[i]
        const [x2, y2] = poly[(i + 1) % poly.length]
        if (y1 <= py) {
            if (y2 > py) {
                const cross = (x2 - x1) * (py - y1) - (px - x1) * (y2 - y1)
                if (cross > 0) wn++
            }
        } else {
            if (y2 <= py) {
                const cross = (x2 - x1) * (py - y1) - (px - x1) * (y2 - y1)
                if (cross < 0) wn--
            }
        }
    }
    return wn
}

// --- Distance from point to line segment ---
function distToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1
    const lenSq = dx * dx + dy * dy
    if (lenSq === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2) - CORNER_R
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq
    t = Math.max(0, Math.min(1, t))
    const nearX = x1 + t * dx, nearY = y1 + t * dy
    return Math.sqrt((px - nearX) ** 2 + (py - nearY) ** 2) - CORNER_R
}

// --- Compute SDF on grid ---
console.error('Computing SDF...')
const sdf = new Float32Array(GRID * GRID)

for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
        const px = VIEWBOX.x + (gx + 0.5) * VIEWBOX.w / GRID
        const py = VIEWBOX.y + (gy + 0.5) * VIEWBOX.h / GRID

        // Min distance to boundary
        let minDist = Infinity
        for (let i = 0; i < polygon.length; i++) {
            const [x1, y1] = polygon[i]
            const [x2, y2] = polygon[(i + 1) % polygon.length]
            const d = distToSegment(px, py, x1, y1, x2, y2)
            if (d < minDist) minDist = d
        }

        // Sign: negative inside, positive outside
        const inside = windingNumber(px, py, polygon) !== 0
        sdf[gy * GRID + gx] = inside ? -minDist : minDist
    }
    if (gy % 64 === 0) console.error(`  row ${gy}/${GRID}`)
}

// --- Marching squares contour extraction ---
console.error('Extracting contour...')
const level = 0  // offset already applied in distToSegment

function getVal(gx, gy) {
    if (gx < 0 || gx >= GRID || gy < 0 || gy >= GRID) return 1 // outside
    return sdf[gy * GRID + gx]
}

// Extract contour segments
const segments = []
for (let gy = 0; gy < GRID - 1; gy++) {
    for (let gx = 0; gx < GRID - 1; gx++) {
        const v00 = getVal(gx, gy) - level
        const v10 = getVal(gx + 1, gy) - level
        const v01 = getVal(gx, gy + 1) - level
        const v11 = getVal(gx + 1, gy + 1) - level

        const idx = (v00 > 0 ? 1 : 0) | (v10 > 0 ? 2 : 0) | (v01 > 0 ? 4 : 0) | (v11 > 0 ? 8 : 0)
        if (idx === 0 || idx === 15) continue

        // Interpolation helpers (pixel coords)
        function interpX(va, vb, y) {
            const t = va / (va - vb)
            return [gx + t, y]
        }
        function interpY(va, vb, x) {
            const t = va / (va - vb)
            return [x, gy + t]
        }

        const top = interpX(v00, v10, gy)
        const bottom = interpX(v01, v11, gy + 1)
        const left = interpY(v00, v01, gx)
        const right = interpY(v10, v11, gx + 1)

        // Add segments based on which edges are crossed
        const edges = []
        // Top edge (v00 to v10)
        if ((v00 > 0) !== (v10 > 0)) edges.push({ pos: top, edge: 'top' })
        // Right edge (v10 to v11)
        if ((v10 > 0) !== (v11 > 0)) edges.push({ pos: right, edge: 'right' })
        // Bottom edge (v01 to v11)
        if ((v01 > 0) !== (v11 > 0)) edges.push({ pos: bottom, edge: 'bottom' })
        // Left edge (v00 to v01)
        if ((v00 > 0) !== (v01 > 0)) edges.push({ pos: left, edge: 'left' })

        // Connect pairs
        for (let i = 0; i < edges.length; i += 2) {
            if (i + 1 < edges.length) {
                segments.push([edges[i].pos, edges[i + 1].pos])
            }
        }
    }
}

console.error(`  ${segments.length} segments`)

// --- Chain segments into a polyline ---
function chainSegments(segs) {
    const eps = 0.5  // pixel tolerance for joining
    const used = new Array(segs.length).fill(false)
    const chains = []

    function findNext(pt, exclude) {
        let bestIdx = -1, bestEnd = -1, bestDist = eps
        for (let i = 0; i < segs.length; i++) {
            if (used[i] || i === exclude) continue
            for (let e = 0; e < 2; e++) {
                const d = Math.sqrt((segs[i][e][0] - pt[0]) ** 2 + (segs[i][e][1] - pt[1]) ** 2)
                if (d < bestDist) {
                    bestDist = d
                    bestIdx = i
                    bestEnd = e
                }
            }
        }
        return [bestIdx, bestEnd]
    }

    for (let start = 0; start < segs.length; start++) {
        if (used[start]) continue
        used[start] = true
        const chain = [segs[start][0], segs[start][1]]

        // Extend forward
        while (true) {
            const [idx, end] = findNext(chain[chain.length - 1], -1)
            if (idx < 0) break
            used[idx] = true
            chain.push(end === 0 ? segs[idx][1] : segs[idx][0])
        }

        // Extend backward
        while (true) {
            const [idx, end] = findNext(chain[0], -1)
            if (idx < 0) break
            used[idx] = true
            chain.unshift(end === 0 ? segs[idx][1] : segs[idx][0])
        }

        if (chain.length > 10) chains.push(chain)
    }

    return chains
}

const chains = chainSegments(segments)
console.error(`  ${chains.length} chains, longest: ${Math.max(...chains.map(c => c.length))} points`)

// Take the longest chain (the main shape outline)
const mainChain = chains.reduce((a, b) => a.length > b.length ? a : b)

// --- Simplify polyline (Ramer-Douglas-Peucker) ---
function rdp(pts, epsilon) {
    if (pts.length <= 2) return pts
    let maxDist = 0, maxIdx = 0
    const [x1, y1] = pts[0], [x2, y2] = pts[pts.length - 1]
    const lenSq = (x2 - x1) ** 2 + (y2 - y1) ** 2
    for (let i = 1; i < pts.length - 1; i++) {
        let d
        if (lenSq === 0) {
            d = Math.sqrt((pts[i][0] - x1) ** 2 + (pts[i][1] - y1) ** 2)
        } else {
            d = Math.abs((y2 - y1) * pts[i][0] - (x2 - x1) * pts[i][1] + x2 * y1 - y2 * x1) / Math.sqrt(lenSq)
        }
        if (d > maxDist) { maxDist = d; maxIdx = i }
    }
    if (maxDist > epsilon) {
        const left = rdp(pts.slice(0, maxIdx + 1), epsilon)
        const right = rdp(pts.slice(maxIdx), epsilon)
        return left.slice(0, -1).concat(right)
    }
    return [pts[0], pts[pts.length - 1]]
}

// Convert grid coords to SVG coords
const svgChain = mainChain.map(([gx, gy]) => [
    VIEWBOX.x + (gx + 0.5) * VIEWBOX.w / GRID,
    VIEWBOX.y + (gy + 0.5) * VIEWBOX.h / GRID
])

// Simplify (tolerance in SVG units, scales with grid resolution)
const simplified = rdp(svgChain, 0.03)
console.error(`  Simplified: ${svgChain.length} → ${simplified.length} points`)

// No scale compensation needed — the CORNER_R offset in distToSegment
// expands edges outward, directly producing the rounded shape at correct size
const finalPts = simplified

// --- Build SVG path ---
let path = `M ${finalPts[0][0].toFixed(2)},${finalPts[0][1].toFixed(2)}`
for (let i = 1; i < finalPts.length; i++) {
    path += ` L ${finalPts[i][0].toFixed(2)},${finalPts[i][1].toFixed(2)}`
}
path += ' Z'

console.log(path)

const vbMin = (4 - CORNER_R).toFixed(2)
const vbSize = (24 + 2 * CORNER_R).toFixed(2)
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vbMin} ${vbMin} ${vbSize} ${vbSize}">
  <path d="${path}" fill="#23a67a"/>
</svg>`
fs.writeFileSync(__dirname + '/shelf-logo.svg', svg)
console.error('Wrote shelf-logo.svg')
console.error(`Corner radius: ${CORNER_R}, Grid: ${GRID}`)
