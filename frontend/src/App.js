import React, { useState, useCallback, useEffect } from 'react';
import {
    CssBaseline, AppBar, Toolbar, Typography, Container, Box,
    Button, CircularProgress, Alert,
    AlertTitle, IconButton, Stack, useTheme, Autocomplete, TextField,
} from '@mui/material';
import DoubleArrowIcon from '@mui/icons-material/DoubleArrow';
import VerifiedIcon from '@mui/icons-material/Verified';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { sql } from '@codemirror/lang-sql';
import { purple, blueGrey } from '@mui/material/colors';

// Import API Service
import { fetchVdbs, translateSql, validateSql, forgeSql } from './apiService.js';

// Import Custom Components
import CodeEditor from './components/Editors/CodeEditor.js';
import VqlForgeLogo from './Logo.js';
import AgenticStatusDisplay from './components/AgenticStatusDisplay.js';
import AgenticLogDisplay from './components/AgenticLogDisplay.js';
import { useToast, ToastContainer } from './components/Toast/Toast.js';


// --- Import Alert Components ---
import AiErrorAnalysis from './components/Alerts/AiErrorAnalysis.js';
import AiValidationErrorAnalysis from './components/Alerts/AiValidationErrorAnalysis.js';

// --- Configuration ---
const availableDialects = [{ value: 'athena', label: 'Athena' }, { value: 'bigquery', label: 'BigQuery' }, { value: 'clickhouse', label: 'ClickHouse' }, { value: 'databricks', label: 'Databricks' }, { value: 'doris', label: 'Doris' }, { value: 'drill', label: 'Drill' }, { value: 'druid', label: 'Druid' }, { value: 'duckdb', label: 'DuckDB' }, { value: 'dune', label: 'Dune' }, { value: 'hive', label: 'Hive' }, { value: 'materialize', label: 'Materialize' }, { value: 'mysql', label: 'MySQL' }, { value: 'oracle', label: 'Oracle' }, { value: 'postgres', label: 'PostgreSQL' }, { value: 'presto', label: 'Presto' }, { value: 'prql', label: 'PRQL' }, { value: 'redshift', label: 'Redshift' }, { value: 'risingwave', label: 'RisingWave' }, { value: 'snowflake', label: 'Snowflake' }, { value: 'spark', label: 'Spark SQL' }, { value: 'spark2', label: 'Spark SQL 2' }, { value: 'sqlite', label: 'SQLite' }, { value: 'starrocks', label: 'StarRocks' }, { value: 'tableau', label: 'Tableau' }, { value: 'teradata', label: 'Teradata' }, { value: 'trino', label: 'Trino' }];
const editorExtensions = [sql()];
const initialTargetSqlPlaceholder = '-- Target SQL will appear here after conversion...';
const conversionErrorPlaceholder = '-- Conversion Error --';

