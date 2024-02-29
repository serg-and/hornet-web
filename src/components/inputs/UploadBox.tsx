import { Button, Text } from '@geist-ui/core'
import { X } from '@geist-ui/icons'
import React, { useState, useRef, CSSProperties } from 'react'
import styled from 'styled-components'

export default function UploadBox({
    file,
    setFile,
    accept,
    style,
}: {
    file: File | undefined
    setFile: React.Dispatch<React.SetStateAction<File | undefined>>
    accept: string
    style?: CSSProperties
}) {
    const uploadBoxRef = useRef(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    return (
        <Wrapper
            style={style}
            ref={uploadBoxRef}
            onClick={() => fileInputRef.current!.click()}
            onDrop={e => e.dataTransfer.files.length && setFile(e.dataTransfer.files[0])}
            // onDragOver={preventDefault}
            // onDragEnter={handleDragEnter}
            // onDragLeave={handleDragLeave}
        >
            {file ? (
                <Item>
                    <Text p>
                        {file.name} ({(file.size / 10 ** 6).toFixed(3)} MB)
                    </Text>
                    <Button
                        placeholder='remove'
                        icon={<X />}
                        px={0.6}
                        scale={0.3}
                        auto
                        onClick={e => {
                            e.preventDefault()
                            e.stopPropagation()
                            setFile(undefined)
                        }}
                    />
                </Item>
            ) : (
                <Text p>{`Upload a ${accept} file`}</Text>
            )}
            <Input
                ref={fileInputRef}
                type='file'
                accept={accept}
                onChange={e => e.target.files?.length && setFile(e.target.files[0])}
            />
        </Wrapper>
    )
}

const Wrapper = styled.div`
    display: flex;
    padding: 1rem;
`

const Item = styled.div`
    display: flex;
    gap: 1rem;
    align-items: center;
`

const Input = styled.input`
    display: none;
`
