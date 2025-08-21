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
    Collapse,
    Divider,
} from '@mui/material';
import {
    ContentCopy,
    CheckCircleOutline,
    WarningAmber,
    ExpandMore,
    ExpandLess,
    Code,
} from '@mui/icons-material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

function AiValidationErrorAnalysis({ errorData, onDismiss, onUseVqlSuggestion }) {
    const theme = useTheme();
    const [copied, setCopied] = useState(false);
    const [showRawError, setShowRawError] = useState(false);

    // Handle the correct data structure from the endpoint
    const explanation = errorData?.explanation || errorData?.error_analysis?.explanation || '';
    const vql_suggestion = errorData?.sql_suggestion || errorData?.error_analysis?.sql_suggestion || errorData?.vql_suggestion;



    const handleUseVqlSuggestionClick = async () => {
        if (!vql_suggestion) return;

        try {
            await navigator.clipboard.writeText(vql_suggestion);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy VQL suggestion to clipboard: ', err);
        }

        if (onUseVqlSuggestion) {
            onUseVqlSuggestion(vql_suggestion);
        }
    };

    const handleCopyOnly = async () => {
        if (!vql_suggestion) return;

        try {
            await navigator.clipboard.writeText(vql_suggestion);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    const handleDismiss = () => {
        if (onDismiss) {
            onDismiss();
        }
    };

    const severity = 'error';
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
                        Validation Error Analysis
                    </Typography>
                </Box>

                {/* Error Explanation */}
                <Typography variant="body2" color="text.primary" sx={{ mb: 2 }}>
                    {explanation}
                </Typography>

                {/* VQL Suggestion */}
                {vql_suggestion && (
                    <Box mb={2}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Code fontSize="small" />
                            Suggested VQL Fix:
                        </Typography>
                        <Paper
                            variant="outlined"
                            sx={{
                                backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.grey[50],
                                p: 1.5,
                                borderRadius: 1,
                                position: 'relative',
                                borderColor: theme.palette.success.light,
                                borderWidth: 2,
                                overflowX: 'auto',
                            }}
                        >
                            <Typography
                                component="pre"
                                variant="body2"
                                sx={{
                                    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    color: theme.palette.text.primary,
                                    margin: 0,
                                    fontSize: '0.875rem',
                                    lineHeight: 1.4,
                                }}
                            >
                                {vql_suggestion}
                            </Typography>
                            <IconButton
                                onClick={handleCopyOnly}
                                size="small"
                                sx={{
                                    position: 'absolute',
                                    top: theme.spacing(0.5),
                                    right: theme.spacing(0.5),
                                    color: copied ? theme.palette.success.main : theme.palette.action.active,
                                    backgroundColor: theme.palette.background.paper,
                                    '&:hover': {
                                        backgroundColor: theme.palette.action.hover,
                                    }
                                }}
                                aria-label="copy suggested vql"
                            >
                                {copied ? <CheckCircleOutline fontSize="small" /> : <ContentCopy fontSize="small" />}
                            </IconButton>
                        </Paper>
                    </Box>
                )}

                {/* Raw Error Toggle - Only show if different from explanation */}
                {explanation && (
                    <Box sx={{ mb: 2 }}>
                        <Button
                            variant="text"
                            size="small"
                            onClick={() => setShowRawError(!showRawError)}
                            startIcon={showRawError ? <ExpandLess /> : <ExpandMore />}
                            sx={{
                                textTransform: 'none',
                                color: theme.palette.text.secondary,
                                fontSize: '0.875rem'
                            }}
                        >
                            {showRawError ? 'Hide' : 'Show'} Full Error Details
                        </Button>
                        <Collapse in={showRawError}>
                            <Box sx={{ mt: 1 }}>
                                <Divider sx={{ mb: 1 }} />
                                <Paper
                                    variant="outlined"
                                    sx={{
                                        backgroundColor: theme.palette.grey[100],
                                        p: 1.5,
                                        borderRadius: 1,
                                        maxHeight: 200,
                                        overflow: 'auto',
                                        border: `1px solid ${theme.palette.error.light}`
                                    }}
                                >
                                    <Typography
                                        variant="body2"
                                        component="pre"
                                        sx={{
                                            fontFamily: 'monospace',
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word',
                                            margin: 0,
                                            color: theme.palette.text.secondary,
                                            fontSize: '0.75rem'
                                        }}
                                    >
                                        {explanation}
                                    </Typography>
                                </Paper>
                            </Box>
                        </Collapse>
                    </Box>
                )}

                {/* Action Buttons */}
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
                    {vql_suggestion && (
                        <Button
                            variant="contained"
                            color="primary"
                            size="small"
                            onClick={handleUseVqlSuggestionClick}
                            startIcon={copied ? <CheckCircleOutline fontSize="small" /> : <Code fontSize="small" />}
                            sx={{ textTransform: 'none' }}
                        >
                            {copied ? 'Applied to Editor!' : 'Apply Suggestion'}
                        </Button>
                    )}
                </Stack>
            </Box>

            {/* AI Disclaimer */}
            <Box
                sx={{
                    width: '100%',
                    backgroundColor: lighterColor,
                    borderTop: `1px solid ${lightColor}`,
                    padding: theme.spacing(1, 2),
                    mt: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5
                }}
            >
                <AutoAwesomeIcon sx={{ fontSize: '0.75rem', color: lightColor }} />
                <Typography variant="caption" component="div" sx={{ color: lightColor, fontSize: '0.75rem' }}>
                    AI-powered analysis and suggestions require validation for security, performance, and correctness.
                </Typography>
            </Box>
        </Alert>
    );
}

AiValidationErrorAnalysis.propTypes = {
    errorData: PropTypes.oneOfType([
        // Legacy format
        PropTypes.shape({
            explanation: PropTypes.string.isRequired,
            sql_suggestion: PropTypes.string,
        }),
        // New endpoint format
        PropTypes.shape({
            error_analysis: PropTypes.shape({
                explanation: PropTypes.string.isRequired,
                sql_suggestion: PropTypes.string,
            }).isRequired,
        }),
    ]).isRequired,
    onDismiss: PropTypes.func.isRequired,
    onUseVqlSuggestion: PropTypes.func.isRequired,
};

export default AiValidationErrorAnalysis;