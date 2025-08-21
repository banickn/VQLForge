import React, { useState } from 'react';
import {
    Box,
    Typography,
    Button,
    IconButton,
    Paper,
    Stack,
    useTheme,
    Alert,             // Using Alert as the base container
    AlertTitle,
    Divider
} from '@mui/material';
import {
    ErrorOutline,      // Similar to AlertCircle
    ContentCopy,       // Similar to Copy
    CheckCircleOutline,// Similar to CheckCircle
} from '@mui/icons-material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PropTypes from 'prop-types'; // Import PropTypes

function AiErrorAnalysis({ errorData, onApplySuggestion, onDismiss }) {
    const theme = useTheme();
    const [copied, setCopied] = useState(false);

    const { explanation, sql_suggestion } = errorData;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(sql_suggestion);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
        } catch (err) {
            console.error('Failed to copy text: ', err);
            // Optionally show a user-facing error message here
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
        <Alert
            icon={false} // Remove default icon position
            severity="error"
            sx={{
                borderLeft: `4px solid ${theme.palette.error.main}`,
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.error.darker,
                boxShadow: theme.shadows[2],
                display: 'flex',
                flexDirection: 'column',
                padding: 0, // Remove default padding
                '.MuiAlert-message': {
                    width: '100%', // Ensure the message takes full width
                    padding: 0 // Remove default padding from message
                }
            }}
        >
            <Box sx={{ padding: theme.spacing(2) }}>
                {/* Custom Header with inline icon and title */}
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mb: 2
                }}>
                    <ErrorOutline
                        fontSize="small"
                        sx={{ color: theme.palette.error.main }}
                    />
                    <Typography
                        variant="h6"
                        component="div"
                        sx={{
                            fontWeight: 600,
                            color: theme.palette.error.dark,
                            fontSize: '1rem',
                            lineHeight: 1.2
                        }}
                    >
                        SQL Translation Analysis
                    </Typography>
                </Box>

                {/* Suggested SQL */}
                <Box mb={2}>
                    <Typography variant="body2" fontWeight="medium" color="text.primary" mb={0.5}>
                        Suggested SQL Correction:
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
                            <code>{sql_suggestion}</code>
                        </Typography>
                        <IconButton
                            onClick={handleCopy}
                            size="small"
                            sx={{
                                position: 'absolute',
                                top: theme.spacing(1),
                                right: theme.spacing(1),
                                color: copied ? theme.palette.success.main : theme.palette.action.active,
                                '&:hover': {
                                    backgroundColor: theme.palette.action.hover,
                                }
                            }}
                            aria-label="copy suggested sql"
                        >
                            {copied ? <CheckCircleOutline fontSize="inherit" /> : <ContentCopy fontSize="inherit" />}
                        </IconButton>
                    </Paper>
                </Box>

                {/* Explanation */}
                <Box mb={2}>
                    <Typography variant="body2" color="text.primary">
                        {explanation}
                    </Typography>
                </Box>

                {/* Actions */}
                <Stack direction="row" spacing={1} mt={1}>
                    <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        onClick={handleApply}
                        sx={{ textTransform: 'none' }}
                    >
                        Apply Suggestion
                    </Button>
                    <Button
                        variant="outlined"
                        color="inherit"
                        size="small"
                        onClick={handleDismiss}
                        sx={{ textTransform: 'none', color: theme.palette.text.secondary, borderColor: theme.palette.grey[400] }}
                    >
                        Dismiss
                    </Button>
                </Stack>
            </Box>

            {/* Footer with different background */}
            <Box
                sx={{
                    width: '100%',
                    backgroundColor: theme.palette.error.lighter || theme.palette.grey[50],
                    borderTop: `1px solid ${theme.palette.error.light}`,
                    padding: theme.spacing(1, 2),
                    mt: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5
                }}
            >
                <AutoAwesomeIcon
                    sx={{
                        fontSize: '0.75rem',
                        color: theme.palette.error.light
                    }}
                />
                <Typography
                    variant="caption"
                    component="div"
                    sx={{
                        color: theme.palette.error.light,
                        fontSize: '0.75rem',
                    }}
                >
                    VQLForge employs AI for advanced analysis and suggestions, but careful user validation of security, performance, and correctness is essential.
                </Typography>
            </Box>
        </Alert>
    );
}

// Add PropTypes for better component usage validation
AiErrorAnalysis.propTypes = {
    errorData: PropTypes.shape({
        explanation: PropTypes.string.isRequired,
        sql_suggestion: PropTypes.string.isRequired,
    }).isRequired,
    onApplySuggestion: PropTypes.func.isRequired,
    onDismiss: PropTypes.func.isRequired,
};


export default AiErrorAnalysis;