import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // You might have some base CSS here
import App from './App';
import { CssBaseline } from '@mui/material';
// Optional: If you want deep theme customization, import ThemeProvider
// import { ThemeProvider, createTheme } from '@mui/material/styles';

// Optional: Define a custom theme
// const theme = createTheme({
//   palette: {
//     primary: {
//       main: '#1976d2', // Example primary color
//     },
//   },
// });

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/* <ThemeProvider theme={theme}> */}{' '}
    {/* Uncomment if using custom theme */}
    <CssBaseline /> {/* Helps normalize styles */}
    <App />
    {/* </ThemeProvider> */}{' '}
    {/* Uncomment if using custom theme */}
  </React.StrictMode>
);