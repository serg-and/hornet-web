import { Note } from '@geist-ui/core'

export const ErrorNote = ({ message }: { message: string }) => (
    <Note type='error' label='error' style={{ whiteSpace: 'pre-line' }}>
        {message}
    </Note>
)
