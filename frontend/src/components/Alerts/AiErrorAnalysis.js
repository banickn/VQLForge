import React, { useState } from 'react';
import {
    Box,
    Typography,
    Button,
    IconButton,
    Paper,
    Stack,
    useTheme
} from '@mui/material';
import {
    ErrorOutline,
    ContentCopy,
    CheckCircleOutline,
} from '@mui/icons-material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PropTypes from 'prop-types';

function AiErrorAnalysis({ errorData, onApplySuggestion, onDismiss }) {
    const theme = useTheme();
    const [copied, setCopied] = useState(false);

    const { explanation, sql_suggestion } = errorData;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(sql_suggestion);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    const handleApply = () => {
        if (onApplySuggestion) {
            onApplySuggestion(sql_suggestion);
        }
    };

    const handleDismiss = () => {
        if (onDismiss) {
            onDismiss();
        }
    };

    return (
        <Paper
            elevation={4}
            sx={{
                backgroundColor: '#282c34',
                color: 'white',
                borderRadius: 2,
                overflow: 'hidden',
                border: '1px solid #444654' // Use neutral border for the container
            }}
        >
            {/* Header */}
            <Box sx={{
                p: 1.5,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                backgroundColor: '#343541',
                // Use header's bottom border to indicate severity
                borderBottom: `1px solid ${theme.palette.error.dark}`
            }}>
                <ErrorOutline sx={{ color: theme.palette.error.light }} />
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    SQL Translation Analysis
                </Typography>
            </Box>

            {/* Content */}
            <Box sx={{ p: 2 }}>
                <Box mb={2.5}>
                    <Typography variant="body2" sx={{ color: theme.palette.grey[400] }}>
                        {explanation}
                    </Typography>
                </Box>

                <Box mb={2.5}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        Suggested SQL Correction:
                    </Typography>
                    <Paper
                        variant="outlined"
                        sx={{
                            backgroundColor: '#1e1e1e',
                            p: 1.5,
                            borderRadius: 1,
                            position: 'relative',
                            borderColor: theme.palette.grey[700],
                            overflowX: 'auto',
                        }}
                    >
                        <Typography
                            component="pre"
                            variant="body2"
                            sx={{
                                fontFamily: 'monospace',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-all',
                                color: theme.palette.grey[300],
                                margin: 0,
                            }}
                        >
                            <code>{sql_suggestion}</code>
                        </Typography>
                        <IconButton
                            onClick={handleCopy}
                            size="small"
                            sx={{
                                position: 'absolute',
                                top: theme.spacing(1),
                                right: theme.spacing(1),
                                color: copied ? theme.palette.success.light : theme.palette.grey[400],
                                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
                            }}
                            aria-label="copy suggested sql"
                        >
                            {copied ? <CheckCircleOutline fontSize="inherit" /> : <ContentCopy fontSize="inherit" />}
                        </IconButton>
                    </Paper>
                </Box>

                <Stack direction="row" spacing={1}>
                    <Button variant="contained" color="primary" size="small" onClick={handleApply}>
                        Apply Suggestion
                    </Button>
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={handleDismiss}
                        sx={{
                            color: theme.palette.grey[300],
                            borderColor: theme.palette.grey[700],
                            '&:hover': { borderColor: theme.palette.grey[500] }
                        }}
                    >
                        Dismiss
                    </Button>
                </Stack>
            </Box>

            {/* Footer */}
            <Box
                sx={{
                    backgroundColor: '#343541',
                    borderTop: '1px solid #444654', // Neutral border for footer
                    padding: theme.spacing(1, 2),
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                }}
            >
                <AutoAwesomeIcon sx={{ fontSize: '1rem', color: theme.palette.primary.light }} />
                <Typography variant="caption" sx={{ color: theme.palette.grey[400] }}>
                    AI-powered analysis. Always review suggestions for accuracy and security.
                </Typography>
            </Box>
        </Paper>
    );
}

AiErrorAnalysis.propTypes = {
    errorData: PropTypes.shape({
        explanation: PropTypes.string.isRequired,
        sql_suggestion: PropTypes.string.isRequired,
    }).isRequired,
    onApplySuggestion: PropTypes.func.isRequired,
    onDismiss: PropTypes.func.isRequired,
};

export default AiErrorAnalysis;