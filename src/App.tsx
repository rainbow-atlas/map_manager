import { useEffect } from 'react'
import { Container, CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import LocationList from './components/LocationList'
import { LocationService } from './services/LocationService'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
  },
});

function App() {
  useEffect(() => {
    LocationService.initialize();
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg">
        <LocationList />
      </Container>
    </ThemeProvider>
  )
}

export default App
