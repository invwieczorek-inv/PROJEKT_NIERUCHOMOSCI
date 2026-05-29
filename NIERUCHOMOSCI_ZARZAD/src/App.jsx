import React, { useState, useEffect } from "react";
import { 
  initializeStorage, 
  getActiveUser, 
  getUsers, 
  switchSessionUser 
} from "./utils/storage";
import LandlordDashboard from "./pages/landlord/Dashboard";
import TenantDashboard from "./pages/tenant/Dashboard";
import { User, Sparkles, RefreshCw, Smartphone, Monitor } from "lucide-react";

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [roleSwitchedNotify, setRoleSwitchedNotify] = useState(false);

  // Initialize and load active user
  useEffect(() => {
    initializeStorage();
    setCurrentUser(getActiveUser());
    setAllUsers(getUsers());

    const handleUsersUpdate = () => {
      setAllUsers(getUsers());
    };

    window.addEventListener("rentportal_users_updated", handleUsersUpdate);
    return () => {
      window.removeEventListener("rentportal_users_updated", handleUsersUpdate);
    };
  }, []);

  const handleUserSwitch = (userId) => {
    try {
      const newUser = switchSessionUser(userId);
      setCurrentUser(newUser);
      
      // Trigger a beautiful visual alert of user role change
      setRoleSwitchedNotify(true);
      setTimeout(() => setRoleSwitchedNotify(false), 2500);
    } catch (error) {
      console.error(error);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
        <div className="glass p-8 rounded-2xl max-w-sm w-full text-center space-y-4">
          <Sparkles className="w-12 h-12 text-brand-400 mx-auto animate-pulse" />
          <h1 className="text-xl font-bold text-white">Inicjowanie RentPortal...</h1>
          <p className="text-xs text-dark-400">Trwa ładowanie struktur danych w LocalStorage.</p>
        </div>
      </div>
    );
  }

  const isLandlord = currentUser.role === "landlord";

  return (
    <div className="min-h-screen bg-dark-950 text-dark-100 flex flex-col relative overflow-hidden pb-16">
      
      {/* Background glow sparks */}
      <div className="glow-spot-1" />
      <div className="glow-spot-2" />

      {/* Simulator Control Panel Bar (MVP Simulator) */}
      <div className="glass-brand sticky top-0 z-50 px-4 py-3 shadow-md backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-dark-300 font-medium">Symulator Roli MVP:</span>
            <div className="flex items-center gap-1.5 bg-dark-900 px-2.5 py-1 rounded-full border border-dark-800">
              {isLandlord ? (
                <span className="text-brand-400 font-black flex items-center gap-1">
                  <Monitor className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                  WŁAŚCICIEL
                </span>
              ) : (
                <span className="text-emerald-400 font-black flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  LOKATOR (Mobilny)
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-dark-400">Przełącz Aktywnego Użytkownika:</span>
            <div className="flex gap-1">
              {allUsers.map(user => {
                const isActive = currentUser.id === user.id;
                return (
                  <button
                    key={user.id}
                    onClick={() => handleUserSwitch(user.id)}
                    className={`px-3 py-1 rounded-lg font-semibold transition-all text-xxs ${
                      isActive 
                        ? 'bg-brand-600 text-white shadow-md' 
                        : 'bg-dark-900 text-dark-300 hover:bg-dark-800 hover:text-white border border-dark-800'
                    }`}
                  >
                    {user.name.split(" ")[0]} ({user.role === 'landlord' ? 'Właściciel' : 'Lokator'})
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* Role Switched Success Banner Toast */}
      {roleSwitchedNotify && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-brand-600 text-white px-5 py-2.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-2xl animate-bounce">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          Zalogowano jako: {currentUser.name} ({currentUser.role === 'landlord' ? 'Właściciel' : 'Lokator'})
        </div>
      )}

      {/* Main Orchestrated View Dashboard */}
      <div className="flex-1 z-10 w-full">
        {isLandlord ? (
          <LandlordDashboard activeUser={currentUser} />
        ) : (
          <TenantDashboard activeUser={currentUser} />
        )}
      </div>

      {/* Footer bar */}
      <footer className="w-full text-center py-6 text-xxs text-dark-500 border-t border-dark-900/60 z-10 mt-auto">
        <p>&copy; 2026 RentPortal. Zbudowano z rygorem deweloperskim w React + Vite + Tailwind CSS.</p>
        <p className="text-[10px] text-dark-600 mt-1 font-mono">Baza danych: window.localStorage (Aktywny tryb MVP)</p>
      </footer>

    </div>
  );
}
