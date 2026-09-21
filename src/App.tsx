import { Routes, Route } from "react-router-dom";

import { MusicProvider } from "./components/context/MusicContext";

import { AuthPage } from "./pages/AuthPage";
import { BoardPage } from "./pages/BoardPage";
import { CampaignsPage } from "./pages/CampaignsPage";

function App() {

    return (

        <MusicProvider>

            <Routes>

                <Route
                    path="/"
                    element={<AuthPage />}
                />

                <Route
                    path="/board"
                    element={<BoardPage />}
                />

                <Route
                    path="/campaigns"
                    element={<CampaignsPage />}
                />

            </Routes>

        </MusicProvider>

    );

}

export default App;