import Koder from '@maslick/koder'

(async () => {
    const koder = await new Koder().initialized
    self.addEventListener('message', message => {
        const {data, width, height} = message.data
        if (!data) {
            return
        }
        const result = koder.decode(data, width, height)
        if (result) {
            postMessage(result)
        }
    })
})()
