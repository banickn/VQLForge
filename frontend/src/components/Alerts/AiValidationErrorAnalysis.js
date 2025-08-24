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
    Collapse,
    Divider,
} from '@mui/material';
import {
    ContentCopy,
    CheckCircleOutline,
    WarningAmber,
    ExpandMore,
    Code,
} from '@mui/icons-material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

function AiValidationErrorAnalysis({ errorData, onDismiss, onUseVqlSuggestion }) {
    const theme = useTheme();
    const [copied, setCopied] = useState(false);
    const [showRawError, setShowRawError] = useState(false);

    const explanation = errorData?.explanation || errorData?.error_analysis?.explanation || '';
    const vql_suggestion = errorData?.sql_suggestion || errorData?.error_analysis?.sql_suggestion || errorData?.vql_suggestion;
    const raw_error = errorData?.raw_error || explanation;

    const handleCopyAndApply = async () => {
        if (!vql_suggestion) return;
        try {
            await navigator.clipboard.writeText(vql_suggestion);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            if (onUseVqlSuggestion) {
                onUseVqlSuggestion(vql_suggestion);
            }
        } catch (err) {
            console.error('Failed to copy VQL suggestion: ', err);
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
                <WarningAmber sx={{ color: theme.palette.error.light }} />
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    Validation Error Analysis
                </Typography>
            </Box>

            {/* Content */}
            <Box sx={{ p: 2 }}>
                <Typography variant="body2" sx={{ mb: 2.5, color: theme.palette.grey[400] }}>
                    {explanation}
                </Typography>

                {vql_suggestion && (
                    <Box mb={2.5}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Code fontSize="small" />
                            Suggested VQL Fix:
                        </Typography>
                        <Paper
                            variant="outlined"
                            sx={{
                                backgroundColor: '#1e1e1e',
                                p: 1.5,
                                borderRadius: 1,
                                position: 'relative',
                                // Keep this border to highlight the *solution*
                                borderColor: theme.palette.success.dark,
                                borderWidth: 1,
                                overflowX: 'auto',
                            }}
                        >
                            <Typography component="pre" variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', color: theme.palette.grey[300] }}>
                                {vql_suggestion}
                            </Typography>
                        </Paper>
                    </Box>
                )}

                {raw_error && (
                    <Box sx={{ mb: 2.5 }}>
                        <Button
                            size="small"
                            onClick={() => setShowRawError(!showRawError)}
                            endIcon={<ExpandMore sx={{ transform: showRawError ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />}
                            sx={{ textTransform: 'none', color: theme.palette.grey[400] }}
                        >
                            {showRawError ? 'Hide' : 'Show'} Full Error Details
                        </Button>
                        <Collapse in={showRawError}>
                            <Box sx={{ mt: 1 }}>
                                <Divider sx={{ mb: 1.5, borderColor: theme.palette.grey[700] }} />
                                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1, maxHeight: 150, overflow: 'auto', backgroundColor: '#1e1e1e', borderColor: theme.palette.grey[700] }}>
                                    <Typography component="pre" variant="caption" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', color: theme.palette.grey[500] }}>
                                        {raw_error}
                                    </Typography>
                                </Paper>
                            </Box>
                        </Collapse>
                    </Box>
                )}

                <Stack direction="row" spacing={1}>
                    {vql_suggestion && (
                        <Button
                            variant="contained"
                            color="primary"
                            size="small"
                            onClick={handleCopyAndApply}
                            startIcon={copied ? <CheckCircleOutline /> : <ContentCopy />}
                        >
                            {copied ? 'Applied!' : 'Apply Suggestion'}
                        </Button>
                    )}
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={onDismiss}
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
            <Box sx={{
                backgroundColor: '#343541',
                borderTop: '1px solid #444654', // Neutral border
                padding: theme.spacing(1, 2),
                display: 'flex',
                alignItems: 'center',
                gap: 1
            }}>
                <AutoAwesomeIcon sx={{ fontSize: '1rem', color: theme.palette.primary.light }} />
                <Typography variant="caption" sx={{ color: theme.palette.grey[400] }}>
                    AI-powered analysis. Always review suggestions for accuracy and security.
                </Typography>
            </Box>
        </Paper>
    );
}

AiValidationErrorAnalysis.propTypes = {
    errorData: PropTypes.object.isRequired,
    onDismiss: PropTypes.func.isRequired,
    onUseVqlSuggestion: PropTypes.func.isRequired,
};

export default AiValidationErrorAnalysis;