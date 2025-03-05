import { mock } from 'bun:test'

const mockLogger = {
    debug: mock(),
    info: mock(),
    warn: mock(),
    error: mock(),
    fatal: mock(),
    trace: mock(),
    silent: mock(),
    level: 'silent',
    child: mock(),
}

export default mockLogger
