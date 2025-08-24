import React from 'react';
import PropTypes from 'prop-types';
import {
    Box,
    Typography,
    Paper,
    IconButton,
    Stack,
    useTheme
} from '@mui/material';
import {
    CheckCircleOutline as CheckCircleOutlineIcon,
    ErrorOutline as ErrorOutlineIcon,
    Close as CloseIcon
} from '@mui/icons-material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

function AgenticLogDisplay({ log, onClose }) {
    const theme = useTheme();

    return (
        <Paper
            elevation={4}
            sx={{
                backgroundColor: '#282c34', // Match CodeMirror oneDark theme
                color: 'white', // Base color for all text
                borderRadius: 2,
                overflow: 'hidden',
                border: '1px solid #444654'
            }}
        >
            <Box
                sx={{
                    p: 1.5,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: '#343541',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AutoAwesomeIcon sx={{ color: '#ab68ff', fontSize: '1.2rem' }} />
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        Agentic Process Log
                    </Typography>
                </Box>
                <IconButton onClick={onClose} size="small" sx={{ color: 'white' }}>
                    <CloseIcon fontSize="small" />
                </IconButton>
            </Box>

            <Box sx={{ p: 2 }}>
                <Stack spacing={1}> {/* Reduced spacing for a tighter list */}
                    {log.map((step, index) => (
                        <Box key={index} display="flex" alignItems="flex-start" gap={1.5}>
                            {step.success ? (
                                <CheckCircleOutlineIcon fontSize="small" sx={{ color: theme.palette.success.light, mt: '3px' }} />
                            ) : (
                                <ErrorOutlineIcon fontSize="small" sx={{ color: theme.palette.error.light, mt: '3px' }} />
                            )}

                            {step.step_name === 'Explain' ? (
                                // Special formatting for the "Explain" step with bold title
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="body2" sx={{ opacity: 0.9 }}><strong>{step.step_name}:</strong></Typography>
                                    {step.details.split('\n').filter(line => line.trim() !== '').map((line, lineIndex) => {
                                        const trimmedLine = line.trim();
                                        if (trimmedLine.startsWith('## ')) {
                                            return (
                                                <Typography key={lineIndex} variant="body2" sx={{ fontWeight: 'bold', mt: 1, mb: 0.5, opacity: 0.9 }}>
                                                    {trimmedLine.substring(3)}
                                                </Typography>
                                            );
                                        }
                                        if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
                                            return (
                                                <Box key={lineIndex} sx={{ display: 'flex', alignItems: 'flex-start', pl: 2, mt: 0.5 }}>
                                                    <Typography sx={{ mr: 1.5, lineHeight: '24px', opacity: 0.9 }}>•</Typography>
                                                    <Typography variant="body2" sx={{ flex: 1, whiteSpace: 'pre-wrap', opacity: 0.9 }}>
                                                        {trimmedLine.substring(2)}
                                                    </Typography>
                                                </Box>
                                            );
                                        }
                                        return <Typography key={lineIndex} variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.5, opacity: 0.9 }}>{line}</Typography>;
                                    })}
                                </Box>
                            ) : (
                                // Inline rendering for all other steps with regular-weight title
                                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', opacity: 0.9 }}>
                                    {`${step.step_name}: ${step.details}`}
                                </Typography>
                            )}
                        </Box>
                    ))}
                </Stack>
            </Box>
        </Paper>
    );
}

AgenticLogDisplay.propTypes = {
    log: PropTypes.arrayOf(PropTypes.object).isRequired,
    onClose: PropTypes.func.isRequired,
};

export default AgenticLogDisplay;