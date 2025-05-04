// src/AiValidationErrorAnalysis.js
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
    Box,
    Typography,
    Button,
    IconButton,
    Paper,
    Stack,
    useTheme,
    Alert,
    AlertTitle,
} from '@mui/material';
import {
    ContentCopy,
    CheckCircleOutline,
    WarningAmber, // Use a warning icon
} from '@mui/icons-material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

function AiValidationErrorAnalysis({ errorData, onDismiss }) {
    const theme = useTheme();
    const [copied, setCopied] = useState(false);

    // sql_suggestion field name is kept for consistency with backend model
    const { explanation, sql_suggestion: vql_suggestion } = errorData;

    const handleCopy = async () => {
        if (!vql_suggestion) return;
        try {
            await navigator.clipboard.writeText(vql_suggestion);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
            // Consider adding user feedback for copy failure
        }
    };

    const handleDismiss = () => {
        if (onDismiss) {
            onDismiss();
        }
    };

    // Determine colors based on warning severity
    const severity = 'warning';
    const mainColor = theme.palette[severity].main;
    const darkColor = theme.palette[severity].dark;
    const lighterColor = theme.palette[severity].lighter || theme.palette.grey[50]; // Fallback lighter color
    const lightColor = theme.palette[severity].light;


    return (
        <Alert
            icon={false} // Remove default icon
            severity={severity} // Use warning severity for styling
            sx={{
                borderLeft: `4px solid ${mainColor}`,
                backgroundColor: theme.palette.background.paper, // Keep paper background
                color: theme.palette.text.primary, // Use standard text color for main content
                boxShadow: theme.shadows[2],
                display: 'flex',
                flexDirection: 'column',
                padding: 0,
                '.MuiAlert-message': {
                    width: '100%',
                    padding: 0
                }
            }}
        >
            <Box sx={{ padding: theme.spacing(2) }}>
                {/* Custom Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <WarningAmber fontSize="small" sx={{ color: mainColor }} />
                    <Typography
                        variant="h6"
                        component="div"
                        sx={{
                            fontWeight: 600,
                            color: darkColor, // Use dark warning color for title
                            fontSize: '1rem',
                            lineHeight: 1.2
                        }}
                    >
                        VQL Validation Analysis
                    </Typography>
                </Box>

                {/* Suggested VQL */}
                {vql_suggestion && (
                    <Box mb={2}>
                        <Typography variant="body2" fontWeight="medium" color="text.primary" mb={0.5}>
                            Suggested VQL Correction:
                        </Typography>
                        <Paper
                            variant="outlined"
                            sx={{
                                backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.grey[100],
                                p: 1.5,
                                borderRadius: 1,
                                position: 'relative',
                                borderColor: theme.palette.grey[300],
                                overflowX: 'auto',
                            }}
                        >
                            <Typography
                                component="pre"
                                variant="caption"
                                sx={{
                                    fontFamily: 'monospace',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-all',
                                    color: theme.palette.text.primary,
                                    margin: 0,
                                }}
                            >
                                <code>{vql_suggestion}</code>
                            </Typography>
                            <IconButton
                                onClick={handleCopy}
                                size="small"
                                sx={{
                                    position: 'absolute',
                                    top: theme.spacing(0.5), // Adjust position slightly
                                    right: theme.spacing(0.5),
                                    color: copied ? theme.palette.success.main : theme.palette.action.active,
                                    '&:hover': {
                                        backgroundColor: theme.palette.action.hover,
                                    }
                                }}
                                aria-label="copy suggested vql"
                            >
                                {copied ? <CheckCircleOutline fontSize="inherit" /> : <ContentCopy fontSize="inherit" />}
                            </IconButton>
                        </Paper>
                    </Box>
                )}
                {/* Explanation (Placed before suggestion for validation) */}
                <Box mb={2}>
                    <Typography variant="body2" color="text.primary">
                        {explanation}
                    </Typography>
                </Box>

                {/* Actions */}
                <Stack direction="row" spacing={1} mt={1}>
                    {/* Only Dismiss button */}
                    <Button
                        variant="outlined"
                        color="inherit" // Use inherit for neutral look
                        size="small"
                        onClick={handleDismiss}
                        sx={{
                            textTransform: 'none',
                            color: theme.palette.text.secondary,
                            borderColor: theme.palette.grey[400],
                            '&:hover': {
                                backgroundColor: theme.palette.action.hover,
                                borderColor: theme.palette.grey[500],
                            }
                        }}
                    >
                        Dismiss
                    </Button>
                    {/* Optional: Add Copy button here as well if preferred */}

                    {vql_suggestion && (
                        <Button
                            variant="contained" // Or outlined
                            color="primary" // Or secondary
                            size="small"
                            onClick={handleCopy}
                            startIcon={copied ? <CheckCircleOutline fontSize="inherit" /> : <ContentCopy fontSize="inherit" />}
                            sx={{ textTransform: 'none' }}
                        >
                            {copied ? 'Copied' : 'Copy Suggestion'}
                        </Button>
                    )}

                </Stack>
            </Box>

            {/* Footer with AI disclaimer */}
            <Box
                sx={{
                    width: '100%',
                    backgroundColor: lighterColor, // Use lighter warning color
                    borderTop: `1px solid ${lightColor}`, // Use light warning color
                    padding: theme.spacing(1, 2),
                    mt: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5
                }}
            >
                <AutoAwesomeIcon sx={{ fontSize: '0.75rem', color: lightColor }} />
                <Typography variant="caption" component="div" sx={{ color: lightColor, fontSize: '0.75rem' }}>
                    VQLForge employs AI for advanced analysis and suggestions, but careful user validation of security, performance, and correctness is essential.
                </Typography>
            </Box>
        </Alert>
    );
}

AiValidationErrorAnalysis.propTypes = {
    errorData: PropTypes.shape({
        explanation: PropTypes.string.isRequired,
        sql_suggestion: PropTypes.string, // Suggestion might not always be possible
    }).isRequired,
    onDismiss: PropTypes.func.isRequired,
};

export default AiValidationErrorAnalysis;