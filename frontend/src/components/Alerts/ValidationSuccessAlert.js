import React from 'react';
import PropTypes from 'prop-types';
import {
    Paper,
    Box,
    Typography,
    Stack,
    Button,
    useTheme,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

function ValidationSuccessAlert({ onAccept, onReject, message }) {
    const theme = useTheme();

    return (
        <Paper
            elevation={4}
            sx={{
                display: 'flex',
                alignItems: 'center',
                p: 2,
                backgroundColor: '#282c34',
                color: 'white',
                borderRadius: 2,
                border: `1px solid ${theme.palette.success.dark}`,
                boxShadow: theme.shadows[4],
            }}
        >
            <CheckCircleOutlineIcon sx={{ color: theme.palette.success.light, mr: 2, fontSize: '2rem' }} />
            <Box sx={{ flexGrow: 1 }}>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>Validation Successful</Typography>
                <Typography variant="body2" sx={{ color: theme.palette.grey[400] }}>
                    {message}
                </Typography>
            </Box>
            <Stack direction="row" spacing={1} sx={{ ml: 2 }}>
                <Button
                    variant="outlined"
                    size="small"
                    onClick={onReject}
                    sx={{
                        color: theme.palette.grey[300],
                        borderColor: theme.palette.grey[700],
                        '&:hover': { borderColor: theme.palette.grey[500] }
                    }}
                >
                    Reject
                </Button>
                <Button
                    variant="contained"
                    color="success"
                    size="small"
                    onClick={onAccept}
                >
                    Accept
                </Button>
            </Stack>
        </Paper>
    );
}

ValidationSuccessAlert.propTypes = {
    onAccept: PropTypes.func.isRequired,
    onReject: PropTypes.func.isRequired,
    message: PropTypes.string.isRequired,
};

export default ValidationSuccessAlert;