import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Exhibitions from "./pages/Exhibitions";
import ExhibitionDetail from "./pages/ExhibitionDetail";
import CostumesArchive from "./pages/CostumesArchive";
import CostumeDetail from "./pages/CostumeDetail";
import Project from "./pages/Project";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminSpaces from "./pages/admin/AdminSpaces";
import AdminPOIs from "./pages/admin/AdminPOIs";
import AdminCostumes from "./pages/admin/AdminCostumes";
import AdminProject from "./pages/admin/AdminProject";
import "./App.css";

function App() {
  return (
    <div className="App min-h-screen bg-[#F9F8F6]">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="exhibitions" element={<Exhibitions />} />
            <Route path="exhibitions/:id" element={<ExhibitionDetail />} />
            <Route path="costumes" element={<CostumesArchive />} />
            <Route path="costumes/:id" element={<CostumeDetail />} />
            <Route path="project" element={<Project />} />
          </Route>
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/spaces" element={<AdminSpaces />} />
          <Route path="/admin/pois" element={<AdminPOIs />} />
          <Route path="/admin/costumes" element={<AdminCostumes />} />
          <Route path="/admin/project" element={<AdminProject />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="bottom-right" />
    </div>
  );
}

export default App;
