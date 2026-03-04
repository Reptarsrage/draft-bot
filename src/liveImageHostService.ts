import config from './config'
import logger from './logger'

interface ConvertResponse {
    imageUrl: string
}

interface ConvertRequest {
    imageUrl: string
}

export async function hostLiveImage(imageUrl: string) {
    try {
        const imageHosterUrl = config.IMAGE_HOSTER_URL
        const response = await fetch(`${imageHosterUrl}/convert`, {
            method: 'POST',
            body: JSON.stringify({ imageUrl } satisfies ConvertRequest),
        })

        const data = (await response.json()) as ConvertResponse
        return data.imageUrl
    } catch (error) {
        logger.error(error, 'Failed to host live image')
        return imageUrl
    }
}
