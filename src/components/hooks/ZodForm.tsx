import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { type z } from 'zod'

export function useZodForm<T extends z.Schema<any, any>>(schema: T) {
    return useForm<z.infer<T>>({ resolver: zodResolver(schema) })
}
