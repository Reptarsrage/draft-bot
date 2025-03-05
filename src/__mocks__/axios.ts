import { mock } from 'bun:test'

const mockLogger = {
    post: mock(),
    get: mock(),
}

export default mockLogger
