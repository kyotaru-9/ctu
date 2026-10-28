import { useMemo, useState } from 'react'
import { DAY_NAMES_LIST } from '../../lib/format'
import { areaAssignmentService } from '../../services/areaAssignmentService'
import { Badge, Select } from '../../components/ui'
import BatchImportModal from '../batch/BatchImportModal'

/**
 * Sheet headers are matched loosely on purpose.
 */
const COLUMN_ALIASES = {
  section: ['section', 'section name', 'section_name'],
  area: ['area', 'area name', 'area_name'],
  day: ['day', 'days', 'day of week', 'day_of_week', 'weekday'],
}

const REQUIRED_COLUMNS = ['section', 'area', 'day']

/** Headers plus one example row, so the expected shape is visible. */
const TEMPLATE_SHEET = [
  ['section', 'area', 'day'],
  ['BSIT 3A', 'First Floor', 3],
]

/**
 * Batch area assignment import. Each row assigns a section to an area on a specific day.
 */
export default function AreaAssignmentsBatchUploadModal({ open, onClose, onImported, sections, areas }) {
  const sectionMap = useMemo(() => {
    const map = new Map()
    sections.forEach(section => {
      const label = `${section.program} ${section.year_level}${section.section_name}`
      map.set(label.toLowerCase(), section.id)
    })
    return map
  }, [sections])

  const areaMap = useMemo(() => {
    const map = new Map()
    areas.forEach(area => {
      map.set(area.name.toLowerCase(), area.id)
    })
    return map
  }, [areas])

  /**
   * Normalises one parsed row and names the problem that would stop it importing.
   */
  function reviewRow(row, allRows) {
    const missing = REQUIRED_COLUMNS.filter((column) => !row[column])
    if (missing.length) return { ...row, issue: `Missing ${missing.join(', ')}` }

    const sectionName = typeof row.section === 'string' ? row.section.trim() : row.section
    const areaName = typeof row.area === 'string' ? row.area.trim() : row.area

    const unknownSections = [
      ...new Set(allRows.map((entry) => entry.section).filter((name) => name && !sectionMap.has(name.toLowerCase()))),
    ]
    if (unknownSections.length) {
      return {
        ...row,
        issue: unknownSections.length === 1
          ? `Unknown section ${unknownSections[0]}`
          : `Unknown sections ${unknownSections.join(', ')}`,
      }
    }

    const unknownAreas = [
      ...new Set(allRows.map((entry) => entry.area).filter((name) => name && !areaMap.has(name.toLowerCase()))),
    ]
    if (unknownAreas.length) {
      return {
        ...row,
        issue: unknownAreas.length === 1
          ? `Unknown area ${unknownAreas[0]}`
          : `Unknown areas ${unknownAreas.join(', ')}`,
      }
    }

    const day = Number(row.day)
    const problem = !Number.isInteger(day) || day < 1 || day > 7
      ? `Day must be 1 to 7, got "${row.day}"`
      : null

    const sectionId = sectionMap.get(sectionName.toLowerCase())
    const areaId = areaMap.get(areaName.toLowerCase())

    return { ...row, issue: problem, day_number: day, section_id, area_id }
  }

  return (
    <BatchImportModal
      open={open}
      onClose={onClose}
      title="Batch upload area assignments"
      entityLabel="assignment"
      pluralLabel="assignments"
      intro={
        <>
          The first sheet needs a header row with <strong>section</strong>, <strong>area</strong> and{' '}
          <strong>day</strong>. Each row assigns a section to an area on a specific day.{' '}
          <strong>Section</strong> and <strong>area</strong> must match names that already exist — if any
          name is unknown, nothing is imported. <strong>Day</strong> runs from <strong>1 = Sunday</strong>{' '}
          to <strong>7 = Saturday</strong>.
        </>
      }
      aliases={COLUMN_ALIASES}
      requiredColumns={REQUIRED_COLUMNS}
      expectedHeaders={['section', 'area', 'day']}
      templateRows={TEMPLATE_SHEET}
      templateFileName="ctu-area-assignments-template.xlsx"
      columns={[
        {
          field: 'section',
          label: 'Section',
          className: 'tabular font-medium',
          render: (row) => row.section || '—',
        },
        {
          field: 'area',
          label: 'Area',
          render: (row) => row.area || '—',
        },
        {
          field: 'day',
          label: 'Day',
          render: (row) =>
            row.day_number >= 1 && row.day_number <= 7 ? (
              <Badge tone="info">
                {DAY_NAMES_LIST[row.day_number - 1]} ({row.day_number})
              </Badge>
            ) : (
              row.day || '—'
            ),
        },
      ]}
      reviewRow={reviewRow}
      uniqueBy="section_id|area_id|day"
      buildPayload={(row) => ({
        section: row.section_id,
        area: row.area_id,
        day: Number(row.day),
      })}
      submit={async (rows) => {
        const response = await areaAssignmentService.batchCreate(rows)
        if (response.success) onImported?.()
        return response
      }}
      errorMessage="Failed to import assignments"
    />
  )
}
