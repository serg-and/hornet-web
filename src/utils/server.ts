import formidable from 'formidable'
import VolatileFile from 'formidable/VolatileFile'
import { IncomingMessage } from 'http'
import { Writable } from 'stream'

export type UploadedFile = {
    data: Buffer
    filename: string
    mimetype: string
    size: number
}
export type GetFormDataOpts = {
    maxFileSize?: number
    maxFiles?: number
    maxTotalFileSize?: number
    allowEmptyFiles?: boolean
    multiples?: boolean
}

const defaultOpts: GetFormDataOpts = {
    maxFileSize: 1024 * 1024 * 100, // 100MB
    maxFiles: 10,
    allowEmptyFiles: false,
    multiples: false,
}

/**
 * Parse form data and files from a raw http request `IncomingMessage`.
 * For next api requests this means adding the following config to the route:
 * ```
 * export const config = { api: { bodyParser: false } }
 * ```
 *
 * Defaults to max 10 files, 5MB each -> {@link defaultOpts}
 */
export async function getFormDataFiles(
    req: IncomingMessage,
    options?: GetFormDataOpts
): Promise<{ fields: formidable.Fields<string>; files: UploadedFile[] }> {
    const fileBlobs: Map<VolatileFile, Buffer[]> = new Map()

    const opts = { ...defaultOpts, ...options }
    if (
        opts.maxTotalFileSize === undefined &&
        opts.maxFileSize !== undefined &&
        opts.maxFiles !== undefined
    )
        opts.maxTotalFileSize = opts.maxFileSize * opts.maxFiles

    const [fields] = await formidable({
        ...opts,
        fileWriteStreamHandler: file =>
            new Writable({
                write: (chunk, _enc, next) => {
                    if (!file) return

                    const chunks = fileBlobs.get(file)
                    if (chunks) chunks.push(chunk)
                    else fileBlobs.set(file, [chunk])
                    next()
                },
            }),
    }).parse(req)

    const files: UploadedFile[] = []
    for (const [file, blobs] of fileBlobs.entries()) {
        files.push({
            data: Buffer.concat(blobs),
            // @ts-expect-error private field
            filename: file.originalFilename,
            // @ts-expect-error private field
            mimetype: file.mimetype,
            // @ts-expect-error private field
            size: file.size,
        })
    }

    return { fields, files }
}
