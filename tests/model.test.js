'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

// Model.js is a plain script. Run it in an empty VM context so every helper
// can be tested, including the ones its CommonJS export block leaves out.
const source = fs.readFileSync(path.join(__dirname, '..', 'Model.js'), 'utf8')
const names = [
  'parseLocationFile', 'wttrLocationQuery', 'parseGeocodingResults', 'locationCommit',
  'roundedTemp', 'celsiusToFahrenheit', 'formatTemp', 'shouldUseImperial',
  'openMeteoForecastDays', 'openMeteoCurrentCondition', 'buildForecastDays',
  'windArrow', 'currentIcon', 'iconForCode', 'iconForOpenMeteoCode', 'dayIcon',
  'weatherResponseCompletesSave'
]
const M = vm.runInNewContext(`${source}\n;({ ${names.join(', ')} })`, {})

// Objects created inside the VM have another prototype, so compare plain copies.
const plain = (value) => JSON.parse(JSON.stringify(value))

test('parseLocationFile reads a name and coordinates', () => {
  assert.deepEqual(
    plain(M.parseLocationFile('{"name":" Paris ","latitude":"48.85","longitude":"2.35"}')),
    { name: 'Paris', latitude: 48.85, longitude: 2.35 }
  )
})

test('parseLocationFile treats blank or unreadable input as auto-detect', () => {
  const unset = { name: '', latitude: null, longitude: null }
  assert.deepEqual(plain(M.parseLocationFile('')), unset)
  assert.deepEqual(plain(M.parseLocationFile('not json')), unset)
  assert.deepEqual(plain(M.parseLocationFile('{"name":"Malibu"}')),
    { name: 'Malibu', latitude: null, longitude: null })
})

test('wttrLocationQuery prefers coordinates, then an encoded name', () => {
  assert.equal(M.wttrLocationQuery('Paris', 48.85, 2.35), '48.85,2.35')
  assert.equal(M.wttrLocationQuery('Sao Paulo', null, null), 'Sao%20Paulo')
  assert.equal(M.wttrLocationQuery('', null, null), '')
})

test('parseGeocodingResults keeps complete rows only', () => {
  const raw = JSON.stringify({ results: [
    { name: 'Paris', admin1: 'Ile-de-France', country: 'France', latitude: 48.85, longitude: 2.35 },
    { name: 'Nowhere' }
  ] })
  assert.deepEqual(plain(M.parseGeocodingResults(raw)),
    [{ name: 'Paris', description: 'Ile-de-France, France', latitude: 48.85, longitude: 2.35 }])
  assert.deepEqual(plain(M.parseGeocodingResults('{}')), [])
})

test('locationCommit clears on blank input and uses the chosen suggestion', () => {
  assert.deepEqual(plain(M.locationCommit('   ', [], 0)), { name: '', latitude: null, longitude: null })
  const suggestion = { name: 'Paris', description: 'France', latitude: 48.85, longitude: 2.35 }
  assert.deepEqual(plain(M.locationCommit('par', [suggestion], 9)), suggestion)
  assert.deepEqual(plain(M.locationCommit('Malibu', [], 0)), { name: 'Malibu', latitude: null, longitude: null })
})

test('shouldUseImperial checks the explicit unit, then country, then locale', () => {
  assert.equal(M.shouldUseImperial('imperial', 'ja_JP', 'Japan'), true)
  assert.equal(M.shouldUseImperial('metric', 'en_US', 'United States'), false)
  assert.equal(M.shouldUseImperial('', 'en_US', 'Japan'), false)
  assert.equal(M.shouldUseImperial('', 'en_US', ''), true)
  assert.equal(M.shouldUseImperial('', 'ja_JP', ''), false)
})

test('temperature helpers round, convert and format', () => {
  assert.equal(M.roundedTemp('21.6'), '22')
  assert.equal(M.roundedTemp(null), '')
  assert.equal(M.roundedTemp('n/a'), '')
  assert.equal(M.celsiusToFahrenheit(100), 212)
  assert.equal(M.formatTemp('21', false), '21\u00b0C')
  assert.equal(M.formatTemp('70', true), '70\u00b0F')
  assert.equal(M.formatTemp('', false), '')
})

test('forecast keeps the three days after today', () => {
  const daily = {
    time: ['2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17'],
    temperature_2m_max: [20, 21, 22, 23, 24],
    temperature_2m_min: [10, 11, 12, 13, 14],
    weather_code: [0, 1, 2, 3, 61]
  }
  const days = plain(M.openMeteoForecastDays({ daily }, '2026-10-13'))
  assert.deepEqual(days.map((d) => d.date), ['2026-10-14', '2026-10-15', '2026-10-16'])
  assert.equal(days[0].maxtempC, '21')
  assert.equal(days[0].mintempF, '52')
})

test('buildForecastDays falls back to wttr.in days without Open-Meteo', () => {
  const report = { weather: [{ date: '2026-10-13' }, { date: '2026-10-14', maxtempC: '20' }] }
  const days = plain(M.buildForecastDays(report, null, '2026-10-13'))
  assert.deepEqual(days.map((d) => d.date), ['2026-10-14'])
})

test('current conditions use Open-Meteo values and the day/night flag', () => {
  const current = plain(M.openMeteoCurrentCondition({ current: {
    temperature_2m: 12.4, apparent_temperature: 10.2, relative_humidity_2m: 70,
    wind_speed_10m: 10, wind_direction_10m: 90, weather_code: 0, is_day: 0
  } }))
  assert.equal(current.temp_C, '12')
  assert.equal(current.FeelsLikeC, '10')
  assert.equal(current.humidity, '70')
  assert.equal(M.currentIcon(current), M.iconForCode(113, true))
  assert.equal(M.iconForOpenMeteoCode(0, false), M.iconForCode(113, false))
  assert.notEqual(M.iconForCode(113, true), M.iconForCode(113, false))
  assert.equal(M.openMeteoCurrentCondition({}), null)
})

test('an unknown weather code falls back to the cloudy icon', () => {
  assert.equal(M.iconForOpenMeteoCode(999, false), M.iconForCode(119, false))
})

test('windArrow points where the wind is going, not where it comes from', () => {
  assert.equal(M.windArrow(0), '\u2193')    // from north
  assert.equal(M.windArrow(90), '\u2190')   // from east
  assert.equal(M.windArrow(180), '\u2191')  // from south
  assert.equal(M.windArrow(270), '\u2192')  // from west
  assert.equal(M.windArrow(45), '\u2199')   // from north-east
  assert.equal(M.windArrow(''), '')
})

test('a saved location is completed by the Open-Meteo response', () => {
  assert.equal(M.weatherResponseCompletesSave(true, 'open-meteo'), true)
  assert.equal(M.weatherResponseCompletesSave(true, 'wttr'), false)
  assert.equal(M.weatherResponseCompletesSave(false, 'wttr'), true)
})
