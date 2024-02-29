import { Button, Loading, Note, Popover, Table, type TableColumnProps, Text } from '@geist-ui/core'
import { ErrorNote } from './labels'
import { type TRPCClientErrorBase } from '@trpc/client'
import { type DefaultErrorShape } from '@trpc/server'
import styled from 'styled-components'
import { Edit2, MoreVertical } from '@geist-ui/icons'
import { type ReactElement, type ReactNode } from 'react'
import RemoveModal from './modals/RemoveModal'

export default function EntityList<
    TData extends {}[]
    // Q extends UseTRPCQueryResult<{}[], TRPCClientErrorLike<AnyProcedure>>
>({
    name,
    useQuery,
    children,
    onEdit,
    onRemove,
    buttons,
}: {
    name: string
    useQuery: {
        data: TData | undefined
        refetch: (...args: any[]) => unknown
        isLoading: boolean
        error: TRPCClientErrorBase<DefaultErrorShape> | null
    }
    children:
        | ReactElement<TableColumnProps<TData[0]>>
        | Array<ReactElement<TableColumnProps<TData[0]>>>
    onEdit?: (row: TData[0], index: number) => unknown
    onRemove?: (row: TData[0], index: number) => unknown
    buttons?: {
        icon: ReactNode
        loading?: boolean
        onClick: (row: TData[0], index: number) => void
    }[]
}) {
    if (useQuery.isLoading) return <Loading />
    if (useQuery.error) return <ErrorNote message={useQuery.error.message} />

    return (
        <Wrapper>
            <Table data={useQuery.data}>
                {children}
                {(onEdit || onRemove || buttons) && (
                    <Table.Column
                        prop='operation'
                        render={(val, row, i) => (
                            <Operations>
                                {buttons?.map(({ icon, loading, onClick }, buttonIndex) => (
                                    <Button
                                        key={buttonIndex}
                                        icon={icon}
                                        placeholder='edit'
                                        auto
                                        scale={2 / 3}
                                        px={0.6}
                                        loading={loading}
                                        style={{ justifySelf: 'end' }}
                                        onClick={() => onClick(useQuery.data![i]!, i)}
                                    />
                                ))}
                                {onEdit && (
                                    <Button
                                        icon={<Edit2 />}
                                        placeholder='edit'
                                        auto
                                        scale={2 / 3}
                                        px={0.6}
                                        style={{ justifySelf: 'end' }}
                                        onClick={() => onEdit(useQuery.data![i]!, i)}
                                    />
                                )}
                                {onRemove && (
                                    <Popover
                                        content={
                                            (
                                                <MoreList>
                                                    <RemoveModal
                                                        body={`Are you sure you want to delete this ${name}?`}
                                                        onRemove={() =>
                                                            onRemove(useQuery.data![i]!, i)
                                                        }
                                                    >
                                                        <Text type='error' margin={0}>
                                                            Remove
                                                        </Text>
                                                    </RemoveModal>
                                                </MoreList>
                                            ) as any
                                        }
                                    >
                                        <Button
                                            icon={<MoreVertical />}
                                            placeholder='options'
                                            auto
                                            scale={2 / 3}
                                            px={0.6}
                                            style={{ justifySelf: 'end' }}
                                        />
                                    </Popover>
                                )}
                            </Operations>
                        )}
                    />
                )}
            </Table>
            {!useQuery.data?.length && <Note label={false}>No {name.toLowerCase()}s</Note>}
        </Wrapper>
    )
}

const Wrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
`

const Operations = styled.div`
    display: flex;
    justify-content: flex-end;
    width: 100%;
    gap: 0.5rem;
`

const MoreList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0 1rem;
`
