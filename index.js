import { Buffer } from 'buffer'
import { pbkdf2Sync } from 'pbkdf2'
import { createDecipher } from 'chacha-js'

const button = document.getElementById('button')
button.innerHTML = "Start"
button.onclick = startVideo

const container = document.getElementById('container')
const canvas = document.getElementById('canvas')
const context = canvas.getContext('2d')

const qrdataEl = document.getElementById('qrdata')
const saltEl = document.getElementById('salt')
const nonceEl = document.getElementById('nonce')
const encryptedEl = document.getElementById('encrypted')
const tagEl = document.getElementById('tag')
const oneEl = document.getElementById('one')
const twoEl = document.getElementById('two')
const threeEl = document.getElementById('three')
const fourEl = document.getElementById('four')
const keyEl = document.getElementById('key')
const decryptedEl = document.getElementById('decrypted')

let video = null
let qrworker = null

function startVideo() {
    button.innerHTML = "Stop"
    button.onclick = stopVideo
    video = document.createElement('video')
    qrworker = new Worker(new URL('./qrworker.js', import.meta.url),
                          {type: 'module'})
    qrworker.onmessage = (message) => {
        stopVideo()
        startDecrypt(message.data)
    }
    navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {facingMode: 'environment'}
    }).then(stream => {
        video.srcObject = stream
        video.setAttribute('playsinline', 'true')
        video.play()
        requestAnimationFrame(tick)
    })
}

function stopVideo() {
    qrworker.terminate()
    video.pause()
    video.srcObject.getVideoTracks().forEach(track => track.stop())
    video.srcObject = null
    button.innerHTML = "Start"
    button.onclick = startVideo
}

let oldTime = 0

function tick(time) {
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = Math.min(container.clientWidth, video.videoWidth)
        canvas.height = Math.min(container.clientWidth, video.videoHeight)
        const sx = (canvas.width - 360) / 2
        const sy = (canvas.height - 360) / 2

        context.drawImage(video, 0, 0)
        context.fillStyle = 'black'
        context.globalAlpha = 0.6
        context.fillRect(0, 0, canvas.width, canvas.height)
        context.drawImage(video, sx, sy, 360, 360, sx, sy, 360, 360)

        if (time - oldTime > 600) {
            oldTime = time
            let imageData = context.getImageData(sx, sy, 360, 360)
            qrworker.postMessage({
                data: imageData.data,
                width: imageData.width,
                height: imageData.height
            })
        }
    }
    requestAnimationFrame(tick)
}

let cancel = false

let salt = null
let nonce = null
let encrypted = null
let tag = null
let key = null

let one = 0
let two = 0
let three = 0
var four = 0

function startDecrypt(qrdata) {
    button.innerHTML = "Stop"
    button.onclick = stopDecrypt

    cancel = false

    qrdataEl.innerHTML = qrdata
    const raw = new Buffer.from(qrdata, 'hex')
    if (raw.length !== 109) {
        const message = "&lt;QR data has wrong length!&gt;"
        saltEl.innerHTML = message
        nonceEl.innerHTML = message
        encryptedEl.innerHTML = message
        tagEl.innerHTML = message
        stopDecrypt()
        return
    }
    const protocol = raw[0]
    if (protocol !== 1) {
        const message = "&lt;Invalid protocol in QR data!&gt;"
        saltEl.innerHTML = message
        nonceEl.innerHTML = message
        encryptedEl.innerHTML = message
        tagEl.innerHTML = message
        stopDecrypt()
        return
    }
    salt = raw.subarray(1, 17)
    saltEl.innerHTML = salt.toString('hex')
    nonce = raw.subarray(17, 29)
    nonceEl.innerHTML = nonce.toString('hex')
    encrypted = raw.subarray(29, 93)
    encryptedEl.innerHTML = encrypted.toString('hex')
    tag = raw.subarray(93, 109)
    tagEl.innerHTML = tag.toString('hex')

    one = 0
    oneEl.innerHTML = one.toString()
    two = 0
    twoEl.innerHTML = two.toString()
    three = 0
    threeEl.innerHTML = three.toString()
    four = 0
    fourEl.innerHTML = four.toString()
    keyEl.innerHTML = "&lt;No data from derivation&gt;"
    decryptedEl.innerHTML = "&lt;No data from decryption&gt;"

    requestAnimationFrame(derive)
}

function derive(time) {
    if (cancel) {
        return
    }

    const pin = new Buffer.from([one, two, three, four])
    key = pbkdf2Sync(pin, salt, 12983, 32, 'sha512')
    keyEl.innerHTML = one.toString() + two.toString() + three.toString() +
                      four.toString() + ' => ' + key.toString('hex')

    requestAnimationFrame(decrypt)
}

function decrypt(time) {
    if (cancel) {
        return
    }

    const decipher = createDecipher(key, nonce)
    decipher.setAuthTag(tag)
    try {
        let decryptedRaw = decipher.update(encrypted)
        decryptedRaw += decipher.final()
        const decrypted = new Buffer.from(decryptedRaw)
        decryptedEl.innerHTML = decrypted.toString('hex')
        stopDecrypt()
        return
    } catch(e) {
    }

    decryptedEl.innerHTML = "&lt;No data from decryption&gt;"
    requestAnimationFrame(increment)
}

function increment(time) {
    if (cancel) {
        return
    }

    four += 1
    if (four > 9) {
        four = 0
        three += 1
    }
    if (three > 9) {
        three = 0
        two += 1
    }
    if (two > 9) {
        two = 0
        one += 1
    }
    if (one > 9) {
        one = 9
        two = 9
        three = 9
        four = 9
        stopDecrypt()
        return
    }

    oneEl.innerHTML = one.toString()
    twoEl.innerHTML = two.toString()
    threeEl.innerHTML = three.toString()
    fourEl.innerHTML = four.toString()

    requestAnimationFrame(derive)
}

function stopDecrypt() {
    cancel = true
    button.innerHTML = "Start"
    button.onclick = startVideo
}
