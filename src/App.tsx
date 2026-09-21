import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { LanguageProvider } from './contexts/LanguageContext';
import { AdminAuthProvider, useAdminAuth } from './contexts/AdminAuthContext';
import { SiteSettingsProvider } from './contexts/SiteSettingsContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import About from './pages/About';
import Prematurity from './pages/Prematurity';
import GetSupport from './pages/GetSupport';
import Programs from './pages/Programs';
import ProgramDetail from './pages/ProgramDetail';
import GetInvolved from './pages/GetInvolved';
import Donate from './pages/Donate';
import Publications from './pages/Publications';
import NewsDetail from './pages/NewsDetail';
import StoryDetail from './pages/StoryDetail';
import EventDetail from './pages/EventDetail';
import Contact from './pages/Contact';
import Resources from './pages/Resources';
import Healthcare from './pages/Healthcare';
import SearchResults from './pages/SearchResults';
import JoinOurTeam from './pages/JoinOurTeam';
import DonationsToday from './pages/DonationsToday';
import Unsubscribe from './pages/Unsubscribe';
import FormsIndex from './pages/FormsIndex';
import FormFill from './pages/FormFill';
import CareersIndex from './pages/CareersIndex';
import TrainingRegister from './pages/TrainingRegister';
import CareerDetail from './pages/CareerDetail';

import LoginPage from './dashboard/LoginPage';
import DashboardLayout from './dashboard/DashboardLayout';
import Overview from './dashboard/pages/Overview';
import WebsitePage from './dashboard/pages/WebsitePage';
import DatabasePage from './dashboard/pages/DatabasePage';
import ContactPage from './dashboard/pages/ContactPage';
import DonationsPage from './dashboard/pages/DonationsPage';
import EventsPage from './dashboard/pages/EventsPage';
import DocumentsPage from './dashboard/pages/DocumentsPage';
import FinancePage from './dashboard/pages/FinancePage';
import UsersPage from './dashboard/pages/UsersPage';
import SettingsPage from './dashboard/pages/SettingsPage';
import TrashManager from './dashboard/pages/TrashManager';
import SubscribersPage from './dashboard/pages/SubscribersPage';
import FormsManager from './dashboard/pages/FormsManager';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAdminAuth();
  if (!isAuthenticated) return <Navigate to="/dashboard/login" replace />;
  return <>{children}</>;
}

function DashboardPage({ component: Component }: { component: React.ComponentType }) {
  return (
    <RequireAuth>
      <DashboardLayout>
        <Component />
      </DashboardLayout>
    </RequireAuth>
  );
}

function AppRoutes() {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard');
  const isStandalone = location.pathname === '/join-our-team' || location.pathname === '/donations-of-today' || location.pathname === '/unsubscribe' || location.pathname === '/forms' || location.pathname.startsWith('/forms/');

  if (isDashboard) {
    return (
      <Routes>
        <Route path="/dashboard/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage component={Overview} />} />
        <Route path="/dashboard/website" element={<DashboardPage component={WebsitePage} />} />
        <Route path="/dashboard/database" element={<DashboardPage component={DatabasePage} />} />
        <Route path="/dashboard/contact" element={<DashboardPage component={ContactPage} />} />
        <Route path="/dashboard/donations" element={<DashboardPage component={DonationsPage} />} />
        <Route path="/dashboard/events" element={<DashboardPage component={EventsPage} />} />
        <Route path="/dashboard/documents" element={<DashboardPage component={DocumentsPage} />} />
        <Route path="/dashboard/finance" element={<DashboardPage component={FinancePage} />} />
        <Route path="/dashboard/users" element={<DashboardPage component={UsersPage} />} />
        <Route path="/dashboard/settings" element={<DashboardPage component={SettingsPage} />} />
        <Route path="/dashboard/trash" element={<DashboardPage component={TrashManager} />} />
        <Route path="/dashboard/subscribers" element={<DashboardPage component={SubscribersPage} />} />
        <Route path="/dashboard/forms" element={<DashboardPage component={FormsManager} />} />
        <Route path="/dashboard/programs" element={<Navigate to="/dashboard/website" replace />} />
        <Route path="/dashboard/stories" element={<Navigate to="/dashboard/website" replace />} />
        <Route path="/dashboard/team" element={<Navigate to="/dashboard/database" replace />} />
        <Route path="/dashboard/resources" element={<Navigate to="/dashboard/website" replace />} />
        <Route path="/dashboard/partners" element={<Navigate to="/dashboard/website" replace />} />
        <Route path="/dashboard/volunteers" element={<Navigate to="/dashboard/database" replace />} />
        <Route path="/dashboard/join-requests" element={<Navigate to="/dashboard/contact" replace />} />
        <Route path="/dashboard/stats" element={<Navigate to="/dashboard/website" replace />} />
        <Route path="/dashboard/publications" element={<Navigate to="/dashboard/website" replace />} />
        <Route path="/dashboard/news" element={<Navigate to="/dashboard/website" replace />} />
      </Routes>
    );
  }

  if (isStandalone) {
    return (
      <Routes>
        <Route path="/join-our-team" element={<JoinOurTeam />} />
        <Route path="/donations-of-today" element={<DonationsToday />} />
        <Route path="/unsubscribe" element={<Unsubscribe />} />
        <Route path="/forms" element={<FormsIndex />} />
        <Route path="/forms/:slug" element={<FormFill />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FBF8F3' }}>
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/prematurity" element={<Prematurity />} />
          <Route path="/support" element={<GetSupport />} />
          <Route path="/programs" element={<Programs />} />
          <Route path="/programs/:slug" element={<ProgramDetail />} />
          <Route path="/get-involved" element={<GetInvolved />} />
          <Route path="/donate" element={<Donate />} />
          <Route path="/publications" element={<Publications />} />
          <Route path="/news/:slug" element={<NewsDetail />} />
          <Route path="/stories/:slug" element={<StoryDetail />} />
          <Route path="/events/:slug" element={<EventDetail />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/healthcare" element={<Healthcare />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/careers" element={<CareersIndex />} />
          <Route path="/careers/:slug" element={<CareerDetail />} />
          <Route path="/register" element={<TrainingRegister />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AdminAuthProvider>
        <LanguageProvider>
          <SiteSettingsProvider>
            <ScrollToTop />
            <AppRoutes />
          </SiteSettingsProvider>
        </LanguageProvider>
      </AdminAuthProvider>
    </BrowserRouter>
  );
}
