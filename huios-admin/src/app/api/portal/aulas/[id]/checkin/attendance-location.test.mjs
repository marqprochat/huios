import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveAttendanceLocation } from './attendance-location.ts'

test('falls back to the institution location when the lesson has no coordinates', () => {
  assert.deepEqual(
    resolveAttendanceLocation(
      { latitude: null, longitude: null, radiusMeters: 75 },
      { latitude: -23.5, longitude: -46.6, radiusMeters: 180 },
    ),
    { latitude: -23.5, longitude: -46.6, radiusMeters: 180 },
  )
})

test('keeps lesson coordinates and radius when they are configured', () => {
  assert.deepEqual(
    resolveAttendanceLocation(
      { latitude: -22.1, longitude: -45.2, radiusMeters: 90 },
      { latitude: -23.5, longitude: -46.6, radiusMeters: 180 },
    ),
    { latitude: -22.1, longitude: -45.2, radiusMeters: 90 },
  )
})

test('accepts zero as a valid coordinate', () => {
  assert.deepEqual(
    resolveAttendanceLocation(
      { latitude: 0, longitude: 0, radiusMeters: 50 },
      { latitude: null, longitude: null, radiusMeters: 180 },
    ),
    { latitude: 0, longitude: 0, radiusMeters: 50 },
  )
})
