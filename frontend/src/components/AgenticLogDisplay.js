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
                color: 'white',
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
                <Stack spacing={1.5}>
                    {log.map((step, index) => (
                        <Box key={index} display="flex" alignItems="center" gap={1}>
                            {step.success ? (
                                <CheckCircleOutlineIcon fontSize="small" sx={{ color: theme.palette.success.light }} />
                            ) : (
                                <ErrorOutlineIcon fontSize="small" sx={{ color: theme.palette.error.light }} />
                            )}
                            <Typography variant="body2"><strong>{step.step_name}:</strong> {step.details}</Typography>
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