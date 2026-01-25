import { RouterProvider } from '@tanstack/react-router';
import { router } from './router';
import './index.css';

export function App() {
  return <RouterProvider router={router} />;
}

export default App;
