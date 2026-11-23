import { USER_IMPORT_COLUMNS } from './userImportSchema'

const TEMPLATE_FILENAME = 'culturexe-user-import-template.csv'

function csvCell(value: string): string {
  return /[",\n\r]/.test(value)
    ? `"${value.replace(/"/g, '""')}"`
    : value
}

export function buildUserImportTemplateCsv(): string {
  const headers = USER_IMPORT_COLUMNS.map((column) => column.header)
  const example = USER_IMPORT_COLUMNS.map((column) => column.example)

  return [headers, example]
    .map((row) => row.map(csvCell).join(','))
    .join('\r\n')
}

export function downloadUserImportTemplate(): void {
  const csv = buildUserImportTemplateCsv()
  const blob = new Blob([`\uFEFF${csv}`], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = TEMPLATE_FILENAME
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
