import { buildCsv, csvEscape } from '../fileExports.js'

describe('fileExports helpers', () => {
  it('escapes mixed csv values safely', () => {
    expect(csvEscape(null)).toBe('')
    expect(csvEscape(12.5)).toBe('12.5')
    expect(csvEscape('plain')).toBe('plain')
    expect(csvEscape('needs,escaping')).toBe('"needs,escaping"')
    expect(csvEscape('quote " inside')).toBe('"quote "" inside"')
  })

  it('builds csv rows with normalized value types', () => {
    const csv = buildCsv(
      ['Name', 'Hours', 'Notes'],
      [
        ['Aria', 2, null],
        ['Ben', 1.5, 'Needs "review", soon'],
      ],
    )

    expect(csv).toBe([
      'Name,Hours,Notes',
      'Aria,2,',
      'Ben,1.5,"Needs ""review"", soon"',
    ].join('\r\n'))
  })
})
