import React from 'react';
import PropTypes from 'prop-types';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

function ConfirmationDialog({ open, onClose, onConfirm }) {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
            PaperProps={{
                sx: {
                    backgroundColor: '#2d2d2d',
                    color: '#ffffff',
                    borderRadius: 2,
                    border: '1px solid #404040',
                    minWidth: '400px',
                }
            }}
        >
            <DialogTitle
                id="alert-dialog-title"
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    color: '#ffffff',
                    backgroundColor: '#2d2d2d',
                    borderBottom: '1px solid #404040',
                    pb: 2
                }}
            >
                <CheckCircleOutlineIcon sx={{ color: '#4caf50' }} />
                {"Validation Successful"}
            </DialogTitle>
            <DialogContent sx={{ backgroundColor: '#2d2d2d', py: 3 }}>
                <DialogContentText
                    id="alert-dialog-description"
                    sx={{ color: '#cccccc' }}
                >
                    The generated VQL has been successfully validated. Do you accept this result?
                </DialogContentText>
            </DialogContent>
            <DialogActions sx={{
                backgroundColor: '#2d2d2d',
                borderTop: '1px solid #404040',
                pt: 2,
                px: 3,
                pb: 2
            }}>
                <Button
                    onClick={onClose}
                    sx={{
                        color: '#cccccc',
                        borderColor: '#666666',
                        '&:hover': {
                            backgroundColor: '#404040',
                            borderColor: '#888888'
                        }
                    }}
                    variant="outlined"
                >
                    REJECT
                </Button>
                <Button
                    onClick={onConfirm}
                    autoFocus
                    sx={{
                        backgroundColor: '#7b2cbf',
                        color: '#ffffff',
                        '&:hover': {
                            backgroundColor: '#6a25a3'
                        },
                        fontWeight: 600
                    }}
                    variant="contained"
                >
                    ACCEPT
                </Button>
            </DialogActions>
        </Dialog>
    );
}

ConfirmationDialog.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onConfirm: PropTypes.func.isRequired,
};

export default ConfirmationDialog;