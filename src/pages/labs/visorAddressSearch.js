const MOUNT_ATTR = "data-zrc-address-search";
const LANG_KEY = "zrc_visor_lang";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const CATASTRO_RCCOOR = "https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCoordenadas.asmx/Consulta_RCCOOR";
const CATASTRO_RCCOOR_DISTANCE = "https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCoordenadas.asmx/Consulta_RCCOOR_Distancia";

const COPY = {
  es: {
    title: "Buscar por dirección",
    placeholder: "Ej. Espronceda 38, Madrid",
    search: "Buscar inmueble",
    searching: "Localizando…",
    hint: "Dirección libre · España. La ubicación se contrasta con Catastro para obtener la referencia catastral.",
    results: "Coincidencias catastrales",
    use: "Analizar esta RC",
    empty: "No hemos encontrado una referencia catastral para esa dirección. Prueba añadiendo municipio, provincia o código postal.",
    network: "No se ha podido completar la búsqueda por dirección. Puedes seguir usando la referencia catastral directamente.",
  },
  en: {
    title: "Search by address",
    placeholder: "E.g. Espronceda 38, Madrid",
    search: "Find property",
    searching: "Locating…",
    hint: "Free-form address · Spain. The location is checked against Catastro to retrieve the cadastral reference.",
    results: "Cadastral matches",
    use: "Analyse this reference",
    empty: "We could not find a cadastral reference for that address. Try adding the municipality, province or postcode.",
    network: "Address search could not be completed. You can still use the cadastral reference directly.",
  },
};

function lang() {
  try {
    return localStorage.getItem(LANG_KEY) === "en" ? "en" : "es";
  } catch {
    return "es";
  }
}

function textContent(node, selector) {
  return node.querySelector(selector)?.textContent?.trim() || "";
}

function parseCatastroXml(xmlText) {
  const doc = new DOMParser().parseFromString(xmlText, "application/xml");
  if (doc.querySelector("parsererror")) return [];

  const coordNodes = [...doc.querySelectorAll("coord")];
  const rows = coordNodes.length ? coordNodes : [doc];

  return rows
    .map((node) => {
      const rc = `${textContent(node, "pc1")}${textContent(node, "pc2")}`.replace(/\s+/g, "");
      if (!rc) return null;
      return {
        rc,
        address: textContent(node, "ldt") || textContent(doc, "ldt"),
        lng: textContent(node, "xcen") || textContent(doc, "xcen"),
        lat: textContent(node, "ycen") || textContent(doc, "ycen"),
      };
    })
    .filter(Boolean);
}

async function catastroByCoordinates(lng, lat, distanceFallback = false) {
  const base = distanceFallback ? CATASTRO_RCCOOR_DISTANCE : CATASTRO_RCCOOR;
  const params = new URLSearchParams({
    SRS: "EPSG:4326",
    Coordenada_X: String(lng),
    Coordenada_Y: String(lat),
  });
  const response = await fetch(`${base}?${params.toString()}`);
  if (!response.ok) throw new Error(`Catastro HTTP ${response.status}`);
  return parseCatastroXml(await response.text());
}

