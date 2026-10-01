import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './index.css'
import App from './App.jsx'
import UpdatePrompt from './features/install/UpdatePrompt'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      {/* Outside the router: it is chrome over whatever route is showing. */}
      <UpdatePrompt />
    </BrowserRouter>
  </React.StrictMode>
)
