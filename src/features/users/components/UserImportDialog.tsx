import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  LoaderCircle,
  UploadCloud,
} from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/Toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

import { downloadUserImportTemplate } from '../import/downloadUserImportTemplate'
import {
  parseUserImportCsv,
  type UserImportParseResult,
} from '../import/parseUserImportCsv'
import {
  USER_IMPORT_COLUMNS,
  type UserImportResult,
  type UserImportValues,
} from '../import/userImportSchema'
import {
  AdminUsersApiError,
  type BulkUserImportResponse,
} from '../services/usersClient'
import type { OrganisationReference } from '../types'

type UserImportSubmission = {
  organisationId: string
  rows: UserImportValues[]
}

type UserImportDialogProps = {
  open: boolean
  organisations: OrganisationReference[]
  submitting?: boolean
  onOpenChange: (open: boolean) => void
  onImport: (submission: UserImportSubmission) => Promise<BulkUserImportResponse>
}

const MAX_FILE_SIZE = 5 * 1024 * 1024

function fieldValue(row: UserImportValues, key: keyof UserImportValues): string {
  const value = row[key]
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return value || '—'
}

export default function UserImportDialog({
  open,
  organisations,
  submitting = false,
  onOpenChange,
  onImport,
}: UserImportDialogProps) {
  const showToast = useToast()
  const fileInput = useRef<HTMLInputElement>(null)
  const [organisationId, setOrganisationId] = useState('')
  const [fileName, setFileName] = useState('')
  const [csvText, setCsvText] = useState('')
  const [preview, setPreview] = useState<UserImportParseResult | null>(null)
  const [reading, setReading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [serverFailures, setServerFailures] = useState<UserImportResult[]>([])

  useEffect(() => {
    if (!open) return
    setOrganisationId('')
    setFileName('')
    setCsvText('')
    setPreview(null)
    setReading(false)
    setDragging(false)
    setError(null)
    setServerFailures([])
    if (fileInput.current) fileInput.current.value = ''
  }, [open])

  useEffect(() => {
    if (!csvText) return
    setPreview(parseUserImportCsv(csvText, { organisationId }))
  }, [csvText, organisationId])

  async function readFile(file: File) {
    setError(null)
    setServerFailures([])

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Select a CSV file ending in .csv.')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('The CSV must be 5 MB or smaller.')
      return
    }

    setReading(true)
    try {
      const text = await file.text()
      setFileName(file.name)
      setCsvText(text)
      setPreview(parseUserImportCsv(text, { organisationId }))
    } catch {
      setError('The CSV could not be read. Save it as UTF-8 and try again.')
    } finally {
      setReading(false)
    }
  }

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) void readFile(file)
  }

  function dropFile(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) void readFile(file)
  }

  async function submitImport() {
    if (!preview?.canImport) return
    setError(null)
    setServerFailures([])

    try {
      const result = await onImport({
        organisationId,
        rows: preview.rows.map((row) => row.values),
      })
      const imported = result.created + result.updated
      showToast(
        `Import complete: ${imported} ${imported === 1 ? 'user' : 'users'} imported${
          result.skipped > 0 ? `, ${result.skipped} skipped` : ''
        }.`,
      )
      onOpenChange(false)
    } catch (requestError) {
      const message = requestError instanceof Error
        ? requestError.message
        : 'The users could not be imported. Please try again.'
      const failures = requestError instanceof AdminUsersApiError
        ? requestError.results.filter((result) => result.status === 'failed')
        : []

      setError(message)
      setServerFailures(failures)
      showToast(
        failures.length > 0
          ? `Import blocked: ${failures.length} ${failures.length === 1 ? 'row needs' : 'rows need'} attention.`
          : message,
        'error',
      )
    }
  }

  const importDisabled =
    submitting || reading || !preview?.canImport || !organisationId
  const failedRowNumbers = new Set(
    serverFailures.map((failure) => failure.rowNumber),
  )
  const displayedInvalidCount = (preview?.invalidRowCount || 0) +
    failedRowNumbers.size
  const displayedValidCount = Math.max(
    0,
    (preview?.validRowCount || 0) - failedRowNumbers.size,
  )

  return (
    <Dialog open={open} onOpenChange={submitting ? undefined : onOpenChange}>
      <DialogContent className="max-h-[94vh] w-[96vw] overflow-y-auto rounded-[18px] bg-white p-0 text-[#0D1F3C] shadow-[0_24px_64px_rgba(13,31,60,0.20)] ring-0 sm:max-w-[1600px]">
        <DialogHeader className="border-b border-[#E8EDF3] px-7 py-6 pr-16">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#E4F8F6] text-[#0C8C81]">
              <FileSpreadsheet />
            </div>
            <div>
              <DialogTitle className="font-['Plus_Jakarta_Sans'] text-xl font-extrabold tracking-[-0.3px] text-[#0D1F3C]">
                Import users from CSV
              </DialogTitle>
              <DialogDescription className="mt-1 text-[13px] text-[#8A9BB0]">
                Validate employee data before creating accounts and invitations.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 px-7 py-6">
          <div className="grid gap-4 rounded-2xl border border-[#DFE6EE] bg-[#F8FAFC] p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div>
              <Label htmlFor="import-organisation" className="mb-2 text-[#526A88]">
                Organisation
                <span className="font-extrabold text-[#D94A3A]" aria-hidden="true">*</span>
                <span className="sr-only"> (required)</span>
              </Label>
              <select
                id="import-organisation"
                value={organisationId}
                onChange={(event) => {
                  setOrganisationId(event.target.value)
                  setError(null)
                  setServerFailures([])
                }}
                required
                aria-invalid={Boolean(csvText && !organisationId)}
                className="h-10 w-full rounded-[10px] border border-[#DCE4EE] bg-white px-3 text-[14px] text-[#0D1F3C] outline-none transition focus:border-[#1BBFB0] focus:ring-3 focus:ring-[#1BBFB0]/20 aria-invalid:border-[#D94A3A] aria-invalid:ring-3 aria-invalid:ring-[#D94A3A]/15"
              >
                <option value="">Select organisation</option>
                {organisations.map((organisation) => (
                  <option key={organisation.id} value={organisation.id}>
                    {organisation.name}
                  </option>
                ))}
              </select>
              {csvText && !organisationId && (
                <p className="mt-1 text-xs font-medium text-[#D94A3A]">
                  Select the organisation these users belong to.
                </p>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={downloadUserImportTemplate}
              className="h-10 border-[#B8D9D5] bg-white px-4 font-semibold text-[#087C72] hover:bg-[#EAF8F6] hover:text-[#087C72]"
            >
              <Download />
              Download CSV template
            </Button>
          </div>

          <div className="rounded-xl border border-[#DDE7EF] bg-[#F5F9FC] px-4 py-3 text-sm leading-6 text-[#526A88]">
            Download the template and align your existing spreadsheet to its headers.
            You can ask ChatGPT to map your current columns, but verify the resulting
            employee data before importing it here.
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <Label className="text-[#526A88]">
                User CSV
                <span className="font-extrabold text-[#D94A3A]" aria-hidden="true">*</span>
              </Label>
              {fileName && (
                <span className="truncate text-xs font-medium text-[#087C72]">
                  {fileName}
                </span>
              )}
            </div>
            <input
              ref={fileInput}
              type="file"
              accept=".csv,text/csv"
              onChange={selectFile}
              className="sr-only"
            />
            <div
              onDragEnter={(event) => {
                event.preventDefault()
                setDragging(true)
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setDragging(false)}
              onDrop={dropFile}
              className={`flex min-h-32 flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-6 text-center transition ${
                dragging
                  ? 'border-[#1BBFB0] bg-[#EAF9F7]'
                  : 'border-[#C9D6E3] bg-white'
              }`}
            >
              {reading ? (
                <LoaderCircle className="mb-3 size-7 animate-spin text-[#1BBFB0]" />
              ) : (
                <UploadCloud className="mb-3 size-7 text-[#3A8FC4]" />
              )}
              <div className="font-semibold text-[#314966]">
                Drop the CSV here or choose a file
              </div>
              <div className="mt-1 text-xs text-[#8A9BB0]">CSV only · maximum 5 MB</div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInput.current?.click()}
                disabled={reading}
                className="mt-3 border-[#D6E0EB] bg-white text-[#526A88]"
              >
                Choose CSV
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="border-[#F4B6AE] bg-[#FFF5F3]">
              <AlertCircle />
              <AlertDescription>
                <p className="font-semibold">{error}</p>
                {serverFailures.length > 0 && (
                  <ul className="mt-2 max-h-36 list-disc space-y-1 overflow-y-auto pl-5">
                    {serverFailures.map((failure) => (
                      <li key={`${failure.rowNumber}-${failure.email}`}>
                        <span className="font-semibold">Row {failure.rowNumber}</span>
                        {failure.email ? ` · ${failure.email}` : ''}
                        {failure.message ? ` — ${failure.message}` : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </AlertDescription>
            </Alert>
          )}

          {preview && (
            <div className="space-y-4">
              {(preview.fileErrors.length > 0 ||
                preview.missingHeaders.length > 0 ||
                preview.duplicateHeaders.length > 0) && (
                <Alert variant="destructive" className="border-[#F4B6AE] bg-[#FFF5F3]">
                  <AlertCircle />
                  <AlertDescription>
                    <ul className="list-disc space-y-1 pl-4">
                      {preview.fileErrors.map((message) => (
                        <li key={message}>{message}</li>
                      ))}
                      {preview.missingHeaders.length > 0 && (
                        <li>Missing required headers: {preview.missingHeaders.join(', ')}</li>
                      )}
                      {preview.duplicateHeaders.length > 0 && (
                        <li>Duplicate mapped headers: {preview.duplicateHeaders.join(', ')}</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {preview.unknownHeaders.length > 0 && (
                <Alert className="border-[#E6D7A8] bg-[#FFFCF2] text-[#765F20]">
                  <AlertCircle />
                  <AlertDescription className="text-[#765F20]">
                    Unrecognised columns will be ignored: {preview.unknownHeaders.join(', ')}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-full bg-[#E7F9F7] px-3 py-1 text-xs font-bold text-[#087C72]">
                  {displayedValidCount} valid
                </div>
                <div className={`rounded-full px-3 py-1 text-xs font-bold ${
                  displayedInvalidCount > 0
                    ? 'bg-[#FFF0EE] text-[#C33D2F]'
                    : 'bg-[#F0F3F6] text-[#6D7D90]'
                }`}>
                  {displayedInvalidCount} invalid
                </div>
                <div className="text-xs text-[#8A9BB0]">
                  Required fields are marked <span className="font-extrabold text-[#D94A3A]">*</span>
                </div>
              </div>

              <div className="max-h-[420px] overflow-y-auto overflow-x-hidden rounded-2xl border border-[#DFE6EE]">
                <table className="w-full table-fixed border-collapse text-left text-[10px] xl:text-[11px]">
                  <colgroup>
                    <col className="w-[3%]" />
                    <col className="w-[5%]" />
                    {USER_IMPORT_COLUMNS.map((column) => (
                      <col key={column.key} />
                    ))}
                  </colgroup>
                  <thead className="sticky top-0 z-10 bg-[#F7F9FC]">
                    <tr className="border-b border-[#DFE6EE]">
                      <th className="bg-[#F7F9FC] px-1.5 py-2.5 text-center font-bold text-[#526A88]">
                        Row
                      </th>
                      <th className="px-1.5 py-2.5 font-bold text-[#526A88]">Status</th>
                      {USER_IMPORT_COLUMNS.map((column) => (
                        <th
                          key={column.key}
                          title={column.description}
                          className="break-words px-1.5 py-2.5 align-middle font-bold leading-4 text-[#526A88]"
                        >
                          {column.label}
                          {column.required && (
                            <span className="ml-0.5 text-[#D94A3A]">*</span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row) => {
                      const serverFailure = serverFailures.find(
                        (failure) => failure.rowNumber === row.rowNumber,
                      )

                      return (
                        <tr
                          key={row.rowNumber}
                          className={`border-b border-[#EDF1F5] last:border-0 ${
                            serverFailure ? 'bg-[#FFF5F3]' : ''
                          }`}
                        >
                          <td className="bg-white px-1.5 py-2.5 text-center align-top font-bold text-[#526A88]">
                            {row.rowNumber}
                          </td>
                          <td className="px-1.5 py-2.5 align-top">
                            {serverFailure ? (
                              <span
                                title={serverFailure.message}
                                className="inline-flex items-center gap-0.5 font-bold text-[#C33D2F]"
                              >
                                <AlertCircle className="size-3 shrink-0" /> Failed
                              </span>
                            ) : row.valid ? (
                              <span className="inline-flex items-center gap-0.5 font-bold text-[#087C72]">
                                <CheckCircle2 className="size-3 shrink-0" /> Valid
                              </span>
                            ) : (
                              <span
                                title={[
                                  ...Object.values(row.errors),
                                  ...row.rowErrors,
                                ].join('\n')}
                                className="inline-flex items-center gap-0.5 font-bold text-[#C33D2F]"
                              >
                                <AlertCircle className="size-3 shrink-0" /> Invalid
                              </span>
                            )}
                          </td>
                          {USER_IMPORT_COLUMNS.map((column) => {
                            const message = row.errors[column.key]
                            return (
                              <td
                                key={column.key}
                                title={message}
                                className={`break-words px-1.5 py-2.5 align-top leading-4 ${
                                  message
                                    ? 'bg-[#FFF0EE] font-semibold text-[#B8372A]'
                                    : 'text-[#526A88]'
                                }`}
                              >
                                <span className="block break-words">
                                  {fieldValue(row.values, column.key)}
                                </span>
                                {message && (
                                  <span className="mt-1 block whitespace-normal text-[10px] leading-4">
                                    {message}
                                  </span>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="m-0 border-t border-[#E8EDF3] bg-[#F8FAFC] px-7 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="h-10 border-[#D6E0EB] bg-white px-5 text-[#526A88]"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void submitImport()}
            disabled={importDisabled}
            className="h-10 bg-[#1BBFB0] px-5 font-bold text-white hover:bg-[#16A99C]"
          >
            {submitting && <LoaderCircle className="animate-spin" />}
            Import {preview?.validRowCount || 0} users
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