async function geocodeAddress(query) {
  const params = new URLSearchParams({
    format: "jsonv2",
    addressdetails: "1",
    countrycodes: "es",
    limit: "5",
    q: query,
  });
  const response = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Geocoder HTTP ${response.status}`);
  return response.json();
}

async function resolveAddress(query) {
  const places = await geocodeAddress(query);
  const matches = [];
  const seen = new Set();

  for (const place of places) {
    let cadastral = await catastroByCoordinates(place.lon, place.lat, false);
    if (!cadastral.length) cadastral = await catastroByCoordinates(place.lon, place.lat, true);

    for (const item of cadastral) {
      if (seen.has(item.rc)) continue;
      seen.add(item.rc);
      matches.push({
        ...item,
        address: item.address || place.display_name || query,
        geocoderAddress: place.display_name || "",
      });
      if (matches.length >= 6) return matches;
    }
  }
  return matches;
}

function setReactInputValue(input, value) {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  descriptor?.set?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function findRcForm() {
  return [...document.querySelectorAll("form")].find((form) => {
    const labels = [...form.querySelectorAll("label")]
      .map((el) => el.textContent?.toLowerCase() || "")
      .join(" ");
    return labels.includes("referencia catastral") || labels.includes("cadastral reference");
  });
}

function ensureStyles() {
  if (document.getElementById("zrc-visor-address-styles")) return;
  const style = document.createElement("style");
  style.id = "zrc-visor-address-styles";
  style.textContent = `
    .zrc-address-search{background:#FAF6ED;border:1px solid #DBC9A0;border-radius:16px;padding:18px;margin:0 0 14px;color:#2B2418;box-shadow:0 8px 24px rgba(43,36,24,.05)}
    .zrc-address-search__title{font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:10px;color:#6F5D37}
    .zrc-address-search__row{display:flex;gap:10px;align-items:stretch}
    .zrc-address-search__input{flex:1;min-width:0;border:1px solid #DBC9A0;background:#fffaf0;color:#2B2418;border-radius:12px;padding:12px 14px;font:inherit;outline:none}
    .zrc-address-search__input:focus{border-color:#93712F;box-shadow:0 0 0 3px rgba(147,113,47,.12)}
    .zrc-address-search__button{border:0;background:#2B2418;color:#fff;border-radius:12px;padding:12px 16px;font:inherit;font-weight:700;cursor:pointer;white-space:nowrap}
    .zrc-address-search__button:disabled{opacity:.55;cursor:wait}
    .zrc-address-search__hint{margin-top:8px;font-size:12px;line-height:1.45;color:#8A7B5C}
    .zrc-address-search__error{margin-top:10px;font-size:12px;line-height:1.45;color:#8A3B2F}
    .zrc-address-search__results{display:grid;gap:8px;margin-top:12px}
    .zrc-address-search__results-title{font-size:12px;font-weight:700;color:#6F5D37;margin-bottom:2px}
    .zrc-address-search__result{display:flex;justify-content:space-between;gap:14px;align-items:center;width:100%;text-align:left;border:1px solid #DBC9A0;background:#F3ECDC;border-radius:12px;padding:11px 12px;cursor:pointer;color:#2B2418}
    .zrc-address-search__result:hover{background:#EDE3CE}
    .zrc-address-search__meta{min-width:0}
    .zrc-address-search__rc{display:block;font-weight:800;font-size:13px;letter-spacing:.03em}
    .zrc-address-search__address{display:block;margin-top:3px;font-size:12px;color:#8A7B5C;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:650px}
    .zrc-address-search__use{font-size:12px;font-weight:700;color:#93712F;white-space:nowrap}
    @media(max-width:720px){.zrc-address-search__row{flex-direction:column}.zrc-address-search__button{width:100%}.zrc-address-search__result{align-items:flex-start;flex-direction:column}.zrc-address-search__address{white-space:normal}.zrc-address-search__use{align-self:flex-end}}
  `;
  document.head.appendChild(style);
}

function renderResults(container, matches, rcForm) {
  const copy = COPY[lang()];
  container.replaceChildren();
  if (!matches.length) return;

  const title = document.createElement("div");
  title.className = "zrc-address-search__results-title";
  title.textContent = copy.results;
  container.appendChild(title);

  for (const match of matches) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "zrc-address-search__result";

    const meta = document.createElement("span");
    meta.className = "zrc-address-search__meta";

    const rc = document.createElement("span");
    rc.className = "zrc-address-search__rc";
    rc.textContent = match.rc;

    const address = document.createElement("span");
    address.className = "zrc-address-search__address";
    address.textContent = match.address || match.geocoderAddress || "";

    const use = document.createElement("span");
    use.className = "zrc-address-search__use";
    use.textContent = copy.use;

    meta.append(rc, address);
    button.append(meta, use);
    button.addEventListener("click", () => {
      const rcInput = rcForm.querySelector("input");
      if (!rcInput) return;
      setReactInputValue(rcInput, match.rc);
      rcInput.focus();
      setTimeout(() => rcForm.requestSubmit(), 80);
    });
    container.appendChild(button);
  }
}

function mountAddressSearch(rcForm) {
  if (!rcForm) return;
  const parent = rcForm.parentElement;
  if (parent?.querySelector(`[${MOUNT_ATTR}]`)) return;

  ensureStyles();
  const copy = COPY[lang()];
  const section = document.createElement("section");
  section.setAttribute(MOUNT_ATTR, "true");
  section.className = "zrc-address-search";
  section.innerHTML = `
    <div class="zrc-address-search__title">${copy.title}</div>
    <div class="zrc-address-search__row">
      <input class="zrc-address-search__input" type="search" autocomplete="street-address" placeholder="${copy.placeholder}" aria-label="${copy.title}" />
      <button class="zrc-address-search__button" type="button">${copy.search}</button>
    </div>
    <div class="zrc-address-search__hint">${copy.hint}</div>
    <div class="zrc-address-search__error" hidden></div>
    <div class="zrc-address-search__results"></div>
  `;

  const input = section.querySelector(".zrc-address-search__input");
  const button = section.querySelector(".zrc-address-search__button");
  const error = section.querySelector(".zrc-address-search__error");
  const results = section.querySelector(".zrc-address-search__results");

  const runSearch = async () => {
    const query = input.value.trim();
    if (!query) return;
    button.disabled = true;
    button.textContent = COPY[lang()].searching;
    error.hidden = true;
    results.replaceChildren();
    try {
      const matches = await resolveAddress(query);
      if (!matches.length) {
        error.textContent = COPY[lang()].empty;
        error.hidden = false;
      } else {
        renderResults(results, matches, rcForm);
      }
    } catch (err) {
      console.warn("ZRC address search failed", err);
      error.textContent = COPY[lang()].network;
      error.hidden = false;
    } finally {
      button.disabled = false;
      button.textContent = COPY[lang()].search;
    }
  };

  button.addEventListener("click", runSearch);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      runSearch();
    }
  });

  rcForm.insertAdjacentElement("beforebegin", section);
}

function scan() {
  const rcForm = findRcForm();
  if (rcForm) mountAddressSearch(rcForm);
}

export function installVisorAddressSearch() {
  if (typeof window === "undefined") return;
  scan();
  const observer = new MutationObserver(scan);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
