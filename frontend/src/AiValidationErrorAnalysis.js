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
} from '@mui/material';
import {
    ContentCopy,
    CheckCircleOutline,
    WarningAmber,
} from '@mui/icons-material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

function AiValidationErrorAnalysis({ errorData, onDismiss, onUseVqlSuggestion }) {
    const theme = useTheme();
    const [copied, setCopied] = useState(false);

    const { explanation, sql_suggestion: vql_suggestion } = errorData;

    const handleUseVqlSuggestionClick = async () => {
        if (!vql_suggestion) return;

        try {
            await navigator.clipboard.writeText(vql_suggestion);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000); // Reset copied state for button feedback
        } catch (err) {
            console.error('Failed to copy VQL suggestion to clipboard: ', err);
        }

        if (onUseVqlSuggestion) {
            onUseVqlSuggestion(vql_suggestion);
        }
    };

    const handleDismiss = () => {
        if (onDismiss) {
            onDismiss();
        }
    };

    const severity = 'warning';
    const mainColor = theme.palette[severity].main;
    const darkColor = theme.palette[severity].dark;
    const lighterColor = theme.palette[severity].lighter || theme.palette.grey[50];
    const lightColor = theme.palette[severity].light;

    return (
        <Alert
            icon={false}
            severity={severity}
            sx={{
                borderLeft: `4px solid ${mainColor}`,
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.text.primary,
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <WarningAmber fontSize="small" sx={{ color: mainColor }} />
                    <Typography
                        variant="h6"
                        component="div"
                        sx={{
                            fontWeight: 600,
                            color: darkColor,
                            fontSize: '1rem',
                            lineHeight: 1.2
                        }}
                    >
                        VQL Validation Analysis
                    </Typography>
                </Box>

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
                            {/* This IconButton is for quick copy if user only wants to copy from code block, separate from "Use Suggestion" button */}
                            <IconButton
                                onClick={async () => { // Inline handler for simple copy from here
                                    try {
                                        await navigator.clipboard.writeText(vql_suggestion);
                                        setCopied(true); // This will make the "Use Suggestion" button show "Copied" if clicked after this
                                        setTimeout(() => setCopied(false), 2000);
                                    } catch (err) {
                                        console.error('Failed to copy text: ', err);
                                    }
                                }}
                                size="small"
                                sx={{
                                    position: 'absolute',
                                    top: theme.spacing(0.5),
                                    right: theme.spacing(0.5),
                                    color: copied ? theme.palette.success.main : theme.palette.action.active,
                                    '&:hover': {
                                        backgroundColor: theme.palette.action.hover,
                                    }
                                }}
                                aria-label="copy suggested vql from code block"
                            >
                                {copied ? <CheckCircleOutline fontSize="inherit" /> : <ContentCopy fontSize="inherit" />}
                            </IconButton>
                        </Paper>
                    </Box>
                )}
                <Box mb={2}>
                    <Typography variant="body2" color="text.primary">
                        {explanation}
                    </Typography>
                </Box>

                <Stack direction="row" spacing={1} mt={1}>
                    <Button
                        variant="outlined"
                        color="inherit"
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
                    {/* Button */}
                    {vql_suggestion && (
                        <Button
                            variant="contained"
                            color="primary"
                            size="small"
                            onClick={handleUseVqlSuggestionClick}
                            startIcon={copied ? <CheckCircleOutline fontSize="inherit" /> : <ContentCopy fontSize="inherit" />} // Icon indicates copy status
                            sx={{ textTransform: 'none' }}
                        >
                            {/* Text changed to "Use Suggestion", "Copied" state provides feedback on copy action */}
                            {copied ? 'Copied!' : 'Use Suggestion'}
                        </Button>
                    )}
                </Stack>
            </Box>

            <Box
                sx={{
                    width: '100%',
                    backgroundColor: lighterColor,
                    borderTop: `1px solid ${lightColor}`,
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
        sql_suggestion: PropTypes.string,
    }).isRequired,
    onDismiss: PropTypes.func.isRequired,
    onUseVqlSuggestion: PropTypes.func.isRequired,
};

export default AiValidationErrorAnalysis;