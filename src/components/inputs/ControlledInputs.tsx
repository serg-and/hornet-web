import { Dot, Input, Select, Text } from '@geist-ui/core'
import { ReactElement, ReactNode } from 'react'
import {
    Controller,
    ControllerFieldState,
    ControllerProps,
    ControllerRenderProps,
    FieldPath,
    FieldValues,
} from 'react-hook-form'

export function ControlledInput<
    TFieldValues extends FieldValues = FieldValues,
    TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>(props: {
    controller: Omit<ControllerProps<TFieldValues, TName>, 'render'>
    input: Omit<Parameters<typeof Input>[0], 'crossOrigin'>
}) {
    return (
        <Controller
            {...props.controller}
            render={({ field, fieldState }) => (
                <Input
                    {...field}
                    {...props.input}
                    type={fieldState.error ? 'error' : props.input.type}
                    crossOrigin='true'
                >
                    <FieldError fieldState={fieldState} />
                </Input>
            )}
        />
    )
}

export function ControlledSelect<
    TFieldValues extends FieldValues = FieldValues,
    TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>(props: {
    controller: Omit<ControllerProps<TFieldValues, TName>, 'render'>
    select?: Parameters<typeof Select>[0]
    children: ReactNode
}) {
    return (
        <Controller
            {...props.controller}
            render={({ field, fieldState }) => (
                <>
                    <FieldError fieldState={fieldState} />
                    <Select
                        {...field}
                        {...props.select}
                        type={fieldState.error ? 'error' : props.select?.type}
                    >
                        {props.children}
                    </Select>
                </>
            )}
        />
    )
}

export function ControlledValue<
    TFieldValues extends FieldValues = FieldValues,
    TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>(props: {
    controller: Omit<ControllerProps<TFieldValues, TName>, 'render'>
    children: ControllerProps<TFieldValues, TName>['render']
}) {
    return (
        <Controller
            {...props.controller}
            render={p => (
                <>
                    <FieldError fieldState={p.fieldState} />
                    {props.children(p)}
                </>
            )}
        />
    )
}

function FieldError({ fieldState }: { fieldState: ControllerFieldState }) {
    return (
        fieldState.error && (
            <Dot type='error'>
                <Text type='error' small>
                    {fieldState.error.message}
                </Text>
            </Dot>
        )
    )
}