function App() {
    const theme = useTheme();
    const toast = useToast();
    const [sourceDialect, setSourceDialect] = useState(availableDialects[0]);

    // --- VDB State ---
    const [actualAvailableVDBs, setActualAvailableVDBs] = useState([]);
    const [selectedVDB, setSelectedVDB] = useState(null);
    const [vdbsLoading, setVdbsLoading] = useState(false);
    const [vdbsError, setVdbsError] = useState(null);

    const [sourceSql, setSourceSql] = useState('SELECT\n    c.customer_id,\n    c.name,\n    COUNT(o.order_id) AS total_orders\nFROM\n    customers c\nLEFT JOIN\n    orders o ON c.customer_id = o.customer_id\nWHERE\n    c.signup_date >= \'2023-01-01\'\nGROUP BY\n    c.customer_id, c.name\nHAVING\n    COUNT(o.order_id) > 5\nORDER BY\n    total_orders DESC;');
    const [targetSql, setTargetSql] = useState(initialTargetSqlPlaceholder);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isValidating, setIsValidating] = useState(false);
    const [validationResult, setValidationResult] = useState(null);
    // --- Agentic Mode State ---
    const [isAgenticModeActive, setIsAgenticModeActive] = useState(false);
    const [agenticStatusMessages, setAgenticStatusMessages] = useState([]);
    const [currentAgenticStep, setCurrentAgenticStep] = useState(null);
    const [showFinalAgenticLog, setShowFinalAgenticLog] = useState(false);


    const anyLoading = isLoading || isValidating || vdbsLoading || isAgenticModeActive;

    const clearValidationState = () => { setValidationResult(null); };
    const clearErrorState = () => { setError(null); };
    const clearAgenticState = () => {
        setAgenticStatusMessages([]);
        setCurrentAgenticStep(null);
        setShowFinalAgenticLog(false);
    };

    // --- Fetch VDBs ---
    useEffect(() => {
        setVdbsLoading(true);
        setVdbsError(null);
        fetchVdbs()
            .then(data => {
                if (data && Array.isArray(data.results)) {
                    setActualAvailableVDBs(data.results);
                } else {
                    console.error("VDB data from API is not in the expected format:", data);
                    throw new Error("VDB data is not in the expected format (missing 'results' array).");
                }
                setVdbsLoading(false);
            })
            .catch(err => {
                console.error("Error fetching VDBs:", err);
                setVdbsError(err.message || "Could not fetch VDB options.");
                setActualAvailableVDBs([{ value: 'admin', label: 'Admin' }]);
                setVdbsLoading(false);
            });
    }, []);

    const onSourceChange = useCallback((value) => {
        setSourceSql(value);
        clearErrorState();
        clearValidationState();
        clearAgenticState();
    }, []);

    const handleDialectChange = (event, newValue) => {
        setSourceDialect(newValue);
        clearErrorState();
        clearValidationState();
        clearAgenticState();
    };

    const handleVDBChange = (event, newValue) => {
        setSelectedVDB(newValue);
        clearErrorState();
        clearValidationState();
        clearAgenticState();
        setTargetSql(initialTargetSqlPlaceholder);
    };

    const handleApplySuggestion = (suggestedSql) => {
        setSourceSql(suggestedSql);
        setError(null);
        setTargetSql(initialTargetSqlPlaceholder);
        clearValidationState();
        clearAgenticState();
    };
    const handleUseVqlSuggestion = (suggestedVql) => {
        setTargetSql(suggestedVql);
        clearValidationState();
    };
    const handleDismissError = () => {
        setError(null);
    };

    const handleConvert = async () => {
        setIsLoading(true);
        clearErrorState();
        clearValidationState();
        clearAgenticState();

        if (!sourceDialect || !selectedVDB) {
            setError("Source Dialect and VDB must be selected.");
            setIsLoading(false);
            return;
        }
        const requestBody = {
            sql: sourceSql,
            dialect: sourceDialect.value,
            vdb: selectedVDB.value
        };
        try {
            const data = await translateSql(requestBody);

            if (data && typeof data.vql === 'string') {
                setTargetSql(data.vql);
                clearErrorState();
            } else if (data && data.error_analysis && typeof data.error_analysis.explanation === 'string') {
                setError(data.error_analysis);
                setTargetSql(initialTargetSqlPlaceholder);
            } else if (data && typeof data.message === 'string') {
                setError(`Translation Info: ${data.message}`);
                setTargetSql(initialTargetSqlPlaceholder);
            } else {
                throw new Error("Received unexpected success data format from the translation endpoint.");
            }

        } catch (err) {
            console.error("Conversion process failed:", err);
            setError(err.message || 'Unknown conversion error.');
            setTargetSql(conversionErrorPlaceholder);
        } finally {
            setIsLoading(false);
        }
    };

    const handleValidateQuery = async () => {
        if (error && typeof error === 'object' && error !== null && error.explanation) {
            setValidationResult({ status: 'info', message: 'Resolve the translation error (Apply or Dismiss) before validating.' });
            return;
        }
        if (validationResult?.status === 'error_ai') {
            return;
        }
        if (!targetSql || targetSql === initialTargetSqlPlaceholder || targetSql === conversionErrorPlaceholder) {
            setValidationResult({ status: 'info', message: 'Convert the SQL to VQL first or resolve conversion errors.' });
            return;
        }
        if (!sourceSql.trim() || !sourceDialect || !selectedVDB || isLoading || isValidating || vdbsLoading) {
            return;
        }

        setIsValidating(true);
        clearValidationState();
        clearErrorState();
        clearAgenticState();

        const vqlToValidate = targetSql;
        const vqlWithoutLineBreaks = vqlToValidate.replace(/[\r\n]+/g, ' ').trim();
        if (!vqlWithoutLineBreaks) {
            setValidationResult({ status: 'error', message: 'Cannot validate empty VQL.' });
            setIsValidating(false);
            return;
        }

        try {
            const validationData = await validateSql(sourceSql, vqlWithoutLineBreaks);

            if (validationData.validated) {
                const message = validationData.message || `VQL syntax check successful!`;

                // Enhanced toast with custom Accept/Refuse actions
                const actions = [
                    {
                        label: 'Accept',
                        onClick: () => {
                            clearValidationState();
                            console.log('Validation accepted by user');
                        },
                        primary: true
                    },
                    {
                        label: 'Refuse',
                        onClick: () => {
                            clearValidationState();
                            setTargetSql(initialTargetSqlPlaceholder);
                            console.log('Validation refused by user');
                        },
                        primary: false
                    }
                ];

                toast.success(message, 'Validation Successful', 12000, actions);
            } else {
                if (validationData.error_analysis) {
                    setValidationResult({
                        status: 'error_ai',
                        data: validationData.error_analysis
                    });
                } else {
                    setValidationResult({
                        status: 'error',
                        message: validationData.message || 'Validation Failed: Denodo rejected the query syntax/plan.'
                    });
                }
            }
        } catch (err) {
            console.error("Validation process error:", err);
            if (err.status === 'error_ai' && err.data) {
                setValidationResult({ status: 'error_ai', data: err.data });
            } else {
                setValidationResult({
                    status: 'error',
                    message: `Validation Process Error: ${err.message || 'Unknown error.'}`
                });
            }
        } finally {
            setIsValidating(false);
        }
    };


    const handleAgenticForge = () => {
        setIsAgenticModeActive(true);
        clearErrorState();
        clearValidationState();
        setAgenticStatusMessages([]);
        setCurrentAgenticStep(null);
        setShowFinalAgenticLog(false);
        setTargetSql(initialTargetSqlPlaceholder);

        const requestBody = {
            sql: sourceSql,
            dialect: sourceDialect.value,
            vdb: selectedVDB.value,
        };

        const onMessage = ({ event, data }) => {
            if (event === 'step') {
                setCurrentAgenticStep(data);
                setAgenticStatusMessages(prev => {
                    const existingIndex = prev.findIndex(step => step.step_name === data.step_name);
                    if (existingIndex > -1) {
                        const newSteps = [...prev];
                        newSteps[existingIndex] = data;
                        return newSteps;
                    }
                    return [...prev, data];
                });
            } else if (event === 'result') {
                const { final_vql, is_valid, final_message, error_analysis, process_log } = data;
                if (process_log) setAgenticStatusMessages(process_log);

                if (final_vql) {
                    setTargetSql(final_vql);
                }

                if (is_valid) {
                    const actions = [
                        {
                            label: 'Accept',
                            onClick: () => {
                                console.log('Auto-Forge result accepted');
                            },
                            primary: true
                        },
                        {
                            label: 'Retry',
                            onClick: () => {
                                setTargetSql(initialTargetSqlPlaceholder);
                                console.log('Auto-Forge result rejected, ready for retry');
                            },
                            primary: false
                        }
                    ];

                    toast.success(final_message, 'Auto-Forge Successful', 12000, actions);
                } else {
                    if (error_analysis) {
                        if (process_log.some(step => step.step_name === "Translate" && !step.success)) {
                            setError(error_analysis);
                        } else {
                            setValidationResult({ status: 'error_ai', data: error_analysis });
                        }
                    } else {
                        setValidationResult({ status: 'error', message: final_message });
                    }
                }
                setShowFinalAgenticLog(true);
            } else if (event === 'error') {
                setError(`Agentic Forge Error: ${data.detail || 'An unknown error occurred.'}`);
                setTargetSql(conversionErrorPlaceholder);
            }
        };

        const onError = (err) => {
            setError(`Agentic Forge Connection Error: ${err.message}`);
            setTargetSql(conversionErrorPlaceholder);
            setIsAgenticModeActive(false);
        };

        const onClose = () => {
            setIsAgenticModeActive(false);
            setCurrentAgenticStep(null);
            console.log("Agentic stream closed.");
        };

        forgeSql(requestBody, { onMessage, onError, onClose });
    };


    const getValidationAlertProps = () => {
        if (!validationResult) return null;

        const status = validationResult.status;

        if (status === 'info') {
            return {
                severity: 'info',
                icon: <InfoOutlinedIcon fontSize="inherit" />,
                title: 'Validation Info'
            };
        }
        if (status === 'error') {
            return {
                severity: 'error',
                icon: <ErrorOutlineIcon fontSize="inherit" />,
                title: 'Validation Error'
            };
        }
        return null;
    };

    const validationAlertProps = getValidationAlertProps();

    return (
        <>
            <ToastContainer toasts={toast.toasts} onRemoveToast={toast.removeToast} />
            <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
                <CssBaseline />
                <AppBar
                    position="static"
                    elevation={1}
                    sx={{
                        background: `linear-gradient(90deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`,
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                    }}
                >
                    <Toolbar>
                        <VqlForgeLogo sx={{ fontSize: '2rem', mr: 2 }} />
                        <Typography variant="h5" component="div" sx={{ fontWeight: 500, flexGrow: 1, color: 'white', letterSpacing: '0.08em' }}>
                            VQLForge
                        </Typography>
                    </Toolbar>
                </AppBar>

                <Container maxWidth="xl" sx={{ mt: 4, mb: 4, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <Stack spacing={2} sx={{ mb: 3, flexShrink: 0 }}>
                        {isAgenticModeActive && (
                            <AgenticStatusDisplay currentStep={currentAgenticStep} history={agenticStatusMessages} />
                        )}

                        {showFinalAgenticLog && agenticStatusMessages.length > 0 && (
                            <AgenticLogDisplay log={agenticStatusMessages} onClose={clearAgenticState} />
                        )}

                        {error && typeof error === 'object' && error.explanation && error.sql_suggestion && (
                            <AiErrorAnalysis
                                errorData={error}
                                onApplySuggestion={handleApplySuggestion}
                                onDismiss={handleDismissError}
                            />
                        )}
                        {error && typeof error === 'string' && (
                            <Alert
                                severity="error"
                                onClose={clearErrorState}
                            >
                                <AlertTitle sx={{ fontWeight: 600 }}>Error</AlertTitle>
                                {error}
                            </Alert>
                        )}
                        {vdbsLoading && !vdbsError && (
                            <Alert severity="info" icon={<CircularProgress size={20} />}>Loading VDB options...</Alert>
                        )}
                        {vdbsError && (
                            <Alert
                                severity="warning"
                                onClose={() => setVdbsError(null)}
                            >
                                <AlertTitle sx={{ fontWeight: 600 }}>VDB Load Issue</AlertTitle>
                                {vdbsError} - VDB selection might be unavailable or incomplete.
                            </Alert>
                        )}

                        {validationResult?.status === 'error_ai' && validationResult.data && (
                            <AiValidationErrorAnalysis
                                errorData={validationResult.data}
                                onDismiss={clearValidationState}
                                onUseVqlSuggestion={handleUseVqlSuggestion}
                            />
                        )}
                        {validationAlertProps && (
                            <Alert
                                severity={validationAlertProps.severity}
                                icon={validationAlertProps.icon}
                                onClose={clearValidationState}
                                sx={{
                                    boxShadow: theme.shadows[2],
                                    backgroundColor: 'background.paper',
                                    borderLeft: `4px solid ${theme.palette[validationAlertProps.severity].main}`
                                }}
                            >
                                <AlertTitle sx={{ fontWeight: 600 }}>{validationAlertProps.title}</AlertTitle>
                                {validationResult.message}
                            </Alert>
                        )}
                    </Stack>

                    <Box
                        display="flex"
                        flexDirection={{ xs: 'column', md: 'row' }}
                        gap={2.5}
                        alignItems={{ xs: 'center', md: 'stretch' }}
                        sx={{ flexGrow: 1 }}
                    >
                        <Box sx={{ order: { xs: 2, md: 1 }, display: 'flex', width: '100%', [theme.breakpoints.up('md')]: { flexGrow: 1, minWidth: '300px' } }}>
                            <CodeEditor
                                title={`Source (${sourceDialect ? sourceDialect.label : 'Select Dialect'})`}
                                borderColor={theme.palette.primary.main}
                                value={sourceSql}
                                onChange={onSourceChange}
                                extensions={editorExtensions}
                                loading={anyLoading}
                            />
                        </Box>

                        <Box sx={{ order: { xs: 1, md: 2 }, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', gap: 2, pt: { xs: 2, md: 0 }, width: { xs: '100%', md: '220px' }, flexShrink: 0 }}>
                            <Autocomplete
                                disablePortal
                                id="source-dialect-autocomplete"
                                options={availableDialects}
                                getOptionLabel={(option) => option.label || ""}
                                value={sourceDialect}
                                onChange={handleDialectChange}
                                isOptionEqualToValue={(option, value) => option?.value === value?.value}
                                disabled={anyLoading}
                                fullWidth
                                renderInput={(params) => <TextField {...params} label="Source Dialect" />}
                                renderOption={(props, option) => (
                                    <Box component="li" sx={{ '& > img': { mr: 2, flexShrink: 0 } }} {...props}>
                                        {option.label}
                                    </Box>
                                )}
                            />
                            <Autocomplete
                                disablePortal
                                id="vdb-autocomplete"
                                options={actualAvailableVDBs}
                                loading={vdbsLoading}
                                noOptionsText={vdbsError ? "Using fallback VDB" : (vdbsLoading ? "Loading..." : "No VDBs configured")}
                                getOptionLabel={(option) => option.label || ""}
                                value={selectedVDB}
                                onChange={handleVDBChange}
                                isOptionEqualToValue={(option, value) => option?.value === value?.value}
                                disabled={anyLoading}
                                fullWidth
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="VDB"
                                        error={!!vdbsError}
                                        InputProps={{
                                            ...params.InputProps,
                                            endAdornment: (
                                                <React.Fragment>
                                                    {vdbsLoading ? <CircularProgress color="inherit" size={20} /> : null}
                                                    {params.InputProps.endAdornment}
                                                </React.Fragment>
                                            ),
                                        }}
                                    />
                                )}
                            />
                            <Box sx={{ position: 'relative', width: '100%' }}>
                                <Button variant="contained" color="secondary" onClick={handleConvert} disabled={!sourceSql.trim() || !sourceDialect || !selectedVDB || anyLoading} startIcon={!isLoading ? <DoubleArrowIcon /> : null} fullWidth sx={{ height: '56px', fontWeight: 600 }}>
                                    {isLoading ? 'Converting...' : 'Convert'}
                                </Button>
                                {isLoading && (<CircularProgress size={24} color="inherit" sx={{ position: 'absolute', top: '50%', left: '50%', marginTop: '-12px', marginLeft: '-12px' }} />)}
                            </Box>

                            <Box sx={{ position: 'relative', width: '100%' }}>
                                <Button
                                    variant="outlined"
                                    color="primary"
                                    onClick={handleValidateQuery}
                                    disabled={
                                        anyLoading ||
                                        !sourceSql.trim() ||
                                        !sourceDialect ||
                                        !selectedVDB ||
                                        !targetSql ||
                                        targetSql === initialTargetSqlPlaceholder ||
                                        targetSql === conversionErrorPlaceholder ||
                                        (error && typeof error === 'object' && error !== null && error.explanation)
                                    }
                                    startIcon={!isValidating ? <VerifiedIcon /> : null}
                                    fullWidth sx={{ height: '56px', fontWeight: 600 }}
                                >
                                    {isValidating ? 'Validating...' : 'Validate VQL'}
                                </Button>
                                {isValidating && (<CircularProgress size={24} color="primary" sx={{ position: 'absolute', top: '50%', left: '50%', marginTop: '-12px', marginLeft: '-12px' }} />)}
                            </Box>

                            <Box sx={{ position: 'relative', width: '100%' }}>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={handleAgenticForge}
                                    disabled={anyLoading || !sourceSql.trim() || !sourceDialect || !selectedVDB}
                                    startIcon={!isAgenticModeActive ? <AutoFixHighIcon /> : null}
                                    fullWidth
                                    sx={{ height: '56px', fontWeight: 600 }}
                                >
                                    {isAgenticModeActive ? 'Working...' : 'Auto-Forge'}
                                </Button>
                                {isAgenticModeActive && (<CircularProgress size={24} color="inherit" sx={{ position: 'absolute', top: '50%', left: '50%', marginTop: '-12px', marginLeft: '-12px' }} />)}
                            </Box>
                        </Box>

                        <Box sx={{ order: { xs: 3, md: 3 }, display: 'flex', width: { xs: '100%', md: '550px' }, minWidth: { md: '550px' }, maxWidth: { md: '550px' }, flexShrink: 0 }}>
                            <CodeEditor
                                title="Target (VQL)"
                                borderColor={purple[500]}
                                value={targetSql}
                                readOnly={true}
                                extensions={editorExtensions}
                                loading={anyLoading}
                            />
                        </Box>
                    </Box>
                </Container>

                <Box component="footer" sx={{ height: '50px', px: 2, mt: 'auto', backgroundColor: blueGrey[50], borderTop: `1px solid ${theme.palette.divider}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="caption" color="text.secondary"><a href="https://github.com/banickn/VQLForge" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>VQLForge 0.2 -
                        MIT License
                    </a>
                    </Typography>
                </Box>
            </Box>
        </>
    );
}

export default App;