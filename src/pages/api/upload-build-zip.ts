import formidable from 'formidable'
import { mkdir } from 'fs/promises'
import { IncomingMessage, ServerResponse } from 'http'
import { MAX_FILES, MAX_ZIP_SIZE, ZIP_FILENAME } from '~/constants'

export default async function UploadBuildZip(req: IncomingMessage, res: ServerResponse) {
    if (req.method !== 'POST') {
        res.statusCode = 405
        res.write('Method not allowed')
        res.end()
        return
    }

    const buildId = (req as unknown as { query: { [key: string]: string } }).query?.buildId
    if (!buildId) {
        res.statusCode = 404
        res.write('Bad request')
        res.end()
        return
    }

    const buildFolder = `/tmp/builds/${buildId}/`
    await mkdir(buildFolder, { recursive: true })

    const form = formidable({
        uploadDir: buildFolder,
        filename: () => ZIP_FILENAME,
        maxFiles: MAX_FILES,
        maxFieldsSize: MAX_ZIP_SIZE,
    })

    const [_fields, files] = await form.parse(req)
    const file = Object.values(files)[0]?.at(0)

    if (!file) {
        res.statusCode = 404
        res.write('Bad request')
        res.end()
        return
    }

    // res.setHeader('Content-Type', 'application/json')
    // res.write(JSON.stringify({}))
    res.statusCode = 200
    res.end()
}

export const config = {
    api: {
        bodyParser: false,
    },
}
