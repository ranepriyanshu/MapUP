
import { Bell, Search, UserCircle } from "lucide-react";

function Navbar() {
  return (
    <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-8">

      <div>
        <h2 className="text-lg font-semibold text-slate-800">
          Geofencing Management
        </h2>
        <p className="text-sm text-slate-500">
          Monitor vehicles and geofence activities
        </p>
      </div>

      <div className="flex items-center gap-5">
        <div className="hidden items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 md:flex">
          <Search size={17} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search..."
            className="w-36 bg-transparent text-sm outline-none"
          />
        </div>

        <button className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100">
          <Bell size={21} />
        </button>

        <div className="flex items-center gap-2">
          <UserCircle size={34} className="text-slate-500" />
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-slate-800">
              Admin
            </p>
            <p className="text-xs text-slate-500">Administrator</p>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
