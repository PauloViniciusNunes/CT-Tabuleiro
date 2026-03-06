import { MusicProvider } from "./components/context/MusicContext";
import { BoardPage } from "./pages/BoardPage";

function App() {
  return(
    <MusicProvider> 
      <BoardPage />
    </MusicProvider>
  );
}

export default App;
