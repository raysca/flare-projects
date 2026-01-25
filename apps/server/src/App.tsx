import { RouterProvider } from '@tanstack/react-router';
import { createRouter } from './router';
import './index.css';

const router = createRouter();

export function App() {
  return <RouterProvider router={router} />;
}

export default App;
