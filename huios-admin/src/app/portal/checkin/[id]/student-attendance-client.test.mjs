import assert from 'node:assert/strict'
import test from 'node:test'
import { submitStudentAttendance } from './student-attendance-client.ts'

test('submits check-in through the student-scoped endpoint without a client supplied studentId', async () => {
  let requestUrl = ''
  let requestInit
  const fetcher = async (input, init) => {
    requestUrl = String(input)
    requestInit = init
    return new Response(JSON.stringify({ attendance: { id: 'attendance-1' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const result = await submitStudentAttendance(
    'lesson-1',
    'checkin',
    { latitude: -23.5, longitude: -46.6 },
    fetcher,
  )

  assert.equal(requestUrl, '/api/portal/aulas/lesson-1/checkin')
  assert.equal(requestInit?.method, 'POST')
  assert.deepEqual(JSON.parse(String(requestInit?.body)), {
    latitude: -23.5,
    longitude: -46.6,
    action: 'checkin',
  })
  assert.deepEqual(result, { attendance: { id: 'attendance-1' } })
})

test('uses the same student-scoped endpoint with the checkout action', async () => {
  let requestBody = ''
  const fetcher = async (_input, init) => {
    requestBody = String(init?.body)
    return new Response(JSON.stringify({ attendance: { id: 'attendance-1' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  await submitStudentAttendance(
    'lesson-1',
    'checkout',
    { latitude: -23.5, longitude: -46.6 },
    fetcher,
  )

  assert.deepEqual(JSON.parse(requestBody), {
    latitude: -23.5,
    longitude: -46.6,
    action: 'checkout',
  })
})
