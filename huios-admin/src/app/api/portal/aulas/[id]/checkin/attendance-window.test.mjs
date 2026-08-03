import assert from 'node:assert/strict'
import test from 'node:test'
import { getAttendanceWindow } from './attendance-window.mjs'

const start = new Date('2026-08-03T15:00:00.000Z')
const end = new Date('2026-08-03T17:00:00.000Z')

test('check-in uses the buffer around lesson start', () => {
  assert.deepEqual(getAttendanceWindow('checkin', start, end, 30), {
    start: new Date('2026-08-03T14:30:00.000Z'),
    end: new Date('2026-08-03T15:30:00.000Z'),
  })
})

test('check-out accepts the buffer before and after lesson end', () => {
  assert.deepEqual(getAttendanceWindow('checkout', start, end, 30), {
    start: new Date('2026-08-03T16:30:00.000Z'),
    end: new Date('2026-08-03T17:30:00.000Z'),
  })
})

test('uses the configured buffer value for both actions', () => {
  assert.deepEqual(getAttendanceWindow('checkin', start, end, 10), {
    start: new Date('2026-08-03T14:50:00.000Z'),
    end: new Date('2026-08-03T15:10:00.000Z'),
  })
  assert.deepEqual(getAttendanceWindow('checkout', start, end, 10), {
    start: new Date('2026-08-03T16:50:00.000Z'),
    end: new Date('2026-08-03T17:10:00.000Z'),
  })
})
