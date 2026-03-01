import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import { useStore } from '@/store/useStore';

export default function Layout() {
  const { sidebarOpen } = useStore();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        {sidebarOpen && <Sidebar />}
        <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
          <div className="container mx-auto px-4 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

// Made with Bob
