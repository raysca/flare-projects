import {
  createRouter,
  createHashHistory,
  createRootRoute,
  createRoute,
  Outlet,
} from '@tanstack/react-router';
import { AuthProvider } from '@/context/auth-context';
import { LoginPage } from './pages/login';
import { SignupPage } from './pages/signup';
import { DashboardPage } from './pages/dashboard';
import '@/index.css';

// Root route with auth provider
const rootRoute = createRootRoute({
  component: () => (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  ),
});

// Index/Dashboard route
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DashboardPage,
});

// Login route
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
});

// Signup route
const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/signup',
  component: SignupPage,
});

// Create route tree
const routeTree = rootRoute.addChildren([indexRoute, loginRoute, signupRoute]);

// Create hash-based history for SPA routing without server config
const hashHistory = createHashHistory();

// Create and export the router instance
export const router = createRouter({
  routeTree,
  history: hashHistory,
  defaultPreload: 'intent',
});

// Register router for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
