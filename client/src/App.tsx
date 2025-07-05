import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router, Route, Switch } from "wouter";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Feed from "./pages/Feed";
import Discovery from "./pages/Discovery";
import ProductDetail from "./pages/ProductDetail";

import GroupDetail from "./pages/GroupDetail";
import GroupCheckout from "./pages/GroupCheckout";
import Dashboard from "./pages/Dashboard";
import Groups from "./pages/Groups";
import Orders from "./pages/Orders";
import Profile from "./pages/Profile";
import UserProfile from "./pages/UserProfile";
import Wishlist from "./pages/Wishlist";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Router>
            <Switch>
              <Route path="/">
                <ProtectedRoute>
                  <Feed />
                </ProtectedRoute>
              </Route>
              <Route path="/welcome">
                <Index />
              </Route>
              <Route path="/auth">
                <Auth />
              </Route>
              <Route path="/discovery">
                <Discovery />
              </Route>
              <Route path="/products/:productId">
                <ProductDetail />
              </Route>
              <Route path="/groups/:groupId/checkout">
                <ProtectedRoute>
                  <GroupCheckout />
                </ProtectedRoute>
              </Route>
              <Route path="/groups/:groupId">
                <ProtectedRoute>
                  <GroupDetail />
                </ProtectedRoute>
              </Route>
              <Route path="/groups">
                <ProtectedRoute>
                  <Groups />
                </ProtectedRoute>
              </Route>
              <Route path="/wishlist">
                <ProtectedRoute>
                  <Wishlist />
                </ProtectedRoute>
              </Route>
              <Route path="/cart">
                <ProtectedRoute>
                  <Cart />
                </ProtectedRoute>
              </Route>
              <Route path="/checkout">
                <ProtectedRoute>
                  <Checkout />
                </ProtectedRoute>
              </Route>
              <Route path="/orders">
                <ProtectedRoute>
                  <Orders />
                </ProtectedRoute>
              </Route>
              <Route path="/profile">
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              </Route>
              <Route path="/users/:userId">
                <ProtectedRoute>
                  <UserProfile />
                </ProtectedRoute>
              </Route>
              <Route path="/dashboard">
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              </Route>
              <Route>
                <NotFound />
              </Route>
            </Switch>
          </Router>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;