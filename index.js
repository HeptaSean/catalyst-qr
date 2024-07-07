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

const button = document.getElementById('button')
button.innerHTML = "Start"
button.onclick = startVideo

let qrworker = null
let video = null

function startVideo() {
    button.innerHTML = "Stop"
    button.onclick = stopVideo

    qrworker = new Worker(new URL('./qrworker.js', import.meta.url),
                          {type: 'module'})
    qrworker.onmessage = (message) => {
        stopVideo()
        startDecrypt(message.data)
    }

    video = document.createElement('video')
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
                height: imageData.height,
            })
        }
    }

    requestAnimationFrame(tick)
}

let pinworker = null

function startDecrypt(qrdata) {
    button.innerHTML = "Stop"
    button.onclick = stopDecrypt

    pinworker = new Worker(new URL('./pinworker.js', import.meta.url),
                           {type: 'module'})
    pinworker.onmessage = (message) => {
        const {pin, key, decrypted} = message.data

        if (decrypted) {
            stopDecrypt()
            decryptedEl.innerHTML = decrypted
        }

        oneEl.innerHTML = pin[0]
        twoEl.innerHTML = pin[1]
        threeEl.innerHTML = pin[2]
        fourEl.innerHTML = pin[3]
        keyEl.innerHTML = key
    }

    qrdataEl.innerHTML = qrdata
    if (qrdata.length !== 218) {
        const message = "&lt;QR data has wrong length!&gt;"
        saltEl.innerHTML = message
        nonceEl.innerHTML = message
        encryptedEl.innerHTML = message
        tagEl.innerHTML = message
        stopDecrypt()
        return
    }
    if (qrdata.substring(0, 2) !== '01') {
        const message = "&lt;Invalid protocol in QR data!&gt;"
        saltEl.innerHTML = message
        nonceEl.innerHTML = message
        encryptedEl.innerHTML = message
        tagEl.innerHTML = message
        stopDecrypt()
        return
    }
    const salt = qrdata.substring(2, 34)
    saltEl.innerHTML = salt
    const nonce = qrdata.substring(34, 58)
    nonceEl.innerHTML = nonce
    const encrypted = qrdata.substring(58, 186)
    encryptedEl.innerHTML = encrypted
    const tag = qrdata.substring(186, 218)
    tagEl.innerHTML = tag

    oneEl.innerHTML = "0"
    twoEl.innerHTML = "0"
    threeEl.innerHTML = "0"
    fourEl.innerHTML = "0"
    keyEl.innerHTML = "&lt;No data from derivation&gt;"
    decryptedEl.innerHTML = "&lt;No data from decryption&gt;"

    pinworker.postMessage({
        salt: salt,
        nonce: nonce,
        encrypted: encrypted,
        tag: tag,
    })
}

function stopDecrypt() {
    pinworker.terminate()

    button.innerHTML = "Start"
    button.onclick = startVideo
}
