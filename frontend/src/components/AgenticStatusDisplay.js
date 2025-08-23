import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
    Box,
    Typography,
    Paper,
    IconButton,
    Collapse,
    Stack,
    Chip,
    keyframes,
    useTheme
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    CheckCircleOutline as CheckCircleOutlineIcon,
    ErrorOutline as ErrorOutlineIcon
} from '@mui/icons-material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

// Keyframes for the thinking animation
const thinkingAnimation = keyframes`
  0%, 80%, 100% {
    box-shadow: 0 0;
    height: 4px;
  }
  40% {
    box-shadow: 0 -8px;
    height: 5px;
  }
`;

const ThinkingDot = (props) => (
    <Box
        sx={{
            background: '#fff',
            animation: `${thinkingAnimation} 1s infinite ease-in-out`,
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            color: '#fff',
            fontSize: '4px',
            margin: '0 2px',
            position: 'relative',
            textIndent: '-9999em',
            transform: 'translateZ(0)',
            animationDelay: props.delay || '0s',
        }}
        {...props}
    />
);

function AgenticStatusDisplay({ currentStep, history }) {
    const theme = useTheme();
    const [isExpanded, setIsExpanded] = useState(false);

    const handleToggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    const previousSteps = history.slice(0, -1);

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
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AutoAwesomeIcon sx={{ color: '#ab68ff', fontSize: '1.2rem' }} />
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        Thinking
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <ThinkingDot delay="-0.16s" />
                        <ThinkingDot delay="-0.08s" />
                        <ThinkingDot />
                    </Box>
                </Box>
                <Chip label="Auto" size="small" sx={{ backgroundColor: '#444654', color: 'white' }} />
            </Box>

            <Box
                sx={{
                    p: 1.5,
                    backgroundColor: '#343541',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid #444654',
                    borderBottom: isExpanded && previousSteps.length > 0 ? '1px solid #444654' : 'none',
                }}
            >
                <Typography variant="body2" sx={{ opacity: 0.9 }}>{currentStep?.details || 'Initializing agent...'}</Typography>
                {previousSteps.length > 0 && (
                    <IconButton
                        onClick={handleToggleExpand}
                        size="small"
                        sx={{
                            color: 'white',
                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s',
                        }}
                    >
                        <ExpandMoreIcon />
                    </IconButton>
                )}
            </Box>

            <Collapse in={isExpanded}>
                <Box sx={{ p: 2, backgroundColor: '#282c34' }}>
                    <Stack spacing={1.5}>
                        {previousSteps.map((step, index) => (
                            <Box key={index} display="flex" alignItems="center" gap={1} sx={{ opacity: 0.7 }}>
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
            </Collapse>
        </Paper>
    );
}

AgenticStatusDisplay.propTypes = {
    currentStep: PropTypes.object,
    history: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default AgenticStatusDisplay;