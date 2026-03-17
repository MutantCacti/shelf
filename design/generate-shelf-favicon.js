// Generate favicon PNGs with conic gradient fill using sharp
// Usage: node generate-shelf-favicon.js [size] [size2] ...
// Defaults: 16 32 96 192 512

const fs = require('fs')
const sharp = require('sharp')

const sizes = process.argv.slice(2).map(Number).filter(Boolean)
if (sizes.length === 0) sizes.push(16, 32, 96, 192, 512)

// Colors from the theme (conic banding)
const colors = [
    [26, 125, 92],   // accent-dark  #1a7d5c
    [35, 166, 122],  // accent       #23a67a
    [53, 196, 146],  // accent-light #35c492
    [26, 125, 92],   // accent-dark
    [35, 166, 122],  // accent
    [53, 196, 146],  // accent-light
    [26, 125, 92],   // wrap back
]

function lerpColor(a, b, t) {
    return [
        Math.round(a[0] + (b[0] - a[0]) * t),
        Math.round(a[1] + (b[1] - a[1]) * t),
        Math.round(a[2] + (b[2] - a[2]) * t),
    ]
}

function conicColor(angle) {
    const segments = colors.length - 1
    const t = (angle / (2 * Math.PI)) * segments
    const i = Math.floor(t)
    const f = t - i
    return lerpColor(colors[Math.min(i, segments - 1)], colors[Math.min(i + 1, segments)], f)
}

// Parse SVG path
const svgContent = fs.readFileSync(__dirname + '/shelf-logo.svg', 'utf8')
const pathMatch = svgContent.match(/d="([^"]+)"/)
const pathData = pathMatch[1]
const points = []
const re = /([ML])\s*([\d.-]+),([\d.-]+)/g
let m
while ((m = re.exec(pathData)) !== null) {
    points.push([parseFloat(m[2]), parseFloat(m[3])])
}

const vbMatch = svgContent.match(/viewBox="([\d.\s-]+)"/)
const [vbX, vbY, vbW, vbH] = vbMatch[1].split(/\s+/).map(Number)
const cx = 16, cy = 16

// Point-in-polygon test (ray casting)
function pointInPolygon(px, py, poly) {
    let inside = false
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, yi] = poly[i]
        const [xj, yj] = poly[j]
        if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) {
            inside = !inside
        }
    }
    return inside
}

async function generate(size) {
    const scale = size / Math.max(vbW, vbH)
    const offsetX = -vbX * scale
    const offsetY = -vbY * scale
    const cxC = cx * scale + offsetX
    const cyC = cy * scale + offsetY

    // Scale polygon to canvas coords
    const scaledPoly = points.map(([x, y]) => [x * scale + offsetX, y * scale + offsetY])

    // Generate raw RGBA pixels
    const data = Buffer.alloc(size * size * 4, 0)

    for (let py = 0; py < size; py++) {
        for (let px = 0; px < size; px++) {
            // Use sub-pixel sampling for anti-aliasing (4x MSAA)
            let coverage = 0
            let rSum = 0, gSum = 0, bSum = 0
            const samples = [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]
            for (const [sx, sy] of samples) {
                const spx = px + 0.5 + sx
                const spy = py + 0.5 + sy
                if (pointInPolygon(spx, spy, scaledPoly)) {
                    coverage++
                    const dx = spx - cxC
                    const dy = spy - cyC
                    let angle = Math.atan2(dy, dx)
                    if (angle < 0) angle += 2 * Math.PI
                    const [r, g, b] = conicColor(angle)
                    rSum += r; gSum += g; bSum += b
                }
            }

            if (coverage > 0) {
                const idx = (py * size + px) * 4
                data[idx] = Math.round(rSum / coverage)
                data[idx + 1] = Math.round(gSum / coverage)
                data[idx + 2] = Math.round(bSum / coverage)
                data[idx + 3] = Math.round(255 * coverage / 4)
            }
        }
    }

    const filename = `shelf-favicon-${size}.png`
    await sharp(data, { raw: { width: size, height: size, channels: 4 } })
        .png()
        .toFile(__dirname + '/' + filename)
    console.log(`Wrote ${filename}`)
}

;(async () => {
    for (const size of sizes) {
        await generate(size)
    }
})()
