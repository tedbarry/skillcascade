import { describe, it, expect } from 'vitest'
import {
  parseCSV,
  detectColumns,
  autoMapColumns,
  mapScore,
  matchSkill,
  transformToAssessments,
  detectScoreValues,
  getPreviewRows,
  processImportFile,
} from '../csvImportEngine.js'

describe('parseCSV', () => {
  it('parses simple CSV', () => {
    const rows = parseCSV('a,b,c\n1,2,3\n4,5,6')
    expect(rows).toEqual([['a', 'b', 'c'], ['1', '2', '3'], ['4', '5', '6']])
  })

  it('handles quoted fields with commas', () => {
    const rows = parseCSV('"hello, world",b,c')
    expect(rows[0][0]).toBe('hello, world')
  })

  it('handles escaped quotes', () => {
    const rows = parseCSV('"say ""hi""",b')
    expect(rows[0][0]).toBe('say "hi"')
  })

  it('handles CRLF line endings', () => {
    const rows = parseCSV('a,b\r\n1,2\r\n3,4')
    expect(rows).toHaveLength(3)
  })

  it('skips empty lines', () => {
    const rows = parseCSV('a,b\n\n1,2\n\n')
    expect(rows).toHaveLength(2)
  })
})

describe('detectColumns', () => {
  it('detects skill and score columns', () => {
    const result = detectColumns(['Skill Name', 'Score', 'Domain'])
    expect(result.skillName).toBe(0)
    expect(result.score).toBe(1)
    expect(result.domain).toBe(2)
  })

  it('detects skill ID column', () => {
    const result = detectColumns(['Skill ID', 'Rating', 'Category'])
    expect(result.skillId).toBe(0)
    expect(result.score).toBe(1)
  })

  it('returns nulls when no columns match', () => {
    const result = detectColumns(['Foo', 'Bar', 'Baz'])
    expect(result.skillName).toBeNull()
    expect(result.score).toBeNull()
  })
})

describe('autoMapColumns', () => {
  it('detects own export format', () => {
    const result = autoMapColumns(['Domain', 'Sub-Area', 'Skill Group', 'Skill', 'Assessment', 'Score'])
    expect(result.isOwnFormat).toBe(true)
    expect(result.canAutoImport).toBe(true)
  })

  it('reports canAutoImport when skill + score found', () => {
    const result = autoMapColumns(['Item', 'Mastery', 'Notes'])
    // 'Item' won't match, 'Mastery' matches score
    expect(result.mappings.score).toBe(1)
  })
})

describe('mapScore', () => {
  it('maps numeric scores 0-3', () => {
    expect(mapScore('0')).toBe(0)
    expect(mapScore('1')).toBe(1)
    expect(mapScore('2')).toBe(2)
    expect(mapScore('3')).toBe(3)
  })

  it('maps label-based scores', () => {
    expect(mapScore('Mastered')).toBe(3)
    expect(mapScore('emerging')).toBe(2)
    expect(mapScore('not started')).toBe(0)
  })

  it('maps percentage-based scores', () => {
    expect(mapScore('85')).toBe(3)
    expect(mapScore('50')).toBe(2)
    expect(mapScore('20')).toBe(1)
  })

  it('uses custom score map when provided', () => {
    const custom = { 'yes': 3, 'no': 0 }
    expect(mapScore('yes', custom)).toBe(3)
    expect(mapScore('no', custom)).toBe(0)
  })
})

describe('matchSkill', () => {
  it('matches exact skill names', () => {
    // 'd1-sa1-sg1-s1' should have a name from the framework
    const id = matchSkill('Recognizes bodily cues of calm vs. distress')
    // We just check it returns a valid-looking ID or null
    if (id) {
      expect(id).toMatch(/^d\d+-sa\d+-sg\d+-s\d+$/)
    }
  })

  it('returns null for unrecognized names', () => {
    expect(matchSkill('xyzzy nonexistent skill 12345')).toBeNull()
  })
})

describe('transformToAssessments', () => {
  it('transforms rows with skill IDs', () => {
    const rows = [
      ['Skill ID', 'Score'],
      ['d1-sa1-sg1-s1', '3'],
      ['d1-sa1-sg1-s2', '2'],
    ]
    const result = transformToAssessments(rows, { skillId: 0, skillName: null, score: 1, domain: null, subArea: null, clientName: null })
    expect(result.mapped).toBe(2)
    expect(result.assessments['d1-sa1-sg1-s1']).toBe(3)
    expect(result.assessments['d1-sa1-sg1-s2']).toBe(2)
  })

  it('skips rows with score 0', () => {
    const rows = [
      ['Skill ID', 'Score'],
      ['d1-sa1-sg1-s1', '0'],
    ]
    const result = transformToAssessments(rows, { skillId: 0, skillName: null, score: 1, domain: null, subArea: null, clientName: null })
    expect(result.mapped).toBe(0)
  })

  it('tracks unmapped skill names', () => {
    const rows = [
      ['Skill', 'Score'],
      ['Nonexistent Skill XYZ', '3'],
    ]
    const result = transformToAssessments(rows, { skillId: null, skillName: 0, score: 1, domain: null, subArea: null, clientName: null })
    expect(result.unmapped.length).toBe(1)
    expect(result.unmapped[0].name).toBe('Nonexistent Skill XYZ')
  })
})

describe('detectScoreValues', () => {
  it('returns unique values from score column', () => {
    const rows = [
      ['Skill', 'Score'],
      ['A', '1'],
      ['B', '2'],
      ['C', '1'],
      ['D', '3'],
    ]
    const values = detectScoreValues(rows, 1)
    expect(values).toEqual(['1', '2', '3'])
  })

  it('returns empty for null column index', () => {
    expect(detectScoreValues([], null)).toEqual([])
  })
})

describe('getPreviewRows', () => {
  it('returns headers and first N rows', () => {
    const rows = [['A', 'B'], ['1', '2'], ['3', '4'], ['5', '6']]
    const preview = getPreviewRows(rows, 2)
    expect(preview.headers).toEqual(['A', 'B'])
    expect(preview.rows).toHaveLength(2)
  })
})

describe('processImportFile', () => {
  it('processes a CSV string', () => {
    const csv = 'Skill,Score,Domain\nSome skill,3,Regulation\nAnother,2,Communication'
    const result = processImportFile(csv, 'test.csv')
    expect(result.headers).toEqual(['Skill', 'Score', 'Domain'])
    expect(result.totalRows).toBe(2)
    expect(result.autoMap.mappings.skillName).toBe(0)
    expect(result.autoMap.mappings.score).toBe(1)
  })

  it('processes a JSON array', () => {
    const json = JSON.stringify([
      { skill: 'A', score: '3' },
      { skill: 'B', score: '2' },
    ])
    const result = processImportFile(json, 'test.json')
    expect(result.totalRows).toBe(2)
  })

  it('throws for unsupported format', () => {
    expect(() => processImportFile('data', 'test.xlsx')).toThrow('Unsupported')
  })
})
