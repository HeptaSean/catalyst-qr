import { Buffer } from 'buffer'
import { pbkdf2 } from 'pbkdf2'
import { createDecipher } from 'chacha-js'

(async () => {
    self.addEventListener('message', message => {
        const {salt, nonce, encrypted, tag} = message.data
        const saltBuf = Buffer.from(salt, 'hex')
        const nonceBuf = Buffer.from(nonce, 'hex')
        const encryptedBuf = Buffer.from(encrypted, 'hex')
        const tagBuf = Buffer.from(tag, 'hex')

        let success = false
        for (let one = 0; one < 10; one++) {
            for (let two = 0; two < 10; two++) {
                for (let three = 0; three < 10; three++) {
                    for (let four = 0; four < 10; four++) {
                        const pinString = one.toString() + two.toString() +
                                          three.toString() + four.toString()
                        postMessage({
                            pin: pinString,
                            key: "Test",
                            decrypted: null,
                        })
                        const pin = new Buffer.from([one, two, three, four])
                        pbkdf2(pin, saltBuf, 12983, 32, 'sha512',
                               (err, key) => {
                            if (!err) {
                                const dec = createDecipher(key, nonceBuf)
                                dec.setAuthTag(tagBuf)
                                try {
                                    let decrypted = dec.update(encryptedBuf,
                                                               '', 'hex')
                                    decrypted += dec.final('hex')
                                    success = true
                                    postMessage({
                                        pin: pinString,
                                        key: key.toString('hex'),
                                        decrypted: decrypted,
                                    })
                                } catch(e) {
                                    if (!success) {
                                        postMessage({
                                            pin: pinString,
                                            key: key.toString('hex'),
                                            decrypted: null,
                                        })
                                    }
                                }
                            }
                        })
                    }
                }
            }
        }
    })
})()
