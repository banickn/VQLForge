import React, { useState } from 'react';
import {
    Snackbar,
    Alert,
    AlertTitle,
    Slide,
    Box,
    Button,
    Stack,
    useTheme,
    alpha
} from '@mui/material';

// Toast Hook for managing toast state
export const useToast = () => {
    const [toasts, setToasts] = useState([]);

    const addToast = (message, severity = 'info', duration = 6000, title = '', actions = []) => {
        const id = Date.now() + Math.random();
        const newToast = {
            id,
            message,
            severity,
            duration,
            title,
            open: true,
            actions
        };

        setToasts(prev => [...prev, newToast]);

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    return {
        toasts,
        addToast,
        removeToast,
        success: (message, title = '', duration = 8000, actions = []) => addToast(message, 'success', duration, title, actions),
        error: (message, title = '', duration = 8000) => addToast(message, 'error', duration, title),
        warning: (message, title = '', duration = 7000) => addToast(message, 'warning', duration, title),
        info: (message, title = '', duration = 6000) => addToast(message, 'info', duration, title)
    };
};

// Individual Toast Component
const Toast = ({ toast, onClose }) => {
    const theme = useTheme();

    const handleClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        onClose(toast.id);
    };

    const handleActionClick = (action) => {
        if (action.onClick) {
            action.onClick();
        }
        onClose(toast.id);
    };

    // Define neutral colors with subtle accents
    const getToastStyles = (severity) => {
        const baseStyles = {
            minWidth: '320px',
            maxWidth: '500px',
            borderRadius: '8px',
            backdropFilter: 'blur(8px)',
            border: '1px solid',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
            '& .MuiAlert-message': {
                width: '100%',
                color: '#ffffff'
            },
            '& .MuiAlert-action': {
                padding: 0,
                alignItems: 'center'
            }
        };

        switch (severity) {
            case 'success':
                return {
                    ...baseStyles,
                    backgroundColor: 'rgba(45, 55, 65, 0.95)',
                    borderColor: 'rgba(76, 175, 80, 0.3)',
                    borderLeftColor: '#4CAF50',
                    borderLeftWidth: '4px',
                    '& .MuiAlert-icon': {
                        color: '#4CAF50',
                    },
                };
            case 'error':
                return {
                    ...baseStyles,
                    backgroundColor: 'rgba(45, 55, 65, 0.95)',
                    borderColor: 'rgba(244, 67, 54, 0.3)',
                    borderLeftColor: '#f44336',
                    borderLeftWidth: '4px',
                    '& .MuiAlert-icon': {
                        color: '#f44336',
                    },
                };
            case 'warning':
                return {
                    ...baseStyles,
                    backgroundColor: 'rgba(45, 55, 65, 0.95)',
                    borderColor: 'rgba(255, 152, 0, 0.3)',
                    borderLeftColor: '#ff9800',
                    borderLeftWidth: '4px',
                    '& .MuiAlert-icon': {
                        color: '#ff9800',
                    },
                };
            case 'info':
            default:
                return {
                    ...baseStyles,
                    backgroundColor: 'rgba(45, 55, 65, 0.95)',
                    borderColor: 'rgba(33, 150, 243, 0.3)',
                    borderLeftColor: '#2196f3',
                    borderLeftWidth: '4px',
                    '& .MuiAlert-icon': {
                        color: '#2196f3',
                    },
                };
        }
    };

    return (
        <Snackbar
            open={toast.open}
            autoHideDuration={toast.duration > 0 ? toast.duration : null}
            onClose={handleClose}
            TransitionComponent={Slide}
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
            <Alert
                onClose={handleClose}
                severity={toast.severity}
                variant="standard"
                sx={getToastStyles(toast.severity)}

            >
                <Box sx={{ width: '100%' }}>
                    {toast.title && (
                        <AlertTitle sx={{
                            fontWeight: 600,
                            color: '#ffffff',
                            mb: 0.5,
                            fontSize: '0.875rem'
                        }}>
                            {toast.title}
                        </AlertTitle>
                    )}
                    <Box sx={{ fontSize: '0.875rem', lineHeight: 1.4, mb: toast.actions && toast.actions.length > 0 ? 2 : 0 }}>
                        {toast.message}
                    </Box>
                    {toast.actions && toast.actions.length > 0 && (
                        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                            {toast.actions.map((action, index) => {
                                const isPrimary = action.primary;
                                const iconColor = toast.severity === 'success' ? '#4CAF50' :
                                    toast.severity === 'error' ? '#f44336' :
                                        toast.severity === 'warning' ? '#ff9800' : '#2196f3';

                                return (
                                    <Button
                                        key={index}
                                        size="small"
                                        variant={isPrimary ? "contained" : "outlined"}
                                        onClick={() => handleActionClick(action)}
                                        sx={isPrimary ? {
                                            backgroundColor: iconColor,
                                            color: 'white',
                                            fontSize: '0.75rem',
                                            textTransform: 'none',
                                            fontWeight: 500,
                                            minWidth: 'auto',
                                            px: 2,
                                            py: 0.5,
                                            '&:hover': {
                                                backgroundColor: alpha(iconColor, 0.8),
                                            }
                                        } : {
                                            color: '#ffffff',
                                            borderColor: 'rgba(255, 255, 255, 0.3)',
                                            fontSize: '0.75rem',
                                            textTransform: 'none',
                                            fontWeight: 500,
                                            minWidth: 'auto',
                                            px: 2,
                                            py: 0.5,
                                            '&:hover': {
                                                borderColor: 'rgba(255, 255, 255, 0.5)',
                                                backgroundColor: 'rgba(255, 255, 255, 0.05)'
                                            }
                                        }}
                                    >
                                        {action.label}
                                    </Button>
                                );
                            })}
                        </Stack>
                    )}
                </Box>
            </Alert>
        </Snackbar>
    );
};

// Toast Container Component
export const ToastContainer = ({ toasts, onRemoveToast }) => {
    return (
        <Box
            sx={{
                position: 'fixed',
                top: 80,
                right: 16,
                zIndex: 1500,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                maxHeight: 'calc(100vh - 100px)',
                overflow: 'hidden'
            }}
        >
            {toasts.map((toast) => (
                <Toast
                    key={toast.id}
                    toast={toast}
                    onClose={onRemoveToast}
                />
            ))}
        </Box>
    );
};