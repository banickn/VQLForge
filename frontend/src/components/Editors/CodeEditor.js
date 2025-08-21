import React, { useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { Card, CardContent, CardHeader, Box } from '@mui/material';
import IconButton from '@mui/material/IconButton';
import { lineNumbers, highlightActiveLineGutter } from '@codemirror/view';
import { indentOnInput } from '@codemirror/language';
import { bracketMatching, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
// There doesn't appear to be a standard, actively maintained CodeMirror 6 extension for a minimap
// A custom implementation or a third-party library might be required.
function CodeEditor({
    title,
    borderColor,
    value,
    readOnly = false,
    onChange,
    height = "100%",
    minHeight = "55vh",
    extensions = [],
    loading = false // Added loading prop to disable interaction
}) {
    const onCodeChange = useCallback((value) => {
        if (onChange) {
            onChange(value);
        }
    }, [onChange]);

    return (
        <Card sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 2, boxShadow: 3 }} elevation={2}>
            <CardHeader
                title={title}
                action={<IconButton aria-label="expand/collapse">{/* Icon goes here */}</IconButton>}
                sx={{ borderBottom: '5px solid', borderColor: borderColor, flexShrink: 0, py: 1.5, px: 2 }} titleTypographyProps={{ variant: 'h6' }} />
            <CardContent sx={{ flexGrow: 1, p: 0, '&:last-child': { pb: 0 }, overflow: 'hidden', height: '100%' }}>
                <Box sx={{ height: '100%', overflow: 'auto' }}>
                    <CodeMirror
                        value={value}
                        height={height}
                        minHeight={minHeight}
                        extensions={[
                            ...extensions,
                            lineNumbers(),
                            highlightActiveLineGutter(),
                            indentOnInput(),
                            bracketMatching(),
                            syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
                        ]}
                        readOnly={readOnly || loading} // Disable when loading
                        theme={oneDark}
                        onChange={onCodeChange}
                        style={{ height: '100%' }}
                    />
                </Box>
            </CardContent>
        </Card>
    );
}

export default CodeEditor;