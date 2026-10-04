import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import CountryRiskProfilesRouter from "./pages/intelligence/CountryRiskProfiles.jsx";
import { installVisorAddressSearch } from "./pages/labs/visorAddressSearch.js";

const isCountryProfile = /^\/inteligencia\/paises(?:\/|$)/.test(window.location.pathname);
const Root = isCountryProfile ? CountryRiskProfilesRouter : App;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);

if (!isCountryProfile) installVisorAddressSearch();
