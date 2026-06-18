import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  NavLink,
} from "react-router-dom";
import SimulationPage from "@/pages/SimulationPage";
import ComparePage from "@/pages/ComparePage";
import { Activity, BarChart3 } from "lucide-react";

export default function App() {
  return (
    <Router>
      <div className="w-full h-full flex flex-col bg-base-950 text-slate-200">
        <header className="h-12 flex items-center px-5 border-b border-base-800 bg-base-900/80 backdrop-blur shrink-0">
          <div className="flex items-center gap-2 mr-8">
            <div className="w-7 h-7 rounded bg-gradient-to-br from-accent-cyan to-accent-cold flex items-center justify-center">
              <Activity size={16} className="text-base-950" />
            </div>
            <div className="text-sm font-semibold tracking-wide">
              WAREHOUSE · SIM
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-base-800 text-accent-cyan ml-1 font-mono">
              v0.1
            </span>
          </div>
          <nav className="flex items-center gap-1">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors ${
                  isActive
                    ? "bg-base-800 text-accent-cyan"
                    : "text-slate-400 hover:text-slate-200 hover:bg-base-800/50"
                }`
              }
            >
              <Activity size={14} />
              仿真
            </NavLink>
            <NavLink
              to="/compare"
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors ${
                  isActive
                    ? "bg-base-800 text-accent-cyan"
                    : "text-slate-400 hover:text-slate-200 hover:bg-base-800/50"
                }`
              }
            >
              <BarChart3 size={14} />
              策略对比
            </NavLink>
          </nav>
          <div className="ml-auto text-xs text-slate-500 font-mono">
            生鲜电商前置仓 · 分拣策略仿真
          </div>
        </header>
        <main className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<SimulationPage />} />
            <Route path="/compare" element={<ComparePage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
