import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { LangProvider } from "./context/LangContext";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { DiseasePage } from "./pages/Disease";
import { RecommendPage } from "./pages/Recommend";
import { YieldPage } from "./pages/Yield";
import { MarketPage } from "./pages/Market";
import { AuthLogin } from "./pages/AuthLogin";
import { AuthRegister } from "./pages/AuthRegister";

export default function App() {
  return (
    <LangProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/disease" element={<DiseasePage />} />
            <Route path="/recommend" element={<RecommendPage />} />
            <Route path="/yield" element={<YieldPage />} />
            <Route path="/market" element={<MarketPage />} />
            <Route path="/login" element={<AuthLogin />} />
            <Route path="/register" element={<AuthRegister />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </LangProvider>
  );
}
