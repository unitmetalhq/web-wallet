import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App.tsx"
import { Providers } from "./providers.tsx"
import SiteHeader from "@/components/site-header"
import Footer from "@/components/footer"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Providers>
      <main className="flex flex-col gap-4 items-center p-6 md:p-10 pb-12">
        <SiteHeader />
        <App />
        <Footer />
      </main>
    </Providers>
  </StrictMode>
)
